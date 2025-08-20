/*
  NORMALIZE_TV_SHOW_CAST_AND_DESCRIPTIONS.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
  Created by Paul Welby
*/

// Node script to normalize TV show cast and descriptions JSON files
const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows');
const CAST_FILE = path.join(DATA_DIR, 'tv-show_cast.json');
const DESC_FILE = path.join(DATA_DIR, 'tv-show_descriptions.json');
const CAST_OUT = path.join(DATA_DIR, 'tv-show_cast_normalized.json');
const DESC_OUT = path.join(DATA_DIR, 'tv-show_descriptions_normalized.json');

function normalizeObjectKeys(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    out[normalizeKey(key)] = obj[key];
  }
  return out;
}

function main() {
  // Normalize cast
  const castRaw = JSON.parse(fs.readFileSync(CAST_FILE, 'utf8'));
  const castNorm = normalizeObjectKeys(castRaw);
  fs.writeFileSync(CAST_OUT, JSON.stringify(castNorm, null, 2));
  console.log('Wrote', CAST_OUT);

  // Normalize descriptions
  const descRaw = JSON.parse(fs.readFileSync(DESC_FILE, 'utf8'));
  const descNorm = normalizeObjectKeys(descRaw);
  fs.writeFileSync(DESC_OUT, JSON.stringify(descNorm, null, 2));
  console.log('Wrote', DESC_OUT);
}

main(); 