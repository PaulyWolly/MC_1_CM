/*
  DEBUG_FAVORITES_DATA.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

// Debug script to check favorites data structure
// Run this in the browser console

console.log('[DEBUG FAVORITES] Checking favorites data structure...');

// Check localStorage favorites
const stored = localStorage.getItem('mediaLibraryFavoritesByType');
console.log('[DEBUG FAVORITES] Raw localStorage data:', stored);

if (stored) {
    try {
        const favorites = JSON.parse(stored);
        console.log('[DEBUG FAVORITES] Parsed favorites:', favorites);
        
        // Check TV shows specifically
        const tvshows = favorites.tvshows || [];
        console.log('[DEBUG FAVORITES] TV shows in favorites:', tvshows);
        
        // Find Glitch specifically
        const glitchFavorites = tvshows.filter(path => 
            path.toLowerCase().includes('glitch')
        );
        console.log('[DEBUG FAVORITES] Glitch-related favorites:', glitchFavorites);
        
        if (glitchFavorites.length > 0) {
            console.log('[DEBUG FAVORITES] Analyzing Glitch favorite path...');
            const glitchPath = glitchFavorites[0];
            console.log('[DEBUG FAVORITES] Glitch path:', glitchPath);
            
            // Extract show name from path
            const pathParts = glitchPath.split(/[\\/]/);
            console.log('[DEBUG FAVORITES] Path parts:', pathParts);
            
            // Find TV-SHOWS directory
            const tvShowsIndex = pathParts.findIndex(part => 
                part.toLowerCase().includes('tv-shows')
            );
            console.log('[DEBUG FAVORITES] TV-SHOWS index:', tvShowsIndex);
            
            if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
                const showName = pathParts[tvShowsIndex + 1];
                console.log('[DEBUG FAVORITES] Extracted show name:', showName);
                
                // Test normalization
                const normalizeKey = window.normalizeKey || ((name) => {
                    return name
                        .replace(/\\/g, '/')
                        .replace(/\s*&\s*/g, '.&.')
                        .replace(/\s+/g, '.')
                        .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
                        .replace(/\.+/g, '.')
                        .replace(/^\.|\.$/g, '');
                });
                
                const normalizedKey = normalizeKey(showName);
                console.log('[DEBUG FAVORITES] Normalized key:', normalizedKey);
                
                // Check if this key exists in TV posters
                if (window.mediaLibraryManager && window.mediaLibraryManager.tvPosters) {
                    const availableKeys = Object.keys(window.mediaLibraryManager.tvPosters);
                    const glitchKeys = availableKeys.filter(key => 
                        key.toLowerCase().includes('glitch')
                    );
                    console.log('[DEBUG FAVORITES] Available Glitch keys in TV posters:', glitchKeys);
                    
                    if (window.mediaLibraryManager.tvPosters[normalizedKey]) {
                        console.log('[DEBUG FAVORITES] ✓ Found poster for normalized key:', window.mediaLibraryManager.tvPosters[normalizedKey]);
                    } else {
                        console.log('[DEBUG FAVORITES] ✗ No poster found for normalized key:', normalizedKey);
                    }
                }
            }
        }
        
    } catch (e) {
        console.error('[DEBUG FAVORITES] Error parsing favorites:', e);
    }
} else {
    console.log('[DEBUG FAVORITES] No favorites found in localStorage');
}

console.log('[DEBUG FAVORITES] Debug complete!'); 