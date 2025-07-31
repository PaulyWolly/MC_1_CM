/*
  FETCH_ANOTHER_LIFE_EPISODE_IMAGES.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

// Fetches all episode stills for 'Another Life' (TMDB ID: 79130) from TMDB and outputs a JSON block for season_episode_images.json
// Usage: node scripts/fetch_another_life_episode_images.js

require('dotenv').config({ path: './server/.env' });
const axios = require('axios');
const fs = require('fs');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SHOW_ID = 79130; // Another Life (Netflix)
const OUTPUT_PATH = 'public/data/another_life_episode_images.json';

if (!TMDB_API_KEY) {
  console.error('TMDB_API_KEY not found in /server/.env');
  process.exit(1);
}

const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: { api_key: TMDB_API_KEY, language: 'en-US' },
});

async function fetchSeasons(showId) {
  const { data } = await tmdb.get(`/tv/${showId}`);
  return data.seasons.map(s => s.season_number).filter(n => n > 0);
}

async function fetchEpisodes(showId, seasonNumber) {
  const { data } = await tmdb.get(`/tv/${showId}/season/${seasonNumber}`);
  return data.episodes.map(ep => ({
    episode_number: ep.episode_number,
    still_path: ep.still_path,
  }));
}

async function main() {
  const result = { 'Another Life': { seasons: {} } };
  const seasons = await fetchSeasons(SHOW_ID);
  for (const season of seasons) {
    const episodes = await fetchEpisodes(SHOW_ID, season);
    result['Another Life'].seasons[season] = {
      poster: null, // You can fill this in manually if needed
      episodes: {},
    };
    for (const ep of episodes) {
      result['Another Life'].seasons[season].episodes[ep.episode_number] = {
        still: ep.still_path
          ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
          : null,
      };
    }
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(`Done! Output written to ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 