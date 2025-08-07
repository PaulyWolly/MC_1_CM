/*
  CONVERT_TV_GENRES_TO_NORMALIZED.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

// scripts/CONVERT/convert_tv_genres_to_normalized.js
// Converts tv_genres.json to use normalized keys, outputting tv_genres_normalized.json

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const INPUT_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv_genres.json');
const OUTPUT_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv_genres_normalized.json');

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('Input file not found:', INPUT_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(INPUT_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    process.exit(1);
  }
  const out = {};
  for (const [key, genres] of Object.entries(data)) {
    const normalized = normalizeKey(key);
    if (!normalized) {
      console.warn('Could not normalize key for:', key);
      continue;
    }
    out[normalized] = genres;
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2));
  console.log('Normalized TV genres written to', OUTPUT_PATH);
}

if (require.main === module) {
  main();
} 