/*
  DEBUG_TV_SHOW_CLICK.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

// Debug script for TV show click functionality
// Run this in the browser console

console.log('[DEBUG TV CLICK] Testing TV show click functionality...');

// Test 1: Check if mediaLibraryManager exists
if (!window.mediaLibraryManager) {
    console.error('[DEBUG TV CLICK] mediaLibraryManager not found!');
    console.log('Make sure the Media Library is open and initialized.');
} else {
    console.log('[DEBUG TV CLICK] mediaLibraryManager found ✓');
    
    // Test 2: Check if we're on TV-Shows tab
    console.log('[DEBUG TV CLICK] Current tab:', window.mediaLibraryManager.currentTab);
    
    // Test 3: Find TV show cards
    const tvShowCards = document.querySelectorAll('.media-library-tv-card');
    console.log('[DEBUG TV CLICK] Found TV show cards:', tvShowCards.length);
    
    if (tvShowCards.length > 0) {
        // Test 4: Check first TV show card
        const firstCard = tvShowCards[0];
        const showPath = firstCard.getAttribute('data-path');
        console.log('[DEBUG TV CLICK] First TV show path:', showPath);
        console.log('[DEBUG TV CLICK] First TV show HTML:', firstCard.outerHTML);
        
        // Test 5: Check if click handlers are attached
        console.log('[DEBUG TV CLICK] Checking if click handlers are attached...');
        
        // Test 6: Manually attach a click handler to test
        console.log('[DEBUG TV CLICK] Manually attaching click handler for testing...');
        firstCard.addEventListener('click', (e) => {
            console.log('[DEBUG TV CLICK] Manual click handler triggered!');
            console.log('[DEBUG TV CLICK] Event target:', e.target);
            console.log('[DEBUG TV CLICK] Event currentTarget:', e.currentTarget);
            console.log('[DEBUG TV CLICK] Card path:', firstCard.getAttribute('data-path'));
            
            // Call the openTVShowFromData method directly
            window.mediaLibraryManager.openTVShowFromData(firstCard);
        });
        
        // Test 7: Simulate click
        console.log('[DEBUG TV CLICK] Simulating click on first TV show card...');
        firstCard.click();
        
        // Test 8: Check if attachTVShowHandlers was called
        console.log('[DEBUG TV CLICK] Manually calling attachTVShowHandlers...');
        window.mediaLibraryManager.attachTVShowHandlers();
        
        // Test 9: Simulate click again
        console.log('[DEBUG TV CLICK] Simulating click again after attaching handlers...');
        setTimeout(() => {
            firstCard.click();
        }, 100);
        
    } else {
        console.log('[DEBUG TV CLICK] ❌ No TV show cards found!');
        console.log('[DEBUG TV CLICK] Make sure you are on the TV-Shows tab.');
        
        // Check what elements are actually present
        const allCards = document.querySelectorAll('[class*="media-library"]');
        console.log('[DEBUG TV CLICK] All media library elements found:', allCards.length);
        allCards.forEach((card, index) => {
            console.log(`[DEBUG TV CLICK] Element ${index + 1}:`, card.className, card.getAttribute('data-path'));
        });
    }
    
    // Test 10: Check if openTVShowFromData method exists
    if (typeof window.mediaLibraryManager.openTVShowFromData === 'function') {
        console.log('[DEBUG TV CLICK] ✅ openTVShowFromData method exists');
    } else {
        console.log('[DEBUG TV CLICK] ❌ openTVShowFromData method does not exist');
    }
    
    console.log('\n[DEBUG TV CLICK] Debug complete!');
    console.log('[DEBUG TV CLICK] Check the console for any error messages.');
} 