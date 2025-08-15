/*
  SCAN_MEDIA_LIBRARY_MOVIES.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
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
const OUTPUT_FILE = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/media-library-movies_normalized.json');

let existingTMDBMap = {};
try {
  const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
  for (const folder of existing.folders || []) {
    if (folder.normalizedKey && folder.tmdbId) {
      existingTMDBMap[folder.normalizedKey] = folder.tmdbId;
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
    // Preserve periods in abbreviations like E.T., A.I., etc. before general dot replacement
    .replace(/(\b\w)\.(\w\b)/g, '$1__PERIOD__$2')
    .replace(/\./g, ' ') // replace remaining dots with spaces
    .replace(/__PERIOD__/g, '.') // restore protected periods
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
  // Only process as a movie if there is at least one video file
  if (files.length === 0) {
    // Still recurse into subfolders, but do not attempt TMDB lookup for this folder
    const result = {
      path: relPath,
      normalizedKey: relPath ? normalizeKey(relPath.split(/[\\/]/).filter(Boolean).pop()) : '',
      tmdbId: null,
      folders: [],
      files: []
    };
    for (const folder of folders) {
      result.folders.push(await walkMediaWithTMDB(dir, path.join(relPath, folder)));
    }
    return result;
  }
  const folderName = relPath ? relPath.split(/[\\/]/).filter(Boolean).pop() : '';
  const normalizedKey = folderName ? normalizeKey(folderName) : '';
  let tmdbId = null;
  if (normalizedKey && existingTMDBMap[normalizedKey]) {
    tmdbId = existingTMDBMap[normalizedKey];
  } else if (folderName) {
    const year = extractYearFromTitle(folderName);
    const cleanTitle = cleanTitleForTMDB(folderName);
    tmdbId = await fetchTMDBId(cleanTitle, year);
    if (!tmdbId && !existingTMDBMap[normalizedKey]) {
      console.warn(`[WARN] TMDB ID not found for: ${folderName}`);
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
        const output = {
            path: '',
            folders: flatFolders
        };
        
        // Create backup of existing file
        if (fs.existsSync(OUTPUT_FILE)) {
            // Create bkup directory if it doesn't exist
            const bkupDir = path.join(path.dirname(OUTPUT_FILE), 'bkup');
            if (!fs.existsSync(bkupDir)) {
                fs.mkdirSync(bkupDir, { recursive: true });
                console.log(`📁 [SCAN] Created backup directory: ${bkupDir}`);
            }
            
            // Move backup to bkup folder with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(bkupDir, `media-library-movies_normalized_backup_${timestamp}.json`);
            fs.copyFileSync(OUTPUT_FILE, backupFile);
            console.log(`💾 [SCAN] Backup created: ${backupFile}`);
        }
        
        // Write the data
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        
        console.log(`✅ [SCAN] MOVIES scan complete. Output written to: ${OUTPUT_FILE}`);
        console.log(`📊 [SCAN] Found ${flatFolders.length} valid movies`);
        
    } catch (error) {
        console.error(`❌ [SCAN] Fatal error during scan: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} 