/*
  FIX_MOVIE_POSTERS_JSON_SLASHES.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
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