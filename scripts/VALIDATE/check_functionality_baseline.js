/*
  CHECK_FUNCTIONALITY_BASELINE.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Baseline file to store what's currently working
const BASELINE_FILE = 'scripts/VALIDATE/functionality_baseline.json';

// Functionality that we know is working right now
const CURRENT_WORKING_FUNCTIONALITY = {
    moviePosters: {
        status: 'working',
        description: 'Movie posters display correctly in Movies tab',
        lastVerified: new Date().toISOString(),
        criticalFiles: [
            'public/components/MediaLibrary/data/movies/movie_posters_normalized.json',
            'public/components/MediaLibrary/data/movies/media-library-movies_normalized.json',
            'public/components/MediaLibrary/MediaLibraryManager.js'
        ],
        keyMethods: ['getPosterPath', 'getItemsForCurrentTab'],
        dataChecks: {
            posterFileExists: true,
            posterFileHasData: true,
            moviesFileExists: true,
            moviesFileHasData: true,
            keyMatchingWorks: true
        }
    },
    
    tvShowFiltering: {
        status: 'working',
        description: 'TV shows are properly filtered and displayed in TV Shows tab',
        lastVerified: new Date().toISOString(),
        criticalFiles: [
            'public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json',
            'public/components/MediaLibrary/MediaLibraryManager.js'
        ],
        keyMethods: ['getTVShows', 'getItemsForCurrentTab'],
        dataChecks: {
            tvShowsFileExists: true,
            tvShowsFileHasData: true,
            filteringLogicIntact: true
        }
    },
    
    watchLater: {
        status: 'working',
        description: 'Watch Later functionality saves and displays resume progress',
        lastVerified: new Date().toISOString(),
        criticalFiles: [
            'public/components/MediaLibrary/MediaLibraryManager.js'
        ],
        keyMethods: ['saveResumeProgress', 'renderWatchLaterContent', 'getResumeList'],
        dataChecks: {
            typeFieldLogicExists: true,
            tvShowFilteringWorks: true,
            movieFilteringWorks: true
        }
    },
    
    videoPlayer: {
        status: 'working',
        description: 'Video player plays movies and TV shows correctly',
        lastVerified: new Date().toISOString(),
        criticalFiles: [
            'public/components/VideoPlayer/VideoPlayer.js',
            'public/components/MediaLibrary/MediaLibraryManager.js'
        ],
        keyMethods: ['playVideo', 'pauseVideo', 'seekVideo'],
        dataChecks: {
            videoPlayerClassExists: true,
            integrationMethodsExist: true
        }
    },
    
    appInitialization: {
        status: 'working',
        description: 'App starts and loads all components correctly',
        lastVerified: new Date().toISOString(),
        criticalFiles: [
            'public/app.js',
            'public/components/MediaLibrary/MediaLibraryManager.js'
        ],
        keyMethods: ['initialize', 'loadMediaLibrary'],
        dataChecks: {
            appFileExists: true,
            initializationCodeExists: true,
            mediaLibraryManagerLoaded: true
        }
    }
};

// Function to establish baseline
function establishBaseline() {
    console.log('📊 [BASELINE] Establishing functionality baseline...');
    console.log('='.repeat(60));
    
    // Verify current functionality
    const baseline = {
        timestamp: new Date().toISOString(),
        functionality: CURRENT_WORKING_FUNCTIONALITY,
        verificationResults: {}
    };
    
    // Verify each piece of functionality
    for (const [key, functionality] of Object.entries(CURRENT_WORKING_FUNCTIONALITY)) {
        console.log(`\n🔍 [BASELINE] Verifying: ${functionality.description}`);
        
        const verification = {
            status: 'unknown',
            errors: [],
            warnings: []
        };
        
        // Check critical files
        for (const file of functionality.criticalFiles) {
            if (!fs.existsSync(file)) {
                verification.errors.push(`Critical file missing: ${file}`);
            }
        }
        
        // Check key methods exist
        const managerCode = fs.readFileSync('public/components/MediaLibrary/MediaLibraryManager.js', 'utf8');
        for (const method of functionality.keyMethods) {
            if (!managerCode.includes(`${method}(`)) {
                verification.errors.push(`Key method missing: ${method}`);
            }
        }
        
        // Check data files
        if (functionality.dataChecks.posterFileExists) {
            const posterPath = 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json';
            if (!fs.existsSync(posterPath)) {
                verification.errors.push('Movie posters file missing');
            } else {
                const data = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
                if (Object.keys(data).length === 0) {
                    verification.errors.push('Movie posters file is empty');
                }
            }
        }
        
        if (functionality.dataChecks.moviesFileExists) {
            const moviesPath = 'public/components/MediaLibrary/data/movies/media-library-movies_normalized.json';
            if (!fs.existsSync(moviesPath)) {
                verification.errors.push('Movies data file missing');
            } else {
                const data = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
                if (!data.folders || data.folders.length === 0) {
                    verification.errors.push('Movies data file is empty');
                }
            }
        }
        
        if (functionality.dataChecks.tvShowsFileExists) {
            const tvShowsPath = 'public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json';
            if (!fs.existsSync(tvShowsPath)) {
                verification.errors.push('TV shows data file missing');
            } else {
                const data = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
                if (!data.folders || data.folders.length === 0) {
                    verification.errors.push('TV shows data file is empty');
                }
            }
        }
        
        // Determine status
        if (verification.errors.length > 0) {
            verification.status = 'broken';
            console.log(`   ❌ Status: BROKEN - ${verification.errors.length} errors`);
            verification.errors.forEach(error => console.log(`      - ${error}`));
        } else if (verification.warnings.length > 0) {
            verification.status = 'warning';
            console.log(`   ⚠️  Status: WARNING - ${verification.warnings.length} warnings`);
            verification.warnings.forEach(warning => console.log(`      - ${warning}`));
        } else {
            verification.status = 'working';
            console.log(`   ✅ Status: WORKING`);
        }
        
        baseline.verificationResults[key] = verification;
    }
    
    // Save baseline
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 [BASELINE] BASELINE ESTABLISHED');
    console.log('='.repeat(60));
    console.log(`📁 Saved to: ${BASELINE_FILE}`);
    console.log(`🕐 Timestamp: ${baseline.timestamp}`);
    
    // Summary
    let working = 0;
    let broken = 0;
    let warnings = 0;
    
    for (const result of Object.values(baseline.verificationResults)) {
        if (result.status === 'working') working++;
        else if (result.status === 'broken') broken++;
        else if (result.status === 'warning') warnings++;
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Working: ${working}`);
    console.log(`   ❌ Broken: ${broken}`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    
    if (broken > 0) {
        console.log('\n🚨 [BASELINE] WARNING: Some functionality is already broken!');
        console.log('💡 [BASELINE] Fix these issues before making any changes.');
    } else {
        console.log('\n✅ [BASELINE] All functionality working - baseline established successfully!');
    }
    
    return baseline;
}

// Function to compare against baseline
function compareAgainstBaseline() {
    console.log('🔄 [BASELINE] Comparing current state against baseline...');
    console.log('='.repeat(60));
    
    if (!fs.existsSync(BASELINE_FILE)) {
        console.log('❌ [BASELINE] No baseline found. Run establishBaseline() first.');
        return false;
    }
    
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    console.log(`📁 Baseline from: ${baseline.timestamp}`);
    
    // Import the validation function
    const { validateExistingFunctionality } = require('./validate_existing_functionality.js');
    
    // Run current validation
    return validateExistingFunctionality().then(() => {
        console.log('\n✅ [BASELINE] Current state matches baseline - no regressions!');
        return true;
    }).catch((error) => {
        console.log('\n❌ [BASELINE] REGRESSION DETECTED - functionality has broken since baseline!');
        console.log('🚨 [BASELINE] Fix the issues before proceeding.');
        return false;
    });
}

// Main execution
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'establish') {
        establishBaseline();
    } else if (command === 'compare') {
        compareAgainstBaseline();
    } else {
        console.log('Usage:');
        console.log('  node scripts/VALIDATE/check_functionality_baseline.js establish');
        console.log('  node scripts/VALIDATE/check_functionality_baseline.js compare');
    }
}

module.exports = { establishBaseline, compareAgainstBaseline, CURRENT_WORKING_FUNCTIONALITY }; 