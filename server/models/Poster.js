/*
  POSTER.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const PosterSchema = new mongoose.Schema({
  mediaType: {
    type: String,
    enum: ['movie', 'tv', 'season', 'episode'],
    required: true
  },
  mediaId: {
    type: String, // Can be your internal ID or TMDb ID
    required: true
  },
  localPosters: [
    {
      path: { type: String, required: true }, // Local file path
      type: { type: String, enum: ['main', 'alternative'], default: 'main' },
      addedAt: { type: Date, default: Date.now },
      tmdbUrl: { type: String }, // Original TMDb URL
      tmdbMeta: { type: Object } // Any extra TMDb metadata
    }
  ],
  activePoster: { type: String }, // Path to the currently selected poster
  tmdbPosters: [
    {
      url: { type: String },
      type: { type: String },
      meta: { type: Object }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PosterSchema.index({ mediaType: 1, mediaId: 1 }, { unique: true });

module.exports = mongoose.model('Poster', PosterSchema); 