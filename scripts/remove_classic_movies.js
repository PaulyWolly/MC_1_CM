/*
  REMOVE_CLASSIC_MOVIES.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
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
    // Read the current normalized file
    console.log('Reading normalized file...');
    const data = JSON.parse(fs.readFileSync(normalizedFile, 'utf8'));
    
    console.log(`Original count: ${Object.keys(data).length} movies`);
    
    // Remove the classic movies
    let removedCount = 0;
    classicMovies.forEach(movie => {
        if (data.hasOwnProperty(movie)) {
            delete data[movie];
            removedCount++;
            console.log(`Removed: ${movie}`);
        } else {
            console.log(`Not found (already new): ${movie}`);
        }
    });
    
    // Write back the updated file
    fs.writeFileSync(normalizedFile, JSON.stringify(data, null, 2));
    
    console.log(`\nRemoved ${removedCount} movies from normalized file`);
    console.log(`New count: ${Object.keys(data).length} movies`);
    console.log('\nAll 6 classic movies will now show up as NEW when you scan!');
    console.log('\nNow try clicking "Scan for New Movies" in the MediaManager.');
    
} catch (err) {
    console.error('Error:', err.message);
} 