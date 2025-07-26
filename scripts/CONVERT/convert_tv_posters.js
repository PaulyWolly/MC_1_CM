/*
  CONVERT_TV_POSTERS.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const fs = require('fs');
const posters = require('./public/components/MediaLibrary/data/tv_posters.json');
const newPosters = {};

for (const [fullPath, url] of Object.entries(posters)) {
  const folderName = fullPath.split(/[\\/]/).pop();
  newPosters[folderName] = url;
}

fs.writeFileSync('./public/components/MediaLibrary/data/tv_posters.json', JSON.stringify(newPosters, null, 2));
console.log('tv_posters.json updated!');
