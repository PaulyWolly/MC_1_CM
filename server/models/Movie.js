/*
  MOVIE.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const MovieSchema = new mongoose.Schema({
  // Core identification (from unified data)
  type: {
    type: String,
    default: 'movie',
    enum: ['movie']
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
  
  // Files array (from unified data)
  files: [{
    path: String,
    absPath: String,
    quality: String,
    size: Number
  }],
  
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
MovieSchema.index({ title: 1, year: -1 });
MovieSchema.index({ tmdbId: 1 });
MovieSchema.index({ 'backupMetadata.timestamp': -1 });

// Pre-save middleware to update updatedAt
MovieSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find or create movie
MovieSchema.statics.findOrCreate = async function(movieData) {
  let movie = await this.findOne({ 
    $or: [
      { tmdbId: movieData.tmdbId },
      { normalizedKey: movieData.normalizedKey },
      { title: movieData.title, year: movieData.year }
    ]
  });
  
  if (!movie) {
    movie = new this(movieData);
    await movie.save();
  } else {
    // Update existing movie with new data
    Object.assign(movie, movieData);
    await movie.save();
  }
  
  return movie;
};

module.exports = mongoose.model('Movie', MovieSchema);
