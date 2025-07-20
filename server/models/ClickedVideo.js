/*
  CLICKEDVIDEO.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const ClickedVideoSchema = new mongoose.Schema({
    // Video information
    videoId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    thumbnail: {
        type: String,
        default: ''
    },
    channelTitle: {
        type: String,
        default: ''
    },
    publishedAt: {
        type: String,
        default: ''
    },
    duration: {
        type: String,
        default: ''
    },
    
    // Query context
    query: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        default: 'default-user'
    },
    
    // Tracking information
    clickedAt: {
        type: Date,
        default: Date.now
    },
    clickCount: {
        type: Number,
        default: 1
    }
});

// Compound index for efficient queries
ClickedVideoSchema.index({ query: 1, videoId: 1 }, { unique: true });
ClickedVideoSchema.index({ userId: 1, clickedAt: -1 });

module.exports = mongoose.model('ClickedVideo', ClickedVideoSchema); 