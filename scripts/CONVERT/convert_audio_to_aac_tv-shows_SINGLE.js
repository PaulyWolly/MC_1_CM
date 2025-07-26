/*
  CONVERT_AUDIO_TO_AAC_TV-SHOWS_SINGLE.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const tvShowsRoot = 'S:/MEDIA/TV-SHOWS/';
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Import logging helper
const { logToFile } = require('../logging-helper');

// Paths
const AUDIO_REPORT_PATH = path.join(__dirname, '../AUDIO/audio_codec_report_tv-shows_SINGLE.json');
const CONVERSION_LOG_PATH = path.join(__dirname, 'audio_conversion_log_tv-shows.json');

function fuzzyMatch(a, b) {
  const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean(a) === clean(b);
}

function findBestMatchShow(title) {
  const folders = fs.readdirSync(tvShowsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  let best = folders.find(f => fuzzyMatch(f, title));
  if (!best) {
    best = folders.find(f => f.toLowerCase().includes(title.toLowerCase()));
  }
  return best ? path.join(tvShowsRoot, best) : null;
}

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Usage: node scripts/convert_audio_to_aac_tv-shows.js "TV Show Name"');
  process.exit(1);
}

let showFolder = inputArg;
if (!inputArg.match(/[\/]/)) {
  const folder = findBestMatchShow(inputArg);
  if (!folder) {
    console.error(`[ERROR] No matching TV show folder found for '${inputArg}' in ${tvShowsRoot}`);
    process.exit(1);
  }
  showFolder = folder;
  console.log(`[MATCH] Found TV show folder: ${showFolder}`);
}

// FFmpeg command template for converting audio to AAC
function getFFmpegCommand(inputPath, outputPath) {
    return `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
}

// Create backup and convert
async function convertFile(inputPath) {
    try {
        const dir = path.dirname(inputPath);
        const ext = path.extname(inputPath);
        const name = path.basename(inputPath, ext);
        
        // Create backup
        const backupPath = path.join(dir, `${name}_backup${ext}`);
        logToFile('convert_audio_to_aac_tv-shows', `📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        console.log(`📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        
        // Create temp output path
        const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
        
        // Convert audio to AAC
        logToFile('convert_audio_to_aac_tv-shows', `🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        console.log(`🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        await execAsync(ffmpegCmd);
        
        // Replace original with converted file
        logToFile('convert_audio_to_aac_tv-shows', `✅ [REPLACE] Replacing original with converted file`);
        console.log(`✅ [REPLACE] Replacing original with converted file`);
        await execAsync(`del "${inputPath}"`);
        await execAsync(`ren "${tempOutputPath}" "${path.basename(inputPath)}"`);
        
        return { success: true, backupPath };
    } catch (error) {
        const errorMsg = `❌ [ERROR] Failed to convert ${path.basename(inputPath)}: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows', errorMsg);
        console.error(errorMsg);
        return { success: false, error: error.message };
    }
}

async function main() {
    try {
        logToFile('convert_audio_to_aac_tv-shows', '🎵 [AUDIO-CONVERT] Starting audio conversion for TV Shows...');
        console.log('🎵 [AUDIO-CONVERT] Loading audio codec report...');
        
        if (!fs.existsSync(AUDIO_REPORT_PATH)) {
            const errorMsg = '❌ [AUDIO-CONVERT] audio_codec_report_tv-shows.json not found! Run check_audio_codecs_tv-shows.js first to generate the report.';
            logToFile('convert_audio_to_aac_tv-shows', errorMsg);
            console.error('❌ [AUDIO-CONVERT] audio_codec_report_tv-shows.json not found!');
            console.log('💡 Run check_audio_codecs_tv-shows.js first to generate the report.');
            return;
        }
        
        const report = JSON.parse(fs.readFileSync(AUDIO_REPORT_PATH, 'utf8'));
        const problematicFiles = report.problematicFiles || [];
        
        if (problematicFiles.length === 0) {
            const successMsg = '✅ [AUDIO-CONVERT] No problematic files found!';
            logToFile('convert_audio_to_aac_tv-shows', successMsg);
            console.log(successMsg);
            return;
        }
        
        // Only process files in the selected show folder
        const showFiles = problematicFiles.filter(file => file.path.startsWith(showFolder));

        if (showFiles.length === 0) {
            console.log(`[INFO] No files to convert for show: ${showFolder}`);
            return;
        }

        const startMsg = `🎵 [AUDIO-CONVERT] Found ${showFiles.length} files to convert`;
        logToFile('convert_audio_to_aac_tv-shows', startMsg);
        console.log(startMsg);
        console.log('\n⚠️  WARNING: This will create backups and replace original files!');
        console.log('   Make sure you have enough disk space for backups.');
        
        // Ask for confirmation
        console.log('\nPress Enter to continue or Ctrl+C to cancel...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
        const results = [];
        let converted = 0;
        let failed = 0;
        
        for (const file of showFiles) {
            const progressMsg = `\n📺 [CONVERT] Processing ${converted + failed + 1}/${showFiles.length}: ${file.title}`;
            logToFile('convert_audio_to_aac_tv-shows', progressMsg);
            console.log(progressMsg);
            
            if (file.error) {
                const skipMsg = `⚠️  [SKIP] File has error: ${file.error}`;
                logToFile('convert_audio_to_aac_tv-shows', skipMsg);
                console.log(skipMsg);
                results.push({
                    path: file.path,
                    title: file.title,
                    success: false,
                    error: file.error,
                    skipped: true
                });
                failed++;
                continue;
            }
            
            if (file.incompatibleCodecs && file.incompatibleCodecs.length > 0) {
                const codecMsg = `🔧 [CONVERT] Incompatible codecs: ${file.incompatibleCodecs.join(', ')}`;
                logToFile('convert_audio_to_aac_tv-shows', codecMsg);
                console.log(codecMsg);
            }
            
            // Debug: print ffmpeg command
            console.log(`[DEBUG] About to run ffmpeg/ffprobe on: ${file.path}`);
            const result = await convertFile(file.path);
            if (!result.success && result.error) {
                console.error(`[DEBUG] Full error for ${file.path}: ${result.error}`);
            }
            results.push({
                path: file.path,
                title: file.title,
                ...result
            });
            
            if (result.success) {
                converted++;
            } else {
                failed++;
            }
            
            // Small delay to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Save conversion log
        const log = {
            timestamp: new Date().toISOString(),
            totalFiles: showFiles.length,
            converted,
            failed,
            results
        };
        
        fs.writeFileSync(CONVERSION_LOG_PATH, JSON.stringify(log, null, 2));
        
        const completeMsg = '\n🎉 [AUDIO-CONVERT] Conversion complete!';
        const summaryMsg = `📊 Summary:\n   Total files: ${showFiles.length}\n   Successfully converted: ${converted}\n   Failed: ${failed}`;
        const logSavedMsg = `\n📄 Conversion log saved to: ${CONVERSION_LOG_PATH}`;
        
        logToFile('convert_audio_to_aac_tv-shows', completeMsg);
        logToFile('convert_audio_to_aac_tv-shows', summaryMsg);
        logToFile('convert_audio_to_aac_tv-shows', logSavedMsg);
        
        console.log(completeMsg);
        console.log(summaryMsg);
        console.log(logSavedMsg);
        
        if (converted > 0) {
            const finalMsg = '\n✅ [AUDIO-CONVERT] All converted files now have AAC audio and should play in browsers!';
            logToFile('convert_audio_to_aac_tv-shows', finalMsg);
            console.log(finalMsg);
        }
        
    } catch (error) {
        const errorMsg = `❌ [AUDIO-CONVERT] Error: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows', errorMsg);
        console.error('❌ [AUDIO-CONVERT] Error:', error);
    }
}

// Run the conversion
main(); 