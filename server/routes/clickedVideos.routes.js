/*
  CLICKEDVIDEOS.ROUTES.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const ClickedVideo = require('../models/ClickedVideo');

// POST - Save a clicked video
router.post('/', async (req, res) => {
    try {
        const { videoId, title, description, thumbnail, channelTitle, publishedAt, duration, query, userId = 'default-user' } = req.body;
        
        if (!videoId || !title || !query) {
            return res.status(400).json({ message: 'Missing required fields: videoId, title, query' });
        }

        // Use upsert to either create new or increment click count
        const result = await ClickedVideo.findOneAndUpdate(
            { videoId, query, userId },
            {
                $set: {
                    title,
                    description: description || '',
                    thumbnail: thumbnail || '',
                    channelTitle: channelTitle || '',
                    publishedAt: publishedAt || '',
                    duration: duration || '',
                    clickedAt: new Date()
                },
                $inc: { clickCount: 1 }
            },
            { 
                upsert: true, 
                new: true, 
                setDefaultsOnInsert: true 
            }
        );

        console.log(`💾 [CLICKED-VIDEO] Saved video click: ${title} (${videoId}) for query: ${query}`);
        res.status(200).json(result);
        
    } catch (error) {
        console.error('❌ [CLICKED-VIDEO] Error saving clicked video:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET - Get clicked videos for a query
router.get('/query/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const { userId = 'default-user' } = req.query;
        
        const clickedVideos = await ClickedVideo.find({ query, userId })
            .sort({ clickCount: -1, clickedAt: -1 })
            .limit(50);
            
        console.log(`📚 [CLICKED-VIDEO] Found ${clickedVideos.length} clicked videos for query: ${query}`);
        res.json(clickedVideos);
        
    } catch (error) {
        console.error('❌ [CLICKED-VIDEO] Error retrieving clicked videos:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET - Get all clicked videos for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 100 } = req.query;
        
        const clickedVideos = await ClickedVideo.find({ userId })
            .sort({ clickedAt: -1 })
            .limit(parseInt(limit));
            
        console.log(`📚 [CLICKED-VIDEO] Found ${clickedVideos.length} clicked videos for user: ${userId}`);
        res.json(clickedVideos);
        
    } catch (error) {
        console.error('❌ [CLICKED-VIDEO] Error retrieving user clicked videos:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET - Get clicked videos grouped by query
router.get('/grouped/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const groupedVideos = await ClickedVideo.aggregate([
            { $match: { userId } },
            {
                $group: {
                    _id: '$query',
                    videos: {
                        $push: {
                            videoId: '$videoId',
                            title: '$title',
                            thumbnail: '$thumbnail',
                            channelTitle: '$channelTitle',
                            clickCount: '$clickCount',
                            clickedAt: '$clickedAt'
                        }
                    },
                    totalClicks: { $sum: '$clickCount' },
                    lastClicked: { $max: '$clickedAt' }
                }
            },
            { $sort: { lastClicked: -1 } }
        ]);
        
        console.log(`📚 [CLICKED-VIDEO] Found ${groupedVideos.length} queries with clicked videos for user: ${userId}`);
        res.json(groupedVideos);
        
    } catch (error) {
        console.error('❌ [CLICKED-VIDEO] Error retrieving grouped clicked videos:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE - Remove a clicked video
router.delete('/:videoId/:query', async (req, res) => {
    try {
        const { videoId, query } = req.params;
        const { userId = 'default-user' } = req.query;
        
        const result = await ClickedVideo.deleteOne({ videoId, query, userId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Clicked video not found' });
        }
        
        console.log(`🗑️ [CLICKED-VIDEO] Deleted clicked video: ${videoId} for query: ${query}`);
        res.json({ message: 'Clicked video deleted successfully' });
        
    } catch (error) {
        console.error('❌ [CLICKED-VIDEO] Error deleting clicked video:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 