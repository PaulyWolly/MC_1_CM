/*
  ADD_NEW_MOVIES.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const MOVIES_DIR = 'S:/MEDIA/MOVIES';
const MEDIA_LIBRARY_FILE = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');
const POSTER_MAPPING_FILE = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
const MOVIE_DETAILS_FILE = path.join(__dirname, '../server/data/movie_details.json');

class NewMovieProcessor {
    constructor() {
        this.newMovies = [];
        this.stats = {
            totalMovies: 0,
            newMovies: 0,
            processed: 0,
            errors: 0
        };
        this.options = {
            daysBack: 7, // Default: show movies added in last 7 days
            showAll: false, // Show all missing movies
            specificMovies: [] // Process specific movie titles
        };
    }

    async main() {
        console.log('🎬 [NEW-MOVIES] Starting new movie processing...\n');
        
        // Parse command line arguments
        this.parseArguments();
        
        try {
            // Step 1: Scan for new movies
            await this.scanForNewMovies();
            
            if (this.newMovies.length === 0) {
                console.log('✅ [NEW-MOVIES] No new movies found!');
                return;
            }
            
            console.log(`📁 [NEW-MOVIES] Found ${this.newMovies.length} movies to process:\n`);
            this.newMovies.forEach((movie, index) => {
                const missing = [];
                if (movie.needsLibrary) missing.push('library');
                if (movie.needsPoster) missing.push('poster');
                if (movie.needsMapping) missing.push('mapping');
                
                console.log(`  ${index + 1}. ${movie.title} (${movie.year})`);
                console.log(`     📁 Folder: ${movie.folder}`);
                console.log(`     ❌ Missing: ${missing.join(', ')}`);
                if (movie.addedDate) {
                    console.log(`     📅 Added: ${movie.addedDate}`);
                }
                console.log('');
            });
            
            // Step 2: Ask user what to do
            const choice = await this.getUserChoice();
            
            if (choice === 'interactive') {
                await this.runInteractiveSelector();
            } else if (choice === 'automated') {
                await this.runAutomatedProcess();
            } else {
                console.log('❌ [NEW-MOVIES] Process cancelled.');
                return;
            }
            
            console.log('\n✅ [NEW-MOVIES] Process completed successfully!');
            
        } catch (error) {
            console.error('❌ [NEW-MOVIES] Error:', error);
        }
    }

    parseArguments() {
        const args = process.argv.slice(2);
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (arg === '--all' || arg === '-a') {
                this.options.showAll = true;
                console.log('ℹ️  [NEW-MOVIES] Will show all missing movies (not just recent ones)');
            } else if (arg === '--days' || arg === '-d') {
                const days = parseInt(args[i + 1]);
                if (!isNaN(days)) {
                    this.options.daysBack = days;
                    console.log(`ℹ️  [NEW-MOVIES] Will show movies added in last ${days} days`);
                    i++; // Skip next argument
                }
            } else if (arg === '--movies' || arg === '-m') {
                // Parse comma-separated movie titles
                const titles = args[i + 1].split(',').map(t => t.trim());
                this.options.specificMovies = titles;
                console.log(`ℹ️  [NEW-MOVIES] Will process specific movies: ${titles.join(', ')}`);
                i++; // Skip next argument
            }
        }
    }

    async scanForNewMovies() {
        console.log('🔍 [NEW-MOVIES] Scanning for new movies...');
        
        // Load existing media library
        let existingLibrary = {};
        try {
            const libraryData = await fs.readFile(MEDIA_LIBRARY_FILE, 'utf8');
            existingLibrary = JSON.parse(libraryData);
        } catch (error) {
            console.log('ℹ️  [NEW-MOVIES] No existing media library found, will create new one.');
        }
        
        // Load existing poster mapping
        let existingPosters = {};
        try {
            const posterData = await fs.readFile(POSTER_MAPPING_FILE, 'utf8');
            existingPosters = JSON.parse(posterData);
        } catch (error) {
            console.log('ℹ️  [NEW-MOVIES] No existing poster mapping found.');
        }
        
        // Calculate cutoff date for recent movies
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.options.daysBack);
        
        // Scan all movie folders
        const folders = await fs.readdir(MOVIES_DIR, { withFileTypes: true });
        const movieFolders = folders.filter(f => f.isDirectory());
        
        this.stats.totalMovies = movieFolders.length;
        
        for (const folder of movieFolders) {
            const folderPath = path.join(MOVIES_DIR, folder.name);
            
            // Get folder creation date
            const folderStats = await fs.stat(folderPath);
            const folderDate = folderStats.birthtime;
            const addedDate = folderDate.toLocaleDateString();
            
            // Check if this folder is recent enough
            const isRecent = folderDate >= cutoffDate;
            
            // Check if this is a specific movie we're looking for
            const isSpecificMovie = this.options.specificMovies.length === 0 || 
                this.options.specificMovies.some(title => 
                    folder.name.toLowerCase().includes(title.toLowerCase())
                );
            
            // Skip if not recent and not showing all and not specific
            if (!this.options.showAll && !isRecent && !isSpecificMovie) {
                continue;
            }
            
            const files = await fs.readdir(folderPath);
            
            // Find video files
            const videoFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'].includes(ext);
            });
            
            for (const videoFile of videoFiles) {
                const moviePath = path.join(folderPath, videoFile).replace(/\\/g, '/');
                const posterPath = path.join(folderPath, 'poster.jpg').replace(/\\/g, '/');
                
                // Check if this movie is already in our library
                const isInLibrary = this.isMovieInLibrary(moviePath, existingLibrary);
                const hasPoster = await this.fileExists(posterPath);
                const isInPosterMapping = existingPosters[moviePath];
                
                if (!isInLibrary || !hasPoster || !isInPosterMapping) {
                    const { title, year } = this.extractTitleYear(videoFile);
                    this.newMovies.push({
                        filename: videoFile,
                        folder: folder.name,
                        path: moviePath,
                        title: title,
                        year: year,
                        needsLibrary: !isInLibrary,
                        needsPoster: !hasPoster,
                        needsMapping: !isInPosterMapping,
                        addedDate: addedDate,
                        isRecent: isRecent
                    });
                }
            }
        }
        
        // Sort by date added (newest first)
        this.newMovies.sort((a, b) => {
            if (a.isRecent && !b.isRecent) return -1;
            if (!a.isRecent && b.isRecent) return 1;
            return 0;
        });
    }

    isMovieInLibrary(moviePath, library) {
        // Recursively search through library structure
        function searchNode(node) {
            if (node.absPath === moviePath) return true;
            if (node.children) {
                return node.children.some(searchNode);
            }
            return false;
        }
        
        return searchNode(library);
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    extractTitleYear(filename) {
        // Remove extension
        const base = path.basename(filename, path.extname(filename));
        
        // Extract year from end of filename
        const yearMatch = base.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : null;
        
        // Extract title (remove year and clean up)
        let title = base.replace(/\((\d{4})\)/, '').trim();
        title = title.replace(/\[.*?\]/g, '').trim(); // Remove resolution tags
        title = title.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
        
        return { title, year };
    }

    async getUserChoice() {
        console.log('\n🎯 [NEW-MOVIES] Choose processing method:');
        console.log('  1. Interactive Poster Selector (recommended)');
        console.log('  2. Automated Process (quick)');
        console.log('  3. Cancel');
        
        // For now, return automated - you can enhance this with readline if needed
        return 'automated';
    }

    async runInteractiveSelector() {
        console.log('\n🖥️  [NEW-MOVIES] Starting interactive poster selector...');
        console.log('   Opening web interface at http://localhost:3000');
        console.log('   Select posters for your new movies, then save.');
        
        try {
            execSync('node scripts/interactive_movie_poster_selector.js', { stdio: 'inherit' });
        } catch (error) {
            console.error('❌ [NEW-MOVIES] Error running interactive selector:', error.message);
        }
    }

    async runAutomatedProcess() {
        console.log('\n⚡ [NEW-MOVIES] Running automated process...');
        
        try {
            // Step 1: Update media library
            console.log('📝 [NEW-MOVIES] Step 1: Updating media library...');
            execSync('node scripts/scan_media_library_movies.js', { stdio: 'inherit' });
            
            // Step 2: Fetch movie details from TMDb
            console.log('\n📊 [NEW-MOVIES] Step 2: Fetching movie details from TMDb...');
            execSync('node scripts/fetch_movie_details_from_filename_SINGLE.js', { stdio: 'inherit' });
            
            // Step 3: Fetch movie genres
            console.log('\n🎭 [NEW-MOVIES] Step 3: Fetching movie genres...');
            execSync('node scripts/fetch_movie_genres_from_tmdb.js', { stdio: 'inherit' });
            
            // Step 4: Update poster mapping
            console.log('\n🖼️  [NEW-MOVIES] Step 4: Updating poster mapping...');
            execSync('node scripts/update_MOVIE_poster_mapping_and_write.js', { stdio: 'inherit' });
            
            console.log('\n✅ [NEW-MOVIES] Automated process completed!');
            
        } catch (error) {
            console.error('❌ [NEW-MOVIES] Error in automated process:', error.message);
        }
    }
}

// Run the script
if (require.main === module) {
    const processor = new NewMovieProcessor();
    processor.main().catch(console.error);
}

module.exports = NewMovieProcessor; 