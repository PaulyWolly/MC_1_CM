/*
  PERSONALINFO.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

// Personal Info Schema - for storing conversation history and user data
const personalInfoSchema = new mongoose.Schema({
    userId: String,
    sessionId: String,
    sessionType: String,
    sessionVersion: String,
    type: String,
    value: String,
    timestamp: { type: Date, default: Date.now },
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now }
}, {
    collection: 'conversation_history',
    strict: false  // Allow flexibility with existing data
});

// Add indexes for faster lookups
personalInfoSchema.index({ sessionId: 1, type: 1 });

module.exports = mongoose.model('PersonalInfo', personalInfoSchema); 