// 🔍 DEBUG COLLECTION BUTTONS
console.log('🔍 [DEBUG] Starting collection buttons debug...');

// 1. Check what collection buttons exist
console.log('\n📋 [DEBUG] Checking collection buttons...');
const movieButtons = document.querySelectorAll('.movie-collection-btn');
const tvButtons = document.querySelectorAll('.tv-collection-btn');
const allButtons = [...movieButtons, ...tvButtons];

console.log('Movie collection buttons found:', movieButtons.length);
console.log('TV collection buttons found:', tvButtons.length);
console.log('Total collection buttons:', allButtons.length);

// 2. Show details of all buttons
console.log('\n🔍 [DEBUG] Button details:');
allButtons.forEach((btn, index) => {
  console.log(`Button ${index + 1}:`, {
    path: btn.dataset.path,
    text: btn.textContent,
    classes: btn.className,
    title: btn.title
  });
});

// 3. Look specifically for Devs
console.log('\n🔍 [DEBUG] Looking for Devs button...');
const devsButton = Array.from(allButtons).find(btn => 
  btn.dataset.path && btn.dataset.path.toLowerCase().includes('devs')
);

if (devsButton) {
  console.log('✅ Devs button found:', {
    path: devsButton.dataset.path,
    text: devsButton.textContent,
    classes: devsButton.className,
    title: devsButton.title
  });
} else {
  console.log('❌ Devs button not found');
  console.log('Available paths:', allButtons.map(btn => btn.dataset.path).filter(Boolean));
}

// 4. Check localStorage collections
console.log('\n📁 [DEBUG] Checking localStorage collections...');
const collectionsData = localStorage.getItem('mediaCollections');
if (collectionsData) {
  const collections = JSON.parse(collectionsData);
  console.log('Collections found:', Object.keys(collections).length);
  
  // Look for Devs in collections
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

// 5. Test the getItemCollections function if available
console.log('\n🧪 [DEBUG] Testing getItemCollections function...');
if (window.mediaLibraryManager && typeof window.mediaLibraryManager.getItemCollections === 'function') {
  window.mediaLibraryManager.getItemCollections('TV-SHOWS/devs (2020)')
    .then(collections => {
      console.log('✅ getItemCollections result for Devs:', collections);
    })
    .catch(error => {
      console.log('❌ Error calling getItemCollections:', error);
    });
} else {
  console.log('❌ getItemCollections function not available');
}

console.log('\n✅ [DEBUG] Debug complete!');
