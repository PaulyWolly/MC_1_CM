/*
  FETCH_MOVIE_CAST_FROM_TMDB.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const fs = require('fs');
const path = require('path');
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

const MOVIES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');
const OUTPUT_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast.json');
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

function cleanTitle(title) {
  // Remove year, resolution, and extra info from title
  return title.replace(/\([0-9]{4}\)/, '').replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

async function fetchCast(title, year) {
  try {
    // 1. Search for the movie
    const url = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`TMDB search failed for ${title} - Status: ${res.status}`);
    }
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      return [];
    }
    const movie = data.results[0];
    // 2. Get credits (cast)
    const creditsRes = await fetch(`${TMDB_MOVIE_URL}/${movie.id}/credits?api_key=${TMDB_API_KEY}`);
    if (!creditsRes.ok) {
      return [];
    }
    const credits = await creditsRes.json();
    if (!credits.cast || credits.cast.length === 0) {
      return [];
    }
    // Return top 8 billed cast with name and profile image
    return credits.cast.slice(0, 8).map(actor => ({
      name: actor.name,
      character: actor.character,
      profile: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : null
    }));
  } catch (error) {
    console.log(`  [DEBUG] Error fetching cast: ${error.message}`);
    return [];
  }
}

function collectMoviesFromFolders(folder, arr) {
  if (folder.files && folder.files.length > 0) {
    folder.files.forEach(file => {
      arr.push({
        title: folder.path, // folder name contains title and year
        fileName: file.name,
        absPath: file.absPath,
        relPath: file.relPath
      });
    });
  }
  if (folder.folders && folder.folders.length > 0) {
    folder.folders.forEach(sub => collectMoviesFromFolders(sub, arr));
  }
}

function sortMoviesAlphabetically(movies) {
  return movies.sort((a, b) => {
    const titleA = cleanTitle(a.title || '').toLowerCase();
    const titleB = cleanTitle(b.title || '').toLowerCase();
    return titleA.localeCompare(titleB);
  });
}

(async () => {
  const moviesObj = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
  const movieArr = [];
  collectMoviesFromFolders(moviesObj, movieArr);
  const sortedMovies = sortMoviesAlphabetically(movieArr);
  const totalMovies = sortedMovies.length;

  // Load existing results if file exists
  let results = {};
  if (fs.existsSync(OUTPUT_JSON)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
      console.log(`Loaded ${Object.keys(results).length} existing cast entries`);
    } catch (e) {
      console.log('Could not load existing cast, starting fresh');
    }
  }

  console.log(`Scanning ${totalMovies} movies total...\n`);

  for (let i = 0; i < sortedMovies.length; i++) {
    const movie = sortedMovies[i];
    const count = i + 1;
    const key = movie.absPath || movie.relPath || movie.title;
    const hasCast = results[key] && Array.isArray(results[key].cast) && results[key].cast.length > 0;

    if (hasCast) {
      const rawTitle = movie.title || '';
      const yearMatch = rawTitle.match(/\((\d{4})\)/);
      const year = yearMatch ? yearMatch[1] : '';
      const title = cleanTitle(rawTitle);
      console.log(`[${count}/${totalMovies}] ${title}${year ? ' (' + year + ')' : ''} ... Already downloaded`);
      continue;
    }
    const rawTitle = movie.title || '';
    const yearMatch = rawTitle.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : '';
    const title = cleanTitle(rawTitle);
    process.stdout.write(`[${count}/${totalMovies}] Fetching cast: ${title}${year ? ' (' + year + ')' : ''} ... `);
    try {
      const cast = await fetchCast(title, year);
      results[movie.absPath || movie.relPath || rawTitle] = {
        title: rawTitle,
        year,
        cast
      };
      console.log('OK');
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      results[movie.absPath || movie.relPath || rawTitle] = {
        title: rawTitle,
        year,
        cast: []
      };
    }
    // Save progress after each movie
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');
    await new Promise(r => setTimeout(r, 500)); // Delay to avoid rate limits
  }
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nDone. Cast data saved to ${OUTPUT_JSON}`);
})(); 