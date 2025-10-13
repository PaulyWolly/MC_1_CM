/*
  CONVERT_AUDIO_TO_AAC_TV-SHOWS_ALL.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const tvShowsRoot = 'S:/MEDIA/TV-SHOWS/';
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Import logging helper
const { logToFile } = require('../logging-helper');

// Import animation helpers
const {
    showProgress,
    clearProgress,
    showStatus,
    showConversionStep,
    showTimeline,
    showFileProgress,
    showConversionSummary,
    showShowBreakdown,
    showRealTimeStatus,
    showTimeEstimate,
    showFileInfo
} = require('./animation-helpers');

// Paths - UPDATED for new unified structure
const UNIFIED_DATA_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json');
const CONVERSION_LOG_PATH = path.join(__dirname, 'audio_conversion_log_tv-shows_ALL.json');

// FFmpeg command template for converting audio to AAC
function getFFmpegCommand(inputPath, outputPath) {
    return `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
}

// Create backup and convert
async function convertFile(inputPath, currentIndex, totalFiles, startTime) {
    try {
        const dir = path.dirname(inputPath);
        const ext = path.extname(inputPath);
        const name = path.basename(inputPath, ext);
        const fileName = path.basename(inputPath);
        
        // Step 1: Create backup
        showConversionStep(0, currentIndex, totalFiles, fileName, 'Creating backup...');
        const backupPath = path.join(dir, `${name}_backup${ext}`);
        logToFile('convert_audio_to_aac_tv-shows_ALL', `📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        
        // Step 2: Convert audio to AAC
        showConversionStep(1, currentIndex, totalFiles, fileName, 'Converting to AAC...');
        const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
        logToFile('convert_audio_to_aac_tv-shows_ALL', `🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        await execAsync(ffmpegCmd);
        
        // Step 3: Replace original with converted file
        showConversionStep(2, currentIndex, totalFiles, fileName, 'Replacing original...');
        logToFile('convert_audio_to_aac_tv-shows_ALL', `✅ [REPLACE] Replacing original with converted file`);
        await execAsync(`del "${inputPath}"`);
        await execAsync(`ren "${tempOutputPath}" "${path.basename(inputPath)}"`);
        
        // Step 4: Complete
        showConversionStep(3, currentIndex, totalFiles, fileName, 'Complete!');
        
        return { success: true, backupPath };
    } catch (error) {
        const errorMsg = `❌ [ERROR] Failed to convert ${path.basename(inputPath)}: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows_ALL', errorMsg);
        showStatus(`Failed to convert ${path.basename(inputPath)}: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// Extract all file paths from unified data structure
function extractAllFilesFromUnifiedData(unifiedData) {
    const files = [];
    
    for (const [showKey, show] of Object.entries(unifiedData)) {
        if (show.seasons) {
            for (const [seasonNum, season] of Object.entries(show.seasons)) {
                if (season.episodes) {
                    for (const [episodeNum, episode] of Object.entries(season.episodes)) {
                        if (episode.path) {
                            // Convert relative path to full path
                            const fullPath = path.join(tvShowsRoot, episode.path);
                            if (fs.existsSync(fullPath)) {
                                files.push({
                                    path: fullPath,
                                    title: `${showKey} S${seasonNum.padStart(2, '0')}E${episodeNum.padStart(2, '0')} - ${episode.title || 'Unknown'}`,
                                    show: showKey,
                                    season: seasonNum,
                                    episode: episodeNum,
                                    originalPath: episode.path
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    return files;
}

// Check audio codec for a file
async function checkAudioCodec(filePath) {
    try {
        const command = `ffprobe -v quiet -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
        const { stdout } = await execAsync(command);
        return stdout.trim().toLowerCase();
    } catch (error) {
        return null;
    }
}

// Update unified data after conversion
async function updateUnifiedData(unifiedData, convertedFiles) {
    if (!unifiedData || convertedFiles.length === 0) return;
    
    let updated = false;
    
    for (const convertedFile of convertedFiles) {
        const fileName = path.basename(convertedFile.path);
        const showKey = convertedFile.show;
        const seasonNum = convertedFile.season;
        const episodeNum = convertedFile.episode;
        
        // Find and update the episode in unified data
        if (unifiedData[showKey] && 
            unifiedData[showKey].seasons && 
            unifiedData[showKey].seasons[seasonNum] && 
            unifiedData[showKey].seasons[seasonNum].episodes && 
            unifiedData[showKey].seasons[seasonNum].episodes[episodeNum]) {
            
            const episode = unifiedData[showKey].seasons[seasonNum].episodes[episodeNum];
            
            // Add conversion metadata
            episode.audioConvertedToAAC = true;
            episode.audioConversionDate = new Date().toISOString();
            episode.audioCodec = 'aac';
            episode.audioBitrate = '192k';
            updated = true;
        }
    }
    
    if (updated) {
        try {
            // Create backup of unified data
            const backupPath = UNIFIED_DATA_PATH.replace('.json', `_backup_${Date.now()}.json`);
            fs.copyFileSync(UNIFIED_DATA_PATH, backupPath);
            showStatus(`Created backup of unified data: ${path.basename(backupPath)}`, 'success');
            
            // Save updated unified data
            fs.writeFileSync(UNIFIED_DATA_PATH, JSON.stringify(unifiedData, null, 2));
            showStatus('Updated unified data with conversion metadata', 'success');
        } catch (error) {
            showStatus(`Warning: Could not update unified data: ${error.message}`, 'warning');
        }
    }
}

async function main() {
    try {
        logToFile('convert_audio_to_aac_tv-shows_ALL', '🎵 [AUDIO-CONVERT-ALL] Starting audio conversion for ALL TV Shows...');
        console.log('🎵 Enhanced Audio Conversion for ALL TV Shows');
        console.log('=' .repeat(70));
        
        // Show timeline
        const timelineSteps = ['Load Data', 'Extract Files', 'Check Codecs', 'Convert Audio', 'Update Data'];
        showTimeline(0, timelineSteps.length, timelineSteps);
        
        showStatus('Loading unified TV shows data...', 'info');
        
        if (!fs.existsSync(UNIFIED_DATA_PATH)) {
            const errorMsg = 'tv-shows-unified.json not found!';
            logToFile('convert_audio_to_aac_tv-shows_ALL', errorMsg);
            showStatus(errorMsg, 'error');
            showStatus('Make sure the unified data file exists in the correct location.', 'info');
            return;
        }
        
        const unifiedData = JSON.parse(fs.readFileSync(UNIFIED_DATA_PATH, 'utf8'));
        
        // Extract all files from unified data structure
        showTimeline(1, timelineSteps.length, timelineSteps);
        showStatus('Extracting file paths from unified data...', 'info');
        const allFiles = extractAllFilesFromUnifiedData(unifiedData);
        
        if (allFiles.length === 0) {
            showStatus('No files found in unified data', 'warning');
            return;
        }
        
        const startMsg = `Found ${allFiles.length} total files to check`;
        logToFile('convert_audio_to_aac_tv-shows_ALL', startMsg);
        showStatus(startMsg, 'success');
        
        // Check which files actually need conversion
        showTimeline(2, timelineSteps.length, timelineSteps);
        showStatus('Checking audio codecs for all files...', 'info');
        const filesNeedingConversion = [];
        const alreadyAAC = [];
        const errors = [];
        
        for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];
            showProgress(i + 1, allFiles.length, `Checking: ${path.basename(file.path)}`, 'PROCESSING');
            
            try {
                const codec = await checkAudioCodec(file.path);
                if (!codec) {
                    errors.push({ ...file, error: 'Could not determine audio codec' });
                } else if (codec === 'aac') {
                    alreadyAAC.push({ ...file, codec });
                } else {
                    // Check if codec needs conversion
                    const incompatibleCodecs = ['ac3', 'dts', 'eac3', 'truehd', 'atmos'];
                    if (incompatibleCodecs.includes(codec)) {
                        file.incompatibleCodecs = [codec];
                        filesNeedingConversion.push(file);
                    } else {
                        // Compatible codec, no conversion needed
                        alreadyAAC.push({ ...file, codec });
                    }
                }
            } catch (error) {
                errors.push({ ...file, error: error.message });
            }
        }
        
        clearProgress();
        
        // Display analysis results
        console.log('\n📊 Audio Codec Analysis Results:');
        console.log(`  ✅ Already AAC: ${alreadyAAC.length}`);
        console.log(`  🔴 Needs Conversion: ${filesNeedingConversion.length}`);
        console.log(`  ⚠️  Errors: ${errors.length}`);
        
        if (filesNeedingConversion.length === 0) {
            const successMsg = 'No files need conversion!';
            logToFile('convert_audio_to_aac_tv-shows_ALL', successMsg);
            showStatus(successMsg, 'success');
            return;
        }
        
        // Group files by show for better organization
        const filesByShow = {};
        filesNeedingConversion.forEach(file => {
            if (!filesByShow[file.show]) {
                filesByShow[file.show] = [];
            }
            filesByShow[file.show].push(file);
        });
        
        console.log(`\n📺 Shows with files needing conversion: ${Object.keys(filesByShow).length}`);
        Object.entries(filesByShow).forEach(([show, files]) => {
            console.log(`  ${show}: ${files.length} files`);
        });
        
        console.log(`\n⚠️  WARNING: This will create backups and replace original files!`);
        console.log(`   Make sure you have enough disk space for backups.`);
        console.log(`   Total files to convert: ${filesNeedingConversion.length}`);
        
        // Ask for confirmation
        console.log('\nPress Enter to continue or Ctrl+C to cancel...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
        const results = [];
        let converted = 0;
        let failed = 0;
        const startTime = Date.now();
        
        // Start conversion
        showTimeline(3, timelineSteps.length, timelineSteps);
        showStatus('Starting conversion process...', 'info');
        
        for (let i = 0; i < filesNeedingConversion.length; i++) {
            const file = filesNeedingConversion[i];
            const fileName = path.basename(file.path);
            
            showFileProgress(fileName, i + 1, filesNeedingConversion.length, `From: ${file.incompatibleCodecs.join(', ')} → To: AAC (192k)`);
            
            if (file.incompatibleCodecs && file.incompatibleCodecs.length > 0) {
                const codecMsg = `Incompatible codecs: ${file.incompatibleCodecs.join(', ')}`;
                logToFile('convert_audio_to_aac_tv-shows_ALL', codecMsg);
                showStatus(codecMsg, 'info');
            }
            
            const result = await convertFile(file.path, i + 1, filesNeedingConversion.length, startTime);
            results.push({
                path: file.path,
                title: file.title,
                show: file.show,
                season: file.season,
                episode: file.episode,
                ...result
            });
            
            if (result.success) {
                converted++;
            } else {
                failed++;
            }
            
            // Show time estimate
            showTimeEstimate(startTime, i + 1, filesNeedingConversion.length);
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Update unified data
        if (converted > 0) {
            showTimeline(4, timelineSteps.length, timelineSteps);
            showStatus('Updating unified data...', 'info');
            await updateUnifiedData(unifiedData, results.filter(r => r.success));
        }
        
        // Save conversion log
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        const log = {
            timestamp: new Date().toISOString(),
            totalFiles: allFiles.length,
            alreadyAAC: alreadyAAC.length,
            filesNeedingConversion: filesNeedingConversion.length,
            converted,
            failed,
            errors: errors.length,
            duration: `${duration} seconds`,
            results
        };
        
        fs.writeFileSync(CONVERSION_LOG_PATH, JSON.stringify(log, null, 2));
        
        const stats = {
            total: allFiles.length,
            converted,
            failed,
            errors: errors.length,
            duration: `${duration} seconds`
        };
        
        showConversionSummary(stats);
        
        // Show show-by-show breakdown
        const resultsByShow = {};
        results.forEach(result => {
            if (!resultsByShow[result.show]) {
                resultsByShow[result.show] = [];
            }
            resultsByShow[result.show].push(result);
        });
        
        showShowBreakdown(resultsByShow);
        
        const logSavedMsg = `Conversion log saved to: ${CONVERSION_LOG_PATH}`;
        logToFile('convert_audio_to_aac_tv-shows_ALL', logSavedMsg);
        showStatus(logSavedMsg, 'info');
        
        if (converted > 0) {
            const finalMsg = 'All converted files now have AAC audio and should play in browsers!';
            logToFile('convert_audio_to_aac_tv-shows_ALL', finalMsg);
            showStatus(finalMsg, 'success');
        }
        
    } catch (error) {
        const errorMsg = `Error: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows_ALL', errorMsg);
        showStatus(errorMsg, 'error');
    }
}

// Run the conversion
main(); 