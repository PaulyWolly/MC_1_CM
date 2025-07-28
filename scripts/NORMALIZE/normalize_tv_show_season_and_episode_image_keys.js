/*
  NORMALIZE_TV_SHOW_SEASON_AND_EPISODE_IMAGE_KEYS.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

// Normalize TV Show Season and Episode Image JSON keys to dot notation
const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');

const SEASON_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/tmdb_tv-show_season_images.json');
const EPISODE_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/tmdb_tv-show_episode_images.json');
const SEASON_OUT = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json');
const EPISODE_OUT = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json');

function normalizeKeys(obj) {
  const out = {};
  for (const key in obj) {
    const norm = normalizeKey(key);
    out[norm] = obj[key];
  }
  return out;
}

function main() {
  // Season images
  const seasonData = JSON.parse(fs.readFileSync(SEASON_FILE, 'utf8'));
  const seasonNorm = normalizeKeys(seasonData);
  fs.writeFileSync(SEASON_OUT, JSON.stringify(seasonNorm, null, 2));
  console.log('Wrote normalized season images to', SEASON_OUT);

  // Episode images
  const episodeData = JSON.parse(fs.readFileSync(EPISODE_FILE, 'utf8'));
  const episodeNorm = normalizeKeys(episodeData);
  fs.writeFileSync(EPISODE_OUT, JSON.stringify(episodeNorm, null, 2));
  console.log('Wrote normalized episode images to', EPISODE_OUT);
}

main(); 