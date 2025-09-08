/*
  TEST_UNIFIED_DATA_STRUCTURE.JS
  Test script to verify that Watch Later now uses the complete unified data structure
  Created: 09/03/2025
*/

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

// Test function to check Watch Later structure
async function testWatchLaterStructure() {
  try {
    console.log('🧪 [TEST-UNIFIED-STRUCTURE] Testing Watch Later data structure...');
    
    // Get all Watch Later items
    const response = await makeRequest('http://localhost:4800/api/watch-later');
    
    if (response.status !== 200) {
      throw new Error(`Failed to get watch later items: ${response.status}`);
    }
    
    const items = response.data.items;
    console.log(`📊 [TEST-UNIFIED-STRUCTURE] Found ${items.length} items to analyze`);
    
    if (items.length === 0) {
      console.log('ℹ️ [TEST-UNIFIED-STRUCTURE] No items found. Please save some media to Watch Later first.');
      return;
    }
    
    // Analyze each item
    for (const item of items) {
      console.log(`\n🔍 [TEST-UNIFIED-STRUCTURE] Analyzing: "${item.title}"`);
      console.log(`   Type: ${item.type || 'MISSING'}`);
      console.log(`   MediaType: ${item.mediaType || 'MISSING'}`);
      console.log(`   TMDBTitle: ${item.TMDBTitle || 'MISSING'}`);
      console.log(`   NormalizedKey: ${item.normalizedKey || 'MISSING'}`);
      console.log(`   Poster: ${item.poster ? '✅ Present' : '❌ Missing'}`);
      console.log(`   About: ${item.about ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Genres: ${item.genres ? `✅ ${item.genres.length} genres` : '❌ Missing'}`);
      console.log(`   Cast: ${item.cast ? `✅ ${item.cast.length} cast members` : '❌ Missing'}`);
      console.log(`   Files: ${item.files ? `✅ ${item.files.length} files` : '❌ Missing'}`);
      
      if (item.type === 'tv-show') {
        console.log(`   Season: ${item.season || 'MISSING'}`);
        console.log(`   Episode: ${item.episode || 'MISSING'}`);
        console.log(`   EpisodeTitle: ${item.episodeTitle || 'MISSING'}`);
      }
      
      // Check for unified data structure completeness
      const hasUnifiedStructure = item.TMDBTitle && item.normalizedKey && item.poster && item.about;
      console.log(`   Unified Structure: ${hasUnifiedStructure ? '✅ Complete' : '❌ Incomplete'}`);
    }
    
    // Summary
    const tvShows = items.filter(item => item.type === 'tv-show');
    const movies = items.filter(item => item.type === 'movie');
    const completeItems = items.filter(item => item.TMDBTitle && item.normalizedKey && item.poster && item.about);
    
    console.log(`\n📊 [TEST-UNIFIED-STRUCTURE] Summary:`);
    console.log(`   📺 TV Shows: ${tvShows.length}`);
    console.log(`   🎬 Movies: ${movies.length}`);
    console.log(`   ✅ Complete Unified Structure: ${completeItems.length}/${items.length}`);
    console.log(`   ❌ Incomplete Structure: ${items.length - completeItems.length}/${items.length}`);
    
    if (completeItems.length === items.length) {
      console.log('\n🎉 [TEST-UNIFIED-STRUCTURE] All items have complete unified data structure!');
    } else {
      console.log('\n⚠️ [TEST-UNIFIED-STRUCTURE] Some items are missing unified data fields.');
    }
    
  } catch (error) {
    console.error('❌ [TEST-UNIFIED-STRUCTURE] Error:', error);
  }
}

// Run the test
testWatchLaterStructure();
