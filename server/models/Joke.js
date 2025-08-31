/*
  JOKE.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
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