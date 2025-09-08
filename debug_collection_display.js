// 🔍 DEBUG COLLECTION DISPLAY ISSUE
console.log('🔍 [DEBUG] Debugging collection display issue...');

// 1. Check if Devs is in any collections
console.log('\n📁 [DEBUG] Checking Devs collections...');
if (window.mediaLibraryManager && typeof window.mediaLibraryManager.getItemCollections === 'function') {
  const testPaths = [
    'TV-SHOWS/devs (2020)',
    'tv-shows/devs (2020)',
    'TV-SHOWS/Devs (2020)',
    'tv-shows/Devs (2020)'
  ];
  
  testPaths.forEach(async (path) => {
    try {
      console.log(`\nTesting path: "${path}"`);
      const collections = await window.mediaLibraryManager.getItemCollections(path);
      console.log(`Collections found:`, collections);
      
      if (collections.length > 0) {
        console.log('✅ Devs is in collections:', collections);
      } else {
        console.log('❌ Devs is not in any collections');
      }
    } catch (error) {
      console.log(`❌ Error testing path "${path}":`, error);
    }
  });
} else {
  console.log('❌ getItemCollections function not available');
}

// 2. Check localStorage collections data
console.log('\n📁 [DEBUG] Checking localStorage collections...');
const collectionsData = localStorage.getItem('mediaCollections');
if (collectionsData) {
  const collections = JSON.parse(collectionsData);
  console.log('Collections found:', Object.keys(collections).length);
  
  // Look for Devs in any collection
  let devsFound = false;
  for (const [collectionName, items] of Object.entries(collections)) {
    if (Array.isArray(items)) {
      const devsItems = items.filter(item => 
        item && item.toLowerCase().includes('devs')
      );
      if (devsItems.length > 0) {
        console.log(`✅ Devs found in collection "${collectionName}":`, devsItems);
        devsFound = true;
      }
    }
  }
  
  if (!devsFound) {
    console.log('❌ Devs not found in any collections');
  }
} else {
  console.log('❌ No collections data in localStorage');
}

// 3. Check if the collection pills are being generated
console.log('\n🔍 [DEBUG] Checking for collection pills in the UI...');
const devsCard = document.querySelector('[data-path*="devs"], [data-path*="Devs"]');
if (devsCard) {
  console.log('✅ Devs card found:', devsCard);
  
  // Look for collection pills
  const collectionPills = devsCard.querySelectorAll('.collection-pill, .collection-count-pill, [class*="collection"]');
  console.log(`Collection pills found: ${collectionPills.length}`);
  collectionPills.forEach((pill, index) => {
    console.log(`Pill ${index + 1}:`, pill.textContent, pill.className);
  });
} else {
  console.log('❌ Devs card not found in the UI');
}

// 4. Test the normalizePath function
console.log('\n🔧 [DEBUG] Testing normalizePath function...');
if (window.mediaLibraryManager && typeof window.mediaLibraryManager.normalizePath === 'function') {
  const testPaths = [
    'TV-SHOWS/devs (2020)',
    'tv-shows/devs (2020)',
    'TV-SHOWS/Devs (2020)',
    'tv-shows/Devs (2020)'
  ];
  
  testPaths.forEach(path => {
    const normalized = window.mediaLibraryManager.normalizePath(path);
    console.log(`Original: "${path}" -> Normalized: "${normalized}"`);
  });
} else {
  console.log('❌ normalizePath function not available');
}

console.log('\n✅ [DEBUG] Collection display debug complete!');
