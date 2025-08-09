/*
  FETCH_MOVIE_POSTER_FROM_TMDB_SINGLE.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

/*
  FETCH_MOVIE_POSTER_FROM_TMDB_SINGLE.JS
  Fetches the poster for a single movie from TMDB by title (and optional year).
  Usage: node fetch_movie_poster_from_tmdb_SINGLE.js "Movie Title" [Year]

  Example:
    node scripts/fetch_movie_poster_from_tmdb_SINGLE.js "The Marvels" 2023
    node scripts/fetch_movie_poster_from_tmdb_SINGLE.js "Jurassic Park"
*/

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');
// Use normalizeKey for all mapping key normalization in this file.

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const MOVIE_POSTERS_NORMALIZED_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
const NEWLY_ADDED_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/newly_added_movies.json');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

const [,, title, year, absPath] = process.argv;
if (!title) {
    console.error('Usage: node fetch_movie_poster_from_tmdb_SINGLE.js "Movie Title" [Year] [AbsoluteMovieFilePath]');
    process.exit(1);
}

async function fetchMoviePosterBySearch(name, year) {
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0 && data.results[0].poster_path) {
        return `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
    }
    return null;
}

function toPrettyName(title, year) {
    return year ? `${title} (${year}) [1080p]` : title;
}

(async () => {
    console.log(`🔍 Searching TMDB for: ${title}${year ? ' (' + year + ')' : ''}`);
    const posterUrl = await fetchMoviePosterBySearch(title, year);
    if (posterUrl) {
        console.log(`✅ Poster URL: ${posterUrl}`);
        if (!absPath) {
            console.error('❗ Please provide the absolute path to the movie file as the third argument to save to newly_added_movies.json');
            process.exit(1);
        }
        // Use pretty name as key
        const folderName = path.basename(path.dirname(absPath));
        const prettyKey = year ? `${folderName} (${year}) [1080p]` : folderName;
        // Add to newly_added_movies.json
        let newEntries = {};
        if (fs.existsSync(NEWLY_ADDED_JSON)) {
            newEntries = JSON.parse(fs.readFileSync(NEWLY_ADDED_JSON, 'utf8'));
        }
        newEntries[prettyKey] = posterUrl;
        fs.writeFileSync(NEWLY_ADDED_JSON, JSON.stringify(newEntries, null, 2));
        // Merge into movie_posters_normalized.json
        let normalized = {};
        if (fs.existsSync(MOVIE_POSTERS_NORMALIZED_JSON)) {
            normalized = JSON.parse(fs.readFileSync(MOVIE_POSTERS_NORMALIZED_JSON, 'utf8'));
        }
        Object.assign(normalized, newEntries);
        fs.writeFileSync(MOVIE_POSTERS_NORMALIZED_JSON, JSON.stringify(normalized, null, 2));
        console.log(`💾 Poster for "${title}" saved to movie_posters_normalized.json under key: ${prettyKey}`);
    } else {
        console.log('❌ No poster found for this movie.');
    }
})(); 