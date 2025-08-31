/*
  YOUTUBEHISTORY.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
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