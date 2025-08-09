/*
  CHECK_AUDIO_CODECS_TV-SHOWS.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Paths
const MEDIA_LIBRARY_PATH = path.join(__dirname, '../server/data/media-library.json');
const LOG_PATH = path.join(__dirname, '../logs/check_audio_codecs_tv-shows_SINGLE_SHOW.js.log');
const OUTPUT_PATH = path.join(__dirname, 'audio_codec_report_tv-shows_SINGLE_SHOW.json');

// Helper to log to both console and file
function logLine(line) {
    console.log(line);
    fs.appendFileSync(LOG_PATH, line + '\n');
}

// Audio codecs that browsers typically can't play
const INCOMPATIBLE_CODECS = ['ac3', 'dts', 'eac3', 'truehd', 'atmos'];

async function checkAudioCodec(filePath) {
    try {
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

function collectAllFiles(folder) {
    let files = [];
    if (folder.files && Array.isArray(folder.files)) {
        files = files.concat(folder.files.map(f => ({...f, absPath: f.absPath})));
    }
    if (folder.folders && Array.isArray(folder.folders)) {
        for (const subfolder of folder.folders) {
            files = files.concat(collectAllFiles(subfolder));
        }
    }
    return files;
}

async function scanSingleShow(showName) {
    try {
        fs.writeFileSync(LOG_PATH, '');
        logLine(`[AUDIO-SCAN] Loading media library...`);
        const mediaLibraryData = JSON.parse(fs.readFileSync(MEDIA_LIBRARY_PATH, 'utf8'));
        const allFiles = collectAllFiles(mediaLibraryData);
        // Only scan files that match the show name (case-insensitive)
        const showFiles = allFiles.filter(item =>
            item.absPath && item.absPath.toLowerCase().includes(showName.toLowerCase())
        );
        logLine(`[AUDIO-SCAN] Found ${showFiles.length} episodes for show: ${showName}`);
        const results = [];
        let processed = 0;
        for (const episode of showFiles) {
            processed++;
            logLine(`[AUDIO-SCAN] Processing ${processed}/${showFiles.length}: ${path.basename(episode.absPath)}`);
            const audioInfo = await checkAudioCodec(episode.absPath);
            results.push({
                title: episode.name || path.basename(episode.absPath),
                path: episode.absPath,
                ...audioInfo
            });
        }
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
        logLine(`[AUDIO-SCAN] Scan complete. Results written to ${OUTPUT_PATH}`);
    } catch (err) {
        logLine(`[AUDIO-SCAN] Error: ${err}`);
    }
}

// Entry point
const showName = process.argv[2];
if (!showName) {
    console.log('Usage: node check_audio_codecs_tv-shows_SINGLE_SHOW.js "Show Name"');
    process.exit(1);
}
scanSingleShow(showName); 