/*
  MEDIAMANAGER.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

class MediaManager {
  constructor() {
    this.isInitialized = false;
    this.htmlTemplate = null;
    this.containerElement = null;
    this.currentCastData = []; // Store full cast data including profile URLs
    this.activeSubTab = 'single';
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
    this.titleErrorTV = this.containerElement ? this.containerElement.querySelector('#tv-title-error') : null;
    this.pathErrorTV = this.containerElement ? this.containerElement.querySelector('#tv-path-error') : null;
    
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

    // Hidden TMDB ID field
    this.inputTMDBId = this.containerElement ? this.containerElement.querySelector('#media-manager-tmdbid') : null;
    this.tmdbIdRow = this.containerElement ? this.containerElement.querySelector('.media-manager-tmdbid-row') : null;
    this.tmdbIdMsg = this.containerElement ? this.containerElement.querySelector('.media-manager-tmdbid-msg') : null;

    // TMDB ID reveal button logic
    const tmdbIdRevealBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-tmdbid-reveal-btn') : null;
    const tmdbIdInlineRow = this.containerElement ? this.containerElement.querySelector('.media-manager-tmdbid-inline-row') : null;
    if (tmdbIdRevealBtn && tmdbIdInlineRow) {
        tmdbIdRevealBtn.onclick = () => {
            tmdbIdRevealBtn.classList.add('hidden');
            tmdbIdInlineRow.classList.remove('hidden');
            const input = tmdbIdInlineRow.querySelector('#media-manager-tmdbid');
            if (input) input.focus();
        };
    }
    this.contentAll = this.containerElement ? this.containerElement.querySelector('.media-manager-content-all') : null;
    
    // NEW: Grid elements for All mode
    this.step1ScanBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-step1-scan-btn') : null;
    this.scanMoviesBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-scan-movies-btn') : null;
    this.fixCastProfilesBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-fix-cast-profiles-btn') : null;
    this.clearSelectionBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-clear-selection-btn') : null;
    this.closeGridBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-close-grid-btn') : null;
    
    // NEW: Progress elements
    this.progressContainer = this.containerElement ? this.containerElement.querySelector('.media-manager-progress-container') : null;
    this.progressBar = this.containerElement ? this.containerElement.querySelector('.media-manager-progress') : null;
    this.progressSummary = this.containerElement ? this.containerElement.querySelector('.media-manager-summary') : null;
  }

  setupEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.onclick = () => this.handleClose();
    }
    if (this.tabMovie) {
      this.tabMovie.onclick = () => {
        this.switchTab('movie');
        this.switchMode(this.activeSubTab); // Restore last sub-tab
      };
    }
    if (this.tabTV) {
      this.tabTV.onclick = () => {
        this.switchTab('tv');
        this.switchMode(this.activeSubTab); // Restore last sub-tab
      };
    }
    if (this.modeSingle) {
      this.modeSingle.onclick = () => {
        this.activeSubTab = 'single';
        this.switchMode('single');
      };
    }
    
    // Shared button event listeners (work for both Movie and TV Show)
    if (this.fetchBtn) {
      this.fetchBtn.onclick = () => {
        const isTV = this.tabTV && this.tabTV.classList.contains('active');
        if (isTV) {
          this.handleFetchInfoTV();
        } else {
          this.handleFetchInfo();
        }
      };
    }
    
    // TV Show specific Fetch Info button
    if (this.fetchBtnTV) {
      this.fetchBtnTV.onclick = () => {
        this.handleFetchInfoTV();
      };
    }
    
    // NEW: Grid functionality event listeners
    if (this.step1ScanBtn) {
      this.step1ScanBtn.onclick = () => this.handleStep1Scan();
    }
    
    if (this.scanMoviesBtn) {
      this.scanMoviesBtn.onclick = () => this.handleScanMovies();
    }
    
    if (this.fixCastProfilesBtn) {
      this.fixCastProfilesBtn.onclick = () => this.handleFixCastProfiles();
    }
    
    if (this.clearSelectionBtn) {
      this.clearSelectionBtn.onclick = () => this.handleClearSelection();
    }
    
    if (this.closeGridBtn) {
      this.closeGridBtn.onclick = () => this.handleClose();
    }
    if (this.confirmBtn) {
      this.confirmBtn.onclick = () => {
        const isTV = this.tabTV && this.tabTV.classList.contains('active');
        if (isTV) {
          this.handleConfirmTV();
        } else {
          this.handleConfirm();
        }
      };
    }
    if (this.viewJsonBtn) {
      this.viewJsonBtn.onclick = () => {
        const isTV = this.tabTV && this.tabTV.classList.contains('active');
        if (isTV) {
          this.handleViewJsonTV();
        } else {
          this.handleViewJson();
        }
      };
    }
    
    // TV Show specific event listeners (for elements that don't exist in Movie)
    // Note: Shared buttons (Fetch Info, Confirm, View/Edit JSON) are handled above
    
    if (this.modeAll) {
      
      // HIDE the button for now
      this.modeAll.style.display = 'none';

      const fetchAllBtn = document.querySelector('.media-manager-fetch-all-btn');
      if (fetchAllBtn) fetchAllBtn.onclick = () => this.handleFetchAllInfo();
      
      // NEW: Add event listener for scan movies button
      const scanMoviesBtn = document.querySelector('.media-manager-scan-movies-btn');
      if (scanMoviesBtn) scanMoviesBtn.onclick = () => this.handleFetchAllInfo();
    }
    
    // Add season
    if (this.addSeasonBtn) {
      this.addSeasonBtn.onclick = () => this.handleAddSeason();
    }
    
    // Add real-time validation for Movie fields
    if (this.inputTitle) {
      this.inputTitle.addEventListener('input', () => this.validateForm());
      this.inputTitle.addEventListener('blur', () => this.validateField('title'));
      // Add Enter key support for Movie title field
      this.inputTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const isTV = this.tabTV && this.tabTV.classList.contains('active');
          if (isTV) {
            this.handleFetchInfoTV();
          } else {
            this.handleFetchInfo();
          }
        }
      });
    }
    if (this.inputPath) {
      this.inputPath.addEventListener('input', () => this.validateForm());
      this.inputPath.addEventListener('blur', () => this.validateField('path'));
    }
    
    // Add real-time validation for TV Show fields
    if (this.inputTVTitle) {
      this.inputTVTitle.addEventListener('input', () => this.validateFormTV());
      this.inputTVTitle.addEventListener('blur', () => this.validateFieldTV('title'));
      // Add Enter key support for TV Show title field
      this.inputTVTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const isTV = this.tabTV && this.tabTV.classList.contains('active');
          if (isTV) {
            this.handleFetchInfoTV();
          } else {
            this.handleFetchInfo();
          }
        }
      });
    }
    if (this.inputTVPath) {
      this.inputTVPath.addEventListener('input', () => this.validateFormTV());
      this.inputTVPath.addEventListener('blur', () => this.validateFieldTV('path'));
      // Add Enter key support for TV Show path field
      this.inputTVPath.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleFetchInfoTV();
        }
      });
    }
    
    // JSON Editor event listeners for Movie
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
    
    // JSON Editor event listeners for TV Show
    if (this.jsonEditorCloseBtnTV) {
      this.jsonEditorCloseBtnTV.onclick = () => this.closeJsonEditorTV();
    }
    if (this.jsonEditorCopyBtnTV) {
      this.jsonEditorCopyBtnTV.onclick = () => this.copyJsonToClipboardTV();
    }
    if (this.jsonEditorSaveBtnTV) {
      this.jsonEditorSaveBtnTV.onclick = () => this.saveJsonChangesTV();
    }
    if (this.jsonEditorCancelBtnTV) {
      this.jsonEditorCancelBtnTV.onclick = () => this.closeJsonEditorTV();
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
    // if (this.tmdbSelectModalCloseBtn) this.tmdbSelectModalCloseBtn.onclick = () => this.closeTMDBSelectModal();
    // if (this.tmdbSelectModalCancelBtn) this.tmdbSelectModalCancelBtn.onclick = () => this.closeTMDBSelectModal();
    
    document.addEventListener('keydown', this.handleKeyDown);

    // TV Show Posters Modal event listeners
    const tvPostersBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-tv-posters-btn') : null;
    const tvPostersModalOverlay = this.containerElement ? this.containerElement.querySelector('.media-manager-tv-posters-modal-overlay') : null;
    const tvPostersModalCloseBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-tv-posters-modal-close-btn') : null;
    const tvPostersModalCancelBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-tv-posters-modal-cancel-btn') : null;
    const tvPostersModalSaveBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-tv-posters-modal-save-btn') : null;
    
    console.log('[MediaManager] TV Posters Button found:', !!tvPostersBtn);
    console.log('[MediaManager] TV Posters Modal Overlay found:', !!tvPostersModalOverlay);
    
    if (tvPostersBtn) {
      tvPostersBtn.onclick = () => {
        console.log('[MediaManager] TV Posters button clicked!');
        this.openTVPostersModal();
      };
    } else {
      console.warn('[MediaManager] TV Posters button not found!');
    }
    
    if (tvPostersModalCloseBtn) {
      tvPostersModalCloseBtn.onclick = () => this.closeTVPostersModal();
    }
    
    if (tvPostersModalCancelBtn) {
      tvPostersModalCancelBtn.onclick = () => this.closeTVPostersModal();
    }
    
    if (tvPostersModalSaveBtn) {
      tvPostersModalSaveBtn.onclick = () => this.saveTVPosters();
    }
    
    // Add click outside to close for TV Posters modal
    if (tvPostersModalOverlay) {
      tvPostersModalOverlay.onclick = (e) => {
        if (e.target === tvPostersModalOverlay) {
          this.closeTVPostersModal();
        }
      };
    }

    function setupBatchSelectAll() {
      const batchSelectAll = document.querySelector('.batch-select-all-checkbox');
      const rowCheckboxes = document.querySelectorAll('.movie-grid-col-select input[type="checkbox"]');
      if (batchSelectAll && rowCheckboxes.length) {
        batchSelectAll.addEventListener('change', function() {
          rowCheckboxes.forEach(cb => { cb.checked = batchSelectAll.checked; });
        });
        rowCheckboxes.forEach(cb => {
          cb.addEventListener('change', function() {
            const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
            batchSelectAll.checked = allChecked;
          });
        });
      }
    }

    function setupBatchActionDropdown() {
      const dropdown = document.querySelector('.batch-action-dropdown');
      const rowCheckboxes = document.querySelectorAll('.movie-grid-col-select input[type="checkbox"]');
      if (dropdown && rowCheckboxes.length) {
        dropdown.addEventListener('change', function() {
          const action = dropdown.value;
          if (!action) return;
          const selectedCount = Array.from(rowCheckboxes).filter(cb => cb.checked).length;
          
          if (selectedCount === 0) {
            alert('Please select at least one movie first.');
            dropdown.selectedIndex = 0;
            return;
          }
          
          // Call the batch action handler
          if (window.mediaManager && window.mediaManager.handleBatchAction) {
            window.mediaManager.handleBatchAction(action, selectedCount);
          } else {
          alert(`Batch action: ${action}\nRows selected: ${selectedCount}`);
          }
          
          dropdown.selectedIndex = 0;
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupBatchSelectAll);
      document.addEventListener('DOMContentLoaded', setupBatchActionDropdown);
    } else {
      setupBatchSelectAll();
      setupBatchActionDropdown();
    }
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
    const type = this.tabMovie && this.tabMovie.classList.contains('active') ? 'movie' : 'tv';
    let title, tmdbId;
    
    if (type === 'movie') {
      title = this.inputTitle ? this.inputTitle.value.trim() : '';
      tmdbId = this.inputTMDBId ? this.inputTMDBId.value.trim() : '';
    } else {
      title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
      tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
    }
    
    if (!title && !tmdbId) {
      this.showModalAlert('Please enter a title.', 'error');
      return;
    }
    try {
      this.showModalAlert('Fetching info from TMDB...', 'info');
      let body;
      if (tmdbId) {
        body = { type, tmdbId };
      } else {
      const isId = /^\d+$/.test(title);
        body = isId ? { type, tmdbId: title } : { type, title };
      }


      console.log('[FETCH - TMDB] Calling TMDB')
      const res = await fetch('/api/media/fetch-tmdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      // --- NEW: If multiple results, show selection modal for movies ---
      if (!tmdbId && !(/^\d+$/.test(title)) && data.results && Array.isArray(data.results) && data.results.length > 1) {
        this.showTMDBSelectModalMovie(data.results);
        this.hideModalAlert();
        return;
      }
      // Defensive check for missing data
      if (!data.success || !data.data) {
        this.showNoPosterManualTMDB();
        throw new Error('No TMDB data returned.');
      }
      // Hide TMDB ID field, message, and manual button on success
      if (this.tmdbIdRow) this.tmdbIdRow.classList.add('hidden');
      if (this.tmdbIdMsg) this.tmdbIdMsg.classList.add('hidden');
      this.hideNoPosterManualTMDB();
      // Populate UI fields based on active tab
      const isTV = this.tabTV && this.tabTV.classList.contains('active');
      
      if (this.posterImg) this.posterImg.src = data.data.poster || '';
      
      if (isTV) {
        // Use TV Show elements
        if (this.inputTVDescription) this.inputTVDescription.value = data.data.description || '';
        if (this.castListTV) {
          this.castListTV.innerHTML = '';
          // Store the full cast data including profile URLs
          this.currentCastData = data.data.cast || [];
          
          this.currentCastData.forEach(actor => {
            const div = document.createElement('div');
            div.className = 'media-manager-cast-item-tv';
            
            // Create cast item with profile image if available
            if (actor.profile) {
              div.innerHTML = `
                <img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;">
                <span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>
              `;
            } else {
              div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
            }
            
            this.castListTV.appendChild(div);
          });
        }
      } else {
        // Use Movie elements
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
      }
      // --- NEW: If no poster, show manual TMDB ID option ---
      if (this.posterImg && (!this.posterImg.src || this.posterImg.src.endsWith('undefined') || this.posterImg.src.endsWith('/'))) {
          this.showNoPosterManualTMDB();
      } else {
          this.hideNoPosterManualTMDB();
      }
      this.showModalAlert('Fetched info from TMDB.', 'success');
    } catch (err) {
      this.showModalAlert('Error: ' + err.message, 'error');
    }
  }

  async handleConfirm() {
    // Gather all modal data
    const type = this.tabMovie && this.tabMovie.classList.contains('active') ? 'movie' : 'tv';
    let title, absPath, description, year;
    
    if (type === 'movie') {
      title = this.inputTitle ? this.inputTitle.value.trim() : '';
      absPath = this.inputPath ? this.inputPath.value.trim() : '';
      description = this.descInput ? this.descInput.value.trim() : '';
    } else {
      title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
      absPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
      description = this.inputTVDescription ? this.inputTVDescription.value.trim() : '';
      year = this.inputTVYear ? this.inputTVYear.value.trim() : '';
    }
    
    const poster = this.posterImg ? this.posterImg.src : '';
    let cast = [];
    if (type === 'movie') {
      if (this.castList) {
        cast = Array.from(this.castList.querySelectorAll('.media-manager-cast-item')).map(div => {
          const img = div.querySelector('img');
          const profile = img ? img.src : null;
          let name = '';
          let character = '';
          // Try to extract from <span>
          const span = div.querySelector('span');
          if (span) {
            const match = span.textContent.match(/^(.*?) \((.*?)\)$/);
            if (match) {
              name = match[1];
              character = match[2];
            } else {
              name = span.textContent;
            }
          } else {
            // fallback: try div.textContent
            const match = div.textContent.match(/^(.*?) \((.*?)\)$/);
            if (match) {
              name = match[1];
              character = match[2];
            } else {
              name = div.textContent;
            }
          }
          return { name, character, profile };
        });
      }
    } else {
      cast = this.currentCastData || [];
    }
    // Try to extract year from title if not already set (for movies)
    if (type === 'movie' && !year) {
    const yearMatch = title.match(/(19|20)\d{2}/);
    if (yearMatch) year = yearMatch[0];
    }
    // Validate form before proceeding
    if (!this.validateForm()) {
      console.error('[MediaManager] Form validation failed.');
      return;
    }
    // --- Spinner logic ---
    if (this.confirmBtn) {
      this.confirmBtn.disabled = true;
      this.confirmBtn.innerHTML = '<span class="mm-btn-spinner"></span> Saving...';
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
      // Always reload movie posters and refresh grid after save
      if (window.mediaLibraryManager && typeof window.mediaLibraryManager.reloadMoviePostersAndRefreshGrid === 'function') {
        window.mediaLibraryManager.reloadMoviePostersAndRefreshGrid();
      }
      // Immediately close MediaManager and reopen MediaLibrary modal
      this.destroy();
      if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
        setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error saving: ' + err.message, 'error');
        console.error('[MediaManager] Error saving:', err.message);
      }
      if (this.confirmBtn) {
        this.confirmBtn.disabled = false;
        this.confirmBtn.innerHTML = 'Confirm';
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
              // Restore Movie label
        const titleLabel = this.containerElement.querySelector('label[for="media-manager-title"]');
        if (titleLabel) titleLabel.childNodes[0].nodeValue = 'MOVIE Title';
        // Restore placeholder text for Movie
        if (this.inputTitle) this.inputTitle.placeholder = 'e.g. Batman: The Movie';
        if (this.inputPath) this.inputPath.placeholder = 'e.g. S:/MEDIA/MOVIES/Airplane! (1980) [1080p]';
        // Restore Movie Description label
        const descLabel = this.containerElement.querySelector('label[for="media-manager-description"]');
      if (descLabel) descLabel.childNodes[0].nodeValue = 'Description';
      // Restore Movie Cast label
      const castLabel = this.containerElement.querySelector('.media-manager-cast-section label.media-manager-label');
      if (castLabel) castLabel.childNodes[0].nodeValue = 'Cast';
      // Show Movie description, hide TV description
      const movieDesc = this.containerElement.querySelector('#media-manager-description');
      const tvDesc = this.containerElement.querySelector('#media-manager-tv-description');
      if (movieDesc) movieDesc.style.display = 'block';
      if (tvDesc) tvDesc.style.display = 'none';
      // Show Movie cast list, hide TV cast list
      const movieCast = this.containerElement.querySelector('.media-manager-cast-list');
      const tvCast = this.containerElement.querySelector('.media-manager-cast-list-tv');
      if (movieCast) movieCast.style.display = 'block';
      if (tvCast) tvCast.style.display = 'none';
      // Poster controls
      const moviePosterImg = this.containerElement.querySelector('.media-manager-poster-img');
      const movieEditPosterBtn = this.containerElement.querySelector('.media-manager-edit-poster-btn');
      const tvPostersBtn = this.containerElement.querySelector('.media-manager-tv-posters-btn');
      if (moviePosterImg) moviePosterImg.style.display = 'block';
      if (movieEditPosterBtn) movieEditPosterBtn.style.display = 'block';
      if (tvPostersBtn) tvPostersBtn.style.display = 'none';
    } else {
      if (this.tabMovie) this.tabMovie.classList.remove('active');
      if (this.tabTV) this.tabTV.classList.add('active');
      // Show the SAME content as Movie (no left shift, ready for section swap)
      if (this.contentSingle) this.contentSingle.style.display = 'block';
      const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
      if (tvContent) tvContent.style.display = 'none';
              // Change label to TV Title
        const titleLabel = this.containerElement.querySelector('label[for="media-manager-title"]');
        if (titleLabel) titleLabel.childNodes[0].nodeValue = 'TV-SHOW Title';
        // Change placeholder text for TV Show
        if (this.inputTitle) this.inputTitle.placeholder = 'e.g. The Big Bang Theory';
        if (this.inputPath) this.inputPath.placeholder = 'e.g. S:/MEDIA/TV-SHOWS/The Big Bang Theory (2007)';
        // Change Description label to TV Description
        const descLabel = this.containerElement.querySelector('label[for="media-manager-description"]');
      if (descLabel) descLabel.childNodes[0].nodeValue = 'TV Description';
      // Change Cast label to TV Cast
      const castLabel = this.containerElement.querySelector('.media-manager-cast-section label.media-manager-label');
      if (castLabel) castLabel.childNodes[0].nodeValue = 'TV Cast';
      // Hide Movie description, show TV description
      const movieDesc = this.containerElement.querySelector('#media-manager-description');
      const tvDesc = this.containerElement.querySelector('#media-manager-tv-description');
      if (movieDesc) movieDesc.style.display = 'none';
      if (tvDesc) tvDesc.style.display = 'block';
      // Hide Movie cast list, show TV cast list
      const movieCast = this.containerElement.querySelector('.media-manager-cast-list');
      const tvCast = this.containerElement.querySelector('.media-manager-cast-list-tv');
      if (movieCast) movieCast.style.display = 'none';
      if (tvCast) tvCast.style.display = 'block';
      // Poster controls
      const moviePosterImg = this.containerElement.querySelector('.media-manager-poster-img');
      const movieEditPosterBtn = this.containerElement.querySelector('.media-manager-edit-poster-btn');
      const tvPostersBtn = this.containerElement.querySelector('.media-manager-tv-posters-btn');
      if (moviePosterImg) moviePosterImg.style.display = 'none';
      if (movieEditPosterBtn) movieEditPosterBtn.style.display = 'none';
      if (tvPostersBtn) tvPostersBtn.style.display = 'block';
    }
  }

  switchMode(mode) {
    console.log('[MediaManager] switchMode called:', mode);
    if (mode === 'single') {
      this.modeSingle.classList.add('active');
      this.modeAll && this.modeAll.classList.remove('active');
      if (this.contentSingle) this.contentSingle.style.display = 'block';
      if (this.contentAll) this.contentAll.style.display = 'none';
      // Hide TV content if present
      const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
      if (tvContent) tvContent.style.display = 'none';
    } else if (mode === 'all') {
      this.modeSingle.classList.remove('active');
      this.modeAll && this.modeAll.classList.add('active');
      if (this.contentSingle) this.contentSingle.style.display = 'none';
      if (this.contentAll) this.contentAll.style.display = 'block';
      // Hide TV content if present
      const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
      if (tvContent) tvContent.style.display = 'none';
    }
  }

  handleViewJson() {
    // Use the stored cast data that includes profile URLs
    let cast = [];
    if (this.castList) {
      cast = Array.from(this.castList.querySelectorAll('.media-manager-cast-item')).map(div => {
        const img = div.querySelector('img');
        const profile = img ? img.src : null;
        const match = div.textContent.match(/^(.*?) \((.*?)\)$/);
        if (match) {
          return { name: match[1], character: match[2], profile };
        } else {
          return { name: div.textContent, character: '', profile };
        }
      });
    }
    
    // Populate the JSON editor with current cast data
    if (this.jsonEditorTextarea) {
      this.jsonEditorTextarea.value = JSON.stringify(cast, null, 2);
    }
    
    // Show the JSON editor modal
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.style.display = 'flex';
    }
  }

  handleViewJsonTV() {
    // Use the stored cast data that includes profile URLs
    let cast = this.currentCastData || [];
    
    // Populate the JSON editor with current cast data
    if (this.jsonEditorTextareaTV) {
      this.jsonEditorTextareaTV.value = JSON.stringify(cast, null, 2);
    }
    
    // Show the JSON editor modal
    if (this.jsonEditorOverlayTV) {
      this.jsonEditorOverlayTV.style.display = 'flex';
    }
  }

  closeJsonEditor() {
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.style.display = 'none';
    }
  }

  closeJsonEditorTV() {
    if (this.jsonEditorOverlayTV) {
      this.jsonEditorOverlayTV.style.display = 'none';
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

  copyJsonToClipboardTV() {
    if (this.jsonEditorTextareaTV) {
      this.jsonEditorTextareaTV.select();
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
      
      // Update the cast list in the main modal based on active tab
      const isTV = this.tabTV && this.tabTV.classList.contains('active');
      
      if (isTV) {
        // Update TV Show cast list
        if (this.castListTV) {
          this.castListTV.innerHTML = '';
          cast.forEach(actor => {
            const div = document.createElement('div');
            div.className = 'media-manager-cast-item-tv';
            
            // Create cast item with profile image if available
            if (actor.profile) {
              div.innerHTML = `
                <img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;">
                <span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>
              `;
            } else {
              div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
            }
            
            this.castListTV.appendChild(div);
          });
        }
      } else {
        // Update Movie cast list
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

  saveJsonChangesTV() {
    if (!this.jsonEditorTextareaTV) return;
    
    try {
      const jsonText = this.jsonEditorTextareaTV.value.trim();
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
      if (this.castListTV) {
        this.castListTV.innerHTML = '';
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
          
          this.castListTV.appendChild(div);
        });
      }
      
      // Close the JSON editor
      this.closeJsonEditorTV();
      
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
      if (errorElement) errorElement.textContent = fieldName === 'title' ? 'Title required' : 'File/Folder Path is required';
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

  validateFieldTV(fieldName) {
    const field = fieldName === 'title' ? this.inputTVTitle : this.inputTVPath;
    const errorElement = fieldName === 'title' ? this.titleErrorTV : this.pathErrorTV;
    const value = field ? field.value.trim() : '';
    
    if (!value) {
      if (field) field.classList.add('error');
      if (errorElement) errorElement.textContent = fieldName === 'title' ? 'Show Title is required' : 'Show Path is required';
      if (errorElement) errorElement.style.display = 'block';
      return false;
    }
    // For TV path, require a folder path (not a file)
    if (fieldName === 'path') {
      if (/\.(mp4|mkv|avi|mov)$/i.test(value)) {
        if (field) field.classList.add('error');
        if (errorElement) errorElement.textContent = 'Please enter the show folder path, not a file path';
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
    const pathValid = this.validateField('path');
    const isFormValid = titleValid && pathValid;
    
    // Enable/disable submit button
    if (this.confirmBtn) {
      this.confirmBtn.disabled = !isFormValid;
      this.confirmBtn.style.opacity = isFormValid ? '1' : '0.5';
      this.confirmBtn.style.cursor = isFormValid ? 'pointer' : 'not-allowed';
    }
    
    return isFormValid;
  }

  validateFormTV() {
    const titleValid = this.validateFieldTV('title');
    const pathValid = this.validateFieldTV('path');
    const isFormValid = titleValid && pathValid;
    
    // Enable/disable submit button
    if (this.confirmBtnTV) {
      this.confirmBtnTV.disabled = !isFormValid;
      this.confirmBtnTV.style.opacity = isFormValid ? '1' : '0.5';
      this.confirmBtnTV.style.cursor = isFormValid ? 'pointer' : 'not-allowed';
    }
    
    return isFormValid;
  }

  show() {
    if (this.containerElement) this.containerElement.style.display = 'flex';
    // Set default tab to Movie
    this.switchTab('movie');
    this.switchMode('single');
    // Initialize form validation
    this.validateForm();
    // Set global instance for batch actions
    window.mediaManager = this;
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
    // This function is no longer needed as the TMDB selection modal is removed.
    // If this function is called, it will do nothing.
    console.warn('showTMDBSelectModal called, but TMDB selection modal is removed.');
  }
  closeTMDBSelectModal() {
    // This function is no longer needed as the TMDB selection modal is removed.
    // If this function is called, it will do nothing.
    console.warn('closeTMDBSelectModal called, but TMDB selection modal is removed.');
  }
  async handleSelectTMDBResult(tmdbId) {
    // This function is no longer needed as the TMDB selection modal is removed.
    // If this function is called, it will do nothing.
    console.warn('handleSelectTMDBResult called, but TMDB selection modal is removed.');
  }

  // --- NEW: Show TMDB select modal for movies ---
  showTMDBSelectModalMovie(results) {
    // This function is no longer needed as the TMDB selection modal is removed.
    // If this function is called, it will do nothing.
    console.warn('showTMDBSelectModalMovie called, but TMDB selection modal is removed.');
  }

  // --- NEW: Handle movie selection from TMDB modal ---
  async handleSelectTMDBResultMovie(tmdbId) {
    // This function is no longer needed as the TMDB selection modal is removed.
    // If this function is called, it will do nothing.
    console.warn('handleSelectTMDBResultMovie called, but TMDB selection modal is removed.');
  }

  // Show alert inside modal (not global toast)
  showModalAlert(msg, type) {
    const alertDiv = this.containerElement.querySelector('.media-manager-tmdbid-noresult-msg');
    if (alertDiv) {
      alertDiv.style.display = 'block';
      alertDiv.style.color = type === 'error' ? '#ff1744' : (type === 'success' ? '#4caf50' : '#ff9800');
      alertDiv.textContent = msg;
    }
  }
  hideModalAlert() {
    const alertDiv = this.containerElement.querySelector('.media-manager-tmdbid-noresult-msg');
    if (alertDiv) alertDiv.style.display = 'none';
  }
  // Show manual TMDB ID button and message
  showNoPosterManualTMDB() {
    const btn = this.containerElement.querySelector('.media-manager-tmdbid-manual-btn');
    const msg = this.containerElement.querySelector('.media-manager-tmdbid-noresult-msg');
    if (btn) btn.style.display = 'inline-block';
    if (msg) {
      msg.style.display = 'block';
      msg.textContent = 'No results found. You can enter a TMDB ID manually.';
    }
    if (btn) {
      btn.onclick = () => {
        if (this.tmdbIdRow) {
          this.tmdbIdRow.classList.remove('hidden');
          if (this.inputTMDBId) this.inputTMDBId.focus();
        }
        btn.style.display = 'none';
      };
    }
  }
  hideNoPosterManualTMDB() {
    const btn = this.containerElement.querySelector('.media-manager-tmdbid-manual-btn');
    const msg = this.containerElement.querySelector('.media-manager-tmdbid-noresult-msg');
    if (btn) btn.style.display = 'none';
    if (msg) msg.style.display = 'none';
  }

  // TV Show Posters Modal Methods
  openTVPostersModal() {
    console.log('[MediaManager] openTVPostersModal called');
    const tvPostersModalOverlay = this.containerElement.querySelector('.media-manager-tv-posters-modal-overlay');
    console.log('[MediaManager] Modal overlay element:', tvPostersModalOverlay);
    if (tvPostersModalOverlay) {
      console.log('[MediaManager] Setting modal display to flex');
      tvPostersModalOverlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      this.loadTVPosters();
    } else {
      console.warn('[MediaManager] TV Posters modal overlay not found!');
    }
  }

  closeTVPostersModal() {
    const tvPostersModalOverlay = this.containerElement.querySelector('.media-manager-tv-posters-modal-overlay');
    if (tvPostersModalOverlay) {
      tvPostersModalOverlay.style.display = 'none';
      document.body.style.overflow = '';
    } else {
      console.warn('[MediaManager] TV Posters modal overlay not found!');
    }
  }

  loadTVPosters() {
    // TODO: Load existing TV show posters from backend
    console.log('[MediaManager] Loading TV show posters...');
      }

  saveTVPosters() {
    // TODO: Save all TV show posters to backend
    console.log('[MediaManager] Saving TV show posters...');
      if (window.showToast) {
      window.showToast('TV Show posters saved successfully!', 'success');
      console.info('[MediaManager] TV Show posters saved');
    }
    this.closeTVPostersModal();
  }
}

// Add function to fix missing actor profile images
MediaManager.prototype.fixMissingActorProfiles = async function(cast) {
    if (!Array.isArray(cast)) return cast;
    
    const TMDB_API_KEY = window.TMDB_API_KEY || (window.process && window.process.env && window.process.env.TMDB_API_KEY);
    if (!TMDB_API_KEY) {
        console.warn('[MediaManager] TMDB API key not found, skipping profile fixes');
        return cast;
    }
    
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    const updatedCast = [...cast];
    
    for (let i = 0; i < updatedCast.length; i++) {
        const actor = updatedCast[i];
        
        // Skip if actor already has a profile image
        if (actor.profile && actor.profile !== 'null' && !actor.profile.includes('placeholder')) {
            continue;
        }
        
        try {
            console.log(`[MediaManager] Fetching profile for: ${actor.name}`);
            
            // Search for actor in TMDB
            const searchUrl = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(actor.name)}`;
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const tmdbActor = data.results[0];
                if (tmdbActor.profile_path) {
                    updatedCast[i].profile = `https://image.tmdb.org/t/p/w185${tmdbActor.profile_path}`;
                    console.log(`[MediaManager] ✅ Found profile for ${actor.name}`);
                } else {
                    console.log(`[MediaManager] ⚠️  No profile image for ${actor.name}`);
                }
            } else {
                console.log(`[MediaManager] ❌ Actor not found: ${actor.name}`);
            }
            
            // Rate limit to avoid hitting TMDB too fast
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`[MediaManager] Error fetching profile for ${actor.name}:`, error);
        }
    }
    
    return updatedCast;
};

// Add function to automatically fix cast data when loading
MediaManager.prototype.loadAndFixCastData = async function(movieTitle) {
    try {
        // Load existing cast data
        const response = await fetch('/components/MediaLibrary/data/movies/movie_cast_normalized.json');
        if (!response.ok) return null;
        
        const castData = await response.json();
        const movieKey = movieTitle.replace(/\s+/g, '.').replace(/\.+/g, '.') + '.[1080p]';
        
        if (castData[movieKey] && castData[movieKey].cast) {
            let cast = castData[movieKey].cast;
            
            // Check if any actors have missing profiles
            const hasMissingProfiles = cast.some(actor => 
                !actor.profile || actor.profile === 'null' || actor.profile.includes('placeholder')
            );
            
            if (hasMissingProfiles) {
                console.log(`[MediaManager] Found missing profiles in cast for ${movieTitle}, fixing...`);
                cast = await this.fixMissingActorProfiles(cast);
                
                // Update the cast data in the JSON file
                castData[movieKey].cast = cast;
                await this.saveCastData(castData);
                
                console.log(`[MediaManager] ✅ Cast profiles updated for ${movieTitle}`);
            }
            
            return cast;
        }
        
        return null;
    } catch (error) {
        console.error('[MediaManager] Error loading/fixing cast data:', error);
        return null;
    }
};

// Add function to save cast data back to JSON
MediaManager.prototype.saveCastData = async function(castData) {
    try {
        const response = await fetch('/api/media/save-cast-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(castData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save cast data');
        }
        
        console.log('[MediaManager] Cast data saved successfully');
    } catch (error) {
        console.error('[MediaManager] Error saving cast data:', error);
    }
};
async function fetchMovieDetailsFromTMDB(title, year) {
    const TMDB_API_KEY = window.TMDB_API_KEY || (window.process && window.process.env && window.process.env.TMDB_API_KEY);
    if (!TMDB_API_KEY) throw new Error('TMDB API key not found');
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results || data.results.length === 0) throw new Error('No TMDB results');
    const movie = data.results[0];
    // Fetch full details for cast
    const detailsRes = await fetch(`${TMDB_BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
    const details = await detailsRes.json();
    const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
    const description = movie.overview || details.overview || '';
    const cast = (details.credits && details.credits.cast) ? details.credits.cast.slice(0, 12).map(actor => ({
        name: actor.name,
        character: actor.character,
        profile: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
    })) : [];
    return { poster, description, cast, tmdbId: movie.id, year: (movie.release_date || '').slice(0,4) };
}


// ALL mode: add batch fetch logic
MediaManager.prototype.handleFetchAllInfo = async function() {
    const progressContainer = this.containerElement.querySelector('.media-manager-progress-container');
    const progressBar = this.containerElement.querySelector('.media-manager-progress-bar');
    const progressText = this.containerElement.querySelector('.media-manager-progress-text');
    const counterValue = this.containerElement.querySelector('.counter-value');
    
    try {
        console.log('[MediaManager] Starting movie scan...');
        
        // Show progress
        if (progressContainer) progressContainer.style.display = 'flex';
        if (progressBar) progressBar.style.width = '0%';
        if (progressText) progressText.textContent = 'Scanning for new movies...';
        
        // Call the new backend API to scan for movies
        const response = await fetch('/api/media/scan-movies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to scan movies');
        }
        
        const movies = data.data.newMovies || [];
        const totalScanned = data.data.totalScanned || 0;
        const totalExisting = data.data.totalExisting || 0;
        
        // Update progress
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = `Scan complete: ${movies.length} new movies found out of ${totalScanned} total`;
        
        // Update counter
        console.log(`[MediaManager] Updating counter: ${movies.length} movies`);
        if (counterValue) {
            counterValue.textContent = movies.length;
            console.log(`[MediaManager] Counter updated to: ${counterValue.textContent}`);
        } else {
            console.error('[MediaManager] Counter element not found!');
        }
        
    if (!movies.length) {
            if (window.showToast) window.showToast('No new movies found.', 'info');
            // Hide progress after a delay
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
            }, 2000);
        return;
    }
        
        console.log(`[MediaManager] Found ${movies.length} new movies out of ${totalScanned} total (${totalExisting} already have posters)`);
        
        // Populate the movie grid with new movies
        this.populateMovieGrid(movies);
        
        if (window.showToast) {
            window.showToast(`Found ${movies.length} new movies`, 'success');
        }
        
        // Hide progress after a delay
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
        }, 3000);
        
    } catch (err) {
        console.error('[MediaManager] Error scanning movies:', err);
        if (progressText) progressText.textContent = `Error: ${err.message}`;
        if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
        
        // Hide progress after error
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
        }, 3000);
    }
};

// NEW: Function to populate the movie grid
MediaManager.prototype.populateMovieGrid = function(movies) {
    const tbody = this.containerElement.querySelector('.movie-grid-table tbody');
    if (!tbody) {
        console.error('[MediaManager] Movie grid tbody not found');
        return;
    }
    
    console.log(`[MediaManager] Populating grid with ${movies.length} movies`);
    
    // Clear ALL existing rows
    const existingRows = tbody.querySelectorAll('.movie-grid-row');
    console.log(`[MediaManager] Clearing ${existingRows.length} existing rows`);
    existingRows.forEach(row => row.remove());
    
    // Add new movie rows
    movies.forEach((movie, index) => {
        const row = document.createElement('tr');
        row.className = 'movie-grid-row';
        row.innerHTML = `
            <td class="movie-grid-col movie-grid-col-select">
                <input type="checkbox" data-movie-index="${index}" />
            </td>
            <td class="movie-grid-col movie-grid-col-poster">
                <div class="movie-poster-thumb"></div>
            </td>
            <td class="movie-grid-col movie-grid-col-title">${movie.title}</td>
            <td class="movie-grid-col movie-grid-col-year">${movie.year}</td>
            <td class="movie-grid-col movie-grid-col-path">${movie.absPath}</td>
            <td class="movie-grid-col movie-grid-col-status">New</td>
        `;
        tbody.appendChild(row);
    });
    
    // Verify the final count
    const finalRows = tbody.querySelectorAll('.movie-grid-row');
    console.log(`[MediaManager] Final grid has ${finalRows.length} rows (should be ${movies.length} movies only)`);
    
    // Store movies data for later use
    this.currentMovies = movies;
    
    // Setup checkbox listeners for selection tracking
    this.setupGridCheckboxListeners();
    
    // Re-setup batch select all functionality
    this.setupBatchSelectAll();
};

// NEW: Function to setup batch select all
MediaManager.prototype.setupBatchSelectAll = function() {
    const batchSelectAll = this.containerElement.querySelector('.batch-select-all-checkbox');
    const rowCheckboxes = this.containerElement.querySelectorAll('.movie-grid-col-select input[type="checkbox"]');
    
    if (batchSelectAll && rowCheckboxes.length) {
        batchSelectAll.addEventListener('change', function() {
            rowCheckboxes.forEach(cb => { cb.checked = batchSelectAll.checked; });
        });
        
        rowCheckboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
                batchSelectAll.checked = allChecked;
            });
        });
    }
};

// NEW: Global function for scanMoviesDirectory (for backward compatibility)
window.scanMoviesDirectory = async function() {
    try {
        const response = await fetch('/api/media/scan-movies', {
        method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to scan movies');
        }
        
        return data.data.newMovies || [];
    } catch (err) {
        console.error('[scanMoviesDirectory] Error:', err);
        return [];
    }
};

// NEW: Batch action handler with progress
MediaManager.prototype.handleBatchAction = async function(action, selectedCount) {
    const progressContainer = this.containerElement.querySelector('.media-manager-progress-container');
    const progressBar = this.containerElement.querySelector('.media-manager-progress-bar');
    const progressText = this.containerElement.querySelector('.media-manager-progress-text');
    
    // Get selected movies
    const selectedCheckboxes = this.containerElement.querySelectorAll('.movie-grid-col-select input[type="checkbox"]:checked');
    const selectedMovies = Array.from(selectedCheckboxes).map(cb => {
        const index = parseInt(cb.dataset.movieIndex);
        return this.currentMovies[index];
    }).filter(Boolean);
    
    if (!selectedMovies.length) {
        if (window.showToast) window.showToast('No movies selected', 'error');
        return;
    }
    
    try {
        // Show progress
        if (progressContainer) progressContainer.style.display = 'flex';
        if (progressBar) progressBar.style.width = '0%';
        
        let processed = 0;
        const total = selectedMovies.length;
        
        for (const movie of selectedMovies) {
            // Update progress
            processed++;
            const percent = (processed / total) * 100;
            if (progressBar) progressBar.style.width = percent + '%';
            if (progressText) progressText.textContent = `Processing ${processed}/${total}: ${movie.title}`;
            
            try {
                switch (action) {
                    case 'fetch-info':
                        await this.processMovieInfo(movie);
                        break;
                    case 'assign-poster':
                        await this.processMoviePoster(movie);
                        break;
                    case 'delete':
                        await this.processMovieDelete(movie);
                        break;
                    default:
                        console.warn(`Unknown batch action: ${action}`);
                }
            } catch (err) {
                console.error(`Error processing ${movie.title}:`, err);
            }
            
            // Small delay to show progress
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Complete
        if (progressText) progressText.textContent = `Completed: ${action} for ${total} movies`;
        if (window.showToast) window.showToast(`Completed ${action} for ${total} movies`, 'success');
        
        // Hide progress after delay
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
        }, 3000);
        
    } catch (err) {
        console.error('[MediaManager] Batch action error:', err);
        if (progressText) progressText.textContent = `Error: ${err.message}`;
        if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
        
        setTimeout(() => {
            if (progressContainer) progressContainer.style.display = 'none';
        }, 3000);
    }
};

// NEW: Process individual movie info
MediaManager.prototype.processMovieInfo = async function(movie) {
    console.log(`[MediaManager] Processing info for: ${movie.title}`);
    // TODO: Implement TMDB fetch for this movie
    // This would call the TMDB API to get description and cast
};

// NEW: Process individual movie poster
MediaManager.prototype.processMoviePoster = async function(movie) {
    console.log(`[MediaManager] Processing poster for: ${movie.title}`);
    // TODO: Implement poster assignment for this movie
    // This would call the poster selection/assignment logic
};

// NEW: Process individual movie delete
MediaManager.prototype.processMovieDelete = async function(movie) {
    console.log(`[MediaManager] Processing delete for: ${movie.title}`);
    // TODO: Implement movie deletion logic
    // This would remove the movie from the list and potentially the filesystem
};

// NEW: Grid handler methods
MediaManager.prototype.handleScanMovies = async function() {
  try {
    console.log('[MediaManager] Starting movie scan...');
    
    // Show progress
    if (this.progressContainer) this.progressContainer.style.display = 'flex';
    if (this.progressBar) this.progressBar.style.width = '0%';
    if (this.progressSummary) this.progressSummary.textContent = 'Scanning for new movies...';
    
    const response = await fetch('/api/media/scan-movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to scan movies');
    }
    
    const newMovies = data.data.newMovies || [];
    console.log(`[MediaManager] Found ${newMovies.length} new movies`);
    
    // Update counter
    if (this.counterValue) {
      this.counterValue.textContent = newMovies.length;
    }
    
    // Populate grid
    this.populateMovieGrid(newMovies);
    
    // Update button states
    this.updateButtonStates(newMovies.length);
    
    // Show completion
    if (this.progressBar) this.progressBar.style.width = '100%';
    if (this.progressSummary) this.progressSummary.textContent = `Scan complete: ${newMovies.length} new movies found`;
    
    if (window.showToast) {
      window.showToast(`Found ${newMovies.length} new movies`, 'success');
    }
    
    // Hide progress after delay
    setTimeout(() => {
      if (this.progressContainer) this.progressContainer.style.display = 'none';
    }, 3000);
    
  } catch (err) {
    console.error('[MediaManager] Scan error:', err);
    if (this.progressSummary) this.progressSummary.textContent = `Error: ${err.message}`;
    if (window.showToast) window.showToast(`Scan error: ${err.message}`, 'error');
    
    setTimeout(() => {
      if (this.progressContainer) this.progressContainer.style.display = 'none';
    }, 3000);
  }
};

MediaManager.prototype.handleSelectAll = function() {
  const isChecked = this.batchSelectAllCheckbox.checked;
  const rowCheckboxes = this.containerElement.querySelectorAll('.movie-grid-col-select input[type="checkbox"]');
  
  rowCheckboxes.forEach(cb => {
    cb.checked = isChecked;
  });
  
  this.updateSelectedCount();
};

MediaManager.prototype.handleClearSelection = function() {
  const rowCheckboxes = this.containerElement.querySelectorAll('.movie-grid-col-select input[type="checkbox"]');
  rowCheckboxes.forEach(cb => cb.checked = false);
  
  if (this.batchSelectAllCheckbox) {
    this.batchSelectAllCheckbox.checked = false;
  }
  
  this.updateSelectedCount();
  
  if (window.showToast) window.showToast('Selection cleared', 'info');
};

MediaManager.prototype.updateSelectedCount = function() {
  const selectedCheckboxes = this.containerElement.querySelectorAll('.movie-grid-col-select input[type="checkbox"]:checked');
  const selectedCount = selectedCheckboxes.length;
  
  if (this.processSelectedBtn) {
    this.processSelectedBtn.textContent = `Process Selected (${selectedCount})`;
    this.processSelectedBtn.disabled = selectedCount === 0;
  }
};

MediaManager.prototype.updateButtonStates = function(movieCount) {
  if (this.processAllBtn) {
    this.processAllBtn.disabled = movieCount === 0;
  }
  
  if (this.processSelectedBtn) {
    this.processSelectedBtn.disabled = true;
    this.processSelectedBtn.textContent = 'Process Selected (0)';
  }
};

// Setup checkbox change listeners after grid population
MediaManager.prototype.setupGridCheckboxListeners = function() {
  const rowCheckboxes = this.containerElement.querySelectorAll('.movie-grid-col-select input[type="checkbox"]');
  
  rowCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      this.updateSelectedCount();
      
      // Update select all checkbox
      const allChecked = Array.from(rowCheckboxes).every(cb => cb.checked);
      if (this.batchSelectAllCheckbox) {
        this.batchSelectAllCheckbox.checked = allChecked;
      }
    });
  });
};

// NEW: Update poster thumbnail for processed movies
MediaManager.prototype.updateMoviePosterThumbnail = function(movie, processedIndex) {
  // Find the row for this movie by title
  const movieRows = this.containerElement.querySelectorAll('.movie-grid-row');
  let targetRow = null;
  
  for (const row of movieRows) {
    const titleCell = row.querySelector('.movie-grid-col-title');
    if (titleCell && titleCell.textContent.trim() === movie.title) {
      targetRow = row;
      break;
    }
  }
  
  if (!targetRow) {
    console.warn(`[MediaManager] Could not find row for movie: ${movie.title}`);
    return;
  }
  
  const row = targetRow;
  
  // Find the poster column
  const posterCell = row.querySelector('.movie-grid-col-poster');
  if (!posterCell) {
    console.warn(`[MediaManager] Could not find poster cell for movie: ${movie.title}`);
    return;
  }
  
  // Create or update the poster thumbnail
  let posterThumb = posterCell.querySelector('.movie-poster-thumb');
  if (!posterThumb) {
    posterThumb = document.createElement('div');
    posterThumb.className = 'movie-poster-thumb';
    posterCell.appendChild(posterThumb);
  }
  
  // Get the actual poster URL from the JSON file
  this.getMoviePosterUrl(movie).then(posterUrl => {
    if (posterUrl) {
      // Show real poster thumbnail
      posterThumb.innerHTML = `
        <div class="poster-real" data-movie-title="${movie.title}" data-movie-year="${movie.year}" data-movie-path="${movie.absPath}">
          <img src="${posterUrl}" alt="${movie.title}" class="poster-image" />
          <div class="poster-overlay">
            <div class="poster-status">✓ Processed</div>
          </div>
        </div>
      `;
      console.log(`[MediaManager] Updated with real poster for: ${movie.title}`);
    } else {
      // Fallback to placeholder
      posterThumb.innerHTML = `
        <div class="poster-placeholder" data-movie-title="${movie.title}" data-movie-year="${movie.year}" data-movie-path="${movie.absPath}">
          <div class="poster-title">${movie.title}</div>
          <div class="poster-year">${movie.year}</div>
          <div class="poster-status">✓ Processed</div>
        </div>
      `;
      console.log(`[MediaManager] Updated with placeholder for: ${movie.title} (no poster found)`);
    }
    
    // Add hover event listener for poster modal
    this.setupPosterHoverEvents(posterThumb);
  });
  
  // Update the status column to show "Processed"
  const statusCell = row.querySelector('.movie-grid-col-status');
  if (statusCell) {
    statusCell.textContent = 'Processed';
    statusCell.style.color = '#28a745'; // Green color for processed
  }
  
  console.log(`[MediaManager] Updated poster thumbnail for: ${movie.title}`);
};

// NEW: Get movie poster URL from JSON file
MediaManager.prototype.getMoviePosterUrl = async function(movie) {
  try {
    console.log(`[MediaManager] Looking for poster for movie: ${movie.title}`);
    console.log(`[MediaManager] Movie absPath: ${movie.absPath}`);
    console.log(`[MediaManager] Movie year: ${movie.year}`);
    
    // The JSON files use the full path as the key
    // Try the exact path first, then variations
    const possibleKeys = [
      // Primary: exact path as stored in JSON
      movie.absPath,
      // Alternative: path with forward slashes
      movie.absPath.replace(/\\/g, '/'),
      // Alternative: path with backslashes
      movie.absPath.replace(/\//g, '\\')
    ];
    
    console.log(`[MediaManager] Trying keys:`, possibleKeys);
    
    // Fetch the posters JSON file
    const response = await fetch('/api/media/get-movie-posters');
    const data = await response.json();
    
    if (data.success && data.posters) {
      console.log(`[MediaManager] Available poster keys (first 10):`, Object.keys(data.posters).slice(0, 10));
      
      // Try all possible keys
      for (const tryKey of possibleKeys) {
        if (data.posters[tryKey]) {
          const posterUrl = data.posters[tryKey];
          console.log(`[MediaManager] Found poster URL with key "${tryKey}": ${posterUrl}`);
          return posterUrl;
        }
      }
    }
    
    console.warn(`[MediaManager] No poster found for any key. Tried:`, possibleKeys);
    return null;
    
  } catch (err) {
    console.error(`[MediaManager] Error getting poster URL for ${movie.title}:`, err);
    return null;
  }
};

// NEW: Setup poster hover events for modal popup
MediaManager.prototype.setupPosterHoverEvents = function(posterThumb) {
  // Try to find either poster element (placeholder or real)
  const posterElement = posterThumb.querySelector('.poster-placeholder') || posterThumb.querySelector('.poster-real');
  if (!posterElement) return;
  
  let hoverTimeout;
  let posterModal = null;
  
  posterElement.addEventListener('mouseenter', () => {
    // Clear any existing timeout
    if (hoverTimeout) clearTimeout(hoverTimeout);
    
    // Show modal after short delay
    hoverTimeout = setTimeout(() => {
      this.showPosterModal(posterElement);
    }, 300); // 300ms delay before showing
  });
  
  // Remove mouseleave event - modal will stay open until manually closed
  // posterElement.addEventListener('mouseleave', () => {
  //   // Clear timeout if mouse leaves before delay
  //   if (hoverTimeout) clearTimeout(hoverTimeout);
  //   
  //   // Hide modal after short delay
  //   hoverTimeout = setTimeout(() => {
  //     this.hidePosterModal();
  //   }, 500); // 500ms delay before hiding
  // });
};

// NEW: Show poster modal with full details
MediaManager.prototype.showPosterModal = function(posterElement) {
  const title = posterElement.dataset.movieTitle;
  const year = posterElement.dataset.movieYear;
  const path = posterElement.dataset.moviePath;
  
  // Get the actual poster URL from the movie data
  const posterUrl = posterElement.querySelector('img')?.src || null;
  
  // Create modal if it doesn't exist
  let posterModal = document.querySelector('.poster-detail-modal');
  if (!posterModal) {
    posterModal = document.createElement('div');
    posterModal.className = 'poster-detail-modal';
    document.body.appendChild(posterModal);
  }
  
  // Update modal content
  posterModal.innerHTML = `
    <div class="poster-detail-content">
      <div class="poster-detail-header">
        <h3>${title} (${year})</h3>
        <div class="poster-detail-close">&times;</div>
      </div>
      <div class="poster-detail-body">
        <div class="poster-detail-poster">
          ${posterUrl ? 
            `<img src="${posterUrl}" alt="${title}" class="poster-detail-image" />` :
            `<div class="poster-detail-placeholder">
              <div class="poster-detail-title">${title}</div>
              <div class="poster-detail-year">${year}</div>
              <div class="poster-detail-status">✓ Processed</div>
              <div class="poster-detail-path">${path}</div>
            </div>`
          }
        </div>
        <div class="poster-detail-info">
          <div class="poster-detail-section">
            <h4>Movie Details</h4>
            <p><strong>Title:</strong> ${title}</p>
            <p><strong>Year:</strong> ${year}</p>
            <p><strong>Status:</strong> <span class="status-processed">Processed</span></p>
          </div>
          <div class="poster-detail-section">
            <h4>File Information</h4>
            <p><strong>Path:</strong> ${path}</p>
            <p><strong>Processing Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Show modal first, then position it in center
  posterModal.style.display = 'block';
  
  // Position modal in center of screen using CSS classes
  // Remove any existing positioning classes
  posterModal.classList.remove('poster-detail-modal-centered');
  
  // Add positioning class for centered modal
  posterModal.classList.add('poster-detail-modal-centered');
  
  // Add close button functionality
  const closeBtn = posterModal.querySelector('.poster-detail-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      this.hidePosterModal();
    });
  }
  
  console.log(`[MediaManager] Showing poster modal for: ${title}`);
};

// NEW: Hide poster modal
MediaManager.prototype.hidePosterModal = function() {
  const posterModal = document.querySelector('.poster-detail-modal');
  if (posterModal) {
    posterModal.style.display = 'none';
  }
};

// NEW: Step 1 - Scan app for new movies
MediaManager.prototype.handleStep1Scan = async function() {
  try {
    console.log('[MediaManager] Starting Step 1: Scan app for new movies...');
    
    // Disable the button and show loading state
    if (this.step1ScanBtn) {
      this.step1ScanBtn.disabled = true;
      this.step1ScanBtn.textContent = 'Scanning...';
    }
    
    // Call the backend endpoint to run the scan script
    const response = await fetch('/api/media/step1-scan-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('[MediaManager] Step 1 scan completed successfully:', data.message);
      this.showModalAlert('✅ Step 1 completed! App has been scanned for new movies. You can now proceed to Step 2.', 'success');
      
      // Re-enable the button
      if (this.step1ScanBtn) {
        this.step1ScanBtn.disabled = false;
        this.step1ScanBtn.textContent = 'Step 1: Scan App for New Movies';
      }
    } else {
      console.error('[MediaManager] Step 1 scan failed:', data.error);
      this.showModalAlert(`❌ Step 1 failed: ${data.error}`, 'error');
      
      // Re-enable the button
      if (this.step1ScanBtn) {
        this.step1ScanBtn.disabled = false;
        this.step1ScanBtn.textContent = 'Step 1: Scan App for New Movies';
      }
    }
    
  } catch (err) {
    console.error('[MediaManager] Error in Step 1 scan:', err);
    this.showModalAlert(`❌ Step 1 failed: ${err.message}`, 'error');
    
    // Re-enable the button
    if (this.step1ScanBtn) {
      this.step1ScanBtn.disabled = false;
      this.step1ScanBtn.textContent = 'Step 1: Scan App for New Movies';
    }
  }
};

// NEW: Fix missing cast profiles
MediaManager.prototype.handleFixCastProfiles = async function() {
  try {
    console.log('[MediaManager] Starting Fix Missing Cast Profiles...');
    
    // Disable the button and show loading state
    if (this.fixCastProfilesBtn) {
      this.fixCastProfilesBtn.disabled = true;
      this.fixCastProfilesBtn.textContent = 'Fixing Cast Profiles...';
    }
    
    // Call the backend endpoint to run the cast fix script
    const response = await fetch('/api/media/fix-cast-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('[MediaManager] Cast profiles fix completed successfully:', data.message);
      this.showModalAlert('✅ Cast profiles fix completed! Missing actor profile images have been updated.', 'success');
      
      // Re-enable the button
      if (this.fixCastProfilesBtn) {
        this.fixCastProfilesBtn.disabled = false;
        this.fixCastProfilesBtn.textContent = 'Fix Missing Cast Profiles';
      }
    } else {
      console.error('[MediaManager] Cast profiles fix failed:', data.error);
      this.showModalAlert(`❌ Cast profiles fix failed: ${data.error}`, 'error');
      
      // Re-enable the button
      if (this.fixCastProfilesBtn) {
        this.fixCastProfilesBtn.disabled = false;
        this.fixCastProfilesBtn.textContent = 'Fix Missing Cast Profiles';
      }
    }
    
  } catch (err) {
    console.error('[MediaManager] Error in cast profiles fix:', err);
    this.showModalAlert(`❌ Cast profiles fix failed: ${err.message}`, 'error');
    
    // Re-enable the button
    if (this.fixCastProfilesBtn) {
      this.fixCastProfilesBtn.disabled = false;
      this.fixCastProfilesBtn.textContent = 'Fix Missing Cast Profiles';
    }
  }
};

// NEW: Process movie using existing scripts
MediaManager.prototype.processMovieWithScripts = async function(movie) {
  try {
    console.log(`[MediaManager] Processing movie with scripts: ${movie.title}`);
    
    // Call the existing scripts to fetch and save all data
    const response = await fetch('/api/media/process-movie-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: movie.title,
        year: movie.year,
        absPath: movie.absPath
                })
            });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error(`[MediaManager] Script processing failed for ${movie.title}:`, data.error);
      return false;
    }
    
    console.log(`[MediaManager] Successfully processed: ${movie.title}`);
    return true;
    
    } catch (err) {
    console.error(`[MediaManager] Error processing ${movie.title} with scripts:`, err);
    return false;
    }
};

// Helper: Process a single movie using the exact same logic as MOVIE | Single
MediaManager.prototype.processMovieSingleLogic = async function({ title, year, absPath }) {
  // 1. Fetch TMDB info
  let tmdbInfo = null;
  try {
    const fetchRes = await fetch('/api/media/fetch-tmdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'movie', title, year })
    });
    const fetchData = await fetchRes.json();
    if (!fetchData.success) {
      console.warn(`[MediaManager] TMDB fetch failed for: ${title} (${year}) - ${fetchData.error}`);
      return false;
    }
    tmdbInfo = fetchData.data;
    // If multiple results (from search), pick the first
    if (!tmdbInfo && fetchData.results && Array.isArray(fetchData.results) && fetchData.results.length > 0) {
      tmdbInfo = fetchData.results[0];
      console.warn(`[MediaManager] Multiple TMDB results for ${title}, picking first:`, tmdbInfo.title || tmdbInfo.name);
    }
    if (!tmdbInfo) {
      console.warn(`[MediaManager] No TMDB info found for: ${title}`);
      return false;
    }
  } catch (err) {
    console.error(`[MediaManager] Error fetching TMDB info for ${title}:`, err);
    return false;
  }
  // 2. Save movie info
  try {
    const saveRes = await fetch('/api/media/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'movie',
        absPath,
        title: tmdbInfo.title || title,
        year: tmdbInfo.year || year,
        poster: tmdbInfo.poster,
        description: tmdbInfo.description,
        cast: tmdbInfo.cast
      })
    });
    const saveData = await saveRes.json();
    if (!saveData.success) {
      console.warn(`[MediaManager] Save failed for: ${title} - ${saveData.error}`);
      return false;
    }
    // Always reload movie posters and refresh grid after save
    if (window.mediaLibraryManager && typeof window.mediaLibraryManager.reloadMoviePostersAndRefreshGrid === 'function') {
      await window.mediaLibraryManager.reloadMoviePostersAndRefreshGrid();
    }
    return true;
  } catch (err) {
    console.error(`[MediaManager] Error saving info for ${title}:`, err);
    return false;
  }
};

if (typeof window !== 'undefined') {
  window.MediaManager = MediaManager;
  // Make the instance available globally for batch actions
  window.mediaManager = null;
} 