/*
  CONVERT_TV_POSTERS.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
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
