/*
  NORMALIZE_TV_SHOWS_JSON.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const TVSHOWS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows.json');
const TVSHOWS_JSON_OUT = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');

function normalizeShows(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`[NORMALIZE] File not found: ${inputPath}`);
    return;
  }
  let shows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!Array.isArray(shows)) {
    console.error(`[NORMALIZE] Not an array: ${inputPath}`);
    return;
  }
  let updated = 0;
  for (const show of shows) {
    if (show.title) {
      const norm = normalizeKey(show.title);
      if (show.normalizedKey !== norm) {
        show.normalizedKey = norm;
        updated++;
      }
    }
  }
  fs.writeFileSync(outputPath, JSON.stringify(shows, null, 2));
  console.log(`[NORMALIZE] TV Shows: Added/updated normalizedKey for ${updated} shows. Output: ${outputPath}`);
}

normalizeShows(TVSHOWS_JSON, TVSHOWS_JSON_OUT); 