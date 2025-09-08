/*
  COLLECTION.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const CollectionItemSchema = new mongoose.Schema({
  path: { type: String, required: true },
  title: { type: String, required: true },
  mediaType: { type: String, required: true, enum: ['movie', 'tvshow', 'tv-show', 'episode'] },  // Temporarily allow both for migration
  addedAt: { type: Date, default: Date.now }
});

const CollectionSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  items: [CollectionItemSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
CollectionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Collection', CollectionSchema);
