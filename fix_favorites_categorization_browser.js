// Fix favorites categorization - BROWSER VERSION
// Run this in the browser console (F12 → Console tab)

console.log('🔧 Fixing favorites categorization...');

// Get current favorites
const stored = localStorage.getItem("mediaLibraryFavoritesByType");
if (stored) {
  try {
    const favorites = JSON.parse(stored);
    console.log('📊 Current favorites before fix:');
    console.log('📊 Movies count:', favorites.movies ? favorites.movies.length : 0);
    console.log('📊 TV Shows count:', favorites.tvshows ? favorites.tvshows.length : 0);
    
    // Check if we have unified data available
    if (window.mediaLibraryManager && window.mediaLibraryManager.unifiedData) {
      const unifiedData = window.mediaLibraryManager.unifiedData;
      console.log('✅ Unified data available with', Object.keys(unifiedData).length, 'items');
      
      // Correct categorization for both movies and TV shows arrays
      const correctedMovies = [];
      const correctedTVShows = [];
      
      // Process movies array
      if (favorites.movies && Array.isArray(favorites.movies)) {
        favorites.movies.forEach(item => {
          const path = item.normalizedKey || item.path || item.absPath || '';
          const itemData = unifiedData[path];
          
          if (itemData && itemData.type === 'tv-show') {
            // This is a TV show - move to TV shows array
            correctedTVShows.push(item);
            console.log('📺 Moved TV show from movies to TV shows array (type field):', path);
          } else if (itemData && itemData.type === 'movie') {
            // This is a movie - keep in movies array
            correctedMovies.push(item);
            console.log('🎬 Kept movie in movies array (type field):', path);
          } else {
            // Fallback: check for seasons property (legacy detection)
            if (itemData && itemData.seasons && typeof itemData.seasons === 'object') {
              correctedTVShows.push(item);
              console.log('📺 Moved TV show from movies to TV shows array (seasons fallback):', path);
            } else {
              correctedMovies.push(item);
              console.log('🎬 Kept movie in movies array (fallback):', path);
            }
          }
        });
      }
      
      // Process TV shows array
      if (favorites.tvshows && Array.isArray(favorites.tvshows)) {
        favorites.tvshows.forEach(item => {
          const path = item.normalizedKey || item.path || item.absPath || '';
          const itemData = unifiedData[path];
          
          if (itemData && itemData.type === 'movie') {
            // This is a movie - move to movies array
            correctedMovies.push(item);
            console.log('🎬 Moved movie from TV shows to movies array (type field):', path);
          } else if (itemData && itemData.type === 'tv-show') {
            // This is a TV show - keep in TV shows array
            correctedTVShows.push(item);
            console.log('📺 Kept TV show in TV shows array (type field):', path);
          } else {
            // Fallback: check for seasons property (legacy detection)
            if (itemData && itemData.seasons && typeof itemData.seasons === 'object') {
              correctedTVShows.push(item);
              console.log('📺 Kept TV show in TV shows array (seasons fallback):', path);
            } else {
              correctedMovies.push(item);
              console.log('🎬 Moved movie from TV shows to movies array (fallback):', path);
            }
          }
        });
      }
      
      // Update the favorites object
      const correctedFavorites = {
        movies: correctedMovies,
        tvshows: correctedTVShows
      };
      
      // Save corrected data
      localStorage.setItem("mediaLibraryFavoritesByType", JSON.stringify(correctedFavorites));
      
      console.log('✅ Favorites categorization fixed!');
      console.log('📊 Corrected favorites:');
      console.log('📊 Movies count:', correctedFavorites.movies.length);
      console.log('📊 TV Shows count:', correctedFavorites.tvshows.length);
      
    } else {
      console.log('❌ Unified data not available. Please refresh the page first.');
    }
    
  } catch (e) {
    console.error('❌ Error fixing favorites:', e);
  }
} else {
  console.log('ℹ️ No favorites found in localStorage');
}

console.log('🎯 Next steps:');
console.log('1. Refresh the Favorites page');
console.log('2. TV shows should now appear in the TV-SHOWS section');
console.log('3. Movies should appear in the MOVIES section');
