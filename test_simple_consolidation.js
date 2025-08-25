const fs = require('fs');

// Load the current unified JSON
const unifiedData = JSON.parse(fs.readFileSync('./public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json', 'utf8'));

// Load supporting data
const postersData = JSON.parse(fs.readFileSync('./public/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json', 'utf8'));
const castData = JSON.parse(fs.readFileSync('./public/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json', 'utf8'));

console.log('🧪 TESTING SIMPLE CONSOLIDATION...\n');

// Test with one show first
const testShow = 'the.big.bang.theory.(2007)';
console.log(`📺 Testing with: ${testShow}`);

const show = unifiedData[testShow];
console.log(`  Before - Poster: ${show.poster ? '✅' : '❌'}`);
console.log(`  Before - Cast: ${show.cast ? '✅' : '❌'}`);

// Add the data
if (postersData[testShow]) {
    show.poster = postersData[testShow];
    console.log(`  ✅ Added poster: ${postersData[testShow]}`);
}

if (castData[testShow]) {
    show.cast = castData[testShow];
    console.log(`  ✅ Added cast: ${castData[testShow].length} members`);
}

console.log(`  After - Poster: ${show.poster ? '✅' : '❌'}`);
console.log(`  After - Cast: ${show.cast ? '✅' : '❌'}`);

// Test with a few more shows
const testShows = ['lost.(2004)', 'the.mandalorian.(2019)', 'silicon.valley.(2014)'];
let addedPosters = 0;
let addedCast = 0;

testShows.forEach(showName => {
    const show = unifiedData[showName];
    if (postersData[showName]) {
        show.poster = postersData[showName];
        addedPosters++;
    }
    if (castData[showName]) {
        show.cast = castData[showName];
        addedCast++;
    }
});

console.log(`\n📊 TEST RESULTS:`);
console.log(`  Added posters: ${addedPosters}`);
console.log(`  Added cast: ${addedCast}`);

// Save the test data
fs.writeFileSync('./public/components/MediaLibrary/data/tv-shows/tv-shows-unified_test.json', JSON.stringify(unifiedData, null, 2));
console.log(`\n💾 Test data saved to: tv-shows-unified_test.json`);

// Verify the changes were actually made
console.log(`\n🔍 VERIFICATION:`);
testShows.forEach(showName => {
    const show = unifiedData[showName];
    console.log(`  ${showName}: Poster=${show.poster ? '✅' : '❌'}, Cast=${show.cast ? '✅' : '❌'}`);
});
