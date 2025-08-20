/*
  CONVERT_SRT_TO_VTT.JS
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

const subtitlesDir = path.join(__dirname, '../public/assets/subtitles');

function convertSrtToVtt(srtPath, vttPath) {
  const srtContent = fs.readFileSync(srtPath, 'utf8');
  // Add WEBVTT header and convert timestamps
  const vttContent =
    'WEBVTT\n\n' +
    srtContent
      .replace(/\r\n|\r|\n/g, '\n')
      .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  fs.writeFileSync(vttPath, vttContent, 'utf8');
}

fs.readdirSync(subtitlesDir).forEach(file => {
  if (file.endsWith('.srt')) {
    const srtPath = path.join(subtitlesDir, file);
    const vttPath = srtPath.replace(/\.srt$/i, '.vtt');
    if (fs.existsSync(vttPath)) {
      console.log(`Skipping (already exists): ${vttPath}`);
      return;
    }
    convertSrtToVtt(srtPath, vttPath);
    console.log(`Converted: ${file} -> ${path.basename(vttPath)}`);
    // Delete the original .srt file after successful conversion
    try {
      fs.unlinkSync(srtPath);
      console.log(`Deleted original .srt: ${file}`);
    } catch (err) {
      console.error(`Failed to delete .srt: ${file}`, err);
    }
  }
});

console.log('Done converting .srt to .vtt in', subtitlesDir); 