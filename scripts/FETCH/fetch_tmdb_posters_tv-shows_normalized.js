/*
  FETCH_TMDB_POSTERS_TV-SHOWS_NORMALIZED.JS
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

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TV_SHOWS_DIR = 'S:/MEDIA/TV-SHOWS/';
const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data');
const OUTPUT_JSON = path.join(DATA_DIR, 'tv-shows/tv-show_posters_normalized.json');
const OVERRIDES_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tv_poster_overrides.json');

// Import normalization function
const { normalizeKey } = require('../../shared/NormalizationService');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

function scanTopLevelFolders(dir) {
    // Only return top-level folders (TV shows)
    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(dir, entry.name));
}

function cleanTitle(filename) {
    let name = path.basename(filename, path.extname(filename));

    // Replace dots and underscores with spaces
    name = name.replace(/[._]/g, ' ');

    // Remove year and anything after (optional, but helps with extra tags)
    name = name.replace(/\b(19|20)\d{2}\b.*/g, '');

    // Remove common technical tags, codecs, groups, and release info
    name = name.replace(/\b(720p|1080p|2160p|4k|bluray|brrip|web-dl|web|hdtv|dvdrip|yify|x264|x265|aac|mp3|dts|eac3|ac3|flac|truehd|atmos|10bit|5\\.1|7\\.1|yts|yts\\.mx|yts\\.ag|yts\\.am|rarbg|hdrip|bdrip|repack|extended|remastered|uncut|proper|limited|internal|dual|audio|subs|eng|ita|spa|fre|ger|rus|jpn|kor|chi|fr|es|de|ru|jp|kr|cn|mx|am|ag|lt|gaz|bokutox|lama|ptp|h264|h265|hevc|web-dl|webdl|web-rip|webrip|dvdr|dvdscr|dvdscreener|cam|ts|tc|r5|scr|unrated|director.s.cut|remux|criterion|multi|multi.audio|multi.subs|multi.language|multi.lang|fixed|amzn|dd|h.264|playweb)\\b/gi, '');

    // Remove extra spaces and non-word chars
    name = name.replace(/\\W+/g, ' ');
    name = name.replace(/\\s+/g, ' ').trim();

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
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify({
            // Example:
            // "S:\\MEDIA\\MOVIES\\About Time (2013) [1080p] [BluRay]\\About.Time.2013.1080p.BluRay.x264.YIFY.mp4": 222935
        }, null, 2));
        return {};
    }
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
}

async function fetchTVPosterById(tmdbId) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.poster_path) {
        return `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    }
    return null;
}

async function fetchTVPosterBySearch(name, year) {
    let url = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    if (year) url += `&first_air_date_year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        return `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
    }
    return null;
}

async function main() {
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_JSON);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('🔍 Scanning for TV show folders...');
    const folders = scanTopLevelFolders(TV_SHOWS_DIR);
    console.log(`Found ${folders.length} TV show folders.`);
    const overrides = loadOverrides();
    const posters = {};
    let processed = 0;
    for (const folder of folders) {
        processed++;
        const folderName = path.basename(folder);
        const normalizedKey = normalizeKey(folderName);
        
        // Try to extract year from folder name
        const year = extractYear(folderName);
        const clean = cleanName(folderName);
        let posterUrl = null;
        if (overrides[folder]) {
            console.log(`🟡 [OVERRIDE] Using TMDb ID ${overrides[folder]} for ${folderName} (normalized: ${normalizedKey})`);
            posterUrl = await fetchTVPosterById(overrides[folder]);
        } else {
            posterUrl = await fetchTVPosterBySearch(clean, year);
        }
        if (posterUrl) {
            posters[normalizedKey] = posterUrl;
            console.log(`✅ [POSTER] ${folderName} => ${posterUrl}`);
        } else {
            console.log(`❌ [POSTER] No poster found for ${folderName}`);
        }
    }
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(posters, null, 2));
    console.log(`\n🎉 Done! Normalized posters saved to ${OUTPUT_JSON}`);
    console.log(`📝 [TMDB-POSTERS] Manual overrides: ${OVERRIDES_PATH}`);
}

main(); 