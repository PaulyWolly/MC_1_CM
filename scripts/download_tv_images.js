/*
  DOWNLOAD_TV_IMAGES.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_SHOWS_DIR = 'S:/MEDIA/TV-SHOWS/';
const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data');
const SEASON_IMAGES_JSON = path.join(DATA_DIR, 'tmdb_tv-show_season_images.json');
const EPISODE_IMAGES_JSON = path.join(DATA_DIR, 'tmdb_tv-show_episode_images.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'season_tmdb_tv-show_overrides.json');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    console.log('📝 Please add TMDB_API_KEY=your_api_key_here to your .env file');
    console.log('🔗 Get your API key from: https://www.themoviedb.org/settings/api');
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
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify({
            // Example:
            // "Chuck (2010)": 84947
        }, null, 2));
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

async function fetchEpisodeStill(tvId, seasonNumber, episodeNumber) {
    const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.still_path ? `https://image.tmdb.org/t/p/w500${data.still_path}` : null;
}

async function downloadImage(url, filePath) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`⚠️  Failed to download: ${url}`);
            return false;
        }
        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);
        return true;
    } catch (error) {
        console.log(`❌ Error downloading ${url}: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('🎬 Starting TV show image download...');
    
    // Load season images data
    if (!fs.existsSync(SEASON_IMAGES_JSON)) {
        console.error(`❌ Season images JSON not found: ${SEASON_IMAGES_JSON}`);
        console.log('💡 Run fetch_tmdb_tv-show_season_images.js first');
        return;
    }
    
    // Load episode images data
    if (!fs.existsSync(EPISODE_IMAGES_JSON)) {
        console.error(`❌ Episode images JSON not found: ${EPISODE_IMAGES_JSON}`);
        console.log('💡 Run fetch_tmdb_tv-show_episode_images.js first');
        return;
    }
    
    const seasonData = JSON.parse(fs.readFileSync(SEASON_IMAGES_JSON, 'utf8'));
    const episodeData = JSON.parse(fs.readFileSync(EPISODE_IMAGES_JSON, 'utf8'));
    
    console.log('🎬 Starting TV Show Season & Episode Image Downloader');
    console.log(`📁 TV Shows Directory: ${TV_SHOWS_DIR}`);
    console.log(`📊 Output JSON: ${SEASON_IMAGES_JSON} and ${EPISODE_IMAGES_JSON}`);
    
    if (!fs.existsSync(TV_SHOWS_DIR)) {
        console.error(`❌ TV Shows directory not found: ${TV_SHOWS_DIR}`);
        process.exit(1);
    }

    const shows = fs.readdirSync(TV_SHOWS_DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    
    console.log(`📺 Found ${shows.length} TV shows`);
    
    const overrides = loadOverrides();
    const result = {};
    let totalImages = 0;
    let downloadedImages = 0;

    for (const showName of shows) {
        const cleanedName = cleanShowName(showName);
        const overrideId = overrides[showName] || overrides[cleanedName];
        console.log(`\n🔍 Processing: ${showName} (cleaned: ${cleanedName})${overrideId ? ' [override]' : ''}`);
        
        const tvId = await searchTMDBShow(cleanedName, overrideId);
        if (!tvId) {
            console.log(`❌ No TMDB match for: ${showName}`);
            continue;
        }
        
        console.log(`✅ Found TMDB ID: ${tvId}`);
        result[showName] = { seasons: {} };
        
        // Create images directory for this show
        const showImagesDir = path.join(TV_SHOWS_DIR, showName, 'images');
        if (!fs.existsSync(showImagesDir)) {
            fs.mkdirSync(showImagesDir, { recursive: true });
        }
        
        // Guess season folders (Season 1, Season 2, ...)
        const showPath = path.join(TV_SHOWS_DIR, showName);
        const seasonFolders = fs.readdirSync(showPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        
        for (const seasonFolder of seasonFolders) {
            const match = seasonFolder.match(/season[ _-]?(\d+)/i);
            if (!match) continue;
            
            const seasonNumber = parseInt(match[1], 10);
            if (!seasonNumber) continue;
            
            console.log(`  📂 Season ${seasonNumber}`);
            
            // Create season images directory
            const seasonImagesDir = path.join(showImagesDir, `season_${seasonNumber}`);
            if (!fs.existsSync(seasonImagesDir)) {
                fs.mkdirSync(seasonImagesDir, { recursive: true });
            }
            
            // Fetch and download season poster
            const posterUrl = await fetchSeasonPoster(tvId, seasonNumber);
            if (posterUrl) {
                const posterPath = path.join(seasonImagesDir, 'poster.png');
                const success = await downloadImage(posterUrl, posterPath);
                if (success) {
                    console.log(`    ✅ Downloaded season poster`);
                    downloadedImages++;
                }
                totalImages++;
            }
            
            result[showName].seasons[seasonNumber] = { 
                poster: posterUrl, 
                episodes: {} 
            };
            
            // Guess episode files (S01E01, etc.)
            const seasonPath = path.join(showPath, seasonFolder);
            const files = fs.readdirSync(seasonPath).filter(f => /\.(mp4|mkv|avi|mov)$/i.test(f));
            
            for (const file of files) {
                const epMatch = file.match(/E(\d{2})/i);
                if (!epMatch) continue;
                
                const episodeNumber = parseInt(epMatch[1], 10);
                if (!episodeNumber) continue;
                
                console.log(`    🎬 Episode ${episodeNumber}`);
                
                // Fetch and download episode still
                const stillUrl = await fetchEpisodeStill(tvId, seasonNumber, episodeNumber);
                if (stillUrl) {
                    const stillPath = path.join(seasonImagesDir, `episode_${episodeNumber.toString().padStart(2, '0')}.png`);
                    const success = await downloadImage(stillUrl, stillPath);
                    if (success) {
                        console.log(`      ✅ Downloaded episode still`);
                        downloadedImages++;
                    }
                    totalImages++;
                }
                
                result[showName].seasons[seasonNumber].episodes[episodeNumber] = { 
                    still: stillUrl 
                };
            }
        }
    }
    
    // Save JSON data
    fs.writeFileSync(SEASON_IMAGES_JSON, JSON.stringify(result, null, 2));
    fs.writeFileSync(EPISODE_IMAGES_JSON, JSON.stringify(result, null, 2));
    
    console.log(`\n🎉 Download Complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   • Total images attempted: ${totalImages}`);
    console.log(`   • Successfully downloaded: ${downloadedImages}`);
    console.log(`   • Success rate: ${((downloadedImages / totalImages) * 100).toFixed(1)}%`);
    console.log(`📁 Images saved to: ${TV_SHOWS_DIR}/*/images/`);
    console.log(`📄 JSON data saved to: ${SEASON_IMAGES_JSON} and ${EPISODE_IMAGES_JSON}`);
    console.log(`📝 Manual overrides: ${OVERRIDES_PATH}`);
}

main().catch(console.error); 