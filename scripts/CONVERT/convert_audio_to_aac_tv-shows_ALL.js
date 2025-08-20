/*
  CONVERT_AUDIO_TO_AAC_TV-SHOWS_ALL.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
  Created by Paul Welby
*/

const tvShowsRoot = 'S:/MEDIA/TV-SHOWS/';
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { logToFile } = require('../logging-helper');

const AUDIO_REPORT_PATH = path.join(__dirname, 'audio_codec_report_tv-shows.json');
const CONVERSION_LOG_PATH = path.join(__dirname, 'audio_conversion_log_tv-shows_ALL.json');

function getFFmpegCommand(inputPath, outputPath) {
    return `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
}

async function convertFile(inputPath) {
    try {
        const dir = path.dirname(inputPath);
        const ext = path.extname(inputPath);
        const name = path.basename(inputPath, ext);
        const backupPath = path.join(dir, `${name}_backup${ext}`);
        logToFile('convert_audio_to_aac_tv-shows_ALL', `📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        console.log(`📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
        logToFile('convert_audio_to_aac_tv-shows_ALL', `🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        console.log(`🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        await execAsync(ffmpegCmd);
        logToFile('convert_audio_to_aac_tv-shows_ALL', `✅ [REPLACE] Replacing original with converted file`);
        console.log(`✅ [REPLACE] Replacing original with converted file`);
        await execAsync(`del "${inputPath}"`);
        await execAsync(`ren "${tempOutputPath}" "${path.basename(inputPath)}"`);
        return { success: true, backupPath };
    } catch (error) {
        const errorMsg = `❌ [ERROR] Failed to convert ${path.basename(inputPath)}: ${error.message}`;
        logToFile('convert_audio_to_aac_tv-shows_ALL', errorMsg);
        console.error(errorMsg);
        return { success: false, error: error.message };
    }
}

async function main() {
    try {
        logToFile('convert_audio_to_aac_tv-shows_ALL', '🎵 [AUDIO-CONVERT] Starting audio conversion for ALL TV Shows...');
        console.log('🎵 [AUDIO-CONVERT] Loading audio codec report...');
        if (!fs.existsSync(AUDIO_REPORT_PATH)) {
            const errorMsg = '❌ [AUDIO-CONVERT] audio_codec_report_tv-shows.json not found! Run check_audio_codecs_tv-shows.js first to generate the report.';
            logToFile('convert_audio_to_aac_tv-shows_ALL', errorMsg);
            console.error('❌ [AUDIO-CONVERT] audio_codec_report_tv-shows.json not found!');
            console.log('💡 Run check_audio_codecs_tv-shows.js first to generate the report.');
            return;
        }
        const report = JSON.parse(fs.readFileSync(AUDIO_REPORT_PATH, 'utf8'));
        const problematicFiles = report.problematicFiles || [];
        if (problematicFiles.length === 0) {
            const successMsg = '✅ [AUDIO-CONVERT] No problematic files found!';
            logToFile('convert_audio_to_aac_tv-shows_ALL', successMsg);
            console.log(successMsg);
            return;
        }
        const startMsg = `🎵 [AUDIO-CONVERT] Found ${problematicFiles.length} files to convert`;
        logToFile('convert_audio_to_aac_tv-shows_ALL', startMsg);
        console.log(startMsg);
        console.log('\n⚠️  WARNING: This will create backups and replace original files!');
        console.log('   Make sure you have enough disk space for backups.');
        console.log('\nPress Enter to continue or Ctrl+C to cancel...');
        await new Promise(resolve => { process.stdin.once('data', resolve); });
        const results = [];
        let converted = 0;
        let failed = 0;
        for (const file of problematicFiles) {
            const progressMsg = `\n📺 [CONVERT] Processing ${converted + failed + 1}/${problematicFiles.length}: ${file.title}`;
            logToFile('convert_audio_to_aac_tv-shows_ALL', progressMsg);
            console.log(progressMsg);
            if (file.error) {
                const skipMsg = `⚠️  [SKIP] File has error: ${file.error}`;
                logToFile('convert_audio_to_aac_tv-shows_ALL', skipMsg);
                console.log(skipMsg);
                results.push({ path: file.path, title: file.title, success: false, error: file.error, skipped: true });
                failed++;
                continue;
            }
            if (file.incompatibleCodecs && file.incompatibleCodecs.length > 0) {
                const codecMsg = `🔧 [CONVERT] Incompatible codecs: ${file.incompatibleCodecs.join(', ')}`;
                logToFile('convert_audio_to_aac_tv-shows_ALL', codecMsg);
                console.log(codecMsg);
            }
            const result = await convertFile(file.path);
            results.push({ path: file.path, title: file.title, ...result });
            if (result.success) { converted++; } else { failed++; }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        const log = {
            timestamp: new Date().toISOString(),
            totalFiles: problematicFiles.length,
            converted,
            failed,
            results
        };
        fs.writeFileSync(CONVERSION_LOG_PATH, JSON.stringify(log, null, 2));
        console.log('\n' + '='.repeat(60));
        console.log('🎉 [AUDIO-CONVERT] TV SHOWS BATCH CONVERSION COMPLETED SUCCESSFULLY! 🎉');
        console.log('='.repeat(60));
        
        const summaryMsg = `📊 SUMMARY:\n   Total files processed: ${problematicFiles.length}\n   Successfully converted: ${converted}\n   Failed: ${failed}`;
        const logSavedMsg = `📄 Conversion log saved to: ${CONVERSION_LOG_PATH}`;
        
        logToFile('convert_audio_to_aac_tv-shows_ALL', '🎉 [AUDIO-CONVERT] TV SHOWS BATCH CONVERSION COMPLETED SUCCESSFULLY!');
        logToFile('convert_audio_to_aac_tv-shows_ALL', summaryMsg);
        logToFile('convert_audio_to_aac_tv-shows_ALL', logSavedMsg);
        
        console.log(summaryMsg);
        console.log(logSavedMsg);
        
        if (converted > 0) {
            const finalMsg = '✅ [AUDIO-CONVERT] All converted files now have AAC audio and should play in browsers!';
            logToFile('convert_audio_to_aac_tv-shows_ALL', finalMsg);
            console.log(finalMsg);
        }
        
        console.log('🎯 [AUDIO-CONVERT] Process completed at:', new Date().toLocaleString());
        console.log('='.repeat(60));
    } catch (err) {
        const errorMsg = `❌ [FATAL ERROR] ${err.message}`;
        logToFile('convert_audio_to_aac_tv-shows_ALL', errorMsg);
        console.error(errorMsg);
    }
}

main(); 