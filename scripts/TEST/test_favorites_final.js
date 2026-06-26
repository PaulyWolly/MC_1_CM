/*
  TEST_FAVORITES_FINAL.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

console.log('[DEBUG - FAVORITES FINAL] Starting final favorites functionality test...');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager !== 'undefined') {
    const manager = window.mediaLibraryManager;
    console.log('[DEBUG - FAVORITES FINAL] ✅ MediaLibraryManager found');
    
    // Test 2: Check current favorites state
    console.log('[DEBUG - FAVORITES FINAL] Testing current favorites state...');
    const favorites = manager.getFavoritesList();
    console.log('[DEBUG - FAVORITES FINAL] Current favorites:', favorites);
    
    // Test 3: Check heart icon states in TV-SHOWS tab
    console.log('[DEBUG - FAVORITES FINAL] Testing heart icon states in TV-SHOWS...');
    
    // Count TV show cards and their heart states
    const tvCards = document.querySelectorAll('.media-library-tv-card');
    console.log('[DEBUG - FAVORITES FINAL] Found TV show cards:', tvCards.length);
    
    let redHearts = 0;
    let whiteHearts = 0;
    
    tvCards.forEach((card, index) => {
        const path = card.getAttribute('data-path');
        const heartBtn = card.querySelector('.favorite-btn');
        const isFav = manager.isFavorite(path);
        const heartState = heartBtn ? heartBtn.textContent : 'No heart button';
        
        if (heartState === '❤️') redHearts++;
        if (heartState === '🩷') whiteHearts++;
        
        console.log(`[DEBUG - FAVORITES FINAL] TV Card ${index + 1}: Path=${path}, IsFavorite=${isFav}, HeartState=${heartState}`);
    });
    
    console.log(`[DEBUG - FAVORITES FINAL] Heart summary - Red: ${redHearts}, White: ${whiteHearts}`);
    
    if (whiteHearts > 0 && redHearts === 0) {
        console.log('[DEBUG - FAVORITES FINAL] ✅ All heart icons are correctly white by default');
    } else {
        console.log('[DEBUG - FAVORITES FINAL] ❌ Heart icons are not all white by default');
    }
    
    // Test 4: Test favorites content rendering
    console.log('[DEBUG - FAVORITES FINAL] Testing favorites content rendering...');
    try {
        const favoritesContent = manager.renderFavoritesContent();
        console.log('[DEBUG - FAVORITES FINAL] ✅ Favorites content rendered successfully');
        console.log('[DEBUG - FAVORITES FINAL] Content length:', favoritesContent.length);
        
        // Check if content contains expected elements
        if (favoritesContent.includes('Favorited MOVIES') && favoritesContent.includes('Favorited TV-SHOWS')) {
            console.log('[DEBUG - FAVORITES FINAL] ✅ Favorites content contains expected sections');
        } else {
            console.log('[DEBUG - FAVORITES FINAL] ❌ Favorites content missing expected sections');
        }
        
        // Check if content contains actual items
        if (favoritesContent.includes('media-library-movie-card-movies') || favoritesContent.includes('media-library-movie-card-tvshows')) {
            console.log('[DEBUG - FAVORITES FINAL] ✅ Favorites content contains favorited items');
        } else {
            console.log('[DEBUG - FAVORITES FINAL] ℹ️ Favorites content shows no items (empty state)');
        }
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES FINAL] ❌ Error rendering favorites content:', error);
    }
    
    // Test 5: Test localStorage persistence
    console.log('[DEBUG - FAVORITES FINAL] Testing localStorage persistence...');
    try {
        const storedFavorites = localStorage.getItem('mediaLibraryFavoritesByType');
        console.log('[DEBUG - FAVORITES FINAL] Raw localStorage data:', storedFavorites);
        
        if (storedFavorites) {
            const parsed = JSON.parse(storedFavorites);
            console.log('[DEBUG - FAVORITES FINAL] Parsed localStorage data:', parsed);
            console.log('[DEBUG - FAVORITES FINAL] Movies in localStorage:', parsed.movies ? parsed.movies.length : 0);
            console.log('[DEBUG - FAVORITES FINAL] TV Shows in localStorage:', parsed.tvshows ? parsed.tvshows.length : 0);
        }
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES FINAL] ❌ Error reading localStorage:', error);
    }
    
    // Test 6: Test toggleFavorite function
    console.log('[DEBUG - FAVORITES FINAL] Testing toggleFavorite function...');
    try {
        // Test with a dummy path
        const testPath = 'test/path/movie.mp4';
        const testType = 'movie';
        console.log('[DEBUG - FAVORITES FINAL] Calling toggleFavorite with:', testPath, testType);
        
        // Add to favorites
        manager.toggleFavorite(testPath, testType);
        console.log('[DEBUG - FAVORITES FINAL] ✅ Added test item to favorites');
        
        // Check if it was added
        const updatedFavorites = manager.getFavoritesList();
        console.log('[DEBUG - FAVORITES FINAL] Updated favorites after adding:', updatedFavorites);
        
        // Remove from favorites
        manager.toggleFavorite(testPath, testType);
        console.log('[DEBUG - FAVORITES FINAL] ✅ Removed test item from favorites');
        
        // Check if it was removed
        const finalFavorites = manager.getFavoritesList();
        console.log('[DEBUG - FAVORITES FINAL] Final favorites after removing:', finalFavorites);
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES FINAL] ❌ Error in toggleFavorite:', error);
    }
    
    // Test 7: Check current tab state
    console.log('[DEBUG - FAVORITES FINAL] Current tab state:');
    console.log('[DEBUG - FAVORITES FINAL] - Current tab:', manager.currentTab);
    console.log('[DEBUG - FAVORITES FINAL] - Current TV show:', manager.currentTVShow);
    console.log('[DEBUG - FAVORITES FINAL] - Current TV season:', manager.currentTVSeason);
    
    // Test 8: Check if handlers are properly attached
    console.log('[DEBUG - FAVORITES FINAL] Testing handler attachment...');
    try {
        manager.attachTVShowHandlers();
        manager.attachFavoritesHandlers();
        console.log('[DEBUG - FAVORITES FINAL] ✅ Handlers attached successfully');
    } catch (error) {
        console.error('[DEBUG - FAVORITES FINAL] ❌ Error attaching handlers:', error);
    }
    
    // Test 9: Check if data sources are available
    console.log('[DEBUG - FAVORITES FINAL] Testing data sources...');
    console.log('[DEBUG - FAVORITES FINAL] - mediaLibraryRaw:', manager.mediaLibraryRaw ? 'Available' : 'Not available');
    console.log('[DEBUG - FAVORITES FINAL] - moviesForFavorites:', manager.moviesForFavorites ? 'Available' : 'Not available');
    console.log('[DEBUG - FAVORITES FINAL] - tvShowsForFavorites:', manager.tvShowsForFavorites ? 'Available' : 'Not available');
    
    if (manager.moviesForFavorites) {
        console.log('[DEBUG - FAVORITES FINAL] - moviesForFavorites count:', manager.moviesForFavorites.length);
    }
    if (manager.tvShowsForFavorites) {
        console.log('[DEBUG - FAVORITES FINAL] - tvShowsForFavorites count:', manager.tvShowsForFavorites.length);
    }
    
} else {
    console.error('[DEBUG - FAVORITES FINAL] ❌ MediaLibraryManager not found');
}

console.log('[DEBUG - FAVORITES FINAL] Final test completed'); 