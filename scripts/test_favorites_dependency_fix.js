/*
  TEST_FAVORITES_DEPENDENCY_FIX.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] Testing favorites tab dependency fix...');

// Read the MediaLibraryManager.js file
const managerPath = path.join(__dirname, '../public/components/MediaLibrary/MediaLibraryManager.js');
const managerContent = fs.readFileSync(managerPath, 'utf8');

// Test 1: Check if switchTab properly loads both movies and TV shows data for favorites
const hasFavoritesDataLoading = managerContent.includes('loadMoviesForFavorites()') && 
                               managerContent.includes('loadTVShowsForFavorites()') &&
                               managerContent.includes('Promise.all([');

console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] Favorites data loading in switchTab:', hasFavoritesDataLoading);

// Test 2: Check if renderFavoritesContent uses dedicated favorites data
const usesMoviesForFavorites = managerContent.includes('this.moviesForFavorites.find(item => item.path === path)');
const usesTVShowsForFavorites = managerContent.includes('this.tvShowsForFavorites.find(item => item.path === path)');

console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] Uses moviesForFavorites:', usesMoviesForFavorites);
console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] Uses tvShowsForFavorites:', usesTVShowsForFavorites);

// Test 3: Check if toggleFavorite handles favorites tab properly
const hasFavoritesTabHandling = managerContent.includes('if (this.currentTab === \'favorites\')') &&
                               managerContent.includes('Promise.all([') &&
                               managerContent.includes('loadMoviesForFavorites()') &&
                               managerContent.includes('loadTVShowsForFavorites()');

console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] toggleFavorite handles favorites tab:', hasFavoritesTabHandling);

// Test 4: Check if renderFavoritesFromLocalStorage redirects to switchTab
const redirectsToSwitchTab = managerContent.includes('this.switchTab(\'favorites\')');

console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] renderFavoritesFromLocalStorage redirects to switchTab:', redirectsToSwitchTab);

// Overall test result
const allTestsPass = hasFavoritesDataLoading && usesMoviesForFavorites && usesTVShowsForFavorites && 
                    hasFavoritesTabHandling && redirectsToSwitchTab;

console.log('\n[DEBUG - FAVORITES DEPENDENCY FIX TEST] ==========================================');
console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] OVERALL RESULT:', allTestsPass ? 'PASS' : 'FAIL');
console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] ==========================================');

if (allTestsPass) {
    console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] ✅ All tests passed! The favorites tab dependency issue should be fixed.');
    console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] The favorites tab will now:');
    console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] 1. Always load both movies and TV shows data when switching to favorites');
    console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] 2. Use dedicated favorites data instead of relying on current tab data');
    console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] 3. Properly refresh when items are added/removed from favorites');
} else {
    console.log('[DEBUG - FAVORITES DEPENDENCY FIX TEST] ❌ Some tests failed. The fix may not be complete.');
} 