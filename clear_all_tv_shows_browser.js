
console.log('[CLEAR-TV-SHOWS] Starting comprehensive TV show removal from localStorage...');

// Get current Watch Later items
let resumeList = JSON.parse(localStorage.getItem("mediaLibraryResumeList") || "[]");
console.log('[CLEAR-TV-SHOWS] Found', resumeList.length, 'total items in Watch Later');

// Find all TV show items using comprehensive detection
const tvShowItems = resumeList.filter(item => {
  const title = (item.title || '').toLowerCase();
  const path = (item.path || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  const mediaType = (item.mediaType || '').toLowerCase();
  
  // TV show indicators - comprehensive detection
  const hasSeasonEpisode = /s\d+e\d+/i.test(title) || /season\s*\d+/i.test(title);
  const hasSeasonInPath = path.includes('season') || path.includes('tv-shows') || path.includes('tv_shows');
  const isTVShowType = type === 'tv-show' || mediaType === 'tv-show';
  const hasEpisodePattern = /episode\s*\d+/i.test(title) || /e\d+/i.test(title);
  
  return hasSeasonEpisode || hasSeasonInPath || isTVShowType || hasEpisodePattern;
});

// Find all movie items (keep these)
const movieItems = resumeList.filter(item => {
  const title = (item.title || '').toLowerCase();
  const path = (item.path || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  const mediaType = (item.mediaType || '').toLowerCase();
  
  // TV show indicators - comprehensive detection
  const hasSeasonEpisode = /s\d+e\d+/i.test(title) || /season\s*\d+/i.test(title);
  const hasSeasonInPath = path.includes('season') || path.includes('tv-shows') || path.includes('tv_shows');
  const isTVShowType = type === 'tv-show' || mediaType === 'tv-show';
  const hasEpisodePattern = /episode\s*\d+/i.test(title) || /e\d+/i.test(title);
  
  // If it's NOT a TV show, it's a movie
  return !(hasSeasonEpisode || hasSeasonInPath || isTVShowType || hasEpisodePattern);
});

console.log('[CLEAR-TV-SHOWS] Found', tvShowItems.length, 'TV show items to remove');
console.log('[CLEAR-TV-SHOWS] Found', movieItems.length, 'movie items to keep');

// Show what TV shows we're removing
if (tvShowItems.length > 0) {
  console.log('[CLEAR-TV-SHOWS] TV shows being removed:');
  tvShowItems.forEach((item, index) => {
    console.log('[CLEAR-TV-SHOWS]', index + 1 + ':', item.title);
  });
} else {
  console.log('[CLEAR-TV-SHOWS] No TV shows found to remove');
}

// Keep only the movie items
localStorage.setItem("mediaLibraryResumeList", JSON.stringify(movieItems));

console.log('[CLEAR-TV-SHOWS] ✅ COMPLETE: Removed', tvShowItems.length, 'TV shows from Watch Later');
console.log('[CLEAR-TV-SHOWS] ✅ COMPLETE: Kept', movieItems.length, 'movies in Watch Later');
console.log('[CLEAR-TV-SHOWS] All TV shows are now gone, movies are safe!');
console.log('[CLEAR-TV-SHOWS] Refresh your browser to see the changes');
