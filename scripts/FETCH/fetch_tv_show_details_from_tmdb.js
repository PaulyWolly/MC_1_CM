/*
  FETCH_TV_SHOW_DETAILS_FROM_TMDB.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

// Fetch TV Show Descriptions and Cast from TMDB
// Usage: node scripts/fetch_tv_show_details_from_tmdb.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const dotenvPath = path.resolve(__dirname, '../server/.env');
require('dotenv').config({ path: dotenvPath });
console.log('Loaded TMDB_API_KEY:', process.env.TMDB_API_KEY);

const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY not set in environment.');
    process.exit(1);
}

// Default input file is now the tv-shows data location
const INPUT_FILE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows.json');

const DESC_OUT = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_descriptions.json');
const CAST_OUT = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_cast.json');

require('dotenv').config({ path: dotenvPath });

function cleanShowName(name) {
    // Remove year in parentheses at the end, e.g., "V (2009)" -> "V"
    return name.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

async function readShowNames() {
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
    // If the root is an array (single show mode), wrap in an object with folders
    const folders = Array.isArray(data) ? data : (data.folders || []);
    return folders.map(f => f.path);
}

async function searchShowOnTMDB(showName) {
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(showName)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB search failed for ${showName}`);
    const json = await res.json();
    return json.results && json.results.length > 0 ? json.results[0] : null;
}

async function fetchShowDetails(tmdbId) {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB details failed for id ${tmdbId}`);
    return await res.json();
}

async function fetchShowCast(tmdbId) {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TMDB cast failed for id ${tmdbId}`);
    const json = await res.json();
    return (json.cast || []).slice(0, 10).map(actor => ({ name: actor.name, character: actor.character, profile: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null }));
}

async function main() {
    const shows = await readShowNames();
    const descriptions = {};
    const castData = {};
    // Spinner helpers
    let spinnerInterval = null;
    function startSpinner(message) {
        let dots = 0;
        process.stdout.write(message);
        spinnerInterval = setInterval(() => {
            dots = (dots + 1) % 4;
            process.stdout.write('\r' + message + '.'.repeat(dots) + '   ');
        }, 400);
    }
    function stopSpinner(finalMessage) {
        if (spinnerInterval) clearInterval(spinnerInterval);
        process.stdout.write('\r' + finalMessage + '\n');
    }
    for (const showName of shows) {
        const cleanName = cleanShowName(showName);
        startSpinner(`Processing: ${showName}`);
        try {
            const tmdbShow = await searchShowOnTMDB(cleanName);
            stopSpinner(tmdbShow ? `Done: ${showName}` : `No TMDB match for: ${showName}`);
            if (!tmdbShow) {
                continue;
            }
            startSpinner(`Fetching details for: ${showName}`);
            const details = await fetchShowDetails(tmdbShow.id);
            stopSpinner(`Fetched details for: ${showName}`);
            descriptions[showName] = details.overview || '';
            startSpinner(`Fetching cast for: ${showName}`);
            const cast = await fetchShowCast(tmdbShow.id);
            stopSpinner(`Fetched cast for: ${showName}`);
            castData[showName] = cast;
            // TMDB rate limit: 40 requests per 10 seconds
            await new Promise(r => setTimeout(r, 300));
        } catch (e) {
            stopSpinner(`Error for ${showName}: ${e.message}`);
        }
    }
    fs.mkdirSync(path.dirname(DESC_OUT), { recursive: true });
    fs.writeFileSync(DESC_OUT, JSON.stringify(descriptions, null, 2));
    fs.writeFileSync(CAST_OUT, JSON.stringify(castData, null, 2));
    console.log('Done!');
}

main(); 