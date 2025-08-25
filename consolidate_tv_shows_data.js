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

// Function to consolidate all TV show data
function consolidateTVShowsData() {
    try {
        console.log('🚀 Starting TV Shows Data Consolidation...\n');
        
        // Load all JSON files
        const unifiedData = loadJSON(jsonPaths.unified, 'Unified TV Shows Data');
        const mediaLibraryData = loadJSON(jsonPaths.mediaLibrary, 'Media Library Data');
        const episodeImagesData = loadJSON(jsonPaths.episodeImages, 'Episode Images Data');
        const seasonImagesData = loadJSON(jsonPaths.seasonImages, 'Season Images Data');
        const castData = loadJSON(jsonPaths.cast, 'Cast Data');
        const descriptionsData = loadJSON(jsonPaths.descriptions, 'Descriptions Data');
        const genresData = loadJSON(jsonPaths.genres, 'Genres Data');
        const postersData = loadJSON(jsonPaths.posters, 'Posters Data');
        
        console.log('\n🔄 Consolidating data...\n');
        
        // Process each show in the unified data
        Object.keys(unifiedData).forEach(showName => {
            console.log(`Processing: ${showName}`);
            const show = unifiedData[showName];
            
            // Add show-level metadata from descriptions (simple key-value structure)
            if (descriptionsData[showName]) {
                show.description = descriptionsData[showName];
                console.log(`  📝 Added description`);
            }
            
            // Add show-level metadata from genres
            if (genresData[showName]) {
                show.genres = genresData[showName].genres;
                console.log(`  🏷️  Added genres`);
            }
            
            // Add show-level metadata from posters
            if (postersData[showName]) {
                show.poster = postersData[showName].poster;
                console.log(`  🖼️  Added show poster`);
            }
            
            // Add show-level metadata from cast
            if (castData[showName]) {
                show.cast = castData[showName].cast;
                show.crew = castData[showName].crew;
                console.log(`  👥 Added cast & crew`);
            }
            
            // Process seasons
            if (show.seasons) {
                Object.keys(show.seasons).forEach(seasonKey => {
                    const season = show.seasons[seasonKey];
                    
                    // Add season-level metadata
                    if (seasonImagesData[showName] && 
                        seasonImagesData[showName].seasons && 
                        seasonImagesData[showName].seasons[seasonKey]) {
                        
                        const seasonData = seasonImagesData[showName].seasons[seasonKey];
                        if (seasonData.poster) {
                            season.poster = seasonData.poster;
                        }
                        if (seasonData.airDate) {
                            season.airDate = seasonData.airDate;
                        }
                        if (seasonData.episodeCount) {
                            season.episodeCount = seasonData.episodeCount;
                        }
                    }
                    
                    // Process episodes
                    if (season.episodes) {
                        Object.keys(season.episodes).forEach(episodeKey => {
                            const episode = season.episodes[episodeKey];
                            
                            // Add episode-level metadata from episode images
                            if (episodeImagesData[showName] && 
                                episodeImagesData[showName].seasons && 
                                episodeImagesData[showName].seasons[seasonKey] &&
                                episodeImagesData[showName].seasons[seasonKey].episodes &&
                                episodeImagesData[showName].seasons[seasonKey].episodes[episodeKey]) {
                                
                                const episodeData = episodeImagesData[showName].seasons[seasonKey].episodes[episodeKey];
                                
                                // Only add fallback thumbnail if no FFmpeg thumbnail exists
                                if (episodeData.thumbnail && (!episode.still || episode.still.includes('placeholder'))) {
                                    episode.fallbackThumbnail = episodeData.thumbnail;
                                }
                                
                                if (episodeData.airDate) {
                                    episode.airDate = episodeData.airDate;
                                }
                                
                                if (episodeData.overview) {
                                    episode.overview = episodeData.overview;
                                }
                                
                                if (episodeData.still) {
                                    episode.originalStill = episodeData.still;
                                }
                            }
                        });
                    }
                });
            }
            
            // Add media library metadata if available
            if (mediaLibraryData[showName]) {
                const mediaLibData = mediaLibraryData[showName];
                if (mediaLibData.path) {
                    show.mediaLibraryPath = mediaLibData.path;
                }
                if (mediaLibData.folderName) {
                    show.folderName = mediaLibData.folderName;
                }
                if (mediaLibData.lastModified) {
                    show.lastModified = mediaLibData.lastModified;
                }
                console.log(`  📁 Added media library metadata`);
            }
            
            console.log(`  ✅ Enhanced with metadata`);
        });
        
        // Write the consolidated data back to the unified file
        console.log('\n💾 Writing consolidated data to unified JSON...');
        fs.writeFileSync(jsonPaths.unified, JSON.stringify(unifiedData, null, 2));
        
        console.log('\n🎉 Consolidation Complete!');
        console.log('✅ All supporting data has been integrated into tv-shows-unified.json');
        console.log('✅ You can now safely remove the supporting JSON files');
        console.log('\n📊 Summary of what was added:');
        console.log('  - Show descriptions, overviews, and taglines');
        console.log('  - Show genres and cast information');
        console.log('  - Show and season posters');
        console.log('  - Episode air dates and overviews');
        console.log('  - Fallback thumbnails for episodes');
        console.log('  - Media library paths and metadata');
        
        // Create a backup of the original unified file
        const backupPath = jsonPaths.unified.replace('.json', '_backup_before_consolidation.json');
        fs.copyFileSync(jsonPaths.unified, backupPath);
        console.log(`\n💾 Backup created: ${backupPath}`);
        
    } catch (error) {
        console.error('❌ Error during consolidation:', error);
    }
}

// Run the consolidation
consolidateTVShowsData(); 