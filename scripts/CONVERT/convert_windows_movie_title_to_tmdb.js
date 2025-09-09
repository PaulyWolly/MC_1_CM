/*
  CONVERT_WINDOWS_MOVIE_TITLE_TO_TMDB.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
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

const inputTitle = process.argv[2];
if (!inputTitle) {
  console.error('Usage: node scripts/convert_windows_movie_title_to_tmdb.js "Windows Movie Title"');
  process.exit(1);
}

// Check overrides first
if (overrides[inputTitle]) {
  console.log(`[OVERRIDE] Windows title: '${inputTitle}' → TMDB title: '${overrides[inputTitle]}'`);
  process.exit(0);
}

async function searchTMDB(title) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('TMDB search failed');
  const data = await res.json();
  return data.results;
}

(async () => {
  // Try with the input title
  let results = await searchTMDB(inputTitle);
  if (results.length > 0) {
    const best = results[0];
    console.log(`[TMDB] Best match for '${inputTitle}': '${best.title}' (TMDB ID: ${best.id})`);
    process.exit(0);
  }
  // Try with common punctuation substitutions
  const altTitle = inputTitle.replace(/ /g, ': ');
  results = await searchTMDB(altTitle);
  if (results.length > 0) {
    const best = results[0];
    console.log(`[TMDB] Best match for '${inputTitle}' (with colon): '${best.title}' (TMDB ID: ${best.id})`);
    process.exit(0);
  }
  console.log(`[TMDB] No good match found for '${inputTitle}'. Try adding an override.`);
})(); 