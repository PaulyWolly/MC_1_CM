/*
  YOUTUBEHISTORY.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const YoutubeHistorySchema = new mongoose.Schema({
    query: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isSaved: {
        type: Boolean,
        default: false
    }
});

// To ensure a query is unique per session and update timestamp on new search
YoutubeHistorySchema.index({ query: 1 }, { unique: true });

module.exports = mongoose.model('YoutubeHistory', YoutubeHistorySchema); 