/*
  CONVERT_OLD_TO_NEW_CACHEKEYS_FOR_SANTANTA.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/merged_output.json', 'utf8'));

const playlist = data[0]; // Only one in your merged file

playlist.cacheKeys = playlist.cacheKeys.map(key => {
  // If already in new format, leave as is
  if (key.startsWith('yt_search_')) return key;
  // Convert old format to new
  const match = key.match(/yt_YouTube search ([^_]+)_search_(\\d+)/);
  if (match) {
    const query = match[1].replace(/ /g, '_').toLowerCase();
    const page = match[2];
    return `yt_search_${query}_p${page}_none`;
  }
  return key; // fallback: leave unchanged
});

fs.writeFileSync('scripts/merged_output_standardized.json', JSON.stringify(data, null, 2));
console.log('Standardized cacheKeys and wrote scripts/merged_output_standardized.json');
