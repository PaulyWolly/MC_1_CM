/*
  SMART_FETCH_TMDB_TV-SHOW_SEASON_IMAGES_NORMALIZED.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_SHOWS_DIR = 'S:/MEDIA/TV-SHOWS/';
const DATA_DIR = path.join(__dirname, '../../public/components/MediaLibrary/data');
const OUTPUT_JSON = path.join(DATA_DIR, 'tv-shows/tv-show_season_images_normalized.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'season_tmdb_tv-show_overrides.json');

// Import normalization function
const { normalizeKey } = require('../../shared/NormalizationService');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

function cleanShowName(name) {
    return name
        .replace(/\(\d{4}\)/, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\d{4}/, '')
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function loadOverrides() {
    if (!fs.existsSync(OVERRIDES_PATH)) {
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify({}, null, 2));
        return {};
    }
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
}

async function searchTMDBShow(showName, overrideId) {
    if (overrideId) return overrideId;
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(showName)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        return data.results[0].id;
    }
    return null;
}

async function fetchSeasonPoster(tvId, seasonNumber) {
    const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
}

async function main() {
    const showArg = process.argv[2];
    let shows;
    if (showArg) {
        shows = [showArg];
        console.log(`SMART MODE: Only fetching season images for: ${showArg}`);
    } else {
        shows = fs.readdirSync(TV_SHOWS_DIR, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
    }
    const overrides = loadOverrides();
    
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_JSON);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // --- Merge logic: load existing normalized JSON ---
    let existing = {};
    if (fs.existsSync(OUTPUT_JSON)) {
        try {
            existing = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Could not parse existing normalized season images JSON, starting fresh.');
            existing = {};
        }
    }
    const result = { ...existing };
    
    let showsFound = 0;
    let totalSeasons = 0;
    let seasonsWithPosters = 0;
    
    console.log(`🎬 Starting TV show season poster fetch for ${shows.length} shows...\n`);
    
    for (const showName of shows) {
        const cleanedName = cleanShowName(showName);
        const normalizedKey = normalizeKey(showName);
        
        let override = overrides[showName] || overrides[cleanedName];
        let tvId, seasonOverride = null;
        if (override && typeof override === 'object') {
            tvId = override.tmdbId;
            seasonOverride = override.season;
        } else {
            tvId = await searchTMDBShow(cleanedName, override);
        }
        console.log(`🔍 Searching TMDB for: ${showName} (cleaned: ${cleanedName}, normalized: ${normalizedKey})${tvId ? ' [override]' : ''}`);
        if (!tvId) {
            console.log(`❌ No TMDB match for: ${showName}`);
            continue;
        }
        console.log(`✅ Found TMDB match for: ${showName} (ID: ${tvId})`);
        showsFound++;
        result[normalizedKey] = { seasons: {} };
        const showPath = path.join(TV_SHOWS_DIR, showName);
        const seasonFolders = fs.readdirSync(showPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        let showSeasons = 0;
        let showSeasonsWithPosters = 0;
        let foundAnyPosters = false;
        
        for (const seasonFolder of seasonFolders) {
            // Support both "Season 01" and "S01" formats
            let match = seasonFolder.match(/season[ _-]?(\d+)/i);
            if (!match) {
                // Try S01, S02 format
                match = seasonFolder.match(/S(\d{1,2})/i);
            }
            if (!match) continue;
            const seasonNumber = parseInt(match[1], 10);
            if (!seasonNumber) continue;
            // If override specifies a season, skip others
            if (seasonOverride && seasonNumber !== seasonOverride) continue;
            
            showSeasons++;
            totalSeasons++;
            console.log(`   📺 Fetching Season ${seasonNumber} poster...`);
            const posterUrl = await fetchSeasonPoster(tvId, seasonNumber);
            result[normalizedKey].seasons[seasonNumber] = { poster: posterUrl };
            if (posterUrl) {
                foundAnyPosters = true;
                console.log(`   ✅ Season ${seasonNumber} poster found: ${posterUrl.split('/').pop()}`);
                showSeasonsWithPosters++;
                seasonsWithPosters++;
            } else {
                console.log(`   ❌ Season ${seasonNumber} poster not available`);
            }
        }
        if (showSeasons > 0) {
            console.log(`   📊 ${showName}: ${showSeasonsWithPosters}/${showSeasons} seasons have posters\n`);
        } else {
            console.log(`   ⚠️  ${showName}: No season folders found\n`);
        }
        // Only update the result if we found at least one poster, or if the show is not already present
        if (!foundAnyPosters && existing[normalizedKey]) {
            // Do not overwrite existing entry
            console.log(`⚠️  No new posters found for ${showName}, preserving existing data.`);
            continue;
        }
    }
    
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
    
    console.log(`\n🎉 Season poster fetch complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Shows processed: ${shows.length}`);
    console.log(`   • Shows found on TMDB: ${showsFound}`);
    console.log(`   • Total seasons: ${totalSeasons}`);
    console.log(`   • Seasons with posters: ${seasonsWithPosters}`);
    console.log(`   • Success rate: ${totalSeasons > 0 ? ((seasonsWithPosters / totalSeasons) * 100).toFixed(1) : 0}%`);
    console.log(`📄 Normalized data saved to: ${OUTPUT_JSON}`);
    console.log(`📝 Manual overrides: ${OVERRIDES_PATH}`);
}

main(); 