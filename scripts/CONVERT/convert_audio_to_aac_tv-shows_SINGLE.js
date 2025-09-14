/*
  CONVERT_AUDIO_TO_AAC_TV-SHOWS_SINGLE.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
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
const CONVERSION_LOG_PATH = path.join(__dirname, 'audio_conversion_log_tv-shows.json');

function fuzzyMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean(a) === clean(b);
}

function findBestMatchShow(title) {
  const folders = fs.readdirSync(tvShowsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  let best = folders.find(f => fuzzyMatch(f, title));
  if (!best) {
    best = folders.find(f => f.toLowerCase().includes(title.toLowerCase()));
  }
  return best ? path.join(tvShowsRoot, best) : null;
}

const inputArg = process.argv[2];
if (!inputArg) {
  console.log('🎵 Enhanced Single TV Show Audio Conversion');
  console.log('=' .repeat(60));
  console.log('Usage: node scripts/CONVERT/convert_audio_to_aac_tv-shows_SINGLE.js "TV Show Name"');
  console.log('Example: node scripts/CONVERT/convert_audio_to_aac_tv-shows_SINGLE.js "Star Trek Strange New Worlds (2022)"');
  console.log('Example: node scripts/CONVERT/convert_audio_to_aac_tv-shows_SINGLE.js "star.trek.strange.new.worlds.(2022)"');
  console.log('\n✨ Features:');
  console.log('   • Real-time progress bars with animations');
  console.log('   • Timeline tracking for each conversion step');
  console.log('   • File-by-file progress with ETA');
  console.log('   • Unified data integration using normalized keys');
  console.log('   • Visual success/failure indicators');
  console.log('   • SAFE ARCHIVING - Original files are NEVER deleted');
  console.log('\n💡 Tip: You can use either the display name or the normalized key');
  console.log('💡 Safety: Original files are preserved as _backup.mkv, new AAC versions as _AAC.mkv');
  process.exit(1);
}

let showFolder = inputArg;
if (!inputArg.match(/[\/]/)) {
  // Check if input is a normalized key (contains dots)
  if (inputArg.includes('.')) {
    // This might be a normalized key, try to find the display name
    const folder = findBestMatchShow(inputArg);
    if (!folder) {
      showStatus(`No matching TV show folder found for normalized key '${inputArg}' in ${tvShowsRoot}`, 'error');
      process.exit(1);
    }
    showFolder = folder;
    showStatus(`Found TV show folder for normalized key: ${showFolder}`, 'success');
  } else {
    // Regular display name
    const folder = findBestMatchShow(inputArg);
    if (!folder) {
      showStatus(`No matching TV show folder found for '${inputArg}' in ${tvShowsRoot}`, 'error');
      process.exit(1);
    }
    showFolder = folder;
    showStatus(`Found TV show folder: ${showFolder}`, 'success');
  }
}

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
        logToFile('convert_audio_to_aac_tv-shows', `📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        
        // Step 2: Convert audio to AAC
        showConversionStep(1, currentIndex, totalFiles, fileName, 'Converting to AAC...');
        const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
        logToFile('convert_audio_to_aac_tv-shows', `🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        await execAsync(ffmpegCmd);
        
        // Step 3: Create AAC version (SAFE ARCHIVING - NO DELETION)
        showConversionStep(2, currentIndex, totalFiles, fileName, 'Creating AAC version...');
        const aacPath = path.join(dir, `${name}_AAC${ext}`);
        logToFile('convert_audio_to_aac_tv-shows', `✅ [ARCHIVE] Creating AAC version: ${path.basename(aacPath)}`);
        await execAsync(`ren "${tempOutputPath}" "${path.basename(aacPath)}"`);
        
        // Step 4: Complete
        showConversionStep(3, currentIndex, totalFiles, fileName, 'Complete!');
        
        return { success: true, backupPath, aacPath };
    } catch (error) {
        const errorMsg = `❌ [ERROR] Failed to convert ${path.basename(inputPath)}: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows', errorMsg);
        showStatus(`Failed to convert ${path.basename(inputPath)}: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}

// Extract file paths from unified data structure
function extractFilesFromUnifiedData(unifiedData, showFolder) {
    const files = [];
    const showName = path.basename(showFolder);
    
    // Convert display name to normalized key format
    const normalizedKey = showName.toLowerCase()
        .replace(/[^a-z0-9()]/g, '.')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');
    
    // Find the show in unified data using normalized key
    let showData = null;
    let foundKey = null;
    
    // First try exact normalized key match
    if (unifiedData[normalizedKey]) {
        showData = unifiedData[normalizedKey];
        foundKey = normalizedKey;
    } else {
        // Fallback: try to find by matching the display name in the title field
        for (const [key, show] of Object.entries(unifiedData)) {
            if (show.title && show.title.toLowerCase().includes(showName.toLowerCase())) {
                showData = show;
                foundKey = key;
                break;
            }
        }
    }
    
    if (!showData || !showData.seasons) {
        showStatus(`Show not found in unified data: ${showName} (tried key: ${normalizedKey})`, 'warning');
        return files;
    }
    
    console.log(`✅ [CONVERT] Found show in unified data with key: ${foundKey}`);
    
    // Extract all episode file paths using absPath if available, otherwise path
    for (const [seasonNum, season] of Object.entries(showData.seasons)) {
        if (season.episodes) {
            for (const [episodeNum, episode] of Object.entries(season.episodes)) {
                let filePath = null;
                
                // Prefer absPath if available, otherwise use path
                if (episode.absPath && fs.existsSync(episode.absPath)) {
                    filePath = episode.absPath;
                } else if (episode.path) {
                    // Convert relative path to full path
                    filePath = path.join(tvShowsRoot, episode.path);
                }
                
                if (filePath && fs.existsSync(filePath)) {
                    files.push({
                        path: filePath,
                        title: `${showName} S${seasonNum.padStart(2, '0')}E${episodeNum.padStart(2, '0')} - ${episode.title || 'Unknown'}`,
                        season: seasonNum,
                        episode: episodeNum,
                        originalPath: episode.path || episode.absPath
                    });
                }
            }
        }
    }
    
    return files;
}

async function main() {
    try {
        logToFile('convert_audio_to_aac_tv-shows', '🎵 [AUDIO-CONVERT] Starting audio conversion for TV Shows...');
        console.log('🎵 Enhanced Single TV Show Audio Conversion');
        console.log('=' .repeat(70));
        
        // Show timeline
        const timelineSteps = ['Load Data', 'Extract Files', 'Check Codecs', 'Convert Audio', 'Update Data'];
        showTimeline(0, timelineSteps.length, timelineSteps);
        
        showStatus('Loading unified TV shows data...', 'info');
        
        if (!fs.existsSync(UNIFIED_DATA_PATH)) {
            const errorMsg = 'tv-shows-unified.json not found!';
            logToFile('convert_audio_to_aac_tv-shows', errorMsg);
            showStatus(errorMsg, 'error');
            showStatus('Make sure the unified data file exists in the correct location.', 'info');
            return;
        }
        
        const unifiedData = JSON.parse(fs.readFileSync(UNIFIED_DATA_PATH, 'utf8'));
        
        // Extract files from unified data structure
        showTimeline(1, timelineSteps.length, timelineSteps);
        showStatus('Extracting file paths from unified data...', 'info');
        const showFiles = extractFilesFromUnifiedData(unifiedData, showFolder);

        if (showFiles.length === 0) {
            showStatus(`No files found for show: ${showFolder}`, 'warning');
            return;
        }

        const startMsg = `Found ${showFiles.length} files to check`;
        logToFile('convert_audio_to_aac_tv-shows', startMsg);
        showStatus(startMsg, 'success');
        
        // Check which files actually need conversion
        showTimeline(2, timelineSteps.length, timelineSteps);
        showStatus('Checking audio codecs for all files...', 'info');
        const filesNeedingConversion = [];
        const alreadyAAC = [];
        const errors = [];
        
        for (let i = 0; i < showFiles.length; i++) {
            const file = showFiles[i];
            // Show animated progress for this file with cycling animation
            const fileName = path.basename(file.path);
            const totalFiles = showFiles.length;
            const currentFile = i + 1;
            
            // Show cycling animation for this file
            for (let frame = 0; frame < 5; frame++) {
                const percentage = Math.round((currentFile / totalFiles) * 100);
                const barLength = 40;
                const filledLength = Math.round((barLength * currentFile) / totalFiles);
                const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
                
                const animationFrames = ['|', '/', '-', '\\'];
                const frameChar = animationFrames[frame % animationFrames.length];
                
                const progressText = `\r${frameChar} [${bar}] ● ${percentage}% (${currentFile}/${totalFiles}) Checking: ${fileName}`;
                process.stdout.write(progressText);
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            try {
                // Use ffprobe to check audio codec
                const command = `ffprobe -v quiet -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${file.path}"`;
                const { stdout } = await execAsync(command);
                const codec = stdout.trim().toLowerCase();
                
                // Check if codec needs conversion
                const incompatibleCodecs = ['ac3', 'dts', 'eac3', 'truehd', 'atmos'];
                if (incompatibleCodecs.includes(codec)) {
                    file.incompatibleCodecs = [codec];
                    filesNeedingConversion.push(file);
                } else if (codec === 'aac') {
                    alreadyAAC.push({ ...file, codec });
                } else {
                    // Compatible codec, no conversion needed
                    alreadyAAC.push({ ...file, codec });
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
            logToFile('convert_audio_to_aac_tv-shows', successMsg);
            showStatus(successMsg, 'success');
            return;
        }
        
        // Show files that need conversion
        console.log('\n🔴 Files needing conversion:');
        filesNeedingConversion.forEach((item, index) => {
            const fileInfo = showFileInfo(item.path);
            console.log(`  ${index + 1}. ${path.basename(item.path)} (${item.incompatibleCodecs.join(', ')}) ${fileInfo}`);
        });
        
        console.log(`\n⚠️  WARNING: This will create backups and replace original files!`);
        console.log(`   Make sure you have enough disk space for backups.`);
        console.log(`   Files to convert: ${filesNeedingConversion.length}`);
        
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
                logToFile('convert_audio_to_aac_tv-shows', codecMsg);
                showStatus(codecMsg, 'info');
            }
            
            const result = await convertFile(file.path, i + 1, filesNeedingConversion.length, startTime);
            results.push({
                path: file.path,
                title: file.title,
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
            // TODO: Implement unified data update for single show
        }
        
        // Save conversion log
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        const log = {
            timestamp: new Date().toISOString(),
            totalFiles: showFiles.length,
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
            total: showFiles.length,
            converted,
            failed,
            errors: errors.length,
            duration: `${duration} seconds`
        };
        
        showConversionSummary(stats);
        
        // Show converted files
        if (converted > 0) {
            console.log('\n📋 Converted Files:');
            results.filter(r => r.success).forEach((file, index) => {
                const fileInfo = showFileInfo(file.path);
                console.log(`  ${index + 1}. ${path.basename(file.path)} ${fileInfo}`);
            });
        }
        
        const logSavedMsg = `Conversion log saved to: ${CONVERSION_LOG_PATH}`;
        logToFile('convert_audio_to_aac_tv-shows', logSavedMsg);
        showStatus(logSavedMsg, 'info');
        
        if (converted > 0) {
            const finalMsg = 'All converted files now have AAC audio and should play in browsers!';
            logToFile('convert_audio_to_aac_tv-shows', finalMsg);
            showStatus(finalMsg, 'success');
        }
        
    } catch (error) {
        const errorMsg = `Error: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows', errorMsg);
        showStatus(errorMsg, 'error');
    }
}

// Run the conversion
main(); 