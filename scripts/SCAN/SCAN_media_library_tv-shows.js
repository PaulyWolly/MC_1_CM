/*
  SCAN_MEDIA_LIBRARY_TV-SHOWS.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const OUTPUT_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json');

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
    
    return hasChanges ? updatedShow : null;
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
                filePath: path.join(absPath, f)
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
 * @returns {Object} - Clean show structure with seasons
 */
function convertToCleanStructure(scannedShow) {
    const cleanShow = {
        type: "tvshow",
        normalizedKey: scannedShow.normalizedKey,
        title: scannedShow.normalizedKey, // Use normalized key as title for now
        tmdbId: null, // Will be populated later if needed
        poster: null, // Will be populated later if needed
        about: {
            title: scannedShow.normalizedKey,
            year: extractYearFromPath(scannedShow.path),
            description: "" // Will be populated later if needed
        },
        genres: [], // Will be populated later if needed
        cast: [], // Will be populated later if needed
        seasons: {}
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
                
                // Create season structure
                cleanShow.seasons[seasonNum] = {
                    poster: null, // Will use show poster for now
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
                                title: episodeTitle,
                                path: file.path,
                                absPath: file.absPath,
                                duration: null,
                                season: parseInt(seasonNum),
                                episode: parseInt(episodeNum),
                                type: "episode",
                                isSpecials: false,
                                videoFormat: path.extname(file.name),
                                supportsVideo: true,
                                still: localThumbnail || getTMDBEpisodeImage(seasonNum, episodeNum),
                                thumbnail: localThumbnail || getTMDBEpisodeImage(seasonNum, episodeNum)
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
    
    return cleanShow;
}

/**
 * Extract year from show path
 */
function extractYearFromPath(showPath) {
    const yearMatch = showPath.match(/\((\d{4})\)/);
    return yearMatch ? yearMatch[1] : "Unknown";
}

/**
 * Extract episode title from filename
 */
function extractEpisodeTitle(filename) {
    // Remove file extension and episode number, clean up the title
    let title = filename.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '');
    
    // Remove episode number pattern (S01E01, S1E1, etc.)
    title = title.replace(/S\d{1,2}E\d{1,2}\s*/i, '');
    
    // Remove quality tags like 2160p WEB-DL
    title = title.replace(/\s*\d{3,4}p\s*WEB-DL?/i, '');
    title = title.replace(/\s*WEB-DL?/i, '');
    
    // Clean up extra spaces and dashes
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
 * Get TMDB episode image URL (placeholder for now)
 */
function getTMDBEpisodeImage(seasonNum, episodeNum) {
    // For now, return a placeholder. In the future, we could fetch from TMDB API
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

function main() {
    console.log(`🔍 [SCAN] Scanning TV-SHOWS library at: ${MEDIA_ROOT}`);
    
    // Check if media root exists
    if (!fs.existsSync(MEDIA_ROOT)) {
        console.error(`❌ [SCAN] Error: Media root directory does not exist: ${MEDIA_ROOT}`);
        process.exit(1);
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
        
        // Scan the media library for new shows
        const scannedShows = walkShows(MEDIA_ROOT);
        

        
        // Start with existing data - DO NOT OVERWRITE
        const unifiedOutput = { ...existingData };
        
        let newShowsAdded = 0;
        let existingShowsSkipped = 0;
        
        // Process scanned shows
        for (const show of scannedShows) {
            const normalizedKey = show.normalizedKey;
            if (normalizedKey) {
                // Check if this show already exists by comparing normalized keys
                // Convert both keys to lowercase for case-insensitive matching
                const existingKey = Object.keys(existingData).find(key => 
                    key.toLowerCase() === normalizedKey.toLowerCase()
                );
                
                if (existingKey) {
                    // ENHANCED: Check for new episodes in existing shows
                    console.log(`🔍 [SCAN] Checking existing TV show for updates: ${normalizedKey}`);
                    const updatedShow = checkForNewEpisodes(existingData[existingKey], show);
                    
                    if (updatedShow) {
                        console.log(`🔄 [SCAN] Updating existing TV show with new episodes: ${normalizedKey}`);
                        unifiedOutput[existingKey] = updatedShow;
                        newShowsAdded++; // Count updates as additions
                    } else {
                        console.log(`⏭️ [SCAN] No updates needed for existing TV show: ${normalizedKey}`);
                        existingShowsSkipped++;
                    }
                } else {
                    // Only add NEW shows - convert to clean structure
                    console.log(`➕ [SCAN] Adding NEW TV show: ${normalizedKey}`);
                    const cleanShow = convertToCleanStructure(show);
                    unifiedOutput[normalizedKey] = cleanShow;
                    newShowsAdded++;
                }
            }
        }
        
        console.log(`📊 [SCAN] Summary:`);
        console.log(`   - Existing TV shows preserved: ${existingShowsSkipped}`);
        console.log(`   - New TV shows and updates: ${newShowsAdded}`);
        console.log(`   - Total TV shows in library: ${Object.keys(unifiedOutput).length}`);
        
        // Only create backup and write if we're actually making changes
        if (newShowsAdded > 0) {
            if (fs.existsSync(OUTPUT_FILE)) {
                // Create bkup directory if it doesn't exist
                const bkupDir = path.join(path.dirname(OUTPUT_FILE), 'bkup');
                if (!fs.existsSync(bkupDir)) {
                    fs.mkdirSync(bkupDir, { recursive: true });
                    console.log(`📁 [SCAN] Created backup directory: ${bkupDir}`);
                }
                
                // Create backup with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFile = path.join(bkupDir, `media-library-tv-shows_normalized_backup_${timestamp}.json`);
                fs.copyFileSync(OUTPUT_FILE, backupFile);
                console.log(`💾 [SCAN] Backup created: ${backupFile}`);
            }
            
            // Write the updated data
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(unifiedOutput, null, 2));
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