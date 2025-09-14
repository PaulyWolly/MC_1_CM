/*
  LYRICS.ROUTES.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

/**
 * LYRICS ROUTES
 * 
 * Handles secure API calls to lyrics services
 * API keys are stored safely in server/.env
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */

const express = require('express');
const router = express.Router();

/**
 * POST /api/lyrics/lewagon
 * Get lyrics from Le Wagon Lyrics API (FREE)
 */
router.post('/lewagon', async (req, res) => {
    try {
        const { artist, title } = req.body;
        
        if (!artist || !title) {
            return res.status(400).json({
                success: false,
                message: 'Artist and title are required'
            });
        }
        
        console.log('🎵 [LYRICS-API] Fetching from Le Wagon API:', { artist, title });
        
        const searchUrl = `https://lyrics.lewagon.ai/search?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`;
        
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log('⚠️ [LYRICS-API] Le Wagon API failed:', response.status);
            return res.json({
                success: false,
                message: 'Failed to fetch lyrics from Le Wagon API'
            });
        }
        
        const data = await response.json();
        
        if (data && data.lyrics) {
            console.log('✅ [LYRICS-API] Lyrics found from Le Wagon API');
            return res.json({
                success: true,
                lyrics: data.lyrics,
                trackInfo: {
                    title: data.title || title,
                    artist: data.artist || artist
                }
            });
        } else {
            console.log('⚠️ [LYRICS-API] No lyrics found on Le Wagon API');
            return res.json({
                success: false,
                message: 'No lyrics found for this track on Le Wagon API'
            });
        }
        
    } catch (error) {
        console.error('❌ [LYRICS-API] Le Wagon API error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching lyrics from Le Wagon API'
        });
    }
});

/**
 * POST /api/lyrics/ovh
 * Get lyrics from Lyrics.ovh API (FREE - Simple)
 */
router.post('/ovh', async (req, res) => {
    try {
        const { artist, title } = req.body;
        
        if (!artist || !title) {
            return res.status(400).json({
                success: false,
                message: 'Artist and title are required'
            });
        }
        
        console.log('🎵 [LYRICS-API] Fetching from Lyrics.ovh:', { artist, title });
        
        const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.lyrics) {
                console.log('✅ [LYRICS-API] Lyrics found from Lyrics.ovh');
                return res.json({
                    success: true,
                    lyrics: data.lyrics,
                    trackInfo: {
                        title: title,
                        artist: artist
                    }
                });
            }
        } else {
            console.log('⚠️ [LYRICS-API] Lyrics.ovh returned:', response.status);
        }
        
        return res.json({
            success: false,
            message: 'No lyrics found on Lyrics.ovh'
        });
        
    } catch (error) {
        console.error('❌ [LYRICS-API] Lyrics.ovh error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching lyrics from Lyrics.ovh'
        });
    }
});

/**
 * POST /api/lyrics/lyricsapi
 * Get lyrics from The Lyrics API (FREE - Open Source)
 */
router.post('/lyricsapi', async (req, res) => {
    try {
        const { artist, title } = req.body;
        
        if (!artist || !title) {
            return res.status(400).json({
                success: false,
                message: 'Artist and title are required'
            });
        }
        
        console.log('🎵 [LYRICS-API] Fetching from The Lyrics API:', { artist, title });
        
        // The Lyrics API endpoint
        const response = await fetch('https://api.lyrics.ovh/v1/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                artist: artist,
                title: title
            })
        });
        
        if (!response.ok) {
            console.log('⚠️ [LYRICS-API] The Lyrics API failed:', response.status);
            return res.json({
                success: false,
                message: 'Failed to fetch lyrics from The Lyrics API'
            });
        }
        
        const data = await response.json();
        
        if (data && data.lyrics) {
            console.log('✅ [LYRICS-API] Lyrics found from The Lyrics API');
            return res.json({
                success: true,
                lyrics: data.lyrics,
                trackInfo: {
                    title: data.title || title,
                    artist: data.artist || artist
                }
            });
        } else {
            console.log('⚠️ [LYRICS-API] No lyrics found on The Lyrics API');
            return res.json({
                success: false,
                message: 'No lyrics found for this track on The Lyrics API'
            });
        }
        
    } catch (error) {
        console.error('❌ [LYRICS-API] The Lyrics API error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching lyrics from The Lyrics API'
        });
    }
});



module.exports = router;
