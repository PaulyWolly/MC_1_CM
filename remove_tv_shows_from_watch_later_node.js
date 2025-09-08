const fs = require('fs');
const path = require('path');

console.log('[REMOVE-TV-SHOWS-NODE] Removing ALL TV shows from Watch Later while keeping movies...');

// First, let's check if there's a Watch Later backup file we can work with
const watchLaterBackupPath = path.join(__dirname, 'watch_later_backup.json');
const watchLaterRawPath = path.join(__dirname, 'watch_later_raw.json');

let watchLaterData = null;

// Try to read from backup files first
if (fs.existsSync(watchLaterBackupPath)) {
  console.log('[REMOVE-TV-SHOWS-NODE] Found watch_later_backup.json, reading...');
  watchLaterData = JSON.parse(fs.readFileSync(watchLaterBackupPath, 'utf8'));
} else if (fs.existsSync(watchLaterRawPath)) {
  console.log('[REMOVE-TV-SHOWS-NODE] Found watch_later_raw.json, reading...');
  watchLaterData = JSON.parse(fs.readFileSync(watchLaterRawPath, 'utf8'));
} else {
  console.log('[REMOVE-TV-SHOWS-NODE] No Watch Later backup files found.');
  console.log('[REMOVE-TV-SHOWS-NODE] Creating a script to extract Watch Later data from browser...');
  
  // Create a browser script to export the current Watch Later data
  const exportScript = `
console.log('[EXPORT-WATCH-LATER] Exporting current Watch Later data...');

// Get current Watch Later items
let resumeList = JSON.parse(localStorage.getItem("mediaLibraryResumeList") || "[]");
console.log('[EXPORT-WATCH-LATER] Found', resumeList.length, 'items in Watch Later');

// Create a downloadable JSON file
const dataStr = JSON.stringify(resumeList, null, 2);
const dataBlob = new Blob([dataStr], {type: 'application/json'});
const url = URL.createObjectURL(dataBlob);
const link = document.createElement('a');
link.href = url;
link.download = 'watch_later_export.json';
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
URL.revokeObjectURL(url);

console.log('[EXPORT-WATCH-LATER] ✅ Watch Later data exported as watch_later_export.json');
console.log('[EXPORT-WATCH-LATER] Download the file and place it in your project root, then run the Node script again');
`;

  fs.writeFileSync('export_watch_later_browser.js', exportScript);
  console.log('[REMOVE-TV-SHOWS-NODE] Created export_watch_later_browser.js');
  console.log('[REMOVE-TV-SHOWS-NODE] Run this in your browser console to export Watch Later data');
  console.log('[REMOVE-TV-SHOWS-NODE] Then place the downloaded file in your project root and run this script again');
  process.exit(0);
}

// Handle different backup file formats
if (watchLaterData && watchLaterData.items && Array.isArray(watchLaterData.items)) {
  // Format: { timestamp: "...", itemCount: 5, items: [...] }
  watchLaterData = watchLaterData.items;
  console.log('[REMOVE-TV-SHOWS-NODE] Converted backup format to array');
} else if (!Array.isArray(watchLaterData)) {
  console.log('[REMOVE-TV-SHOWS-NODE] ❌ Invalid Watch Later data format');
  process.exit(1);
}

console.log('[REMOVE-TV-SHOWS-NODE] Found', watchLaterData.length, 'total items in Watch Later');

// Find all TV show items
const tvShowItems = watchLaterData.filter(item => {
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
const movieItems = watchLaterData.filter(item => {
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
  
  // If it's NOT a TV show, it's a movie
  return !(hasSeasonEpisode || hasSeasonInPath || isTVShowType);
});

console.log('[REMOVE-TV-SHOWS-NODE] Found', tvShowItems.length, 'TV show items to remove');
console.log('[REMOVE-TV-SHOWS-NODE] Found', movieItems.length, 'movie items to keep');

// Show what TV shows we're removing
console.log('[REMOVE-TV-SHOWS-NODE] TV shows being removed:');
tvShowItems.forEach((item, index) => {
  console.log('[REMOVE-TV-SHOWS-NODE]', index + 1 + ':', item.title);
});

// Create backup of original data
const backupPath = path.join(__dirname, `watch_later_backup_before_tv_removal_${Date.now()}.json`);
fs.writeFileSync(backupPath, JSON.stringify(watchLaterData, null, 2));
console.log('[REMOVE-TV-SHOWS-NODE] Created backup:', backupPath);

// Save the cleaned data (movies only)
const cleanedDataPath = path.join(__dirname, 'watch_later_movies_only.json');
fs.writeFileSync(cleanedDataPath, JSON.stringify(movieItems, null, 2));

// Create a browser script to import the cleaned data
const importScript = `
console.log('[IMPORT-CLEANED-WATCH-LATER] Importing cleaned Watch Later data (movies only)...');

// Read the cleaned data (this would need to be pasted in or loaded from a file)
const cleanedData = ${JSON.stringify(movieItems, null, 2)};

// Save to localStorage
localStorage.setItem("mediaLibraryResumeList", JSON.stringify(cleanedData));

console.log('[IMPORT-CLEANED-WATCH-LATER] ✅ COMPLETE: Imported', cleanedData.length, 'movies to Watch Later');
console.log('[IMPORT-CLEANED-WATCH-LATER] All TV shows removed, movies preserved!');
console.log('[IMPORT-CLEANED-WATCH-LATER] Refresh your browser to see the changes');
`;

fs.writeFileSync('import_cleaned_watch_later_browser.js', importScript);

console.log('[REMOVE-TV-SHOWS-NODE] ✅ COMPLETE: Removed', tvShowItems.length, 'TV shows from Watch Later');
console.log('[REMOVE-TV-SHOWS-NODE] ✅ COMPLETE: Kept', movieItems.length, 'movies in Watch Later');
console.log('[REMOVE-TV-SHOWS-NODE] Created files:');
console.log('[REMOVE-TV-SHOWS-NODE] - watch_later_movies_only.json (cleaned data)');
console.log('[REMOVE-TV-SHOWS-NODE] - import_cleaned_watch_later_browser.js (browser import script)');
console.log('[REMOVE-TV-SHOWS-NODE] Run the import script in your browser console to apply the changes');
