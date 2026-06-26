/*
  WATCHLATER.ROUTES.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
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

// Path to the watch later JSON file
const WATCH_LATER_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/watch-later/watch-later-unified.json');

// Helper: Read watch later data from JSON file
function readWatchLaterJSON() {
    try {
        if (!fs.existsSync(WATCH_LATER_JSON)) {
            console.log('[WATCH-LATER] JSON file does not exist, creating empty array');
            return [];
        }
        const data = fs.readFileSync(WATCH_LATER_JSON, 'utf8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('[WATCH-LATER] Error reading JSON:', error);
        return [];
    }
}

// Helper: Write watch later data to JSON file
function writeWatchLaterJSON(data) {
    try {
        // Ensure directory exists
        const dir = path.dirname(WATCH_LATER_JSON);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Only write if we have data
        if (!Array.isArray(data)) {
            console.error('[WATCH-LATER] ⚠️ Data is not an array, refusing to write:', typeof data);
            return false;
        }
        
        fs.writeFileSync(WATCH_LATER_JSON, JSON.stringify(data, null, 2), 'utf8');
        console.log('[WATCH-LATER] ✅ Wrote', data.length, 'items to JSON file');
        return true;
    } catch (error) {
        console.error('[WATCH-LATER] Error writing JSON:', error);
        return false;
    }
}

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
        
        // Validate required fields - be flexible with path fields
        if (!itemData.mediaType || !itemData.title || (!itemData.filePath && !itemData.path && !itemData.absPath)) {
            return res.status(400).json({ 
                error: 'Missing required fields: mediaType, title, and a path (filePath, path, or absPath)' 
            });
        }
        
        // RULE: Get ALL data from unified data - NO GENERATION, NO FALLBACKS!
        // The unified data object has ALL the data any process would need
        
        console.log('[WATCH-LATER-API] Adding item:', itemData.title, '(', itemData.mediaType, ')');
        console.log('[WATCH-LATER-API] Debug - itemData keys:', Object.keys(itemData));
        console.log('[WATCH-LATER-API] Debug - has seasons:', !!itemData.seasons);
        console.log('[WATCH-LATER-API] Debug - path:', itemData.path);
        console.log('[WATCH-LATER-API] Debug - generated mediaId:', itemData.mediaId);
        
        // SIMPLE APPROACH: Read array, add item, write array
        const items = readWatchLaterJSON();
        
        // Get ALL data from unified data - NO FALLBACKS!
        try {
            // Load unified data
            const unifiedDataPath = path.join(__dirname, '../../public/data');
            let unifiedData = {};
            
        if (itemData.mediaType === 'tvshow') {
                const tvShowsPath = path.join(unifiedDataPath, 'tv-shows-unified.json');
                if (fs.existsSync(tvShowsPath)) {
                    const tvShowsData = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
                    unifiedData = tvShowsData;
                }
            } else if (itemData.mediaType === 'movie') {
                const moviesPath = path.join(unifiedDataPath, 'movies-unified.json');
                if (fs.existsSync(moviesPath)) {
                    const moviesData = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
                    unifiedData = moviesData;
                }
            }
            
            // Find the item in unified data by path
            const currentPath = itemData.path || itemData.filePath || itemData.relPath || itemData.absPath;
            if (currentPath && unifiedData) {
                for (const [key, unifiedItem] of Object.entries(unifiedData)) {
                    if (unifiedItem.path === currentPath || unifiedItem.absPath === currentPath) {
                        // For TV shows: Extract only the specific episode, not the entire show
                        if (itemData.mediaType === 'tvshow' && unifiedItem.seasons) {
                            // Find the specific episode in the seasons data
                            const season = itemData.season || 1;
                            const episode = itemData.episode || 1;
                            
                            let specificEpisode = null;
                            if (unifiedItem.seasons[season] && unifiedItem.seasons[season].episodes && unifiedItem.seasons[season].episodes[episode]) {
                                specificEpisode = unifiedItem.seasons[season].episodes[episode];
                            }
                            
                            // Create episode-specific data - ALL fields from unified data
                            itemData = {
                                TMDBTitle: unifiedItem.TMDBTitle,
                                type: 'tvshow',
                                isMovie: false,
                                normalizedKey: key,
                                title: specificEpisode ? specificEpisode.title : `${unifiedItem.title} | S${season}E${episode} | Episode`,
                                mediaType: 'tvshow',
                                tmdbId: unifiedItem.tmdbId,
                                poster: unifiedItem.poster,
                                description: unifiedItem.description,
                                about: unifiedItem.about,
                                genres: unifiedItem.genres || [],
                                cast: unifiedItem.cast || [],
                                year: unifiedItem.year,
                                path: specificEpisode ? specificEpisode.path : currentPath,
                                absPath: unifiedItem.absPath,
                                filePath: specificEpisode ? specificEpisode.path : currentPath, // MongoDB compatibility
                                mediaId: key, // Use normalizedKey as mediaId for MongoDB
                                backdrop: null, // Don't store backdrop for specific episodes
                                seasons: null, // Don't store all seasons - just the specific episode
                                season: season,
                                episode: episode,
                                episodeTitle: specificEpisode ? specificEpisode.title.split(' | ').pop() : 'Episode',
                                currentTime: itemData.currentTime || 0,
                                duration: specificEpisode ? specificEpisode.duration : itemData.duration,
                                quality: itemData.quality || null,
                                lastWatched: itemData.lastWatched || null,
                                _id: itemData._id || null,
                                addedAt: itemData.addedAt || new Date().toISOString(),
                                lastUpdated: new Date().toISOString(),
                                createdAt: itemData.createdAt || new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            
                            console.log('[WATCH-LATER-API] ✅ Created episode-specific TV show entry:', {
                        title: itemData.title, 
                                season: itemData.season,
                                episode: itemData.episode,
                                normalizedKey: key,
                                source: 'unified-data-episode-specific'
                    });
                        } else {
                            // For movies: Use all unified data (movies don't have seasons)
                            itemData = {
                                ...unifiedItem, // Use all unified data for movies
                                ...itemData,    // Override with any Watch Later specific data
                                normalizedKey: key, // Ensure normalizedKey is set
                                filePath: unifiedItem.path || unifiedItem.filePath || currentPath, // MongoDB compatibility
                                mediaId: key, // Use normalizedKey as mediaId for MongoDB
                                addedAt: itemData.addedAt || new Date().toISOString(),
                                lastUpdated: new Date().toISOString()
                            };
                            
                            console.log('[WATCH-LATER-API] ✅ Using unified data for movie:', {
                                title: itemData.title,
                                normalizedKey: key,
                                source: 'unified-data'
                            });
                        }
                        break;
                    }
                }
            }
            
            // If item not found in unified data, reject it
            if (!itemData.normalizedKey) {
                console.error('[WATCH-LATER-API] ❌ Item not found in unified data - REJECTING:', {
                    title: itemData.title,
                    mediaType: itemData.mediaType,
                    path: currentPath
                });
                return res.status(400).json({ 
                    error: 'Item not found in unified data. Cannot add to Watch Later.' 
                });
            }
        } catch (error) {
            console.error('[WATCH-LATER-API] Error loading unified data:', error);
            return res.status(500).json({ 
                error: 'Failed to load unified data' 
            });
        }

        // All data comes from unified data - no path parsing needed!
        
        // Check if item already exists using unified data structure
        const existingIndex = items.findIndex(item => {
            // For movies: check normalizedKey (unique identifier from unified data)
            if (itemData.mediaType === 'movie' && item.normalizedKey && itemData.normalizedKey) {
                const isDuplicate = item.normalizedKey === itemData.normalizedKey;
                if (isDuplicate) {
                    console.log('[WATCH-LATER-API] 🔍 Found duplicate movie:', item.title, '(', item.normalizedKey, ')');
                }
                return isDuplicate;
            }
            
            // For TV shows: check normalizedKey + episode info (each episode is unique)
            if (itemData.mediaType === 'tvshow' && item.normalizedKey && itemData.normalizedKey) {
                // Only consider it a duplicate if it's the EXACT same show AND episode
                if (item.normalizedKey === itemData.normalizedKey) {
                    // For episodes, also check season/episode numbers if available
                    if (item.season && item.episode && itemData.season && itemData.episode) {
                        const isDuplicate = item.season === itemData.season && item.episode === itemData.episode;
                        if (isDuplicate) {
                            console.log('[WATCH-LATER-API] 🔍 Found duplicate TV episode:', item.title, 'S' + item.season + 'E' + item.episode);
                        }
                        return isDuplicate;
                    }
                    // If no season/episode info, check if it's the exact same title AND path
                    if (item.title === itemData.title && item.path === itemData.path) {
                        console.log('[WATCH-LATER-API] 🔍 Found duplicate TV show (same title+path):', item.title);
                        return true;
                    }
                    // Different episodes of same show should NOT be considered duplicates
                    console.log('[WATCH-LATER-API] ✅ Different episode of same show - NOT duplicate:', item.title, 'vs', itemData.title);
                    return false;
                }
                // Different shows should NOT be considered duplicates
                return false;
            }
            
            return false;
        });
        
        if (existingIndex !== -1) {
            // Update existing item
            items[existingIndex] = { ...items[existingIndex], ...itemData, lastUpdated: new Date().toISOString() };
            console.log('[WATCH-LATER-API] 🔄 Updated existing item at index:', existingIndex);
        } else {
            // Add new item to beginning of array (most recent first)
            const newItem = { ...itemData, addedAt: new Date().toISOString(), lastUpdated: new Date().toISOString() };
            items.unshift(newItem);
            console.log('[WATCH-LATER-API] ➕ Added new item to beginning of array');
            console.log('[WATCH-LATER-API] ➕ New item details:', { 
                title: newItem.title, 
                season: newItem.season, 
                episode: newItem.episode,
                addedAt: newItem.addedAt 
            });
        }
        
        // Ensure all items have required fields before writing to JSON
        const itemsWithRequiredFields = items.map(item => {
            const updatedItem = { ...item };
            
            // Ensure mediaId is present (use normalizedKey as mediaId)
            if (!updatedItem.mediaId && updatedItem.normalizedKey) {
                updatedItem.mediaId = updatedItem.normalizedKey;
            }
            
            // Ensure filePath is present (use path as filePath)
            if (!updatedItem.filePath && updatedItem.path) {
                updatedItem.filePath = updatedItem.path;
            }
            
            return updatedItem;
        });
        
        // Write back to JSON
        writeWatchLaterJSON(itemsWithRequiredFields);
        
        // Also sync to MongoDB for backup
        try {
            await WatchLater.addItem(itemData);
        } catch (mongoError) {
            console.warn('[WATCH-LATER-API] MongoDB sync failed (non-critical):', mongoError.message);
        }
        
        res.json({
            success: true,
            message: 'Item added to watch later',
            itemCount: items.length,
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
        // Support multiple identification methods for maximum compatibility
        const normalizedKey = req.body.normalizedKey || req.query.normalizedKey;
        const mediaId = req.body.mediaId || req.query.mediaId;
        const mediaType = req.body.mediaType || req.query.mediaType;
        const itemPath = req.body.path || req.query.path;
        const season = req.body.season || req.query.season;
        const episode = req.body.episode || req.query.episode;
        
        if (!normalizedKey && !mediaId && !itemPath) {
            return res.status(400).json({ 
                error: 'Missing required parameter: normalizedKey, mediaId, or path' 
            });
        }
        
        console.log('[WATCH-LATER-API] Removing item - normalizedKey:', normalizedKey, 'mediaId:', mediaId, 'mediaType:', mediaType, 'path:', itemPath, 'season:', season, 'episode:', episode);
        
        // SIMPLE APPROACH: Read array, filter out item, write array
        const items = readWatchLaterJSON();
        const originalCount = items.length;
        
        // Filter out the item to remove - prioritize normalizedKey for most reliable matching
        let filteredItems;
        if (normalizedKey) {
            // Use normalizedKey for most reliable matching
            filteredItems = items.filter(item => {
                // First check if normalizedKey matches
                if (item.normalizedKey !== normalizedKey) {
                    return true; // Keep items with different normalizedKey
                }
                
                // For TV shows, check season/episode if both are provided
                if (item.mediaType === 'tvshow' && season !== undefined && episode !== undefined) {
                    // Only remove if season/episode also match
                    if (item.season == season && item.episode == episode) {
                        console.log(`[WATCH-LATER-API] Removing TV show episode: ${item.title} S${item.season}E${item.episode}`);
                        return false; // Remove this specific episode
                    } else {
                        console.log(`[WATCH-LATER-API] Keeping TV show episode: ${item.title} S${item.season}E${item.episode} (target: S${season}E${episode})`);
                        return true; // Keep different episodes
                    }
                }
                
                // For movies or TV shows without season/episode data, just match normalizedKey
                console.log(`[WATCH-LATER-API] Removing ${item.mediaType}: ${item.title}`);
                return false; // Remove this item
            });
        } else if (itemPath) {
            // Fallback to path matching
            const normalizedPath = itemPath.replace(/\\/g, '/').toLowerCase().trim();
            filteredItems = items.filter(item => {
                const itemPaths = [item.path, item.relPath, item.filePath, item.absPath]
                    .filter(p => p)
                    .map(p => p.replace(/\\/g, '/').toLowerCase().trim());
                return !itemPaths.some(p => p === normalizedPath);
            });
        } else {
            // Fallback to mediaId/mediaType matching
            filteredItems = items.filter(item => 
                !(item.mediaId === mediaId && item.mediaType === mediaType)
            );
        }
        
        const removedCount = originalCount - filteredItems.length;
        console.log('[WATCH-LATER-API] Removed', removedCount, 'item(s). Remaining:', filteredItems.length);
        
        // Write back to JSON
        writeWatchLaterJSON(filteredItems);
        
        // Also sync to MongoDB for backup
        try {
            await WatchLater.removeItem(mediaId, mediaType);
        } catch (mongoError) {
            console.warn('[WATCH-LATER-API] MongoDB sync failed (non-critical):', mongoError.message);
        }
        
        res.json({
            success: true,
            message: 'Item removed from watch later',
            itemCount: filteredItems.length,
            removedCount: removedCount
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
        
        // Process items to extract episode data and handle duplicates
        const processedItems = [];
        const seenKeys = new Set();
        
        items.forEach((item, index) => {
            // Extract episode data for TV shows
            if (item.mediaType === 'tvshow') {
                const currentPath = item.path || item.filePath || item.relPath || item.absPath;
                if (currentPath) {
                    const seasonMatch = currentPath.match(/Season\s+(\d+)/i);
                    const episodeMatch = currentPath.match(/S(\d+)E(\d+)/i);
                    
                    if (seasonMatch && episodeMatch) {
                        item.season = parseInt(seasonMatch[1]);
                        item.episode = parseInt(episodeMatch[2]);
                        console.log('[WATCH-LATER-API] ✅ Extracted episode data for bulk item:', item.title, 'S' + item.season + 'E' + item.episode);
                    }
                }
            }
            
            // Check for duplicates using the same logic as /add endpoint
            let isDuplicate = false;
            let duplicateKey = '';
            
            if (item.mediaType === 'movie' && item.normalizedKey) {
                duplicateKey = `movie:${item.normalizedKey}`;
                isDuplicate = seenKeys.has(duplicateKey);
            } else if (item.mediaType === 'tvshow' && item.normalizedKey) {
                if (item.season && item.episode) {
                    duplicateKey = `tvshow:${item.normalizedKey}:S${item.season}E${item.episode}`;
                } else {
                    duplicateKey = `tvshow:${item.normalizedKey}:${item.title}`;
                }
                isDuplicate = seenKeys.has(duplicateKey);
            }
            
            if (!isDuplicate) {
                seenKeys.add(duplicateKey);
                processedItems.push(item);
            } else {
                console.log('[WATCH-LATER-API] 🔍 Skipping duplicate in bulk import:', item.title);
            }
        });
        
        console.log('[WATCH-LATER-API] Bulk import processed:', processedItems.length, 'unique items from', items.length, 'total');
        
        // Ensure all processed items have required fields before writing to JSON
        const processedItemsWithRequiredFields = processedItems.map(item => {
            const updatedItem = { ...item };
            
            // Ensure mediaId is present (use normalizedKey as mediaId)
            if (!updatedItem.mediaId && updatedItem.normalizedKey) {
                updatedItem.mediaId = updatedItem.normalizedKey;
            }
            
            // Ensure filePath is present (use path as filePath)
            if (!updatedItem.filePath && updatedItem.path) {
                updatedItem.filePath = updatedItem.path;
            }
            
            return updatedItem;
        });
        
        // Write the processed array to JSON
        writeWatchLaterJSON(processedItemsWithRequiredFields);
        
        // Also sync to MongoDB for backup
        try {
        const collection = await WatchLater.getDefaultCollection();
            const originalCount = collection.items.length;
            
            // Complete replacement with processed items
            collection.items = processedItems;
            
            // Update timestamps
            collection.items.forEach(item => {
                item.lastUpdated = new Date();
            });
        
        await collection.save();
            console.log('[WATCH-LATER-API] MongoDB synced');
        } catch (mongoError) {
            console.warn('[WATCH-LATER-API] MongoDB sync failed (non-critical):', mongoError.message);
        }
        
        res.json({
            success: true,
            message: 'Bulk import completed',
            itemCount: items.length
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Bulk import error:', error);
        res.status(500).json({ error: 'Failed to bulk import items' });
    }
});

// POST - Update JSON file with filtered items (for removal operations)
router.post('/update-json', async (req, res) => {
    try {
        const { items } = req.body;
        
        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Items must be an array' });
        }
        
        const jsonFilePath = path.join(__dirname, '../../public/components/MediaLibrary/data/watch-later/watch-later-unified.json');
        
        console.log('[WATCH-LATER-API] Writing to:', jsonFilePath);
        console.log('[WATCH-LATER-API] Items count:', items.length);
        
        const dir = path.dirname(jsonFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Ensure all items have required fields before writing to JSON
        const itemsWithRequiredFields = items.map(item => {
            const updatedItem = { ...item };
            
            // Ensure mediaId is present (use normalizedKey as mediaId)
            if (!updatedItem.mediaId && updatedItem.normalizedKey) {
                updatedItem.mediaId = updatedItem.normalizedKey;
            }
            
            // Ensure filePath is present (use path as filePath)
            if (!updatedItem.filePath && updatedItem.path) {
                updatedItem.filePath = updatedItem.path;
            }
            
            return updatedItem;
        });
        
        fs.writeFileSync(jsonFilePath, JSON.stringify(itemsWithRequiredFields, null, 2), 'utf8');
        console.log('[WATCH-LATER-API] File written successfully with required fields ensured');
        
        res.json({
            success: true,
            message: 'JSON file updated successfully',
            itemCount: items.length,
            filePath: jsonFilePath
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] JSON update error:', error);
        res.status(500).json({ error: 'Failed to update JSON file' });
    }
});

// GET - Get backup data from file
router.get('/backup', async (req, res) => {
    try {
        console.log('[WATCH-LATER-API] Getting backup data from file');
        
        const backupPath = path.join(__dirname, '../public/components/MediaLibrary/data/watch-later/watch-later-unified.json');
        
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

// POST - Save Watch Later archive to JSON file
router.post('/save-watch-later-archive', async (req, res) => {
    try {
        const { filename, data } = req.body;
        
        if (!filename || !data) {
            return res.status(400).json({ error: 'Missing required fields: filename, data' });
        }
        
        console.log('[WATCH-LATER-API] Saving archive:', filename, 'with', data.totalItems, 'items');
        
        // Create archives directory if it doesn't exist
        const archivesDir = path.join(__dirname, '../WATCH_LATER/archives');
        if (!fs.existsSync(archivesDir)) {
            fs.mkdirSync(archivesDir, { recursive: true });
        }
        
        // Save archive file
        const archivePath = path.join(archivesDir, filename);
        fs.writeFileSync(archivePath, JSON.stringify(data, null, 2));
        
        console.log('[WATCH-LATER-API] Archive saved successfully:', archivePath);
        
        res.json({
            success: true,
            message: 'Archive saved successfully',
            filename: filename,
            path: archivePath,
            itemCount: data.totalItems
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Archive save error:', error);
        res.status(500).json({ error: 'Failed to save archive' });
    }
});

// GET - List all archived files
router.get('/archives', async (req, res) => {
    try {
        console.log('[WATCH-LATER-API] Listing archived files');
        
        const archivesDir = path.join(__dirname, '../WATCH_LATER/archives');
        
        if (!fs.existsSync(archivesDir)) {
            return res.json({ archives: [] });
        }
        
        const files = fs.readdirSync(archivesDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const filePath = path.join(archivesDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime
                };
            })
            .sort((a, b) => b.modified - a.modified); // Most recent first
        
        console.log('[WATCH-LATER-API] Found', files.length, 'archive files');
        
        res.json({
            archives: files,
            totalArchives: files.length
        });
        
    } catch (error) {
        console.error('[WATCH-LATER-API] List archives error:', error);
        res.status(500).json({ error: 'Failed to list archives' });
    }
});

// GET - Get specific archive file
router.get('/archives/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        if (!filename.endsWith('.json')) {
            return res.status(400).json({ error: 'Invalid filename. Must be a .json file' });
        }
        
        console.log('[WATCH-LATER-API] Getting archive:', filename);
        
        const archivesDir = path.join(__dirname, '../WATCH_LATER/archives');
        const archivePath = path.join(archivesDir, filename);
        
        if (!fs.existsSync(archivePath)) {
            return res.status(404).json({ error: 'Archive file not found' });
        }
        
        const archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
        console.log('[WATCH-LATER-API] Retrieved archive with', archiveData.totalItems, 'items');
        
        res.json(archiveData);
        
    } catch (error) {
        console.error('[WATCH-LATER-API] Get archive error:', error);
        res.status(500).json({ error: 'Failed to get archive' });
    }
});


module.exports = router; 