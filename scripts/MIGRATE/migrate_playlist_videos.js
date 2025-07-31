/*
  MIGRATE_PLAYLIST_VIDEOS.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const Playlist = require('../../server/models/Playlist');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);

  const playlists = await Playlist.find({});
  let updatedCount = 0;

  for (const playlist of playlists) {
    let changed = false;
    for (const video of playlist.videos) {
      if (!video._id) {
        video._id = new ObjectId();
        changed = true;
      }
    }
    if (changed) {
      await playlist.save();
      updatedCount++;
      console.log(`Updated playlist: ${playlist.name} (${playlist._id})`);
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} playlists.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
