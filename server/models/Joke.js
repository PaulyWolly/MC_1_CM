/*
  JOKE.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

// Joke Schema - for storing user's custom jokes
const jokeSchema = new mongoose.Schema({
    title: String,
    content: String,
    userId: String,
    dateCreated: { type: Date, default: Date.now }
}, {
    collection: 'my_jokes'  // Specify collection name
});

// Add indexes for faster lookups
jokeSchema.index({ userId: 1, title: 1 });

module.exports = mongoose.model('Joke', jokeSchema); 