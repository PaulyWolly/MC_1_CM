/*
  NORMALIZE_MOVIE_NAMES.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

const fs = require('fs').promises;
const path = require('path');
const NormalizationService = require('../../server/services/NormalizationService');
const { normalizeKey } = require('../../shared/NormalizationService');
// Use normalizeKey wherever NormalizationService.createFolderName or similar normalization is used.

/**
 * Batch normalization script for movie names and poster mapping
 * This script will:
 * 1. Scan the S:/MEDIA/MOVIES directory
 * 2. Normalize all movie names
 * 3. Update the poster mapping file
 * 4. Optionally rename folders (if --rename-folders flag is used)
 */

class MovieNameNormalizer {
    constructor() {
        this.moviesDir = 'S:/MEDIA/MOVIES';
        this.posterMappingFile = path.join(process.cwd(), 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
        this.backupDir = path.join(process.cwd(), '../backups/normalization');
        this.renameFolders = process.argv.includes('--rename-folders');
        this.dryRun = process.argv.includes('--dry-run');
        this.testMode = process.argv.includes('--test') || process.argv.includes('--test-mode');
        this.testLimit = 5; // Process only first 5 movies in test mode
        this.renameFiles = process.argv.includes('--rename-files');
        
        // Statistics
        this.stats = {
            totalMovies: 0,
            normalizedMovies: 0,
            renamedFolders: 0,
            updatedMappings: 0,
            errors: 0
        };
    }

    /**
     * Main execution function
     */
    async run() {
        console.log('🎬 Starting Movie Name Normalization Process...');
        console.log(`📁 Movies Directory: ${this.moviesDir}`);
        console.log(`📄 Poster Mapping File: ${this.posterMappingFile}`);
        console.log(`🔄 Rename Folders: ${this.renameFolders ? 'YES' : 'NO'}`);
        console.log(`🧪 Dry Run: ${this.dryRun ? 'YES' : 'NO'}`);
        console.log(`🧪 Test Mode: ${this.testMode ? `YES (first ${this.testLimit} movies)` : 'NO'}`);
        console.log('');

        try {
            // Create backup directory
            await this.createBackup();
            
            // Load existing poster mapping
            const posterMapping = await this.loadPosterMapping();
            
            // Scan movies directory
            const movies = await this.scanMoviesDirectory();
            
            // Limit to first N movies in test mode
            const moviesToProcess = this.testMode ? movies.slice(0, this.testLimit) : movies;
            
            // Process each movie
            await this.processMovies(moviesToProcess, posterMapping);
            
            // Save updated mapping
            if (!this.dryRun) {
                await this.savePosterMapping(posterMapping);
            }
            
            // Print results
            this.printResults();
            
        } catch (error) {
            console.error('❌ Error during normalization:', error);
            process.exit(1);
        }
    }

    /**
     * Create backup of current poster mapping
     */
    async createBackup() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.backupDir, `movie_posters_${timestamp}.json`);
            
