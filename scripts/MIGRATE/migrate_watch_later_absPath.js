/*
  MIGRATE_WATCH_LATER_ABSPATH.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

// migrate_watch_later_absPath.js
// Usage: node scripts/migrate_watch_later_absPath.js
// Make sure watch_later.json and media-library-movies.json are in the correct locations.

// migrate_watch_later_absPath.js
const fs = require('fs');
const path = require('path');

const MOVIE_LIBRARY_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');
const WATCH_LATER_PATH = path.join(__dirname, '../watch_later.json');
const OUTPUT_PATH = path.join(__dirname, '../watch_later_migrated.json');

if (!fs.existsSync(MOVIE_LIBRARY_PATH)) {
  console.error('Movie library not found:', MOVIE_LIBRARY_PATH);
  process.exit(1);
}
if (!fs.existsSync(WATCH_LATER_PATH)) {
  console.error('Watch Later file not found:', WATCH_LATER_PATH);
  process.exit(1);
}

const movieLibraryRaw = JSON.parse(fs.readFileSync(MOVIE_LIBRARY_PATH, 'utf8'));
const rootMovies = Array.isArray(movieLibraryRaw.folders)
  ? movieLibraryRaw.folders
  : [];

function flattenMovies(folders) {
  let movies = [];
  for (const folder of folders) {
    if (Array.isArray(folder.files) && folder.files.length > 0) {
      movies.push(folder);
    }
    if (Array.isArray(folder.folders) && folder.folders.length > 0) {
      movies = movies.concat(flattenMovies(folder.folders));
    }
  }
  return movies;
}

const movies = flattenMovies(rootMovies);
console.log(`Flattened movie count: ${movies.length}`);

let watchLater = JSON.parse(fs.readFileSync(WATCH_LATER_PATH, 'utf8'));
let updated = 0, unmatched = 0;

watchLater = watchLater.map(item => {
  // Only try to set absPath for movie entries (not TV shows/episodes)
  if (!item.absPath && item.path && !item.path.includes('Season')) {
    // Match by folder name (path)
    let match = movies.find(m => m.path && m.path === item.path);
    if (match && match.files && match.files.length > 0) {
      // Always use the first video file's absPath
      const videoFile = match.files.find(f => /\.(mp4|mkv|avi)$/i.test(f.name)) || match.files[0];
      if (videoFile && videoFile.absPath) {
        item.absPath = videoFile.absPath;
        updated++;
      } else {
        console.warn(`No video file with absPath found for: ${item.path}`);
        unmatched++;
      }
    } else {
      console.warn(`No movie match found for: ${item.path}`);
      unmatched++;
    }
  }
  return item;
});

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(watchLater, null, 2), 'utf8');
console.log(`Migration complete! ${updated} entries updated with absPath.`);
if (unmatched > 0) {
  console.warn(`${unmatched} entries could not be matched. Check the warnings above.`);
}
console.log(`Output written to ${OUTPUT_PATH}`);