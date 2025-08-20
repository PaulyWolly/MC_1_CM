/*
  DEBUG_JOSHUA_DATA.JS
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
  Created by Paul Welby
*/

#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const YouTubeSearch = require('./models/YouTubeSearch');

async function checkAPI() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        const collection = mongoose.connection.db.collection('youtube_searches');
        const joshuaDocs = await collection.find({ query: 'joshua.weissman' }).toArray();
        
        console.log('🔍 Found Joshua Weissman documents:', joshuaDocs.length);
        joshuaDocs.forEach((doc, i) => {
            console.log(`Document ${i + 1}:`);
            console.log(`  Query: ${doc.query}`);
            console.log(`  DisplayName: ${doc.displayName}`);
            console.log(`  CacheKeys: ${doc.cacheKeys ? doc.cacheKeys.length : 0}`);
            console.log(`  CacheKeys array:`, doc.cacheKeys);
            console.log(`  TotalPages: ${doc.totalPages}`);
            console.log(`  VideoCount: ${doc.videoCount}`);
            console.log('');
        });
        
        // Test the API endpoint logic
        const allQueries = await collection.find({}).sort({ lastSearched: -1 });
        console.log('📊 Total documents in database:', allQueries.length);
        
        const joshuaInAll = allQueries.find(q => q.query === 'joshua.weissman');
        console.log('🔍 Joshua in allQueries:', joshuaInAll ? 'FOUND' : 'NOT FOUND');
        if (joshuaInAll) {
            console.log('  CacheKeys count:', joshuaInAll.cacheKeys ? joshuaInAll.cacheKeys.length : 0);
        }
        
        // Test the exact API response format
        const apiResponse = allQueries.map(item => ({
            query: item.query,
            displayName: item.displayName,
            searchType: item.searchMetadata ? item.searchMetadata.searchType : 'search',
            timestamp: item.lastSearched || item.dateCreated,
            totalPages: item.totalPages,
            videoCount: item.videoCount,
            cacheKeys: item.cacheKeys || []
        }));
        
        const joshuaInAPI = apiResponse.find(q => q.query === 'joshua.weissman');
        console.log('🔍 Joshua in API response:', joshuaInAPI ? 'FOUND' : 'NOT FOUND');
        if (joshuaInAPI) {
            console.log('  API Response for Joshua:');
            console.log('    Query:', joshuaInAPI.query);
            console.log('    DisplayName:', joshuaInAPI.displayName);
            console.log('    CacheKeys count:', joshuaInAPI.cacheKeys.length);
            console.log('    TotalPages:', joshuaInAPI.totalPages);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkAPI();
