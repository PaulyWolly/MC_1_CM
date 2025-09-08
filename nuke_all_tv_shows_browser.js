
console.log('[NUKE-ALL-TV-SHOWS] Starting comprehensive TV show removal...');

// Get current Watch Later items
let resumeList = JSON.parse(localStorage.getItem("mediaLibraryResumeList") || "[]");
console.log('[NUKE-ALL-TV-SHOWS] Found', resumeList.length, 'total items in Watch Later');

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

console.log('[NUKE-ALL-TV-SHOWS] Found', tvShowItems.length, 'TV show items to remove');
console.log('[NUKE-ALL-TV-SHOWS] Found', movieItems.length, 'movie items to keep');

// Show what TV shows we're removing
if (tvShowItems.length > 0) {
  console.log('[NUKE-ALL-TV-SHOWS] TV shows being removed:');
  tvShowItems.forEach((item, index) => {
    console.log('[NUKE-ALL-TV-SHOWS]', index + 1 + ':', item.title);
  });
} else {
  console.log('[NUKE-ALL-TV-SHOWS] No TV shows found to remove');
}

// Keep only the movie items
localStorage.setItem("mediaLibraryResumeList", JSON.stringify(movieItems));

// Also clear any other localStorage keys that might contain TV show data
const keysToCheck = ['mediaLibraryResumeList', 'watchLaterList', 'resumeList', 'mediaLibraryData'];
keysToCheck.forEach(key => {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(item => {
          const title = (item.title || '').toLowerCase();
          const path = (item.path || '').toLowerCase();
          const hasSeasonEpisode = /s\d+e\d+/i.test(title) || /season\s*\d+/i.test(title);
          const hasSeasonInPath = path.includes('season') || path.includes('tv-shows') || path.includes('tv_shows');
          return !(hasSeasonEpisode || hasSeasonInPath);
        });
        localStorage.setItem(key, JSON.stringify(cleaned));
        console.log('[NUKE-ALL-TV-SHOWS] Cleaned', key, ':', parsed.length, '->', cleaned.length, 'items');
      }
    }
  } catch (e) {
    // Ignore errors
  }
});

console.log('[NUKE-ALL-TV-SHOWS] ✅ COMPLETE: Removed', tvShowItems.length, 'TV shows from localStorage');
console.log('[NUKE-ALL-TV-SHOWS] ✅ COMPLETE: Kept', movieItems.length, 'movies in Watch Later');
console.log('[NUKE-ALL-TV-SHOWS] All TV shows are now gone, movies are safe!');
console.log('[NUKE-ALL-TV-SHOWS] Refresh your browser to see the changes');
console.log('[NUKE-ALL-TV-SHOWS] If TV shows still appear, they are being synced from MongoDB - run the MongoDB cleanup script');
