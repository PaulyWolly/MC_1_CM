/*
  SCAN_MEDIA_LIBRARY_TV-SHOWS.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

// Import animation helper
const { ProgressAnimation } = require('../CONVERT/animation-helper');

// Animation markers for dot-dot-dot pattern
const ANIMATION_MARKERS = [':..:', ':..:', ':..:', ':..:', ':..:'];

function logWithAnimation(message, step = 0) {
    const marker = ANIMATION_MARKERS[step % ANIMATION_MARKERS.length];
    console.log(`${marker} ${message}`);
}

const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const OUTPUT_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json');

// Get TMDB ID from command line arguments
const args = process.argv.slice(2);
const tmdbIdArg = args.find(arg => arg.startsWith('--tmdb-id='));
const TMDB_ID = tmdbIdArg ? tmdbIdArg.split('=')[1] : null;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

function isVideoFile(filename) {
    const exts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    return exts.includes(path.extname(filename).toLowerCase());
}

function isBackupFolder(folderName) {
    // Skip backup folders and system folders
    const backupPatterns = [
        /backup/i,
        /bkup/i,
        /_backup/i,
        /_bkup/i,
        /\.backup/i,
        /\.bkup/i,
        /temp/i,
        /tmp/i,
        /cache/i,
        /archive/i,
        /old/i,
        /original/i,
        /_original/i,
        /\.old/i,
        /\.orig/i
    ];
    
    return backupPatterns.some(pattern => pattern.test(folderName));
}

/**
 * SAFE MERGE: Only add/update fields, never remove existing data
 */
function safeMergeShowData(existingShow, newShowData) {
    if (!existingShow) {
        return newShowData;
    }
    
    // Merge show data - preserve existing, add new
    const mergedShow = {
        ...existingShow, // Keep ALL existing data
        ...newShowData,  // Add/update with new data
        // Preserve critical arrays and objects
        files: existingShow.files || newShowData.files || [],
        cast: existingShow.cast || newShowData.cast || [],
        genres: existingShow.genres || newShowData.genres || ["Drama"],
        about: {
            ...existingShow.about,
            ...newShowData.about
        },
        seasons: existingShow.seasons || newShowData.seasons || {}
    };
    
    return mergedShow;
}

/**
 * SAFE MERGE: Only add/update season data, never remove existing
 */
function safeMergeSeasonData(existingSeason, newSeasonData) {
    if (!existingSeason) {
        return newSeasonData;
    }
    
    return {
        ...existingSeason, // Keep ALL existing data
        ...newSeasonData,  // Add/update with new data
        episodes: existingSeason.episodes || newSeasonData.episodes || {}
    };
}

/**
 * SAFE MERGE: Only add/update episode data, never remove existing
 */
function safeMergeEpisodeData(existingEpisode, newEpisodeData) {
    if (!existingEpisode) {
        return newEpisodeData;
    }
    
    return {
        ...existingEpisode, // Keep ALL existing data
        ...newEpisodeData,  // Add/update with new data
        // Preserve video file paths if they exist
        path: existingEpisode.path || newEpisodeData.path,
        absPath: existingEpisode.absPath || newEpisodeData.absPath,
        videoFormat: existingEpisode.videoFormat || newEpisodeData.videoFormat,
        supportsVideo: existingEpisode.supportsVideo || newEpisodeData.supportsVideo,
        fileSize: existingEpisode.fileSize || newEpisodeData.fileSize
    };
}

/**
 * Find video files for a specific episode
 */
function findEpisodeVideoFiles(showPath, seasonNum, episodeNum) {
    const seasonDir = path.join(showPath, `Season ${seasonNum}`);
    
    if (!fs.existsSync(seasonDir)) {
        return [];
    }
    
    try {
        const files = fs.readdirSync(seasonDir);
        const videoFiles = [];
        
        // Look for video files that match the episode pattern (NO leading zeros)
        const patterns = [
            new RegExp(`[Ss]${seasonNum}[Ee]${episodeNum}`, 'i'),
            new RegExp(`${seasonNum}[Xx]${episodeNum}`, 'i'),
            new RegExp(`Season\\s*${seasonNum}.*Episode\\s*${episodeNum}`, 'i'),
            new RegExp(`${seasonNum}\\.${episodeNum}`, 'i')
        ];
        
        for (const file of files) {
            if (isVideoFile(file)) {
                // Check if this file matches any of our patterns
                for (const pattern of patterns) {
                    if (pattern.test(file)) {
                        const fullPath = path.join(seasonDir, file);
                        const stat = fs.statSync(fullPath);
                        
                        videoFiles.push({
                            name: file,
                            path: fullPath.replace(/\\/g, '/'), // Convert to forward slashes for JSON
                            absPath: fullPath,
                            size: stat.size,
                            ext: path.extname(file).toLowerCase()
                        });
                    }
                }
            }
        }
        
        return videoFiles;
    } catch (error) {
        console.log(`⚠️ [SCAN] Error scanning ${seasonDir}: ${error.message}`);
        return [];
    }
}

