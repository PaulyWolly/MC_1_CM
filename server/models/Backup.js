/*
  BACKUP.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const BackupFileSchema = new mongoose.Schema({
    path: { type: String, required: true },
    content: { type: String, required: true },
    size: { type: Number, required: true },
    lastModified: { type: Date, default: Date.now }
});

const BackupSchema = new mongoose.Schema({
    timestamp: { type: String, required: true, unique: true },
    localPath: { type: String, required: true },
    appName: { type: String, default: 'MultiChat_Chatty' },
    version: { type: String, default: 'DEV1a' },
    notes: { type: String, required: true },
    files: [BackupFileSchema],
    fileCount: { type: Number, required: true },
    totalSize: { type: Number, required: true },
    directories: [String],
    createdAt: { type: Date, default: Date.now },
    metadata: {
        nodeVersion: String,
        platform: String,
        arch: String,
        backupScript: String
    }
}, {
    collection: 'backups',
    timestamps: true
});

// Index for efficient querying
BackupSchema.index({ timestamp: -1 });
BackupSchema.index({ createdAt: -1 });
BackupSchema.index({ appName: 1, timestamp: -1 });

module.exports = mongoose.model('Backup', BackupSchema); 