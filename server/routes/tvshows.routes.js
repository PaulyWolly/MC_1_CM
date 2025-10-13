/*
  TVSHOWS.ROUTES.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const TVShow = require('../models/TVShow');

/**
 * TV SHOWS API ROUTES
 * 
 * These endpoints handle TV show data operations:
 * - POST /api/tv-shows - Create or update a TV show
 * - GET /api/tv-shows - Get all TV shows
 * - GET /api/tv-shows/:id - Get TV show by ID
 * - PUT /api/tv-shows/:id - Update TV show by ID
 * - DELETE /api/tv-shows/:id - Delete TV show by ID
 */

// POST - Create or update a TV show
router.post('/', async (req, res) => {
  try {
    console.log('[TVSHOWS-API] Creating/updating TV show:', req.body.title || 'Unknown');
    
    const tvShowData = {
      ...req.body,
      type: 'tvshow' // Ensure type is set to tvshow
    };
    
    const tvShow = await TVShow.findOrCreate(tvShowData);
    
    res.json({
      success: true,
      message: 'TV show saved successfully',
      tvShow: {
        id: tvShow._id,
        title: tvShow.title,
        year: tvShow.year,
        tmdbId: tvShow.tmdbId
      }
    });
    
  } catch (error) {
    console.error('[TVSHOWS-API] Error saving TV show:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save TV show',
      details: error.message
    });
  }
});

// GET - Get all TV shows
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, year, genre } = req.query;
    
    // Build query
    const query = {};
    
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    if (year) {
      query.year = parseInt(year);
    }
    
    if (genre) {
      query.genres = { $in: [genre] };
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    const tvShows = await TVShow.find(query)
      .sort({ title: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('title year poster tmdbId genres about.title seasons');
    
    const total = await TVShow.countDocuments(query);
    
    res.json({
      success: true,
      tvShows: tvShows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('[TVSHOWS-API] Error fetching TV shows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TV shows',
      details: error.message
    });
  }
});

// GET - Get TV show by ID
router.get('/:id', async (req, res) => {
  try {
    const tvShow = await TVShow.findById(req.params.id);
    
    if (!tvShow) {
      return res.status(404).json({
        success: false,
        error: 'TV show not found'
      });
    }
    
    res.json({
      success: true,
      tvShow: tvShow
    });
    
  } catch (error) {
    console.error('[TVSHOWS-API] Error fetching TV show:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TV show',
      details: error.message
    });
  }
});

// PUT - Update TV show by ID
router.put('/:id', async (req, res) => {
  try {
    const tvShow = await TVShow.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!tvShow) {
      return res.status(404).json({
        success: false,
        error: 'TV show not found'
      });
    }
    
    res.json({
      success: true,
      message: 'TV show updated successfully',
      tvShow: tvShow
    });
    
  } catch (error) {
    console.error('[TVSHOWS-API] Error updating TV show:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update TV show',
      details: error.message
    });
  }
});

// DELETE - Delete TV show by ID
router.delete('/:id', async (req, res) => {
  try {
    const tvShow = await TVShow.findByIdAndDelete(req.params.id);
    
    if (!tvShow) {
      return res.status(404).json({
        success: false,
        error: 'TV show not found'
      });
    }
    
    res.json({
      success: true,
      message: 'TV show deleted successfully',
      tvShow: {
        id: tvShow._id,
        title: tvShow.title
      }
    });
    
  } catch (error) {
    console.error('[TVSHOWS-API] Error deleting TV show:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete TV show',
      details: error.message
    });
  }
});

// GET - Get TV show statistics
router.get('/stats/count', async (req, res) => {
  try {
    const totalTVShows = await TVShow.countDocuments();
    const recentTVShows = await TVShow.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });
    
    // Calculate total episodes across all shows
    const tvShowsWithEpisodes = await TVShow.find({}, 'seasons');
    let totalEpisodes = 0;
    
    tvShowsWithEpisodes.forEach(show => {
      if (show.seasons) {
        show.seasons.forEach(season => {
          if (season.episodes) {
            totalEpisodes += season.episodes.length;
          }
        });
      }
    });
    
    res.json({
      success: true,
      stats: {
        total: totalTVShows,
        recent: recentTVShows,
        totalEpisodes: totalEpisodes
      }
    });
    
  } catch (error) {
    console.error('[TVSHOWS-API] Error fetching TV show stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TV show statistics',
      details: error.message
    });
  }
});

module.exports = router;
