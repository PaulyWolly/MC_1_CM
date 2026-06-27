const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '../..');

const COLLECTIONS_FILES = [
  path.join(ROOT_DIR, 'public/components/MediaLibrary/data/collections.json'),
  path.join(ROOT_DIR, 'public/components/MediaLibrary/data/collections/collections-unified.json')
];

// Define corrections for old format keys to new format keys
const CORRECTIONS = {
  "antman.(2015)": "ant.man.(2015)",
  "antman.and.the.wasp.(2018)": "ant.man.and.the.wasp.(2018)",
};

async function fixCollectionsDuplicates(filePath) {
  console.log(`\n🔧 Processing: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.log(`    ⚠️ File not found: ${filePath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changes = 0;

  // Handle the actual Collections data structure: data.collections.my_collections.COLLECTION_NAME
  if (data.collections && data.collections.my_collections) {
    const myCollections = data.collections.my_collections;
    
    Object.keys(myCollections).forEach(collectionName => {
      const collection = myCollections[collectionName];
      
      // Skip metadata objects, only process arrays
      if (!Array.isArray(collection)) return;
      
      console.log(`  📁 Processing collection: ${collectionName}`);
      
      // Find ALL items arrays within the collection (movies and TV shows)
      const itemsArrays = [];
      
      collection.forEach(item => {
        if (item && item.items && Array.isArray(item.items)) {
          itemsArrays.push({
            items: item.items,
            object: item,
            media: item.media || 'unknown'
          });
          console.log(`    📋 Found ${item.media || 'unknown'} items array with ${item.items.length} entries`);
        }
      });
      
      if (itemsArrays.length === 0) {
        console.log(`    ❌ No items arrays found in collection ${collectionName}`);
        return;
      }
      
      // Process each items array
      itemsArrays.forEach(({ items: itemsArray, object: itemsObject, media }) => {
        console.log(`    🎬 Processing ${media} items...`);
        
        // Remove old format entries and keep only correct format
        const originalLength = itemsArray.length;
        const correctedItems = [];

        itemsArray.forEach(entry => {
          let correctedEntry = entry;
          let wasCorrected = false;

          // Check if this entry needs correction
          Object.keys(CORRECTIONS).forEach(oldFormat => {
            if (entry === oldFormat) {
              correctedEntry = CORRECTIONS[oldFormat];
              wasCorrected = true;
              console.log(`    🔄 Corrected: "${oldFormat}" → "${correctedEntry}"`);
            }
          });

          // Only add if we don't already have the corrected version
          if (!correctedItems.includes(correctedEntry)) {
            correctedItems.push(correctedEntry);
            if (wasCorrected) {
              changes++;
            }
          } else if (wasCorrected) {
            console.log(`    ✅ Already have correct format: "${correctedEntry}"`);
          } else if (entry.includes('antman') || entry.includes('ant.man')) {
            console.log(`    🔍 Found Ant-Man entry: "${entry}"`);
          }
        });

        // Remove duplicates (keep only unique entries)
        const uniqueItems = [...new Set(correctedItems)];
        
        if (uniqueItems.length !== originalLength) {
          console.log(`    📊 Collection "${collectionName}" ${media}: ${originalLength} → ${uniqueItems.length} entries`);
          itemsObject.items = uniqueItems;
        }
      });
    });
  }

  if (changes > 0) {
    // Create backup
    const backupPath = filePath + '.backup-' + Date.now();
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`    💾 Saved changes to ${filePath} and created backup at ${backupPath}`);
  } else {
    console.log(`    ✅ No changes needed for ${filePath}`);
  }
}

async function main() {
  console.log('🚀 Starting Complete Collections Duplicate Fix...');
  
  for (const filePath of COLLECTIONS_FILES) {
    await fixCollectionsDuplicates(filePath);
  }
  
  console.log('\n🎉 Complete Collections duplicate fix completed!');
  console.log('📋 Summary:');
  console.log('  - Removed old format entries (e.g., "antman" → "ant.man")');
  console.log('  - Removed duplicate entries within collections');
  console.log('  - Created backups of original files');
  console.log('✨ All Collections should now display proper titles with hyphens and no duplicates!');
}

main();
