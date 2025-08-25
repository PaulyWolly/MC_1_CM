const fs = require('fs');
const path = require('path');

// Paths to all the JSON files
const jsonPaths = {
    unified: './public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json',
    mediaLibrary: './public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json',
    episodeImages: './public/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json',
    seasonImages: './public/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json',
    cast: './public/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json',
    descriptions: './public/components/MediaLibrary/data/tv-shows/tv-show_descriptions_normalized.json',
    genres: './public/components/MediaLibrary/data/tv-shows/tv_genres_normalized.json',
    posters: './public/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json'
};

// Function to safely load JSON file
function loadJSON(filePath, description) {
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log(`✅ Loaded ${description}: ${Object.keys(data).length} items`);
            return data;
        } else {
            console.log(`⚠️  File not found: ${description}`);
            return {};
        }
    } catch (error) {
        console.error(`❌ Error loading ${description}:`, error.message);
        return {};
    }
}

// Function to check if a file path supports video formats
function supportsVideoFormats(filePath) {
    if (!filePath) return false;
    const videoExtensions = ['.mkv', '.mp4', '.m4v', '.avi', '.mov', '.wmv'];
    const extension = path.extname(filePath).toLowerCase();
    return videoExtensions.includes(extension);
}

// Function to fix the consolidation
function fixConsolidation() {
    try {
        console.log('🔧 FIXING CONSOLIDATION - Adding Missing Metadata...\n');
        
        // Load all JSON files
        const unifiedData = loadJSON(jsonPaths.unified, 'Unified TV Shows Data');
        const mediaLibraryData = loadJSON(jsonPaths.mediaLibrary, 'Media Library Data');
        const episodeImagesData = loadJSON(jsonPaths.episodeImages, 'Episode Images Data');
        const seasonImagesData = loadJSON(jsonPaths.seasonImages, 'Season Images Data');
        const castData = loadJSON(jsonPaths.cast, 'Cast Data');
        const descriptionsData = loadJSON(jsonPaths.descriptions, 'Descriptions Data');
        const genresData = loadJSON(jsonPaths.genres, 'Genres Data');
        const postersData = loadJSON(jsonPaths.posters, 'Posters Data');

        console.log('\n🔄 Adding missing metadata...\n');

        let addedPosters = 0;
        let addedCast = 0;
        let addedDescriptions = 0;
        let addedGenres = 0;

        // Process each show in the unified data
        Object.keys(unifiedData).forEach(showName => {
            const show = unifiedData[showName];
            
            // Add show poster
            if (postersData[showName] && !show.poster) {
                show.poster = postersData[showName];
                addedPosters++;
                console.log(`  🖼️  Added poster for ${showName}`);
            }
            
            // Add description
            if (descriptionsData[showName] && !show.description) {
                show.description = descriptionsData[showName];
                addedDescriptions++;
                console.log(`  📝 Added description for ${showName}`);
            }
            
            // Add genres
            if (genresData[showName] && !show.genres) {
                show.genres = genresData[showName];
                addedGenres++;
                console.log(`  🏷️  Added genres for ${showName}: ${genresData[showName].join(', ')}`);
            }
            
            // Add cast and crew
            if (castData[showName] && (!show.cast || show.cast.length === 0)) {
                show.cast = castData[showName];
                addedCast++;
                console.log(`  👥 Added cast for ${showName}: ${castData[showName].length} members`);
            }
            
            // Add media library metadata
            if (mediaLibraryData[showName]) {
                const mediaLibData = mediaLibraryData[showName];
                if (mediaLibData.path && !show.mediaLibraryPath) {
                    show.mediaLibraryPath = mediaLibData.path;
                }
                if (mediaLibData.folderName && !show.folderName) {
                    show.folderName = mediaLibData.folderName;
                }
                if (mediaLibData.lastModified && !show.lastModified) {
                    show.lastModified = mediaLibData.lastModified;
                }
            }
        });

        // Write the fixed data back to the unified file
        console.log('\n💾 Writing fixed data to unified JSON...');
        fs.writeFileSync(jsonPaths.unified, JSON.stringify(unifiedData, null, 2));

        console.log('\n🎉 CONSOLIDATION FIXED!');
        console.log(`✅ Added ${addedPosters} show posters`);
        console.log(`✅ Added ${addedCast} cast lists`);
        console.log(`✅ Added ${addedDescriptions} descriptions`);
        console.log(`✅ Added ${addedGenres} genre lists`);
        
        // Create a backup
        const backupPath = jsonPaths.unified.replace('.json', '_fixed_backup.json');
        fs.copyFileSync(jsonPaths.unified, backupPath);
        console.log(`\n💾 Backup created: ${backupPath}`);

        // Show final statistics
        let totalShows = Object.keys(unifiedData).length;
        let showsWithPosters = 0;
        let showsWithCast = 0;
        let showsWithDescriptions = 0;
        let showsWithGenres = 0;

        Object.values(unifiedData).forEach(show => {
            if (show.poster) showsWithPosters++;
            if (show.cast && show.cast.length > 0) showsWithCast++;
            if (show.description) showsWithDescriptions++;
            if (show.genres) showsWithGenres++;
        });

        console.log('\n📊 FINAL STATISTICS:');
        console.log(`  📺 Total TV Shows: ${totalShows}`);
        console.log(`  🖼️  Shows with Posters: ${showsWithPosters} (${((showsWithPosters/totalShows)*100).toFixed(1)}%)`);
        console.log(`  👥 Shows with Cast: ${showsWithCast} (${((showsWithCast/totalShows)*100).toFixed(1)}%)`);
        console.log(`  📝 Shows with Descriptions: ${showsWithDescriptions} (${((showsWithDescriptions/totalShows)*100).toFixed(1)}%)`);
        console.log(`  🏷️  Shows with Genres: ${showsWithGenres} (${((showsWithGenres/totalShows)*100).toFixed(1)}%)`);

    } catch (error) {
        console.error('❌ Error during consolidation fix:', error);
    }
}

// Run the fix
fixConsolidation();
