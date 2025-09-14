/*
  FETCH_TV_SHOW_CAST_SINGLE.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Load environment variables from server/.env
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_CAST_NORMALIZED_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json');
const { normalizeKey } = require('../../shared/NormalizationService');

// Function to search for TV show by title
async function searchTVShow(title) {
    const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=en-US&page=1`;
    
    try {
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            console.log(`Found ${data.results.length} results for "${title}"`);
            return data.results[0]; // Return the first (most relevant) result
        } else {
            console.log(`No results found for "${title}"`);
            return null;
        }
    } catch (error) {
        console.error('Error searching for TV show:', error);
        return null;
    }
}

// Function to fetch cast for a TV show by TMDB ID
async function fetchTVShowCast(tmdbId) {
    const castUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${TMDB_API_KEY}&language=en-US`;
    
    try {
        const response = await fetch(castUrl);
        const data = await response.json();
        
        if (data.cast && Array.isArray(data.cast)) {
            console.log(`Found ${data.cast.length} cast members for TMDB ID ${tmdbId}`);
            
            // Process cast members to include profile image URLs
            const processedCast = data.cast.map(actor => ({
                id: actor.id,
                name: actor.name,
                character: actor.character,
                profile: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null,
                order: actor.order
            }));
            
            return processedCast;
        } else {
            console.log(`No cast found for TMDB ID ${tmdbId}`);
            return [];
        }
    } catch (error) {
        console.error('Error fetching cast:', error);
        return [];
    }
}

// Function to load existing normalized cast data
function loadExistingCastData() {
    try {
        if (fs.existsSync(TV_CAST_NORMALIZED_PATH)) {
            const data = fs.readFileSync(TV_CAST_NORMALIZED_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading existing cast data:', error);
    }
    return {};
}

// Function to save cast data to normalized JSON
function saveCastData(castData) {
    try {
        // Ensure directory exists
        const dir = path.dirname(TV_CAST_NORMALIZED_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(TV_CAST_NORMALIZED_PATH, JSON.stringify(castData, null, 2));
        console.log(`Cast data saved to: ${TV_CAST_NORMALIZED_PATH}`);
    } catch (error) {
        console.error('Error saving cast data:', error);
    }
}

// Main function
async function fetchTVShowCastSingle() {
    // Get TV show title from command line argument
    const tvShowTitle = process.argv[2];
    
    if (!tvShowTitle) {
        console.error('Usage: node fetch_tv_show_cast_single.js "TV Show Title"');
        console.error('Example: node fetch_tv_show_cast_single.js "Breaking Bad"');
        process.exit(1);
    }
    
    if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key_here') {
        console.error('Please set your TMDB API key in the script');
        process.exit(1);
    }
    
    console.log(`\n🎬 Fetching cast for TV show: "${tvShowTitle}"`);
    console.log('=' .repeat(50));
    
    // Step 1: Search for the TV show
    console.log('\n1. Searching for TV show...');
    const tvShow = await searchTVShow(tvShowTitle);
    
    if (!tvShow) {
        console.error('❌ TV show not found. Please check the title and try again.');
        process.exit(1);
    }
    
    console.log(`✅ Found: "${tvShow.name}" (${tvShow.first_air_date?.split('-')[0] || 'Unknown year'})`);
    console.log(`   TMDB ID: ${tvShow.id}`);
    console.log(`   Overview: ${tvShow.overview?.substring(0, 100)}...`);
    
    // Step 2: Fetch cast members
    console.log('\n2. Fetching cast members...');
    const cast = await fetchTVShowCast(tvShow.id);
    
    if (cast.length === 0) {
        console.error('❌ No cast members found for this TV show.');
        process.exit(1);
    }
    
    // Step 3: Load existing data and update
    console.log('\n3. Updating normalized cast data...');
    const existingData = loadExistingCastData();
    
    // Create normalized key
    const normalizedKey = normalizeKey(tvShowTitle);
    console.log(`   Normalized key: "${normalizedKey}"`);
    
    // Update the data
    existingData[normalizedKey] = cast;
    
    // Step 4: Save to file
    saveCastData(existingData);
    
    // Step 5: Display results
    console.log('\n4. Results:');
    console.log(`   Total cast members: ${cast.length}`);
    console.log(`   Cast members with images: ${cast.filter(actor => actor.profile).length}`);
    console.log(`   Cast members without images: ${cast.filter(actor => !actor.profile).length}`);
    
    console.log('\n📋 Top 10 cast members:');
    cast.slice(0, 10).forEach((actor, index) => {
        const imageStatus = actor.profile ? '🖼️' : '❌';
        console.log(`   ${index + 1}. ${imageStatus} ${actor.name} as ${actor.character || 'Unknown'}`);
    });
    
    if (cast.length > 10) {
        console.log(`   ... and ${cast.length - 10} more cast members`);
    }
    
    console.log('\n🔍 Detailed Cast Data (First 5 members):');
    console.log('=' .repeat(80));
    cast.slice(0, 5).forEach((actor, index) => {
        console.log(`\n${index + 1}. ${actor.name}`);
        console.log(`   Character: ${actor.character || 'Unknown'}`);
        console.log(`   TMDB ID: ${actor.id}`);
        console.log(`   Profile Image: ${actor.profile ? '✅ Available' : '❌ Not available'}`);
        if (actor.profile) {
            console.log(`   Image URL: ${actor.profile}`);
        }
        console.log(`   Order: ${actor.order}`);
    });
    
    console.log('\n📊 Cast Data Summary:');
    console.log('=' .repeat(40));
    console.log(`Normalized Key: "${normalizedKey}"`);
    console.log(`Total Cast Members: ${cast.length}`);
    console.log(`With Images: ${cast.filter(actor => actor.profile).length}`);
    console.log(`Without Images: ${cast.filter(actor => !actor.profile).length}`);
    console.log(`Main Characters (order <= 5): ${cast.filter(actor => actor.order <= 5).length}`);
    console.log(`Supporting Characters (order > 5): ${cast.filter(actor => actor.order > 5).length}`);
    
    console.log('\n💾 Data Structure Preview:');
    console.log('=' .repeat(40));
    console.log(`JSON Key: "${normalizedKey}"`);
    console.log(`Data Type: Array with ${cast.length} objects`);
    console.log(`Sample Object Structure:`);
    if (cast.length > 0) {
        const sample = cast[0];
        console.log(`  {
    "id": ${sample.id},
    "name": "${sample.name}",
    "character": "${sample.character || 'Unknown'}",
    "profile": "${sample.profile || 'null'}",
    "order": ${sample.order}
  }`);
    }
    
    console.log('\n✅ Cast data successfully saved to normalized JSON file!');
    console.log('   The UI will now display the updated cast information.');
    console.log(`   File location: ${TV_CAST_NORMALIZED_PATH}`);
}

// Run the script
if (require.main === module) {
    fetchTVShowCastSingle().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    normalizeKey,
    searchTVShow,
    fetchTVShowCast,
    loadExistingCastData,
    saveCastData
}; 