/*
  CONVERT_SUPERMAN_LOIS_SEASON4_VIDEO.JS
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
const SEASON_TO_CONVERT = 4;
const BASE_INPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois';
const BASE_OUTPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois/converted';

// Function to get season folder name with leading zero
function getSeasonFolderName(seasonNumber) {
    return `Season ${seasonNumber.toString().padStart(2, '0')}`;
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

// Function to convert H.265 to H.264 for a single file
async function convertFileToH264(inputFile, outputFile) {
    // Convert H.265 to H.264 while preserving AAC audio
    const command = `ffmpeg -i "${inputFile}" -c:v libx264 -preset medium -crf 23 -c:a copy -y "${outputFile}"`;
    
    try {
        console.log(`🔄 Converting: ${path.basename(inputFile)}`);
        console.log(`   H.265 → H.264 (preserving AAC audio)`);
        
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

// Function to check video codec of a file
async function checkVideoCodec(filePath) {
    try {
        const command = `ffprobe -v quiet -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "${filePath}"`;
        const { stdout } = await execAsync(command);
        return stdout.trim();
    } catch (error) {
        return 'unknown';
    }
}

// Function to process Season 4
async function convertSeason4() {
    console.log(`🎬 Converting Season ${SEASON_TO_CONVERT} from H.265 to H.264`);
    console.log('=' .repeat(60));
    console.log(`Input path: ${BASE_INPUT_PATH}`);
    console.log(`Output path: ${BASE_OUTPUT_PATH}`);
    
    // Check if FFmpeg is available
    if (!(await checkFFmpeg())) {
        process.exit(1);
    }
    
    const seasonFolderName = getSeasonFolderName(SEASON_TO_CONVERT);
    const seasonInputPath = path.join(BASE_INPUT_PATH, seasonFolderName);
    const seasonOutputPath = path.join(BASE_OUTPUT_PATH, seasonFolderName);
    
    // Check if input season directory exists
    if (!fs.existsSync(seasonInputPath)) {
        console.error(`❌ Season ${SEASON_TO_CONVERT} directory not found: ${seasonInputPath}`);
        process.exit(1);
    }
    
    // Create output directory
    if (!fs.existsSync(seasonOutputPath)) {
        fs.mkdirSync(seasonOutputPath, { recursive: true });
        console.log(`📁 Created output directory: ${seasonOutputPath}`);
    }
    
    // Get all MP4 files in the season directory
    const mp4Files = getMP4Files(seasonInputPath);
    
    if (mp4Files.length === 0) {
        console.log(`⚠️  No MP4 files found in Season ${SEASON_TO_CONVERT}`);
        return;
    }
    
    console.log(`📁 Found ${mp4Files.length} MP4 files in Season ${SEASON_TO_CONVERT}`);
    
    // Analyze files first
    console.log('\n🔍 Analyzing files...');
    let h265Files = 0;
    let h264Files = 0;
    let otherCodecs = 0;
    
    for (const file of mp4Files) {
        const codec = await checkVideoCodec(file);
        const fileName = path.basename(file);
        
        if (codec === 'hevc' || codec === 'h265') {
            h265Files++;
            console.log(`   🔄 ${fileName} (H.265 - needs conversion)`);
        } else if (codec === 'h264') {
            h264Files++;
            console.log(`   ✅ ${fileName} (H.264 - already compatible)`);
        } else {
            otherCodecs++;
            console.log(`   ⚠️  ${fileName} (${codec.toUpperCase()} - unknown codec)`);
        }
    }
    
    console.log(`\n📊 Analysis Summary:`);
    console.log(`   H.265 files: ${h265Files}`);
    console.log(`   H.264 files: ${h264Files}`);
    console.log(`   Other codecs: ${otherCodecs}`);
    
    if (h265Files === 0) {
        console.log('\n✅ No H.265 files found. Season 4 should already work!');
        return;
    }
    
    console.log(`\n🚀 Starting conversion of ${h265Files} H.265 files to H.264...`);
    
    let processed = 0;
    let errors = 0;
    let skipped = 0;
    
    // Process each file
    for (const inputFile of mp4Files) {
        const fileName = path.basename(inputFile);
        const outputFile = path.join(seasonOutputPath, fileName);
        
        // Check if output file already exists
        if (fs.existsSync(outputFile)) {
            console.log(`⏭️  Skipping (already exists): ${fileName}`);
            skipped++;
            continue;
        }
        
        // Check if file needs conversion
        const codec = await checkVideoCodec(inputFile);
        if (codec !== 'hevc' && codec !== 'h265') {
            console.log(`⏭️  Skipping (not H.265): ${fileName} (${codec})`);
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
    
    // Final summary
    console.log('\n🎉 Conversion Complete!');
    console.log('=' .repeat(40));
    console.log(`Total files: ${mp4Files.length}`);
    console.log(`Files processed: ${processed}`);
    console.log(`Files skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Success rate: ${((processed) / (processed + errors) * 100).toFixed(1)}%`);
    console.log(`\n📁 Converted files saved to: ${seasonOutputPath}`);
    
    if (errors > 0) {
        console.log('\n⚠️  Some files failed to convert. Check the error messages above.');
    } else {
        console.log('\n✅ All H.265 files converted successfully to H.264!');
        console.log('🎵 Audio remains AAC format (compatible with Video.js)');
        console.log('🎬 Video now uses H.264 (compatible with all browsers)');
        console.log('\n💡 Season 4 should now play with audio like Seasons 1 and 3!');
    }
}

// Run the script
if (require.main === module) {
    convertSeason4().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    convertSeason4,
    convertFileToH264,
    checkVideoCodec
}; 