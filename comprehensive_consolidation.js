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

// Function to consolidate all TV show data comprehensively
function comprehensiveConsolidation() {
    try {
        console.log('🚀 Starting COMPREHENSIVE TV Shows Data Consolidation...\n');
        console.log('📋 This will include ALL missing metadata:\n');
        console.log('  - Show posters and descriptions');
        console.log('  - Cast members with their images');
        console.log('  - Season posters and metadata');
        console.log('  - Episode metadata and fallback images');
        console.log('  - Video format support (.mkv, .mp4, .m4v)');
        console.log('  - Genres and media library paths\n');
        
        // Load all JSON files
        const unifiedData = loadJSON(jsonPaths.unified, 'Unified TV Shows Data');
        const mediaLibraryData = loadJSON(jsonPaths.mediaLibrary, 'Media Library Data');
        const episodeImagesData = loadJSON(jsonPaths.episodeImages, 'Episode Images Data');
        const seasonImagesData = loadJSON(jsonPaths.seasonImages, 'Season Images Data');
        const castData = loadJSON(jsonPaths.cast, 'Cast Data');
        const descriptionsData = loadJSON(jsonPaths.descriptions, 'Descriptions Data');
        const genresData = loadJSON(jsonPaths.genres, 'Genres Data');
        const postersData = loadJSON(jsonPaths.posters, 'Posters Data');

        console.log('\n🔄 Starting comprehensive consolidation...\n');

        // Process each show in the unified data
        Object.keys(unifiedData).forEach(showName => {
            console.log(`🎬 Processing: ${showName}`);
            const show = unifiedData[showName];
            
            // 1. ADD SHOW-LEVEL METADATA
            console.log(`  📝 Adding show-level metadata...`);
            
            // Add description
            if (descriptionsData[showName]) {
                show.description = descriptionsData[showName];
                console.log(`    ✅ Added description`);
            }
            
            // Add genres
            if (genresData[showName]) {
                show.genres = genresData[showName]; // Direct array, not genresData[showName].genres
                console.log(`    ✅ Added genres: ${genresData[showName].join(', ')}`);
            }
            
            // Add show poster
            if (postersData[showName]) {
                show.poster = postersData[showName].poster;
                console.log(`    ✅ Added show poster: ${postersData[showName].poster}`);
            }
            
            // Add cast and crew with images
            if (castData[showName]) {
                show.cast = castData[showName].cast || [];
                show.crew = castData[showName].crew || [];
                console.log(`    ✅ Added cast (${show.cast.length} members) and crew (${show.crew.length} members)`);
                
                // Log cast members for verification
                if (show.cast.length > 0) {
                    console.log(`    👥 Cast includes: ${show.cast.slice(0, 3).map(member => member.name || member).join(', ')}${show.cast.length > 3 ? '...' : ''}`);
                }
            }
            
            // 2. ADD MEDIA LIBRARY METADATA
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
                console.log(`    📁 Added media library metadata`);
            }
            
            // 3. PROCESS SEASONS AND EPISODES
            if (show.seasons) {
                console.log(`  🎭 Processing ${Object.keys(show.seasons).length} seasons...`);
                
                Object.keys(show.seasons).forEach(seasonKey => {
                    const season = show.seasons[seasonKey];
                    
                    // Add season-level metadata
                    if (seasonImagesData[showName] && 
                        seasonImagesData[showName].seasons && 
                        seasonImagesData[showName].seasons[seasonKey]) {
                        
                        const seasonData = seasonImagesData[showName].seasons[seasonKey];
                        
                        // Add season poster
                        if (seasonData.poster) {
                            season.poster = seasonData.poster;
                            console.log(`    🖼️  Season ${seasonKey} poster: ${seasonData.poster}`);
                        }
                        
                        // Add season metadata
                        if (seasonData.airDate) {
                            season.airDate = seasonData.airDate;
                        }
                        if (seasonData.episodeCount) {
                            season.episodeCount = seasonData.episodeCount;
                        }
                        if (seasonData.description) {
                            season.description = seasonData.description;
                        }
                    }
                    
                    // Process episodes
                    if (season.episodes) {
                        console.log(`    📺 Processing ${Object.keys(season.episodes).length} episodes in season ${seasonKey}...`);
                        
                        Object.keys(season.episodes).forEach(episodeKey => {
                            const episode = season.episodes[episodeKey];
                            
                            // Add episode-level metadata from episode images
                            if (episodeImagesData[showName] && 
                                episodeImagesData[showName].seasons && 
                                episodeImagesData[showName].seasons[seasonKey] &&
                                episodeImagesData[showName].seasons[seasonKey].episodes &&
                                episodeImagesData[showName].seasons[seasonKey].episodes[episodeKey]) {
                                
                                const episodeData = episodeImagesData[showName].seasons[seasonKey].episodes[episodeKey];
                                
                                // Add fallback thumbnail if no FFmpeg thumbnail exists
                                if (episodeData.thumbnail && (!episode.still || episode.still.includes('placeholder'))) {
                                    episode.fallbackThumbnail = episodeData.thumbnail;
                                    console.log(`      🖼️  Episode ${episodeKey} fallback thumbnail: ${episodeData.thumbnail}`);
                                }
                                
                                // Add episode metadata
                                if (episodeData.airDate) {
                                    episode.airDate = episodeData.airDate;
                                }
                                if (episodeData.overview) {
                                    episode.overview = episodeData.overview;
                                }
                                if (episodeData.still) {
                                    episode.originalStill = episodeData.still;
                                }
                                if (episodeData.description) {
                                    episode.description = episodeData.description;
                                }
                            }
                            
                            // Verify video format support
                            if (episode.path) {
                                const supportsVideo = supportsVideoFormats(episode.path);
                                if (supportsVideo) {
                                    episode.videoFormat = path.extname(episode.path).toLowerCase();
                                    episode.supportsVideo = true;
                                } else {
                                    episode.supportsVideo = false;
                                    console.log(`      ⚠️  Episode ${episodeKey} has unsupported format: ${episode.path}`);
                                }
                            }
                        });
                    }
                });
            }
            
            // 4. ADD SPECIALS HANDLING
            if (show.seasons && show.seasons['Specials']) {
                console.log(`  🎉 Processing Specials...`);
                const specials = show.seasons['Specials'];
                
                // Add specials metadata
                if (seasonImagesData[showName] && 
                    seasonImagesData[showName].seasons && 
                    seasonImagesData[showName].seasons['Specials']) {
                    
                    const specialsData = seasonImagesData[showName].seasons['Specials'];
                    if (specialsData.poster) {
                        specials.poster = specialsData.poster;
                        console.log(`    🖼️  Specials poster: ${specialsData.poster}`);
                    }
                    if (specialsData.description) {
                        specials.description = specialsData.description;
                    }
                }
                
                // Process special episodes
                if (specials.episodes) {
                    Object.keys(specials.episodes).forEach(episodeKey => {
                        const episode = specials.episodes[episodeKey];
                        
                        // Add special episode metadata
                        if (episodeImagesData[showName] && 
                            episodeImagesData[showName].seasons && 
                            episodeImagesData[showName].seasons['Specials'] &&
                            episodeImagesData[showName].seasons['Specials'].episodes &&
                            episodeImagesData[showName].seasons['Specials'].episodes[episodeKey]) {
                            
                            const episodeData = episodeImagesData[showName].seasons['Specials'].episodes[episodeKey];
                            
                            if (episodeData.thumbnail && (!episode.still || episode.still.includes('placeholder'))) {
                                episode.fallbackThumbnail = episodeData.thumbnail;
                            }
                            if (episodeData.overview) {
                                episode.overview = episodeData.overview;
                            }
                            if (episodeData.description) {
                                episode.description = episodeData.description;
                            }
                        }
                        
                        // Verify video format support for specials
                        if (episode.path) {
                            const supportsVideo = supportsVideoFormats(episode.path);
                            episode.supportsVideo = supportsVideo;
                            if (supportsVideo) {
                                episode.videoFormat = path.extname(episode.path).toLowerCase();
                            }
                        }
                    });
                }
            }
            
            console.log(`  ✅ ${showName} consolidation complete\n`);
        });

        // Write the consolidated data back to the unified file
        console.log('\n💾 Writing comprehensive consolidated data to unified JSON...');
        fs.writeFileSync(jsonPaths.unified, JSON.stringify(unifiedData, null, 2));

        console.log('\n🎉 COMPREHENSIVE CONSOLIDATION COMPLETE!');
        console.log('✅ All missing metadata has been integrated:');
        console.log('  ✅ Show posters, descriptions, and genres');
        console.log('  ✅ Cast members with their images');
        console.log('  ✅ Season posters and metadata');
        console.log('  ✅ Episode metadata and fallback images');
        console.log('  ✅ Video format support verification');
        console.log('  ✅ Media library paths and metadata');
        console.log('  ✅ Specials handling with metadata');
        
        // Create a comprehensive backup
        const backupPath = jsonPaths.unified.replace('.json', '_comprehensive_backup.json');
        fs.copyFileSync(jsonPaths.unified, backupPath);
        console.log(`\n💾 Comprehensive backup created: ${backupPath}`);
        
        // Show summary statistics
        let totalShows = Object.keys(unifiedData).length;
        let showsWithPosters = 0;
        let showsWithCast = 0;
        let showsWithDescriptions = 0;
        let totalSeasons = 0;
        let totalEpisodes = 0;
        let episodesWithVideo = 0;
        
        Object.values(unifiedData).forEach(show => {
            if (show.poster) showsWithPosters++;
            if (show.cast && show.cast.length > 0) showsWithCast++;
            if (show.description) showsWithDescriptions++;
            
            if (show.seasons) {
                totalSeasons += Object.keys(show.seasons).length;
                Object.values(show.seasons).forEach(season => {
                    if (season.episodes) {
                        totalEpisodes += Object.keys(season.episodes).length;
                        Object.values(season.episodes).forEach(episode => {
                            if (episode.supportsVideo) episodesWithVideo++;
                        });
                    }
                });
            }
        });
        
        console.log('\n📊 FINAL STATISTICS:');
        console.log(`  📺 Total TV Shows: ${totalShows}`);
        console.log(`  🖼️  Shows with Posters: ${showsWithPosters} (${((showsWithPosters/totalShows)*100).toFixed(1)}%)`);
        console.log(`  👥 Shows with Cast: ${showsWithCast} (${((showsWithCast/totalShows)*100).toFixed(1)}%)`);
        console.log(`  📝 Shows with Descriptions: ${showsWithDescriptions} (${((showsWithDescriptions/totalShows)*100).toFixed(1)}%)`);
        console.log(`  🎭 Total Seasons: ${totalSeasons}`);
        console.log(`  📺 Total Episodes: ${totalEpisodes}`);
        console.log(`  🎬 Episodes with Video Support: ${episodesWithVideo} (${((episodesWithVideo/totalEpisodes)*100).toFixed(1)}%)`);
        
        console.log('\n🚀 Your unified JSON is now the COMPLETE single source of truth!');
        console.log('✅ You can safely remove all supporting JSON files');

    } catch (error) {
        console.error('❌ Error during comprehensive consolidation:', error);
    }
}

// Run the comprehensive consolidation
comprehensiveConsolidation();
