/*
  SCAN_MEDIA_LIBRARY.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = 'S:/MEDIA';
const OUTPUT_FILE = path.join(__dirname, '../server/data/media-library-full.json');

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

function walkMedia(dir, relPath = '') {
    const absPath = path.join(dir, relPath);
    const { folders, files } = scanDirectory(absPath);
    const result = {
        path: relPath,
        folders: [],
        files: files.map(f => ({
            name: f,
            absPath: path.join(absPath, f),
            relPath: path.join(relPath, f)
        }))
    };
    for (const folder of folders) {
        result.folders.push(walkMedia(dir, path.join(relPath, folder)));
    }
    return result;
}

function main() {
    console.log(`Scanning media library at: ${MEDIA_ROOT}`);
    const mediaTree = walkMedia(MEDIA_ROOT);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mediaTree, null, 2));
    console.log(`Media library scan complete. Output written to: ${OUTPUT_FILE}`);
}

if (require.main === module) {
    main();
} 