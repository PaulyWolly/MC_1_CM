/*
  PLAYLIST.SERVICE.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const sessionId = 'global-persistent-storage-001-v1';

// configLoader.js
import { loadConfig } from './configLoader.js';

let apiBaseUrl = '';
let configLoaded = false;

async function ensureConfigLoaded() {
  if (!configLoaded) {
    const config = await loadConfig();
    // Use the 'development' or 'production' section as needed
    apiBaseUrl = config.development.api.baseUrl; // or detect env dynamically
    configLoaded = true;
  }
}

class PlaylistService {
  constructor() {
    this.baseUrl = '/api/playlists';
  }

  async getPlaylists() {
    await ensureConfigLoaded();
    try {
      console.log('Fetching playlists with sessionId:', sessionId);
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}?sessionId=${sessionId}`);
      const data = await response.json();
      if (!response.ok) {
        console.error('Error response from server:', data);
        throw new Error(data.error || 'Failed to fetch playlists');
      }
      console.log('Received playlists:', data);
      return data;
    } catch (error) {
      console.error('Error fetching playlists:', error);
      throw error;
    }
  }

  async createPlaylist(name) {
    await ensureConfigLoaded();
    try {
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create playlist');
      }
      return data;
    } catch (error) {
      console.error('Error creating playlist:', error);
      throw error;
    }
  }

  async addVideoToPlaylist(playlistId, video) {
    await ensureConfigLoaded();
    try {
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}/${playlistId}/videos?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add video to playlist');
      }
      return data;
    } catch (error) {
      console.error('Error adding video to playlist:', error);
      throw error;
    }
  }

  async removeVideoFromPlaylist(playlistId, videoEntryId) {
    await ensureConfigLoaded();
    try {
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}/${playlistId}/videos/${videoEntryId}?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove video from playlist');
      }
      return data;
    } catch (error) {
      console.error('Error removing video from playlist:', error);
      throw error;
    }
  }

  async renamePlaylist(playlistId, newName) {
    await ensureConfigLoaded();
    try {
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}/${playlistId}?sessionId=${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to rename playlist');
      }
      return data;
    } catch (error) {
      console.error('Error renaming playlist:', error);
      throw error;
    }
  }

  async moveVideo(playlistId, videoEntryId, targetPlaylistId) {
    await ensureConfigLoaded();
    try {
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}/${playlistId}/move?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoEntryId, targetPlaylistId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to move video');
      }
      return data;
    } catch (error) {
      console.error('Error moving video:', error);
      throw error;
    }
  }

  async deletePlaylist(playlistId) {
    await ensureConfigLoaded();
    try {
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}/${playlistId}?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete playlist');
      }
      return data;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      throw error;
    }
  }

  async renameVideoTitle(playlistId, videoEntryId, newTitle) {
    await ensureConfigLoaded();
    try {
      const response = await fetch(`${apiBaseUrl}${this.baseUrl}/${playlistId}/videos/${videoEntryId}/title?sessionId=${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to rename video title');
      }
      return data;
    } catch (error) {
      console.error('Error renaming video title:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const playlistService = new PlaylistService();

export default playlistService; 