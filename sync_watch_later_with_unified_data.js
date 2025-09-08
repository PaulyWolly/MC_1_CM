/*
  SYNC_WATCH_LATER_WITH_UNIFIED_DATA.JS
  Comprehensive sync script to update existing MongoDB Watch Later entries
  with complete unified data structure from tv-shows-unified.json and movies-unified.json
  Created: 09/03/2025
*/

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Function to make HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = client.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Function to load unified data
function loadUnifiedData() {
  try {
    console.log('📂 [SYNC-UNIFIED] Loading unified data files...');
    
    // Load TV shows unified data
    const tvShowsPath = path.join(__dirname, 'public', 'components', 'MediaLibrary', 'data', 'tv-shows', 'tv-shows-unified.json');
    const tvShowsData = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
    console.log(`📺 [SYNC-UNIFIED] Loaded ${Object.keys(tvShowsData).length} TV shows`);
    
    // Load movies unified data
    const moviesPath = path.join(__dirname, 'public', 'components', 'MediaLibrary', 'data', 'movies', 'movies-unified.json');
    const moviesData = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
    console.log(`🎬 [SYNC-UNIFIED] Loaded ${Object.keys(moviesData).length} movies`);
    
    return { tvShowsData, moviesData };
  } catch (error) {
    console.error('❌ [SYNC-UNIFIED] Error loading unified data:', error);
    throw error;
  }
}

// Function to find matching unified data for a Watch Later item
function findMatchingUnifiedData(item, unifiedData) {
  const { tvShowsData, moviesData } = unifiedData;
  
  // Try to match by file path first
  const itemPath = (item.filePath || item.absPath || "").replace(/\\/g, "/").toLowerCase();
  
  // Search TV shows
  for (const [key, tvShow] of Object.entries(tvShowsData)) {
    if (tvShow.files && Array.isArray(tvShow.files)) {
      for (const file of tvShow.files) {
        const unifiedPath = (file.path || file.absPath || "").replace(/\\/g, "/").toLowerCase();
        if (unifiedPath && itemPath && unifiedPath === itemPath) {
          return { type: 'tv-show', data: tvShow, key };
        }
      }
    }
  }
  
  // Search movies
  for (const [key, movie] of Object.entries(moviesData)) {
    if (movie.files && Array.isArray(movie.files)) {
      for (const file of movie.files) {
        const unifiedPath = (file.path || file.absPath || "").replace(/\\/g, "/").toLowerCase();
        if (unifiedPath && itemPath && unifiedPath === itemPath) {
          return { type: 'movie', data: movie, key };
        }
      }
    }
  }
  
  // Try to match by title
  const itemTitle = (item.title || "").toLowerCase();
  
  // Search TV shows by title
  for (const [key, tvShow] of Object.entries(tvShowsData)) {
    const unifiedTitle = (tvShow.TMDBTitle || tvShow.title || "").toLowerCase();
    if (unifiedTitle && itemTitle && unifiedTitle.includes(itemTitle)) {
      return { type: 'tv-show', data: tvShow, key };
    }
  }
  
  // Search movies by title
  for (const [key, movie] of Object.entries(moviesData)) {
    const unifiedTitle = (movie.TMDBTitle || movie.title || "").toLowerCase();
    if (unifiedTitle && itemTitle && unifiedTitle.includes(itemTitle)) {
      return { type: 'movie', data: movie, key };
    }
  }
  
  return null;
}

