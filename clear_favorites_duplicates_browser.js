// Clear favorites duplicates and reset migration - BROWSER VERSION
// Run this in the browser console (F12 → Console tab)

console.log('🧹 Clearing favorites duplicates and resetting migration...');

// Clear the migration flag so it can run again
localStorage.removeItem('mediaLibraryFavoritesMigrationCompleted');
console.log('✅ Migration flag cleared');

// Get current favorites
const stored = localStorage.getItem("mediaLibraryFavoritesByType");
if (stored) {
  try {
    const favorites = JSON.parse(stored);
    console.log('📊 Current favorites:', favorites);
    console.log('📊 Movies count:', favorites.movies ? favorites.movies.length : 0);
    console.log('📊 TV Shows count:', favorites.tvshows ? favorites.tvshows.length : 0);
    
    // Clear the favorites to start fresh
    localStorage.removeItem("mediaLibraryFavoritesByType");
    console.log('🗑️ Favorites cleared - will be rebuilt on next page load');
    
  } catch (e) {
    console.error('❌ Error parsing favorites:', e);
  }
} else {
  console.log('ℹ️ No favorites found in localStorage');
}

console.log('🎯 Next steps:');
console.log('1. Refresh the Favorites page');
console.log('2. The migration will run once and create clean data');
console.log('3. Test clicking hearts to ensure no duplicates are created');
