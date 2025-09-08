/*
  TEST_API_DIRECT.JS
  Direct API test to check what's happening
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

// Test function
async function testAPIDirect() {
  try {
    console.log('🧪 [TEST-API] Testing API directly...');
    
    // Test GET endpoint
    const response = await makeRequest('http://localhost:4800/api/watch-later');
    console.log(`📊 [TEST-API] GET /api/watch-later: ${response.status}`);
    
    if (response.status === 200) {
      const items = response.data.items;
      console.log(`📊 [TEST-API] Items count: ${items.length}`);
      
      if (items.length > 0) {
        console.log('\n📋 [TEST-API] First few items:');
        items.slice(0, 3).forEach((item, index) => {
          console.log(`\n${index + 1}. "${item.title}"`);
          console.log(`   Type: ${item.type || 'MISSING'}`);
          console.log(`   MediaType: ${item.mediaType || 'MISSING'}`);
          console.log(`   TMDBTitle: ${item.TMDBTitle || 'MISSING'}`);
          console.log(`   NormalizedKey: ${item.normalizedKey || 'MISSING'}`);
          console.log(`   Poster: ${item.poster ? 'Present' : 'Missing'}`);
          console.log(`   About: ${item.about ? 'Present' : 'Missing'}`);
          console.log(`   Genres: ${item.genres ? item.genres.length : 0} genres`);
          console.log(`   Cast: ${item.cast ? item.cast.length : 0} cast members`);
          console.log(`   Files: ${item.files ? item.files.length : 0} files`);
        });
      }
    }
    
    // Test INFO endpoint
    const infoResponse = await makeRequest('http://localhost:4800/api/watch-later/info');
    console.log(`\n📊 [TEST-API] GET /api/watch-later/info: ${infoResponse.status}`);
    
    if (infoResponse.status === 200) {
      console.log(`   📺 TV Shows: ${infoResponse.data.tvShowCount || 0}`);
      console.log(`   🎬 Movies: ${infoResponse.data.movieCount || 0}`);
    }
    
  } catch (error) {
    console.error('❌ [TEST-API] Error:', error);
  }
}

// Run test
testAPIDirect();
