/*
  TEST_FAVORITES_INDEPENDENCE.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Starting favorites independence test...');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager !== 'undefined') {
    const manager = window.mediaLibraryManager;
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ✅ MediaLibraryManager found');
    
    // Test 2: Check current favorites state
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Testing current favorites state...');
    const favorites = manager.getFavoritesList();
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Current favorites:', favorites);
    
    // Test 3: Test favorites rendering independence
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Testing favorites rendering independence...');
    
    // Store current tab
    const originalTab = manager.currentTab;
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Original tab:', originalTab);
    
    // Test favorites content rendering from different tab contexts
    const testTabs = ['movies', 'tvshows', 'favorites'];
    
    testTabs.forEach(tab => {
        console.log(`[DEBUG - FAVORITES INDEPENDENCE TEST] Testing favorites rendering from ${tab} tab context...`);
        
        // Temporarily set current tab
        manager.currentTab = tab;
        
        // Try to render favorites content
        try {
            const favoritesContent = manager.renderFavoritesContent();
            console.log(`[DEBUG - FAVORITES INDEPENDENCE TEST] ✅ Favorites content rendered successfully from ${tab} tab`);
            console.log(`[DEBUG - FAVORITES INDEPENDENCE TEST] Content length from ${tab}:`, favoritesContent.length);
            
            // Check if content contains both sections regardless of source tab
            const hasMovieSection = favoritesContent.includes('favorites-movies-section');
            const hasTVSection = favoritesContent.includes('favorites-tvshows-section');
            
            console.log(`[DEBUG - FAVORITES INDEPENDENCE TEST] From ${tab} - Has movie section:`, hasMovieSection);
            console.log(`[DEBUG - FAVORITES INDEPENDENCE TEST] From ${tab} - Has TV show section:`, hasTVSection);
            
            if (hasMovieSection && hasTVSection) {
                console.log(`[DEBUG - FAVORITES INDEPENDENCE TEST] ✅ Favorites independence test passed for ${tab} tab`);
            } else {
                console.log(`[DEBUG - FAVORITES INDEPENDENCE TEST] ❌ Favorites independence test failed for ${tab} tab`);
            }
            
        } catch (error) {
            console.error(`[DEBUG - FAVORITES INDEPENDENCE TEST] Error rendering favorites from ${tab} tab:`, error);
        }
    });
    
    // Restore original tab
    manager.currentTab = originalTab;
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Restored original tab:', originalTab);
    
    // Test 4: Test localStorage independence
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Testing localStorage independence...');
    
    const storedFavorites = localStorage.getItem('mediaLibraryFavoritesByType');
    if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites);
        console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] localStorage favorites:', parsed);
        console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Movies in localStorage:', parsed.movies ? parsed.movies.length : 0);
        console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] TV shows in localStorage:', parsed.tvshows ? parsed.tvshows.length : 0);
        
        // Verify that favorites are stored independently
        if (parsed.movies && parsed.movies.length > 0) {
            console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ✅ Movies found in localStorage');
        } else {
            console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ℹ️ No movies in localStorage');
        }
        
        if (parsed.tvshows && parsed.tvshows.length > 0) {
            console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ✅ TV shows found in localStorage');
        } else {
            console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ℹ️ No TV shows in localStorage');
        }
    } else {
        console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ℹ️ No favorites found in localStorage');
    }
    
    // Test 5: Test tab switching simulation
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Testing tab switching simulation...');
    
    // Simulate switching from movies to favorites
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Simulating switch from MOVIES to FAVORITES...');
    manager.currentTab = 'movies';
    let favoritesFromMovies = manager.renderFavoritesContent();
    
    // Simulate switching from tvshows to favorites
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Simulating switch from TV-SHOWS to FAVORITES...');
    manager.currentTab = 'tvshows';
    let favoritesFromTVShows = manager.renderFavoritesContent();
    
    // Compare the results - they should be identical
    if (favoritesFromMovies === favoritesFromTVShows) {
        console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ✅ Favorites content is identical regardless of source tab');
    } else {
        console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ❌ Favorites content differs based on source tab');
        console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Content from movies tab length:', favoritesFromMovies.length);
        console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Content from tvshows tab length:', favoritesFromTVShows.length);
    }
    
    // Restore original tab
    manager.currentTab = originalTab;
    
    console.log('\n[DEBUG - FAVORITES INDEPENDENCE TEST] Test complete!');
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Favorites should now work independently of tab context.');
    
} else {
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] ❌ MediaLibraryManager not found!');
    console.log('[DEBUG - FAVORITES INDEPENDENCE TEST] Make sure the Media Library is open.');
} 