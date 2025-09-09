/*
  SALRON_TV_IMAGE_MANAGER.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
let open = require('open');
if (open.default) open = open.default;

const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const SEASON_IMAGES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tmdb_tv-show_season_images.json');
const EPISODE_IMAGES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tmdb_tv-show_episode_images.json');
const TV_POSTERS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv_posters.json');
const HISTORY_PATH = path.join(__dirname, 'salron_history.json');

function loadHistory() {
    if (fs.existsSync(HISTORY_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveHistory(history) {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function logHistory(history, showName, imageUrl, action) {
    history[showName] = {
        imageUrl,
        action,
        timestamp: new Date().toISOString()
    };
    saveHistory(history);
}

const { searchTVShowOptions } = require('../server/services/TMDBPosterService');

function isVideoFile(filename) {
    const exts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    return exts.includes(path.extname(filename).toLowerCase());
}

function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const folders = [];
    const files = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            folders.push(entry.name);
        } else if (entry.isFile() && isVideoFile(entry.name)) {
            files.push(entry.name);
        }
    }
    return { folders, files };
}

function walkMedia(dir, relPath = '', images = {}, tvPosters = {}, report = []) {
    const absPath = path.join(dir, relPath);
    const { folders, files } = scanDirectory(absPath);
    const relParts = relPath.split(path.sep).filter(Boolean);
    let showName = relParts[0];
    let seasonNum = null;
    let missing = false;

    // DEBUG OUTPUT
    console.log('[SALRON DEBUG] walkMedia:', { relPath, relParts, showName, folders, files });

    // Only check for TOP poster at the top-level show folder
    if (relParts.length === 1 && showName && !folders.includes('Season 01') && !folders.includes('images')) {
        if (!tvPosters[showName]) {
            report.push({ type: 'main', show: showName, missing: true });
            missing = true;
        }
    }
    // Only check for SEASON poster at the season folder level
    if (relParts.length === 2) {
        const [show, seasonFolder] = relParts;
        const seasonMatch = seasonFolder.match(/season[ _-]?(\d+)/i);
        if (seasonMatch) {
            seasonNum = String(parseInt(seasonMatch[1], 10));
            if (!images[show] || !images[show].seasons || !images[show].seasons[seasonNum] || !images[show].seasons[seasonNum].poster) {
                report.push({ type: 'season', show, season: seasonNum, missing: true });
                missing = true;
            }
        }
    }
    // Only check for EPISODE images at the season folder level
    if (relParts.length === 2 && images[showName] && images[showName].seasons && images[showName].seasons[seasonNum]) {
        const seasonData = images[showName].seasons[seasonNum];
        for (const file of files) {
            const epMatch = file.match(/S\d+E(\d+)/i);
            if (epMatch) {
                const epNum = String(parseInt(epMatch[1], 10));
                if (!seasonData.episodes || !seasonData.episodes[epNum] || !seasonData.episodes[epNum].still) {
                    report.push({ type: 'episode', show: showName, season: seasonNum, episode: epNum, missing: true });
                    missing = true;
                }
            }
        }
    }
    // Recurse into subfolders
    for (const folder of folders) {
        // Only recurse into valid show/season folders
        if (relParts.length === 0 || (relParts.length === 1 && folder.match(/season[ _-]?\d+/i))) {
            walkMedia(dir, path.join(relPath, folder), images, tvPosters, report);
        }
    }
    return report;
}

// --- Safe Update Utility ---
/**
 * Safely update a value: only overwrite if current is null/empty, or if user confirms.
 * For future use in fetch/update features.
 */
async function safeUpdate(current, proposed, description) {
    if (!current || current === null || current === '' || current === undefined) {
        // No value exists, safe to update
        return proposed;
    }
    if (current === proposed) {
        // No change
        return current;
    }
    // Prompt user for confirmation before overwriting
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(`\n⚠️  Existing value for ${description}:\n${current}\nProposed new value:\n${proposed}\nOverwrite? (y/N): `, (answer) => {
            rl.close();
            if (answer.trim().toLowerCase() === 'y') {
                resolve(proposed);
            } else {
                resolve(current);
            }
        });
    });
}

