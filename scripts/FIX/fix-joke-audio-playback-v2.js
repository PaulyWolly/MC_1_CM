/*
  FIX-JOKE-AUDIO-PLAYBACK-V2.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

/*
  FIX-JOKE-AUDIO-PLAYBACK-V2.JS
  A more robust script to fix the joke audio playback issue by correctly placing playNextInQueue().
  Created: 2025-06-20
  Purpose: Fix syntax error preventing audio playback for joke listings.
*/

const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');

console.log('🔧 [FIX V2] Starting joke audio playback fix...');
console.log('📁 [FIX V2] Target file:', appJsPath);

try {
    let lines = fs.readFileSync(appJsPath, 'utf8').split('\n');

    // --- Step 1: Find and remove all incorrect placements of playNextInQueue() ---
    let incorrectLineIndex = -1;
    let incorrectLinesRemoved = 0;
    
    // This looks for the specific syntax error: playNextInQueue(); followed by an else on the next line
    for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i].trim();
        const nextLine = lines[i + 1].trim();
        if (currentLine === 'playNextInQueue();' && nextLine.startsWith('} else {')) {
            lines.splice(i, 1); // Remove the incorrect line
            incorrectLinesRemoved++;
            console.log(`✅ [FIX V2] Removed incorrect playNextInQueue() at line ${i + 1}.`);
            i--; // Adjust index after removal
        }
    }
    
    if (incorrectLinesRemoved === 0) {
        console.log('⚠️ [FIX V2] No incorrectly placed playNextInQueue() call was found. Proceeding to ensure correct placement.');
    }

    // --- Step 2: Ensure playNextInQueue() is in the correct places ---

    // Add it for the successful joke listing case
    const jokeListMarker = 'await queueAudioChunk("To hear your joke, ask Tell me my joke about, followed by the joke name");';
    let jokeListMarkerIndex = lines.findIndex(line => line.includes(jokeListMarker));
    
    if (jokeListMarkerIndex !== -1) {
        const indentation = lines[jokeListMarkerIndex].match(/^(\s*)/)[0];
        const lineToAdd = `${indentation}playNextInQueue();`;
        
        // Check if the line already exists to prevent duplicates
        if (lines[jokeListMarkerIndex + 1].trim() !== 'playNextInQueue();') {
            lines.splice(jokeListMarkerIndex + 1, 0, lineToAdd);
            console.log(`✅ [FIX V2] Inserted playNextInQueue() call for joke list at line ${jokeListMarkerIndex + 2}.`);
        } else {
             console.log('✅ [FIX V2] playNextInQueue() call for joke list already exists and is correct.');
        }
    } else {
        console.error('❌ [FIX V2] Could not find the joke list marker to insert the fix.');
    }
    
    // Add it for the "no jokes saved" case
    const noJokesMarker = 'await queueAudioChunk(message);';
    let noJokesElseIndex = lines.findIndex(line => line.trim() === '} else {');
    
    if (noJokesElseIndex !== -1) {
        for (let i = noJokesElseIndex; i < lines.length; i++) {
             if(lines[i].includes(noJokesMarker)) {
                 const indentation = lines[i].match(/^(\s*)/)[0];
                 const lineToAdd = `${indentation}playNextInQueue();`;
                 
                 if (lines[i + 1].trim() !== 'playNextInQueue();') {
                     lines.splice(i + 1, 0, lineToAdd);
                     console.log(`✅ [FIX V2] Inserted playNextInQueue() for "no jokes" case at line ${i + 2}.`);
                 } else {
                     console.log('✅ [FIX V2] playNextInQueue() call for "no jokes" already exists and is correct.');
                 }
                 break;
             }
        }
    } else {
         console.error('❌ [FIX V2] Could not find the "no jokes" marker to insert the fix.');
    }


    // --- Step 3: Write the corrected content back to the file ---
    fs.writeFileSync(appJsPath, lines.join('\n'), 'utf8');
    console.log('💾 [FIX V2] File updated successfully.');
    console.log('🎉 [FIX V2] The joke audio playback issue should now be resolved.');

} catch (error) {
    console.error('❌ [FIX V2] An error occurred:', error.message);
    process.exit(1);
} 