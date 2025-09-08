// 🧪 TEST PATH MATCHING
console.log('🧪 [TEST] Testing path matching for Devs...');

// Test different path formats that might be stored
const testPaths = [
  'TV-SHOWS/devs (2020)',
  'tv-shows/devs (2020)', 
  'TV-SHOWS/Devs (2020)',
  'tv-shows/Devs (2020)',
  'devs (2020)',
  'Devs (2020)',
  'TV-SHOWS\\devs (2020)',
  'tv-shows\\devs (2020)'
];

// Test normalization
function normalizePath(path) {
  if (!path || typeof path !== 'string') {
    return "";
  }
  const normalized = path.replace(/\\/g, "/").toLowerCase().trim();
  return normalized;
}

console.log('\n🔧 [TEST] Testing path normalization...');
testPaths.forEach(path => {
  const normalized = normalizePath(path);
  console.log(`Original: "${path}" -> Normalized: "${normalized}"`);
});

// Test what might be in localStorage
console.log('\n📁 [TEST] Checking localStorage collections...');
const collectionsData = localStorage.getItem('mediaCollections');
if (collectionsData) {
  const collections = JSON.parse(collectionsData);
  console.log('Collections found:', Object.keys(collections));
  
  if (collections['My PICK']) {
    console.log('"My PICK" collection items:', collections['My PICK']);
    
    // Test each stored path against our test paths
    collections['My PICK'].forEach(storedPath => {
      const normalizedStored = normalizePath(storedPath);
      console.log(`\nStored path: "${storedPath}" -> Normalized: "${normalizedStored}"`);
      
      testPaths.forEach(testPath => {
        const normalizedTest = normalizePath(testPath);
        const matches = normalizedStored === normalizedTest;
        console.log(`  vs "${testPath}" -> "${normalizedTest}" = ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
      });
    });
  }
} else {
  console.log('❌ No collections data in localStorage');
}

console.log('\n✅ [TEST] Path matching test complete!');
