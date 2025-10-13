/*
  FIX_ALL_COLLECTIONS_COMPREHENSIVE.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🔧 [COMPREHENSIVE COLLECTION CLEANUP] Starting to scan and fix ALL collections...');

const collectionsPath = path.join(__dirname, '../../public/components/MediaLibrary/data/collections.json');

// Function to normalize a collection item
const normalizeItem = (item) => {
  if (typeof item !== 'string') return item;
  
  let cleanedItem = item;
  
  // Skip invalid entries
  if (item === 'tvshows' || item === 'TV-SHOWS' || item === 'tvshows' || item === 'movies') {
    return null; // Mark for removal
  }
  
  // Fix old format entries with TV-SHOWS/ prefix and spaces
  if (item.startsWith('TV-SHOWS/')) {
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
    }
  } else if (item.includes(' ') && !item.includes('.')) {
    // Fix items with spaces but no dots (like "supergirl (2015)")
    const spacePattern = /^([a-zA-Z0-9\s&'.-]+)\s\((\d{4})\)$/;
    const match = item.match(spacePattern);
    
    if (match) {
      const [, title, year] = match;
      const normalizedTitle = title
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[&']/g, '') // Remove apostrophes and ampersands
        .replace(/\.+/g, '.') // Replace multiple dots with single dot
        .replace(/^\.|\.$/g, ''); // Remove leading/trailing dots
      
      cleanedItem = `${normalizedTitle}.(${year})`;
    }
  }
  
  return cleanedItem;
};

// Function to clean a single collection
const cleanCollection = (collection, collectionName) => {
  if (!Array.isArray(collection)) return { cleaned: collection, fixes: [], duplicates: [], removed: 0 };
  
  const seenItems = new Set();
  const cleanedCollection = [];
  const fixes = [];
  const duplicates = [];
  let removedCount = 0;
  
  collection.forEach((item, index) => {
    const normalizedItem = normalizeItem(item);
    
    // Skip invalid entries
    if (normalizedItem === null) {
      fixes.push(`Removed invalid entry: "${item}"`);
      removedCount++;
      return;
    }
    
    // Track format fixes
    if (normalizedItem !== item) {
      fixes.push(`Fixed format: "${item}" → "${normalizedItem}"`);
    }
    
    // Check for duplicates
    if (seenItems.has(normalizedItem)) {
      duplicates.push(`Duplicate found: "${normalizedItem}"`);
    } else {
      seenItems.add(normalizedItem);
      cleanedCollection.push(normalizedItem);
    }
  });
  
  return {
    cleaned: cleanedCollection,
    fixes,
    duplicates,
    removed: removedCount,
    originalCount: collection.length,
    finalCount: cleanedCollection.length
  };
};

try {
  // Read the collections data
  console.log('📖 [COMPREHENSIVE CLEANUP] Reading collections.json...');
  const rawData = fs.readFileSync(collectionsPath, 'utf8');
  const collectionsData = JSON.parse(rawData);
  
  let totalCollectionsProcessed = 0;
  let totalFixes = 0;
  let totalDuplicates = 0;
  let totalRemoved = 0;
  const processedCollections = [];
  
  // Process all collection sections
  const sections = ['my_collections', 'genres', 'creative', 'decades', 'actors', 'directors'];
  
  sections.forEach(sectionName => {
    if (collectionsData.collections && collectionsData.collections[sectionName]) {
      const section = collectionsData.collections[sectionName];
      console.log(`\n🔍 [COMPREHENSIVE CLEANUP] Processing ${sectionName} section...`);
      
      Object.keys(section).forEach(collectionName => {
        const collection = section[collectionName];
        const result = cleanCollection(collection, collectionName);
        
        if (result.fixes.length > 0 || result.duplicates.length > 0 || result.removed > 0) {
          // Update the collection
          section[collectionName] = result.cleaned;
          
          // Track statistics
          totalCollectionsProcessed++;
          totalFixes += result.fixes.length;
          totalDuplicates += result.duplicates.length;
          totalRemoved += result.removed;
          
          processedCollections.push({
            section: sectionName,
            name: collectionName,
            originalCount: result.originalCount,
            finalCount: result.finalCount,
            fixes: result.fixes.length,
            duplicates: result.duplicates.length,
            removed: result.removed
          });
          
          console.log(`  ✅ ${collectionName}: ${result.originalCount} → ${result.finalCount} items (${result.fixes.length} fixes, ${result.duplicates.length} duplicates, ${result.removed} removed)`);
        }
      });
    }
  });
  
  // Write the updated data back to the file
  console.log('\n💾 [COMPREHENSIVE CLEANUP] Writing updated data to file...');
  fs.writeFileSync(collectionsPath, JSON.stringify(collectionsData, null, 2), 'utf8');
  
  // Summary
  console.log('\n🎉 [COMPREHENSIVE CLEANUP] All collections processed successfully!');
  console.log(`📊 [COMPREHENSIVE CLEANUP] Summary:`);
  console.log(`   - Collections processed: ${totalCollectionsProcessed}`);
  console.log(`   - Total format fixes: ${totalFixes}`);
  console.log(`   - Total duplicates removed: ${totalDuplicates}`);
  console.log(`   - Total invalid entries removed: ${totalRemoved}`);
  
  if (processedCollections.length > 0) {
    console.log('\n📝 [COMPREHENSIVE CLEANUP] Collections that were fixed:');
    processedCollections.forEach(col => {
      console.log(`   - ${col.section}.${col.name}: ${col.originalCount} → ${col.finalCount} (${col.fixes} fixes, ${col.duplicates} duplicates, ${col.removed} removed)`);
    });
  } else {
    console.log('\n✅ [COMPREHENSIVE CLEANUP] No collections needed fixing - all are already in the correct format!');
  }
  
  console.log(`\n📁 [COMPREHENSIVE CLEANUP] Updated file: ${collectionsPath}`);
  console.log('\n🔄 [COMPREHENSIVE CLEANUP] Next step: Clear collections cache in browser console:');
  console.log('   window.mediaLibraryCache.clearCollectionsCache()');
  
} catch (error) {
  console.error('❌ [COMPREHENSIVE CLEANUP] Error processing collections:', error);
}
