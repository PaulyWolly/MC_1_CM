/*
  CHECK_CLASSIC_MOVIES.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Path to the normalized file
const normalizedFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

// The 6 classic movies you want to process
const classicMovies = [
    'Poltergeist.(1982).[1080p]',
    'The.Day.The.Earth.Stood.Still.(1951).[1080p]',
    'Forbidden.Planet.(1956).[1080p]',
    'Spies.Like.Us.(1985).[1080p]',
    'The.War.Of.The.Worlds.(1953).[1080p]',
    'An.American.Werewolf.In.London.(1981).[1080p]'
];

try {
    // Read the normalized file
    const data = JSON.parse(fs.readFileSync(normalizedFile, 'utf8'));
    
    console.log('Checking if these classic movies exist in normalized file:');
    console.log('=====================================================');
    
    let foundCount = 0;
    classicMovies.forEach(movie => {
        if (data.hasOwnProperty(movie)) {
            console.log(`✅ ${movie}: EXISTS (will be filtered out as "not new")`);
            foundCount++;
        } else {
            console.log(`❌ ${movie}: NOT FOUND (will show as NEW)`);
        }
    });
    
    console.log('\n=====================================================');
    console.log(`Found: ${foundCount} out of ${classicMovies.length} movies`);
    
    if (foundCount > 0) {
        console.log('\nIf you want these movies to show as NEW, we need to remove them from the normalized file.');
        console.log('Run: node scripts/remove_classic_movies.js');
    } else {
        console.log('\nAll movies should show as NEW when you scan!');
    }
    
} catch (err) {
    console.error('Error:', err.message);
} 