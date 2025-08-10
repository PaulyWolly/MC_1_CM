/*
  UPDATE_POSTER_MAPPING_DRYRUN.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

const fs = require('fs').promises;
const path = require('path');

const MOVIES_DIR = 'S:/MEDIA/MOVIES';
const OLD_MAPPING_FILE = 'public/components/MediaLibrary/data/movie_posters_backup.json';

function extractTitleYear(filename) {
    // Try to extract title and year from normalized filename
    // e.g. "Ex Machina (2015) [1080p]" => { title: "Ex Machina", year: "2015" }
    const match = filename.match(/^(.*?)(?:\s*\(|\s*\[)?(\d{4})(?:\)|\])?/);
    if (match) {
        return {
            title: match[1].replace(/\./g, ' ').trim(),
            year: match[2]
        };
    }
    return { title: filename.replace(/\./g, ' ').trim(), year: '' };
}

function normalizeString(str) {
    return str.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

async function main() {
    console.log('🔍 DRY RUN: Mapping normalized movie files to old poster mapping...\n');
    const oldMapping = JSON.parse(await fs.readFile(OLD_MAPPING_FILE, 'utf8'));
    const oldKeys = Object.keys(oldMapping);
    let mapped = 0, notFound = 0;
    const report = [];

    const folders = await fs.readdir(MOVIES_DIR, { withFileTypes: true });
    for (const folder of folders) {
        if (!folder.isDirectory()) continue;
        const folderPath = path.join(MOVIES_DIR, folder.name);
        const files = await fs.readdir(folderPath);
        const movieFile = files.find(f => /\.(mp4|mkv|avi|mov|m4v)$/i.test(f));
        if (!movieFile) {
            report.push({ folder: folder.name, status: 'NO MOVIE FILE' });
            continue;
        }
        const normalizedPath = path.join(folderPath, movieFile).replace(/\//g, '\\');
        const { title, year } = extractTitleYear(folder.name);
        const normTitle = normalizeString(title);
        // Try to find best match in old mapping
        let bestKey = null;
        for (const key of oldKeys) {
            const keyBase = path.basename(key);
            const keyDir = path.basename(path.dirname(key));
            const keyTitleYear = extractTitleYear(keyDir);
            if (normalizeString(keyTitleYear.title) === normTitle && keyTitleYear.year === year) {
                bestKey = key;
                break;
            }
        }
        if (bestKey) {
            mapped++;
            report.push({
                folder: folder.name,
                file: movieFile,
                normalizedPath,
                matchedOldKey: bestKey,
                posterUrl: oldMapping[bestKey],
                status: 'MATCHED'
            });
        } else {
            notFound++;
            report.push({
                folder: folder.name,
                file: movieFile,
                normalizedPath,
                status: 'NO MATCH'
            });
        }
    }
    // Print summary
    console.log(`\nSUMMARY: ${mapped} matched, ${notFound} not found, ${folders.length} total folders\n`);
    // Print first 20 results
    for (const r of report.slice(0, 20)) {
        if (r.status === 'MATCHED') {
            console.log(`✅ ${r.normalizedPath}\n   ← ${r.matchedOldKey}\n   → ${r.posterUrl}\n`);
        } else if (r.status === 'NO MATCH') {
            console.log(`❌ ${r.normalizedPath} (NO MATCH)`);
        } else {
            console.log(`⚠️  ${r.folder} (${r.status})`);
        }
    }
    if (report.length > 20) {
        console.log(`...and ${report.length - 20} more.`);
    }
}

main(); 