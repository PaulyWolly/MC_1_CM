/*
  TEST_FAVORITES_DEBUG.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

console.log('[DEBUG - FAVORITES DEBUG] Starting comprehensive favorites debug test...');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager !== 'undefined') {
    const manager = window.mediaLibraryManager;
    console.log('[DEBUG - FAVORITES DEBUG] ✅ MediaLibraryManager found');
    
    // Test 2: Check favorites storage
    console.log('[DEBUG - FAVORITES DEBUG] Testing favorites storage...');
    const favorites = manager.getFavoritesList();
    console.log('[DEBUG - FAVORITES DEBUG] Current favorites:', favorites);
    
    // Test 3: Check if toggleFavorite function works
    console.log('[DEBUG - FAVORITES DEBUG] Testing toggleFavorite function...');
    try {
        // Test with a dummy path
        const testPath = 'test/path/movie.mp4';
        const testType = 'movie';
        console.log('[DEBUG - FAVORITES DEBUG] Calling toggleFavorite with:', testPath, testType);
        manager.toggleFavorite(testPath, testType);
        console.log('[DEBUG - FAVORITES DEBUG] ✅ toggleFavorite executed successfully');
        
        // Check if it was added
        const updatedFavorites = manager.getFavoritesList();
        console.log('[DEBUG - FAVORITES DEBUG] Updated favorites:', updatedFavorites);
        
        // Remove the test item
        manager.toggleFavorite(testPath, testType);
        console.log('[DEBUG - FAVORITES DEBUG] ✅ Test item removed successfully');
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES DEBUG] ❌ Error in toggleFavorite:', error);
    }
    
    // Test 4: Check favorites content rendering
    console.log('[DEBUG - FAVORITES DEBUG] Testing favorites content rendering...');
    try {
        const favoritesContent = manager.renderFavoritesContent();
        console.log('[DEBUG - FAVORITES DEBUG] ✅ Favorites content rendered successfully');
        console.log('[DEBUG - FAVORITES DEBUG] Content length:', favoritesContent.length);
        
        // Check if content contains expected elements
        if (favoritesContent.includes('Favorited MOVIES') && favoritesContent.includes('Favorited TV-SHOWS')) {
            console.log('[DEBUG - FAVORITES DEBUG] ✅ Favorites content contains expected sections');
        } else {
            console.log('[DEBUG - FAVORITES DEBUG] ❌ Favorites content missing expected sections');
        }
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES DEBUG] ❌ Error rendering favorites content:', error);
    }
    
    // Test 5: Check TV show handlers
    console.log('[DEBUG - FAVORITES DEBUG] Testing TV show handlers...');
    try {
        manager.attachTVShowHandlers();
        console.log('[DEBUG - FAVORITES DEBUG] ✅ TV show handlers attached successfully');
        
        // Count TV show cards
        const tvCards = document.querySelectorAll('.media-library-tv-card[data-path]');
        console.log('[DEBUG - FAVORITES DEBUG] Found TV show cards:', tvCards.length);
        
        // Count favorite buttons
        const favoriteBtns = document.querySelectorAll('.media-library-tv-card .favorite-btn');
        console.log('[DEBUG - FAVORITES DEBUG] Found favorite buttons:', favoriteBtns.length);
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES DEBUG] ❌ Error with TV show handlers:', error);
    }
    
    // Test 6: Check favorites handlers
    console.log('[DEBUG - FAVORITES DEBUG] Testing favorites handlers...');
    try {
        manager.attachFavoritesHandlers();
        console.log('[DEBUG - FAVORITES DEBUG] ✅ Favorites handlers attached successfully');
        
        // Count favorites cards
        const movieCards = document.querySelectorAll('.media-library-movie-card-movies');
        const tvCards = document.querySelectorAll('.media-library-movie-card-tvshows');
        console.log('[DEBUG - FAVORITES DEBUG] Found favorites movie cards:', movieCards.length);
        console.log('[DEBUG - FAVORITES DEBUG] Found favorites TV cards:', tvCards.length);
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES DEBUG] ❌ Error with favorites handlers:', error);
    }
    
    // Test 7: Check localStorage
    console.log('[DEBUG - FAVORITES DEBUG] Testing localStorage...');
    try {
        const storedFavorites = localStorage.getItem('mediaLibraryFavoritesByType');
        console.log('[DEBUG - FAVORITES DEBUG] Raw localStorage data:', storedFavorites);
        
        if (storedFavorites) {
            const parsed = JSON.parse(storedFavorites);
            console.log('[DEBUG - FAVORITES DEBUG] Parsed localStorage data:', parsed);
        }
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES DEBUG] ❌ Error reading localStorage:', error);
    }
    
    // Test 8: Check current tab state
    console.log('[DEBUG - FAVORITES DEBUG] Current tab:', manager.currentTab);
    console.log('[DEBUG - FAVORITES DEBUG] Current TV show:', manager.currentTVShow);
    console.log('[DEBUG - FAVORITES DEBUG] Current TV season:', manager.currentTVSeason);
    
} else {
    console.error('[DEBUG - FAVORITES DEBUG] ❌ MediaLibraryManager not found');
}

console.log('[DEBUG - FAVORITES DEBUG] Debug test completed'); 