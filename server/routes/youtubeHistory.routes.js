/*
  YOUTUBEHISTORY.ROUTES.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const YouTubeSearch = require('../models/YouTubeSearch');

// GET all queries (for cache restoration) - FRONTEND CALLS THIS!
router.get('/list', async (req, res) => {
    try {
        // Check if MongoDB is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('📚 [API] MongoDB not connected, returning empty array');
            return res.json({ queries: [] });
        }
        
        // Get all documents without requiring sessionId - NO LIMIT!
        const allQueries = await YouTubeSearch.find({}).sort({ lastSearched: -1 });
        
        console.log(`📚 [API] Found ${allQueries.length} total documents in database`);
        
        // Return complete search information including type
        const queries = allQueries.map(item => ({
            query: item.query,
            displayName: item.displayName,
            searchType: item.searchMetadata?.searchType || 'search',
            timestamp: item.lastSearched || item.dateCreated,
            totalPages: item.totalPages,
            videoCount: item.videoCount,
            cacheKeys: item.cacheKeys || [] // Include cache keys for debugging
        }));
        
        console.log(`📚 [API] Returning ${queries.length} queries from database`);
        console.log('📚 [API] Sample queries:', queries.slice(0, 5).map(q => ({
            query: q.query,
            displayName: q.displayName,
            cacheKeys: q.cacheKeys?.length || 0
        })));
        
        res.json({ queries: queries }); // Frontend expects { queries: [...] }
    } catch (error) {
        console.error('📚 [API] Error loading queries:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET all queries (for cache restoration) - ALTERNATIVE ENDPOINT
router.get('/all', async (req, res) => {
    try {
        // Check if MongoDB is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('📚 [API] MongoDB not connected, returning empty array');
            return res.json([]);
        }
        
        // Get all documents without requiring sessionId - NO LIMIT!
        const allQueries = await YouTubeSearch.find({}).sort({ lastSearched: -1 });
        
        console.log(`📚 [API] Found ${allQueries.length} total documents in database`);
        
        // Return complete search information including type
        const queries = allQueries.map(item => ({
            query: item.query,
            displayName: item.displayName,
            searchType: item.searchMetadata?.searchType || 'search',
            timestamp: item.lastSearched || item.dateCreated,
            totalPages: item.totalPages,
            videoCount: item.videoCount,
            cacheKeys: item.cacheKeys || [] // Include cache keys for debugging
        }));
        
        console.log(`📚 [API] Returning ${queries.length} queries from database`);
        console.log('📚 [API] Sample queries:', queries.slice(0, 5).map(q => ({
            query: q.query,
            displayName: q.displayName,
            cacheKeys: q.cacheKeys?.length || 0
        })));
        
        res.json(queries);
    } catch (error) {
        console.error('📚 [API] Error loading queries:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET history for a session
router.get('/:sessionId', async (req, res) => {
    try {
        // Check if MongoDB is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState !== 1) {
            console.log('📚 [API] MongoDB not connected, returning empty array');
            return res.json({ queries: [] });
        }
        
        // FIXED: Get all documents without problematic aggregation that was hiding duplicates
        const allQueries = await YouTubeSearch.find({}).sort({ lastSearched: -1 });
        
        console.log(`📚 [API] Found ${allQueries.length} total documents in database`);
        
        // Return complete search information including type
        const queries = allQueries.map(item => ({
            query: item.query,
            displayName: item.displayName,
            searchType: item.searchMetadata?.searchType || 'search',
            timestamp: item.lastSearched || item.dateCreated,
            totalPages: item.totalPages,
            videoCount: item.videoCount,
            cacheKeys: item.cacheKeys || [] // Include cache keys for debugging
        }));
        
        console.log(`📚 [API] Returning ${queries.length} queries from database`);
        console.log('📚 [API] Sample queries:', queries.slice(0, 5).map(q => ({
            query: q.query,
            displayName: q.displayName,
            cacheKeys: q.cacheKeys?.length || 0
        })));
        
        res.json(queries);
    } catch (error) {
        console.error('📚 [API] Error loading queries:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST a new query to the history
router.post('/', async (req, res) => {
    const { sessionId, query } = req.body;
    if (!sessionId || !query) {
        return res.status(400).json({ message: 'Missing sessionId or query' });
    }

    try {
        // Normalize query for internal storage
        const normalizeQuery = (q) => {
            return q.toLowerCase()
                .trim()
                .replace(/^youtube\s+search\s+/i, '') // Remove youtube search prefix
                .replace(/\s+/g, '.') // Replace spaces with dots
                .replace(/[^a-z0-9.]/g, '') // Remove special characters except dots
                .replace(/\.+/g, '.') // Replace multiple dots with single dot
                .replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
        };
        
        const originalQuery = query;
        const normalizedQuery = normalizeQuery(originalQuery);
        const humanReadableDisplay = normalizedQuery.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Use upsert to either create a new entry or update the timestamp of an existing one
        const result = await YouTubeSearch.findOneAndUpdate(
            { query: normalizedQuery }, // Search by normalized query
            { 
                $set: { 
                    lastSearched: new Date(),
                    userId: sessionId || 'default-user',
                    displayName: humanReadableDisplay // Human-readable display name
                } 
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE a query from the history
router.delete('/:sessionId/:query', async (req, res) => {
    try {
        const { sessionId, query } = req.params;
        const result = await YouTubeSearch.deleteOne({ query: decodeURIComponent(query) });
        if (result.deletedCount === 0) {
            // It's not an error if we try to delete something that's not in the DB
            // (e.g., it only existed in local cache), so we send success.
            return res.status(200).json({ message: 'Query not found in DB, but operation successful.' });
        }
        res.status(200).json({ message: 'Query deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 