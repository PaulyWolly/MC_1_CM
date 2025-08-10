/*
  CHECK_JSON_FILES.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Paths to the JSON files
const castFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast.json');
const descFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_descriptions.json');
const posterFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

try {
    // Read the files
    const castData = JSON.parse(fs.readFileSync(castFile, 'utf8'));
    const descData = JSON.parse(fs.readFileSync(descFile, 'utf8'));
    const posterData = JSON.parse(fs.readFileSync(posterFile, 'utf8'));
    
    console.log('JSON Files Analysis:');
    console.log('===================');
    console.log(`Cast file keys: ${Object.keys(castData).length}`);
    console.log(`Description file keys: ${Object.keys(descData).length}`);
    console.log(`Poster file keys: ${Object.keys(posterData).length}`);
    
    console.log('\nSample cast keys:');
    Object.keys(castData).slice(0, 3).forEach(key => console.log(`  ${key}`));
    
    console.log('\nSample description keys:');
    Object.keys(descData).slice(0, 3).forEach(key => console.log(`  ${key}`));
    
    console.log('\nSample poster keys:');
    Object.keys(posterData).slice(0, 3).forEach(key => console.log(`  ${key}`));
    
    // Check if the keys use the same format
    const castKeys = Object.keys(castData);
    const descKeys = Object.keys(descData);
    const posterKeys = Object.keys(posterData);
    
    console.log('\nKey Format Analysis:');
    console.log('===================');
    console.log('Cast keys format:', castKeys[0]);
    console.log('Description keys format:', descKeys[0]);
    console.log('Poster keys format:', posterKeys[0]);
    
} catch (err) {
    console.error('Error:', err.message);
} 