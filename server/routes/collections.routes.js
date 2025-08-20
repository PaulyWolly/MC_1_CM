/*
  COLLECTIONS.ROUTES.JS
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
  Created by Paul Welby
*/

const express = require('express');
const Collection = require('../models/Collection');

const router = express.Router();

// GET - Get all collections for a user
router.get('/collections', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const collections = await Collection.find({ userId }).sort({ updatedAt: -1 });
    
    console.log('[COLLECTIONS-API] Retrieved collections for user:', userId, 'Count:', collections.length);
    
    res.json({
      success: true,
      collections: collections.map(collection => ({
        id: collection._id,
        name: collection.name,
        description: collection.description,
        items: collection.items,
        itemCount: collection.items.length,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      }))
    });
  } catch (error) {
    console.error('[COLLECTIONS-API] Error getting collections:', error);
    res.status(500).json({ success: false, error: 'Failed to get collections' });
  }
});

// POST - Create a new collection
router.post('/collections', async (req, res) => {
  try {
    const { userId, name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }
    
    const existingCollection = await Collection.findOne({ userId, name: name.trim() });
    if (existingCollection) {
      return res.status(400).json({ success: false, error: 'Collection with this name already exists' });
    }
    
    const collection = new Collection({
      userId: userId || 'default',
      name: name.trim(),
      description: description || '',
      items: []
    });
    
    await collection.save();
    
    console.log('[COLLECTIONS-API] Created new collection:', collection.name);
    
    res.json({
      success: true,
      collection: {
        id: collection._id,
        name: collection.name,
        description: collection.description,
        items: collection.items,
        itemCount: collection.items.length,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      }
    });
  } catch (error) {
    console.error('[COLLECTIONS-API] Error creating collection:', error);
    res.status(500).json({ success: false, error: 'Failed to create collection' });
  }
});

// PUT - Update collection name/description
router.put('/collections/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const collectionId = req.params.id;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Collection name is required' });
    }
    
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }
    
    // Check if name already exists for this user
    const existingCollection = await Collection.findOne({
      userId: collection.userId,
      name: name.trim(),
      _id: { $ne: collectionId }
    });
    
    if (existingCollection) {
      return res.status(400).json({ success: false, error: 'Collection with this name already exists' });
    }
    
    collection.name = name.trim();
    if (description !== undefined) {
      collection.description = description;
    }
    
    await collection.save();
    
    console.log('[COLLECTIONS-API] Updated collection:', collection.name);
    
    res.json({
      success: true,
      collection: {
        id: collection._id,
        name: collection.name,
        description: collection.description,
        items: collection.items,
        itemCount: collection.items.length,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      }
    });
  } catch (error) {
    console.error('[COLLECTIONS-API] Error updating collection:', error);
    res.status(500).json({ success: false, error: 'Failed to update collection' });
  }
});

// POST - Add item to collection
router.post('/collections/:id/items', async (req, res) => {
  try {
    const collectionId = req.params.id;
    const { path, title, mediaType } = req.body;
    
    if (!path || !title || !mediaType) {
      return res.status(400).json({ success: false, error: 'Path, title, and mediaType are required' });
    }
    
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }
    
    // Check if item already exists in collection
    const existingItem = collection.items.find(item => item.path === path);
    if (existingItem) {
      return res.status(400).json({ success: false, error: 'Item already exists in collection' });
    }
    
    collection.items.push({
      path,
      title,
      mediaType,
      addedAt: new Date()
    });
    
    await collection.save();
    
    console.log('[COLLECTIONS-API] Added item to collection:', collection.name, 'Item:', title);
    
    res.json({
      success: true,
      collection: {
        id: collection._id,
        name: collection.name,
        description: collection.description,
        items: collection.items,
        itemCount: collection.items.length,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      }
    });
  } catch (error) {
    console.error('[COLLECTIONS-API] Error adding item to collection:', error);
    res.status(500).json({ success: false, error: 'Failed to add item to collection' });
  }
});

// DELETE - Remove item from collection
router.delete('/collections/:id/items/:itemPath', async (req, res) => {
  try {
    const collectionId = req.params.id;
    const itemPath = decodeURIComponent(req.params.itemPath);
    
    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }
    
    const itemIndex = collection.items.findIndex(item => item.path === itemPath);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Item not found in collection' });
    }
    
    const removedItem = collection.items.splice(itemIndex, 1)[0];
    await collection.save();
    
    console.log('[COLLECTIONS-API] Removed item from collection:', collection.name, 'Item:', removedItem.title);
    
    res.json({
      success: true,
      collection: {
        id: collection._id,
        name: collection.name,
        description: collection.description,
        items: collection.items,
        itemCount: collection.items.length,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      }
    });
  } catch (error) {
    console.error('[COLLECTIONS-API] Error removing item from collection:', error);
    res.status(500).json({ success: false, error: 'Failed to remove item from collection' });
  }
});

// DELETE - Delete entire collection
router.delete('/collections/:id', async (req, res) => {
  try {
    const collectionId = req.params.id;
    
    const collection = await Collection.findByIdAndDelete(collectionId);
    if (!collection) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }
    
    console.log('[COLLECTIONS-API] Deleted collection:', collection.name);
    
    res.json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    console.error('[COLLECTIONS-API] Error deleting collection:', error);
    res.status(500).json({ success: false, error: 'Failed to delete collection' });
  }
});

module.exports = router;
