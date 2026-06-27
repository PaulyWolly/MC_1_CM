// Run this in your browser console to clear TV shows from localStorage ONLY
console.log('🧹 Clearing TV shows from localStorage ONLY...');

const resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
console.log('📊 Original localStorage has', resumeList.length, 'items');

// Filter out TV shows (keep only movies)
const moviesOnly = resumeList.filter(item => {
    const isTVShow = item.type === 'tvshow' || item.type === 'tv-show' || 
                    item.mediaType === 'tvshow' || item.mediaType === 'tv-show' ||
                    (!item.isMovie && (item.type === 'episode' || item.episodeTitle));
    
    if (isTVShow) {
        console.log('🗑️  Removing TV show from localStorage:', item.title || item.TMDBTitle || 'Unknown');
    }
    
    return !isTVShow;
});

console.log('📊 After filtering: ' + moviesOnly.length + ' items (removed ' + (resumeList.length - moviesOnly.length) + ' TV shows)');

// Update localStorage with movies only
localStorage.setItem('mediaLibraryResumeList', JSON.stringify(moviesOnly));
console.log('✅ Updated localStorage with movies only');

// Clear cache and refresh UI
if (window.mediaLibraryManager) {
    window.mediaLibraryManager.clearCache('watchlater');
    console.log('✅ Cleared Watch Later cache');
    
    // Force refresh if on Watch Later tab
    if (window.mediaLibraryManager.currentTab === 'watchlater') {
        window.mediaLibraryManager.forceRefreshWatchLaterData();
        console.log('✅ Forced Watch Later UI refresh');
    }
}

console.log('🎉 DONE! TV shows cleared from localStorage only');
console.log('📋 Now check if TV shows still appear in UI (they should, if reading from JSON)');
