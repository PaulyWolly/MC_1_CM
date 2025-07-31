/*
  FETCH_MOVIE_DESCRIPTIONS_FROM_TMDB.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

// fetch_movie_descriptions_from_tmdb.js
// Script to fetch movie descriptions from TMDB for all movies in the library
// Usage: node scripts/fetch_movie_descriptions_from_tmdb.js

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
const OUTPUT_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_descriptions.json');
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';

function cleanTitle(title) {
  // Remove year, resolution, and extra info from title
  return title.replace(/\([0-9]{4}\)/, '').replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

async function fetchDescription(title, year) {
  try {
    // 1. Search for the movie
    const url = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    console.log(`  [DEBUG] Searching: ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  [DEBUG] Search failed with status: ${res.status}`);
      throw new Error(`TMDB search failed for ${title} - Status: ${res.status}`);
    }
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      console.log(`  [DEBUG] No results found for: ${title}`);
      return null;
    }
    const movie = data.results[0];
    console.log(`  [DEBUG] Found movie ID: ${movie.id}`);
    
    // 2. Get full details (for best description)
    const detailsRes = await fetch(`${TMDB_MOVIE_URL}/${movie.id}?api_key=${TMDB_API_KEY}`);
    if (!detailsRes.ok) {
      console.log(`  [DEBUG] Details failed with status: ${detailsRes.status}`);
      return movie.overview || null;
    }
    const details = await detailsRes.json();
    return details.overview || movie.overview || null;
  } catch (error) {
    console.log(`  [DEBUG] Error fetching description: ${error.message}`);
    console.log(`  [DEBUG] Full error: ${error.stack || error.toString()}`);
    throw error;
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
  
  // Sort movies alphabetically
  const sortedMovies = sortMoviesAlphabetically(movieArr);
  const totalMovies = sortedMovies.length;
  
  // Load existing results if file exists
  let results = {};
  if (fs.existsSync(OUTPUT_JSON)) {
    try {
      results = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
      console.log(`Loaded ${Object.keys(results).length} existing descriptions`);
    } catch (e) {
      console.log('Could not load existing descriptions, starting fresh');
      console.log(`  [ERROR] ${e.message}`);
      console.log(`  [ERROR DETAILS] ${e.stack || e.toString()}`);
    }
  }
  
  // Process all movies and show status for each
  console.log(`Scanning ${totalMovies} movies total...\n`);
  
  for (let i = 0; i < sortedMovies.length; i++) {
    const movie = sortedMovies[i];
    const count = i + 1;
    const key = movie.absPath || movie.relPath || movie.title;
    const hasDescription = results[key] && results[key].description;
    
    if (hasDescription) {
      // Skip movies that already have descriptions
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
    process.stdout.write(`[${count}/${totalMovies}] Fetching: ${title}${year ? ' (' + year + ')' : ''} ... `);
    try {
      const description = await fetchDescription(title, year);
      results[movie.absPath || movie.relPath || rawTitle] = {
        title: rawTitle,
        year,
        description: description || ''
      };
      console.log('OK');
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      console.log(`  [ERROR DETAILS] ${err.stack || err.toString()}`);
      results[movie.absPath || movie.relPath || rawTitle] = {
        title: rawTitle,
        year,
        description: ''
      };
    }
    // Save progress after each movie
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');
    await new Promise(r => setTimeout(r, 500)); // Increased delay to avoid rate limits
  }
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nDone. Descriptions saved to ${OUTPUT_JSON}`);
})(); 