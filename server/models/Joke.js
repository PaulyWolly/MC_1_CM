/*
  JOKE.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
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