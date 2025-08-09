/*
  FETCH_CAST_FOR_MOVIE.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const enquirer = require('enquirer');

// Load TMDB API key from config
let TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  try {
    const config = require('../../config/config.js');
    TMDB_API_KEY = config.TMDB_API_KEY || config.tmdbApiKey;
  } catch (e) {
    console.error('Could not load TMDB API key from config. Set TMDB_API_KEY in env or config.js');
    process.exit(1);
  }
}
if (!TMDB_API_KEY) {
  console.error('TMDB API key not found.');
  process.exit(1);
}

const OUTPUT_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast.json');
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const TMDB_TV_SEARCH_URL = 'https://api.themoviedb.org/3/search/tv';
const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';
const TMDB_TV_URL = 'https://api.themoviedb.org/3/tv';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';
const MOVIE_LIBRARY_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/media-library-movies.json');

function normalizeTitle(str) {
  return (str || '')
    .replace(/\[[^\]]*\]/g, '') // remove [bracketed]
    .replace(/\([^\)]*\)/g, '') // remove (parentheses)
    .replace(/[^a-zA-Z0-9]/g, '') // remove non-alphanumeric
    .toLowerCase();
}

async function findBestMovieMatchInLibrary(title, year) {
  if (!fs.existsSync(MOVIE_LIBRARY_JSON)) return null;
  const lib = JSON.parse(fs.readFileSync(MOVIE_LIBRARY_JSON, 'utf8'));
  const searchTitle = normalizeTitle(title);
  let candidates = [];
  function walk(folder) {
    if (folder.files) {
      for (const file of folder.files) {
        const folderTitle = normalizeTitle(folder.path);
        const fileTitle = normalizeTitle(file.name);
        let score = 0;
        // For short titles, require exact match
        if (searchTitle.length <= 3) {
          if ((folderTitle === searchTitle || fileTitle === searchTitle) && year && ((folder.path && folder.path.includes(year)) || (file.name && file.name.includes(year)))) {
            score = 10;
          }
        } else {
          if ((folderTitle.includes(searchTitle) || fileTitle.includes(searchTitle)) && year && ((folder.path && folder.path.includes(year)) || (file.name && file.name.includes(year)))) {
            score = 5;
          } else if (folderTitle.includes(searchTitle) || fileTitle.includes(searchTitle)) {
            score = 2;
          }
        }
        if (score > 0) {
          candidates.push({
            absPath: file.absPath,
            relPath: file.relPath,
            fileName: file.name,
            folder: folder.path,
            score
          });
        }
      }
    }
    if (folder.folders) {
      for (const sub of folder.folders) walk(sub);
    }
  }
  walk(lib);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    // Prompt user to select
    const choices = candidates.map(c => ({
      name: c.absPath,
      message: `${c.absPath} (score: ${c.score})`
    }));
    return enquirer.prompt({
      type: 'select',
      name: 'selected',
      message: `Multiple matches found for '${title}' (${year}). Select the correct file:`,
      choices
    }).then(ans => candidates.find(c => c.absPath === ans.selected));
  }
  return null;
}

async function fetchCastByTitle(title, year) {
  try {
    console.log(`🔍 Searching for movie: "${title}"${year ? ` (${year})` : ''}`);
    
    // First try movie search
    let url = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
    let res = await fetch(url);
    if (!res.ok) {
      throw new Error(`TMDB search failed - Status: ${res.status}`);
    }
    let data = await res.json();
    
    let movie = null;
    let isTV = false;
    
    if (data.results && data.results.length > 0) {
      movie = data.results[0];
      console.log(`✅ Found movie: "${movie.title}" (${movie.release_date?.split('-')[0] || 'Unknown'}) - ID: ${movie.id}`);
    } else {
      // Try TV search if no movie found
      console.log(`🔍 No movie found, searching TV shows...`);
      url = `${TMDB_TV_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&first_air_date_year=${year}` : ''}`;
      res = await fetch(url);
      if (!res.ok) {
        throw new Error(`TMDB TV search failed - Status: ${res.status}`);
      }
      data = await res.json();
      
      if (data.results && data.results.length > 0) {
        movie = data.results[0];
        isTV = true;
        console.log(`✅ Found TV show: "${movie.name}" (${movie.first_air_date?.split('-')[0] || 'Unknown'}) - ID: ${movie.id}`);
      } else {
        console.log('❌ No movies or TV shows found with that title');
        return null;
      }
    }
    
    // 2. Get credits (cast)
    console.log(`🎭 Fetching cast for ${isTV ? 'TV show' : 'movie'} ID: ${movie.id}`);
    const creditsUrl = isTV ? 
      `${TMDB_TV_URL}/${movie.id}/credits?api_key=${TMDB_API_KEY}` :
      `${TMDB_MOVIE_URL}/${movie.id}/credits?api_key=${TMDB_API_KEY}`;
    
    const creditsRes = await fetch(creditsUrl);
    if (!creditsRes.ok) {
      throw new Error(`Failed to fetch credits - Status: ${creditsRes.status}`);
    }
    const credits = await creditsRes.json();
    if (!credits.cast || credits.cast.length === 0) {
      console.log('❌ No cast information found');
      return null;
    }
    
    // Return all billed cast with name and profile image
    const cast = credits.cast.map(actor => ({
      name: actor.name,
      character: actor.character,
      profile: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : null
    }));
    
    console.log(`✅ Found ${cast.length} cast members`);
    return {
      movieId: movie.id,
      movieTitle: isTV ? movie.name : movie.title,
      movieYear: isTV ? (movie.first_air_date?.split('-')[0] || 'Unknown') : (movie.release_date?.split('-')[0] || 'Unknown'),
      isTV: isTV,
      cast: cast
    };
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

async function fetchCastByID(movieId, isTV = false) {
  try {
    if (isTV) {
      console.log(`🎭 Fetching cast for TV show ID: ${movieId}`);
      // 1. Get TV show details
      const tvRes = await fetch(`${TMDB_TV_URL}/${movieId}?api_key=${TMDB_API_KEY}`);
      if (!tvRes.ok) {
        throw new Error(`Failed to fetch TV show details - Status: ${tvRes.status}`);
      }
      const tv = await tvRes.json();
      console.log(`✅ Found: "${tv.name}" (${tv.first_air_date?.split('-')[0] || 'Unknown'})`);
      // 2. Get credits (cast)
      const creditsRes = await fetch(`${TMDB_TV_URL}/${movieId}/credits?api_key=${TMDB_API_KEY}`);
      if (!creditsRes.ok) {
        throw new Error(`Failed to fetch credits - Status: ${creditsRes.status}`);
      }
      const credits = await creditsRes.json();
      if (!credits.cast || credits.cast.length === 0) {
        console.log('❌ No cast information found');
        return null;
      }
      // Return top 8 billed cast with name and profile image
      const cast = credits.cast.slice(0, 8).map(actor => ({
        name: actor.name,
        character: actor.character,
        profile: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : null
      }));
      console.log(`✅ Found ${cast.length} cast members`);
      return {
        movieId: tv.id,
        movieTitle: tv.name,
        movieYear: tv.first_air_date?.split('-')[0] || 'Unknown',
        isTV: true,
        cast: cast
      };
    } else {
      console.log(`🎭 Fetching cast for movie ID: ${movieId}`);
      // 1. Get movie details
      const movieRes = await fetch(`${TMDB_MOVIE_URL}/${movieId}?api_key=${TMDB_API_KEY}`);
      if (!movieRes.ok) {
        throw new Error(`Failed to fetch movie details - Status: ${movieRes.status}`);
      }
      const movie = await movieRes.json();
      console.log(`✅ Found: "${movie.title}" (${movie.release_date?.split('-')[0] || 'Unknown'})`);
      // 2. Get credits (cast)
      const creditsRes = await fetch(`${TMDB_MOVIE_URL}/${movieId}/credits?api_key=${TMDB_API_KEY}`);
      if (!creditsRes.ok) {
        throw new Error(`Failed to fetch credits - Status: ${creditsRes.status}`);
      }
      const credits = await creditsRes.json();
      if (!credits.cast || credits.cast.length === 0) {
        console.log('❌ No cast information found');
        return null;
      }
      // Return top 8 billed cast with name and profile image
      const cast = credits.cast.slice(0, 8).map(actor => ({
        name: actor.name,
        character: actor.character,
        profile: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : null
      }));
      console.log(`✅ Found ${cast.length} cast members`);
      return {
        movieId: movie.id,
        movieTitle: movie.title,
        movieYear: movie.release_date?.split('-')[0] || 'Unknown',
        isTV: false,
        cast: cast
      };
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return null;
  }
}

async function saveCastData(castData, moviePath) {
  try {
    // Load existing cast data
    let existingCast = {};
    if (fs.existsSync(OUTPUT_JSON)) {
      existingCast = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf8'));
    }

    // Generate additional keys for robust lookup
    const keys = new Set();
    keys.add(moviePath);
    // Folder name (e.g., "V (1984)")
    const folderMatch = moviePath.match(/S:\/MEDIA\/(?:MOVIES|TV-SHOWS)\/([^\/]+)\//);
    if (folderMatch) keys.add(folderMatch[1]);
    // Title (e.g., "V")
    if (castData.movieTitle) keys.add(castData.movieTitle);
    // Filename (e.g., "V.(1984).mp4")
    const fileMatch = moviePath.match(/([^\/]+\.mp4)$/);
    if (fileMatch) keys.add(fileMatch[1]);

    // Add new cast data under all keys
    for (const key of keys) {
      existingCast[key] = {
        title: castData.movieTitle,
        year: castData.movieYear,
        cast: castData.cast
      };
    }

    // Save updated data
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(existingCast, null, 2), 'utf8');
    console.log(`💾 Cast data saved to: ${OUTPUT_JSON}`);

    // Display cast information
    console.log('\n🎭 Cast Information:');
    console.log(`📽️  Movie: ${castData.movieTitle} (${castData.movieYear})`);
    console.log(`🆔 TMDB ID: ${castData.movieId}`);
    console.log(`👥 Cast Members:`);
    castData.cast.forEach((actor, index) => {
      console.log(`   ${index + 1}. ${actor.name} as ${actor.character}`);
    });

  } catch (error) {
    console.error(`❌ Error saving cast data: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node scripts/fetch_cast_for_movie.js <movie_title> [year]');
    console.log('   or: node scripts/fetch_cast_for_movie.js --id <tmdb_id> [--tv]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/fetch_cast_for_movie.js "V" 1983');
    console.log('  node scripts/fetch_cast_for_movie.js --id 75893 --tv');
    return;
  }
  
  let castData = null;
  
  if (args[0] === '--id' && args[1]) {
    // Fetch by TMDB ID
    const movieId = parseInt(args[1]);
    const isTV = args.includes('--tv');
    if (isNaN(movieId)) {
      console.error('❌ Invalid movie ID. Please provide a valid number.');
      return;
    }
    castData = await fetchCastByID(movieId, isTV);
  } else {
    // Fetch by title
    const title = args[0];
    const year = args[1] || null;
    castData = await fetchCastByTitle(title, year);
  }
  
  if (castData) {
    // Use robust matching to find the best path in the movie library
    const bestMatch = await findBestMovieMatchInLibrary(castData.movieTitle, castData.movieYear);
    if (bestMatch && bestMatch.absPath) {
      const keys = new Set();
      keys.add(bestMatch.absPath);
      if (bestMatch.relPath) keys.add(bestMatch.relPath);
      if (bestMatch.fileName) keys.add(bestMatch.fileName);
      if (bestMatch.folder) keys.add(bestMatch.folder);
      for (const key of keys) {
        await saveCastData(castData, key);
      }
      console.log(`[MATCH] Saved cast for '${castData.movieTitle}' (${castData.movieYear}) under absPath: ${bestMatch.absPath}`);
    } else {
      // fallback to generic path
      const fallbackPath = `S:/MEDIA/MOVIES/${castData.movieTitle} (${castData.movieYear})/${castData.movieTitle}.(${castData.movieYear}).mp4`;
      await saveCastData(castData, fallbackPath);
      console.warn(`[WARN] No robust match found for '${castData.movieTitle}' (${castData.movieYear}), saved under fallback path.`);
    }
  } else {
    console.log('❌ Could not fetch cast data');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchCastByTitle, fetchCastByID }; 