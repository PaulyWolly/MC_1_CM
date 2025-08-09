/*
  REMOVE_MOVIES_FROM_NORMALIZED.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Path to the normalized file
const normalizedFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

// Movies to remove (so they show up as NEW)
const moviesToRemove = [
    'About.Time.(2013).[1080p]',
    'Click.(2006).[1080p]', 
    'The.Fifth.Element.Remastered.(1997).[1080p]',
    'Tombstone.(1993).[1080p]',
    'Under.Siege.(1992).[1080p]'
];

try {
    // Read the current normalized file
    console.log('Reading normalized file...');
    const data = JSON.parse(fs.readFileSync(normalizedFile, 'utf8'));
    
    console.log(`Original count: ${Object.keys(data).length} movies`);
    
    // Check which movies exist
    console.log('\nChecking which movies exist in normalized file:');
    moviesToRemove.forEach(movie => {
        console.log(`${movie}: ${data.hasOwnProperty(movie) ? 'EXISTS' : 'NOT FOUND'}`);
    });
    
    // Remove the movies
    let removedCount = 0;
    moviesToRemove.forEach(movie => {
        if (data.hasOwnProperty(movie)) {
            delete data[movie];
            removedCount++;
            console.log(`Removed: ${movie}`);
        } else {
            console.log(`Not found: ${movie}`);
        }
    });
    
    // Write back the updated file
    fs.writeFileSync(normalizedFile, JSON.stringify(data, null, 2));
    
    console.log(`\nRemoved ${removedCount} movies from normalized file`);
    console.log(`New count: ${Object.keys(data).length} movies`);
    console.log('\nThese movies will now show up as NEW when you scan!');
    
} catch (err) {
    console.error('Error:', err.message);
} 