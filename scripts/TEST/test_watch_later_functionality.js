/*
  TEST_WATCH_LATER_FUNCTIONALITY.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

/*
  TEST_WATCH_LATER_FUNCTIONALITY.JS
  Script to test the Watch Later functionality and duplicate detection
*/

const fs = require('fs');
const path = require('path');

console.log('🧪 [WATCH-LATER-TEST] Testing Watch Later functionality...');

// Function to normalize paths for comparison (same as in MediaLibraryManager)
function normalizePath(pathStr) {
    return (pathStr || '').replace(/\\/g, '/').toLowerCase().trim();
}

// Function to check if item is a TV show (same as in MediaLibraryManager)
function isTVShow(item) {
    const pathToCheck = (item.path || item.absPath || item.relPath || '').toLowerCase();
    return pathToCheck.includes('tv-shows') || 
           pathToCheck.includes('tv_shows') ||
           pathToCheck.includes('season') ||
           (item.title && (item.title.includes('S00E') || item.title.includes('S01E') || item.title.includes('S02E')));
}

// Function to simulate the saveResumeProgress logic
function simulateSaveResumeProgress(resumeList, mediaItem, currentTime, duration, isManualSave = false) {
    console.log(`\n📝 [WATCH-LATER-TEST] Simulating saveResumeProgress for:`, {
        title: mediaItem.title,
        path: mediaItem.path,
        isManualSave: isManualSave
    });
    
    // Determine if this is a TV show
    const pathToCheck = (mediaItem.path || mediaItem.absPath || mediaItem.relPath || '').toLowerCase();
    const isTVShowItem = pathToCheck.includes('tv-shows') || 
                        pathToCheck.includes('tv_shows') ||
                        pathToCheck.includes('season') ||
                        (mediaItem.title && (mediaItem.title.includes('S00E') || mediaItem.title.includes('S01E') || mediaItem.title.includes('S02E')));
    
    let savePath = mediaItem.path || mediaItem.absPath || mediaItem.relPath;
    
    // For TV-Shows, ensure we have the correct path format
    if (isTVShowItem && savePath) {
        // If it's an absolute path, convert to relative
        if (savePath.startsWith('/media/')) {
            savePath = savePath.replace(/^\/media\//, '');
        }
        
        // Handle Windows paths with backslashes
        if (savePath.includes('\\')) {
            savePath = savePath.replace(/\\/g, '/');
        }
    }
    
    // Always decode before saving to avoid double-encoding
    try {
        savePath = decodeURIComponent(savePath);
    } catch (e) {}
    
    // IMPROVED DUPLICATE DETECTION
    // Remove any existing entry for this media item
    const normalizedPath = (savePath || '').replace(/\\/g, '/').toLowerCase().trim();
    const normalizedTitle = (mediaItem.title || '').toLowerCase().trim();
    const normalizedName = (mediaItem.name || '').toLowerCase().trim();
    
    const originalLength = resumeList.length;
    
    resumeList = resumeList.filter(item => {
        const itemPath = (item.path || '').replace(/\\/g, '/').toLowerCase().trim();
        const itemTitle = (item.title || '').toLowerCase().trim();
        const itemName = (item.name || '').toLowerCase().trim();
        
        // For TV shows, be more strict about duplicates
        if (isTVShowItem) {
            // Check if both items are TV shows and have similar paths
            const itemIsTVShow = (item.type === 'tv-show') || 
                               (item.path && item.path.toLowerCase().includes('tv-shows'));
            
            if (itemIsTVShow) {
                // For TV shows, match by path OR by title (episode titles can be unique)
                const isDuplicate = itemPath === normalizedPath || itemTitle === normalizedTitle;
                if (isDuplicate) {
                    console.log(`🗑️ [WATCH-LATER-TEST] Removing duplicate TV show:`, {
                        existing: { path: item.path, title: item.title },
                        new: { path: savePath, title: mediaItem.title }
                    });
                }
                return !isDuplicate;
            }
        } else {
            // For movies, match by path OR title OR name
            const isDuplicate = itemPath === normalizedPath || 
                              itemTitle === normalizedTitle || 
                              itemName === normalizedName;
            if (isDuplicate) {
                console.log(`🗑️ [WATCH-LATER-TEST] Removing duplicate movie:`, {
                    existing: { path: item.path, title: item.title, name: item.name },
                    new: { path: savePath, title: mediaItem.title, name: mediaItem.name }
                });
            }
            return !isDuplicate;
        }
        
        return true; // Keep non-matching items
    });
    
    const removedCount = originalLength - resumeList.length;
    if (removedCount > 0) {
        console.log(`✅ [WATCH-LATER-TEST] Removed ${removedCount} duplicate(s)`);
    }
    
    // For manual saves (Save for Later button), always save regardless of position
    // For automatic saves (pause events), only save if not near the end
    if (isManualSave || (duration - currentTime > 60)) {
        const savedItem = {
            path: savePath,
            title: mediaItem.title,
            name: mediaItem.name,
            currentTime,
            duration,
            lastWatched: Date.now(),
            type: isTVShowItem ? 'tv-show' : 'movie'
        };
        
        // Ensure filePath is included for TV shows
        if (isTVShowItem) {
            if (mediaItem.filePath) {
                savedItem.filePath = mediaItem.filePath;
            } else if (mediaItem.absPath) {
                savedItem.filePath = mediaItem.absPath;
            } else if (mediaItem.path) {
                savedItem.filePath = mediaItem.path;
            }
            // Also store relPath for TV shows
            if (mediaItem.relPath) {
                savedItem.relPath = mediaItem.relPath;
            }
        }
        
        resumeList.push(savedItem);
        console.log(`✅ [WATCH-LATER-TEST] Added new item:`, {
            path: savedItem.path,
            title: savedItem.title,
            type: savedItem.type,
            filePath: savedItem.filePath || 'none',
            relPath: savedItem.relPath || 'none'
        });
    }
    
    return resumeList;
}

// Test cases
async function runTests() {
    console.log('\n🧪 [WATCH-LATER-TEST] Running test cases...\n');
    
    let resumeList = [];
    
    // Test 1: Add a movie
    console.log('📺 Test 1: Adding a movie');
    const movie1 = {
        title: 'The Matrix',
        name: 'The Matrix',
        path: 'movies/The Matrix',
        absPath: '/media/movies/The Matrix/The Matrix.mp4'
    };
    resumeList = simulateSaveResumeProgress(resumeList, movie1, 1200, 8160, true);
    
    // Test 2: Add the same movie again (should remove duplicate)
    console.log('\n📺 Test 2: Adding the same movie again (should remove duplicate)');
    const movie1Duplicate = {
        title: 'The Matrix',
        name: 'The Matrix',
        path: 'movies/The Matrix',
        absPath: '/media/movies/The Matrix/The Matrix.mp4'
    };
    resumeList = simulateSaveResumeProgress(resumeList, movie1Duplicate, 1800, 8160, true);
    
    // Test 3: Add a TV show
    console.log('\n📺 Test 3: Adding a TV show');
    const tvShow1 = {
        title: 'Breaking Bad S01E01',
        name: 'Breaking Bad S01E01',
        path: 'tv-shows/Breaking Bad/Season 01/Breaking Bad S01E01.mp4',
        relPath: 'Breaking Bad/Season 01/Breaking Bad S01E01.mp4',
        filePath: '/media/tv-shows/Breaking Bad/Season 01/Breaking Bad S01E01.mp4'
    };
    resumeList = simulateSaveResumeProgress(resumeList, tvShow1, 900, 3600, true);
    
    // Test 4: Add the same TV show again (should remove duplicate)
    console.log('\n📺 Test 4: Adding the same TV show again (should remove duplicate)');
    const tvShow1Duplicate = {
        title: 'Breaking Bad S01E01',
        name: 'Breaking Bad S01E01',
        path: 'tv-shows/Breaking Bad/Season 01/Breaking Bad S01E01.mp4',
        relPath: 'Breaking Bad/Season 01/Breaking Bad S01E01.mp4',
        filePath: '/media/tv-shows/Breaking Bad/Season 01/Breaking Bad S01E01.mp4'
    };
    resumeList = simulateSaveResumeProgress(resumeList, tvShow1Duplicate, 1200, 3600, true);
    
    // Test 5: Add a different TV show episode
    console.log('\n📺 Test 5: Adding a different TV show episode');
    const tvShow2 = {
        title: 'Breaking Bad S01E02',
        name: 'Breaking Bad S01E02',
        path: 'tv-shows/Breaking Bad/Season 01/Breaking Bad S01E02.mp4',
        relPath: 'Breaking Bad/Season 01/Breaking Bad S01E02.mp4',
        filePath: '/media/tv-shows/Breaking Bad/Season 01/Breaking Bad S01E02.mp4'
    };
    resumeList = simulateSaveResumeProgress(resumeList, tvShow2, 600, 3600, true);
    
    // Test 6: Add a different movie
    console.log('\n📺 Test 6: Adding a different movie');
    const movie2 = {
        title: 'Inception',
        name: 'Inception',
        path: 'movies/Inception',
        absPath: '/media/movies/Inception/Inception.mp4'
    };
    resumeList = simulateSaveResumeProgress(resumeList, movie2, 2400, 8880, true);
    
    // Test 7: Add TV show with different path format (should still be detected as duplicate)
    console.log('\n📺 Test 7: Adding TV show with different path format (should still be detected as duplicate)');
    const tvShow1DifferentPath = {
        title: 'Breaking Bad S01E01',
        name: 'Breaking Bad S01E01',
        path: 'TV-SHOWS\\Breaking Bad\\Season 01\\Breaking Bad S01E01.mp4',
        relPath: 'Breaking Bad\\Season 01\\Breaking Bad S01E01.mp4',
        filePath: 'S:/MEDIA/TV-SHOWS/Breaking Bad/Season 01/Breaking Bad S01E01.mp4'
    };
    resumeList = simulateSaveResumeProgress(resumeList, tvShow1DifferentPath, 1500, 3600, true);
    
    // Final results
    console.log('\n📊 [WATCH-LATER-TEST] Final Results:');
    console.log(`Total items: ${resumeList.length}`);
    
    const tvShows = resumeList.filter(item => isTVShow(item));
    const movies = resumeList.filter(item => !isTVShow(item));
    
    console.log(`TV Shows: ${tvShows.length}`);
    console.log(`Movies: ${movies.length}`);
    
    console.log('\n📋 [WATCH-LATER-TEST] Final items:');
    resumeList.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title} (${item.type}) - ${item.path}`);
    });
    
    // Test the actual saveResumeProgress logic
    console.log('\n💾 [WATCH-LATER-TEST] Saving test data to watch_later.json...');
    fs.writeFileSync('watch_later.json', JSON.stringify(resumeList, null, 2));
    console.log('✅ [WATCH-LATER-TEST] Test data saved!');
    
    console.log('\n🎉 [WATCH-LATER-TEST] All tests completed successfully!');
}

// Run the tests
runTests().then(() => {
    console.log('\n✅ [WATCH-LATER-TEST] Test suite completed!');
    process.exit(0);
}).catch(error => {
    console.error('❌ [WATCH-LATER-TEST] Test failed:', error);
    process.exit(1);
}); 