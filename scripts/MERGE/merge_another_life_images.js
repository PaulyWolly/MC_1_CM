/*
  MERGE_ANOTHER_LIFE_IMAGES.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

// Merges episode stills from /public/data/another_life_episode_images.json into server/data/media-library-tv-shows.json
// Usage: node scripts/merge_another_life_images.js

const fs = require('fs');
const path = require('path');

const MAIN_JSON = 'server/data/media-library-tv-shows.json';
const TMDB_JSON = 'public/data/another_life_episode_images.json';

function parseSeasonEpisode(filename) {
  // Matches S01E01, S02E10, etc.
  const match = filename.match(/S(\d{2})E(\d{2})/i);
  if (!match) return null;
  return {
    season: String(parseInt(match[1], 10)), // remove leading zero
    episode: String(parseInt(match[2], 10)),
  };
}

function updateStills(mainData, tmdbData) {
  let updated = 0;
  for (const show of mainData.folders) {
    if (!show.path || show.path.replace(/\\/g, '/').toLowerCase() !== 'another life') continue;
    for (const seasonFolder of show.folders) {
      const seasonMatch = seasonFolder.path.match(/Season (\d+)/i);
      if (!seasonMatch) continue;
      const seasonNum = String(parseInt(seasonMatch[1], 10));
      const tmdbSeason = tmdbData['Another Life']?.seasons?.[seasonNum];
      if (!tmdbSeason) continue;
      for (const file of seasonFolder.files) {
        const se = parseSeasonEpisode(file.name);
        if (!se) continue;
        const tmdbEp = tmdbSeason.episodes?.[se.episode];
        if (tmdbEp && tmdbEp.still) {
          if (file.still !== tmdbEp.still) {
            file.still = tmdbEp.still;
            updated++;
          }
        }
      }
    }
  }
  return updated;
}

function main() {
  const mainData = JSON.parse(fs.readFileSync(MAIN_JSON, 'utf8'));
  const tmdbData = JSON.parse(fs.readFileSync(TMDB_JSON, 'utf8'));
  const updated = updateStills(mainData, tmdbData);
  fs.writeFileSync(MAIN_JSON, JSON.stringify(mainData, null, 2));
  console.log(`Updated ${updated} episode stills for 'Another Life'.`);
}

main(); 