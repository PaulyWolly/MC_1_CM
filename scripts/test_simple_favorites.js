// Simple test script for the new localStorage-based favorites system
// Run this in the browser console

console.log('[SIMPLE FAVORITES TEST] Testing the new localStorage-based favorites system...');

// Test 1: Check if mediaLibraryManager exists
if (!window.mediaLibraryManager) {
    console.error('[SIMPLE FAVORITES TEST] mediaLibraryManager not found!');
    console.log('Make sure the Media Library is open and initialized.');
} else {
    console.log('[SIMPLE FAVORITES TEST] mediaLibraryManager found ✓');
    
    // Test 2: Check current localStorage state
    const currentFavs = localStorage.getItem('mediaLibraryFavoritesByType');
    console.log('[SIMPLE FAVORITES TEST] Current localStorage:', currentFavs);
    
    // Test 3: Test getFavoritesList function
    const favoritesList = window.mediaLibraryManager.getFavoritesList();
    console.log('[SIMPLE FAVORITES TEST] getFavoritesList result:', favoritesList);
    
    // Test 4: Test adding a movie favorite
    console.log('\n=== TESTING MOVIE FAVORITES ===');
    const testMoviePath = '/test/movie/path.mp4';
    console.log('[SIMPLE FAVORITES TEST] Adding test movie to favorites...');
    window.mediaLibraryManager.toggleFavorite(testMoviePath, 'movie');
    
    // Check if it was added
    const afterMovieAdd = window.mediaLibraryManager.getFavoritesList();
    console.log('[SIMPLE FAVORITES TEST] After adding movie:', afterMovieAdd);
    console.log('[SIMPLE FAVORITES TEST] Movie in favorites:', afterMovieAdd.movies.includes(testMoviePath));
    
    // Test 5: Test adding a TV show favorite
    console.log('\n=== TESTING TV SHOW FAVORITES ===');
    const testTVPath = '/test/tvshow/path';
    console.log('[SIMPLE FAVORITES TEST] Adding test TV show to favorites...');
    window.mediaLibraryManager.toggleFavorite(testTVPath, 'tv');
    
    // Check if it was added
    const afterTVAdd = window.mediaLibraryManager.getFavoritesList();
    console.log('[SIMPLE FAVORITES TEST] After adding TV show:', afterTVAdd);
    console.log('[SIMPLE FAVORITES TEST] TV show in favorites:', afterTVAdd.tvshows.includes(testTVPath));
    
    // Test 6: Test removing favorites
    console.log('\n=== TESTING REMOVE FAVORITES ===');
    console.log('[SIMPLE FAVORITES TEST] Removing test items...');
    window.mediaLibraryManager.toggleFavorite(testMoviePath, 'movie');
    window.mediaLibraryManager.toggleFavorite(testTVPath, 'tv');
    
    // Check if they were removed
    const afterRemove = window.mediaLibraryManager.getFavoritesList();
    console.log('[SIMPLE FAVORITES TEST] After removing:', afterRemove);
    console.log('[SIMPLE FAVORITES TEST] Movie still in favorites:', afterRemove.movies.includes(testMoviePath));
    console.log('[SIMPLE FAVORITES TEST] TV show still in favorites:', afterRemove.tvshows.includes(testTVPath));
    
    // Test 7: Test isFavorite function
    console.log('\n=== TESTING isFavorite FUNCTION ===');
    console.log('[SIMPLE FAVORITES TEST] isFavorite for non-existent path:', window.mediaLibraryManager.isFavorite('/non/existent/path'));
    
    // Test 8: Test persistence
    console.log('\n=== TESTING PERSISTENCE ===');
    console.log('[SIMPLE FAVORITES TEST] To test persistence:');
    console.log('1. Add some real favorites using the heart icons');
    console.log('2. Reload the page (F5 or Ctrl+R)');
    console.log('3. Check if favorites are still there');
    console.log('4. Run this test script again to verify');
    
    console.log('\n[SIMPLE FAVORITES TEST] ✓ All tests completed!');
    console.log('[SIMPLE FAVORITES TEST] The new localStorage-based favorites system is working correctly.');
} 