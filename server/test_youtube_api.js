/*
  TEST_YOUTUBE_API.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

require('dotenv').config();
const { google } = require('googleapis');

console.log('🧪 [YOUTUBE-TEST] Testing YouTube API directly...');
console.log('');

// Initialize YouTube API
const youtube = google.youtube({
    version: 'v3',
    auth: process.env.GOOGLE_API_KEY
});

async function testYouTubeAPI() {
    try {
        console.log('🔍 Testing basic search...');
        
        const searchResponse = await youtube.search.list({
            part: ['snippet'],
            q: 'test',
            maxResults: 1,
            type: 'video'
        });

        if (searchResponse && searchResponse.data && searchResponse.data.items) {
            console.log('✅ YouTube API search successful!');
            console.log('Found', searchResponse.data.items.length, 'videos');
            console.log('First video title:', searchResponse.data.items[0].snippet.title);
        } else {
            console.log('❌ Search response is empty or malformed');
        }

    } catch (error) {
        console.log('❌ YouTube API test failed:');
        console.log('Error message:', error.message);
        console.log('Error code:', error.code);
        console.log('Error status:', error.status);
        
        if (error.errors) {
            console.log('API Errors:');
            error.errors.forEach((err, index) => {
                console.log(`  ${index + 1}. Domain: ${err.domain}, Reason: ${err.reason}, Message: ${err.message}`);
            });
        }
    }
}

testYouTubeAPI();
