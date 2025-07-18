/*
  NORMALIZE_MOVIE_POSTERS_KEYS.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

// normalize_movie_posters_keys.js
// Usage: node scripts/normalize_movie_posters_keys.js
// Normalizes keys in movie_posters.json to just the folder name

const fs = require('fs');
const path = require('path');

const POSTERS_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
const OUTPUT_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

function getFolderName(key) {
    // Handles both Windows and POSIX paths
    if (!key) return '';
    // Remove trailing slash if present
    let clean = key.replace(/[\\/]+$/, '');
    // If it's a full path, extract the folder name
    const parts = clean.split(/[\\/]/);
    if (parts.length > 1) {
        // If last part is a file, use the second-to-last as folder
        if (parts[parts.length - 1].includes('.')) {
            return parts[parts.length - 2];
        }
        return parts[parts.length - 1];
    }
    return clean;
}

function main() {
    if (!fs.existsSync(POSTERS_PATH)) {
        console.error('movie_posters.json not found:', POSTERS_PATH);
        process.exit(1);
    }
    const posters = JSON.parse(fs.readFileSync(POSTERS_PATH, 'utf8'));
    const normalized = {};
    const duplicates = new Set();
    let total = 0, changed = 0, dupes = 0;
    for (const [key, value] of Object.entries(posters)) {
        total++;
        const folder = getFolderName(key);
        if (normalized[folder]) {
            duplicates.add(folder);
            dupes++;
        }
        normalized[folder] = value;
        if (folder !== key) changed++;
    }
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(normalized, null, 2));
    console.log(`Normalized ${total} entries. Changed: ${changed}. Duplicates: ${duplicates.size}`);
    if (duplicates.size > 0) {
        console.warn('Duplicate folder names found:', Array.from(duplicates));
    }
    console.log('Output written to', OUTPUT_PATH);
}

main(); 