/*
  SCAN_MEDIA_LIBRARY_TV-SHOWS.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
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
        /\.old/i,
        /_old/i,
        /archive/i,
        /\.archive/i,
        /_archive/i
    ];
    
    return backupPatterns.some(pattern => pattern.test(folderName));
}

function scanDirectory(dir) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const folders = [];
        const files = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                // Skip backup folders
                if (!isBackupFolder(entry.name)) {
                    folders.push(entry.name);
                } else {
                    console.log(`🚫 [SCAN] Skipping backup folder: ${entry.name}`);
                }
            } else if (entry.isFile() && isVideoFile(entry.name)) {
                files.push(entry.name);
            }
        }
        return { folders, files };
    } catch (error) {
        console.warn(`⚠️ [SCAN] Warning: Could not read directory ${dir}: ${error.message}`);
        return { folders: [], files: [] };
    }
}

function isValidShowStructure(showTitle, folders, files) {
    // Check if this looks like a valid TV show structure
    if (!showTitle || showTitle.trim() === '') return false;
    
    // Basic validation - show should have some content
    return folders.length > 0 || files.length > 0;
}

/**
 * Check if an existing TV show has new episodes and merge them
 * @param {Object} existingShow - The existing show data
 * @param {Object} scannedShow - The newly scanned show data
 * @returns {Object|null} - Updated show data if changes found, null if no changes
 */
function checkForNewEpisodes(existingShow, scannedShow) {
    let hasChanges = false;
    const updatedShow = { ...existingShow };
    
    // Check for new episodes in existing seasons
    if (scannedShow.folders && existingShow.folders) {
        for (const scannedFolder of scannedShow.folders) {
            const existingFolder = existingShow.folders.find(f => f.path === scannedFolder.path);
            
            if (existingFolder) {
                // Season exists, check for new episodes
                const existingEpisodeCount = existingFolder.files ? existingFolder.files.length : 0;
                const scannedEpisodeCount = scannedFolder.files ? scannedFolder.files.length : 0;
                
                if (scannedEpisodeCount > existingEpisodeCount) {
                    console.log(`   📺 [SCAN] Found ${scannedEpisodeCount - existingEpisodeCount} new episodes in ${scannedFolder.path}`);
                    existingFolder.files = scannedFolder.files; // Update with all episodes
                    hasChanges = true;
                }
            } else {
                // New season found
                console.log(`   📁 [SCAN] Found new season: ${scannedFolder.path}`);
                if (!updatedShow.folders) updatedShow.folders = [];
                updatedShow.folders.push(scannedFolder);
                hasChanges = true;
            }
        }
    }
    
    // Check for new episodes in root (if no season folders)
    if (scannedShow.files && scannedShow.files.length > 0) {
        const existingEpisodeCount = existingShow.files ? existingShow.files.length : 0;
        const scannedEpisodeCount = scannedShow.files.length;
        
        if (scannedEpisodeCount > existingEpisodeCount) {
            console.log(`   📺 [SCAN] Found ${scannedEpisodeCount - existingEpisodeCount} new episodes in root`);
            updatedShow.files = scannedShow.files;
            hasChanges = true;
        }
    }
    
    return hasChanges ? reorderShowFields(updatedShow) : null;
}

function walkShows(dir, relPath = '') {
    try {
        const absPath = path.join(dir, relPath);
        const { folders, files } = scanDirectory(absPath);
        const relParts = relPath.split(path.sep).filter(Boolean);
        let showTitle = relParts.length > 0 ? relParts[0] : '';
        let normalizedKey = showTitle ? normalizeKey(showTitle) : '';
        // Only treat as a show root if at the first folder level
        let isShowRoot = relParts.length === 1;
        

        
        // If we're at the root level, process each folder as a potential TV show
        if (relPath === '') {
            console.log(`🔍 [SCAN] Found ${folders.length} folders at root level:`);
            folders.forEach(folder => console.log(`  - ${folder}`));
            
            const shows = [];
            for (const folder of folders) {
                try {
                    const showResult = walkShows(dir, folder);
                    if (showResult && showResult.normalizedKey) {
                        shows.push(showResult);
                        console.log(`✅ [SCAN] Successfully processed show: ${folder}`);
                    } else {
                        console.log(`❌ [SCAN] Failed to process show: ${folder}`);
                    }
                } catch (error) {
                    console.warn(`⚠️ [SCAN] Warning: Could not process show ${folder}: ${error.message}`);
                }
            }
            return shows;
        }
        
        // Validate show structure before processing
        if (isShowRoot && !isValidShowStructure(showTitle, folders, files)) {
            console.warn(`⚠️ [SCAN] Skipping invalid show structure: ${showTitle}`);
            return null;
        }
        
        const result = {
            path: relPath,
            normalizedKey: isShowRoot ? normalizedKey : undefined,
            folders: [],
            files: files.map(f => ({
                name: f,
                absPath: path.join(absPath, f),
                relPath: path.join(relPath, f),
                filePath: path.join(absPath, f),
                path: `TV-SHOWS/${relPath.replace(/\\/g, '/')}/${f}` // REQUIRED for Watch Later functionality
            }))
        };
        
        // Only process subfolders if this is a root level show
        if (isShowRoot) {
            let folderCount = 0;
            for (const folder of folders) {
                try {
                    const subPath = relPath ? path.join(relPath, folder) : folder;
                    const subResult = walkShows(dir, subPath);
                    if (subResult) {
                        result.folders.push(subResult);
                    }
                    folderCount++;
                } catch (error) {
                    console.warn(`⚠️ [SCAN] Warning: Could not process folder ${folder}: ${error.message}`);
                }
            }
        }
        
        return result;
    } catch (error) {
        console.warn(`⚠️ [SCAN] Warning: Could not process path ${relPath}: ${error.message}`);
        return null;
    }
}

