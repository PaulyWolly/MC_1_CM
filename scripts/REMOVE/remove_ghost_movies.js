/*
  REMOVE_GHOST_MOVIES.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const MOVIES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');
const OUTPUT_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.cleaned.json');

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
}

function main() {
  if (!fs.existsSync(MOVIES_JSON)) {
    console.error('File not found:', MOVIES_JSON);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
  const movies = Array.isArray(data.folders) ? data.folders : [];
  if (!Array.isArray(movies) || movies.length === 0) {
    console.error('Could not find movies array in JSON (expected at data.folders).');
    process.exit(1);
  }

  const removed = [];
  const kept = [];

  movies.forEach((movie) => {
    if (!Array.isArray(movie.files) || movie.files.length === 0) {
      removed.push(movie.path);
    } else {
      kept.push(movie);
    }
  });

  const cleaned = { ...data, folders: kept };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cleaned, null, 2));
  console.log(`Cleaned file written to: ${OUTPUT_JSON}`);

  // Backup original file
  const backupPath = MOVIES_JSON + '.backup.' + getTimestamp();
  fs.copyFileSync(MOVIES_JSON, backupPath);
  console.log(`Backup of original file created at: ${backupPath}`);

  // Overwrite original file
  fs.writeFileSync(MOVIES_JSON, JSON.stringify(cleaned, null, 2));
  console.log('Original file overwritten with cleaned data.');

  console.log(`Removed ${removed.length} ghost/incomplete entries.`);
  if (removed.length) {
    removed.forEach((p) => console.log('  -', p));
  }
  console.log(`Kept ${kept.length} movie entries.`);
}

main(); 