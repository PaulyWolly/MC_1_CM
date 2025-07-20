/*
  FETCH_TV_POSTERS.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// TMDb API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Paths
const MEDIA_LIBRARY_PATH = path.join(__dirname, '../server/data/media-library.json');
const TV_POSTERS_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tv_posters.json');

async function fetchTVShowPoster(tvShowName) {
    try {
        // Search for TV show
        const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(tvShowName)}`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.results && searchData.results.length > 0) {
            const tvShow = searchData.results[0];
            if (tvShow.poster_path) {
                return `https://image.tmdb.org/t/p/w500${tvShow.poster_path}`;
            }
        }
        return null;
    } catch (error) {
        console.error(`Error fetching poster for ${tvShowName}:`, error.message);
        return null;
    }
}

function extractTVShowName(filePath) {
    // Extract TV show name from file path
    // Example: "S:\MEDIA\TV-SHOWS\Sliders (1995)\Sliders 1995 Season 4 Complete DVDRip x264 [i_c]\Sliders S04E05 World Killer.mkv"
    // Should extract: "Sliders"
    
    const pathParts = filePath.split(/[\\\/]/);
    
    // Look for TV-SHOWS directory and get the next directory name
    const tvShowsIndex = pathParts.findIndex(part => part.toLowerCase().includes('tv-shows'));
    if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
        const tvShowDir = pathParts[tvShowsIndex + 1];
        // Extract the show name (remove year and other info)
        const match = tvShowDir.match(/^(.+?)\s*\(\d{4}\)?/);
        if (match) {
            return match[1].trim();
        }
        return tvShowDir;
    }
    
    return null;
}

async function processMediaLibrary() {
    try {
        console.log('📺 [TV-POSTERS] Loading media library...');
        const mediaLibraryData = JSON.parse(fs.readFileSync(MEDIA_LIBRARY_PATH, 'utf8'));
        
        const tvPosters = {};
        const processedShows = new Set();
        
        console.log('📺 [TV-POSTERS] Processing media files...');
        
        // Process all media files
        function processNode(node) {
            if (node.absPath && (node.absPath.includes('TV-SHOWS') || node.absPath.includes('tv-shows'))) {
                const tvShowName = extractTVShowName(node.absPath);
                if (tvShowName && !processedShows.has(tvShowName)) {
                    processedShows.add(tvShowName);
                    console.log(`📺 [TV-POSTERS] Found TV show: ${tvShowName}`);
                }
            }
            
            if (node.children) {
                node.children.forEach(processNode);
            }
        }
        
        processNode(mediaLibraryData);
        
        console.log(`📺 [TV-POSTERS] Found ${processedShows.size} unique TV shows`);
        
        // Fetch posters for each TV show
        for (const tvShowName of processedShows) {
            console.log(`📺 [TV-POSTERS] Fetching poster for: ${tvShowName}`);
            const posterUrl = await fetchTVShowPoster(tvShowName);
            
            if (posterUrl) {
                // Add entries for all files of this TV show
                function addPosterEntries(node) {
                    if (node.absPath && (node.absPath.includes('TV-SHOWS') || node.absPath.includes('tv-shows'))) {
                        const showName = extractTVShowName(node.absPath);
                        if (showName === tvShowName) {
                            tvPosters[node.absPath] = posterUrl;
                        }
                    }
                    
                    if (node.children) {
                        node.children.forEach(addPosterEntries);
                    }
                }
                
                addPosterEntries(mediaLibraryData);
                console.log(`✅ [TV-POSTERS] Added poster for ${tvShowName}: ${posterUrl}`);
            } else {
                console.log(`❌ [TV-POSTERS] No poster found for ${tvShowName}`);
            }
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        
        // Save TV posters to file
        console.log(`📺 [TV-POSTERS] Saving ${Object.keys(tvPosters).length} TV poster entries...`);
        fs.writeFileSync(TV_POSTERS_PATH, JSON.stringify(tvPosters, null, 2));
        
        console.log('✅ [TV-POSTERS] TV posters saved successfully!');
        console.log(`📁 [TV-POSTERS] File saved to: ${TV_POSTERS_PATH}`);
        
    } catch (error) {
        console.error('❌ [TV-POSTERS] Error processing media library:', error);
    }
}

// Check if API key is set
if (TMDB_API_KEY === 'your_tmdb_api_key_here') {
    console.error('❌ [TV-POSTERS] Please set your TMDb API key in the script');
    console.log('📝 [TV-POSTERS] Get your API key from: https://www.themoviedb.org/settings/api');
    process.exit(1);
}

// Run the script
processMediaLibrary(); 