/**
 * Convert scanned show data to clean seasons structure like star.trek.the.original.series
 * @param {Object} scannedShow - The show data from walkShows
 * @param {Object} tmdbData - TMDB data if available
 * @returns {Object} - Clean show structure with seasons
 */
function convertToCleanStructure(scannedShow, tmdbData = null) {
    // Use TMDB data if available, otherwise use placeholders
    const showData = tmdbData?.show;
    const castData = tmdbData?.cast || [];
    const seasonsData = tmdbData?.seasons || {};
    
    const cleanShow = {
        TMDBTitle: showData?.name || scannedShow.normalizedKey, // Use TMDB name if available
        type: "tvshow",
        isMovie: false,
        normalizedKey: scannedShow.normalizedKey,
        title: showData?.name ? `${showData.name} (${showData.first_air_date?.substring(0, 4) || extractYearFromPath(scannedShow.path)})` : scannedShow.normalizedKey,
        mediaType: "tvshow", // REQUIRED for proper categorization
        tmdbId: showData?.id || TMDB_ID || null,
        poster: showData?.poster_path ? `https://image.tmdb.org/t/p/w500${showData.poster_path}` : null,
        description: showData?.overview || "To be gathered", // Use TMDB overview if available
        about: {
            description: showData?.overview || "To be gathered",
            status: showData?.status || "Unknown",
            first_air_date: showData?.first_air_date || null,
            last_air_date: showData?.last_air_date || null,
            number_of_seasons: showData?.number_of_seasons || 1,
            number_of_episodes: showData?.number_of_episodes || 0,
            vote_average: showData?.vote_average || 0,
            vote_count: showData?.vote_count || 0
        },
        genres: showData?.genres?.map(g => g.name) || [], // Use TMDB genres if available
        cast: castData.length > 0 ? castData.slice(0, 20).map((person, index) => ({
            name: person.name,
            character: person.character,
            profile_path: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null
        })) : [
            {
                name: "To be gathered",
                character: "To be gathered", 
                profile_path: "To be gathered"
            }
        ],
        year: parseInt(showData?.first_air_date?.substring(0, 4) || extractYearFromPath(scannedShow.path)),
        path: scannedShow.path, // REQUIRED for file system access
        absPath: scannedShow.path, // REQUIRED for file system access
        backdrop: showData?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${showData.backdrop_path}` : null,
        seasons: {},
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        files: [] // REQUIRED skeleton framework for all episodes
    };
    
    // Process folders to create seasons structure
    if (scannedShow.folders) {
        for (const folder of scannedShow.folders) {
            let seasonNum = null;
            
            // Check for "Season XX" pattern first
            if (folder.path && folder.path.includes('Season')) {
                const seasonMatch = folder.path.match(/Season\s*(\d+)/i);
                if (seasonMatch) {
                    seasonNum = seasonMatch[1];
                }
            }
            // Check for just number pattern (like "01", "02", etc.)
            else if (folder.path && /^\d{1,2}$/.test(folder.path.split(/[\\/]/).pop())) {
                seasonNum = folder.path.split(/[\\/]/).pop();
            }
            
            if (seasonNum) {
                console.log(`   📺 [SCAN] Processing Season ${seasonNum} from folder: ${folder.path}`);
                
                // Create season structure with TMDB season data if available
                const tmdbSeasonData = seasonsData[parseInt(seasonNum)];
                cleanShow.seasons[seasonNum] = {
                    poster: tmdbSeasonData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbSeasonData.poster_path}` : null,
                    season_poster: tmdbSeasonData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbSeasonData.poster_path}` : null,
                    season_thumbnail: tmdbSeasonData?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbSeasonData.poster_path}` : null,
                    episodes: {}
                };
                
                // Process episodes in this season
                if (folder.files) {
                    for (const file of folder.files) {
                        // Extract episode number from filename
                        const episodeMatch = file.name.match(/S\d{2}E(\d{2})/i);
                        if (episodeMatch) {
                            const episodeNum = episodeMatch[1];
                            const episodeTitle = extractEpisodeTitle(file.name);
                            
                            // Check if we have a local thumbnail
                            const localThumbnail = checkLocalThumbnail(scannedShow.path, seasonNum, file.name);
                            
                            cleanShow.seasons[seasonNum].episodes[episodeNum] = {
                                title: `${cleanShow.TMDBTitle} (${cleanShow.year}) | S${seasonNum.padStart(2, '0')}E${episodeNum.padStart(2, '0')} | ${episodeTitle}`,
                                absPath: file.absPath,
                                path: file.path,
                                duration: null,
                                season: parseInt(seasonNum),
                                episode: parseInt(episodeNum),
                                type: "episode",
                                isSpecials: false,
                                videoFormat: path.extname(file.name),
                                supportsVideo: true,
                                still: localThumbnail || getTMDBEpisodeImage(seasonNum, episodeNum, seasonsData),
                                thumbnail: localThumbnail || getTMDBEpisodeImage(seasonNum, episodeNum, seasonsData)
                            };
                            
                            console.log(`     📺 [SCAN] Episode ${episodeNum}: ${episodeTitle}`);
                        }
                    }
                }
            }
        }
    }
    
    // Update episode count
    let totalEpisodes = 0;
    for (const season of Object.values(cleanShow.seasons)) {
        if (season.episodes) {
            totalEpisodes += Object.keys(season.episodes).length;
        }
    }
    cleanShow.about.episodes = totalEpisodes;
    
    // Populate files array with all episodes for Watch Later functionality
    cleanShow.files = [];
    for (const [seasonKey, season] of Object.entries(cleanShow.seasons)) {
        if (season.episodes) {
            for (const [episodeKey, episode] of Object.entries(season.episodes)) {
                cleanShow.files.push({
                    path: episode.path,
                    absPath: episode.absPath,
                    quality: "1080p", // Default quality - can be updated later
                    size: 0 // Default size - can be updated later
                });
            }
        }
    }
    
    // Reorder fields to match template structure
    return reorderShowFields(cleanShow);
}

