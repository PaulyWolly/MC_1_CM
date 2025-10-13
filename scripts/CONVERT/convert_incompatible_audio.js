/*
  CONVERT_INCOMPATIBLE_AUDIO.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const INPUT_JSON = path.join(__dirname, '../incompatible_audio_files.json');

if (!fs.existsSync(INPUT_JSON)) {
    console.error('❌ incompatible_audio_files.json not found! Run your scan script first.');
    process.exit(1);
}

const files = JSON.parse(fs.readFileSync(INPUT_JSON, 'utf8'));
if (!Array.isArray(files) || files.length === 0) {
    console.log('No incompatible files to convert.');
    process.exit(0);
}

console.log(`🔍 Found ${files.length} incompatible files to convert.`);

files.forEach(({ file, codec }, idx) => {
    if (!fs.existsSync(file)) {
        console.warn(`[${idx + 1}/${files.length}] File not found, skipping: ${file}`);
        return;
    }
    const ext = path.extname(file);
    const base = file.slice(0, -ext.length);
    const output = base + '.fixed.mp4';
    if (fs.existsSync(output)) {
        console.log(`[${idx + 1}/${files.length}] Already converted, skipping: ${output}`);
        return;
    }
    console.log(`[${idx + 1}/${files.length}] Converting: ${file}`);
    const ffmpegArgs = [
        '-i', file,
        '-c:v', 'copy', // Copy video stream
        '-c:a', 'aac',  // Convert audio to AAC
        '-b:a', '192k', // Set audio bitrate
        '-y',           // Overwrite output if exists
        output
    ];
    const result = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
    if (result.error) {
        console.error(`❌ Error running ffmpeg for ${file}:`, result.error.message);
    } else if (result.status !== 0) {
        console.error(`❌ ffmpeg exited with code ${result.status} for ${file}`);
    } else {
        console.log(`✅ Converted: ${output}`);
    }
});

console.log('\n🎬 Conversion complete!'); 