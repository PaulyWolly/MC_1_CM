/*
  RESTORE_APP.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

/**
 * RESTORE_APP.js - Backup Restoration Script for MultiChat_Chatty
 * 
 * Lists and restores backups from MongoDB with interactive selection
 * Can restore specific backups by timestamp or list available backups
 * Allows custom restore location specification
 * 
 * Usage: 
 *   node RESTORE_APP.js list                    # List all available backups
 *   node RESTORE_APP.js restore <timestamp>     # Restore specific backup
 *   node RESTORE_APP.js latest                  # Restore latest backup
 *   node RESTORE_APP.js interactive             # Interactive backup selection
 *   node RESTORE_APP.js restore <timestamp> --location <path>  # Custom location
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables
const envPath = path.join(__dirname, '..', 'server', '.env');
dotenv.config({ path: envPath });

// Import Backup model
const Backup = require('../server/models/Backup');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promise wrapper for readline
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

// MongoDB connection function
async function connectToMongoDB() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI not found in environment variables.');
        return false;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        return false;
    }
}

// Function to list all backups with numbering
async function listBackups() {
    try {
        const backups = await Backup.find()
            .sort({ createdAt: -1 })
            .select('timestamp appName version fileCount totalSize createdAt metadata');

        console.log('\n📋 Available Backups:');
        console.log('='.repeat(80));
        
        if (backups.length === 0) {
            console.log('No backups found in MongoDB.');
            return [];
        }

        backups.forEach((backup, index) => {
            const sizeMB = (backup.totalSize / (1024 * 1024)).toFixed(2);
            const date = new Date(backup.createdAt).toLocaleString();
            console.log(`${index + 1}. ${backup.timestamp}`);
            console.log(`   App: ${backup.appName} v${backup.version}`);
            console.log(`   Files: ${backup.fileCount} | Size: ${sizeMB} MB`);
            console.log(`   Created: ${date}`);
            console.log(`   Platform: ${backup.metadata?.platform || 'Unknown'}`);
            console.log('');
        });

        return backups;
    } catch (error) {
        console.error('❌ Error listing backups:', error.message);
        return [];
    }
}

// Interactive backup selection
async function interactiveBackupSelection() {
    try {
        console.log('🔄 Interactive Backup Selection');
        console.log('='.repeat(50));
        
        const backups = await listBackups();
        if (backups.length === 0) {
            console.log('No backups available for selection.');
            return null;
        }

        // Get user selection
        const selection = await question(`\nSelect a backup (1-${backups.length}) or 'q' to quit: `);
        
        if (selection.toLowerCase() === 'q') {
            console.log('Operation cancelled.');
            return null;
        }

        const backupIndex = parseInt(selection) - 1;
        if (isNaN(backupIndex) || backupIndex < 0 || backupIndex >= backups.length) {
            console.log('❌ Invalid selection. Please choose a valid number.');
            return await interactiveBackupSelection();
        }

        const selectedBackup = backups[backupIndex];
        console.log(`\n✅ Selected backup: ${selectedBackup.timestamp}`);

        // Ask for restore location
        const defaultLocation = path.join(__dirname, '..', 'restore', `restore_${selectedBackup.timestamp}`);
        const customLocation = await question(`\nRestore location (press Enter for default: ${defaultLocation}): `);
        
        const restoreLocation = customLocation.trim() || defaultLocation;
        
        return {
            backup: selectedBackup,
            restoreLocation: restoreLocation
        };
    } catch (error) {
        console.error('❌ Error in interactive selection:', error.message);
        return null;
    }
}

// Function to restore a backup
async function restoreBackup(timestamp, customLocation = null) {
    try {
        console.log(`🔄 Restoring backup: ${timestamp}`);
        
        const backup = await Backup.findOne({ timestamp });
        if (!backup) {
            console.error(`❌ Backup with timestamp ${timestamp} not found.`);
            return false;
        }

        console.log(`📦 Backup details:`);
        console.log(`   App: ${backup.appName} v${backup.version}`);
        console.log(`   Files: ${backup.fileCount}`);
        console.log(`   Size: ${(backup.totalSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`   Created: ${new Date(backup.createdAt).toLocaleString()}`);

        // Determine restore location
        let restoreDir;
        if (customLocation) {
            restoreDir = customLocation;
        } else {
            restoreDir = path.join(__dirname, '..', 'restore', `restore_${timestamp}`);
        }

        // Confirm restore location
        console.log(`📁 Restore location: ${restoreDir}`);
        
        if (fs.existsSync(restoreDir)) {
            const overwrite = await question('⚠️  Directory already exists. Overwrite? (y/N): ');
            if (overwrite.toLowerCase() !== 'y') {
                console.log('Restore cancelled.');
                return false;
            }
            // Remove existing directory
            fs.rmSync(restoreDir, { recursive: true, force: true });
        }

        // Create restore directory
        fs.mkdirSync(restoreDir, { recursive: true });

        let restoredCount = 0;
        let failedCount = 0;

        console.log('\n📂 Restoring files...');
        
        // Restore each file
        for (const file of backup.files) {
            try {
                const filePath = path.join(restoreDir, file.path);
                const dirPath = path.dirname(filePath);
                
                // Create directory if it doesn't exist
                fs.mkdirSync(dirPath, { recursive: true });
                
                // Write file content
                fs.writeFileSync(filePath, file.content, 'utf8');
                
                console.log(`✅ ${file.path}`);
                restoredCount++;
            } catch (error) {
                console.error(`❌ Failed to restore ${file.path}:`, error.message);
                failedCount++;
            }
        }

        console.log('\n📊 Restore Summary:');
        console.log(`✅ Successfully restored: ${restoredCount} files`);
        if (failedCount > 0) {
            console.log(`❌ Failed to restore: ${failedCount} files`);
        }
        console.log(`📁 Restore location: ${restoreDir}`);

        return restoredCount > 0;
    } catch (error) {
        console.error('❌ Error restoring backup:', error.message);
        return false;
    }
}

// Function to restore latest backup
async function restoreLatestBackup(customLocation = null) {
    try {
        const latestBackup = await Backup.findOne().sort({ createdAt: -1 });
        if (!latestBackup) {
            console.error('❌ No backups found in MongoDB.');
            return false;
        }

        console.log(`🔄 Restoring latest backup: ${latestBackup.timestamp}`);
        return await restoreBackup(latestBackup.timestamp, customLocation);
    } catch (error) {
        console.error('❌ Error restoring latest backup:', error.message);
        return false;
    }
}

// Main function
async function main() {
    const command = process.argv[2];
    const timestamp = process.argv[3];
    
    // Check for custom location flag
    const locationIndex = process.argv.indexOf('--location');
    let customLocation = null;
    if (locationIndex !== -1 && process.argv[locationIndex + 1]) {
        customLocation = process.argv[locationIndex + 1];
    }

    if (!command) {
        console.log('Usage:');
        console.log('  node RESTORE_APP.js list                                    # List all available backups');
        console.log('  node RESTORE_APP.js restore <timestamp>                     # Restore specific backup');
        console.log('  node RESTORE_APP.js restore <timestamp> --location <path>   # Restore to custom location');
        console.log('  node RESTORE_APP.js latest                                  # Restore latest backup');
        console.log('  node RESTORE_APP.js latest --location <path>                # Restore latest to custom location');
        console.log('  node RESTORE_APP.js interactive                             # Interactive backup selection');
        return;
    }

    const connected = await connectToMongoDB();
    if (!connected) {
        console.error('❌ Cannot proceed without MongoDB connection.');
        process.exit(1);
    }

    try {
        switch (command) {
            case 'list':
                await listBackups();
                break;
            case 'restore':
                if (!timestamp) {
                    console.error('❌ Please provide a timestamp for restore.');
                    console.log('Usage: node RESTORE_APP.js restore <timestamp>');
                    break;
                }
                await restoreBackup(timestamp, customLocation);
                break;
            case 'latest':
                await restoreLatestBackup(customLocation);
                break;
            case 'interactive':
                const selection = await interactiveBackupSelection();
                if (selection) {
                    await restoreBackup(selection.backup.timestamp, selection.restoreLocation);
                }
                break;
            default:
                console.error(`❌ Unknown command: ${command}`);
                console.log('Available commands: list, restore, latest, interactive');
        }
    } finally {
        rl.close();
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { listBackups, restoreBackup, restoreLatestBackup }; 