/*
  ANALYZE_CHANGE_IMPACT.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Dependency mapping - what files depend on what
const dependencies = {
    'public/components/MediaLibrary/MediaLibraryManager.js': {
        description: 'Core Media Library functionality',
        affects: [
            'Watch Later functionality',
            'TV Show browsing',
            'Movie browsing',
            'Poster management',
            'Video player integration'
        ],
        critical: true,
        testFiles: [
            '../TEST/test_watch_later_functionality.js',
            '../TEST/test_media_library_loading.js'
        ]
    },
    'public/components/VideoPlayer/VideoPlayer.js': {
        description: 'Video Player component',
        affects: [
            'Video playback',
            'Resume functionality',
            'Progress tracking',
            'Watch Later integration'
        ],
        critical: true,
        testFiles: [
            '../TEST/test_video_player.js'
        ]
    },
    'public/app.js': {
        description: 'Main application file',
        affects: [
            'Overall app functionality',
            'Component initialization',
            'Event handling'
        ],
        critical: true,
        testFiles: []
    },
    'scripts/convert_single_file.js': {
        description: 'Single file conversion script',
        affects: [
            'Audio conversion',
            'File backup system',
            'FFmpeg integration'
        ],
        critical: false,
        testFiles: []
    }
};

function analyzeFileImpact(filePath) {
    console.log(`🔍 [IMPACT] Analyzing impact of changes to: ${filePath}\n`);
    
    const fileInfo = dependencies[filePath];
    
    if (!fileInfo) {
        console.log(`⚠️  [IMPACT] No dependency information found for: ${filePath}`);
        console.log('   This file may not be tracked in the dependency map.');
        return;
    }
    
    console.log(`📋 [IMPACT] File Description: ${fileInfo.description}`);
    console.log(`🚨 [IMPACT] Critical: ${fileInfo.critical ? 'YES' : 'NO'}`);
    
    console.log('\n🎯 [IMPACT] Areas that may be affected:');
    fileInfo.affects.forEach(area => {
        console.log(`   • ${area}`);
    });
    
    if (fileInfo.testFiles.length > 0) {
        console.log('\n🧪 [IMPACT] Recommended tests to run:');
        fileInfo.testFiles.forEach(testFile => {
            const fullPath = path.join(__dirname, testFile);
            if (fs.existsSync(fullPath)) {
                console.log(`   • node ${testFile}`);
            } else {
                console.log(`   • node ${testFile} (test file not found)`);
            }
        });
    }
    
    console.log('\n💡 [IMPACT] Recommendations:');
    if (fileInfo.critical) {
        console.log('   • Run full validation suite before committing');
        console.log('   • Test Watch Later functionality manually');
        console.log('   • Check video player integration');
    } else {
        console.log('   • Run basic validation');
        console.log('   • Test related functionality manually');
    }
    
    console.log('   • Consider creating a backup before making changes');
    console.log('   • Test on a small subset of data first');
}

function analyzeGitChanges() {
    console.log('🔍 [IMPACT] Analyzing recent git changes...\n');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    execAsync('git diff --name-only HEAD~1')
        .then(result => {
            const changedFiles = result.stdout.trim().split('\n').filter(f => f);
            
            if (changedFiles.length === 0) {
                console.log('📝 [IMPACT] No files changed in last commit');
                return;
            }
            
            console.log(`📝 [IMPACT] Files changed in last commit:`);
            changedFiles.forEach(file => {
                console.log(`   • ${file}`);
            });
            
            console.log('\n🔍 [IMPACT] Impact analysis for changed files:');
            changedFiles.forEach(file => {
                if (dependencies[file]) {
                    analyzeFileImpact(file);
                    console.log('');
                }
            });
        })
        .catch(error => {
            console.log('⚠️  [IMPACT] Could not analyze git changes:', error.message);
        });
}

function analyzeStagedChanges() {
    console.log('🔍 [IMPACT] Analyzing staged changes...\n');
    
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    execAsync('git diff --cached --name-only')
        .then(result => {
            const stagedFiles = result.stdout.trim().split('\n').filter(f => f);
            
            if (stagedFiles.length === 0) {
                console.log('📝 [IMPACT] No files staged for commit');
                return;
            }
            
            console.log(`📝 [IMPACT] Files staged for commit:`);
            stagedFiles.forEach(file => {
                console.log(`   • ${file}`);
            });
            
            console.log('\n🔍 [IMPACT] Impact analysis for staged files:');
            stagedFiles.forEach(file => {
                if (dependencies[file]) {
                    analyzeFileImpact(file);
                    console.log('');
                }
            });
        })
        .catch(error => {
            console.log('⚠️  [IMPACT] Could not analyze staged changes:', error.message);
        });
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🚀 [IMPACT] Change Impact Analysis Tool\n');
        console.log('Usage:');
        console.log('  node analyze_change_impact.js <file_path>  - Analyze specific file');
        console.log('  node analyze_change_impact.js --git        - Analyze last commit');
        console.log('  node analyze_change_impact.js --staged     - Analyze staged changes');
        console.log('  node analyze_change_impact.js --all        - Analyze all tracked files\n');
        
        console.log('Examples:');
        console.log('  node analyze_change_impact.js public/components/MediaLibrary/MediaLibraryManager.js');
        console.log('  node analyze_change_impact.js --git');
        return;
    }
    
    if (args[0] === '--git') {
        analyzeGitChanges();
    } else if (args[0] === '--staged') {
        analyzeStagedChanges();
    } else if (args[0] === '--all') {
        console.log('🔍 [IMPACT] Analyzing all tracked files...\n');
        Object.keys(dependencies).forEach(file => {
            analyzeFileImpact(file);
            console.log('');
        });
    } else {
        analyzeFileImpact(args[0]);
    }
}

if (require.main === module) {
    main();
} 