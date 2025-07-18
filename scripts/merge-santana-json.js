/*
  MERGE-SANTANA-JSON.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

// Usage: node merge-santana-json.js input.json output.json
const fs = require('fs');

if (process.argv.length < 4) {
  console.error('Usage: node merge-santana-json.js input.json output.json');
  process.exit(1);
}

const [inputFile, outputFile] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Find the two entries
const capital = data.find(d => d.displayName === 'Santana');
const lower = data.find(d => d.displayName === 'santana');

if (!capital || !lower) {
  console.error('Could not find both "Santana" and "santana" entries!');
  process.exit(1);
}

// Merge cacheKeys
capital.cacheKeys = Array.from(new Set([...(capital.cacheKeys || []), ...(lower.cacheKeys || [])]));

// Merge videos if present
if (lower.videos && lower.videos.length > 0) {
  capital.videos = (capital.videos || []).concat(lower.videos);
  // Remove duplicate videos by videoId
  const seen = new Set();
  capital.videos = capital.videos.filter(v => {
    if (!seen.has(v.videoId)) {
      seen.add(v.videoId);
      return true;
    }
    return false;
  });
  capital.videoCount = capital.videos.length;
} else {
  capital.videoCount = lower.videoCount;
}

// Remove the lowercase entry
const newData = data.filter(d => d.displayName !== 'santana');

fs.writeFileSync(outputFile, JSON.stringify(newData, null, 2));
console.log('Merged "santana" into "Santana" and wrote', outputFile); 