/*
  COLLECTION.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const CollectionItemSchema = new mongoose.Schema({
  path: { type: String, required: true },
  title: { type: String, required: true },
  mediaType: { type: String, required: true, enum: ['movie', 'tv-show', 'episode'] },
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
