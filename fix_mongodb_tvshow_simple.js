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
    
    // Fix WatchLater collection - process one document at a time
    console.log('📺 Fixing WatchLater collection...');
    const watchLaterDocs = await WatchLater.find({
      $or: [
        { 'items.type': 'tv-show' },
        { 'items.mediaType': 'tv-show' }
      ]
    });
    
    console.log(`Found ${watchLaterDocs.length} WatchLater documents to update`);
    
    for (let i = 0; i < watchLaterDocs.length; i++) {
      const doc = watchLaterDocs[i];
      let updated = false;
      
      // Update items array
      if (doc.items && Array.isArray(doc.items)) {
        doc.items.forEach(item => {
          if (item.type === 'tv-show') {
            item.type = 'tvshow';
            updated = true;
          }
          if (item.mediaType === 'tv-show') {
            item.mediaType = 'tvshow';
            updated = true;
          }
        });
      }
      
      if (updated) {
        await doc.save();
        console.log(`✅ Updated WatchLater document ${i + 1}/${watchLaterDocs.length}`);
      }
    }
    
    // Fix Collection collection - process one document at a time
    console.log('📚 Fixing Collection collection...');
    const collectionDocs = await Collection.find({
      $or: [
        { 'items.type': 'tv-show' },
        { 'items.mediaType': 'tv-show' }
      ]
    });
    
    console.log(`Found ${collectionDocs.length} Collection documents to update`);
    
    for (let i = 0; i < collectionDocs.length; i++) {
      const doc = collectionDocs[i];
      let updated = false;
      
      // Update items array
      if (doc.items && Array.isArray(doc.items)) {
        doc.items.forEach(item => {
          if (item.type === 'tv-show') {
            item.type = 'tvshow';
            updated = true;
          }
          if (item.mediaType === 'tv-show') {
            item.mediaType = 'tvshow';
            updated = true;
          }
        });
      }
      
      if (updated) {
        await doc.save();
        console.log(`✅ Updated Collection document ${i + 1}/${collectionDocs.length}`);
      }
    }
    
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
