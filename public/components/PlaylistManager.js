import playlistService from '../services/playlist.service.js';

export default class PlaylistManager {
  constructor() {
    this.dialog = null;
    this.currentVideo = null;
    this.playlists = [];
    this.selectedPlaylistId = null;
    this.playlistSortAsc = true; // Track sort order
    this.sortMode = 'recent'; // 'recent', 'asc', 'desc'
    this.recentPlaylistIds = JSON.parse(localStorage.getItem('recentPlaylistIds') || '[]');
    this.init();
  }

  /*
  PLAYLISTMANAGER.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/
  cleanPlaylistNameForDisplay(name) {
    if (!name) return '';
    
    // First detect the search type from the playlist name
    const type = this.detectSearchTypeFromName(name);
    
    // Clean the name by removing prefixes
    let cleaned = name
      .replace(/^youtube\s+search\s+/i, '')
      .replace(/^youtube\s+channel\s+/i, '')
      .replace(/^youtube\s+movies?\s+/i, '')
      .replace(/^youtube\s+tv\s+/i, '')
      .replace(/^youtube\s+/i, '')
      .replace(/^search\s+/i, '')
      .replace(/^channel\s+/i, '')
      .replace(/^movies?\s+/i, '')
      .replace(/^tv\s+/i, '')
      .trim();
      
    // If cleaning results in empty string, use original
    if (!cleaned) cleaned = name;
    
    // HUMANIZE: Convert normalized dot notation to human-readable format
    // e.g., "jean.luc.ponty" -> "Jean Luc Ponty", "hillsong.united.of.dirt.and.grace" -> "Hillsong United Of Dirt And Grace"
    const humanReadable = cleaned.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Add type indicators based on detected search type
    switch (type) {
      case 'channel':
        return `${humanReadable} (ch)`;
      case 'movies':
        return `${humanReadable} (mv)`;
      case 'tv':
        return `${humanReadable} (tv)`;
      case 'search':
      default:
        return humanReadable; // No indicator for regular searches
    }
  }

  detectSearchTypeFromName(name) {
    if (!name) return 'search';
    
    const lowerName = name.toLowerCase();
    
    // Channel patterns
    if (lowerName.includes('youtube channel') || lowerName.startsWith('channel ')) {
      return 'channel';
    }
    
    // Movies patterns
    if (lowerName.includes('youtube movie') || lowerName.includes('youtube film') || 
        lowerName.startsWith('movie ') || lowerName.startsWith('film ')) {
      return 'movies';
    }
    
    // TV patterns
    if (lowerName.includes('youtube tv') || lowerName.includes('youtube television') || 
        lowerName.includes('youtube series') || lowerName.includes('youtube show') ||
        lowerName.startsWith('tv ') || lowerName.startsWith('television ') ||
        lowerName.startsWith('series ') || lowerName.startsWith('show ')) {
      return 'tv';
    }
    
    return 'search'; // Default to regular search
  }

  // Format YouTube ISO 8601 duration (PT4M13S) to readable format (4:13)
  formatDuration(duration) {
    if (!duration) return 'N/A';
    
    // Handle ISO 8601 duration format (PT4M13S, PT1H23M45S, etc.)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration; // Return original if can't parse
    
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Backfill duration data for existing playlist videos
  async backfillDurationData() {
    try {
      console.log('🔄 [BACKFILL] Starting duration backfill for existing playlist videos...');
      
      const response = await fetch('/api/youtube/playlists-backfill-duration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [BACKFILL] Duration backfill completed:', result.message);
        console.log('📊 [BACKFILL] Stats:', {
          playlistsProcessed: result.playlistsProcessed,
          videosProcessed: result.totalVideosProcessed,
          videosUpdated: result.totalVideosUpdated
        });
        
        // Refresh the current playlist view
        if (this.selectedPlaylistId) {
          await this.selectPlaylist(this.selectedPlaylistId);
        }
        
        return result;
      } else {
        console.error('❌ [BACKFILL] Duration backfill failed:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ [BACKFILL] Error during duration backfill:', error);
      throw error;
    }
  }

  async init() {
    console.log('PlaylistManager.init() called');
    // Create dialog element
    this.dialog = document.createElement('div');
    this.dialog.className = 'playlist-manager-dialog';
    this.dialog.style.display = 'none';  // Start hidden
    this.dialog.style.position = 'fixed';
    this.dialog.style.top = '0';
    this.dialog.style.left = '0';
    this.dialog.style.width = '100%';
    this.dialog.style.height = '100%';
    this.dialog.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.dialog.style.zIndex = '9999';
    
    this.dialog.innerHTML = `
      <div class="playlist-manager-content">
        <div class="playlist-manager-header">
          <h2>Playlist Manager</h2>
          <span class="add-to-playlist-header-btn-container"></span>
          <button class="close-btn">&times;</button>
        </div>
        <div class="playlist-manager-body">
          <div class="playlist-controls-row">
            <div class="playlist-search-wrapper">
              <input type="text" class="playlist-search-input" placeholder="Search/filter playlists...">
              <button class="playlist-search-clear" style="display:none;" tabindex="-1" aria-label="Clear search">&times;</button>
            </div>
            <div class="playlist-create-controls">
              <input type="text" class="new-playlist-input" placeholder="New playlist name">
              <button class="create-playlist-btn">Create Playlist</button>
            </div>
          </div>
          <div class="playlist-manager-row">
            <div class="playlists-container" style="max-height: 220px; min-height: 120px; overflow-y: auto; margin-bottom: 0;"></div>
            <div class="pending-video-container"></div>
          </div>
          
          <div class="playlist-manager-message" style="margin: 12px 0 0 0; text-align: right;"></div>
          <div class="current-playlist-header" style="margin-top: 8px;"></div>
          <div class="videos-container"></div>
        </div>
      </div>
    `;

    // <button onclick="window.playlistManager.showPlaylistMessage('Video has been added to playlist!')">Test Message</button>

    // Add to DOM immediately
    document.body.appendChild(this.dialog);
    console.log('Dialog added to DOM');

    // Add event listeners
    this.dialog.querySelector('.close-btn').addEventListener('click', () => this.hide());
    this.dialog.querySelector('.create-playlist-btn').addEventListener('click', async () => {
      const input = this.dialog.querySelector('.new-playlist-input');
      const name = input.value.trim();
      if (name) {
        const newPlaylist = await this.createPlaylist(name);
        input.value = '';
        await this.loadPlaylists();
        // Select the new playlist if it was created
        if (newPlaylist && newPlaylist.name) {
          const created = this.playlists.find(pl => pl.name.toLowerCase() === newPlaylist.name.toLowerCase());
          if (created) {
            this.selectPlaylist(created._id);
          }
        }
      }
    });
    // Add Enter key support for new playlist input
    this.dialog.querySelector('.new-playlist-input').addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const input = this.dialog.querySelector('.new-playlist-input');
        const name = input.value.trim();
        if (name) {
          const newPlaylist = await this.createPlaylist(name);
          input.value = '';
          await this.loadPlaylists();
          if (newPlaylist && newPlaylist.name) {
            const created = this.playlists.find(pl => pl.name.toLowerCase() === newPlaylist.name.toLowerCase());
            if (created) {
              this.selectPlaylist(created._id);
            }
          }
        }
      }
    });
    // this.dialog.querySelector('.add-to-playlist-header-btn').addEventListener('click', () => this.addCurrentVideoToPlaylist());
    
    // Add search input event and clear button logic
    const searchInput = this.dialog.querySelector('.playlist-search-input');
    const clearBtn = this.dialog.querySelector('.playlist-search-clear');
    searchInput.addEventListener('input', (e) => {
      this.renderPlaylists(e.target.value);
      clearBtn.style.display = e.target.value ? 'block' : 'none';
    });
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      this.renderPlaylists('');
      searchInput.focus();
    });
    
    console.log('PlaylistManager initialization complete');
  }

  async show(arg, playlistNameArg = null) {
    // If called with a video object and a playlist name, set currentVideo and select/create the playlist
    if (arg && typeof arg === 'object' && (arg.id || arg.videoId) && arg.title && playlistNameArg) {
      this.currentVideo = arg;
      const playlistName = window.extractCleanQuery ? window.extractCleanQuery(playlistNameArg) : (playlistNameArg?.trim() || '');
      await this.loadPlaylists();
      if (playlistName) {
        const existing = this.playlists.find(pl => pl.name.trim().toLowerCase() === playlistName.trim().toLowerCase());
        if (existing) {
          this.selectPlaylist(existing._id);
          this.showPlaylistMessage('A playlist with this name already exists. Showing existing playlist.');
        } else {
          const newPlaylist = await this.createPlaylist(playlistName);
          await this.loadPlaylists();
          const created = this.playlists.find(pl => pl.name.trim().toLowerCase() === playlistName.trim().toLowerCase());
          if (created) {
            this.selectPlaylist(created._id);
          }
        }
      }
      this.dialog.style.display = 'flex';
      this.dialog.style.justifyContent = 'center';
      this.dialog.style.alignItems = 'center';
      this.renderPendingVideo();
      return;
    }
    // If called with just a video object, fallback to previous behavior
    if (arg && typeof arg === 'object' && (arg.id || arg.videoId) && arg.title) {
      this.currentVideo = arg;
      await this.loadPlaylists();
      this.dialog.style.display = 'flex';
      this.dialog.style.justifyContent = 'center';
      this.dialog.style.alignItems = 'center';
      this.renderPendingVideo();
      return;
    }
    // Otherwise, treat as a query string for playlist selection/creation
    const playlistName = window.extractCleanQuery ? window.extractCleanQuery(arg) : (arg?.trim() || '');
    await this.loadPlaylists();
    if (playlistName) {
      const existing = this.playlists.find(pl => pl.name.trim().toLowerCase() === playlistName.trim().toLowerCase());
      if (existing) {
        this.selectPlaylist(existing._id);
        this.showPlaylistMessage('A playlist with this name already exists. Showing existing playlist.');
      } else {
        const newPlaylist = await this.createPlaylist(playlistName);
        await this.loadPlaylists();
        const created = this.playlists.find(pl => pl.name.trim().toLowerCase() === playlistName.trim().toLowerCase());
        if (created) {
          this.selectPlaylist(created._id);
        }
      }
    } else {
      this.renderPlaylists();
    }
    this.dialog.style.display = 'flex';
    this.dialog.style.justifyContent = 'center';
    this.dialog.style.alignItems = 'center';
    this.renderPendingVideo();
  }

  hide() {
    this.dialog.style.display = 'none';
    this.currentVideo = null;
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    this.dialog.querySelector('.playlist-manager-content').insertBefore(
      errorDiv,
      this.dialog.querySelector('.playlist-manager-body')
    );
    setTimeout(() => errorDiv.remove(), 5000);
  }

  async loadPlaylists() {
    try {
      const response = await playlistService.getPlaylists();
      // Normalize playlists: only one per normalized name
      const normalizedMap = {};
      response.playlists.forEach(pl => {
        const normName = (pl.name || '').trim().toLowerCase();
        if (!normalizedMap[normName]) {
          normalizedMap[normName] = pl;
        }
      });
      this.playlists = Object.values(normalizedMap);
      this.renderPlaylists();
    } catch (error) {
      console.error('Failed to load playlists:', error);
      throw error;
    }
  }

  renderPlaylists(filter = '') {
    const container = this.dialog.querySelector('.playlists-container');
    let filtered = this.playlists;
    if (filter && filter.trim()) {
      const f = filter.trim().toLowerCase();
      filtered = this.playlists.filter(p => p.name.toLowerCase().includes(f));
    }
    let sorted;
    if (this.sortMode === 'recent') {
      // MRU order first, then the rest alphabetically
      const mru = [];
      const rest = [];
      filtered.forEach(p => {
        if (this.recentPlaylistIds.includes(p._id)) {
          mru.push(p);
        } else {
          rest.push(p);
        }
      });
      // Sort MRU by their order in recentPlaylistIds
      mru.sort((a, b) => this.recentPlaylistIds.indexOf(a._id) - this.recentPlaylistIds.indexOf(b._id));
      // Sort rest alphabetically
      rest.sort((a, b) => a.name.localeCompare(b.name));
      sorted = [...mru, ...rest];
    } else {
      // ASC/DESC
      sorted = filtered.slice().sort((a, b) => {
        if (a.name.toLowerCase() < b.name.toLowerCase()) return this.playlistSortAsc ? -1 : 1;
        if (a.name.toLowerCase() > b.name.toLowerCase()) return this.playlistSortAsc ? 1 : -1;
        return 0;
      });
    }
    // Add sort controls
    let outer = this.dialog.querySelector('.playlist-list-outer');
    if (!outer) {
      outer = document.createElement('div');
      outer.className = 'playlist-list-outer';
      const playlistList = this.dialog.querySelector('.playlists-container');
      if (playlistList) {
        playlistList.parentElement.insertBefore(outer, playlistList);
        outer.appendChild(playlistList);
      }
    }
    // Remove any existing sort control
    const oldSort = outer.querySelector('.playlist-sort-control');
    if (oldSort) oldSort.remove();
    // Add sort controls
    const sortArrow = this.playlistSortAsc ? '▲' : '▼';
    const sortControl = document.createElement('div');
    sortControl.className = 'playlist-sort-control';
    sortControl.innerHTML = `
      
      <button class="playlist-sort-recent-btn" style="margin-left:8px;${this.sortMode==='recent'?'font-weight:bold;':''}">Recent</button>
      <span class="playlist-sort-arrow" style="margin-left:8px;cursor:pointer;">${sortArrow}</span>
    `;
    outer.appendChild(sortControl);
    // Recent sort button
    sortControl.querySelector('.playlist-sort-recent-btn').onclick = (e) => {
      e.stopPropagation();
      this.sortMode = 'recent';
      this.renderPlaylists(this.dialog.querySelector('.playlist-search-input').value);
    };
    // ASC/DESC sort arrow
    sortControl.querySelector('.playlist-sort-arrow').onclick = (e) => {
      e.stopPropagation();
      this.playlistSortAsc = !this.playlistSortAsc;
      this.sortMode = this.playlistSortAsc ? 'asc' : 'desc';
      this.renderPlaylists(this.dialog.querySelector('.playlist-search-input').value);
    };
    // Render playlists
    container.innerHTML = sorted.map(playlist => `
      <div class="playlist-item${playlist._id === this.selectedPlaylistId ? ' active' : ''}" data-id="${playlist._id}" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center; padding:6px 10px; border-radius:6px; margin-bottom:2px; background:${playlist._id === this.selectedPlaylistId ? '#e3f2fd' : 'transparent'};">
        <span class="playlist-name">${this.cleanPlaylistNameForDisplay(playlist.name)}</span>
        <span class="playlist-count" style="color:#888;font-size:0.95em;">(${playlist.videos.length})</span>
      </div>
    `).join('');

    container.querySelectorAll('.playlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-playlist-btn') || e.target.classList.contains('submit-rename-btn') || e.target.classList.contains('rename-playlist-input')) return;
        this.selectPlaylist(item.dataset.id);
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });
      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        try {
          const video = JSON.parse(e.dataTransfer.getData('application/json'));
          await this.addVideoToPlaylistById(item.dataset.id, video);
          this.selectPlaylist(item.dataset.id);
        } catch (err) {
          this.showError('Failed to add video by drag-and-drop.');
        }
      });
      item.style.cursor = 'pointer';
    });

    // Render the active playlist name with pencil above the table
    const headerContainer = this.dialog.querySelector('.current-playlist-header');
    headerContainer.style.marginTop = '8px';
    const playlist = this.playlists.find(p => p._id === this.selectedPlaylistId);
    if (playlist) {
      headerContainer.innerHTML = `
        <div style="display:inline-flex;align-items:center;gap:10px;font-weight:bold;font-size:1.2em;">
          <span class="current-playlist-name" style="font-weight:bold;">${this.cleanPlaylistNameForDisplay(playlist.name)}</span>
          <button class="edit-playlist-btn" title="Rename Playlist" data-id="${playlist._id}" style="font-size:1.1em;vertical-align:middle;background:transparent;border:none;cursor:pointer;">&#9998;</button>
          <button class="delete-playlist-btn" title="Delete Playlist" data-id="${playlist._id}" style="font-size:1.1em;vertical-align:middle;background:transparent;border:none;cursor:pointer;color:#e92828;">&#128465;</button>
          <span class="rename-controls" style="display:none;margin-left:8px;">
            <input type="text" class="rename-playlist-input" value="${this.cleanPlaylistNameForDisplay(playlist.name)}" style="font-size:1em;width:120px;">
            <button class="submit-rename-btn" data-id="${playlist._id}" style="font-size:1em;">✔</button>
          </span>
        </div>
      `;
      const btn = headerContainer.querySelector('.edit-playlist-btn');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        headerContainer.querySelector('.current-playlist-name').style.display = 'none';
        btn.style.display = 'none';
        const controls = headerContainer.querySelector('.rename-controls');
        controls.style.display = 'inline-block';
        controls.querySelector('.rename-playlist-input').focus();
      });
      const submitBtn = headerContainer.querySelector('.submit-rename-btn');
      submitBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const input = headerContainer.querySelector('.rename-playlist-input');
        const newName = input.value.trim();
        if (!newName) return;
        await this.renamePlaylist(submitBtn.dataset.id, newName);
        headerContainer.querySelector('.current-playlist-name').textContent = this.cleanPlaylistNameForDisplay(newName);
        headerContainer.querySelector('.current-playlist-name').style.display = '';
        btn.style.display = '';
        headerContainer.querySelector('.rename-controls').style.display = 'none';
      });
      const deleteBtn = headerContainer.querySelector('.delete-playlist-btn');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await showCustomConfirm(`Are you sure you want to delete the playlist "${this.cleanPlaylistNameForDisplay(playlist.name)}"? This cannot be undone.`);
        if (confirmed) {
          await playlistService.deletePlaylist(playlist._id);
          this.selectedPlaylistId = null;
          await this.loadPlaylists();
          if (this.playlists.length === 0) {
            this.hide();
            showToast('Playlist deleted. No playlists remain.');
          } else {
            this.selectedPlaylistId = this.playlists[0]._id;
            this.renderPlaylists();
            showToast('Playlist deleted.');
          }
        }
      });
    } else {
      headerContainer.innerHTML = '<span class="current-playlist-name">Select a playlist</span>';
    }
  }

  async selectPlaylist(playlistId) {
    this.selectedPlaylistId = playlistId;
    this.updateRecentPlaylists(playlistId);
    const playlist = this.playlists.find(p => p._id === playlistId);
    if (playlist) {
      this.dialog.querySelector('.current-playlist-name').textContent = this.cleanPlaylistNameForDisplay(playlist.name);
      this.renderVideos(playlist.videos);
    }
    this.renderPlaylists(this.dialog.querySelector('.playlist-search-input').value);
    const addBtn = this.dialog.querySelector('.add-to-playlist-header-btn');
    if (addBtn) {
      addBtn.disabled = !playlistId;
    }
  }

  renderVideos(videos) {
    const container = this.dialog.querySelector('.videos-container');
    container.style.marginTop = '8px';
    container.innerHTML = `
    <div class="playlist-table-blue-bg">
        <div class="playlist-table-wrapper">
            <table class="playlist-videos-table" style="table-layout: fixed; width: 100%;">
                <colgroup>
                    <col class="playlist-col-thumb">
                    <col class="playlist-col-title">
                    <col class="playlist-col-duration">
                    <col class="playlist-col-actions">
                </colgroup>
                <thead>
                    <tr>
                        <th class="playlist-video-header">Video</th>
                        <th class="playlist-title-header">Title</th>
                        <th class="playlist-duration-header">Duration</th>
                        <th class="playlist-actions-header">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${videos.map(video => `
                        <tr class="playlist-video-row" data-entry-id="${video._id}">
                            <td class="playlist-thumb-cell"><img class="video-thumbnail youtube-popup-thumb" src="${video.thumbnail}" alt="${video.title}" title="${video.title}" style="cursor:pointer;" data-video-id="${video.videoId}" /></td>
                            <td class="video-title-cell">
                                <span class="video-title-text">${video.title}</span>
                            </td>
                            <td class="playlist-duration-cell" style="text-align:center; font-family:monospace; font-weight:bold;">
                                <span class="video-duration-text" title="Video Duration">${this.formatDuration(video.duration)}</span>
                            </td>
                            <td class="playlist-actions-cell" style="text-align:right;">
                                <button class="action-btn view-video-btn" title="View/Play" data-video-id="${video.videoId}" data-local-url="${video.localUrl || ''}" data-entry-id="${video._id}">&#128065;</button>
                                <button class="edit-video-title-btn" title="Edit Title" style="background:none;border:none;cursor:pointer;font-size:1.1em;margin-left:8px;vertical-align:middle;">✏️</button>
                                <button class="action-btn remove-video-btn" title="Remove" data-id="${video._id}">&#128465;</button>
                                <select class="move-to-playlist" data-entry-id="${video._id}">
                                    <option value="">Move to...</option>
                                    ${this.renderMoveToDropdown(this.selectedPlaylistId)}
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    `;

    // Remove Refresh button handler
    // const refreshBtn = container.querySelector('.refresh-playlist-btn');
    // if (refreshBtn) {
    //   refreshBtn.addEventListener('click', async () => {
    //     await this.loadPlaylists();
    //     const playlist = this.playlists.find(p => p._id === this.selectedPlaylistId);
    //     if (playlist) {
    //       this.renderVideos(playlist.videos);
    //     }
    //   });
    // }

    // Add event listeners for actions
    container.querySelectorAll('.view-video-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('Eye icon clicked');
        const videoId = btn.dataset.videoId;
        console.log('Video ID:', videoId);
        console.log('youtubeSearchManager exists:', !!window.youtubeSearchManager);
        console.log('openYoutubePopup exists:', !!(window.youtubeSearchManager && typeof window.youtubeSearchManager.openYoutubePopup === 'function'));
        
        if (videoId && window.youtubeSearchManager && typeof window.youtubeSearchManager.openYoutubePopup === 'function') {
          window.youtubeSearchManager.openYoutubePopup(videoId);
          this.hide();
        } else {
          showToast('Unable to play video. Please try again.');
        }
      });
    });
    container.querySelectorAll('.remove-video-btn').forEach(btn => {
      btn.addEventListener('click', () => this.removeVideo(btn.dataset.id));
    });
    container.querySelectorAll('.move-to-playlist').forEach(select => {
      select.addEventListener('change', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const videoEntryId = select.dataset.entryId;
        const targetPlaylistId = e.target.value;
        console.log('Move video:', { videoEntryId, targetPlaylistId });
        
        if (targetPlaylistId) {
          try {
            await this.moveVideo(videoEntryId, targetPlaylistId);
            // Reset the select element
            e.target.value = '';
          } catch (error) {
            console.error('Error moving video:', error);
            e.target.value = '';
            this.showError('Failed to move video. Please try again.');
          }
        }
      });
    });
    // Add click event for video image to open popup
    container.querySelectorAll('.youtube-popup-thumb').forEach(img => {
      console.log('Adding click handler to image:', img);  // Log when we add the handler
      img.addEventListener('click', (e) => {
        console.log('IMAGE CLICKED!');  // Simple log to verify click
        console.log('Image clicked');
        const videoId = img.getAttribute('data-video-id');
        console.log('Image Video ID:', videoId);
        console.log('youtubeSearchManager exists:', !!window.youtubeSearchManager);
        console.log('openYoutubePopup exists:', !!(window.youtubeSearchManager && typeof window.youtubeSearchManager.openYoutubePopup === 'function'));
        
        if (videoId && window.youtubeSearchManager && typeof window.youtubeSearchManager.openYoutubePopup === 'function') {
          window.youtubeSearchManager.openYoutubePopup(videoId);
          this.hide();
        } else {
          showToast('Unable to play video. Please try again.');
        }
      });
    });

    // Add inline edit logic for video titles
    container.querySelectorAll('.edit-video-title-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const row = btn.closest('tr');
        const cell = row.querySelector('.video-title-cell');
        const titleSpan = cell.querySelector('.video-title-text');
        const oldTitle = titleSpan.textContent;
        // Replace with input and submit button
        cell.innerHTML = `<input type="text" class="edit-title-input" value="${oldTitle}" style="font-size:1em;width:70%;margin-right:6px;">` +
          `<button class="submit-title-btn" title="Save" style="font-size:1.1em;vertical-align:middle;">✔</button>` +
          `<button class="cancel-title-btn" title="Cancel" style="font-size:1.1em;vertical-align:middle;margin-left:4px;">✖</button>`;
        const input = cell.querySelector('.edit-title-input');
        input.focus();
        // Submit on button click or Enter
        cell.querySelector('.submit-title-btn').addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const newTitle = input.value.trim();
          console.log('Submit button clicked with new title:', newTitle);
          if (newTitle) {
            try {
              console.log('Calling renameVideoTitle with:', { videoEntryId: row.dataset.entryId, newTitle });
              await this.renameVideoTitle(row.dataset.entryId, newTitle);
              // Update UI immediately after successful rename
              cell.innerHTML = `<span class="video-title-text">${newTitle}</span>`;
            } catch (error) {
              console.error('Error renaming title:', error);
              cell.innerHTML = `<span class="video-title-text">${oldTitle}</span>`;
              this.showError('Failed to update video title.');
            }
          }
        });
        input.addEventListener('keydown', async (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            const newTitle = input.value.trim();
            if (newTitle) {
              try {
                await this.renameVideoTitle(row.dataset.entryId, newTitle);
                cell.innerHTML = `<span class="video-title-text">${newTitle}</span>`;
              } catch (error) {
                console.error('Error renaming title:', error);
                cell.innerHTML = `<span class="video-title-text">${oldTitle}</span>`;
                this.showError('Failed to update video title.');
              }
            }
          } else if (ev.key === 'Escape') {
            cell.innerHTML = `<span class="video-title-text">${oldTitle}</span>`;
          }
        });
        // Cancel button
        cell.querySelector('.cancel-title-btn').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          cell.innerHTML = `<span class="video-title-text">${oldTitle}</span>`;
        });
      });
    });
  }

  async createPlaylist(name) {
    if (!name) return;
    // Prevent duplicate playlist creation
    const existing = this.playlists.find(pl => pl.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      this.selectPlaylist(existing._id);
      this.showPlaylistMessage('A playlist with this name already exists. Showing existing playlist.');
      return existing;
    }
    try {
      const response = await playlistService.createPlaylist(name);
      // Add to MRU
      if (response && response.playlist && response.playlist._id) {
        this.updateRecentPlaylists(response.playlist._id);
      }
      return response.playlist;
    } catch (error) {
      this.showError('Failed to create playlist. Please try again.');
    }
  }

  async renamePlaylist(playlistId, name) {
    if (!playlistId) return;
    try {
      await playlistService.renamePlaylist(playlistId, name);
      await this.loadPlaylists();
    } catch (error) {
      this.showError('Failed to rename playlist. Please try again.');
    }
  }

  async removeVideo(videoEntryId) {
    if (!this.selectedPlaylistId) return;
    const confirmed = await showCustomConfirm('Are you sure you want to delete this video from the playlist? This cannot be undone.');
    if (!confirmed) return;
    try {
      await playlistService.removeVideoFromPlaylist(this.selectedPlaylistId, videoEntryId);
      // Immediately update UI after deletion
      const playlist = this.playlists.find(p => p._id === this.selectedPlaylistId);
      if (playlist) {
        playlist.videos = playlist.videos.filter(v => v._id !== videoEntryId && v._id?.toString() !== videoEntryId);
        this.renderVideos(playlist.videos);
      }
      await this.loadPlaylists();
    } catch (error) {
      this.showError('Failed to remove video. Please try again.');
    }
  }

  async moveVideo(videoEntryId, targetPlaylistId) {
    if (!this.selectedPlaylistId) return;
    try {
      // Find the video in the current playlist to get its videoId
      const playlist = this.playlists.find(p => p._id === this.selectedPlaylistId);
      if (!playlist) {
        throw new Error('Source playlist not found');
      }
      
      const video = playlist.videos.find(v => v._id === videoEntryId || v._id?.toString() === videoEntryId);
      if (!video) {
        throw new Error('Video not found in source playlist');
      }

      console.log('Attempting to move video:', videoEntryId, 'to playlist:', targetPlaylistId);
      await playlistService.moveVideo(this.selectedPlaylistId, videoEntryId, targetPlaylistId);
      
      // After successful move, reload playlists and re-render
      await this.loadPlaylists();
      
      // Update the current playlist view
      const updatedPlaylist = this.playlists.find(p => p._id === this.selectedPlaylistId);
      if (updatedPlaylist) {
        this.renderVideos(updatedPlaylist.videos);
      }
      
      // Update the playlist list
      this.renderPlaylists();
      
      showToast('Video moved successfully!');
    } catch (error) {
      console.error('Failed to move video:', error);
      showToast('Failed to move video. Please try again.');
      this.showError('Failed to move video. Please try again.');
    }
  }

  renderPendingVideo() {
    const pendingContainer = this.dialog.querySelector('.pending-video-container');
    if (!pendingContainer) return;
    pendingContainer.innerHTML = '';
    if (!this.currentVideo) {
      pendingContainer.innerHTML = `<div class="pending-placeholder">Pending videos you can 'Drag & Drop' onto a playlist on the LEFT will show here</div>`;
      return;
    }
    // Truncate title to 30 characters
    const truncatedTitle = (this.currentVideo.title && this.currentVideo.title.length > 30)
      ? this.currentVideo.title.slice(0, 50) + '...'
      : this.currentVideo.title || 'Untitled Video';
    pendingContainer.innerHTML = `
      <div class="pending-video" draggable="true" id="pending-video">
        <span class="drag-icon" style="font-size: 2.2em; margin-right: 14px; cursor: grab; color: #2196f3;">&#9776;</span>
        <img src="${this.currentVideo.thumbnail}" alt="" />
        <span style="font-weight:bold; margin-left:10px;">${truncatedTitle}</span>
        <span style="color:#2196f3;margin-left:18px;">Drag to playlist</span>
      </div>
    `;
    const pending = pendingContainer.querySelector('.pending-video');
    pending.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify(this.currentVideo));
    });
  }

  async addCurrentVideoToPlaylist() {
    if (!this.selectedPlaylistId || !this.currentVideo) return;
    try {
      await playlistService.addVideoToPlaylist(this.selectedPlaylistId, {
        videoId: this.currentVideo.id || this.currentVideo.videoId,
        title: this.currentVideo.title && this.currentVideo.title.trim() ? this.currentVideo.title : 'Untitled Video',
        thumbnail: this.currentVideo.thumbnail,
        duration: this.currentVideo.duration || '',
        channelTitle: this.currentVideo.channelTitle || ''
      });
      this.showPlaylistMessage('Video has been added to playlist!');
      await this.loadPlaylists();
      this.renderVideos(this.playlists.find(p => p._id === this.selectedPlaylistId)?.videos || []);
      this.currentVideo = null;
      this.renderPendingVideo();
    } catch (error) {
      if (error.message && error.message.includes('DUPLICATE_VIDEO')) {
        showToast('Video already exists in your playlist');
      } else {
        this.showError('Failed to add video to playlist.');
      }
    }
    this.currentVideo = null;
    this.renderPendingVideo();
  }

  async addVideoToPlaylistById(playlistId, video) {
    try {
      await playlistService.addVideoToPlaylist(playlistId, {
        videoId: video.id || video.videoId,
        title: video.title && video.title.trim() ? video.title : 'Untitled Video',
        thumbnail: video.thumbnail,
        duration: video.duration || '',
        channelTitle: video.channelTitle || ''
      });
      this.showPlaylistMessage('Video has been added to playlist! ' +
        '<span class="playlist-message-emoji-stack">' +
          '<span class="playlist-message-happy-emoji">😄</span>' +
          '<span class="playlist-message-sparkle-emoji">✨</span>' +
          '<span class="playlist-message-thumbs-emoji">👍</span>' +
        '</span>');
      await this.loadPlaylists();
      this.renderVideos(this.playlists.find(p => p._id === playlistId)?.videos || []);
      this.currentVideo = null;
      this.renderPendingVideo();
    } catch (error) {
      if (error.message && error.message.includes('DUPLICATE_VIDEO')) {
        showToast('Video already exists in your playlist');
      } else {
        this.showError('Failed to add video to playlist.');
      }
    }
    this.currentVideo = null;
    this.renderPendingVideo();
  }

  async renameVideoTitle(videoEntryId, newTitle) {
    console.log('renameVideoTitle called with:', { videoEntryId, newTitle, selectedPlaylistId: this.selectedPlaylistId });
    if (!this.selectedPlaylistId || !videoEntryId || !newTitle) {
      console.log('Missing required parameters:', { selectedPlaylistId: this.selectedPlaylistId, videoEntryId, newTitle });
      return;
    }
    try {
      console.log('Calling playlistService.renameVideoTitle');
      await playlistService.renameVideoTitle(this.selectedPlaylistId, videoEntryId, newTitle);
      console.log('Successfully renamed video title');
      await this.loadPlaylists();
      const playlist = this.playlists.find(p => p._id === this.selectedPlaylistId);
      if (playlist) {
        console.log('Re-rendering videos after rename');
        this.renderVideos(playlist.videos);
      }
      showToast('Video title updated!');
    } catch (error) {
      console.error('Error in renameVideoTitle:', error);
      this.showError('Failed to update video title.');
    }
  }

  showPlaylistMessage(msg) {
    const msgDiv = this.dialog.querySelector('.playlist-manager-message');
    if (msgDiv) {
      msgDiv.innerHTML =
        '<div class="playlist-message-flex">' +
          '<span>Video has been added to playlist!</span>' +
          '<span class="playlist-message-emoji-stack">' +
            '<span class="playlist-message-happy-emoji">😄</span>' +
            '<span class="playlist-message-sparkle-emoji">✨</span>' +
            '<span class="playlist-message-thumbs-emoji">👍</span>' +
          '</span>' +
        '</div>';
      msgDiv.style.color = '#2196f3';
      msgDiv.style.fontWeight = 'bold';
      setTimeout(() => { msgDiv.innerHTML = ''; }, 10000);
    }
  }

  updateRecentPlaylists(playlistId) {
    // Remove if already present
    this.recentPlaylistIds = this.recentPlaylistIds.filter(id => id !== playlistId);
    // Add to top
    this.recentPlaylistIds.unshift(playlistId);
    // Limit to 20 MRU
    this.recentPlaylistIds = this.recentPlaylistIds.slice(0, 20);
    localStorage.setItem('recentPlaylistIds', JSON.stringify(this.recentPlaylistIds));
    // TODO: Call backend API to persist MRU order
  }

  renderMoveToDropdown(selectedPlaylistId) {
    // Use normalized, filtered, and sorted playlists for the dropdown
    const dropdownPlaylists = (this.playlists || [])
      .filter(pl => !/^youtube search/i.test(pl.name || pl.displayName || ''))
      .filter(pl => pl._id !== selectedPlaylistId)
      .sort((a, b) => (a.name || a.displayName || '').localeCompare(b.name || b.displayName || ''));
    return dropdownPlaylists
      .map(pl => `<option value="${pl._id}">${pl.displayName || pl.name}</option>`)
      .join('');
  }
}

// Create and export a singleton instance
const playlistManager = new PlaylistManager();
// Make it globally accessible
window.playlistManager = playlistManager;


// Add global click handler for hamburger icons
document.addEventListener('click', (e) => {
  if (e.target.closest('.view-playlists-SINGLE-btn, .view-playlists-MULTI-btn')) {
    e.preventDefault();
    if (window.playlistManager) {
      window.playlistManager.show();
    } else {
      console.error('PlaylistManager not initialized');
      showToast('Unable to open playlist manager. Please try again.');
    }
  }
});

function showToast(message) {
  let toast = document.getElementById('playlist-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'playlist-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.right = 'auto';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '16px 28px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '1.1em';
    toast.style.zIndex = 99999;
    toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// Custom confirm modal
function showCustomConfirm(message) {
  return new Promise((resolve) => {
    let modal = document.getElementById('custom-confirm-modal');
    if (modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'custom-confirm-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.4)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
      <div style="background:#fff;padding:32px 28px;border-radius:12px;box-shadow:0 4px 32px rgba(0,0,0,0.18);min-width:320px;max-width:90vw;display:flex;flex-direction:column;align-items:center;">
        <div style="font-size:1.15em;font-weight:500;margin-bottom:18px;text-align:center;">${message}</div>
        <div style="display:flex;gap:18px;justify-content:center;">
          <button id="custom-confirm-yes" style="background:#e92828;color:#fff;padding:8px 22px;border:none;border-radius:7px;font-size:1.08em;cursor:pointer;">Delete</button>
          <button id="custom-confirm-no" style="background:#f5f5f5;color:#222;padding:8px 22px;border:none;border-radius:7px;font-size:1.08em;cursor:pointer;">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('custom-confirm-yes').onclick = () => { modal.remove(); resolve(true); };
    document.getElementById('custom-confirm-no').onclick = () => { modal.remove(); resolve(false); };
    modal.onclick = (e) => { if (e.target === modal) { modal.remove(); resolve(false); } };
  });
} 