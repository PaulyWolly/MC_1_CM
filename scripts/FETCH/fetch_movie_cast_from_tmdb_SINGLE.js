/*
  FETCH_MOVIE_CAST_FROM_TMDB_SINGLE.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

/*
  FETCH_MOVIE_CAST_FROM_TMDB_SINGLE.JS
  Fetch cast for a single movie from TMDB by title (and optional year)
  Usage: node fetch_movie_cast_from_tmdb_SINGLE.js "Movie Title" [Year]
*/

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const fetch = require('node-fetch');

// Load TMDB API key from config
let TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  try {
    const config = require('../../config/config.js');
    TMDB_API_KEY = config.TMDB_API_KEY || config.tmdbApiKey;
  } catch (e) {
    console.error('Could not load TMDB API key from config. Set TMDB_API_KEY in env or config.js');
    process.exit(1);
  }
}
if (!TMDB_API_KEY) {
  console.error('TMDB API key not found.');
  process.exit(1);
}

const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

function cleanTitle(title) {
  return title.replace(/\([0-9]{4}\)/, '').replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

async function fetchCast(title, year) {
  try {
    const url = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB search failed for ${title} - Status: ${res.status}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];
    const movie = data.results[0];
    const creditsRes = await fetch(`${TMDB_MOVIE_URL}/${movie.id}/credits?api_key=${TMDB_API_KEY}`);
    if (!creditsRes.ok) return [];
    const credits = await creditsRes.json();
    if (!credits.cast || credits.cast.length === 0) return [];
    return credits.cast.slice(0, 8).map(actor => ({
      name: actor.name,
      character: actor.character,
      profile: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : null
    }));
  } catch (error) {
    console.log(`[DEBUG] Error fetching cast: ${error.message}`);
    return [];
  }
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node fetch_movie_cast_from_tmdb_SINGLE.js "Movie Title" [Year]');
    process.exit(1);
  }
  const rawTitle = args[0];
  const year = args[1] || '';
  const title = cleanTitle(rawTitle);
  console.log(`Fetching cast for: ${title}${year ? ' (' + year + ')' : ''}`);
  const cast = await fetchCast(title, year);
  console.log(JSON.stringify({ title: rawTitle, year, cast }, null, 2));
})(); 