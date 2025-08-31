/*
  FETCH_TV_SHOW_DESCRIPTION_SINGLE.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Load environment variables from server/.env
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_DESCRIPTIONS_NORMALIZED_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_descriptions_normalized.json');
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

// Function to get TV show details by TMDB ID
async function getTVShowDetails(tmdbId) {
    const detailsUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    
    try {
        const response = await fetch(detailsUrl);
        const data = await response.json();
        
        if (data.overview) {
            console.log(`Found description for TMDB ID ${tmdbId}`);
            return data.overview;
        } else {
            console.log(`No description found for TMDB ID ${tmdbId}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching TV show details:', error);
        return null;
    }
}

// Function to load existing normalized description data
function loadExistingDescriptionData() {
    try {
        if (fs.existsSync(TV_DESCRIPTIONS_NORMALIZED_PATH)) {
            const data = fs.readFileSync(TV_DESCRIPTIONS_NORMALIZED_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading existing description data:', error);
    }
    return {};
}

// Function to save description data to normalized JSON
function saveDescriptionData(descriptionData) {
    try {
        // Ensure directory exists
        const dir = path.dirname(TV_DESCRIPTIONS_NORMALIZED_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(TV_DESCRIPTIONS_NORMALIZED_PATH, JSON.stringify(descriptionData, null, 2));
        console.log(`Description data saved to: ${TV_DESCRIPTIONS_NORMALIZED_PATH}`);
    } catch (error) {
        console.error('Error saving description data:', error);
    }
}

// Main function
async function fetchTVShowDescriptionSingle() {
    // Get TV show title from command line argument
    const tvShowTitle = process.argv[2];
    
    if (!tvShowTitle) {
        console.error('Usage: node fetch_tv_show_description_single.js "TV Show Title"');
        console.error('Example: node fetch_tv_show_description_single.js "Breaking Bad"');
        process.exit(1);
    }
    
    if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key_here') {
        console.error('Please set your TMDB API key in the server/.env file');
        process.exit(1);
    }
    
    console.log(`\n📺 Fetching description for TV show: "${tvShowTitle}"`);
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
    
    // Step 2: Get detailed description
    console.log('\n2. Fetching detailed description...');
    const description = await getTVShowDetails(tvShow.id);
    
    if (!description) {
        console.error('❌ No description found for this TV show.');
        process.exit(1);
    }
    
    // Step 3: Load existing data and update
    console.log('\n3. Updating normalized description data...');
    const existingData = loadExistingDescriptionData();
    
    // Create normalized key
    const normalizedKey = normalizeKey(tvShowTitle);
    console.log(`   Normalized key: "${normalizedKey}"`);
    
    // Update the data
    existingData[normalizedKey] = description;
    
    // Step 4: Save to file
    saveDescriptionData(existingData);
    
    // Step 5: Display results
    console.log('\n4. Results:');
    console.log(`   Description length: ${description.length} characters`);
    console.log(`   Normalized key: "${normalizedKey}"`);
    
    console.log('\n📝 Description Preview:');
    console.log('=' .repeat(50));
    console.log(description.substring(0, 300) + (description.length > 300 ? '...' : ''));
    
    console.log('\n💾 Data Structure Preview:');
    console.log('=' .repeat(40));
    console.log(`JSON Key: "${normalizedKey}"`);
    console.log(`Data Type: String (${description.length} characters)`);
    console.log(`Sample Content: "${description.substring(0, 100)}..."`);
    
    console.log('\n✅ Description data successfully saved to normalized JSON file!');
    console.log('   The UI will now display the updated description.');
    console.log(`   File location: ${TV_DESCRIPTIONS_NORMALIZED_PATH}`);
}

// Run the script
if (require.main === module) {
    fetchTVShowDescriptionSingle().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    normalizeKey,
    searchTVShow,
    getTVShowDetails,
    loadExistingDescriptionData,
    saveDescriptionData
}; 