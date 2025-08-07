/*
  VALIDATE_BEFORE_PUSH.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Critical files that must be validated
const CRITICAL_FILES = {
    'public/components/MediaLibrary/MediaLibraryManager.js': {
        description: 'Core Media Library Manager',
        tests: [
            'validate_movie_poster_loading',
            'validate_tv_show_filtering',
            'validate_watch_later_functionality'
        ],
        dependencies: ['movie_posters_normalized.json', 'media-library-movies_normalized.json']
    },
    'public/components/VideoPlayer/VideoPlayer.js': {
        description: 'Video Player Component',
        tests: ['validate_video_playback'],
        dependencies: []
    },
    'public/app.js': {
        description: 'Main Application',
        tests: ['validate_app_initialization'],
        dependencies: []
    }
};

// Test functions
const testFunctions = {
    validate_movie_poster_loading: async () => {
        console.log('🔍 [VALIDATE] Testing movie poster loading...');
        
        // Check if movie posters file exists and has data
        const posterPath = 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json';
        if (!fs.existsSync(posterPath)) {
            throw new Error('Movie posters file missing');
        }
        
        const posters = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
        if (Object.keys(posters).length === 0) {
            throw new Error('Movie posters file is empty');
        }
        
        // Check if movies data exists
        const moviesPath = 'public/components/MediaLibrary/data/movies/media-library-movies_normalized.json';
        if (!fs.existsSync(moviesPath)) {
            throw new Error('Movies data file missing');
        }
        
        const movies = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
        if (!movies.folders || movies.folders.length === 0) {
            throw new Error('Movies data is empty');
        }
        
        // Test key matching
        const sampleMovie = movies.folders[0];
        if (sampleMovie.normalizedKey && !posters[sampleMovie.normalizedKey]) {
            console.warn('⚠️  [VALIDATE] Sample movie key not found in posters:', sampleMovie.normalizedKey);
        }
        
        console.log('✅ [VALIDATE] Movie poster loading validation passed');
        return true;
    },
    
    validate_tv_show_filtering: async () => {
        console.log('🔍 [VALIDATE] Testing TV show filtering...');
        
        // Check if TV shows data exists
        const tvShowsPath = 'public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json';
        if (!fs.existsSync(tvShowsPath)) {
            throw new Error('TV shows data file missing');
        }
        
        const tvShows = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
        // Check if it's an array (current format) or object with folders (old format)
        if (Array.isArray(tvShows)) {
            if (tvShows.length === 0) {
                throw new Error('TV shows data is empty');
            }
        } else if (tvShows.folders) {
            if (tvShows.folders.length === 0) {
                throw new Error('TV shows data is empty');
            }
        } else {
            throw new Error('TV shows data format is invalid');
        }
        
        console.log('✅ [VALIDATE] TV show filtering validation passed');
        return true;
    },
    
    validate_watch_later_functionality: async () => {
        console.log('🔍 [VALIDATE] Testing Watch Later functionality...');
        
        // Check if MediaLibraryManager has required methods
        const managerPath = 'public/components/MediaLibrary/MediaLibraryManager.js';
        const managerCode = fs.readFileSync(managerPath, 'utf8');
        
        const requiredMethods = [
            'saveResumeProgress',
            'renderWatchLaterContent',
            'getItemsForCurrentTab',
            'getPosterPath'
        ];
        
        for (const method of requiredMethods) {
            if (!managerCode.includes(`${method}(`)) {
                throw new Error(`Required method missing: ${method}`);
            }
        }
        
        console.log('✅ [VALIDATE] Watch Later functionality validation passed');
        return true;
    },
    
    validate_video_playback: async () => {
        console.log('🔍 [VALIDATE] Testing video player functionality...');
        
        const playerPath = 'public/components/VideoPlayer/VideoPlayer.js';
        if (!fs.existsSync(playerPath)) {
            throw new Error('Video player file missing');
        }
        
        const playerCode = fs.readFileSync(playerPath, 'utf8');
        if (!playerCode.includes('class VideoPlayer')) {
            throw new Error('Video player class missing');
        }
        
        console.log('✅ [VALIDATE] Video player validation passed');
        return true;
    },
    
    validate_app_initialization: async () => {
        console.log('🔍 [VALIDATE] Testing app initialization...');
        
        const appPath = 'public/app.js';
        if (!fs.existsSync(appPath)) {
            throw new Error('Main app file missing');
        }
        
        const appCode = fs.readFileSync(appPath, 'utf8');
        if (!appCode.includes('document.addEventListener')) {
            throw new Error('App initialization code missing');
        }
        
        console.log('✅ [VALIDATE] App initialization validation passed');
        return true;
    }
};

// Main validation function
async function validateBeforePush() {
    console.log('🚀 [VALIDATE] Starting pre-push validation...');
    console.log('='.repeat(60));
    
    const results = {
        passed: 0,
        failed: 0,
        errors: []
    };
    
    // Validate each critical file
    for (const [filePath, config] of Object.entries(CRITICAL_FILES)) {
        console.log(`\n📁 [VALIDATE] Checking: ${config.description}`);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            const error = `Critical file missing: ${filePath}`;
            console.error(`❌ [VALIDATE] ${error}`);
            results.errors.push(error);
            results.failed++;
            continue;
        }
        
        // Run tests for this file
        for (const testName of config.tests) {
            try {
                await testFunctions[testName]();
                results.passed++;
            } catch (error) {
                const errorMsg = `${config.description} - ${testName}: ${error.message}`;
                console.error(`❌ [VALIDATE] ${errorMsg}`);
                results.errors.push(errorMsg);
                results.failed++;
            }
        }
        
        // Check dependencies
        for (const dep of config.dependencies) {
            const depPath = `public/components/MediaLibrary/data/movies/${dep}`;
            if (!fs.existsSync(depPath)) {
                const error = `Dependency missing: ${dep}`;
                console.error(`❌ [VALIDATE] ${error}`);
                results.errors.push(error);
                results.failed++;
            }
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 [VALIDATE] VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
        console.log('\n🚨 [VALIDATE] ERRORS FOUND:');
        results.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
        console.log('\n❌ [VALIDATE] PUSH BLOCKED - Fix errors before pushing');
        process.exit(1);
    } else {
        console.log('\n✅ [VALIDATE] All validations passed - Safe to push!');
        console.log('🎯 [VALIDATE] Validation completed at:', new Date().toLocaleString());
        console.log('='.repeat(60));
    }
}

// Run validation
if (require.main === module) {
    validateBeforePush().catch(error => {
        console.error('💥 [VALIDATE] Validation script failed:', error.message);
        process.exit(1);
    });
}

module.exports = { validateBeforePush, testFunctions }; 