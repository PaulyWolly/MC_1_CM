/*
  TEST_FAVORITES_FRESH_LOAD.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

console.log('[DEBUG - FAVORITES FRESH LOAD] Starting fresh localStorage load test...');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager !== 'undefined') {
    const manager = window.mediaLibraryManager;
    console.log('[DEBUG - FAVORITES FRESH LOAD] ✅ MediaLibraryManager found');
    
    // Test 2: Test direct localStorage access
    console.log('[DEBUG - FAVORITES FRESH LOAD] Testing direct localStorage access...');
    try {
        const storedFavorites = localStorage.getItem('mediaLibraryFavoritesByType');
        console.log('[DEBUG - FAVORITES FRESH LOAD] Raw localStorage data:', storedFavorites);
        
        if (storedFavorites) {
            const parsed = JSON.parse(storedFavorites);
            console.log('[DEBUG - FAVORITES FRESH LOAD] Parsed localStorage data:', parsed);
            console.log('[DEBUG - FAVORITES FRESH LOAD] Movies in localStorage:', parsed.movies ? parsed.movies.length : 0);
            console.log('[DEBUG - FAVORITES FRESH LOAD] TV Shows in localStorage:', parsed.tvshows ? parsed.tvshows.length : 0);
        } else {
            console.log('[DEBUG - FAVORITES FRESH LOAD] No favorites data in localStorage');
        }
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES FRESH LOAD] ❌ Error reading localStorage:', error);
    }
    
    // Test 3: Test getFavoritesList method
    console.log('[DEBUG - FAVORITES FRESH LOAD] Testing getFavoritesList method...');
    try {
        const favorites = manager.getFavoritesList();
        console.log('[DEBUG - FAVORITES FRESH LOAD] getFavoritesList result:', favorites);
    } catch (error) {
        console.error('[DEBUG - FAVORITES FRESH LOAD] ❌ Error in getFavoritesList:', error);
    }
    
    // Test 4: Test renderFavoritesContent with fresh localStorage call
    console.log('[DEBUG - FAVORITES FRESH LOAD] Testing renderFavoritesContent with fresh localStorage call...');
    try {
        const favoritesContent = manager.renderFavoritesContent();
        console.log('[DEBUG - FAVORITES FRESH LOAD] ✅ Favorites content rendered successfully');
        console.log('[DEBUG - FAVORITES FRESH LOAD] Content length:', favoritesContent.length);
        
        // Check if content contains expected elements
        if (favoritesContent.includes('Favorited MOVIES') && favoritesContent.includes('Favorited TV-SHOWS')) {
            console.log('[DEBUG - FAVORITES FRESH LOAD] ✅ Favorites content contains expected sections');
        } else {
            console.log('[DEBUG - FAVORITES FRESH LOAD] ❌ Favorites content missing expected sections');
        }
        
        // Check if content contains actual items
        if (favoritesContent.includes('media-library-movie-card-movies') || favoritesContent.includes('media-library-movie-card-tvshows')) {
            console.log('[DEBUG - FAVORITES FRESH LOAD] ✅ Favorites content contains favorited items');
        } else {
            console.log('[DEBUG - FAVORITES FRESH LOAD] ℹ️ Favorites content shows no items (empty state)');
        }
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES FRESH LOAD] ❌ Error rendering favorites content:', error);
    }
    
    // Test 5: Test tab switching to favorites
    console.log('[DEBUG - FAVORITES FRESH LOAD] Testing tab switching to favorites...');
    console.log('[DEBUG - FAVORITES FRESH LOAD] Current tab before switch:', manager.currentTab);
    
    // Test 6: Check if data sources are available for favorites
    console.log('[DEBUG - FAVORITES FRESH LOAD] Testing data sources for favorites...');
    console.log('[DEBUG - FAVORITES FRESH LOAD] - mediaLibraryRaw:', manager.mediaLibraryRaw ? 'Available' : 'Not available');
    console.log('[DEBUG - FAVORITES FRESH LOAD] - moviesForFavorites:', manager.moviesForFavorites ? 'Available' : 'Not available');
    console.log('[DEBUG - FAVORITES FRESH LOAD] - tvShowsForFavorites:', manager.tvShowsForFavorites ? 'Available' : 'Not available');
    
    if (manager.moviesForFavorites) {
        console.log('[DEBUG - FAVORITES FRESH LOAD] - moviesForFavorites count:', manager.moviesForFavorites.length);
    }
    if (manager.tvShowsForFavorites) {
        console.log('[DEBUG - FAVORITES FRESH LOAD] - tvShowsForFavorites count:', manager.tvShowsForFavorites.length);
    }
    
    // Test 7: Test adding a favorite and then checking fresh load
    console.log('[DEBUG - FAVORITES FRESH LOAD] Testing fresh load after adding favorite...');
    try {
        // Add a test favorite
        const testPath = 'test/fresh/load/movie.mp4';
        const testType = 'movie';
        console.log('[DEBUG - FAVORITES FRESH LOAD] Adding test favorite:', testPath);
        manager.toggleFavorite(testPath, testType);
        
        // Check if it was added via direct localStorage
        const freshStored = localStorage.getItem('mediaLibraryFavoritesByType');
        if (freshStored) {
            const freshParsed = JSON.parse(freshStored);
            const hasTestItem = freshParsed.movies && freshParsed.movies.includes(testPath);
            console.log('[DEBUG - FAVORITES FRESH LOAD] Test item in fresh localStorage:', hasTestItem);
        }
        
        // Remove the test item
        manager.toggleFavorite(testPath, testType);
        console.log('[DEBUG - FAVORITES FRESH LOAD] ✅ Test item removed');
        
    } catch (error) {
        console.error('[DEBUG - FAVORITES FRESH LOAD] ❌ Error in fresh load test:', error);
    }
    
    // Test 8: Check current tab state
    console.log('[DEBUG - FAVORITES FRESH LOAD] Current tab state:');
    console.log('[DEBUG - FAVORITES FRESH LOAD] - Current tab:', manager.currentTab);
    console.log('[DEBUG - FAVORITES FRESH LOAD] - Current TV show:', manager.currentTVShow);
    console.log('[DEBUG - FAVORITES FRESH LOAD] - Current TV season:', manager.currentTVSeason);
    
} else {
    console.error('[DEBUG - FAVORITES FRESH LOAD] ❌ MediaLibraryManager not found');
}

console.log('[DEBUG - FAVORITES FRESH LOAD] Fresh load test completed'); 