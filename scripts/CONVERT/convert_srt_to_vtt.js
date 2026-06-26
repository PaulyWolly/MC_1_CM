/*
  CONVERT_SRT_TO_VTT.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
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
    // SAFETY: Never auto-delete source files - manual cleanup only
    // try {
    //   fs.unlinkSync(srtPath);
    //   console.log(`Deleted original .srt: ${file}`);
    // } catch (err) {
    //   console.error(`Failed to delete .srt: ${file}`, err);
    // }
    console.log(`⚠️ SAFETY: Original .srt preserved: ${file}`);
  }
});

console.log('Done converting .srt to .vtt in', subtitlesDir); 