/*
  REFRESH-YOUTUBE-CACHE.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../server/.env') });

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('💡 Make sure your .env file contains MONGODB_URI=your_atlas_connection_string');
    process.exit(1);
}

/**
 * Clear YouTube cache and refresh from database
 */
async function refreshYouTubeCache() {
    try {
        console.log('🔄 Starting YouTube cache refresh...');
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
        
        // Display the queries that will be available
        console.log('\n📋 Clean queries from database:');
        queries.slice(0, 10).forEach((query, index) => {
            const timestamp = new Date(query.timestamp).toLocaleDateString();
            const saved = query.isSaved ? '💾' : '  ';
            console.log(`${index + 1}. ${saved} "${query.query}" (${timestamp})`);
        });
        
        if (queries.length > 10) {
            console.log(`... and ${queries.length - 10} more queries`);
        }
        
        console.log('\n🎉 Database refresh completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('1. Open your browser and go to localhost:4800');
        console.log('2. Open Developer Tools (F12)');
        console.log('3. Go to Application/Storage > Local Storage');
        console.log('4. Clear all "yt_" entries (or clear all localStorage)');
        console.log('5. Refresh the page - the app will pull fresh data from the clean database');
        console.log('6. Test the YouTube search dropdown - should show clean query names');
        
    } catch (error) {
        console.error('❌ Cache refresh failed:', error);
        throw error;
    } finally {
        // Close MongoDB connection
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}

// Alternative: Generate a browser script to clear cache
function generateBrowserScript() {
    console.log('\n🌐 Browser Console Script:');
    console.log('═'.repeat(50));
    console.log('// Copy and paste this into your browser console to clear YouTube cache:');
    console.log('');
    console.log('// Clear all YouTube cache entries');
    console.log('Object.keys(localStorage)');
    console.log('  .filter(key => key.startsWith("yt_"))');
    console.log('  .forEach(key => {');
    console.log('    console.log("Removing:", key);');
    console.log('    localStorage.removeItem(key);');
    console.log('  });');
    console.log('');
    console.log('// Also clear saved queries cache');
    console.log('localStorage.removeItem("youtubeSavedQueries");');
    console.log('');
    console.log('console.log("✅ YouTube cache cleared! Refresh the page.");');
    console.log('═'.repeat(50));
}

// Main execution
async function main() {
    try {
        console.log('🚀 YouTube Cache Refresh Tool');
        console.log('================================\n');
        
        // Show database queries
        await refreshYouTubeCache();
        
        // Generate browser script for manual cache clearing
        generateBrowserScript();
        
    } catch (error) {
        console.error('💥 Cache refresh failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    refreshYouTubeCache,
    generateBrowserScript
}; 