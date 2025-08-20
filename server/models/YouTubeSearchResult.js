/*
  YOUTUBESEARCHRESULT.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    channelTitle: {
        type: String,
        required: true
    },
    publishedAt: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        default: ''
    },
    thumbnail: {
        type: String,
        required: true
    }
});

const YouTubeSearchResultSchema = new mongoose.Schema({
    query: {
        type: String,
        required: true
    },
    page: {
        type: Number,
        required: true,
        default: 1
    },
    videos: [VideoSchema],
    resultType: {
        type: String,
        enum: ['SINGLE', 'MULTI', 'CHANNEL'],
        default: 'MULTI'
    },
    nextPageToken: {
        type: String,
        default: null
    },
    totalResults: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    apiQuotaUsed: {
        type: Number,
        default: 101
    }
});

// Compound index for query + page combination
YouTubeSearchResultSchema.index({ query: 1, page: 1 }, { unique: true });

module.exports = mongoose.model('YouTubeSearchResult', YouTubeSearchResultSchema); 