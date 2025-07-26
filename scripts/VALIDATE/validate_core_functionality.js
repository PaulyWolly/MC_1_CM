/*
  VALIDATE_CORE_FUNCTIONALITY.JS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: 1/6/2025
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Core functionality checks
const coreChecks = {
    watchLater: {
        description: 'Watch Later functionality',
        testFile: '../TEST/test_watch_later_functionality.js',
        critical: true
    },
    mediaLibrary: {
        description: 'Media Library loading',
        testFile: '../TEST/test_media_library_loading.js',
        critical: true
    },
    videoPlayer: {
        description: 'Video Player functionality',
        testFile: '../TEST/test_video_player.js',
        critical: true
    }
};

async function runTest(testPath) {
    try {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        
        const result = await execAsync(`node ${testPath}`);
        return { success: true, output: result.stdout };
    } catch (error) {
        return { success: false, output: error.stdout || error.message };
    }
}

async function validateCoreFunctionality() {
    console.log('🔍 [VALIDATE] Starting core functionality validation...\n');
    
    const results = [];
    let criticalFailures = 0;
    
    for (const [name, check] of Object.entries(coreChecks)) {
        console.log(`🧪 [VALIDATE] Testing ${check.description}...`);
        
        const testPath = path.join(__dirname, check.testFile);
        
        if (!fs.existsSync(testPath)) {
            console.log(`⚠️  [VALIDATE] Test file not found: ${testPath}`);
            console.log(`   Skipping ${check.description} test`);
            continue;
        }
        
        const result = await runTest(testPath);
        
        if (result.success) {
            console.log(`✅ [VALIDATE] ${check.description} - PASSED`);
            results.push({ name, passed: true, critical: check.critical });
        } else {
            console.log(`❌ [VALIDATE] ${check.description} - FAILED`);
            console.log(`   Error: ${result.output}`);
            results.push({ name, passed: false, critical: check.critical });
            
            if (check.critical) {
                criticalFailures++;
            }
        }
        
        console.log('');
    }
    
    // Summary
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('='.repeat(60));
    console.log('📊 [VALIDATE] VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Critical failures: ${criticalFailures}`);
    
    if (criticalFailures > 0) {
        console.log('\n❌ [VALIDATE] CRITICAL FAILURES DETECTED!');
        console.log('   Core functionality is broken. Please fix before committing.');
        process.exit(1);
    } else if (failedTests > 0) {
        console.log('\n⚠️  [VALIDATE] NON-CRITICAL FAILURES DETECTED');
        console.log('   Some functionality may be affected, but core features are working.');
        process.exit(0);
    } else {
        console.log('\n🎉 [VALIDATE] ALL TESTS PASSED!');
        console.log('   Core functionality is working correctly.');
        process.exit(0);
    }
}

// Quick syntax check for critical files
function checkCriticalFiles() {
    console.log('🔍 [VALIDATE] Checking critical file syntax...\n');
    
    const criticalFiles = [
        '../public/components/MediaLibrary/MediaLibraryManager.js',
        '../public/components/VideoPlayer/VideoPlayer.js',
        '../public/app.js'
    ];
    
    let syntaxErrors = 0;
    
    criticalFiles.forEach(filePath => {
        const fullPath = path.join(__dirname, filePath);
        
        if (!fs.existsSync(fullPath)) {
            console.log(`⚠️  [VALIDATE] Critical file not found: ${filePath}`);
            return;
        }
        
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Basic syntax check - try to parse as JavaScript
            eval(`(${content})`);
            console.log(`✅ [VALIDATE] ${filePath} - Syntax OK`);
        } catch (error) {
            console.log(`❌ [VALIDATE] ${filePath} - Syntax Error`);
            console.log(`   Error: ${error.message}`);
            syntaxErrors++;
        }
    });
    
    if (syntaxErrors > 0) {
        console.log(`\n❌ [VALIDATE] ${syntaxErrors} syntax errors found in critical files!`);
        process.exit(1);
    }
    
    console.log('\n✅ [VALIDATE] All critical files have valid syntax\n');
}

async function main() {
    console.log('🚀 [VALIDATE] Starting pre-commit validation...\n');
    
    // First check syntax
    checkCriticalFiles();
    
    // Then run functionality tests
    await validateCoreFunctionality();
}

if (require.main === module) {
    main();
} 