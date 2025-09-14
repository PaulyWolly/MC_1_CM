/*
  FIX_FANTASY_COLLECTION_DUPLICATES.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🔧 [FANTASY COLLECTION CLEANUP] Starting to fix duplicates and format issues in Fantasy collection...');

const collectionsPath = path.join(__dirname, '../../public/components/MediaLibrary/data/collections.json');

try {
  // Read the collections data
  console.log('📖 [FANTASY COLLECTION CLEANUP] Reading collections.json...');
  const rawData = fs.readFileSync(collectionsPath, 'utf8');
  const collectionsData = JSON.parse(rawData);
  
  let fixedCount = 0;
  const fixes = [];
  const duplicates = [];
  
  // Process Fantasy collection
  if (collectionsData.collections && collectionsData.collections.genres && collectionsData.collections.genres.Fantasy) {
    const fantasyCollection = collectionsData.collections.genres.Fantasy;
    
    console.log(`📊 [FANTASY COLLECTION CLEANUP] Found ${fantasyCollection.length} items in Fantasy collection`);
    
    // Track seen items to identify duplicates
    const seenItems = new Set();
    const cleanedCollection = [];
    
    fantasyCollection.forEach((item, index) => {
      if (typeof item === 'string') {
        // Skip invalid entries
        if (item === 'tvshows' || item === 'TV-SHOWS' || item === 'tvshows') {
          fixes.push(`Removed invalid entry: "${item}"`);
          fixedCount++;
          return;
        }
        
        // Fix old format entries with TV-SHOWS/ prefix and spaces
        let cleanedItem = item;
        if (item.startsWith('TV-SHOWS/')) {
          // Convert "TV-SHOWS/Show Name (Year)" to "show.name.(year)"
          const showPart = item.replace('TV-SHOWS/', '');
          const tvShowPattern = /^([a-zA-Z0-9\s&'.-]+)\s\((\d{4})\)$/;
          const match = showPart.match(tvShowPattern);
          
          if (match) {
            const [, title, year] = match;
            const normalizedTitle = title
              .toLowerCase()
              .replace(/\s+/g, '.')
              .replace(/[&']/g, '') // Remove apostrophes and ampersands
              .replace(/\.+/g, '.') // Replace multiple dots with single dot
              .replace(/^\.|\.$/g, ''); // Remove leading/trailing dots
            
            cleanedItem = `${normalizedTitle}.(${year})`;
            fixes.push(`Fixed old format: "${item}" → "${cleanedItem}"`);
            fixedCount++;
          }
        }
        
        // Check for duplicates
        if (seenItems.has(cleanedItem)) {
          duplicates.push(`Duplicate found: "${cleanedItem}"`);
          fixedCount++;
        } else {
          seenItems.add(cleanedItem);
          cleanedCollection.push(cleanedItem);
        }
      } else {
        // Keep non-string items as-is
        cleanedCollection.push(item);
      }
    });
    
    // Update the Fantasy collection
    collectionsData.collections.genres.Fantasy = cleanedCollection;
    
    console.log(`✅ [FANTASY COLLECTION CLEANUP] Processing complete:`);
    console.log(`   - Fixed items: ${fixedCount}`);
    console.log(`   - Final count: ${cleanedCollection.length}`);
    console.log(`   - Duplicates removed: ${duplicates.length}`);
    
    if (fixes.length > 0) {
      console.log('\n📝 [FANTASY COLLECTION CLEANUP] Fixes applied:');
      fixes.forEach(fix => console.log(`   - ${fix}`));
    }
    
    if (duplicates.length > 0) {
      console.log('\n🔄 [FANTASY COLLECTION CLEANUP] Duplicates removed:');
      duplicates.forEach(dup => console.log(`   - ${dup}`));
    }
    
    // Write the updated data back to the file
    console.log('💾 [FANTASY COLLECTION CLEANUP] Writing updated data to file...');
    fs.writeFileSync(collectionsPath, JSON.stringify(collectionsData, null, 2), 'utf8');
    
    console.log('🎉 [FANTASY COLLECTION CLEANUP] Successfully cleaned Fantasy collection!');
    console.log(`📁 [FANTASY COLLECTION CLEANUP] Updated file: ${collectionsPath}`);
    
  } else {
    console.log('❌ [FANTASY COLLECTION CLEANUP] Fantasy collection not found in collections data');
  }
  
} catch (error) {
  console.error('❌ [FANTASY COLLECTION CLEANUP] Error cleaning Fantasy collection:', error);
}
