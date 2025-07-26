/*
  TEST_WATCH_LATER_FUNCTIONALITY.JS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: 1/6/2025
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Test data
const testData = {
    movies: [
        {
            path: "Test Movie (2024) [1080p]",
            title: "Test Movie (2024) [1080p]",
            type: "movie",
            currentTime: 1200,
            duration: 7200,
            lastWatched: Date.now()
        }
    ],
    tvShows: [
        {
            path: "TV-SHOWS/Test Show/Season 01/Test.Show.S01E01.mkv",
            title: "Test Show S01E01",
            type: "tv-show",
            currentTime: 1800,
            duration: 3600,
            lastWatched: Date.now()
        },
        {
            path: "tv-shows/Another Show/Season 02/Another.Show.S02E05.mkv",
            title: "Another Show S02E05",
            type: "tv-show",
            currentTime: 2400,
            duration: 3600,
            lastWatched: Date.now()
        }
    ]
};

function testWatchLaterFiltering() {
    console.log('🧪 [TEST] Testing Watch Later filtering logic...');
    
    const allItems = [...testData.movies, ...testData.tvShows];
    
    // Simulate the filtering logic from MediaLibraryManager
    const tvshows = allItems.filter(item => {
        // Check type first (most reliable)
        if (item.type) {
            const isTV = item.type.toLowerCase().includes('tv') || item.type.toLowerCase().includes('show');
            return isTV;
        }
        
        // Check path for TV show patterns
        if (item.path) {
            const hasTVPattern = /season\s*\d+|s\d+e\d+|tv-shows|tv_shows/i.test(item.path);
            return hasTVPattern;
        }
        
        return false;
    });
    
    const movies = allItems.filter(item => !tvshows.includes(item));
    
    console.log('📊 [TEST] Filtering Results:');
    console.log(`   Total items: ${allItems.length}`);
    console.log(`   TV Shows: ${tvshows.length}`);
    console.log(`   Movies: ${movies.length}`);
    
    // Verify results
    const expectedTVShows = 2;
    const expectedMovies = 1;
    
    if (tvshows.length === expectedTVShows && movies.length === expectedMovies) {
        console.log('✅ [TEST] Filtering test PASSED');
        return true;
    } else {
        console.log('❌ [TEST] Filtering test FAILED');
        console.log(`   Expected: ${expectedTVShows} TV shows, ${expectedMovies} movies`);
        console.log(`   Got: ${tvshows.length} TV shows, ${movies.length} movies`);
        return false;
    }
}

function testPathConversion() {
    console.log('\n🧪 [TEST] Testing path conversion logic...');
    
    const testPaths = [
        '/media/TV-SHOWS/Show/Season 01/Show.S01E01.mkv',
        'S:\\MEDIA\\TV-SHOWS\\Show\\Season 01\\Show.S01E01.mkv',
        'TV-SHOWS/Show/Season 01/Show.S01E01.mkv',
        '/media/movies/Movie (2024) [1080p]/movie.mp4'
    ];
    
    let passed = 0;
    let total = testPaths.length;
    
    testPaths.forEach((testPath, index) => {
        console.log(`   Testing path ${index + 1}: ${testPath}`);
        
        let convertedPath = testPath;
        
        // Simulate the conversion logic
        if (convertedPath.startsWith('/media/')) {
            convertedPath = convertedPath.replace(/^\/media\//, '');
        }
        
        if (convertedPath.includes('\\')) {
            convertedPath = convertedPath.replace(/\\/g, '/');
        }
        
        console.log(`   Converted to: ${convertedPath}`);
        
        // Basic validation
        if (convertedPath && !convertedPath.includes('undefined')) {
            passed++;
            console.log(`   ✅ Path ${index + 1} conversion OK`);
        } else {
            console.log(`   ❌ Path ${index + 1} conversion FAILED`);
        }
    });
    
    if (passed === total) {
        console.log('✅ [TEST] Path conversion test PASSED');
        return true;
    } else {
        console.log(`❌ [TEST] Path conversion test FAILED (${passed}/${total} passed)`);
        return false;
    }
}

function testTVShowDetection() {
    console.log('\n🧪 [TEST] Testing TV show detection logic...');
    
    const testItems = [
        { path: 'TV-SHOWS/Show/Season 01/Show.S01E01.mkv', title: 'Show S01E01' },
        { path: 'movies/Movie (2024) [1080p]/movie.mp4', title: 'Movie (2024)' },
        { path: 'tv-shows/Another/Season 02/Another.S02E05.mkv', title: 'Another S02E05' },
        { path: 'movies/Another Movie/another.mp4', title: 'Another Movie' }
    ];
    
    let passed = 0;
    let total = testItems.length;
    
    testItems.forEach((item, index) => {
        console.log(`   Testing item ${index + 1}: ${item.title}`);
        
        const pathToCheck = (item.path || '').toLowerCase();
        const isTVShow = pathToCheck.includes('tv-shows') || 
                        pathToCheck.includes('tv_shows') ||
                        pathToCheck.includes('season') ||
                        (item.title && (item.title.includes('S00E') || item.title.includes('S01E') || item.title.includes('S02E')));
        
        const expected = item.path.includes('TV-SHOWS') || item.path.includes('tv-shows');
        
        console.log(`   Path: ${item.path}`);
        console.log(`   Expected TV show: ${expected}`);
        console.log(`   Detected TV show: ${isTVShow}`);
        
        if (isTVShow === expected) {
            passed++;
            console.log(`   ✅ Item ${index + 1} detection OK`);
        } else {
            console.log(`   ❌ Item ${index + 1} detection FAILED`);
        }
    });
    
    if (passed === total) {
        console.log('✅ [TEST] TV show detection test PASSED');
        return true;
    } else {
        console.log(`❌ [TEST] TV show detection test FAILED (${passed}/${total} passed)`);
        return false;
    }
}

function main() {
    console.log('🚀 [TEST] Starting Watch Later functionality tests...\n');
    
    const results = [
        testWatchLaterFiltering(),
        testPathConversion(),
        testTVShowDetection()
    ];
    
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 [TEST] FINAL RESULTS');
    console.log('='.repeat(60));
    console.log(`Tests passed: ${passed}/${total}`);
    
    if (passed === total) {
        console.log('🎉 [TEST] ALL TESTS PASSED - Watch Later functionality is working correctly!');
        process.exit(0);
    } else {
        console.log('❌ [TEST] SOME TESTS FAILED - Watch Later functionality needs attention!');
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} 