/*
  MEDIALIBRARY.ROUTES.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const MEDIA_LIBRARY_PATH = path.join(__dirname, '../data/media-library.json');
const TV_SHOWS_LIBRARY_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows.json');
const MOVIES_LIBRARY_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies.json');

// --- Serve video files for playback ---
const MEDIA_ROOTS = [
    'S:/MEDIA/TV-SHOWS', // Windows path for TV shows
    'S:/MEDIA/MOVIES',   // Add your movies path if needed
    // Add more roots if you have them
];

// Serve any file under /media/* from the configured roots
router.get('/media/*', (req, res) => {
    const relPath = req.params[0];
    for (const root of MEDIA_ROOTS) {
        const absPath = path.join(root, relPath);
        if (fs.existsSync(absPath)) {
            return res.sendFile(absPath, err => {
                if (err && !res.headersSent) {
                    return res.status(500).send('Error sending file: ' + err.message);
                }
            });
        }
    }
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
    const tvShowsData = require('../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows.json');
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