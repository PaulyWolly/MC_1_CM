
// Clear all favorites-related localStorage keys
console.log('🧹 [CLEAR FAVORITES] Clearing all favorites data from localStorage...');

const keysToRemove = [
  'mediaLibraryFavoritesByType',
  'mediaLibraryFavoritesMigrationCompleted',
  'mediaLibraryFavorites',
  'favorites',
  'tvFavorites',
  'tvShowsFavorites',
  'movieFavorites'
];

let removedCount = 0;
let foundKeys = [];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    foundKeys.push(key);
    localStorage.removeItem(key);
    removedCount++;
    console.log('✅ [CLEAR FAVORITES] Removed:', key);
  }
});

console.log('📊 [CLEAR FAVORITES] Summary:');
console.log('   - Keys found and removed:', removedCount);
console.log('   - Removed keys:', foundKeys);

if (removedCount === 0) {
  console.log('ℹ️ [CLEAR FAVORITES] No favorites data found to clear');
} else {
  console.log('🎉 [CLEAR FAVORITES] All favorites cleared! You can now start fresh.');
  console.log('💡 [CLEAR FAVORITES] Refresh the page to see the changes.');
}
