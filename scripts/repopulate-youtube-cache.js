/*
  REPOPULATE-YOUTUBE-CACHE.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../server/.env') });

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // YouTube API uses Google API key
const SERVER_PORT = process.env.PORT || 4800;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('💡 Make sure your .env file contains MONGODB_URI=your_atlas_connection_string');
    process.exit(1);
}

if (!GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY not found in environment variables');
    console.log('💡 Make sure your .env file contains GOOGLE_API_KEY=your_api_key');
    process.exit(1);
}

/**
 * Repopulate YouTube cache by making API calls for database queries
 */
async function repopulateYouTubeCache(maxQueries = 10) {
    try {
        console.log('🔄 Starting YouTube cache repopulation...');
        console.log('📡 Connecting to MongoDB:', MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
        
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Get all clean YouTube queries from database
        const collection = mongoose.connection.collection('youtube_searches');
        const queries = await collection.find({}).sort({ timestamp: -1 }).toArray();
        console.log(`📊 Found ${queries.length} clean YouTube queries in database`);
        
        if (queries.length === 0) {
            console.log('ℹ️ No queries found in database');
            return;
        }
        
        // Limit queries to process
        const queriesToProcess = queries.slice(0, maxQueries);
        console.log(`🎯 Processing first ${queriesToProcess.length} queries...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const [index, queryObj] of queriesToProcess.entries()) {
            try {
                console.log(`\n🔍 Processing ${index + 1}/${queriesToProcess.length}: "${queryObj.query}"`);
                
                // Make YouTube API call
                const response = await fetch(`http://localhost:${SERVER_PORT}/api/youtube/search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query: queryObj.query,
                        maxResults: 10,
                        pageToken: null
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.success && data.videos && data.videos.length > 0) {
                    console.log(`✅ Successfully cached ${data.videos.length} videos for "${queryObj.query}"`);
                    successCount++;
                } else {
                    console.log(`⚠️ No videos returned for "${queryObj.query}"`);
                    errorCount++;
                }
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Error processing "${queryObj.query}":`, error.message);
                errorCount++;
            }
        }
        
        console.log('\n📊 Repopulation Summary:');
        console.log(`✅ Successful: ${successCount} queries`);
        console.log(`❌ Errors: ${errorCount} queries`);
        console.log(`📈 Success rate: ${Math.round((successCount / queriesToProcess.length) * 100)}%`);
        
        if (successCount > 0) {
            console.log('\n🎉 Cache repopulation completed successfully!');
            console.log('\n💡 Next steps:');
            console.log('1. Open your browser and go to localhost:5300');
            console.log('2. Open the YouTube search dropdown');
            console.log('3. Queries should now show page counts instead of "DB"');
        }
        
    } catch (error) {
        console.error('❌ Cache repopulation failed:', error);
        throw error;
    } finally {
        // Close MongoDB connection
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}

// Generate browser console script for manual repopulation
function generateBrowserScript() {
    console.log('\n🌐 Browser Console Alternative:');
    console.log('═'.repeat(50));
    console.log('// Copy and paste this into your browser console to repopulate cache:');
    console.log('');
    console.log('// Repopulate cache for first 10 database queries');
    console.log('window.repopulateYouTubeCache(10);');
    console.log('');
    console.log('// Or repopulate cache for first 5 queries (faster)');
    console.log('window.repopulateYouTubeCache(5);');
    console.log('');
    console.log('// Or repopulate cache for all database queries (may take a while)');
    console.log('window.repopulateYouTubeCache(50);');
    console.log('═'.repeat(50));
}

// Main execution
async function main() {
    try {
        console.log('🚀 YouTube Cache Repopulation Tool');
        console.log('==================================\n');
        
        // Get command line arguments
        const args = process.argv.slice(2);
        const maxQueries = args[0] ? parseInt(args[0]) : 10;
        
        if (isNaN(maxQueries) || maxQueries < 1) {
            console.error('❌ Invalid maxQueries argument. Please provide a positive number.');
            console.log('💡 Usage: node repopulate-youtube-cache.js [maxQueries]');
            console.log('💡 Example: node repopulate-youtube-cache.js 5');
            process.exit(1);
        }
        
        console.log(`🎯 Will process up to ${maxQueries} queries`);
        console.log('⚠️ Make sure your server is running on port', SERVER_PORT);
        console.log('⚠️ This will use YouTube API quota!\n');
        
        // Repopulate cache
        await repopulateYouTubeCache(maxQueries);
        
        // Generate browser script alternative
        generateBrowserScript();
        
    } catch (error) {
        console.error('💥 Cache repopulation failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    repopulateYouTubeCache,
    generateBrowserScript
}; 