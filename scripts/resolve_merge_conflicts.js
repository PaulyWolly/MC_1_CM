/*
  RESOLVE_MERGE_CONFLICTS.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('[DEBUG - MERGE_CONFLICT_RESOLUTION] Starting merge conflict resolution...');

// Function to resolve merge conflicts in a file
function resolveMergeConflicts(filePath) {
    console.log(`[DEBUG - MERGE_CONFLICT_RESOLUTION] Processing file: ${filePath}`);
    
    try {
        // Read the file content
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Split content into lines
        const lines = content.split('\n');
        const resolvedLines = [];
        let inConflict = false;
        let conflictStart = -1;
        let conflictEnd = -1;
        let conflictsResolved = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for conflict start marker
            if (line.trim() === '<<<<<<< HEAD') {
                inConflict = true;
                conflictStart = i;
                console.log(`[DEBUG - MERGE_CONFLICT_RESOLUTION] Found conflict start at line ${i + 1}`);
                continue;
            }
            
            // Check for conflict separator
            if (line.trim() === '=======' && inConflict) {
                console.log(`[DEBUG - MERGE_CONFLICT_RESOLUTION] Found conflict separator at line ${i + 1}`);
                continue;
            }
            
            // Check for conflict end marker
            if (line.trim().startsWith('>>>>>>> ') && inConflict) {
                inConflict = false;
                conflictEnd = i;
                conflictsResolved++;
                console.log(`[DEBUG - MERGE_CONFLICT_RESOLUTION] Found conflict end at line ${i + 1}, resolving conflict #${conflictsResolved}`);
                
                // For this resolution, we'll keep the HEAD version (lines between conflict start and separator)
                // and skip the incoming version (lines between separator and conflict end)
                let j = conflictStart + 1;
                while (j < i) {
                    if (lines[j].trim() !== '=======') {
                        resolvedLines.push(lines[j]);
                    } else {
                        break; // Stop at separator, skip the incoming version
                    }
                    j++;
                }
                
                conflictStart = -1;
                conflictEnd = -1;
                continue;
            }
            
            // If not in a conflict, add the line normally
            if (!inConflict) {
                resolvedLines.push(line);
            }
        }
        
        // Write the resolved content back to the file
        const resolvedContent = resolvedLines.join('\n');
        fs.writeFileSync(filePath, resolvedContent, 'utf8');
        
        console.log(`[DEBUG - MERGE_CONFLICT_RESOLUTION] Successfully resolved ${conflictsResolved} conflicts in ${filePath}`);
        return conflictsResolved;
        
    } catch (error) {
        console.error(`[DEBUG - MERGE_CONFLICT_RESOLUTION] Error processing ${filePath}:`, error.message);
        return 0;
    }
}

// Main execution
function main() {
    const filesToProcess = [
        'server/data/media-library-tv-shows.json',
        'scripts/audio_codec_report_tv-shows_SINGLE.json'
    ];
    
    let totalConflictsResolved = 0;
    
    filesToProcess.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            const conflictsResolved = resolveMergeConflicts(filePath);
            totalConflictsResolved += conflictsResolved;
        } else {
            console.log(`[DEBUG - MERGE_CONFLICT_RESOLUTION] File not found: ${filePath}`);
        }
    });
    
    console.log(`[DEBUG - MERGE_CONFLICT_RESOLUTION] Total conflicts resolved: ${totalConflictsResolved}`);
    console.log('[DEBUG - MERGE_CONFLICT_RESOLUTION] Merge conflict resolution completed.');
}

// Run the script
main(); 