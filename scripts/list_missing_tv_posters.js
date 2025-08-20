/*
  LIST_MISSING_TV_POSTERS.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
  Created by Paul Welby
*/

// Node.js script to list missing TV show poster keys and generate a template for tv_posters.json
const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../shared/NormalizationService');

// --- CONFIG ---
const TV_SHOWS_JSON = path.join(__dirname, '../server/data/media-library-tv-shows.json');
const TV_POSTERS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv_posters.json');

// --- Load TV shows ---
let tvShows = [];
try {
    const raw = JSON.parse(fs.readFileSync(TV_SHOWS_JSON, 'utf8'));
    if (Array.isArray(raw)) {
        tvShows = raw;
    } else if (raw.folders && Array.isArray(raw.folders)) {
        tvShows = raw.folders;
    } else if (raw.tvShows && Array.isArray(raw.tvShows)) {
        tvShows = raw.tvShows;
    }
} catch (err) {
    console.error('Failed to load TV shows:', err);
    process.exit(1);
}

// --- Load current poster keys ---
let posterMap = {};
try {
    posterMap = JSON.parse(fs.readFileSync(TV_POSTERS_JSON, 'utf8'));
} catch (err) {
    console.error('Failed to load tv_posters.json:', err);
    process.exit(1);
}

// --- Find missing poster keys ---
const missing = [];
const template = {};
tvShows.forEach(show => {
    const name = show.title || show.name || show.path || show.filename || '';
    const dotKey = normalizeKey(name);
    if (!posterMap[dotKey]) {
        missing.push({ name, dotKey });
        template[dotKey] = '';
    }
});

console.log('--- Missing TV Show Poster Keys ---');
missing.forEach(({ name, dotKey }) => {
    console.log(`- ${name}  -->  ${dotKey}`);
});
console.log(`\nTotal missing: ${missing.length}`);
if (missing.length > 0) {
    console.log('\n--- Template for tv_posters.json ---');
    console.log(JSON.stringify(template, null, 2));
    console.log('\nCopy the above block into your tv_posters.json and fill in the poster URLs.');
} else {
    console.log('All TV shows have poster entries!');
} 