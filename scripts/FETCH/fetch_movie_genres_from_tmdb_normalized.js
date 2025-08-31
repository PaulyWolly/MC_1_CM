/*
  FETCH_MOVIE_GENRES_FROM_TMDB_NORMALIZED.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

// Scans S:/MEDIA/MOVIES, queries TMDb for genres, outputs movie_genres_normalized.json
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

const MOVIES_ROOT = 'S:/MEDIA/MOVIES';
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OUTPUT_FILE = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_genres_normalized.json');
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];

// Import normalization function
const { normalizeKey } = require('../../shared/NormalizationService');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

// Helper: Recursively scan for movie files
function scanMovies(dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of list) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(scanMovies(fullPath));
        } else if (VIDEO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
            results.push(fullPath);
        }
    }
    return results;
}

// Helper: Extract title and year from filename or folder
function parseTitleAndYear(filePath) {
    // Try to get folder name (parent dir)
    const folder = path.basename(path.dirname(filePath));
    // Try to extract title and year from folder or filename
    let match = folder.match(/(.+?)\s*\((\d{4})\)/); // e.g. "Movie Title (2018)"
    let title = folder, year = '';
    if (match) {
        title = match[1].replace(/\./g, ' ').trim();
        year = match[2];
    } else {
        // Try filename
        const base = path.basename(filePath, path.extname(filePath));
        match = base.match(/(.+?)\s*\((\d{4})\)/);
        if (match) {
            title = match[1].replace(/\./g, ' ').trim();
            year = match[2];
        } else {
            // Remove bracketed tags, resolution, etc.
            title = base.replace(/\[[^\]]*\]|\([^\)]*\)/g, '').replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
        }
    }
    return { title, year };
}

// Helper: Query TMDb for movie genres
async function fetchGenresForMovie(title, year) {
    const query = encodeURIComponent(title);
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || data.results.length === 0) return [];
    // Pick the first result
    const movie = data.results[0];
    if (!movie || !movie.id) return [];
    // Fetch movie details for genres
    const detailsRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}`);
    if (!detailsRes.ok) return [];
    const details = await detailsRes.json();
    if (!details.genres) return [];
    return details.genres.map(g => g.name);
}

(async () => {
    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    console.log('Scanning for movie files...');
    const movieFiles = scanMovies(MOVIES_ROOT);
    console.log(`Found ${movieFiles.length} movie files.`);
    const mapping = {};
    for (let i = 0; i < movieFiles.length; i++) {
        const file = movieFiles[i];
        const relPath = path.relative(MOVIES_ROOT, file);
        const { title, year } = parseTitleAndYear(file);
        const normalizedKey = normalizeKey(title);
        
        console.log(`[${i + 1}/${movieFiles.length}] Querying TMDb for: ${title}${year ? ` (${year})` : ''} (normalized: ${normalizedKey})`);
        try {
            const genres = await fetchGenresForMovie(title, year);
            mapping[normalizedKey] = genres;
            console.log('  → Genres:', genres.join(', ') || '(none)');
        } catch (e) {
            console.warn('  → Error:', e.message);
            mapping[normalizedKey] = [];
        }
        // Optional: Rate limit to avoid hitting TMDb too fast
        await new Promise(r => setTimeout(r, 350));
    }
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2), 'utf-8');
    console.log('Done! Normalized output written to', OUTPUT_FILE);
})(); 