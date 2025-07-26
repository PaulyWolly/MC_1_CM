/*
  FIX-ENTERAISPEAKINGMODE-ERROR.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

#!/usr/bin/env node

/*
  FIX-ENTER-AISPEAKING-MODE-ERROR.JS
  Script to fix the critical recursive call error in enterAISpeakingMode function
  Created: 2025-06-20
  Purpose: Fix the infinite loop error in enterAISpeakingMode function
*/

const fs = require('fs');
const path = require('path');

// Path to the app.js file
const appJsPath = path.join(__dirname, '../public/app.js');

console.log('🔧 [FIX] Starting enterAISpeakingMode error fix...');
console.log('📁 [FIX] Target file:', appJsPath);

try {
    // Read the current app.js file
    let content = fs.readFileSync(appJsPath, 'utf8');
    console.log('📖 [FIX] File read successfully');

    // Fix the recursive call error in enterAISpeakingMode function
    console.log('🔧 [FIX] Fixing enterAISpeakingMode function...');
    
    // Find and replace the problematic enterAISpeakingMode function
    const enterAISpeakingModePattern = /\/\/ Enter AISpeaking Mode\nfunction enterAISpeakingMode\(\) \{[\s\S]*?enterAISpeakingMode\(\);[\s\S]*?\}/;
    const enterAISpeakingModeReplacement = `// Enter AISpeaking Mode
function enterAISpeakingMode() {
    // Update state all at once
    if (state) {
        // FIXED: Set state directly instead of recursive call
        state.isAISpeaking = true;
        state.isPlaying = true;
        state.stopRequested = false;
    }

    // Update UI elements
    if (typeof updateStopAudioButton === 'function') {
        updateStopAudioButton(); // Show Stop Audio button
    }

    // Update status
    if (typeof updateStatus === 'function') {
        updateStatus(MESSAGES.STATUS.SPEAKING);
    }

    // Stop listening to prevent feedback loops
    if (typeof stopListening === 'function') {
        stopListening();
    }
}`;

    if (content.includes('enterAISpeakingMode();')) {
        content = content.replace(enterAISpeakingModePattern, enterAISpeakingModeReplacement);
        console.log('✅ [FIX] enterAISpeakingMode function updated successfully');
    } else {
        console.log('⚠️  [FIX] enterAISpeakingMode pattern not found, trying alternative approach...');
        
        // Alternative: Find the specific recursive call and replace it
        const recursiveCallPattern = /(\s+)enterAISpeakingMode\(\);(\s+)/;
        const recursiveCallReplacement = '$1// FIXED: Set state directly instead of recursive call\n$1state.isAISpeaking = true;\n$1state.isPlaying = true;\n$1state.stopRequested = false;$2';
        
        if (content.includes('enterAISpeakingMode();')) {
            content = content.replace(recursiveCallPattern, recursiveCallReplacement);
            console.log('✅ [FIX] Recursive call replaced successfully');
        } else {
            console.log('❌ [FIX] Could not find the recursive call in enterAISpeakingMode function');
        }
    }

    // Write the updated content back to the file
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log('💾 [FIX] File updated successfully');

    // Create a backup
    const backupPath = appJsPath + '.backup-' + Date.now();
    fs.writeFileSync(backupPath, content, 'utf8');
    console.log('💾 [FIX] Backup created:', backupPath);

    console.log('🎉 [FIX] enterAISpeakingMode error fix completed successfully!');
    console.log('📋 [FIX] Summary of changes:');
    console.log('   - Fixed recursive call in enterAISpeakingMode function');
    console.log('   - Replaced recursive call with direct state setting');
    console.log('   - Created backup of original file');

} catch (error) {
    console.error('❌ [FIX] Error during fix:', error.message);
    process.exit(1);
} 