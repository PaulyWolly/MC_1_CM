/*
  TEST_FAVORITES_FIX.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

console.log('[DEBUG - FAVORITES FIX TEST] Starting favorites functionality test...');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager !== 'undefined') {
    const manager = window.mediaLibraryManager;
    console.log('[DEBUG - FAVORITES FIX TEST] ✅ MediaLibraryManager found');
    
    // Test 2: Check current favorites state
    console.log('[DEBUG - FAVORITES FIX TEST] Testing current favorites state...');
    const favorites = manager.getFavoritesList();
    console.log('[DEBUG - FAVORITES FIX TEST] Current favorites:', favorites);
    
    // Test 3: Check heart icon states in TV-SHOWS tab
    console.log('[DEBUG - FAVORITES FIX TEST] Testing heart icon states in TV-SHOWS...');
    
    // Count TV show cards and their heart states
    const tvCards = document.querySelectorAll('.media-library-tv-card');
    console.log('[DEBUG - FAVORITES FIX TEST] Found TV show cards:', tvCards.length);
    
    let redHearts = 0;
    let whiteHearts = 0;
    let noHearts = 0;
    
    tvCards.forEach((card, index) => {
        const path = card.getAttribute('data-path');
        const heartBtn = card.querySelector('.favorite-btn');
        const isFav = manager.isFavorite(path);
        const heartState = heartBtn ? heartBtn.textContent : 'No heart button';
        
        if (heartState === '❤️') redHearts++;
        if (heartState === '🤍') whiteHearts++;
        if (heartState === 'No heart button') noHearts++;
        
        console.log(`[DEBUG - FAVORITES FIX TEST] TV Card ${index + 1}: Path=${path}, IsFavorite=${isFav}, HeartState=${heartState}`);
    });
    
    console.log(`[DEBUG - FAVORITES FIX TEST] Heart summary - Red: ${redHearts}, White: ${whiteHearts}, None: ${noHearts}`);
    
    // Test 4: Test heart icon functionality
    console.log('[DEBUG - FAVORITES FIX TEST] Testing heart icon functionality...');
    
    if (tvCards.length > 0) {
        try {
            // Find a TV show card to test with
            const testCard = tvCards[0];
            if (testCard) {
                const testPath = testCard.getAttribute('data-path');
                const testHeartBtn = testCard.querySelector('.favorite-btn');
                
                if (testHeartBtn) {
                    console.log('[DEBUG - FAVORITES FIX TEST] Testing toggle with card:', testPath);
                    console.log('[DEBUG - FAVORITES FIX TEST] Initial heart state:', testHeartBtn.textContent);
                    console.log('[DEBUG - FAVORITES FIX TEST] Initial favorite status:', manager.isFavorite(testPath));
                    
                    // Test adding to favorites
                    console.log('[DEBUG - FAVORITES FIX TEST] Adding to favorites...');
                    manager.toggleFavorite(testPath, 'tv');
                    
                    // Check if it was added
                    const isNowFav = manager.isFavorite(testPath);
                    console.log('[DEBUG - FAVORITES FIX TEST] After adding - IsFavorite:', isNowFav);
                    
                    // Check localStorage
                    const storedFavorites = localStorage.getItem('mediaLibraryFavoritesByType');
                    if (storedFavorites) {
                        const parsed = JSON.parse(storedFavorites);
                        const hasInStorage = parsed.tvshows && parsed.tvshows.includes(testPath);
                        console.log('[DEBUG - FAVORITES FIX TEST] In localStorage:', hasInStorage);
                    }
                    
                    // Test removing from favorites
                    console.log('[DEBUG - FAVORITES FIX TEST] Removing from favorites...');
                    manager.toggleFavorite(testPath, 'tv');
                    
                    // Check if it was removed
                    const isNowUnfav = manager.isFavorite(testPath);
                    console.log('[DEBUG - FAVORITES FIX TEST] After removing - IsFavorite:', isNowUnfav);
                    
                    console.log('[DEBUG - FAVORITES FIX TEST] ✅ Heart icon functionality test complete');
                } else {
                    console.log('[DEBUG - FAVORITES FIX TEST] ❌ No heart button found on test card');
                }
            }
        } catch (error) {
            console.error('[DEBUG - FAVORITES FIX TEST] Error during heart icon test:', error);
        }
    } else {
        console.log('[DEBUG - FAVORITES FIX TEST] ❌ No TV show cards found! Make sure you are on the TV-Shows tab.');
    }
    
    // Test 5: Test favorites tab rendering
    console.log('[DEBUG - FAVORITES FIX TEST] Testing favorites tab rendering...');
    
    // Check if we can render favorites content
    try {
        const favoritesContent = manager.renderFavoritesContent();
        console.log('[DEBUG - FAVORITES FIX TEST] Favorites content rendered successfully');
        console.log('[DEBUG - FAVORITES FIX TEST] Content length:', favoritesContent.length);
        
        // Check if content contains both movie and TV show sections
        const hasMovieSection = favoritesContent.includes('favorites-movies-section');
        const hasTVSection = favoritesContent.includes('favorites-tvshows-section');
        
        console.log('[DEBUG - FAVORITES FIX TEST] Has movie section:', hasMovieSection);
        console.log('[DEBUG - FAVORITES FIX TEST] Has TV show section:', hasTVSection);
        
        if (hasMovieSection && hasTVSection) {
            console.log('[DEBUG - FAVORITES FIX TEST] ✅ Favorites tab rendering test passed');
        } else {
            console.log('[DEBUG - FAVORITES FIX TEST] ❌ Favorites tab rendering test failed');
        }
    } catch (error) {
        console.error('[DEBUG - FAVORITES FIX TEST] Error during favorites rendering test:', error);
    }
    
    console.log('\n[DEBUG - FAVORITES FIX TEST] Test complete!');
    console.log('[DEBUG - FAVORITES FIX TEST] Check the console for any error messages.');
    
} else {
    console.log('[DEBUG - FAVORITES FIX TEST] ❌ MediaLibraryManager not found!');
    console.log('[DEBUG - FAVORITES FIX TEST] Make sure the Media Library is open.');
} 