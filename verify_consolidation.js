const fs = require('fs');

// Load the consolidated unified JSON
const unifiedData = JSON.parse(fs.readFileSync('./public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json', 'utf8'));

console.log('🔍 VERIFYING CONSOLIDATION RESULTS...\n');

// Check a few specific shows
const testShows = [
    'the.big.bang.theory.(2007)',
    'lost.(2004)',
    'the.mandalorian.(2019)',
    'silicon.valley.(2014)'
];

testShows.forEach(showName => {
    const show = unifiedData[showName];
    if (show) {
        console.log(`📺 ${showName}:`);
        console.log(`  📝 Description: ${show.description ? '✅' : '❌'}`);
        console.log(`  🏷️  Genres: ${show.genres ? `✅ (${show.genres.join(', ')})` : '❌'}`);
        console.log(`  🖼️  Poster: ${show.poster ? `✅ (${show.poster})` : '❌'}`);
        console.log(`  👥 Cast: ${show.cast ? `✅ (${show.cast.length} members)` : '❌'}`);
        console.log(`  🎭 Seasons: ${show.seasons ? Object.keys(show.seasons).length : '❌'}`);
        
        // Check season posters
        if (show.seasons) {
            Object.keys(show.seasons).forEach(seasonKey => {
                const season = show.seasons[seasonKey];
                if (season.poster) {
                    console.log(`    🖼️  Season ${seasonKey} poster: ✅`);
                }
            });
        }
        console.log('');
    } else {
        console.log(`❌ ${showName} not found in unified data`);
    }
});

// Check overall statistics
let showsWithDescription = 0;
let showsWithGenres = 0;
let showsWithPoster = 0;
let showsWithCast = 0;

Object.values(unifiedData).forEach(show => {
    if (show.description) showsWithDescription++;
    if (show.genres) showsWithGenres++;
    if (show.poster) showsWithPoster++;
    if (show.cast && show.cast.length > 0) showsWithCast++;
});

console.log('📊 OVERALL STATISTICS:');
console.log(`  📺 Total shows: ${Object.keys(unifiedData).length}`);
console.log(`  📝 Shows with descriptions: ${showsWithDescription}`);
console.log(`  🏷️  Shows with genres: ${showsWithGenres}`);
console.log(`  🖼️  Shows with posters: ${showsWithPoster}`);
console.log(`  👥 Shows with cast: ${showsWithCast}`);

// Check for any shows that should have posters but don't
console.log('\n🔍 SHOWS MISSING POSTERS:');
Object.keys(unifiedData).forEach(showName => {
    const show = unifiedData[showName];
    if (!show.poster) {
        console.log(`  ❌ ${showName} - missing poster`);
    }
});

// Check for any shows that should have cast but don't
console.log('\n🔍 SHOWS MISSING CAST:');
Object.keys(unifiedData).forEach(showName => {
    const show = unifiedData[showName];
    if (!show.cast || show.cast.length === 0) {
        console.log(`  ❌ ${showName} - missing cast`);
    }
});
