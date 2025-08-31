/*
  REMOVE_DUPLICATES_FROM_JSON.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

#!/usr/bin/env node

/**
 * Remove Duplicates from JSON Files
 * 
 * Usage:
 *   node scripts/remove_duplicates_from_json.js <folder_path> [key_field]
 * 
 * Examples:
 *   node scripts/remove_duplicates_from_json.js server/data
 *   node scripts/remove_duplicates_from_json.js server/data title
 *   node scripts/remove_duplicates_from_json.js public/data tmdbId
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
    console.error(`${colors.red}ERROR: ${message}${colors.reset}`);
}

function logSuccess(message) {
    console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function logWarning(message) {
    console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

function showUsage() {
    log('Remove Duplicates from JSON Files', 'bright');
    log('');
    log('Usage:', 'cyan');
    log('  node scripts/remove_duplicates_from_json.js <folder_path> [key_field]');
    log('');
    log('Arguments:', 'cyan');
    log('  folder_path  Path to folder containing JSON files to process');
    log('  key_field    Field to use for duplicate detection (default: "title")');
    log('');
    log('Examples:', 'cyan');
    log('  node scripts/remove_duplicates_from_json.js server/data');
    log('  node scripts/remove_duplicates_from_json.js server/data title');
    log('  node scripts/remove_duplicates_from_json.js public/data tmdbId');
    log('  node scripts/remove_duplicates_from_json.js MediaLibrary-LOCAL/data');
    log('');
    log('The script will:', 'yellow');
    log('  • Scan the specified folder for .json files');
    log('  • Create backups before processing');
    log('  • Remove duplicates based on the specified key field');
    log('  • Show a summary of changes made');
    log('');
}

function createBackup(filePath) {
    const backupPath = filePath + '.backup.' + new Date().toISOString().replace(/[:.]/g, '-');
    try {
        fs.copyFileSync(filePath, backupPath);
        logInfo(`Backup created: ${path.basename(backupPath)}`);
        return backupPath;
    } catch (error) {
        logError(`Failed to create backup for ${filePath}: ${error.message}`);
        return null;
    }
}

function removeDuplicates(data, keyField) {
    if (!Array.isArray(data)) {
        logWarning('Data is not an array, attempting to convert...');
        if (typeof data === 'object' && data !== null) {
            // If it's an object, try to find an array property
            const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]));
            if (arrayKeys.length > 0) {
                logInfo(`Found array property: ${arrayKeys[0]}`);
                data = data[arrayKeys[0]];
            } else {
                throw new Error('Data is not an array and no array property found');
            }
        } else {
            throw new Error('Data is not an array');
        }
    }

    const originalCount = data.length;
    const seen = new Set();
    const duplicates = [];
    const unique = [];

    for (const item of data) {
        if (!item || typeof item !== 'object') {
            logWarning('Skipping non-object item');
            continue;
        }

        const key = item[keyField];
        if (key === undefined || key === null || key === '') {
            logWarning(`Skipping item with missing/invalid ${keyField}: ${JSON.stringify(item).substring(0, 100)}...`);
            continue;
        }

        const keyString = String(key).toLowerCase().trim();
        
        if (seen.has(keyString)) {
            duplicates.push(item);
        } else {
            seen.add(keyString);
            unique.push(item);
        }
    }

    return {
        original: data,
        unique: unique,
        duplicates: duplicates,
        originalCount,
        uniqueCount: unique.length,
        duplicateCount: duplicates.length
    };
}

function processJsonFile(filePath, keyField) {
    logInfo(`Processing: ${path.basename(filePath)}`);
    
    try {
        // Read the file
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Create backup
        const backupPath = createBackup(filePath);
        if (!backupPath) {
            return false;
        }
        
        // Remove duplicates
        const result = removeDuplicates(data, keyField);
        
        // Write back the unique data
        fs.writeFileSync(filePath, JSON.stringify(result.unique, null, 2));
        
        // Log results
        if (result.duplicateCount > 0) {
            logSuccess(`Removed ${result.duplicateCount} duplicates from ${path.basename(filePath)}`);
            logInfo(`  Original: ${result.originalCount} items`);
            logInfo(`  After cleanup: ${result.uniqueCount} items`);
            
            // Show some examples of duplicates removed
            if (result.duplicates.length > 0) {
                logInfo('Examples of duplicates removed:');
                result.duplicates.slice(0, 3).forEach((dup, index) => {
                    const key = dup[keyField];
                    logInfo(`  ${index + 1}. ${keyField}: "${key}"`);
                });
                if (result.duplicates.length > 3) {
                    logInfo(`  ... and ${result.duplicates.length - 3} more`);
                }
            }
        } else {
            logSuccess(`No duplicates found in ${path.basename(filePath)}`);
        }
        
        return true;
        
    } catch (error) {
        logError(`Failed to process ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

function findJsonFiles(folderPath) {
    try {
        const files = fs.readdirSync(folderPath);
        return files
            .filter(file => file.endsWith('.json'))
            .map(file => path.join(folderPath, file));
    } catch (error) {
        logError(`Failed to read directory ${folderPath}: ${error.message}`);
        return [];
    }
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        showUsage();
        return;
    }
    
    const folderPath = args[0];
    const keyField = args[1] || 'title';
    
    // Validate folder path
    if (!fs.existsSync(folderPath)) {
        logError(`Folder does not exist: ${folderPath}`);
        return;
    }
    
    if (!fs.statSync(folderPath).isDirectory()) {
        logError(`Path is not a directory: ${folderPath}`);
        return;
    }
    
    log(`Scanning folder: ${folderPath}`, 'bright');
    log(`Using key field: ${keyField}`, 'bright');
    log('');
    
    // Find JSON files
    const jsonFiles = findJsonFiles(folderPath);
    
    if (jsonFiles.length === 0) {
        logWarning(`No JSON files found in ${folderPath}`);
        return;
    }
    
    log(`Found ${jsonFiles.length} JSON file(s):`, 'cyan');
    jsonFiles.forEach(file => {
        log(`  • ${path.basename(file)}`);
    });
    log('');
    
    // Process each file
    let processedCount = 0;
    let successCount = 0;
    
    for (const filePath of jsonFiles) {
        processedCount++;
        log(`[${processedCount}/${jsonFiles.length}]`, 'magenta');
        
        if (processJsonFile(filePath, keyField)) {
            successCount++;
        }
        log('');
    }
    
    // Summary
    log('=== SUMMARY ===', 'bright');
    log(`Processed: ${processedCount} files`);
    log(`Successful: ${successCount} files`);
    log(`Failed: ${processedCount - successCount} files`);
    
    if (successCount > 0) {
        logSuccess('Duplicate removal completed!');
        logInfo('Backup files have been created with .backup timestamp');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    removeDuplicates,
    processJsonFile,
    findJsonFiles
}; 