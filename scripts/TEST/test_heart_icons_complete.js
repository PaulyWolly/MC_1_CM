/*
  TEST_HEART_ICONS_COMPLETE.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

console.log('[DEBUG - HEART ICONS] Starting comprehensive heart icon functionality test...');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager !== 'undefined') {
    const manager = window.mediaLibraryManager;
    console.log('[DEBUG - HEART ICONS] ✅ MediaLibraryManager found');
    
    // Test 2: Check current favorites state
    console.log('[DEBUG - HEART ICONS] Testing current favorites state...');
    const favorites = manager.getFavoritesList();
    console.log('[DEBUG - HEART ICONS] Current favorites:', favorites);
    
    // Test 3: Check heart icon states in TV-SHOWS tab
    console.log('[DEBUG - HEART ICONS] Testing heart icon states in TV-SHOWS...');
    
    // Count TV show cards and their heart states
    const tvCards = document.querySelectorAll('.media-library-tv-card');
    console.log('[DEBUG - HEART ICONS] Found TV show cards:', tvCards.length);
    
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
        
        console.log(`[DEBUG - HEART ICONS] TV Card ${index + 1}: Path=${path}, IsFavorite=${isFav}, HeartState=${heartState}`);
    });
    
    console.log(`[DEBUG - HEART ICONS] Heart summary - Red: ${redHearts}, White: ${whiteHearts}, None: ${noHearts}`);
    
    if (whiteHearts > 0 && redHearts === 0) {
        console.log('[DEBUG - HEART ICONS] ✅ All heart icons are correctly white by default');
    } else if (redHearts > 0) {
        console.log('[DEBUG - HEART ICONS] ⚠️ Some heart icons are red - checking if they are actually favorited...');
        
        // Check if red hearts correspond to actual favorites
        tvCards.forEach((card, index) => {
            const path = card.getAttribute('data-path');
            const heartBtn = card.querySelector('.favorite-btn');
            const isFav = manager.isFavorite(path);
            const heartState = heartBtn ? heartBtn.textContent : 'No heart button';
            
            if (heartState === '❤️' && !isFav) {
                console.log(`[DEBUG - HEART ICONS] ❌ Card ${index + 1} has red heart but is not favorited: ${path}`);
            } else if (heartState === '❤️' && isFav) {
                console.log(`[DEBUG - HEART ICONS] ✅ Card ${index + 1} has red heart and is correctly favorited: ${path}`);
            }
        });
    } else {
        console.log('[DEBUG - HEART ICONS] ❌ Heart icons are not all white by default');
    }
    
    // Test 4: Test heart icon toggle functionality
    console.log('[DEBUG - HEART ICONS] Testing heart icon toggle functionality...');
    try {
        // Find a TV show card to test with
        const testCard = tvCards[0];
        if (testCard) {
            const testPath = testCard.getAttribute('data-path');
            const testHeartBtn = testCard.querySelector('.favorite-btn');
            
            if (testHeartBtn) {
                console.log('[DEBUG - HEART ICONS] Testing toggle with card:', testPath);
                console.log('[DEBUG - HEART ICONS] Initial heart state:', testHeartBtn.textContent);
                console.log('[DEBUG - HEART ICONS] Initial favorite status:', manager.isFavorite(testPath));
                
                // Test adding to favorites
                console.log('[DEBUG - HEART ICONS] Adding to favorites...');
                manager.toggleFavorite(testPath, 'tv');
                
                // Check if it was added
                const isNowFav = manager.isFavorite(testPath);
                console.log('[DEBUG - HEART ICONS] After adding - IsFavorite:', isNowFav);
                
                // Check localStorage
                const storedFavorites = localStorage.getItem('mediaLibraryFavoritesByType');
                if (storedFavorites) {
                    const parsed = JSON.parse(storedFavorites);
                    const hasInStorage = parsed.tvshows && parsed.tvshows.includes(testPath);
                    console.log('[DEBUG - HEART ICONS] In localStorage:', hasInStorage);
                }
                
                // Test removing from favorites
                console.log('[DEBUG - HEART ICONS] Removing from favorites...');
                manager.toggleFavorite(testPath, 'tv');
                
                // Check if it was removed
                const isNowUnfav = manager.isFavorite(testPath);
                console.log('[DEBUG - HEART ICONS] After removing - IsFavorite:', isNowUnfav);
                
                if (!isNowUnfav) {
                    console.log('[DEBUG - HEART ICONS] ✅ Toggle functionality working correctly');
                } else {
                    console.log('[DEBUG - HEART ICONS] ❌ Toggle functionality not working correctly');
                }
                
            } else {
                console.log('[DEBUG - HEART ICONS] ❌ No heart button found on test card');
            }
        } else {
            console.log('[DEBUG - HEART ICONS] ❌ No TV show cards found for testing');
        }
        
    } catch (error) {
        console.error('[DEBUG - HEART ICONS] ❌ Error testing toggle functionality:', error);
    }
    
    // Test 5: Test updateHeartIcons function
    console.log('[DEBUG - HEART ICONS] Testing updateHeartIcons function...');
    try {
        manager.updateHeartIcons();
        console.log('[DEBUG - HEART ICONS] ✅ updateHeartIcons executed successfully');
        
        // Check if heart icons were updated correctly
        let correctHearts = 0;
        let incorrectHearts = 0;
        
        tvCards.forEach((card, index) => {
            const path = card.getAttribute('data-path');
            const heartBtn = card.querySelector('.favorite-btn');
            const isFav = manager.isFavorite(path);
            const heartState = heartBtn ? heartBtn.textContent : 'No heart button';
            
            if ((isFav && heartState === '❤️') || (!isFav && heartState === '🤍')) {
                correctHearts++;
            } else {
                incorrectHearts++;
                console.log(`[DEBUG - HEART ICONS] ❌ Card ${index + 1} has incorrect heart state: IsFavorite=${isFav}, HeartState=${heartState}`);
            }
        });
        
        console.log(`[DEBUG - HEART ICONS] Heart icon accuracy: ${correctHearts} correct, ${incorrectHearts} incorrect`);
        
        if (incorrectHearts === 0) {
            console.log('[DEBUG - HEART ICONS] ✅ All heart icons are correctly synchronized');
        } else {
            console.log('[DEBUG - HEART ICONS] ❌ Some heart icons are not synchronized');
        }
        
    } catch (error) {
        console.error('[DEBUG - HEART ICONS] ❌ Error testing updateHeartIcons:', error);
    }
    
    // Test 6: Test favorites page integration
    console.log('[DEBUG - HEART ICONS] Testing favorites page integration...');
    try {
        // Add a test favorite
        const testPath = 'test/heart/icons/movie.mp4';
        const testType = 'movie';
        console.log('[DEBUG - HEART ICONS] Adding test favorite for favorites page test:', testPath);
        manager.toggleFavorite(testPath, testType);
        
        // Check if it appears in favorites
        const updatedFavorites = manager.getFavoritesList();
        const hasInFavorites = updatedFavorites.movies && updatedFavorites.movies.includes(testPath);
        console.log('[DEBUG - HEART ICONS] Test item in favorites:', hasInFavorites);
        
        // Test favorites content rendering
        const favoritesContent = manager.renderFavoritesContent();
        const hasInContent = favoritesContent.includes(testPath);
        console.log('[DEBUG - HEART ICONS] Test item in favorites content:', hasInContent);
        
        // Remove the test item
        manager.toggleFavorite(testPath, testType);
        console.log('[DEBUG - HEART ICONS] ✅ Test item removed');
        
        if (hasInFavorites && hasInContent) {
            console.log('[DEBUG - HEART ICONS] ✅ Favorites page integration working correctly');
        } else {
            console.log('[DEBUG - HEART ICONS] ❌ Favorites page integration not working correctly');
        }
        
    } catch (error) {
        console.error('[DEBUG - HEART ICONS] ❌ Error testing favorites page integration:', error);
    }
    
    // Test 7: Check current tab state
    console.log('[DEBUG - HEART ICONS] Current tab state:');
    console.log('[DEBUG - HEART ICONS] - Current tab:', manager.currentTab);
    console.log('[DEBUG - HEART ICONS] - Current TV show:', manager.currentTVShow);
    console.log('[DEBUG - HEART ICONS] - Current TV season:', manager.currentTVSeason);
    
} else {
    console.error('[DEBUG - HEART ICONS] ❌ MediaLibraryManager not found');
}

console.log('[DEBUG - HEART ICONS] Complete heart icon test finished'); 