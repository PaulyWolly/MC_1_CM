/*
  MEDIAMANAGER.ROUTES.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const TMDBPosterService = require('../services/TMDBPosterService');
const config = require('../../config/config');
const fs = require('fs');
const path = require('path');
const https = require('https');
const NormalizationService = require('../services/NormalizationService');
const { normalizeKey } = require('../../shared/NormalizationService');
const { execSync, exec } = require('child_process');
// Use normalizeKey for all mapping key normalization in this file.

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';
const TMDB_TV_URL = 'https://api.themoviedb.org/3/tv';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const MOVIES_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');
const TV_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
const MOVIE_CAST_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_cast_normalized.json');
const MOVIE_DESC_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_descriptions_normalized.json');
const MOVIE_POSTERS_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

// GET /api/media/get-movie-posters
router.get('/get-movie-posters', (req, res) => {
  try {
    const postersPath = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
    
    if (!fs.existsSync(postersPath)) {
      return res.json({ success: false, error: 'Posters file not found' });
    }
    
    const postersData = JSON.parse(fs.readFileSync(postersPath, 'utf8'));
    return res.json({ success: true, posters: postersData });
    
  } catch (err) {
    console.error('[GET-MOVIE-POSTERS] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/media/unconfigured
router.get('/unconfigured', (req, res) => {
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
    if (!TMDB_API_KEY) {
      console.error('[TMDB FETCH] ERROR: TMDB_API_KEY is missing at request time!');
      return res.status(500).json({ success: false, error: 'TMDB API key not found' });
    }
    console.log('[TMDB FETCH] TMDB_API_KEY at request time:', TMDB_API_KEY);
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

// POST /api/media/process-movie-scripts
router.post('/process-movie-scripts', async (req, res) => {
  try {
    const { title, year, absPath } = req.body;
    
    if (!title || !absPath) {
      return res.status(400).json({ success: false, error: 'Missing title or absPath' });
    }
    
    console.log(`[PROCESS-MOVIE] Processing: ${title} (${year}) - ${absPath}`);
    
    try {
      // Step 1: Use TMDBPosterService to search for movie options
      console.log(`[PROCESS-MOVIE] Step 1: Searching TMDB for movie options...`);
      
      // Clean the title for TMDB search (remove extra info in parentheses)
      const cleanTitle = title.replace(/\s*\([^)]*\)\s*$/, '').trim();
      console.log(`[PROCESS-MOVIE] Original title: "${title}"`);
      console.log(`[PROCESS-MOVIE] Cleaned title: "${cleanTitle}"`);
      
      const movieOptions = await TMDBPosterService.searchMovieOptions(cleanTitle, year);
      
      if (!movieOptions || movieOptions.length === 0) {
        return res.status(404).json({ 
          success: false, 
          error: `No TMDB results found for: ${title}` 
        });
      }
      
      // Use the best match (first result)
      const bestMatch = movieOptions[0];
      console.log(`[PROCESS-MOVIE] Found best match: ${bestMatch.title} (${bestMatch.year})`);
      
      // Step 2: Fetch full movie details and cast
      console.log(`[PROCESS-MOVIE] Step 2: Fetching full movie details...`);
      const movieDetailsUrl = `${TMDB_MOVIE_URL}/${bestMatch.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
      const movieResponse = await fetch(movieDetailsUrl);
      const movieData = await movieResponse.json();
      
      if (!movieResponse.ok) {
        throw new Error('Failed to fetch movie details from TMDB');
      }
      
      // Step 3: Save movie data to JSON files
      console.log(`[PROCESS-MOVIE] Step 3: Saving movie data...`);
      
      // Create the key for JSON files
      const folderName = path.basename(path.dirname(absPath));
      const jsonKey = `${folderName} (${year}) [1080p]`;
      
      console.log(`[PROCESS-MOVIE] Generated key: ${jsonKey}`);
      console.log(`[PROCESS-MOVIE] Folder name: ${folderName}`);
      console.log(`[PROCESS-MOVIE] Year: ${year}`);
      console.log(`[PROCESS-MOVIE] AbsPath: ${absPath}`);
      
      // Save description
      const descPath = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_descriptions_normalized.json');
      let descData = {};
      if (fs.existsSync(descPath)) descData = JSON.parse(fs.readFileSync(descPath, 'utf8'));
      descData[absPath] = {
        title: title,
        year: year,
        description: movieData.overview || ''
      };
      fs.writeFileSync(descPath, JSON.stringify(descData, null, 2));
      
      // Save cast
      const castPath = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_cast_normalized.json');
      let castData = {};
      if (fs.existsSync(castPath)) castData = JSON.parse(fs.readFileSync(castPath, 'utf8'));
      const cast = movieData.credits && movieData.credits.cast
        ? movieData.credits.cast.slice(0, 12).map(actor => ({
            name: actor.name,
            character: actor.character,
            profile: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : null
          }))
        : [];
      castData[absPath] = { cast };
      fs.writeFileSync(castPath, JSON.stringify(castData, null, 2));
      
      // Save poster
      const posterPath = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
      let posterData = {};
      if (fs.existsSync(posterPath)) posterData = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
      posterData[jsonKey] = bestMatch.poster_url;
      fs.writeFileSync(posterPath, JSON.stringify(posterData, null, 2));
      
      console.log(`[PROCESS-MOVIE] ✓ Successfully processed: ${title}`);
      return res.json({ 
        success: true, 
        message: `Successfully processed ${title}`,
        data: {
          title: bestMatch.title,
          year: bestMatch.year,
          poster: bestMatch.poster_url,
          description: movieData.overview,
          cast: cast
        }
      });
      
    } catch (serviceError) {
      console.error(`[PROCESS-MOVIE] Service error:`, serviceError.message);
      return res.status(500).json({ 
        success: false, 
        error: `Processing failed: ${serviceError.message}` 
      });
    }
    
  } catch (err) {
    console.error('[PROCESS-MOVIE] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/save
router.post('/save', async (req, res) => {
  try {
    const { type } = req.body;
    if (!type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ success: false, error: 'Invalid or missing type (movie|tv)' });
    }
    if (type === 'tv') {
      // --- TV SHOW SAVE LOGIC ---
      const { tmdbId, title, year, description, cast, poster, seasons, showPath } = req.body;
      if (!title) {
        return res.status(400).json({ success: false, error: 'Missing required TV show field: title' });
      }
      // Load existing TV shows from the normalized location that MediaLibrary expects
      let tvData = [];
      const TV_NORMALIZED_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
      if (fs.existsSync(TV_NORMALIZED_JSON)) {
        try { tvData = JSON.parse(fs.readFileSync(TV_NORMALIZED_JSON, 'utf8')); } catch (e) { tvData = []; }
      }
      
      // Ensure tvData is an array
      if (!Array.isArray(tvData)) {
        tvData = [];
      }
      // tvData should already be an array of show objects in normalized format
      // Find existing show by tmdbId or title
      let idx = -1;
      if (tmdbId) idx = tvData.findIndex(show => show.tmdbId === tmdbId);
      if (idx === -1) idx = tvData.findIndex(show => show.title && show.title.toLowerCase() === title.toLowerCase());
      // Create standardized show object that works with ALL TV show structures
      const showObj = { 
        tmdbId, 
        title, 
        year, 
        description, 
        cast, 
        poster, 
        seasons, 
        showPath,
        path: showPath,
        // Add standardized folders structure for MediaLibrary compatibility
        folders: seasons.map(season => ({
          path: `Season ${season.seasonNumber.toString().padStart(2, '0')}`,
          relPath: `Season ${season.seasonNumber.toString().padStart(2, '0')}`,
          files: season.episodes.map(episode => ({
            name: episode.filename || episode.name,
            filename: episode.filename || episode.name,
            absPath: episode.filePath || episode.absPath,
            relPath: episode.relPath || episode.filePath,
            filePath: episode.filePath || episode.absPath
          }))
        }))
      };
      if (idx !== -1) {
        tvData[idx] = showObj;
      } else {
        tvData.push(showObj);
      }
      fs.writeFileSync(TV_NORMALIZED_JSON, JSON.stringify(tvData, null, 2));
      // --- ALWAYS SAVE TO NORMALIZED FILES ---
      const normalizeKey = (name) => {
        return name
          .replace(/\\/g, '/')
          .replace(/\s*&\s*/g, '.&.')
          .replace(/\s+/g, '.')
          .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
          .replace(/\.+/g, '.')
          .replace(/^\.|\.$/g, '');
      };
      
      // For TV shows, include the year in the normalized key to match MediaLibrary expectations
      const titleWithYear = year ? `${title} (${year})` : title;
      const dotKey = normalizeKey(titleWithYear);
      
      // Save cast to normalized file
      const castPath = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json');
      let castData = {};
      if (fs.existsSync(castPath)) castData = JSON.parse(fs.readFileSync(castPath, 'utf8'));
      castData[dotKey] = cast || [];
      fs.writeFileSync(castPath, JSON.stringify(castData, null, 2));
      console.log('[MEDIA SAVE] TV cast saved to normalized file:', dotKey);
      
      // Save description to normalized file
      const descPath = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-show_descriptions_normalized.json');
      let descData = {};
      if (fs.existsSync(descPath)) descData = JSON.parse(fs.readFileSync(descPath, 'utf8'));
      descData[dotKey] = description || '';
      fs.writeFileSync(descPath, JSON.stringify(descData, null, 2));
      console.log('[MEDIA SAVE] TV description saved to normalized file:', dotKey);
      
      // Save poster to normalized file
      if (poster && poster.startsWith('http')) {
        const posterPath = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json');
        let posterData = {};
        if (fs.existsSync(posterPath)) posterData = JSON.parse(fs.readFileSync(posterPath, 'utf8'));
        posterData[dotKey] = poster;
        fs.writeFileSync(posterPath, JSON.stringify(posterData, null, 2));
        console.log('[MEDIA SAVE] TV poster saved to normalized file:', dotKey);
      }
      
      return res.json({ success: true, saved: showObj });
    }
    // --- MOVIE SAVE LOGIC (normalized) ---
    const { normalizedKey, poster, description, cast, title, year } = req.body;
    if (!normalizedKey) {
      return res.status(400).json({ success: false, error: 'Missing normalizedKey' });
    }
    // Load or initialize movies data
    let moviesData = {};
    if (fs.existsSync(MOVIES_JSON)) {
      moviesData = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
    }
    // Ensure the normalized structure exists
    if (!moviesData.path) moviesData.path = "";
    if (!Array.isArray(moviesData.folders)) moviesData.folders = [];
    
    // Remove any existing folder entry for this normalizedKey
    moviesData.folders = moviesData.folders.filter(m => m.normalizedKey !== normalizedKey);
    
    // Create the new movie folder structure
    const newMovie = {
      path: title || '',
      normalizedKey: normalizedKey,
      tmdbId: null, // Will be set when TMDB data is fetched
      folders: [],
      files: []
    };
    moviesData.folders.push(newMovie);
    fs.writeFileSync(MOVIES_JSON, JSON.stringify(moviesData, null, 2));

    // --- Save description ---
    let descData = {};
    if (fs.existsSync(MOVIE_DESC_JSON)) descData = JSON.parse(fs.readFileSync(MOVIE_DESC_JSON, 'utf8'));
    if (!descData[normalizedKey]) descData[normalizedKey] = {};
    descData[normalizedKey].title = title || '';
    descData[normalizedKey].year = year || '';
    descData[normalizedKey].description = description || '';
    fs.writeFileSync(MOVIE_DESC_JSON, JSON.stringify(descData, null, 2));
    // --- Save cast ---
    let castData = {};
    if (fs.existsSync(MOVIE_CAST_JSON)) castData = JSON.parse(fs.readFileSync(MOVIE_CAST_JSON, 'utf8'));
    castData[normalizedKey] = { title: title || '', year: year || '', cast: cast || [] };
    fs.writeFileSync(MOVIE_CAST_JSON, JSON.stringify(castData, null, 2));
    // --- Poster mapping ---
    if (poster && poster.startsWith('http')) {
      try {
        // Compute web-accessible path (simulate as before)
        const webPosterUrl = poster;
        // --- Use dot notation key for poster mapping ---
        let posters = {};
        try {
          if (fs.existsSync(MOVIE_POSTERS_JSON)) {
            posters = JSON.parse(fs.readFileSync(MOVIE_POSTERS_JSON, 'utf8'));
          }
        } catch (e) { posters = {}; }
        posters[normalizedKey] = webPosterUrl;
        try {
          fs.writeFileSync(MOVIE_POSTERS_JSON, JSON.stringify(posters, null, 2));
          console.log('[MEDIA SAVE] Poster saved and movie_posters.json updated:', webPosterUrl);
        } catch (err) {
          console.error('[MEDIA SAVE] Failed to update movie_posters.json:', err);
          return res.status(500).json({ success: false, error: 'Failed to update movie_posters.json: ' + err.message });
        }
      } catch (err) {
        console.error('[MEDIA SAVE] Error in poster download/persist:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }
    console.log('[MEDIA SAVE] Saved data under normalizedKey:', normalizedKey);
    return res.json({ success: true, keySaved: normalizedKey });
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
        const filePath = path.join(seasonPath, file.name);
        const relPath = path.relative(showPath, filePath).replace(/\\/g, '/');
        
        // Extract episode number from filename
        const epMatch = file.name.match(/E(\d{1,2})/i);
        const episodeNumber = epMatch ? parseInt(epMatch[1], 10) : undefined;
        
        episodes.push({
          filename: file.name,
          name: file.name,
          filePath: filePath,
          absPath: filePath,
          relPath: relPath,
          episodeNumber: episodeNumber
        });
      });
      
      // Sort episodes by episode number
      episodes.sort((a, b) => {
        if (!a.episodeNumber && !b.episodeNumber) return 0;
        if (!a.episodeNumber) return 1;
        if (!b.episodeNumber) return -1;
        return a.episodeNumber - b.episodeNumber;
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

// POST /api/media/scan-movies - NEW ENDPOINT
router.post('/scan-movies', (req, res) => {
  try {
    console.log('[MOVIE SCAN] Scanning movies directory...');
    
    // Get movies directory from config
    const moviesDir = config.MOVIES_DIR || 'S:/MEDIA/MOVIES';
    
    if (!fs.existsSync(moviesDir)) {
      return res.status(404).json({ success: false, error: `Movies directory not found: ${moviesDir}` });
    }
    
    // Read all JSON files to check which movies already have data
    let existingPosters = {};
    let existingCast = {};
    let existingDescriptions = {};
    
    const POSTER_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
    const CAST_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_cast_normalized.json');
    const DESC_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_descriptions_normalized.json');
    
    try {
      if (fs.existsSync(POSTER_FILE)) {
        existingPosters = JSON.parse(fs.readFileSync(POSTER_FILE, 'utf8'));
        console.log(`[MOVIE SCAN] Loaded ${Object.keys(existingPosters).length} existing posters`);
      }
    } catch (err) {
      console.warn('[MOVIE SCAN] Could not read movie_posters_normalized.json:', err.message);
    }
    
    try {
      if (fs.existsSync(CAST_FILE)) {
        existingCast = JSON.parse(fs.readFileSync(CAST_FILE, 'utf8'));
        console.log(`[MOVIE SCAN] Loaded ${Object.keys(existingCast).length} existing cast entries`);
      }
    } catch (err) {
      console.warn('[MOVIE SCAN] Could not read movie_cast_normalized.json:', err.message);
    }
    
    try {
      if (fs.existsSync(DESC_FILE)) {
        existingDescriptions = JSON.parse(fs.readFileSync(DESC_FILE, 'utf8'));
        console.log(`[MOVIE SCAN] Loaded ${Object.keys(existingDescriptions).length} existing descriptions`);
      }
    } catch (err) {
      console.warn('[MOVIE SCAN] Could not read movie_descriptions_normalized.json:', err.message);
    }
    
    // Scan directory for movie folders
    const movieFolders = fs.readdirSync(moviesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => /\([12]\d{3}\)/.test(dirent.name)) // Has year in parentheses
      .map(dirent => dirent.name);
    
    console.log(`[MOVIE SCAN] Found ${movieFolders.length} total movie folders`);
    
    // Find truly NEW movies (missing from ALL JSON files)
    const newMovies = movieFolders
      .filter(folderName => {
        // Normalize folder name to dot notation (all files now use same format)
        const normalizedName = folderName.replace(/\s+/g, '.').replace(/\.+/g, '.');
        
        // Check if movie has data in any of the three files
        const hasPoster = existingPosters.hasOwnProperty(normalizedName);
        const hasCast = existingCast.hasOwnProperty(normalizedName);
        const hasDescription = existingDescriptions.hasOwnProperty(normalizedName);
        
        // Movie is NEW if it's missing from ALL three files
        const isNew = !hasPoster && !hasCast && !hasDescription;
        
        console.log(`[MOVIE SCAN] ${folderName}: Poster=${hasPoster}, Cast=${hasCast}, Desc=${hasDescription} -> ${isNew ? 'NEW' : 'EXISTS'}`);
        
        return isNew;
      })
      .map(folderName => {
        // Extract title and year from folder name
        const titleMatch = folderName.match(/^(.+?)\s*\(([12]\d{3})\)/);
        const title = titleMatch ? titleMatch[1].trim() : folderName;
        const year = titleMatch ? titleMatch[2] : '';
        const absPath = path.join(moviesDir, folderName);
        
        return {
          title,
          year,
          absPath,
          folderName
        };
      });
    
    console.log(`[MOVIE SCAN] Found ${newMovies.length} TRULY NEW movies that need processing`);
    console.log(`[MOVIE SCAN] New movies:`, newMovies.map(m => m.title));
    
    // NEW: Update existing movies with new files (like colorized versions)
    console.log(`[MOVIE SCAN] Checking existing movies for new files...`);
    const updatedMovies = [];
    
    // Load the main movies JSON file to update existing entries
    const MOVIES_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');
    let moviesData = { folders: [] };
    
    try {
      if (fs.existsSync(MOVIES_JSON)) {
        moviesData = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
        console.log(`[MOVIE SCAN] Loaded ${moviesData.folders.length} existing movies from JSON`);
      }
    } catch (err) {
      console.warn('[MOVIE SCAN] Could not read media-library-movies_normalized.json:', err.message);
    }
    
    // Check each existing movie for new files
    for (const movie of moviesData.folders) {
      const movieFolderPath = path.join(moviesDir, movie.path);
      
      if (fs.existsSync(movieFolderPath)) {
        // Get all video files in the movie folder
        const videoFiles = fs.readdirSync(movieFolderPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile())
          .filter(dirent => /\.(mp4|mkv|avi|mov)$/i.test(dirent.name))
          .map(dirent => ({
            name: dirent.name,
            absPath: path.join(movieFolderPath, dirent.name),
            relPath: path.relative(moviesDir, path.join(movieFolderPath, dirent.name)).replace(/\\/g, '/')
          }));
        
        // Check if there are new files not in the current JSON
        const currentFileNames = movie.files.map(f => f.name);
        const newFiles = videoFiles.filter(file => !currentFileNames.includes(file.name));
        
        if (newFiles.length > 0) {
          console.log(`[MOVIE SCAN] Found ${newFiles.length} new files in "${movie.path}":`, newFiles.map(f => f.name));
          
          // Add new files to the movie entry
          movie.files.push(...newFiles);
          
          updatedMovies.push({
            title: movie.path,
            newFiles: newFiles.map(f => f.name),
            totalFiles: movie.files.length
          });
        }
      }
    }
    
    // Save updated movies data back to JSON
    if (updatedMovies.length > 0) {
      try {
        fs.writeFileSync(MOVIES_JSON, JSON.stringify(moviesData, null, 2));
        console.log(`[MOVIE SCAN] Updated ${updatedMovies.length} existing movies with new files`);
        console.log(`[MOVIE SCAN] Updated movies:`, updatedMovies.map(m => `${m.title} (+${m.newFiles.length} files)`));
      } catch (err) {
        console.error('[MOVIE SCAN] Failed to save updated movies JSON:', err.message);
      }
    }
    
    return res.json({
      success: true,
      data: {
        newMovies,
        updatedMovies,
        totalScanned: movieFolders.length,
        totalNew: newMovies.length,
        totalUpdated: updatedMovies.length,
        totalExisting: Object.keys(existingPosters).length,
        breakdown: {
          posters: Object.keys(existingPosters).length,
          cast: Object.keys(existingCast).length,
          descriptions: Object.keys(existingDescriptions).length
        }
      }
    });
    
  } catch (err) {
    console.error('[MOVIE SCAN] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ========================================
// BEGIN: AUDIO CONVERSION ENDPOINTS
// ========================================

// Scan for AC3 audio files
router.post('/scan-audio', async (req, res) => {
  try {
    const { scanPath } = req.body;
    
    if (!scanPath) {
      return res.status(400).json({ success: false, error: 'Scan path is required' });
    }

    console.log(`[AUDIO SCAN] Scanning directory: ${scanPath}`);

    if (!fs.existsSync(scanPath)) {
      return res.status(400).json({ success: false, error: 'Directory does not exist' });
    }

    const files = [];
    
    // Recursively scan for video files with AC3 audio
    function scanDirectory(dirPath) {
      try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scanDirectory(fullPath);
          } else if (stat.isFile() && /\.(mp4|mkv|avi|mov)$/i.test(item)) {
            // Check if file has AC3 audio using ffprobe
            try {
              const ffprobeOutput = execSync(`ffprobe -v quiet -print_format json -show_streams "${fullPath}"`, { encoding: 'utf8' });
              const streams = JSON.parse(ffprobeOutput).streams;
              
              const hasAC3 = streams.some(stream => 
                stream.codec_type === 'audio' && 
                stream.codec_name && 
                stream.codec_name.toLowerCase() === 'ac3'
              );
              
              if (hasAC3) {
                files.push({
                  name: item,
                  path: fullPath,
                  size: stat.size
                });
              }
            } catch (ffprobeError) {
              console.warn(`[AUDIO SCAN] Could not analyze ${item}:`, ffprobeError.message);
            }
          }
        }
      } catch (err) {
        console.warn(`[AUDIO SCAN] Error scanning directory ${dirPath}:`, err.message);
      }
    }

    scanDirectory(scanPath);

    console.log(`[AUDIO SCAN] Found ${files.length} files with AC3 audio`);
    
    return res.json({
      success: true,
      files: files
    });

  } catch (error) {
    console.error('[AUDIO SCAN] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Convert AC3 to AAC
router.post('/convert-audio', async (req, res) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'File path is required' });
    }

    console.log(`[AUDIO CONVERT] Converting: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ success: false, error: 'File does not exist' });
    }

    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const outputPath = path.join(dir, `${baseName}_converted${ext}`);

    // Use ffmpeg to convert AC3 to AAC
    const ffmpegCommand = `ffmpeg -i "${filePath}" -c:v copy -c:a aac -b:a 192k "${outputPath}"`;
    
    console.log(`[AUDIO CONVERT] Running: ${ffmpegCommand}`);
    
    exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`[AUDIO CONVERT] Error converting ${filePath}:`, error);
        return res.status(500).json({ success: false, error: error.message });
      }
      
      console.log(`[AUDIO CONVERT] Successfully converted: ${filePath} -> ${outputPath}`);
      
      return res.json({
        success: true,
        originalPath: filePath,
        convertedPath: outputPath
      });
    });

  } catch (error) {
    console.error('[AUDIO CONVERT] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// END: AUDIO CONVERSION ENDPOINTS
// ========================================

// --- NEW: Save poster to movie_posters.json ---
router.post('/save-poster', (req, res) => {
  const { absPath, poster } = req.body;
  if (!absPath || !poster) {
    return res.status(400).json({ success: false, error: 'Missing absPath or poster' });
  }
  
  console.log('[SAVE-POSTER] Received request:', { absPath, poster });
  
  // Normalize path: convert backslashes to forward slashes
  const normalizedPath = absPath.replace(/\\/g, '/');
  // Compute movie folder
  const movieFolder = path.dirname(normalizedPath);
  // Compute local poster path
  const posterFileName = 'poster.jpg';
  const posterFilePath = path.join(movieFolder, posterFileName);
  // Compute web-accessible path (relative to S:/MEDIA/MOVIES)
  let relPath = path.relative('S:/MEDIA/MOVIES', posterFilePath).replace(/\\/g, '/');
  const webPosterUrl = `/media/movies/${relPath}`;

  console.log('[SAVE-POSTER] Path analysis:', {
    absPath,
    normalizedPath,
    movieFolder,
    posterFilePath,
    relPath,
    webPosterUrl
  });

  // Download the image
  const download = (url, dest, cb) => {
    const file = require('fs').createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        require('fs').unlinkSync(dest);
        return cb(new Error('Failed to download image, status: ' + response.statusCode));
      }
      response.pipe(file);
      file.on('finish', () => file.close(cb));
    }).on('error', (err) => {
      file.close();
      require('fs').unlinkSync(dest);
      cb(err);
    });
  };

  download(poster, posterFilePath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Failed to download poster: ' + err.message });
    }
    // --- NEW WORKFLOW ---
    const NORMALIZED_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
    const NEW_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/newly_added_movies.json');
    // Use pretty name as key
    const folderName = path.basename(movieFolder);
    
    console.log('[SAVE-POSTER] Key generation:', {
      movieFolder,
      folderName,
      'normalizeKey(folderName)': normalizeKey(folderName)
    });
    
    // Validate the folder name - if it's "MOVIES", something is wrong
    if (folderName === 'MOVIES' || folderName === 'movies') {
      console.error('[SAVE-POSTER] ERROR: Invalid folder name detected:', folderName);
      console.error('[SAVE-POSTER] This suggests the absPath is malformed:', absPath);
      return res.status(500).json({ success: false, error: 'Invalid folder name detected. Check absPath format.' });
    }
    
    // Save to newly_added_movies.json
    let newEntries = {};
    if (fs.existsSync(NEW_FILE)) {
      newEntries = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
    }
    newEntries[folderName] = webPosterUrl;
    console.log('[DEBUG] Writing to newly_added_movies.json:', newEntries);
    fs.writeFileSync(NEW_FILE, JSON.stringify(newEntries, null, 2));
    // Merge into movie_posters_normalized.json
    let normalized = {};
    if (fs.existsSync(NORMALIZED_FILE)) {
      normalized = JSON.parse(fs.readFileSync(NORMALIZED_FILE, 'utf8'));
    }
    Object.assign(normalized, newEntries);
    console.log('[DEBUG] Writing to movie_posters_normalized.json:', normalized);
    fs.writeFileSync(NORMALIZED_FILE, JSON.stringify(normalized, null, 2));
    return res.json({ success: true });
  });
});

// --- NEW: Step 1 - Run scan_media_library_movies.js script ---
router.post('/step1-scan-app', async (req, res) => {
  try {
    console.log('[STEP1 SCAN] Starting scan_media_library_movies.js script...');
    
    // Import the scan script functionality
    const { exec } = require('child_process');
    const scriptPath = path.join(__dirname, '../../scripts/scan_media_library_movies.js');
    
    exec(`node "${scriptPath}"`, { cwd: path.join(__dirname, '../..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('[STEP1 SCAN] Script execution error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to run scan script', 
          details: error.message 
        });
      }
      
      if (stderr) {
        console.warn('[STEP1 SCAN] Script stderr:', stderr);
      }
      
      console.log('[STEP1 SCAN] Script output:', stdout);
      console.log('[STEP1 SCAN] Scan script completed successfully');
      
      return res.json({ 
        success: true, 
        message: 'App scan completed successfully',
        output: stdout
      });
    });
    
  } catch (err) {
    console.error('[STEP1 SCAN] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Save cast data endpoint
router.post('/save-cast-data', async (req, res) => {
  try {
    const castData = req.body;
    
    if (!castData || typeof castData !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid cast data' });
    }
    
    // Save cast data to file
    const castPath = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_cast_normalized.json');
    await fs.writeFile(castPath, JSON.stringify(castData, null, 2));
    
    console.log('[SAVE-CAST] Cast data saved successfully');
    res.json({ success: true, message: 'Cast data saved successfully' });
    
  } catch (error) {
    console.error('[SAVE-CAST] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fix missing cast profiles endpoint
router.post('/fix-cast-profiles', async (req, res) => {
  try {
    console.log('[FIX-CAST-PROFILES] Starting cast profiles fix...');
    
    // Import the cast fix script functionality
    const { exec } = require('child_process');
    const scriptPath = path.join(__dirname, '../../scripts/fetch_actor_profiles.js');
    
    exec(`node "${scriptPath}"`, { cwd: path.join(__dirname, '../..') }, (error, stdout, stderr) => {
      if (error) {
        console.error('[FIX-CAST-PROFILES] Script execution error:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to run cast fix script', 
          details: error.message 
        });
      }
      
      if (stderr) {
        console.warn('[FIX-CAST-PROFILES] Script stderr:', stderr);
      }
      
      console.log('[FIX-CAST-PROFILES] Script output:', stdout);
      console.log('[FIX-CAST-PROFILES] Cast fix script completed successfully');
      
      return res.json({ 
        success: true, 
        message: 'Cast profiles fix completed successfully',
        output: stdout
      });
    });
    
  } catch (err) {
    console.error('[FIX-CAST-PROFILES] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/fetch-tv-images
router.post('/fetch-tv-images', async (req, res) => {
  try {
    const { normalizedKey, tmdbId, showPath, showName } = req.body;
    if (!normalizedKey) {
      return res.status(400).json({ success: false, error: 'Missing normalizedKey' });
    }
    console.log('[FETCH-TV-IMAGES] NormalizedKey:', normalizedKey);
    
    // Use the showName directly from the frontend (more reliable than extracting from path)
    let originalShowName = showName || '';
    if (!originalShowName && showPath) {
      // Fallback: try to extract from showPath if showName is not provided
      originalShowName = path.basename(showPath);
    }
    if (!originalShowName) {
      // Final fallback: try to reverse the normalized key
      originalShowName = normalizedKey.replace(/\./g, ' ').replace(/\(/g, '(').replace(/\)/g, ')');
    }
    
    console.log('[FETCH-TV-IMAGES] Original show name:', originalShowName);
    
    // Build commands - using normalized scripts that output directly to normalized format
    const seasonCmd = `node scripts/SMART/SMART_fetch_tmdb_tv-show_season_images_normalized.js "${originalShowName}"`;
    const episodeCmd = `node scripts/SMART/SMART_fetch_tmdb_tv-show_episode_images_normalized.js "${originalShowName}"`;
    console.log('[FETCH-TV-IMAGES] Running:', seasonCmd);
    exec(seasonCmd, { cwd: path.join(__dirname, '../..') }, (err1, stdout1, stderr1) => {
      if (err1) {
        console.error('[FETCH-TV-IMAGES] Season script error:', stderr1);
        return res.status(500).json({ success: false, error: 'Season image script failed', stderr: stderr1 });
      }
      console.log('[FETCH-TV-IMAGES] Season script output:', stdout1);
      console.log('[FETCH-TV-IMAGES] Running:', episodeCmd);
      exec(episodeCmd, { cwd: path.join(__dirname, '../..') }, (err2, stdout2, stderr2) => {
        if (err2) {
          console.error('[FETCH-TV-IMAGES] Episode script error:', stderr2);
          return res.status(500).json({ success: false, error: 'Episode image script failed', stderr: stderr2 });
        }
        console.log('[FETCH-TV-IMAGES] Episode script output:', stdout2);
        
        // Check if the key exists in the normalized files (scripts already output normalized data)
        const seasonFile = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json');
        const episodeFile = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json');
        let seasonData = {};
        let episodeData = {};
        try {
          seasonData = JSON.parse(fs.readFileSync(seasonFile, 'utf8'));
        } catch (e) { seasonData = {}; }
        try {
          episodeData = JSON.parse(fs.readFileSync(episodeFile, 'utf8'));
        } catch (e) { episodeData = {}; }
        
        const hasSeason = !!seasonData[normalizedKey];
        const hasEpisode = !!episodeData[normalizedKey];
        
        if (!hasSeason && !hasEpisode) {
          return res.status(200).json({ success: false, error: `No images found for key: ${normalizedKey}` });
        }
        
        // Return the actual image data for display
        const seasonImages = hasSeason ? seasonData[normalizedKey] : null;
        const episodeImages = hasEpisode ? episodeData[normalizedKey] : null;
        
        return res.status(200).json({ 
          success: true, 
          season: hasSeason, 
          episode: hasEpisode,
          seasonImages: seasonImages,
          episodeImages: episodeImages
        });
      });
    });
  } catch (err) {
    console.error('[FETCH-TV-IMAGES] Fatal error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/media/get-tv-shows-list
router.get('/get-tv-shows-list', async (req, res) => {
  try {
    console.log('[GET-TV-SHOWS-LIST] Getting TV shows list...');
    
    const tvShowsPath = 'S:/MEDIA/TV-SHOWS';
    const tvShows = [];
    
    // Read the TV shows directory
    const items = fs.readdirSync(tvShowsPath, { withFileTypes: true });
    
    items.forEach(item => {
      if (item.isDirectory()) {
        const showPath = path.join(tvShowsPath, item.name);
        tvShows.push({
          name: item.name,
          path: showPath
        });
      }
    });
    
    // Sort alphabetically
    tvShows.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`[GET-TV-SHOWS-LIST] Found ${tvShows.length} TV shows`);
    
    return res.json({
      success: true,
      tvShows: tvShows
    });
    
  } catch (err) {
    console.error('[GET-TV-SHOWS-LIST] Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;