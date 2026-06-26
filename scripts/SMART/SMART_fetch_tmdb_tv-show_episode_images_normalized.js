/*
  SMART_FETCH_TMDB_TV-SHOW_EPISODE_IMAGES_NORMALIZED.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_SHOWS_DIR = 'S:/MEDIA/TV-SHOWS/';
const DATA_DIR = path.join(__dirname, '../../public/components/MediaLibrary/data');
const OUTPUT_JSON = path.join(DATA_DIR, 'tv-shows/tv-show_episode_images_normalized.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'episode_tmdb_tv-show_overrides.json');

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

async function fetchEpisodeStill(tvId, seasonNumber, episodeNumber) {
    const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.still_path ? `https://image.tmdb.org/t/p/w500${data.still_path}` : null;
}

async function main() {
    const showArg = process.argv[2];
    let shows;
    if (showArg) {
        shows = [showArg];
        console.log(`SMART MODE: Only fetching episode images for: ${showArg}`);
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
            console.warn('⚠️ Could not parse existing normalized episode images JSON, starting fresh.');
            existing = {};
        }
    }
    const result = { ...existing };
    
    let showsFound = 0;
    let totalEpisodes = 0;
    let episodesWithStills = 0;
    
    console.log(`🎬 Starting TV show episode still fetch for ${shows.length} shows...\n`);
    
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
        let showEpisodes = 0;
        let showEpisodesWithStills = 0;
        let foundAnyStills = false;
        
        for (const seasonFolder of seasonFolders) {
            const match = seasonFolder.match(/season[ _-]?(\d+)/i);
            if (!match) continue;
            const seasonNumber = parseInt(match[1], 10);
            if (!seasonNumber) continue;
            // If override specifies a season, skip others
            if (seasonOverride && seasonNumber !== seasonOverride) continue;
            result[normalizedKey].seasons[seasonNumber] = { episodes: {} };
            const seasonPath = path.join(showPath, seasonFolder);
            const files = fs.readdirSync(seasonPath).filter(f => /\.(mp4|mkv|avi|mov|m4v)$/i.test(f));
            let seasonEpisodes = 0;
            let seasonEpisodesWithStills = 0;
            for (const file of files) {
                let episodeNumber = null;
                // Support S01E01, 1x01, and E01 patterns
                let epMatch = file.match(/S\d{2}E(\d{2})/i);
                if (epMatch) {
                    episodeNumber = parseInt(epMatch[1], 10);
                } else {
                    epMatch = file.match(/(\d+)x(\d{2})/i);
                    if (epMatch) {
                        episodeNumber = parseInt(epMatch[2], 10);
                    } else {
                        epMatch = file.match(/E(\d{2})/i);
                        if (epMatch) {
                            episodeNumber = parseInt(epMatch[1], 10);
                        }
                    }
                }
                if (!episodeNumber) continue;
                showEpisodes++;
                totalEpisodes++;
                seasonEpisodes++;
                console.log(`   📺 Fetching S${seasonNumber}E${episodeNumber.toString().padStart(2, '0')} still...`);
                const stillUrl = await fetchEpisodeStill(tvId, seasonNumber, episodeNumber);
                result[normalizedKey].seasons[seasonNumber].episodes[episodeNumber] = { still: stillUrl };
                if (stillUrl) {
                    foundAnyStills = true;
                    console.log(`   ✅ S${seasonNumber}E${episodeNumber.toString().padStart(2, '0')} still found: ${stillUrl.split('/').pop()}`);
                    showEpisodesWithStills++;
                    episodesWithStills++;
                    seasonEpisodesWithStills++;
                } else {
                    console.log(`   ❌ S${seasonNumber}E${episodeNumber.toString().padStart(2, '0')} still not available`);
                }
            }
            if (seasonEpisodes > 0) {
                console.log(`   📊 Season ${seasonNumber}: ${seasonEpisodesWithStills}/${seasonEpisodes} episodes have stills`);
            }
        }
        if (showEpisodes > 0) {
            console.log(`   📊 ${showName}: ${showEpisodesWithStills}/${showEpisodes} episodes have stills\n`);
        } else {
            console.log(`   ⚠️  ${showName}: No episode files found\n`);
        }
        // Only update the result if we found at least one still, or if the show is not already present
        if (!foundAnyStills && existing[normalizedKey]) {
            // Do not overwrite existing entry
            console.log(`⚠️  No new stills found for ${showName}, preserving existing data.`);
            continue;
        }
    }
    
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
    
    console.log(`\n🎉 Episode still fetch complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Shows processed: ${shows.length}`);
    console.log(`   • Shows found on TMDB: ${showsFound}`);
    console.log(`   • Total episodes: ${totalEpisodes}`);
    console.log(`   • Episodes with stills: ${episodesWithStills}`);
    console.log(`   • Success rate: ${totalEpisodes > 0 ? ((episodesWithStills / totalEpisodes) * 100).toFixed(1) : 0}%`);
    console.log(`📄 Normalized data saved to: ${OUTPUT_JSON}`);
    console.log(`📝 Manual overrides: ${OVERRIDES_PATH}`);
}

main(); 