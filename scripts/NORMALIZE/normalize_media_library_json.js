/*
  NORMALIZE_MEDIA_LIBRARY_JSON.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const MOVIES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');
const TVSHOWS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows.json');

function normalizeFoldersInFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`[NORMALIZE] File not found: ${filePath}`);
    return;
  }
  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(data.folders)) {
    console.error(`[NORMALIZE] No folders array in ${filePath}`);
    return;
  }
  let updated = 0;
  for (const folder of data.folders) {
    // Use folder.path as the source for normalization
    if (folder.path) {
      const norm = normalizeKey(folder.path);
      if (folder.normalizedKey !== norm) {
        folder.normalizedKey = norm;
        updated++;
      }
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`[NORMALIZE] ${label}: Added/updated normalizedKey for ${updated} folders.`);
}

function main() {
  normalizeFoldersInFile(MOVIES_JSON, 'Movies');
  normalizeFoldersInFile(TVSHOWS_JSON, 'TV Shows');
  console.log('[NORMALIZE] Normalization complete.');
}

main(); 