/*
  ADMIN.ROUTES.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const TMDBPosterService = require('../services/TMDBPosterService');
const Poster = require('../models/Poster');
const https = require('https');
const NormalizationService = require('../services/NormalizationService');

// Script runners
async function runTvShowsScan() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts/scan_media_library_tv-shows.js');
    const child = spawn('node', [scriptPath], { shell: true });
    let output = '';
    let error = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Script exited with code ${code}: ${error.trim()}`));
      }
    });
  });
}
async function runMoviesScan() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts/scan_media_library_movies.js');
    const child = spawn('node', [scriptPath], { shell: true });
    let output = '';
    let error = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Script exited with code ${code}: ${error.trim()}`));
      }
    });
  });
}
async function runEmbyPostersScan() {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts/scan_emby_posters.js');
    const child = spawn('node', [scriptPath], { shell: true });
    let output = '';
    let error = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Script exited with code ${code}: ${error.trim()}`));
      }
    });
  });
}
async function runDbCleanup() {
  // TODO: Implement actual DB cleanup logic
  return 'Database cleanup completed (placeholder)';
}
async function runCacheClear() {
  // TODO: Implement actual cache clear logic
  return 'Cache clear completed (placeholder)';
}
async function runSystemBackup() {
  // TODO: Implement actual system backup logic
  return 'System backup completed (placeholder)';
}

router.post('/run-script', async (req, res) => {
  const { script, parameters } = req.body;
  try {
    let output;
    
    // Handle legacy script names
    switch (script) {
      case 'tv-shows-scan':
        output = await runTvShowsScan();
        break;
      case 'movies-scan':
        output = await runMoviesScan();
        break;
      case 'emby-posters-scan':
        output = await runEmbyPostersScan();
        break;
      case 'db-cleanup':
        output = await runDbCleanup();
        break;
      case 'cache-clear':
        output = await runCacheClear();
        break;
      case 'system-backup':
        output = await runSystemBackup();
        break;
      default:
        // Handle script file names from ScriptManager
        if (script.endsWith('.js') || script.endsWith('.mjs')) {
          output = await runScriptFile(script, parameters);
        } else {
          return res.status(400).json({ success: false, error: 'Unknown script type' });
        }
    }
    res.json({ success: true, output });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generic script runner for any script file
async function runScriptFile(scriptName, parameters = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '../../scripts', scriptName);
    const args = [scriptPath];
    
    // Add parameters if provided
    if (parameters && Array.isArray(parameters)) {
      args.push(...parameters);
    }
    
    const child = spawn('node', args, { shell: true });
    let output = '';
    let error = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim() || 'Script completed successfully');
      } else {
        reject(new Error(`Script exited with code ${code}: ${error.trim()}`));
      }
    });
    
    child.on('error', (err) => {
      reject(new Error(`Failed to start script: ${err.message}`));
    });
  });
}

// System status endpoint
router.get('/system-status', (req, res) => {
  const uptime = process.uptime();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(1);
  const loadAvg = os.loadavg();
  const cpuCount = os.cpus().length;
  const status = {
    serverStatus: 'online',
    uptime,
    totalMem,
    freeMem,
    usedMem,
    memUsagePercent,
    loadAvg,
    cpuCount,
    timestamp: Date.now(),
  };
  res.json({ success: true, status });
});

// Script Manager endpoints
router.get('/scripts', async (req, res) => {
  try {
    const scriptsDir = path.join(__dirname, '../../scripts');
    const files = await fs.readdir(scriptsDir);
    const scripts = {};
    
    for (const file of files) {
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        const filePath = path.join(scriptsDir, file);
        const stats = await fs.stat(filePath);
        
        scripts[file] = {
          name: file,
          size: formatBytes(stats.size),
          modified: stats.mtime.toISOString(),
          category: getScriptCategory(file),
          description: getScriptDescription(file)
        };
      }
    }
    
    res.json(scripts);
  } catch (error) {
    console.error('Error reading scripts directory:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/script-content/:scriptName', async (req, res) => {
  try {
    const { scriptName } = req.params;
    const scriptPath = path.join(__dirname, '../../scripts', scriptName);
    
    // Security check: ensure the script is in the scripts directory
    const scriptsDir = path.join(__dirname, '../../scripts');
    const realScriptPath = await fs.realpath(scriptPath);
    const realScriptsDir = await fs.realpath(scriptsDir);
    
    if (!realScriptPath.startsWith(realScriptsDir)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const content = await fs.readFile(scriptPath, 'utf8');
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error reading script content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Log polling endpoint for live script output
router.get('/script-log', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, error: 'Missing script name' });
    const logPath = path.join(__dirname, '../../logs', `${name}.log`);
    let content = '';
    try {
      content = await fs.readFile(logPath, 'utf8');
    } catch (err) {
      // If file doesn't exist, return empty
      content = '';
    }
    res.json({ success: true, log: content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// TMDB Poster Endpoints
router.get('/tmdb/posters/tv', async (req, res) => {
    const query = req.query.query;
    if (!query) return res.status(400).json({ error: 'Missing query parameter' });
    try {
        const posters = await TMDBPosterService.searchTVShowOptions(query);
        res.json({ posters });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/tmdb/posters/movie', async (req, res) => {
    const { query, tmdbId } = req.query;
    if (!query && !tmdbId) return res.status(400).json({ error: 'Missing query or tmdbId parameter' });
    try {
        let posters;
        if (tmdbId) {
            // You may need to implement this in TMDBPosterService if not present
            posters = await TMDBPosterService.searchMovieById(tmdbId);
        } else {
            const { title, year } = TMDBPosterService.cleanMovieTitle(query);
            posters = await TMDBPosterService.searchMovieOptions(title, year);
        }
        res.json({ posters });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/tmdb/posters/selection', (req, res) => {
    const { type, id, poster } = req.body;
    if (!type || !id || !poster) return res.status(400).json({ error: 'Missing required fields' });
    let filepath;
    if (type === 'tv') {
        filepath = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/overrides/tv_poster_overrides.json');
    } else if (type === 'movie') {
        filepath = path.join(__dirname, '../../public/components/MediaLibrary/data/poster_overrides.json');
    } else {
        return res.status(400).json({ error: 'Invalid type' });
    }
    let overrides = TMDBPosterService.loadOverrides(filepath);
    overrides[id] = poster;
    const success = TMDBPosterService.saveOverrides(filepath, overrides);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to save override' });
    }
});

// Download and store poster image, update MongoDB
router.post('/posters/download', async (req, res) => {
  try {
    const { mediaType, mediaId, name, season, episode, tmdbPoster, isAlternative } = req.body;
    console.log('[POSTER DEBUG] Incoming mediaId:', mediaId);
    if (!mediaType || !mediaId || !name || !tmdbPoster || !tmdbPoster.poster_url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine base folder
    let basePath;
    if (mediaType === 'movie') {
      // Always resolve to the full movie folder path
      // If mediaId is just the folder name, prepend the root
      let folderName = mediaId;
      if (folderName.startsWith('movies/')) {
        folderName = folderName.replace(/^movies[\\/]/i, '');
      }
      basePath = path.join('S:/MEDIA/MOVIES', folderName);
      console.log('[POSTER DEBUG] Computed basePath:', basePath);
    } else if (mediaType === 'tv') {
      // For TV, use normalized name
      console.log('[POSTER DEBUG] Incoming TV show name:', name);
      const normalizedName = NormalizationService.createFolderName(name);
      console.log('[POSTER DEBUG] Normalized TV show folder:', normalizedName);
      basePath = path.join('S:/MEDIA/TV-SHOWS', normalizedName);
      console.log('[POSTER DEBUG] Computed basePath:', basePath);
    } else if (mediaType === 'season') {
      const normalizedName = NormalizationService.createFolderName(name);
      basePath = path.join('S:/MEDIA/TV-SHOWS', normalizedName, `Season ${season}`);
    } else if (mediaType === 'episode') {
      const normalizedName = NormalizationService.createFolderName(name);
      basePath = path.join('S:/MEDIA/TV-SHOWS', normalizedName, `Season ${season}`, `Episode ${episode}`);
    } else {
      return res.status(400).json({ error: 'Invalid mediaType' });
    }

    // Ensure folder exists (for TV/season/episode only)
    if (mediaType !== 'movie') {
      await fs.mkdir(basePath, { recursive: true });
    }

    // Determine filename for movies: poster.jpg, poster2.jpg, poster3.jpg, etc.
    let filename = 'poster.jpg';
    let posterType = 'main';
    if (mediaType === 'movie') {
      // Scan for existing poster files
      const files = await fs.readdir(basePath);
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
    } else if (isAlternative) {
      // Find next available alt slot for TV, etc.
      let altNum = 1;
      let altPath;
      do {
        altPath = path.join(basePath, `poster_alt${altNum}.jpg`);
        try { await fs.access(altPath); altNum++; } catch { break; }
      } while (true);
      filename = `poster_alt${altNum}.jpg`;
      posterType = 'alternative';
    }
    const filePath = path.join(basePath, filename);
    console.log('[POSTER DEBUG] Final filePath for poster:', filePath);

    // Download image directly to the correct folder
    await new Promise((resolve, reject) => {
      const file = require('fs').createWriteStream(filePath);
      https.get(tmdbPoster.poster_url, (response) => {
        if (response.statusCode !== 200) {
          console.error('[POSTER DEBUG] Failed to download image, status:', response.statusCode);
          return reject(new Error('Failed to download image'));
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => {
        fs.unlink(filePath);
        console.error('[POSTER DEBUG] Error during image download:', err);
        reject(err);
      });
    });

    // Update MongoDB Poster model
    let posterDoc = await Poster.findOne({ mediaType, mediaId });
    if (!posterDoc) {
      posterDoc = new Poster({
        mediaType,
        mediaId,
        localPosters: [],
        tmdbPosters: [],
        activePoster: '',
      });
    }
    // Add to localPosters
    posterDoc.localPosters.push({
      path: filePath,
      type: posterType,
      tmdbUrl: tmdbPoster.poster_url,
      tmdbMeta: tmdbPoster
    });
    // If main, set as activePoster
    if (posterType === 'main' || !posterDoc.activePoster) {
      posterDoc.activePoster = filePath;
    }
    // Add to tmdbPosters for provenance
    posterDoc.tmdbPosters.push({
      url: tmdbPoster.poster_url,
      type: posterType,
      meta: tmdbPoster
    });
    posterDoc.updatedAt = new Date();
    await posterDoc.save();

    // After downloading the image, update the mapping for movies
    if (mediaType === 'movie') {
      // Compute the web-accessible URL for the poster
      const relPath = path.relative('S:/MEDIA/MOVIES', filePath).replace(/\\/g, '/');
      const webPosterUrl = `/media/movies/${relPath}`;
      // Update movie_posters_normalized.json to point to the web URL
      const postersJsonPath = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
      let postersJson = {};
      try {
        if (require('fs').existsSync(postersJsonPath)) {
          postersJson = JSON.parse(require('fs').readFileSync(postersJsonPath, 'utf8'));
        }
      } catch (e) { postersJson = {}; }
      // Always use forward slashes in the key
      const normalizedMediaId = mediaId.replace(/\\/g, '/');
      postersJson[normalizedMediaId] = webPosterUrl;
      require('fs').writeFileSync(postersJsonPath, JSON.stringify(postersJson, null, 2));
    }
    // After downloading the image, update the mapping for TV shows
    if (mediaType === 'tv') {
      // Compute the web-accessible URL for the poster
      const relPath = path.relative('S:/MEDIA/TV-SHOWS', filePath).replace(/\\/g, '/');
      const webPosterUrl = `/media/tv-shows/${relPath}`;
      // Update tv_posters.json to point to the web URL
      const postersJsonPath = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv_posters.json');
      let postersJson = {};
      try {
        if (require('fs').existsSync(postersJsonPath)) {
          postersJson = JSON.parse(require('fs').readFileSync(postersJsonPath, 'utf8'));
        }
      } catch (e) { postersJson = {}; }
      // Always use forward slashes in the key
      const normalizedMediaId = mediaId.replace(/\\/g, '/');
      postersJson[normalizedMediaId] = webPosterUrl;
      require('fs').writeFileSync(postersJsonPath, JSON.stringify(postersJson, null, 2));
    }

    res.json({ success: true, filePath, posterType });
  } catch (err) {
    console.error('Poster download error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getScriptCategory(scriptName) {
  const categories = {
    'movies': [
      'scan_media_library_movies.js',
      'fetch_tv_posters.js',
      'convert_tv_posters.js',
      'check_audio_codecs_movies.js',
      'convert_audio_to_aac_movies.js'
    ],
    'tv-shows': [
      'scan_media_library_tv-shows.js',
      'fetch_tmdb_posters_tv-shows.js',
      'fetch_tmdb_tv-show_season_images.js',
      'fetch_tmdb_tv-show_episode_images.js',
      'download_tv_images.js',
      'setup_tmdb.js',
      'test_tv_images.js',
      'check_audio_codecs_tv-shows.js',
      'convert_audio_to_aac_tv-shows.js'
    ],
    'system': ['BACKUP_APP.js', 'RESTORE_BACKUP.js', 'RESTORE_APP.js', 'AI_BKUP.js', 'scan_media_library.js', 'scan_emby_posters.js', 'generate-superadmin-code.js', 'test-auth.js', 'check_video_player_setup.js', 'start-with-config.js', 'start-frontend-with-config.js'],
    'audio': ['convert_audio_to_aac.js', 'scan_audio_codecs.js', 'check_audio_codecs.js', 'convert_incompatible_audio.js'],
    'youtube': ['repopulate-youtube-cache.js', 'refresh-youtube-cache.js', 'migrate-youtube-queries.js', 'clear-youtube-cache.js', 'migrate_playlist_videos.js'],
    'fixes': ['fix_json_linebreaks.js', 'fix-joke-audio-syntax.js', 'fix-playNextInQueue-placement.js', 'fix-joke-audio-mode.js', 'fix-joke-audio-playback-v2.js', 'fix-joke-audio-playback.js', 'fix-enterAISpeakingMode-error.js', 'fix-duplicate-appjs.js', 'fix-duplicate-function-code.js', 'fix-api-urls.js'],
    'development': ['playlist-duration-backfill.js', 'merge-santana-json.js', 'merge-playlist-duplicates.js', 'convert_old_to_new_cachekeys_for_santanta.js', 'clean-localStorage-cache.js', 'update_release-notes_readme.mjs', 'update_headers.mjs', 'see_colors.js', 'refactor-api-calls.js', 'download-icons.js', 'download-mock-thumbs.js', 'VALIDATE_FUNCTIONS.js', 'test_script_manager.js', 'test_logging.js']
  };
  
  for (const [category, scripts] of Object.entries(categories)) {
    if (scripts.includes(scriptName)) {
      return category;
    }
  }
  
  return 'development'; // Default category
}

function getScriptDescription(scriptName) {
  const descriptions = {
    'download_tv_images.js': 'Download season and episode images from TMDb',
    'setup_tmdb.js': 'Setup TMDb API key and run image scripts',
    'test_tv_images.js': 'Test TV show image integration',
    'fetch_tmdb_tv-show_season_images.js': 'Fetch season poster image URLs from TMDb',
    'fetch_tmdb_tv-show_episode_images.js': 'Fetch episode still image URLs from TMDb',
    'fetch_tmdb_posters_tv-shows.js': 'Fetch TV show posters from TMDb',
    'scan_media_library_movies.js': 'Scan movie library for new content',
    'scan_media_library_tv-shows.js': 'Scan TV show library for new content',
    'BACKUP_APP.js': 'Create backup of the application',
    'RESTORE_BACKUP.js': 'Restore from backup',
    'convert_audio_to_aac.js': 'Convert audio files to AAC format',
    'repopulate-youtube-cache.js': 'Repopulate YouTube cache data',
    'clear-youtube-cache.js': 'Clear YouTube cache',
    'fix-duplicate-appjs.js': 'Fix duplicate app.js issues',
    'generate-superadmin-code.js': 'Generate superadmin access code',
    'test_script_manager.js': 'Test script for ScriptManager integration',
    'test_logging.js': 'Test script for logging and polling system',
    'check_audio_codecs_movies.js': 'Check audio codecs for all MOVIES (browser compatibility)',
    'convert_audio_to_aac_movies.js': 'Convert incompatible audio in MOVIES to AAC (browser compatible)',
    'check_audio_codecs_tv-shows.js': 'Check audio codecs for all TV SHOWS (browser compatibility)',
    'convert_audio_to_aac_tv-shows.js': 'Convert incompatible audio in TV SHOWS to AAC (browser compatible)'
  };
  
  return descriptions[scriptName] || 'Script for system maintenance';
}

module.exports = router; 