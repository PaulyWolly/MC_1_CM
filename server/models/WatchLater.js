/*
  WATCHLATER.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const WatchLaterItemSchema = new mongoose.Schema({
    // Media identification
    mediaId: {
        type: String,
        required: true,
        index: true
    },
    mediaType: {
        type: String,
        enum: ['movie', 'tv-show'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    
    // File information
    filePath: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    absPath: {
        type: String,
        required: false
    },
    
    // Playback state
    currentTime: {
        type: Number,
        default: 0,
        min: 0
    },
    duration: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // TV Show specific fields
    season: {
        type: Number,
        default: null
    },
    episode: {
        type: Number,
        default: null
    },
    episodeTitle: {
        type: String,
        default: null
    },
    
    // Metadata
    posterPath: {
        type: String,
        default: null
    },
    year: {
        type: Number,
        default: null
    },
    quality: {
        type: String,
        default: null
    },
    
    // Timestamps
    addedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastWatched: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
WatchLaterItemSchema.index({ mediaType: 1, addedAt: -1 });
WatchLaterItemSchema.index({ mediaType: 1, lastWatched: -1 });

// Instance method to update last watched time
WatchLaterItemSchema.methods.updateLastWatched = function() {
    this.lastWatched = new Date();
    this.lastUpdated = new Date();
    return this.save();
};

// Instance method to update playback progress
WatchLaterItemSchema.methods.updateProgress = function(currentTime, duration) {
    this.currentTime = currentTime;
    this.duration = duration;
    this.lastUpdated = new Date();
    return this.save();
};

const WatchLaterSchema = new mongoose.Schema({
    // User identification (for future multi-user support)
    userId: {
        type: String,
        default: 'default',
        index: true
    },
    
    // Collection metadata
    name: {
        type: String,
        default: 'Watch Later'
    },
    description: {
        type: String,
        default: 'Personal watch later collection'
    },
    
    // Items in the collection
    items: [WatchLaterItemSchema],
    
    // Collection statistics
    itemCount: {
        type: Number,
        default: 0
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

// Pre-save middleware to update item count
WatchLaterSchema.pre('save', function(next) {
    this.itemCount = this.items.length;
    this.updatedAt = new Date();
    next();
});

// Static method to get or create default watch later collection
WatchLaterSchema.statics.getDefaultCollection = async function() {
    let collection = await this.findOne({ userId: 'default' });
    
    if (!collection) {
        collection = new this({
            userId: 'default',
            name: 'Watch Later',
            description: 'Personal watch later collection',
            items: []
        });
        await collection.save();
    }
    
    return collection;
};

// Static method to add item to watch later
WatchLaterSchema.statics.addItem = async function(itemData) {
    const collection = await this.getDefaultCollection();
    
    // Check if item already exists
    const existingItem = collection.items.find(item => 
        item.mediaId === itemData.mediaId && 
        item.mediaType === itemData.mediaType
    );
    
    if (existingItem) {
        // Update existing item
        Object.assign(existingItem, itemData);
        existingItem.lastUpdated = new Date();
    } else {
        // Add new item
        collection.items.push(itemData);
    }
    
    await collection.save();
    return collection;
};

// Static method to remove item from watch later
WatchLaterSchema.statics.removeItem = async function(mediaId, mediaType) {
    const collection = await this.getDefaultCollection();
    
    collection.items = collection.items.filter(item => 
        !(item.mediaId === mediaId && item.mediaType === mediaType)
    );
    
    await collection.save();
    return collection;
};

// Static method to get all items
WatchLaterSchema.statics.getAllItems = async function() {
    const collection = await this.getDefaultCollection();
    return collection.items;
};

// Static method to get items by type
WatchLaterSchema.statics.getItemsByType = async function(mediaType) {
    const collection = await this.getDefaultCollection();
    return collection.items.filter(item => item.mediaType === mediaType);
};

module.exports = mongoose.model('WatchLater', WatchLaterSchema); 