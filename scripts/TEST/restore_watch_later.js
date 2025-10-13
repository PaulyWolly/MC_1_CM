/*
  RESTORE_WATCH_LATER.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🎬 [RESTORE - WATCH-LATER] Restoring Watch Later data...');

// Get backup directory from command line argument or find latest
const backupDir = process.argv[2] || findLatestBackup();

if (!backupDir || !fs.existsSync(backupDir)) {
    console.error('❌ No valid backup directory found!');
    console.log('💡 Usage: node restore_watch_later.js [backup_directory_path]');
    console.log('💡 Or run without arguments to use the latest backup.');
    process.exit(1);
}

console.log(`📁 Using backup directory: ${backupDir}`);

// Watch Later files to restore
const watchLaterFiles = [
    'watch_later.json',
    'watch_later_raw.json'
];

let restoredCount = 0;

watchLaterFiles.forEach(file => {
    try {
        const backupPath = path.join(backupDir, file);
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, file);
            console.log(`✅ Restored ${file} from backup`);
            restoredCount++;
        } else {
            console.log(`⚠️  ${file} not found in backup (skipping)`);
        }
    } catch (error) {
        console.error(`❌ Error restoring ${file}:`, error.message);
    }
});

if (restoredCount > 0) {
    console.log(`🎬 [RESTORE - WATCH-LATER] Successfully restored ${restoredCount} watch later file(s)!`);
    console.log('💡 Your watch later data has been restored.');
} else {
    console.log('⚠️  No watch later files were restored.');
}

function findLatestBackup() {
    const backupsDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupsDir)) {
        return null;
    }
    
    const backupDirs = fs.readdirSync(backupsDir)
        .filter(dir => dir.startsWith('watch_later_backup_'))
        .map(dir => path.join(backupsDir, dir))
        .filter(dir => fs.statSync(dir).isDirectory())
        .sort()
        .reverse();
    
    return backupDirs.length > 0 ? backupDirs[0] : null;
} 