/**
 * Create episode object following the EXACT template structure
 */
function createEpisodeObject(episodeNum, seasonNum, showTitle, showPath, videoFiles, tmdbEpisodeData = null) {
    const primaryVideo = videoFiles.length > 0 ? videoFiles[0] : null;
    
    // Extract episode title from filename or use TMDB data
    let episodeTitle = `Episode ${episodeNum}`;
    if (primaryVideo) {
        const baseName = path.basename(primaryVideo.name, primaryVideo.ext);
        episodeTitle = baseName;
    } else if (tmdbEpisodeData && tmdbEpisodeData.name) {
        episodeTitle = tmdbEpisodeData.name;
    }
    
    // Format episode title: "Show Name (Year) | S1E1 | Episode Title" (NO leading zeros)
    const formattedTitle = `${showTitle} | S${seasonNum}E${episodeNum} | ${episodeTitle}`;
    
    const episode = {
        title: formattedTitle,
        absPath: primaryVideo ? primaryVideo.absPath : null,
        path: primaryVideo ? primaryVideo.path.replace('S:/MEDIA/', '') : null, // Remove S:/MEDIA/ prefix for relative path
        duration: tmdbEpisodeData?.runtime || 22, // Default 22 minutes for TV episodes
        season: parseInt(seasonNum),
        episode: parseInt(episodeNum),
        type: "episode",
        isSpecials: false,
        videoFormat: primaryVideo ? primaryVideo.ext : null,
        supportsVideo: videoFiles.length > 0,
        still: tmdbEpisodeData?.still_path ? `https://image.tmdb.org/t/p/w500${tmdbEpisodeData.still_path}` : `https://via.placeholder.com/400x225/333/666?text=S${seasonNum}E${episodeNum}`,
        thumbnail: tmdbEpisodeData?.still_path ? `https://image.tmdb.org/t/p/w500${tmdbEpisodeData.still_path}` : `https://via.placeholder.com/400x225/333/666?text=S${seasonNum}E${episodeNum}`
    };
    
    return episode;
}

/**
 * Process a single TV show directory and SAFELY update the show object
 */
