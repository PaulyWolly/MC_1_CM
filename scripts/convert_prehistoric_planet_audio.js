/*
  CONVERT_PREHISTORIC_PLANET_AUDIO.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Import helpers
const { logToFile } = require('./logging-helper');
const { ProgressAnimation } = require('./CONVERT/animation-helper');

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
        logToFile('convert_prehistoric_planet_audio', `📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        console.log(`📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        
        // Create temp output path
        const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
        
        // Convert audio to AAC
        logToFile('convert_prehistoric_planet_audio', `🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        console.log(`🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        await execAsync(ffmpegCmd);
        
        // Verify temp file was created
        if (!fs.existsSync(tempOutputPath)) {
            throw new Error('FFmpeg conversion completed but temp file was not created');
        }
        
        // Replace original with converted file
        logToFile('convert_prehistoric_planet_audio', `✅ [REPLACE] Replacing original with converted file`);
        console.log(`✅ [REPLACE] Replacing original with converted file`);
        
        // Use fs operations instead of shell commands for better reliability
        try {
            // Delete original file if it exists
            if (fs.existsSync(inputPath)) {
                fs.unlinkSync(inputPath);
            }
            
            // Rename temp file to original name
            const finalPath = path.join(dir, path.basename(inputPath));
            fs.renameSync(tempOutputPath, finalPath);
            
            logToFile('convert_prehistoric_planet_audio', `✅ [SUCCESS] File successfully converted and replaced`);
            console.log(`✅ [SUCCESS] File successfully converted and replaced`);
        } catch (fsError) {
            // If fs operations fail, try shell commands as fallback
            logToFile('convert_prehistoric_planet_audio', `⚠️ [FALLBACK] Using shell commands for file replacement`);
            console.log(`⚠️ [FALLBACK] Using shell commands for file replacement`);
            
            try {
                await execAsync(`del "${inputPath}"`);
                await execAsync(`ren "${tempOutputPath}" "${path.basename(inputPath)}"`);
            } catch (shellError) {
                throw new Error(`File replacement failed: ${fsError.message} | Shell fallback failed: ${shellError.message}`);
            }
        }
        
        return { success: true, backupPath };
    } catch (error) {
        // Clean up temp file if it exists
        if (fs.existsSync(tempOutputPath)) {
            try {
                fs.unlinkSync(tempOutputPath);
                logToFile('convert_prehistoric_planet_audio', `🧹 [CLEANUP] Removed temp file: ${path.basename(tempOutputPath)}`);
            } catch (cleanupError) {
                logToFile('convert_prehistoric_planet_audio', `⚠️ [CLEANUP] Failed to remove temp file: ${cleanupError.message}`);
            }
        }
        
        const errorMsg = `❌ [ERROR] Failed to convert ${path.basename(inputPath)}: ${error.message}`;
        logToFile('convert_prehistoric_planet_audio', errorMsg);
        console.error(errorMsg);
        return { success: false, error: error.message };
    }
}

async function main() {
    try {
        logToFile('convert_prehistoric_planet_audio', '🎵 [AUDIO-CONVERT] Starting Prehistoric Planet audio conversion...');
        console.log('🎵 [AUDIO-CONVERT] Starting Prehistoric Planet audio conversion...');
        
        // Load the audio report
        const reportPath = path.join(__dirname, 'AUDIO/prehistoric_planet_audio_report.json');
        if (!fs.existsSync(reportPath)) {
            console.error('❌ [ERROR] Audio report not found! Run scan_prehistoric_planet_audio.js first.');
            return;
        }
        
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const problematicFiles = report.problematicFiles || [];
        
        if (problematicFiles.length === 0) {
            console.log('✅ [AUDIO-CONVERT] No problematic files found!');
            return;
        }
        
        console.log(`🎵 [AUDIO-CONVERT] Found ${problematicFiles.length} files to convert`);
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
        const animation = new ProgressAnimation('classic', 20);
        
        for (const file of problematicFiles) {
            const current = converted + failed + 1;
            const progressMsg = `\n📺 [CONVERT] ${animation.getCustomProgress(current, problematicFiles.length, 'Processing')} : ${file.title}`;
            logToFile('convert_prehistoric_planet_audio', progressMsg);
            console.log(progressMsg);
            
            if (file.error) {
                const skipMsg = `⚠️  [SKIP] File has error: ${file.error}`;
                logToFile('convert_prehistoric_planet_audio', skipMsg);
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
                logToFile('convert_prehistoric_planet_audio', codecMsg);
                console.log(codecMsg);
            }
            
            const result = await convertFile(file.path);
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
            totalFiles: problematicFiles.length,
            converted,
            failed,
            results
        };
        
        const logPath = path.join(__dirname, 'AUDIO/prehistoric_planet_conversion_log.json');
        fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
        
        const completeMsg = '\n🎉 [AUDIO-CONVERT] Conversion complete!';
        const summaryMsg = `📊 Summary:\n   Total files: ${problematicFiles.length}\n   Successfully converted: ${converted}\n   Failed: ${failed}`;
        const logSavedMsg = `\n📄 Conversion log saved to: ${logPath}`;
        
        logToFile('convert_prehistoric_planet_audio', completeMsg);
        logToFile('convert_prehistoric_planet_audio', summaryMsg);
        logToFile('convert_prehistoric_planet_audio', logSavedMsg);
        
        console.log(completeMsg);
        console.log(summaryMsg);
        console.log(logSavedMsg);
        
        if (converted > 0) {
            const finalMsg = '\n✅ [AUDIO-CONVERT] All converted files now have AAC audio and should play in browsers!';
            logToFile('convert_prehistoric_planet_audio', finalMsg);
            console.log(finalMsg);
        }
        
    } catch (error) {
        const errorMsg = `❌ [AUDIO-CONVERT] Error: ${error.message}`;
        logToFile('convert_prehistoric_planet_audio', errorMsg);
        console.error('❌ [AUDIO-CONVERT] Error:', error);
    }
}

main(); 