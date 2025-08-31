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
                    console.log(`⏭️ [SCAN] Skipping existing TV show: ${normalizedKey} (matches ${existingKey})`);
                    existingShowsSkipped++;
                    continue; // SKIP - don't touch existing shows!
                }
                
                // Only add NEW shows
                console.log(`➕ [SCAN] Adding NEW TV show: ${normalizedKey}`);
                unifiedOutput[normalizedKey] = show;
                newShowsAdded++;
            }
        }
        
        console.log(`📊 [SCAN] Summary:`);
        console.log(`   - Existing TV shows preserved: ${existingShowsSkipped}`);
        console.log(`   - New TV shows added: ${newShowsAdded}`);
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
            console.log(`✅ [SCAN] TV-SHOWS scan complete! Added ${newShowsAdded} new shows.`);
        } else {
            console.log(`✅ [SCAN] No new TV shows found. Existing library unchanged.`);
        }
        
        console.log(`📊 [SCAN] Found ${Object.keys(unifiedOutput).length} total TV shows`);
        
        // Show some statistics
        let totalEpisodes = 0;
        let totalSeasons = 0;
        
        for (const show of Object.values(unifiedOutput)) {
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
        console.error(`❌ [SCAN] Fatal error during scan: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}