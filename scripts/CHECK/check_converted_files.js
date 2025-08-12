/*
  CHECK_CONVERTED_FILES.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const SHOW_NAME = 'Superman & Lois';
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

// Function to get detailed file information using ffprobe
async function getDetailedFileInfo(filePath) {
    try {
        const command = `ffprobe -v quiet -print_format json -show_streams -show_format -show_chapters "${filePath}"`;
        const { stdout } = await execAsync(command);
        const data = JSON.parse(stdout);
        
        return {
            format: data.format,
            streams: data.streams,
            chapters: data.chapters || []
        };
    } catch (error) {
        console.error(`Error analyzing ${path.basename(filePath)}:`, error.message);
        return null;
    }
}

// Function to check for common encoding issues
async function checkForIssues(filePath) {
    const info = await getDetailedFileInfo(filePath);
    if (!info) return { hasIssues: true, issues: ['Could not analyze file'] };
    
    const { format, streams } = info;
    const issues = [];
    
    // Check file integrity
    if (!format || !streams) {
        issues.push('Missing format or stream information');
    }
    
    // Check video stream
    const videoStream = streams.find(s => s.codec_type === 'video');
    if (!videoStream) {
        issues.push('No video stream found');
    } else {
        // Check for H.265 specific issues
        if (videoStream.codec_name === 'hevc') {
            if (!videoStream.profile) {
                issues.push('H.265 stream missing profile information');
            }
            if (!videoStream.level) {
                issues.push('H.265 stream missing level information');
            }
        }
        
        // Check for bitrate issues
        if (videoStream.bit_rate && parseInt(videoStream.bit_rate) < 100000) {
            issues.push('Very low video bitrate detected');
        }
    }
    
    // Check audio stream
    const audioStream = streams.find(s => s.codec_type === 'audio');
    if (!audioStream) {
        issues.push('No audio stream found');
    } else {
        // Check audio codec
        if (audioStream.codec_name !== 'aac') {
            issues.push(`Unexpected audio codec: ${audioStream.codec_name}`);
        }
        
        // Check audio channels
        if (audioStream.channels !== 6) {
            issues.push(`Unexpected audio channels: ${audioStream.channels} (expected 6)`);
        }
        
        // Check audio bitrate
        if (audioStream.bit_rate && parseInt(audioStream.bit_rate) < 100000) {
            issues.push('Very low audio bitrate detected');
        }
    }
    
    // Check file size vs duration
    if (format.size && format.duration) {
        const sizeMB = format.size / (1024 * 1024);
        const durationMinutes = format.duration / 60;
        const sizePerMinute = sizeMB / durationMinutes;
        
        if (sizePerMinute < 10) {
            issues.push(`Very low file size per minute: ${sizePerMinute.toFixed(1)} MB/min`);
        }
    }
    
    // Check for multiple streams
    if (streams.length > 2) {
        issues.push(`Multiple streams detected: ${streams.length} (may cause playback issues)`);
    }
    
    return {
        hasIssues: issues.length > 0,
        issues,
        info
    };
}

// Function to analyze a converted file
async function analyzeConvertedFile(filePath) {
    console.log(`\n🔍 Analyzing: ${path.basename(filePath)}`);
    console.log('─'.repeat(60));
    
    const issueCheck = await checkForIssues(filePath);
    
    if (issueCheck.hasIssues) {
        console.log('❌ Issues detected:');
        issueCheck.issues.forEach(issue => {
            console.log(`   • ${issue}`);
        });
    } else {
        console.log('✅ No obvious issues detected');
    }
    
    if (issueCheck.info) {
        const { format, streams } = issueCheck.info;
        
        console.log(`\n📊 File Information:`);
        console.log(`   Size: ${(format.size / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`   Duration: ${format.duration} seconds`);
        console.log(`   Bitrate: ${format.bit_rate ? (format.bit_rate / 1000).toFixed(0) + ' kbps' : 'Unknown'}`);
        
        const videoStream = streams.find(s => s.codec_type === 'video');
        const audioStream = streams.find(s => s.codec_type === 'audio');
        
        if (videoStream) {
            console.log(`\n🎬 Video Stream:`);
            console.log(`   Codec: ${videoStream.codec_name} (${videoStream.codec_long_name})`);
            console.log(`   Resolution: ${videoStream.width}x${videoStream.height}`);
            console.log(`   Bitrate: ${videoStream.bit_rate ? (videoStream.bit_rate / 1000).toFixed(0) + ' kbps' : 'Unknown'}`);
            console.log(`   Profile: ${videoStream.profile || 'Unknown'}`);
            console.log(`   Level: ${videoStream.level || 'Unknown'}`);
        }
        
        if (audioStream) {
            console.log(`\n🔊 Audio Stream:`);
            console.log(`   Codec: ${audioStream.codec_name} (${audioStream.codec_long_name})`);
            console.log(`   Channels: ${audioStream.channels}`);
            console.log(`   Sample Rate: ${audioStream.sample_rate} Hz`);
            console.log(`   Bitrate: ${audioStream.bit_rate ? (audioStream.bit_rate / 1000).toFixed(0) + ' kbps' : 'Unknown'}`);
        }
    }
    
    return issueCheck;
}

// Function to compare with original working file
async function compareWithWorkingFile(convertedFile, workingSeason = 2) {
    console.log(`\n🔍 Comparing with Season ${workingSeason} (working) format...`);
    
    const workingSeasonPath = path.join(BASE_INPUT_PATH, getSeasonFolderName(workingSeason));
    const workingFiles = getMP4Files(workingSeasonPath);
    
    if (workingFiles.length === 0) {
        console.log(`❌ No working files found in Season ${workingSeason}`);
        return;
    }
    
    const workingFile = workingFiles[0];
    const workingInfo = await getDetailedFileInfo(workingFile);
    const convertedInfo = await getDetailedFileInfo(convertedFile);
    
    if (!workingInfo || !convertedInfo) {
        console.log('❌ Could not compare files');
        return;
    }
    
    console.log(`\n📊 Comparison:`);
    console.log(`   Working file: ${path.basename(workingFile)}`);
    console.log(`   Converted file: ${path.basename(convertedFile)}`);
    
    const workingVideo = workingInfo.streams.find(s => s.codec_type === 'video');
    const workingAudio = workingInfo.streams.find(s => s.codec_type === 'audio');
    const convertedVideo = convertedInfo.streams.find(s => s.codec_type === 'video');
    const convertedAudio = convertedInfo.streams.find(s => s.codec_type === 'audio');
    
    console.log(`\n🎬 Video Comparison:`);
    console.log(`   Working: ${workingVideo?.codec_name} ${workingVideo?.profile || ''} ${workingVideo?.level || ''}`);
    console.log(`   Converted: ${convertedVideo?.codec_name} ${convertedVideo?.profile || ''} ${convertedVideo?.level || ''}`);
    
    console.log(`\n🔊 Audio Comparison:`);
    console.log(`   Working: ${workingAudio?.codec_name} ${workingAudio?.channels}ch ${workingAudio?.bit_rate ? (workingAudio.bit_rate / 1000).toFixed(0) + 'k' : ''}`);
    console.log(`   Converted: ${convertedAudio?.codec_name} ${convertedAudio?.channels}ch ${convertedAudio?.bit_rate ? (convertedAudio.bit_rate / 1000).toFixed(0) + 'k' : ''}`);
}

// Main function
async function checkConvertedFiles() {
    console.log(`🔍 Checking converted files for "${SHOW_NAME}"`);
    console.log('=' .repeat(60));
    console.log(`Converted files path: ${BASE_OUTPUT_PATH}`);
    
    if (!fs.existsSync(BASE_OUTPUT_PATH)) {
        console.error(`❌ Converted files directory not found: ${BASE_OUTPUT_PATH}`);
        return;
    }
    
    // Check Season 1 converted files
    const season1Path = path.join(BASE_OUTPUT_PATH, getSeasonFolderName(1));
    
    if (!fs.existsSync(season1Path)) {
        console.error(`❌ Season 1 converted directory not found: ${season1Path}`);
        return;
    }
    
    const convertedFiles = getMP4Files(season1Path);
    console.log(`📁 Found ${convertedFiles.length} converted files in Season 1`);
    
    if (convertedFiles.length === 0) {
        console.log(`⚠️  No converted files found in Season 1`);
        return;
    }
    
    // Analyze first few files
    const filesToCheck = convertedFiles.slice(0, 3); // Check first 3 files
    
    let totalIssues = 0;
    
    for (const file of filesToCheck) {
        const issueCheck = await analyzeConvertedFile(file);
        if (issueCheck.hasIssues) {
            totalIssues += issueCheck.issues.length;
        }
        
        // Compare with working format
        await compareWithWorkingFile(file);
    }
    
    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Files checked: ${filesToCheck.length}`);
    console.log(`Total issues found: ${totalIssues}`);
    
    if (totalIssues > 0) {
        console.log('\n❌ Issues detected in converted files!');
        console.log('Possible causes:');
        console.log('1. H.265 encoding parameters may be incompatible');
        console.log('2. Audio encoding may have issues');
        console.log('3. File corruption during conversion');
        console.log('4. Incompatible H.265 profile/level');
        
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('1. Try converting to H.264 instead of H.265');
        console.log('2. Use different audio encoding settings');
        console.log('3. Check FFmpeg version and codec support');
    } else {
        console.log('\n✅ No obvious issues detected in converted files');
        console.log('The problem might be:');
        console.log('1. Browser/player compatibility with H.265');
        console.log('2. Specific encoding parameters');
        console.log('3. File corruption during transfer');
    }
}

// Run the script
if (require.main === module) {
    checkConvertedFiles().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    checkConvertedFiles,
    analyzeConvertedFile,
    checkForIssues
}; 