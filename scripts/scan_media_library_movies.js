/*
  SCAN_MEDIA_LIBRARY_MOVIES.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { normalizeKey } = require('../shared/NormalizationService');
// Use normalizeKey for all mapping key normalization in this file.

const MEDIA_ROOT = 'S:/MEDIA/MOVIES';
const OUTPUT_FILE = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');

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
    console.log(`Scanning MOVIES library at: ${MEDIA_ROOT}`);
    const mediaTree = walkMedia(MEDIA_ROOT);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mediaTree, null, 2));
    console.log(`MOVIES scan complete. Output written to: ${OUTPUT_FILE}`);
    // Run normalization script after scan
    const normScript = path.join(__dirname, 'normalize_movie_posters_keys.js');
    if (fs.existsSync(normScript)) {
        console.log('Running poster normalization script...');
        const result = spawnSync('node', [normScript], { stdio: 'inherit' });
        if (result.error) {
            console.error('Failed to run normalization script:', result.error);
        }
    } else {
        console.warn('Normalization script not found:', normScript);
    }
}

if (require.main === module) {
    main();
} 