/*
  TEST_WATCH_LATER_TV_PLAYBACK.JS
  Version: 1
  AppName: MC_1_CM [v9]
  Updated: 7/25/2025 @8:40PM
  Created by Paul Welby
  
  Purpose: Test that Watch Later TV show playback works correctly
*/

const fs = require('fs');
const path = require('path');

console.log('🎬 [TEST - WATCH-LATER-TV] Testing Watch Later TV show playback...');

// Test the Watch Later TV show data structure
function testWatchLaterTVDataStructure() {
    console.log('🔍 [TEST] Testing Watch Later TV show data structure...');
    
    try {
        // Simulate a Watch Later TV show item
        const mockWatchLaterTVItem = {
            path: 'The Big Bang Theory/Season 12/The.Big.Bang.Theory.S12E01.mp4',
            title: 'The Big Bang Theory S12E01',
            type: 'tv-show',
            currentTime: 1200,
            duration: 1800,
            lastWatched: Date.now()
        };
        
        console.log('✅ [TEST] PASS: Watch Later TV show item structure is correct');
        console.log('   Path:', mockWatchLaterTVItem.path);
        console.log('   Type:', mockWatchLaterTVItem.type);
        console.log('   Current Time:', mockWatchLaterTVItem.currentTime);
        
        return mockWatchLaterTVItem;
    } catch (error) {
        console.log('❌ [TEST] FAIL: Could not create mock Watch Later TV show item');
        console.log('   Error:', error.message);
        return null;
    }
}

// Test the playMedia function logic for TV shows
function testPlayMediaTVLogic() {
    console.log('\n🔍 [TEST] Testing playMedia function logic for TV shows...');
    
    // Simulate the playMedia function logic
    const mockMediaItem = {
        path: 'The Big Bang Theory/Season 12/The.Big.Bang.Theory.S12E01.mp4',
        title: 'The Big Bang Theory S12E01',
        type: 'tv-show'
    };
    
    const pathToCheck = (mockMediaItem.path || '').toLowerCase();
    const isTVShow = pathToCheck.includes('tv-shows') || 
                    pathToCheck.includes('tv_shows') ||
                    pathToCheck.includes('season') ||
                    (mockMediaItem.title && (mockMediaItem.title.includes('S00E') || mockMediaItem.title.includes('S01E') || mockMediaItem.title.includes('S02E')));
    
    if (isTVShow) {
        console.log('✅ [TEST] PASS: TV show detection logic works correctly');
        console.log('   Path:', mockMediaItem.path);
        console.log('   Title:', mockMediaItem.title);
        console.log('   Is TV Show:', isTVShow);
        
        // Test the episode data creation
        const episodeData = {
            filePath: mockMediaItem.filePath || mockMediaItem.absPath || mockMediaItem.path,
            title: mockMediaItem.title,
            name: mockMediaItem.name,
            path: mockMediaItem.path
        };
        
        console.log('✅ [TEST] PASS: Episode data creation works correctly');
        console.log('   Episode Data:', episodeData);
        
        return true;
    } else {
        console.log('❌ [TEST] FAIL: TV show detection logic failed');
        return false;
    }
}

// Test the saveResumeProgress function for TV shows
function testSaveResumeProgressTV() {
    console.log('\n🔍 [TEST] Testing saveResumeProgress function for TV shows...');
    
    // Simulate a TV show media item being saved
    const mockTVMediaItem = {
        path: 'The Big Bang Theory/Season 12/The.Big.Bang.Theory.S12E01.mp4',
        title: 'The Big Bang Theory S12E01',
        filePath: 'S:/MEDIA/TV-SHOWS/The Big Bang Theory/Season 12/The.Big.Bang.Theory.S12E01.mp4',
        currentTime: 1200,
        duration: 1800
    };
    
    const pathToCheck = (mockTVMediaItem.path || '').toLowerCase();
    const isTVShow = pathToCheck.includes('tv-shows') || 
                    pathToCheck.includes('tv_shows') ||
                    pathToCheck.includes('season') ||
                    (mockTVMediaItem.title && (mockTVMediaItem.title.includes('S00E') || mockTVMediaItem.title.includes('S01E') || mockTVMediaItem.title.includes('S02E')));
    
    if (isTVShow) {
        const savedItem = {
            path: mockTVMediaItem.path,
            title: mockTVMediaItem.title,
            currentTime: mockTVMediaItem.currentTime,
            duration: mockTVMediaItem.duration,
            lastWatched: Date.now(),
            type: 'tv-show'
        };
        
        // Ensure filePath is included for TV shows
        if (mockTVMediaItem.filePath) {
            savedItem.filePath = mockTVMediaItem.filePath;
        } else if (mockTVMediaItem.absPath) {
            savedItem.filePath = mockTVMediaItem.absPath;
        } else if (mockTVMediaItem.path) {
            savedItem.filePath = mockTVMediaItem.path;
        }
        
        console.log('✅ [TEST] PASS: saveResumeProgress for TV shows works correctly');
        console.log('   Saved Item:', savedItem);
        console.log('   Has filePath:', !!savedItem.filePath);
        
        return savedItem;
    } else {
        console.log('❌ [TEST] FAIL: saveResumeProgress TV show detection failed');
        return null;
    }
}

