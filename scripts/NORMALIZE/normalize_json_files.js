/*
  NORMALIZE_JSON_FILES.JS
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

// Paths to the JSON files
const castFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast.json');
const descFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_descriptions.json');
const posterFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized.json');

// Backup and normalized file paths
const castBackup = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast_BACKUP.json');
const descBackup = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_descriptions_BACKUP.json');
const posterBackup = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_posters_normalized_BACKUP.json');

const castNormalized = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast_normalized.json');
const descNormalized = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_descriptions_normalized.json');

function normalizeKey(filePath) {
    // Extract folder name from full file path
    // Example: S:\MEDIA\MOVIES\About Time (2013) [1080p]\About.Time.(2013).[1080p].mp4
    // Should become: About.Time.(2013).[1080p]
    
    const folderName = path.basename(path.dirname(filePath));
    return folderName.replace(/\s+/g, '.').replace(/\.+/g, '.');
}

try {
    console.log('Starting JSON normalization...');
    console.log('================================');
    
    // 1. Create backups
    console.log('1. Creating backups...');
    if (fs.existsSync(castFile)) {
        fs.copyFileSync(castFile, castBackup);
        console.log('  ✓ Cast file backed up');
    }
    if (fs.existsSync(descFile)) {
        fs.copyFileSync(descFile, descBackup);
        console.log('  ✓ Description file backed up');
    }
    if (fs.existsSync(posterFile)) {
        fs.copyFileSync(posterFile, posterBackup);
        console.log('  ✓ Poster file backed up');
    }
    
    // 2. Normalize cast file
    console.log('\n2. Normalizing cast file...');
    if (fs.existsSync(castFile)) {
        const castData = JSON.parse(fs.readFileSync(castFile, 'utf8'));
        const normalizedCast = {};
        
        Object.keys(castData).forEach(oldKey => {
            const newKey = normalizeKey(oldKey);
            normalizedCast[newKey] = castData[oldKey];
        });
        
        fs.writeFileSync(castNormalized, JSON.stringify(normalizedCast, null, 2));
        console.log(`  ✓ Cast file normalized: ${Object.keys(castData).length} -> ${Object.keys(normalizedCast).length} entries`);
    }
    
    // 3. Normalize description file
    console.log('\n3. Normalizing description file...');
    if (fs.existsSync(descFile)) {
        const descData = JSON.parse(fs.readFileSync(descFile, 'utf8'));
        const normalizedDesc = {};
        
        Object.keys(descData).forEach(oldKey => {
            const newKey = normalizeKey(oldKey);
            normalizedDesc[newKey] = descData[oldKey];
        });
        
        fs.writeFileSync(descNormalized, JSON.stringify(normalizedDesc, null, 2));
        console.log(`  ✓ Description file normalized: ${Object.keys(descData).length} -> ${Object.keys(normalizedDesc).length} entries`);
    }
    
    // 4. Show sample comparisons
    console.log('\n4. Sample key comparisons:');
    console.log('  Original cast key: S:\\MEDIA\\MOVIES\\About Time (2013) [1080p]\\About.Time.(2013).[1080p].mp4');
    console.log('  Normalized key: About.Time.(2013).[1080p]');
    
    console.log('\n================================');
    console.log('Normalization complete!');
    console.log('\nNext steps:');
    console.log('1. Update the backend to use the new normalized files');
    console.log('2. Test the scan to ensure it works correctly');
    console.log('3. Replace the old files with normalized versions if everything works');
    
} catch (err) {
    console.error('Error during normalization:', err.message);
} 