/*
  MEDIALIBRARY.ROUTES.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const MEDIA_LIBRARY_PATH = path.join(__dirname, '../data/media-library.json');
const TV_SHOWS_LIBRARY_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
const MOVIES_LIBRARY_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');

// --- Serve video files for playback ---
const MEDIA_ROOTS = [
    'S:/MEDIA/TV-SHOWS', // Windows path for TV shows
    'S:/MEDIA/MOVIES',   // Add your movies path if needed
    // Add more roots if you have them
];

// Serve any file under /media/* from the configured roots
router.get('/media/*', (req, res) => {
    const relPath = req.params[0];
    
    // Handle the case where the path includes 'movies/' or 'tv-shows/' prefix
    let actualRelPath = relPath;
    let mediaRoot = 'S:/MEDIA/MOVIES'; // Default to movies
    
    if (relPath.startsWith('movies/')) {
        actualRelPath = relPath.substring(7); // Remove 'movies/' prefix
        mediaRoot = 'S:/MEDIA/MOVIES';
    } else if (relPath.startsWith('tv-shows/')) {
        actualRelPath = relPath.substring(10); // Remove 'tv-shows/' prefix
        mediaRoot = 'S:/MEDIA/TV-SHOWS';
    }
    
    const absPath = path.join(mediaRoot, actualRelPath);
    
    console.log('[MEDIA ROUTE] Serving file:', {
        originalPath: relPath,
        actualRelPath: actualRelPath,
        mediaRoot: mediaRoot,
        absPath: absPath
    });
    
    if (fs.existsSync(absPath)) {
        return res.sendFile(absPath, err => {
            if (err && !res.headersSent) {
                console.error('[MEDIA ROUTE] Error sending file:', err.message);
                return res.status(500).send('Error sending file: ' + err.message);
            }
        });
    }
    
    console.log('[MEDIA ROUTE] File not found:', absPath);
    return res.status(404).send('File not found');
});

router.get('/media-library', (req, res) => {
    fs.readFile(MEDIA_LIBRARY_PATH, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Failed to read media library', details: err.message });
        }
        try {
            const json = JSON.parse(data);
            return res.json({ success: true, library: json });
        } catch (parseErr) {
            return res.status(500).json({ success: false, error: 'Failed to parse media library', details: parseErr.message });
        }
    });
});

router.get('/media-library-tv-shows', (req, res) => {
    const flat = req.query.flat === '1';
    const tvShowsData = require('../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
    if (flat) {
        // Return a flat array of shows (legacy/compatibility)
        if (tvShowsData && tvShowsData.library && Array.isArray(tvShowsData.library.folders)) {
            return res.json(tvShowsData.library.folders);
        } else if (Array.isArray(tvShowsData.folders)) {
            return res.json(tvShowsData.folders);
        } else {
            return res.status(500).json({ success: false, error: 'Invalid TV shows data format' });
        }
    } else {
        // Default: return the full nested structure
        return res.json(tvShowsData);
    }
});

router.get('/media-library-movies', (req, res) => {
    fs.readFile(MOVIES_LIBRARY_PATH, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Failed to read movies library', details: err.message });
        }
        try {
            const json = JSON.parse(data);
            return res.json({ success: true, library: json });
        } catch (parseErr) {
            return res.status(500).json({ success: false, error: 'Failed to parse movies library', details: parseErr.message });
        }
    });
});

module.exports = router; 