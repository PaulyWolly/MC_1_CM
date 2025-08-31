/*
  TEST_Z_INDEX_FIX.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

// Test script for z-index fix on heart buttons
// Run this in the browser console

console.log('[Z-INDEX TEST] Testing z-index fix for heart buttons...');

// Test 1: Check if we're on TV-Shows tab
if (!window.mediaLibraryManager) {
    console.error('[Z-INDEX TEST] mediaLibraryManager not found!');
} else {
    console.log('[Z-INDEX TEST] Current tab:', window.mediaLibraryManager.currentTab);
    
    // Test 2: Find TV show cards and check their z-index
    const tvShowCards = document.querySelectorAll('.media-library-tv-card[data-path]');
    console.log('[Z-INDEX TEST] Found TV show cards:', tvShowCards.length);
    
    if (tvShowCards.length > 0) {
        const firstCard = tvShowCards[0];
        console.log('[Z-INDEX TEST] First card HTML:', firstCard.outerHTML);
        
        // Test 3: Check favorite button z-index
        const favoriteBtn = firstCard.querySelector('.favorite-btn');
        if (favoriteBtn) {
            const computedStyle = window.getComputedStyle(favoriteBtn);
            const zIndex = computedStyle.zIndex;
            const position = computedStyle.position;
            const pointerEvents = computedStyle.pointerEvents;
            
            console.log('[Z-INDEX TEST] Favorite button found ✓');
            console.log('[Z-INDEX TEST] Z-index:', zIndex);
            console.log('[Z-INDEX TEST] Position:', position);
            console.log('[Z-INDEX TEST] Pointer events:', pointerEvents);
            
            if (zIndex === '9999') {
                console.log('[Z-INDEX TEST] ✓ Z-index is correct (9999)');
            } else {
                console.log('[Z-INDEX TEST] ❌ Z-index is wrong:', zIndex);
            }
            
            if (position === 'relative') {
                console.log('[Z-INDEX TEST] ✓ Position is correct (relative)');
            } else {
                console.log('[Z-INDEX TEST] ❌ Position is wrong:', position);
            }
            
            if (pointerEvents === 'auto') {
                console.log('[Z-INDEX TEST] ✓ Pointer events is correct (auto)');
            } else {
                console.log('[Z-INDEX TEST] ❌ Pointer events is wrong:', pointerEvents);
            }
            
            // Test 4: Check if button is clickable
            console.log('[Z-INDEX TEST] Testing click on favorite button...');
            favoriteBtn.click();
            
            setTimeout(() => {
                console.log('[Z-INDEX TEST] Click test completed - check if it worked!');
            }, 100);
            
        } else {
            console.log('[Z-INDEX TEST] ❌ No favorite button found!');
        }
        
        // Test 5: Check media-card-actions container
        const actionsContainer = firstCard.querySelector('.media-card-actions');
        if (actionsContainer) {
            const computedStyle = window.getComputedStyle(actionsContainer);
            const zIndex = computedStyle.zIndex;
            console.log('[Z-INDEX TEST] Actions container z-index:', zIndex);
            
            if (zIndex === '9998') {
                console.log('[Z-INDEX TEST] ✓ Actions container z-index is correct (9998)');
            } else {
                console.log('[Z-INDEX TEST] ❌ Actions container z-index is wrong:', zIndex);
            }
        }
        
    } else {
        console.log('[Z-INDEX TEST] ❌ No TV show cards found!');
        console.log('[Z-INDEX TEST] Make sure you are on the TV-Shows tab.');
    }
    
    // Test 6: Check all button z-indexes
    console.log('\n[Z-INDEX TEST] Checking all button z-indexes...');
    const allButtons = document.querySelectorAll('.favorite-btn, .collection-btn, .change-poster-btn, .poster-selector-btn');
    console.log('[Z-INDEX TEST] Total buttons found:', allButtons.length);
    
    allButtons.forEach((btn, index) => {
        const computedStyle = window.getComputedStyle(btn);
        const zIndex = computedStyle.zIndex;
        console.log(`[Z-INDEX TEST] Button ${index + 1} z-index:`, zIndex);
        
        if (zIndex === '9999') {
            console.log(`[Z-INDEX TEST] ✓ Button ${index + 1} z-index is correct`);
        } else {
            console.log(`[Z-INDEX TEST] ❌ Button ${index + 1} z-index is wrong:`, zIndex);
        }
    });
    
    console.log('\n[Z-INDEX TEST] ✓ Z-index test completed!');
    console.log('[Z-INDEX TEST] Try clicking heart icons now - they should work!');
} 