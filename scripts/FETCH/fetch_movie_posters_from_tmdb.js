/*
  FETCH_MOVIE_POSTERS_FROM_TMDB.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

/*
  FETCH_MOVIE_POSTERS_FROM_TMDB.JS
  Fetches posters for all movies in the movies directory using TMDB API.
  Outputs to movie_posters_normalized.json for use in the Media Library.
  Supports manual TMDB ID overrides.
*/

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { normalizeKey } = require('../../shared/NormalizationService');
// Use normalizeKey for all mapping key normalization in this file.

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MOVIES_DIR = 'S:/MEDIA/MOVIES/';
const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data/movies');
const MOVIE_POSTERS_NORMALIZED_JSON = path.join(DATA_DIR, 'movie_posters_normalized.json');
const NEWLY_ADDED_JSON = path.join(DATA_DIR, 'newly_added_movies.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'movie_poster_overrides.json');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

function scanTopLevelFolders(dir) {
    // Only return top-level folders (movies)
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(dir, entry.name));
}

function cleanTitle(filename) {
    let name = path.basename(filename, path.extname(filename));
    name = name.replace(/[._]/g, ' ');
    name = name.replace(/\b(19|20)\d{2}\b.*/g, '');
    name = name.replace(/\b(720p|1080p|2160p|4k|bluray|brrip|web-dl|web|hdtv|dvdrip|yify|x264|x265|aac|mp3|dts|eac3|ac3|flac|truehd|atmos|10bit|5\.1|7\.1|yts|yts\.mx|yts\.ag|yts\.am|rarbg|hdrip|bdrip|repack|extended|remastered|uncut|proper|limited|internal|dual|audio|subs|eng|ita|spa|fre|ger|rus|jpn|kor|chi|fr|es|de|ru|jp|kr|cn|mx|am|ag|lt|gaz|bokutox|lama|ptp|h264|h265|hevc|web-dl|webdl|web-rip|webrip|dvdr|dvdscr|dvdscreener|cam|ts|tc|r5|scr|unrated|director.s.cut|remux|criterion|multi|multi.audio|multi.subs|multi.language|multi.lang|fixed|amzn|dd|h.264|playweb)\b/gi, '');
    name = name.replace(/\W+/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();
    return name;
}

function extractYear(str) {
    const match = str.match(/(19|20)\d{2}/);
    return match ? match[0] : null;
}

function cleanName(str) {
    return str
        .replace(/\.[^/.]+$/, "")
        .replace(/\[[^\]]*\]|\([^\)]*\)/g, "")
        .replace(/\b(19|20)\d{2}\b/g, "")
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ").trim();
}

function loadOverrides() {
    if (!fs.existsSync(OVERRIDES_PATH)) {
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify({}, null, 2));
        return {};
    }
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
}

async function fetchMoviePosterById(tmdbId) {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.poster_path) {
        return `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    }
    return null;
}

async function fetchMoviePosterBySearch(name, year) {
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        return `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
    }
    return null;
}

function toPrettyName(folderName) {
    return folderName;
}

async function main() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    console.log('🔍 Scanning for movie folders...');
    const folders = scanTopLevelFolders(MOVIES_DIR);
    console.log(`Found ${folders.length} movie folders.`);
    const overrides = loadOverrides();
    const posters = {};
    let processed = 0;
    for (const folder of folders) {
        processed++;
        const folderName = path.basename(folder);
        const year = extractYear(folderName);
        const clean = cleanName(folderName);
        let posterUrl = null;
        if (overrides[folder]) {
            console.log(`🟡 [OVERRIDE] Using TMDb ID ${overrides[folder]} for ${folderName}`);
            posterUrl = await fetchMoviePosterById(overrides[folder]);
        } else {
            posterUrl = await fetchMoviePosterBySearch(clean, year);
        }
        if (posterUrl) {
            // Use pretty name as key
            const prettyKey = normalizeKey(folderName);
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
            console.log(`💾 Poster for "${folderName}" saved to movie_posters_normalized.json under key: ${prettyKey}`);
        } else {
            console.log(`❌ [POSTER] No poster found for ${folderName}`);
        }
    }
    console.log(`\n🎉 Done! Posters saved to ${MOVIE_POSTERS_NORMALIZED_JSON}`);
    console.log(`📝 [TMDB-POSTERS] Manual overrides: ${OVERRIDES_PATH}`);
}

main(); 