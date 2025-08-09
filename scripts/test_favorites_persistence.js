/*
  TEST_FAVORITES_PERSISTENCE.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

// Test script to verify favorites persistence in localStorage
// Run this in the browser console to test the favorites system

console.log('[TEST - FAVORITES] Starting favorites persistence test...');

// Test 1: Check current localStorage state
console.log('\n=== TEST 1: Current localStorage State ===');
const currentFavs = localStorage.getItem('mediaLibraryFavoritesByType');
console.log('Raw localStorage data:', currentFavs);
console.log('Parsed data:', JSON.parse(currentFavs || '{}'));

// Test 2: Test adding a movie favorite
console.log('\n=== TEST 2: Adding Movie Favorite ===');
const testMoviePath = '/test/movie/path.mp4';
const testFavs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
if (!testFavs.movies) testFavs.movies = [];
if (!testFavs.tvshows) testFavs.tvshows = [];

// Add test movie
testFavs.movies.push(testMoviePath);
localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(testFavs));
console.log('Added test movie to favorites');

// Verify it was saved
const savedFavs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
console.log('After saving - localStorage:', savedFavs);
console.log('Test movie in favorites:', savedFavs.movies?.includes(testMoviePath));

// Test 3: Test adding a TV show favorite
console.log('\n=== TEST 3: Adding TV Show Favorite ===');
const testTVPath = '/test/tvshow/path';
testFavs.tvshows.push(testTVPath);
localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(testFavs));
console.log('Added test TV show to favorites');

// Verify it was saved
const savedFavs2 = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
console.log('After saving TV show - localStorage:', savedFavs2);
console.log('Test TV show in favorites:', savedFavs2.tvshows?.includes(testTVPath));

// Test 4: Test the isFavorite function
console.log('\n=== TEST 4: Testing isFavorite Function ===');
if (window.mediaLibraryManager) {
    console.log('Movie is favorite:', window.mediaLibraryManager.isFavorite(testMoviePath));
    console.log('TV show is favorite:', window.mediaLibraryManager.isFavorite(testTVPath));
    console.log('Non-existent path is favorite:', window.mediaLibraryManager.isFavorite('/non/existent/path'));
} else {
    console.log('mediaLibraryManager not available');
}

// Test 5: Test the getFavoritesList function
console.log('\n=== TEST 5: Testing getFavoritesList Function ===');
if (window.mediaLibraryManager) {
    const favoritesList = window.mediaLibraryManager.getFavoritesList();
    console.log('getFavoritesList result:', favoritesList);
    console.log('Movies count:', favoritesList.movies?.length || 0);
    console.log('TV shows count:', favoritesList.tvshows?.length || 0);
} else {
    console.log('mediaLibraryManager not available');
}

// Test 6: Test removing favorites
console.log('\n=== TEST 6: Testing Remove Favorites ===');
// Remove test items
testFavs.movies = testFavs.movies.filter(p => p !== testMoviePath);
testFavs.tvshows = testFavs.tvshows.filter(p => p !== testTVPath);
localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(testFavs));
console.log('Removed test items from favorites');

// Verify they were removed
const finalFavs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
console.log('Final localStorage state:', finalFavs);
console.log('Test movie still in favorites:', finalFavs.movies?.includes(testMoviePath));
console.log('Test TV show still in favorites:', finalFavs.tvshows?.includes(testTVPath));

// Test 7: Test localStorage persistence across page reloads
console.log('\n=== TEST 7: localStorage Persistence Test ===');
console.log('To test persistence across page reloads:');
console.log('1. Add some real favorites using the heart icons');
console.log('2. Reload the page (F5 or Ctrl+R)');
console.log('3. Check if favorites are still there');
console.log('4. Run this test script again to verify');

console.log('\n[TEST - FAVORITES] Test complete!'); 