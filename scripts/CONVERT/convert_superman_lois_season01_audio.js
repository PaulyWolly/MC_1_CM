/*
  CONVERT_SUPERMAN_LOIS_SEASON01_AUDIO.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Paths
const SEASON_PATH = 'S:\\MEDIA\\TV-SHOWS\\Superman & Lois\\Season 01';
const LOG_PATH = path.join(__dirname, '../logs/convert_superman_lois_season01_audio.js.log');

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

async function convertAudioToAAC(inputPath, outputPath) {
    try {
        // Create output directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // FFmpeg command to convert audio to AAC while keeping video unchanged
        const command = `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
        
        logLine(`[CONVERT] Converting: ${path.basename(inputPath)}`);
        logLine(`[CONVERT] Command: ${command}`);
        
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr) {
            logLine(`[CONVERT] FFmpeg stderr: ${stderr}`);
        }
        
        logLine(`[CONVERT] ✅ Successfully converted: ${path.basename(inputPath)}`);
        return true;
    } catch (error) {
        logLine(`[CONVERT] ❌ Error converting ${path.basename(inputPath)}: ${error.message}`);
        return false;
    }
}

async function processSeason01() {
    try {
        fs.writeFileSync(LOG_PATH, '');
        logLine(`[AUDIO-CONVERT] Starting Superman & Lois Season 01 audio conversion...`);
        
        // Get all .mkv files in the Season 01 directory
        const files = fs.readdirSync(SEASON_PATH)
            .filter(file => file.toLowerCase().endsWith('.mkv'))
            .map(file => path.join(SEASON_PATH, file));
        
        logLine(`[AUDIO-CONVERT] Found ${files.length} .mkv files in Season 01`);
        
        const results = [];
        let processed = 0;
        let converted = 0;
        let skipped = 0;
        
        for (const filePath of files) {
            processed++;
            logLine(`[AUDIO-CONVERT] Processing ${processed}/${files.length}: ${path.basename(filePath)}`);
            
            // Check current audio codec
            const audioInfo = await checkAudioCodec(filePath);
            
            if (audioInfo.hasAudio && audioInfo.hasIncompatibleCodec) {
                logLine(`[AUDIO-CONVERT] Found incompatible codec: ${audioInfo.incompatibleCodecs.join(', ')}`);
                
                // Create backup path
                const backupPath = filePath.replace('.mkv', '.mkv.backup');
                
                // Create output path (same as input, will overwrite)
                const outputPath = filePath;
                
                // Backup original file
                logLine(`[AUDIO-CONVERT] Creating backup: ${path.basename(backupPath)}`);
                fs.copyFileSync(filePath, backupPath);
                
                // Convert audio
                const success = await convertAudioToAAC(filePath, outputPath);
                
                if (success) {
                    converted++;
                    logLine(`[AUDIO-CONVERT] ✅ Converted: ${path.basename(filePath)}`);
                } else {
                    // Restore from backup if conversion failed
                    logLine(`[AUDIO-CONVERT] Restoring from backup due to conversion failure`);
                    fs.copyFileSync(backupPath, filePath);
                    skipped++;
                }
                
                results.push({
                    file: path.basename(filePath),
                    originalCodecs: audioInfo.codecs,
                    incompatibleCodecs: audioInfo.incompatibleCodecs,
                    converted: success,
                    backupCreated: true
                });
            } else {
                logLine(`[AUDIO-CONVERT] Skipping - compatible audio or no audio: ${audioInfo.codecs.join(', ')}`);
                skipped++;
                results.push({
                    file: path.basename(filePath),
                    originalCodecs: audioInfo.codecs,
                    incompatibleCodecs: audioInfo.incompatibleCodecs,
                    converted: false,
                    backupCreated: false
                });
            }
        }
        
        // Summary
        logLine(`[AUDIO-CONVERT] ===== CONVERSION SUMMARY =====`);
        logLine(`[AUDIO-CONVERT] Total files processed: ${processed}`);
        logLine(`[AUDIO-CONVERT] Files converted: ${converted}`);
        logLine(`[AUDIO-CONVERT] Files skipped: ${skipped}`);
        logLine(`[AUDIO-CONVERT] ===============================`);
        
        // Save results to JSON
        const resultsPath = path.join(__dirname, 'superman_lois_season01_conversion_results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        logLine(`[AUDIO-CONVERT] Results saved to: ${resultsPath}`);
        
    } catch (err) {
        logLine(`[AUDIO-CONVERT] Error: ${err}`);
    }
}

// MAIN
processSeason01(); 