/*
  MERGE-PLAYLIST-DUPLICATES.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/multichat';

const Playlist = require('../../server/models/Playlist');
const { getPlaylistVisibleNameKey } = require('../../utils/playlistNameNormalizer');

async function main() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Fetch all playlists
  const playlists = await Playlist.find({});
  console.log(`Found ${playlists.length} playlists`);

  // Group by display-normalized name (matches what user sees in UI)
  const groups = {};
  playlists.forEach(pl => {
    const norm = getPlaylistVisibleNameKey(pl.name);
    if (!norm) return;
    if (!groups[norm]) groups[norm] = [];
    groups[norm].push(pl);
  });

  let mergedCount = 0;
  for (const [normName, group] of Object.entries(groups)) {
    if (group.length < 2) continue;
    mergedCount++;
    // Keep playlist with most videos, then oldest
    group.sort((a, b) => {
      const countDiff = (b.videos?.length || 0) - (a.videos?.length || 0);
      if (countDiff !== 0) return countDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
    const keeper = group[0];
    const toMerge = group.slice(1);
    // Merge videos (by videoId)
    const allVideos = [...keeper.videos];
    toMerge.forEach(pl => allVideos.push(...pl.videos));
    // Remove duplicate videos by videoId
    const uniqueVideos = [];
    const seen = new Set();
    for (const v of allVideos) {
      if (!seen.has(v.videoId)) {
        uniqueVideos.push(v);
        seen.add(v.videoId);
      }
    }
    keeper.videos = uniqueVideos;
    await keeper.save();
    // Delete the merged playlists
    for (const pl of toMerge) {
      await Playlist.deleteOne({ _id: pl._id });
    }
    console.log(`Merged ${group.length} playlists named "${keeper.name}" into one. Kept ${uniqueVideos.length} unique videos.`);
  }

  console.log(`\nDone. Merged ${mergedCount} sets of duplicate playlists.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
}); 