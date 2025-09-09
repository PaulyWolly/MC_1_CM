/*
  DEBUG_TV_SHOW_COMPARISON.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

// Debug script to compare main TV show cards vs favorited TV show cards
// Run this in the browser console

console.log('[DEBUG TV COMPARISON] Comparing main TV show cards vs favorited TV show cards...');

// Test 1: Check if mediaLibraryManager exists
if (!window.mediaLibraryManager) {
    console.error('[DEBUG TV COMPARISON] mediaLibraryManager not found!');
} else {
    console.log('[DEBUG TV COMPARISON] mediaLibraryManager found ✓');
    
    // Test 2: Find main TV show cards
    const mainTvCards = document.querySelectorAll('.media-library-tv-card');
    console.log('[DEBUG TV COMPARISON] Main TV show cards found:', mainTvCards.length);
    
    // Test 3: Find favorited TV show cards
    const favoritedTvCards = document.querySelectorAll('.media-library-movie-card-tvshows');
    console.log('[DEBUG TV COMPARISON] Favorited TV show cards found:', favoritedTvCards.length);
    
    // Test 4: Compare HTML structure
    if (mainTvCards.length > 0) {
        console.log('\n=== MAIN TV SHOW CARD STRUCTURE ===');
        const mainCard = mainTvCards[0];
        console.log('[DEBUG TV COMPARISON] Main card HTML:', mainCard.outerHTML);
        console.log('[DEBUG TV COMPARISON] Main card classes:', mainCard.className);
        console.log('[DEBUG TV COMPARISON] Main card data-path:', mainCard.getAttribute('data-path'));
        
        // Check if it has click handlers
        const mainCardClickHandlers = mainCard.onclick;
        console.log('[DEBUG TV COMPARISON] Main card onclick handler:', mainCardClickHandlers);
        
        // Check for favorite button
        const mainFavoriteBtn = mainCard.querySelector('.favorite-btn');
        console.log('[DEBUG TV COMPARISON] Main card favorite button:', mainFavoriteBtn);
        if (mainFavoriteBtn) {
            console.log('[DEBUG TV COMPARISON] Main favorite button onclick:', mainFavoriteBtn.onclick);
        }
    }
    
    if (favoritedTvCards.length > 0) {
        console.log('\n=== FAVORITED TV SHOW CARD STRUCTURE ===');
        const favoritedCard = favoritedTvCards[0];
        console.log('[DEBUG TV COMPARISON] Favorited card HTML:', favoritedCard.outerHTML);
        console.log('[DEBUG TV COMPARISON] Favorited card classes:', favoritedCard.className);
        console.log('[DEBUG TV COMPARISON] Favorited card data-path:', favoritedCard.getAttribute('data-path'));
        
        // Check if it has click handlers
        const favoritedCardClickHandlers = favoritedCard.onclick;
        console.log('[DEBUG TV COMPARISON] Favorited card onclick handler:', favoritedCardClickHandlers);
        
        // Check for favorite button
        const favoritedFavoriteBtn = favoritedCard.querySelector('.favorite-btn-tv');
        console.log('[DEBUG TV COMPARISON] Favorited card favorite button:', favoritedFavoriteBtn);
        if (favoritedFavoriteBtn) {
            console.log('[DEBUG TV COMPARISON] Favorited favorite button onclick:', favoritedFavoriteBtn.onclick);
        }
    }
    
    // Test 5: Manually test click functionality
    console.log('\n=== MANUAL CLICK TESTING ===');
    
    if (mainTvCards.length > 0) {
        console.log('[DEBUG TV COMPARISON] Testing main TV show card click...');
        const mainCard = mainTvCards[0];
        const mainPath = mainCard.getAttribute('data-path');
        
        // Manually attach a test handler
        mainCard.addEventListener('test-click', (e) => {
            console.log('[DEBUG TV COMPARISON] Main card test click triggered!');
            console.log('[DEBUG TV COMPARISON] Path:', mainPath);
        });
        
        // Simulate click
        mainCard.dispatchEvent(new Event('test-click'));
        
        // Try actual click
        console.log('[DEBUG TV COMPARISON] Simulating actual click on main card...');
        mainCard.click();
    }
    
    if (favoritedTvCards.length > 0) {
        console.log('[DEBUG TV COMPARISON] Testing favorited TV show card click...');
        const favoritedCard = favoritedTvCards[0];
        const favoritedPath = favoritedCard.getAttribute('data-path');
        
        // Manually attach a test handler
        favoritedCard.addEventListener('test-click', (e) => {
            console.log('[DEBUG TV COMPARISON] Favorited card test click triggered!');
            console.log('[DEBUG TV COMPARISON] Path:', favoritedPath);
        });
        
        // Simulate click
        favoritedCard.dispatchEvent(new Event('test-click'));
        
        // Try actual click
        console.log('[DEBUG TV COMPARISON] Simulating actual click on favorited card...');
        favoritedCard.click();
    }
    
    // Test 6: Check if handlers are being attached
    console.log('\n=== HANDLER ATTACHMENT TEST ===');
    console.log('[DEBUG TV COMPARISON] Manually calling attachTVShowHandlers...');
    window.mediaLibraryManager.attachTVShowHandlers();
    
    console.log('[DEBUG TV COMPARISON] Manually calling attachFavoritesHandlers...');
    window.mediaLibraryManager.attachFavoritesHandlers();
    
    // Test 7: Check again after attaching handlers
    setTimeout(() => {
        console.log('\n=== AFTER HANDLER ATTACHMENT ===');
        if (mainTvCards.length > 0) {
            const mainCard = mainTvCards[0];
            console.log('[DEBUG TV COMPARISON] Main card onclick after attachment:', mainCard.onclick);
        }
        if (favoritedTvCards.length > 0) {
            const favoritedCard = favoritedTvCards[0];
            console.log('[DEBUG TV COMPARISON] Favorited card onclick after attachment:', favoritedCard.onclick);
        }
    }, 100);
    
    console.log('\n[DEBUG TV COMPARISON] Comparison complete!');
} 