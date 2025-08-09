/*
  FIX-DUPLICATE-FUNCTION-CODE.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

/*
  FIX-DUPLICATE-FUNCTION-CODE.JS
  Script to fix the duplicate code in enterAISpeakingMode function
  Created: 2025-06-20
  Purpose: Remove duplicate code that's causing the app to break
*/

const fs = require('fs');
const path = require('path');

// Path to the app.js file
const appJsPath = path.join(__dirname, '../public/app.js');

console.log('🔧 [FIX] Starting duplicate function code fix...');
console.log('📁 [FIX] Target file:', appJsPath);

try {
    // Read the current app.js file
    let content = fs.readFileSync(appJsPath, 'utf8');
    console.log('📖 [FIX] File read successfully');

    // Fix the duplicate code in enterAISpeakingMode function
    console.log('🔧 [FIX] Fixing duplicate code in enterAISpeakingMode function...');
    
    // Find and remove the duplicate section
    const duplicatePattern = /    \/\/ Update UI elements\n    if \(typeof updateStopAudioButton === 'function'\) \{\n        updateStopAudioButton\(\); \/\/ Show Stop Audio button\n    \}\n\n    \/\/ Update status\n    if \(typeof updateStatus === 'function'\) \{\n        updateStatus\(MESSAGES\.STATUS\.SPEAKING\);\n    \}\n\n    \/\/ Stop listening to prevent feedback loops\n    if \(typeof stopListening === 'function'\) \{\n        stopListening\(\);\n    \}\n\}/;
    
    if (duplicatePattern.test(content)) {
        content = content.replace(duplicatePattern, '');
        console.log('✅ [FIX] Duplicate code removed successfully');
    } else {
        console.log('⚠️ [FIX] Duplicate pattern not found, checking for alternative pattern...');
        
        // Alternative pattern - look for the specific duplicate lines
        const lines = content.split('\n');
        let inFunction = false;
        let duplicateFound = false;
        let newLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line.includes('function enterAISpeakingMode()')) {
                inFunction = true;
                newLines.push(line);
                continue;
            }
            
            if (inFunction && line.includes('// Update UI elements')) {
                // Check if this is the second occurrence
                const nextLines = lines.slice(i, i + 15).join('\n');
                if (nextLines.includes('updateStopAudioButton') && 
                    nextLines.includes('updateStatus') && 
                    nextLines.includes('stopListening')) {
                    
                    // Skip the duplicate section
                    duplicateFound = true;
                    console.log('✅ [FIX] Found and removing duplicate section at line', i + 1);
                    
                    // Skip until we find the closing brace
                    while (i < lines.length && !lines[i].trim().startsWith('}')) {
                        i++;
                    }
                    if (i < lines.length) {
                        newLines.push(lines[i]); // Add the closing brace
                    }
                    inFunction = false;
                    continue;
                }
            }
            
            newLines.push(line);
        }
        
        if (duplicateFound) {
            content = newLines.join('\n');
            console.log('✅ [FIX] Duplicate section removed using line-by-line method');
        } else {
            console.log('❌ [FIX] Could not find duplicate pattern');
        }
    }

    // Write the fixed content back to the file
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log('💾 [FIX] File updated successfully');
    
    // Verify the fix
    const updatedContent = fs.readFileSync(appJsPath, 'utf8');
    const functionCount = (updatedContent.match(/function enterAISpeakingMode\(\)/g) || []).length;
    console.log('🔍 [FIX] Verification: enterAISpeakingMode function count:', functionCount);
    
    if (functionCount === 1) {
        console.log('✅ [FIX] SUCCESS: Duplicate function code has been removed!');
        console.log('🎉 [FIX] The app should now work correctly.');
    } else {
        console.log('❌ [FIX] ERROR: Function count is not 1, something went wrong');
    }

} catch (error) {
    console.error('❌ [FIX] Error:', error.message);
    process.exit(1);
} 