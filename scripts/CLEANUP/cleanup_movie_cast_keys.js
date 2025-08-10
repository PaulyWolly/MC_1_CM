/*
  CLEANUP_MOVIE_CAST_KEYS.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const MOVIE_CAST_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast.json');
const MOVIE_DESC_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_descriptions.json');

function cleanupKeys() {
    console.log('🧹 [CLEANUP] Cleaning up MediaManager keys...\n');
    
    // Clean movie_cast.json
    if (fs.existsSync(MOVIE_CAST_JSON)) {
        const castData = JSON.parse(fs.readFileSync(MOVIE_CAST_JSON, 'utf8'));
        const castKeys = Object.keys(castData);
        
        console.log(`📊 [CAST] Before cleanup: ${castKeys.length} keys`);
        
        const cleanedCastData = {};
        const removedKeys = [];
        
        castKeys.forEach(key => {
            // Keep only keys that are full file paths (contain backslashes and end with .mp4/.mkv/etc)
            if (key.includes('\\') && /\.(mp4|mkv|avi|mov|wmv)$/i.test(key)) {
                cleanedCastData[key] = castData[key];
            } else {
                removedKeys.push(key);
            }
        });
        
        console.log(`📊 [CAST] After cleanup: ${Object.keys(cleanedCastData).length} keys`);
        console.log(`🗑️ [CAST] Removed ${removedKeys.length} old keys:`);
        removedKeys.forEach(key => {
            console.log(`   - ${key}`);
        });
        
        // Save cleaned data
        fs.writeFileSync(MOVIE_CAST_JSON, JSON.stringify(cleanedCastData, null, 2));
        console.log(`✅ [CAST] Cleaned data saved`);
    }
    
    // Clean movie_descriptions.json
    if (fs.existsSync(MOVIE_DESC_JSON)) {
        const descData = JSON.parse(fs.readFileSync(MOVIE_DESC_JSON, 'utf8'));
        const descKeys = Object.keys(descData);
        
        console.log(`\n📊 [DESC] Before cleanup: ${descKeys.length} keys`);
        
        const cleanedDescData = {};
        const removedDescKeys = [];
        
        descKeys.forEach(key => {
            // Keep only keys that are full file paths (contain backslashes and end with .mp4/.mkv/etc)
            if (key.includes('\\') && /\.(mp4|mkv|avi|mov|wmv)$/i.test(key)) {
                cleanedDescData[key] = descData[key];
            } else {
                removedDescKeys.push(key);
            }
        });
        
        console.log(`📊 [DESC] After cleanup: ${Object.keys(cleanedDescData).length} keys`);
        console.log(`🗑️ [DESC] Removed ${removedDescKeys.length} old keys:`);
        removedDescKeys.forEach(key => {
            console.log(`   - ${key}`);
        });
        
        // Save cleaned data
        fs.writeFileSync(MOVIE_DESC_JSON, JSON.stringify(cleanedDescData, null, 2));
        console.log(`✅ [DESC] Cleaned data saved`);
    }
    
    console.log(`\n🎯 [CLEANUP] Cleanup complete!`);
    console.log(`💡 [CLEANUP] Now using only full file paths as keys`);
    console.log(`💡 [CLEANUP] MediaManager will maintain this standard going forward`);
}

// Run the cleanup
cleanupKeys(); 