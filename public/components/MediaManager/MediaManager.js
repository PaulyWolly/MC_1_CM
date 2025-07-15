/*
  MEDIAMANAGER.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

class MediaManager {
  constructor() {
    this.isInitialized = false;
    this.htmlTemplate = null;
    this.containerElement = null;
    this.currentCastData = []; // Store full cast data including profile URLs
  }

  async init() {
    if (this.isInitialized) return;
    await Promise.all([
      this.loadCSS(),
      this.loadHTML()
    ]);
    this.createFromTemplate();
    this.setupElements();
    this.setupEventListeners();
    this.isInitialized = true;
    this.show();
  }

  async loadCSS() {
    return new Promise((resolve, reject) => {
      const existingLink = document.querySelector('link[href*="MediaManager.css"]');
      if (existingLink) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = './components/MediaManager/MediaManager.css';
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  async loadHTML() {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch('./components/MediaManager/MediaManager.html');
        if (!response.ok) throw new Error('Failed to fetch MediaManager.html');
        this.htmlTemplate = await response.text();
        resolve();
      } catch (err) { reject(err); }
    });
  }

  createFromTemplate() {
    const existing = document.querySelector('.media-manager-overlay');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
  }

  setupElements() {
    this.containerElement = document.querySelector('.media-manager-overlay');
    this.closeBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-close-btn') : null;
    this.tabMovie = this.containerElement ? this.containerElement.querySelector('.media-manager-tab-movie') : null;
    this.tabTV = this.containerElement ? this.containerElement.querySelector('.media-manager-tab-tv') : null;
    this.modeSingle = this.containerElement ? this.containerElement.querySelector('.media-manager-mode-single') : null;
    this.modeAll = this.containerElement ? this.containerElement.querySelector('.media-manager-mode-all') : null;
    this.contentSingle = this.containerElement ? this.containerElement.querySelector('.media-manager-content-single') : null;
    this.contentAll = this.containerElement ? this.containerElement.querySelector('.media-manager-content-all') : null;
    this.inputTitle = this.containerElement ? this.containerElement.querySelector('#media-manager-title') : null;
    this.inputPath = this.containerElement ? this.containerElement.querySelector('#media-manager-path') : null;
    this.fetchBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-fetch-btn') : null;
    this.posterImg = this.containerElement ? this.containerElement.querySelector('.media-manager-poster-img') : null;
    this.descInput = this.containerElement ? this.containerElement.querySelector('#media-manager-description') : null;
    this.castList = this.containerElement ? this.containerElement.querySelector('.media-manager-cast-list') : null;
    this.confirmBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-confirm-btn') : null;
    this.viewJsonBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-view-json-btn') : null;
    // TV Show fields
    this.inputTVTitle = this.containerElement ? this.containerElement.querySelector('#media-manager-tv-title') : null;
    this.inputTVYear = this.containerElement ? this.containerElement.querySelector('#media-manager-tv-year') : null;
    this.inputTVTMDBId = this.containerElement ? this.containerElement.querySelector('#media-manager-tv-tmdbid') : null;
    this.inputTVDescription = this.containerElement ? this.containerElement.querySelector('#media-manager-tv-description') : null;
    this.inputTVPath = this.containerElement ? this.containerElement.querySelector('#media-manager-tv-path') : null;
    this.castListTV = this.containerElement ? this.containerElement.querySelector('.media-manager-cast-list-tv') : null;
    this.posterImgTV = this.containerElement ? this.containerElement.querySelector('.media-manager-poster-img-tv') : null;
    this.seasonsList = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-list') : null;
    this.addSeasonBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-add-season-btn') : null;
    this.confirmBtnTV = this.containerElement ? this.containerElement.querySelector('.media-manager-confirm-btn-tv') : null;
    this.fetchBtnTV = this.containerElement ? this.containerElement.querySelector('.media-manager-fetch-btn-tv') : null;
    
    // Validation elements
    this.titleError = this.containerElement ? this.containerElement.querySelector('#title-error') : null;
    this.pathError = this.containerElement ? this.containerElement.querySelector('#path-error') : null;
    
    // JSON Editor elements
    this.jsonEditorOverlay = this.containerElement ? this.containerElement.querySelector('.json-editor-overlay') : null;
    this.jsonEditorTextarea = this.containerElement ? this.containerElement.querySelector('.json-editor-textarea') : null;
    this.jsonEditorCloseBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-close-btn') : null;
    this.jsonEditorCopyBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-copy-btn') : null;
    this.jsonEditorSaveBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-save-btn') : null;
    this.jsonEditorCancelBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-cancel-btn') : null;

    // Modal for seasons/episodes
    this.manageSeasonsBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-manage-seasons-btn') : null;
    this.seasonsModalOverlay = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-modal-overlay') : null;
    this.seasonsModalCloseBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-modal-close-btn') : null;
    this.seasonsModalCancelBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-modal-cancel-btn') : null;
    this.seasonsModalSaveBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-modal-save-btn') : null;

    // TMDB Selection Modal
    this.tmdbSelectModalOverlay = this.containerElement ? this.containerElement.querySelector('.media-manager-tmdb-select-modal-overlay') : null;
    this.tmdbSelectModalContent = this.containerElement ? this.containerElement.querySelector('.media-manager-tmdb-select-modal-content') : null;
    this.tmdbSelectModalCloseBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-tmdb-select-modal-close-btn') : null;
    this.tmdbSelectModalCancelBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-tmdb-select-modal-cancel-btn') : null;
  }

  setupEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.onclick = () => this.handleClose();
    }
    if (this.tabMovie && this.tabTV) {
      this.tabMovie.onclick = () => this.switchTab('movie');
      this.tabTV.onclick = () => this.switchTab('tv');
    }
    if (this.modeSingle && this.modeAll) {
      this.modeSingle.onclick = () => this.switchMode('single');
      this.modeAll.onclick = () => this.switchMode('all');
    }
    if (this.fetchBtn) {
      this.fetchBtn.onclick = () => this.handleFetchInfo();
    }
    if (this.confirmBtn) {
      this.confirmBtn.onclick = () => this.handleConfirm();
    }
    if (this.viewJsonBtn) {
      this.viewJsonBtn.onclick = () => this.handleViewJson();
    }
    // TV Show fetch info
    if (this.fetchBtnTV) {
      this.fetchBtnTV.onclick = () => this.handleFetchInfoTV();
    }
    // TV Show confirm
    if (this.confirmBtnTV) {
      this.confirmBtnTV.onclick = () => this.handleConfirmTV();
    }
    // Add season
    if (this.addSeasonBtn) {
      this.addSeasonBtn.onclick = () => this.handleAddSeason();
    }
    
    // Add real-time validation
    if (this.inputTitle) {
      this.inputTitle.addEventListener('input', () => this.validateForm());
      this.inputTitle.addEventListener('blur', () => this.validateField('title'));
    }
    if (this.inputPath) {
      this.inputPath.addEventListener('input', () => this.validateForm());
      this.inputPath.addEventListener('blur', () => this.validateField('path'));
    }
    
    // JSON Editor event listeners
    if (this.jsonEditorCloseBtn) {
      this.jsonEditorCloseBtn.onclick = () => this.closeJsonEditor();
    }
    if (this.jsonEditorCopyBtn) {
      this.jsonEditorCopyBtn.onclick = () => this.copyJsonToClipboard();
    }
    if (this.jsonEditorSaveBtn) {
      this.jsonEditorSaveBtn.onclick = () => this.saveJsonChanges();
    }
    if (this.jsonEditorCancelBtn) {
      this.jsonEditorCancelBtn.onclick = () => this.closeJsonEditor();
    }
    
    // Add click outside to close for JSON editor
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.onclick = (e) => {
        if (e.target === this.jsonEditorOverlay) {
          this.closeJsonEditor();
        }
      };
    }

    // Manage Seasons & Episodes modal logic
    if (this.manageSeasonsBtn && this.seasonsModalOverlay) {
      this.manageSeasonsBtn.onclick = () => {
        this.openSeasonsModal();
      };
    }
    const closeSeasonsModal = () => {
      if (this.seasonsModalOverlay) this.seasonsModalOverlay.style.display = 'none';
      document.body.style.overflow = '';
    };
    if (this.seasonsModalCloseBtn) this.seasonsModalCloseBtn.onclick = closeSeasonsModal;
    if (this.seasonsModalCancelBtn) this.seasonsModalCancelBtn.onclick = closeSeasonsModal;
    if (this.seasonsModalSaveBtn) this.seasonsModalSaveBtn.onclick = () => {
      this.saveSeasonsModal();
      closeSeasonsModal();
    };

    // TMDB Selection Modal event listeners
    if (this.tmdbSelectModalCloseBtn) this.tmdbSelectModalCloseBtn.onclick = () => this.closeTMDBSelectModal();
    if (this.tmdbSelectModalCancelBtn) this.tmdbSelectModalCancelBtn.onclick = () => this.closeTMDBSelectModal();
    
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      // If JSON editor is open, close it first
      if (this.jsonEditorOverlay && this.jsonEditorOverlay.style.display === 'flex') {
        this.closeJsonEditor();
      } else {
        this.destroy();
      }
    }
  }

  handleClose() {
    this.destroy();
    if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
      setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
    }
  }

  async handleFetchInfo() {
    const title = this.inputTitle ? this.inputTitle.value.trim() : '';
    const type = this.tabMovie && this.tabMovie.classList.contains('active') ? 'movie' : 'tv';
    if (!title) {
      if (window.showToast) {
        window.showToast('Please enter a title or TMDB ID.', 'error');
        console.error('[MediaManager] Please enter a title or TMDB ID.');
      }
      return;
    }
    try {
      if (window.showToast) {
        window.showToast('Fetching info from TMDB...', 'info');
        console.info('[MediaManager] Fetching info from TMDB...');
      }
      // If input is all digits, treat as TMDB ID
      const isId = /^\d+$/.test(title);
      const body = isId ? { type, tmdbId: title } : { type, title };
      const res = await fetch('/api/media/fetch-tmdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      // Defensive check for missing data
      if (!data.success) throw new Error(data.error || 'Failed to fetch info');
      if (!data.data) {
        // Log the full response for debugging
        console.error('[MediaManager] TMDB fetch returned no data:', data);
        let errorMsg = 'No TMDB data returned.';
        if (data.error) errorMsg += ' Error: ' + data.error;
        else if (typeof data === 'object') errorMsg += ' Response: ' + JSON.stringify(data);
        throw new Error(errorMsg);
      }
      // Populate UI fields
      if (this.posterImg) this.posterImg.src = data.data.poster || '';
      if (this.descInput) this.descInput.value = data.data.description || '';
      if (this.castList) {
        this.castList.innerHTML = '';
        // Store the full cast data including profile URLs
        this.currentCastData = data.data.cast || [];
        
        this.currentCastData.forEach(actor => {
          const div = document.createElement('div');
          div.className = 'media-manager-cast-item';
          
          // Create cast item with profile image if available
          if (actor.profile) {
            div.innerHTML = `
              <img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;">
              <span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>
            `;
          } else {
            div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
          }
          
          this.castList.appendChild(div);
        });
      }
      if (window.showToast) {
        window.showToast('Fetched info from TMDB.', 'success');
        console.info('[MediaManager] Fetched info from TMDB.');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error: ' + err.message, 'error');
        console.error('[MediaManager] Error:', err.message);
      }
    }
  }

  async handleConfirm() {
    // Gather all modal data
    const type = this.tabMovie && this.tabMovie.classList.contains('active') ? 'movie' : 'tv';
    const title = this.inputTitle ? this.inputTitle.value.trim() : '';
    const absPath = this.inputPath ? this.inputPath.value.trim() : '';
    const poster = this.posterImg ? this.posterImg.src : '';
    const description = this.descInput ? this.descInput.value.trim() : '';
    // Use the stored cast data that includes profile URLs
    let cast = this.currentCastData || [];
    // Try to extract year from title or description if possible
    let year = '';
    const yearMatch = title.match(/(19|20)\d{2}/);
    if (yearMatch) year = yearMatch[0];
    // Validate form before proceeding
    if (!this.validateForm()) {
      console.error('[MediaManager] Form validation failed.');
      return;
    }
    try {
      const res = await fetch('/api/media/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, absPath, poster, description, cast, title, year })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save info');
      if (window.showToast) {
        window.showToast('Saved info successfully.', 'success');
        console.info('[MediaManager] Saved info successfully.');
        console.info('[MediaManager] Key saved:', data.keySaved || '');
      }
      this.destroy();
      // Optionally refresh DETAILS page or media library
      if (window.mediaLibraryManager && typeof window.mediaLibraryManager.refresh === 'function') {
        window.mediaLibraryManager.refresh();
      }
      // --- NEW: If Movies tab is open, re-render it so the new movie appears ---
      if (window.mediaLibraryManager && window.mediaLibraryManager.currentTab === 'movies') {
        setTimeout(() => window.mediaLibraryManager.renderModal(), 0);
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error saving: ' + err.message, 'error');
        console.error('[MediaManager] Error saving:', err.message);
      }
    }
  }

  switchTab(tab) {
    if (tab === 'movie') {
      if (this.tabMovie) this.tabMovie.classList.add('active');
      if (this.tabTV) this.tabTV.classList.remove('active');
      if (this.contentSingle) this.contentSingle.style.display = 'block';
      const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
      if (tvContent) tvContent.style.display = 'none';
    } else {
      if (this.tabMovie) this.tabMovie.classList.remove('active');
      if (this.tabTV) this.tabTV.classList.add('active');
      if (this.contentSingle) this.contentSingle.style.display = 'none';
      const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
      if (tvContent) tvContent.style.display = 'block';
    }
  }

  switchMode(mode) {
    const isTV = this.tabTV && this.tabTV.classList.contains('active');
    const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
    if (mode === 'single') {
      this.modeSingle.classList.add('active');
      this.modeAll.classList.remove('active');
      if (isTV) {
        if (tvContent) tvContent.style.display = 'block';
        if (this.contentSingle) this.contentSingle.style.display = 'none';
      } else {
        if (this.contentSingle) this.contentSingle.style.display = 'block';
        if (tvContent) tvContent.style.display = 'none';
      }
      if (this.contentAll) this.contentAll.style.display = 'none';
    } else {
      this.modeSingle.classList.remove('active');
      this.modeAll.classList.add('active');
      if (this.contentSingle) this.contentSingle.style.display = 'none';
      if (tvContent) tvContent.style.display = 'none';
      if (this.contentAll) this.contentAll.style.display = 'block';
    }
  }

  handleViewJson() {
    // Use the stored cast data that includes profile URLs
    let cast = this.currentCastData || [];
    
    // Populate the JSON editor with current cast data
    if (this.jsonEditorTextarea) {
      this.jsonEditorTextarea.value = JSON.stringify(cast, null, 2);
    }
    
    // Show the JSON editor modal
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.style.display = 'flex';
    }
  }

  closeJsonEditor() {
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.style.display = 'none';
    }
  }

  copyJsonToClipboard() {
    if (this.jsonEditorTextarea) {
      this.jsonEditorTextarea.select();
      document.execCommand('copy');
      if (window.showToast) {
        window.showToast('JSON copied to clipboard!', 'success');
        console.info('[MediaManager] JSON copied to clipboard');
      }
    }
  }

  saveJsonChanges() {
    if (!this.jsonEditorTextarea) return;
    
    try {
      const jsonText = this.jsonEditorTextarea.value.trim();
      if (!jsonText) {
        if (window.showToast) {
          window.showToast('Please enter valid JSON data.', 'error');
          console.error('[MediaManager] Empty JSON data');
        }
        return;
      }
      
      const cast = JSON.parse(jsonText);
      
      // Validate the structure
      if (!Array.isArray(cast)) {
        throw new Error('Cast data must be an array');
      }
      
      // Validate each cast member
      for (let i = 0; i < cast.length; i++) {
        const member = cast[i];
        if (typeof member !== 'object' || !member.name) {
          throw new Error(`Cast member ${i + 1} must have a "name" field`);
        }
      }
      
      // Update the stored cast data
      this.currentCastData = cast;
      
      // Update the cast list in the main modal
      if (this.castList) {
        this.castList.innerHTML = '';
        cast.forEach(actor => {
          const div = document.createElement('div');
          div.className = 'media-manager-cast-item';
          
          // Create cast item with profile image if available
          if (actor.profile) {
            div.innerHTML = `
              <img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;">
              <span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>
            `;
          } else {
            div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
          }
          
          this.castList.appendChild(div);
        });
      }
      
      // Close the JSON editor
      this.closeJsonEditor();
      
      if (window.showToast) {
        window.showToast('Cast data updated successfully!', 'success');
        console.info('[MediaManager] Cast data updated from JSON editor');
      }
      
    } catch (error) {
      if (window.showToast) {
        window.showToast('Invalid JSON: ' + error.message, 'error');
        console.error('[MediaManager] JSON validation error:', error.message);
      }
    }
  }

  validateField(fieldName) {
    const field = fieldName === 'title' ? this.inputTitle : this.inputPath;
    const errorElement = fieldName === 'title' ? this.titleError : this.pathError;
    const value = field ? field.value.trim() : '';
    
    if (!value) {
      if (field) field.classList.add('error');
      if (errorElement) errorElement.textContent = fieldName === 'title' ? 'Title or TMDB ID is required' : 'File/Folder Path is required';
      if (errorElement) errorElement.style.display = 'block';
      return false;
    }
    // For path, require a full file path ending in .mp4, .mkv, .avi, or .mov
    if (fieldName === 'path') {
      if (!/\.(mp4|mkv|avi|mov)$/i.test(value)) {
        if (field) field.classList.add('error');
        if (errorElement) errorElement.textContent = 'Please enter the full file path, including the filename and extension (e.g., .mp4)';
        if (errorElement) errorElement.style.display = 'block';
        return false;
      }
    }
    if (field) field.classList.remove('error');
    if (errorElement) errorElement.style.display = 'none';
    return true;
  }

  validateForm() {
    const titleValid = this.validateField('title');
    const pathValid = this.inputPath && this.inputPath.value.trim().length > 0;
    const isFormValid = titleValid && pathValid;
    
    // Enable/disable submit button
    if (this.confirmBtn) {
      this.confirmBtn.disabled = !isFormValid;
      this.confirmBtn.style.opacity = isFormValid ? '1' : '0.5';
      this.confirmBtn.style.cursor = isFormValid ? 'pointer' : 'not-allowed';
    }
    
    return isFormValid;
  }

  show() {
    if (this.containerElement) this.containerElement.style.display = 'flex';
    // Initialize form validation
    this.validateForm();
  }

  destroy() {
    if (this.containerElement) this.containerElement.remove();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  // --- TV Show Logic ---
  handleFetchInfoTV() {
    const title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
    const tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
    if (!title && !tmdbId) {
      window.showToast && window.showToast('Please enter a show title or TMDB ID.', 'error');
      console.error('[Toast][MediaManager] Please enter a show title or TMDB ID.');
      return;
    }
    const body = tmdbId ? { type: 'tv', tmdbId } : { type: 'tv', title };
    fetch('/api/media/fetch-tmdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Failed to fetch info');
        if (data.results) {
          this.showTMDBSelectModal(data.results);
          return;
        }
        if (!data.data) throw new Error('No TMDB data returned');
        if (this.posterImgTV) this.posterImgTV.src = data.data.poster || '';
        if (this.inputTVDescription) this.inputTVDescription.value = data.data.description || '';
        if (this.castListTV) {
          this.castListTV.innerHTML = '';
          (data.data.cast || []).forEach(actor => {
            const div = document.createElement('div');
            div.className = 'media-manager-cast-item-tv';
            div.textContent = actor.name + (actor.character ? ` as ${actor.character}` : '');
            this.castListTV.appendChild(div);
          });
        }
        if (this.inputTVYear) this.inputTVYear.value = data.data.year || '';
        if (this.inputTVTMDBId) this.inputTVTMDBId.value = data.data.tmdbId || '';
      })
      .catch(err => {
        window.showToast && window.showToast('Failed to fetch info: ' + err.message, 'error');
        console.error('[MediaManager] Failed to fetch info: ' + err.message);
      });
  }

  handleAddSeason() {
    if (!this.seasonsList) return;
    const seasonCount = this.seasonsList.querySelectorAll('.media-manager-season-block').length;
    const seasonNum = seasonCount + 1;
    const seasonDiv = document.createElement('div');
    seasonDiv.className = 'media-manager-season-block';
    seasonDiv.innerHTML = `
      <div class="media-manager-season-header">Season ${seasonNum}
        <button type="button" class="media-manager-remove-season-btn">Remove</button>
      </div>
      <div class="media-manager-episodes-list"></div>
      <button type="button" class="media-manager-add-episode-btn">Add Episode</button>
    `;
    this.seasonsList.appendChild(seasonDiv);
    // Add episode logic
    const addEpisodeBtn = seasonDiv.querySelector('.media-manager-add-episode-btn');
    const episodesList = seasonDiv.querySelector('.media-manager-episodes-list');
    addEpisodeBtn.onclick = () => {
      const episodeCount = episodesList.querySelectorAll('.media-manager-episode-block').length;
      const episodeNum = episodeCount + 1;
      const episodeDiv = document.createElement('div');
      episodeDiv.className = 'media-manager-episode-block';
      episodeDiv.innerHTML = `
        <div class="media-manager-episode-header">Episode ${episodeNum}
          <button type="button" class="media-manager-remove-episode-btn">Remove</button>
        </div>
        <input class="media-manager-input-episode-title" type="text" placeholder="Episode Title">
        <input class="media-manager-input-episode-path" type="text" placeholder="File Path">
      `;
      episodesList.appendChild(episodeDiv);
      // Remove episode
      episodeDiv.querySelector('.media-manager-remove-episode-btn').onclick = () => {
        episodeDiv.remove();
      };
    };
    // Remove season
    seasonDiv.querySelector('.media-manager-remove-season-btn').onclick = () => {
      seasonDiv.remove();
    };
  }

  // --- Seasons Modal Methods ---
  async openSeasonsModal() {
    if (!this.seasonsModalOverlay) return;
    
    this.seasonsModalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Get the show path from the title field (assuming it's a path)
    const showTitle = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
    if (!showTitle) {
      window.showToast && window.showToast('Please enter a show title/path first.', 'error');
      console.error('[Toast][MediaManager] Please enter a show title/path first.');
      return;
    }
    
    // Try to scan the structure
    const showPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
    if (!showPath) {
      window.showToast && window.showToast('Please enter the show path.', 'error');
      console.error('[Toast][MediaManager] Please enter the show path.');
      return;
    }
    await this.scanTVStructure(showPath);
  }

  async scanTVStructure(showPath) {
    try {
      console.log('[MediaManager] Scanning TV structure for:', showPath);
      
      // Show loading state
      const modalContent = this.seasonsModalOverlay?.querySelector('.media-manager-seasons-modal-content');
      if (modalContent) {
        modalContent.innerHTML = '<div class="media-manager-loading">Scanning file structure...</div>';
      }
      
      const response = await fetch('/api/media/scan-tv-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showPath })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to scan TV structure');
      }
      if (!data.data) {
        throw new Error('No scan data returned from backend');
      }
      
      console.log('[MediaManager] Scan results:', data.data);
      
      // Populate the modal with scanned data
      this.populateSeasonsModal(data.data);
      
      if (window.showToast) {
        window.showToast(`Found ${data.data.totalSeasons} seasons with ${data.data.totalEpisodes} episodes`, 'success');
        console.info('[Toast][MediaManager] Found ' + data.data.totalSeasons + ' seasons with ' + data.data.totalEpisodes + ' episodes');
      }
      
    } catch (error) {
      console.error('[MediaManager] Scan error:', error);
      
      // Show error state
      const modalContent = this.seasonsModalOverlay?.querySelector('.media-manager-seasons-modal-content');
      if (modalContent) {
        modalContent.innerHTML = `
          <div class="media-manager-error">
            <p>Failed to scan TV structure: ${error.message}</p>
            <p>Please ensure the path exists and contains season folders.</p>
            <button class="media-manager-btn media-manager-retry-scan-btn" type="button">Retry Scan</button>
          </div>
        `;
        
        // Add retry button handler
        const retryBtn = modalContent.querySelector('.media-manager-retry-scan-btn');
        if (retryBtn) {
          retryBtn.onclick = () => this.scanTVStructure(showPath);
        }
      }
      
      if (window.showToast) {
        window.showToast('Failed to scan TV structure: ' + error.message, 'error');
        console.error('[MediaManager] Failed to scan TV structure: ' + error.message);
      }
    }
  }

  populateSeasonsModal(scanData) {
    const modalContent = this.seasonsModalOverlay?.querySelector('.media-manager-seasons-modal-content');
    if (!modalContent) return;
    
    let html = `
      <div class="media-manager-scan-summary">
        <h4>Scan Results</h4>
        <p>Path: ${scanData.showPath}</p>
        <p>Found: ${scanData.totalSeasons} seasons, ${scanData.totalEpisodes} episodes</p>
      </div>
      <div class="media-manager-seasons-container">
    `;
    
    scanData.seasons.forEach(season => {
      html += `
        <div class="media-manager-season-item" data-season="${season.seasonNumber}">
          <div class="media-manager-season-header">
            <h5>Season ${season.seasonNumber} (${season.seasonName})</h5>
            <span class="media-manager-episode-count">${season.episodes.length} episodes</span>
          </div>
          <div class="media-manager-episodes-container">
      `;
      
      season.episodes.forEach(episode => {
        const fileSize = this.formatFileSize(episode.size);
        const modifiedDate = new Date(episode.modified).toLocaleDateString();
        
        html += `
          <div class="media-manager-episode-item" data-episode="${episode.episodeNumber}">
            <div class="media-manager-episode-info">
              <span class="media-manager-episode-number">Episode ${episode.episodeNumber}</span>
              <span class="media-manager-episode-filename">${episode.filename}</span>
              <span class="media-manager-episode-details">${fileSize} • ${modifiedDate}</span>
            </div>
            <div class="media-manager-episode-actions">
              <button class="media-manager-btn media-manager-edit-episode-btn" type="button" 
                      data-season="${season.seasonNumber}" data-episode="${episode.episodeNumber}">
                Edit
              </button>
            </div>
          </div>
        `;
      });
      
      html += `
          </div>
        </div>
      `;
    });
    
    html += `
      </div>
      <div class="media-manager-seasons-actions">
        <button class="media-manager-btn media-manager-add-season-btn" type="button">Add Season</button>
        <button class="media-manager-btn media-manager-refresh-scan-btn" type="button">Refresh Scan</button>
      </div>
    `;
    
    modalContent.innerHTML = html;
    
    // Add event listeners for the new buttons
    this.setupSeasonsModalEventListeners(scanData);
  }

  setupSeasonsModalEventListeners(scanData) {
    const modalContent = this.seasonsModalOverlay?.querySelector('.media-manager-seasons-modal-content');
    if (!modalContent) return;
    
    // Refresh scan button
    const refreshBtn = modalContent.querySelector('.media-manager-refresh-scan-btn');
    if (refreshBtn) {
      refreshBtn.onclick = () => this.scanTVStructure(scanData.showPath);
    }
    
    // Add season button
    const addSeasonBtn = modalContent.querySelector('.media-manager-add-season-btn');
    if (addSeasonBtn) {
      addSeasonBtn.onclick = () => this.addSeasonToModal();
    }
    
    // Edit episode buttons
    const editEpisodeBtns = modalContent.querySelectorAll('.media-manager-edit-episode-btn');
    editEpisodeBtns.forEach(btn => {
      btn.onclick = () => {
        const seasonNum = btn.dataset.season;
        const episodeNum = btn.dataset.episode;
        this.editEpisodeInModal(seasonNum, episodeNum, scanData);
      };
    });
  }

  addSeasonToModal() {
    const seasonsContainer = this.seasonsModalOverlay?.querySelector('.media-manager-seasons-container');
    if (!seasonsContainer) return;
    
    const seasonCount = seasonsContainer.querySelectorAll('.media-manager-season-item').length;
    const newSeasonNum = seasonCount + 1;
    
    const seasonHtml = `
      <div class="media-manager-season-item" data-season="${newSeasonNum}">
        <div class="media-manager-season-header">
          <h5>Season ${newSeasonNum}</h5>
          <span class="media-manager-episode-count">0 episodes</span>
        </div>
        <div class="media-manager-episodes-container">
          <div class="media-manager-no-episodes">No episodes found</div>
        </div>
        <div class="media-manager-season-actions">
          <button class="media-manager-btn media-manager-add-episode-btn" type="button" data-season="${newSeasonNum}">
            Add Episode
          </button>
        </div>
      </div>
    `;
    
    seasonsContainer.insertAdjacentHTML('beforeend', seasonHtml);
    
    // Add event listener for the new add episode button
    const newAddEpisodeBtn = seasonsContainer.querySelector(`[data-season="${newSeasonNum}"] .media-manager-add-episode-btn`);
    if (newAddEpisodeBtn) {
      newAddEpisodeBtn.onclick = () => this.addEpisodeToSeason(newSeasonNum);
    }
  }

  addEpisodeToSeason(seasonNum) {
    const seasonItem = this.seasonsModalOverlay?.querySelector(`[data-season="${seasonNum}"]`);
    if (!seasonItem) return;
    
    const episodesContainer = seasonItem.querySelector('.media-manager-episodes-container');
    if (!episodesContainer) return;
    
    // Remove "no episodes" message if present
    const noEpisodes = episodesContainer.querySelector('.media-manager-no-episodes');
    if (noEpisodes) noEpisodes.remove();
    
    const episodeCount = episodesContainer.querySelectorAll('.media-manager-episode-item').length;
    const newEpisodeNum = episodeCount + 1;
    
    const episodeHtml = `
      <div class="media-manager-episode-item" data-episode="${newEpisodeNum}">
        <div class="media-manager-episode-info">
          <input class="media-manager-input-episode-number" type="number" value="${newEpisodeNum}" min="1">
          <input class="media-manager-input-episode-filename" type="text" placeholder="Filename (e.g., S${seasonNum.toString().padStart(2, '0')}E${newEpisodeNum.toString().padStart(2, '0')}.mkv)">
          <input class="media-manager-input-episode-path" type="text" placeholder="Full file path">
        </div>
        <div class="media-manager-episode-actions">
          <button class="media-manager-btn media-manager-remove-episode-btn" type="button">Remove</button>
        </div>
      </div>
    `;
    
    episodesContainer.insertAdjacentHTML('beforeend', episodeHtml);
    
    // Add remove button handler
    const newEpisode = episodesContainer.querySelector(`[data-episode="${newEpisodeNum}"]`);
    if (newEpisode) {
      const removeBtn = newEpisode.querySelector('.media-manager-remove-episode-btn');
      if (removeBtn) {
        removeBtn.onclick = () => newEpisode.remove();
      }
    }
    
    // Update episode count
    this.updateSeasonEpisodeCount(seasonNum);
  }

  editEpisodeInModal(seasonNum, episodeNum, scanData) {
    const season = scanData.seasons.find(s => s.seasonNumber == seasonNum);
    const episode = season?.episodes.find(e => e.episodeNumber == episodeNum);
    
    if (!episode) return;
    
    // For now, just show episode details in a simple alert
    // In a full implementation, this would open an edit form
    const details = `
Episode ${episode.episodeNumber}
File: ${episode.filename}
Path: ${episode.filePath}
Size: ${this.formatFileSize(episode.size)}
Modified: ${new Date(episode.modified).toLocaleString()}
    `;
    
    alert(details);
  }

  updateSeasonEpisodeCount(seasonNum) {
    const seasonItem = this.seasonsModalOverlay?.querySelector(`[data-season="${seasonNum}"]`);
    if (!seasonItem) return;
    
    const episodesContainer = seasonItem.querySelector('.media-manager-episodes-container');
    const episodeCount = episodesContainer.querySelectorAll('.media-manager-episode-item').length;
    
    const countSpan = seasonItem.querySelector('.media-manager-episode-count');
    if (countSpan) {
      countSpan.textContent = `${episodeCount} episode${episodeCount !== 1 ? 's' : ''}`;
    }
  }

  saveSeasonsModal() {
    // Gather all seasons and episodes from the modal
    const seasons = [];
    const seasonItems = this.seasonsModalOverlay?.querySelectorAll('.media-manager-season-item');
    
    if (seasonItems) {
      seasonItems.forEach(seasonItem => {
        const seasonNum = parseInt(seasonItem.dataset.season);
        const episodes = [];
        
        const episodeItems = seasonItem.querySelectorAll('.media-manager-episode-item');
        episodeItems.forEach(episodeItem => {
          const episodeNum = parseInt(episodeItem.dataset.episode);
          const filename = episodeItem.querySelector('.media-manager-episode-filename')?.textContent || '';
          const filePath = episodeItem.querySelector('.media-manager-input-episode-path')?.value || '';
          
          episodes.push({
            episodeNumber: episodeNum,
            filename: filename,
            filePath: filePath
          });
        });
        
        seasons.push({
          seasonNumber: seasonNum,
          episodes: episodes
        });
      });
    }
    
    // Store the seasons data for use in handleConfirmTV
    this.scannedSeasonsData = seasons;
    
    console.log('[MediaManager] Saved seasons data:', seasons);
    
    if (window.showToast) {
      window.showToast(`Saved ${seasons.length} seasons with ${seasons.reduce((sum, s) => sum + s.episodes.length, 0)} episodes`, 'success');
      console.info('[Toast][MediaManager] Saved ' + seasons.length + ' seasons with ' + seasons.reduce((sum, s) => sum + s.episodes.length, 0) + ' episodes');
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  handleConfirmTV() {
    // Gather all TV show data
    const title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
    const year = this.inputTVYear ? this.inputTVYear.value.trim() : '';
    const tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
    const description = this.inputTVDescription ? this.inputTVDescription.value.trim() : '';
    // Cast
    const cast = [];
    if (this.castListTV) {
      this.castListTV.querySelectorAll('.media-manager-cast-item-tv').forEach(div => {
        const [name, character] = div.textContent.split(' as ');
        cast.push({ name: name.trim(), character: character ? character.trim() : '' });
      });
    }
    // Poster (URL or path)
    const poster = this.posterImgTV ? this.posterImgTV.src : '';
    // Seasons/episodes - use scanned data if available, otherwise fall back to manual entry
    const seasons = this.scannedSeasonsData || [];
    if (seasons.length === 0 && this.seasonsList) {
      // Fallback to manual entry
      this.seasonsList.querySelectorAll('.media-manager-season-block').forEach((seasonDiv, i) => {
        const seasonNumber = i + 1;
        const episodes = [];
        seasonDiv.querySelectorAll('.media-manager-episode-block').forEach((epDiv, j) => {
          const episodeNumber = j + 1;
          const title = epDiv.querySelector('.media-manager-input-episode-title')?.value.trim() || '';
          const filePath = epDiv.querySelector('.media-manager-input-episode-path')?.value.trim() || '';
          episodes.push({ episodeNumber, title, filePath });
        });
        seasons.push({ seasonNumber, episodes });
      });
    }
    // Validation
    if (!title || seasons.length === 0) {
      window.showToast && window.showToast('Show title and at least one season are required.', 'error');
      console.error('[Toast][MediaManager] Show title and at least one season are required.');
      return;
    }
    // Build payload
    const showPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
    const payload = { type: 'tv', tmdbId, title, year, description, cast, poster, seasons, showPath };
    fetch('/api/media/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Failed to save TV show');
        window.showToast && window.showToast('TV show saved successfully!', 'success');
        console.info('[Toast][MediaManager] TV show saved successfully!');
        this.destroy();
      })
      .catch(err => {
        window.showToast && window.showToast('Failed to save TV show: ' + err.message, 'error');
        console.error('[MediaManager] Failed to save TV show: ' + err.message);
      });
  }

  showTMDBSelectModal(results) {
    if (!this.tmdbSelectModalOverlay || !this.tmdbSelectModalContent) return;
    this.tmdbSelectModalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.tmdbSelectModalContent.innerHTML = results.map(r => `
      <div class="media-manager-tmdb-result-card" data-tmdbid="${r.tmdbId}">
        <img class="media-manager-tmdb-result-poster" src="${r.poster}" alt="${r.title}">
        <div class="media-manager-tmdb-result-title">${r.title}</div>
        <div class="media-manager-tmdb-result-year">${r.year || ''}</div>
        <div class="media-manager-tmdb-result-description">${r.description || ''}</div>
        <div class="media-manager-tmdb-result-vote">Rating: ${r.vote_average || 'N/A'}</div>
      </div>
    `).join('');
    // Add click handlers
    this.tmdbSelectModalContent.querySelectorAll('.media-manager-tmdb-result-card').forEach(card => {
      card.onclick = () => {
        const tmdbId = card.getAttribute('data-tmdbid');
        this.handleSelectTMDBResult(tmdbId);
      };
    });
  }
  closeTMDBSelectModal() {
    if (this.tmdbSelectModalOverlay) this.tmdbSelectModalOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }
  async handleSelectTMDBResult(tmdbId) {
    this.closeTMDBSelectModal();
    // Fetch full details for the selected TMDB ID
    if (!tmdbId) return;
    if (this.fetchBtnTV) this.fetchBtnTV.disabled = true;
    try {
      const res = await fetch('/api/media/fetch-tmdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'tv', tmdbId })
      });
      const data = await res.json();
      if (!data.success || !data.data) throw new Error(data.error || 'Failed to fetch details');
      if (this.posterImgTV) this.posterImgTV.src = data.data.poster || '';
      if (this.inputTVDescription) this.inputTVDescription.value = data.data.description || '';
      if (this.castListTV) {
        this.castListTV.innerHTML = '';
        (data.data.cast || []).forEach(actor => {
          const div = document.createElement('div');
          div.className = 'media-manager-cast-item-tv';
          div.textContent = actor.name + (actor.character ? ` as ${actor.character}` : '');
          this.castListTV.appendChild(div);
        });
      }
      if (this.inputTVYear) this.inputTVYear.value = data.data.year || '';
      if (this.inputTVTMDBId) this.inputTVTMDBId.value = data.data.tmdbId || '';
      if (window.showToast) {
        window.showToast('TMDB details loaded.', 'success');
        console.info('[Toast][MediaManager] TMDB details loaded.');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Failed to load TMDB details: ' + err.message, 'error');
        console.error('[MediaManager] Failed to load TMDB details: ' + err.message);
      }
    } finally {
      if (this.fetchBtnTV) this.fetchBtnTV.disabled = false;
    }
  }
}

if (typeof window !== 'undefined') {
  window.MediaManager = MediaManager;
} 