/*
  BACKUP_WATCH_LATER.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

console.log('🎬 [BACKUP - WATCH-LATER] Backing up Watch Later data...');

// Watch Later files to backup
const watchLaterFiles = [
    'watch_later.json',
    'watch_later_raw.json'
];

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(__dirname, 'backups', `watch_later_backup_${timestamp}`);

// Create backup directory
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

let backedUpCount = 0;

watchLaterFiles.forEach(file => {
    try {
        if (fs.existsSync(file)) {
            const backupPath = path.join(backupDir, file);
            fs.copyFileSync(file, backupPath);
            console.log(`✅ Backed up ${file} to ${backupPath}`);
            backedUpCount++;
        } else {
            console.log(`⚠️  ${file} not found (nothing to backup)`);
        }
    } catch (error) {
        console.error(`❌ Error backing up ${file}:`, error.message);
    }
});

if (backedUpCount > 0) {
    console.log(`🎬 [BACKUP - WATCH-LATER] Successfully backed up ${backedUpCount} watch later file(s)!`);
    console.log(`📁 Backup location: ${backupDir}`);
    console.log('💡 Your watch later data is now safely preserved.');
    console.log('💡 You can now run clear_watch_later.js for testing if needed.');
} else {
    console.log('⚠️  No watch later files found to backup.');
} 