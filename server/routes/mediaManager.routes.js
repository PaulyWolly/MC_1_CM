/*
  MEDIAMANAGER.ROUTES.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const TMDBPosterService = require('../services/TMDBPosterService');
const config = require('../../config/config');
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY || config.TMDB_API_KEY || config.tmdbApiKey;
const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';
const TMDB_TV_URL = 'https://api.themoviedb.org/3/tv';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const MOVIES_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies.json');
const TV_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows.json');
const MOVIE_CAST_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_cast.json');
const MOVIE_DESC_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_descriptions.json');

// GET /api/media/unconfigured
router.get('/api/media/unconfigured', (req, res) => {
  try {
    const { type } = req.query;
    if (!type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ success: false, error: 'Invalid or missing type (movie|tv)' });
    }
    const mediaJsonPath = type === 'movie' ? MOVIES_JSON : TV_JSON;
    const mediaData = JSON.parse(fs.readFileSync(mediaJsonPath, 'utf8'));
    const folders = mediaData.library && Array.isArray(mediaData.library.folders)
      ? mediaData.library.folders : (Array.isArray(mediaData.folders) ? mediaData.folders : []);
    // For now, just return all folders (can filter for unconfigured later)
    return res.json({ success: true, items: folders });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/fetch-tmdb
router.post('/fetch-tmdb', async (req, res) => {
  try {
    console.log('[TMDB FETCH] Request:', req.body);
    const { type, title, tmdbId } = req.body;
    if (!type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ success: false, error: 'Invalid or missing type (movie|tv)' });
    }
    if (!title && !tmdbId) {
      return res.status(400).json({ success: false, error: 'Must provide title or tmdbId' });
    }
    if (tmdbId) {
      // Fetch by TMDB ID (full details)
      const url = type === 'movie'
        ? `${TMDB_MOVIE_URL}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`
        : `${TMDB_TV_URL}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
      console.log('[TMDB FETCH] URL:', url);
      const response = await fetch(url);
      const tmdbData = await response.json();
      console.log('[TMDB FETCH] Response:', tmdbData);
      if (!response.ok) throw new Error('TMDB fetch failed');
      const poster = tmdbData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbData.poster_path}` : null;
      const description = tmdbData.overview || '';
      const cast = tmdbData.credits && tmdbData.credits.cast
        ? tmdbData.credits.cast.slice(0, 12).map(actor => ({
            name: actor.name,
            character: actor.character,
            profile: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : null
          }))
        : [];
      return res.json({
        success: true,
        data: {
          tmdbId: tmdbData.id,
          title: tmdbData.title || tmdbData.name || '',
          year: (tmdbData.release_date || tmdbData.first_air_date || '').slice(0,4),
          poster,
          description,
          cast
        }
      });
    } else {
      // Search by title (return multiple matches for user selection)
      let results = [];
      if (type === 'movie') {
        console.log('[TMDB SEARCH] Calling searchMovieOptions with:', title);
        results = await TMDBPosterService.searchMovieOptions(title);
        console.log('[TMDB SEARCH] Results:', results);
        results = results.map(m => ({
          tmdbId: m.id,
          title: m.title,
          year: m.year,
          poster: m.poster_url,
          description: m.overview,
          vote_average: m.vote_average
        }));
      } else {
        console.log('[TMDB SEARCH] Calling searchTVShowOptions with:', title);
        results = await TMDBPosterService.searchTVShowOptions(title);
        console.log('[TMDB SEARCH] Results:', results);
        results = results.map(m => ({
          tmdbId: m.id,
          title: m.name,
          year: m.year,
          poster: m.poster_url,
          description: m.overview,
          vote_average: m.vote_average
        }));
      }
      if (!results.length) {
        return res.status(404).json({ success: false, error: 'No results found on TMDB' });
      }
      return res.json({ success: true, results });
    }
  } catch (err) {
    console.error('[TMDB FETCH] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/save
router.post('/save', (req, res) => {
  try {
    const { type } = req.body;
    if (!type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ success: false, error: 'Invalid or missing type (movie|tv)' });
    }
    if (type === 'tv') {
      // --- TV SHOW SAVE LOGIC ---
      const { tmdbId, title, year, description, cast, poster, seasons, showPath } = req.body;
      if (!title || !seasons || !Array.isArray(seasons) || seasons.length === 0) {
        return res.status(400).json({ success: false, error: 'Missing required TV show fields (title, at least one season)' });
      }
      // Load existing TV shows
      let tvData = [];
      if (fs.existsSync(TV_JSON)) {
        try { tvData = JSON.parse(fs.readFileSync(TV_JSON, 'utf8')); } catch (e) { tvData = []; }
      }
      // If tvData is an object with folders, convert to flat array
      if (!Array.isArray(tvData) && tvData && Array.isArray(tvData.folders)) {
        tvData = tvData.folders.map(showFolder => {
          const showTitle = showFolder.path.split(/[/\\]/)[0] || showFolder.path;
          const showSeasons = (showFolder.folders || []).map(seasonFolder => {
            // Try to extract season number from folder name
            let seasonNumber = 1;
            const match = seasonFolder.path.match(/Season\s*(-?\d+)/i);
            if (match) seasonNumber = Math.abs(parseInt(match[1], 10));
            // Fallback: try to extract from first episode filename
            if (!seasonNumber && seasonFolder.files && seasonFolder.files[0]) {
              const epMatch = seasonFolder.files[0].name.match(/S(\d{1,2})E\d{1,2}/i);
              if (epMatch) seasonNumber = parseInt(epMatch[1], 10);
            }
            const episodes = (seasonFolder.files || []).map(file => ({
              filename: file.name,
              filePath: file.absPath || file.relPath || '',
            }));
            return { seasonNumber, episodes };
          });
          return { title: showTitle, seasons: showSeasons };
        });
      }
      // Find existing show by tmdbId or title
      let idx = -1;
      if (tmdbId) idx = tvData.findIndex(show => show.tmdbId === tmdbId);
      if (idx === -1) idx = tvData.findIndex(show => show.title && show.title.toLowerCase() === title.toLowerCase());
      const showObj = { tmdbId, title, year, description, cast, poster, seasons, showPath };
      if (idx !== -1) {
        tvData[idx] = showObj;
      } else {
        tvData.push(showObj);
      }
      fs.writeFileSync(TV_JSON, JSON.stringify(tvData, null, 2));
      return res.json({ success: true, saved: showObj });
    }
    // --- MOVIE SAVE LOGIC (unchanged) ---
    const { absPath, poster, description, cast, title, year } = req.body;
    if (!absPath) {
      return res.status(400).json({ success: false, error: 'Missing absPath' });
    }
    // Save under ONE key: the full absPath
    console.log('[MEDIA SAVE] Saving under key:', absPath);
    // Save description
    let descData = {};
    if (fs.existsSync(MOVIE_DESC_JSON)) descData = JSON.parse(fs.readFileSync(MOVIE_DESC_JSON, 'utf8'));
    if (!descData[absPath]) descData[absPath] = {};
    descData[absPath].title = title || '';
    descData[absPath].year = year || '';
    descData[absPath].description = description || '';
    fs.writeFileSync(MOVIE_DESC_JSON, JSON.stringify(descData, null, 2));
    // Save cast
    let castData = {};
    if (fs.existsSync(MOVIE_CAST_JSON)) castData = JSON.parse(fs.readFileSync(MOVIE_CAST_JSON, 'utf8'));
    castData[absPath] = { 
      title: title || '', 
      year: year || '', 
      cast: cast || [] 
    };
    fs.writeFileSync(MOVIE_CAST_JSON, JSON.stringify(castData, null, 2));
    // --- NEW: Save to main movies data file so it appears in the Movies page ---
    let moviesData = {};
    if (fs.existsSync(MOVIES_JSON)) {
      moviesData = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
    }
    if (!moviesData.library) moviesData.library = {};
    if (!Array.isArray(moviesData.library.folders)) moviesData.library.folders = [];
    // Create or update the movie entry
    const newMovie = {
      path: absPath,
      title: title || '',
      year: year || '',
      poster: poster || '',
      description: description || '',
      cast: cast || []
    };
    const existingIdx = moviesData.library.folders.findIndex(m => m.path === absPath);
    if (existingIdx !== -1) {
      moviesData.library.folders[existingIdx] = newMovie;
    } else {
      moviesData.library.folders.push(newMovie);
    }
    fs.writeFileSync(MOVIES_JSON, JSON.stringify(moviesData, null, 2));
    // --- END NEW ---
    console.log('[MEDIA SAVE] Saved data under key:', absPath);
    // Poster saving would be handled elsewhere (file copy/upload), but can store poster URL/path here if needed
    return res.json({ success: true, keySaved: absPath });
  } catch (err) {
    console.error('[MEDIA SAVE] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/bulk-update
router.post('/api/media/bulk-update', async (req, res) => {
  // For now, just return a stub response
  return res.json({ success: true, message: 'Bulk update started (not yet implemented)' });
});

// POST /api/media/validate-path
router.post('/api/media/validate-path', (req, res) => {
  try {
    const { path: mediaPath, type } = req.body;
    if (!mediaPath) return res.status(400).json({ success: false, error: 'Missing path' });
    // Basic regex for movie: /<name> (<year>) [setting]/movie.name.(year).[setting].ext
    let valid = false;
    if (type === 'movie') {
      valid = /.+ \(\d{4}\) \[.+\]\/[^\/]+\.(mp4|mkv|avi|mov)$/i.test(mediaPath);
    } else if (type === 'tv') {
      // Example: /<show>/Season 01/S01E01.ext
      valid = /.+\/Season \d{2}\/S\d{2}E\d{2}\.(mp4|mkv|avi|mov)$/i.test(mediaPath);
    }
    return res.json({ success: true, valid });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/scan-tv-structure
router.post('/scan-tv-structure', (req, res) => {
  try {
    if (!req.body || !req.body.showPath) {
      return res.status(400).json({ success: false, error: 'Missing showPath in request body' });
    }
    const { showPath } = req.body;
    if (!showPath) {
      return res.status(400).json({ success: false, error: 'Missing showPath parameter' });
    }
    if (!fs.existsSync(showPath)) {
      return res.status(404).json({ success: false, error: `Path not found: ${showPath}` });
    }
    // Scan for season folders
    const seasons = [];
    const showDir = fs.readdirSync(showPath, { withFileTypes: true });
    const seasonFolders = showDir
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => /season\s*\d+/i.test(dirent.name));
    seasonFolders.forEach(seasonFolder => {
      const seasonPath = path.join(showPath, seasonFolder.name);
      const seasonMatch = seasonFolder.name.match(/season\s*(\d+)/i);
      const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : undefined;
      const episodes = [];
      const files = fs.readdirSync(seasonPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .filter(dirent => /\.(mp4|mkv|avi|mov)$/i.test(dirent.name));
      files.forEach(file => {
        episodes.push({
          filename: file.name,
          filePath: path.join(seasonPath, file.name)
        });
      });
      seasons.push({ seasonNumber, seasonName: seasonFolder.name, episodes });
    });
    return res.json({
      success: true,
      data: {
        showPath,
        seasons,
        totalSeasons: seasons.length,
        totalEpisodes: seasons.reduce((sum, s) => sum + s.episodes.length, 0)
      }
    });
  } catch (err) {
    console.error('[TV STRUCTURE SCAN] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;