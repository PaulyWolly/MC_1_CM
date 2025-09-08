/*
  VERIFY_SYNCED_DATA.JS
  Quick verification script to check if the sync worked correctly
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

// Verification function
async function verifySyncedData() {
  try {
    console.log('🔍 [VERIFY-SYNC] Checking synced data...');
    
    const response = await makeRequest('http://localhost:4800/api/watch-later');
    const items = response.data.items;
    
    console.log(`📊 [VERIFY-SYNC] Total items: ${items.length}`);
    
    // Check for items with unified structure
    const syncedItems = items.filter(item => 
      item.TMDBTitle && item.normalizedKey && item.poster && item.about
    );
    
    console.log(`✅ [VERIFY-SYNC] Items with unified structure: ${syncedItems.length}`);
    
    if (syncedItems.length > 0) {
      console.log('\n📋 [VERIFY-SYNC] Synced items:');
      syncedItems.forEach(item => {
        console.log(`   ✅ ${item.title} (${item.type})`);
        console.log(`      TMDBTitle: ${item.TMDBTitle}`);
        console.log(`      NormalizedKey: ${item.normalizedKey}`);
        console.log(`      Poster: ${item.poster ? 'Present' : 'Missing'}`);
        console.log(`      About: ${item.about ? 'Present' : 'Missing'}`);
        console.log(`      Genres: ${item.genres ? item.genres.length : 0} genres`);
        console.log(`      Cast: ${item.cast ? item.cast.length : 0} cast members`);
        console.log('');
      });
    }
    
    // Check for TV shows specifically
    const tvShows = items.filter(item => item.type === 'tv-show');
    console.log(`📺 [VERIFY-SYNC] TV Shows: ${tvShows.length}`);
    
    if (tvShows.length > 0) {
      console.log('\n📺 [VERIFY-SYNC] TV Show items:');
      tvShows.forEach(item => {
        console.log(`   📺 ${item.title}`);
        console.log(`      Season: ${item.season || 'N/A'}`);
        console.log(`      Episode: ${item.episode || 'N/A'}`);
        console.log(`      EpisodeTitle: ${item.episodeTitle || 'N/A'}`);
        console.log('');
      });
    }
    
    // Check for movies
    const movies = items.filter(item => item.type === 'movie');
    console.log(`🎬 [VERIFY-SYNC] Movies: ${movies.length}`);
    
    console.log('\n🎉 [VERIFY-SYNC] Verification completed!');
    
  } catch (error) {
    console.error('❌ [VERIFY-SYNC] Error:', error);
  }
}

// Run verification
verifySyncedData();
