/*
  JOKE.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
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