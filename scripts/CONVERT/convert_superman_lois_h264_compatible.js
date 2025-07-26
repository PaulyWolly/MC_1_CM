/*
  CONVERT_SUPERMAN_LOIS_H264_COMPATIBLE.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const SHOW_NAME = 'Superman & Lois';
const WORKING_SEASON = 2; // Season 2 works, but we'll convert everything to H.264 for compatibility
const BASE_INPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois';
const BASE_OUTPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois/converted';

// Target format (H.264 for maximum compatibility)
const TARGET_VIDEO_CODEC = 'h264'; // H.264 (more compatible than H.265)
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
        await execAsync('ffmpeg -version');
        console.log('✅ FFmpeg is available');
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
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown'
        };
    } catch (error) {
        console.error(`Error analyzing ${path.basename(filePath)}:`, error.message);
        return null;
    }
}

// Function to convert file to H.264 + AAC format (maximum compatibility)
async function convertFileToH264(inputFile, outputFile) {
    // Convert to H.264 video + AAC 6-channel audio with robust settings
    const command = `ffmpeg -i "${inputFile}" -c:v libx264 -preset slow -crf 20 -profile:v high -level 4.1 -c:a aac -b:a 224k -ac 6 -movflags +faststart -y "${outputFile}"`;
    
    try {
        console.log(`🔄 Converting: ${path.basename(inputFile)}`);
        console.log(`   → H.264 High Profile + AAC 6-channel (maximum compatibility)`);
        
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && stderr.includes('error')) {
            throw new Error(stderr);
        }
        
        console.log(`✅ Converted: ${path.basename(outputFile)}`);
        return true;
    } catch (error) {
        console.error(`❌ Error converting ${path.basename(inputFile)}:`, error.message);
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
    
    // Prefer MKV files for conversion (better source quality)
    const filesToProcess = mkvFiles.length > 0 ? mkvFiles : mp4Files;
    const fileType = mkvFiles.length > 0 ? 'MKV' : 'MP4';
    
    console.log(`🎯 Using ${fileType} files for conversion (${filesToProcess.length} files)`);
    
    // Analyze first file to get season format
    const firstFile = filesToProcess[0];
    const fileInfo = await getFileInfo(firstFile);
    
    if (!fileInfo) {
        console.log(`❌ Could not analyze first file in Season ${seasonNumber}`);
        return null;
    }
    
    console.log(`📁 Sample file: ${path.basename(firstFile)}`);
    console.log(`🎬 Video: ${fileInfo.videoCodec} (${fileInfo.resolution})`);
    console.log(`🔊 Audio: ${fileInfo.audioCodec} (${fileInfo.audioChannels} channels)`);
    
    // Check if this season already matches the target format
    const matchesTarget = fileInfo.videoCodec === TARGET_VIDEO_CODEC && 
                         fileInfo.audioCodec === TARGET_AUDIO_CODEC && 
                         fileInfo.audioChannels === TARGET_AUDIO_CHANNELS;
    
    if (matchesTarget) {
        console.log(`✅ Season ${seasonNumber} already matches target format!`);
    } else {
        console.log(`🔄 Season ${seasonNumber} needs conversion to H.264 + AAC 6-channel`);
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
        files: filesToProcess
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
    console.log(`🎯 Converting to H.264 + AAC 6-channel (maximum compatibility)`);
    
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
        // Convert output filename to MP4
        const outputFileName = fileName.replace(/\.[^/.]+$/, '.mp4');
        const outputFile = path.join(seasonOutputPath, outputFileName);
        
        // Check if output file already exists
        if (fs.existsSync(outputFile)) {
            console.log(`⏭️  Skipping (already exists): ${outputFileName}`);
            skipped++;
            continue;
        }
        
        const success = await convertFileToH264(inputFile, outputFile);
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
async function convertAllSeasonsToH264() {
    console.log(`🎬 Converting all seasons of "${SHOW_NAME}" to H.264 + AAC (maximum compatibility)`);
    console.log('=' .repeat(70));
    console.log(`Target format: ${TARGET_VIDEO_CODEC.toUpperCase()} video + ${TARGET_AUDIO_CODEC.toUpperCase()} ${TARGET_AUDIO_CHANNELS}-channel audio`);
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
    
    console.log(`\n🚀 Converting ${seasonsNeedingConversion.length} seasons to H.264 + AAC...`);
    
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
        console.log('\n✅ All seasons converted successfully!');
        console.log('🎬 All seasons now use H.264 High Profile + AAC 6-channel audio');
        console.log('🎵 Maximum compatibility with all players and browsers!');
        console.log('\n💡 Test the converted files - they should play without audio issues!');
    }
}

// Run the script
if (require.main === module) {
    convertAllSeasonsToH264().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    convertAllSeasonsToH264,
    convertSeason,
    analyzeSeason,
    convertFileToH264
}; 