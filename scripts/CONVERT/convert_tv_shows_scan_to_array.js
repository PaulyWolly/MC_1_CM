/*
  CONVERT_TV_SHOWS_SCAN_TO_ARRAY.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

// convert_tv_shows_scan_to_array.js
// Converts scanned TV show folder structure to flat array format for MediaManager

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '../server/data/media-library-tv-shows.json');
const OUTPUT = path.join(__dirname, '../server/data/media-library-tv-shows.converted.json');

function extractShowTitle(folderPath) {
  // Use the last part of the path as the show title
  if (!folderPath) return '';
  const parts = folderPath.split(/[/\\]/);
  return parts[0] || folderPath;
}

function extractSeasonNumber(seasonPath) {
  // Try to extract season number from path like 'Season 01'
  const match = seasonPath.match(/Season\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function convert() {
  if (!fs.existsSync(INPUT)) {
    console.error('Input file not found:', INPUT);
    process.exit(1);
  }
  const raw = fs.readFileSync(INPUT, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }
  if (!data.folders || !Array.isArray(data.folders)) {
    console.error('No folders array found in input.');
    process.exit(1);
  }
  const shows = data.folders.map(showFolder => {
    const title = extractShowTitle(showFolder.path);
    const seasons = (showFolder.folders || []).map(seasonFolder => {
      const seasonNumber = extractSeasonNumber(seasonFolder.path) || 1;
      const episodes = (seasonFolder.files || []).map(file => ({
        filename: file.name,
        filePath: file.absPath || file.relPath || '',
      }));
      return { seasonNumber, episodes };
    });
    return { title, seasons };
  });
  fs.writeFileSync(OUTPUT, JSON.stringify(shows, null, 2));
  console.log('Converted TV shows written to:', OUTPUT);
}

convert(); 