async function fetchEpisodeStillOptions(tvId, seasonNumber, episodeNumber) {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const fetch = require('node-fetch');
    const url = `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.still_path) {
            return [{
                still_url: `https://image.tmdb.org/t/p/w500${data.still_path}`,
                name: data.name || '',
                overview: data.overview || '',
                type: 'episode_still'
            }];
        }
        return [];
    } catch (e) {
        console.log('Error fetching episode still:', e.message);
        return [];
    }
}

async function fetchAndUpdateEpisodeStills(episodeImages, missingEpisodes, history, forceMode) {
    const updated = JSON.parse(JSON.stringify(episodeImages));
    for (const { show, season, episode } of missingEpisodes) {
        const historyKey = `${show}|S${season}E${episode}`;
        if (!forceMode && history[historyKey] && history[historyKey].stillUrl) {
            console.log(`⏩ [HISTORY] Skipping already completed: ${show} S${season}E${episode}`);
            continue;
        }
        // Get TMDB ID (search or manual)
        let tvId = null;
        let usedManualId = false;
        let showOptions = await searchTVShowOptions(show);
        while (!tvId) {
            if (showOptions.length === 0) {
                console.log(`❌ No TMDB match for: ${show}`);
            } else {
                console.log(`Found TMDB options for ${show}:`);
                showOptions.forEach((opt, idx) => {
                    console.log(`  [${idx + 1}] ${opt.name} (${opt.year}) - TMDB ID: ${opt.id}`);
                });
            }
            const readline = require('readline');
            let answer;
            while (true) {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                answer = await new Promise((resolve) => {
                    rl.question(`Select TMDB show [1-${showOptions.length}], 't' to open TMDB search, 'id' to enter TMDB ID, 'x' to exit, or 0 to skip: `, (ans) => {
                        rl.close();
                        resolve(ans.trim());
                    });
                });
                if (answer.toLowerCase() === 'x') {
                    console.log('\n🛑 SALRON exited by user (x command).');
                    process.exit(0);
                }
                if (answer.toLowerCase() === 't') {
                    const tmdbSearchUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(show)}`;
                    console.log(`Opening TMDB search for: ${show}`);
                    await open(tmdbSearchUrl);
                    continue;
                }
                if (answer.toLowerCase() === 'id') {
                    const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
                    const manualId = await new Promise((resolve) => {
                        rl2.question('Enter TMDB TV Show ID: ', (id) => {
                            rl2.close();
                            resolve(id.trim());
                        });
                    });
                    if (manualId) {
                        tvId = manualId;
                        usedManualId = true;
                        break;
                    } else {
                        console.log('No ID entered.');
                        continue;
                    }
                }
                const idx = parseInt(answer, 10) - 1;
                if (idx >= 0 && idx < showOptions.length) {
                    tvId = showOptions[idx].id;
                    break;
                } else if (answer === '0') {
                    break;
                } else {
                    console.log('Invalid option.');
                }
            }
            if (tvId || answer === '0') break;
        }
        if (!tvId) {
            logHistory(history, historyKey, null, 'skipped');
            console.log(`⏩ Skipped updating episode still for ${show} S${season}E${episode}`);
            continue;
        }
        // Fetch episode still options
        const stillOptions = await fetchEpisodeStillOptions(tvId, season, episode);
        if (stillOptions.length === 0) {
            logHistory(history, historyKey, null, 'skipped');
            console.log(`❌ No still found for: ${show} S${season}E${episode}`);
            continue;
        }
        // Only one still per episode, but keep workflow consistent
        const still = stillOptions[0];
        const readline = require('readline');
        let answer;
        while (true) {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            answer = await new Promise((resolve) => {
                rl.question(`View still (v), accept (a), skip (0), or exit (x): `, (ans) => {
                    rl.close();
                    resolve(ans.trim());
                });
            });
            if (answer.toLowerCase() === 'x') {
                console.log('\n🛑 SALRON exited by user (x command).');
                process.exit(0);
            }
            if (answer.toLowerCase() === 'v') {
                console.log(`Opening still in browser: ${still.still_url}`);
                await open(still.still_url);
                continue;
            }
            if (answer.toLowerCase() === 'a') {
                // Accept and update JSON
                if (!updated[show]) updated[show] = { seasons: {} };
                if (!updated[show].seasons[season]) updated[show].seasons[season] = { episodes: {} };
                if (!updated[show].seasons[season].episodes) updated[show].seasons[season].episodes = {};
                updated[show].seasons[season].episodes[episode] = { still: still.still_url };
                logHistory(history, historyKey, still.still_url, 'selected');
                // --- NEW: Download/copy image to file server ---
                const showDir = path.join(MEDIA_ROOT, show);
                const seasonDir = path.join(showDir, `Season ${season.padStart(2, '0')}`);
                const episodeFile = `S${season.padStart(2, '0')}E${episode.padStart(2, '0')}.jpg`;
                const destPath = path.join(seasonDir, episodeFile);
                if (!fs.existsSync(seasonDir)) fs.mkdirSync(seasonDir, { recursive: true });
                let shouldWrite = true;
                if (fs.existsSync(destPath)) {
                    const readline2 = require('readline');
                    const rl2 = readline2.createInterface({ input: process.stdin, output: process.stdout });
                    const overwrite = await new Promise((resolve) => {
                        rl2.question(`File already exists at ${destPath}. Overwrite? (y/N): `, (ans) => {
                            rl2.close();
                            resolve(ans.trim().toLowerCase() === 'y');
                        });
                    });
                    shouldWrite = overwrite;
                }
                if (shouldWrite) {
                    process.stdout.write('Downloading episode image');
                    const fetch = require('node-fetch');
                    const res = await fetch(still.still_url);
                    const buffer = await res.buffer();
                    let dots = 0;
                    const interval = setInterval(() => {
                        process.stdout.write('.');
                        dots++;
                    }, 300);
                    fs.writeFileSync(destPath, buffer);
                    clearInterval(interval);
                    process.stdout.write(' Done!\n');
                    console.log(`✅ Episode image saved to: ${destPath}`);
                } else {
                    console.log('Skipped writing episode image.');
                }
                console.log(`✅ Updated still for ${show} S${season}E${episode}`);
                break;
            }
            if (answer === '0') {
                logHistory(history, historyKey, null, 'skipped');
                console.log(`⏩ Skipped updating episode still for ${show} S${season}E${episode}`);
                break;
            }
            console.log('Invalid option.');
        }
    }
    return updated;
}

async function fetchSeasonPosterOptions(tvId, seasonNumber) {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const fetch = require('node-fetch');
    const url = `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.poster_path) {
            return [{
                poster_url: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
                name: data.name || `Season ${seasonNumber}`,
                overview: data.overview || '',
                type: 'season_poster'
            }];
        }
        return [];
    } catch (e) {
        console.log('Error fetching season poster:', e.message);
        return [];
    }
}

async function fetchAndUpdateSeasonPosters(seasonImages, missingSeasons, history, forceMode) {
    const updated = JSON.parse(JSON.stringify(seasonImages));
    for (const { show, season } of missingSeasons) {
        const historyKey = `${show}|S${season}`;
        if (!forceMode && history[historyKey] && history[historyKey].posterUrl) {
            console.log(`⏩ [HISTORY] Skipping already completed: ${show} S${season}`);
            continue;
        }
        // Get TMDB ID (search or manual)
        let tvId = null;
        let usedManualId = false;
        let showOptions = await searchTVShowOptions(show);
        while (!tvId) {
            if (showOptions.length === 0) {
                console.log(`❌ No TMDB match for: ${show}`);
            } else {
                console.log(`Found TMDB options for ${show}:`);
                showOptions.forEach((opt, idx) => {
                    console.log(`  [${idx + 1}] ${opt.name} (${opt.year}) - TMDB ID: ${opt.id}`);
                });
            }
            const readline = require('readline');
            let answer;
            while (true) {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                answer = await new Promise((resolve) => {
                    rl.question(`Select TMDB show [1-${showOptions.length}], 't' to open TMDB search, 'id' to enter TMDB ID, 'x' to exit, or 0 to skip: `, (ans) => {
                        rl.close();
                        resolve(ans.trim());
                    });
                });
                if (answer.toLowerCase() === 'x') {
                    console.log('\n🛑 SALRON exited by user (x command).');
                    process.exit(0);
                }
                if (answer.toLowerCase() === 't') {
                    const tmdbSearchUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(show)}`;
                    console.log(`Opening TMDB search for: ${show}`);
                    await open(tmdbSearchUrl);
                    continue;
                }
                if (answer.toLowerCase() === 'id') {
                    const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
                    const manualId = await new Promise((resolve) => {
                        rl2.question('Enter TMDB TV Show ID: ', (id) => {
                            rl2.close();
                            resolve(id.trim());
                        });
                    });
                    if (manualId) {
                        tvId = manualId;
                        usedManualId = true;
                        break;
                    } else {
                        console.log('No ID entered.');
                        continue;
                    }
                }
                const idx = parseInt(answer, 10) - 1;
                if (idx >= 0 && idx < showOptions.length) {
                    tvId = showOptions[idx].id;
                    break;
                } else if (answer === '0') {
                    break;
                } else {
                    console.log('Invalid option.');
                }
            }
            if (tvId || answer === '0') break;
        }
        if (!tvId) {
            logHistory(history, historyKey, null, 'skipped');
            console.log(`⏩ Skipped updating season poster for ${show} S${season}`);
            continue;
        }
        // Fetch season poster options
        const posterOptions = await fetchSeasonPosterOptions(tvId, season);
        if (posterOptions.length === 0) {
            logHistory(history, historyKey, null, 'skipped');
            console.log(`❌ No poster found for: ${show} S${season}`);
            continue;
        }
        // Only one poster per season, but keep workflow consistent
        const poster = posterOptions[0];
        const readline = require('readline');
        let answer;
        while (true) {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            answer = await new Promise((resolve) => {
                rl.question(`View poster (v), accept (a), skip (0), or exit (x): `, (ans) => {
                    rl.close();
                    resolve(ans.trim());
                });
            });
            if (answer.toLowerCase() === 'x') {
                console.log('\n🛑 SALRON exited by user (x command).');
                process.exit(0);
            }
            if (answer.toLowerCase() === 'v') {
                console.log(`Opening poster in browser: ${poster.poster_url}`);
                await open(poster.poster_url);
                continue;
            }
            if (answer.toLowerCase() === 'a') {
                // Accept and update JSON
                if (!updated[show]) updated[show] = { seasons: {} };
                if (!updated[show].seasons[season]) updated[show].seasons[season] = {};
                updated[show].seasons[season].poster = poster.poster_url;
                logHistory(history, historyKey, poster.poster_url, 'selected');
                console.log(`✅ Updated poster for ${show} S${season}`);
                break;
            }
            if (answer === '0') {
                logHistory(history, historyKey, null, 'skipped');
                console.log(`⏩ Skipped updating season poster for ${show} S${season}`);
                break;
            }
            console.log('Invalid option.');
        }
    }
    return updated;
}

process.on('SIGINT', () => {
    console.log('\n🛑 SALRON interrupted by user (CTRL-C). Exiting.');
    process.exit(0);
});

async function fetchAndUpdateMainPosters(tvPosters, missingMainShows, history, forceMode) {
    const updated = { ...tvPosters };
    for (const showName of missingMainShows) {
        if (!forceMode && history[showName] && history[showName].imageUrl) {
            console.log(`⏩ [HISTORY] Skipping already completed: ${showName}`);
            continue;
        }
        let options = await searchTVShowOptions(showName);
        let usedManualId = false;
        while (true) {
            console.log(`\n🔍 Searching TMDB for main poster: ${showName}`);
            if (options.length === 0) {
                console.log(`❌ No poster found for: ${showName}`);
            } else {
                console.log(`Found poster options for ${showName}:`);
                options.forEach((opt, idx) => {
                    console.log(`  [${idx + 1}] ${opt.name} (${opt.year}) - ${opt.poster_url}`);
                });
            }
            const readline = require('readline');
            let answer;
            while (true) {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                answer = await new Promise((resolve) => {
                    rl.question(`Select poster [1-${options.length}], type 'v#' to view (e.g. v1), 't' to open TMDB search, 'id' to enter TMDB ID, 'x' to exit, or 0 to skip: `, (ans) => {
                        rl.close();
                        resolve(ans.trim());
                    });
                });
                if (answer.toLowerCase() === 'x') {
                    console.log('\n🛑 SALRON exited by user (x command).');
                    process.exit(0);
                }
                if (/^v\d+$/.test(answer)) {
                    const idx = parseInt(answer.slice(1), 10) - 1;
                    if (idx >= 0 && idx < options.length) {
                        console.log(`Opening image in browser: ${options[idx].poster_url}`);
                        await open(options[idx].poster_url);
                    } else {
                        console.log('Invalid option number.');
                    }
                    continue;
                }
                if (answer.toLowerCase() === 't') {
                    const tmdbSearchUrl = `https://www.themoviedb.org/search?query=${encodeURIComponent(showName)}`;
                    console.log(`Opening TMDB search for: ${showName}`);
                    await open(tmdbSearchUrl);
                    continue;
                }
                if (answer.toLowerCase() === 'id') {
                    const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
                    const manualId = await new Promise((resolve) => {
                        rl2.question('Enter TMDB TV Show ID: ', (id) => {
                            rl2.close();
                            resolve(id.trim());
                        });
                    });
                    if (manualId) {
                        // Fetch poster options for this TMDB ID
                        options = await fetchPosterOptionsByShowId(manualId);
                        usedManualId = true;
                        break;
                    } else {
                        console.log('No ID entered.');
                        continue;
                    }
                }
                break;
            }
            if (usedManualId) {
                usedManualId = false;
                continue;
            }
            const idx = parseInt(answer, 10) - 1;
            if (idx >= 0 && idx < options.length) {
                const selected = options[idx];
                const newPoster = await safeUpdate(tvPosters[showName], selected.poster_url, `Main poster for ${showName}`);
                if (newPoster !== tvPosters[showName]) {
                    updated[showName] = newPoster;
                    logHistory(history, showName, selected.poster_url, 'selected');
                    console.log(`✅ Updated main poster for ${showName}`);
                } else {
                    logHistory(history, showName, tvPosters[showName], 'skipped');
                    console.log(`⏩ Skipped updating main poster for ${showName}`);
                }
            } else {
                logHistory(history, showName, null, 'skipped');
                console.log(`⏩ Skipped updating main poster for ${showName}`);
            }
            break;
        }
    }
    return updated;
}

