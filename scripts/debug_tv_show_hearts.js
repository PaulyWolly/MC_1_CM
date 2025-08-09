/*
  DEBUG_TV_SHOW_HEARTS.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

// Debug script for TV show heart icon functionality
// Run this in the browser console

console.log('[DEBUG TV HEARTS] Testing TV show heart icon functionality...');

// Test 1: Check if mediaLibraryManager exists
if (!window.mediaLibraryManager) {
    console.error('[DEBUG TV HEARTS] mediaLibraryManager not found!');
    console.log('Make sure the Media Library is open and initialized.');
} else {
    console.log('[DEBUG TV HEARTS] mediaLibraryManager found ✓');
    
    // Test 2: Check if we're on TV-Shows tab
    console.log('[DEBUG TV HEARTS] Current tab:', window.mediaLibraryManager.currentTab);
    
    // Test 3: Find TV show cards
    const tvShowCards = document.querySelectorAll('.media-library-tv-card[data-path]');
    console.log('[DEBUG TV HEARTS] Found TV show cards:', tvShowCards.length);
    
    if (tvShowCards.length > 0) {
        // Test 4: Check first TV show card
        const firstCard = tvShowCards[0];
        const showPath = firstCard.getAttribute('data-path');
        console.log('[DEBUG TV HEARTS] First TV show path:', showPath);
        
        // Test 5: Find favorite button
        const favoriteBtn = firstCard.querySelector('.favorite-btn');
        if (favoriteBtn) {
            console.log('[DEBUG TV HEARTS] Found favorite button ✓');
            console.log('[DEBUG TV HEARTS] Button HTML:', favoriteBtn.outerHTML);
            
            // Test 6: Check if it's already favorited
            const isFav = window.mediaLibraryManager.isFavorite(showPath);
            console.log('[DEBUG TV HEARTS] Is already favorited:', isFav);
            
            // Test 7: Simulate click
            console.log('[DEBUG TV HEARTS] Simulating click on favorite button...');
            favoriteBtn.click();
            
            // Test 8: Check if it was added to favorites
            setTimeout(() => {
                const isFavAfter = window.mediaLibraryManager.isFavorite(showPath);
                console.log('[DEBUG TV HEARTS] Is favorited after click:', isFavAfter);
                
                if (isFavAfter !== isFav) {
                    console.log('[DEBUG TV HEARTS] ✓ Heart icon is working!');
                } else {
                    console.log('[DEBUG TV HEARTS] ❌ Heart icon is NOT working!');
                }
            }, 100);
            
        } else {
            console.log('[DEBUG TV HEARTS] ❌ No favorite button found!');
            console.log('[DEBUG TV HEARTS] Card HTML:', firstCard.innerHTML);
        }
    } else {
        console.log('[DEBUG TV HEARTS] ❌ No TV show cards found!');
        console.log('[DEBUG TV HEARTS] Make sure you are on the TV-Shows tab.');
    }
    
    // Test 9: Check current favorites
    const favoritesList = window.mediaLibraryManager.getFavoritesList();
    console.log('[DEBUG TV HEARTS] Current favorites:', favoritesList);
    
    console.log('\n[DEBUG TV HEARTS] Debug complete!');
    console.log('[DEBUG TV HEARTS] Check the console for any error messages.');
} 