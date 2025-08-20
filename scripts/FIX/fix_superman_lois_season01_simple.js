/*
  FIX_SUPERMAN_LOIS_SEASON01_SIMPLE.JS
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

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Paths
const SEASON_PATH = 'S:\\MEDIA\\TV-SHOWS\\Superman & Lois\\Season 01';
const LOG_PATH = path.join(__dirname, '../logs/fix_superman_lois_season01_simple.js.log');

// Progress indicators
const progressChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let progressIndex = 0;

// Helper to log to both console and file
function logLine(line) {
    console.log(line);
    fs.appendFileSync(LOG_PATH, line + '\n');
}

// Progress bar function
function showProgress(current, total, message = '') {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((barLength * current) / total);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    const spinner = progressChars[progressIndex % progressChars.length];
    progressIndex++;
    
    process.stdout.write(`\r${spinner} [${bar}] ${percentage}% (${current}/${total}) ${message}`);
}

// Clear progress line
function clearProgress() {
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
}

async function convertAudioToAAC(inputPath, current, total) {
    try {
        const dir = path.dirname(inputPath);
        const ext = path.extname(inputPath);
        const name = path.basename(inputPath, ext);
        
        // Create output path with "_converted" suffix
        const outputPath = path.join(dir, `${name}_converted${ext}`);
        
        clearProgress();
        logLine(`[CONVERT] Converting: ${path.basename(inputPath)} (${current}/${total})`);
        
        // FFmpeg command to convert audio to AAC while keeping video unchanged
        const command = `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
        
        // Show progress while converting
        const startTime = Date.now();
        let lastUpdate = startTime;
        
        const ffmpegProcess = exec(command);
        
        // Show progress updates
        const progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const elapsedSeconds = Math.round(elapsed / 1000);
            showProgress(current, total, `Converting ${path.basename(inputPath)} (${elapsedSeconds}s)`);
        }, 500);
        
        // Wait for ffmpeg to complete
        await new Promise((resolve, reject) => {
            ffmpegProcess.on('close', (code) => {
                clearInterval(progressInterval);
                clearProgress();
                
                if (code === 0) {
                    const totalTime = Math.round((Date.now() - startTime) / 1000);
                    logLine(`[CONVERT] ✅ Successfully converted: ${path.basename(inputPath)} -> ${path.basename(outputPath)} (${totalTime}s)`);
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });
            
            ffmpegProcess.on('error', (error) => {
                clearInterval(progressInterval);
                clearProgress();
                reject(error);
            });
        });
        
        return { success: true, outputPath };
    } catch (error) {
        clearProgress();
        logLine(`[CONVERT] ❌ Error converting ${path.basename(inputPath)}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function processSeason01() {
    try {
        fs.writeFileSync(LOG_PATH, '');
        logLine(`🎵 [AUDIO-CONVERT] Starting Superman & Lois Season 01 audio conversion...`);
        logLine(`📁 [AUDIO-CONVERT] Scanning directory: ${SEASON_PATH}`);
        
        // Get all .mkv files in the Season 01 directory (excluding backups and temp files)
        const files = fs.readdirSync(SEASON_PATH)
            .filter(file => file.toLowerCase().endsWith('.mkv'))
            .filter(file => !file.includes('_backup') && !file.includes('_temp') && !file.includes('_converted'))
            .map(file => path.join(SEASON_PATH, file));
        
        logLine(`📺 [AUDIO-CONVERT] Found ${files.length} .mkv files to convert`);
        logLine(`🔄 [AUDIO-CONVERT] Starting conversion process...`);
        logLine(`⏱️  [AUDIO-CONVERT] This may take several minutes. Please wait...`);
        logLine(``);
        
        const results = [];
        let processed = 0;
        let converted = 0;
        let failed = 0;
        
        for (const filePath of files) {
            processed++;
            
            const result = await convertAudioToAAC(filePath, processed, files.length);
            
            if (result.success) {
                converted++;
                results.push({
                    file: path.basename(filePath),
                    converted: true,
                    outputFile: path.basename(result.outputPath)
                });
            } else {
                failed++;
                results.push({
                    file: path.basename(filePath),
                    converted: false,
                    error: result.error
                });
            }
            
            // Show overall progress
            showProgress(processed, files.length, `Overall Progress`);
        }
        
        clearProgress();
        logLine(``);
        logLine(`🎉 [AUDIO-CONVERT] ===== CONVERSION COMPLETE =====`);
        logLine(`📊 [AUDIO-CONVERT] Total files processed: ${processed}`);
        logLine(`✅ [AUDIO-CONVERT] Files converted: ${converted}`);
        logLine(`❌ [AUDIO-CONVERT] Files failed: ${failed}`);
        logLine(`📈 [AUDIO-CONVERT] Success rate: ${Math.round((converted / processed) * 100)}%`);
        logLine(`=========================================`);
        
        if (converted > 0) {
            logLine(``);
            logLine(`🎯 [AUDIO-CONVERT] ✅ Conversion successful!`);
            logLine(`📁 [AUDIO-CONVERT] Converted files have "_converted" suffix.`);
            logLine(``);
            logLine(`📋 [AUDIO-CONVERT] Next steps:`);
            logLine(`   1. Test the converted files in your Video.js player`);
            logLine(`   2. If they work, you can replace the originals manually`);
            logLine(`   3. Or run a script to replace them automatically`);
            logLine(``);
            logLine(`🔍 [AUDIO-CONVERT] Example converted file: Superman.and.Lois.S01E01.[1080p]_converted.mkv`);
        }
        
        // Save results to JSON
        const resultsPath = path.join(__dirname, 'superman_lois_season01_simple_conversion_results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        logLine(`💾 [AUDIO-CONVERT] Results saved to: ${resultsPath}`);
        
    } catch (err) {
        clearProgress();
        logLine(`💥 [AUDIO-CONVERT] Error: ${err}`);
    }
}

// MAIN
processSeason01(); 