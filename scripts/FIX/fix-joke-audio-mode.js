/*
  FIX-JOKE-AUDIO-MODE.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
  Created by Paul Welby
*/

#!/usr/bin/env node

/*
  FIX-JOKE-AUDIO-MODE.JS
  Script to fix the joke audio mode issue
  Created: 2025-06-20
  Purpose: Fix the issue where the app doesn't switch to "AI is speaking..." mode when playing audio for joke listings
*/

const fs = require('fs');
const path = require('path');

// Path to the app.js file
const appJsPath = path.join(__dirname, '../public/app.js');

console.log('🔧 [FIX] Starting joke audio mode fix...');
console.log('📁 [FIX] Target file:', appJsPath);

try {
    // Read the current app.js file
    let content = fs.readFileSync(appJsPath, 'utf8');
    console.log('📖 [FIX] File read successfully');

    // Fix 1: Update listJokes function to use enterAISpeakingMode()
    console.log('🔧 [FIX] Fixing listJokes function...');
    content = content.replace(
        /state\.isAISpeaking = true;\n            updateStopAudioButton\(\);  \/\/ Show button/,
        'enterAISpeakingMode();'
    );

    // Fix 2: Update deleteJoke function to use enterAISpeakingMode()
    console.log('🔧 [FIX] Fixing deleteJoke function...');
    content = content.replace(
        /state\.isAISpeaking = true;\n            updateStopAudioButton\(\);  \/\/ Show button/,
        'enterAISpeakingMode();'
    );

    // Fix 3: Update updateJoke function to use enterAISpeakingMode()
    console.log('🔧 [FIX] Fixing updateJoke function...');
    content = content.replace(
        /state\.isAISpeaking = true;\n            updateStopAudioButton\(\);  \/\/ Show button/,
        'enterAISpeakingMode();'
    );

    // Write the fixed content back to the file
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log('💾 [FIX] File updated successfully');
    
    // Verify the fixes
    const updatedContent = fs.readFileSync(appJsPath, 'utf8');
    const enterAISpeakingModeCount = (updatedContent.match(/enterAISpeakingMode\(\)/g) || []).length;
    const stateIsAISpeakingCount = (updatedContent.match(/state\.isAISpeaking = true/g) || []).length;
    
    console.log('🔍 [FIX] Verification:');
    console.log('   - enterAISpeakingMode() calls:', enterAISpeakingModeCount);
    console.log('   - state.isAISpeaking = true remaining:', stateIsAISpeakingCount);
    
    console.log('✅ [FIX] SUCCESS: Joke audio mode has been fixed!');
    console.log('🎉 [FIX] The app should now properly switch to "AI is speaking..." mode when playing joke audio.');

} catch (error) {
    console.error('❌ [FIX] Error:', error.message);
    process.exit(1);
} 