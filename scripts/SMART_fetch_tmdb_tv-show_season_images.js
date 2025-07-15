/*
  SMART_FETCH_TMDB_TV-SHOW_SEASON_IMAGES.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_SHOWS_DIR = 'S:/MEDIA/TV-SHOWS/';
const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data');
const OUTPUT_JSON = path.join(DATA_DIR, 'tmdb_tv-show_season_images.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'season_tmdb_tv-show_overrides.json');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

function cleanShowName(name) {
    // Remove year in parentheses, brackets, or after dash
    return name
        .replace(/\(\d{4}\)/, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\d{4}/, '')
        .replace(/\b(720p|1080p|2160p|4k|bluray|brrip|web-dl|web|hdtv|dvdrip|yify|x264|x265|aac|mp3|dts|eac3|ac3|flac|truehd|atmos|10bit|5\.1|7\.1|yts|yts\.mx|yts\.ag|yts\.am|rarbg|hdrip|bdrip|repack|extended|remastered|uncut|proper|limited|internal|dual|audio|subs|eng|ita|spa|fre|ger|rus|jpn|kor|chi|fr|es|de|ru|jp|kr|cn|mx|am|ag|lt|gaz|bokutox|lama|ptp|h264|h265|hevc|web-dl|webdl|web-rip|webrip|dvdr|dvdscr|dvdscreener|cam|ts|tc|r5|scr|unrated|director.s.cut|remux|criterion|multi|multi.audio|multi.subs|multi.language|multi.lang|fixed|amzn|dd|h.264|playweb)\b/gi, '')
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
    // --- Merge logic: load existing JSON ---
    let existing = {};
    if (fs.existsSync(OUTPUT_JSON)) {
        try {
            existing = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Could not parse existing season images JSON, starting fresh.');
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
        let override = overrides[showName] || overrides[cleanedName];
        let tvId, seasonOverride = null;
        if (override && typeof override === 'object') {
            tvId = override.tmdbId;
            seasonOverride = override.season;
        } else {
            tvId = await searchTMDBShow(cleanedName, override);
        }
        console.log(`🔍 Searching TMDB for: ${showName} (cleaned: ${cleanedName})${tvId ? ' [override]' : ''}`);
        if (!tvId) {
            console.log(`❌ No TMDB match for: ${showName}`);
            continue;
        }
        console.log(`✅ Found TMDB match for: ${showName} (ID: ${tvId})`);
        showsFound++;
        result[showName] = { seasons: {} };
        const showPath = path.join(TV_SHOWS_DIR, showName);
        const seasonFolders = fs.readdirSync(showPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        let showSeasons = 0;
        let showSeasonsWithPosters = 0;
        for (const seasonFolder of seasonFolders) {
            const match = seasonFolder.match(/season[ _-]?(\d+)/i);
            if (!match) continue;
            const seasonNumber = parseInt(match[1], 10);
            if (!seasonNumber) continue;
            // If override specifies a season, skip others
            if (seasonOverride && seasonNumber !== seasonOverride) continue;
            showSeasons++;
            totalSeasons++;
            console.log(`   📺 Fetching Season ${seasonNumber} poster...`);
            const posterUrl = await fetchSeasonPoster(tvId, seasonNumber);
            result[showName].seasons[seasonNumber] = { poster: posterUrl };
            if (posterUrl) {
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
    }
    
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
    
    console.log(`\n🎉 Season poster fetch complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Shows processed: ${shows.length}`);
    console.log(`   • Shows found on TMDB: ${showsFound}`);
    console.log(`   • Total seasons: ${totalSeasons}`);
    console.log(`   • Seasons with posters: ${seasonsWithPosters}`);
    console.log(`   • Success rate: ${totalSeasons > 0 ? ((seasonsWithPosters / totalSeasons) * 100).toFixed(1) : 0}%`);
    console.log(`📄 Data saved to: ${OUTPUT_JSON}`);
    console.log(`📝 Manual overrides: ${OVERRIDES_PATH}`);
}

main(); 