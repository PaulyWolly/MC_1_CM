/*
  FIX_COLLECTIONS_TV_SHOW_FORMAT.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🔧 [COLLECTIONS FORMAT FIX] Starting to fix TV show format in collections.json...');

const collectionsPath = path.join(__dirname, '../../public/components/MediaLibrary/data/collections.json');

try {
  // Read the collections data
  console.log('📖 [COLLECTIONS FORMAT FIX] Reading collections.json...');
  const rawData = fs.readFileSync(collectionsPath, 'utf8');
  const collectionsData = JSON.parse(rawData);
  
  let fixedCount = 0;
  const fixes = [];
  
  // Process each collection
  if (collectionsData.collections && collectionsData.collections.my_collections) {
    Object.keys(collectionsData.collections.my_collections).forEach(collectionName => {
      const collection = collectionsData.collections.my_collections[collectionName];
      
      if (Array.isArray(collection)) {
        collection.forEach((item, index) => {
          if (typeof item === 'string') {
            // Check if this looks like a TV show with spaces instead of dots
            // Pattern: "show name (year)" should be "show.name.(year)"
            const tvShowPattern = /^([a-zA-Z0-9\s&'.-]+)\s\((\d{4})\)$/;
            const match = item.match(tvShowPattern);
            
            if (match) {
              const [, title, year] = match;
              // Convert spaces to dots and normalize
              const normalizedTitle = title
                .toLowerCase()
                .replace(/\s+/g, '.')
                .replace(/[&']/g, '') // Remove apostrophes and ampersands
                .replace(/\.+/g, '.') // Replace multiple dots with single dot
                .replace(/^\.|\.$/g, ''); // Remove leading/trailing dots
              
              const newKey = `${normalizedTitle}.(${year})`;
              
              if (newKey !== item) {
                collection[index] = newKey;
                fixes.push(`${item} → ${newKey}`);
                fixedCount++;
              }
            }
          }
        });
      }
    });
  }
  
  // Process genres collections too
  if (collectionsData.collections && collectionsData.collections.genres) {
    Object.keys(collectionsData.collections.genres).forEach(genreName => {
      const genre = collectionsData.collections.genres[genreName];
      
      if (Array.isArray(genre)) {
        genre.forEach((item, index) => {
          if (typeof item === 'string') {
            // Check if this looks like a TV show with spaces instead of dots
            const tvShowPattern = /^([a-zA-Z0-9\s&'.-]+)\s\((\d{4})\)$/;
            const match = item.match(tvShowPattern);
            
            if (match) {
              const [, title, year] = match;
              // Convert spaces to dots and normalize
              const normalizedTitle = title
                .toLowerCase()
                .replace(/\s+/g, '.')
                .replace(/[&']/g, '') // Remove apostrophes and ampersands
                .replace(/\.+/g, '.') // Replace multiple dots with single dot
                .replace(/^\.|\.$/g, ''); // Remove leading/trailing dots
              
              const newKey = `${normalizedTitle}.(${year})`;
              
              if (newKey !== item) {
                genre[index] = newKey;
                fixes.push(`${item} → ${newKey}`);
                fixedCount++;
              }
            }
          }
        });
      }
    });
  }
  
  console.log(`✅ [COLLECTIONS FORMAT FIX] Processing complete:`);
  console.log(`   - Fixed items: ${fixedCount}`);
  console.log(`   - Total fixes: ${fixes.length}`);
  
  if (fixes.length > 0) {
    console.log('\n📝 [COLLECTIONS FORMAT FIX] Fixes applied:');
    fixes.forEach(fix => console.log(`   - ${fix}`));
  }
  
  // Write the updated data back to the file
  console.log('💾 [COLLECTIONS FORMAT FIX] Writing updated data to file...');
  fs.writeFileSync(collectionsPath, JSON.stringify(collectionsData, null, 2), 'utf8');
  
  console.log('🎉 [COLLECTIONS FORMAT FIX] Successfully fixed TV show format in collections.json!');
  console.log(`📁 [COLLECTIONS FORMAT FIX] Updated file: ${collectionsPath}`);
  
} catch (error) {
  console.error('❌ [COLLECTIONS FORMAT FIX] Error fixing collections format:', error);
}
