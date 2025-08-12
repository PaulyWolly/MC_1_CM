/*
  PROCESS_NEW_MOVIES.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const MOVIES_DIR = 'S:/MEDIA/MOVIES';
const MEDIA_LIBRARY_FILE = path.join(process.cwd(), 'public/components/MediaLibrary/data/movies/media-library-movies.json');
const POSTER_MAPPING_FILE = path.join(process.cwd(), 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
const GENRES_FILE = path.join(process.cwd(), 'public/components/MediaLibrary/data/movies/movie_genres_normalized.json');

class NewMovieProcessor {
    constructor() {
        this.newMovies = [];
        this.daysBack = 1; // Default: only today's movies
    }

    async main() {
        console.log('🎬 [NEW-MOVIES] Processing newly added movies...\n');
        
        // Parse command line arguments
        this.parseArguments();
        
        try {
            // Step 1: Find newly added movies
            await this.findNewMovies();
            
            if (this.newMovies.length === 0) {
                console.log('✅ [NEW-MOVIES] No new movies found from the last', this.daysBack, 'day(s)!');
                return;
            }
            
            console.log(`📁 [NEW-MOVIES] Found ${this.newMovies.length} newly added movies:\n`);
            this.newMovies.forEach((movie, index) => {
                console.log(`  ${index + 1}. ${movie.title} (${movie.year})`);
                console.log(`     📁 Folder: ${movie.folder}`);
                console.log(`     📅 Added: ${movie.addedDate}`);
                console.log('');
            });
            
            // Step 2: Process the new movies
            await this.processNewMovies();
            
            console.log('\n✅ [NEW-MOVIES] All new movies processed successfully!');
            
        } catch (error) {
            console.error('❌ [NEW-MOVIES] Error:', error);
        }
    }

    parseArguments() {
        const args = process.argv.slice(2);
        
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            
            if (arg === '--days' || arg === '-d') {
                const days = parseInt(args[i + 1]);
                if (!isNaN(days)) {
                    this.daysBack = days;
                    console.log(`ℹ️  [NEW-MOVIES] Will process movies added in last ${days} days`);
                    i++; // Skip next argument
                }
            }
        }
    }

    async findNewMovies() {
        console.log(`🔍 [NEW-MOVIES] Scanning for movies added in the last ${this.daysBack} day(s)...`);
        
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.daysBack);
        console.log(`📅 [NEW-MOVIES] Looking for movies added after: ${cutoffDate.toLocaleDateString()}`);
        
        // Scan all movie folders
        const folders = await fs.readdir(MOVIES_DIR, { withFileTypes: true });
        const movieFolders = folders.filter(f => f.isDirectory());
        
        console.log(`📁 [NEW-MOVIES] Found ${movieFolders.length} total movie folders`);
        
        for (const folder of movieFolders) {
            const folderPath = path.join(MOVIES_DIR, folder.name);
            
            // Get folder creation date
            const folderStats = await fs.stat(folderPath);
            const folderDate = folderStats.birthtime;
            const addedDate = folderDate.toLocaleDateString();
            
            // Check if this folder was created recently
            if (folderDate >= cutoffDate) {
                console.log(`🎯 [NEW-MOVIES] Found recent folder: ${folder.name} (added ${addedDate})`);
                
                const files = await fs.readdir(folderPath);
                
                // Find video files
                const videoFiles = files.filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'].includes(ext);
                });
                
                for (const videoFile of videoFiles) {
                    const { title, year } = this.extractTitleYear(videoFile);
                    this.newMovies.push({
                        filename: videoFile,
                        folder: folder.name,
                        path: path.join(folderPath, videoFile).replace(/\\/g, '/'),
                        title: title,
                        year: year,
                        addedDate: addedDate
                    });
                }
            }
        }
        
        console.log(`✅ [NEW-MOVIES] Found ${this.newMovies.length} new movies to process`);
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

    async processNewMovies() {
        console.log('\n⚡ [NEW-MOVIES] Processing new movies...');
        
        try {
            // Step 1: Update media library (this will include the new movies)
            console.log('📝 [NEW-MOVIES] Step 1: Updating media library...');
            execSync('node scripts/scan_media_library_movies.js', { stdio: 'inherit' });
            
            // Step 2: Fetch movie details from TMDb for each new movie
            console.log('\n📊 [NEW-MOVIES] Step 2: Fetching movie details from TMDb...');
            for (const movie of this.newMovies) {
                console.log(`   🎬 Processing: ${movie.title} (${movie.year})`);
                try {
                    execSync(`node scripts/fetch_movie_details_from_filename_SINGLE.js "${movie.title}"`, { 
                        stdio: 'inherit',
                        timeout: 30000 // 30 second timeout per movie
                    });
                } catch (error) {
                    console.log(`   ⚠️  Warning: Could not fetch details for ${movie.title}`);
                }
            }
            
            // Step 3: Fetch movie genres for ONLY the new movies
            console.log('\n🎭 [NEW-MOVIES] Step 3: Fetching movie genres for new movies only...');
            await this.fetchGenresForNewMovies();
            
            // Step 4: Update poster mapping
            console.log('\n🖼️  [NEW-MOVIES] Step 4: Updating poster mapping...');
            execSync('node scripts/update_MOVIE_poster_mapping_and_write.js', { stdio: 'inherit' });
            
            console.log('\n✅ [NEW-MOVIES] All new movies processed!');
            
        } catch (error) {
            console.error('❌ [NEW-MOVIES] Error in processing:', error.message);
        }
    }

    async fetchGenresForNewMovies() {
        const fetch = require('node-fetch');
        const TMDB_API_KEY = '7558c4ca11c4063f2e2bdcb44eac41d0';
        
        // Load existing genres
        let existingGenres = {};
        try {
            const genresData = await fs.readFile(GENRES_FILE, 'utf8');
            existingGenres = JSON.parse(genresData);
        } catch (error) {
            console.log('ℹ️  [NEW-MOVIES] No existing genres file found, will create new one.');
        }
        
        // Helper: Query TMDb for movie genres
        async function fetchGenresForMovie(title, year) {
            const query = encodeURIComponent(title);
            let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}`;
            if (year) url += `&year=${year}`;
            const res = await fetch(url);
            if (!res.ok) return [];
            const data = await res.json();
            if (!data.results || data.results.length === 0) return [];
            // Pick the first result
            const movie = data.results[0];
            if (!movie || !movie.id) return [];
            // Fetch movie details for genres
            const detailsRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}`);
            if (!detailsRes.ok) return [];
            const details = await detailsRes.json();
            if (!details.genres) return [];
            return details.genres.map(g => g.name);
        }
        
        // Process only the new movies
        for (const movie of this.newMovies) {
            const relPath = path.relative(MOVIES_DIR, movie.path);
            console.log(`   🎭 Fetching genres for: ${movie.title} (${movie.year})`);
            
            try {
                const genres = await fetchGenresForMovie(movie.title, movie.year);
                existingGenres[relPath] = genres;
                console.log(`   → Genres: ${genres.join(', ') || '(none)'}`);
            } catch (error) {
                console.log(`   ⚠️  Warning: Could not fetch genres for ${movie.title}`);
                existingGenres[relPath] = [];
            }
            
            // Rate limit to avoid hitting TMDb too fast
            await new Promise(resolve => setTimeout(resolve, 350));
        }
        
        // Save updated genres file
        await fs.writeFile(GENRES_FILE, JSON.stringify(existingGenres, null, 2));
        console.log(`✅ [NEW-MOVIES] Updated genres for ${this.newMovies.length} new movies`);
    }
}

// Run the script
if (require.main === module) {
    const processor = new NewMovieProcessor();
    processor.main().catch(console.error);
}

module.exports = NewMovieProcessor; 