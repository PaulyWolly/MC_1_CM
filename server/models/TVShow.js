/*
  TVSHOW.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const EpisodeSchema = new mongoose.Schema({
  season: {
    type: Number,
    required: true
  },
  episode: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  files: [{
    path: String,
    absPath: String,
    quality: String,
    size: Number
  }]
});

const SeasonSchema = new mongoose.Schema({
  season: {
    type: Number,
    required: false,
    default: 1
  },
  episodes: [EpisodeSchema]
});

const TVShowSchema = new mongoose.Schema({
  // Core identification (from unified data)
  type: {
    type: String,
    default: 'tvshow',
    enum: ['tvshow', 'tv-show']  // Allow both for migration
  },
  TMDBTitle: {
    type: String,
    required: false
  },
  normalizedKey: {
    type: String,
    required: false,
    index: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  tmdbId: {
    type: Number,
    default: null,
    index: true
  },
  poster: {
    type: String,
    default: null
  },
  
  // About section (from unified data)
  about: {
    title: String,
    year: String,
    description: String
  },
  
  // Genres array (from unified data)
  genres: [String],
  
  // Cast array (from unified data)
  cast: [{
    name: String,
    character: String,
    profile: String
  }],
  
  // TV Show specific structure
  seasons: [SeasonSchema],
  
  // Additional metadata
  year: {
    type: Number,
    default: null
  },
  quality: {
    type: String,
    default: null
  },
  
  // Backup metadata
  backupMetadata: {
    type: {
      type: String,
      default: 'daily_backup'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      default: 'backup_system'
    }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
TVShowSchema.index({ title: 1, year: -1 });
TVShowSchema.index({ tmdbId: 1 });
TVShowSchema.index({ 'backupMetadata.timestamp': -1 });

// Pre-save middleware to update updatedAt
TVShowSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find or create TV show
TVShowSchema.statics.findOrCreate = async function(tvShowData) {
  let tvShow = await this.findOne({ 
    $or: [
      { tmdbId: tvShowData.tmdbId },
      { normalizedKey: tvShowData.normalizedKey },
      { title: tvShowData.title, year: tvShowData.year }
    ]
  });
  
  if (!tvShow) {
    tvShow = new this(tvShowData);
    await tvShow.save();
  } else {
    // Update existing TV show with new data
    Object.assign(tvShow, tvShowData);
    await tvShow.save();
  }
  
  return tvShow;
};

module.exports = mongoose.model('TVShow', TVShowSchema);
