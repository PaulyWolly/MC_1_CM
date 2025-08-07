/*
  DEBUG_GLITCH_POSTER_NODE.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

// Debug script to check why Glitch TV show shows placeholder
// Node.js version to check the data files directly

const fs = require('fs');
const path = require('path');

console.log('[DEBUG GLITCH] Checking Glitch TV show poster issue...');

// Path to TV posters data
const tvPostersPath = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json');

try {
    // Check if file exists
    if (!fs.existsSync(tvPostersPath)) {
        console.error('[DEBUG GLITCH] TV posters file not found:', tvPostersPath);
        process.exit(1);
    }
    
    console.log('[DEBUG GLITCH] TV posters file found ✓');
    
    // Load TV posters data
    const tvPostersData = JSON.parse(fs.readFileSync(tvPostersPath, 'utf8'));
    console.log('[DEBUG GLITCH] TV posters loaded ✓');
    
    // Test 1: Check TV posters mapping
    console.log('\n=== TV POSTERS MAPPING ===');
    const posterKeys = Object.keys(tvPostersData);
    console.log('[DEBUG GLITCH] Total TV posters available:', posterKeys.length);
    
    // Test 2: Check for Glitch entries
    const glitchKeys = posterKeys.filter(key => 
        key.toLowerCase().includes('glitch')
    );
    console.log('[DEBUG GLITCH] Glitch-related keys found:', glitchKeys);
    
    // Test 3: Test normalization function
    console.log('\n=== NORMALIZATION TEST ===');
    const normalizeKey = (name) => {
        return name
            .replace(/\\/g, '/')
            .replace(/\s*&\s*/g, '.&.') // preserve ampersand as dot-ampersand-dot
            .replace(/\s+/g, '.')
            .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
            .replace(/\.+/g, '.')
            .replace(/^\.|\.$/g, '');
    };
    
    const testNames = ['Glitch', 'Glitch (2015)', 'Glitch.(2015)', 'Glitch..(2015)'];
    testNames.forEach(name => {
        const normalized = normalizeKey(name);
        console.log(`[DEBUG GLITCH] "${name}" -> "${normalized}"`);
        console.log(`[DEBUG GLITCH] Has poster: ${tvPostersData[normalized] ? 'YES' : 'NO'}`);
        if (tvPostersData[normalized]) {
            console.log(`[DEBUG GLITCH] Poster path: ${tvPostersData[normalized]}`);
        }
    });
    
    // Test 4: Check favorites data from localStorage backup
    console.log('\n=== FAVORITES DATA ===');
    const localStoragePath = path.join(__dirname, 'localStorage-cache.json');
    if (fs.existsSync(localStoragePath)) {
        const localStorageData = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
        const favorites = localStorageData.favorites || [];
        const glitchFavorites = favorites.filter(fav => 
            fav.toLowerCase().includes('glitch') || 
            (fav.toLowerCase().includes('tv-shows') && fav.toLowerCase().includes('glitch'))
        );
        console.log('[DEBUG GLITCH] Glitch favorites found:', glitchFavorites);
        
        if (glitchFavorites.length > 0) {
            console.log('[DEBUG GLITCH] First Glitch favorite details:');
            const glitchFav = glitchFavorites[0];
            console.log('[DEBUG GLITCH] Full path:', glitchFav);
            
            // Extract show name from path
            const pathParts = glitchFav.split('/');
            const showFolder = pathParts[pathParts.length - 1];
            console.log('[DEBUG GLITCH] Show folder:', showFolder);
            
            // Test normalization on the show folder
            const normalizedShow = normalizeKey(showFolder);
            console.log('[DEBUG GLITCH] Normalized show name:', normalizedShow);
            console.log('[DEBUG GLITCH] Has poster for normalized name:', !!tvPostersData[normalizedShow]);
        }
    } else {
        console.log('[DEBUG GLITCH] localStorage-cache.json not found');
    }
    
    // Test 5: Check media library data
    console.log('\n=== MEDIA LIBRARY DATA ===');
    const mediaLibraryPath = path.join(__dirname, '../server/data/media-library-tv-shows.json');
    if (fs.existsSync(mediaLibraryPath)) {
        const mediaLibraryData = JSON.parse(fs.readFileSync(mediaLibraryPath, 'utf8'));
        const glitchShows = Object.keys(mediaLibraryData).filter(key => 
            key.toLowerCase().includes('glitch')
        );
        console.log('[DEBUG GLITCH] Glitch shows in media library:', glitchShows);
        
        if (glitchShows.length > 0) {
            console.log('[DEBUG GLITCH] First Glitch show details:');
            const glitchShow = glitchShows[0];
            console.log('[DEBUG GLITCH] Show key:', glitchShow);
            console.log('[DEBUG GLITCH] Show data:', JSON.stringify(mediaLibraryData[glitchShow], null, 2));
        }
    } else {
        console.log('[DEBUG GLITCH] media-library-tv-shows.json not found');
    }
    
    console.log('\n[DEBUG GLITCH] Debug complete!');
    
} catch (error) {
    console.error('[DEBUG GLITCH] Error:', error.message);
    process.exit(1);
} 