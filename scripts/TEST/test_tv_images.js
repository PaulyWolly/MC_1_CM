/*
  TEST_TV_IMAGES.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Test script to verify season and episode images are working
console.log('🎬 Testing TV Show Season & Episode Images Integration');

const SEASON_JSON_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tmdb_tv-show_season_images.json');
const EPISODE_JSON_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tmdb_tv-show_episode_images.json');

if (!fs.existsSync(SEASON_JSON_PATH)) {
    console.error('❌ tmdb_tv-show_season_images.json not found!');
    console.log('💡 Run fetch_tmdb_tv-show_season_images.js first');
    process.exit(1);
}

if (!fs.existsSync(EPISODE_JSON_PATH)) {
    console.error('❌ tmdb_tv-show_episode_images.json not found!');
    console.log('💡 Run fetch_tmdb_tv-show_episode_images.js first');
    process.exit(1);
}

const seasonData = JSON.parse(fs.readFileSync(SEASON_JSON_PATH, 'utf8'));
const episodeData = JSON.parse(fs.readFileSync(EPISODE_JSON_PATH, 'utf8'));

console.log('✅ TV Show Image Data Loaded Successfully!');
console.log('\n📊 Season Images Summary:');
console.log(`   • Shows with season data: ${Object.keys(seasonData).length}`);
let totalSeasons = 0;
let seasonsWithPosters = 0;
for (const showName in seasonData) {
    const seasons = seasonData[showName].seasons || {};
    totalSeasons += Object.keys(seasons).length;
    for (const seasonNum in seasons) {
        if (seasons[seasonNum].poster) seasonsWithPosters++;
    }
}
console.log(`   • Total seasons: ${totalSeasons}`);
console.log(`   • Seasons with posters: ${seasonsWithPosters}`);

console.log('\n📊 Episode Images Summary:');
console.log(`   • Shows with episode data: ${Object.keys(episodeData).length}`);
let totalEpisodes = 0;
let episodesWithStills = 0;
for (const showName in episodeData) {
    const seasons = episodeData[showName].seasons || {};
    for (const seasonNum in seasons) {
        const episodes = seasons[seasonNum].episodes || {};
        totalEpisodes += Object.keys(episodes).length;
        for (const episodeNum in episodes) {
            if (episodes[episodeNum].still) episodesWithStills++;
        }
    }
}
console.log(`   • Total episodes: ${totalEpisodes}`);
console.log(`   • Episodes with stills: ${episodesWithStills}`);

console.log('\n🎬 Sample Data:');
const sampleShow = Object.keys(seasonData)[0];
if (sampleShow) {
    console.log(`   Show: ${sampleShow}`);
    const seasons = seasonData[sampleShow].seasons || {};
    const seasonNums = Object.keys(seasons);
    if (seasonNums.length > 0) {
        const sampleSeason = seasonNums[0];
        console.log(`   Season ${sampleSeason}: ${seasons[sampleSeason].poster ? '✅ Has poster' : '❌ No poster'}`);
        
        if (episodeData[sampleShow] && episodeData[sampleShow].seasons && episodeData[sampleShow].seasons[sampleSeason]) {
            const episodes = episodeData[sampleShow].seasons[sampleSeason].episodes || {};
            const episodeNums = Object.keys(episodes);
            if (episodeNums.length > 0) {
                const sampleEpisode = episodeNums[0];
                console.log(`   Episode ${sampleEpisode}: ${episodes[sampleEpisode].still ? '✅ Has still' : '❌ No still'}`);
            }
        }
    }
}

console.log(`\n🎉 Data looks good! The MediaLibraryManager should now display:`);
console.log(`   • Season posters instead of default images`);
console.log(`   • Episode stills instead of default images`);
console.log(`   • Fallback to default images if no data is found`); 