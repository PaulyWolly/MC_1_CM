/*
  FIX-PLAYNEXTINQUEUE-PLACEMENT.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

/*
  FIX-PLAYNEXTINQUEUE-PLACEMENT.JS
  Script to fix the placement of playNextInQueue() call in listJokes function
  Created: 2025-06-20
  Purpose: Move playNextInQueue() call to the correct location inside the if block
*/

const fs = require('fs');
const path = require('path');

// Path to the app.js file
const appJsPath = path.join(__dirname, '../public/app.js');

console.log('🔧 [FIX] Starting playNextInQueue placement fix...');
console.log('📁 [FIX] Target file:', appJsPath);

try {
    // Read the current app.js file
    let content = fs.readFileSync(appJsPath, 'utf8');
    console.log('📖 [FIX] File read successfully');

    // Fix: Move playNextInQueue() call to the correct location
    console.log('🔧 [FIX] Moving playNextInQueue() call to correct location...');
    
    // Remove the misplaced playNextInQueue() call
    content = content.replace(/\n\s*playNextInQueue\(\);\s*\n\s*}/, '\n                }');
    
    // Add playNextInQueue() call in the correct location after the last queueAudioChunk
    content = content.replace(
        /(await queueAudioChunk\("To hear your joke, ask Tell me my joke about, followed by the joke name"\);\s*\n\s*)/,
        '$1playNextInQueue();\n                '
    );

    // Write the fixed content back to the file
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log('💾 [FIX] File updated successfully');
    
    // Verify the fixes
    const updatedContent = fs.readFileSync(appJsPath, 'utf8');
    const playNextInQueueCount = (updatedContent.match(/playNextInQueue\(\)/g) || []).length;
    
    console.log('🔍 [FIX] Verification:');
    console.log('   - playNextInQueue() calls:', playNextInQueueCount);
    
    console.log('✅ [FIX] SUCCESS: playNextInQueue() call has been properly placed!');
    console.log('🎉 [FIX] The app should now play audio when listing jokes.');

} catch (error) {
    console.error('❌ [FIX] Error:', error.message);
    process.exit(1);
} 