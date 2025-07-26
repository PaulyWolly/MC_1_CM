/*
  FIX_MOVIE_POSTERS_NORMALIZED_KEYS.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

// Script to normalize all keys in movie_posters_normalized.json to dot notation
const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const POSTERS_FILE = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

function main() {
  if (!fs.existsSync(POSTERS_FILE)) {
    console.error('File not found:', POSTERS_FILE);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(POSTERS_FILE, 'utf8'));
  const newData = {};
  const seen = new Set();
  let changed = 0, removed = 0, kept = 0;
  for (const [key, value] of Object.entries(data)) {
    const norm = normalizeKey(key);
    if (!seen.has(norm)) {
      newData[norm] = value;
      seen.add(norm);
      if (norm !== key) changed++;
      else kept++;
    } else {
      removed++;
    }
  }
  fs.writeFileSync(POSTERS_FILE, JSON.stringify(newData, null, 2));
  console.log(`Normalized keys in ${POSTERS_FILE}`);
  console.log(`Changed: ${changed}, Kept: ${kept}, Removed duplicates: ${removed}`);
}

main(); 