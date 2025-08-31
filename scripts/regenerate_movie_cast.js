/*
  REGENERATE_MOVIE_CAST.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
    console.error('❌ [REGENERATE-CAST] TMDB_API_KEY not set in environment variables. Please add it to your /server/.env file.');
    process.exit(1);
}

const MOVIES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');
const OUTPUT_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast.json');

async function fetchMovieCast(tmdbId) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.cast || [];
    } catch (error) {
        console.error(`Error fetching cast for TMDB ID ${tmdbId}:`, error.message);
        return [];
    }
}

async function searchMovie(title) {
    try {
        const searchTitle = encodeURIComponent(title);
        const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${searchTitle}&include_adult=false`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results && data.results.length > 0 ? data.results[0] : null;
    } catch (error) {
        console.error(`Error searching for movie "${title}":`, error.message);
        return null;
    }
}

function cleanMovieTitle(filename) {
    if (!filename || typeof filename !== 'string') return '';
    // Remove extension
    let name = filename.replace(/\.[^/.]+$/, "");
    // Remove bracketed/parenthetical tags
    name = name.replace(/\[[^\]]*\]|\([^\)]*\)/g, "");
    // Remove years
    name = name.replace(/\b(19|20)\d{2}\b/g, "");
    // Remove audio channel tags like AAC5 1, AAC51, DDP5 1, DDP51, etc.
    name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*5[ ._\-]*1\b/gi, "");
    name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*7[ ._\-]*1\b/gi, "");
    // Remove common tags (only as whole words or after separators)
    name = name.replace(/(?:^|[ ._\-])(?:480p|720p|1080p|2160p|4k|8k|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|aac|dts|yify|rarbg|repack|extended|unrated|directors cut|remux|hdtv|amzn|nf|web|ddp|dd5[ ._\-]?1|5[ ._\-]?1|7[ ._\-]?1|mp3|flac|truehd|atmos|hevc|h265|h264|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion)(?=$|[ ._\-])/gi, "");
    // Remove trailing group tags (e.g., -YTS, -RARBG, etc.)
    name = name.replace(/[-_. ]+(yts( mx| am)?|rarbg|jyk|kogi|web|amzn|nf|ddp|dd5[ ._\-]?1|aac|dts|hdtv|remux|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)\b.*$/i, "");
    // Replace dots, underscores, dashes with spaces
    name = name.replace(/[._-]+/g, " ");
    // Remove extra spaces
    name = name.replace(/\s+/g, " ").trim();
    // Capitalize each word
    name = name.replace(/\b\w/g, c => c.toUpperCase());
    return name;
}

function extractYearFromPath(path) {
    const yearMatch = path.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : null;
}

async function regenerateMovieCast() {
    console.log('🎬 [REGENERATE-CAST] Starting movie cast regeneration...');
    
    // Load movies data
    if (!fs.existsSync(MOVIES_JSON)) {
        console.error('❌ [REGENERATE-CAST] Movies JSON file not found:', MOVIES_JSON);
        return;
    }
    
    const moviesData = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
    const castData = {};
    
    // Extract all movie files
    const movies = [];
    
    function extractMovies(node) {
        if (Array.isArray(node.files)) {
            for (const file of node.files) {
                if (file.absPath && file.name) {
                    movies.push({
                        absPath: file.absPath,
                        name: file.name,
                        title: cleanMovieTitle(file.name),
                        year: extractYearFromPath(file.absPath)
                    });
                }
            }
        }
        if (Array.isArray(node.folders)) {
            for (const folder of node.folders) {
                extractMovies(folder);
            }
        }
    }
    
    extractMovies(moviesData);
    
    console.log(`📁 [REGENERATE-CAST] Found ${movies.length} movies to process`);
    
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (const movie of movies) {
        processed++;
        console.log(`\n🎬 [REGENERATE-CAST] Processing ${processed}/${movies.length}: ${movie.title} (${movie.year})`);
        
        try {
            // Search for movie on TMDB
            const searchResult = await searchMovie(`${movie.title} ${movie.year}`);
            
            if (searchResult) {
                console.log(`✅ [REGENERATE-CAST] Found TMDB match: ${searchResult.title} (${searchResult.release_date?.split('-')[0]})`);
                
                // Fetch cast
                const cast = await fetchMovieCast(searchResult.id);
                
                if (cast.length > 0) {
                    // Save under the full file path key
                    castData[movie.absPath] = {
                        title: searchResult.title,
                        year: searchResult.release_date?.split('-')[0] || movie.year,
                        cast: cast.slice(0, 10).map(actor => ({
                            name: actor.name,
                            character: actor.character,
                            profile: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
                        }))
                    };
                    
                    console.log(`✅ [REGENERATE-CAST] Saved cast with ${castData[movie.absPath].cast.length} actors`);
                    successCount++;
                } else {
                    console.log(`⚠️ [REGENERATE-CAST] No cast found for ${movie.title}`);
                    errorCount++;
                }
            } else {
                console.log(`❌ [REGENERATE-CAST] No TMDB match found for ${movie.title}`);
                errorCount++;
            }
            
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`❌ [REGENERATE-CAST] Error processing ${movie.title}:`, error.message);
            errorCount++;
        }
    }
    
    // Save the cast data
    console.log(`\n💾 [REGENERATE-CAST] Saving cast data to ${OUTPUT_JSON}...`);
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(castData, null, 2));
    
    console.log(`\n🎉 [REGENERATE-CAST] Complete!`);
    console.log(`✅ Success: ${successCount} movies`);
    console.log(`❌ Errors: ${errorCount} movies`);
    console.log(`📊 Total processed: ${processed} movies`);
}

// Run the script
regenerateMovieCast().catch(console.error); 