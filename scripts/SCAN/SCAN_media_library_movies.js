/*
  SCAN_MEDIA_LIBRARY_MOVIES.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../../shared/NormalizationService');
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

function cleanTitleForTMDB(title) {
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

async function walkMediaWithTMDB(dir, relPath = '') {
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
      const subResult = await walkMediaWithTMDB(dir, folder);
      if (subResult.normalizedKey) {
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
      result.folders.push(await walkMediaWithTMDB(dir, path.join(relPath, folder)));
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
      result.folders.push(await walkMediaWithTMDB(dir, path.join(relPath, folder)));
    }
    return result;
  }
  
  // This is a top-level movie folder (immediate subdirectory of MEDIA_ROOT)
  const folderName = relPath;
  
  // CRITICAL FIX: Remove quality tags BEFORE creating normalizedKey
  // This ensures we get ONE entry per movie, not duplicates for each quality
  const cleanFolderName = folderName
    .replace(/\[[^\]]*\]/g, '') // Remove [1080p], [720p], etc.
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();
  
  const normalizedKey = cleanFolderName ? normalizeKey(cleanFolderName) : '';
  
  let tmdbId = null;
  if (normalizedKey && existingTMDBMap[normalizedKey]) {
    tmdbId = existingTMDBMap[normalizedKey];
  } else if (cleanFolderName) {
    const year = extractYearFromTitle(cleanFolderName);
    const cleanTitle = cleanTitleForTMDB(cleanFolderName);
    tmdbId = await fetchTMDBId(cleanTitle, year);
    if (!tmdbId && !existingTMDBMap[normalizedKey]) {
      console.log(`[WARN] TMDB ID not found for: ${cleanFolderName}`);
    }
  }
  
  const result = {
    path: relPath,
    normalizedKey,
    tmdbId: tmdbId || null,
    folders: [],
    files: files.map(f => ({
      name: f,
      absPath: path.join(absPath, f),
      relPath: path.join(relPath, f)
    }))
  };
  
  // Recurse into subfolders but don't treat them as movies
  for (const folder of folders) {
    result.folders.push(await walkMediaWithTMDB(dir, path.join(relPath, folder)));
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
        const mediaTree = await walkMediaWithTMDB(MEDIA_ROOT);
        const flatFolders = flattenFolders(mediaTree);
        
        // FIXED: Only add NEW movies, NEVER overwrite existing data
        let existingData = {};
        try {
            if (fs.existsSync(OUTPUT_FILE)) {
                existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
                console.log(`📖 [SCAN] Loaded existing data with ${Object.keys(existingData).length} movies`);
            }
        } catch (e) {
            console.log(`⚠️ [SCAN] Could not load existing data: ${e.message}`);
        }
        
        // Start with existing data - DO NOT OVERWRITE
        const unifiedOutput = { ...existingData };
        
        let newMoviesAdded = 0;
        let existingMoviesSkipped = 0;
        
        // BULLETPROOF: Create a set of all existing keys (normalized to lowercase) for fast lookup
        const existingKeysSet = new Set(Object.keys(existingData).map(key => key.toLowerCase()));
        
        for (const folder of flatFolders) {
            const normalizedKey = folder.normalizedKey;
            if (normalizedKey) {
                // BULLETPROOF: Check if this movie already exists using the normalized set
                const normalizedKeyLower = normalizedKey.toLowerCase();
                
                if (existingKeysSet.has(normalizedKeyLower)) {
                    // Find the actual existing key (preserve original case)
                    const existingKey = Object.keys(existingData).find(key => 
                        key.toLowerCase() === normalizedKeyLower
                    );
                    console.log(`⏭️ [SCAN] Skipping existing movie: ${normalizedKey} (found as: ${existingKey})`);
                    existingMoviesSkipped++;
                    continue; // SKIP - don't touch existing movies!
                }
                
                // BULLETPROOF: Double-check that we're not about to create a duplicate
                if (unifiedOutput[normalizedKey]) {
                    console.log(`🚨 [SCAN] WARNING: About to create duplicate for key: ${normalizedKey}`);
                    console.log(`🚨 [SCAN] This should never happen - skipping to prevent corruption`);
                    continue;
                }
                
                // Only add NEW movies
                console.log(`➕ [SCAN] Adding NEW movie: ${normalizedKey}`);
                const year = extractYearFromTitle(folder.path);
                
                // CRITICAL: Ensure all required path fields are included
                const primaryFile = folder.files && folder.files.length > 0 ? folder.files[0] : null;
                const moviePath = primaryFile ? primaryFile.relPath : folder.path;
                const movieAbsPath = primaryFile ? primaryFile.absPath : path.join(MEDIA_ROOT, folder.path);
                
                unifiedOutput[normalizedKey] = {
                    type: "movie",
                    isMovie: true,
                    title: folder.path,
                    TMDBTitle: folder.path,
                    year: year,
                    normalizedKey: normalizedKey,
                    tmdbId: folder.tmdbId,
                    description: '', // New movie, no description yet
                    cast: [], // New movie, no cast yet
                    poster: '', // New movie, no poster yet
                    path: moviePath, // CRITICAL: Required for save functionality
                    absPath: path.dirname(movieAbsPath), // CRITICAL: Required for save functionality
                    files: folder.files || []
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
        console.log(`   - Expected: 530 movies (one per actual movie folder)`);
        
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
            console.log(`✅ [SCAN] Total: ${Object.keys(unifiedOutput).length} movies (should be ~530)`);
        } else {
            console.log(`✅ [SCAN] No new movies found. Existing library unchanged.`);
            console.log(`✅ [SCAN] Total: ${Object.keys(unifiedOutput).length} movies (should be ~530)`);
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