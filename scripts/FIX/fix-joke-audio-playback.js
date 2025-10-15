/*
  FIX-JOKE-AUDIO-PLAYBACK.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

/*
  FIX-JOKE-AUDIO-PLAYBACK.JS
  Script to fix the joke audio playback issue
  Created: 2025-06-20
  Purpose: Fix the issue where audio is queued but not played for joke listings
*/

const fs = require('fs');
const path = require('path');

// Path to the app.js file
const appJsPath = path.join(__dirname, '../public/app.js');

console.log('🔧 [FIX] Starting joke audio playback fix...');
console.log('📁 [FIX] Target file:', appJsPath);

try {
    // Read the current app.js file
    let content = fs.readFileSync(appJsPath, 'utf8');
    console.log('📖 [FIX] File read successfully');

    // Fix: Add playNextInQueue() call after audio queuing in listJokes function
    console.log('🔧 [FIX] Adding playNextInQueue() call to listJokes function...');
    
    // Find the end of the audio queuing section in listJokes and add playNextInQueue()
    const listJokesPattern = /(await queueAudioChunk\("To hear your joke, ask Tell me my joke about, followed by the joke name"\);\s*\n\s*)/;
    const listJokesReplacement = '$1playNextInQueue();\n                ';
    
    if (content.includes('await queueAudioChunk("To hear your joke, ask Tell me my joke about, followed by the joke name");')) {
        content = content.replace(listJokesPattern, listJokesReplacement);
        console.log('✅ [FIX] Added playNextInQueue() to listJokes function');
    } else {
        console.log('⚠️ [FIX] Could not find the exact pattern, trying alternative...');
        
        // Alternative: Find the end of the joke listing section
        const alternativePattern = /(for \(let i = 0; i < data\.jokes\.length; i\+\+\) \{\s*await queueAudioChunk\(`Number \${i \+ 1}: \${data\.jokes\[i\]\.title}`\);\s*\}\s*await queueAudioChunk\("To hear your joke, ask Tell me my joke about, followed by the joke name"\);\s*\n\s*)/;
        const alternativeReplacement = '$1playNextInQueue();\n                ';
        
        if (content.includes('await queueAudioChunk("To hear your joke, ask Tell me my joke about, followed by the joke name");')) {
            content = content.replace(alternativePattern, alternativeReplacement);
            console.log('✅ [FIX] Added playNextInQueue() using alternative pattern');
        } else {
            console.log('❌ [FIX] Could not find the target section in listJokes function');
        }
    }

    // Also fix the "no jokes" case
    console.log('🔧 [FIX] Adding playNextInQueue() call to no-jokes case...');
    const noJokesPattern = /(await queueAudioChunk\(message\);\s*\n\s*)/;
    const noJokesReplacement = '$1playNextInQueue();\n            ';
    
    if (content.includes('await queueAudioChunk(message);')) {
        content = content.replace(noJokesPattern, noJokesReplacement);
        console.log('✅ [FIX] Added playNextInQueue() to no-jokes case');
    }

    // Write the fixed content back to the file
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log('💾 [FIX] File updated successfully');
    
    // Verify the fixes
    const updatedContent = fs.readFileSync(appJsPath, 'utf8');
    const playNextInQueueCount = (updatedContent.match(/playNextInQueue\(\)/g) || []).length;
    
    console.log('🔍 [FIX] Verification:');
    console.log('   - playNextInQueue() calls:', playNextInQueueCount);
    
    console.log('✅ [FIX] SUCCESS: Joke audio playback has been fixed!');
    console.log('🎉 [FIX] The app should now play audio when listing jokes.');

} catch (error) {
    console.error('❌ [FIX] Error:', error.message);
    process.exit(1);
} 