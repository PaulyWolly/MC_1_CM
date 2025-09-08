const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testFFmpeg() {
    try {
        console.log('Testing FFmpeg conversion...');
        
        const inputPath = 'S:/MEDIA/TV-SHOWS/The Boys (2019)/Season 02/The Boys (2019) - S02E01 - The Big Ride.mp4';
        const outputPath = 'test_output.mkv';
        
        const command = `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -y "${outputPath}"`;
        console.log('Command:', command);
        
        const { stdout, stderr } = await execAsync(command);
        
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
        
        // Check if output file was created
        const fs = require('fs');
        if (fs.existsSync(outputPath)) {
            console.log('✅ Output file created successfully');
            
            // Check audio streams in output
            const checkCommand = `ffprobe -v quiet -select_streams a -show_entries stream=codec_name,codec_long_name -of csv=p=0 "${outputPath}"`;
            const { stdout: audioInfo } = await execAsync(checkCommand);
            console.log('Audio info:', audioInfo);
        } else {
            console.log('❌ Output file was not created');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFFmpeg();
