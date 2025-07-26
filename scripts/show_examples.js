/*
  SHOW_EXAMPLES.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Path to the normalized file
const normalizedFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

// The 6 classic movies
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
    
    // Get all keys
    const allKeys = Object.keys(data);
    
    // Filter out the classic movies
    const nonClassicMovies = allKeys.filter(key => !classicMovies.includes(key));
    
    console.log('5 examples of movies in JSON (NOT your 6 classic movies):');
    console.log('=====================================================');
    
    nonClassicMovies.slice(0, 5).forEach(movie => {
        console.log('  ' + movie);
    });
    
    console.log('\nTotal movies in JSON:', allKeys.length);
    console.log('Non-classic movies in JSON:', nonClassicMovies.length);
    
} catch (err) {
    console.error('Error:', err.message);
} 