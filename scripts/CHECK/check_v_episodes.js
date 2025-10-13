/*
  CHECK_V_EPISODES.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Load environment variables from server/.env
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Function to get season details with episode information
async function getSeasonDetailsWithEpisodes(tmdbId, seasonNumber) {
    const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    
    try {
        const response = await fetch(seasonUrl);
        const data = await response.json();
        
        if (data.episodes) {
            return data.episodes;
        } else {
            return [];
        }
    } catch (error) {
        console.error(`Error fetching season ${seasonNumber} details:`, error);
        return [];
    }
}

// Main function
async function checkVEpisodes() {
    const tmdbId = 21494; // V (2009) TMDB ID
    
    console.log(`\n🔍 Checking episodes for "V (2009)" (TMDB ID: ${tmdbId})`);
    console.log('=' .repeat(60));
    
    for (let season = 1; season <= 2; season++) {
        console.log(`\n📺 Season ${season}:`);
        console.log('-' .repeat(30));
        
        const episodes = await getSeasonDetailsWithEpisodes(tmdbId, season);
        
        if (episodes.length === 0) {
            console.log(`   No episodes found for Season ${season}`);
            continue;
        }
        
        console.log(`   Total episodes: ${episodes.length}`);
        console.log(`   Episode list:`);
        
        episodes.forEach((episode, index) => {
            console.log(`     ${index + 1}. Episode ${episode.episode_number}: "${episode.name}"`);
        });
        
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// Run the script
if (require.main === module) {
    checkVEpisodes().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
} 