async function processShowDirectory(showDir, showName, existingData, tmdbData = null) {
    const showPath = path.join(MEDIA_ROOT, showDir);
    
    if (!fs.existsSync(showPath)) {
        console.log(`⚠️ [SCAN] Show directory not found: ${showPath}`);
        return null;
    }
    
    // Create normalized key - ALWAYS convert "&" to "and" for internal use
    let normalizedKey = normalizeKey(showName);
    
    // CRITICAL: Always convert "&" to "and" for internal data consistency
    // The "&" symbol is ONLY for UI display, never for internal keys
    normalizedKey = normalizedKey.replace(/\.&\./g, '.and.');
    
    // Log when we make this conversion
    if (showName.includes('&')) {
        console.log(`🔧 [SCAN] Converted "&" to "and" for internal key: ${showName} → ${normalizedKey}`);
    }
    
    // Get existing show data for TMDB metadata only
    const existingShow = existingData[normalizedKey];
    
    // Create show data - CONVERT filesystem to JSON structure
    const show = {
        // Top-level fields (basic info)
        TMDBTitle: existingShow?.TMDBTitle || showName.replace(/\s*\(\d{4}\)\s*$/, ''),
        type: "tvshow",
        isMovie: false,
        normalizedKey: normalizedKey,
        title: showName,
        mediaType: "tvshow",
        tmdbId: existingShow?.tmdbId || null,
        poster: existingShow?.poster || `https://via.placeholder.com/300x450/333/666?text=${showName}`,
        description: existingShow?.description || "To be gathered",
        year: parseInt(showName.match(/\((\d{4})\)/)?.[1]) || new Date().getFullYear(),
        path: showPath.replace(/\\/g, '/'),
        absPath: showPath,
        backdrop: existingShow?.backdrop || null,
        
        // Metadata timestamps
        created: existingShow?.created || new Date().toISOString(),
        updated: new Date().toISOString(),
        
        // Complex objects - PRESERVE existing TMDB data only
        about: existingShow?.about || {
            description: "To be gathered",
            status: "Unknown",
            first_air_date: "Unknown",
            last_air_date: "Unknown",
            number_of_seasons: 0,
            number_of_episodes: 0,
            vote_average: 0,
            vote_count: 0
        },
        genres: existingShow?.genres || ["Drama"],
        cast: existingShow?.cast || [],
        
        // Large data structures - CONVERT from filesystem
        seasons: {},
        files: []
    };
    
    // Process seasons - ALWAYS convert filesystem to JSON structure
    {
        const seasonDirs = fs.readdirSync(showPath).filter(item => {
            const itemPath = path.join(showPath, item);
            return fs.statSync(itemPath).isDirectory() && 
                   (item.startsWith('Season ') || item.match(/^Season\s*\d+$/i));
        });
        
        for (const seasonDir of seasonDirs) {
            const seasonMatch = seasonDir.match(/Season\s*(\d+)/i);
            if (!seasonMatch) continue;
            
            const seasonNum = seasonMatch[1];
            const seasonPath = path.join(showPath, seasonDir);
            
            // Get TMDB season data if available
            const tmdbSeasonData = tmdbData?.seasons?.[parseInt(seasonNum)];
            
            // Create new season data
            const newSeasonData = {
                poster: tmdbSeasonData?.poster_path ? `https://image.tmdb.org/t/p/w260_and_h390_bestv2${tmdbSeasonData.poster_path}` : `https://via.placeholder.com/260x390/333/666?text=Season ${seasonNum}`,
                season_poster: tmdbSeasonData?.poster_path ? `https://image.tmdb.org/t/p/w260_and_h390_bestv2${tmdbSeasonData.poster_path}` : `https://via.placeholder.com/260x390/333/666?text=Season ${seasonNum}`,
                season_thumbnail: tmdbSeasonData?.poster_path ? `https://image.tmdb.org/t/p/w260_and_h390_bestv2${tmdbSeasonData.poster_path}` : `https://via.placeholder.com/260x390/333/666?text=Season ${seasonNum}`,
                episodes: {}
            };
            
            // CONVERT: Use filesystem data as the source of truth for season structure
            // This ensures JSON structure matches filesystem structure
            const season = newSeasonData;
            
            // Process episodes in this season - ALWAYS scan filesystem and convert to JSON structure
            // This ensures filesystem structure matches JSON structure
            {
                const episodeFiles = fs.readdirSync(seasonPath).filter(file => isVideoFile(file));
                
                // Group episodes by episode number
                const episodeGroups = {};
                for (const file of episodeFiles) {
                    const episodeMatch = file.match(/[Ss]\d+[Ee](\d+)/i);
                    if (episodeMatch) {
                        const episodeNum = episodeMatch[1];
                        if (!episodeGroups[episodeNum]) {
                            episodeGroups[episodeNum] = [];
                        }
                        episodeGroups[episodeNum].push(file);
                    }
                }
                
                // Create episode objects with episode numbers matching filesystem
                for (const [episodeNum, files] of Object.entries(episodeGroups)) {
                    const videoFiles = files.map(file => {
                        const fullPath = path.join(seasonPath, file);
                        const stat = fs.statSync(fullPath);
                        return {
                            name: file,
                            path: fullPath.replace(/\\/g, '/'),
                            absPath: fullPath,
                            size: stat.size,
                            ext: path.extname(file).toLowerCase()
                        };
                    });
                    
                    // Get TMDB episode data if available
                    const tmdbEpisodeData = tmdbSeasonData?.episodes?.find(ep => ep.episode_number === parseInt(episodeNum));
                    
                    // Create new episode data
                    const newEpisodeData = createEpisodeObject(episodeNum, seasonNum, showName, showPath, videoFiles, tmdbEpisodeData);
                    
                    // CONVERT: Use filesystem data as the source of truth
                    // This ensures JSON structure matches filesystem structure
                    const episode = newEpisodeData;
                    
                    // Use episode number as key (no leading zeros to match filesystem)
                    const episodeKey = episodeNum;
                    season.episodes[episodeKey] = episode;
                }
            }
            
            show.seasons[seasonNum] = season;
        }
    }
    
    // Generate files array from all episodes - ALWAYS regenerate from filesystem
    // This ensures files array matches actual filesystem structure
    {
        show.files = [];
        for (const season of Object.values(show.seasons)) {
            if (season.episodes) {
                for (const episode of Object.values(season.episodes)) {
                    if (episode.path && episode.absPath) {
                        show.files.push({
                            path: episode.path,
                            absPath: episode.absPath,
                            quality: "1080p", // Default quality
                            size: episode.fileSize || 0
                        });
                    }
                }
            }
        }
    }
    
    // Add metadata timestamps
    const now = new Date().toISOString();
    if (!show.created) {
        show.created = now;
    }
    show.updated = now;
    
    return show;
}

/**
 * Fetch TMDB data for a show
 */
