/*
  VALIDATE_EXISTING_FUNCTIONALITY.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Known working functionality that must NEVER break
const WORKING_FUNCTIONALITY = {
    moviePosters: {
        description: 'Movie posters display correctly',
        critical: true,
        checks: [
            {
                name: 'Movie posters file exists and has data',
                check: () => {
                    const posterPath = 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json';
                    if (!fs.existsSync(posterPath)) {
                        throw new Error('Movie posters file missing');
                    }
                    const data = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
                    if (Object.keys(data).length === 0) {
                        throw new Error('Movie posters file is empty');
                    }
                    return `Found ${Object.keys(data).length} movie posters`;
                }
            },
            {
                name: 'Movies data file exists and has data',
                check: () => {
                    const moviesPath = 'public/components/MediaLibrary/data/movies/media-library-movies_normalized.json';
                    if (!fs.existsSync(moviesPath)) {
                        throw new Error('Movies data file missing');
                    }
                    const data = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
                    if (!data.folders || data.folders.length === 0) {
                        throw new Error('Movies data is empty');
                    }
                    return `Found ${data.folders.length} movies`;
                }
            },
            {
                name: 'Poster key matching works',
                check: () => {
                    const posterPath = 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json';
                    const moviesPath = 'public/components/MediaLibrary/data/movies/media-library-movies_normalized.json';
                    
                    const posters = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
                    const movies = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
                    
                    // Check if sample movies have matching poster keys
                    const sampleMovies = movies.folders.slice(0, 5);
                    let matchedCount = 0;
                    
                    for (const movie of sampleMovies) {
                        if (movie.normalizedKey && posters[movie.normalizedKey]) {
                            matchedCount++;
                        }
                    }
                    
                    if (matchedCount === 0) {
                        throw new Error('No movie poster keys match - poster loading will fail');
                    }
                    
                    return `${matchedCount}/${sampleMovies.length} sample movies have matching poster keys`;
                }
            }
        ]
    },
    
    tvShowFiltering: {
        description: 'TV shows are properly filtered and displayed',
        critical: true,
        checks: [
            {
                name: 'TV shows data file exists and has data',
                check: () => {
                    const tvShowsPath = 'public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json';
                    if (!fs.existsSync(tvShowsPath)) {
                        throw new Error('TV shows data file missing');
                    }
                    const data = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
                    if (!data.folders || data.folders.length === 0) {
                        throw new Error('TV shows data is empty');
                    }
                    return `Found ${data.folders.length} TV shows`;
                }
            },
            {
                name: 'TV show filtering logic is intact',
                check: () => {
                    const managerPath = 'public/components/MediaLibrary/MediaLibraryManager.js';
                    const code = fs.readFileSync(managerPath, 'utf8');
                    
                    // Check for critical TV show filtering methods
                    const requiredMethods = ['getTVShows', 'getItemsForCurrentTab'];
                    for (const method of requiredMethods) {
                        if (!code.includes(`${method}(`)) {
                            throw new Error(`TV show filtering method missing: ${method}`);
                        }
                    }
                    
                    // Check for TV show detection patterns
                    const tvPatterns = ['tv-shows', 'tv_shows', 'season', 'S\\d+E\\d+'];
                    let foundPatterns = 0;
                    for (const pattern of tvPatterns) {
                        if (code.includes(pattern)) {
                            foundPatterns++;
                        }
                    }
                    
                    if (foundPatterns === 0) {
                        throw new Error('TV show detection patterns missing');
                    }
                    
                    return `TV show filtering logic intact (${foundPatterns} patterns found)`;
                }
            }
        ]
    },
    
    watchLater: {
        description: 'Watch Later functionality works correctly',
        critical: true,
        checks: [
            {
                name: 'Watch Later methods exist',
                check: () => {
                    const managerPath = 'public/components/MediaLibrary/MediaLibraryManager.js';
                    const code = fs.readFileSync(managerPath, 'utf8');
                    
                    const requiredMethods = [
                        'saveResumeProgress',
                        'renderWatchLaterContent',
                        'getResumeList'
                    ];
                    
                    for (const method of requiredMethods) {
                        if (!code.includes(`${method}(`)) {
                            throw new Error(`Watch Later method missing: ${method}`);
                        }
                    }
                    
                    return 'All Watch Later methods present';
                }
            },
            {
                name: 'Watch Later type field logic exists',
                check: () => {
                    const managerPath = 'public/components/MediaLibrary/MediaLibraryManager.js';
                    const code = fs.readFileSync(managerPath, 'utf8');
                    
                    // Check for the type field logic we added
                    if (!code.includes("type: isTVShow ? 'tv-show' : 'movie'")) {
                        throw new Error('Watch Later type field logic missing');
                    }
                    
                    if (!code.includes("item.type")) {
                        throw new Error('Watch Later type field checking missing');
                    }
                    
                    return 'Watch Later type field logic intact';
                }
            }
        ]
    },
    
    videoPlayer: {
        description: 'Video player functionality works',
        critical: true,
        checks: [
            {
                name: 'Video player class exists',
                check: () => {
                    const playerPath = 'public/components/VideoPlayer/VideoPlayer.js';
                    if (!fs.existsSync(playerPath)) {
                        throw new Error('Video player file missing');
                    }
                    
                    const code = fs.readFileSync(playerPath, 'utf8');
                    if (!code.includes('class VideoPlayer')) {
                        throw new Error('VideoPlayer class missing');
                    }
                    
                    return 'Video player class exists';
                }
            },
            {
                name: 'Video player integration methods exist',
                check: () => {
                    const managerPath = 'public/components/MediaLibrary/MediaLibraryManager.js';
                    const code = fs.readFileSync(managerPath, 'utf8');
                    
                    if (!code.includes('VideoPlayer')) {
                        throw new Error('Video player integration missing');
                    }
                    
                    return 'Video player integration intact';
                }
            }
        ]
    },
    
    appInitialization: {
        description: 'App starts and initializes correctly',
        critical: true,
        checks: [
            {
                name: 'Main app file exists and initializes',
                check: () => {
                    const appPath = 'public/app.js';
                    if (!fs.existsSync(appPath)) {
                        throw new Error('Main app file missing');
                    }
                    
                    const code = fs.readFileSync(appPath, 'utf8');
                    if (!code.includes('document.addEventListener')) {
                        throw new Error('App initialization missing');
                    }
                    
                    return 'App initialization intact';
                }
            },
            {
                name: 'Media library manager is loaded',
                check: () => {
                    const appPath = 'public/app.js';
                    const code = fs.readFileSync(appPath, 'utf8');
                    
                    if (!code.includes('MediaLibraryManager')) {
                        throw new Error('Media library manager not loaded');
                    }
                    
                    return 'Media library manager loading intact';
                }
            }
        ]
    }
};

// Main validation function
async function validateExistingFunctionality() {
    console.log('🛡️ [VALIDATE] Checking that existing functionality remains intact...');
    console.log('='.repeat(60));
    
    const results = {
        passed: 0,
        failed: 0,
        errors: [],
        warnings: []
    };
    
    // Check each piece of working functionality
    for (const [key, functionality] of Object.entries(WORKING_FUNCTIONALITY)) {
        console.log(`\n📁 [VALIDATE] Checking: ${functionality.description}`);
        
        for (const check of functionality.checks) {
            try {
                const result = check.check();
                console.log(`   ✅ ${check.name}: ${result}`);
                results.passed++;
            } catch (error) {
                const errorMsg = `${functionality.description} - ${check.name}: ${error.message}`;
                console.log(`   ❌ ${check.name}: ${error.message}`);
                
                if (functionality.critical) {
                    results.errors.push(errorMsg);
                    results.failed++;
                } else {
                    results.warnings.push(errorMsg);
                }
            }
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 [VALIDATE] EXISTING FUNCTIONALITY CHECK');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n🚨 [VALIDATE] CRITICAL ERRORS - EXISTING FUNCTIONALITY BROKEN:');
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
        console.log('\n❌ [VALIDATE] DO NOT PUSH - Fix broken functionality first!');
        process.exit(1);
    }
    
    if (results.warnings.length > 0) {
        console.log('\n⚠️  [VALIDATE] WARNINGS - Non-critical issues:');
        results.warnings.forEach((warning, index) => {
            console.log(`   ${index + 1}. ${warning}`);
        });
    }
    
    if (results.failed === 0) {
        console.log('\n✅ [VALIDATE] All existing functionality intact - Safe to proceed!');
        console.log('🎯 [VALIDATE] Validation completed at:', new Date().toLocaleString());
        console.log('='.repeat(60));
    }
}

// Run validation
if (require.main === module) {
    validateExistingFunctionality().catch(error => {
        console.error('💥 [VALIDATE] Validation script failed:', error.message);
        process.exit(1);
    });
}

module.exports = { validateExistingFunctionality, WORKING_FUNCTIONALITY }; 