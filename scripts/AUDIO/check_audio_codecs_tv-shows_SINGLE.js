/*
  CHECK_AUDIO_CODECS_TV-SHOWS_SINGLE.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Paths
const MEDIA_LIBRARY_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
const OUTPUT_PATH = path.join(__dirname, 'audio_codec_report_tv-shows_SINGLE.json');
const LOG_PATH = path.join(__dirname, '../logs/check_audio_codecs_tv-shows_SINGLE.js.log');

// Helper to log to both console and file
function logLine(line) {
    console.log(line);
    fs.appendFileSync(LOG_PATH, line + '\n');
}

// Audio codecs that browsers typically can't play
const INCOMPATIBLE_CODECS = ['ac3', 'dts', 'eac3', 'truehd', 'atmos'];

async function checkAudioCodec(filePath) {
    try {
        // Use ffprobe to get audio stream info
        const command = `ffprobe -v quiet -print_format json -show_streams "${filePath}"`;
        const { stdout } = await execAsync(command);
        const data = JSON.parse(stdout);
        
        const audioStreams = data.streams?.filter(stream => stream.codec_type === 'audio') || [];
        
        if (audioStreams.length === 0) {
            return { hasAudio: false, codecs: [], error: 'No audio streams found' };
        }
        
        const codecs = audioStreams.map(stream => stream.codec_name?.toLowerCase()).filter(Boolean);
        const hasIncompatibleCodec = codecs.some(codec => INCOMPATIBLE_CODECS.includes(codec));
        
        return {
            hasAudio: true,
            codecs,
            hasIncompatibleCodec,
            incompatibleCodecs: codecs.filter(codec => INCOMPATIBLE_CODECS.includes(codec))
        };
    } catch (error) {
        return { hasAudio: false, codecs: [], error: error.message };
    }
}

// Recursively collect all files from the nested folder structure
function collectAllFilesFromTVShows(tvShows) {
    let files = [];
    for (const show of tvShows) {
        if (show.seasons && Array.isArray(show.seasons)) {
            for (const season of show.seasons) {
                if (season.episodes && Array.isArray(season.episodes)) {
                    for (const ep of season.episodes) {
                        if (ep.filePath) {
                            files.push({
                                filePath: ep.filePath,
                                name: ep.filename || ep.name || ep.filePath
                            });
                        }
                    }
                }
            }
        }
    }
    return files;
}

async function scanSingleTVShowWithSeason(showName, seasonFilter) {
    try {
        fs.writeFileSync(LOG_PATH, '');
        logLine(`[AUDIO-SCAN] Loading media library...`);
        const mediaLibraryData = JSON.parse(fs.readFileSync(MEDIA_LIBRARY_PATH, 'utf8'));
        
        // Handle the correct structure: { path, folders, files }
        const allFiles = [];
        if (mediaLibraryData.files && Array.isArray(mediaLibraryData.files)) {
            allFiles.push(...mediaLibraryData.files);
        }
        if (mediaLibraryData.folders && Array.isArray(mediaLibraryData.folders)) {
            for (const folder of mediaLibraryData.folders) {
                if (folder.files && Array.isArray(folder.files)) {
                    allFiles.push(...folder.files);
                }
            }
        }
        
        let showFiles = allFiles.filter(item =>
            item.filePath && item.filePath.toLowerCase().includes(showName.toLowerCase())
        );
        if (seasonFilter) {
            showFiles = showFiles.filter(item =>
                item.filePath && item.filePath.toLowerCase().includes(seasonFilter.toLowerCase())
            );
        }
        logLine(`[AUDIO-SCAN] Found ${showFiles.length} episodes for show: ${showName}` + (seasonFilter ? `, season: ${seasonFilter}` : ''));
        const results = [];
        let processed = 0;
        for (const episode of showFiles) {
            processed++;
            logLine(`[AUDIO-SCAN] Processing ${processed}/${showFiles.length}: ${path.basename(episode.filePath)}`);
            const audioInfo = await checkAudioCodec(episode.filePath);
            results.push({
                title: episode.name || episode.filename || path.basename(episode.filePath),
                path: episode.filePath,
                ...audioInfo
            });
        }
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
        logLine(`[AUDIO-SCAN] Scan complete. Results written to ${OUTPUT_PATH}`);
    } catch (err) {
        logLine(`[AUDIO-SCAN] Error: ${err}`);
    }
}

// MAIN
const showName = process.argv[2];
const seasonFilter = process.argv[3];
if (!showName) {
    console.error('Usage: node check_audio_codecs_tv-shows_SINGLE.js "<Show Name>" [Season Filter]');
    process.exit(1);
}
scanSingleTVShowWithSeason(showName, seasonFilter); 