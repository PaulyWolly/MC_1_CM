/*
  NORMALIZE_TV_POSTERS.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

// Node.js script to normalize TV show poster keys to dot notation
const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const SRC = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv_posters.json');
const DEST = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json');

const posters = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const normalized = {};
for (const [key, url] of Object.entries(posters)) {
    const dotKey = normalizeKey(key);
    normalized[dotKey] = url;
}
fs.writeFileSync(DEST, JSON.stringify(normalized, null, 2));
console.log(`Normalized TV show posters written to ${DEST}`); 