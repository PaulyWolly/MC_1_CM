/*
  INTERACTIVE_MOVIE_POSTER_SELECTOR.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

/**
 * Interactive Movie Poster Selector
 * 
 * This script creates a web-based interface to browse and select
 * the correct movie poster images from TMDb. It shows multiple
 * poster options for each movie and allows visual selection.
 * 
 * Features:
 * - Scans movie library for all video files
 * - Fetches multiple poster options from TMDb for each movie
 * - Displays posters in a visual grid interface
 * - Allows selection of preferred poster for each movie
 * - Saves selections to poster_overrides.json
 * - Integrates with existing movie poster fetching system
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const express = require('express');
const { spawn } = require('child_process');
const { normalizeKey } = require('../shared/NormalizationService');
// Use normalizeKey for all mapping key normalization in this file.

// Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MOVIE_DIR = 'S:/MEDIA/movies/';
const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data');
const OVERRIDES_PATH = path.join(DATA_DIR, 'poster_overrides.json');
const TEMP_DATA_PATH = path.join(DATA_DIR, 'temp_poster_selections.json');

// Express app for the web interface
const app = express();
const PORT = 3001;

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

const VIDEO_EXTS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

function isVideoFile(filename) {
    return VIDEO_EXTS.includes(path.extname(filename).toLowerCase());
}

function scanDir(dir) {
    let results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results = results.concat(scanDir(fullPath));
            } else if (entry.isFile() && isVideoFile(entry.name)) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        console.warn(`⚠️ Could not scan directory ${dir}: ${error.message}`);
    }
    return results;
}

function cleanTitle(filename) {
    let name = path.basename(filename, path.extname(filename));
    
    // Replace dots and underscores with spaces
    name = name.replace(/[._]/g, ' ');
    
    // Remove year and anything after (but keep year for search)
    const yearMatch = name.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : null;
    
    // Remove technical tags and extra info
    name = name.replace(/\b(720p|1080p|2160p|4k|bluray|brrip|web-dl|web|hdtv|dvdrip|yify|x264|x265|aac|mp3|dts|eac3|ac3|flac|truehd|atmos|10bit|5\.1|7\.1|yts|yts\.mx|yts\.ag|yts\.am|rarbg|hdrip|bdrip|repack|extended|remastered|uncut|proper|limited|internal|dual|audio|subs|eng|ita|spa|fre|ger|rus|jpn|kor|chi|fr|es|de|ru|jp|kr|cn|mx|am|ag|lt|gaz|bokutox|lama|ptp|h264|h265|hevc|web-dl|webdl|web-rip|webrip|dvdr|dvdscr|dvdscreener|cam|ts|tc|r5|scr|unrated|director\.s\.cut|remux|criterion|multi|multi\.audio|multi\.subs|multi\.language|multi\.lang|fixed|amzn|dd|h\.264|playweb)\b/gi, '');
    
    // Clean up extra spaces and special characters
    name = name.replace(/\W+/g, ' ');
    name = name.replace(/\s+/g, ' ').trim();
    
    return { title: name, year: year };
}

function extractYear(str) {
    const match = str.match(/(19|20)\d{2}/);
    return match ? match[0] : null;
}

async function searchMovieOptions(title, year) {
    try {
        let searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
        if (year) {
            searchUrl += `&year=${year}`;
        }
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // Get up to 5 movie results
            const movies = data.results.slice(0, 5);
            const options = [];
            
            for (const movie of movies) {
                if (movie.poster_path) {
                    // Get additional images for this movie
                    const imagesUrl = `${TMDB_BASE_URL}/movie/${movie.id}/images?api_key=${TMDB_API_KEY}`;
                    const imagesResponse = await fetch(imagesUrl);
                    const imagesData = await imagesResponse.json();
                    
                    // Add main poster
                    options.push({
                        id: movie.id,
                        title: movie.title,
                        year: movie.release_date ? movie.release_date.split('-')[0] : 'Unknown',
                        poster_path: movie.poster_path,
                        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                        vote_average: movie.vote_average,
                        overview: movie.overview,
                        type: 'main'
                    });
                    
                    // Add alternative posters (up to 3 more)
                    if (imagesData.posters && imagesData.posters.length > 1) {
                        const altPosters = imagesData.posters
                            .filter(poster => poster.file_path !== movie.poster_path)
                            .slice(0, 3);
                        
                        for (const altPoster of altPosters) {
                            options.push({
                                id: movie.id,
                                title: movie.title,
                                year: movie.release_date ? movie.release_date.split('-')[0] : 'Unknown',
                                poster_path: altPoster.file_path,
                                poster_url: `https://image.tmdb.org/t/p/w500${altPoster.file_path}`,
                                vote_average: movie.vote_average,
                                overview: movie.overview,
                                type: 'alternative'
                            });
                        }
                    }
                }
            }
            
            return options;
        }
        
        return [];
    } catch (error) {
        console.error(`❌ Error searching for ${title}:`, error.message);
        return [];
    }
}

function loadExistingOverrides() {
    if (fs.existsSync(OVERRIDES_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
        } catch (error) {
            console.warn('⚠️ Could not load existing overrides:', error.message);
        }
    }
    return {};
}

function saveOverrides(overrides) {
    try {
        // Ensure data directory exists
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2));
        console.log('✅ Overrides saved successfully');
        return true;
    } catch (error) {
        console.error('❌ Error saving overrides:', error.message);
        return false;
    }
}

// Express middleware and routes
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Serve the main interface
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎬 Movie Poster Selector</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white;
            min-height: 100vh;
        }
        
        .header {
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            text-align: center;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .controls {
            padding: 20px;
            text-align: center;
            background: rgba(0, 0, 0, 0.2);
        }
        
        .btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            cursor: pointer;
            border-radius: 6px;
            margin: 0 10px;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            background: #45a049;
            transform: translateY(-2px);
        }
        
        .btn:disabled {
            background: #666;
            cursor: not-allowed;
            transform: none;
        }
        
        .btn.secondary {
            background: #2196F3;
        }
        
        .btn.secondary:hover {
            background: #1976D2;
        }
        
        .btn.danger {
            background: #f44336;
        }
        
        .btn.danger:hover {
            background: #d32f2f;
        }
        
        .status {
            padding: 20px;
            text-align: center;
            font-size: 1.1rem;
        }
        
        .movie-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(800px, 1fr));
            gap: 30px;
            padding: 30px;
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .movie-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .movie-title {
            font-size: 1.4rem;
            margin-bottom: 10px;
            color: #FFD700;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        }
        
        .movie-filename {
            font-size: 0.9rem;
            opacity: 0.8;
            margin-bottom: 20px;
            word-break: break-all;
        }
        
        .poster-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .poster-option {
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 3px solid transparent;
            border-radius: 8px;
            padding: 10px;
        }
        
        .poster-option:hover {
            transform: scale(1.05);
            border-color: #FFD700;
        }
        
        .poster-option.selected {
            border-color: #4CAF50;
            background: rgba(76, 175, 80, 0.2);
        }
        
        .poster-option img {
            width: 100%;
            height: 225px;
            object-fit: cover;
            border-radius: 6px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .poster-info {
            margin-top: 10px;
            font-size: 0.85rem;
        }
        
        .poster-info .title {
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .poster-info .year {
            color: #FFD700;
        }
        
        .poster-info .rating {
            color: #FF6B6B;
            margin-top: 3px;
        }
        
        .no-posters {
            text-align: center;
            padding: 40px;
            opacity: 0.7;
            font-style: italic;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            font-size: 1.2rem;
        }
        
        .loading::after {
            content: '';
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #fff;
            border-top: 2px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .progress {
            background: rgba(0, 0, 0, 0.3);
            height: 6px;
            border-radius: 3px;
            overflow: hidden;
            margin: 20px;
        }
        
        .progress-bar {
            height: 100%;
            background: #4CAF50;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px;
            flex-wrap: wrap;
        }
        
        .stat {
            text-align: center;
            background: rgba(0, 0, 0, 0.3);
            padding: 15px 20px;
            border-radius: 8px;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #FFD700;
        }
        
        .stat-label {
            font-size: 0.9rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎬 Movie Poster Selector</h1>
        <p>Select the correct poster for each movie from TMDb options</p>
    </div>
    
    <div class="controls">
        <button id="scanBtn" class="btn">🔍 Scan Movies</button>
        <button id="saveBtn" class="btn secondary" disabled>💾 Save Selections</button>
        <button id="exportBtn" class="btn secondary" disabled>📤 Export Overrides</button>
        <button id="clearBtn" class="btn danger">🗑️ Clear All</button>
    </div>
    
    <div class="progress" id="progressContainer" style="display: none;">
        <div class="progress-bar" id="progressBar"></div>
    </div>
    
    <div class="stats" id="stats" style="display: none;">
        <div class="stat">
            <div class="stat-value" id="totalMovies">0</div>
            <div class="stat-label">Movies Found</div>
        </div>
        <div class="stat">
            <div class="stat-value" id="moviesWithPosters">0</div>
            <div class="stat-label">With Posters</div>
        </div>
        <div class="stat">
            <div class="stat-value" id="selectedPosters">0</div>
            <div class="stat-label">Selected</div>
        </div>
    </div>
    
    <div class="status" id="status">Click "Scan Movies" to begin</div>
    
    <div class="movie-grid" id="movieGrid"></div>
    
    <script>
        let movies = [];
        let selections = {};
        
        const elements = {
            scanBtn: document.getElementById('scanBtn'),
            saveBtn: document.getElementById('saveBtn'),
            exportBtn: document.getElementById('exportBtn'),
            clearBtn: document.getElementById('clearBtn'),
            status: document.getElementById('status'),
            movieGrid: document.getElementById('movieGrid'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            stats: document.getElementById('stats'),
            totalMovies: document.getElementById('totalMovies'),
            moviesWithPosters: document.getElementById('moviesWithPosters'),
            selectedPosters: document.getElementById('selectedPosters')
        };
        
        // Event listeners
        elements.scanBtn.addEventListener('click', scanMovies);
        elements.saveBtn.addEventListener('click', saveSelections);
        elements.exportBtn.addEventListener('click', exportOverrides);
        elements.clearBtn.addEventListener('click', clearAll);
        
        async function scanMovies() {
            try {
                elements.scanBtn.disabled = true;
                elements.status.textContent = 'Scanning movie library...';
                elements.progressContainer.style.display = 'block';
                elements.progressBar.style.width = '0%';
                
                const response = await fetch('/api/scan-movies');
                const data = await response.json();
                
                if (data.success) {
                    movies = data.movies;
                    elements.totalMovies.textContent = movies.length;
                    elements.stats.style.display = 'flex';
                    
                    await fetchPosterOptions();
                } else {
                    elements.status.textContent = 'Error: ' + data.error;
                }
            } catch (error) {
                elements.status.textContent = 'Error scanning movies: ' + error.message;
            } finally {
                elements.scanBtn.disabled = false;
                elements.progressContainer.style.display = 'none';
            }
        }
        
        async function fetchPosterOptions() {
            elements.status.textContent = 'Fetching poster options from TMDb...';
            
            let processed = 0;
            let withPosters = 0;
            
            for (const movie of movies) {
                try {
                    const response = await fetch('/api/movie-posters', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            title: movie.title, 
                            year: movie.year,
                            filename: movie.filename
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success && data.posters.length > 0) {
                        movie.posterOptions = data.posters;
                        withPosters++;
                    } else {
                        movie.posterOptions = [];
                    }
                    
                    processed++;
                    const progress = (processed / movies.length) * 100;
                    elements.progressBar.style.width = progress + '%';
                    elements.moviesWithPosters.textContent = withPosters;
                    
                    // Update display every 5 movies or at the end
                    if (processed % 5 === 0 || processed === movies.length) {
                        renderMovies();
                    }
                    
                } catch (error) {
                    console.error('Error fetching posters for', movie.filename, error);
                    movie.posterOptions = [];
                    processed++;
                }
            }
            
            elements.status.textContent = \`Found poster options for \${withPosters} out of \${movies.length} movies\`;
            elements.saveBtn.disabled = false;
            elements.exportBtn.disabled = false;
            renderMovies();
        }
        
        function renderMovies() {
            const grid = elements.movieGrid;
            grid.innerHTML = '';
            
            const moviesWithPosters = movies.filter(movie => movie.posterOptions && movie.posterOptions.length > 0);
            
            if (moviesWithPosters.length === 0) {
                grid.innerHTML = '<div class="no-posters">No movies with poster options found</div>';
                return;
            }
            
            moviesWithPosters.forEach(movie => {
                const movieCard = document.createElement('div');
                movieCard.className = 'movie-card';
                
                const posterOptionsHTML = movie.posterOptions.map((poster, index) => \`
                    <div class="poster-option" data-movie="\${movie.filename}" data-poster="\${index}">
                        <img src="\${poster.poster_url}" alt="\${poster.title}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIyNSIgdmlld0JveD0iMCAwIDE1MCAyMjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMjI1IiBmaWxsPSIjMzMzIi8+Cjx0ZXh0IHg9Ijc1IiB5PSIxMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K'">
                        <div class="poster-info">
                            <div class="title">\${poster.title}</div>
                            <div class="year">\${poster.year}</div>
                            <div class="rating">⭐ \${poster.vote_average.toFixed(1)}</div>
                        </div>
                    </div>
                \`).join('');
                
                movieCard.innerHTML = \`
                    <div class="movie-title">\${movie.title} (\${movie.year || 'Unknown'})</div>
                    <div class="movie-filename">\${movie.filename}</div>
                    <div class="poster-options">
                        \${posterOptionsHTML}
                    </div>
                \`;
                
                grid.appendChild(movieCard);
            });
            
            // Add click handlers for poster selection
            document.querySelectorAll('.poster-option').forEach(option => {
                option.addEventListener('click', function() {
                    const movieFilename = this.dataset.movie;
                    const posterIndex = parseInt(this.dataset.poster);
                    
                    // Remove selection from other posters for this movie
                    document.querySelectorAll(\`[data-movie="\${movieFilename}"]\`).forEach(el => {
                        el.classList.remove('selected');
                    });
                    
                    // Add selection to clicked poster
                    this.classList.add('selected');
                    
                    // Store selection
                    const movie = movies.find(m => m.filename === movieFilename);
                    if (movie && movie.posterOptions[posterIndex]) {
                        selections[movieFilename] = movie.posterOptions[posterIndex];
                        updateSelectionCount();
                    }
                });
            });
        }
        
        function updateSelectionCount() {
            elements.selectedPosters.textContent = Object.keys(selections).length;
        }
        
        async function saveSelections() {
            try {
                elements.saveBtn.disabled = true;
                elements.status.textContent = 'Saving selections...';
                
                const response = await fetch('/api/save-selections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selections })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    elements.status.textContent = \`Saved \${Object.keys(selections).length} poster selections\`;
                } else {
                    elements.status.textContent = 'Error saving selections: ' + data.error;
                }
            } catch (error) {
                elements.status.textContent = 'Error saving selections: ' + error.message;
            } finally {
                elements.saveBtn.disabled = false;
            }
        }
        
        async function exportOverrides() {
            try {
                const response = await fetch('/api/export-overrides');
                const data = await response.json();
                
                if (data.success) {
                    const blob = new Blob([JSON.stringify(data.overrides, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'poster_overrides.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    elements.status.textContent = 'Overrides exported successfully';
                } else {
                    elements.status.textContent = 'Error exporting overrides: ' + data.error;
                }
            } catch (error) {
                elements.status.textContent = 'Error exporting overrides: ' + error.message;
            }
        }
        
        function clearAll() {
            if (confirm('Are you sure you want to clear all selections?')) {
                selections = {};
                movies = [];
                elements.movieGrid.innerHTML = '';
                elements.stats.style.display = 'none';
                elements.status.textContent = 'All selections cleared';
                elements.saveBtn.disabled = true;
                elements.exportBtn.disabled = true;
                updateSelectionCount();
            }
        }
    </script>
</body>
</html>
    `);
});

// API endpoint to scan movies
app.get('/api/scan-movies', async (req, res) => {
    try {
        console.log('🔍 Scanning movie library...');
        const files = scanDir(MOVIE_DIR);
        
        const movies = files.map(file => {
            const cleaned = cleanTitle(file);
            return {
                filename: file,
                title: cleaned.title,
                year: cleaned.year
            };
        });
        
        console.log(`📁 Found ${movies.length} movie files`);
        res.json({ success: true, movies });
    } catch (error) {
        console.error('❌ Error scanning movies:', error);
        res.json({ success: false, error: error.message });
    }
});

// API endpoint to get poster options for a movie
app.post('/api/movie-posters', async (req, res) => {
    try {
        const { title, year, filename } = req.body;
        console.log(`🎬 Searching posters for: ${title} (${year || 'Unknown'})`);
        
        const posters = await searchMovieOptions(title, year);
        res.json({ success: true, posters });
    } catch (error) {
        console.error('❌ Error fetching movie posters:', error);
        res.json({ success: false, error: error.message });
    }
});

// API endpoint to save selections
app.post('/api/save-selections', async (req, res) => {
    try {
        const { selections } = req.body;
        
        // Load existing overrides
        const existingOverrides = loadExistingOverrides();
        
        // Convert selections to TMDb ID format for overrides
        const newOverrides = { ...existingOverrides };
        
        for (const [filename, posterData] of Object.entries(selections)) {
            newOverrides[filename] = posterData.id;
        }
        
        // Save to overrides file
        const success = saveOverrides(newOverrides);
        
        if (success) {
            // Also save selections to temp file for reference
            fs.writeFileSync(TEMP_DATA_PATH, JSON.stringify(selections, null, 2));
            console.log(`✅ Saved ${Object.keys(selections).length} poster selections`);
            res.json({ success: true });
        } else {
            res.json({ success: false, error: 'Failed to save overrides' });
        }
    } catch (error) {
        console.error('❌ Error saving selections:', error);
        res.json({ success: false, error: error.message });
    }
});

// API endpoint to export overrides
app.get('/api/export-overrides', (req, res) => {
    try {
        const overrides = loadExistingOverrides();
        res.json({ success: true, overrides });
    } catch (error) {
        console.error('❌ Error exporting overrides:', error);
        res.json({ success: false, error: error.message });
    }
});

// Start the server
async function startServer() {
    console.log('🎬 Starting Interactive Movie Poster Selector...');
    console.log('📂 Movie directory:', MOVIE_DIR);
    console.log('💾 Data directory:', DATA_DIR);
    console.log('🔧 Overrides file:', OVERRIDES_PATH);
    
    app.listen(PORT, () => {
        console.log(`🌐 Server running at http://localhost:${PORT}`);
        console.log('🎯 Open your browser to start selecting movie posters!');
        console.log('');
        console.log('📋 Instructions:');
        console.log('1. Click "Scan Movies" to find all movies in your library');
        console.log('2. Browse poster options for each movie');
        console.log('3. Click on the poster you want to use for each movie');
        console.log('4. Click "Save Selections" to apply your choices');
        console.log('5. Run your normal movie poster fetch script to update with selections');
        console.log('');
        console.log('Press Ctrl+C to stop the server');
        
        // Open browser automatically
        const open = require('child_process').exec;
        open(`start http://localhost:${PORT}`, (error) => {
            if (error) {
                console.log('💡 Manually open http://localhost:' + PORT + ' in your browser');
            }
        });
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

// Start the server
startServer();