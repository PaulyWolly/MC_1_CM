/*
  TEST_FAVORITES_FUNCTIONALITY.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

console.log('[DEBUG - FAVORITES TEST] Starting favorites functionality test');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager === 'undefined') {
    console.error('[DEBUG - FAVORITES TEST] MediaLibraryManager not found!');
    process.exit(1);
}

const manager = window.mediaLibraryManager;

// Test 2: Check favorites storage
console.log('[DEBUG - FAVORITES TEST] Testing favorites storage...');
const favorites = manager.getFavoritesList();
console.log('[DEBUG - FAVORITES TEST] Current favorites:', favorites);

// Test 3: Check if favorites content renders correctly
console.log('[DEBUG - FAVORITES TEST] Testing favorites content rendering...');
const favoritesContent = manager.renderFavoritesContent();
console.log('[DEBUG - FAVORITES TEST] Favorites content length:', favoritesContent.length);
console.log('[DEBUG - FAVORITES TEST] Favorites content preview:', favoritesContent.substring(0, 200));

// Test 4: Check tab switching logic
console.log('[DEBUG - FAVORITES TEST] Testing tab switching...');
console.log('[DEBUG - FAVORITES TEST] Current tab before switch:', manager.currentTab);

// Test 5: Check if there are duplicate renderFavoritesContent functions
console.log('[DEBUG - FAVORITES TEST] Checking for duplicate functions...');
const functionCount = manager.renderFavoritesContent.toString().split('renderFavoritesContent').length - 1;
console.log('[DEBUG - FAVORITES TEST] renderFavoritesContent function count:', functionCount);

// Test 6: Check TV show handlers
console.log('[DEBUG - FAVORITES TEST] Testing TV show handlers...');
const tvShows = manager.getTVShows();
console.log('[DEBUG - FAVORITES TEST] TV shows count:', tvShows.length);

// Test 7: Check if favorites handlers are properly attached
console.log('[DEBUG - FAVORITES TEST] Testing favorites handlers...');
try {
    manager.attachFavoritesHandlers();
    console.log('[DEBUG - FAVORITES TEST] Favorites handlers attached successfully');
} catch (error) {
    console.error('[DEBUG - FAVORITES TEST] Error attaching favorites handlers:', error);
}

// Test 8: Check if TV show handlers are properly attached
console.log('[DEBUG - FAVORITES TEST] Testing TV show handlers...');
try {
    manager.attachTVShowHandlers();
    console.log('[DEBUG - FAVORITES TEST] TV show handlers attached successfully');
} catch (error) {
    console.error('[DEBUG - FAVORITES TEST] Error attaching TV show handlers:', error);
}

console.log('[DEBUG - FAVORITES TEST] Test completed'); 