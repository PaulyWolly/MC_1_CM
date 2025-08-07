/*
  YOUTUBESEARCH.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

// YouTube Search Query Schema - for saving user search queries and metadata
const youtubeSearchSchema = new mongoose.Schema({
    query: { type: String, required: true },
    userId: { type: String, required: true },
    displayName: String, // Cleaned display name (without "youtube search" prefix)
    totalPages: { type: mongoose.Schema.Types.Mixed, default: 1 }, // Allow both Number and String (e.g., "many")
    lastSearched: { type: Date, default: Date.now, required: true }, // Last time this query was searched/saved
    dateCreated: { type: Date, default: Date.now, required: true }, // When this search was first saved
    cacheKeys: [String], // Array of localStorage cache keys for this query
    videoCount: Number, // Number of videos found
    searchMetadata: {
        searchType: String, // 'search' or 'play'
        lastPageViewed: Number,
        totalResults: mongoose.Schema.Types.Mixed // Allow both Number and String (e.g., "many")
    }
}, {
    collection: 'youtube_searches'
});

// Add indexes for faster lookups
youtubeSearchSchema.index({ userId: 1, query: 1 });
youtubeSearchSchema.index({ userId: 1, lastSearched: -1 });

module.exports = mongoose.model('YouTubeSearch', youtubeSearchSchema); 