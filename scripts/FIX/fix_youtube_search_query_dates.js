/*
  FIX_YOUTUBE_SEARCH_QUERY_DATES.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

// scripts/fix_youtube_search_query_dates.js
require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI; // Update to match your .env variable name
const dbName = 'Chat_Streaming_Image'; // Update as needed
const collectionName = 'youtube_searches'; // Update as needed

(async () => {
  console.log('🔄 [START] Fixing YouTube search query dates...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const col = db.collection(collectionName);

  const count = await col.countDocuments();
  console.log(`[DEBUG] Found ${count} documents in collection ${collectionName}`);

  const now = new Date().toISOString();
  const cursor = col.find({});
  let fixed = 0;
  let checked = 0;

  // Spinner animation
  const spinnerFrames = ['\\', '|', '/', '-'];
  let spinnerIndex = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r[WORKING] Checking queries ${spinnerFrames[spinnerIndex++ % spinnerFrames.length]}   `);
  }, 120);

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    let update = {};
    if (!doc.dateCreated || isNaN(new Date(doc.dateCreated))) {
      update.dateCreated = now;
    }
    if (!doc.lastSearched || isNaN(new Date(doc.lastSearched))) {
      update.lastSearched = now;
    }
    if (Object.keys(update).length) {
      await col.updateOne({ _id: doc._id }, { $set: update });
      fixed++;
    }
    checked++;
    if (checked % 50 === 0) {
      process.stdout.write(`\r[PROGRESS] Checked: ${checked}, Fixed: ${fixed}   `);
    }
  }

  clearInterval(interval);
  process.stdout.write('\n');
  console.log(`✅ [DONE] Checked ${checked} queries. Fixed ${fixed} with missing/invalid dates.`);
  await client.close();
})();
