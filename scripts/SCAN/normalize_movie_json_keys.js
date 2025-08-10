/*
  NORMALIZE_MOVIE_JSON_KEYS.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const MOVIES_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');
const DESCRIPTIONS_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_descriptions_normalized.json');
const CAST_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_cast_normalized.json');

function backupFile(file) {
  const backup = file + '.bak_' + Date.now();
  fs.copyFileSync(file, backup);
  console.log(`[BACKUP] ${file} -> ${backup}`);
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`[WRITE] ${file}`);
}

function buildTmdbToNormKeyMap(movies) {
  const map = {};
  function walkFolders(folders) {
    for (const folder of folders) {
      if (folder.tmdbId && folder.normalizedKey) {
        map[String(folder.tmdbId)] = folder.normalizedKey;
      }
      if (folder.folders && folder.folders.length) {
        walkFolders(folder.folders);
      }
    }
  }
  walkFolders(movies.folders || []);
  return map;
}

function normalizeKeys(data, tmdbToNormKeyMap, fileLabel) {
  let changed = false;
  const newData = {};
  for (const key of Object.keys(data)) {
    if (/^\d+$/.test(key)) {
      const normKey = tmdbToNormKeyMap[key];
      if (normKey) {
        if (!newData[normKey]) {
          newData[normKey] = data[key];
          changed = true;
          console.log(`[REKEY][${fileLabel}] ${key} -> ${normKey}`);
        } else {
          console.warn(`[SKIP][${fileLabel}] Would overwrite existing entry for ${normKey}`);
        }
      } else {
        newData[key] = data[key];
        console.warn(`[NO-MATCH][${fileLabel}] No normalizedKey found for TMDB ID ${key}`);
      }
    } else {
      newData[key] = data[key];
    }
  }
  return { newData, changed };
}

function main() {
  backupFile(DESCRIPTIONS_FILE);
  backupFile(CAST_FILE);

  const movies = loadJson(MOVIES_FILE);
  const descriptions = loadJson(DESCRIPTIONS_FILE);
  const cast = loadJson(CAST_FILE);

  const tmdbToNormKeyMap = buildTmdbToNormKeyMap(movies);

  const { newData: newDescriptions, changed: descChanged } = normalizeKeys(descriptions, tmdbToNormKeyMap, 'DESCRIPTIONS');
  const { newData: newCast, changed: castChanged } = normalizeKeys(cast, tmdbToNormKeyMap, 'CAST');

  if (descChanged) saveJson(DESCRIPTIONS_FILE, newDescriptions);
  if (castChanged) saveJson(CAST_FILE, newCast);

  if (!descChanged && !castChanged) {
    console.log('No changes needed. All keys are already normalized.');
  } else {
    console.log('Normalization complete.');
  }
}

if (require.main === module) {
  main();
} 