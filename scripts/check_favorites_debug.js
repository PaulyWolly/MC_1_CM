/*
  CHECK_FAVORITES_DEBUG.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

// Debug script to check favorites localStorage data
// Run this in the browser console to see what's stored

console.log('[DEBUG - FAVORITES] Checking localStorage favorites data...');

// Check the raw localStorage data
const rawFavs = localStorage.getItem('mediaLibraryFavoritesByType');
console.log('[DEBUG - FAVORITES] Raw localStorage data:', rawFavs);

// Parse and display the favorites
const favs = JSON.parse(rawFavs || '{}');
console.log('[DEBUG - FAVORITES] Parsed favorites object:', favs);

// Check movies array
console.log('[DEBUG - FAVORITES] Movies array:', favs.movies || []);
console.log('[DEBUG - FAVORITES] Movies count:', (favs.movies || []).length);

// Check TV shows array
console.log('[DEBUG - FAVORITES] TV Shows array:', favs.tvshows || []);
console.log('[DEBUG - FAVORITES] TV Shows count:', (favs.tvshows || []).length);

// Check if mediaLibraryManager exists and has data
if (window.mediaLibraryManager) {
    console.log('[DEBUG - FAVORITES] mediaLibraryManager exists');
    console.log('[DEBUG - FAVORITES] mediaLibrary count:', window.mediaLibraryManager.mediaLibrary?.length || 0);
    console.log('[DEBUG - FAVORITES] TV Shows count:', window.mediaLibraryManager.getTVShows()?.length || 0);
    
    // Test the getFavoritesList method
    const favoritesList = window.mediaLibraryManager.getFavoritesList();
    console.log('[DEBUG - FAVORITES] getFavoritesList() result:', favoritesList);
    console.log('[DEBUG - FAVORITES] Favorites movies found:', favoritesList.movies?.length || 0);
    console.log('[DEBUG - FAVORITES] Favorites TV shows found:', favoritesList.tvshows?.length || 0);
} else {
    console.log('[DEBUG - FAVORITES] mediaLibraryManager not found');
}

console.log('[DEBUG - FAVORITES] Debug complete'); 