async function fetchTMDBData(tmdbId) {
    if (!TMDB_API_KEY) {
        console.log('⚠️ [SCAN] No TMDB API key found');
        return null;
    }
    
    try {
        console.log(`   🔍 [SCAN] Fetching TMDB data for ID: ${tmdbId}`);
        
        // Fetch show data
        const showResponse = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        const showData = await showResponse.json();
        
        // Fetch cast data
        const castResponse = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}`);
        const castData = await castResponse.json();
        
        // Fetch season data
        const seasonsData = {};
        if (showData.seasons) {
            console.log(`   🔍 [SCAN] Found ${showData.seasons.length} seasons in TMDB data`);
            for (const season of showData.seasons) {
                try {
                    console.log(`   🔍 [SCAN] Fetching season ${season.season_number} data...`);
                    const seasonResponse = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${season.season_number}?api_key=${TMDB_API_KEY}`);
                    const seasonData = await seasonResponse.json();
                    seasonsData[season.season_number] = seasonData;
                    console.log(`   ✅ [SCAN] Season ${season.season_number} poster: ${seasonData.poster_path ? 'Found' : 'Not found'}`);
                } catch (error) {
                    console.log(`   ⚠️ [SCAN] Could not fetch season ${season.season_number} data: ${error.message}`);
                }
            }
        }
        
        return {
            show: showData,
            cast: castData.cast || [],
            crew: castData.crew || [],
            seasons: seasonsData
        };
    } catch (error) {
        console.log(`   ❌ [SCAN] Error fetching TMDB data: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log(`🔍 [SCAN] CONVERT SCAN - Converting filesystem structure to JSON format`);
    console.log(`🔍 [SCAN] Scanning TV-SHOWS library at: ${MEDIA_ROOT}`);
    
    // Check if media root exists
    if (!fs.existsSync(MEDIA_ROOT)) {
        console.error(`❌ [SCAN] Error: Media root directory does not exist: ${MEDIA_ROOT}`);
        process.exit(1);
    }

    // Load existing data
    let existingData = {};
    try {
        if (fs.existsSync(OUTPUT_FILE)) {
            existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            console.log(`📖 [SCAN] Loaded existing data with ${Object.keys(existingData).length} TV shows`);
        }
    } catch (e) {
        console.log(`⚠️ [SCAN] Could not load existing data: ${e.message}`);
    }

    // Get all show directories
    const showDirs = fs.readdirSync(MEDIA_ROOT).filter(item => {
        const itemPath = path.join(MEDIA_ROOT, item);
        return fs.statSync(itemPath).isDirectory() && !isBackupFolder(item);
    });

    console.log(`🔍 [SCAN] Found ${showDirs.length} show directories`);

    // Fetch TMDB data if ID provided
    // Note: This script processes existing shows and preserves their existing TMDB data
    // It does NOT fetch new TMDB data - that should be done with the COMPLETE script
    let tmdbData = null;

    // Process each show
    let showsProcessed = 0;
    let showsUpdated = 0;
    let showsCreated = 0;

    for (const showDir of showDirs) {
        showsProcessed++;
        const progress = Math.round((showsProcessed / showDirs.length) * 100);
        
        console.log(`:..: Processing show ${showsProcessed}/${showDirs.length} (${progress}%) - ${showDir}`);
        
        try {
            const show = await processShowDirectory(showDir, showDir, existingData, tmdbData);
            
            if (show) {
                const normalizedKey = show.normalizedKey;
                const existed = existingData[normalizedKey];
                
                existingData[normalizedKey] = show;
                
                if (existed) {
                    showsUpdated++;
                    console.log(`✅ [SCAN] CONVERTED show: ${show.TMDBTitle} (filesystem → JSON structure)`);
                } else {
                    showsCreated++;
                    console.log(`✅ [SCAN] Created new show: ${show.TMDBTitle}`);
                }
            }
        } catch (error) {
            console.log(`❌ [SCAN] Error processing ${showDir}: ${error.message}`);
        }
    }

    // Save updated data
    console.log('\n💾 [SCAN] Saving updated data...');
    
    try {
        // Create backup
        const backupPath = `public/components/MediaLibrary/data/tv-shows/bkup/tv-shows-safe-scan-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(backupPath, JSON.stringify(existingData, null, 2));
        console.log(`✅ [SCAN] Backup created: ${backupPath}`);
        
        // Save updated data
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingData, null, 2));
        console.log('✅ [SCAN] Updated JSON file saved');
        
    } catch (error) {
        console.error('❌ [SCAN] Error saving data:', error.message);
        process.exit(1);
    }

    console.log('\n📊 [SCAN] Summary:');
    console.log(`   - Shows processed: ${showsProcessed}`);
    console.log(`   - Shows converted: ${showsUpdated}`);
    console.log(`   - Shows created: ${showsCreated}`);
    console.log(`   - Total shows in library: ${Object.keys(existingData).length}`);

    console.log('\n✅ [SCAN] CONVERT TV-SHOWS scan complete!');
    console.log('🎬 Filesystem structure converted to JSON format - seasons and episodes regenerated!');
}

main().catch(console.error);
