// Debug script to check what's in the TEST collection
console.log('🔍 [DEBUG] Checking TEST collection contents...');

// Check localStorage collections
const collectionsData = localStorage.getItem('collections');
if (collectionsData) {
  const collections = JSON.parse(collectionsData);
  console.log('📁 [DEBUG] All collections:', Object.keys(collections));
  
  if (collections.TEST) {
    console.log('🧪 [DEBUG] TEST collection items:', collections.TEST);
    console.log('🧪 [DEBUG] TEST collection count:', collections.TEST.length);
    
    // Check each item
    collections.TEST.forEach((item, index) => {
      console.log(`📝 [DEBUG] Item ${index + 1}:`, {
        key: item,
        type: typeof item,
        isString: typeof item === 'string',
        length: item ? item.length : 0
      });
    });
  } else {
    console.log('❌ [DEBUG] TEST collection not found');
  }
} else {
  console.log('❌ [DEBUG] No collections data found in localStorage');
}

// Check unified data structure
console.log('🔍 [DEBUG] Checking unified data structure...');
if (window.mediaLibraryManager && window.mediaLibraryManager.unifiedData) {
  const unifiedData = window.mediaLibraryManager.unifiedData;
  console.log('📊 [DEBUG] Unified data keys count:', Object.keys(unifiedData).length);
  
  // Check first few keys
  const firstKeys = Object.keys(unifiedData).slice(0, 5);
  console.log('🔑 [DEBUG] First 5 unified data keys:', firstKeys);
  
  // Check if any keys contain "bored" or "death"
  const boredKeys = Object.keys(unifiedData).filter(key => 
    key.toLowerCase().includes('bored') || key.toLowerCase().includes('death')
  );
  console.log('🎭 [DEBUG] Keys containing "bored" or "death":', boredKeys);
  
  if (boredKeys.length > 0) {
    const boredItem = unifiedData[boredKeys[0]];
    console.log('📺 [DEBUG] Bored to Death item structure:', {
      key: boredKeys[0],
      isMovie: boredItem.isMovie,
      type: boredItem.type,
      TMDBTitle: boredItem.TMDBTitle,
      hasSeasons: !!boredItem.seasons
    });
  }
} else {
  console.log('❌ [DEBUG] MediaLibraryManager or unifiedData not available');
}

console.log('✅ [DEBUG] Debug complete!');
