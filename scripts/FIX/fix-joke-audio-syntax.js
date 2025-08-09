/*
  FIX-JOKE-AUDIO-SYNTAX.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

#!/usr/bin/env node

/*
  FIX-JOKE-AUDIO-SYNTAX.JS
  Script to fix the syntax error in the listJokes function
  Created: 2025-06-20
  Purpose: Correctly place the playNextInQueue() call to resolve the syntax error and enable audio playback.
*/

const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');

console.log('🔧 [FIX] Fixing joke audio syntax...');
console.log('📁 [FIX] Target file:', appJsPath);

try {
    let content = fs.readFileSync(appJsPath, 'utf8');
    console.log('📖 [FIX] File read successfully');

    // Define the incorrect and correct patterns
    const incorrectPattern = `await queueAudioChunk("To hear your joke, ask Tell me my joke about, followed by the joke name");
                playNextInQueue();
                } else {`;
    
    const correctPattern = `await queueAudioChunk("To hear your joke, ask Tell me my joke about, followed by the joke name");
                playNextInQueue();
            } else {`;

    // Replace the incorrect block with the corrected version
    if (content.includes(incorrectPattern)) {
        content = content.replace(incorrectPattern, correctPattern);
        console.log('✅ [FIX] Corrected the placement of playNextInQueue() call.');
    } else {
        console.log('⚠️ [FIX] The specific syntax error was not found, the file might already be correct.');
    }
    
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log('💾 [FIX] File updated successfully.');

} catch (error) {
    console.error('❌ [FIX] An error occurred:', error.message);
    process.exit(1);
} 