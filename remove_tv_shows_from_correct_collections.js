const fs = require('fs');
const path = require('path');

console.log('[REMOVE-TV-SHOWS-CORRECT] Removing TV shows from correct MongoDB collections...');

// Read MongoDB connection from server .env
const envPath = path.join(__dirname, 'server', '.env');
let mongoUri = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const mongoMatch = envContent.match(/MONGODB_URI=(.+)/);
  if (mongoMatch) {
    mongoUri = mongoMatch[1].trim();
    console.log('[REMOVE-TV-SHOWS-CORRECT] Found MongoDB URI in .env');
  }
}

if (!mongoUri) {
  console.log('[REMOVE-TV-SHOWS-CORRECT] ❌ No MongoDB URI found in server/.env');
  process.exit(1);
}

// Import MongoDB client
const { MongoClient } = require('mongodb');

async function removeTVShowsFromCorrectCollections() {
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('[REMOVE-TV-SHOWS-CORRECT] Connected to MongoDB');
    
    const db = client.db();
    
    // TV show detection query
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
    
    // Collections to check for TV shows
    const collectionsToCheck = ['watchlaters', 'clickedvideos', 'my_jokes', 'my_jokes_bkup_12-11-24'];
    
    let totalRemoved = 0;
    
    for (const collectionName of collectionsToCheck) {
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();
      
      if (count > 0) {
        console.log(`[REMOVE-TV-SHOWS-CORRECT] Checking collection '${collectionName}' (${count} documents)`);
        
        // Find TV shows in this collection
        const tvShows = await collection.find(tvShowQuery).toArray();
        
        if (tvShows.length > 0) {
          console.log(`[REMOVE-TV-SHOWS-CORRECT] Found ${tvShows.length} TV shows in '${collectionName}':`);
          tvShows.forEach((item, index) => {
            console.log(`[REMOVE-TV-SHOWS-CORRECT] ${index + 1}: ${item.title}`);
          });
          
          // Remove TV shows from this collection
          const result = await collection.deleteMany(tvShowQuery);
          console.log(`[REMOVE-TV-SHOWS-CORRECT] ✅ Removed ${result.deletedCount} TV shows from '${collectionName}'`);
          totalRemoved += result.deletedCount;
        } else {
          console.log(`[REMOVE-TV-SHOWS-CORRECT] No TV shows found in '${collectionName}'`);
        }
      }
    }
    
    console.log(`[REMOVE-TV-SHOWS-CORRECT] ✅ TOTAL: Removed ${totalRemoved} TV shows from all collections`);
    
  } catch (error) {
    console.error('[REMOVE-TV-SHOWS-CORRECT] Error:', error);
  } finally {
    await client.close();
    console.log('[REMOVE-TV-SHOWS-CORRECT] MongoDB connection closed');
  }
}

// Run the removal
removeTVShowsFromCorrectCollections().then(() => {
  console.log('[REMOVE-TV-SHOWS-CORRECT] ✅ COMPLETE: TV shows removed from MongoDB');
  console.log('[REMOVE-TV-SHOWS-CORRECT] Now refresh your browser - the TV shows should be gone!');
}).catch(error => {
  console.error('[REMOVE-TV-SHOWS-CORRECT] Failed:', error);
});
