/*
  TEST_GLITCH_POSTER_LOOKUP.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

// Test script to simulate Glitch poster lookup
const fs = require('fs');
const path = require('path');

console.log('[DEBUG GLITCH] Testing Glitch poster lookup process...');

// Load TV posters data
const tvPostersPath = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json');
const tvPostersData = JSON.parse(fs.readFileSync(tvPostersPath, 'utf8'));

// Simulate the normalizeKey function from the code
const normalizeKey = (name) => {
    return name
        .replace(/\\/g, '/')
        .replace(/\s*&\s*/g, '.&.') // preserve ampersand as dot-ampersand-dot
        .replace(/\s+/g, '.')
        .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');
};

// Simulate the getTVShowPosterPath logic
function simulateGetTVShowPosterPath(mediaItem) {
    console.log('[DEBUG GLITCH] Input mediaItem:', mediaItem);
    
    if (!mediaItem) {
        console.log('[DEBUG GLITCH] No mediaItem provided');
        return '/assets/img/placeholder-poster.jpg';
    }
    
    const posterMap = tvPostersData;
    
    if (!posterMap) {
        console.log('[DEBUG GLITCH] No TV poster map available');
        return '/assets/img/placeholder-poster.jpg';
    }
    
    // For TV-Shows, prefer the name property, then fallback to path extraction
    let showName = mediaItem.name || mediaItem.title || mediaItem.filename;
    console.log('[DEBUG GLITCH] Initial showName from properties:', showName);
    
    if (!showName && mediaItem.path) {
        // Extract show name from path (e.g., "TV-SHOWS/Daisy Jones & The Six" -> "Daisy Jones & The Six")
        showName = mediaItem.path.split(/[\\/]/).pop();
        console.log('[DEBUG GLITCH] showName from path.split().pop():', showName);
    }
    
    // If we still don't have a show name, try to extract from the full path
    if (!showName && mediaItem.path) {
        // Look for TV-SHOWS directory and get the show name from there
        const pathParts = mediaItem.path.split(/[\\/]/);
        const tvShowsIndex = pathParts.findIndex(part => part.toLowerCase().includes('tv-shows'));
        if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
            showName = pathParts[tvShowsIndex + 1];
            console.log('[DEBUG GLITCH] showName from TV-SHOWS directory lookup:', showName);
        }
    }
    
    if (!showName) {
        console.log('[DEBUG GLITCH] No show name found for TV show');
        return '/assets/img/placeholder-poster.jpg';
    }
    
    const dotKey = normalizeKey(showName);
    console.log('[DEBUG GLITCH] Normalized dotKey:', dotKey, 'for show:', showName);
    
    // Try exact match first
    if (posterMap[dotKey]) {
        let url = posterMap[dotKey];
        console.log('[DEBUG GLITCH] Found TV poster with exact match:', url);
        return url;
    }
    
    // Case-insensitive fallback
    const lowerDotKey = dotKey.toLowerCase();
    for (const key of Object.keys(posterMap)) {
        if (key.toLowerCase() === lowerDotKey) {
            let url = posterMap[key];
            console.log('[DEBUG GLITCH] Found TV poster with case-insensitive match:', url);
            return url;
        }
    }
    
    // Log a warning if no poster found
    console.log('[DEBUG GLITCH] No TV poster found for:', mediaItem, 'Tried dot notation key:', dotKey);
    console.log('[DEBUG GLITCH] Available TV poster keys containing "glitch":', 
        Object.keys(posterMap).filter(key => key.toLowerCase().includes('glitch')));
    return '/assets/img/placeholder-poster.jpg';
}

// Test different scenarios
console.log('\n=== TESTING DIFFERENT SCENARIOS ===');

// Test 1: Direct name
console.log('\n[DEBUG GLITCH] Test 1: Direct name');
const result1 = simulateGetTVShowPosterPath({ name: 'Glitch (2015)' });

// Test 2: Path-based extraction
console.log('\n[DEBUG GLITCH] Test 2: Path-based extraction');
const result2 = simulateGetTVShowPosterPath({ path: 'TV-SHOWS/Glitch (2015)' });

// Test 3: Full path with nested structure
console.log('\n[DEBUG GLITCH] Test 3: Full path with nested structure');
const result3 = simulateGetTVShowPosterPath({ path: 'C:/Users/pwelb/projects/_NODE_/_MULTICHAT_/6-4-2025_clone/public/assets/video/TV-SHOWS/Glitch (2015)' });

// Test 4: Just the folder name
console.log('\n[DEBUG GLITCH] Test 4: Just the folder name');
const result4 = simulateGetTVShowPosterPath({ name: 'Glitch' });

console.log('\n=== RESULTS SUMMARY ===');
console.log('[DEBUG GLITCH] Test 1 result:', result1);
console.log('[DEBUG GLITCH] Test 2 result:', result2);
console.log('[DEBUG GLITCH] Test 3 result:', result3);
console.log('[DEBUG GLITCH] Test 4 result:', result4); 