/*
  CLEANUP_TV_SHOW_JSON.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

// cleanup_tv_show_json.js
// Remove references to deleted or duplicate episode files from the TV show JSON

const fs = require('fs');
const path = require('path');

const TV_SHOWS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows.json');
const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const BACKUP_FILE = TV_SHOWS_JSON + '.bak_' + Date.now();

function fileExists(absPath) {
    try {
        return fs.existsSync(absPath);
    } catch {
        return false;
    }
}

function cleanFiles(files, absSeasonPath) {
    const seen = new Set();
    const cleaned = [];
    for (const fileObj of files) {
        const absFile = fileObj.absPath || path.join(absSeasonPath, fileObj.name);
        if (!fileExists(absFile)) {
            console.log('Removing missing file:', absFile);
            continue;
        }
        const key = (fileObj.name || '').toLowerCase();
        if (seen.has(key)) {
            console.log('Removing duplicate episode:', fileObj.name);
            continue;
        }
        seen.add(key);
        cleaned.push(fileObj);
    }
    return cleaned;
}

function cleanTree(node, parentAbsPath = MEDIA_ROOT) {
    if (node.files && Array.isArray(node.files)) {
        node.files = cleanFiles(node.files, parentAbsPath);
    }
    if (node.folders && Array.isArray(node.folders)) {
        for (const folder of node.folders) {
            const absPath = path.join(parentAbsPath, folder.path.replace(/\\/g, path.sep));
            cleanTree(folder, absPath);
        }
    }
}

function main() {
    const showArg = process.argv[2];
    const raw = fs.readFileSync(TV_SHOWS_JSON, 'utf-8');
    const data = JSON.parse(raw);
    fs.copyFileSync(TV_SHOWS_JSON, BACKUP_FILE);
    console.log('Backup written to', BACKUP_FILE);
    if (showArg) {
        // Single show mode
        const showName = showArg.trim();
        let found = false;
        if (Array.isArray(data.folders)) {
            for (const folder of data.folders) {
                if (folder.path === showName) {
                    found = true;
                    cleanTree(folder, path.join(MEDIA_ROOT, showName));
                }
            }
        }
        if (!found) {
            console.log('Show not found in JSON:', showName);
        } else {
            fs.writeFileSync(TV_SHOWS_JSON, JSON.stringify(data, null, 2));
            console.log('Cleanup complete for show:', showName);
        }
    } else {
        // All shows
        cleanTree(data);
        fs.writeFileSync(TV_SHOWS_JSON, JSON.stringify(data, null, 2));
        console.log('Cleanup complete. Cleaned JSON written to', TV_SHOWS_JSON);
    }
}

if (require.main === module) {
    main();
} 