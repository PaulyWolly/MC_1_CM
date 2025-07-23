const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const SHOW_NAME = 'Superman & Lois';
const WORKING_SEASON = 2; // Season 2 works, so we'll match its format
const BASE_INPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois';
const BASE_OUTPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois/converted';

// Target format (matching Season 2)
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

// Function to get all video files (MKV and MP4) in a directory recursively
function getVideoFiles(directory) {
    const files = [];
    
    function scanDir(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (stat.isFile()) {
                const ext = path.extname(item).toLowerCase();
                if (ext === '.mkv' || ext === '.mp4') {
                    files.push(fullPath);
                }
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

// Function to convert file to match Season 2 format
async function convertFileToSeason2Format(inputFile, outputFile) {
    // Convert to H.265/HEVC video + AAC 6-channel audio (matching Season 2)
    // Output as MP4 for better compatibility
    const command = `ffmpeg -i "${inputFile}" -c:v libx265 -preset medium -crf 23 -c:a aac -b:a 224k -ac 6 -y "${outputFile}"`;
    
    try {
        console.log(`🔄 Converting: ${path.basename(inputFile)}`);
        console.log(`   → H.265/HEVC + AAC 6-channel (matching Season 2)`);
        
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
    const allVideoFiles = getVideoFiles(seasonPath);
    
    console.log(`📁 Found ${mkvFiles.length} MKV files and ${mp4Files.length} MP4 files`);
    console.log(`📁 Total video files: ${allVideoFiles.length}`);
    
    if (allVideoFiles.length === 0) {
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
    console.log(`🎬 Video: ${fileInfo.videoCodec} (${fileInfo.resolution})`);
    console.log(`🔊 Audio: ${fileInfo.audioCodec} (${fileInfo.audioChannels} channels)`);
    
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
    console.log(`🎯 Converting to match Season ${WORKING_SEASON} format (H.265 + AAC 6-channel)`);
    
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
        
        const success = await convertFileToSeason2Format(inputFile, outputFile);
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
async function convertAllSeasons() {
    console.log(`🎬 Converting all seasons of "${SHOW_NAME}" to match Season ${WORKING_SEASON} format`);
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
    
    console.log(`\n🚀 Converting ${seasonsNeedingConversion.length} seasons to match Season ${WORKING_SEASON}...`);
    
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
        console.log('🎬 All seasons now use H.265/HEVC video + AAC 6-channel audio');
        console.log('🎵 All seasons should now have working audio like Season 2!');
        console.log('\n💡 Test all seasons in your media player - they should all work now!');
    }
}

// Run the script
if (require.main === module) {
    convertAllSeasons().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    convertAllSeasons,
    convertSeason,
    analyzeSeason,
    convertFileToSeason2Format
}; 