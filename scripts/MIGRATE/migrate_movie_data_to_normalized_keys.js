/*
  MIGRATE_MOVIE_DATA_TO_NORMALIZED_KEYS.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

// Paths to data files
const MOVIES_DIR = path.join(__dirname, '../public/components/MediaLibrary/data/movies');
const MAIN_MOVIES_JSON = path.join(MOVIES_DIR, 'media-library-movies.json');
const MOVIE_DESC_JSON = path.join(MOVIES_DIR, 'movie_descriptions_normalized.json');
const MOVIE_CAST_JSON = path.join(MOVIES_DIR, 'movie_cast_normalized.json');
const MOVIE_POSTERS_JSON = path.join(MOVIES_DIR, 'movie_posters_normalized.json');

function getAllMovieFolders() {
  if (!fs.existsSync(MAIN_MOVIES_JSON)) {
    console.error('Main movies JSON not found:', MAIN_MOVIES_JSON);
    return [];
  }
  const data = JSON.parse(fs.readFileSync(MAIN_MOVIES_JSON, 'utf8'));
  if (!Array.isArray(data.folders)) {
    console.error('Invalid structure in media-library-movies.json');
    return [];
  }
  return data.folders.map(folder => folder.path);
}

function migrateFile(inputPath, outputPath, keyField = 'title') {
  if (!fs.existsSync(inputPath)) return;
  let data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const migrated = {};
  for (const key of Object.keys(data)) {
    let folderName = key;
    if (data[key].path) {
      folderName = data[key].path.split(/[\\/]/).slice(-2, -1)[0];
    } else if (data[key][keyField]) {
      folderName = data[key][keyField];
    }
    const normalizedKey = normalizeKey(folderName);
    migrated[normalizedKey] = data[key];
  }
  fs.writeFileSync(outputPath, JSON.stringify(migrated, null, 2));
  console.log(`[MIGRATION] Updated ${path.basename(outputPath)} with normalized keys.`);
}

function migratePosters() {
  if (!fs.existsSync(MOVIE_POSTERS_JSON)) return;
  let postersData = JSON.parse(fs.readFileSync(MOVIE_POSTERS_JSON, 'utf8'));
  const migrated = {};
  for (const key of Object.keys(postersData)) {
    let folderName = key;
    folderName = folderName.replace(/\.[a-zA-Z0-9]+$/, ''); // Remove extension if present
    const normalizedKey = normalizeKey(folderName);
    migrated[normalizedKey] = postersData[key];
  }
  fs.writeFileSync(MOVIE_POSTERS_JSON, JSON.stringify(migrated, null, 2));
  console.log('[MIGRATION] Updated movie_posters_normalized.json with normalized keys.');
}

function main() {
  // Migrate cast and description files
  migrateFile(
    path.join(MOVIES_DIR, 'movie_cast_normalized.json'),
    path.join(MOVIES_DIR, 'movie_cast_normalized.json'),
    'title'
  );
  migrateFile(
    path.join(MOVIES_DIR, 'movie_descriptions_normalized.json'),
    path.join(MOVIES_DIR, 'movie_descriptions_normalized.json'),
    'title'
  );
  migratePosters();
  console.log('[MIGRATION] Movie data migration to normalized keys complete.');
}

main(); 