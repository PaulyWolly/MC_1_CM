/*
  RESTORE_BACKUP.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs').promises;
const path = require('path');

// =================================================================
// Configuration
// =================================================================
// List of directories to restore from the backup.
// The 'scripts' directory has been removed to prevent the script
// from overwriting itself and other scripts.
const DIRS_TO_RESTORE = ['public', 'server', 'config'];

// =================================================================
// Helper Functions
// =================================================================

/**
 * Recursively copies a directory and its contents.
 * @param {string} src - The source path to copy from.
 * @param {string} dest - The destination path to copy to.
 */
async function copyRecursive(src, dest) {
    try {
        const stats = await fs.stat(src);
        const isDirectory = stats.isDirectory();

        if (isDirectory) {
            // Ensure the destination directory exists.
            await fs.mkdir(dest, { recursive: true });
            const files = await fs.readdir(src);
            
            // Recursively copy each item in the directory.
            for (const file of files) {
                const srcPath = path.join(src, file);
                const destPath = path.join(dest, file);
                await copyRecursive(srcPath, destPath);
            }
        } else {
            // It's a file, so just copy it, overwriting if it exists.
            await fs.copyFile(src, dest);
        }
    } catch (error) {
        // If a source file/dir doesn't exist, we can just skip it.
        if (error.code === 'ENOENT') {
            console.warn(`[SKIP] Source not found: ${src}`);
        } else {
            // For other errors, we should report them.
            throw error;
        }
    }
}

/**
 * Main function to run the restore process.
 */
async function restoreBackup() {
    console.log('🔵 Starting backup restore process...');

    // --- 1. Get Backup Name from Command Line ---
    const backupName = process.argv[2];
    if (!backupName) {
        console.error('🔴 [ERROR] No backup name provided.');
        console.log('   Usage: node scripts/RESTORE_BACKUP.js <backup_folder_name>');
        process.exit(1);
    }
    console.log(`   > Backup selected: ${backupName}`);

    // --- 2. Define Paths ---
    // The script runs from /scripts, so we go up one level for the root.
    const rootDir = path.join(process.cwd(), 'backups', backupName);

    // --- 3. Validate Backup Directory ---
    try {
        const stats = await fs.stat(rootDir);
        if (!stats.isDirectory()) {
            throw new Error('is not a directory');
        }
    } catch (error) {
        console.error(`🔴 [ERROR] Backup directory not found or invalid: ${rootDir}`);
        process.exit(1);
    }

    // --- 4. Restore Each Directory ---
    console.log('   > Starting file copy...');
    for (const dirName of DIRS_TO_RESTORE) {
        const sourcePath = path.join(rootDir, dirName);
        const destPath = path.join(process.cwd(), dirName);
        
        try {
            console.log(`   - Restoring '${dirName}'...`);
            await copyRecursive(sourcePath, destPath);
        } catch (error) {
            // The copyRecursive function handles ENOENT, so this will catch other errors.
            console.error(`🔴 [ERROR] Failed to restore directory '${dirName}':`, error);
        }
    }

    console.log('✅ Restore complete!');
}

// --- Run the script ---
restoreBackup();
