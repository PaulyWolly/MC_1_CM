/*
  DEBUG_TV_HEART_CLICK.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

console.log('[DEBUG - TV HEART CLICK] Starting TV show heart icon click test...');

// Test 1: Check if MediaLibraryManager is available
if (typeof window.mediaLibraryManager !== 'undefined') {
    const manager = window.mediaLibraryManager;
    console.log('[DEBUG - TV HEART CLICK] ✅ MediaLibraryManager found');
    
    // Test 2: Check current tab
    console.log('[DEBUG - TV HEART CLICK] Current tab:', manager.currentTab);
    
    if (manager.currentTab !== 'tvshows') {
        console.log('[DEBUG - TV HEART CLICK] ❌ Not on TV-SHOWS tab! Please switch to TV-SHOWS tab first.');
        return;
    }
    
    // Test 3: Find TV show cards
    const tvCards = document.querySelectorAll('.media-library-tv-card');
    console.log('[DEBUG - TV HEART CLICK] Found TV show cards:', tvCards.length);
    
    if (tvCards.length === 0) {
        console.log('[DEBUG - TV HEART CLICK] ❌ No TV show cards found!');
        return;
    }
    
    // Test 4: Check first TV show card
    const firstCard = tvCards[0];
    const showPath = firstCard.getAttribute('data-path');
    console.log('[DEBUG - TV HEART CLICK] First TV show path:', showPath);
    
    // Test 5: Find heart button
    const heartBtn = firstCard.querySelector('.favorite-btn');
    if (!heartBtn) {
        console.log('[DEBUG - TV HEART CLICK] ❌ No heart button found on first card!');
        console.log('[DEBUG - TV HEART CLICK] Card HTML:', firstCard.innerHTML);
        return;
    }
    
    console.log('[DEBUG - TV HEART CLICK] ✅ Found heart button');
    console.log('[DEBUG - TV HEART CLICK] Heart button HTML:', heartBtn.outerHTML);
    console.log('[DEBUG - TV HEART CLICK] Initial heart state:', heartBtn.textContent);
    
    // Test 6: Check if it's already favorited
    const isFav = manager.isFavorite(showPath);
    console.log('[DEBUG - TV HEART CLICK] Is already favorited:', isFav);
    
    // Test 7: Check if heart button has click handlers
    const hasClickHandlers = heartBtn.onclick || heartBtn._clickHandlers;
    console.log('[DEBUG - TV HEART CLICK] Has click handlers:', !!hasClickHandlers);
    
    // Test 8: Check for overlay
    const overlay = heartBtn.querySelector('.heart-overlay');
    console.log('[DEBUG - TV HEART CLICK] Has overlay:', !!overlay);
    
    // Test 9: Simulate click
    console.log('[DEBUG - TV HEART CLICK] Simulating click on heart button...');
    
    // Try clicking the button directly
    try {
        heartBtn.click();
        console.log('[DEBUG - TV HEART CLICK] ✅ Direct click executed');
    } catch (error) {
        console.error('[DEBUG - TV HEART CLICK] ❌ Error on direct click:', error);
    }
    
    // Test 10: Check if it was added to favorites
    setTimeout(() => {
        const isFavAfter = manager.isFavorite(showPath);
        console.log('[DEBUG - TV HEART CLICK] Is favorited after click:', isFavAfter);
        
        if (isFavAfter !== isFav) {
            console.log('[DEBUG - TV HEART CLICK] ✅ Heart icon is working!');
        } else {
            console.log('[DEBUG - TV HEART CLICK] ❌ Heart icon is NOT working!');
        }
        
        // Check localStorage
        const storedFavorites = localStorage.getItem('mediaLibraryFavoritesByType');
        if (storedFavorites) {
            const parsed = JSON.parse(storedFavorites);
            const hasInStorage = parsed.tvshows && parsed.tvshows.includes(showPath);
            console.log('[DEBUG - TV HEART CLICK] In localStorage:', hasInStorage);
        }
        
        // Check if heart icon updated
        const updatedHeartBtn = firstCard.querySelector('.favorite-btn');
        if (updatedHeartBtn) {
            console.log('[DEBUG - TV HEART CLICK] Heart state after click:', updatedHeartBtn.textContent);
        }
    }, 100);
    
    console.log('\n[DEBUG - TV HEART CLICK] Test complete!');
    console.log('[DEBUG - TV HEART CLICK] Check the console for any error messages.');
    
} else {
    console.log('[DEBUG - TV HEART CLICK] ❌ MediaLibraryManager not found!');
    console.log('[DEBUG - TV HEART CLICK] Make sure the Media Library is open.');
} 