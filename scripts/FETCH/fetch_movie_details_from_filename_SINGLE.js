/*
  FETCH_MOVIE_DETAILS_FROM_FILENAME_SINGLE.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  console.error('TMDB_API_KEY not set in environment.');
  process.exit(1);
}

const overridesPath = path.join(__dirname, '../public/data/movie_title_overrides.json');
let overrides = {};
if (fs.existsSync(overridesPath)) {
  overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
}

const movieRoot = 'S:/MEDIA/MOVIES/';
const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv'];
const fuzzyMatch = (a, b) => {
  // Simple fuzzy match: lowercase, remove non-alphanum, compare
  const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean(a) === clean(b);
};

function findBestMatchFolder(title) {
  const fs = require('fs');
  const path = require('path');
  const folders = fs.readdirSync(movieRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  // Try exact, then fuzzy
  let best = folders.find(f => fuzzyMatch(f, title));
  if (!best) {
    // Try partial match
    best = folders.find(f => f.toLowerCase().includes(title.toLowerCase()));
  }
  return best ? path.join(movieRoot, best) : null;
}

function findFirstVideoFile(folderPath) {
  const fs = require('fs');
  const path = require('path');
  const files = fs.readdirSync(folderPath);
  return files.find(f => videoExtensions.some(ext => f.toLowerCase().endsWith(ext)));
}

let inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node scripts/fetch_movie_details_from_filename.js "Movie Title"');
  process.exit(1);
}

let inputPath = inputArg;
if (!inputArg.match(/[\/]/)) {
  // If not a path, treat as title and search
  const folder = findBestMatchFolder(inputArg);
  if (!folder) {
    console.error(`[ERROR] No matching folder found for '${inputArg}' in ${movieRoot}`);
    process.exit(1);
  }
  const file = findFirstVideoFile(folder);
  if (!file) {
    console.error(`[ERROR] No video file found in '${folder}'`);
    process.exit(1);
  }
  inputPath = require('path').join(folder, file);
  console.log(`[MATCH] Found: ${inputPath}`);
}

// Extract filename from path for TMDB lookup
const pathParts = inputPath.split(/[/\\]/);
const inputFilename = pathParts[pathParts.length - 1];

// 1. Remove extension
let nameNoExt = inputFilename.replace(/\.[^.]+$/, '');
console.log(`[DEBUG] After extension removal: '${nameNoExt}'`);
// 2. Replace dots with spaces
nameNoExt = nameNoExt.replace(/\./g, ' ');
console.log(`[DEBUG] After dot-to-space: '${nameNoExt}'`);
// 3. Extract year from (YYYY)
let year = '';
const yearMatch = nameNoExt.match(/\((\d{4})\)/);
if (yearMatch) year = yearMatch[1];
console.log(`[DEBUG] Extracted year: '${year}'`);
// 4. Remove all trailing [bracketed] and (parenthesized) tags
let baseTitle = nameNoExt.replace(/(\s*[\[(][^\])]+[\])])*\s*$/g, '').trim();
baseTitle = baseTitle.replace(/\(\d{4}\)/, '').replace(/\[.*?\]/g, '').trim();
console.log(`[DEBUG] Final baseTitle: '${baseTitle}'`);

console.log(`[DEBUG] Extracted baseTitle: '${baseTitle}', year: '${year}'`);

// Check overrides first
let tmdbTitle = overrides[baseTitle] || baseTitle;

async function searchTMDB(title, year) {
  let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
  if (year) url += `&year=${year}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('TMDB search failed');
  const data = await res.json();
  return data.results;
}

async function fetchMovieDetails(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('TMDB details fetch failed');
  return await res.json();
}

async function fetchMovieCast(tmdbId) {
  const url = `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('TMDB cast fetch failed');
  const data = await res.json();
  return data.cast ? data.cast.slice(0, 8).map(actor => ({
    name: actor.name,
    character: actor.character,
    profile: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
  })) : [];
}

(async () => {
  // 1. Try direct match
  let results = await searchTMDB(tmdbTitle, year);
  // 2. Try with colon if not found
  if ((!results || results.length === 0) && baseTitle.indexOf(' ') > -1) {
    const altTitle = baseTitle.replace(/ /g, ': ');
    results = await searchTMDB(altTitle, year);
    if (results.length > 0) tmdbTitle = altTitle;
  }
  if (!results || results.length === 0) {
    console.error(`[TMDB] No match found for '${baseTitle}' (year: ${year}).`);
    process.exit(1);
  }
  const best = results[0];
  const details = await fetchMovieDetails(best.id);
  const cast = await fetchMovieCast(best.id);
  const output = {
    title: baseTitle,
    tmdbTitle: best.title,
    tmdbId: best.id,
    year: best.release_date ? best.release_date.slice(0,4) : year,
    description: details.overview,
    cast
  };
  const outPath = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_details_single.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[DONE] Movie details written to ${outPath}`);

  // --- AUTO MERGE INTO MAIN JSONS ---
  // Use the full inputPath as the key
  const mergeKey = inputPath;
  console.log(`[MERGE] Using key: '${mergeKey}'`);

  // 1. Merge description
  const descPath = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_descriptions.json');
  let descData = {};
  if (fs.existsSync(descPath)) descData = JSON.parse(fs.readFileSync(descPath, 'utf8'));
  if (!descData[mergeKey]) descData[mergeKey] = {};
  descData[mergeKey].title = baseTitle;
  descData[mergeKey].year = year;
  descData[mergeKey].description = output.description;
  fs.writeFileSync(descPath, JSON.stringify(descData, null, 2));
  console.log(`[MERGE] Description merged into movie_descriptions.json`);

  // 2. Merge cast
  const castPath = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast.json');
  let castData = {};
  if (fs.existsSync(castPath)) castData = JSON.parse(fs.readFileSync(castPath, 'utf8'));
  castData[mergeKey] = { cast: output.cast };
  fs.writeFileSync(castPath, JSON.stringify(castData, null, 2));
  console.log(`[MERGE] Cast merged into movie_cast.json`);
})(); 