const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const SHOW_NAME = 'Superman & Lois';
const BASE_INPUT_PATH = 'S:/MEDIA/TV-SHOWS/Superman & Lois';

// Function to get season folder name with leading zero
function getSeasonFolderName(seasonNumber) {
    return `Season ${seasonNumber.toString().padStart(2, '0')}`;
}

// Function to get all MP4 files in a directory recursively
function getMP4Files(directory) {
    const files = [];
    
    function scanDir(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (stat.isFile() && path.extname(item).toLowerCase() === '.mp4') {
                files.push(fullPath);
            }
        }
    }
    
    scanDir(directory);
    return files;
}

// Function to get detailed file information using ffprobe
async function getFileInfo(filePath) {
    try {
        const command = `ffprobe -v quiet -print_format json -show_streams -show_format "${filePath}"`;
        const { stdout } = await execAsync(command);
        const data = JSON.parse(stdout);
        
        return {
            format: data.format,
            streams: data.streams
        };
    } catch (error) {
        console.error(`Error analyzing ${path.basename(filePath)}:`, error.message);
        return null;
    }
}

// Function to analyze a season
async function analyzeSeason(seasonNumber) {
    console.log(`\n🎬 Analyzing Season ${seasonNumber}`);
    console.log('=' .repeat(50));
    
    const seasonFolderName = getSeasonFolderName(seasonNumber);
    const seasonPath = path.join(BASE_INPUT_PATH, seasonFolderName);
    
    if (!fs.existsSync(seasonPath)) {
        console.log(`❌ Season ${seasonNumber} directory not found: ${seasonPath}`);
        return null;
    }
    
    const mp4Files = getMP4Files(seasonPath);
    console.log(`📁 Found ${mp4Files.length} MP4 files`);
    
    if (mp4Files.length === 0) {
        console.log(`⚠️  No MP4 files found in Season ${seasonNumber}`);
        return null;
    }
    
    // Analyze first file in detail, then summarize others
    const firstFile = mp4Files[0];
    const firstFileInfo = await getFileInfo(firstFile);
    
    if (!firstFileInfo) {
        console.log(`❌ Could not analyze first file in Season ${seasonNumber}`);
        return null;
    }
    
    const { format, streams } = firstFileInfo;
    
    // Video streams
    const videoStreams = streams.filter(s => s.codec_type === 'video');
    const videoInfo = videoStreams[0] || {};
    
    // Audio streams
    const audioStreams = streams.filter(s => s.codec_type === 'audio');
    const audioInfo = audioStreams[0] || {};
    
    console.log(`📁 Sample file: ${path.basename(firstFile)}`);
    console.log(`📏 File size: ${(format.size / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`⏱️  Duration: ${format.duration} seconds`);
    console.log(`🎬 Video: ${videoInfo.codec_name} (${videoInfo.codec_long_name})`);
    console.log(`   Resolution: ${videoInfo.width}x${videoInfo.height}`);
    console.log(`   Bitrate: ${videoInfo.bit_rate ? (videoInfo.bit_rate / 1000).toFixed(0) + ' kbps' : 'Unknown'}`);
    console.log(`🔊 Audio: ${audioInfo.codec_name} (${audioInfo.codec_long_name})`);
    console.log(`   Channels: ${audioInfo.channels || 'Unknown'}`);
    console.log(`   Sample Rate: ${audioInfo.sample_rate || 'Unknown'} Hz`);
    console.log(`   Bitrate: ${audioInfo.bit_rate ? (audioInfo.bit_rate / 1000).toFixed(0) + ' kbps' : 'Unknown'}`);
    console.log(`   Language: ${audioInfo.tags?.language || 'Unknown'}`);
    
    // Check for differences in other files
    let differentAudioCodecs = new Set();
    let differentVideoCodecs = new Set();
    let differentChannels = new Set();
    let differentResolutions = new Set();
    
    for (const file of mp4Files) {
        const fileInfo = await getFileInfo(file);
        if (fileInfo) {
            const videoStream = fileInfo.streams.find(s => s.codec_type === 'video');
            const audioStream = fileInfo.streams.find(s => s.codec_type === 'audio');
            
            if (videoStream) {
                differentVideoCodecs.add(videoStream.codec_name);
                differentResolutions.add(`${videoStream.width}x${videoStream.height}`);
            }
            if (audioStream) {
                differentAudioCodecs.add(audioStream.codec_name);
                differentChannels.add(audioStream.channels);
            }
        }
    }
    
    console.log(`\n📊 Season ${seasonNumber} Summary:`);
    console.log(`   Video codecs found: ${Array.from(differentVideoCodecs).join(', ')}`);
    console.log(`   Audio codecs found: ${Array.from(differentAudioCodecs).join(', ')}`);
    console.log(`   Audio channels found: ${Array.from(differentChannels).join(', ')}`);
    console.log(`   Resolutions found: ${Array.from(differentResolutions).join(', ')}`);
    
    return {
        seasonNumber,
        fileCount: mp4Files.length,
        sampleFile: path.basename(firstFile),
        videoCodec: videoInfo.codec_name,
        audioCodec: audioInfo.codec_name,
        audioChannels: audioInfo.channels,
        resolution: `${videoInfo.width}x${videoInfo.height}`,
        differentVideoCodecs: Array.from(differentVideoCodecs),
        differentAudioCodecs: Array.from(differentAudioCodecs),
        differentChannels: Array.from(differentChannels),
        differentResolutions: Array.from(differentResolutions)
    };
}

// Main function
async function compareSeasons() {
    console.log(`🔍 Comparing Seasons for "${SHOW_NAME}"`);
    console.log('=' .repeat(60));
    console.log(`Path: ${BASE_INPUT_PATH}`);
    
    const seasons = [];
    
    // Analyze all 4 seasons
    for (let season = 1; season <= 4; season++) {
        const seasonInfo = await analyzeSeason(season);
        if (seasonInfo) {
            seasons.push(seasonInfo);
        }
    }
    
    // Compare results
    console.log('\n🔍 SEASON COMPARISON');
    console.log('=' .repeat(60));
    
    if (seasons.length === 0) {
        console.log('❌ No seasons found to compare');
        return;
    }
    
    // Find differences
    const allVideoCodecs = new Set();
    const allAudioCodecs = new Set();
    const allChannels = new Set();
    const allResolutions = new Set();
    
    seasons.forEach(season => {
        allVideoCodecs.add(season.videoCodec);
        allAudioCodecs.add(season.audioCodec);
        allChannels.add(season.audioChannels);
        allResolutions.add(season.resolution);
    });
    
    console.log(`\n📊 Overall Summary:`);
    console.log(`   Video codecs across all seasons: ${Array.from(allVideoCodecs).join(', ')}`);
    console.log(`   Audio codecs across all seasons: ${Array.from(allAudioCodecs).join(', ')}`);
    console.log(`   Audio channels across all seasons: ${Array.from(allChannels).join(', ')}`);
    console.log(`   Resolutions across all seasons: ${Array.from(allResolutions).join(', ')}`);
    
    // Identify what's different about Season 4
    const season4 = seasons.find(s => s.seasonNumber === 4);
    const workingSeasons = seasons.filter(s => s.seasonNumber !== 4);
    
    if (season4 && workingSeasons.length > 0) {
        console.log(`\n🔍 WHAT'S DIFFERENT ABOUT SEASON 4:`);
        console.log('=' .repeat(50));
        
        const workingSeason = workingSeasons[0]; // Use first working season as reference
        
        if (season4.videoCodec !== workingSeason.videoCodec) {
            console.log(`❌ Video Codec: Season 4 uses ${season4.videoCodec}, others use ${workingSeason.videoCodec}`);
        }
        
        if (season4.audioCodec !== workingSeason.audioCodec) {
            console.log(`❌ Audio Codec: Season 4 uses ${season4.audioCodec}, others use ${workingSeason.audioCodec}`);
        }
        
        if (season4.audioChannels !== workingSeason.audioChannels) {
            console.log(`❌ Audio Channels: Season 4 has ${season4.audioChannels} channels, others have ${workingSeason.audioChannels}`);
        }
        
        if (season4.resolution !== workingSeason.resolution) {
            console.log(`❌ Resolution: Season 4 is ${season4.resolution}, others are ${workingSeason.resolution}`);
        }
        
        // Check if Season 4 has any unique properties
        const season4Unique = [];
        if (season4.differentVideoCodecs.length > 1) {
            season4Unique.push(`Multiple video codecs: ${season4.differentVideoCodecs.join(', ')}`);
        }
        if (season4.differentAudioCodecs.length > 1) {
            season4Unique.push(`Multiple audio codecs: ${season4.differentAudioCodecs.join(', ')}`);
        }
        if (season4.differentChannels.length > 1) {
            season4Unique.push(`Mixed audio channels: ${season4.differentChannels.join(', ')}`);
        }
        
        if (season4Unique.length > 0) {
            console.log(`⚠️  Season 4 has inconsistencies: ${season4Unique.join(', ')}`);
        }
        
        // If no obvious differences, check for file corruption or metadata issues
        if (season4.videoCodec === workingSeason.videoCodec && 
            season4.audioCodec === workingSeason.audioCodec &&
            season4.audioChannels === workingSeason.audioChannels) {
            console.log(`\n🤔 No obvious technical differences found.`);
            console.log(`Possible issues:`);
            console.log(`1. File corruption in Season 4 files`);
            console.log(`2. Metadata issues affecting playback`);
            console.log(`3. Browser-specific compatibility issues`);
            console.log(`4. File naming or path issues`);
        }
    }
    
    console.log(`\n💡 RECOMMENDATIONS:`);
    if (season4 && workingSeasons.length > 0) {
        const workingSeason = workingSeasons[0];
        if (season4.videoCodec !== workingSeason.videoCodec) {
            console.log(`1. Convert Season 4 video from ${season4.videoCodec} to ${workingSeason.videoCodec}`);
        }
        if (season4.audioChannels !== workingSeason.audioChannels) {
            console.log(`2. Convert Season 4 audio from ${season4.audioChannels} to ${workingSeason.audioChannels} channels`);
        }
    }
    console.log(`3. Test Season 4 files in different browsers`);
    console.log(`4. Check if Season 4 files play in other video players`);
}

// Run the script
if (require.main === module) {
    compareSeasons().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    compareSeasons,
    analyzeSeason,
    getFileInfo
}; 