/**
 * Extract year from show path
 */
function extractYearFromPath(showPath) {
    const yearMatch = showPath.match(/\((\d{4})\)/);
    return yearMatch ? yearMatch[1] : "Unknown";
}

/**
 * Fetch TMDB data for a TV show
 */
async function fetchTMDBData(tmdbId) {
    if (!tmdbId || !TMDB_API_KEY) {
        console.log('   ⚠️ [SCAN] No TMDB ID or API key provided, using placeholder data');
        return null;
    }

    try {
        console.log(`   🔍 [SCAN] Fetching TMDB data for ID: ${tmdbId}`);
        
        // Fetch show details
        const showResponse = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        const showData = await showResponse.json();
        
        if (showData.success === false) {
            console.log(`   ❌ [SCAN] TMDB API error: ${showData.status_message}`);
            return null;
        }

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

/**
 * Extract episode title from filename
 */
function extractEpisodeTitle(filename) {
    // Remove file extension
    let title = filename.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '');
    
    // Remove show name and year pattern (e.g., "Peacemaker (2021)")
    title = title.replace(/^[^-]+\(\d{4}\)\s*/, '');
    
    // Remove episode number pattern (S01E01, S1E1, etc.) and everything before it
    title = title.replace(/.*S\d{1,2}E\d{1,2}\s*[-_\s]*/, '');
    
    // Remove quality tags like 2160p WEB-DL, HMAX, x265, etc.
    title = title.replace(/\s*\(\d{3,4}p[^)]*\)/i, '');
    title = title.replace(/\s*\d{3,4}p\s*WEB-DL?/i, '');
    title = title.replace(/\s*WEB-DL?/i, '');
    title = title.replace(/\s*HMAX\s*x265[^)]*\)?/i, '');
    title = title.replace(/\s*Silence\)?/i, '');
    
    // Clean up extra spaces, dashes, and underscores
    title = title.replace(/^\s*[-_\s]+\s*/, '').replace(/\s*[-_\s]+\s*$/, '');
    
    // If title is empty or just whitespace, use episode number
    if (!title || title.trim() === '') {
        return `Episode ${episodeNum}`;
    }
    
    return title.trim();
}

/**
 * Check if we have a local thumbnail for this episode
 */
function checkLocalThumbnail(showPath, seasonNum, fileName) {
    try {
        const showName = showPath.split('\\')[0]; // Extract show name from path
        const thumbnailsPath = path.join('S:/MEDIA/TV-SHOWS', showName, 'thumbnails');
        
        // Try both season naming patterns
        const seasonPatterns = [
            `Season ${seasonNum.padStart(2, '0')}`, // "Season 01", "Season 02"
            seasonNum.padStart(2, '0')              // "01", "02"
        ];
        
        for (const seasonPattern of seasonPatterns) {
            const seasonFolder = path.join(thumbnailsPath, seasonPattern);
            
            if (fs.existsSync(seasonFolder)) {
                const thumbnailName = fileName.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '.jpg');
                const thumbnailPath = path.join(seasonFolder, thumbnailName);
                
                if (fs.existsSync(thumbnailPath)) {
                    // Convert to web-accessible path
                    return `/api/thumbnails/${showName}/thumbnails/${seasonPattern}/${thumbnailName}`;
                }
            }
        }
    } catch (error) {
        console.warn(`⚠️ [SCAN] Could not check local thumbnail for ${fileName}: ${error.message}`);
    }
    return null;
}

/**
 * Check if a show has placeholder episode images
 */
