/*
  CONVERT_AUDIO_TO_AAC_TV-SHOWS_SINGLE.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

const tvShowsRoot = 'S:/MEDIA/TV-SHOWS/';
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { sortTVShowFilesChronologically } = require('../shared/TVShowFileSorter');

// Simple logging function
function logToFile(module, message) {
    console.log(`[${module}] ${message}`);
}

// Import animation helpers
const {
    showProgress,
    clearProgress,
    showStatus,
    showConversionStep,
    showTimeline,
    showFileProgress,
    showConversionSummary,
    showShowBreakdown,
    showRealTimeStatus,
    showTimeEstimate,
    showFileInfo
} = require('./animation-helpers');


// Paths - UPDATED for new unified structure
const UNIFIED_DATA_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json');
const CONVERSION_LOG_PATH = path.join(__dirname, 'audio_conversion_log_tv-shows.json');

function fuzzyMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean(a) === clean(b);
}

function findBestMatchShow(title) {
  const folders = fs.readdirSync(tvShowsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  let best = folders.find(f => fuzzyMatch(f, title));
  if (!best) {
    best = folders.find(f => f.toLowerCase().includes(title.toLowerCase()));
  }
  return best ? path.join(tvShowsRoot, best) : null;
}

const inputArg = process.argv[2];
if (!inputArg) {
  console.log('🎵 Enhanced Single TV Show Audio Conversion');
  console.log('=' .repeat(60));
  console.log('Usage: node scripts/CONVERT/convert_audio_to_aac_tv-shows_SINGLE.js "TV Show Name"');
  console.log('Example: node scripts/CONVERT/convert_audio_to_aac_tv-shows_SINGLE.js "Star Trek Strange New Worlds (2022)"');
  console.log('Example: node scripts/CONVERT/convert_audio_to_aac_tv-shows_SINGLE.js "star.trek.strange.new.worlds.(2022)"');
  console.log('\n✨ Features:');
  console.log('   • Real-time progress bars with animations');
  console.log('   • Timeline tracking for each conversion step');
  console.log('   • File-by-file progress with ETA');
  console.log('   • Unified data integration using normalized keys');
  console.log('   • Visual success/failure indicators');
  console.log('   • SAFE ARCHIVING - Original files are NEVER deleted');
  console.log('   • BKUP folder organization - Originals moved to BKUP folder');
  console.log('   • JSON auto-update - Updates tv-shows-unified.json with new file names');
  console.log('\n💡 Tip: You can use either the display name or the normalized key');
  console.log('💡 Safety: Original files moved to BKUP folder, new AAC versions remain in root');
  process.exit(1);
}

// Allow passing either:
// 1) Display name or normalized key (no slashes)
// 2) Full path to show folder
// 3) Full path to a specific season folder (e.g., .../Season 3 or .../Season 03)
let showFolder = inputArg;
let targetSeasonFilter = null; // e.g. '3' when input path points to a specific Season

if (!inputArg.match(/[\\\/]/)) {
  // Check if input is a normalized key (contains dots)
  if (inputArg.includes('.')) {
    // This might be a normalized key, try to find the display name
    const folder = findBestMatchShow(inputArg);
    if (!folder) {
      showStatus(`No matching TV show folder found for normalized key '${inputArg}' in ${tvShowsRoot}`, 'error');
      process.exit(1);
    }
    showFolder = folder;
    showStatus(`Found TV show folder for normalized key: ${showFolder}`, 'success');
  } else {
    // Regular display name
    const folder = findBestMatchShow(inputArg);
    if (!folder) {
      showStatus(`No matching TV show folder found for '${inputArg}' in ${tvShowsRoot}`, 'error');
      process.exit(1);
    }
    showFolder = folder;
    showStatus(`Found TV show folder: ${showFolder}`, 'success');
  }
} else {
  // If a full path was provided, normalize to the show root folder
  const base = path.basename(showFolder);
  const seasonMatch = base.match(/^season\s*(\d{1,2})$/i);
  if (seasonMatch) {
    // Capture season number and move up to the show folder
    targetSeasonFilter = seasonMatch[1]; // e.g. '3' or '03'
    const parent = path.dirname(showFolder);
    showFolder = parent;
    showStatus(`Detected season folder input. Targeting Season ${targetSeasonFilter} only. Show folder: ${showFolder}`, 'info');
  } else {
    showStatus(`Using provided folder: ${showFolder}`, 'info');
  }
}

// FFmpeg command template for converting audio to AAC
function getFFmpegCommand(inputPath, outputPath) {
    return `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
}

// Create backup and convert
async function convertFile(inputPath, currentIndex, totalFiles, startTime, bkupsFolder) {
    try {
        const dir = path.dirname(inputPath);
        const ext = path.extname(inputPath);
        const name = path.basename(inputPath, ext);
        const fileName = path.basename(inputPath);
        
        // Step 1: Create backup
        showConversionStep(0, currentIndex, totalFiles, fileName, 'Creating backup...');
        const backupPath = path.join(dir, `${name}_backup${ext}`);
        logToFile('convert_audio_to_aac_tv-shows', `📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        
        // Step 2: Convert audio to AAC
        showConversionStep(1, currentIndex, totalFiles, fileName, 'Converting to AAC...');
        const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
        logToFile('convert_audio_to_aac_tv-shows', `🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        await execAsync(ffmpegCmd);
        
        // Step 3: Create AAC version (SAFE ARCHIVING - NO DELETION)
        showConversionStep(2, currentIndex, totalFiles, fileName, 'Creating AAC version...');
        const aacPath = path.join(dir, `${name}_AAC${ext}`);
        logToFile('convert_audio_to_aac_tv-shows', `✅ [ARCHIVE] Creating AAC version: ${path.basename(aacPath)}`);
        await execAsync(`ren "${tempOutputPath}" "${path.basename(aacPath)}"`);
        
        // Step 4: Move original and backup to BKUP folder
        showConversionStep(3, currentIndex, totalFiles, fileName, 'Moving to BKUP folder...');
        const originalInBkup = path.join(bkupsFolder, fileName);
        const backupInBkup = path.join(bkupsFolder, `${name}_backup${ext}`);
        
        logToFile('convert_audio_to_aac_tv-shows', `📁 [MOVE] Moving original to BKUP: ${path.basename(originalInBkup)}`);
        await execAsync(`move "${inputPath}" "${originalInBkup}"`);
        
        logToFile('convert_audio_to_aac_tv-shows', `📁 [MOVE] Moving backup to BKUP: ${path.basename(backupInBkup)}`);
        await execAsync(`move "${backupPath}" "${backupInBkup}"`);
        
        // Step 5: Complete
        showConversionStep(4, currentIndex, totalFiles, fileName, 'Complete!');
        
        return { 
            success: true, 
            originalPath: inputPath,
            aacPath, 
            originalInBkup,
            backupInBkup,
            newFileName: `${name}_AAC${ext}`
        };
    } catch (error) {
        const errorMsg = `❌ [ERROR] Failed to convert ${path.basename(inputPath)}: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows', errorMsg);
        showStatus(`Failed to convert ${path.basename(inputPath)}: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// Scan file system directly for video files (finds ALL files, even new ones not in unified data)
function scanFilesFromFileSystem(targetFolder, seasonFilter) {
    const files = [];
    
    if (!fs.existsSync(targetFolder)) {
        return files;
    }
    
    // Determine if targetFolder is a season folder or show folder
    const isSeasonFolder = /season\s*\d+/i.test(path.basename(targetFolder));
    let scanPath = targetFolder;
    let showName = path.basename(targetFolder); // Default to folder name
    
    if (isSeasonFolder) {
        // We're already in a season folder, get show name from parent
        showName = path.basename(path.dirname(targetFolder));
        scanPath = targetFolder;
    } else if (seasonFilter) {
        // We need to scan a specific season folder
        const seasonFolders = ['Season ' + seasonFilter, 'Season ' + seasonFilter.padStart(2, '0'), 'S' + seasonFilter.padStart(2, '0'), 'S' + seasonFilter];
        let foundSeasonPath = null;
        
        for (const seasonName of seasonFolders) {
            const testPath = path.join(targetFolder, seasonName);
            if (fs.existsSync(testPath)) {
                foundSeasonPath = testPath;
                break;
            }
        }
        
        if (foundSeasonPath) {
            scanPath = foundSeasonPath;
            showName = path.basename(targetFolder); // Show name is the parent folder
        } else {
            // Fallback: scan all season folders
            scanPath = targetFolder;
        }
    }
    
    // Recursively find all video files
    function getAllVideoFiles(dir) {
        const results = [];
        if (!fs.existsSync(dir)) return results;
        
        try {
            const list = fs.readdirSync(dir);
            for (const file of list) {
                const filePath = path.join(dir, file);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat && stat.isDirectory()) {
                        // Skip BKUP folders
                        if (!/bku?p/i.test(file)) {
                            results.push(...getAllVideoFiles(filePath));
                        }
                    } else if (/\.(mkv|mp4|avi|m4v)$/i.test(file) && !/_AAC\.(mkv|mp4|avi|m4v)$/i.test(file)) {
                        // Only include video files, exclude already converted _AAC files
                        results.push(filePath);
                    }
                } catch (e) {
                    // Skip files we can't access
                }
            }
        } catch (e) {
            // Skip directories we can't read
        }
        
        return results;
    }
    
    const foundFiles = getAllVideoFiles(scanPath);
    
    // Extract season/episode info from filenames
    for (const filePath of foundFiles) {
        const fileName = path.basename(filePath);
        const dirPath = path.dirname(filePath);
        
        // Try to extract season/episode from filename (S03E06, S3E6, etc.)
        const match = fileName.match(/[Ss](\d{1,2})[Ee](\d{1,2})/);
        let seasonNum = null;
        let episodeNum = null;
        
        if (match) {
            seasonNum = String(parseInt(match[1], 10)); // Normalize '03' -> '3'
            episodeNum = String(parseInt(match[2], 10));
        } else {
            // Try to get season from parent folder name
            const parentDir = path.basename(dirPath);
            const seasonMatch = parentDir.match(/season\s*(\d{1,2})/i);
            if (seasonMatch) {
                seasonNum = String(parseInt(seasonMatch[1], 10));
                // Try to get episode from filename number
                const epMatch = fileName.match(/[Ee](\d{1,2})|(\d{1,2})[^0-9]/);
                if (epMatch) {
                    episodeNum = String(parseInt(epMatch[1] || epMatch[2], 10));
                }
            }
        }
        
        // Skip if season filter doesn't match
        if (seasonFilter && seasonNum && String(parseInt(seasonFilter, 10)) !== seasonNum) {
            continue;
        }
        
        files.push({
            path: filePath,
            title: `${showName} ${seasonNum ? 'S' + seasonNum.padStart(2, '0') : ''}${episodeNum ? 'E' + episodeNum.padStart(2, '0') : ''} - ${fileName}`,
            season: seasonNum || '?',
            episode: episodeNum || '?',
            originalPath: filePath,
            fromFileSystem: true // Flag to indicate this came from file system scan
        });
    }
    
    return files;
}

// Extract file paths from unified data structure
function extractFilesFromUnifiedData(unifiedData, showFolder, seasonFilter) {
    const files = [];
    const showName = path.basename(showFolder);
    
    // Convert display name to normalized key format
    const normalizedKey = showName.toLowerCase()
        .replace(/[^a-z0-9()]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');
    
    // Find the show in unified data using normalized key
    let showData = null;
    let foundKey = null;
    
    // First try exact normalized key match
    if (unifiedData[normalizedKey]) {
        showData = unifiedData[normalizedKey];
        foundKey = normalizedKey;
    } else {
        // Fallback: try to find by matching the display name in the title field
        for (const [key, show] of Object.entries(unifiedData)) {
            if (show.title && show.title.toLowerCase().includes(showName.toLowerCase())) {
                showData = show;
                foundKey = key;
                break;
            }
        }
    }
    
    if (!showData || !showData.seasons) {
        showStatus(`Show not found in unified data: ${showName} (tried key: ${normalizedKey})`, 'warning');
        return files;
    }
    
    console.log(`✅ [CONVERT] Found show in unified data with key: ${foundKey}`);
    
    // Extract all episode file paths using absPath if available, otherwise path
    for (const [seasonNum, season] of Object.entries(showData.seasons)) {
        // If a season filter was provided (from a Season folder input), respect it
        if (seasonFilter) {
            const normalizedSeason = String(parseInt(seasonNum, 10)); // '03' -> '3'
            const normalizedFilter = String(parseInt(seasonFilter, 10));
            if (normalizedSeason !== normalizedFilter) continue;
        }
        if (season.episodes) {
            for (const [episodeNum, episode] of Object.entries(season.episodes)) {
                let filePath = null;
                
                // Prefer absPath if available, otherwise use path
                if (episode.absPath && fs.existsSync(episode.absPath)) {
                    filePath = episode.absPath;
                } else if (episode.path) {
                    // Convert relative path to full path
                    filePath = path.join(tvShowsRoot, episode.path);
                }
                
                if (filePath && fs.existsSync(filePath)) {
                    files.push({
                        path: filePath,
                        title: `${showName} S${seasonNum.padStart(2, '0')}E${episodeNum.padStart(2, '0')} - ${episode.title || 'Unknown'}`,
                        season: seasonNum,
                        episode: episodeNum,
                        originalPath: episode.path || episode.absPath
                    });
                }
            }
        }
    }
    
    return files;
}

// Update unified data with new AAC file names - AUTO-CREATES entries if they don't exist!
function updateUnifiedDataWithAACFiles(unifiedData, showFolder, conversionResults) {
    const showName = path.basename(showFolder);
    
    // Convert display name to normalized key format
    const normalizedKey = showName.toLowerCase()
        .replace(/[^a-z0-9()]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');
    
    // Find or CREATE the show in unified data
    let showData = null;
    let foundKey = null;
    
    if (unifiedData[normalizedKey]) {
        showData = unifiedData[normalizedKey];
        foundKey = normalizedKey;
    } else {
        // Try to find by matching display name
        for (const [key, show] of Object.entries(unifiedData)) {
            if (show.title && show.title.toLowerCase().includes(showName.toLowerCase())) {
                showData = show;
                foundKey = key;
                break;
            }
        }
    }
    
    // AUTO-CREATE show entry if it doesn't exist!
    // BUT: NEVER overwrite existing metadata - always preserve TMDB data, cast, posters, etc.
    if (!showData) {
        // CRITICAL: Check if an entry already exists with this normalized key but we failed to find it
        // This can happen if the entry exists but has a slightly different structure
        const existingEntry = unifiedData[normalizedKey];
        if (existingEntry && typeof existingEntry === 'object') {
            // Entry exists! Use it instead of creating a new one
            logToFile('convert_audio_to_aac_tv-shows', `✅ [FOUND] Using existing entry at key: ${normalizedKey}`);
            showData = existingEntry;
            foundKey = normalizedKey;
        } else {
            // Truly new entry - create minimal structure
            logToFile('convert_audio_to_aac_tv-shows', `📝 [CREATE] Creating new show entry in unified data: ${showName} (key: ${normalizedKey})`);
            showData = {
                title: showName,
                seasons: {}
            };
            unifiedData[normalizedKey] = showData;
            foundKey = normalizedKey;
        }
    } else {
        // IMPORTANT: Preserve all existing show-level metadata (poster, cast, description, etc.)
        // We only update episode file paths, never overwrite show metadata
        logToFile('convert_audio_to_aac_tv-shows', `✅ [PRESERVE] Found existing show entry at key: ${foundKey} - preserving all metadata (poster, cast, description, etc.)`);
    }
    
    if (!showData.seasons) {
        showData.seasons = {};
    }
    
    logToFile('convert_audio_to_aac_tv-shows', `✅ [UPDATE] Updating unified data for show: ${foundKey}`);
    
    // IMPORTANT: Log what metadata exists to ensure we're preserving it
    const hasMetadata = !!(showData.poster || showData.cast || showData.description || showData.TMDBTitle);
    if (hasMetadata) {
        logToFile('convert_audio_to_aac_tv-shows', `✅ [METADATA] Show has rich metadata - will preserve: poster=${!!showData.poster}, cast=${!!showData.cast}, description=${!!showData.description}`);
    }
    
    let updatedCount = 0;
    let createdCount = 0;
    
    // Update or CREATE each converted file in the unified data
    for (const result of conversionResults) {
        if (!result.success) continue;
        
        const { season, episode, originalPath, newFileName } = result;
        
        // AUTO-CREATE season if it doesn't exist
        // IMPORTANT: Preserve existing season metadata (poster, season_poster, etc.)
        if (!showData.seasons[season]) {
            logToFile('convert_audio_to_aac_tv-shows', `📝 [CREATE] Creating Season ${season} entry`);
            showData.seasons[season] = {
                episodes: {}
            };
        } else {
            // Preserve all existing season metadata (poster, season_poster, etc.)
            logToFile('convert_audio_to_aac_tv-shows', `✅ [PRESERVE] Season ${season} exists - preserving all season metadata`);
        }
        
        // AUTO-CREATE episode if it doesn't exist
        if (!showData.seasons[season].episodes) {
            showData.seasons[season].episodes = {};
        }
        
        const isNewEpisode = !showData.seasons[season].episodes[episode];
        
        // PRESERVE existing episode metadata if it exists
        const existingEpisodeData = showData.seasons[season].episodes[episode] || {};
        
        if (isNewEpisode) {
            logToFile('convert_audio_to_aac_tv-shows', `📝 [CREATE] Creating S${season}E${episode} entry`);
            createdCount++;
        } else {
            logToFile('convert_audio_to_aac_tv-shows', `📝 [UPDATE] Preserving metadata for S${season}E${episode}`);
        }
        
        // Calculate relative path from tvShowsRoot
        const relPath = path.relative(tvShowsRoot, result.aacPath).replace(/\\/g, '/');
        const baseFileName = path.basename(result.aacPath, path.extname(result.aacPath));
        const fileName = path.basename(result.aacPath);
        
        // Determine title - preserve existing if it's a proper TMDB title, otherwise use filename
        let episodeTitle = existingEpisodeData.title;
        if (!episodeTitle || episodeTitle === 'Unknown' || (episodeTitle === baseFileName && episodeTitle.length < 30) || !episodeTitle.includes('|')) {
            episodeTitle = baseFileName;
        }
        
        // BUILD episode data in the STANDARD FORMAT matching other episodes
        // Field order matches the standard JSON structure: title, absPath, path, duration, season, episode, type, etc.
        const episodeData = {
            // Standard fields in correct order (matching other episodes)
            "title": episodeTitle,
            "absPath": result.aacPath,
            "path": relPath,
            "duration": existingEpisodeData.duration || null,
            "season": season,
            "episode": episode,
            "type": existingEpisodeData.type || "episode",
            "isSpecials": existingEpisodeData.isSpecials || false,
            "videoFormat": existingEpisodeData.videoFormat || path.extname(result.aacPath),
            "supportsVideo": existingEpisodeData.supportsVideo !== undefined ? existingEpisodeData.supportsVideo : true,
            
            // TMDB metadata fields (preserve if they exist)
            "still": existingEpisodeData.still || null,
            "thumbnail": existingEpisodeData.thumbnail || null,
            "image": existingEpisodeData.image || null,
            "tmdbId": existingEpisodeData.tmdbId || null,
            "airDate": existingEpisodeData.airDate || null,
            "overview": existingEpisodeData.overview || null,
            "voteAverage": existingEpisodeData.voteAverage || null,
            "voteCount": existingEpisodeData.voteCount || null,
            
            // Additional path fields (preserve if they exist, add if needed)
            ...(existingEpisodeData.relPath && { "relPath": existingEpisodeData.relPath }),
            ...(existingEpisodeData.filePath && { "filePath": existingEpisodeData.filePath }),
            ...(existingEpisodeData.name && { "name": existingEpisodeData.name }),
            ...(existingEpisodeData.fileName && { "fileName": existingEpisodeData.fileName }),
            
            // Audio conversion fields (always update these)
            "audioConvertedToAAC": true,
            "audioConversionDate": new Date().toISOString(),
            "audioCodec": "aac"
        };
        
        // Update path-related fields if they don't match
        if (!episodeData.relPath) episodeData.relPath = relPath;
        if (!episodeData.filePath) episodeData.filePath = relPath;
        if (!episodeData.name) episodeData.name = fileName;
        if (!episodeData.fileName) episodeData.fileName = fileName;
        
        // Store the updated episode data back (in standard format matching all other episodes)
        showData.seasons[season].episodes[episode] = episodeData;
        
        updatedCount++;
        const action = isNewEpisode ? 'Created' : 'Updated';
        logToFile('convert_audio_to_aac_tv-shows', `📝 [${action}] S${season}E${episode}: ${newFileName}`);
    }
    
    const summary = `✅ [UPDATE] ${updatedCount} episodes processed (${createdCount} created, ${updatedCount - createdCount} updated)`;
    logToFile('convert_audio_to_aac_tv-shows', summary);
    return updatedCount > 0;
}

async function main() {
    try {
        logToFile('convert_audio_to_aac_tv-shows', '🎵 [AUDIO-CONVERT] Starting audio conversion for TV Shows...');
        console.log('🎵 Enhanced Single TV Show Audio Conversion');
        console.log('=' .repeat(70));
        
        // Show timeline
        const timelineSteps = ['Load Data', 'Extract Files', 'Check Codecs', 'Convert Audio', 'Update Data'];
        showTimeline(0, timelineSteps.length, timelineSteps);
        
        // Load unified data if it exists (optional - script works without it!)
        let unifiedData = {};
        if (fs.existsSync(UNIFIED_DATA_PATH)) {
            showStatus('Loading unified TV shows data...', 'info');
            try {
                unifiedData = JSON.parse(fs.readFileSync(UNIFIED_DATA_PATH, 'utf8'));
                showStatus('✅ Loaded unified data', 'success');
            } catch (e) {
                showStatus(`⚠️  Could not parse unified data, will work with file system only: ${e.message}`, 'warning');
                unifiedData = {};
            }
        } else {
            showStatus('⚠️  Unified data not found - will scan file system directly (this is fine!)', 'info');
        }
        
        // PRIORITIZE: Scan file system FIRST to find ALL files (including new ones not in JSON yet)
        showTimeline(1, timelineSteps.length, timelineSteps);
        showStatus('Scanning file system for ALL video files...', 'info');
        const fileSystemFiles = scanFilesFromFileSystem(showFolder, targetSeasonFilter);
        
        // Also check unified data for any additional metadata
        let unifiedFiles = [];
        if (Object.keys(unifiedData).length > 0) {
            showStatus('Checking unified data for additional files...', 'info');
            unifiedFiles = extractFilesFromUnifiedData(unifiedData, showFolder, targetSeasonFilter);
        }
        
        // Merge files from both sources, prioritizing file system (it has the newest files!)
        const fileMap = new Map();
        
        // Helper function to normalize paths for comparison (handles both forward and backslashes)
        function normalizePathForComparison(filePath) {
            return filePath.replace(/\\/g, '/').toLowerCase();
        }
        
        // Add file system files FIRST (they're the source of truth for what exists)
        for (const file of fileSystemFiles) {
            const normalizedPath = normalizePathForComparison(file.path);
            fileMap.set(normalizedPath, file);
        }
        
        // Add unified data files if they exist and aren't already found
        for (const file of unifiedFiles) {
            const normalizedPath = normalizePathForComparison(file.path);
            if (!fileMap.has(normalizedPath)) {
                // File in unified data but not in file system - might be moved/deleted, skip
                continue;
            }
            // Merge metadata from unified data if available
            const existingFile = fileMap.get(normalizedPath);
            if (!existingFile.title || existingFile.title.includes('Unknown')) {
                existingFile.title = file.title;
            }
        }
        
        let showFiles = Array.from(fileMap.values());

        if (showFiles.length === 0) {
            showStatus(`No video files found in: ${showFolder}`, 'warning');
            return;
        }
        
        // CRITICAL: Sort files chronologically by season and episode (S1E1, S1E2, S2E1, etc.)
        showFiles = sortTVShowFilesChronologically(showFiles);

        const fileSystemCount = fileSystemFiles.length;
        const unifiedCount = unifiedFiles.length;
        const mergedCount = showFiles.length;
        
        const startMsg = `Found ${mergedCount} files (${fileSystemCount} from file system${unifiedCount > 0 ? ', ' + unifiedCount + ' in unified data' : ''})`;
        logToFile('convert_audio_to_aac_tv-shows', startMsg);
        showStatus(startMsg, 'success');
        
        // Check which files actually need conversion
        showTimeline(2, timelineSteps.length, timelineSteps);
        showStatus('Checking audio codecs for all files...', 'info');
        let filesNeedingConversion = [];
        const alreadyAAC = [];
        const errors = [];
        
        for (let i = 0; i < showFiles.length; i++) {
            const file = showFiles[i];
            // Show animated progress for this file with cycling animation
            const fileName = path.basename(file.path);
            const totalFiles = showFiles.length;
            const currentFile = i + 1;
            
            // Show cycling animation for this file
            for (let frame = 0; frame < 5; frame++) {
                const percentage = Math.round((currentFile / totalFiles) * 100);
                const barLength = 40;
                const filledLength = Math.round((barLength * currentFile) / totalFiles);
                const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
                
                const animationFrames = ['|', '/', '-', '\\'];
                const frameChar = animationFrames[frame % animationFrames.length];
                
                const progressText = `\r${frameChar} [${bar}] ● ${percentage}% (${currentFile}/${totalFiles}) Checking: ${fileName}`;
                process.stdout.write(progressText);
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            try {
                // Use ffprobe to check audio codec
                const command = `ffprobe -v quiet -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${file.path}"`;
                const { stdout } = await execAsync(command);
                const codec = stdout.trim().toLowerCase();
                
                // Check if codec needs conversion
                const incompatibleCodecs = ['ac3', 'dts', 'eac3', 'truehd', 'atmos'];
                if (incompatibleCodecs.includes(codec)) {
                    file.incompatibleCodecs = [codec];
                    filesNeedingConversion.push(file);
                } else if (codec === 'aac') {
                    alreadyAAC.push({ ...file, codec });
                } else {
                    // Compatible codec, no conversion needed
                    alreadyAAC.push({ ...file, codec });
                }
            } catch (error) {
                errors.push({ ...file, error: error.message });
            }
        }
        
        clearProgress();
        
        // CRITICAL: Sort files needing conversion chronologically (S1E1, S1E2, S2E1, etc.)
        filesNeedingConversion = sortTVShowFilesChronologically(filesNeedingConversion);
        
        // Display analysis results
        console.log('\n📊 Audio Codec Analysis Results:');
        console.log(`  ✅ Already AAC: ${alreadyAAC.length}`);
        console.log(`  🔴 Needs Conversion: ${filesNeedingConversion.length}`);
        console.log(`  ⚠️  Errors: ${errors.length}`);
        
        if (filesNeedingConversion.length === 0) {
            const successMsg = 'No files need conversion!';
            logToFile('convert_audio_to_aac_tv-shows', successMsg);
            showStatus(successMsg, 'success');
            return;
        }
        
        // Show files that need conversion (now sorted by season/episode)
        console.log('\n🔴 Files needing conversion (sorted by season/episode):');
        filesNeedingConversion.forEach((item, index) => {
            const fileInfo = showFileInfo(item.path);
            const seasonEp = `S${item.season || '?'}E${item.episode || '?'}`;
            console.log(`  ${index + 1}. ${seasonEp} - ${path.basename(item.path)} (${item.incompatibleCodecs.join(', ')}) ${fileInfo}`);
        });
        
        console.log(`\n⚠️  WARNING: This will create backups and move original files to BKUP folder!`);
        console.log(`   • Original files will be moved to BKUP folder`);
        console.log(`   • Backup files will be moved to BKUP folder`);
        console.log(`   • Only _AAC files will remain in the root directory`);
        console.log(`   • Make sure you have enough disk space for backups`);
        console.log(`   Files to convert: ${filesNeedingConversion.length}`);
        
        // Check for --yes or --auto flag to skip confirmation
        const skipConfirmation = process.argv.includes('--yes') || process.argv.includes('--auto');
        
        if (!skipConfirmation) {
            // Ask for confirmation
            console.log('\nPress Enter to continue or Ctrl+C to cancel...');
            await new Promise(resolve => {
                process.stdin.once('data', resolve);
            });
        } else {
            console.log('\n✅ Auto-confirming (--yes flag detected)...');
        }
        
        // Create BKUP folder for this conversion
        const showName = path.basename(showFolder);
        const bkupsFolder = path.join(showFolder, 'BKUP');
        
        if (!fs.existsSync(bkupsFolder)) {
            fs.mkdirSync(bkupsFolder, { recursive: true });
            logToFile('convert_audio_to_aac_tv-shows', `📁 [BKUP] Created BKUP folder: ${bkupsFolder}`);
            showStatus(`Created BKUP folder: ${path.basename(bkupsFolder)}`, 'info');
        } else {
            logToFile('convert_audio_to_aac_tv-shows', `📁 [BKUP] Using existing BKUP folder: ${bkupsFolder}`);
            showStatus(`Using existing BKUP folder: ${path.basename(bkupsFolder)}`, 'info');
        }
        
        const results = [];
        let converted = 0;
        let failed = 0;
        const startTime = Date.now();
        
        // Start conversion
        showTimeline(3, timelineSteps.length, timelineSteps);
        showStatus('Starting conversion process...', 'info');
        
        for (let i = 0; i < filesNeedingConversion.length; i++) {
            const file = filesNeedingConversion[i];
            const fileName = path.basename(file.path);
            
            // Show initial file progress
            showFileProgress(fileName, i + 1, filesNeedingConversion.length, `From: ${file.incompatibleCodecs.join(', ')} → To: AAC (192k)`);
            
            if (file.incompatibleCodecs && file.incompatibleCodecs.length > 0) {
                const codecMsg = `Incompatible codecs: ${file.incompatibleCodecs.join(', ')}`;
                logToFile('convert_audio_to_aac_tv-shows', codecMsg);
                showStatus(codecMsg, 'info');
            }
            
            // Start conversion with real-time progress animation
            const conversionPromise = convertFile(file.path, i + 1, filesNeedingConversion.length, startTime, bkupsFolder);
            
            // Show animated progress during conversion using the same frame-based approach as scanning
            const progressAnimation = async () => {
                const percentage = Math.round(((i + 1) / filesNeedingConversion.length) * 100);
                const barLength = 40;
                const filledLength = Math.round((barLength * (i + 1)) / filesNeedingConversion.length);
                const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
                
                // Use the same 5-frame cycling animation as the scanning phase
                for (let frame = 0; frame < 5; frame++) {
                    const animationFrames = ['|', '/', '-', '\\'];
                    const frameChar = animationFrames[frame % animationFrames.length];
                    
                    const progressText = `\r${frameChar} [${bar}] ● ${percentage}% (${i + 1}/${filesNeedingConversion.length}) Converting: ${fileName}`;
                    process.stdout.write(progressText);
                    await new Promise(resolve => setTimeout(resolve, 150));
                }
            };
            
            // Start the animation loop
            const animationPromise = progressAnimation();
            
            // Wait for both conversion and animation to complete
            const [result] = await Promise.all([conversionPromise, animationPromise]);
            
            // Clear the progress animation
            clearProgress();
            
            results.push({
                path: file.path,
                title: file.title,
                season: file.season,
                episode: file.episode,
                ...result
            });
            
            if (result.success) {
                converted++;
                showStatus(`✅ Converted: ${fileName}`, 'success');
            } else {
                failed++;
                showStatus(`❌ Failed: ${fileName}`, 'error');
            }
            
            // Show time estimate
            showTimeEstimate(startTime, i + 1, filesNeedingConversion.length);
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Update unified data (ALWAYS save, even if starting from scratch!)
        if (converted > 0) {
            showTimeline(4, timelineSteps.length, timelineSteps);
            showStatus('Updating unified data...', 'info');
            
            // Update the unified data with new AAC file names (auto-creates if needed)
            const updateSuccess = updateUnifiedDataWithAACFiles(unifiedData, showFolder, results.filter(r => r.success));
            
            if (updateSuccess) {
                // Ensure directory exists before writing
                const unifiedDataDir = path.dirname(UNIFIED_DATA_PATH);
                if (!fs.existsSync(unifiedDataDir)) {
                    fs.mkdirSync(unifiedDataDir, { recursive: true });
                    logToFile('convert_audio_to_aac_tv-shows', `📁 [CREATE] Created directory: ${unifiedDataDir}`);
                }
                
                // Save the updated unified data (creates file if it didn't exist!)
                fs.writeFileSync(UNIFIED_DATA_PATH, JSON.stringify(unifiedData, null, 2));
                showStatus('✅ Updated tv-shows-unified.json with new AAC file names', 'success');
                logToFile('convert_audio_to_aac_tv-shows', '✅ [UPDATE] Successfully saved unified data file');
            } else {
                showStatus('⚠️ Failed to update unified data', 'warning');
                logToFile('convert_audio_to_aac_tv-shows', '⚠️ [UPDATE] Failed to update unified data');
            }
        }
        
        // Save conversion log
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        const log = {
            timestamp: new Date().toISOString(),
            totalFiles: showFiles.length,
            alreadyAAC: alreadyAAC.length,
            filesNeedingConversion: filesNeedingConversion.length,
            converted,
            failed,
            errors: errors.length,
            duration: `${duration} seconds`,
            results
        };
        
        fs.writeFileSync(CONVERSION_LOG_PATH, JSON.stringify(log, null, 2));
        
        const stats = {
            total: showFiles.length,
            converted,
            failed,
            errors: errors.length,
            duration: `${duration} seconds`
        };
        
        showConversionSummary(stats);
        
        // Show converted files
        if (converted > 0) {
            console.log('\n📋 Converted Files:');
            results.filter(r => r.success).forEach((file, index) => {
                const fileInfo = showFileInfo(file.path);
                console.log(`  ${index + 1}. ${path.basename(file.path)} ${fileInfo}`);
            });
        }
        
        const logSavedMsg = `Conversion log saved to: ${CONVERSION_LOG_PATH}`;
        logToFile('convert_audio_to_aac_tv-shows', logSavedMsg);
        showStatus(logSavedMsg, 'info');
        
        if (converted > 0) {
            const finalMsg = 'All converted files now have AAC audio and should play in browsers!';
            logToFile('convert_audio_to_aac_tv-shows', finalMsg);
            showStatus(finalMsg, 'success');
        }
        
    } catch (error) {
        const errorMsg = `Error: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows', errorMsg);
        showStatus(errorMsg, 'error');
    }
}

// Run the conversion
main(); 