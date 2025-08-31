/*
  SCAN_AUDIO_CODECS.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MEDIA_ROOT = 'S:/MEDIA'; // Change to your media root if needed

function isVideoFile(filename) {
    return /\.(mp4|mkv|avi|mov|wmv|flv|webm|m4v)$/i.test(filename);
}

function scanDir(dir) {
    let results = [];
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results = results.concat(scanDir(fullPath));
            } else if (entry.isFile() && isVideoFile(entry.name)) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error.message);
    }
    return results;
}

function checkFFmpegAvailable() {
    try {
        execSync('ffprobe -version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}

function getAudioCodec(file) {
    if (!checkFFmpegAvailable()) {
        console.log(`[SKIP] ${file} - FFmpeg not available, skipping audio codec analysis`);
        return 'ffmpeg_not_available';
    }
    
    try {
        const cmd = `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${file}"`;
        const codec = execSync(cmd).toString().trim();
        return codec;
    } catch (e) {
        console.error(`Error analyzing ${file}:`, e.message);
        return 'unknown';
    }
}

function main() {
    console.log('🎬 Video File Scanner Starting...');
    console.log(`📁 Scanning directory: ${MEDIA_ROOT}`);
    
    // Check if FFmpeg is available
    if (!checkFFmpegAvailable()) {
        console.log('\n⚠️  FFmpeg is not installed or not in PATH');
        console.log('📋 This script can still scan for video files, but audio codec analysis will be skipped');
        console.log('💡 To install FFmpeg:');
        console.log('   - Windows: Download from https://ffmpeg.org/download.html');
        console.log('   - Or use: winget install ffmpeg');
        console.log('   - Or use: chocolatey install ffmpeg');
        console.log('');
    }
    
    // Check if media root exists
    if (!fs.existsSync(MEDIA_ROOT)) {
        console.error(`❌ Media root directory does not exist: ${MEDIA_ROOT}`);
        console.log('💡 Please update the MEDIA_ROOT variable in this script to point to your media directory');
        return;
    }
    
    const files = scanDir(MEDIA_ROOT);
    console.log(`\n📊 Found ${files.length} video files`);
    
    if (files.length === 0) {
        console.log('ℹ️  No video files found in the specified directory');
        return;
    }
    
    let incompatible = [];
    let compatible = [];
    let skipped = [];
    
    console.log('\n🔍 Analyzing video files...\n');
    
    for (const file of files) {
        const codec = getAudioCodec(file);
        
        if (codec === 'ffmpeg_not_available') {
            skipped.push({ file, codec });
            continue;
        }
        
        if (!['aac', 'mp3'].includes(codec)) {
            incompatible.push({ file, codec });
            console.log(`[INCOMPATIBLE] ${file} - Audio codec: ${codec}`);
        } else {
            compatible.push({ file, codec });
            console.log(`[OK] ${file} - Audio codec: ${codec}`);
        }
    }
    
    console.log('\n📈 Scan Results:');
    console.log(`✅ Compatible files: ${compatible.length}`);
    console.log(`❌ Incompatible files: ${incompatible.length}`);
    console.log(`⏭️  Skipped files: ${skipped.length}`);
    
    if (incompatible.length > 0) {
        const outputDir = path.join(__dirname, '../../public/components/MediaLibrary/data/audio');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputFile = path.join(outputDir, 'incompatible_audio_files_normalized.json');
        fs.writeFileSync(outputFile, JSON.stringify(incompatible, null, 2));
        console.log(`\n💾 Incompatible files list saved to: ${outputFile}`);
    }
    
    if (skipped.length > 0) {
        const outputDir = path.join(__dirname, '../../public/components/MediaLibrary/data/audio');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const skippedFile = path.join(outputDir, 'skipped_files_no_ffmpeg_normalized.json');
        fs.writeFileSync(skippedFile, JSON.stringify(skipped, null, 2));
        console.log(`💾 Skipped files list saved to: ${skippedFile}`);
    }
    
    console.log('\n🎬 Scan complete!');
}

main();
