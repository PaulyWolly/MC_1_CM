/*
  PLAYLISTS.ROUTES.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

const express = require('express');
const Playlist = require('../models/Playlist');
const mongoose = require('mongoose');
const { getPlaylistVisibleName, getPlaylistVisibleNameKey } = require('../../utils/playlistNameNormalizer');

const router = express.Router();

function findDuplicatePlaylist(playlists, name, excludeId = null) {
  const targetKey = getPlaylistVisibleNameKey(name);
  if (!targetKey) return null;
  return playlists.find((pl) => {
    if (excludeId && pl._id.toString() === excludeId) return false;
    const plKey = pl.displayKey || getPlaylistVisibleNameKey(pl.name);
    return plKey === targetKey;
  }) || null;
}

async function mergeDuplicatePlaylists(userId) {
  const playlists = await Playlist.find({ userId });
  const groups = {};

  playlists.forEach((pl) => {
    const key = pl.displayKey || getPlaylistVisibleNameKey(pl.name);
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(pl);
  });

  let mergedSets = 0;
  for (const group of Object.values(groups)) {
    if (group.length < 2) {
      const solo = group[0];
      const canonicalName = getPlaylistVisibleName(solo.name);
      const displayKey = getPlaylistVisibleNameKey(solo.name);
      let changed = false;
      if (solo.name !== canonicalName) {
        solo.name = canonicalName;
        changed = true;
      }
      if (solo.displayKey !== displayKey) {
        solo.displayKey = displayKey;
        changed = true;
      }
      if (changed) await solo.save();
      continue;
    }

    group.sort((a, b) => {
      const countDiff = (b.videos?.length || 0) - (a.videos?.length || 0);
      if (countDiff !== 0) return countDiff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const keeper = group[0];
    const toMerge = group.slice(1);
    const displayKey = getPlaylistVisibleNameKey(keeper.name);
    const canonicalName = getPlaylistVisibleName(keeper.name);
    const seenVideoIds = new Set(keeper.videos.map((v) => v.videoId));

    for (const pl of toMerge) {
      for (const video of pl.videos) {
        if (!seenVideoIds.has(video.videoId)) {
          keeper.videos.push(video);
          seenVideoIds.add(video.videoId);
        }
      }
      await Playlist.deleteOne({ _id: pl._id });
    }

    keeper.name = canonicalName;
    keeper.displayKey = displayKey;
    await keeper.save();
    mergedSets++;
    console.log(
      `[PLAYLISTS] Merged ${group.length} playlists into "${canonicalName}" (${keeper.videos.length} videos)`
    );
  }

  return mergedSets;
}

console.log('>>>[PLAYLISTS.ROUTES] playlists.routes.js loaded');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(401).json({ error: 'No session ID provided' });
  }
  
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    console.error('MongoDB not connected. Current state:', mongoose.connection.readyState);
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  req.userId = sessionId;
  next();
};

// List all playlists for the user
router.get('/', requireAuth, async (req, res) => {
  console.log('>>>>>[GET] /api/playlists called for user:', req.userId);
  console.log('>>>>>[GET] MongoDB connection state:', mongoose.connection.readyState);
  try {
    await mergeDuplicatePlaylists(req.userId);
    const playlists = await Playlist.find({ userId: req.userId }).sort({ createdAt: -1 });
    console.log('>>>>>[GET] /api/playlists found playlists:', playlists.length);
    res.json({ success: true, playlists });
  } catch (error) {
    console.error('Error in GET /api/playlists:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch playlists', 
      details: error.message,
      userId: req.userId,
      dbState: mongoose.connection.readyState
    });
  }
});

// Create a new playlist
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Playlist name required' });

    const existingPlaylists = await Playlist.find({ userId: req.userId });
    const duplicate = findDuplicatePlaylist(existingPlaylists, name);
    if (duplicate) {
      return res.status(409).json({
        error: 'DUPLICATE_NAME',
        message: 'A playlist with this name already exists',
        playlist: duplicate
      });
    }

    const canonicalName = getPlaylistVisibleName(name);
    const displayKey = getPlaylistVisibleNameKey(name);
    const playlist = new Playlist({
      userId: req.userId,
      name: canonicalName,
      displayKey,
      videos: []
    });
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Playlist.findOne({ userId: req.userId, displayKey: getPlaylistVisibleNameKey(name) });
      return res.status(409).json({
        error: 'DUPLICATE_NAME',
        message: 'A playlist with this name already exists',
        playlist: existing
      });
    }
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Add a video to a playlist
router.post('/:playlistId/videos', requireAuth, async (req, res) => {
  try {
    const { videoId, title, thumbnail, duration, channelTitle } = req.body;
    if (!videoId || !title || !thumbnail) {
      return res.status(400).json({ error: 'Missing video data' });
    }

    const playlist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check for duplicate videoId
    if (playlist.videos.some(v => v.videoId === videoId)) {
      return res.status(409).json({ error: 'DUPLICATE_VIDEO' });
    }

    playlist.videos.unshift({ 
      videoId, 
      title, 
      thumbnail, 
      duration: duration || '', 
      channelTitle: channelTitle || '' 
    });
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add video to playlist' });
  }
});

// Remove a video from a playlist
router.delete('/:playlistId/videos/:videoEntryId', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.videos = playlist.videos.filter(v => v._id.toString() !== req.params.videoEntryId);
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove video from playlist' });
  }
});

// Rename a playlist
router.put('/:playlistId', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'New name required' });

    const playlist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const existingPlaylists = await Playlist.find({ userId: req.userId });
    const duplicate = findDuplicatePlaylist(existingPlaylists, name, req.params.playlistId);
    if (duplicate) {
      return res.status(409).json({
        error: 'DUPLICATE_NAME',
        message: 'A playlist with this name already exists',
        playlist: duplicate
      });
    }

    playlist.name = getPlaylistVisibleName(name);
    playlist.displayKey = getPlaylistVisibleNameKey(name);
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename playlist' });
  }
});

// Move video between playlists
router.post('/:playlistId/move', requireAuth, async (req, res) => {
  try {
    const { videoEntryId, targetPlaylistId } = req.body;
    if (!videoEntryId || !targetPlaylistId) {
      return res.status(400).json({ error: 'Video entry ID and target playlist ID required' });
    }

    const sourcePlaylist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    const targetPlaylist = await Playlist.findOne({ 
      _id: targetPlaylistId, 
      userId: req.userId 
    });

    if (!sourcePlaylist || !targetPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const video = sourcePlaylist.videos.id(videoEntryId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found in source playlist' });
    }

    sourcePlaylist.videos = sourcePlaylist.videos.filter(v => v._id.toString() !== videoEntryId);
    targetPlaylist.videos.unshift(video);

    await Promise.all([sourcePlaylist.save(), targetPlaylist.save()]);
    res.json({ success: true, sourcePlaylist, targetPlaylist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to move video' });
  }
});

// Delete a playlist
router.delete('/:playlistId', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndDelete({ _id: req.params.playlistId, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Rename a video title in a playlist
router.put('/:playlistId/videos/:videoEntryId/title', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'New title required' });

    const playlist = await Playlist.findOne({ _id: req.params.playlistId, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const video = playlist.videos.id(req.params.videoEntryId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found in playlist' });
    }

    video.title = title;
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename video title' });
  }
});

// Bulk update video metadata in a playlist
router.post('/:playlistId/videos/bulk-update', requireAuth, async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const playlist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    let updatedCount = 0;
    
    // Process each update
    for (const update of updates) {
      const { videoId, duration, channelTitle } = update;
      if (!videoId) continue;
      
      // Find the video in the playlist
      const videoIndex = playlist.videos.findIndex(v => v.videoId === videoId);
      if (videoIndex !== -1) {
        // Update the video metadata
        if (duration) playlist.videos[videoIndex].duration = duration;
        if (channelTitle) playlist.videos[videoIndex].channelTitle = channelTitle;
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      await playlist.save();
    }
    
    console.log(`✅ [BULK-UPDATE] Updated ${updatedCount} videos in playlist: ${playlist.name}`);
    
    res.json({ 
      success: true, 
      message: `Updated ${updatedCount} videos`,
      updatedCount 
    });
    
  } catch (error) {
    console.error('❌ [BULK-UPDATE] Error:', error);
    res.status(500).json({ error: 'Failed to update videos' });
  }
});

module.exports = router; 