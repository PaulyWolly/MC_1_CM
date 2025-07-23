const fs = require('fs');
const path = require('path');

// Load environment variables from server/.env
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_POSTERS_NORMALIZED_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_posters_normalized.json');
const TV_EPISODE_IMAGES_NORMALIZED_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json');
const TV_SEASON_IMAGES_NORMALIZED_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json');
const { normalizeKey } = require('../shared/NormalizationService');

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

// Function to get season images by TMDB ID and season number
async function getSeasonImages(tmdbId, seasonNumber) {
    const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/images?api_key=${TMDB_API_KEY}`;
    
    try {
        const response = await fetch(seasonUrl);
        const data = await response.json();
        
        if (data.posters && data.posters.length > 0) {
            // Get the first poster (usually the best quality)
            const poster = data.posters[0];
            return {
                poster_path: poster.file_path,
                full_url: `https://image.tmdb.org/t/p/w500${poster.file_path}`,
                width: poster.width,
                height: poster.height,
                aspect_ratio: poster.aspect_ratio
            };
        } else {
            console.log(`No season ${seasonNumber} poster found`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching season ${seasonNumber} images:`, error);
        return null;
    }
}

// Function to get episode images by TMDB ID, season number, and episode number
async function getEpisodeImages(tmdbId, seasonNumber, episodeNumber) {
    const episodeUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}/images?api_key=${TMDB_API_KEY}`;
    
    try {
        const response = await fetch(episodeUrl);
        const data = await response.json();
        
        if (data.stills && data.stills.length > 0) {
            // Get the first still (usually the best quality)
            const still = data.stills[0];
            return {
                still_path: still.file_path,
                full_url: `https://image.tmdb.org/t/p/w500${still.file_path}`,
                width: still.width,
                height: still.height,
                aspect_ratio: still.aspect_ratio
            };
        } else {
            console.log(`No episode ${episodeNumber} still found`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching episode ${episodeNumber} images:`, error);
        return null;
    }
}

// Function to get season details (number of episodes)
async function getSeasonDetails(tmdbId, seasonNumber) {
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

// Function to load existing normalized season image data
function loadExistingSeasonImageData() {
    try {
        if (fs.existsSync(TV_SEASON_IMAGES_NORMALIZED_PATH)) {
            const data = fs.readFileSync(TV_SEASON_IMAGES_NORMALIZED_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading existing season image data:', error);
    }
    return {};
}

// Function to load existing normalized episode image data
function loadExistingEpisodeImageData() {
    try {
        if (fs.existsSync(TV_EPISODE_IMAGES_NORMALIZED_PATH)) {
            const data = fs.readFileSync(TV_EPISODE_IMAGES_NORMALIZED_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading existing episode image data:', error);
    }
    return {};
}

// Function to save season image data to normalized JSON
function saveSeasonImageData(seasonImageData) {
    try {
        // Ensure directory exists
        const dir = path.dirname(TV_SEASON_IMAGES_NORMALIZED_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(TV_SEASON_IMAGES_NORMALIZED_PATH, JSON.stringify(seasonImageData, null, 2));
        console.log(`Season image data saved to: ${TV_SEASON_IMAGES_NORMALIZED_PATH}`);
    } catch (error) {
        console.error('Error saving season image data:', error);
    }
}

// Function to save episode image data to normalized JSON
function saveEpisodeImageData(episodeImageData) {
    try {
        // Ensure directory exists
        const dir = path.dirname(TV_EPISODE_IMAGES_NORMALIZED_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(TV_EPISODE_IMAGES_NORMALIZED_PATH, JSON.stringify(episodeImageData, null, 2));
        console.log(`Episode image data saved to: ${TV_EPISODE_IMAGES_NORMALIZED_PATH}`);
    } catch (error) {
        console.error('Error saving episode image data:', error);
    }
}

// Main function
async function fetchTVShowImagesSingle() {
    // Get TV show title from command line argument
    const tvShowTitle = process.argv[2];
    
    if (!tvShowTitle) {
        console.error('Usage: node fetch_tv_show_images_single.js "TV Show Title"');
        console.error('Example: node fetch_tv_show_images_single.js "Breaking Bad"');
        process.exit(1);
    }
    
    if (!TMDB_API_KEY || TMDB_API_KEY === 'your_tmdb_api_key_here') {
        console.error('Please set your TMDB API key in the server/.env file');
        process.exit(1);
    }
    
    console.log(`\n📺 Fetching images for TV show: "${tvShowTitle}"`);
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
    console.log(`   Number of seasons: ${tvShow.number_of_seasons || 'Unknown'}`);
    
    // Step 2: Load existing data
    console.log('\n2. Loading existing data...');
    const existingSeasonImageData = loadExistingSeasonImageData();
    const existingEpisodeImageData = loadExistingEpisodeImageData();
    
    // Create normalized key
    const normalizedKey = normalizeKey(tvShowTitle);
    console.log(`   Normalized key: "${normalizedKey}"`);
    
    // Step 3: Fetch season posters
    console.log('\n3. Fetching season posters...');
    const seasonPosters = {};
    const maxSeasons = tvShow.number_of_seasons || 10; // Default to 10 if unknown
    
    for (let season = 1; season <= maxSeasons; season++) {
        console.log(`   Fetching Season ${season} poster...`);
        const seasonImage = await getSeasonImages(tvShow.id, season);
        
        if (seasonImage) {
            seasonPosters[season.toString()] = {
                poster: seasonImage.full_url
            };
            console.log(`   ✅ Season ${season} poster found`);
        } else {
            console.log(`   ⚠️  No poster found for Season ${season}`);
            break; // Stop if no poster found (likely end of seasons)
        }
        
        // Add a small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 4: Fetch episode images
    console.log('\n4. Fetching episode images...');
    const episodeImages = {};
    let totalEpisodes = 0;
    let episodesWithImages = 0;
    
    for (let season = 1; season <= maxSeasons; season++) {
        if (!seasonPosters[season.toString()]) {
            break; // Stop if no season poster found
        }
        
        console.log(`   Fetching Season ${season} episodes...`);
        const episodeList = await getSeasonDetails(tvShow.id, season);
        
        if (episodeList.length === 0) {
            console.log(`   ⚠️  No episodes found for Season ${season}`);
            break;
        }
        
        console.log(`   Found ${episodeList.length} episodes in Season ${season}`);
        
        episodeImages[season.toString()] = {
            episodes: {}
        };
        
        for (const episode of episodeList) {
            totalEpisodes++;
            console.log(`     Fetching S${season.toString().padStart(2, '0')}E${episode.episode_number.toString().padStart(2, '0')}...`);
            
            const episodeImage = await getEpisodeImages(tvShow.id, season, episode.episode_number);
            
            if (episodeImage) {
                episodeImages[season.toString()].episodes[episode.episode_number.toString()] = {
                    still: episodeImage.full_url
                };
                episodesWithImages++;
                console.log(`     ✅ Episode image found`);
            } else {
                episodeImages[season.toString()].episodes[episode.episode_number.toString()] = {
                    still: null
                };
                console.log(`     ⚠️  No image found`);
            }
            
            // Add a small delay to be respectful to the API
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    // Step 5: Update and save data
    console.log('\n5. Updating normalized data...');
    
    // Update season image data with nested structure
    existingSeasonImageData[normalizedKey] = {
        seasons: seasonPosters
    };
    saveSeasonImageData(existingSeasonImageData);
    
    // Update episode image data with nested structure
    existingEpisodeImageData[normalizedKey] = {
        seasons: episodeImages
    };
    saveEpisodeImageData(existingEpisodeImageData);
    
    // Step 6: Display results
    console.log('\n6. Results:');
    console.log(`   Seasons with posters: ${Object.keys(seasonPosters).length}`);
    console.log(`   Total episodes checked: ${totalEpisodes}`);
    console.log(`   Episodes with images: ${episodesWithImages}`);
    console.log(`   Normalized key: "${normalizedKey}"`);
    
    console.log('\n🎬 Season Posters Preview:');
    console.log('=' .repeat(40));
    Object.keys(seasonPosters).forEach(seasonKey => {
        const poster = seasonPosters[seasonKey];
        console.log(`Season ${seasonKey}: ${poster.poster ? '✅ Found' : '❌ Not found'}`);
    });
    
    console.log('\n📺 Episode Images Preview:');
    console.log('=' .repeat(40));
    Object.keys(episodeImages).forEach(seasonKey => {
        const season = episodeImages[seasonKey];
        const episodeCount = Object.keys(season.episodes).length;
        const episodesWithImages = Object.values(season.episodes).filter(ep => ep.still !== null).length;
        console.log(`Season ${seasonKey}: ${episodesWithImages}/${episodeCount} episodes with images`);
    });
    
    console.log('\n💾 Data Structure Preview:');
    console.log('=' .repeat(40));
    console.log(`Season JSON Key: "${normalizedKey}"`);
    console.log(`Episode JSON Key: "${normalizedKey}"`);
    console.log(`Sample Season: "1"`);
    console.log(`Sample Episode: "1"`);
    
    console.log('\n✅ Image data successfully saved to normalized JSON files!');
    console.log('   The UI will now display the updated season and episode images.');
    console.log(`   Season file: ${TV_SEASON_IMAGES_NORMALIZED_PATH}`);
    console.log(`   Episode file: ${TV_EPISODE_IMAGES_NORMALIZED_PATH}`);
}

// Run the script
if (require.main === module) {
    fetchTVShowImagesSingle().catch(error => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = {
    normalizeKey,
    searchTVShow,
    getSeasonImages,
    getEpisodeImages,
    getSeasonDetails,
    loadExistingSeasonImageData,
    loadExistingEpisodeImageData,
    saveSeasonImageData,
    saveEpisodeImageData
}; 