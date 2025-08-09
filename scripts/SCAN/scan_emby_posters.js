/*
  SCAN_EMBY_POSTERS.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const EMBY_METADATA_ROOT = 'C:/Users/pwelb/AppData/Roaming/Emby-Server/programdata/metadata/library';
const OUTPUT_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/emby-posters_normalized.json');

const POSTER_FILENAMES = ['poster.jpg', 'folder.jpg', 'cover.jpg', 'poster.png', 'folder.png', 'cover.png'];

function findPosterFile(dir) {
    for (const name of POSTER_FILENAMES) {
        const filePath = path.join(dir, name);
        if (fs.existsSync(filePath)) {
            return filePath;
        }
    }
    return null;
}

function scanEmbyMetadata(dir, relPath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const posters = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            const subdir = path.join(dir, entry.name);
            const poster = findPosterFile(subdir);
            if (poster) {
                posters.push({
                    folder: relPath ? path.join(relPath, entry.name) : entry.name,
                    poster: poster
                });
            }
            // Recurse into subfolders
            posters.push(...scanEmbyMetadata(subdir, path.join(relPath, entry.name)));
        }
    }
    return posters;
}

function main() {
    console.log(`Scanning Emby metadata folder at: ${EMBY_METADATA_ROOT}`);
    const posterList = scanEmbyMetadata(EMBY_METADATA_ROOT);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posterList, null, 2));
    console.log(`Emby poster scan complete. Output written to: ${OUTPUT_FILE}`);
}

if (require.main === module) {
    main();
} 