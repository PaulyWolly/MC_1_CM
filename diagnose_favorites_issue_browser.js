// Diagnose favorites categorization issue - BROWSER VERSION
// Run this in the browser console (F12 → Console tab)

console.log('🔍 Diagnosing favorites categorization issue...');

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
      
      // Sample some items from movies array to see their structure
      if (favorites.movies && favorites.movies.length > 0) {
        console.log('🔍 Sample movie items:');
        favorites.movies.slice(0, 3).forEach((item, index) => {
          const path = item.normalizedKey || item.path || item.absPath || '';
          console.log(`Movie ${index + 1}:`, {
            path: path,
            title: item.title || item.TMDBTitle || item.name,
            hasUnifiedData: !!unifiedData[path],
            unifiedType: unifiedData[path] ? unifiedData[path].type : 'NOT_FOUND',
            unifiedData: unifiedData[path] ? Object.keys(unifiedData[path]) : 'N/A'
          });
        });
      }
      
      // Check if any items in movies array are actually TV shows
      let tvShowsInMovies = 0;
      let moviesInMovies = 0;
      let notFoundInUnified = 0;
      
      if (favorites.movies && Array.isArray(favorites.movies)) {
        favorites.movies.forEach(item => {
          const path = item.normalizedKey || item.path || item.absPath || '';
          const itemData = unifiedData[path];
          
          if (itemData) {
            if (itemData.type === 'tv-show') {
              tvShowsInMovies++;
            } else if (itemData.type === 'movie') {
              moviesInMovies++;
            }
          } else {
            notFoundInUnified++;
          }
        });
      }
      
      console.log('📊 Analysis of movies array:');
      console.log('📺 TV shows in movies array:', tvShowsInMovies);
      console.log('🎬 Movies in movies array:', moviesInMovies);
      console.log('❓ Not found in unified data:', notFoundInUnified);
      
      // Show some unified data keys to see the structure
      console.log('🔍 Sample unified data keys:');
      const sampleKeys = Object.keys(unifiedData).slice(0, 5);
      sampleKeys.forEach(key => {
        console.log(`Key: ${key}, Type: ${unifiedData[key].type}`);
      });
      
    } else {
      console.log('❌ Unified data not available!');
      console.log('💡 Try refreshing the page first to load unified data');
    }
    
  } catch (e) {
    console.error('❌ Error analyzing favorites:', e);
  }
} else {
  console.log('ℹ️ No favorites found in localStorage');
}
