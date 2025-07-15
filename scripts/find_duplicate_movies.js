/*
  FIND_DUPLICATE_MOVIES.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Path to your movies JSON
const MOVIES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');

function normalizeTitle(title) {
  // Remove all punctuation, collapse spaces, lowercase
  return title
    ? title
        .replace(/[^a-zA-Z0-9 ]/g, ' ') // remove punctuation (including dots)
        .replace(/\s+/g, ' ') // collapse spaces
        .trim()
        .toLowerCase()
    : '';
}

function hasDots(title) {
  return title && /\./.test(title);
}

function main() {
  if (!fs.existsSync(MOVIES_JSON)) {
    console.error('File not found:', MOVIES_JSON);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
  const movies = Array.isArray(data.folders) ? data.folders : [];
  if (!Array.isArray(movies) || movies.length === 0) {
    console.error('Could not find movies array in JSON (expected at data.folders).');
    process.exit(1);
  }

  const groups = {};
  const ghosts = [];

  movies.forEach((movie, idx) => {
    const rawTitle = movie.path || '';
    const normTitle = normalizeTitle(rawTitle);
    // Ghost if no normalized title or no files
    if (!normTitle || !Array.isArray(movie.files) || movie.files.length === 0) {
      ghosts.push({ idx, movie });
    }
    if (!groups[normTitle]) groups[normTitle] = [];
    groups[normTitle].push({ idx, movie, rawTitle });
  });

  console.log('--- Dotified/Near-Duplicate Movies by Normalized Title ---');
  let foundDotified = false;
  for (const [normTitle, entries] of Object.entries(groups)) {
    if (entries.length > 1) {
      // Only report if at least one entry uses dots
      const hasDot = entries.some(e => hasDots(e.rawTitle));
      if (hasDot) {
        foundDotified = true;
        console.log(`\nNormalized Title: '${normTitle}' (${entries.length} entries)`);
        entries.forEach(({ idx, movie, rawTitle }) => {
          console.log(`  [${idx}]`, rawTitle, '| Files:', (movie.files || []).map(f => f.name).join(', '));
        });
      }
    }
  }
  if (!foundDotified) console.log('No dotified/near-duplicate entries found.');

  console.log('\n--- Ghost/Incomplete Entries ---');
  if (ghosts.length) {
    ghosts.forEach(({ idx, movie }) => {
      console.log(`[${idx}]`, movie.path, '| Files:', (movie.files || []).map(f => f.name).join(', '));
    });
  } else {
    console.log('No ghost/incomplete entries found.');
  }
}

main(); 