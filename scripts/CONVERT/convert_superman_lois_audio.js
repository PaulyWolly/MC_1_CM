/*
  CONVERT_SUPERMAN_LOIS_AUDIO.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const SHOW_NAME = 'Superman & Lois';
const SEASONS = 4; // Total seasons to process
const BASE_INPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois'; // Updated to correct S: drive path
const BASE_OUTPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois/converted'; // Updated to correct S: drive path

// Function to get season folder name with leading zero
function getSeasonFolderName(seasonNumber) {
    return `Season ${seasonNumber.toString().padStart(2, '0')}`;
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

// Function to convert audio to AAC for a single file
async function convertFileToAAC(inputFile, outputFile) {
    const command = `ffmpeg -i "${inputFile}" -c:v copy -c:a aac -b:a 192k -y "${outputFile}"`;
    
    try {
        console.log(`🔄 Converting: ${path.basename(inputFile)}`);
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

// Function to process a single season
async function processSeason(seasonNumber) {
    console.log(`\n🎬 Processing Season ${seasonNumber}`);
    console.log('=' .repeat(50));
    
    const seasonFolderName = getSeasonFolderName(seasonNumber);
    const seasonInputPath = path.join(BASE_INPUT_PATH, seasonFolderName);
    const seasonOutputPath = path.join(BASE_OUTPUT_PATH, seasonFolderName);
    
    // Check if input season directory exists
    if (!fs.existsSync(seasonInputPath)) {
        console.error(`❌ Season ${seasonNumber} directory not found: ${seasonInputPath}`);
        return { success: false, processed: 0, errors: 0 };
    }
    
    // Create output directory
    if (!fs.existsSync(seasonOutputPath)) {
        fs.mkdirSync(seasonOutputPath, { recursive: true });
        console.log(`📁 Created output directory: ${seasonOutputPath}`);
    }
    
    // Get all MP4 files in the season directory
    const mp4Files = getMP4Files(seasonInputPath);
    
    if (mp4Files.length === 0) {
        console.log(`⚠️  No MP4 files found in Season ${seasonNumber}`);
        return { success: true, processed: 0, errors: 0 };
    }
    
    console.log(`📁 Found ${mp4Files.length} MP4 files in Season ${seasonNumber}`);
    
    let processed = 0;
    let errors = 0;
    
    // Process each file
    for (const inputFile of mp4Files) {
        const fileName = path.basename(inputFile);
        const outputFile = path.join(seasonOutputPath, fileName);
        
        // Check if output file already exists
        if (fs.existsSync(outputFile)) {
            console.log(`⏭️  Skipping (already exists): ${fileName}`);
            processed++;
            continue;
        }
        
        const success = await convertFileToAAC(inputFile, outputFile);
        if (success) {
            processed++;
        } else {
            errors++;
        }
    }
    
    console.log(`\n📊 Season ${seasonNumber} Results:`);
    console.log(`   Processed: ${processed} files`);
    console.log(`   Errors: ${errors} files`);
    
    return { success: errors === 0, processed, errors };
}

// Function to check audio codec of a file
async function checkAudioCodec(filePath) {
    try {
        const command = `ffprobe -v quiet -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${filePath}"`;
        const { stdout } = await execAsync(command);
        return stdout.trim();
    } catch (error) {
        return 'unknown';
    }
}

// Function to analyze input files
async function analyzeInputFiles() {
    console.log('\n🔍 Analyzing input files...');
    console.log('=' .repeat(50));
    
    let totalFiles = 0;
    let aacFiles = 0;
    let nonAacFiles = 0;
    
    for (let season = 1; season <= SEASONS; season++) {
        const seasonFolderName = getSeasonFolderName(season);
        const seasonPath = path.join(BASE_INPUT_PATH, seasonFolderName);
        
        if (!fs.existsSync(seasonPath)) {
            console.log(`⚠️  Season ${season} directory not found: ${seasonPath}`);
            continue;
        }
        
        const mp4Files = getMP4Files(seasonPath);
        console.log(`\nSeason ${season}: ${mp4Files.length} MP4 files`);
        
        for (const file of mp4Files) {
            const codec = await checkAudioCodec(file);
            const fileName = path.basename(file);
            
            if (codec === 'aac') {
                aacFiles++;
                console.log(`   ✅ ${fileName} (AAC - no conversion needed)`);
            } else {
                nonAacFiles++;
                console.log(`   🔄 ${fileName} (${codec.toUpperCase()} - needs conversion)`);
            }
            totalFiles++;
        }
    }
    
    console.log(`\n📊 Analysis Summary:`);
    console.log(`   Total files: ${totalFiles}`);
    console.log(`   Already AAC: ${aacFiles}`);
    console.log(`   Need conversion: ${nonAacFiles}`);
    
    return { totalFiles, aacFiles, nonAacFiles };
}

// Main function
async function convertSupermanLoisAudio() {
    console.log(`🎬 Converting audio for "${SHOW_NAME}" (${SEASONS} seasons)`);
    console.log('=' .repeat(60));
    console.log(`Input path: ${BASE_INPUT_PATH}`);
    console.log(`Output path: ${BASE_OUTPUT_PATH}`);
    
    // Check if FFmpeg is available
    if (!(await checkFFmpeg())) {
        process.exit(1);
    }
    
    // Check if input directory exists
    if (!fs.existsSync(BASE_INPUT_PATH)) {
        console.error(`❌ Input directory not found: ${BASE_INPUT_PATH}`);
        console.error('Please update the BASE_INPUT_PATH in the script to point to your TV show location.');
        process.exit(1);
    }
    
    // Create base output directory
    if (!fs.existsSync(BASE_OUTPUT_PATH)) {
        fs.mkdirSync(BASE_OUTPUT_PATH, { recursive: true });
        console.log(`📁 Created base output directory: ${BASE_OUTPUT_PATH}`);
    }
    
    // Analyze input files first
    const analysis = await analyzeInputFiles();
    
    if (analysis.nonAacFiles === 0) {
        console.log('\n✅ All files are already in AAC format! No conversion needed.');
        return;
    }
    
    console.log(`\n🚀 Starting conversion of ${analysis.nonAacFiles} files...`);
    
    // Process each season
    let totalProcessed = 0;
    let totalErrors = 0;
    
    for (let season = 1; season <= SEASONS; season++) {
        const result = await processSeason(season);
        totalProcessed += result.processed;
        totalErrors += result.errors;
    }
    
    // Final summary
    console.log('\n🎉 Conversion Complete!');
    console.log('=' .repeat(40));
    console.log(`Total files processed: ${totalProcessed}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Success rate: ${((totalProcessed - totalErrors) / totalProcessed * 100).toFixed(1)}%`);
    console.log(`\n📁 Converted files saved to: ${BASE_OUTPUT_PATH}`);
    
    if (totalErrors > 0) {
        console.log('\n⚠️  Some files failed to convert. Check the error messages above.');
    } else {
        console.log('\n✅ All files converted successfully!');
    }
}

// Run the script
if (require.main === module) {
    convertSupermanLoisAudio().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    convertSupermanLoisAudio,
    processSeason,
    checkAudioCodec,
    analyzeInputFiles
}; 