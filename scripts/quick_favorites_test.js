// Quick test script for favorites functionality
// Run this in the browser console

console.log('[QUICK TEST - FAVORITES] Testing favorites functionality...');

// Test 1: Check if mediaLibraryManager exists
if (!window.mediaLibraryManager) {
    console.error('[QUICK TEST - FAVORITES] mediaLibraryManager not found!');
    console.log('Make sure the Media Library is open and initialized.');
} else {
    console.log('[QUICK TEST - FAVORITES] mediaLibraryManager found ✓');
    
    // Test 2: Check localStorage
    const favs = localStorage.getItem('mediaLibraryFavoritesByType');
    console.log('[QUICK TEST - FAVORITES] localStorage data:', favs);
    
    // Test 3: Test isFavorite function
    const testPath = '/test/path.mp4';
    const isFav = window.mediaLibraryManager.isFavorite(testPath);
    console.log('[QUICK TEST - FAVORITES] isFavorite test:', isFav);
    
    // Test 4: Test getFavoritesList function
    const favoritesList = window.mediaLibraryManager.getFavoritesList();
    console.log('[QUICK TEST - FAVORITES] getFavoritesList result:', favoritesList);
    
    // Test 5: Check if there are any existing favorites
    const totalFavorites = (favoritesList.movies?.length || 0) + (favoritesList.tvshows?.length || 0);
    console.log('[QUICK TEST - FAVORITES] Total favorites found:', totalFavorites);
    
    if (totalFavorites > 0) {
        console.log('[QUICK TEST - FAVORITES] ✓ Favorites are working!');
        console.log('Movies:', favoritesList.movies?.length || 0);
        console.log('TV Shows:', favoritesList.tvshows?.length || 0);
    } else {
        console.log('[QUICK TEST - FAVORITES] No favorites found yet.');
        console.log('Try clicking some heart icons to add favorites!');
    }
}

console.log('[QUICK TEST - FAVORITES] Test complete!'); 