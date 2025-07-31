/*
  CONVERT_FOLDER_AUDIO_TO_AAC.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Import helpers
const { logToFile } = require('./logging-helper');
const { ProgressAnimation } = require('./animation-helper');

// Audio codecs that browsers typically can't play
const INCOMPATIBLE_CODECS = ['ac3', 'dts', 'eac3', 'truehd', 'atmos'];

// Video file extensions
const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];

// FFmpeg command template for converting audio to AAC
function getFFmpegCommand(inputPath, outputPath) {
    return `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
}

// Check audio codec of a file
async function checkAudioCodec(filePath) {
    try {
        const command = `ffprobe -v quiet -print_format json -show_streams "${filePath}"`;
        const { stdout } = await execAsync(command);
        const data = JSON.parse(stdout);
        
        const audioStreams = data.streams?.filter(stream => stream.codec_type === 'audio') || [];
        
        if (audioStreams.length === 0) {
            return { hasAudio: false, codecs: [], error: 'No audio streams found' };
        }
        
        const codecs = audioStreams.map(stream => stream.codec_name?.toLowerCase()).filter(Boolean);
        const hasIncompatibleCodec = codecs.some(codec => INCOMPATIBLE_CODECS.includes(codec));
        
        return {
            hasAudio: true,
            codecs,
            hasIncompatibleCodec,
            incompatibleCodecs: codecs.filter(codec => INCOMPATIBLE_CODECS.includes(codec))
        };
    } catch (error) {
        return { hasAudio: false, codecs: [], error: error.message };
    }
}

// Get all video files in a directory (recursive)
function getAllVideoFiles(dir) {
    const files = [];
    
    function scanDirectory(currentDir) {
        try {
            const items = fs.readdirSync(currentDir);
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();
                    if (VIDEO_EXTENSIONS.includes(ext)) {
                        files.push({
                            filePath: fullPath,
                            name: item
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${currentDir}:`, error.message);
        }
    }
    
    scanDirectory(dir);
    return files;
}

// Create backup and convert
async function convertFile(inputPath) {
    let tempOutputPath;
    try {
        const dir = path.dirname(inputPath);
        const ext = path.extname(inputPath);
        const name = path.basename(inputPath, ext);
        
        // Create backup
        const backupPath = path.join(dir, `${name}_backup${ext}`);
        logToFile('convert_folder_audio', `📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        console.log(`📦 [BACKUP] Creating backup: ${path.basename(backupPath)}`);
        await execAsync(`copy "${inputPath}" "${backupPath}"`);
        
        // Create temp output path
        tempOutputPath = path.join(dir, `${name}_temp${ext}`);
        
        // Convert audio to AAC
        logToFile('convert_folder_audio', `🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        console.log(`🔄 [CONVERT] Converting audio to AAC: ${path.basename(inputPath)}`);
        const ffmpegCmd = getFFmpegCommand(inputPath, tempOutputPath);
        await execAsync(ffmpegCmd);
        
        // Verify temp file was created
        if (!fs.existsSync(tempOutputPath)) {
            throw new Error('FFmpeg conversion completed but temp file was not created');
        }
        
        // Replace original with converted file
        logToFile('convert_folder_audio', `✅ [REPLACE] Replacing original with converted file`);
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
            
            logToFile('convert_folder_audio', `✅ [SUCCESS] File successfully converted and replaced`);
            console.log(`✅ [SUCCESS] File successfully converted and replaced`);
        } catch (fsError) {
            // If fs operations fail, try shell commands as fallback
            logToFile('convert_folder_audio', `⚠️ [FALLBACK] Using shell commands for file replacement`);
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
                logToFile('convert_folder_audio', `🧹 [CLEANUP] Removed temp file: ${path.basename(tempOutputPath)}`);
            } catch (cleanupError) {
                logToFile('convert_folder_audio', `⚠️ [CLEANUP] Failed to remove temp file: ${cleanupError.message}`);
            }
        }
        
        const errorMsg = `❌ [ERROR] Failed to convert ${path.basename(inputPath)}: ${error.message}`;
        logToFile('convert_folder_audio', errorMsg);
        console.error(errorMsg);
        return { success: false, error: error.message };
    }
}

async function main() {
    try {
        // Get folder path from command line argument
        const folderPath = process.argv[2];
        
        if (!folderPath) {
            console.log('🎵 [AUDIO-CONVERT] Folder Audio to AAC Converter');
            console.log('');
            console.log('Usage: node convert_folder_audio_to_aac.js [folder_path]');
            console.log('');
            console.log('Examples:');
            console.log('  node convert_folder_audio_to_aac.js "S:/MEDIA/TV-SHOWS/Prehistoric Planet"');
            console.log('  node convert_folder_audio_to_aac.js "C:/Videos/My Show"');
            console.log('  node convert_folder_audio_to_aac.js "D:/Movies/Action Films"');
            console.log('');
            console.log('This script will:');
            console.log('  1. Scan the specified folder for video files');
            console.log('  2. Check audio codecs of all video files');
            console.log('  3. Convert files with incompatible audio (EAC3, AC3, DTS, etc.) to AAC');
            console.log('  4. Create backups of original files');
            console.log('  5. Replace originals with converted versions');
            return;
        }
        
        // Normalize the path
        const normalizedPath = path.resolve(folderPath);
        
        logToFile('convert_folder_audio', `🎵 [AUDIO-CONVERT] Starting folder conversion: ${normalizedPath}`);
        console.log(`🎵 [AUDIO-CONVERT] Starting folder conversion: ${normalizedPath}`);
        
        if (!fs.existsSync(normalizedPath)) {
            console.error(`❌ [ERROR] Folder not found: ${normalizedPath}`);
            return;
        }
        
        // Get all video files
        console.log(`🔍 [SCAN] Scanning for video files...`);
        const videoFiles = getAllVideoFiles(normalizedPath);
        
        if (videoFiles.length === 0) {
            console.log(`❌ [ERROR] No video files found in: ${normalizedPath}`);
            return;
        }
        
        console.log(`📺 [SCAN] Found ${videoFiles.length} video files`);
        
        // Check audio codecs
        console.log(`🔍 [SCAN] Checking audio codecs...`);
        const animation = new ProgressAnimation('classic', 20);
        const audioResults = [];
        
        for (let i = 0; i < videoFiles.length; i++) {
            const file = videoFiles[i];
            const progressLine = animation.getCustomProgress(i + 1, videoFiles.length, 'Checking', '[SCAN] ');
            console.log(`${progressLine} : ${file.name}`);
            
            const audioInfo = await checkAudioCodec(file.filePath);
            audioResults.push({
                ...file,
                ...audioInfo
            });
        }
        
        // Filter problematic files
        const problematicFiles = audioResults.filter(file => file.hasIncompatibleCodec);
        
        if (problematicFiles.length === 0) {
            console.log(`✅ [AUDIO-CONVERT] No files with incompatible audio codecs found!`);
            console.log(`🎉 [AUDIO-CONVERT] All files should play properly in browsers.`);
            return;
        }
        
        console.log(`\n⚠️  [AUDIO-CONVERT] Found ${problematicFiles.length} files with incompatible audio codecs:`);
        problematicFiles.forEach(file => {
            console.log(`   - ${file.name}: ${file.incompatibleCodecs.join(', ')}`);
        });
        
        console.log('\n⚠️  WARNING: This will create backups and replace original files!');
        console.log('   Make sure you have enough disk space for backups.');
        
        // Ask for confirmation
        console.log('\nPress Enter to continue or Ctrl+C to cancel...');
        await new Promise(resolve => {
            process.stdin.once('data', resolve);
        });
        
        // Convert files
        const results = [];
        let converted = 0;
        let failed = 0;
        
        for (let i = 0; i < problematicFiles.length; i++) {
            const file = problematicFiles[i];
            const current = i + 1;
            const progressMsg = `\n📺 [CONVERT] ${animation.getCustomProgress(current, problematicFiles.length, 'Processing')} : ${file.name}`;
            logToFile('convert_folder_audio', progressMsg);
            console.log(progressMsg);
            
            if (file.error) {
                const skipMsg = `⚠️  [SKIP] File has error: ${file.error}`;
                logToFile('convert_folder_audio', skipMsg);
                console.log(skipMsg);
                results.push({
                    path: file.filePath,
                    name: file.name,
                    success: false,
                    error: file.error,
                    skipped: true
                });
                failed++;
                continue;
            }
            
            if (file.incompatibleCodecs && file.incompatibleCodecs.length > 0) {
                const codecMsg = `🔧 [CONVERT] Incompatible codecs: ${file.incompatibleCodecs.join(', ')}`;
                logToFile('convert_folder_audio', codecMsg);
                console.log(codecMsg);
            }
            
            const result = await convertFile(file.filePath);
            results.push({
                path: file.filePath,
                name: file.name,
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
            folderPath: normalizedPath,
            totalFiles: videoFiles.length,
            problematicFiles: problematicFiles.length,
            converted,
            failed,
            results
        };
        
        const logPath = path.join(__dirname, 'AUDIO', `${path.basename(normalizedPath).replace(/[^a-zA-Z0-9]/g, '_')}_conversion_log.json`);
        fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
        
        const completeMsg = '\n🎉 [AUDIO-CONVERT] Conversion complete!';
        const summaryMsg = `📊 Summary:\n   Total video files: ${videoFiles.length}\n   Files with incompatible audio: ${problematicFiles.length}\n   Successfully converted: ${converted}\n   Failed: ${failed}`;
        const logSavedMsg = `\n📄 Conversion log saved to: ${logPath}`;
        
        logToFile('convert_folder_audio', completeMsg);
        logToFile('convert_folder_audio', summaryMsg);
        logToFile('convert_folder_audio', logSavedMsg);
        
        console.log(completeMsg);
        console.log(summaryMsg);
        console.log(logSavedMsg);
        
        if (converted > 0) {
            const finalMsg = '\n✅ [AUDIO-CONVERT] All converted files now have AAC audio and should play in browsers!';
            logToFile('convert_folder_audio', finalMsg);
            console.log(finalMsg);
        }
        
    } catch (error) {
        const errorMsg = `❌ [AUDIO-CONVERT] Error: ${error.message}`;
        logToFile('convert_folder_audio', errorMsg);
        console.error('❌ [AUDIO-CONVERT] Error:', error);
    }
}

main(); 