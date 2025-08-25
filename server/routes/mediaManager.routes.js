/*
  MEDIAMANAGER.ROUTES.JS
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
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

// POST /api/scan-movies
router.post('/scan-movies', async (req, res) => {
  try {
    console.log('[SCAN-MOVIES] Starting movie scan...');
    
    // Get the current state before scanning
    const outputFile = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');
    let beforeCount = 0;
    
    try {
      if (fs.existsSync(outputFile)) {
        const beforeData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        beforeCount = beforeData.folders ? beforeData.folders.length : 0;
        console.log(`[SCAN-MOVIES] Before scan: ${beforeCount} movies in database`);
      }
    } catch (e) {
      console.log('[SCAN-MOVIES] Could not read existing file, assuming 0 movies');
    }
    
    // Run the scan script
    const scriptPath = path.join(__dirname, '../../scripts/SCAN/SCAN_media_library_movies.js');
    
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ 
        success: false, 
        error: 'Scan script not found at: ' + scriptPath 
      });
    }
    
    // Execute the scan script
    let result;
    try {
      result = execSync(`node "${scriptPath}"`, { 
      encoding: 'utf8',
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe'
      });
    } catch (execError) {
      console.error('[SCAN-MOVIES] Script execution failed:', execError.message);
      console.error('[SCAN-MOVIES] Script stderr:', execError.stderr);
      console.error('[SCAN-MOVIES] Script stdout:', execError.stdout);
      return res.status(500).json({ 
        success: false, 
        error: 'Script execution failed: ' + execError.message,
        details: execError.stderr || execError.stdout
      });
    }
    
    console.log('[SCAN-MOVIES] Scan result:', result);
    
    // Get the state after scanning
    let afterCount = 0;
    try {
      if (fs.existsSync(outputFile)) {
        const afterData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
        afterCount = afterData.folders ? afterData.folders.length : 0;
        console.log(`[SCAN-MOVIES] After scan: ${afterCount} movies in database`);
      }
    } catch (e) {
      console.log('[SCAN-MOVIES] Could not read updated file');
    }
    
    // Calculate new movies
    const newMovies = Math.max(0, afterCount - beforeCount);
    console.log(`[SCAN-MOVIES] New movies detected: ${newMovies} (${afterCount} - ${beforeCount})`);
    
    return res.json({ 
      success: true, 
      message: 'Movie scan completed successfully',
      newMovies: newMovies,
      totalMovies: afterCount,
      output: result
    });
    
  } catch (error) {
    console.error('[SCAN-MOVIES] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      output: error.stdout || error.stderr || error.toString()
    });
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
      // --- SIMPLIFIED TV SHOW SAVE LOGIC ---
      const { tmdbId, title, year, description, cast, poster, showPath } = req.body;
      
      // Add debug logging
      console.log('[TV SAVE] Received data:');
      console.log('[TV SAVE] tmdbId:', tmdbId);
      console.log('[TV SAVE] title:', title);
      console.log('[TV SAVE] year:', year);
      console.log('[TV SAVE] description length:', description ? description.length : 0);
      console.log('[TV SAVE] cast length:', cast ? cast.length : 0);
      console.log('[TV SAVE] showPath:', showPath);
      
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
      
      // Clean up duplicate entries (remove old format entries that have new format equivalents)
      const cleanedTvData = [];
      const seenTitles = new Set();
      
      for (const show of tvData) {
        const showTitle = show.title || (show.path ? show.path.replace(/\s*\(\d{4}\)\s*$/, '') : '');
        const showYear = show.year || (show.path ? show.path.match(/\((\d{4})\)/)?.[1] : '');
        const titleKey = `${showTitle.toLowerCase()}_${showYear}`;
        
        if (!seenTitles.has(titleKey)) {
          seenTitles.add(titleKey);
          cleanedTvData.push(show);
        } else {
          console.log('[DEBUG - TV SAVE] Removing duplicate entry for:', showTitle, showYear);
        }
      }
      
      tvData = cleanedTvData;
      
      // Debug: Log existing shows with same title
      const existingShows = tvData.filter(show => show.title && show.title.toLowerCase() === title.toLowerCase());
      console.log('[DEBUG - TV SAVE] Existing shows with same title:', existingShows.map(s => ({ title: s.title, year: s.year, tmdbId: s.tmdbId })));
      
      // tvData should already be an array of show objects in normalized format
      // Find existing show by tmdbId or title+year combination
      let idx = -1;
      if (tmdbId) {
        idx = tvData.findIndex(show => show.tmdbId === tmdbId);
        console.log('[DEBUG - TV SAVE] Found by tmdbId:', idx !== -1 ? 'YES' : 'NO');
      }
      if (idx === -1) {
        // Try to find by title AND year to be more specific
        idx = tvData.findIndex(show => {
          const titleMatch = show.title && show.title.toLowerCase() === title.toLowerCase();
          const yearMatch = show.year === year;
          return titleMatch && yearMatch;
        });
        console.log('[DEBUG - TV SAVE] Found by title+year:', idx !== -1 ? 'YES' : 'NO');
      }
      if (idx === -1) {
        // Fallback to title only if no year match
        idx = tvData.findIndex(show => show.title && show.title.toLowerCase() === title.toLowerCase());
        console.log('[DEBUG - TV SAVE] Found by title only (fallback):', idx !== -1 ? 'YES' : 'NO');
      }
      
      // Also check for old format entries (with path and normalizedKey but no title)
      if (idx === -1) {
        const titleWithYear = year ? `${title} (${year})` : title;
        idx = tvData.findIndex(show => {
          // Check if this is an old format entry with path field
          if (show.path && !show.title) {
            return show.path.toLowerCase() === titleWithYear.toLowerCase();
          }
          return false;
        });
        console.log('[DEBUG - TV SAVE] Found by old format path:', idx !== -1 ? 'YES' : 'NO');
      }
      
      // SIMPLIFIED: Create show object with basic info only
      const showObj = { 
        tmdbId, 
        title, 
        year, 
        description, 
        cast, 
        poster, 
        showPath,
        path: showPath,
        folders: [], // Empty folders - will be populated by scan later
        files: []    // Empty files - will be populated by scan later
      };
      
      console.log('[TV SAVE] Created show object with basic info only');
      
      console.log('[TV SAVE] Saving show object with tmdbId:', showObj.tmdbId, 'year:', showObj.year);
      
      if (idx !== -1) {
        console.log('[TV SAVE] Updating existing show at index:', idx);
        tvData[idx] = showObj;
      } else {
        console.log('[TV SAVE] Adding new show');
        tvData.push(showObj);
      }
      fs.writeFileSync(TV_NORMALIZED_JSON, JSON.stringify(tvData, null, 2));
      // --- ALWAYS SAVE TO NORMALIZED FILES ---
      // Use the shared normalization service for consistency
      const { normalizeKey } = require('../../shared/NormalizationService.js');
      
      // For TV shows, include the year in the normalized key to match MediaLibrary expectations
      const titleWithYear = year ? `${title} (${year})` : title;
      const dotKey = normalizeKey(titleWithYear);
      
      // Add normalizedKey to the show object for consistency with existing format
      showObj.normalizedKey = dotKey;
      
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
    const { normalizedKey, poster, description, cast, title, year, tmdbId, absPath } = req.body;
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
    
    // Find the correct folder name from the file system
    let folderName = title; // Default to title
    let videoFiles = [];
    
    if (absPath) {
      // Extract folder name from the full path
      const movieDir = path.dirname(absPath);
      folderName = path.basename(movieDir);
      
      // Get video files from the folder
      try {
        const files = fs.readdirSync(movieDir, { withFileTypes: true })
          .filter(dirent => dirent.isFile())
          .filter(dirent => /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(dirent.name))
          .map(dirent => ({
            name: dirent.name,
            absPath: path.join(movieDir, dirent.name),
            relPath: path.join(folderName, dirent.name)
          }));
        videoFiles = files;
        console.log(`[SAVE] Found ${videoFiles.length} video files for ${folderName}`);
      } catch (e) {
        console.warn(`[SAVE] Could not read video files for ${folderName}:`, e.message);
      }
    }
    
    // Create the new movie folder structure
    const newMovie = {
      path: folderName,
      normalizedKey: normalizedKey,
      tmdbId: tmdbId || null,
      absPath: absPath, // Include the absolute path for the movie folder
      folders: [],
      files: videoFiles
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
    // --- Poster mapping and download ---
    if (poster && poster.startsWith('http')) {
      try {
        // Compute web-accessible path (simulate as before)
        const webPosterUrl = poster;
        
        // --- Download poster to file system with proper naming ---
        if (absPath) {
          const movieDir = path.dirname(absPath);
          
          // Determine filename for movies: poster.jpg, poster2.jpg, poster3.jpg, etc.
          let filename = 'poster.jpg';
          try {
            // Scan for existing poster files
            const files = fs.readdirSync(movieDir);
            const posterFiles = files.filter(f => /^poster(\d*)\.jpg$/i.test(f));
            let maxNum = 1;
            posterFiles.forEach(f => {
              const match = f.match(/^poster(\d*)\.jpg$/i);
              if (match) {
                const num = match[1] ? parseInt(match[1], 10) : 1;
                if (num >= maxNum) maxNum = num;
              }
            });
            // Next poster number
            filename = maxNum === 1 && !posterFiles.includes('poster.jpg') ? 'poster.jpg' : `poster${maxNum + 1}.jpg`;
          } catch (e) {
            console.warn('[MEDIA SAVE] Could not scan for existing posters, using poster.jpg:', e.message);
          }
          
          const posterFilePath = path.join(movieDir, filename);
          
          console.log('[MEDIA SAVE] Downloading poster to file system:', posterFilePath);
          
          // Download the image
          const download = (url, dest, cb) => {
            const file = require('fs').createWriteStream(dest);
            
            // Choose HTTP or HTTPS based on URL protocol
            const httpModule = url.startsWith('https://') ? require('https') : require('http');
            
            httpModule.get(url, (response) => {
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
              console.error('[MEDIA SAVE] Poster download failed:', err.message);
              // Don't fail the entire save operation, just log the error
            } else {
              console.log('[MEDIA SAVE] Poster downloaded successfully to:', posterFilePath);
              
              // Verify the file was actually created
              if (fs.existsSync(posterFilePath)) {
                console.log('[MEDIA SAVE] Poster file verified:', posterFilePath);
                
                // Update the poster URL to point to the local file
                const relPath = path.relative('S:/MEDIA/MOVIES', posterFilePath).replace(/\\/g, '/');
                const localPosterUrl = `/media/movies/${relPath}`;
                console.log('[MEDIA SAVE] Updated poster URL to local file:', localPosterUrl);
                
                // Update the poster mapping to use the local file URL
                webPosterUrl = localPosterUrl;
              } else {
                console.error('[MEDIA SAVE] ERROR: Poster file was not created after download');
              }
            }
          });
        }
        
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

// GET /api/media/fetch-episode-still
router.get('/fetch-episode-still', async (req, res) => {
  try {
    const { tmdbId, season, episode } = req.query;
    
    if (!tmdbId || !season || !episode) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: tmdbId, season, episode' });
    }
    
    if (!TMDB_API_KEY) {
      console.error('[FETCH-EPISODE-STILL] ERROR: TMDB_API_KEY is missing!');
      return res.status(500).json({ success: false, error: 'TMDB API key not found' });
    }
    
    console.log(`[FETCH-EPISODE-STILL] Fetching still for TMDB ID: ${tmdbId}, Season: ${season}, Episode: ${episode}`);
    
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[FETCH-EPISODE-STILL] TMDB API error:', data);
      return res.status(404).json({ success: false, error: 'Episode not found on TMDB' });
    }
    
    if (data.still_path) {
      const stillUrl = `https://image.tmdb.org/t/p/w500${data.still_path}`;
      console.log(`[FETCH-EPISODE-STILL] Found still: ${stillUrl}`);
      return res.json({ success: true, stillUrl: stillUrl });
    } else {
      console.log(`[FETCH-EPISODE-STILL] No still found for S${season}E${episode}`);
      return res.json({ success: false, stillUrl: null });
    }
    
  } catch (err) {
    console.error('[FETCH-EPISODE-STILL] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/save-episode-images
router.post('/save-episode-images', async (req, res) => {
  try {
    const { normalizedKey, episodeImagesData } = req.body;
    
    if (!normalizedKey || !episodeImagesData) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: normalizedKey, episodeImagesData' });
    }
    
    console.log(`[SAVE-EPISODE-IMAGES] Saving episode images for: ${normalizedKey}`);
    
    const episodeImagesPath = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json');
    
    // Load existing data
    let existingData = {};
    if (fs.existsSync(episodeImagesPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(episodeImagesPath, 'utf8'));
      } catch (e) {
        console.warn('[SAVE-EPISODE-IMAGES] Could not parse existing episode images JSON, starting fresh');
        existingData = {};
      }
    }
    
    // Merge the new data with existing data
    const mergedData = { ...existingData, ...episodeImagesData };
    
    // Save the merged data
    fs.writeFileSync(episodeImagesPath, JSON.stringify(mergedData, null, 2));
    
    console.log(`[SAVE-EPISODE-IMAGES] Successfully saved episode images for: ${normalizedKey}`);
    return res.json({ success: true, message: 'Episode images saved successfully' });
    
  } catch (err) {
    console.error('[SAVE-EPISODE-IMAGES] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/media/fetch-season-poster
router.get('/fetch-season-poster', async (req, res) => {
  try {
    const { tmdbId, season } = req.query;
    
    if (!tmdbId || !season) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: tmdbId, season' });
    }
    
    if (!TMDB_API_KEY) {
      console.error('[FETCH-SEASON-POSTER] ERROR: TMDB_API_KEY is missing!');
      return res.status(500).json({ success: false, error: 'TMDB API key not found' });
    }
    
    console.log(`[FETCH-SEASON-POSTER] Fetching poster for TMDB ID: ${tmdbId}, Season: ${season}`);
    
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('[FETCH-SEASON-POSTER] TMDB API error:', data);
      return res.status(404).json({ success: false, error: 'Season not found on TMDB' });
    }
    
    if (data.poster_path) {
      const posterUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
      console.log(`[FETCH-SEASON-POSTER] Found poster: ${posterUrl}`);
      return res.json({ success: true, posterUrl: posterUrl });
    } else {
      console.log(`[FETCH-SEASON-POSTER] No poster found for Season ${season}`);
      return res.json({ success: false, posterUrl: null });
    }
    
  } catch (err) {
    console.error('[FETCH-SEASON-POSTER] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/save-season-images
router.post('/save-season-images', async (req, res) => {
  try {
    const { normalizedKey, seasonImagesData } = req.body;
    
    if (!normalizedKey || !seasonImagesData) {
      return res.status(400).json({ success: false, error: 'Missing required parameters: normalizedKey, seasonImagesData' });
    }
    
    console.log(`[SAVE-SEASON-IMAGES] Saving season images for: ${normalizedKey}`);
    
    const seasonImagesPath = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json');
    
    // Load existing data
    let existingData = {};
    if (fs.existsSync(seasonImagesPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(seasonImagesPath, 'utf8'));
      } catch (e) {
        console.warn('[SAVE-SEASON-IMAGES] Could not parse existing season images JSON, starting fresh');
        existingData = {};
      }
    }
    
    // Merge the new data with existing data
    const mergedData = { ...existingData, ...seasonImagesData };
    
    // Save the merged data
    fs.writeFileSync(seasonImagesPath, JSON.stringify(mergedData, null, 2));
    
    console.log(`[SAVE-SEASON-IMAGES] Successfully saved season images for: ${normalizedKey}`);
    return res.json({ success: true, message: 'Season images saved successfully' });
    
  } catch (err) {
    console.error('[SAVE-SEASON-IMAGES] Error:', err);
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
      .filter(dirent => {
        // Support both "Season 01" and "S01" formats
        return /season\s*\d+/i.test(dirent.name) || /^s\d+/i.test(dirent.name);
      });
    seasonFolders.forEach(seasonFolder => {
      const seasonPath = path.join(showPath, seasonFolder.name);
      // Support both "Season 01" and "S01" formats for season number extraction
      let seasonMatch = seasonFolder.name.match(/season\s*(\d+)/i);
      if (!seasonMatch) {
        seasonMatch = seasonFolder.name.match(/^s(\d+)/i);
      }
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

// POST /api/media/scan-tv-folders - NEW ENDPOINT that returns folder structure directly
router.post('/scan-tv-folders', (req, res) => {
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
    
    // Scan for season folders and return folder structure directly
    const folders = [];
    const files = [];
    const showDir = fs.readdirSync(showPath, { withFileTypes: true });
    const seasonFolders = showDir
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => {
        // Support both "Season 01" and "S01" formats
        return /season\s*\d+/i.test(dirent.name) || /^s\d+/i.test(dirent.name);
      });
    
    // If we have season folders, create folder structure
    if (seasonFolders.length > 0) {
      seasonFolders.forEach(seasonFolder => {
        const seasonPath = path.join(showPath, seasonFolder.name);
        const seasonFiles = [];
        
        const files = fs.readdirSync(seasonPath, { withFileTypes: true })
          .filter(dirent => dirent.isFile())
          .filter(dirent => /\.(mp4|mkv|avi|mov)$/i.test(dirent.name));
          
        files.forEach(file => {
          const filePath = path.join(seasonPath, file.name);
          const relPath = path.relative(showPath, filePath).replace(/\\/g, '/');
          
          // Extract episode number from filename
          const epMatch = file.name.match(/E(\d{1,2})/i);
          const episodeNumber = epMatch ? parseInt(epMatch[1], 10) : undefined;
          
          seasonFiles.push({
            filename: file.name,
            name: file.name,
            filePath: filePath,
            absPath: filePath,
            relPath: relPath,
            episodeNumber: episodeNumber
          });
        });
        
        // Sort episodes by episode number
        seasonFiles.sort((a, b) => {
          if (!a.episodeNumber && !b.episodeNumber) return 0;
          if (!a.episodeNumber) return 1;
          if (!b.episodeNumber) return -1;
          return a.episodeNumber - b.episodeNumber;
        });
        
        folders.push({
          path: seasonFolder.name,
          files: seasonFiles
        });
      });
    } else {
      // No season folders found, check for files in root
      const rootFiles = showDir
        .filter(dirent => dirent.isFile())
        .filter(dirent => /\.(mp4|mkv|avi|mov)$/i.test(dirent.name));
        
      if (rootFiles.length > 0) {
        // Group episodes by season number from filename
        const episodesBySeason = {};
        
        rootFiles.forEach(file => {
          const filePath = path.join(showPath, file.name);
          const relPath = path.relative(showPath, filePath).replace(/\\/g, '/');
          
          // Extract season and episode numbers from filename
          const seasonMatch = file.name.match(/S(\d{1,2})/i);
          const epMatch = file.name.match(/E(\d{1,2})/i);
          const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;
          const episodeNumber = epMatch ? parseInt(epMatch[1], 10) : undefined;
          
          if (!episodesBySeason[seasonNumber]) {
            episodesBySeason[seasonNumber] = [];
          }
          
          episodesBySeason[seasonNumber].push({
            filename: file.name,
            name: file.name,
            filePath: filePath,
            absPath: filePath,
            relPath: relPath,
            episodeNumber: episodeNumber
          });
        });
        
        // Create virtual season folders for each season found
        Object.keys(episodesBySeason).sort((a, b) => parseInt(a) - parseInt(b)).forEach(seasonNum => {
          const seasonEpisodes = episodesBySeason[seasonNum];
          
          // Sort episodes by episode number
          seasonEpisodes.sort((a, b) => {
            if (!a.episodeNumber && !b.episodeNumber) return 0;
            if (!a.episodeNumber) return 1;
            if (!b.episodeNumber) return -1;
            return a.episodeNumber - b.episodeNumber;
          });
          
          folders.push({
            path: `Season ${seasonNum.padStart(2, '0')}`,
            files: seasonEpisodes
          });
        });
      }
    }
    
    // ALWAYS return a proper folder structure - never flat files
    // If we have files in root, they should be organized into seasons
    const finalFolders = [...folders];
    
    // If we have any files in the root, organize them into seasons
    if (files.length > 0) {
      // Group files by season number
      const episodesBySeason = {};
      
      files.forEach(file => {
        const seasonMatch = file.name.match(/S(\d{1,2})/i);
        const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;
        
        if (!episodesBySeason[seasonNumber]) {
          episodesBySeason[seasonNumber] = [];
        }
        episodesBySeason[seasonNumber].push(file);
      });
      
      // Create season folders for any remaining files
      Object.keys(episodesBySeason).sort((a, b) => parseInt(a) - parseInt(b)).forEach(seasonNum => {
        const seasonEpisodes = episodesBySeason[seasonNum];
        
        // Sort episodes by episode number
        seasonEpisodes.sort((a, b) => {
          if (!a.episodeNumber && !b.episodeNumber) return 0;
          if (!a.episodeNumber) return 1;
          if (!b.episodeNumber) return -1;
          return a.episodeNumber - b.episodeNumber;
        });
        
        finalFolders.push({
          path: `Season ${seasonNum.padStart(2, '0')}`,
          files: seasonEpisodes
        });
      });
    }
    
    return res.json({
      success: true,
      data: {
        showPath,
        folders: finalFolders,
        files: [], // NEVER return files in root - always organize into folders
        totalSeasons: finalFolders.length,
        totalEpisodes: finalFolders.reduce((sum, f) => sum + f.files.length, 0)
      }
    });
  } catch (err) {
    console.error('[TV FOLDERS SCAN] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/ensure-movie - Ensure a specific movie exists in JSON without overwriting
router.post('/ensure-movie', async (req, res) => {
  try {
    const { moviePath, title } = req.body;
    console.log(`[ENSURE-MOVIE] Ensuring movie exists: ${title} at ${moviePath}`);
    
    if (!moviePath || !title) {
      return res.status(400).json({ 
        success: false, 
        error: 'moviePath and title are required' 
      });
    }
    
    // Handle both full paths and just titles
    let folderName;
    if (moviePath.includes('S:/MEDIA/MOVIES') || moviePath.includes('S:\\MEDIA\\MOVIES')) {
      // Full path provided - extract folder name
      folderName = moviePath.split(/[\\/]/).slice(-2, -1)[0] || moviePath.split(/[\\/]/).pop();
    } else {
      // Just title provided - need to find the matching folder
      console.log(`[ENSURE-MOVIE] Searching for folder matching title: ${title}`);
      
      // Read the movies directory to find matching folder
      const moviesRoot = 'S:/MEDIA/MOVIES';
      try {
        const allFolders = fs.readdirSync(moviesRoot, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        // Look for folder that contains the title
        const matchingFolder = allFolders.find(folder => 
          folder.toLowerCase().includes(title.toLowerCase()) ||
          title.toLowerCase().includes(folder.toLowerCase())
        );
        
        if (matchingFolder) {
          folderName = matchingFolder;
          console.log(`[ENSURE-MOVIE] Found matching folder: ${folderName}`);
        } else {
          console.log(`[ENSURE-MOVIE] No matching folder found for title: ${title}`);
          console.log(`[ENSURE-MOVIE] Available folders (first 10):`, allFolders.slice(0, 10));
          return res.status(404).json({ 
            success: false, 
            error: `No folder found matching title: ${title}` 
          });
        }
      } catch (e) {
        console.error('[ENSURE-MOVIE] Error reading movies directory:', e.message);
        return res.status(500).json({ 
          success: false, 
          error: 'Could not read movies directory' 
        });
      }
    }
    
    const movieDir = path.join('S:/MEDIA/MOVIES', folderName);
    
    console.log(`[ENSURE-MOVIE] Looking for folder: ${folderName}`);
    console.log(`[ENSURE-MOVIE] Full directory path: ${movieDir}`);
    
    // Check if the movie folder exists
    if (!fs.existsSync(movieDir)) {
      return res.status(404).json({ 
        success: false, 
        error: `Movie folder not found: ${folderName}` 
      });
    }
    
    // Get video files in the folder
    const videoFiles = fs.readdirSync(movieDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile())
      .filter(dirent => /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(dirent.name))
      .map(dirent => ({
        name: dirent.name,
        absPath: path.join(movieDir, dirent.name),
        relPath: path.join(folderName, dirent.name)
      }));
    
    if (videoFiles.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: `No video files found in folder: ${folderName}` 
      });
    }
    
    console.log(`[ENSURE-MOVIE] Found ${videoFiles.length} video files`);
    
    // Load the movies JSON file
    const outputFile = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');
    let moviesData = { folders: [] };
    
    try {
      if (fs.existsSync(outputFile)) {
        moviesData = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      }
    } catch (e) {
      console.error('[ENSURE-MOVIE] Could not read movies JSON:', e.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Could not read movies database' 
      });
    }
    
    // Create normalized key
    const normalizedKey = normalizeKey(folderName);
    
    // Check if movie already exists
    const existingMovie = moviesData.folders.find(movie => 
      movie.normalizedKey === normalizedKey || movie.path === folderName
    );
    
    if (existingMovie) {
      // Movie exists, ensure it has video files and correct path
      if (!existingMovie.files || existingMovie.files.length === 0) {
        existingMovie.files = videoFiles;
        console.log('[ENSURE-MOVIE] Updated existing movie with video files');
      }
      // Also ensure the path is correct (full folder name)
      if (existingMovie.path !== folderName) {
        existingMovie.path = folderName;
        console.log(`[ENSURE-MOVIE] Updated movie path from "${existingMovie.path}" to "${folderName}"`);
      }
    } else {
      // Movie doesn't exist, add it
      const newMovie = {
        path: folderName,
        normalizedKey: normalizedKey,
        tmdbId: null, // Will be set when metadata is added
        absPath: absPath, // Include the absolute path for the movie folder
        folders: [],
        files: videoFiles
      };
      
      moviesData.folders.push(newMovie);
      console.log('[ENSURE-MOVIE] Added new movie entry');
    }
    
    // Save the updated JSON
    try {
      fs.writeFileSync(outputFile, JSON.stringify(moviesData, null, 2));
      console.log('[ENSURE-MOVIE] Successfully updated movies JSON');
    } catch (e) {
      console.error('[ENSURE-MOVIE] Failed to save movies JSON:', e.message);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to save movies database' 
      });
    }
    
    return res.json({
      success: true,
      message: 'Movie entry ensured successfully',
      moviePath: folderName,
      videoFiles: videoFiles.length
    });
    
  } catch (error) {
    console.error('[ENSURE-MOVIE] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
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
    
    // Choose HTTP or HTTPS based on URL protocol
    const httpModule = url.startsWith('https://') ? require('https') : require('http');
    
    httpModule.get(url, (response) => {
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

  console.log('[SAVE-POSTER] Starting download from:', poster, 'to:', posterFilePath);
  
  download(poster, posterFilePath, (err) => {
    if (err) {
      console.error('[SAVE-POSTER] Download failed:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to download poster: ' + err.message });
    }
    
    console.log('[SAVE-POSTER] Download completed successfully');
    
    // Verify the file was actually created
    if (!fs.existsSync(posterFilePath)) {
      console.error('[SAVE-POSTER] ERROR: File was not created after download');
      return res.status(500).json({ success: false, error: 'Poster file was not created after download' });
    }
    
    console.log('[SAVE-POSTER] Poster file verified:', posterFilePath);
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
    
    // Helper function to extract year from folder name
    function extractYear(folderName) {
      const yearMatch = folderName.match(/\((\d{4})\)/);
      return yearMatch ? yearMatch[1] : "Unknown";
    }
    
    // Helper function to generate clean, short keys like existing unified data
    function generateCleanKey(folderName) {
      // Keep year but remove quality and other metadata
      let cleanTitle = folderName
        .replace(/\s*\[.*?\]\s*/g, '') // Remove quality tags like [1080p]
        .replace(/\s*\.\d{4}\.\d{3,4}p\s*/g, '') // Remove .2005.1080p
        .trim();
      
      // Convert to lowercase and replace spaces with dots
      let key = cleanTitle.toLowerCase().replace(/\s+/g, '.');
      
      // Remove special characters but keep dots and parentheses
      key = key.replace(/[^\w.()]/g, '');
      
      // Ensure it's not empty
      if (!key) key = 'movie';
      
      console.log('[DEBUG] Generated key:', { folderName, cleanTitle, key });
      return key;
    }
    
    // UPDATED: Save to unified data structure instead of old format
    const UNIFIED_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movies-unified.json');
    
    // Create new movie entry in unified format
    const newMovieEntry = {
      type: "movie",
      title: folderName,
      TMDBTitle: folderName,
      tmdbId: null, // Will be populated when TMDB data is added
      poster: webPosterUrl,
      about: {
        title: folderName,
        year: extractYear(folderName),
        description: "Description will be added when TMDB data is imported"
      },
      genres: [],
      cast: {
        title: folderName,
        year: extractYear(folderName),
        cast: []
      },
      path: folderName,
      originalKey: folderName.toLowerCase().replace(/[^\w\s]/g, '.').replace(/\s+/g, '.'),
      normalizedKey: generateCleanKey(folderName),
      files: [
        {
          name: `${folderName}.mp4`, // Placeholder filename
          absPath: `S:\\MEDIA\\MOVIES\\${folderName}\\${folderName}.mp4`, // Placeholder path
          relPath: `${folderName}\\${folderName}.mp4`
        }
      ],
      isMovie: true,
      seasons: null
    };
    
    // Load existing unified data
    let unifiedData = {};
    if (fs.existsSync(UNIFIED_FILE)) {
      unifiedData = JSON.parse(fs.readFileSync(UNIFIED_FILE, 'utf8'));
    }
    
    // Add new movie to unified data
    const movieKey = newMovieEntry.normalizedKey;
    unifiedData[movieKey] = newMovieEntry;
    
    console.log('[DEBUG] Adding new movie to unified data:', movieKey);
    console.log('[DEBUG] Writing to movies-unified.json');
    
    // Save updated unified data
    fs.writeFileSync(UNIFIED_FILE, JSON.stringify(unifiedData, null, 2));
    
    // Also save to newly_added_movies.json for backward compatibility
    let newEntries = {};
    if (fs.existsSync(NEW_FILE)) {
      newEntries = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
    }
    newEntries[folderName] = webPosterUrl;
    console.log('[DEBUG] Writing to newly_added_movies.json:', newEntries);
    fs.writeFileSync(NEW_FILE, JSON.stringify(newEntries, null, 2));
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
    
    // If we have a year in the normalizedKey, make sure it's included in the show name
    if (normalizedKey.includes('(2018)') && !originalShowName.includes('(2018)')) {
      originalShowName = originalShowName + ' (2018)';
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

// Add this new route for auto-processing TV shows
router.post('/auto-process-tv-show', async (req, res) => {
    try {
        console.log('[AUTO-PROCESS] Received auto-process request:', req.body);
        
        const { showPath, tmdbDetails, normalizedKey } = req.body;
        
        if (!showPath || !tmdbDetails || !normalizedKey) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: showPath, tmdbDetails, or normalizedKey'
            });
        }

        // Import the automated processor
        const AutomatedTVShowProcessor = require('../../scripts/SMART/SMART_automated_tv_show_processor.js');
        const processor = new AutomatedTVShowProcessor();
        
        // Initialize the processor
        await processor.init();
        
        // Process the show
        const success = await processor.processShow(showPath);
        
        if (success) {
            console.log('[AUTO-PROCESS] Successfully processed TV show:', showPath);
            res.json({
                success: true,
                message: 'TV show auto-processed successfully',
                normalizedKey: normalizedKey
            });
        } else {
            console.log('[AUTO-PROCESS] Failed to process TV show:', showPath);
            res.json({
                success: false,
                message: 'Failed to auto-process TV show',
                normalizedKey: normalizedKey
            });
        }
        
    } catch (error) {
        console.error('[AUTO-PROCESS] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Add this new route for auto-detecting new TV shows
router.post('/auto-detect-new-shows', async (req, res) => {
    try {
        console.log('[AUTO-DETECT] Received auto-detect request');
        
        // Import the integration processor
        const MediaManagerIntegration = require('../../scripts/SMART/SMART_media_manager_integration.js');
        const integration = new MediaManagerIntegration();
        
        // Initialize the integration
        await integration.init();
        
        // Detect new shows
        const newShows = await integration.detectNewShows();
        
        if (newShows.length > 0) {
            console.log('[AUTO-DETECT] Found new shows:', newShows);
            
            // Process the new shows
            const result = await integration.processNewShows(newShows);
            
            res.json({
                success: true,
                message: `Found and processed ${newShows.length} new TV show(s)`,
                newShows: newShows.map(show => require('path').basename(show)),
                processed: result.processed,
                failed: result.failed
            });
        } else {
            console.log('[AUTO-DETECT] No new shows found');
            res.json({
                success: true,
                message: 'No new TV shows detected',
                newShows: [],
                processed: 0,
                failed: 0
            });
        }
        
    } catch (error) {
        console.error('[AUTO-DETECT] Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;