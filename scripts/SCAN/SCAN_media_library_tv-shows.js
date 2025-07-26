/*
  SCAN_MEDIA_LIBRARY_TV-SHOWS.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');
const { ProgressAnimation } = require('../CONVERT/animation-helper');

const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const OUTPUT_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');

function isVideoFile(filename) {
    const exts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    return exts.includes(path.extname(filename).toLowerCase());
}

function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const folders = [];
    const files = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            folders.push(entry.name);
        } else if (entry.isFile() && isVideoFile(entry.name)) {
            files.push(entry.name);
        }
    }
    return { folders, files };
}

function walkShows(dir, relPath = '', animation = null, totalFolders = 0, currentFolder = 0) {
    const absPath = path.join(dir, relPath);
    const { folders, files } = scanDirectory(absPath);
    const relParts = relPath.split(path.sep).filter(Boolean);
    let showTitle = relParts.length > 0 ? relParts[0] : '';
    let normalizedKey = showTitle ? normalizeKey(showTitle) : '';
    // Only treat as a show root if at the first folder level
    let isShowRoot = relParts.length === 1;
    
    // Show progress if animation is provided
    if (animation && totalFolders > 0) {
        const progressLine = animation.getCustomProgress(currentFolder, totalFolders, 'Scanning', '[SCAN] ');
        console.log(`${progressLine} : ${relPath || 'root'}`);
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
    
    let folderCount = 0;
    for (const folder of folders) {
        result.folders.push(walkShows(dir, path.join(relPath, folder), animation, totalFolders, currentFolder + folderCount));
        folderCount++;
    }
    return result;
}

function flattenShows(tree) {
    // Flattens the folder tree into an array of show objects with normalizedKey
    const result = [];
    function recurse(node) {
        if (node.normalizedKey) result.push(node);
        for (const folder of node.folders) {
            recurse(folder);
        }
    }
    recurse(tree);
    return result;
}

function main() {
    console.log(`Scanning TV-SHOWS library at: ${MEDIA_ROOT}`);
    
    // Count total folders for progress tracking
    const animation = new ProgressAnimation('classic', 20);
    console.log(`${animation.getSpinnerLine('Counting folders...')}`);
    
    // For now, we'll use a simple approach - scan without detailed progress
    const mediaTree = walkShows(MEDIA_ROOT);
    const flatShows = flattenShows(mediaTree);
    
    console.log(`${animation.getSpinnerLine('Writing output file...')}`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(flatShows, null, 2));
    
    console.log(`✅ TV-SHOWS scan complete. Output written to: ${OUTPUT_FILE}`);
    console.log(`📊 Found ${flatShows.length} TV shows`);
}

if (require.main === module) {
    main();
}