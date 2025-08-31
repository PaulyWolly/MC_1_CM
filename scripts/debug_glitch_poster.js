/*
  DEBUG_GLITCH_POSTER.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

// Debug script to check why Glitch TV show shows placeholder
// Run this in the browser console

console.log('[DEBUG GLITCH] Checking Glitch TV show poster issue...');

if (!window.mediaLibraryManager) {
    console.error('[DEBUG GLITCH] mediaLibraryManager not found!');
} else {
    console.log('[DEBUG GLITCH] mediaLibraryManager found ✓');
    
    // Test 1: Check TV posters mapping
    console.log('\n=== TV POSTERS MAPPING ===');
    console.log('[DEBUG GLITCH] TV posters available:', Object.keys(window.mediaLibraryManager.tvPosters || {}));
    
    // Test 2: Check for Glitch entries
    const glitchKeys = Object.keys(window.mediaLibraryManager.tvPosters || {}).filter(key => 
        key.toLowerCase().includes('glitch')
    );
    console.log('[DEBUG GLITCH] Glitch-related keys found:', glitchKeys);
    
    // Test 3: Test normalization
    console.log('\n=== NORMALIZATION TEST ===');
    const normalizeKey = window.normalizeKey || ((name) => {
        return name
            .replace(/\\/g, '/')
            .replace(/\s*&\s*/g, '.&.') // preserve ampersand as dot-ampersand-dot
            .replace(/\s+/g, '.')
            .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
            .replace(/\.+/g, '.')
            .replace(/^\.|\.$/g, '');
    });
    
    const testNames = ['Glitch', 'Glitch (2015)', 'Glitch.(2015)'];
    testNames.forEach(name => {
        const normalized = normalizeKey(name);
        console.log(`[DEBUG GLITCH] "${name}" -> "${normalized}"`);
    });
    
    // Test 4: Check favorites data
    console.log('\n=== FAVORITES DATA ===');
    const favorites = window.mediaLibraryManager.getFavoritesList();
    const glitchFavorites = favorites.filter(fav => 
        fav.toLowerCase().includes('glitch') || 
        fav.toLowerCase().includes('tv-shows') && fav.toLowerCase().includes('glitch')
    );
    console.log('[DEBUG GLITCH] Glitch favorites found:', glitchFavorites);
    
    // Test 5: Test getPosterPath with different inputs
    console.log('\n=== GETPOSTERPATH TEST ===');
    const testItems = [
        { name: 'Glitch', path: 'Glitch' },
        { name: 'Glitch (2015)', path: 'Glitch (2015)' },
        { name: 'Glitch.(2015)', path: 'Glitch.(2015)' },
        { path: 'Glitch' },
        { path: 'Glitch (2015)' }
    ];
    
    testItems.forEach((item, index) => {
        console.log(`[DEBUG GLITCH] Test ${index + 1}:`, item);
        const poster = window.mediaLibraryManager.getPosterPath(item);
        console.log(`[DEBUG GLITCH] Result: ${poster}`);
    });
    
    // Test 6: Check current tab and poster map
    console.log('\n=== CURRENT STATE ===');
    console.log('[DEBUG GLITCH] Current tab:', window.mediaLibraryManager.currentTab);
    console.log('[DEBUG GLITCH] TV posters loaded:', !!window.mediaLibraryManager.tvPosters);
    console.log('[DEBUG GLITCH] TV posters count:', Object.keys(window.mediaLibraryManager.tvPosters || {}).length);
    
    console.log('\n[DEBUG GLITCH] Debug complete!');
} 