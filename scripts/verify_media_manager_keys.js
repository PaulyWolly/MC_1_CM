/*
  VERIFY_MEDIA_MANAGER_KEYS.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const MOVIE_CAST_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast.json');
const MOVIE_DESC_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_descriptions.json');

function analyzeKeys() {
    console.log('🔍 [VERIFY] Analyzing MediaManager key usage...\n');
    
    // Check movie_cast.json
    if (fs.existsSync(MOVIE_CAST_JSON)) {
        const castData = JSON.parse(fs.readFileSync(MOVIE_CAST_JSON, 'utf8'));
        const castKeys = Object.keys(castData);
        
        console.log(`📊 [CAST] Total keys: ${castKeys.length}`);
        
        // Check for potential duplicate keys (same movie, different paths)
        const movieTitles = new Map();
        const duplicates = [];
        
        castKeys.forEach(key => {
            const movie = castData[key];
            const title = movie.title || 'Unknown';
            const year = movie.year || 'Unknown';
            const titleKey = `${title} (${year})`;
            
            if (movieTitles.has(titleKey)) {
                duplicates.push({
                    title: titleKey,
                    key1: movieTitles.get(titleKey),
                    key2: key
                });
            } else {
                movieTitles.set(titleKey, key);
            }
        });
        
        if (duplicates.length > 0) {
            console.log(`⚠️ [CAST] Found ${duplicates.length} potential duplicate movies:`);
            duplicates.forEach(dup => {
                console.log(`   - ${dup.title}`);
                console.log(`     Key 1: ${dup.key1}`);
                console.log(`     Key 2: ${dup.key2}`);
            });
        } else {
            console.log(`✅ [CAST] No duplicate keys found - using single key per movie`);
        }
        
        // Show sample keys
        console.log(`\n📋 [CAST] Sample keys (first 3):`);
        castKeys.slice(0, 3).forEach(key => {
            console.log(`   - ${key}`);
        });
    } else {
        console.log(`❌ [CAST] movie_cast.json not found`);
    }
    
    // Check movie_descriptions.json
    if (fs.existsSync(MOVIE_DESC_JSON)) {
        const descData = JSON.parse(fs.readFileSync(MOVIE_DESC_JSON, 'utf8'));
        const descKeys = Object.keys(descData);
        
        console.log(`\n📊 [DESC] Total keys: ${descKeys.length}`);
        
        // Show sample keys
        console.log(`📋 [DESC] Sample keys (first 3):`);
        descKeys.slice(0, 3).forEach(key => {
            console.log(`   - ${key}`);
        });
    } else {
        console.log(`❌ [DESC] movie_descriptions.json not found`);
    }
    
    console.log(`\n🎯 [VERIFY] Analysis complete!`);
    console.log(`💡 [VERIFY] MediaManager should only use full file paths as keys`);
    console.log(`💡 [VERIFY] Example: "S:\\MEDIA\\MOVIES\\Movie Name (2023) [1080p]\\Movie.Name.(2023).[1080p].mp4"`);
}

// Run the analysis
analyzeKeys(); 