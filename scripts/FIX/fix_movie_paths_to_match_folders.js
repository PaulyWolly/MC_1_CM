/*
  FIX_MOVIE_PATHS_TO_MATCH_FOLDERS.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

// fix_movie_paths_to_match_folders.js
// Scans S:/MEDIA/MOVIES and updates movie paths in media-library-movies.json to match actual folder names

const fs = require('fs');
const path = require('path');

const MOVIES_DIR = 'S:/MEDIA/MOVIES';
const MOVIE_JSON = path.join(process.cwd(), 'public/components/MediaLibrary/data/movies/media-library-movies.json');

function getFolders(dir) {
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
}

function normalize(str) {
    return str.replace(/\s+/g, ' ').replace(/[._-]/g, '').replace(/\W/g, '').toLowerCase();
}

function fixPathsRecursive(node, absParent, changed) {
    if (!node || !node.folders) return;
    for (const folderNode of node.folders) {
        const absPath = path.join(absParent, folderNode.path);
        // Find the actual folder name on disk that matches (case-insensitive)
        const parentFolders = fs.readdirSync(absParent, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);
        const match = parentFolders.find(f => f.toLowerCase() === path.basename(folderNode.path).toLowerCase());
        if (match && folderNode.path !== match) {
            console.log(`[FIX] Updating path: '${folderNode.path}' -> '${match}'`);
            folderNode.path = match;
            changed.count++;
        }
        // Recurse into subfolders
        fixPathsRecursive(folderNode, path.join(absParent, match || folderNode.path), changed);
    }
}

function main() {
    const moviesTree = JSON.parse(fs.readFileSync(MOVIE_JSON, 'utf8'));
    let changed = { count: 0 };
    fixPathsRecursive(moviesTree, MOVIES_DIR, changed);
    if (changed.count > 0) {
        fs.writeFileSync(MOVIE_JSON, JSON.stringify(moviesTree, null, 2));
        console.log(`Updated ${changed.count} folder paths.`);
    } else {
        console.log('No changes needed. All folder paths match disk.');
    }
}

main(); 