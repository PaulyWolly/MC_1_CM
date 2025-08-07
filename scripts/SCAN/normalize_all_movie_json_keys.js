/*
  NORMALIZE_ALL_MOVIE_JSON_KEYS.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const MOVIES_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');
const DESCRIPTIONS_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_descriptions_normalized.json');
const CAST_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_cast_normalized.json');
const POSTERS_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

function backupFile(file) {
  if (fs.existsSync(file)) {
    const backup = file + '.bak_' + Date.now();
    fs.copyFileSync(file, backup);
    console.log(`[BACKUP] ${file} -> ${backup}`);
  }
}

function loadJson(file) {
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`[WRITE] ${file}`);
}

function buildKeyMaps(movies) {
  const byTmdb = {};
  const byKey = {};
  for (const entry of movies) {
    if (entry.tmdbId) byTmdb[entry.tmdbId] = entry.normalizedKey;
    if (entry.normalizedKey) byKey[entry.normalizedKey] = entry;
  }
  return { byTmdb, byKey };
}

function rekeyData(data, keyMap, type) {
  const newData = {};
  const moved = [];
  const removed = [];
  for (const key of Object.keys(data)) {
    let newKey = key;
    // Try to find the correct normalizedKey
    if (data[key].tmdbId && keyMap.byTmdb[data[key].tmdbId]) {
      newKey = keyMap.byTmdb[data[key].tmdbId];
    } else if (keyMap.byKey[key]) {
      newKey = key;
    } else {
      // Try to fuzzy match by title/year if tmdbId is missing
      for (const k in keyMap.byKey) {
        if (
          data[key].title &&
          keyMap.byKey[k].title &&
          data[key].title.toLowerCase() === keyMap.byKey[k].title.toLowerCase() &&
          (!data[key].year || data[key].year === keyMap.byKey[k].year)
        ) {
          newKey = k;
          break;
        }
      }
    }
    if (newKey !== key) moved.push({ from: key, to: newKey });
    newData[newKey] = data[key];
    if (newKey !== key) removed.push(key);
  }
  return { newData, moved, removed };
}

function processFile(file, keyMap, type) {
  if (!fs.existsSync(file)) return;
  const data = loadJson(file);
  const { newData, moved, removed } = rekeyData(data, keyMap, type);
  backupFile(file);
  saveJson(file, newData);
  if (moved.length > 0) console.log(`[${type}] Moved keys:`, moved);
  if (removed.length > 0) console.log(`[${type}] Removed old keys:`, removed);
}

function main() {
  const movies = loadJson(MOVIES_FILE).folders || [];
  const keyMap = buildKeyMaps(movies);
  processFile(DESCRIPTIONS_FILE, keyMap, 'DESCRIPTIONS');
  processFile(CAST_FILE, keyMap, 'CAST');
  if (fs.existsSync(POSTERS_FILE)) processFile(POSTERS_FILE, keyMap, 'POSTERS');
  console.log('[DONE] All movie data files are now standardized by normalizedKey.');
}

main(); 