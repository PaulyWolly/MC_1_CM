/*
  CONVERT_AUDIO_TO_AAC_FOLDER.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Path to main media library JSON
const MEDIA_LIBRARY_JSON = path.join(__dirname, '../server/data/media-library-tv-shows-.json');

function usage() {
    console.log('Usage: node convert_audio_to_aac_folder.js <folder>');
    process.exit(1);
}

if (process.argv.length < 3) usage();
const targetDir = process.argv[2];
if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    console.error('❌ Provided path is not a directory:', targetDir);
    process.exit(1);
}

function getAllVideoFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllVideoFiles(filePath));
        } else if (/\.(mkv|mp4)$/i.test(file)) {
            results.push(filePath);
        }
    }
    return results;
}

async function getAudioCodec(filePath) {
    try {
        const { stdout } = await execAsync(`ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${filePath}"`);
        return stdout.trim();
    } catch (e) {
        return null;
    }
}

function getFFmpegCommand(inputPath, outputPath) {
    return `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
}

async function convertFile(inputPath) {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const name = path.basename(inputPath, ext);
    const backupPath = path.join(dir, `${name}_backup${ext}`);
    const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
    console.log(`📦 [BACKUP] Creating backup: ${backupPath}`);
    await execAsync(`copy "${inputPath}" "${backupPath}"`);
    console.log(`🔄 [CONVERT] Converting audio to AAC: ${inputPath}`);
    await execAsync(getFFmpegCommand(inputPath, tempOutputPath));
    console.log(`✅ [REPLACE] Replacing original with converted file`);
    await execAsync(`del "${inputPath}"`);
    await execAsync(`ren "${tempOutputPath}" "${path.basename(inputPath)}"`);
    return backupPath;
}

function loadMediaLibrary() {
    if (!fs.existsSync(MEDIA_LIBRARY_JSON)) return {};
    try {
        return JSON.parse(fs.readFileSync(MEDIA_LIBRARY_JSON, 'utf8'));
    } catch (e) {
        return {};
    }
}

function saveMediaLibrary(data) {
    fs.writeFileSync(MEDIA_LIBRARY_JSON, JSON.stringify(data, null, 2));
}

(async function main() {
    console.log('🎵 [AUDIO-CONVERT] Scanning for video files in:', targetDir);
    const files = getAllVideoFiles(targetDir);
    if (files.length === 0) {
        console.log('No video files found.');
        return;
    }
    console.log(`Found ${files.length} video files.`);
    let mediaLibrary = loadMediaLibrary();
    let updated = false;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressMsg = `${i + 1}/${files.length}`;
        const codec = await getAudioCodec(file);
        if (!codec) {
            console.log(`${progressMsg} ⚠️  [SKIP] Could not determine audio codec for: ${file}`);
            continue;
        }
        if (codec.toLowerCase() === 'aac') {
            console.log(`${progressMsg} ✅ [SKIP] Already AAC: ${file}`);
            continue;
        }
        try {
            console.log(`${progressMsg} 🔄 [CONVERT] Processing: ${file}`);
            await convertFile(file);
            // Update/merge into media library JSON (example: add/mark as converted)
            // You may want to adjust this logic to match your JSON structure
            if (mediaLibrary && typeof mediaLibrary === 'object') {
                // Find entry by path and update, or add if missing
                let found = false;
                function updateEntry(obj) {
                    if (Array.isArray(obj)) {
                        for (const item of obj) updateEntry(item);
                    } else if (obj && typeof obj === 'object') {
                        if (obj.path && path.resolve(obj.path) === path.resolve(file)) {
                            obj.audioConvertedToAAC = true;
                            found = true;
                        }
                        for (const key in obj) updateEntry(obj[key]);
                    }
                }
                updateEntry(mediaLibrary);
                if (!found) {
                    // Optionally add a new entry
                    // mediaLibrary.convertedFiles = mediaLibrary.convertedFiles || [];
                    // mediaLibrary.convertedFiles.push({ path: file, audioConvertedToAAC: true });
                }
                updated = true;
            }
        } catch (e) {
            console.log(`${progressMsg} ❌ [ERROR] Failed to convert: ${file}\n${e.message}`);
        }
    }
    if (updated) {
        saveMediaLibrary(mediaLibrary);
        console.log('✅ [AUDIO-CONVERT] Media library JSON updated.');
    }
    console.log('🎉 [AUDIO-CONVERT] Done.');
})(); 