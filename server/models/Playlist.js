/*
  PLAYLIST.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
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
  videos: [VideoSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Playlist', PlaylistSchema); 