/*
  CONVERT_TV_POSTERS.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
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
