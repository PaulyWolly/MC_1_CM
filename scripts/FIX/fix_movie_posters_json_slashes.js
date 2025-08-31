/*
  FIX_MOVIE_POSTERS_JSON_SLASHES.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const POSTERS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

const data = JSON.parse(fs.readFileSync(POSTERS_JSON, 'utf8'));
const fixed = {};
for (const [key, value] of Object.entries(data)) {
  fixed[key.replace(/\\/g, '/')] = value;
}
fs.writeFileSync(POSTERS_JSON, JSON.stringify(fixed, null, 2));
console.log('✅ All keys in movie_posters.json now use forward slashes.'); 