/*
  EXPORT_WATCH_LATER.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Path to your exported raw localStorage JSON
const inputPath = path.join(__dirname, 'watch_later_raw.json');
const outputPath = path.join(__dirname, 'watch_later.json');

// Read the raw JSON string
const raw = fs.readFileSync(inputPath, 'utf-8');

// Parse and validate
let data;
try {
  data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error('Watch Later data is not an array!');
  }
} catch (e) {
  console.error('Failed to parse watch_later_raw.json:', e.message);
  process.exit(1);
}

// Write to watch_later.json (pretty-printed)
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Exported ${data.length} Watch Later entries to ${outputPath}`);
