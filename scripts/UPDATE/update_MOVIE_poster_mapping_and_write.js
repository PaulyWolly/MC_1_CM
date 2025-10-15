/*
  UPDATE_MOVIE_POSTER_MAPPING_AND_WRITE.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const fs = require('fs').promises;
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');
// Use normalizeKey for all mapping key normalization in this file.

const MOVIES_DIR = 'S:/MEDIA/MOVIES';
const ORIGINAL_MAPPING_FILE = 'public/components/MediaLibrary/data/movie_posters_backup.json';
const NEW_MAPPING_FILE = 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json';
const BACKUP_FILE = 'public/components/MediaLibrary/data/movie_posters_prewrite_backup.json';

function isVideoFile(filename) {
    const exts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    return exts.includes(path.extname(filename).toLowerCase());
}

function extractTitleYear(filename) {
    // Try to extract title and year from filename or folder
    const match = filename.match(/^(.*?)(?:\s*\(|\s*\[)?(\d{4})(?:\)|\])?/);
    if (match) {
        return {
            title: match[1].replace(/[._]/g, ' ').trim(),
            year: match[2]
        };
    }
    return { title: filename.replace(/[._]/g, ' ').trim(), year: '' };
}

async function main() {
    console.log('📝 FULL REBUILD: Scan all movie files, use local poster if present, else match to old mapping by normalized title/year/filename. Every movie file gets a mapping entry.');
    // Backup current mapping if it exists
    try {
        const current = await fs.readFile(NEW_MAPPING_FILE, 'utf8');
        await fs.writeFile(BACKUP_FILE, current);
        console.log(`💾 Backed up current mapping to ${BACKUP_FILE}`);
    } catch (e) {
        console.log('ℹ️  No previous mapping to backup.');
    }

    // Load the original mapping (with all TMDb/remote URLs)
    let oldMapping = {};
    try {
        oldMapping = JSON.parse(await fs.readFile(ORIGINAL_MAPPING_FILE, 'utf8'));
    } catch (e) {
        console.error('❌ Could not load original mapping file:', ORIGINAL_MAPPING_FILE);
        process.exit(1);
    }
    const oldKeys = Object.keys(oldMapping);

    // Build a normalized lookup for old mapping
    const oldLookup = {};
    for (const key of oldKeys) {
        const base = path.basename(key, path.extname(key));
        const { title, year } = extractTitleYear(base);
        const norm = normalizeKey(title + (year || ''));
        oldLookup[norm] = oldMapping[key];
    }

    // Scan all movie files in MOVIES_DIR
    const folders = await fs.readdir(MOVIES_DIR, { withFileTypes: true });
    let newMapping = {};
    let mappedLocal = 0, mappedRemote = 0, unmapped = 0;
    for (const folder of folders) {
        if (!folder.isDirectory()) continue;
        const folderName = folder.name;
        const folderPath = path.join(MOVIES_DIR, folderName);
        let files;
        try {
            files = await fs.readdir(folderPath);
        } catch (e) {
            continue;
        }
        for (const file of files) {
            if (!isVideoFile(file)) continue;
            const movieFilePath = path.join(folderPath, file).replace(/\\/g, '/');
            const posterPath = path.join(folderPath, 'poster.jpg');
            // 1. Use local poster if present
            try {
                await fs.access(posterPath);
                newMapping[movieFilePath] = `/media/movies/${folderName}/poster.jpg`;
                mappedLocal++;
                continue;
            } catch (e) {}
            // 2. Else, try to match to old mapping by normalized title/year
            const { title, year } = extractTitleYear(file);
            const norm = normalizeKey(title + (year || ''));
            if (oldLookup[norm]) {
                newMapping[movieFilePath] = oldLookup[norm];
                mappedRemote++;
            } else {
                unmapped++;
                newMapping[movieFilePath] = '';
            }
        }
    }
    await fs.writeFile(NEW_MAPPING_FILE, JSON.stringify(newMapping, null, 2));
    console.log(`\n✅ Rebuilt mapping: ${mappedLocal} local posters, ${mappedRemote} remote posters, ${unmapped} unmapped.`);
}

async function cleanAndNormalizeMapping() {
    // Load the current mapping
    let mapping = {};
    try {
        mapping = JSON.parse(await fs.readFile(NEW_MAPPING_FILE, 'utf8'));
    } catch (e) {
        console.error('❌ Could not load mapping file:', NEW_MAPPING_FILE);
        return;
    }
    const cleaned = {};
    for (const key of Object.keys(mapping)) {
        // Normalize to forward slashes
        let normKey = key.replace(/\\/g, '/');
        // Remove trailing/leading spaces
        normKey = normKey.trim();
        // Only keep if the file exists
        try {
            await fs.access(normKey);
            cleaned[normKey] = mapping[key];
        } catch (e) {
            // File does not exist, skip
        }
    }
    await fs.writeFile(NEW_MAPPING_FILE, JSON.stringify(cleaned, null, 2));
    console.log(`🧹 Cleaned mapping: ${Object.keys(cleaned).length} valid entries remain.`);
}

main().then(cleanAndNormalizeMapping); 