function checkForPlaceholderEpisodeImages(show) {
    if (!show.seasons) return false;
    
    for (const [seasonKey, season] of Object.entries(show.seasons)) {
        if (season.episodes) {
            for (const [episodeKey, episode] of Object.entries(season.episodes)) {
                if (episode.still && episode.still.includes('placeholder')) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Check if a specific show needs TMDB data
 */
function checkIfShowNeedsTMDBData(show) {
    // Check if show has placeholder data that needs to be replaced
    const hasPlaceholderDescription = show.description === "To be gathered" || !show.description;
    const hasPlaceholderCast = !show.cast || show.cast.length === 0 || (show.cast[0] && show.cast[0].name === "To be gathered");
    const hasPlaceholderImages = !show.poster || show.poster.includes('placeholder') || show.poster.includes('via.placeholder');
    const hasPlaceholderEpisodeImages = checkForPlaceholderEpisodeImages(show);
    
    return hasPlaceholderDescription || hasPlaceholderCast || hasPlaceholderImages || hasPlaceholderEpisodeImages;
}

/**
 * Check if a show has new seasons that need to be scanned
 */
function checkIfShowHasNewSeasons(show, scannedShow) {
    if (!show || !scannedShow || !show.seasons || !scannedShow.folders) {
        return false;
    }
    
    // Get existing season numbers from the show data
    const existingSeasons = new Set(Object.keys(show.seasons));
    
    // Get season numbers from the scanned folders
    const scannedSeasons = new Set();
    for (const folder of scannedShow.folders) {
        let seasonNum = null;
        
        // Check for "Season XX" pattern first
        if (folder.path && folder.path.includes('Season')) {
            const seasonMatch = folder.path.match(/Season\s*(\d+)/i);
            if (seasonMatch) {
                seasonNum = seasonMatch[1];
            }
        }
        // Check for just number pattern (like "01", "02", etc.)
        else if (folder.path && /^\d{1,2}$/.test(folder.path.split(/[\\/]/).pop())) {
            seasonNum = folder.path.split(/[\\/]/).pop();
        }
        
        if (seasonNum) {
            scannedSeasons.add(seasonNum);
        }
    }
    
    // Check if there are new seasons in the scanned data that aren't in existing data
    for (const seasonNum of scannedSeasons) {
        if (!existingSeasons.has(seasonNum)) {
            console.log(`🆕 [SCAN] Found new season ${seasonNum} for show: ${show.title}`);
            return true;
        }
    }
    
    return false;
}

/**
 * Add missing season_poster and season_thumbnail fields to existing shows
 */
function addMissingSeasonFields(show) {
    let hasChanges = false;
    const updatedShow = { ...show };
    
    if (updatedShow.seasons) {
        for (const [seasonKey, season] of Object.entries(updatedShow.seasons)) {
            if (season.poster && !season.season_poster) {
                season.season_poster = season.poster;
                hasChanges = true;
                console.log(`   📸 [SCAN] Added season_poster to season ${seasonKey}`);
            }
            if (season.poster && !season.season_thumbnail) {
                season.season_thumbnail = season.poster;
                hasChanges = true;
                console.log(`   📸 [SCAN] Added season_thumbnail to season ${seasonKey}`);
            }
        }
    }
    
    return hasChanges ? reorderShowFields(updatedShow) : null;
}

/**
 * Convert existing show to Jupiter's Legacy template structure
 */
function convertExistingShowToTemplate(existingShow) {
    let hasChanges = false;
    const convertedShow = { ...existingShow };
    
    // Check if show already has the correct template structure
    const hasCorrectTemplate = convertedShow.TMDBTitle && 
                              convertedShow.isMovie === false && 
                              convertedShow.year && 
                              convertedShow.path && 
                              convertedShow.absPath && 
                              convertedShow.backdrop !== undefined && 
                              convertedShow.created && 
                              convertedShow.updated && 
                              convertedShow.files && 
                              Array.isArray(convertedShow.files);
    
    if (hasCorrectTemplate) {
        // Just add missing season fields
        return addMissingSeasonFields(convertedShow);
    }
    
    // Convert to Jupiter's Legacy template structure
    console.log(`   🔄 [SCAN] Converting show structure for: ${convertedShow.TMDBTitle || convertedShow.title || 'Unknown'}`);
    
    // Ensure required fields exist
    if (!convertedShow.TMDBTitle) {
        convertedShow.TMDBTitle = convertedShow.title || convertedShow.normalizedKey;
        hasChanges = true;
    }
    
    if (convertedShow.isMovie === undefined) {
        convertedShow.isMovie = false;
        hasChanges = true;
    }
    
    if (!convertedShow.year) {
        convertedShow.year = convertedShow.about?.year ? parseInt(convertedShow.about.year) : 2020;
        hasChanges = true;
    }
    
    if (!convertedShow.path) {
        convertedShow.path = convertedShow.absPath || `TV-SHOWS/${convertedShow.normalizedKey}`;
        hasChanges = true;
    }
    
    if (!convertedShow.absPath) {
        convertedShow.absPath = convertedShow.path || `S:/MEDIA/TV-SHOWS/${convertedShow.normalizedKey}`;
        hasChanges = true;
    }
    
    if (convertedShow.backdrop === undefined) {
        convertedShow.backdrop = null;
        hasChanges = true;
    }
    
    if (!convertedShow.created) {
        convertedShow.created = new Date().toISOString();
        hasChanges = true;
    }
    
    if (!convertedShow.updated) {
        convertedShow.updated = new Date().toISOString();
        hasChanges = true;
    }
    
    // Ensure files array exists and is properly structured
    if (!convertedShow.files || !Array.isArray(convertedShow.files)) {
        convertedShow.files = [];
        hasChanges = true;
        
        // Populate files array from seasons/episodes
        if (convertedShow.seasons) {
            for (const [seasonKey, season] of Object.entries(convertedShow.seasons)) {
                if (season.episodes) {
                    for (const [episodeKey, episode] of Object.entries(season.episodes)) {
                        if (episode.path || episode.absPath) {
                            convertedShow.files.push({
                                path: episode.path || episode.absPath,
                                absPath: episode.absPath || episode.path,
                                quality: "1080p",
                                size: 0
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Update about object to match template
    if (!convertedShow.about || !convertedShow.about.status) {
        if (!convertedShow.about) convertedShow.about = {};
        convertedShow.about.status = convertedShow.about.status || "Unknown";
        convertedShow.about.first_air_date = convertedShow.about.first_air_date || null;
        convertedShow.about.last_air_date = convertedShow.about.last_air_date || null;
        convertedShow.about.number_of_seasons = convertedShow.about.number_of_seasons || 1;
        convertedShow.about.number_of_episodes = convertedShow.about.number_of_episodes || 0;
        convertedShow.about.vote_average = convertedShow.about.vote_average || 0;
        convertedShow.about.vote_count = convertedShow.about.vote_count || 0;
        hasChanges = true;
    }
    
    // Add missing season fields
    const seasonFieldsUpdated = addMissingSeasonFields(convertedShow);
    if (seasonFieldsUpdated) {
        hasChanges = true;
    }
    
    // Reorder fields to match template structure
    const reorderedShow = reorderShowFields(convertedShow);
    
    return hasChanges ? reorderedShow : null;
}

/**
 * Reorder TV show fields to match the template structure exactly
 * WAIT
 */
function reorderShowFields(show) {
    // Define the expected field order for the main TV show object
    const expectedMainFields = [
        'TMDBTitle',
        'type',
        'isMovie', 
        'normalizedKey',
        'title',
        'mediaType',
        'tmdbId',
        'poster',
        'description',
        'about',
        'genres',
        'cast',
        'year',
        'path',
        'absPath',
        'backdrop',
        'seasons',
        'created',
        'updated',
        'files'
    ];
    
    // Define the expected field order for season objects
    const expectedSeasonFields = [
        'poster',
        'season_poster', 
        'season_thumbnail',
        'episodes'
    ];
    
    // Define the expected field order for episode objects
    const expectedEpisodeFields = [
        'title',
        'absPath',
        'path',
        'duration',
        'season',
        'episode',
        'type',
        'isSpecials',
        'videoFormat',
        'supportsVideo',
        'still',
        'thumbnail'
    ];
    
    // Reorder main show fields
    const reorderedShow = reorderObjectFields(show, expectedMainFields);
    
    // Reorder season fields
    if (reorderedShow.seasons) {
        for (const [seasonKey, season] of Object.entries(reorderedShow.seasons)) {
            reorderedShow.seasons[seasonKey] = reorderObjectFields(season, expectedSeasonFields);
            
            // Reorder episode fields
            if (season.episodes) {
                for (const [episodeKey, episode] of Object.entries(season.episodes)) {
                    reorderedShow.seasons[seasonKey].episodes[episodeKey] = reorderObjectFields(episode, expectedEpisodeFields);
                }
            }
        }
    }
    
    return reorderedShow;
}

/**
 * Reorder object fields according to expected order
 */
function reorderObjectFields(obj, expectedOrder) {
    const newObj = {};
    
    // Add fields in expected order
    for (const field of expectedOrder) {
        if (obj.hasOwnProperty(field)) {
            newObj[field] = obj[field];
        }
    }
    
    // Add any remaining fields not in expected order
    for (const [key, value] of Object.entries(obj)) {
        if (!expectedOrder.includes(key)) {
            newObj[key] = value;
        }
    }
    
    return newObj;
}

/**
 * Get TMDB episode image URL from season data
 */
function getTMDBEpisodeImage(seasonNum, episodeNum, seasonsData) {
    // Check if we have TMDB season data for this season
    if (seasonsData && seasonsData[parseInt(seasonNum)] && seasonsData[parseInt(seasonNum)].episodes) {
        const seasonData = seasonsData[parseInt(seasonNum)];
        const episodeData = seasonData.episodes.find(ep => ep.episode_number === parseInt(episodeNum));
        
        if (episodeData && episodeData.still_path) {
            return `https://image.tmdb.org/t/p/w500${episodeData.still_path}`;
        }
    }
    
    // Fallback to placeholder if no TMDB data available
    return `https://via.placeholder.com/400x225/333/666?text=S${seasonNum.padStart(2, '0')}E${episodeNum.padStart(2, '0')}`;
}

function flattenShows(tree) {
    const shows = [];
    
    function recurse(node) {
        if (node.normalizedKey) {
            shows.push(node);
        }
        for (const folder of node.folders) {
            recurse(folder);
        }
    }
    
    recurse(tree);
    return shows;
}

async function main() {
    console.log(`🔍 [SCAN] Scanning TV-SHOWS library at: ${MEDIA_ROOT}`);
    
    // Initialize animation helper
    const animation = new ProgressAnimation('classic', 30);
    
    // Check if media root exists
    if (!fs.existsSync(MEDIA_ROOT)) {
        console.error(`❌ [SCAN] Error: Media root directory does not exist: ${MEDIA_ROOT}`);
        process.exit(1);
    }

    // Load existing data first to check what needs TMDB data
    let existingData = {};
    try {
        if (fs.existsSync(OUTPUT_FILE)) {
            existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
            console.log(`📖 [SCAN] Loaded existing data with ${Object.keys(existingData).length} TV shows`);
        }
    } catch (e) {
        console.log(`⚠️ [SCAN] Could not load existing data: ${e.message}`);
    }

    // When TMDB ID is provided, check if any shows need TMDB data
    let tmdbData = null;
    let targetShowName = null;
    let needsTMDBData = false;
    
    if (TMDB_ID) {
        console.log(`🔍 [SCAN] TMDB ID provided: ${TMDB_ID} - Checking if data is needed`);
        
        // Check if any existing shows need TMDB data
        const showsNeedingData = Object.values(existingData).filter(show => {
            // Check if show has placeholder data that needs to be replaced
            const hasPlaceholderDescription = show.description === "To be gathered" || !show.description;
            const hasPlaceholderCast = !show.cast || show.cast.length === 0 || (show.cast[0] && show.cast[0].name === "To be gathered");
            const hasPlaceholderImages = !show.poster || show.poster.includes('placeholder') || show.poster.includes('via.placeholder');
            const hasPlaceholderEpisodeImages = checkForPlaceholderEpisodeImages(show);
            
            return hasPlaceholderDescription || hasPlaceholderCast || hasPlaceholderImages || hasPlaceholderEpisodeImages;
        });
        
        if (showsNeedingData.length > 0) {
            console.log(`🔍 [SCAN] Found ${showsNeedingData.length} shows needing TMDB data:`);
            showsNeedingData.forEach(show => {
                console.log(`   - ${show.TMDBTitle || show.title || 'Unknown'}`);
            });
            
            needsTMDBData = true;
            console.log(`\n🌐 [SCAN] Fetching TMDB data...`);
            const tmdbStep = 0;
            const tmdbMarker = ANIMATION_MARKERS[tmdbStep];
            process.stdout.write(`\r${tmdbMarker} Fetching TMDB data...`);
            
            tmdbData = await fetchTMDBData(TMDB_ID);
            
            process.stdout.write('\r' + ' '.repeat(100) + '\r');
            if (tmdbData && tmdbData.show) {
                targetShowName = tmdbData.show.name;
                console.log(`🎯 [SCAN] Targeting show: "${targetShowName}"`);
            }
        } else {
            console.log(`✅ [SCAN] All shows have complete data - no TMDB fetch needed`);
        }
    } else {
        console.log(`⚠️ [SCAN] No TMDB ID provided. Use --tmdb-id=12345 to fetch real data for specific show`);
    }
    

    
    try {
        // FIXED: Only add NEW shows, NEVER overwrite existing data
        let existingData = {};
        try {
            if (fs.existsSync(OUTPUT_FILE)) {
                existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
                console.log(`📖 [SCAN] Loaded existing data with ${Object.keys(existingData).length} TV shows`);
            }
        } catch (e) {
            console.log(`⚠️ [SCAN] Could not load existing data: ${e.message}`);
        }
        
        // Scan the media library - either all shows or just the target show
        let scannedShows;
        if (targetShowName) {
            console.log(`🔍 [SCAN] Looking for specific show: "${targetShowName}"`);
            // Find the specific show folder
            const allShows = walkShows(MEDIA_ROOT);
            scannedShows = allShows.filter(show => {
                const showPath = show.path || '';
                return showPath.toLowerCase().includes(targetShowName.toLowerCase()) ||
                       show.normalizedKey.toLowerCase().includes(targetShowName.toLowerCase().replace(/\s+/g, '.'));
            });
            
            if (scannedShows.length === 0) {
                console.log(`❌ [SCAN] Show "${targetShowName}" not found in media library`);
                console.log(`💡 [SCAN] Available shows: ${allShows.map(s => s.normalizedKey).join(', ')}`);
                return;
            } else {
                console.log(`✅ [SCAN] Found show: ${scannedShows[0].normalizedKey}`);
            }
        } else {
            // Scan all shows when no TMDB ID provided
            console.log(`🔍 [SCAN] Starting directory scan...`);
            scannedShows = walkShows(MEDIA_ROOT);
            console.log(`✅ [SCAN] Found ${scannedShows.length} shows in media library`);
        }
        

        
        // Start with existing data - DO NOT OVERWRITE
        const unifiedOutput = { ...existingData };
        
        let newShowsAdded = 0;
        let existingShowsSkipped = 0;
        
        console.log(`\n📊 [SCAN] Processing ${scannedShows.length} shows...`);
        console.log(`🔄 [SCAN] Starting show processing with animated feedback...\n`);
        
        // First, convert ALL existing shows to use the Jupiter's Legacy template structure
        console.log(`🔍 [SCAN] Converting all existing shows to Jupiter's Legacy template structure...`);
        for (const [existingKey, existingShow] of Object.entries(existingData)) {
            // Convert existing show to new template structure
            const convertedShow = convertExistingShowToTemplate(existingShow);
            if (convertedShow) {
                console.log(`🔄 [SCAN] Converted show to template: ${existingKey}`);
                unifiedOutput[existingKey] = convertedShow;
                newShowsAdded++;
            } else {
                unifiedOutput[existingKey] = existingShow;
                existingShowsSkipped++;
            }
        }
        
        // Process scanned shows with animated progress
        for (let i = 0; i < scannedShows.length; i++) {
            const show = scannedShows[i];
            const normalizedKey = show.normalizedKey;
            
            // Show dot-dot-dot animation
            const step = i % ANIMATION_MARKERS.length;
            const marker = ANIMATION_MARKERS[step];
            process.stdout.write(`\r${marker} Processing shows ${i + 1}/${scannedShows.length} (${Math.round(((i + 1) / scannedShows.length) * 100)}%)`);
            
            if (normalizedKey) {
                // When TMDB ID is provided, only process the target show for TMDB data
                // But still add missing season fields to all shows
                const isTargetShow = !targetShowName || normalizedKey.toLowerCase().includes(targetShowName.toLowerCase().replace(/\s+/g, '.'));
                
                if (targetShowName && !isTargetShow) {
                    console.log(`⏭️ [SCAN] Processing non-target show for missing fields: ${normalizedKey}`);
                    // Check if this show needs missing season fields added
                    const existingKey = Object.keys(existingData).find(key => 
                        key.toLowerCase() === normalizedKey.toLowerCase()
                    );
                    if (existingKey) {
                        const updatedShow = addMissingSeasonFields(existingData[existingKey]);
                        if (updatedShow) {
                            console.log(`🔄 [SCAN] Added missing season fields to: ${normalizedKey}`);
                            unifiedOutput[existingKey] = updatedShow;
                            newShowsAdded++;
                        } else {
                            unifiedOutput[existingKey] = existingData[existingKey];
                            existingShowsSkipped++;
                        }
                    }
                    continue;
                }
                
                // Check if this show already exists by comparing normalized keys
                // Convert both keys to lowercase for case-insensitive matching
                const existingKey = Object.keys(existingData).find(key => 
                    key.toLowerCase() === normalizedKey.toLowerCase()
                );
                
                if (existingKey) {
                    // Check if we need to update with TMDB data
                    if (needsTMDBData && tmdbData && targetShowName) {
                        // Check if this specific show needs TMDB data
                        const existingShow = existingData[existingKey];
                        const needsTMDBUpdate = checkIfShowNeedsTMDBData(existingShow);
                        const hasNewSeasons = checkIfShowHasNewSeasons(existingShow, show);
                        
                        if (needsTMDBUpdate || hasNewSeasons) {
                            console.log(`🔄 [SCAN] Updating existing show: ${normalizedKey} (TMDB: ${needsTMDBUpdate}, New Seasons: ${hasNewSeasons})`);
                            const cleanShow = convertToCleanStructure(show, tmdbData);
                            unifiedOutput[existingKey] = cleanShow;
                            newShowsAdded++;
                        } else {
                            console.log(`✅ [SCAN] Show already has complete data: ${normalizedKey}`);
                            // Check if we need to add missing season fields
                            const updatedShow = addMissingSeasonFields(existingData[existingKey]);
                            if (updatedShow) {
                                console.log(`🔄 [SCAN] Added missing season fields to: ${normalizedKey}`);
                                unifiedOutput[existingKey] = updatedShow;
                                newShowsAdded++;
                            } else {
                                unifiedOutput[existingKey] = existingData[existingKey];
                                existingShowsSkipped++;
                            }
                        }
                    } else {
                        // ENHANCED: Check for new episodes and seasons in existing shows
                        console.log(`🔍 [SCAN] Checking existing TV show for updates: ${normalizedKey}`);
                        const hasNewSeasons = checkIfShowHasNewSeasons(existingData[existingKey], show);
                        const updatedShow = checkForNewEpisodes(existingData[existingKey], show);
                        
                        if (updatedShow || hasNewSeasons) {
                            if (hasNewSeasons) {
                                console.log(`🔄 [SCAN] Updating existing TV show with new seasons: ${normalizedKey}`);
                                // Re-scan the show to get the new seasons
                                const cleanShow = convertToCleanStructure(show, tmdbData);
                                unifiedOutput[existingKey] = cleanShow;
                            } else {
                                console.log(`🔄 [SCAN] Updating existing TV show with new episodes: ${normalizedKey}`);
                                unifiedOutput[existingKey] = updatedShow;
                            }
                            newShowsAdded++; // Count updates as additions
                        } else {
                            console.log(`⏭️ [SCAN] No updates needed for existing TV show: ${normalizedKey}`);
                            // Check if we need to add missing season fields
                            const seasonFieldsUpdated = addMissingSeasonFields(existingData[existingKey]);
                            if (seasonFieldsUpdated) {
                                console.log(`🔄 [SCAN] Added missing season fields to: ${normalizedKey}`);
                                unifiedOutput[existingKey] = seasonFieldsUpdated;
                                newShowsAdded++;
                            } else {
                                unifiedOutput[existingKey] = existingData[existingKey];
                                existingShowsSkipped++;
                            }
                        }
                    }
                } else {
                    // Only add NEW shows - convert to clean structure
                    console.log(`➕ [SCAN] Adding NEW TV show: ${normalizedKey}`);
                    const cleanShow = convertToCleanStructure(show, tmdbData);
                    unifiedOutput[normalizedKey] = cleanShow;
                    newShowsAdded++;
                }
            }
        }
        
        // Clear the progress line and show completion
        process.stdout.write('\r' + ' '.repeat(100) + '\r');
        console.log(`\n✅ [SCAN] Show processing complete!`);
        
        console.log(`\n📊 [SCAN] Summary:`);
        console.log(`   - Existing TV shows preserved: ${existingShowsSkipped}`);
        console.log(`   - New TV shows and updates: ${newShowsAdded}`);
        console.log(`   - Total TV shows in library: ${Object.keys(unifiedOutput).length}`);
        
        // Only create backup and write if we're actually making changes
        if (newShowsAdded > 0) {
            if (fs.existsSync(OUTPUT_FILE)) {
                console.log(`\n💾 [SCAN] Creating backup...`);
                const backupStep = 1;
                const backupMarker = ANIMATION_MARKERS[backupStep];
                process.stdout.write(`\r${backupMarker} Creating backup...`);
                
                // Create bkup directory if it doesn't exist
                const bkupDir = path.join(path.dirname(OUTPUT_FILE), 'bkup');
                if (!fs.existsSync(bkupDir)) {
                    fs.mkdirSync(bkupDir, { recursive: true });
                }
                
                // Create backup with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFile = path.join(bkupDir, `media-library-tv-shows_normalized_backup_${timestamp}.json`);
                fs.copyFileSync(OUTPUT_FILE, backupFile);
                
                process.stdout.write('\r' + ' '.repeat(100) + '\r');
                console.log(`✅ [SCAN] Backup created: ${backupFile}`);
            }
            
            // Apply final field reordering to ensure template compliance
            console.log(`\n🔄 [SCAN] Applying final field reordering for template compliance...`);
            const reorderedOutput = {};
            const showKeys = Object.keys(unifiedOutput);
            
            for (let i = 0; i < showKeys.length; i++) {
                const showKey = showKeys[i];
                const reorderStep = i % ANIMATION_MARKERS.length;
                const reorderMarker = ANIMATION_MARKERS[reorderStep];
                process.stdout.write(`\r${reorderMarker} Reordering fields ${i + 1}/${showKeys.length} (${Math.round(((i + 1) / showKeys.length) * 100)}%)`);
                reorderedOutput[showKey] = reorderShowFields(unifiedOutput[showKey]);
            }
            
            process.stdout.write('\r' + ' '.repeat(100) + '\r');
            console.log(`✅ [SCAN] Field reordering complete!`);
            
            // Write the updated data with animated feedback
            console.log(`\n💾 [SCAN] Writing updated data to file...`);
            const writeStep = 2;
            const writeMarker = ANIMATION_MARKERS[writeStep];
            process.stdout.write(`\r${writeMarker} Writing unified data...`);
            
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(reorderedOutput, null, 2));
            
            process.stdout.write('\r' + ' '.repeat(100) + '\r');
            console.log(`✅ [SCAN] TV-SHOWS scan complete! Added ${newShowsAdded} new shows/updates.`);
        } else {
            console.log(`✅ [SCAN] No new TV shows or updates found. Existing library unchanged.`);
        }
        
        console.log(`📊 [SCAN] Found ${Object.keys(unifiedOutput).length} total TV shows`);
        
        // Show some statistics
        let totalEpisodes = 0;
        let totalSeasons = 0;
        
        for (const show of Object.values(unifiedOutput)) {
            // Count episodes and seasons from the clean seasons structure
            if (show.seasons) {
                totalSeasons += Object.keys(show.seasons).length;
                for (const season of Object.values(show.seasons)) {
                    if (season.episodes) {
                        totalEpisodes += Object.keys(season.episodes).length;
                    }
                }
            }
        }
        
        console.log(`📺 [SCAN] Total episodes: ${totalEpisodes}`);
        console.log(`📁 [SCAN] Total seasons: ${totalSeasons}`);
        
    } catch (error) {
        console.error(`❌ [SCAN] Fatal error during scan: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}