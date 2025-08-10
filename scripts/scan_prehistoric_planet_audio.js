/*
  SCAN_PREHISTORIC_PLANET_AUDIO.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const { ProgressAnimation } = require('./CONVERT/animation-helper');

// Audio codecs that browsers typically can't play
const INCOMPATIBLE_CODECS = ['ac3', 'dts', 'eac3', 'truehd', 'atmos'];

async function checkAudioCodec(filePath) {
    try {
        // Use ffprobe to get audio stream info
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

function getAllVideoFiles(dir) {
    const videoExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'];
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
                    if (videoExtensions.includes(ext)) {
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

async function main() {
    const prehistoricPlanetPath = 'S:/MEDIA/TV-SHOWS/Prehistoric Planet';
    
    console.log(`[AUDIO-SCAN] Scanning Prehistoric Planet folder: ${prehistoricPlanetPath}`);
    
    if (!fs.existsSync(prehistoricPlanetPath)) {
        console.error(`[ERROR] Path does not exist: ${prehistoricPlanetPath}`);
        return;
    }
    
    const videoFiles = getAllVideoFiles(prehistoricPlanetPath);
    console.log(`[AUDIO-SCAN] Found ${videoFiles.length} video files`);
    
    const results = [];
    let processed = 0;
    const animation = new ProgressAnimation('classic', 20);
    
    for (const file of videoFiles) {
        processed++;
        const progressLine = animation.getCustomProgress(processed, videoFiles.length, 'Processing', '[AUDIO-SCAN] ');
        console.log(`${progressLine} : ${file.name}`);
        const audioInfo = await checkAudioCodec(file.filePath);
        results.push({
            title: file.name,
            path: file.filePath,
            ...audioInfo
        });
    }
    
    // Filter only problematic files
    const problematicFiles = results.filter(file => file.hasIncompatibleCodec);
    
    const output = {
        timestamp: new Date().toISOString(),
        totalFiles: videoFiles.length,
        problematicFiles: problematicFiles,
        allFiles: results
    };
    
    const outputPath = path.join(__dirname, 'AUDIO/prehistoric_planet_audio_report.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`[AUDIO-SCAN] Scan complete. Results written to ${outputPath}`);
    console.log(`[AUDIO-SCAN] Found ${problematicFiles.length} files with incompatible audio codecs`);
    
    if (problematicFiles.length > 0) {
        console.log('\n[PROBLEMATIC FILES]:');
        problematicFiles.forEach(file => {
            console.log(`  - ${file.title}: ${file.incompatibleCodecs.join(', ')}`);
        });
    } else {
        console.log('\n✅ [AUDIO-SCAN] No problematic files found!');
    }
}

main().catch(console.error); 