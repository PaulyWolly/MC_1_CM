/*
  DEBUG_ALL_FAVORITES_ISSUES.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

// Comprehensive debug script for all favorites issues
// Run this in the browser console

console.log('[DEBUG ALL FAVORITES] Testing all favorites functionality...');

// Test 1: Check if mediaLibraryManager exists
if (!window.mediaLibraryManager) {
    console.error('[DEBUG ALL FAVORITES] mediaLibraryManager not found!');
    console.log('Make sure the Media Library is open and initialized.');
} else {
    console.log('[DEBUG ALL FAVORITES] mediaLibraryManager found ✓');
    
    // Test 2: Check current localStorage state
    const currentFavs = localStorage.getItem('mediaLibraryFavoritesByType');
    console.log('[DEBUG ALL FAVORITES] Current localStorage:', currentFavs);
    
    // Test 3: Test adding a movie favorite directly
    console.log('\n=== TESTING MOVIE FAVORITES PERSISTENCE ===');
    const testMoviePath = '/test/movie/path.mp4';
    console.log('[DEBUG ALL FAVORITES] Adding test movie to favorites...');
    
    // Test direct localStorage manipulation
    let favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
    if (!favs.movies) favs.movies = [];
    favs.movies.push(testMoviePath);
    localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(favs));
    console.log('[DEBUG ALL FAVORITES] Direct localStorage save:', favs);
    
    // Verify it was saved
    const savedFavs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
    console.log('[DEBUG ALL FAVORITES] Verification - localStorage after save:', savedFavs);
    console.log('[DEBUG ALL FAVORITES] Test movie in favorites:', savedFavs.movies?.includes(testMoviePath));
    
    // Test 4: Test the toggleFavorite function
    console.log('\n=== TESTING toggleFavorite FUNCTION ===');
    console.log('[DEBUG ALL FAVORITES] Testing toggleFavorite for movie...');
    window.mediaLibraryManager.toggleFavorite(testMoviePath, 'movie');
    
    // Check if it was toggled
    setTimeout(() => {
        const afterToggle = window.mediaLibraryManager.getFavoritesList();
        console.log('[DEBUG ALL FAVORITES] After toggleFavorite:', afterToggle);
        console.log('[DEBUG ALL FAVORITES] Movie still in favorites:', afterToggle.movies.includes(testMoviePath));
    }, 100);
    
    // Test 5: Test TV show heart icons
    console.log('\n=== TESTING TV SHOW HEART ICONS ===');
    console.log('[DEBUG ALL FAVORITES] Current tab:', window.mediaLibraryManager.currentTab);
    
    // Find TV show cards
    const tvShowCards = document.querySelectorAll('.media-library-tv-card[data-path]');
    console.log('[DEBUG ALL FAVORITES] Found TV show cards:', tvShowCards.length);
    
    if (tvShowCards.length > 0) {
        const firstCard = tvShowCards[0];
        const showPath = firstCard.getAttribute('data-path');
        console.log('[DEBUG ALL FAVORITES] First TV show path:', showPath);
        
        // Find favorite button
        const favoriteBtn = firstCard.querySelector('.favorite-btn');
        if (favoriteBtn) {
            console.log('[DEBUG ALL FAVORITES] Found favorite button ✓');
            console.log('[DEBUG ALL FAVORITES] Button HTML:', favoriteBtn.outerHTML);
            
            // Test click
            console.log('[DEBUG ALL FAVORITES] Testing TV show heart icon click...');
            favoriteBtn.click();
            
            // Check if it was added
            setTimeout(() => {
                const isFav = window.mediaLibraryManager.isFavorite(showPath);
                console.log('[DEBUG ALL FAVORITES] TV show favorited after click:', isFav);
            }, 100);
            
        } else {
            console.log('[DEBUG ALL FAVORITES] ❌ No favorite button found!');
            console.log('[DEBUG ALL FAVORITES] Card HTML:', firstCard.innerHTML);
        }
    } else {
        console.log('[DEBUG ALL FAVORITES] ❌ No TV show cards found!');
        console.log('[DEBUG ALL FAVORITES] Make sure you are on the TV-Shows tab.');
    }
    
    // Test 6: Test favorites playback functionality
    console.log('\n=== TESTING FAVORITES PLAYBACK ===');
    console.log('[DEBUG ALL FAVORITES] Switch to Favorites tab to test playback...');
    
    // Test 7: Check if favorites are being rendered correctly
    console.log('\n=== TESTING FAVORITES RENDERING ===');
    const favoritesList = window.mediaLibraryManager.getFavoritesList();
    console.log('[DEBUG ALL FAVORITES] Current favorites list:', favoritesList);
    
    // Test 8: Force refresh favorites tab
    console.log('\n=== TESTING FAVORITES TAB REFRESH ===');
    if (window.mediaLibraryManager.currentTab === 'favorites') {
        console.log('[DEBUG ALL FAVORITES] Refreshing favorites tab...');
        window.mediaLibraryManager.updateModalContent();
    }
    
    // Test 9: Check for any console errors
    console.log('\n=== CHECKING FOR ERRORS ===');
    console.log('[DEBUG ALL FAVORITES] Check the console for any error messages above.');
    
    // Test 10: Manual localStorage test
    console.log('\n=== MANUAL localStorage TEST ===');
    console.log('[DEBUG ALL FAVORITES] Testing manual localStorage operations...');
    
    // Clear and recreate favorites
    const testFavs = {
        movies: ['/test/movie1.mp4', '/test/movie2.mp4'],
        tvshows: ['/test/tvshow1', '/test/tvshow2']
    };
    localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(testFavs));
    console.log('[DEBUG ALL FAVORITES] Set test favorites:', testFavs);
    
    // Read back
    const readFavs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
    console.log('[DEBUG ALL FAVORITES] Read back favorites:', readFavs);
    console.log('[DEBUG ALL FAVORITES] localStorage working:', JSON.stringify(testFavs) === JSON.stringify(readFavs));
    
    console.log('\n[DEBUG ALL FAVORITES] ✓ All tests completed!');
    console.log('[DEBUG ALL FAVORITES] Check the results above to identify issues.');
} 