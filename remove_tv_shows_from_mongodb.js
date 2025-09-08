const fs = require('fs');
const path = require('path');

console.log('[REMOVE-TV-SHOWS-MONGODB] Removing TV shows from MongoDB...');

// Read MongoDB connection from server .env
const envPath = path.join(__dirname, 'server', '.env');
let mongoUri = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const mongoMatch = envContent.match(/MONGODB_URI=(.+)/);
  if (mongoMatch) {
    mongoUri = mongoMatch[1].trim();
    console.log('[REMOVE-TV-SHOWS-MONGODB] Found MongoDB URI in .env');
  }
}

if (!mongoUri) {
  console.log('[REMOVE-TV-SHOWS-MONGODB] ❌ No MongoDB URI found in server/.env');
  console.log('[REMOVE-TV-SHOWS-MONGODB] Please check your MongoDB connection string');
  process.exit(1);
}

// Import MongoDB client
const { MongoClient } = require('mongodb');

async function removeTVShowsFromMongoDB() {
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('[REMOVE-TV-SHOWS-MONGODB] Connected to MongoDB');
    
    const db = client.db();
    const collection = db.collection('mediaLibraryResumeList');
    
    // Find all TV show items
    const tvShowQuery = {
      $or: [
        { 'title': { $regex: /s\d+e\d+/i } }, // S01E01, S02E05, etc.
        { 'title': { $regex: /season\s*\d+/i } }, // Season 1, Season 2, etc.
        { 'path': { $regex: /season/i } }, // Path contains "season"
        { 'path': { $regex: /tv-shows/i } }, // Path contains "tv-shows"
        { 'type': 'tv-show' }, // Type is tv-show
        { 'mediaType': 'tv-show' } // MediaType is tv-show
      ]
    };
    
    // Find the TV shows first
    const tvShows = await collection.find(tvShowQuery).toArray();
    console.log('[REMOVE-TV-SHOWS-MONGODB] Found', tvShows.length, 'TV shows in MongoDB');
    
    if (tvShows.length > 0) {
      console.log('[REMOVE-TV-SHOWS-MONGODB] TV shows to remove:');
      tvShows.forEach((item, index) => {
        console.log('[REMOVE-TV-SHOWS-MONGODB]', index + 1 + ':', item.title);
      });
      
      // Remove the TV shows
      const result = await collection.deleteMany(tvShowQuery);
      console.log('[REMOVE-TV-SHOWS-MONGODB] ✅ Removed', result.deletedCount, 'TV shows from MongoDB');
    } else {
      console.log('[REMOVE-TV-SHOWS-MONGODB] No TV shows found in MongoDB');
    }
    
    // Count remaining items
    const remainingCount = await collection.countDocuments();
    console.log('[REMOVE-TV-SHOWS-MONGODB] Remaining items in MongoDB:', remainingCount);
    
  } catch (error) {
    console.error('[REMOVE-TV-SHOWS-MONGODB] Error:', error);
  } finally {
    await client.close();
    console.log('[REMOVE-TV-SHOWS-MONGODB] MongoDB connection closed');
  }
}

// Run the removal
removeTVShowsFromMongoDB().then(() => {
  console.log('[REMOVE-TV-SHOWS-MONGODB] ✅ COMPLETE: TV shows removed from MongoDB');
  console.log('[REMOVE-TV-SHOWS-MONGODB] Now refresh your browser - the TV shows should be gone!');
}).catch(error => {
  console.error('[REMOVE-TV-SHOWS-MONGODB] Failed:', error);
});
