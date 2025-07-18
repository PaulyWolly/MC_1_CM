/*
  SCAN_MEDIA_LIBRARY_TV-SHOWS.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const OUTPUT_FILE = path.join(__dirname, '../server/data/media-library-tv-shows.json');
const SEASON_IMAGES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_season_images.json');
const EPISODE_IMAGES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_episode_images.json');
const TV_POSTERS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv_posters.json');

function isVideoFile(filename) {
    const exts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    return exts.includes(path.extname(filename).toLowerCase());
}

function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const folders = [];
    const files = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            folders.push(entry.name);
        } else if (entry.isFile() && isVideoFile(entry.name)) {
            files.push(entry.name);
        }
    }
    return { folders, files };
}

function walkMedia(dir, relPath = '', images = {}, tvPosters = {}) {
    const absPath = path.join(dir, relPath);
    const { folders, files } = scanDirectory(absPath);
    const result = {
        path: relPath,
        folders: [],
        files: files.map(f => ({
            name: f,
            absPath: path.join(absPath, f),
            relPath: path.join(relPath, f)
        }))
    };
    for (const folder of folders) {
        result.folders.push(walkMedia(dir, path.join(relPath, folder), images, tvPosters));
    }
    // If this is a show root, attach main poster if available
    const relParts = relPath.split(path.sep).filter(Boolean);
    if (relParts.length === 1) {
        const showName = relParts[0];
        if (tvPosters[showName]) {
            result.poster = tvPosters[showName];
        }
    }
    // If this is a season folder, try to attach poster and episode stills
    if (relParts.length === 2) {
        const [showName, seasonFolder] = relParts;
        const seasonMatch = seasonFolder.match(/season[ _-]?(\d+)/i);
        if (seasonMatch) {
            const seasonNum = String(parseInt(seasonMatch[1], 10));
            if (images[showName] && images[showName].seasons && images[showName].seasons[seasonNum]) {
                const seasonData = images[showName].seasons[seasonNum];
                result.poster = seasonData.poster || null;
                // Attach stills to episodes by matching episode number in filename, but ONLY for files that exist
                for (const fileObj of result.files) {
                    const epMatch = fileObj.name.match(/S\d+E(\d+)/i);
                    if (epMatch) {
                        const epNum = String(parseInt(epMatch[1], 10));
                        if (seasonData.episodes && seasonData.episodes[epNum] && seasonData.episodes[epNum].still) {
                            fileObj.still = seasonData.episodes[epNum].still;
                        }
                    }
                }
            }
        }
    }
    return result;
}

function main() {
    const showArg = process.argv[2]; // Optional TV show name
    let scanRoot = MEDIA_ROOT;
    let outputFile = OUTPUT_FILE;
    let scanSingleShow = false;
    if (showArg) {
        scanRoot = path.join(MEDIA_ROOT, showArg);
        scanSingleShow = true;
        outputFile = path.join(__dirname, `../server/data/media-library-tv-shows-${showArg.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
    }
    console.log(`Scanning TV-SHOWS library at: ${scanRoot}`);
    let seasonImages = {};
    let episodeImages = {};
    let tvPosters = {};
    
    // Load season images
    try {
        seasonImages = JSON.parse(fs.readFileSync(SEASON_IMAGES_JSON, 'utf8'));
        console.log('✅ Loaded season images data');
    } catch (e) {
        console.warn('Could not load season images JSON:', e.message);
    }
    
    // Load episode images
    try {
        episodeImages = JSON.parse(fs.readFileSync(EPISODE_IMAGES_JSON, 'utf8'));
        console.log('✅ Loaded episode images data');
    } catch (e) {
        console.warn('Could not load episode images JSON:', e.message);
    }

    // Load TV posters
    try {
        tvPosters = JSON.parse(fs.readFileSync(TV_POSTERS_JSON, 'utf8'));
        console.log('✅ Loaded TV posters data');
    } catch (e) {
        console.warn('Could not load TV posters JSON:', e.message);
    }
    
    // Merge the image data
    const images = {};
    for (const showName in seasonImages) {
        images[showName] = { seasons: {} };
        if (seasonImages[showName].seasons) {
            for (const seasonNum in seasonImages[showName].seasons) {
                images[showName].seasons[seasonNum] = {
                    poster: seasonImages[showName].seasons[seasonNum].poster || null,
                    episodes: {}
                };
                
                // Add episode data if available
                if (episodeImages[showName] && 
                    episodeImages[showName].seasons && 
                    episodeImages[showName].seasons[seasonNum] &&
                    episodeImages[showName].seasons[seasonNum].episodes) {
                    images[showName].seasons[seasonNum].episodes = episodeImages[showName].seasons[seasonNum].episodes;
                }
            }
        }
    }
    
    let mediaTree;
    if (scanSingleShow) {
        if (!fs.existsSync(scanRoot)) {
            console.error(`Show folder not found: ${scanRoot}`);
            process.exit(1);
        }
        mediaTree = walkMedia(scanRoot, '', images, tvPosters);
        // Output as a single-show array for consistency
        fs.writeFileSync(outputFile, JSON.stringify([mediaTree], null, 2));
        console.log(`TV-SHOW scan complete. Output written to: ${outputFile}`);
    } else {
        mediaTree = walkMedia(scanRoot, '', images, tvPosters);
        fs.writeFileSync(outputFile, JSON.stringify(mediaTree, null, 2));
        console.log(`TV-SHOWS scan complete. Output written to: ${outputFile}`);
    }
}

if (require.main === module) {
    main();
}