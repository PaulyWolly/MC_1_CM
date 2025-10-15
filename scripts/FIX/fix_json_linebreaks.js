/*
  FIX_JSON_LINEBREAKS.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

// This script repairs movie_posters.json by removing line breaks inside keys/values
// and outputs a valid JSON file as movie_posters.fixed.json
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
const outputPath = path.join(__dirname, '../public/components/MediaLibrary/data/movie_posters.fixed.json');

// Read the file as a single string
let raw = fs.readFileSync(inputPath, 'utf8');

// Remove all line breaks between quotes (inside keys/values)
// This regex replaces newlines that are inside double quotes
raw = raw.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"\s*\n\s*"/g, '"$1""'); // join split quoted strings
raw = raw.replace(/\n/g, ''); // remove any remaining newlines

// Try to parse the repaired string as JSON
let obj;
try {
  obj = JSON.parse(raw);
} catch (e) {
  console.error('Failed to parse repaired JSON:', e);
  process.exit(1);
}

// Write the fixed JSON file
fs.writeFileSync(outputPath, JSON.stringify(obj, null, 2));
console.log('✅ Fixed JSON written to', outputPath); 