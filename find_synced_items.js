/*
  FIND_SYNCED_ITEMS.JS
  Find items that should have been synced
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

// Find synced items
async function findSyncedItems() {
  try {
    console.log('🔍 [FIND-SYNCED] Looking for synced items...');
    
    const response = await makeRequest('http://localhost:4800/api/watch-later');
    const items = response.data.items;
    
    // Look for items that should have been synced based on the sync script output
    const expectedSyncedTitles = [
      'Stranger Than Fiction (2006)',
      'Ant-Man (2015)',
      'Someone Like You (2001)',
      'True Lies',
      'Season Of The Witch (2011)',
      'chuck.(2007)',
      'based.on.a.true.story.(2023)',
      'bored.to.death.(2009)'
    ];
    
    console.log(`📊 [FIND-SYNCED] Looking for ${expectedSyncedTitles.length} expected synced items...`);
    
    expectedSyncedTitles.forEach(expectedTitle => {
      const foundItem = items.find(item => 
        item.title === expectedTitle || 
        item.title.includes(expectedTitle) ||
        expectedTitle.includes(item.title)
      );
      
      if (foundItem) {
        console.log(`\n✅ [FIND-SYNCED] Found: "${foundItem.title}"`);
        console.log(`   Type: ${foundItem.type || 'MISSING'}`);
        console.log(`   MediaType: ${foundItem.mediaType || 'MISSING'}`);
        console.log(`   TMDBTitle: ${foundItem.TMDBTitle || 'MISSING'}`);
        console.log(`   NormalizedKey: ${foundItem.normalizedKey || 'MISSING'}`);
        console.log(`   Poster: ${foundItem.poster ? 'Present' : 'Missing'}`);
        console.log(`   About: ${foundItem.about ? 'Present' : 'Missing'}`);
        console.log(`   Genres: ${foundItem.genres ? foundItem.genres.length : 0} genres`);
        console.log(`   Cast: ${foundItem.cast ? foundItem.cast.length : 0} cast members`);
        console.log(`   Files: ${foundItem.files ? foundItem.files.length : 0} files`);
        
        if (foundItem.type === 'tv-show') {
          console.log(`   Season: ${foundItem.season || 'N/A'}`);
          console.log(`   Episode: ${foundItem.episode || 'N/A'}`);
          console.log(`   EpisodeTitle: ${foundItem.episodeTitle || 'N/A'}`);
        }
      } else {
        console.log(`❌ [FIND-SYNCED] Not found: "${expectedTitle}"`);
      }
    });
    
    // Also check for any items that actually have unified structure
    const itemsWithUnifiedStructure = items.filter(item => 
      item.TMDBTitle && item.normalizedKey && item.poster && item.about
    );
    
    console.log(`\n📊 [FIND-SYNCED] Items with unified structure: ${itemsWithUnifiedStructure.length}`);
    
    if (itemsWithUnifiedStructure.length > 0) {
      console.log('\n📋 [FIND-SYNCED] Items with unified structure:');
      itemsWithUnifiedStructure.forEach(item => {
        console.log(`   ✅ ${item.title} (${item.type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ [FIND-SYNCED] Error:', error);
  }
}

// Run find
findSyncedItems();
