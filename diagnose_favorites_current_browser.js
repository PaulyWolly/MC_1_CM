// Diagnose current favorites - BROWSER VERSION
// Run this in the browser console (F12 → Console tab)

console.log('🔍 Diagnosing current favorites...');

// Get current favorites
const stored = localStorage.getItem("mediaLibraryFavoritesByType");
if (stored) {
  try {
    const favorites = JSON.parse(stored);
    console.log('📊 Current favorites:');
    console.log('📊 Movies count:', favorites.movies ? favorites.movies.length : 0);
    console.log('📊 TV Shows count:', favorites.tvshows ? favorites.tvshows.length : 0);
    
    // Check if we have unified data available
    if (window.mediaLibraryManager && window.mediaLibraryManager.unifiedData) {
      const unifiedData = window.mediaLibraryManager.unifiedData;
      console.log('✅ Unified data available with', Object.keys(unifiedData).length, 'items');
      
      // Sample some items from movies array
      if (favorites.movies && favorites.movies.length > 0) {
        console.log('🎬 Sample items in MOVIES array:');
        favorites.movies.slice(0, 5).forEach((item, index) => {
          const path = item.normalizedKey || item.path || item.absPath || '';
          const itemData = unifiedData[path];
          const type = itemData ? itemData.type : 'unknown';
          console.log(`  ${index + 1}. ${item.name || item.title || path} - Type: ${type}`);
        });
      }
      
      // Sample some items from TV shows array
      if (favorites.tvshows && favorites.tvshows.length > 0) {
        console.log('📺 Sample items in TV-SHOWS array:');
        favorites.tvshows.slice(0, 5).forEach((item, index) => {
          const path = item.normalizedKey || item.path || item.absPath || '';
          const itemData = unifiedData[path];
          const type = itemData ? itemData.type : 'unknown';
          console.log(`  ${index + 1}. ${item.name || item.title || path} - Type: ${type}`);
        });
      }
      
    } else {
      console.log('❌ Unified data not available. Please refresh the page first.');
    }
    
  } catch (e) {
    console.error('❌ Error reading favorites:', e);
  }
} else {
  console.log('ℹ️ No favorites found in localStorage');
}