            if (await this.fileExists(this.posterMappingFile)) {
                const content = await fs.readFile(this.posterMappingFile, 'utf8');
                await fs.writeFile(backupFile, content);
                console.log(`💾 Backup created: ${backupFile}`);
            }
        } catch (error) {
            console.warn('⚠️  Warning: Could not create backup:', error.message);
        }
    }

    /**
     * Load existing poster mapping
     */
    async loadPosterMapping() {
        try {
            if (await this.fileExists(this.posterMappingFile)) {
                const content = await fs.readFile(this.posterMappingFile, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.warn('⚠️  Warning: Could not load existing poster mapping:', error.message);
        }
        return {};
    }

    /**
     * Scan the movies directory for movie files
     */
    async scanMoviesDirectory() {
        const movies = [];
        
        try {
            const entries = await fs.readdir(this.moviesDir, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const moviePath = path.join(this.moviesDir, entry.name);
                    const movieFiles = await this.findMovieFiles(moviePath);
                    
                    for (const movieFile of movieFiles) {
                        movies.push({
                            folderName: entry.name,
                            folderPath: moviePath,
                            fileName: path.basename(movieFile),
                            filePath: movieFile,
                            normalizedName: NormalizationService.normalizeMovieName(entry.name),
                            normalizedFileName: NormalizationService.normalizeMovieName(path.basename(movieFile))
                        });
                    }
                }
            }
            
            this.stats.totalMovies = movies.length;
            console.log(`📊 Found ${movies.length} movie files to process`);
            
        } catch (error) {
            throw new Error(`Failed to scan movies directory: ${error.message}`);
        }
        
        return movies;
    }

    /**
     * Find movie files in a directory
     */
    async findMovieFiles(dirPath) {
        const movieFiles = [];
        const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv'];
        
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (videoExtensions.includes(ext)) {
                        movieFiles.push(path.join(dirPath, entry.name));
                    }
                }
            }
        } catch (error) {
            console.warn(`⚠️  Warning: Could not read directory ${dirPath}:`, error.message);
        }
        
        return movieFiles;
    }

    /**
     * Process all movies and update mapping
     */
    async processMovies(movies, posterMapping) {
        console.log('\n🔄 Processing movies...\n');
        
        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            this.stats.totalMovies++;
            const folderPath = path.join(this.moviesDir, movie.folderName);
            let normalizedFolder = NormalizationService.createFolderName(movie.folderName);
            const normalizedFolderPath = path.join(this.moviesDir, normalizedFolder);

            // Find all video files (mp4, mkv, avi, mov, m4v)
            const files = await fs.readdir(folderPath);
            const videoFiles = files.filter(f => /\.(mp4|mkv|avi|mov|m4v)$/i.test(f));
            
            if (videoFiles.length > 0) {
                // Pick the largest video file as the main movie file
                let mainFile = videoFiles[0];
                let maxSize = 0;
                for (const f of videoFiles) {
                    const stat = await fs.stat(path.join(folderPath, f));
                    if (stat.size > maxSize) {
                        mainFile = f;
                        maxSize = stat.size;
                    }
                }
                const ext = path.extname(mainFile);
                const normalizedFileName = normalizedFolder + ext;
                if (this.dryRun) {
                    // Only show for Star Wars or Talladega Nights folders in test mode
                    if (
                        folderPath.toLowerCase().includes('star wars') ||
                        folderPath.toLowerCase().includes('talladega') ||
                        this.testMode
                    ) {
                        console.log(`   📄 Would rename: ${mainFile} → ${normalizedFileName}`);
                    }
                } else if (this.renameFiles) {
                    const oldPath = path.join(folderPath, mainFile);
                    const newPath = path.join(folderPath, normalizedFileName);
                    if (oldPath !== newPath) {
                        try {
                            await fs.rename(oldPath, newPath);
                            console.log(`   📄 File renamed: ${mainFile} → ${normalizedFileName}`);
                        } catch (error) {
                            if (error.code === 'EEXIST') {
                                console.log(`   ⚠️  Skipped ${mainFile} - target file already exists`);
                            } else {
                                throw error;
                            }
                        }
                    }
                }
            }
            
            try {
                await this.processMovie(movie, posterMapping);
            } catch (error) {
                console.error(`❌ Error processing ${movie.fileName}:`, error.message);
                this.stats.errors++;
            }
        }
    }

    /**
     * Process a single movie
     */
    async processMovie(movie, posterMapping) {
        // Use only the dot notation folder name as the key
        const oldKey = movie.filePath.replace(/\\/g, '/');
        const newKey = NormalizationService.createFolderName(movie.folderName);
        // Check if this movie needs normalization
        const needsNormalization = oldKey !== newKey;
        if (needsNormalization) {
            this.stats.normalizedMovies++;
            console.log(`🎬 ${movie.fileName}`);
            console.log(`   📁 Folder: ${movie.folderName} → ${movie.normalizedName}`);
            console.log(`   📄 File: ${movie.fileName} → ${movie.normalizedFileName}`);
            console.log(`   🔑 Old Key: ${oldKey.substring(0, 80)}...`);
            console.log(`   🔑 New Key: ${newKey}`);
            // Update poster mapping to use only the dot notation folder name as key
            if (posterMapping[oldKey]) {
                posterMapping[newKey] = posterMapping[oldKey];
                delete posterMapping[oldKey];
                this.stats.updatedMappings++;
                console.log(`   ✅ Mapping updated`);
            } else {
                console.log(`   ⚠️  No existing mapping found for old key`);
            }
            // Rename folder if requested
            if (this.renameFolders && !this.dryRun) {
                await this.renameMovieFolder(movie);
            }
            console.log('');
        }
    }

    /**
     * Rename a movie folder
     */
    async renameMovieFolder(movie) {
        const newFolderPath = path.join(this.moviesDir, movie.normalizedName);
        
        try {
            // Check if target folder already exists
            if (await this.fileExists(newFolderPath)) {
                console.log(`   ⚠️  Target folder already exists: ${movie.normalizedName}`);
                return;
            }
            
            await fs.rename(movie.folderPath, newFolderPath);
            this.stats.renamedFolders++;
            console.log(`   📁 Folder renamed: ${movie.folderName} → ${movie.normalizedName}`);
            
        } catch (error) {
            console.error(`   ❌ Failed to rename folder: ${error.message}`);
            this.stats.errors++;
        }
    }

    /**
     * Save updated poster mapping
     */
    async savePosterMapping(posterMapping) {
        try {
            const content = JSON.stringify(posterMapping, null, 2);
            await fs.writeFile(this.posterMappingFile, content, 'utf8');
            console.log(`💾 Poster mapping saved: ${this.posterMappingFile}`);
        } catch (error) {
            throw new Error(`Failed to save poster mapping: ${error.message}`);
        }
    }

    /**
     * Print final results
     */
    printResults() {
        console.log('\n📊 Normalization Results:');
        console.log('========================');
        console.log(`📁 Total movies processed: ${this.stats.totalMovies}`);
        console.log(`🔄 Movies normalized: ${this.stats.normalizedMovies}`);
        console.log(`📄 Mappings updated: ${this.stats.updatedMappings}`);
        console.log(`📁 Folders renamed: ${this.stats.renamedFolders}`);
        console.log(`❌ Errors: ${this.stats.errors}`);
        
        if (this.testMode) {
            console.log(`\n🧪 TEST MODE: Only processed first ${this.testLimit} movies.`);
            console.log('   Run without --test to process all movies.');
        }
        
        if (this.dryRun) {
            console.log('\n🧪 This was a dry run. No changes were made.');
            console.log('   Run without --dry-run to apply changes.');
        }
        
        if (this.renameFolders) {
            console.log('\n⚠️  Folder renaming was enabled.');
            console.log('   Please verify the changes before restarting your media server.');
        }
    }

    /**
     * Check if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

// Run the script
if (require.main === module) {
    const normalizer = new MovieNameNormalizer();
    normalizer.run().catch(console.error);
}

module.exports = MovieNameNormalizer; 