/*
  CHECK_SUPERMAN_LOIS_AUDIO.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const SHOW_NAME = 'Superman & Lois';
const SEASON_TO_CHECK = 4;
const BASE_INPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois';

// Function to get season folder name with leading zero
function getSeasonFolderName(seasonNumber) {
    return `Season ${seasonNumber.toString()}`;
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

// Function to get detailed audio information using ffprobe
async function getDetailedAudioInfo(filePath) {
    try {
        // Get all streams info
        const streamsCommand = `ffprobe -v quiet -print_format json -show_streams "${filePath}"`;
        const { stdout: streamsOutput } = await execAsync(streamsCommand);
        const streamsData = JSON.parse(streamsOutput);
        
        // Get format info
        const formatCommand = `ffprobe -v quiet -print_format json -show_format "${filePath}"`;
        const { stdout: formatOutput } = await execAsync(formatCommand);
        const formatData = JSON.parse(formatOutput);
        
        return { streams: streamsData.streams, format: formatData.format };
    } catch (error) {
        console.error(`Error getting audio info for ${path.basename(filePath)}:`, error.message);
        return null;
    }
}

// Function to check if audio codec is compatible with Video.js
function isAudioCodecCompatible(codecName) {
    const compatibleCodecs = ['aac', 'mp3', 'mp4a', 'ac3', 'eac3', 'opus', 'vorbis'];
    return compatibleCodecs.includes(codecName.toLowerCase());
}

// Function to analyze a single file
async function analyzeFile(filePath) {
    console.log(`\n🔍 Analyzing: ${path.basename(filePath)}`);
    console.log('─'.repeat(60));
    
    const info = await getDetailedAudioInfo(filePath);
    if (!info) {
        console.log('❌ Could not analyze file');
        return;
    }
    
    const { streams, format } = info;
    
    // File info
    console.log(`📁 File: ${path.basename(filePath)}`);
    console.log(`📏 Size: ${(format.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`⏱️  Duration: ${format.duration} seconds`);
    
    // Video streams
    const videoStreams = streams.filter(s => s.codec_type === 'video');
    console.log(`\n🎬 Video Streams: ${videoStreams.length}`);
    videoStreams.forEach((stream, index) => {
        console.log(`   ${index + 1}. Codec: ${stream.codec_name} (${stream.codec_long_name})`);
        console.log(`      Resolution: ${stream.width}x${stream.height}`);
        console.log(`      Bitrate: ${stream.bit_rate ? (stream.bit_rate / 1000).toFixed(0) + ' kbps' : 'Unknown'}`);
    });
    
    // Audio streams
    const audioStreams = streams.filter(s => s.codec_type === 'audio');
    console.log(`\n🔊 Audio Streams: ${audioStreams.length}`);
    
    if (audioStreams.length === 0) {
        console.log('❌ NO AUDIO STREAMS FOUND! This explains the no audio issue.');
        return { hasAudio: false, compatible: false, issues: ['No audio streams'] };
    }
    
    let hasCompatibleAudio = false;
    let issues = [];
    
    audioStreams.forEach((stream, index) => {
        const codecName = stream.codec_name;
        const isCompatible = isAudioCodecCompatible(codecName);
        const status = isCompatible ? '✅' : '❌';
        
        console.log(`   ${index + 1}. ${status} Codec: ${codecName} (${stream.codec_long_name})`);
        console.log(`      Channels: ${stream.channels || 'Unknown'}`);
        console.log(`      Sample Rate: ${stream.sample_rate || 'Unknown'} Hz`);
        console.log(`      Bitrate: ${stream.bit_rate ? (stream.bit_rate / 1000).toFixed(0) + ' kbps' : 'Unknown'}`);
        console.log(`      Language: ${stream.tags?.language || 'Unknown'}`);
        console.log(`      Compatible with Video.js: ${isCompatible ? 'Yes' : 'No'}`);
        
        if (isCompatible) {
            hasCompatibleAudio = true;
        } else {
            issues.push(`Incompatible audio codec: ${codecName}`);
        }
    });
    
    // Check for potential issues
    if (audioStreams.length > 1) {
        console.log(`\n⚠️  Multiple audio streams detected (${audioStreams.length}). Video.js might not handle this correctly.`);
        issues.push('Multiple audio streams');
    }
    
    if (!hasCompatibleAudio) {
        console.log(`\n❌ NO COMPATIBLE AUDIO CODECS FOUND! This will cause audio playback issues.`);
        issues.push('No compatible audio codecs');
    }
    
    return { hasAudio: true, compatible: hasCompatibleAudio, issues };
}

// Main function
async function checkSupermanLoisAudio() {
    console.log(`🔍 Audio Diagnostic for "${SHOW_NAME}" Season ${SEASON_TO_CHECK}`);
    console.log('=' .repeat(70));
    console.log(`Path: ${BASE_INPUT_PATH}`);
    
    const seasonFolderName = getSeasonFolderName(SEASON_TO_CHECK);
    const seasonPath = path.join(BASE_INPUT_PATH, seasonFolderName);
    
    if (!fs.existsSync(seasonPath)) {
        console.error(`❌ Season ${SEASON_TO_CHECK} directory not found: ${seasonPath}`);
        process.exit(1);
    }
    
    console.log(`📁 Found season directory: ${seasonPath}`);
    
    // Get all MP4 files
    const mp4Files = getMP4Files(seasonPath);
    
    if (mp4Files.length === 0) {
        console.log(`⚠️  No MP4 files found in Season ${SEASON_TO_CHECK}`);
        return;
    }
    
    console.log(`\n📁 Found ${mp4Files.length} MP4 files in Season ${SEASON_TO_CHECK}`);
    
    // Analyze each file
    let totalFiles = 0;
    let filesWithAudio = 0;
    let filesWithCompatibleAudio = 0;
    let filesWithIssues = 0;
    
    for (const file of mp4Files) {
        const result = await analyzeFile(file);
        totalFiles++;
        
        if (result) {
            if (result.hasAudio) {
                filesWithAudio++;
            }
            if (result.compatible) {
                filesWithCompatibleAudio++;
            }
            if (result.issues.length > 0) {
                filesWithIssues++;
            }
        }
    }
    
    // Summary
    console.log('\n📊 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total files analyzed: ${totalFiles}`);
    console.log(`Files with audio streams: ${filesWithAudio}`);
    console.log(`Files with compatible audio: ${filesWithCompatibleAudio}`);
    console.log(`Files with issues: ${filesWithIssues}`);
    
    if (filesWithCompatibleAudio === 0) {
        console.log('\n❌ CRITICAL ISSUE: No files have compatible audio codecs!');
        console.log('This explains why you cannot hear audio in Season 4.');
        console.log('\n💡 SOLUTION: Run the conversion script to convert audio to AAC format.');
    } else if (filesWithIssues > 0) {
        console.log('\n⚠️  Some files have audio issues that may affect playback.');
        console.log('Consider converting problematic files to AAC format.');
    } else {
        console.log('\n✅ All files appear to have compatible audio codecs.');
        console.log('If you still cannot hear audio, check your video player settings.');
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (filesWithCompatibleAudio < totalFiles) {
        console.log('1. Run the conversion script to convert all files to AAC format');
        console.log('2. This will ensure compatibility with Video.js and web browsers');
    }
    console.log('3. Check your video player audio settings');
    console.log('4. Verify your system audio is working');
}

// Run the script
if (require.main === module) {
    checkSupermanLoisAudio().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    checkSupermanLoisAudio,
    analyzeFile,
    getDetailedAudioInfo
}; 