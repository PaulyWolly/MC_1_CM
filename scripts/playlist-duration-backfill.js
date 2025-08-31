/*
  PLAYLIST-DURATION-BACKFILL.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

/**
 * Playlist Duration Backfill Script
 * 
 * This script will:
 * 1. Read localStorage cache data (you'll need to export it first)
 * 2. Connect to MongoDB and scan playlists for missing duration data
 * 3. Match video IDs with cached duration data
 * 4. Update MongoDB with found duration information
 * 
 * Usage: 
 * 1. First export your localStorage: exportLocalStorageCache()
 * 2. Then run: node scripts/playlist-duration-backfill.js
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables from server/.env
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

// Connect to MongoDB using same env var as server
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/multichat';

// Define Playlist schema (matching your existing model)
const playlistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    userId: { type: String, required: true },
    videos: [{
        videoId: { type: String, required: true },
        title: { type: String, required: true },
        thumbnail: { type: String, required: true },
        duration: { type: String, default: '' },
        channelTitle: { type: String, default: '' }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Playlist = mongoose.model('Playlist', playlistSchema);

async function main() {
    try {
        console.log('🔄 [BACKFILL] Starting playlist duration backfill...');
        
        // Connect to MongoDB
        console.log(`🔗 [BACKFILL] Connecting to MongoDB: ${mongoUri}`);
        await mongoose.connect(mongoUri);
        console.log('✅ [BACKFILL] Connected to MongoDB');
        
        // Check if cache file exists
        const cacheFilePath = path.join(__dirname, 'localStorage-cache.json');
        if (!fs.existsSync(cacheFilePath)) {
            console.log('❌ [BACKFILL] Cache file not found!');
            console.log('📋 [BACKFILL] Please run this in your browser console first:');
            console.log('');
            console.log('   exportLocalStorageCache()');
            console.log('');
            console.log('   This will create the localStorage-cache.json file needed for the backfill.');
            process.exit(1);
        }
        
        // Load cache data
        console.log('📂 [BACKFILL] Loading localStorage cache data...');
        const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
        
        // Build video cache from localStorage data
        const videoCache = new Map();
        let totalCacheEntries = 0;
        let totalVideos = 0;
        let videosWithDuration = 0;
        
        for (const [key, value] of Object.entries(cacheData)) {
            if (key.startsWith('yt_search_')) {
                try {
                    const parsedData = typeof value === 'string' ? JSON.parse(value) : value;
                    if (parsedData && parsedData.data && parsedData.data.videos) {
                        totalCacheEntries++;
                        parsedData.data.videos.forEach(video => {
                            totalVideos++;
                            if (video.id && video.duration) {
                                videosWithDuration++;
                                videoCache.set(video.id, {
                                    duration: video.duration,
                                    channelTitle: video.channelTitle || '',
                                    title: video.title || ''
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.warn(`⚠️ [BACKFILL] Failed to parse cache entry: ${key}`);
                }
            }
        }
        
        console.log(`💾 [BACKFILL] Cache analysis:`);
        console.log(`   - Cache entries: ${totalCacheEntries}`);
        console.log(`   - Total videos: ${totalVideos}`);
        console.log(`   - Videos with duration: ${videosWithDuration}`);
        console.log(`   - Unique videos in cache: ${videoCache.size}`);
        
        if (videoCache.size === 0) {
            console.log('❌ [BACKFILL] No video duration data found in cache!');
            process.exit(1);
        }
        
        // Get all playlists
        const playlists = await Playlist.find({});
        console.log(`📋 [BACKFILL] Found ${playlists.length} playlists to process`);
        
        let totalVideosProcessed = 0;
        let totalVideosUpdated = 0;
        let cacheHits = 0;
        let cacheMisses = 0;
        
        // Process each playlist
        for (const playlist of playlists) {
            if (!playlist.videos || playlist.videos.length === 0) continue;
            
            console.log(`\n📋 [BACKFILL] Processing playlist: "${playlist.name}" (${playlist.videos.length} videos)`);
            
            let playlistUpdated = false;
            
            for (let i = 0; i < playlist.videos.length; i++) {
                const video = playlist.videos[i];
                totalVideosProcessed++;
                
                // Skip if already has duration
                if (video.duration && video.duration !== '' && video.duration !== 'N/A') {
                    continue;
                }
                
                // Look up in cache
                const cachedVideo = videoCache.get(video.videoId);
                if (cachedVideo && cachedVideo.duration) {
                    cacheHits++;
                    
                    // Update the video in the playlist
                    playlist.videos[i].duration = cachedVideo.duration;
                    if (cachedVideo.channelTitle && !playlist.videos[i].channelTitle) {
                        playlist.videos[i].channelTitle = cachedVideo.channelTitle;
                    }
                    
                    playlistUpdated = true;
                    totalVideosUpdated++;
                    
                    console.log(`   ✅ Updated: ${video.title} -> ${cachedVideo.duration}`);
                } else {
                    cacheMisses++;
                    console.log(`   ❌ No cache: ${video.title} (${video.videoId})`);
                }
            }
            
            // Save playlist if any videos were updated
            if (playlistUpdated) {
                playlist.updatedAt = new Date();
                await playlist.save();
                console.log(`   💾 Saved playlist: "${playlist.name}"`);
            }
        }
        
        console.log(`\n🎯 [BACKFILL] Backfill complete!`);
        console.log(`   - Videos processed: ${totalVideosProcessed}`);
        console.log(`   - Videos updated: ${totalVideosUpdated}`);
        console.log(`   - Cache hits: ${cacheHits}`);
        console.log(`   - Cache misses: ${cacheMisses}`);
        console.log(`   - Success rate: ${totalVideosProcessed > 0 ? ((cacheHits/totalVideosProcessed)*100).toFixed(1) : 0}%`);
        console.log(`✅ [BACKFILL] NO YouTube API calls were made - completely safe!`);
        
    } catch (error) {
        console.error('❌ [BACKFILL] Error:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 [BACKFILL] Disconnected from MongoDB');
    }
}

// Run the script
main().catch(console.error); 