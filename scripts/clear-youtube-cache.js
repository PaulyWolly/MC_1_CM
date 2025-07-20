/*
  CLEAR-YOUTUBE-CACHE.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

#!/usr/bin/env node

/**
 * Clear YouTube Cache Script
 * 
 * This script clears all YouTube-related cache from localStorage
 * to start fresh with the new cache key format and MongoDB storage system.
 */

console.log('🧹 [CLEAR-CACHE] Starting YouTube cache cleanup...');

// This script is designed to run in the browser console
// Copy and paste this function into your browser console:

const clearYouTubeCache = () => {
    console.log('🧹 [CLEAR-CACHE] Starting YouTube cache cleanup...');
    
    let clearedCount = 0;
    const keysToRemove = [];
    
    // Find all YouTube cache keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('yt_')) {
            keysToRemove.push(key);
        }
    }
    
    console.log(`🔍 [CLEAR-CACHE] Found ${keysToRemove.length} YouTube cache keys to remove`);
    
    // Remove all YouTube cache keys
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        clearedCount++;
        console.log(`🗑️ [CLEAR-CACHE] Removed: ${key}`);
    });
    
    // Also clear any YouTube-related session storage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('youtube') || key.includes('nextPageToken'))) {
            sessionKeysToRemove.push(key);
        }
    }
    
    sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️ [CLEAR-SESSION] Removed: ${key}`);
    });
    
    console.log(`✅ [CLEAR-CACHE] Successfully cleared ${clearedCount} localStorage keys and ${sessionKeysToRemove.length} sessionStorage keys`);
    console.log('🎉 [CLEAR-CACHE] YouTube cache is now completely clean!');
    console.log('💡 [CLEAR-CACHE] All future searches will use fresh API calls and the new MongoDB storage system');
    
    return {
        localStorageCleared: clearedCount,
        sessionStorageCleared: sessionKeysToRemove.length,
        totalCleared: clearedCount + sessionKeysToRemove.length
    };
};

// For browser console usage
if (typeof window !== 'undefined') {
    window.clearYouTubeCache = clearYouTubeCache;
    console.log('💡 [SETUP] Function available as window.clearYouTubeCache()');
}

// For Node.js usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = clearYouTubeCache;
}

console.log(`
🧹 YOUTUBE CACHE CLEANER
========================

To clear all YouTube cache, run this in your browser console:

clearYouTubeCache();

This will:
✅ Remove all yt_* keys from localStorage
✅ Remove YouTube-related sessionStorage keys  
✅ Give you a fresh start with the new system
✅ All future searches will use MongoDB storage

After clearing, your dropdown will show "DB" entries which will make fresh API calls when clicked.
`); 