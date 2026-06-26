/*
  SCAN_MEDIA_LIBRARY_MOVIES.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../public/components/NormalizationService');
const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '../../server/.env') });

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

const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';

const MEDIA_ROOT = 'S:/MEDIA/MOVIES';
// UPDATED: Use the new unified movies format
const OUTPUT_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movies-unified.json');

let existingTMDBMap = {};
try {
  const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
  // UPDATED: Handle the new unified format structure
  for (const [key, movie] of Object.entries(existing)) {
    if (movie.normalizedKey && movie.tmdbId) {
      existingTMDBMap[movie.normalizedKey] = movie.tmdbId;
    }
  }
} catch (e) {
  // File may not exist yet, ignore
}

function isVideoFile(filename) {
    const exts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    return exts.includes(path.extname(filename).toLowerCase());
}

function isBackupFolder(folderName) {
    // Skip backup folders and system folders
    const backupPatterns = [
        /backup/i,
        /bkup/i,
        /_backup/i,
        /_bkup/i,
        /\.backup/i,
        /\.bkup/i,
        /temp/i,
        /tmp/i,
        /cache/i,
        /\.old/i,
        /_old/i,
        /archive/i,
        /\.archive/i,
        /_archive/i
    ];
    
    return backupPatterns.some(pattern => pattern.test(folderName));
}

function scanDirectory(dir) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const folders = [];
        const files = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                // Skip backup folders
                if (!isBackupFolder(entry.name)) {
                    folders.push(entry.name);
                } else {
                    console.log(`🚫 [SCAN] Skipping backup folder: ${entry.name}`);
                }
            } else if (entry.isFile() && isVideoFile(entry.name)) {
                files.push(entry.name);
            }
        }
        return { folders, files };
    } catch (error) {
        console.warn(`⚠️ [SCAN] Warning: Could not read directory ${dir}: ${error.message}`);
        return { folders: [], files: [] };
    }
}

function extractYearFromTitle(title) {
  const match = title.match(/\((\d{4})\)/);
  return match ? match[1] : '';
}

// FIXED: Star Trek era detection that doesn't modify existing entries
function detectStarTrekEra(movieTitle, existingKeys) {
  if (!movieTitle.toLowerCase().includes('star trek')) {
    return movieTitle; // Not a Star Trek movie
  }
  
  // CRITICAL FIX: If any Star Trek variation already exists, DON'T modify the title
  // This prevents re-detection of existing movies
  const baseTitle = movieTitle.replace(/\s*\((original|v2|new)\)\s*/gi, '').trim();
  const baseTitleNormalized = normalizeKey(baseTitle).toLowerCase();
  
  // Check if any variation of this Star Trek movie already exists
  const existingVariations = [
    normalizeKey(baseTitle + ' (original)').toLowerCase(),
    normalizeKey(baseTitle + ' (v2)').toLowerCase(),
    normalizeKey(baseTitle + ' (new)').toLowerCase(),
    baseTitleNormalized
  ];
  
  for (const variation of existingVariations) {
    if (existingKeys.has(variation)) {
      console.log(`🎬 [SCAN] Star Trek movie already exists in library: "${movieTitle}" (found variation: ${variation})`);
      return null; // Signal that this movie should be skipped
    }
  }
  
  // ADDITIONAL CHECK: Look for existing Star Trek movies with any era designator
  // This catches cases where the existing movie might have a different designator
  const existingKeysArray = Array.from(existingKeys);
  for (const existingKey of existingKeysArray) {
    if (existingKey.includes('star.trek') && existingKey.includes(baseTitleNormalized.replace(/star\.trek\./g, ''))) {
      console.log(`🎬 [SCAN] Star Trek movie already exists with different designator: "${movieTitle}" (found: ${existingKey})`);
      return null; // Signal that this movie should be skipped
    }
  }
  
  // If already has era designator, keep it
  if (movieTitle.includes('(v2)') || movieTitle.includes('(new)') || movieTitle.includes('(original)')) {
    return movieTitle;
  }
  
  // Extract year from title
  const yearMatch = movieTitle.match(/\((\d{4})\)/);
  if (!yearMatch) return movieTitle;
  
  const year = parseInt(yearMatch[1]);
  
    // ORIGINAL ERA: 1979-1991 (William Shatner, Leonard Nimoy)
    if (year >= 1979 && year <= 1991) {
      return movieTitle.replace(/(Star Trek[^\d]*?)\s*(\(\d{4}\))/, '$1 (original) $2');
    }
    
    // V2 ERA: 1994-2002 (Patrick Stewart, Brent Spiner)
    if (year >= 1994 && year <= 2002) {
      return movieTitle.replace(/(Star Trek[^\d]*?)\s*(\(\d{4}\))/, '$1 (v2) $2');
    }
    
    // NEW ERA: 2009+ (Chris Pine, Zachary Quinto)
    if (year >= 2009) {
      return movieTitle.replace(/(Star Trek[^\d]*?)\s*(\(\d{4}\))/, '$1 (new) $2');
    }
  
  return movieTitle;
}

