/*
  BACKUPS.ROUTES.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const Backup = require('../models/Backup');
const { createBackup } = require('../../scripts/BACKUP_APP');
const { listBackups, restoreBackup, restoreLatestBackup } = require('../../scripts/RESTORE_APP');

// Get all backups
router.get('/', async (req, res) => {
    try {
        const backups = await Backup.find()
            .sort({ createdAt: -1 })
            .select('timestamp appName version fileCount totalSize createdAt metadata');

        res.json({
            success: true,
            backups: backups.map(backup => ({
                timestamp: backup.timestamp,
                appName: backup.appName,
                version: backup.version,
                fileCount: backup.fileCount,
                totalSize: backup.totalSize,
                createdAt: backup.createdAt,
                metadata: backup.metadata
            }))
        });
    } catch (error) {
        console.error('Error fetching backups:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get specific backup details
router.get('/:timestamp', async (req, res) => {
    try {
        const { timestamp } = req.params;
        const backup = await Backup.findOne({ timestamp });

        if (!backup) {
            return res.status(404).json({ success: false, error: 'Backup not found' });
        }

        res.json({
            success: true,
            backup: {
                timestamp: backup.timestamp,
                appName: backup.appName,
                version: backup.version,
                fileCount: backup.fileCount,
                totalSize: backup.totalSize,
                createdAt: backup.createdAt,
                directories: backup.directories,
                metadata: backup.metadata,
                files: backup.files.map(file => ({
                    path: file.path,
                    size: file.size,
                    lastModified: file.lastModified
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching backup details:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new backup
router.post('/create', async (req, res) => {
    try {
        console.log('🔄 Creating backup via API...');
        
        const result = await createBackup();
        
        res.json({
            success: result.success,
            timestamp: result.timestamp,
            fileCount: result.successCount,
            backupPath: result.backupPath,
            mongoDBSaved: result.mongoDBSaved,
            message: result.success ? 'Backup created successfully' : 'Backup failed'
        });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Restore latest backup
router.post('/restore/latest', async (req, res) => {
    try {
        console.log('🔄 Restoring latest backup via API...');
        
        const { restoreLocation } = req.body; // Optional custom location
        const success = await restoreLatestBackup(restoreLocation);
        
        res.json({
            success: success,
            message: success ? 'Latest backup restored successfully' : 'Failed to restore latest backup'
        });
    } catch (error) {
        console.error('Error restoring latest backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Restore specific backup
router.post('/restore/:timestamp', async (req, res) => {
    try {
        const { timestamp } = req.params;
        const { restoreLocation } = req.body; // Optional custom location
        
        console.log(`🔄 Restoring backup ${timestamp} via API...`);
        
        const success = await restoreBackup(timestamp, restoreLocation);
        
        res.json({
            success: success,
            timestamp: timestamp,
            message: success ? 'Backup restored successfully' : 'Failed to restore backup'
        });
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete a backup
router.delete('/:timestamp', async (req, res) => {
    try {
        const { timestamp } = req.params;
        
        const backup = await Backup.findOneAndDelete({ timestamp });
        
        if (!backup) {
            return res.status(404).json({ success: false, error: 'Backup not found' });
        }

        res.json({
            success: true,
            message: `Backup ${timestamp} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get backup statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const totalBackups = await Backup.countDocuments();
        const totalSize = await Backup.aggregate([
            { $group: { _id: null, totalSize: { $sum: '$totalSize' } } }
        ]);
        
        const latestBackup = await Backup.findOne().sort({ createdAt: -1 });
        const oldestBackup = await Backup.findOne().sort({ createdAt: 1 });

        res.json({
            success: true,
            stats: {
                totalBackups,
                totalSize: totalSize[0]?.totalSize || 0,
                latestBackup: latestBackup ? {
                    timestamp: latestBackup.timestamp,
                    createdAt: latestBackup.createdAt
                } : null,
                oldestBackup: oldestBackup ? {
                    timestamp: oldestBackup.timestamp,
                    createdAt: oldestBackup.createdAt
                } : null
            }
        });
    } catch (error) {
        console.error('Error fetching backup stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get backup selection data for interactive UI
router.get('/selection/list', async (req, res) => {
    try {
        const backups = await Backup.find()
            .sort({ createdAt: -1 })
            .select('timestamp appName version fileCount totalSize createdAt metadata');

        const selectionData = backups.map((backup, index) => ({
            id: index + 1,
            timestamp: backup.timestamp,
            appName: backup.appName,
            version: backup.version,
            fileCount: backup.fileCount,
            totalSize: backup.totalSize,
            totalSizeMB: (backup.totalSize / (1024 * 1024)).toFixed(2),
            createdAt: backup.createdAt,
            createdDate: new Date(backup.createdAt).toLocaleString(),
            metadata: backup.metadata
        }));

        res.json({
            success: true,
            backups: selectionData,
            totalCount: selectionData.length
        });
    } catch (error) {
        console.error('Error fetching backup selection data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router; 