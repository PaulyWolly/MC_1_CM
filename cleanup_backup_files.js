const fs = require('fs');
const path = require('path');

console.log('🧹 [CLEANUP] Starting backup file cleanup...');

const dataDir = './public/components/MediaLibrary/data';
const tvShowsDir = path.join(dataDir, 'tv-shows');
const moviesDir = path.join(dataDir, 'movies');

// Function to clean up backup files in a directory
function cleanupBackups(dirPath, maxBackups = 5) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directory not found: ${dirPath}`);
    return;
  }

  console.log(`\n📁 Cleaning up: ${dirPath}`);
  
  const files = fs.readdirSync(dirPath);
  const backupFiles = files.filter(file => 
    file.includes('backup') || 
    file.includes('BACKUP') || 
    file.includes('bkup') ||
    file.includes('BKUP') ||
    file.endsWith('.backup')
  );

  console.log(`   Found ${backupFiles.length} backup files`);

  if (backupFiles.length <= maxBackups) {
    console.log(`   ✅ Only ${backupFiles.length} backups found, keeping all`);
    return;
  }

  // Sort by modification time (newest first)
  const sortedBackups = backupFiles.map(file => ({
    name: file,
    path: path.join(dirPath, file),
    mtime: fs.statSync(path.join(dirPath, file)).mtime
  })).sort((a, b) => b.mtime - a.mtime);

  // Keep the most recent backups
  const toKeep = sortedBackups.slice(0, maxBackups);
  const toDelete = sortedBackups.slice(maxBackups);

  console.log(`   📋 Keeping ${toKeep.length} most recent backups:`);
  toKeep.forEach(backup => {
    console.log(`      ✅ ${backup.name} (${backup.mtime.toISOString()})`);
  });

  console.log(`   🗑️  Deleting ${toDelete.length} old backups:`);
  toDelete.forEach(backup => {
    try {
      fs.unlinkSync(backup.path);
      console.log(`      ❌ Deleted: ${backup.name}`);
    } catch (error) {
      console.log(`      ⚠️  Failed to delete: ${backup.name} - ${error.message}`);
    }
  });
}

// Clean up TV shows directory
cleanupBackups(tvShowsDir, 5);

// Clean up movies directory
cleanupBackups(moviesDir, 5);

// Clean up main data directory
cleanupBackups(dataDir, 3);

console.log('\n🎉 [CLEANUP] Backup cleanup completed!');
console.log('💡 [TIP] Consider adding backup cleanup to your scripts to prevent this in the future.');
