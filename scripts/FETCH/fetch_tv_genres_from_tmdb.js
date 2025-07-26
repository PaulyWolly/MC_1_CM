/*
  FETCH_TV_GENRES_FROM_TMDB.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

// scripts/FETCH/fetch_tv_genres_from_tmdb.js
// Scans S:/MEDIA/TV-SHOWS, queries TMDb for genres, outputs tv_genres.json
// Usage: node scripts/FETCH/fetch_tv_genres_from_tmdb.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { normalizeKey } = require('../../shared/NormalizationService');

const TV_ROOT = 'S:/MEDIA/TV-SHOWS';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '7558c4ca11c4063f2e2bdcb44eac41d0';
const OUTPUT_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv_genres.json');
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];

// Helper: Recursively scan for TV show folders (one level deep)
function scanTVShows(dir) {
  const shows = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    if (entry.isDirectory()) {
      shows.push({
        folder: entry.name,
        absPath: path.join(dir, entry.name)
      });
    }
  }
  return shows;
}

// Helper: Query TMDb for TV show genres
async function fetchGenresForShow(showName, year) {
  const query = encodeURIComponent(showName);
  let url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${query}`;
  if (year) url += `&first_air_date_year=${year}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.results || data.results.length === 0) return [];
  // Pick the first result
  const show = data.results[0];
  if (!show || !show.id) return [];
  // Fetch show details for genres
  const detailsRes = await fetch(`https://api.themoviedb.org/3/tv/${show.id}?api_key=${TMDB_API_KEY}`);
  if (!detailsRes.ok) return [];
  const details = await detailsRes.json();
  if (!details.genres) return [];
  return details.genres.map(g => g.name);
}

async function main() {
  console.log('Scanning for TV show folders...');
  const shows = scanTVShows(TV_ROOT);
  console.log(`Found ${shows.length} TV show folders.`);
  const mapping = {};
  let successCount = 0, failCount = 0;
  for (let i = 0; i < shows.length; i++) {
    const { folder, absPath } = shows[i];
    // Try to extract year from folder name (e.g., "Show Name (2012)")
    let year = '';
    const yearMatch = folder.match(/\((\d{4})\)/);
    if (yearMatch) year = yearMatch[1];
    const showName = folder.replace(/\(\d{4}\)/, '').replace(/\./g, ' ').trim();
    console.log(`[${i + 1}/${shows.length}] Querying TMDb for:`, showName, year ? `(${year})` : '');
    try {
      const genres = await fetchGenresForShow(showName, year);
      mapping[folder] = genres;
      if (genres.length > 0) {
        console.log('  → Genres:', genres.join(', '));
        successCount++;
      } else {
        console.warn('  → No genres found');
        failCount++;
      }
    } catch (e) {
      console.warn('  → Error:', e.message);
      mapping[folder] = [];
      failCount++;
    }
    // Optional: Rate limit to avoid hitting TMDb too fast
    await new Promise(r => setTimeout(r, 350));
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2), 'utf-8');
  console.log('Done! Output written to', OUTPUT_FILE);
  console.log(`Summary: ${successCount} shows with genres, ${failCount} with none.`);
}

if (require.main === module) {
  main();
} 