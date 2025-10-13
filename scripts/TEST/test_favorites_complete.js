/*
  TEST_FAVORITES_COMPLETE.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

console.log('[DEBUG - FAVORITES COMPLETE] Starting complete favorites functionality test...');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager !== 'undefined') {
    const manager = window.mediaLibraryManager;
    console.log('[DEBUG - FAVORITES COMPLETE] ✅ MediaLibraryManager found');
    
    // Test 2: Check current favorites state
    console.log('[DEBUG - FAVORITES COMPLETE] Testing current favorites state...');
    const favorites = manager.getFavoritesList();
    console.log('[DEBUG - FAVORITES COMPLETE] Current favorites:', favorites);
    
    // Test 3: Check heart icon states
    console.log('[DEBUG - FAVORITES COMPLETE] Testing heart icon states...');
    
    // Count TV show cards and their heart states
    const tvCards = document.querySelectorAll('.media-library-tv-card');
    console.log('[DEBUG - FAVORITES COMPLETE] Found TV show cards:', tvCards.length);
    
    tvCards.forEach((card, index) => {
        const path = card.getAttribute('data-path');
        const heartBtn = card.querySelector('.favorite-btn');
        const isFav = manager.isFavorite(path);
        const heartState = heartBtn ? heartBtn.textContent : 'No heart button';
        
        console.log(`[DEBUG - FAVORITES COMPLETE] TV Card ${index + 1}: Path=${path}, IsFavorite=${isFav}, HeartState=${heartState}`);
    });
    
    // Count movie cards and their heart states
    const movieCards = document.querySelectorAll('.media-library-movie-card');
    console.log('[DEBUG - FAVORITES COMPLETE] Found movie cards:', movieCards.length);
    
    movieCards.forEach((card, index) => {
        const path = card.getAttribute('data-path');
        const heartBtn = card.querySelector('.favorite-btn');
        const isFav = manager.isFavorite(path);
        const heartState = heartBtn ? heartBtn.textContent : 'No heart button';
        
        console.log(`[DEBUG - FAVORITES COMPLETE] Movie Card ${index + 1}: Path=${path}, IsFavorite=${isFav}, HeartState=${heartState}`);
    });
    
    // Test 4: Test favorites content rendering
    console.log('[DEBUG - FAVORITES COMPLETE] Testing favorites content rendering...');
    try {
        const favoritesContent = manager.renderFavoritesContent();
        console.log('[DEBUG - FAVORITES COMPLETE] ✅ Favorites content rendered successfully');
        console.log('[DEBUG - FAVORITES COMPLETE] Content length:', favoritesContent.length);
        
        // Check if content contains expected elements
        if (favoritesContent.includes('Favorited MOVIES') && favoritesContent.includes('Favorited TV-SHOWS')) {
            console.log('[DEBUG - FAVORITES COMPLETE] ✅ Favorites content contains expected sections');
        } else {
            console.log('[DEBUG - FAVORITES COMPLETE] ❌ Favorites content missing expected sections');
        }
        
        // Check if content contains actual items
        if (favoritesContent.includes('media-library-movie-card-movies') || favoritesContent.includes('media-library-movie-card-tvshows')) {
            console.log('[DEBUG - FAVORITES COMPLETE] ✅ Favorites content contains favorited items');
        } else {
            console.log('[DEBUG - FAVORITES COMPLETE] ℹ️ Favorites content shows no items (empty state)');
        }
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES COMPLETE] ❌ Error rendering favorites content:', error);
    }
    
    // Test 5: Test localStorage persistence
    console.log('[DEBUG - FAVORITES COMPLETE] Testing localStorage persistence...');
    try {
        const storedFavorites = localStorage.getItem('mediaLibraryFavoritesByType');
        console.log('[DEBUG - FAVORITES COMPLETE] Raw localStorage data:', storedFavorites);
        
        if (storedFavorites) {
            const parsed = JSON.parse(storedFavorites);
            console.log('[DEBUG - FAVORITES COMPLETE] Parsed localStorage data:', parsed);
            console.log('[DEBUG - FAVORITES COMPLETE] Movies in localStorage:', parsed.movies ? parsed.movies.length : 0);
            console.log('[DEBUG - FAVORITES COMPLETE] TV Shows in localStorage:', parsed.tvshows ? parsed.tvshows.length : 0);
        }
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES COMPLETE] ❌ Error reading localStorage:', error);
    }
    
    // Test 6: Test toggleFavorite function
    console.log('[DEBUG - FAVORITES COMPLETE] Testing toggleFavorite function...');
    try {
        // Test with a dummy path
        const testPath = 'test/path/movie.mp4';
        const testType = 'movie';
        console.log('[DEBUG - FAVORITES COMPLETE] Calling toggleFavorite with:', testPath, testType);
        
        // Add to favorites
        manager.toggleFavorite(testPath, testType);
        console.log('[DEBUG - FAVORITES COMPLETE] ✅ Added test item to favorites');
        
        // Check if it was added
        const updatedFavorites = manager.getFavoritesList();
        console.log('[DEBUG - FAVORITES COMPLETE] Updated favorites after adding:', updatedFavorites);
        
        // Remove from favorites
        manager.toggleFavorite(testPath, testType);
        console.log('[DEBUG - FAVORITES COMPLETE] ✅ Removed test item from favorites');
        
        // Check if it was removed
        const finalFavorites = manager.getFavoritesList();
        console.log('[DEBUG - FAVORITES COMPLETE] Final favorites after removing:', finalFavorites);
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES COMPLETE] ❌ Error in toggleFavorite:', error);
    }
    
    // Test 7: Check current tab state
    console.log('[DEBUG - FAVORITES COMPLETE] Current tab state:');
    console.log('[DEBUG - FAVORITES COMPLETE] - Current tab:', manager.currentTab);
    console.log('[DEBUG - FAVORITES COMPLETE] - Current TV show:', manager.currentTVShow);
    console.log('[DEBUG - FAVORITES COMPLETE] - Current TV season:', manager.currentTVSeason);
    
    // Test 8: Check if handlers are properly attached
    console.log('[DEBUG - FAVORITES COMPLETE] Testing handler attachment...');
    try {
        manager.attachTVShowHandlers();
        manager.attachFavoritesHandlers();
        console.log('[DEBUG - FAVORITES COMPLETE] ✅ Handlers attached successfully');
    } catch (error) {
        console.error('[DEBUG - FAVORITES COMPLETE] ❌ Error attaching handlers:', error);
    }
    
} else {
    console.error('[DEBUG - FAVORITES COMPLETE] ❌ MediaLibraryManager not found');
}

console.log('[DEBUG - FAVORITES COMPLETE] Complete test finished'); 