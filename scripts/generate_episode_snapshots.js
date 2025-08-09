/*
  GENERATE_EPISODE_SNAPSHOTS.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const VIDEO_EXTS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
const SNAPSHOT_TIME = 5; // seconds

function isVideoFile(filename) {
  return VIDEO_EXTS.includes(path.extname(filename).toLowerCase());
}

function getShowNameFromPath(showPath) {
  // e.g., S:/MEDIA/TV-SHOWS/Another Life/Season 01/ => 'Another Life'
  const parts = showPath.split(path.sep).filter(Boolean);
  // Find the part after 'TV-SHOWS'
  const tvIdx = parts.findIndex(p => p.toLowerCase() === 'tv-shows');
  if (tvIdx >= 0 && parts.length > tvIdx + 1) {
    return parts[tvIdx + 1];
  }
  return parts[parts.length - 2] || 'Unknown Show';
}

function getSeasonCode(seasonFolder) {
  // e.g., 'Season 01' => 'S01'
  const match = seasonFolder.match(/season[ _-]?(\d+)/i);
  if (match) {
    return 'S' + match[1].padStart(2, '0');
  }
  return 'S00';
}

function getEpisodeCode(filename) {
  // Try to extract SxxExx or E## from filename
  const sxe = filename.match(/S(\d{2})E(\d{2})/i);
  if (sxe) return `S${sxe[1]}E${sxe[2]}`;
  const e = filename.match(/E(\d{2})/i);
  if (e) return `E${e[1]}`;
  return null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function processSeasonFolder(seasonPath, showName, seasonFolder) {
  const files = fs.readdirSync(seasonPath);
  const episodeImagesDir = path.join(seasonPath, 'Episode_images');
  ensureDir(episodeImagesDir);
  let count = 0;
  for (const file of files) {
    if (!isVideoFile(file)) continue;
    const episodeCode = getEpisodeCode(file) || '';
    if (!episodeCode) continue;
    const snapshotName = `${showName} - ${episodeCode}.png`;
    const snapshotPath = path.join(episodeImagesDir, snapshotName);
    const videoPath = path.join(seasonPath, file);
    if (fs.existsSync(snapshotPath)) {
      console.log(`[SKIP] Snapshot exists: ${snapshotPath}`);
      continue;
    }
    // ffmpeg command
    const ffmpegArgs = [
      '-ss', String(SNAPSHOT_TIME),
      '-i', videoPath,
      '-frames:v', '1',
      '-q:v', '2',
      '-y', snapshotPath
    ];
    console.log(`[FFMPEG] Creating snapshot for ${videoPath} -> ${snapshotPath}`);
    const result = spawnSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
    if (result.status === 0) {
      count++;
    } else {
      console.warn(`[ERROR] ffmpeg failed for: ${videoPath}`);
    }
  }
  return count;
}

function main() {
  console.log(`Scanning for TV show episodes in: ${MEDIA_ROOT}`);
  const shows = fs.readdirSync(MEDIA_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory());
  let total = 0;
  for (const showDir of shows) {
    const showPath = path.join(MEDIA_ROOT, showDir.name);
    const seasons = fs.readdirSync(showPath, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^season[ _-]?\d+$/i.test(d.name));
    for (const seasonDir of seasons) {
      const seasonPath = path.join(showPath, seasonDir.name);
      const showName = showDir.name;
      const count = processSeasonFolder(seasonPath, showName, seasonDir.name);
      total += count;
    }
  }
  console.log(`Done. Snapshots created: ${total}`);
}

if (require.main === module) {
  main();
} 