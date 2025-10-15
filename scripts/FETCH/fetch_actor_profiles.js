/*
  FETCH_ACTOR_PROFILES.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const TMDB_API_KEY = '7558c4ca11c4063f2e2bdcb44eac41d0';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

async function searchActor(name) {
    try {
        const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            const actor = data.results[0];
            return {
                id: actor.id,
                name: actor.name,
                profile_path: actor.profile_path
            };
        }
        return null;
    } catch (error) {
        console.error(`Error searching for actor ${name}:`, error.message);
        return null;
    }
}

async function updateCastData() {
    try {
        const castFile = path.join(__dirname, '../public/components/MediaLibrary/data/movies/movie_cast_normalized.json');
        const castData = JSON.parse(await fs.readFile(castFile, 'utf8'));
        
        console.log('🔍 Scanning all movies for missing cast profiles...');
        
        let totalFixed = 0;
        let totalChecked = 0;
        
        // Go through each movie
        for (const [movieKey, movieData] of Object.entries(castData)) {
            if (!movieData.cast || !Array.isArray(movieData.cast)) continue;
            
            console.log(`\n🎬 Checking movie: ${movieData.title || movieKey}`);
            
            // Check each cast member
            for (let i = 0; i < movieData.cast.length; i++) {
                const castMember = movieData.cast[i];
                totalChecked++;
                
                // Skip if already has a profile image
                if (castMember.profile && castMember.profile !== null && castMember.profile !== 'null') {
                    continue;
                }
                
                console.log(`  👤 Missing profile for: ${castMember.name}`);
                
                // Search for actor on TMDB
                const actor = await searchActor(castMember.name);
                
                if (actor && actor.profile_path) {
                    const profileUrl = `https://image.tmdb.org/t/p/w185${actor.profile_path}`;
                    castData[movieKey].cast[i].profile = profileUrl;
                    totalFixed++;
                    
                    console.log(`    ✅ Found and updated: ${actor.name} (ID: ${actor.id})`);
                    console.log(`       Profile: ${profileUrl}`);
                } else {
                    console.log(`    ❌ Not found on TMDB: ${castMember.name}`);
                }
                
                // Rate limit to avoid hitting TMDB too fast
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // Save the updated data
        await fs.writeFile(castFile, JSON.stringify(castData, null, 2));
        
        console.log(`\n✅ Cast profile update complete!`);
        console.log(`📊 Summary: Checked ${totalChecked} cast members, fixed ${totalFixed} missing profiles`);
        
    } catch (error) {
        console.error('Error updating cast data:', error.message);
        throw error;
    }
}

// Run the script
updateCastData().then(() => {
    console.log('\n🎉 All done!');
}).catch(console.error); 