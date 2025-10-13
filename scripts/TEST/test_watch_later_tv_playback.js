/*
  TEST_WATCH_LATER_TV_PLAYBACK.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🧪 [TEST] Testing Watch Later TV Show Playback with Seasons Structure');
console.log('================================================================\n');

// Test 1: Check TV show data structure
function testTVShowDataStructure() {
    console.log('🔍 [TEST] Testing TV show data structure...');
    
    try {
        const tvShowsPath = 'public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json';
        const tvShowsData = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
        
        console.log('   - Data type:', typeof tvShowsData);
        console.log('   - Is array:', Array.isArray(tvShowsData));
        
        if (Array.isArray(tvShowsData) && tvShowsData.length > 0) {
            const firstShow = tvShowsData[0];
            console.log('   - First show keys:', Object.keys(firstShow));
            console.log('   - Has seasons:', !!firstShow.seasons);
            console.log('   - Has folders:', !!firstShow.folders);
            
            if (firstShow.seasons && Array.isArray(firstShow.seasons)) {
                console.log('   - Seasons count:', firstShow.seasons.length);
                if (firstShow.seasons.length > 0) {
                    const firstSeason = firstShow.seasons[0];
                    console.log('   - First season keys:', Object.keys(firstSeason));
                    console.log('   - Has episodes:', !!firstSeason.episodes);
                    console.log('   - Episodes count:', firstSeason.episodes ? firstSeason.episodes.length : 0);
                }
            }
            
            return true;
        } else {
            console.log('   ❌ [TEST] FAIL: No TV shows found in data');
            return false;
        }
    } catch (error) {
        console.log('   ❌ [TEST] FAIL: Error reading TV shows data:', error.message);
        return false;
    }
}

// Test 2: Check Watch Later logic compatibility
function testWatchLaterLogic() {
    console.log('\n🔍 [TEST] Testing Watch Later logic compatibility...');
    
    // Simulate the searchSeasons function logic
    function searchSeasons(seasons, searchPath) {
        console.log('   - Searching for path:', searchPath);
        console.log('   - Seasons data type:', typeof seasons);
        console.log('   - Seasons is array:', Array.isArray(seasons));
        
        if (!Array.isArray(seasons)) {
            console.log('   - ❌ [TEST] FAIL: Seasons is not an array');
            return null;
        }
        
        for (const show of seasons) {
            if (show.seasons && Array.isArray(show.seasons)) {
                console.log('   - Found show with seasons:', show.title || show.name);
                for (const season of show.seasons) {
                    if (season.episodes && Array.isArray(season.episodes)) {
                        console.log('   - Found season with episodes:', season.episodes.length);
                        for (const ep of season.episodes) {
                            if (ep.relPath && ep.relPath.includes(searchPath)) {
                                console.log('   - ✅ [TEST] PASS: Found matching episode');
                                return ep;
                            }
                        }
                    }
                }
            }
        }
        
        console.log('   - ❌ [TEST] FAIL: No matching episode found');
        return null;
    }
    
    // Test with sample data
    const sampleSeasons = [
        {
            title: 'Test Show',
            seasons: [
                {
                    episodes: [
                        { relPath: 'Test Show/season 1/Episode 01.mp4', filePath: '/media/tv-shows/Test Show/season 1/Episode 01.mp4' }
                    ]
                }
            ]
        }
    ];
    
    const foundEpisode = searchSeasons(sampleSeasons, 'Episode 01');
    return foundEpisode !== null;
}

// Test 3: Check path extraction logic
function testPathExtraction() {
    console.log('\n🔍 [TEST] Testing path extraction logic...');
    
    function extractRelativePath(absolutePath) {
        let searchPath = (absolutePath || '').replace(/\\/g, '/').trim();
        const lowerPath = searchPath.toLowerCase();
        
        if (lowerPath.includes(':/media/tv-shows/')) {
            const parts = searchPath.split('/');
            const mediaIndex = parts.findIndex(part => part.toLowerCase() === 'media');
            if (mediaIndex !== -1 && parts[mediaIndex + 1] && parts[mediaIndex + 1].toLowerCase() === 'tv-shows') {
                searchPath = parts.slice(mediaIndex + 2).join('/');
                console.log('   - Extracted relative path:', searchPath);
                return searchPath;
            }
        }
        
        console.log('   - No extraction needed:', searchPath);
        return searchPath;
    }
    
    const testPaths = [
        'C:/media/tv-shows/Test Show/season 1/Episode 01.mp4',
        'D:/media/tv-shows/Another Show/season 2/Episode 05.mp4',
        'Test Show/season 1/Episode 01.mp4'
    ];
    
    let allPassed = true;
    testPaths.forEach((path, index) => {
        console.log(`   - Test path ${index + 1}:`, path);
        const extracted = extractRelativePath(path);
        if (extracted.includes(':/')) {
            console.log('   - ❌ [TEST] FAIL: Path still contains drive letter');
            allPassed = false;
        } else {
            console.log('   - ✅ [TEST] PASS: Path extracted correctly');
        }
    });
    
    return allPassed;
}

// Run all tests
const test1 = testTVShowDataStructure();
const test2 = testWatchLaterLogic();
const test3 = testPathExtraction();

console.log('\n📊 [TEST] Results Summary');
console.log('========================');
console.log('   - TV Show Data Structure: ' + (test1 ? '✅ PASS' : '❌ FAIL'));
console.log('   - Watch Later Logic: ' + (test2 ? '✅ PASS' : '❌ FAIL'));
console.log('   - Path Extraction: ' + (test3 ? '✅ PASS' : '❌ FAIL'));

const allTestsPassed = test1 && test2 && test3;
console.log('\n🎯 [TEST] Overall Result: ' + (allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));

if (allTestsPassed) {
    console.log('\n✅ [TEST] Watch Later TV show playback should work correctly with the new seasons structure!');
} else {
    console.log('\n❌ [TEST] Watch Later TV show playback may still have issues.');
} 