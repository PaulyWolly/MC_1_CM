/*
  CHECK_VIDEO_PLAYER_SETUP.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎬 Video Player Setup Checker');
console.log('=============================\n');

// Check if FFmpeg is available
function checkFFmpeg() {
    try {
        execSync('ffprobe -version', { stdio: 'ignore' });
        console.log('✅ FFmpeg is installed and available');
        return true;
    } catch (error) {
        console.log('❌ FFmpeg is not installed or not in PATH');
        return false;
    }
}

// Check if media directory exists
function checkMediaDirectory() {
    const mediaRoot = 'S:/MEDIA';
    if (fs.existsSync(mediaRoot)) {
        console.log('✅ Media directory exists:', mediaRoot);
        return true;
    } else {
        console.log('❌ Media directory does not exist:', mediaRoot);
        return false;
    }
}

// Check if media library file exists
function checkMediaLibrary() {
    const mediaLibraryPath = path.join(__dirname, '../server/data/media-library.json');
    if (fs.existsSync(mediaLibraryPath)) {
        console.log('✅ Media library file exists');
        return true;
    } else {
        console.log('❌ Media library file does not exist');
        return false;
    }
}

// Check video player component
function checkVideoPlayerComponent() {
    const videoPlayerPath = path.join(__dirname, '../public/components/VideoPlayer/VideoPlayer.js');
    if (fs.existsSync(videoPlayerPath)) {
        console.log('✅ Video player component exists');
        return true;
    } else {
        console.log('❌ Video player component does not exist');
        return false;
    }
}

// Main check
console.log('🔍 Checking video player setup...\n');

const ffmpegAvailable = checkFFmpeg();
const mediaDirExists = checkMediaDirectory();
const mediaLibraryExists = checkMediaLibrary();
const videoPlayerExists = checkVideoPlayerComponent();

console.log('\n📊 Summary:');
console.log(`FFmpeg: ${ffmpegAvailable ? '✅ Available' : '❌ Not Available'}`);
console.log(`Media Directory: ${mediaDirExists ? '✅ Exists' : '❌ Missing'}`);
console.log(`Media Library: ${mediaLibraryExists ? '✅ Exists' : '❌ Missing'}`);
console.log(`Video Player: ${videoPlayerExists ? '✅ Exists' : '❌ Missing'}`);

console.log('\n💡 Recommendations:');

if (!ffmpegAvailable) {
    console.log('\n🔧 FFmpeg Installation Options:');
    console.log('1. Download from: https://ffmpeg.org/download.html');
    console.log('2. Using winget: winget install ffmpeg');
    console.log('3. Using chocolatey: choco install ffmpeg');
    console.log('4. Using scoop: scoop install ffmpeg');
    console.log('\n📝 Note: FFmpeg is only needed for audio codec analysis.');
    console.log('   Your video player will work without it, but some features may be limited.');
}

if (!mediaDirExists) {
    console.log('\n📁 Media Directory:');
    console.log('Update the MEDIA_ROOT variable in scan_media_library.js to point to your media directory');
}

if (!mediaLibraryExists) {
    console.log('\n📚 Media Library:');
    console.log('Run: node scripts/scan_media_library.js to generate the media library');
}

console.log('\n🎬 Video Player Status:');
if (videoPlayerExists && mediaLibraryExists) {
    console.log('✅ Your video player should be working!');
    console.log('💡 Try opening the video player and selecting a video file.');
} else {
    console.log('⚠️  Some components are missing. Please check the recommendations above.');
}

console.log('\n🚀 Next Steps:');
console.log('1. Open your app in the browser');
console.log('2. Try voice command: "open video player"');
console.log('3. Or click the video player button if available');
console.log('4. Select a video file to test playback');

console.log('\n🎬 Setup check complete!'); 