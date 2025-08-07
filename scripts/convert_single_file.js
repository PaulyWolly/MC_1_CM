/*
  CONVERT_SINGLE_FILE.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
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
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const name = path.basename(inputPath, ext);
    
    // Create temp output path (moved outside try block for scope)
    const tempOutputPath = path.join(dir, `${name}_temp${ext}`);
    
    try {
        // Create backup
        const backupPath = path.join(dir, `${name}_backup${ext}`);
        logToFile('convert_single_file', `📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        console.log(`📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        
        // Convert audio to AAC
        logToFile('convert_single_file', `🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        console.log(`🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        
        // Start FFmpeg with progress tracking
        const ffmpegProcess = exec(ffmpegCmd);
        const animation = new ProgressAnimation('classic', 20);
        let progressInterval;
        
        // Update progress animation
        progressInterval = setInterval(() => {
            process.stdout.write(`\r📺 [CONVERT] ${animation.getSpinnerLine('Converting audio to AAC...')}`);
        }, 100);
        
        // Wait for FFmpeg to complete
        await new Promise((resolve, reject) => {
            ffmpegProcess.on('close', (code) => {
                clearInterval(progressInterval);
                process.stdout.write('\n');
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });
            
            ffmpegProcess.on('error', (error) => {
                clearInterval(progressInterval);
                process.stdout.write('\n');
                reject(error);
            });
        });
        
        // Verify temp file was created
        if (!fs.existsSync(tempOutputPath)) {
            throw new Error('FFmpeg conversion completed but temp file was not created');
        }
        
        // Replace original with converted file
        logToFile('convert_single_file', `✅ [REPLACE] Replacing original with converted file`);
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
            
            logToFile('convert_single_file', `✅ [SUCCESS] File successfully converted and replaced`);
            console.log(`✅ [SUCCESS] File successfully converted and replaced`);
        } catch (fsError) {
            // If fs operations fail, try shell commands as fallback
            logToFile('convert_single_file', `⚠️ [FALLBACK] Using shell commands for file replacement`);
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
        if (tempOutputPath && fs.existsSync(tempOutputPath)) {
            try {
                fs.unlinkSync(tempOutputPath);
                logToFile('convert_single_file', `🧹 [CLEANUP] Removed temp file: ${path.basename(tempOutputPath)}`);
            } catch (cleanupError) {
                logToFile('convert_single_file', `⚠️ [CLEANUP] Failed to remove temp file: ${cleanupError.message}`);
            }
        }
        
        const errorMsg = `❌ [ERROR] Failed to convert ${path.basename(inputPath)}: ${error.message}`;
        logToFile('convert_single_file', errorMsg);
        console.error(errorMsg);
        return { success: false, error: error.message };
    }
}

async function main() {
    try {
        // The specific file that didn't complete
        const filePath = 'S:\\MEDIA\\TV-SHOWS\\Prehistoric Planet\\Season 02\\Prehistoric.Planet.(2022).S02E01.mkv';
        
        logToFile('convert_single_file', `🎵 [AUDIO-CONVERT] Starting single file conversion: ${path.basename(filePath)}`);
        console.log(`🎵 [AUDIO-CONVERT] Starting single file conversion: ${path.basename(filePath)}`);
        
        if (!fs.existsSync(filePath)) {
            console.error(`❌ [ERROR] File not found: ${filePath}`);
            return;
        }
        
        console.log(`🎵 [AUDIO-CONVERT] Converting: ${path.basename(filePath)}`);
        console.log('\n⚠️  WARNING: This will create a backup and replace the original file!');
        
        // Ask for confirmation
        console.log('\nPress Enter to continue or Ctrl+C to cancel...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
        console.log(`\n📺 [CONVERT] Starting conversion...`);
        
        const result = await convertFile(filePath);
        
        if (result.success) {
            console.log('\n' + '='.repeat(60));
            console.log('🎉 [AUDIO-CONVERT] CONVERSION COMPLETED SUCCESSFULLY! 🎉');
            console.log('='.repeat(60));
            console.log(`✅ [AUDIO-CONVERT] File now has AAC audio and should play in browsers!`);
            console.log(`📦 [AUDIO-CONVERT] Backup saved as: ${path.basename(result.backupPath)}`);
            console.log(`📁 [AUDIO-CONVERT] Original file: ${path.basename(filePath)}`);
            console.log('='.repeat(60));
            console.log('🎯 [AUDIO-CONVERT] Process completed at:', new Date().toLocaleString());
            console.log('='.repeat(60));
        } else {
            console.log('\n' + '='.repeat(60));
            console.log('❌ [AUDIO-CONVERT] CONVERSION FAILED! ❌');
            console.log('='.repeat(60));
            console.log(`💡 [AUDIO-CONVERT] Error: ${result.error}`);
            console.log('='.repeat(60));
        }
        
    } catch (error) {
        const errorMsg = `❌ [AUDIO-CONVERT] Error: ${error.message}`;
        logToFile('convert_single_file', errorMsg);
        console.error('❌ [AUDIO-CONVERT] Error:', error);
    }
}

main(); 