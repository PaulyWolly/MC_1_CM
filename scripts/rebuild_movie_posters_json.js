/*
  REBUILD_MOVIE_POSTERS_JSON.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

// rebuild_movie_posters_json.js
// Scans S:/MEDIA/MOVIES and writes a new movie_posters.json mapping for all movies with a poster.jpg

const fs = require('fs');
const path = require('path');
const { normalizeKey } = require('../shared/NormalizationService');
// Use normalizeKey for all mapping key normalization in this file.

const MOVIES_DIR = 'S:/MEDIA/MOVIES';
const POSTERS_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');
const BACKUP_DIR = path.join(__dirname, '../backups/rebuild_posters');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function backupOldMapping() {
  if (fs.existsSync(POSTERS_JSON)) {
    ensureDirSync(BACKUP_DIR);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `movie_posters_${timestamp}.json`);
    fs.copyFileSync(POSTERS_JSON, backupFile);
    console.log(`💾 Backup created: ${backupFile}`);
  }
}

function rebuildMapping() {
  const mapping = {};
  const folders = fs.readdirSync(MOVIES_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory());
  let count = 0;
  for (const folder of folders) {
    const folderName = folder.name;
    const folderPath = path.join(MOVIES_DIR, folderName);
    const posterPath = path.join(folderPath, 'poster.jpg');
    if (fs.existsSync(posterPath)) {
      const dotKey = normalizeKey(folderName);
      const webPosterUrl = `/media/movies/${folderName}/poster.jpg`;
      mapping[dotKey] = webPosterUrl;
      count++;
      console.log(`✅ ${dotKey} → ${webPosterUrl}`);
    } else {
      console.log(`❌ No poster.jpg for: ${folderName}`);
    }
  }
  fs.writeFileSync(POSTERS_JSON, JSON.stringify(mapping, null, 2));
  console.log(`\n🎬 Rebuilt movie_posters.json with ${count} entries.`);
}

function main() {
  console.log('🔄 Rebuilding movie_posters.json from movie folders...');
  backupOldMapping();
  rebuildMapping();
  console.log('✅ Done!');
}

if (require.main === module) {
  main();
} 