const fs = require('fs');
const path = require('path');

// Read the current tv-shows-unified.json
const filePath = 'public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json';
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log('🔍 [FIX] Adding season_poster and season_thumbnail fields to ALL TV shows...');

let showsFixed = 0;
let seasonsFixed = 0;

// Process each TV show
for (const [showKey, showData] of Object.entries(data)) {
    if (showData.type === 'tvshow' && showData.seasons) {
        console.log(`🔄 [FIX] Processing show: ${showData.TMDBTitle || showData.title || showKey}`);
        
        // Process each season
        for (const [seasonKey, season] of Object.entries(showData.seasons)) {
            if (season.poster) {
                // Force add season_poster and season_thumbnail
                season.season_poster = season.poster;
                season.season_thumbnail = season.poster;
                seasonsFixed += 2;
                console.log(`   ✅ [FIX] Added season_poster and season_thumbnail to Season ${seasonKey}`);
            } else {
                console.log(`   ⚠️ [FIX] Season ${seasonKey} has no poster field`);
            }
        }
        
        showsFixed++;
    }
}

console.log(`✅ [FIX] Fixed ${showsFixed} TV shows`);
console.log(`✅ [FIX] Added ${seasonsFixed} season fields total`);

// Write back to file
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('💾 [FIX] Updated tv-shows-unified.json with season fields');