// Helper to fetch poster options by TMDB show ID
async function fetchPosterOptionsByShowId(showId) {
    if (!showId) return [];
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const fetch = require('node-fetch');
    const url = `${TMDB_BASE_URL}/tv/${showId}/images?api_key=${TMDB_API_KEY}`;
    const showUrl = `${TMDB_BASE_URL}/tv/${showId}?api_key=${TMDB_API_KEY}`;
    try {
        const [imagesRes, showRes] = await Promise.all([
            fetch(url),
            fetch(showUrl)
        ]);
        const imagesData = await imagesRes.json();
        const showData = await showRes.json();
        const options = [];
        if (imagesData.posters && imagesData.posters.length > 0) {
            for (const poster of imagesData.posters.slice(0, 5)) {
                options.push({
                    id: showId,
                    name: showData.name || 'Unknown',
                    year: showData.first_air_date ? showData.first_air_date.split('-')[0] : 'Unknown',
                    poster_path: poster.file_path,
                    poster_url: `https://image.tmdb.org/t/p/w500${poster.file_path}`,
                    vote_average: showData.vote_average,
                    overview: showData.overview,
                    type: 'main'
                });
            }
        }
        return options;
    } catch (e) {
        console.log('Error fetching posters by TMDB ID:', e.message);
        return [];
    }
}