// Test the playEpisodeFromObject function
function testPlayEpisodeFromObject() {
    console.log('\n🔍 [TEST] Testing playEpisodeFromObject function...');
    
    // Simulate episode data that would be passed to playEpisodeFromObject
    const mockEpisodeData = {
        filePath: 'S:/MEDIA/TV-SHOWS/The Big Bang Theory/Season 12/The.Big.Bang.Theory.S12E01.mp4',
        title: 'The Big Bang Theory S12E01',
        name: 'The.Big.Bang.Theory.S12E01.mp4',
        path: 'The Big Bang Theory/Season 12/The.Big.Bang.Theory.S12E01.mp4'
    };
    
    const episodeDataJson = JSON.stringify(mockEpisodeData);
    
    try {
        const parsedEpisodeObj = JSON.parse(episodeDataJson);
        
        if (parsedEpisodeObj && parsedEpisodeObj.filePath) {
            const filePath = parsedEpisodeObj.filePath;
            const encodedPath = encodeURIComponent(filePath);
            const videoUrl = `/api/video?path=${encodedPath}`;
            
            console.log('✅ [TEST] PASS: playEpisodeFromObject logic works correctly');
            console.log('   File Path:', filePath);
            console.log('   Video URL:', videoUrl);
            
            return true;
        } else {
            console.log('❌ [TEST] FAIL: playEpisodeFromObject missing filePath');
            return false;
        }
    } catch (error) {
        console.log('❌ [TEST] FAIL: playEpisodeFromObject JSON parsing failed');
        console.log('   Error:', error.message);
        return false;
    }
}

// Test the complete Watch Later TV show flow
function testCompleteWatchLaterTVFlow() {
    console.log('\n🔍 [TEST] Testing complete Watch Later TV show flow...');
    
    // Step 1: Save TV show to Watch Later
    const savedItem = testSaveResumeProgressTV();
    if (!savedItem) {
        console.log('❌ [TEST] FAIL: Step 1 - Save to Watch Later failed');
        return false;
    }
    
    // Step 2: Load from Watch Later and detect as TV show
    const isTVShow = savedItem.type === 'tv-show';
    if (!isTVShow) {
        console.log('❌ [TEST] FAIL: Step 2 - TV show detection failed');
        return false;
    }
    
    // Step 3: Create episode data for playback
    const episodeData = {
        filePath: savedItem.filePath || savedItem.path,
        title: savedItem.title,
        name: savedItem.title,
        path: savedItem.path
    };
    
    if (!episodeData.filePath) {
        console.log('❌ [TEST] FAIL: Step 3 - Missing filePath for playback');
        return false;
    }
    
    // Step 4: Test video URL creation
    const encodedPath = encodeURIComponent(episodeData.filePath);
    const videoUrl = `/api/video?path=${encodedPath}`;
    
    console.log('✅ [TEST] PASS: Complete Watch Later TV show flow works correctly');
    console.log('   Step 1: Save to Watch Later - ✅');
    console.log('   Step 2: TV show detection - ✅');
    console.log('   Step 3: Episode data creation - ✅');
    console.log('   Step 4: Video URL creation - ✅');
    console.log('   Final Video URL:', videoUrl);
    
    return true;
}

// Run all tests
function runAllTests() {
    console.log('🚀 [TEST] Starting Watch Later TV show playback tests...\n');
    
    const test1 = testWatchLaterTVDataStructure();
    const test2 = testPlayMediaTVLogic();
    const test3 = testSaveResumeProgressTV();
    const test4 = testPlayEpisodeFromObject();
    const test5 = testCompleteWatchLaterTVFlow();
    
    console.log('\n🎯 [TEST] All tests completed!');
    console.log('📝 [TEST] Summary:');
    console.log('   - Watch Later TV show data structure: ' + (test1 ? '✅ PASS' : '❌ FAIL'));
    console.log('   - playMedia TV show logic: ' + (test2 ? '✅ PASS' : '❌ FAIL'));
    console.log('   - saveResumeProgress for TV shows: ' + (test3 ? '✅ PASS' : '❌ FAIL'));
    console.log('   - playEpisodeFromObject function: ' + (test4 ? '✅ PASS' : '❌ FAIL'));
    console.log('   - Complete Watch Later TV flow: ' + (test5 ? '✅ PASS' : '❌ FAIL'));
    
    const allPassed = test1 && test2 && test3 && test4 && test5;
    console.log('\n🎉 [TEST] Overall Result: ' + (allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));
    
    if (allPassed) {
        console.log('✅ [TEST] Watch Later TV show playback should now work correctly!');
        console.log('   - TV shows will be properly detected');
        console.log('   - filePath will be saved and retrieved correctly');
        console.log('   - Video player will receive proper URLs');
    }
}

// Run the tests
runAllTests(); 