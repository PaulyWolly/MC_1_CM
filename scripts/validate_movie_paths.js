/*
  VALIDATE_MOVIE_PATHS.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const MOVIES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');

function walkFolders(node, missing = []) {
    if (Array.isArray(node.files)) {
        for (const file of node.files) {
            if (!file.absPath && !file.relPath) {
                missing.push({
                    name: file.name,
                    parent: node.path || '',
                    file
                });
            }
        }
    }
    if (Array.isArray(node.folders)) {
        for (const folder of node.folders) {
            walkFolders(folder, missing);
        }
    }
    return missing;
}

function main() {
    if (!fs.existsSync(MOVIES_JSON)) {
        console.error('Could not find:', MOVIES_JSON);
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
    const missing = walkFolders(data);
    if (missing.length === 0) {
        console.log('✅ All movie files have absPath or relPath.');
    } else {
        console.error(`❌ Found ${missing.length} movie files missing absPath and relPath:`);
        missing.forEach((item, idx) => {
            console.error(`${idx + 1}. Movie: ${item.name} (Parent: ${item.parent})`, item.file);
        });
    }
}

main(); 