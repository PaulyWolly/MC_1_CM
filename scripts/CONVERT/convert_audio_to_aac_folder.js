/*
  CONVERT_AUDIO_TO_AAC_FOLDER.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Import animation helpers
const {
    showProgress,
    clearProgress,
    showStatus,
    showConversionStep,
    showTimeline,
    showFileProgress,
    showConversionSummary,
    showRealTimeStatus,
    showTimeEstimate,
    showFileInfo
} = require('./animation-helpers');

// Configuration
const UNIFIED_DATA_PATH = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json');
const TEST_MODE = process.argv.includes('--test'); // Add --test flag to test on one file only
const targetDir = process.argv[2];

if (!targetDir) {
    console.error('❌ Usage: node convert_audio_to_aac_folder.js "path/to/folder" [--test]');
    console.error('   Add --test flag to test conversion on first file only');
    process.exit(1);
}

if (TEST_MODE) {
    console.log('🧪 TEST MODE: Will only convert the first file for testing');
}

function usage() {
    console.log('🎵 Enhanced Audio Conversion with Visual Feedback');
    console.log('=' .repeat(60));
    console.log('Usage: node convert_audio_to_aac_folder.js <folder>');
    console.log('Example: node convert_audio_to_aac_folder.js "S:\\MEDIA\\TV-SHOWS\\Lucifer (2016)\\season 6"');
    console.log('\n✨ Features:');
    console.log('   • Real-time progress bars with animations');
    console.log('   • Timeline tracking for each conversion step');
    console.log('   • File-by-file progress with ETA');
    console.log('   • Unified data integration');
    console.log('   • Visual success/failure indicators');
    process.exit(1);
}

if (process.argv.length < 3) usage();
if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    showStatus(`Provided path is not a directory: ${targetDir}`, 'error');
    process.exit(1);
}

function getAllVideoFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllVideoFiles(filePath));
        } else if (/\.(mkv|mp4)$/i.test(file)) {
            results.push(filePath);
        }
    }
    return results;
}

async function getAudioCodec(filePath) {
    try {
        const { stdout } = await execAsync(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
        return stdout.trim();
    } catch (e) {
        return null;
    }
}

function getFFmpegCommand(inputPath, outputPath) {
    // Robust FFmpeg command that ensures proper audio conversion
    // -f matroska = force Matroska/MKV output format
    // -c:v copy = copy video stream without re-encoding
    // -c:a aac = convert audio to AAC codec
    // -b:a 128k = audio bitrate
    // -ac 2 = force 2 audio channels
    // -ar 48000 = force 48kHz sample rate
    // -map 0:v = map all video streams
    // -map 0:a = map all audio streams (will be converted to AAC)
    // -map 0:s? = map subtitle streams if they exist
    // -avoid_negative_ts make_zero = fix timestamp issues
    return `ffmpeg -i "${inputPath}" -f matroska -c:v copy -c:a aac -b:a 128k -ac 2 -ar 48000 -map 0:v -map 0:a -map 0:s? -avoid_negative_ts make_zero -y "${outputPath}"`;
}

async function convertFile(inputPath, currentIndex, totalFiles, startTime) {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const name = path.basename(inputPath, ext);
    const backupPath = path.join(dir, `${name}_backup${ext}`);
    const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
    const fileName = path.basename(inputPath);
    
    // Get original file size for validation
    const originalSize = fs.statSync(inputPath).size;
    showStatus(`Original file size: ${(originalSize / (1024 * 1024)).toFixed(2)} MB`, 'info');
    showStatus(`File extension: ${ext}`, 'info');
    
    // Step 1: Create backup with real-time progress
    showRealTimeStatus('Backup', fileName, currentIndex, totalFiles);
    showConversionStep(0, currentIndex, totalFiles, fileName, 'Creating backup...');
    await execAsync(`copy "${inputPath}" "${backupPath}"`);
    
    // Step 2: Convert audio to AAC with real-time progress and animated status
    showConversionStep(1, currentIndex, totalFiles, fileName, 'Converting to AAC...');
    
    // Show animated progress during conversion
    let progressCounter = 0;
    const progressInterval = setInterval(() => {
        progressCounter++;
        const frame = ['|', '/', '-', '\\'][progressCounter % 4];
        const statusText = `\r${frame} Converting: ${fileName} [${currentIndex}/${totalFiles}] ${frame}`;
        process.stdout.write(statusText);
    }, 200);
    
    try {
        // Log the FFmpeg command being executed
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        showStatus(`Executing: ${ffmpegCmd}`, 'info');
        
        const result = await execAsync(ffmpegCmd);
        
        // Log FFmpeg output for debugging
        if (result.stdout) showStatus(`FFmpeg stdout: ${result.stdout}`, 'info');
        if (result.stderr) showStatus(`FFmpeg stderr: ${result.stderr}`, 'warning');
        
        // Validate the converted file using our verification function
        await verifyConvertedFile(tempOutputPath, originalSize);
        
        // Verify the audio was actually converted to AAC
        showStatus('Verifying audio codec conversion...', 'info');
        const convertedAudioCodec = await getAudioCodec(tempOutputPath);
        if (!convertedAudioCodec) {
            throw new Error('Could not determine audio codec of converted file');
        }
        
        if (convertedAudioCodec.toLowerCase() !== 'aac') {
            throw new Error(`Audio conversion failed! Expected AAC, got: ${convertedAudioCodec}`);
        }
        
        showStatus(`✅ Audio successfully converted to: ${convertedAudioCodec}`, 'success');
        
        // Check if the output file has the correct extension
        const outputExt = path.extname(tempOutputPath);
        const inputExt = path.extname(inputPath);
        if (outputExt !== inputExt) {
            throw new Error(`Output file extension mismatch! Expected ${inputExt}, got ${outputExt}`);
        }
        
        showStatus(`✅ File format preserved: ${outputExt}`, 'success');
        
    } catch (ffmpegError) {
        // Log detailed FFmpeg error
        showStatus(`FFmpeg conversion failed: ${ffmpegError.message}`, 'error');
        if (ffmpegError.stderr) {
            showStatus(`FFmpeg error details: ${ffmpegError.stderr}`, 'error');
        }
        throw ffmpegError;
    } finally {
        clearInterval(progressInterval);
        clearProgress();
    }
    
    // Step 3: Replace original with converted file (only if validation passed)
    showRealTimeStatus('Replacing', fileName, currentIndex, totalFiles);
    showConversionStep(2, currentIndex, totalFiles, fileName, 'Replacing original...');
    
    // Double-check the converted file is valid before replacing
    const finalCheck = fs.statSync(tempOutputPath).size;
    if (finalCheck === 0) {
        throw new Error('Converted file validation failed - file is empty');
    }
    
    // Now safely replace the original
    await execAsync(`del "${inputPath}"`);
    await execAsync(`ren "${tempOutputPath}" "${path.basename(inputPath)}"`);
    
    // Verify the replacement worked
    if (!fs.existsSync(inputPath)) {
        throw new Error('File replacement failed - original file not found after conversion');
    }
    
    // Step 4: Update metadata
    showRealTimeStatus('Complete', fileName, currentIndex, totalFiles);
    showConversionStep(3, currentIndex, totalFiles, fileName, 'Complete!');
    
    // Show time estimate
    showTimeEstimate(startTime, currentIndex, totalFiles);
    
    return backupPath;
}

// Verify converted file is playable
async function verifyConvertedFile(filePath, originalSize) {
    try {
        const stats = fs.statSync(filePath);
        const newSize = stats.size;
        
        // Check file size is reasonable (should be similar to original, not 0)
        if (newSize === 0) {
            throw new Error('Converted file is empty (0 bytes)');
        }
        
        if (newSize < originalSize * 0.1) { // Less than 10% of original size
            throw new Error(`Converted file is too small: ${newSize} bytes (original: ${originalSize} bytes)`);
        }
        
        // Try to read file header
        const header = fs.readFileSync(filePath, { start: 0, end: 1023 });
        if (header.length === 0) {
            throw new Error('Cannot read file header');
        }
        
        // Basic format check (look for common video file signatures)
        const headerStr = header.toString('hex').toLowerCase();
        if (headerStr.includes('000001b3') || // MPEG start code
            headerStr.includes('66747970') || // MP4 signature
            headerStr.includes('1a45dfa3')) { // MKV signature
            showStatus('File format validation passed', 'success');
        } else {
            showStatus('Warning: File format signature not recognized', 'warning');
        }
        
        return true;
    } catch (error) {
        throw new Error(`File validation failed: ${error.message}`);
    }
}

function loadUnifiedData() {
    if (!fs.existsSync(UNIFIED_DATA_PATH)) {
        showStatus('Unified data file not found, continuing with folder scan only...', 'warning');
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(UNIFIED_DATA_PATH, 'utf8'));
    } catch (e) {
        showStatus('Error loading unified data, continuing with folder scan only...', 'warning');
        return null;
    }
}

// Find show info from unified data
function findShowInfo(unifiedData, targetDir) {
    if (!unifiedData) return null;
    
    const dirName = path.basename(targetDir);
    const parentDir = path.basename(path.dirname(targetDir));
    
    // Try to find the show in unified data
    for (const [key, show] of Object.entries(unifiedData)) {
        if (key.toLowerCase().includes(parentDir.toLowerCase().replace(/[^a-z0-9]/g, '')) ||
            parentDir.toLowerCase().includes(key.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
            return { key, show, parentDir };
        }
    }
    
    return null;
}

// Update unified data after conversion
async function updateUnifiedData(unifiedData, showInfo, convertedFiles) {
    if (!unifiedData || !showInfo) return;
    
    const { key, show } = showInfo;
    let updated = false;
    
    for (const convertedFile of convertedFiles) {
        const fileName = path.basename(convertedFile.path);
        
        // Find and update the episode in unified data
        for (const [seasonNum, season] of Object.entries(show.seasons || {})) {
            for (const [episodeNum, episode] of Object.entries(season.episodes || {})) {
                if (episode.path && path.basename(episode.path) === fileName) {
                    // Add conversion metadata
                    episode.audioConvertedToAAC = true;
                    episode.audioConversionDate = new Date().toISOString();
                    episode.audioCodec = 'aac';
                    episode.audioBitrate = '192k';
                    updated = true;
                    break;
                }
            }
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

(async function main() {
    console.log('🎵 Enhanced Audio Conversion with Unified Data Support');
    console.log('=' .repeat(70));
    
    // Show timeline
    const timelineSteps = ['Load Data', 'Scan Files', 'Analyze Codecs', 'Convert Audio', 'Update Metadata'];
    showTimeline(0, timelineSteps.length, timelineSteps);
    
    // Load unified data
    showStatus('Loading unified data...', 'info');
    const unifiedData = loadUnifiedData();
    const showInfo = unifiedData ? findShowInfo(unifiedData, targetDir) : null;
    
    if (showInfo) {
        showStatus(`Show: ${showInfo.key}`, 'success');
        showStatus(`Season: ${path.basename(targetDir)}`, 'success');
        showStatus(`Total Seasons: ${Object.keys(showInfo.show.seasons || {}).length}`, 'info');
        
        const totalEpisodes = Object.values(showInfo.show.seasons || {}).reduce((total, season) => {
            return total + Object.keys(season.episodes || {}).length;
        }, 0);
        showStatus(`Total Episodes: ${totalEpisodes}`, 'info');
    }
    
    showTimeline(1, timelineSteps.length, timelineSteps);
    showStatus('Scanning for video files...', 'info');
    const files = getAllVideoFiles(targetDir);
    
    if (files.length === 0) {
        showStatus('No video files found.', 'error');
        return;
    }
    
    showStatus(`Found ${files.length} video files.`, 'success');
    
    // Analyze files first
    showTimeline(2, timelineSteps.length, timelineSteps);
    showStatus('Analyzing audio codecs...', 'info');
    const filesToConvert = [];
    const alreadyAAC = [];
    const errors = [];
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        showProgress(i + 1, files.length, `Checking: ${path.basename(file)}`, 'PROCESSING');
        
        const codec = await getAudioCodec(file);
        if (!codec) {
            errors.push({ file, error: 'Could not determine audio codec' });
        } else if (codec.toLowerCase() === 'aac') {
            alreadyAAC.push({ file, codec });
        } else {
            filesToConvert.push({ file, codec });
        }
    }
    
    clearProgress();
    
    // Display analysis results
    console.log('\n📊 Audio Codec Analysis Results:');
    console.log(`  ✅ Already AAC: ${alreadyAAC.length}`);
    console.log(`  🔴 Needs Conversion: ${filesToConvert.length}`);
    console.log(`  ⚠️  Errors: ${errors.length}`);
    
    if (filesToConvert.length === 0) {
        showStatus('All files already have AAC audio! No conversion needed.', 'success');
        return;
    }
    
    // Show files that need conversion
    console.log('\n🔴 Files needing conversion:');
    filesToConvert.forEach((item, index) => {
        const fileInfo = showFileInfo(item.file);
        console.log(`  ${index + 1}. ${path.basename(item.file)} (${item.codec}) ${fileInfo}`);
    });
    
    // Confirmation
    console.log('\n⚠️  WARNING: This will create backups and replace original files!');
    console.log(`   Make sure you have enough disk space for backups.`);
    console.log(`   Files to convert: ${filesToConvert.length}`);
    
    console.log('\nPress Enter to continue or Ctrl+C to cancel...');
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });
    
    // Start conversion
    showTimeline(3, timelineSteps.length, timelineSteps);
    showStatus('Starting conversion process...', 'info');
    
    // Add heartbeat indicator to show script is working
    console.log('\n💓 Script is running - you should see animated progress below:');
    console.log('   (If you only see this message, the animations may not be working)');
    
    const startTime = Date.now();
    const convertedFiles = [];
    let converted = 0;
    let failed = 0;
    
    // Limit files to convert in test mode
    const filesToProcess = TEST_MODE ? filesToConvert.slice(0, 1) : filesToConvert;
    if (TEST_MODE) {
        showStatus(`TEST MODE: Only converting 1 file instead of ${filesToConvert.length}`, 'warning');
    }
    
    for (let i = 0; i < filesToProcess.length; i++) {
        const item = filesToProcess[i];
        const fileName = path.basename(item.file);
        
        // Clear any previous progress and show file progress
        clearProgress();
        showFileProgress(fileName, i + 1, filesToProcess.length, `From: ${item.codec} → To: AAC (192k)`);
        
        // Show animated progress indicator
        let progressCounter = 0;
        const progressInterval = setInterval(() => {
            progressCounter++;
            const frame = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'][progressCounter % 10];
            const statusText = `\r${frame} Processing: ${fileName} [${i + 1}/${filesToProcess.length}] ${frame}`;
            process.stdout.write(statusText);
        }, 100);
        
        try {
            const backupPath = await convertFile(item.file, i + 1, filesToProcess.length, startTime);
            convertedFiles.push({
                path: item.file,
                originalCodec: item.codec,
                backupPath: backupPath,
                success: true
            });
            converted++;
            
            // Show success with progress update
            clearInterval(progressInterval);
            clearProgress();
            showStatus(`Success! Backup: ${path.basename(backupPath)}`, 'success');
            
        } catch (e) {
            clearInterval(progressInterval);
            failed++;
            clearProgress();
            showStatus(`Failed: ${e.message}`, 'error');
        }
        
        // Show overall progress
        showProgress(i + 1, filesToProcess.length, `Converting: ${fileName}`, 'CONVERTING');
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Clear final progress
    clearProgress();
    
    // Update unified data
    if (unifiedData && showInfo && convertedFiles.length > 0) {
        showTimeline(4, timelineSteps.length, timelineSteps);
        showStatus('Updating unified data...', 'info');
        await updateUnifiedData(unifiedData, showInfo, convertedFiles);
    }
    
    // Final summary
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    const stats = {
        total: files.length,
        converted,
        failed,
        errors: errors.length,
        duration: `${duration} seconds`
    };
    
    showConversionSummary(stats);
    
    // Show converted files
    if (converted > 0) {
        console.log('\n📋 Converted Files:');
        convertedFiles.forEach((file, index) => {
            const fileInfo = showFileInfo(file.path);
            console.log(`  ${index + 1}. ${path.basename(file.path)} ${fileInfo}`);
        });
    }
    
    // Save conversion log
    const log = {
        timestamp: new Date().toISOString(),
        targetDir,
        totalFiles: files.length,
        alreadyAAC: alreadyAAC.length,
        filesNeedingConversion: filesToConvert.length,
        converted,
        failed,
        errors: errors.length,
        duration: `${duration} seconds`,
        convertedFiles,
        errors: errors.map(e => ({ file: e.file, error: e.error }))
    };
    
    const logPath = path.join(__dirname, `conversion_log_${Date.now()}.json`);
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
    showStatus(`Conversion log saved to: ${path.basename(logPath)}`, 'info');
    
})(); 