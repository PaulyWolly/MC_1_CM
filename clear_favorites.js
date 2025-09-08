const fs = require('fs');

console.log('🧹 [CLEAR FAVORITES] Starting to clear all favorites data...');

// Since this is a Node script, we can't directly access browser localStorage
// Instead, we'll create a browser console script that you can run

const browserScript = `
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
`;

// Write the browser script to a file for easy copying
fs.writeFileSync('clear_favorites_browser.js', browserScript, 'utf8');

console.log('📝 [CLEAR FAVORITES] Browser script created: clear_favorites_browser.js');
console.log('');
console.log('🔧 [CLEAR FAVORITES] To clear favorites, you can either:');
console.log('');
console.log('   OPTION 1 - Copy and paste this into browser console:');
console.log('   ═══════════════════════════════════════════════════');
console.log('');
console.log(browserScript);
console.log('');
console.log('   OPTION 2 - Open clear_favorites_browser.js and copy/paste from there');
console.log('');
console.log('🎯 [CLEAR FAVORITES] After running in browser console, refresh the page!');
