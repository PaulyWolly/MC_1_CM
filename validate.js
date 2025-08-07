/*
  VALIDATE.JS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: 1/6/2025
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🛡️ [VALIDATE] Running comprehensive validation...');
console.log('='.repeat(60));

// Quick validation checks
const checks = [
    {
        name: 'Movie Posters File',
        path: 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json',
        check: (filePath) => {
            if (!fs.existsSync(filePath)) return 'File missing';
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (Object.keys(data).length === 0) return 'File is empty';
            return null;
        }
    },
    {
        name: 'Movies Data File',
        path: 'public/components/MediaLibrary/data/movies/media-library-movies_normalized.json',
        check: (filePath) => {
            if (!fs.existsSync(filePath)) {
                return 'File missing: media-library-movies_normalized.json does not exist';
            }
            
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Check if data is empty
                if (!data || Object.keys(data).length === 0) {
                    return 'File is completely empty (no data structure)';
                }
                
                // Check if folders property exists
                if (!data.folders) {
                    return 'Missing "folders" property in movies data structure';
                }
                
                // Check if folders array is empty
                if (!Array.isArray(data.folders)) {
                    return 'Movies "folders" property is not an array';
                }
                
                if (data.folders.length === 0) {
                    return `Movies folders array is empty (0 movies found, expected > 0)`;
                }
                
                // Check if folders have proper structure
                const firstMovie = data.folders[0];
                if (!firstMovie) {
                    return 'First movie entry is undefined or null';
                }
                
                if (!firstMovie.path) {
                    return 'Movie entries missing "path" property';
                }
                
                if (!firstMovie.normalizedKey) {
                    return 'Movie entries missing "normalizedKey" property';
                }
                
                return null; // All checks passed
                
            } catch (parseError) {
                return `JSON parsing error: ${parseError.message}`;
            }
        }
    },
    {
        name: 'TV Shows Data File',
        path: 'public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json',
        check: (filePath) => {
            if (!fs.existsSync(filePath)) {
                return 'File missing: media-library-tv-shows_normalized.json does not exist';
            }
            
            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Check if data is empty
                if (!data || Object.keys(data).length === 0) {
                    return 'File is completely empty (no data structure)';
                }
                
                // TV shows use numbered keys structure, not folders array
                const showKeys = Object.keys(data).filter(key => !isNaN(parseInt(key)));
                
                if (showKeys.length === 0) {
                    return 'No TV show entries found (expected numbered keys like "0", "1", etc.)';
                }
                
                // Check if first show has proper structure
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
                
                return null; // All checks passed
                
            } catch (parseError) {
                return `JSON parsing error: ${parseError.message}`;
            }
        }
    },
    {
        name: 'Media Library Manager',
        path: 'public/components/MediaLibrary/MediaLibraryManager.js',
        check: (filePath) => {
            if (!fs.existsSync(filePath)) return 'File missing';
            const code = fs.readFileSync(filePath, 'utf8');
            const requiredMethods = ['getPosterPath', 'getItemsForCurrentTab', 'saveResumeProgress'];
            for (const method of requiredMethods) {
                if (!code.includes(`${method}(`)) return `Missing method: ${method}`;
            }
            return null;
        }
    },
    {
        name: 'Video Player',
        path: 'public/components/VideoPlayer/VideoPlayer.js',
        check: (filePath) => {
            if (!fs.existsSync(filePath)) return 'File missing';
            const code = fs.readFileSync(filePath, 'utf8');
            if (!code.includes('class VideoPlayer')) return 'VideoPlayer class missing';
            return null;
        }
    },
    {
        name: 'Main App',
        path: 'public/app.js',
        check: (filePath) => {
            if (!fs.existsSync(filePath)) return 'File missing';
            const code = fs.readFileSync(filePath, 'utf8');
            if (!code.includes('document.addEventListener')) return 'App initialization missing';
            return null;
        }
    }
];

let passed = 0;
let failed = 0;
const errors = [];

console.log('\n🔍 [VALIDATE] Running checks...\n');

for (const check of checks) {
    try {
        const error = check.check(check.path);
        if (error) {
            console.log(`❌ [VALIDATE] ${check.name}: ${error}`);
            errors.push(`${check.name}: ${error}`);
            failed++;
        } else {
            console.log(`✅ [VALIDATE] ${check.name}: OK`);
            passed++;
        }
    } catch (err) {
        console.log(`💥 [VALIDATE] ${check.name}: ${err.message}`);
        errors.push(`${check.name}: ${err.message}`);
        failed++;
    }
}

console.log('\n' + '='.repeat(60));
console.log('📊 [VALIDATE] VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (errors.length > 0) {
    console.log('\n🚨 [VALIDATE] ERRORS FOUND:');
    errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
    });
    console.log('\n❌ [VALIDATE] VALIDATION FAILED - Fix errors before pushing');
    console.log('💡 [VALIDATE] Run: node scripts/VALIDATE/validate_before_push.js for detailed analysis');
    process.exit(1);
} else {
    console.log('\n✅ [VALIDATE] All validations passed - Safe to push!');
    console.log('🎯 [VALIDATE] Validation completed at:', new Date().toLocaleString());
    console.log('='.repeat(60));
} 