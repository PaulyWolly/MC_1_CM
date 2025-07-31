/*
  RENAME_AND_NORMALIZE_MEDIA_LIBRARY_JSON.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../shared/NormalizationService');

const MOVIES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');
const TVSHOWS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows.json');
const MOVIES_JSON_OUT = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');
const TVSHOWS_JSON_OUT = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');

function normalizeAndWrite(inputPath, outputPath, label) {
  if (!fs.existsSync(inputPath)) {
    console.error(`[NORMALIZE] File not found: ${inputPath}`);
    return;
  }
  let data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(data.folders)) {
    console.error(`[NORMALIZE] No folders array in ${inputPath}`);
    return;
  }
  let updated = 0;
  for (const folder of data.folders) {
    if (folder.path) {
      const norm = normalizeKey(folder.path);
      if (folder.normalizedKey !== norm) {
        folder.normalizedKey = norm;
        updated++;
      }
    }
  }
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`[NORMALIZE] ${label}: Added/updated normalizedKey for ${updated} folders. Output: ${outputPath}`);
}

function main() {
  normalizeAndWrite(MOVIES_JSON, MOVIES_JSON_OUT, 'Movies');
  normalizeAndWrite(TVSHOWS_JSON, TVSHOWS_JSON_OUT, 'TV Shows');
  console.log('[NORMALIZE] Normalization and renaming complete.');
}

main(); 