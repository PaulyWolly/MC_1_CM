/*
  SCAN_MEDIA_LIBRARY_TV-SHOWS.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');
const { ProgressAnimation } = require('../animation-helper');

const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const OUTPUT_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');

// SCAN-SPECIFIC normalization that preserves "&" for display purposes
function scanNormalizeKey(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  
  return name
    .replace(/\\/g, '/')
    // First, protect periods within words (like "vs.") by temporarily replacing them
    .replace(/(\w+)\.(\w+)/g, '$1__PERIOD__$2')
    // Handle common abbreviations and special cases
    .replace(/\bMr\.\b/gi, 'mr')
    .replace(/\bMrs\.\b/gi, 'mrs')
    .replace(/\bMs\.\b/gi, 'ms')
    .replace(/\bDr\.\b/gi, 'dr')
    .replace(/\bProf\.\b/gi, 'prof')
    .replace(/\bSt\.\b/gi, 'st')
    .replace(/\bAve\.\b/gi, 'ave')
    .replace(/\bBlvd\.\b/gi, 'blvd')
    .replace(/\bRd\.\b/gi, 'rd')
    .replace(/\bLn\.\b/gi, 'ln')
    .replace(/\bCt\.\b/gi, 'ct')
    .replace(/\bCo\.\b/gi, 'co')
    .replace(/\bInc\.\b/gi, 'inc')
    .replace(/\bLtd\.\b/gi, 'ltd')
    .replace(/\bCorp\.\b/gi, 'corp')
    .replace(/\bLLC\b/gi, 'llc')
    .replace(/\bU\.S\.A\.\b/gi, 'usa')
    .replace(/\bU\.S\.A\b/gi, 'usa')
    .replace(/\bU\.S\.\b/gi, 'us')
    .replace(/\bU\.S\b/gi, 'us')
    .replace(/\bU\.K\.\b/gi, 'uk')
    .replace(/\bU\.N\.\b/gi, 'un')
    .replace(/\bII\b/gi, '2')
    .replace(/\bIII\b/gi, '3')
    .replace(/\bIV\b/gi, '4')
    // IMPORTANT: DO NOT convert "&" to "and" for scan purposes - preserve original
    // Convert all other spaces to dots
    .replace(/\s+/g, '.')
    // Remove special characters except dots, parentheses, brackets, and ampersands
    .replace(/[^a-zA-Z0-9.\[\]()&]/g, '')
    // Clean up multiple dots
    .replace(/\.+/g, '.')
    // Remove leading/trailing dots
    .replace(/^\.|\.$/g, '')
    // Restore protected periods within words
    .replace(/__PERIOD__/g, '.')
    // Convert to lowercase for consistency
    .toLowerCase();
}

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

function walkShows(dir, relPath = '', animation = null, totalFolders = 0, currentFolder = 0) {
    try {
        const absPath = path.join(dir, relPath);
        const { folders, files } = scanDirectory(absPath);
        const relParts = relPath.split(path.sep).filter(Boolean);
        let showTitle = relParts.length > 0 ? relParts[0] : '';
        let normalizedKey = showTitle ? scanNormalizeKey(showTitle) : '';
        // Only treat as a show root if at the first folder level
        let isShowRoot = relParts.length === 1;
        
        // Show progress if animation is provided
        if (animation && totalFolders > 0) {
            const progressLine = animation.getCustomProgress(currentFolder, totalFolders, 'Scanning', '[SCAN] ');
            console.log(`${progressLine} : ${relPath || 'root'}`);
        }
        
        // If we're at the root level, process each folder as a potential TV show
        if (relPath === '') {
            console.log(`🔍 [SCAN] Found ${folders.length} folders at root level:`);
            folders.forEach(folder => console.log(`  - ${folder}`));
            
            const shows = [];
            for (const folder of folders) {
                try {
                    const showResult = walkShows(dir, folder, animation, totalFolders, currentFolder);
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
                    const subResult = walkShows(dir, subPath, animation, totalFolders, currentFolder + folderCount);
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
    
    // Initialize animation
    const animation = new ProgressAnimation();
    animation.start('Scanning TV shows...');
    
    try {
        // Scan the media library - now returns array of shows directly
        const shows = walkShows(MEDIA_ROOT);
        
        animation.update('Writing output file...');
        
        // Create backup of existing file
        if (fs.existsSync(OUTPUT_FILE)) {
            // Create bkup directory if it doesn't exist
            const bkupDir = path.join(path.dirname(OUTPUT_FILE), 'bkup');
            if (!fs.existsSync(bkupDir)) {
                fs.mkdirSync(bkupDir, { recursive: true });
                console.log(`📁 [SCAN] Created backup directory: ${bkupDir}`);
            }
            
            // Move backup to bkup folder with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(bkupDir, `media-library-tv-shows_normalized_backup_${timestamp}.json`);
            fs.copyFileSync(OUTPUT_FILE, backupFile);
            console.log(`💾 [SCAN] Backup created: ${backupFile}`);
        }
        
        // Write the data
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(shows, null, 2));
        
        animation.stop('TV-SHOWS scan complete!');
        console.log(`✅ [SCAN] Output written to: ${OUTPUT_FILE}`);
        console.log(`📊 [SCAN] Found ${shows.length} valid TV shows`);
        
        // Show some statistics
        let totalEpisodes = 0;
        let totalSeasons = 0;
        
        for (const show of shows) {
            function countEpisodes(node) {
                if (node.files) totalEpisodes += node.files.length;
                if (node.folders) {
                    totalSeasons += node.folders.length;
                    for (const folder of node.folders) {
                        countEpisodes(folder);
                    }
                }
            }
            countEpisodes(show);
        }
        
        console.log(`📺 [SCAN] Total episodes: ${totalEpisodes}`);
        console.log(`📁 [SCAN] Total seasons: ${totalSeasons}`);
        
    } catch (error) {
        animation.error(`Fatal error during scan: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}