/*
  FIX_MOVIE_POSTERS_JSON_SLASHES.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
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