async function selectMissingItemsMenu(report) {
    if (report.length === 0) return [];
    console.log('\n--- Missing Images Menu ---');
    report.forEach((item, idx) => {
        if (item.type === 'main') {
            console.log(`[${idx + 1}] TOP poster for ${item.show}`);
        } else if (item.type === 'season') {
            console.log(`[${idx + 1}] SEASON poster for ${item.show}, Season ${item.season}`);
        } else if (item.type === 'episode') {
            console.log(`[${idx + 1}] EPISODE image for ${item.show}, Season ${item.season}, Episode ${item.episode}`);
        }
    });
    console.log("\nEnter a number (or comma-separated list) to process specific items, 'a' for all, or 'x' to exit.");
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
        rl.question('Selection [a]: ', (ans) => {
            rl.close();
            resolve(ans.trim());
        });
    });
    if (answer.toLowerCase() === 'x') {
        console.log('\n🛑 SALRON exited by user (x command).');
        process.exit(0);
    }
    if (answer === '' || answer.toLowerCase() === 'a') {
        return report;
    }
    // Parse comma-separated numbers
    const indices = answer.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(i => i >= 0 && i < report.length);
    if (indices.length === 0) {
        console.log('No valid selection. Exiting.');
        process.exit(0);
    }
    return indices.map(i => report[i]);
}

