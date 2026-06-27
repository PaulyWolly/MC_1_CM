#!/usr/bin/env node

/*
 * CLEAR TV SHOWS FROM WATCH LATER
 * Removes all TV show entries from both localStorage and JSON file
 * to test if UI is reading from the correct data source
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');
const JSON_FILE = path.join(ROOT_DIR, 'public/components/MediaLibrary/data/watch-later/watch-later-unified.json');
const BACKUP_FILE = path.join(__dirname, 'watch-later-backup-before-tv-clear.json');
const LOCAL_STORAGE_SCRIPT = path.join(__dirname, 'clear_localStorage_tv_shows.js');

console.log('🧹 CLEARING TV SHOWS FROM WATCH LATER');
console.log('=====================================');

try {
    // 1. Backup the current JSON file
    if (fs.existsSync(JSON_FILE)) {
        const currentData = fs.readFileSync(JSON_FILE, 'utf8');
        fs.writeFileSync(BACKUP_FILE, currentData, 'utf8');
        console.log('✅ Backed up current JSON to:', BACKUP_FILE);
    }

    // 2. Read current JSON data
    if (!fs.existsSync(JSON_FILE)) {
        console.log('❌ JSON file does not exist:', JSON_FILE);
        process.exit(1);
    }

    const jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`📊 Original JSON has ${jsonData.length} items`);

    // 3. Filter out TV shows (keep only movies)
    const moviesOnly = jsonData.filter(item => {
        const isTVShow = item.type === 'tvshow' || item.type === 'tv-show' || 
                        item.mediaType === 'tvshow' || item.mediaType === 'tv-show' ||
                        (!item.isMovie && (item.type === 'episode' || item.episodeTitle));
        
        if (isTVShow) {
            console.log(`🗑️  Removing TV show: ${item.TMDBTitle || item.title || 'Unknown'}`);
        }
        
        return !isTVShow;
    });

    console.log(`📊 After filtering: ${moviesOnly.length} items (removed ${jsonData.length - moviesOnly.length} TV shows)`);

    // 4. Write cleaned data back to JSON
    fs.writeFileSync(JSON_FILE, JSON.stringify(moviesOnly, null, 2), 'utf8');
    console.log('✅ Updated JSON file with movies only');

    // 5. Create localStorage clearing script
    const localStorageScript = `
// Run this in your browser console to clear TV shows from localStorage
console.log('🧹 Clearing TV shows from localStorage...');

const resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
console.log('📊 Original localStorage has', resumeList.length, 'items');

// Filter out TV shows
const moviesOnly = resumeList.filter(item => {
    const isTVShow = item.type === 'tvshow' || item.type === 'tv-show' || 
                    item.mediaType === 'tvshow' || item.mediaType === 'tv-show' ||
                    (!item.isMovie && (item.type === 'episode' || item.episodeTitle));
    
    if (isTVShow) {
        console.log('🗑️  Removing TV show from localStorage:', item.title || item.TMDBTitle || 'Unknown');
    }
    
    return !isTVShow;
});

console.log('📊 After filtering: ${moviesOnly.length} items (removed ${resumeList.length - moviesOnly.length} TV shows)');

// Update localStorage
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

console.log('🎉 DONE! TV shows cleared from localStorage');
`;

    fs.writeFileSync(LOCAL_STORAGE_SCRIPT, localStorageScript, 'utf8');
    console.log('✅ Created localStorage clearing script:', LOCAL_STORAGE_SCRIPT);

    console.log('\n🎉 COMPLETE!');
    console.log('============');
    console.log('1. ✅ JSON file updated (TV shows removed)');
    console.log('2. ✅ Backup created:', BACKUP_FILE);
    console.log('3. ✅ localStorage script created:', LOCAL_STORAGE_SCRIPT);
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Run the localStorage script in your browser console');
    console.log('2. Check Watch Later UI - should show only movies');
    console.log('3. Test saving a new TV show to see if it appears');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
