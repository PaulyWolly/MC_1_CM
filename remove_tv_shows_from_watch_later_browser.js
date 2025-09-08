
console.log('[REMOVE-TV-SHOWS] Starting TV show removal from Watch Later...');

// Get current Watch Later items
let resumeList = JSON.parse(localStorage.getItem("mediaLibraryResumeList") || "[]");
console.log('[REMOVE-TV-SHOWS] Found', resumeList.length, 'total items in Watch Later');

// Find all TV show items
const tvShowItems = resumeList.filter(item => {
  // Check if it's a TV show by looking for TV show indicators
  const title = (item.title || '').toLowerCase();
  const path = (item.path || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  const mediaType = (item.mediaType || '').toLowerCase();
  
  // TV show indicators
  const hasSeasonEpisode = title.includes('s01e') || title.includes('s02e') || title.includes('s03e') || 
                          title.includes('s04e') || title.includes('s05e') || title.includes('s06e') ||
                          title.includes('s07e') || title.includes('s08e') || title.includes('s09e') ||
                          title.includes('s10e') || title.includes('s11e') || title.includes('s12e') ||
                          title.includes('s13e') || title.includes('s14e') || title.includes('s15e') ||
                          title.includes('s16e') || title.includes('s17e') || title.includes('s18e') ||
                          title.includes('s19e') || title.includes('s20e') || title.includes('s21e') ||
                          title.includes('s22e') || title.includes('s23e') || title.includes('s24e') ||
                          title.includes('s25e') || title.includes('s26e') || title.includes('s27e') ||
                          title.includes('s28e') || title.includes('s29e') || title.includes('s30e');
  
  const hasSeasonInPath = path.includes('season') || path.includes('tv-shows') || path.includes('tv_shows');
  const isTVShowType = type === 'tv-show' || mediaType === 'tv-show';
  
  return hasSeasonEpisode || hasSeasonInPath || isTVShowType;
});

// Find all movie items (keep these)
const movieItems = resumeList.filter(item => {
  const title = (item.title || '').toLowerCase();
  const path = (item.path || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  const mediaType = (item.mediaType || '').toLowerCase();
  
  // Movie indicators
  const hasSeasonEpisode = title.includes('s01e') || title.includes('s02e') || title.includes('s03e') || 
                          title.includes('s04e') || title.includes('s05e') || title.includes('s06e') ||
                          title.includes('s07e') || title.includes('s08e') || title.includes('s09e') ||
                          title.includes('s10e') || title.includes('s11e') || title.includes('s12e') ||
                          title.includes('s13e') || title.includes('s14e') || title.includes('s15e') ||
                          title.includes('s16e') || title.includes('s17e') || title.includes('s18e') ||
                          title.includes('s19e') || title.includes('s20e') || title.includes('s21e') ||
                          title.includes('s22e') || title.includes('s23e') || title.includes('s24e') ||
                          title.includes('s25e') || title.includes('s26e') || title.includes('s27e') ||
                          title.includes('s28e') || title.includes('s29e') || title.includes('s30e');
  
  const hasSeasonInPath = path.includes('season') || path.includes('tv-shows') || path.includes('tv_shows');
  const isTVShowType = type === 'tv-show' || mediaType === 'tv-show';
  
  // If it's NOT a TV show, it's a movie
  return !(hasSeasonEpisode || hasSeasonInPath || isTVShowType);
});

console.log('[REMOVE-TV-SHOWS] Found', tvShowItems.length, 'TV show items to remove');
console.log('[REMOVE-TV-SHOWS] Found', movieItems.length, 'movie items to keep');

// Show what TV shows we're removing
console.log('[REMOVE-TV-SHOWS] TV shows being removed:');
tvShowItems.forEach((item, index) => {
  console.log('[REMOVE-TV-SHOWS]', index + 1 + ':', item.title);
});

// Keep only the movie items
localStorage.setItem("mediaLibraryResumeList", JSON.stringify(movieItems));

console.log('[REMOVE-TV-SHOWS] ✅ COMPLETE: Removed', tvShowItems.length, 'TV shows from Watch Later');
console.log('[REMOVE-TV-SHOWS] ✅ COMPLETE: Kept', movieItems.length, 'movies in Watch Later');
console.log('[REMOVE-TV-SHOWS] All TV shows are now gone, movies are safe!');
