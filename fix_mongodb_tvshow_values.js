const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import models
const WatchLater = require('./server/models/WatchLater');
const Collection = require('./server/models/Collection');

async function fixTvShowValues() {
  try {
    console.log('🔧 Starting MongoDB data migration...');
    
    // Fix WatchLater collection
    console.log('📺 Fixing WatchLater collection...');
    const watchLaterResult = await WatchLater.updateMany(
      { 
        $or: [
          { 'items.type': 'tv-show' },
          { 'items.mediaType': 'tv-show' }
        ]
      },
      [
        {
          $set: {
            'items': {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $mergeObjects: [
                    '$$item',
                    {
                      type: {
                        $cond: {
                          if: { $eq: ['$$item.type', 'tv-show'] },
                          then: 'tvshow',
                          else: '$$item.type'
                        }
                      },
                      mediaType: {
                        $cond: {
                          if: { $eq: ['$$item.mediaType', 'tv-show'] },
                          then: 'tvshow',
                          else: '$$item.mediaType'
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      ]
    );
    
    console.log(`✅ WatchLater: Updated ${watchLaterResult.modifiedCount} documents`);
    
    // Fix Collection collection
    console.log('📚 Fixing Collection collection...');
    const collectionResult = await Collection.updateMany(
      { 
        $or: [
          { 'items.type': 'tv-show' },
          { 'items.mediaType': 'tv-show' }
        ]
      },
      [
        {
          $set: {
            'items': {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $mergeObjects: [
                    '$$item',
                    {
                      type: {
                        $cond: {
                          if: { $eq: ['$$item.type', 'tv-show'] },
                          then: 'tvshow',
                          else: '$$item.type'
                        }
                      },
                      mediaType: {
                        $cond: {
                          if: { $eq: ['$$item.mediaType', 'tv-show'] },
                          then: 'tvshow',
                          else: '$$item.mediaType'
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      ]
    );
    
    console.log(`✅ Collection: Updated ${collectionResult.modifiedCount} documents`);
    
    // Verify the changes
    console.log('🔍 Verifying changes...');
    const remainingTvShow = await WatchLater.countDocuments({
      $or: [
        { 'items.type': 'tv-show' },
        { 'items.mediaType': 'tv-show' }
      ]
    });
    
    const remainingTvShowCollection = await Collection.countDocuments({
      $or: [
        { 'items.type': 'tv-show' },
        { 'items.mediaType': 'tv-show' }
      ]
    });
    
    console.log(`📊 Remaining 'tv-show' values:`);
    console.log(`   - WatchLater: ${remainingTvShow}`);
    console.log(`   - Collection: ${remainingTvShowCollection}`);
    
    if (remainingTvShow === 0 && remainingTvShowCollection === 0) {
      console.log('🎉 SUCCESS: All MongoDB data has been migrated to use "tvshow"!');
    } else {
      console.log('⚠️  WARNING: Some documents still contain "tv-show" values');
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
fixTvShowValues();
