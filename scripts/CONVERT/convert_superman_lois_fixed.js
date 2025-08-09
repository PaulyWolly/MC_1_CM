/*
  CONVERT_SUPERMAN_LOIS_FIXED.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const SHOW_NAME = 'Superman & Lois';
const WORKING_SEASON = 2; // Season 2 works, so we'll match its format
const BASE_INPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois';
const BASE_OUTPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois/converted_fixed';

// Target format (matching Season 2 exactly)
const TARGET_VIDEO_CODEC = 'hevc'; // H.265/HEVC
const TARGET_AUDIO_CODEC = 'aac';  // AAC
const TARGET_AUDIO_CHANNELS = 6;   // 6-channel audio

// Function to get season folder name with leading zero
function getSeasonFolderName(seasonNumber) {
    return `Season ${seasonNumber.toString().padStart(2, '0')}`;
}

// Function to get all MKV files in a directory recursively
function getMKVFiles(directory) {
    const files = [];
    
    function scanDir(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (stat.isFile() && path.extname(item).toLowerCase() === '.mkv') {
                files.push(fullPath);
            }
        }
    }
    
    scanDir(directory);
    return files;
}

// Function to get all MP4 files in a directory recursively
function getMP4Files(directory) {
    const files = [];
    
    function scanDir(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (stat.isFile() && path.extname(item).toLowerCase() === '.mp4') {
                files.push(fullPath);
            }
        }
    }
    
    scanDir(directory);
    return files;
}

// Function to check if ffmpeg is available
async function checkFFmpeg() {
    try {
        const { stdout } = await execAsync('ffmpeg -version');
        console.log('✅ FFmpeg is available');
        console.log(`   Version: ${stdout.split('\n')[0]}`);
        return true;
    } catch (error) {
        console.error('❌ FFmpeg is not available. Please install FFmpeg first.');
        console.error('Download from: https://ffmpeg.org/download.html');
        return false;
    }
}

// Function to get detailed file information
async function getFileInfo(filePath) {
    try {
        const command = `ffprobe -v quiet -print_format json -show_streams -show_format "${filePath}"`;
        const { stdout } = await execAsync(command);
        const data = JSON.parse(stdout);
        
        const videoStream = data.streams.find(s => s.codec_type === 'video');
        const audioStream = data.streams.find(s => s.codec_type === 'audio');
        
        return {
            format: data.format,
            videoCodec: videoStream?.codec_name || 'unknown',
            audioCodec: audioStream?.codec_name || 'unknown',
            audioChannels: audioStream?.channels || 0,
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
            videoBitrate: videoStream?.bit_rate ? parseInt(videoStream.bit_rate) : 0,
            audioBitrate: audioStream?.bit_rate ? parseInt(audioStream.bit_rate) : 0,
            videoProfile: videoStream?.profile || 'unknown',
            videoLevel: videoStream?.level || 'unknown'
        };
    } catch (error) {
        console.error(`Error analyzing ${path.basename(filePath)}:`, error.message);
        return null;
    }
}

// Function to show progress animation
function showProgressAnimation(message, startTime) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Simple spinner animation
    const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const spinnerIndex = Math.floor(elapsed / 2) % spinner.length;
    
    process.stdout.write(`\r${spinner[spinnerIndex]} ${message} (${timeStr})`);
}

// Function to convert file with improved settings and progress indicator
async function convertFileWithImprovedSettings(inputFile, outputFile) {
    // Use more reliable FFmpeg settings that match Season 2 exactly
    const command = `ffmpeg -i "${inputFile}" -c:v libx265 -preset slow -crf 20 -x265-params "profile=main10:level=4.1" -c:a aac -b:a 224k -ac 6 -movflags +faststart -y "${outputFile}"`;
    
    const startTime = Date.now();
    const fileName = path.basename(inputFile);
    
    try {
        console.log(`\n🔄 Converting: ${fileName}`);
        console.log(`   → H.265 Main10 Level 4.1 + AAC 224k 6-channel`);
        console.log(`   ⏱️  This may take several minutes...`);
        
        // Start progress animation
        const progressInterval = setInterval(() => {
            showProgressAnimation(`Converting ${fileName}`, startTime);
        }, 500);
        
        const { stdout, stderr } = await execAsync(command);
        
        // Clear progress animation
        clearInterval(progressInterval);
        process.stdout.write('\r' + ' '.repeat(80) + '\r'); // Clear the line
        
        // Check for actual errors (not warnings)
        if (stderr && (stderr.includes('error') || stderr.includes('Error'))) {
            throw new Error(stderr);
        }
        
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        console.log(`✅ Converted: ${path.basename(outputFile)} (${minutes}:${seconds.toString().padStart(2, '0')})`);
        
        // Verify the output file
        const outputInfo = await getFileInfo(outputFile);
        if (outputInfo) {
            const sizeMB = outputInfo.format.size / (1024 * 1024);
            const durationMinutes = outputInfo.format.duration / 60;
            const sizePerMinute = sizeMB / durationMinutes;
            
            console.log(`   📊 Output: ${sizeMB.toFixed(1)} MB, ${sizePerMinute.toFixed(1)} MB/min`);
            console.log(`   🎬 Video: ${outputInfo.videoCodec} ${outputInfo.videoProfile} ${outputInfo.videoLevel}`);
            console.log(`   🔊 Audio: ${outputInfo.audioCodec} ${outputInfo.audioChannels}ch ${(outputInfo.audioBitrate/1000).toFixed(0)}k`);
            
            // Check if output looks reasonable
            if (sizePerMinute < 5) {
                console.warn(`   ⚠️  Warning: Very small file size per minute (${sizePerMinute.toFixed(1)} MB/min)`);
            }
            if (outputInfo.videoBitrate < 100000) {
                console.warn(`   ⚠️  Warning: Very low video bitrate (${(outputInfo.videoBitrate/1000).toFixed(0)} kbps)`);
            }
        }
        
        return true;
    } catch (error) {
        // Clear progress animation on error
        process.stdout.write('\r' + ' '.repeat(80) + '\r');
        console.error(`❌ Error converting ${fileName}:`, error.message);
        return false;
    }
}

// Function to analyze a season
async function analyzeSeason(seasonNumber) {
    console.log(`\n🎬 Analyzing Season ${seasonNumber}`);
    console.log('=' .repeat(50));
    
    const seasonFolderName = getSeasonFolderName(seasonNumber);
    const seasonPath = path.join(BASE_INPUT_PATH, seasonFolderName);
    
    if (!fs.existsSync(seasonPath)) {
        console.log(`❌ Season ${seasonNumber} directory not found: ${seasonPath}`);
        return null;
    }
    
    // Get both MKV and MP4 files
    const mkvFiles = getMKVFiles(seasonPath);
    const mp4Files = getMP4Files(seasonPath);
    
    console.log(`📁 Found ${mkvFiles.length} MKV files and ${mp4Files.length} MP4 files`);
    
    if (mkvFiles.length === 0 && mp4Files.length === 0) {
        console.log(`⚠️  No video files found in Season ${seasonNumber}`);
        return null;
    }
    
    // For Season 2 (working), use MP4 files. For others, prefer MKV files
    let filesToProcess, fileType;
    
    if (seasonNumber === WORKING_SEASON) {
        // Season 2: Use MP4 files (they work)
        filesToProcess = mp4Files;
        fileType = 'MP4';
        console.log(`🎯 Season ${WORKING_SEASON} (working): Using MP4 files (${filesToProcess.length} files)`);
    } else {
        // Other seasons: Prefer MKV files, fall back to MP4
        filesToProcess = mkvFiles.length > 0 ? mkvFiles : mp4Files;
        fileType = mkvFiles.length > 0 ? 'MKV' : 'MP4';
        console.log(`🎯 Season ${seasonNumber}: Using ${fileType} files for conversion (${filesToProcess.length} files)`);
    }
    
    // Analyze first file to get season format
    const firstFile = filesToProcess[0];
    const fileInfo = await getFileInfo(firstFile);
    
    if (!fileInfo) {
        console.log(`❌ Could not analyze first file in Season ${seasonNumber}`);
        return null;
    }
    
    console.log(`📁 Sample file: ${path.basename(firstFile)}`);
    console.log(`🎬 Video: ${fileInfo.videoCodec} ${fileInfo.videoProfile} ${fileInfo.videoLevel} (${fileInfo.resolution})`);
    console.log(`🔊 Audio: ${fileInfo.audioCodec} (${fileInfo.audioChannels} channels, ${(fileInfo.audioBitrate/1000).toFixed(0)}k)`);
    
    // Check if this season matches the target format
    const matchesTarget = fileInfo.videoCodec === TARGET_VIDEO_CODEC && 
                         fileInfo.audioCodec === TARGET_AUDIO_CODEC && 
                         fileInfo.audioChannels === TARGET_AUDIO_CHANNELS;
    
    if (matchesTarget) {
        console.log(`✅ Season ${seasonNumber} already matches target format!`);
    } else {
        console.log(`🔄 Season ${seasonNumber} needs conversion to match Season ${WORKING_SEASON}`);
    }
    
    return {
        seasonNumber,
        fileCount: filesToProcess.length,
        fileType: fileType,
        videoCodec: fileInfo.videoCodec,
        audioCodec: fileInfo.audioCodec,
        audioChannels: fileInfo.audioChannels,
        resolution: fileInfo.resolution,
        matchesTarget,
        files: filesToProcess,
        mkvCount: mkvFiles.length,
        mp4Count: mp4Files.length,
        isWorkingSeason: seasonNumber === WORKING_SEASON
    };
}

// Function to convert a season
async function convertSeason(seasonInfo) {
    if (seasonInfo.matchesTarget) {
        console.log(`⏭️  Skipping Season ${seasonInfo.seasonNumber} (already correct format)`);
        return { processed: 0, errors: 0, skipped: seasonInfo.fileCount };
    }
    
    console.log(`\n🔄 Converting Season ${seasonInfo.seasonNumber}`);
    console.log('=' .repeat(50));
    console.log(`📁 Processing ${seasonInfo.fileCount} ${seasonInfo.fileType} files`);
    console.log(`🎯 Converting to match Season ${WORKING_SEASON} format (H.265 Main10 + AAC 224k 6-channel)`);
    
    const seasonFolderName = getSeasonFolderName(seasonInfo.seasonNumber);
    const seasonOutputPath = path.join(BASE_OUTPUT_PATH, seasonFolderName);
    
    // Create output directory
    if (!fs.existsSync(seasonOutputPath)) {
        fs.mkdirSync(seasonOutputPath, { recursive: true });
        console.log(`📁 Created output directory: ${seasonOutputPath}`);
    }
    
    let processed = 0;
    let errors = 0;
    let skipped = 0;
    
    for (const inputFile of seasonInfo.files) {
        const fileName = path.basename(inputFile);
        // Convert output filename to MP4 for better compatibility
        const outputFileName = fileName.replace(/\.[^/.]+$/, '.mp4');
        const outputFile = path.join(seasonOutputPath, outputFileName);
        
        // Check if output file already exists
        if (fs.existsSync(outputFile)) {
            console.log(`⏭️  Skipping (already exists): ${outputFileName}`);
            skipped++;
            continue;
        }
        
        const success = await convertFileWithImprovedSettings(inputFile, outputFile);
        if (success) {
            processed++;
        } else {
            errors++;
        }
    }
    
    console.log(`\n📊 Season ${seasonInfo.seasonNumber} Results:`);
    console.log(`   Processed: ${processed} files`);
    console.log(`   Skipped: ${skipped} files`);
    console.log(`   Errors: ${errors} files`);
    
    return { processed, errors, skipped };
}

// Main function
async function convertAllSeasonsFixed() {
    console.log(`🎬 Converting all seasons of "${SHOW_NAME}" to match Season ${WORKING_SEASON} format (FIXED)`);
    console.log('=' .repeat(70));
    console.log(`Target format: ${TARGET_VIDEO_CODEC.toUpperCase()} Main10 Level 4.1 + ${TARGET_AUDIO_CODEC.toUpperCase()} 224k ${TARGET_AUDIO_CHANNELS}-channel`);
    console.log(`Input path: ${BASE_INPUT_PATH}`);
    console.log(`Output path: ${BASE_OUTPUT_PATH}`);
    
    // Check if FFmpeg is available
    if (!(await checkFFmpeg())) {
        process.exit(1);
    }
    
    // Create base output directory
    if (!fs.existsSync(BASE_OUTPUT_PATH)) {
        fs.mkdirSync(BASE_OUTPUT_PATH, { recursive: true });
        console.log(`📁 Created base output directory: ${BASE_OUTPUT_PATH}`);
    }
    
    // Analyze all seasons first
    console.log('\n🔍 Analyzing all seasons...');
    const seasons = [];
    
    for (let season = 1; season <= 4; season++) {
        const seasonInfo = await analyzeSeason(season);
        if (seasonInfo) {
            seasons.push(seasonInfo);
        }
    }
    
    // Show summary
    console.log('\n📊 SEASON ANALYSIS SUMMARY');
    console.log('=' .repeat(50));
    seasons.forEach(season => {
        const status = season.matchesTarget ? '✅' : '🔄';
        console.log(`${status} Season ${season.seasonNumber}: ${season.videoCodec} + ${season.audioCodec} (${season.audioChannels}ch) - ${season.fileCount} files`);
    });
    
    // Count how many need conversion
    const seasonsNeedingConversion = seasons.filter(s => !s.matchesTarget);
    
    if (seasonsNeedingConversion.length === 0) {
        console.log('\n✅ All seasons already match the target format!');
        return;
    }
    
    console.log(`\n🚀 Converting ${seasonsNeedingConversion.length} seasons with improved settings...`);
    
    // Convert seasons that need it
    let totalProcessed = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    
    for (const season of seasonsNeedingConversion) {
        const result = await convertSeason(season);
        totalProcessed += result.processed;
        totalErrors += result.errors;
        totalSkipped += result.skipped;
    }
    
    // Final summary
    console.log('\n🎉 ALL SEASONS CONVERSION COMPLETE!');
    console.log('=' .repeat(50));
    console.log(`Total files processed: ${totalProcessed}`);
    console.log(`Total files skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Success rate: ${((totalProcessed) / (totalProcessed + totalErrors) * 100).toFixed(1)}%`);
    console.log(`\n📁 Converted files saved to: ${BASE_OUTPUT_PATH}`);
    
    if (totalErrors > 0) {
        console.log('\n⚠️  Some files failed to convert. Check the error messages above.');
    } else {
        console.log('\n✅ All seasons converted successfully with improved settings!');
        console.log('🎬 All seasons now use H.265 Main10 Level 4.1 + AAC 224k 6-channel');
        console.log('🎵 All seasons should now have working audio like Season 2!');
        console.log('\n💡 Test all seasons in your media player - they should all work now!');
    }
}

// Run the script
if (require.main === module) {
    convertAllSeasonsFixed().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    convertAllSeasonsFixed,
    convertSeason,
    analyzeSeason,
    convertFileWithImprovedSettings
}; 