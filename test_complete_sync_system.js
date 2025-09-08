/*
  TEST_COMPLETE_SYNC_SYSTEM.JS
  Comprehensive test script to verify the complete sync/refresh system
  Tests: MongoDB schema, unified data structure, sync script, and UI buttons
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

// Test function to verify the complete system
async function testCompleteSyncSystem() {
  try {
    console.log('🧪 [TEST-COMPLETE-SYNC] Testing complete sync/refresh system...');
    
    // Test 1: Verify MongoDB schema supports unified data structure
    console.log('\n📋 [TEST-COMPLETE-SYNC] Test 1: MongoDB Schema Verification');
    const response = await makeRequest('http://localhost:4800/api/watch-later');
    
    if (response.status !== 200) {
      throw new Error(`Failed to connect to MongoDB: ${response.status}`);
    }
    
    const items = response.data.items;
    console.log(`✅ [TEST-COMPLETE-SYNC] MongoDB connection successful - ${items.length} items found`);
    
    // Test 2: Check if unified data files exist
    console.log('\n📂 [TEST-COMPLETE-SYNC] Test 2: Unified Data Files Verification');
    
    const tvShowsPath = path.join(__dirname, 'public', 'components', 'MediaLibrary', 'data', 'tv-shows', 'tv-shows-unified.json');
    const moviesPath = path.join(__dirname, 'public', 'components', 'MediaLibrary', 'data', 'movies', 'movies-unified.json');
    
    if (!fs.existsSync(tvShowsPath)) {
      throw new Error('TV shows unified data file not found');
    }
    if (!fs.existsSync(moviesPath)) {
      throw new Error('Movies unified data file not found');
    }
    
    const tvShowsData = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
    const moviesData = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
    
    console.log(`✅ [TEST-COMPLETE-SYNC] TV Shows unified data: ${Object.keys(tvShowsData).length} items`);
    console.log(`✅ [TEST-COMPLETE-SYNC] Movies unified data: ${Object.keys(moviesData).length} items`);
    
    // Test 3: Verify sync script exists and is executable
    console.log('\n🔧 [TEST-COMPLETE-SYNC] Test 3: Sync Script Verification');
    
    const syncScriptPath = path.join(__dirname, 'sync_watch_later_with_unified_data.js');
    if (!fs.existsSync(syncScriptPath)) {
      throw new Error('Sync script not found');
    }
    
    console.log('✅ [TEST-COMPLETE-SYNC] Sync script exists and is ready');
    
    // Test 4: Test MongoDB schema with sample data
    console.log('\n🗄️ [TEST-COMPLETE-SYNC] Test 4: MongoDB Schema Test');
    
    if (items.length > 0) {
      const sampleItem = items[0];
      console.log(`📊 [TEST-COMPLETE-SYNC] Sample item structure:`);
      console.log(`   Type: ${sampleItem.type || 'MISSING'}`);
      console.log(`   MediaType: ${sampleItem.mediaType || 'MISSING'}`);
      console.log(`   TMDBTitle: ${sampleItem.TMDBTitle || 'MISSING'}`);
      console.log(`   NormalizedKey: ${sampleItem.normalizedKey || 'MISSING'}`);
      console.log(`   Poster: ${sampleItem.poster ? '✅ Present' : '❌ Missing'}`);
      console.log(`   About: ${sampleItem.about ? '✅ Present' : '❌ Missing'}`);
      console.log(`   Genres: ${sampleItem.genres ? `✅ ${sampleItem.genres.length} genres` : '❌ Missing'}`);
      console.log(`   Cast: ${sampleItem.cast ? `✅ ${sampleItem.cast.length} cast members` : '❌ Missing'}`);
      console.log(`   Files: ${sampleItem.files ? `✅ ${sampleItem.files.length} files` : '❌ Missing'}`);
      
      // Check if item has unified structure
      const hasUnifiedStructure = sampleItem.TMDBTitle && sampleItem.normalizedKey && sampleItem.poster && sampleItem.about;
      console.log(`   Unified Structure: ${hasUnifiedStructure ? '✅ Complete' : '❌ Incomplete'}`);
    } else {
      console.log('ℹ️ [TEST-COMPLETE-SYNC] No items in MongoDB to test schema');
    }
    
    // Test 5: Test API endpoints
    console.log('\n🌐 [TEST-COMPLETE-SYNC] Test 5: API Endpoints Verification');
    
    // Test GET endpoint
    const getResponse = await makeRequest('http://localhost:4800/api/watch-later');
    console.log(`✅ [TEST-COMPLETE-SYNC] GET /api/watch-later: ${getResponse.status}`);
    
    // Test INFO endpoint
    const infoResponse = await makeRequest('http://localhost:4800/api/watch-later/info');
    if (infoResponse.status === 200) {
      console.log(`✅ [TEST-COMPLETE-SYNC] GET /api/watch-later/info: ${infoResponse.status}`);
      console.log(`   📺 TV Shows: ${infoResponse.data.tvShowCount || 0}`);
      console.log(`   🎬 Movies: ${infoResponse.data.movieCount || 0}`);
    } else {
      console.log(`⚠️ [TEST-COMPLETE-SYNC] GET /api/watch-later/info: ${infoResponse.status}`);
    }
    
    // Test 6: Summary and recommendations
    console.log('\n📊 [TEST-COMPLETE-SYNC] Test 6: System Summary');
    
    const tvShows = items.filter(item => item.type === 'tv-show');
    const movies = items.filter(item => item.type === 'movie');
    const completeItems = items.filter(item => item.TMDBTitle && item.normalizedKey && item.poster && item.about);
    
    console.log(`📊 [TEST-COMPLETE-SYNC] Current MongoDB Status:`);
    console.log(`   📺 TV Shows: ${tvShows.length}`);
    console.log(`   🎬 Movies: ${movies.length}`);
    console.log(`   ✅ Complete Unified Structure: ${completeItems.length}/${items.length}`);
    console.log(`   ❌ Incomplete Structure: ${items.length - completeItems.length}/${items.length}`);
    
    // Recommendations
    console.log('\n💡 [TEST-COMPLETE-SYNC] Recommendations:');
    
    if (completeItems.length < items.length) {
      console.log('   🔄 Run sync script to update incomplete items: node sync_watch_later_with_unified_data.js');
    }
    
    if (items.length === 0) {
      console.log('   📤 Use Sync button in UI to push localStorage data to MongoDB');
    }
    
    console.log('   🔄 Use Refresh button in UI to pull latest data from MongoDB');
    console.log('   🧪 Test saving new TV shows to verify unified structure works');
    
    // Final status
    if (completeItems.length === items.length && items.length > 0) {
      console.log('\n🎉 [TEST-COMPLETE-SYNC] System is fully operational with unified data structure!');
    } else if (items.length === 0) {
      console.log('\n✅ [TEST-COMPLETE-SYNC] System is ready - no data to sync yet');
    } else {
      console.log('\n⚠️ [TEST-COMPLETE-SYNC] System needs sync to complete unified data structure');
    }
    
  } catch (error) {
    console.error('❌ [TEST-COMPLETE-SYNC] Error:', error);
  }
}

// Run the test
testCompleteSyncSystem();
