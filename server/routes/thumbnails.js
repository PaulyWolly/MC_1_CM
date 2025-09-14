/*
  THUMBNAILS.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Configuration
const MEDIA_BASE_PATH = 'S:\\MEDIA\\TV-SHOWS';

/**
 * GET /api/thumbnails/*
 * Serves thumbnail files from the media directory
 * 
 * Example: /api/thumbnails/LOST (2004)/Specials/Lost_SE_Episode_thumb.jpg
 * Will serve: S:\MEDIA\TV-SHOWS\LOST (2004)\Specials\Lost_SE_Episode_thumb.jpg
 */
router.get('/api/thumbnails/*', (req, res) => {
    try {
        // Extract the relative path from the URL
        const relativePath = req.params[0]; // This gets everything after /api/thumbnails/
        
        if (!relativePath) {
            return res.status(400).json({ error: 'No thumbnail path provided' });
        }
        
        // Construct the full file system path
        const fullPath = path.join(MEDIA_BASE_PATH, relativePath);
        
        // Security check: ensure the path is within the media directory
        const normalizedFullPath = path.normalize(fullPath);
        if (!normalizedFullPath.startsWith(path.normalize(MEDIA_BASE_PATH))) {
            return res.status(403).json({ error: 'Access denied: Path outside media directory' });
        }
        
        // Check if file exists
        if (!fs.existsSync(normalizedFullPath)) {
            console.log(`[THUMBNAILS] File not found: ${normalizedFullPath}`);
            return res.status(404).json({ error: 'Thumbnail not found' });
        }
        
        // Get file stats
        const stats = fs.statSync(normalizedFullPath);
        
        // Check if it's a file (not a directory)
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }
        
        // Set appropriate headers
        res.set({
            'Content-Type': 'image/jpeg',
            'Content-Length': stats.size,
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'Last-Modified': stats.mtime.toUTCString()
        });
        
        // Stream the file
        const fileStream = fs.createReadStream(normalizedFullPath);
        fileStream.pipe(res);
        
        // Log successful access
        console.log(`[THUMBNAILS] Served: ${relativePath} (${Math.round(stats.size / 1024)}KB)`);
        
    } catch (error) {
        console.error('[THUMBNAILS] Error serving thumbnail:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/thumbnails/health
 * Health check endpoint for the thumbnails service
 */
router.get('/api/thumbnails/health', (req, res) => {
    try {
        // Check if media base path exists
        if (!fs.existsSync(MEDIA_BASE_PATH)) {
            return res.status(503).json({ 
                status: 'unhealthy', 
                error: 'Media base path not accessible',
                path: MEDIA_BASE_PATH
            });
        }
        
        // Check if we can read the directory
        try {
            fs.readdirSync(MEDIA_BASE_PATH);
        } catch (readError) {
            return res.status(503).json({ 
                status: 'unhealthy', 
                error: 'Cannot read media directory',
                details: readError.message
            });
        }
        
        res.json({ 
            status: 'healthy', 
            mediaBasePath: MEDIA_BASE_PATH,
            accessible: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('[THUMBNAILS] Health check error:', error.message);
        res.status(500).json({ 
            status: 'error', 
            error: error.message 
        });
    }
});

module.exports = router;
