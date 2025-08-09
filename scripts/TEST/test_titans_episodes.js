/*
  TEST_TITANS_EPISODES.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Titans (2018) Episode Data...\n');

// Test 1: Check media-library-tv-shows.json
console.log('📁 Testing media-library-tv-shows.json...');
try {
    const tvShowsData = JSON.parse(fs.readFileSync('server/data/media-library-tv-shows.json', 'utf8'));
    
    // Find Titans (2018) - the data structure has folders array
    const titansShow = tvShowsData.folders ? tvShowsData.folders.find(show => show.path === 'Titans (2018)') : null;
    if (!titansShow) {
        console.log('❌ Titans (2018) not found in media-library-tv-shows.json');
    } else {
        console.log('✅ Found Titans (2018) in media-library-tv-shows.json');
        
        // Check Season 01
        const season01 = titansShow.folders.find(folder => folder.path.includes('Season 01'));
        if (season01) {
            console.log(`✅ Season 01 found with ${season01.files.length} files`);
            
            // Check for S01E01
            const s01e01 = season01.files.find(file => file.name.includes('S01E01'));
            if (s01e01) {
                console.log('✅ S01E01 found:', s01e01.name);
            } else {
                console.log('❌ S01E01 not found in Season 01 files');
            }
            
            // List all episodes in Season 01
            const episodes = season01.files.filter(file => /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(file.name));
            console.log('📋 Season 01 episodes:', episodes.map(e => e.name));
        } else {
            console.log('❌ Season 01 not found');
        }
        
        // Check Season 04
        const season04 = titansShow.folders.find(folder => folder.path.includes('Season 04'));
        if (season04) {
            console.log(`✅ Season 04 found with ${season04.files.length} files`);
            
            // Check for S04E01
            const s04e01 = season04.files.find(file => file.name.includes('S04E01'));
            if (s04e01) {
                console.log('✅ S04E01 found:', s04e01.name);
            } else {
                console.log('❌ S04E01 not found in Season 04 files');
            }
            
            // List all episodes in Season 04
            const episodes = season04.files.filter(file => /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(file.name));
            console.log('📋 Season 04 episodes:', episodes.map(e => e.name));
        } else {
            console.log('❌ Season 04 not found');
        }
    }
} catch (error) {
    console.log('❌ Error reading media-library-tv-shows.json:', error.message);
}

console.log('\n🎬 Testing tmdb_tv-show_episode_images.json...');

// Test 2: Check tmdb_tv-show_episode_images.json
try {
    const episodeImagesData = JSON.parse(fs.readFileSync('public/components/MediaLibrary/data/tmdb_tv-show_episode_images.json', 'utf8'));
    
    const titansImages = episodeImagesData['Titans (2018)'];
    if (!titansImages) {
        console.log('❌ Titans (2018) not found in episode images JSON');
    } else {
        console.log('✅ Found Titans (2018) in episode images JSON');
        
        // Check Season 1
        const season1 = titansImages.seasons['1'];
        if (season1) {
            console.log(`✅ Season 1 found with ${Object.keys(season1.episodes).length} episodes`);
            
            // Check for episode 1
            const episode1 = season1.episodes['1'];
            if (episode1 && episode1.still) {
                console.log('✅ Season 1 Episode 1 found with still:', episode1.still);
            } else {
                console.log('❌ Season 1 Episode 1 not found or missing still');
            }
            
            // List all episodes in Season 1
            console.log('📋 Season 1 episodes:', Object.keys(season1.episodes).sort((a, b) => parseInt(a) - parseInt(b)));
        } else {
            console.log('❌ Season 1 not found');
        }
        
        // Check Season 4
        const season4 = titansImages.seasons['4'];
        if (season4) {
            console.log(`✅ Season 4 found with ${Object.keys(season4.episodes).length} episodes`);
            
            // Check for episode 1
            const episode1 = season4.episodes['1'];
            if (episode1 && episode1.still) {
                console.log('✅ Season 4 Episode 1 found with still:', episode1.still);
            } else {
                console.log('❌ Season 4 Episode 1 not found or missing still');
            }
            
            // List all episodes in Season 4
            console.log('📋 Season 4 episodes:', Object.keys(season4.episodes).sort((a, b) => parseInt(a) - parseInt(b)));
        } else {
            console.log('❌ Season 4 not found');
        }
    }
} catch (error) {
    console.log('❌ Error reading episode images JSON:', error.message);
}

console.log('\n�� Test completed!'); 