/*
  CONVERT_MOVIE_GENRES_TO_NORMALIZED.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

// scripts/CONVERT/convert_movie_genres_to_normalized.js
// Converts movie_genres.json to use normalized keys, outputting movie_genres_normalized.json

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const INPUT_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_genres.json');
const OUTPUT_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_genres_normalized.json');

function extractFolderName(key) {
  // Key format: "FolderName\\FileName.mp4" or "FolderName/FileName.mp4"
  const parts = key.replace(/\\/g, '/').split('/');
  // Folder name is always the second-to-last part
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

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
    const folderName = extractFolderName(key);
    const normalized = normalizeKey(folderName);
    if (!normalized) {
      console.warn('Could not normalize key for:', key);
      continue;
    }
    out[normalized] = genres;
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(out, null, 2));
  console.log('Normalized movie genres written to', OUTPUT_PATH);
}

if (require.main === module) {
  main();
} 