// Function to create updated item with unified data
function createUpdatedItem(originalItem, unifiedMatch) {
  if (!unifiedMatch) {
    return null; // No unified data found
  }
  
  const { type, data: unifiedData, key } = unifiedMatch;
  
  // Create updated item with complete unified structure
  const updatedItem = {
    // === PRESERVE WATCH LATER SPECIFIC FIELDS ===
    currentTime: originalItem.currentTime || 0,
    duration: originalItem.duration || 0,
    lastWatched: originalItem.lastWatched || new Date(),
    addedAt: originalItem.addedAt || new Date(),
    lastUpdated: new Date(),
    
    // === PRESERVE API COMPATIBILITY FIELDS ===
    mediaId: originalItem.mediaId,
    mediaType: type,
    filePath: originalItem.filePath,
    fileName: originalItem.fileName,
    absPath: originalItem.absPath,
    
    // === ADD COMPLETE UNIFIED DATA STRUCTURE ===
    type: type,
    TMDBTitle: unifiedData.TMDBTitle,
    normalizedKey: unifiedData.normalizedKey,
    title: unifiedData.title,
    tmdbId: unifiedData.tmdbId,
    poster: unifiedData.poster,
    about: unifiedData.about,
    genres: unifiedData.genres,
    cast: unifiedData.cast,
    files: unifiedData.files,
    
    // === TV SHOW SPECIFIC FIELDS ===
    ...(type === 'tv-show' && {
      season: originalItem.season || unifiedData.season,
      episode: originalItem.episode || unifiedData.episode,
      episodeTitle: originalItem.episodeTitle || unifiedData.episodeTitle
    })
  };
  
  return updatedItem;
}

// Main sync function
async function syncWatchLaterWithUnifiedData() {
  try {
    console.log('🔄 [SYNC-UNIFIED] Starting Watch Later sync with unified data...');
    
    // Load unified data
    const unifiedData = loadUnifiedData();
    
    // Get all current Watch Later items
    const response = await makeRequest('http://localhost:4800/api/watch-later');
    
    if (response.status !== 200) {
      throw new Error(`Failed to get watch later items: ${response.status}`);
    }
    
    const items = response.data.items;
    console.log(`📊 [SYNC-UNIFIED] Found ${items.length} items to sync`);
    
    if (items.length === 0) {
      console.log('ℹ️ [SYNC-UNIFIED] No items found to sync.');
      return;
    }
    
    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Process each item
    for (const item of items) {
      try {
        console.log(`\n🔍 [SYNC-UNIFIED] Processing: "${item.title}"`);
        
        // Find matching unified data
        const unifiedMatch = findMatchingUnifiedData(item, unifiedData);
        
        if (!unifiedMatch) {
          console.log(`   ⚠️ [SYNC-UNIFIED] No unified data found for "${item.title}"`);
          skippedCount++;
          continue;
        }
        
        console.log(`   ✅ [SYNC-UNIFIED] Found unified data: ${unifiedMatch.type} - "${unifiedMatch.key}"`);
        
        // Create updated item
        const updatedItem = createUpdatedItem(item, unifiedMatch);
        
        if (!updatedItem) {
          console.log(`   ❌ [SYNC-UNIFIED] Failed to create updated item for "${item.title}"`);
          errorCount++;
          continue;
        }
        
        // Update the item in MongoDB
        const updateResponse = await makeRequest(
          `http://localhost:4800/api/watch-later/${item._id}`,
          'PUT',
          updatedItem
        );
        
        if (updateResponse.status === 200) {
          console.log(`   ✅ [SYNC-UNIFIED] Successfully synced "${item.title}"`);
          syncedCount++;
        } else {
          console.log(`   ❌ [SYNC-UNIFIED] Failed to sync "${item.title}": ${updateResponse.status}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`   ❌ [SYNC-UNIFIED] Error processing "${item.title}":`, error.message);
        errorCount++;
      }
    }
    
    // Summary
    console.log(`\n📊 [SYNC-UNIFIED] Sync completed:`);
    console.log(`   ✅ Successfully synced: ${syncedCount}`);
    console.log(`   ⚠️ Skipped (no unified data): ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total processed: ${items.length}`);
    
    if (syncedCount > 0) {
      console.log('\n🎉 [SYNC-UNIFIED] Watch Later data successfully synced with unified structure!');
    }
    
  } catch (error) {
    console.error('❌ [SYNC-UNIFIED] Error:', error);
  }
}

// Run the sync
syncWatchLaterWithUnifiedData();
