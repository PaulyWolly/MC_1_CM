/*
  WATCHLATER.ROUTES.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const WatchLater = require('../models/WatchLater');
const fs = require('fs');
const path = require('path');

// =========================
// WATCH LATER API ROUTES
// =========================

// GET - Get all watch later items
router.get('/', async (req, res) => {
    try {
        console.log('[WATCH-LATER-API] Getting all items');
        
        const collection = await WatchLater.getDefaultCollection();
        const items = collection.items;
        
        console.log('[WATCH-LATER-API] Retrieved', items.length, 'items');
        
        res.json({
            timestamp: collection.updatedAt,
            itemCount: items.length,
            items: items
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Get error:', error);
        res.status(500).json({ error: 'Failed to get watch later items' });
    }
});

// GET - Get watch later items by type (movies or tv-shows)
router.get('/type/:mediaType', async (req, res) => {
    try {
        const { mediaType } = req.params;
        
        if (!['movie', 'tvshow', 'tv-show'].includes(mediaType)) {
            return res.status(400).json({ error: 'Invalid media type. Must be "movie", "tvshow", or "tv-show"' });
        }
        
        console.log('[WATCH-LATER-API] Getting items by type:', mediaType);
        
        const items = await WatchLater.getItemsByType(mediaType);
        
        console.log('[WATCH-LATER-API] Retrieved', items.length, mediaType, 'items');
        
        res.json({
            mediaType: mediaType,
            itemCount: items.length,
            items: items
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Get by type error:', error);
        res.status(500).json({ error: 'Failed to get watch later items by type' });
    }
});

// POST - Add item to watch later
router.post('/add', async (req, res) => {
    try {
        const itemData = req.body;
        
        // Validate required fields
        if (!itemData.mediaId || !itemData.mediaType || !itemData.title || !itemData.filePath) {
            return res.status(400).json({ 
                error: 'Missing required fields: mediaId, mediaType, title, filePath' 
            });
        }
        
        if (!['movie', 'tvshow', 'tv-show'].includes(itemData.mediaType)) {
            return res.status(400).json({ 
                error: 'Invalid mediaType. Must be "movie", "tvshow", or "tv-show"' 
            });
        }
        
        console.log('[WATCH-LATER-API] Adding item:', itemData.title, '(', itemData.mediaType, ')');
        
        const collection = await WatchLater.addItem(itemData);
        
        console.log('[WATCH-LATER-API] Item added successfully. Total items:', collection.itemCount);
        
        res.json({
            success: true,
            message: 'Item added to watch later',
            itemCount: collection.itemCount,
            item: itemData
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Add error:', error);
        res.status(500).json({ error: 'Failed to add item to watch later' });
    }
});

// PUT - Update entire item by ID
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        if (!id) {
            return res.status(400).json({ error: 'Item ID is required' });
        }
        
        console.log('[WATCH-LATER-API] Updating item:', id);
        
        const collection = await WatchLater.getDefaultCollection();
        const itemIndex = collection.items.findIndex(item => item._id && item._id.toString() === id);
        
        if (itemIndex === -1) {
            return res.status(404).json({ error: 'Item not found in watch later' });
        }
        
        // Update the item with new data, preserving _id and timestamps
        const existingItem = collection.items[itemIndex];
        const updatedItem = {
            ...existingItem,
            ...updateData,
            _id: existingItem._id, // Preserve original ID
            createdAt: existingItem.createdAt, // Preserve creation timestamp
            lastUpdated: new Date() // Update the lastUpdated timestamp
        };
        
        collection.items[itemIndex] = updatedItem;
        await collection.save();
        
        console.log('[WATCH-LATER-API] Item updated successfully:', updatedItem.title);
        
        res.json({
            success: true,
            message: 'Item updated successfully',
            item: updatedItem
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Update item error:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// PUT - Update item progress
router.put('/update-progress', async (req, res) => {
    try {
        const { mediaId, mediaType, currentTime, duration } = req.body;
        
        if (!mediaId || !mediaType || currentTime === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields: mediaId, mediaType, currentTime' 
            });
        }
        
        console.log('[WATCH-LATER-API] Updating progress for:', mediaId, 'at', currentTime);
        
        const collection = await WatchLater.getDefaultCollection();
        const item = collection.items.find(item => 
            item.mediaId === mediaId && item.mediaType === mediaType
        );
        
        if (!item) {
            return res.status(404).json({ error: 'Item not found in watch later' });
        }
        
        await item.updateProgress(currentTime, duration || item.duration);
        
        console.log('[WATCH-LATER-API] Progress updated successfully');
        
        res.json({
            success: true,
            message: 'Progress updated',
            currentTime: item.currentTime,
            duration: item.duration
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Update progress error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// DELETE - Remove item from watch later
router.delete('/remove', async (req, res) => {
    try {
        // Support both body and query parameters
        const mediaId = req.body.mediaId || req.query.mediaId;
        const mediaType = req.body.mediaType || req.query.mediaType;
        
        if (!mediaId || !mediaType) {
            return res.status(400).json({ 
                error: 'Missing required fields: mediaId, mediaType' 
            });
        }
        
        console.log('[WATCH-LATER-API] Removing item:', mediaId, '(', mediaType, ')');
        
        const collection = await WatchLater.removeItem(mediaId, mediaType);
        
        console.log('[WATCH-LATER-API] Item removed successfully. Total items:', collection.itemCount);
        
        res.json({
            success: true,
            message: 'Item removed from watch later',
            itemCount: collection.itemCount
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Remove error:', error);
        res.status(500).json({ error: 'Failed to remove item from watch later' });
    }
});

// DELETE - Clear all watch later items
router.delete('/clear', async (req, res) => {
    try {
        console.log('[WATCH-LATER-API] Clearing all watch later items');
        
        const collection = await WatchLater.getDefaultCollection();
        collection.items = [];
        await collection.save();
        
        console.log('[WATCH-LATER-API] All items cleared successfully');
        
        res.json({
            success: true,
            message: 'All watch later items cleared',
            itemCount: 0
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Clear error:', error);
        res.status(500).json({ error: 'Failed to clear watch later items' });
    }
});

// GET - Get watch later collection info
router.get('/info', async (req, res) => {
    try {
        console.log('[WATCH-LATER-API] Getting collection info');
        
        const collection = await WatchLater.getDefaultCollection();
        
        const movieCount = collection.items.filter(item => item.mediaType === 'movie').length;
        const tvShowCount = collection.items.filter(item => item.mediaType === 'tvshow' || item.mediaType === 'tv-show').length;
        
        console.log('[WATCH-LATER-API] Collection info retrieved');
        
        res.json({
            timestamp: collection.updatedAt,
            itemCount: collection.itemCount,
            movieCount: movieCount,
            tvShowCount: tvShowCount,
            createdAt: collection.createdAt,
            lastUpdated: collection.updatedAt
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Info error:', error);
        res.status(500).json({ error: 'Failed to get collection info' });
    }
});

// POST - Bulk import items (for migration)
router.post('/bulk-import', async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Items must be an array' });
        }
        
        console.log('[WATCH-LATER-API] Bulk importing', items.length, 'items');
        
        const collection = await WatchLater.getDefaultCollection();
        
        // Add each item
        for (const itemData of items) {
            if (itemData.mediaId && itemData.mediaType && itemData.title && itemData.filePath) {
                const existingItem = collection.items.find(item => 
                    item.mediaId === itemData.mediaId && item.mediaType === itemData.mediaType
                );
                
                if (existingItem) {
                    // Update existing item
                    Object.assign(existingItem, itemData);
                    existingItem.lastUpdated = new Date();
                } else {
                    // Add new item
                    collection.items.push(itemData);
                }
            }
        }
        
        await collection.save();
        
        console.log('[WATCH-LATER-API] Bulk import completed. Total items:', collection.itemCount);
        
        res.json({
            success: true,
            message: 'Bulk import completed',
            importedCount: items.length,
            totalItems: collection.itemCount
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Bulk import error:', error);
        res.status(500).json({ error: 'Failed to bulk import items' });
    }
});

// GET - Get backup data from file
router.get('/backup', async (req, res) => {
    try {
        console.log('[WATCH-LATER-API] Getting backup data from file');
        
        const backupPath = path.join(__dirname, '../WATCH_LATER/current_watch_later.json');
        
        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'Backup file not found' });
        }
        
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
        console.log('[WATCH-LATER-API] Retrieved backup with', backupData.itemCount || 0, 'items');
        
        res.json(backupData);
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Backup error:', error);
        res.status(500).json({ error: 'Failed to get backup data' });
    }
});

module.exports = router; 