async function main() {
    const showArg = process.argv[2]; // Optional TV show name
    let scanRoot = MEDIA_ROOT;
    const forceMode = process.argv.includes('--force') || process.argv.includes('--redo');
    if (showArg) {
        scanRoot = path.join(MEDIA_ROOT, showArg);
    }
    console.log(`SALRON: Scanning TV-SHOWS library at: ${scanRoot}`);
    let seasonImages = {};
    let episodeImages = {};
    let tvPosters = {};
    // Load season images
    try {
        seasonImages = JSON.parse(fs.readFileSync(SEASON_IMAGES_JSON, 'utf8'));
        console.log('✅ Loaded season images data');
    } catch (e) {
        console.warn('Could not load season images JSON:', e.message);
    }
    // Load episode images
    try {
        episodeImages = JSON.parse(fs.readFileSync(EPISODE_IMAGES_JSON, 'utf8'));
        console.log('✅ Loaded episode images data');
    } catch (e) {
        console.warn('Could not load episode images JSON:', e.message);
    }
    // Load TV posters
    try {
        tvPosters = JSON.parse(fs.readFileSync(TV_POSTERS_JSON, 'utf8'));
        console.log('✅ Loaded TV posters data');
    } catch (e) {
        console.warn('Could not load TV posters JSON:', e.message);
    }
    // Load history
    const history = loadHistory();
    // Merge the image data
    const images = {};
    for (const showName in seasonImages) {
        images[showName] = { seasons: {} };
        if (seasonImages[showName].seasons) {
            for (const seasonNum in seasonImages[showName].seasons) {
                images[showName].seasons[seasonNum] = {
                    poster: seasonImages[showName].seasons[seasonNum].poster || null,
                    episodes: {}
                };
                // Add episode data if available
                if (episodeImages[showName] && 
                    episodeImages[showName].seasons && 
                    episodeImages[showName].seasons[seasonNum] &&
                    episodeImages[showName].seasons[seasonNum].episodes) {
                    images[showName].seasons[seasonNum].episodes = episodeImages[showName].seasons[seasonNum].episodes;
                }
            }
        }
    }
    // Scan and report
    const report = walkMedia(scanRoot, '', images, tvPosters, []);
    if (report.length === 0) {
        console.log('🎉 All main, season, and episode images are present!');
        return;
    }
    console.log('--- Missing Images Report ---');
    for (const item of report) {
        if (item.type === 'main') {
            console.log(`❌ Missing TOP poster for ${item.show}`);
        } else if (item.type === 'season') {
            console.log(`❌ Missing SEASON poster for ${item.show}, Season ${item.season}`);
        } else if (item.type === 'episode') {
            console.log(`❌ Missing EPISODE image for ${item.show}, Season ${item.season}, Episode ${item.episode}`);
        }
    }
    console.log(`Total missing: ${report.length}`);

    // Menu-driven selection
    const selectedItems = await selectMissingItemsMenu(report);
    // Partition by type
    const missingMainShows = selectedItems.filter(item => item.type === 'main').map(item => item.show);
    const missingSeasons = selectedItems.filter(item => item.type === 'season').map(item => ({ show: item.show, season: item.season }));
    const missingEpisodes = selectedItems.filter(item => item.type === 'episode').map(item => ({ show: item.show, season: item.season, episode: item.episode }));

    // Backup tv_posters.json before making changes
    const backupPath = TV_POSTERS_JSON + '.bak_' + Date.now();
    fs.copyFileSync(TV_POSTERS_JSON, backupPath);
    console.log(`🗂️  Backed up tv_posters.json to ${backupPath}`);
    // Fetch and update main posters
    tvPosters = await fetchAndUpdateMainPosters(tvPosters, missingMainShows, history, forceMode);
    // Write updated JSON
    fs.writeFileSync(TV_POSTERS_JSON, JSON.stringify(tvPosters, null, 2));
    console.log('💾 tv_posters.json updated with new main posters!');

    // Backup season_images.json before making changes
    const backupPathSeason = SEASON_IMAGES_JSON + '.bak_' + Date.now();
    fs.copyFileSync(SEASON_IMAGES_JSON, backupPathSeason);
    console.log(`🗂️  Backed up season_images.json to ${backupPathSeason}`);
    // Fetch and update season posters
    seasonImages = await fetchAndUpdateSeasonPosters(seasonImages, missingSeasons, history, forceMode);
    // Write updated JSON
    fs.writeFileSync(SEASON_IMAGES_JSON, JSON.stringify(seasonImages, null, 2));
    console.log('💾 season_images.json updated with new season posters!');

    // Backup episode_images.json before making changes
    const backupPathEpisode = EPISODE_IMAGES_JSON + '.bak_' + Date.now();
    fs.copyFileSync(EPISODE_IMAGES_JSON, backupPathEpisode);
    console.log(`🗂️  Backed up episode_images.json to ${backupPathEpisode}`);
    // Fetch and update episode stills
    episodeImages = await fetchAndUpdateEpisodeStills(episodeImages, missingEpisodes, history, forceMode);
    // Write updated JSON
    fs.writeFileSync(EPISODE_IMAGES_JSON, JSON.stringify(episodeImages, null, 2));
    console.log('💾 episode_images.json updated with new episode stills!');

    if (report.length === 0) {
        console.log('🎉 All main, season, and episode images are present!');
    } else {
        console.log('--- Missing Images Report ---');
        for (const item of report) {
            if (item.type === 'main') {
                console.log(`❌ Missing TOP poster for ${item.show}`);
            } else if (item.type === 'season') {
                console.log(`❌ Missing SEASON poster for ${item.show}, Season ${item.season}`);
            } else if (item.type === 'episode') {
                console.log(`❌ Missing EPISODE image for ${item.show}, Season ${item.season}, Episode ${item.episode}`);
            }
        }
        console.log(`Total missing: ${report.length}`);
    }
}

if (require.main === module) {
    main();
} 