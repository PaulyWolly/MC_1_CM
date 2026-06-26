/*
  PLAYLIST.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  title: { type: String, required: true },
  thumbnail: { type: String, required: true },
  duration: { type: String, default: '' },
  channelTitle: { type: String, default: '' }
});

const PlaylistSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  displayKey: { type: String, index: true },
  videos: [VideoSchema],
  createdAt: { type: Date, default: Date.now }
});

PlaylistSchema.index({ userId: 1, displayKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Playlist', PlaylistSchema); 