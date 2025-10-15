/*
  MOVIES.ROUTES.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');

/**
 * MOVIES API ROUTES
 * 
 * These endpoints handle movie data operations:
 * - POST /api/movies - Create or update a movie
 * - GET /api/movies - Get all movies
 * - GET /api/movies/:id - Get movie by ID
 * - PUT /api/movies/:id - Update movie by ID
 * - DELETE /api/movies/:id - Delete movie by ID
 */

// POST - Create or update a movie
router.post('/', async (req, res) => {
  try {
    console.log('[MOVIES-API] Creating/updating movie:', req.body.title || 'Unknown');
    
    const movieData = {
      ...req.body,
      type: 'movie' // Ensure type is set to movie
    };
    
    const movie = await Movie.findOrCreate(movieData);
    
    res.json({
      success: true,
      message: 'Movie saved successfully',
      movie: {
        id: movie._id,
        title: movie.title,
        year: movie.year,
        tmdbId: movie.tmdbId
      }
    });
    
  } catch (error) {
    console.error('[MOVIES-API] Error saving movie:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save movie',
      details: error.message
    });
  }
});

// GET - Get all movies
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
    
    const movies = await Movie.find(query)
      .sort({ title: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('title year poster tmdbId genres about.title');
    
    const total = await Movie.countDocuments(query);
    
    res.json({
      success: true,
      movies: movies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('[MOVIES-API] Error fetching movies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch movies',
      details: error.message
    });
  }
});

// GET - Get movie by ID
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Movie not found'
      });
    }
    
    res.json({
      success: true,
      movie: movie
    });
    
  } catch (error) {
    console.error('[MOVIES-API] Error fetching movie:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch movie',
      details: error.message
    });
  }
});

// PUT - Update movie by ID
router.put('/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Movie not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Movie updated successfully',
      movie: movie
    });
    
  } catch (error) {
    console.error('[MOVIES-API] Error updating movie:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update movie',
      details: error.message
    });
  }
});

// DELETE - Delete movie by ID
router.delete('/:id', async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    
    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Movie not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Movie deleted successfully',
      movie: {
        id: movie._id,
        title: movie.title
      }
    });
    
  } catch (error) {
    console.error('[MOVIES-API] Error deleting movie:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete movie',
      details: error.message
    });
  }
});

// GET - Get movie statistics
router.get('/stats/count', async (req, res) => {
  try {
    const totalMovies = await Movie.countDocuments();
    const recentMovies = await Movie.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });
    
    res.json({
      success: true,
      stats: {
        total: totalMovies,
        recent: recentMovies
      }
    });
    
  } catch (error) {
    console.error('[MOVIES-API] Error fetching movie stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch movie statistics',
      details: error.message
    });
  }
});

module.exports = router;
