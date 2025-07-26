/*
  SMART_CONVERT_AUDIO_TO_AAC_MOVIES.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

/*
SMART_convert_audio_to_aac_movies.js

DESCRIPTION:
This script scans a movie folder (or the entire MOVIES parent folder by default), generates a detailed audio codec report for all video files, and converts any files with non-AAC audio tracks to AAC format. The script is safe and non-destructive: all converted files are written to a SANDBOX output directory, and originals are never overwritten.

USAGE:
  node scripts/SMART_convert_audio_to_aac_movies.js [<path_to_movie_or_parent_folder>]

  - If <path_to_movie_or_parent_folder> is provided, only that folder (and its subfolders) will be scanned and processed.
  - If no argument is provided, the script defaults to scanning the entire S:/MEDIA/MOVIES directory.

WHAT THE SCRIPT DOES:
1. Scans the target directory recursively for video files (supported extensions: .mp4, .mkv, .avi, .mov, .wmv, .flv, .webm, .m4v).
2. For each video file, determines the audio codec using ffprobe.
3. Generates a JSON report listing all video files and their audio codecs. The report is saved to:
     /scripts/SANDBOX/audio/movies/report/<FOLDERNAME>_audio_report.json
4. Identifies all files with non-AAC (and non-MP3) audio tracks.
5. Converts these files to AAC audio using ffmpeg, preserving the original video stream. Converted files are saved to:
     /scripts/SANDBOX/audio/movies/output/<relative_path_from_scan_root>
   (The output folder structure mirrors the input folder structure.)
6. Originals are NEVER overwritten. All output is written to the SANDBOX output directory.

REQUIREMENTS:
- ffmpeg and ffprobe must be installed and available in your system PATH.
- Sufficient disk space for the output files in the SANDBOX directory.

WHAT TO EXPECT:
- The script will print progress to the console, including which files are being scanned, reported, and converted.
- The report JSON will be available for review after the scan step.
- Only files with non-AAC (and non-MP3) audio will be converted.
- All converted files will appear in the SANDBOX output directory, preserving the original folder structure.
- No files will be deleted or overwritten in your source media folders.
*/

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
const REPORT_DIR = path.join(__dirname, 'SANDBOX/audio/movies/report');
const OUTPUT_DIR = path.join(__dirname, 'SANDBOX/audio/movies/output');
const SPINNER_FRAMES = ['|', '/', '-', '\\'];

function isVideoFile(filename) {
    return VIDEO_EXTENSIONS.some(ext => filename.toLowerCase().endsWith(ext));
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

function getAudioCodec(file) {
    try {
        const cmd = `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${file}"`;
        const codec = execSync(cmd).toString().trim();
        return codec;
    } catch (e) {
        console.error(`Error analyzing ${file}:`, e.message);
        return 'unknown';
    }
}

function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function getRelativePath(file, root) {
    return path.relative(root, file);
}

function loadProgress(progressPath) {
    if (fs.existsSync(progressPath)) {
        try {
            return new Set(JSON.parse(fs.readFileSync(progressPath, 'utf-8')));
        } catch (e) { return new Set(); }
    }
    return new Set();
}
function saveProgress(progressPath, completedSet) {
    fs.writeFileSync(progressPath, JSON.stringify(Array.from(completedSet), null, 2));
}

async function convertFile(inputPath, outputPath, spinnerCb) {
    try {
        ensureDirSync(path.dirname(outputPath));
        // Bulletproof: always downmix to stereo AAC
        const ffmpegCmd = `ffmpeg -i "${inputPath}" -map 0:v:0 -map 0:a:0 -c:v copy -c:a aac -b:a 192k -ac 2 -y "${outputPath}"`;
        let spinnerIndex = 0;
        const spinner = setInterval(() => {
            spinnerCb(SPINNER_FRAMES[spinnerIndex % SPINNER_FRAMES.length]);
            spinnerIndex++;
        }, 120);
        await execAsync(ffmpegCmd);
        clearInterval(spinner);
        spinnerCb(' ');
        return { success: true };
    } catch (error) {
        spinnerCb(' ');
        const errorMsg = `❌ [ERROR] Failed to convert ${inputPath}: ${error.message}`;
        console.error(errorMsg);
        return { success: false, error: error.message };
    }
}

async function main() {
    const targetDir = process.argv[2] || 'S:/MEDIA/MOVIES';
    const scanRoot = path.resolve(targetDir);
    ensureDirSync(REPORT_DIR);
    ensureDirSync(OUTPUT_DIR);
    const reportName = path.basename(scanRoot).replace(/[^a-zA-Z0-9_-]/g, '_') + '_audio_report.json';
    const reportPath = path.join(REPORT_DIR, reportName);
    const progressPath = reportPath + '.progress';

    // 1. Scan and generate report
    console.log('🎬 [AUDIO-SMART] Scanning for video files in:', scanRoot);
    if (!fs.existsSync(scanRoot)) {
        console.error('❌ Directory does not exist:', scanRoot);
        return;
    }
    const files = scanDir(scanRoot);
    if (files.length === 0) {
        console.log('ℹ️  No video files found in the specified directory');
        return;
    }
    let report = [];
    for (const file of files) {
        const codec = getAudioCodec(file);
        report.push({ path: file, codec });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 [REPORT] Audio codec report saved to: ${reportPath}`);

    // 2. Convert non-AAC files to OUTPUT_DIR
    const toConvert = report.filter(f => !['aac', 'mp3'].includes(f.codec));
    if (toConvert.length === 0) {
        console.log('✅ All files have compatible audio codecs!');
        return;
    }
    // Resume logic
    let completed = loadProgress(progressPath);
    let converted = 0, failed = 0;
    console.log(`\n🎵 [AUDIO-SMART] Found ${toConvert.length} files to convert to AAC.`);
    for (const fileObj of toConvert) {
        const relPath = getRelativePath(fileObj.path, scanRoot);
        const outputPath = path.join(OUTPUT_DIR, relPath);
        if (completed.has(outputPath)) {
            console.log(`[SKIP] Already converted: ${outputPath}`);
            continue;
        }
        process.stdout.write(`Converting: ${relPath} `);
        const result = await convertFile(fileObj.path, outputPath, (spin) => {
            process.stdout.write(`\rConverting: ${relPath} ${spin}`);
        });
        if (result.success) {
            converted++;
            completed.add(outputPath);
            saveProgress(progressPath, completed);
            process.stdout.write(`\r✅ Converted: ${relPath}           \n`);
        } else {
            failed++;
            process.stdout.write(`\r❌ Failed: ${relPath}           \n`);
        }
    }
    console.log(`\n🎉 [AUDIO-SMART] Conversion complete! Converted: ${converted}, Failed: ${failed}`);
}

main(); 