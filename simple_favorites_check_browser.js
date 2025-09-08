// Simple favorites check - BROWSER VERSION
// Run this in the browser console (F12 → Console tab)

console.log('🔍 Simple favorites check...');

// Check what's in localStorage
console.log('📋 All localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.includes('favorite')) {
    console.log(`Key: ${key}`);
    try {
      const value = JSON.parse(localStorage.getItem(key));
      console.log(`Value:`, value);
    } catch (e) {
      console.log(`Value (not JSON):`, localStorage.getItem(key));
    }
  }
}

// Check specific favorites key
const favoritesKey = 'mediaLibraryFavoritesByType';
const favoritesData = localStorage.getItem(favoritesKey);
console.log(`\n📊 ${favoritesKey}:`);
if (favoritesData) {
  try {
    const parsed = JSON.parse(favoritesData);
    console.log('Parsed data:', parsed);
    console.log('Movies count:', parsed.movies ? parsed.movies.length : 0);
    console.log('TV Shows count:', parsed.tvshows ? parsed.tvshows.length : 0);
    
    if (parsed.movies && parsed.movies.length > 0) {
      console.log('First movie item:', parsed.movies[0]);
    }
  } catch (e) {
    console.log('Error parsing:', e);
    console.log('Raw data:', favoritesData);
  }
} else {
  console.log('No data found for this key');
}

// Check if mediaLibraryManager exists
console.log('\n🔍 MediaLibraryManager check:');
console.log('window.mediaLibraryManager exists:', !!window.mediaLibraryManager);
if (window.mediaLibraryManager) {
  console.log('unifiedData exists:', !!window.mediaLibraryManager.unifiedData);
  if (window.mediaLibraryManager.unifiedData) {
    console.log('unifiedData keys count:', Object.keys(window.mediaLibraryManager.unifiedData).length);
  }
}
