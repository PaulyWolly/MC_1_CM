/*
  CHECK_AUDIO_CODECS_TV-SHOWS.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Paths
const MEDIA_LIBRARY_PATH = path.join(__dirname, '../server/data/media-library.json');
const OUTPUT_PATH = path.join(__dirname, 'audio_codec_report_tv-shows.json');
const LOG_PATH = path.join(__dirname, '../logs/check_audio_codecs_tv-shows.js.log');

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

async function scanAllTVShows() {
    try {
        // Clear previous log
        fs.writeFileSync(LOG_PATH, '');
        logLine('🎵 [AUDIO-SCAN] Loading media library...');
        const mediaLibraryData = JSON.parse(fs.readFileSync(MEDIA_LIBRARY_PATH, 'utf8'));
        // Recursively collect all files
        const allFiles = collectAllFiles(mediaLibraryData);
        // Only scan files that are in TV-SHOWS path
        const tvshows = allFiles.filter(item =>
            item.absPath && (
                item.absPath.includes('TV-SHOWS') ||
                item.absPath.includes('TV_SHOWS') ||
                item.absPath.includes('tv-shows') ||
                item.absPath.includes('tv_shows')
            )
        );
        logLine(`🎵 [AUDIO-SCAN] Found ${tvshows.length} TV show episodes to scan...`);
        
        const results = [];
        let processed = 0;
        
        for (const episode of tvshows) {
            processed++;
            logLine(`🎵 [AUDIO-SCAN] Processing ${processed}/${tvshows.length}: ${path.basename(episode.absPath)}`);
            
            const audioInfo = await checkAudioCodec(episode.absPath);
            results.push({
                title: episode.name || path.basename(episode.absPath),
                path: episode.absPath,
                ...audioInfo
            });
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Filter problematic files
        const problematicFiles = results.filter(result => 
            !result.hasAudio || result.hasIncompatibleCodec
        );
        
        const summary = {
            totalEpisodes: tvshows.length,
            noAudio: results.filter(r => !r.hasAudio).length,
            incompatibleCodecs: results.filter(r => r.hasIncompatibleCodec).length,
            problematicFiles: problematicFiles.length,
            results: results,
            problematicFiles: problematicFiles
        };
        
        // Save detailed report
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2));
        
        logLine('\n🎵 [AUDIO-SCAN] Scan complete!');
        logLine(`📊 Summary:`);
        logLine(`   Total episodes: ${summary.totalEpisodes}`);
        logLine(`   No audio: ${summary.noAudio}`);
        logLine(`   Incompatible codecs: ${summary.incompatibleCodecs}`);
        logLine(`   Problematic files: ${summary.problematicFiles}`);
        
        if (problematicFiles.length > 0) {
            logLine('\n🚨 Problematic files:');
            problematicFiles.forEach(file => {
                logLine(`   - ${file.title}`);
                if (file.error) {
                    logLine(`     Error: ${file.error}`);
                } else if (file.incompatibleCodecs.length > 0) {
                    logLine(`     Incompatible codecs: ${file.incompatibleCodecs.join(', ')}`);
                }
            });
        }
        
        logLine(`\n📄 Detailed report saved to: ${OUTPUT_PATH}`);
        
    } catch (error) {
        logLine('❌ [AUDIO-SCAN] Error: ' + error);
    }
}

// Run the scan
scanAllTVShows(); 