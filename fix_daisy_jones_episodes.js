const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING DAISY JONES & THE SIX EPISODES...\n');

// Read the current tv-shows-unified.json
const tvShowsPath = 'public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json';
const tvShowsData = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));

let episodesFixed = 0;

// Find Daisy Jones & The Six show
const showKey = 'daisy.jones.and.the.six.(2023)';
if (tvShowsData[showKey] && tvShowsData[showKey].seasons) {
    console.log(`📺 Processing: ${tvShowsData[showKey].TMDBTitle}`);
    
    // Process each season
    for (const [seasonKey, season] of Object.entries(tvShowsData[showKey].seasons)) {
        if (season.episodes) {
            console.log(`  📋 Season ${seasonKey}: Processing episodes`);
            
            // Process each episode
            for (const [episodeKey, episode] of Object.entries(season.episodes)) {
                // Add missing fields
                if (!episode.season) {
                    episode.season = parseInt(seasonKey);
                    episodesFixed++;
                }
                if (!episode.episode) {
                    episode.episode = parseInt(episodeKey);
                    episodesFixed++;
                }
                if (!episode.type) {
                    episode.type = 'episode';
                    episodesFixed++;
                }
                if (!episode.isSpecials) {
                    episode.isSpecials = false;
                    episodesFixed++;
                }
                if (!episode.videoFormat) {
                    episode.videoFormat = '.mp4';
                    episodesFixed++;
                }
                if (!episode.supportsVideo) {
                    episode.supportsVideo = true;
                    episodesFixed++;
                }
                if (!episode.absPath) {
                    episode.absPath = `S:/MEDIA/TV-SHOWS/Daisy Jones & The Six (2023)/Season 01/${episode.path.split('\\').pop()}`;
                    episodesFixed++;
                }
            }
        }
    }
}

// Write the updated data back to file
fs.writeFileSync(tvShowsPath, JSON.stringify(tvShowsData, null, 2));

console.log('\n✅ DAISY JONES EPISODES FIX COMPLETE!');
console.log(`📊 Statistics:`);
console.log(`   • Episodes Fixed: ${episodesFixed}`);
console.log(`   • File Updated: ${tvShowsPath}`);
console.log('\n🎯 Daisy Jones & The Six should now display seasons correctly!');