// FIXED: Improved title cleaning that handles E.T. properly
function cleanTitleForTMDB(title) {
  // CRITICAL FIX: Handle E.T. specifically to prevent "eperiodot" issue
  if (title.toLowerCase().includes('e.t.') || title.toLowerCase().includes('e t ')) {
    // For E.T., clean it but preserve the proper format
    return title
      .replace(/\([0-9]{4}\)/g, '') // remove (year)
      .replace(/\(colorized\)/gi, '') // remove (colorized)
      .replace(/\[[^\]]*\]/g, '') // remove [tags]
      .replace(/\{[^\}]*\}/g, '') // remove {tags}
      .replace(/\b(1080p|720p|2160p|4K|UHD|HD|SD|EXTENDED|SPECIAL|REMASTERED|DC|35mm|UNRATED|UNCUT|WEB[- ]?DL|BLURAY|BRRIP|HDR|XVID|H264|HEVC|AAC|DTS|YIFY|JYK|X265|X264|10bit|8bit|DUAL|MULTI|PROPER|LIMITED|INTERNAL|COMPLETE|REPACK|REMUX|TRUEHD|ATMOS|DV|HDR10|HDR10\+|SDR|FS|WS|RERIP|READNFO|SUBBED|DUBBED|CUSTOM|FRENCH|GERMAN|SPANISH|ITALIAN|RUSSIAN|JAPANESE|KOREAN|CHINESE|HINDI|TAMIL|TELUGU|MALAYALAM|KANADA|THAI|VIETNAMESE|PORTUGUESE|POLISH|TURKISH|ARABIC|DANISH|DUTCH|FINNISH|GREEK|HEBREW|HUNGARIAN|NORWEGIAN|ROMANIAN|SLOVAK|SWEDISH|CROATIAN|SERBIAN|SLOVENIAN|BULGARIAN|CZECH|ESTONIAN|LATVIAN|LITHUANIAN|UKRAINIAN|ENGLISH|ENG|FRE|SPA|ITA|GER|RUS|JPN|KOR|CHI|HIN|TAM|TEL|MAL|KAN|THA|VIE|POR|POL|TUR|ARA|DAN|NLD|FIN|GRE|HEB|HUN|NOR|RON|SLK|SWE|HRV|SRP|SLV|BGR|CES|EST|LAV|LIT|UKR)\b/gi, '') // remove common tags
      .replace(/\s{2,}/g, ' ') // collapse multiple spaces
      .replace(/[^a-zA-Z0-9\s:,'!.-]/g, '') // FIXED: preserve periods for E.T.
      .trim()
      .replace(/\bE\s*T\b/gi, 'E.T.'); // Ensure E.T. is properly formatted
  }
  
  // Remove (year), [type], {tags}, (colorized), and common quality/edition tags
  return title
    .replace(/\([0-9]{4}\)/g, '') // remove (year)
    .replace(/\(colorized\)/gi, '') // remove (colorized)
    .replace(/\([^)]*\)/g, '') // remove any other parenthetical tags
    .replace(/\[[^\]]*\]/g, '') // remove [tags]
    .replace(/\{[^\}]*\}/g, '') // remove {tags}
    .replace(/\b(1080p|720p|2160p|4K|UHD|HD|SD|EXTENDED|SPECIAL|REMASTERED|DC|35mm|UNRATED|UNCUT|WEB[- ]?DL|BLURAY|BRRIP|HDR|XVID|H264|HEVC|AAC|DTS|YIFY|JYK|X265|X264|10bit|8bit|DUAL|MULTI|PROPER|LIMITED|INTERNAL|COMPLETE|REPACK|REMUX|TRUEHD|ATMOS|DV|HDR10|HDR10\+|SDR|FS|WS|RERIP|READNFO|SUBBED|DUBBED|CUSTOM|FRENCH|GERMAN|SPANISH|ITALIAN|RUSSIAN|JAPANESE|KOREAN|CHINESE|HINDI|TAMIL|TELUGU|MALAYALAM|KANADA|THAI|VIETNAMESE|PORTUGUESE|POLISH|TURKISH|ARABIC|DANISH|DUTCH|FINNISH|GREEK|HEBREW|HUNGARIAN|NORWEGIAN|ROMANIAN|SLOVAK|SWEDISH|CROATIAN|SERBIAN|SLOVENIAN|BULGARIAN|CZECH|ESTONIAN|LATVIAN|LITHUANIAN|UKRAINIAN|ENGLISH|ENG|FRE|SPA|ITA|GER|RUS|JPN|KOR|CHI|HIN|TAM|TEL|MAL|KAN|THA|VIE|POR|POL|TUR|ARA|DAN|NLD|FIN|GRE|HEB|HUN|NOR|RON|SLK|SWE|HRV|SRP|SLV|BGR|CES|EST|LAV|LIT|UKR)\b/gi, '') // remove common tags
    .replace(/\./g, ' ') // replace dots with spaces
    .replace(/\s{2,}/g, ' ') // collapse multiple spaces
    .replace(/[^a-zA-Z0-9\s:,'!-]/g, '') // remove most non-alphanum except some punctuation
    .trim();
}

async function fetchTMDBId(title, year) {
  try {
    let url = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    if (year) url += `&year=${year}`;
    console.log(`[DEBUG][TMDB] Query: ${url}`);
    let res = await fetch(url);
    if (!res.ok) return null;
    let data = await res.json();
    if (data.results && data.results.length > 0) return data.results[0].id;
    // Retry without year if nothing found
    if (year) {
      url = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
      console.log(`[DEBUG][TMDB] Retry Query (no year): ${url}`);
      res = await fetch(url);
      if (!res.ok) return null;
      data = await res.json();
      if (data.results && data.results.length > 0) return data.results[0].id;
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function walkMediaWithTMDB(dir, relPath = '', existingKeys = new Set()) {
  const absPath = path.join(dir, relPath);
  const { folders, files } = scanDirectory(absPath);
  
  // FIXED: Handle root directory call properly
  if (!relPath) {
    // This is the root call - process immediate subdirectories as movie folders
    const result = {
      path: '',
      normalizedKey: '', // Root has no normalizedKey
      tmdbId: null,
      folders: [],
      files: []
    };
    
    // Process each immediate subdirectory as a potential movie folder
    for (const folder of folders) {
      const subResult = await walkMediaWithTMDB(dir, folder, existingKeys);
      if (subResult && subResult.normalizedKey) {
        // This is a movie folder, add it to our results
        result.folders.push(subResult);
      }
    }
    return result;
  }
  
  // FIXED: Only process as a movie if this is a TOP-LEVEL folder with video files
  // Skip subdirectories within movie folders (like Extras, Bonus Features, etc.)
  if (files.length === 0) {
    // No video files in this folder, but still recurse into subfolders
    const result = {
      path: relPath,
      normalizedKey: '', // No normalizedKey for folders without video files
      tmdbId: null,
      folders: [],
      files: []
    };
    for (const folder of folders) {
      const subResult = await walkMediaWithTMDB(dir, path.join(relPath, folder), existingKeys);
      if (subResult) {
        result.folders.push(subResult);
      }
    }
    return result;
  }
  
  // FIXED: Only create movie entries for top-level folders (no path separators in relPath)
  if (relPath && (relPath.includes('/') || relPath.includes('\\'))) {
    // This is a subdirectory within a movie folder, don't treat as a movie
    const result = {
      path: relPath,
      normalizedKey: '', // No normalizedKey for subdirectories
      tmdbId: null,
      folders: [],
      files: files.map(f => ({
        name: f,
        absPath: path.join(absPath, f),
        relPath: path.join(relPath, f)
      }))
    };
    // Still recurse into subfolders
    for (const folder of folders) {
      const subResult = await walkMediaWithTMDB(dir, path.join(relPath, folder), existingKeys);
      if (subResult) {
        result.folders.push(subResult);
      }
    }
    return result;
  }
  
  // This is a top-level movie folder (immediate subdirectory of MEDIA_ROOT)
  const folderName = relPath;
  
  // CRITICAL FIX: Remove ONLY technical quality tags, but PRESERVE edition tags and era designators
  // This ensures we get ONE entry per movie per edition/era, not duplicates for each quality
  const cleanFolderName = folderName
    .replace(/\[(1080p|720p|2160p|4K|UHD|HD|SD|REMASTERED|35mm|UNRATED|UNCUT|WEB[- ]?DL|BLURAY|BRRIP|HDR|XVID|H264|HEVC|AAC|DTS|YIFY|JYK|X265|X264|10bit|8bit|DUAL|MULTI|PROPER|LIMITED|INTERNAL|COMPLETE|REPACK|REMUX|TRUEHD|ATMOS|DV|HDR10|HDR10\+|SDR|FS|WS|RERIP|READNFO|SUBBED|DUBBED|CUSTOM|FRENCH|GERMAN|SPANISH|ITALIAN|RUSSIAN|JAPANESE|KOREAN|CHINESE|HINDI|TAMIL|TELUGU|MALAYALAM|KANADA|THAI|VIETNAMESE|PORTUGUESE|POLISH|TURKISH|ARABIC|DANISH|DUTCH|FINNISH|GREEK|HEBREW|HUNGARIAN|NORWEGIAN|ROMANIAN|SLOVAK|SWEDISH|CROATIAN|SERBIAN|SLOVENIAN|BULGARIAN|CZECH|ESTONIAN|LATVIAN|LITHUANIAN|UKRAINIAN|ENGLISH|ENG|FRE|SPA|ITA|GER|RUS|JPN|KOR|CHI|HIN|TAM|TEL|MAL|KAN|THA|VIE|POR|POL|TUR|ARA|DAN|NLD|FIN|GRE|HEB|HUN|NOR|RON|SLK|SWE|HRV|SRP|SLV|BGR|CES|EST|LAV|LIT|UKR)\]/gi, '') // Remove technical quality tags only (PRESERVE EXTENDED, SPECIAL, DC, ENHANCED, ORIGINAL, V2, NEW)
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();
  
  const normalizedKey = cleanFolderName ? normalizeKey(cleanFolderName) : '';
  
  let tmdbId = null;
  let skipMovie = false;
  
  if (normalizedKey && existingTMDBMap[normalizedKey]) {
    tmdbId = existingTMDBMap[normalizedKey];
  } else if (cleanFolderName) {
    // Check for existing Star Trek movies with different era delegators
    if (cleanFolderName.toLowerCase().includes('star trek')) {
      const year = extractYearFromTitle(cleanFolderName);
      
      // Look for existing Star Trek movies with the same year
      for (const [existingKey, existingTmdbId] of Object.entries(existingTMDBMap)) {
        if (existingKey.includes('star.trek') && existingKey.includes(year)) {
          console.log(`[INFO] Skipping Star Trek movie - already exists with different era: ${existingKey}`);
          skipMovie = true;
          break;
        }
      }
    }
    
    // Check for existing Star Wars movies with Roman numerals vs Arabic numerals
    if (cleanFolderName.toLowerCase().includes('star wars')) {
      const year = extractYearFromTitle(cleanFolderName);
      
      // Look for existing Star Wars movies with the same year
      for (const [existingKey, existingTmdbId] of Object.entries(existingTMDBMap)) {
        if (existingKey.includes('star.wars') && existingKey.includes(year)) {
          // Check if this is a Roman numeral vs Arabic numeral conflict
          const hasRomanNumeral = /episode\.(iv|v|vi|vii|viii|ix|x)\./i.test(existingKey);
          const hasArabicNumeral = /episode\.(4|5|6|7|8|9|10)\./i.test(normalizedKey);
          
          if (hasRomanNumeral && hasArabicNumeral) {
            console.log(`[INFO] Skipping Star Wars movie - already exists with Roman numerals: ${existingKey}`);
            skipMovie = true;
            break;
          }
        }
      }
    }
    
    // Check for existing X-Men movies with different variations (X-Men, X Men, Xmen)
    if (cleanFolderName.toLowerCase().includes('x-men') || 
        cleanFolderName.toLowerCase().includes('x men') || 
        cleanFolderName.toLowerCase().includes('xmen')) {
      const year = extractYearFromTitle(cleanFolderName);
      
      // Look for existing X-Men movies with the same year
      for (const [existingKey, existingTmdbId] of Object.entries(existingTMDBMap)) {
        if (existingKey.includes('x.men') && existingKey.includes(year)) {
          console.log(`[INFO] Skipping X-Men movie - already exists: ${existingKey}`);
          skipMovie = true;
          break;
        }
      }
    }
    
    if (!skipMovie && !tmdbId) {
      const year = extractYearFromTitle(cleanFolderName);
      const cleanTitle = cleanTitleForTMDB(cleanFolderName);
      tmdbId = await fetchTMDBId(cleanTitle, year);
      if (!tmdbId && !existingTMDBMap[normalizedKey]) {
        console.log(`[WARN] TMDB ID not found for: ${cleanFolderName}`);
      }
    }
  }
  
  // Skip this movie if it's a duplicate Star Trek
  if (skipMovie) {
    return null;
  }
  
  // Helper function to fix common naming issues in folder/file names
  function fixCommonNamingIssues(pathString) {
    if (!pathString) return pathString;
    
    // Fix "X Men" (with space) to "X-Men" (with hyphen) - X-Men is a special case
    // This should only apply to "X Men" not "2 Guns" or other number+word combinations
    pathString = pathString.replace(/\bX\s+Men\b/gi, 'X-Men');
    
    // Fix "X.Men" (with dots) to "X-Men" (with hyphen) in file names
    // This should only apply to "X.Men" not "2.Guns" or other number+word combinations
    pathString = pathString.replace(/\bX\.Men\b/gi, 'X-Men');
    
    return pathString;
  }
  
  const result = {
    path: fixCommonNamingIssues(relPath),
    normalizedKey,
    tmdbId: tmdbId || null,
    folders: [],
    files: files.map(f => ({
      name: fixCommonNamingIssues(f),
      absPath: path.join(absPath, f),
      relPath: fixCommonNamingIssues(path.join(relPath, f))
    }))
  };
  
  // Recurse into subfolders but don't treat them as movies
  for (const folder of folders) {
    const subResult = await walkMediaWithTMDB(dir, path.join(relPath, folder), existingKeys);
    if (subResult) {
      result.folders.push(subResult);
    }
  }
  return result;
}

function flattenFolders(tree) {
    // Flattens the folder tree into an array of folder objects with normalizedKey
    const result = [];
    function recurse(node) {
        if (node.normalizedKey) result.push(node);
        for (const folder of node.folders) {
            recurse(folder);
        }
    }
    recurse(tree);
    return result;
}

async function main() {
    console.log(`🔍 [SCAN] Scanning MOVIES library at: ${MEDIA_ROOT}`);
    
    // Check if media root exists
    if (!fs.existsSync(MEDIA_ROOT)) {
        console.error(`❌ [SCAN] Error: Media root directory does not exist: ${MEDIA_ROOT}`);
        process.exit(1);
    }
    
    try {
        // FIXED: Load existing data first to create proper exclusion set
        let existingData = {};
        try {
            if (fs.existsSync(OUTPUT_FILE)) {
                existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
                console.log(`📖 [SCAN] Loaded existing data with ${Object.keys(existingData).length} movies`);
            }
        } catch (e) {
            console.log(`⚠️ [SCAN] Could not load existing data: ${e.message}`);
        }
        
        // BULLETPROOF: Create a set of all existing keys (normalized to lowercase) for fast lookup
        const existingKeysSet = new Set(Object.keys(existingData).map(key => key.toLowerCase()));
        
        // ALSO: Create a map of existing movies by their folder path (absPath) from JSON data
        // This catches duplicates where the same folder exists with different titles (e.g., "X-Men 2" vs "X2")
        const existingPathsSet = new Set();
        for (const [key, movie] of Object.entries(existingData)) {
            // Check the movie's absPath (folder path) - this is the primary folder path
            if (movie.absPath) {
                const normalizedPath = movie.absPath.replace(/\\/g, '/').toLowerCase().trim();
                existingPathsSet.add(normalizedPath);
            }
            // Also check all files' directory paths (the folder containing the file)
            // This catches cases where absPath might not be set but files are
            if (movie.files && Array.isArray(movie.files)) {
                movie.files.forEach(file => {
                    if (file.absPath) {
                        // Get the directory path (folder) from the file path
                        const fileDir = path.dirname(file.absPath).replace(/\\/g, '/').toLowerCase().trim();
                        existingPathsSet.add(fileDir);
                    }
                });
            }
        }
        console.log(`📊 [SCAN] Built path set with ${existingPathsSet.size} existing folder paths from JSON`);
        
        const mediaTree = await walkMediaWithTMDB(MEDIA_ROOT, '', existingKeysSet);
        const flatFolders = flattenFolders(mediaTree);
        
        // Start with existing data - DO NOT OVERWRITE
        const unifiedOutput = { ...existingData };
        
        let newMoviesAdded = 0;
        let existingMoviesSkipped = 0;
        const newMoviesList = []; // Track which movies were added
        
        console.log(`📊 [SCAN] Found ${Object.keys(existingData).length} existing movies in library`);
        console.log(`📊 [SCAN] Found ${flatFolders.length} folders to process`);
        
        for (const folder of flatFolders) {
            let normalizedKey = folder.normalizedKey;
            if (normalizedKey) {
                console.log(`🔍 [SCAN] Processing folder: "${folder.path}" → normalizedKey: "${normalizedKey}"`);
                
                // CRITICAL FIX: Apply Star Trek era detection BEFORE checking for duplicates
                let processedTitle = detectStarTrekEra(folder.path, existingKeysSet);
                
                // If Star Trek detection returns null, skip this movie (already exists)
                if (processedTitle === null) {
                    existingMoviesSkipped++;
                    continue;
                }
                
                if (processedTitle !== folder.path) {
                  console.log(`🎬 [SCAN] Star Trek era detected: "${folder.path}" → "${processedTitle}"`);
                  // CRITICAL FIX: Use NormalizationService to ensure consistent normalization
                  normalizedKey = normalizeKey(processedTitle);
                  console.log(`🔄 [SCAN] Updated normalizedKey: "${folder.normalizedKey}" → "${normalizedKey}"`);
                }
                
                // BULLETPROOF: Check if this movie already exists using the normalized set (after Star Trek processing)
                const normalizedKeyLower = normalizedKey.toLowerCase();
                
                if (existingKeysSet.has(normalizedKeyLower)) {
                    // Find the actual existing key (preserve original case)
                    const existingKey = Object.keys(existingData).find(key => 
                        key.toLowerCase() === normalizedKeyLower
                    );
                    console.log(`⏭️ [SCAN] ✅ SKIPPING existing movie: "${folder.path}" → "${normalizedKey}" (found as: "${existingKey}")`);
                    existingMoviesSkipped++;
                    continue; // SKIP - don't touch existing movies!
                }
                
                // ALSO CHECK: Check if this folder path already exists in JSON data (catches different titles for same folder)
                // Use the JSON data structure - check absPath from existing movies
                const folderAbsPath = path.join(MEDIA_ROOT, folder.path).replace(/\\/g, '/').toLowerCase().trim();
                
                // Check if this folder path exists in any existing movie's absPath or files' directory paths
                if (existingPathsSet.has(folderAbsPath)) {
                    // Find which existing movie has this path from JSON data
                    let existingMovieKey = null;
                    let foundPath = null;
                    for (const [key, movie] of Object.entries(existingData)) {
                        // Check movie's absPath
                        if (movie.absPath) {
                            const moviePath = movie.absPath.replace(/\\/g, '/').toLowerCase().trim();
                            if (moviePath === folderAbsPath) {
                                existingMovieKey = key;
                                foundPath = movie.absPath;
                                break;
                            }
                        }
                        // Check files' directory paths
                        if (movie.files && Array.isArray(movie.files)) {
                            for (const file of movie.files) {
                                if (file.absPath) {
                                    const fileDirPath = path.dirname(file.absPath).replace(/\\/g, '/').toLowerCase().trim();
                                    if (fileDirPath === folderAbsPath) {
                                        existingMovieKey = key;
                                        foundPath = path.dirname(file.absPath);
                                        break;
                                    }
                                }
                            }
                            if (existingMovieKey) break;
                        }
                    }
                    console.log(`⏭️ [SCAN] ✅ SKIPPING existing movie by path: "${folder.path}" → "${normalizedKey}" (found in JSON as: "${existingMovieKey}" with path: "${foundPath}")`);
                    existingMoviesSkipped++;
                    continue; // SKIP - this folder already exists in the JSON with a different title!
                }
                
                console.log(`➕ [SCAN] ✅ NEW movie found: "${folder.path}" → "${normalizedKey}"`);
                newMoviesList.push(`${folder.path} → ${normalizedKey}`); // Track this new movie
                
                // BULLETPROOF: Double-check that we're not about to create a duplicate
                if (unifiedOutput[normalizedKey]) {
                    console.log(`🚨 [SCAN] WARNING: About to create duplicate for key: ${normalizedKey}`);
                    console.log(`🚨 [SCAN] This should never happen - skipping to prevent corruption`);
                    continue;
                }
                
                // Only add NEW movies (after potential Star Trek era detection)
                console.log(`➕ [SCAN] Adding NEW movie: ${normalizedKey}`);
                
                const year = extractYearFromTitle(processedTitle || folder.path);
                
                // CRITICAL: Ensure all required path fields are included
                const primaryFile = folder.files && folder.files.length > 0 ? folder.files[0] : null;
                const moviePath = primaryFile ? primaryFile.relPath : folder.path;
                const movieAbsPath = primaryFile ? primaryFile.absPath : path.join(MEDIA_ROOT, folder.path);
                
                unifiedOutput[normalizedKey] = {
                    type: "movie",
                    isMovie: true,
                    title: processedTitle, // Use the processed title with era designator
                    TMDBTitle: folder.path, // Use the original title for TMDB (without our custom era designators)
                    dateAdded: new Date().toISOString(), // Add date when movie was added to library (right after TMDBTitle)
                    year: year,
                    normalizedKey: normalizedKey,
                    tmdbId: folder.tmdbId,
                    description: '', // New movie, no description yet
                    cast: [], // New movie, no cast yet
                    poster: '', // New movie, no poster yet
                    path: moviePath, // CRITICAL: Required for save functionality
                    absPath: path.dirname(movieAbsPath), // CRITICAL: Required for save functionality
                    relPath: moviePath, // CRITICAL: Required for Watch Later save functionality
                    files: folder.files || [],
                    genres: ['Drama'] // Default genre for new movies
                };
                
                // BULLETPROOF: Add to our tracking set to prevent duplicates within this run
                existingKeysSet.add(normalizedKeyLower);
                newMoviesAdded++;
            }
        }
        
        console.log(`📊 [SCAN] Summary:`);
        console.log(`   - Existing movies preserved: ${existingMoviesSkipped}`);
        console.log(`   - New movies added: ${newMoviesAdded}`);
        console.log(`   - Total movies in library: ${Object.keys(unifiedOutput).length}`);
        
        // Only create backup if we're actually making changes
        if (newMoviesAdded > 0) {
            if (fs.existsSync(OUTPUT_FILE)) {
                // Create bkup directory if it doesn't exist
                const bkupDir = path.join(path.dirname(OUTPUT_FILE), 'bkup');
                if (!fs.existsSync(bkupDir)) {
                    fs.mkdirSync(bkupDir, { recursive: true });
                    console.log(`📁 [SCAN] Created backup directory: ${bkupDir}`);
                }
                
                // Create backup with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupFile = path.join(bkupDir, `movies-unified_backup_${timestamp}.json`);
                fs.copyFileSync(OUTPUT_FILE, backupFile);
                console.log(`💾 [SCAN] Backup created: ${backupFile}`);
            }
            
            // Write the updated data
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(unifiedOutput, null, 2));
            console.log(`✅ [SCAN] MOVIES scan complete. Added ${newMoviesAdded} new movies.`);
            
            // FIXED: List the new movies that were added with bullet points
            if (newMoviesList.length > 0) {
                console.log(`\n📋 [SCAN] NEW MOVIES ADDED:`);
                newMoviesList.forEach((movie, index) => {
                    console.log(`   • ${movie}`);
                });
            }
            
            console.log(`\n✅ [SCAN] Total: ${Object.keys(unifiedOutput).length} movies`);
        } else {
            console.log(`✅ [SCAN] No new movies found. Existing library unchanged.`);
            console.log(`✅ [SCAN] Total: ${Object.keys(unifiedOutput).length} movies`);
        }
        
    } catch (error) {
        console.error(`❌ [SCAN] Fatal error during scan: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} 
