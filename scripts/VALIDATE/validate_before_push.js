/*
  VALIDATE_BEFORE_PUSH.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🚀 [VALIDATE] Starting pre-push validation...');
console.log('============================================================');

// Validation functions
function validateMoviePosterLoading() {
    console.log('🔍 [VALIDATE] Testing movie poster loading...');
    
    try {
        const posterPath = 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json';
        if (!fs.existsSync(posterPath)) {
            return 'Movie posters file missing';
        }
        
        const data = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
        if (Object.keys(data).length === 0) {
            return 'Movie posters file is empty';
        }
        
        console.log('✅ [VALIDATE] Movie poster loading validation passed');
        return null;
    } catch (error) {
        return `Movie poster validation error: ${error.message}`;
    }
}

function validateTvShowFiltering() {
    console.log('🔍 [VALIDATE] Testing TV show filtering...');
    
    try {
        const tvShowsPath = 'public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json';
        if (!fs.existsSync(tvShowsPath)) {
            return 'TV shows data file missing';
        }
        
        const data = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
        
        // Check if data is empty
        if (!data || Object.keys(data).length === 0) {
            return 'TV shows data file is completely empty';
        }
        
        // Check for normalized structure with numbered keys
        const showKeys = Object.keys(data).filter(key => !isNaN(parseInt(key)));
        
        if (showKeys.length === 0) {
            return 'No TV show entries found (expected numbered keys like "0", "1", etc.)';
        }
        
        // Check if first show has proper normalized structure
        const firstShowKey = showKeys[0];
        const firstShow = data[firstShowKey];
        
        if (!firstShow) {
            return 'First TV show entry is undefined or null';
        }
        
        if (!firstShow.path) {
            return 'TV show entries missing "path" property';
        }
        
        if (!firstShow.normalizedKey) {
            return 'TV show entries missing "normalizedKey" property';
        }
        
        // Check if show has folders (seasons)
        if (!firstShow.folders) {
            return 'TV show entries missing "folders" property (for seasons)';
        }
        
        if (!Array.isArray(firstShow.folders)) {
            return 'TV show "folders" property is not an array (should contain seasons)';
        }
        
        console.log('✅ [VALIDATE] TV show filtering validation passed');
        return null;
    } catch (error) {
        return `TV shows data format is invalid: ${error.message}`;
    }
}

function validateWatchLaterFunctionality() {
    console.log('🔍 [VALIDATE] Testing Watch Later functionality...');
    
    try {
        const mediaManagerPath = 'public/components/MediaLibrary/MediaLibraryManager.js';
        if (!fs.existsSync(mediaManagerPath)) {
            return 'Media Library Manager file missing';
        }
        
        const code = fs.readFileSync(mediaManagerPath, 'utf8');
        
        // Check for essential Watch Later methods
        const requiredMethods = ['renderWatchLaterContent', 'getItemsForCurrentTab'];
        for (const method of requiredMethods) {
            if (!code.includes(`${method}(`)) {
                return `Missing Watch Later method: ${method}`;
            }
        }
        
        console.log('✅ [VALIDATE] Watch Later functionality validation passed');
        return null;
    } catch (error) {
        return `Watch Later validation error: ${error.message}`;
    }
}

function validateVideoPlayerFunctionality() {
    console.log('🔍 [VALIDATE] Testing video player functionality...');
    
    try {
        const videoPlayerPath = 'public/components/VideoPlayer/VideoPlayer.js';
        if (!fs.existsSync(videoPlayerPath)) {
            return 'Video Player file missing';
        }
        
        const code = fs.readFileSync(videoPlayerPath, 'utf8');
        
        // Check for essential Video Player components
        if (!code.includes('class VideoPlayer')) {
            return 'VideoPlayer class missing';
        }
        
        if (!code.includes('SubtitleButton')) {
            return 'SubtitleButton component missing';
        }
        
        console.log('✅ [VALIDATE] Video player validation passed');
        return null;
    } catch (error) {
        return `Video Player validation error: ${error.message}`;
    }
}

function validateAppInitialization() {
    console.log('🔍 [VALIDATE] Testing app initialization...');
    
    try {
        const appPath = 'public/app.js';
        if (!fs.existsSync(appPath)) {
            return 'Main app file missing';
        }
        
        const code = fs.readFileSync(appPath, 'utf8');
        
        // Check for essential app initialization
        if (!code.includes('document.addEventListener')) {
            return 'App initialization missing';
        }
        
        console.log('✅ [VALIDATE] App initialization validation passed');
        return null;
    } catch (error) {
        return `App initialization validation error: ${error.message}`;
    }
}

// Run all validations
const validations = [
    { name: 'Core Media Library Manager', test: validateMoviePosterLoading },
    { name: 'Core Media Library Manager', test: validateTvShowFiltering },
    { name: 'Core Media Library Manager', test: validateWatchLaterFunctionality },
    { name: 'Video Player Component', test: validateVideoPlayerFunctionality },
    { name: 'Main Application', test: validateAppInitialization }
];

let passed = 0;
let failed = 0;
const errors = [];

for (const validation of validations) {
    try {
        const error = validation.test();
        if (error) {
            console.log(`❌ [VALIDATE] ${validation.name} - ${validation.test.name}: ${error}`);
            errors.push(`${validation.name} - ${validation.test.name}: ${error}`);
            failed++;
        } else {
            passed++;
        }
    } catch (err) {
        console.log(`❌ [VALIDATE] ${validation.name} - ${validation.test.name}: ${err.message}`);
        errors.push(`${validation.name} - ${validation.test.name}: ${err.message}`);
        failed++;
    }
}

console.log('============================================================');
console.log('📊 [VALIDATE] VALIDATION SUMMARY');
console.log('============================================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (errors.length > 0) {
    console.log('\n🚨 [VALIDATE] ERRORS FOUND:');
    errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
    });
    console.log('\n❌ [VALIDATE] PUSH BLOCKED - Fix errors before pushing');
    process.exit(1);
} else {
    console.log('\n✅ [VALIDATE] All validations passed - Safe to push!');
    process.exit(0);
} 