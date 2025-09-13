const fs = require('fs');
const path = require('path');

console.log('🔧 [COMIC BOOK MOVIES COLLECTION CLEANUP] Starting to fix duplicates and format issues in Comic Book Movies collection...');

const collectionsPath = path.join(__dirname, '../../public/components/MediaLibrary/data/collections.json');

try {
  // Read the collections data
  console.log('📖 [COMIC BOOK MOVIES COLLECTION CLEANUP] Reading collections.json...');
  const rawData = fs.readFileSync(collectionsPath, 'utf8');
  const collectionsData = JSON.parse(rawData);
  
  let fixedCount = 0;
  const fixes = [];
  const duplicates = [];
  
  // Process Comic Book Movies collection (it's in the creative section)
  if (collectionsData.collections && collectionsData.collections.creative && collectionsData.collections.creative["Comic Book Movies"]) {
    const comicBookMoviesCollection = collectionsData.collections.creative["Comic Book Movies"];
    
    console.log(`📊 [COMIC BOOK MOVIES COLLECTION CLEANUP] Found ${comicBookMoviesCollection.length} items in Comic Book Movies collection`);
    
    // Track seen items to identify duplicates
    const seenItems = new Set();
    const cleanedCollection = [];
    
    comicBookMoviesCollection.forEach((item, index) => {
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
            fixes.push(`Fixed space format: "${item}" → "${cleanedItem}"`);
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
    
    // Update the Comic Book Movies collection
    collectionsData.collections.creative["Comic Book Movies"] = cleanedCollection;
    
    console.log(`✅ [COMIC BOOK MOVIES COLLECTION CLEANUP] Processing complete:`);
    console.log(`   - Fixed items: ${fixedCount}`);
    console.log(`   - Final count: ${cleanedCollection.length}`);
    console.log(`   - Duplicates removed: ${duplicates.length}`);
    
    if (fixes.length > 0) {
      console.log('\n📝 [COMIC BOOK MOVIES COLLECTION CLEANUP] Fixes applied:');
      fixes.forEach(fix => console.log(`   - ${fix}`));
    }
    
    if (duplicates.length > 0) {
      console.log('\n🔄 [COMIC BOOK MOVIES COLLECTION CLEANUP] Duplicates removed:');
      duplicates.forEach(dup => console.log(`   - ${dup}`));
    }
    
    // Write the updated data back to the file
    console.log('💾 [COMIC BOOK MOVIES COLLECTION CLEANUP] Writing updated data to file...');
    fs.writeFileSync(collectionsPath, JSON.stringify(collectionsData, null, 2), 'utf8');
    
    console.log('🎉 [COMIC BOOK MOVIES COLLECTION CLEANUP] Successfully cleaned Comic Book Movies collection!');
    console.log(`📁 [COMIC BOOK MOVIES COLLECTION CLEANUP] Updated file: ${collectionsPath}`);
    
  } else {
    console.log('❌ [COMIC BOOK MOVIES COLLECTION CLEANUP] Comic Book Movies collection not found in collections data');
  }
  
} catch (error) {
  console.error('❌ [COMIC BOOK MOVIES COLLECTION CLEANUP] Error cleaning Comic Book Movies collection:', error);
}
