/*
  NORMALIZE_TV_POSTERS.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
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