/*
  FIX_CORRUPTED_VIDEOS.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

/*
  FIX_CORRUPTED_VIDEOS.JS
  Batch fix corrupted video files using FFmpeg
  Usage: node scripts/fix_corrupted_videos.js "path/to/video/folder"
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Configuration
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv'];
const OUTPUT_FORMAT = 'mp4';
const FFMPEG_PRESET = 'medium'; // ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow
const CRF_VALUE = 23; // 18-28 is good quality, lower = better quality but larger file

async function fixVideoFile(inputPath, outputPath) {
    try {
        console.log(`🔄 Processing: ${path.basename(inputPath)}`);
        
        // Build FFmpeg command
        // Old: const cmd = `ffmpeg -i "${inputPath}" -c:v libx264 -c:a aac -preset medium -crf 23 -max_muxing_queue_size 1024 -avoid_negative_ts make_zero "${outputPath}"`;
        const cmd = `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k "${outputPath}"`;
        
        console.log(`📝 Command: ${cmd}`);
        
        const { stdout, stderr } = await execAsync(cmd);
        
        if (stderr && stderr.includes('error')) {
            console.error(`❌ Error processing ${path.basename(inputPath)}:`, stderr);
            return false;
        }
        
        console.log(`✅ Successfully processed: ${path.basename(inputPath)}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to process ${path.basename(inputPath)}:`, error.message);
        return false;
    }
}

async function processFolder(folderPath) {
    try {
        console.log(`📁 Processing folder: ${folderPath}`);
        
        if (!fs.existsSync(folderPath)) {
            console.error(`❌ Folder does not exist: ${folderPath}`);
            return;
        }
        
        // Create backup folder
        const backupFolder = path.join(folderPath, 'backup_original');
        if (!fs.existsSync(backupFolder)) {
            fs.mkdirSync(backupFolder, { recursive: true });
            console.log(`📁 Created backup folder: ${backupFolder}`);
        }
        
        // Get all video files
        const files = fs.readdirSync(folderPath)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return VIDEO_EXTENSIONS.includes(ext);
            })
            .map(file => path.join(folderPath, file));
        
        if (files.length === 0) {
            console.log('ℹ️ No video files found in the specified folder.');
            return;
        }
        
        console.log(`📊 Found ${files.length} video files to process:`);
        files.forEach(file => console.log(`  - ${path.basename(file)}`));
        
        // Process each file
        let successCount = 0;
        let failCount = 0;
        
        for (const file of files) {
            const filename = path.basename(file);
            const nameWithoutExt = path.parse(filename).name;
            const outputFile = path.join(folderPath, `${nameWithoutExt}_fixed.${OUTPUT_FORMAT}`);
            
            // Backup original file
            const backupFile = path.join(backupFolder, filename);
            if (!fs.existsSync(backupFile)) {
                fs.copyFileSync(file, backupFile);
                console.log(`💾 Backed up: ${filename}`);
            }
            
            // Fix the video
            const success = await fixVideoFile(file, outputFile);
            
            if (success) {
                successCount++;
                console.log(`✅ Fixed: ${filename} -> ${path.basename(outputFile)}`);
            } else {
                failCount++;
                console.log(`❌ Failed: ${filename}`);
            }
            
            // Add a small delay between files
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`\n📊 Processing complete!`);
        console.log(`✅ Successfully processed: ${successCount} files`);
        console.log(`❌ Failed: ${failCount} files`);
        console.log(`💾 Original files backed up to: ${backupFolder}`);
        
    } catch (error) {
        console.error('❌ Error processing folder:', error.message);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node scripts/fix_corrupted_videos.js "path/to/video/folder"');
        console.log('Example: node scripts/fix_corrupted_videos.js "S:/MEDIA/TV-SHOWS/Based on a True Story"');
        return;
    }
    
    const folderPath = args[0];
    
    console.log('🎬 Video Corruption Fixer');
    console.log('========================');
    console.log(`📁 Target folder: ${folderPath}`);
    console.log(`⚙️ Preset: ${FFMPEG_PRESET}`);
    console.log(`🎯 Quality: CRF ${CRF_VALUE}`);
    console.log(`📹 Output format: ${OUTPUT_FORMAT}`);
    console.log('');
    
    await processFolder(folderPath);
}

// Check if FFmpeg is available
exec('ffmpeg -version', (error) => {
    if (error) {
        console.error('❌ FFmpeg is not installed or not in PATH');
        console.log('Please install FFmpeg: https://ffmpeg.org/download.html');
        process.exit(1);
    }
    
    main().catch(console.error);
}); 