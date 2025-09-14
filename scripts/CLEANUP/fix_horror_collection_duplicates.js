/*
  FIX_HORROR_COLLECTION_DUPLICATES.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🔧 [HORROR COLLECTION CLEANUP] Starting to fix duplicates and format issues in Horror collection...');

const collectionsPath = path.join(__dirname, '../../public/components/MediaLibrary/data/collections.json');

try {
  // Read the collections data
  console.log('📖 [HORROR COLLECTION CLEANUP] Reading collections.json...');
  const rawData = fs.readFileSync(collectionsPath, 'utf8');
  const collectionsData = JSON.parse(rawData);
  
  let fixedCount = 0;
  const fixes = [];
  const duplicates = [];
  
  // Process Horror collection
  if (collectionsData.collections && collectionsData.collections.genres && collectionsData.collections.genres.Horror) {
    const horrorCollection = collectionsData.collections.genres.Horror;
    
    console.log(`📊 [HORROR COLLECTION CLEANUP] Found ${horrorCollection.length} items in Horror collection`);
    
    // Track seen items to identify duplicates
    const seenItems = new Set();
    const cleanedCollection = [];
    
    horrorCollection.forEach((item, index) => {
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
    
    // Update the Horror collection
    collectionsData.collections.genres.Horror = cleanedCollection;
    
    console.log(`✅ [HORROR COLLECTION CLEANUP] Processing complete:`);
    console.log(`   - Fixed items: ${fixedCount}`);
    console.log(`   - Final count: ${cleanedCollection.length}`);
    console.log(`   - Duplicates removed: ${duplicates.length}`);
    
    if (fixes.length > 0) {
      console.log('\n📝 [HORROR COLLECTION CLEANUP] Fixes applied:');
      fixes.forEach(fix => console.log(`   - ${fix}`));
    }
    
    if (duplicates.length > 0) {
      console.log('\n🔄 [HORROR COLLECTION CLEANUP] Duplicates removed:');
      duplicates.forEach(dup => console.log(`   - ${dup}`));
    }
    
    // Write the updated data back to the file
    console.log('💾 [HORROR COLLECTION CLEANUP] Writing updated data to file...');
    fs.writeFileSync(collectionsPath, JSON.stringify(collectionsData, null, 2), 'utf8');
    
    console.log('🎉 [HORROR COLLECTION CLEANUP] Successfully cleaned Horror collection!');
    console.log(`📁 [HORROR COLLECTION CLEANUP] Updated file: ${collectionsPath}`);
    
  } else {
    console.log('❌ [HORROR COLLECTION CLEANUP] Horror collection not found in collections data');
  }
  
} catch (error) {
  console.error('❌ [HORROR COLLECTION CLEANUP] Error cleaning Horror collection:', error);
}
