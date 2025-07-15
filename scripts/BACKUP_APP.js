/*
  BACKUP_APP.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

/**
 * BACKUP_APP.js - Automated Backup Script for MultiChat_Chatty
 * 
 * Creates timestamped backups of all critical files in mirrored directory structure
 * Automatically cleans up old backups to maintain only the most recent ones
 * 
 * Usage: node BACKUP_APP.js
 * Or:    npm run backup (if added to package.json scripts)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MAX_BACKUPS_PER_FILE = 3; // Keep only the 3 most recent backups of each file

// Get current timestamp in YYYYMMDD_HHMMSS format
function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// Create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 Created directory: ${dirPath}`);
    }
}

// Copy file with error handling
function copyFileWithBackup(source, destination) {
    try {
        if (!fs.existsSync(source)) {
            console.log(`⚠️  Warning: Source file not found: ${source}`);
            return false;
        }
        
        fs.copyFileSync(source, destination);
        const stats = fs.statSync(destination);
        const sizeKB = Math.round(stats.size / 1024);
        console.log(`✅ Backed up: ${source} → ${destination} (${sizeKB}KB)`);
        return true;
    } catch (error) {
        console.error(`❌ Error backing up ${source}:`, error.message);
        return false;
    }
}

// Clean up old backups, keeping only the most recent ones
function cleanupOldBackups(directory, prefix, maxKeep = MAX_BACKUPS_PER_FILE) {
    try {
        if (!fs.existsSync(directory)) return [];

        const backups = fs.readdirSync(directory)
            .filter(file => file.startsWith(prefix))
            .map(file => ({
                name: file,
                path: path.join(directory, file),
                timestamp: file.match(/_(\d{8}_\d{6})/)?.[1] || '00000000_000000'
            }))
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        const toDelete = backups.slice(maxKeep);
        let deletedCount = 0;

        toDelete.forEach(backup => {
            try {
                fs.rmSync(backup.path, { recursive: true, force: true });
                console.log(`🗑️  Cleaned up old backup: ${backup.name}`);
                deletedCount++;
            } catch (error) {
                console.error(`❌ Error deleting ${backup.name}:`, error.message);
            }
        });

        if (deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deletedCount} old backup(s)`);
        }

        return backups.slice(0, maxKeep).map(b => b.name);
    } catch (error) {
        console.error(`❌ Error during cleanup:`, error.message);
        return [];
    }
}

// Function to scan directory recursively
function scanDirectory(dir, baseDir) {
    const files = [];
    const entries = fs.readdirSync(dir);
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = path.relative(baseDir, fullPath);
        
        if (fs.statSync(fullPath).isDirectory()) {
            // Skip node_modules directories
            if (entry === 'node_modules' || entry === 'SANDBOX') continue;
            // Recursively scan subdirectories
            files.push(...scanDirectory(fullPath, baseDir));
        } else {
            // Add file to backup list
            files.push({
                source: relativePath,
                destination: relativePath
            });
        }
    }
    
    return files;
}

function generateBackupTree(backupPath) {
    const tree = [];
    tree.push('Backup Structure:');
    
    function scanDirectory(dir, prefix = '', isLast = true) {
        const entries = fs.readdirSync(dir).sort((a, b) => {
            const aIsDir = fs.statSync(path.join(dir, a)).isDirectory();
            const bIsDir = fs.statSync(path.join(dir, b)).isDirectory();
            if (aIsDir && !bIsDir) return -1;
            if (!aIsDir && bIsDir) return 1;
            return a.localeCompare(b);
        });

        entries.forEach((entry, index) => {
            const fullPath = path.join(dir, entry);
            const isLastEntry = index === entries.length - 1;
            const isDirectory = fs.statSync(fullPath).isDirectory();
            
            const marker = isLastEntry ? '└── ' : '├── ';
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            
            const size = isDirectory ? '' : ` (${(fs.statSync(fullPath).size / 1024).toFixed(2)} KB)`;
            const icon = isDirectory ? '📁' : '📄';
            
            tree.push(`${prefix}${marker}${icon} ${entry}${size}`);
            
            if (isDirectory) {
                scanDirectory(fullPath, newPrefix, isLastEntry);
            }
        });
    }

    scanDirectory(backupPath);
    return tree.join('\n');
}

// Function to create backup
async function createBackup() {
    console.log('📦 Starting backup process...');
    console.log('📦 Retention policy: Keeping 3 most recent backups');

    // Get local time in 24-hour format
    const now = new Date();
    const localTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit'
    }).replace(':', '');
    // Use local date instead of UTC date
    const localDate = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
    const timestamp = `${localDate}T${localTime}`;

    const backupDir = path.join(__dirname, '..', 'backups');
    const backupPath = path.join(backupDir, `backup_${timestamp}`);
    const baseDir = path.join(__dirname, '..');

    // Create backup root directory
    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(backupPath, { recursive: true });

    // Scan directories to find files to backup
    const directoriesToScan = [
        'config',
        'server',
        'public',
        'scripts'
    ];

    let filesToBackup = [];
    for (const dir of directoriesToScan) {
        const dirPath = path.join(baseDir, dir);
        if (fs.existsSync(dirPath)) {
            console.log(`📂 Scanning directory: ${dir}`);
            filesToBackup.push(...scanDirectory(dirPath, baseDir));
        } else {
            console.log(`⚠️ Directory not found: ${dir}`);
        }
    }

    // Always include root and server package.json and lock files
    const explicitFiles = [
        'package.json',
        'package-lock.json',
        'yarn.lock',
        path.join('server', 'package.json'),
        path.join('server', 'package-lock.json'),
        path.join('server', 'yarn.lock')
    ];
    for (const relFile of explicitFiles) {
        const absFile = path.join(baseDir, relFile);
        if (fs.existsSync(absFile)) {
            // Only add if not already in filesToBackup
            if (!filesToBackup.some(f => f.source === relFile)) {
                filesToBackup.push({ source: relFile, destination: relFile });
            }
        }
    }

    let successCount = 0;
    let failCount = 0;

    // Backup each file
    for (const file of filesToBackup) {
        const sourcePath = path.join(baseDir, file.source);
        const destPath = path.join(backupPath, file.destination);
        
        try {
            // Ensure destination directory exists
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            
            // Copy the file
            fs.copyFileSync(sourcePath, destPath);
            const stats = fs.statSync(destPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`✅ Backed up: ${file.source} (${sizeKB} KB)`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to backup ${file.source}:`, error);
            failCount++;
        }
    }

    // Cleanup old backups
    cleanupOldBackups(backupDir);

    // Generate and display backup tree
    const backupTree = generateBackupTree(backupPath);
    console.log('\n' + backupTree);

    // Summary
    console.log('\n📊 Backup Summary:');
    console.log(`✅ Successfully backed up: ${successCount} files`);
    if (failCount > 0) {
        console.log(`❌ Failed to backup: ${failCount} files`);
    }
    console.log(`📁 Backup location: ${backupPath}`);

    return {
        success: failCount === 0,
        timestamp,
        successCount,
        failCount,
        backupPath: backupPath,
        tree: backupTree
    };
}

// Run the backup
if (require.main === module) {
    createBackup();
}

module.exports = { createBackup, getTimestamp }; 