// Update favorites from old "tv" format to new "tv-show" format - BROWSER VERSION
// Run this in the browser console (F12 → Console tab)

console.log('🔄 Updating favorites from old "tv" format to new "tv-show" format...');

// Get current favorites
const stored = localStorage.getItem("mediaLibraryFavoritesByType");
if (stored) {
  try {
    const favorites = JSON.parse(stored);
    console.log('📊 Current favorites before update:');
    console.log('📊 Movies count:', favorites.movies ? favorites.movies.length : 0);
    console.log('📊 TV Shows count:', favorites.tvshows ? favorites.tvshows.length : 0);
    
    let updatedCount = 0;
    
    // Update movies array - change "tv" to "tv-show"
    if (favorites.movies && Array.isArray(favorites.movies)) {
      favorites.movies.forEach(item => {
        if (item.type === 'tv') {
          item.type = 'tv-show';
          updatedCount++;
          console.log('📺 Updated movie item from "tv" to "tv-show":', item.normalizedKey || item.path);
        }
      });
    }
    
    // Update TV shows array - change "tv" to "tv-show"
    if (favorites.tvshows && Array.isArray(favorites.tvshows)) {
      favorites.tvshows.forEach(item => {
        if (item.type === 'tv') {
          item.type = 'tv-show';
          updatedCount++;
          console.log('📺 Updated TV show item from "tv" to "tv-show":', item.normalizedKey || item.path);
        }
      });
    }
    
    // Save updated data
    localStorage.setItem("mediaLibraryFavoritesByType", JSON.stringify(favorites));
    
    console.log('✅ Favorites format updated!');
    console.log('📊 Updated items count:', updatedCount);
    console.log('📊 Final favorites:');
    console.log('📊 Movies count:', favorites.movies ? favorites.movies.length : 0);
    console.log('📊 TV Shows count:', favorites.tvshows ? favorites.tvshows.length : 0);
    
  } catch (e) {
    console.error('❌ Error updating favorites format:', e);
  }
} else {
  console.log('ℹ️ No favorites found in localStorage');
}

console.log('🎯 Next steps:');
console.log('1. Refresh the Favorites page');
console.log('2. All items should now use "tv-show" format');
console.log('3. Future heart clicks will use the correct format!');
