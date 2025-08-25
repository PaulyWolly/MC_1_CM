const fs = require('fs');

// Load all the data files
const unifiedData = JSON.parse(fs.readFileSync('./public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json', 'utf8'));
const postersData = JSON.parse(fs.readFileSync('./public/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json', 'utf8'));
const castData = JSON.parse(fs.readFileSync('./public/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json', 'utf8'));

console.log('🔍 DEBUGGING KEY MISMATCHES...\n');

console.log('📺 UNIFIED JSON KEYS (first 10):');
console.log(Object.keys(unifiedData).slice(0, 10));

console.log('\n🖼️  POSTERS DATA KEYS (first 10):');
console.log(Object.keys(postersData).slice(0, 10));

console.log('\n👥 CAST DATA KEYS (first 10):');
console.log(Object.keys(castData).slice(0, 10));

// Check for specific mismatches
console.log('\n🔍 CHECKING SPECIFIC SHOWS...');

const testShows = [
    'the.big.bang.theory.(2007)',
    'lost.(2004)',
    'the.mandalorian.(2019)',
    'silicon.valley.(2014)'
];

testShows.forEach(showName => {
    console.log(`\n📺 ${showName}:`);
    console.log(`  Unified JSON: ${unifiedData[showName] ? '✅' : '❌'}`);
    console.log(`  Posters: ${postersData[showName] ? `✅ (${postersData[showName]})` : '❌'}`);
    console.log(`  Cast: ${castData[showName] ? `✅ (${castData[showName].length} members)` : '❌'}`);
    
    // Check if there are similar keys
    const similarPosterKeys = Object.keys(postersData).filter(key => key.includes(showName.split('.')[0]));
    const similarCastKeys = Object.keys(castData).filter(key => key.includes(showName.split('.')[0]));
    
    if (similarPosterKeys.length > 0) {
        console.log(`  🔍 Similar poster keys: ${similarPosterKeys.join(', ')}`);
    }
    if (similarCastKeys.length > 0) {
        console.log(`  🔍 Similar cast keys: ${similarCastKeys.join(', ')}`);
    }
});

// Check for exact matches
console.log('\n🔍 EXACT KEY MATCHES:');
let posterMatches = 0;
let castMatches = 0;

Object.keys(unifiedData).forEach(showName => {
    if (postersData[showName]) posterMatches++;
    if (castData[showName]) castMatches++;
});

console.log(`  Poster matches: ${posterMatches}/${Object.keys(unifiedData).length}`);
console.log(`  Cast matches: ${castMatches}/${Object.keys(unifiedData).length}`);

// Find shows that exist in supporting files but not in unified
console.log('\n🔍 SHOWS IN SUPPORTING FILES BUT NOT IN UNIFIED:');
const unifiedKeys = new Set(Object.keys(unifiedData));

Object.keys(postersData).forEach(key => {
    if (!unifiedKeys.has(key)) {
        console.log(`  🖼️  Poster only: ${key}`);
    }
});

Object.keys(castData).forEach(key => {
    if (!unifiedKeys.has(key)) {
        console.log(`  👥 Cast only: ${key}`);
    }
});
