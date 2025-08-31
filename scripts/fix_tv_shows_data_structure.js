/*
  FIX_TV_SHOWS_DATA_STRUCTURE.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Path to the TV shows data file
const tvShowsPath = path.join(__dirname, '../public/components/MediaLibrary/data/media-library-tv-shows_normalized.json');

console.log('🔧 Fixing TV shows data structure...');

try {
    // Read the current TV shows data
    const tvShowsData = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
    
    console.log('📊 Current data type:', Array.isArray(tvShowsData) ? 'Array' : 'Object');
    console.log('📊 Current data length:', Array.isArray(tvShowsData) ? tvShowsData.length : Object.keys(tvShowsData).length);
    
    let showsArray;
    
    // Convert object with numeric keys to array if needed
    if (!Array.isArray(tvShowsData)) {
        console.log('🔄 Converting object to array...');
        showsArray = Object.values(tvShowsData);
    } else {
        showsArray = tvShowsData;
    }
    
    console.log('📊 Array length after conversion:', showsArray.length);
    
    // Fix any shows with undefined titles
    let fixedCount = 0;
    showsArray.forEach((show, index) => {
        if (!show.title || show.title === 'undefined') {
            // Try to extract title from folder name
            if (show.folder && show.folder.name) {
                show.title = show.folder.name;
                fixedCount++;
                console.log(`✅ Fixed title for show ${index}: "${show.title}"`);
            } else if (show.name) {
                show.title = show.name;
                fixedCount++;
                console.log(`✅ Fixed title for show ${index}: "${show.title}"`);
            } else {
                console.log(`⚠️  Could not fix title for show ${index}:`, show);
            }
        }
        
        // Ensure required properties exist
        if (!show.name && show.title) {
            show.name = show.title;
        }
        
        if (!show.folder) {
            show.folder = {};
        }
        
        if (!show.folder.path && show.path) {
            show.folder.path = show.path;
        }
        
        if (!show.folder.name && show.title) {
            show.folder.name = show.title;
        }
    });
    
    console.log(`🔧 Fixed ${fixedCount} shows with missing titles`);
    
    // Save as array
    fs.writeFileSync(tvShowsPath, JSON.stringify(showsArray, null, 2));
    
    console.log('✅ TV shows data structure fixed!');
    console.log('📊 Final array length:', showsArray.length);
    
    // Show first few shows for verification
    console.log('\n📋 First 3 shows:');
    showsArray.slice(0, 3).forEach((show, index) => {
        console.log(`  ${index + 1}. Title: "${show.title}" | Name: "${show.name}" | Episodes: ${show.episodes ? show.episodes.length : 0}`);
    });
    
} catch (error) {
    console.error('❌ Error fixing TV shows data structure:', error.message);
    process.exit(1);
} 