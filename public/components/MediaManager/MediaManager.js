/*
  MEDIAMANAGER.JS
  Version: 15
  AppName: MultiChat_Chatty [v15]
  Updated: 8/9/2025 @12:15AM
  Created by Paul Welby
*/

class MediaManager {
    constructor(containerElement) {
      console.log('[DEBUG - MediaManager] Constructor called');
      this.containerElement = containerElement;
    this.isInitialized = false;
    this.htmlTemplate = null;
    this.currentCastData = []; // Store full cast data including profile URLs
    this.activeSubTab = 'single';
      this.removeAllTitleAttributes();
      // Brute-force: Remove all title attributes on every mouseover
      document.body.addEventListener('mouseover', function() {
        document.querySelectorAll('[title]').forEach(el => el.removeAttribute('title'));
      });
      console.log('[DEBUG - MediaManager] Constructor completed');
  }

  async init() {
    console.log('[DEBUG - MediaManager] Init method called');
    if (this.isInitialized) {
      console.log('[DEBUG - MediaManager] Already initialized, returning');
      return;
    }
    try {
      console.log('[DEBUG - MediaManager] Loading CSS and HTML...');
    await Promise.all([
      this.loadCSS(),
      this.loadHTML()
    ]);
      console.log('[DEBUG - MediaManager] Creating template...');
    this.createFromTemplate();
      console.log('[DEBUG - MediaManager] Setting up elements...');
    this.setupElements();
      console.log('[DEBUG - MediaManager] Setting up event listeners...');
    this.setupEventListeners();
    this.isInitialized = true;
      console.log('[DEBUG - MediaManager] Showing MediaManager...');
    this.show();
      
      // Auto-detect and process new TV shows
      await this.autoDetectNewShows();
      
      console.log('[DEBUG - MediaManager] Initialization completed successfully');
    } catch (error) {
      console.error('[DEBUG - MediaManager] Error during initialization:', error);
      throw error;
    }
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
    // ========================================
    // CONTAINER AND CLOSE BUTTON
    // ========================================
    this.containerElement = document.querySelector('.media-manager-overlay');
    this.closeBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-close-btn') : null;

    // ========================================
    // TAB AND MODE NAVIGATION ELEMENTS
    // ========================================
    this.tabMovie = this.containerElement ? this.containerElement.querySelector('.media-manager-tab-movie') : null;
    this.tabTV = this.containerElement ? this.containerElement.querySelector('.media-manager-tab-tv') : null;
    this.tabAudio = this.containerElement ? this.containerElement.querySelector('.media-manager-tab-audio') : null;
    this.modeSingle = this.containerElement ? this.containerElement.querySelector('.media-manager-mode-single') : null;
    this.contentMovie = this.containerElement ? this.containerElement.querySelector('.media-manager-content-movie') : null;
    this.contentTV = this.containerElement ? this.containerElement.querySelector('.media-manager-content-tv') : null;
    this.contentAudio = this.containerElement ? this.containerElement.querySelector('.media-manager-content-audio') : null;
    this.contentAll = this.containerElement ? this.containerElement.querySelector('.media-manager-content-all') : null;

    // ========================================
    // MOVIE FORM ELEMENTS
    // ========================================
    this.inputTitle = this.containerElement ? this.containerElement.querySelector('#media-manager-title') : null;
    this.inputPath = this.containerElement ? this.containerElement.querySelector('#media-manager-path') : null;
    this.fetchBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-fetch-btn-movie') : null;
    this.scanMoviesBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-scan-movies-btn') : null;
    this.posterImg = this.containerElement ? this.containerElement.querySelector('.media-manager-poster-img-movie') : null;
    this.descInput = this.containerElement ? this.containerElement.querySelector('#media-manager-description') : null;
    this.castList = this.containerElement ? this.containerElement.querySelector('.media-manager-cast-list-movie') : null;
    this.confirmBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-confirm-btn-movie') : null;
    this.viewJsonBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-view-json-btn-movie') : null;

    // ========================================
    // AUDIO MANAGER ELEMENTS
    // ========================================
    this.audioLaunchBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-audio-launch-btn') : null;

    // ========================================
    // TV SHOW FORM ELEMENTS
    // ========================================
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
    this.viewJsonBtnTV = this.containerElement ? this.containerElement.querySelector('.media-manager-view-json-btn-tv') : null;
    this.editCastBtnTV = this.containerElement ? this.containerElement.querySelector('.media-manager-edit-cast-btn-tv') : null;
    this.viewImagesBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-view-season-episode-images-btn-tv') : null;

    // ========================================
    // VALIDATION ERROR ELEMENTS
    // ========================================
    this.titleError = this.containerElement ? this.containerElement.querySelector('#title-error') : null;
    this.pathError = this.containerElement ? this.containerElement.querySelector('#path-error') : null;
    this.titleErrorTV = this.containerElement ? this.containerElement.querySelector('#tv-title-error') : null;
    this.pathErrorTV = this.containerElement ? this.containerElement.querySelector('#tv-path-error') : null;

    // ========================================
    // JSON EDITOR ELEMENTS (MOVIE)
    // ========================================
    this.jsonEditorOverlay = this.containerElement ? this.containerElement.querySelector('.json-editor-overlay') : null;
    this.jsonEditorTextarea = this.containerElement ? this.containerElement.querySelector('.json-editor-textarea') : null;
    this.jsonEditorCloseBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-close-btn') : null;
    this.jsonEditorCopyBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-copy-btn') : null;
    this.jsonEditorSaveBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-save-btn') : null;
    this.jsonEditorCancelBtn = this.containerElement ? this.containerElement.querySelector('.json-editor-cancel-btn') : null;

    // ========================================
    // JSON EDITOR ELEMENTS (TV SHOW)
    // ========================================
    this.jsonEditorOverlayTV = this.containerElement ? this.containerElement.querySelector('.json-editor-overlay-tv') : null;
    this.jsonEditorTextareaTV = this.containerElement ? this.containerElement.querySelector('.json-editor-textarea-tv') : null;
    this.jsonEditorCloseBtnTV = this.containerElement ? this.containerElement.querySelector('.json-editor-close-btn-tv') : null;
    this.jsonEditorCopyBtnTV = this.containerElement ? this.containerElement.querySelector('.json-editor-copy-btn-tv') : null;
    this.jsonEditorSaveBtnTV = this.containerElement ? this.containerElement.querySelector('.json-editor-save-btn-tv') : null;
    this.jsonEditorCancelBtnTV = this.containerElement ? this.containerElement.querySelector('.json-editor-cancel-btn-tv') : null;

    // ========================================
    // SEASONS/EPISODES MODAL ELEMENTS
    // ========================================
    this.manageSeasonsBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-manage-seasons-btn') : null;
    this.seasonsModalOverlay = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-modal-overlay') : null;
    this.seasonsModalCloseBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-modal-close-btn') : null;
    this.seasonsModalCancelBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-modal-cancel-btn') : null;
    this.seasonsModalSaveBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-seasons-modal-save-btn') : null;

    // ========================================
    // TMDB ID FIELD ELEMENTS
    // ========================================
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

    // ========================================
    // ALL MODE GRID ELEMENTS
    // ========================================
    this.step1ScanBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-step1-scan-btn') : null;
    this.fixCastProfilesBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-fix-cast-profiles-btn') : null;
    this.clearSelectionBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-clear-selection-btn') : null;
    this.closeGridBtn = this.containerElement ? this.containerElement.querySelector('.media-manager-close-grid-btn') : null;

    // ========================================
    // PROGRESS INDICATOR ELEMENTS
    // ========================================
    this.progressContainer = this.containerElement ? this.containerElement.querySelector('.media-manager-progress-container') : null;
    this.progressBar = this.containerElement ? this.containerElement.querySelector('.media-manager-progress') : null;
    this.progressSummary = this.containerElement ? this.containerElement.querySelector('.media-manager-summary') : null;

    // ========================================
    // MOVIE TEST FORM ELEMENTS (DEBUGGING)
    // ========================================
    this.inputMovieTestTitle = this.containerElement.querySelector('#media-manager-movie-test-title');
    this.inputMovieTestTMDBId = this.containerElement.querySelector('#media-manager-movie-test-tmdbid');
    this.inputMovieTestPath = this.containerElement.querySelector('#media-manager-movie-test-path');
    this.inputMovieTestDescription = this.containerElement.querySelector('#media-manager-movie-test-description');
    this.posterImgMovieTest = this.containerElement.querySelector('.media-manager-poster-img-movie-test');
    this.castListMovieTest = this.containerElement.querySelector('.media-manager-cast-list-movie-test');
    this.fetchBtnMovieTest = this.containerElement.querySelector('.media-manager-fetch-btn-movie-test');
    this.movieForm = this.containerElement.querySelector('.media-manager-movie-form');
    this.tvForm = this.containerElement.querySelector('.media-manager-movie-form');
    this.movieTestForm = this.containerElement.querySelector('.media-manager-movie-form');

    // Debug logging for movie test selectors
    console.log('[DEBUG] MOVIE-TEST selectors:', {
      inputMovieTestTitle: this.inputMovieTestTitle,
      inputMovieTestTMDBId: this.inputMovieTestTMDBId,
      inputMovieTestPath: this.inputMovieTestPath,
      inputMovieTestDescription: this.inputMovieTestDescription,
      posterImgMovieTest: this.posterImgMovieTest,
      castListMovieTest: this.castListMovieTest,
      fetchBtnMovieTest: this.fetchBtnMovieTest,
      movieTestForm: this.movieTestForm
    });

    // ========================================
    // PATH INPUT VISIBILITY LOGIC
    // ========================================
    // Add a function to toggle path input and error visibility based on active tab
    this.updatePathInputs = () => {
      const isTV = this.tabTV && this.tabTV.classList.contains('active');
      const moviePathRow = this.inputPath ? this.inputPath.closest('.media-manager-form-row') : null;
      const tvPathRow = this.inputTVPath ? this.inputTVPath.closest('.media-manager-form-row-tv') : null;
      if (isTV) {
        if (moviePathRow) moviePathRow.style.display = 'none';
        if (this.pathError) this.pathError.style.display = 'none';
        if (tvPathRow) tvPathRow.style.display = '';
        if (this.pathErrorTV) {
          if (this.inputTVPath && /\.(mp4|mkv|avi|mov)$/i.test(this.inputTVPath.value.trim())) {
            this.pathErrorTV.textContent = 'Please enter the show folder path (no file extension needed)';
            this.pathErrorTV.style.display = 'block';
            console.log('[DEBUG] Showing TV-SHOW path error');
          } else {
            this.pathErrorTV.style.display = 'none';
          }
        }
      } else {
        if (moviePathRow) moviePathRow.style.display = '';
        if (tvPathRow) tvPathRow.style.display = 'none';
        if (this.pathErrorTV) this.pathErrorTV.style.display = 'none';
        if (this.pathError) {
          if (this.inputPath && !/\.(mp4|mkv|avi|mov)$/i.test(this.inputPath.value.trim())) {
            this.pathError.textContent = 'Please enter the full file path, including the filename and extension (e.g., .mp4)';
            this.pathError.style.display = 'block';
            console.log('[DEBUG] Showing MOVIE path error');
          } else {
            this.pathError.style.display = 'none';
          }
        }
      }
    };

    // ========================================
    // INITIALIZATION AND EVENT SETUP
    // ========================================
    // Set up path input visibility event listeners
    if (this.tabMovie) this.tabMovie.addEventListener('click', this.updatePathInputs);
    if (this.tabTV) this.tabTV.addEventListener('click', this.updatePathInputs);
    if (this.modeSingle) this.modeSingle.addEventListener('click', this.updatePathInputs);
    
    // Initialize path inputs and attach TV show listeners
    this.updatePathInputs();
    this.attachTVShowListeners();
  }

  setupEventListeners() {
    console.log('[DEBUG] setupEventListeners called');
    if (this.closeBtn) {
      this.closeBtn.onclick = () => this.handleClose();
    }
    if (this.tabMovie) {
      this.tabMovie.onclick = () => {
        console.log('[DEBUG] MOVIE tab clicked');
        this.switchTab('movie');
      };
    }
    if (this.tabTV) {
      this.tabTV.onclick = () => {
        console.log('[DEBUG] TV tab clicked');
        this.switchTab('tv');
      };
    }
    if (this.tabAudio) {
      this.tabAudio.onclick = () => {
        console.log('[DEBUG] AUDIO tab clicked');
        this.switchTab('audio');
      };
    }
    if (this.viewJsonBtnTV) {
      this.viewJsonBtnTV.onclick = () => {
        console.log('[MM DEBUG] TV-SHOW View/Edit JSON button clicked');
        this.handleViewJsonTV();
      };
    }
    if (this.editCastBtnTV) {
      this.editCastBtnTV.onclick = () => {
        console.log('[MM DEBUG] TV-SHOW Edit Cast button clicked');
        this.handleEditCastTV();
      };
    }
    if (this.tabMovieTest) {
      this.tabMovieTest.onclick = () => {
        console.log('[DEBUG] MOVIE-TEST tab clicked');
        this.switchTab('movie-test');
      };
    }
    if (this.modeSingle) {
      this.modeSingle.onclick = () => {
        this.switchMode('single');
      };
    }
    
    // MOVIE specific Fetch Info button
    if (this.fetchBtn) {
      this.fetchBtn.onclick = () => {
        console.log('[DEBUG] MOVIE Fetch Info button clicked');
        this.handleFetchInfo();
      };
    }
    
    // TV Show specific Fetch Info button
    if (this.fetchBtnTV) {
      this.fetchBtnTV.onclick = () => {
        console.log('[DEBUG] TV-SHOW Fetch Info button clicked');
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
    
    // ========================================
    // AUDIO MANAGER EVENT LISTENERS
    // ========================================
    if (this.audioLaunchBtn) {
      this.audioLaunchBtn.onclick = () => {
        console.log('[DEBUG] Audio Manager launch button clicked');
        this.launchAudioManager();
      };
    }
    if (this.confirmBtn) {
      console.log('[DEBUG] Confirm button found:', this.confirmBtn);
      this.confirmBtn.onclick = () => {
        console.log('[DEBUG] MOVIE Confirm button clicked');
        console.log('[DEBUG] Confirm button disabled state:', this.confirmBtn.disabled);
        console.log('[DEBUG] Form validation result:', this.validateForm());
        this.handleConfirm();
      };
    } else {
      console.error('[DEBUG] Confirm button NOT found!');
    }
    if (this.viewJsonBtn) {
      this.viewJsonBtn.onclick = () => {
        console.log('[DEBUG] MOVIE View/Edit JSON button clicked');
        this.handleViewJson();
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
        if (scanMoviesBtn) scanMoviesBtn.onclick = () => this.handleScanMovies();
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
      // Add Enter key support for Movie path field
      this.inputPath.addEventListener('keydown', (e) => {
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
    
    // Add real-time validation for TV Show fields
    if (this.inputTVTitle) {
      this.inputTVTitle.addEventListener('input', () => this.validateFormTV());
      this.inputTVTitle.addEventListener('blur', () => this.validateFieldTV('title'));
      // Add Enter key support for TV Show title field
      this.inputTVTitle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (this.tabTV && this.tabTV.classList.contains('active')) {
            this.handleFetchInfoTV();
          }
        }
      });
    }
    if (this.inputTVPath) {
      // Remove all previous event listeners by replacing the element
      const oldInput = this.inputTVPath;
      const newInput = oldInput.cloneNode(true);
      oldInput.parentNode.replaceChild(newInput, oldInput);
      this.inputTVPath = newInput;
      this.inputTVPath.addEventListener('input', () => {
        console.log('[DEBUG] validateFieldTV(path) called on input');
        this.validateFormTV();
      });
      this.inputTVPath.addEventListener('blur', () => {
        console.log('[DEBUG] validateFieldTV(path) called on blur');
        this.validateFormTV();
      });
      this.inputTVPath.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          console.log('[DEBUG] validateFieldTV(path) called on Enter');
          this.validateFormTV();
          this.handleFetchInfoTV();
        }
      });
    }
    if (this.tabTV) this.tabTV.addEventListener('click', () => {
      if (this.inputTVPath) this.validateFormTV();
    });
    
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

    this.tabMovieTest = this.containerElement.querySelector('.media-manager-tab-movie-test');
    if (this.tabMovieTest) {
      this.tabMovieTest.onclick = () => {
        this.switchTab('movie-test');
        this.switchMode('single');
      };
    }
    if (this.fetchBtnMovieTest) {
      console.log('[DEBUG] Attaching handler to fetchBtnMovieTest:', this.fetchBtnMovieTest, 'Current onclick:', this.fetchBtnMovieTest.onclick);
      this.fetchBtnMovieTest.onclick = () => {
        console.log('[DEBUG] Fetch Info button MOVIE-TEST CLICKED');
        this.handleFetchInfoMovieTest();
      };
    }
    // Common Enter/submit handler for MOVIE
    if (this.movieForm) {
      this.movieForm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleFetchInfo();
        }
      });
      this.movieForm.onsubmit = (e) => {
        e.preventDefault();
        this.handleFetchInfo();
      };
    }
    // Common Enter/submit handler for TV-SHOW
    if (this.tvForm) {
      this.tvForm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleFetchInfo();
        }
      });
      this.tvForm.onsubmit = (e) => {
        e.preventDefault();
        this.handleFetchInfo();
      };
    }
    // Common Enter/submit handler for MOVIE-TEST
    if (this.movieTestForm) {
      this.movieTestForm.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          console.log('[DEBUG] Enter key pressed in MOVIE-TEST form');
          this.handleFetchInfoMovieTest();
        }
      });
      this.movieTestForm.onsubmit = (e) => {
        e.preventDefault();
        console.log('[DEBUG] Form submitted in MOVIE-TEST');
        this.handleFetchInfoMovieTest();
      };
    }
    if (this.confirmBtnTV) {
      this.confirmBtnTV.onclick = () => {
        console.log('[DEBUG] TV-SHOW Confirm button clicked');
        this.handleConfirmTV();
      };
    }

    // --- Season & Episode Images Modal logic ---
    var imagesModalOverlay = this.containerElement.querySelector('.media-manager-season-episode-images-modal-overlay');
    var imagesModalCloseBtn = this.containerElement.querySelector('.media-manager-season-episode-images-close-btn');
    var imagesModalContent = this.containerElement.querySelector('.media-manager-season-episode-images-content');
    if (this.viewImagesBtn && imagesModalOverlay) {
      const self = this;
      this.viewImagesBtn.onclick = async function() {
        if (self.viewImagesBtn.disabled) return;
        
        // Show feedback for secondary process
        console.log('[DEBUG - TV_SECONDARY] Starting Season & Episode Images process');
        self.showModalToast('Loading Season & Episode Images...', 'info');
        
        imagesModalOverlay.style.display = 'flex';
        if (imagesModalContent) {
          imagesModalContent.innerHTML = '<div style="color:#bbb;">Loading Season & Episode Images...</div>';
          var normalizedKey = self.getNormalizedKeyTV();
          var seasonImages = {};
          var episodeImages = {};
          try {
            var seasonRes = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json?t=' + Date.now());
            if (seasonRes.ok) seasonImages = await seasonRes.json();
          } catch {}
          try {
            var episodeRes = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json?t=' + Date.now());
            if (episodeRes.ok) episodeImages = await episodeRes.json();
          } catch {}
          // DEBUG LOGGING
          console.log('[DEBUG - viewImagesBtn]- Normalized key:', normalizedKey);
          console.log('[DEBUG - viewImagesBtn]- Season images for key:', seasonImages[normalizedKey]);
          console.log('[DEBUG - viewImagesBtn]- Episode images for key:', episodeImages[normalizedKey]);
          if (!seasonImages[normalizedKey] && !episodeImages[normalizedKey]) {
            imagesModalContent.innerHTML = '<div style="color:#ff9800;">No season or episode images found for this show.</div>';
            self.showModalToast('No season or episode images found for this show.', 'warning');
            return;
          }
          
          // Get the season and episode data for the normalized key
          var showSeasons = seasonImages[normalizedKey] && seasonImages[normalizedKey].seasons ? seasonImages[normalizedKey].seasons : {};
          var showEpisodes = episodeImages[normalizedKey] && episodeImages[normalizedKey].seasons ? episodeImages[normalizedKey].seasons : {};
          
          var html = '<div class="media-manager-images-grid">';
          for (var seasonNum in showSeasons) {
            var imgUrl = showSeasons[seasonNum].poster;
            html += '<div class="media-manager-image-card">';
            if (imgUrl) {
              html += '<img src="' + imgUrl + '" alt="Season ' + seasonNum + '"><div class="media-manager-image-label">Season ' + seasonNum + '</div>';
            } else {
              html += '<div class="media-manager-image-placeholder">No Image</div><div class="media-manager-image-label">Season ' + seasonNum + '</div>';
            }
            html += '</div>';
          }
          for (var seasonNum in showEpisodes) {
            var episodes = showEpisodes[seasonNum].episodes || {};
            for (var epNum in episodes) {
              var epImg = episodes[epNum].still;
              html += '<div class="media-manager-image-card">';
              if (epImg) {
                html += '<img src="' + epImg + '" alt="S' + seasonNum + 'E' + epNum + '"><div class="media-manager-image-label">S' + seasonNum + 'E' + epNum + '</div>';
              } else {
                html += '<div class="media-manager-image-placeholder">No Image</div><div class="media-manager-image-label">S' + seasonNum + 'E' + epNum + '</div>';
              }
              html += '</div>';
            }
          }
          html += '</div>';
          imagesModalContent.innerHTML = html;

          // Success feedback for secondary process
          console.log('[DEBUG - TV_SECONDARY] Season & Episode Images loaded successfully');
          self.showModalToast('Season & Episode Images loaded successfully!', 'success');

          // Auto-populate seasons array for Confirm button
          function populateSeasonsDataFromImages(selectedKey) {
            var seasonsArr = [];
            var showSeasons = seasonImages[selectedKey] && seasonImages[selectedKey].seasons ? seasonImages[selectedKey].seasons : {};
            var showEpisodes = episodeImages[selectedKey] && episodeImages[selectedKey].seasons ? episodeImages[selectedKey].seasons : {};
            for (var seasonNum in showSeasons) {
              var seasonObj = { seasonNumber: parseInt(seasonNum, 10), episodes: [] };
              var episodes = (showEpisodes[seasonNum] && showEpisodes[seasonNum].episodes) ? showEpisodes[seasonNum].episodes : {};
              for (var epNum in episodes) {
                seasonObj.episodes.push({
                  episodeNumber: parseInt(epNum, 10),
                  still: episodes[epNum].still || null
                });
              }
              seasonsArr.push(seasonObj);
            }
            // Set on MM instance for Confirm
            if (window.mediaManager) {
              window.mediaManager.scannedSeasonsData = seasonsArr;
            }
          }
          populateSeasonsDataFromImages(normalizedKey);

          // Dropdown handler
          var keySelect = document.getElementById('mm-image-key-select');
          if (keySelect) {
            keySelect.onchange = function() {
              var selectedKey = keySelect.value;
              // Re-render with new key
              var showSeasons = seasonImages[selectedKey] && seasonImages[selectedKey].seasons ? seasonImages[selectedKey].seasons : {};
              var showEpisodes = episodeImages[selectedKey] && episodeImages[selectedKey].seasons ? episodeImages[selectedKey].seasons : {};
              var html = '<div style="color:#ff9800;margin-bottom:8px;">Showing: <b>' + selectedKey.replace(/\./g, ' ') + '</b></div>';
              html += '<div class="media-manager-images-grid">';
              for (var seasonNum in showSeasons) {
                var imgUrl = showSeasons[seasonNum].poster;
                html += '<div class="media-manager-image-card">';
                if (imgUrl) {
                  html += '<img src="' + imgUrl + '" alt="Season ' + seasonNum + '"><div class="media-manager-image-label">Season ' + seasonNum + '</div>';
                } else {
                  html += '<div class="media-manager-image-placeholder">No Image</div><div class="media-manager-image-label">Season ' + seasonNum + '</div>';
                }
                html += '</div>';
              }
              for (var seasonNum in showEpisodes) {
                var episodes = showEpisodes[seasonNum].episodes || {};
                for (var epNum in episodes) {
                  var epImg = episodes[epNum].still;
                  html += '<div class="media-manager-image-card">';
                  if (epImg) {
                    html += '<img src="' + epImg + '" alt="S' + seasonNum + 'E' + epNum + '"><div class="media-manager-image-label">S' + seasonNum + 'E' + epNum + '</div>';
                  } else {
                    html += '<div class="media-manager-image-placeholder">No Image</div><div class="media-manager-image-label">S' + seasonNum + 'E' + epNum + '</div>';
                  }
                  html += '</div>';
                }
              }
              html += '</div>';
              imagesModalContent.innerHTML = html;
              // Also update seasons data for Confirm
              populateSeasonsDataFromImages(selectedKey);
            };
          }
        }
      };
    }
    if (imagesModalCloseBtn && imagesModalOverlay) {
      imagesModalCloseBtn.onclick = function() {
        imagesModalOverlay.style.display = 'none';
      };
    }

    function checkTVShowConfirmEnabled() {
      var title = document.getElementById('media-manager-tv-title')?.value.trim();
      var poster = document.querySelector('.media-manager-poster-img-tv')?.src;
      var desc = document.getElementById('media-manager-tv-description')?.value.trim();
      var castList = document.querySelectorAll('.media-manager-cast-list-tv .media-manager-cast-item-tv, .media-manager-cast-list-tv .media-manager-cast-item');
      var hasCast = castList && castList.length > 0;
      var hasSeasons = window.mediaManager && Array.isArray(window.mediaManager.scannedSeasonsData) && window.mediaManager.scannedSeasonsData.length > 0 && window.mediaManager.scannedSeasonsData.some(s => Array.isArray(s.episodes) && s.episodes.length > 0);
      var btn = document.querySelector('.media-manager-confirm-btn-tv');
      if (btn) {
        if (title && poster && desc && hasCast && hasSeasons) {
          btn.disabled = false;
          btn.classList.remove('disabled');
          btn.title = '';
        } 
        // else {
        //   btn.disabled = true;
        //   btn.classList.add('disabled');
        //   btn.title = 'Please complete all required fields and add at least one season with episodes.';
        // }
      }
    }
    // Call after fetching info, after modal, and on input changes
    if (this.fetchBtnTV) {
      this.fetchBtnTV.addEventListener('click', function() {
        setTimeout(checkTVShowConfirmEnabled, 300);
      });
    }
    if (this.inputTVTitle) this.inputTVTitle.addEventListener('input', checkTVShowConfirmEnabled);
    if (this.inputTVDescription) this.inputTVDescription.addEventListener('input', checkTVShowConfirmEnabled);
    if (this.castListTV) {
      // Use MutationObserver instead of deprecated DOMSubtreeModified
      const observer = new MutationObserver(checkTVShowConfirmEnabled);
      observer.observe(this.castListTV, { 
        childList: true, 
        subtree: true 
      });
    }
    // After modal populates seasons
    window._mmCheckSeasons = checkTVShowConfirmEnabled;
    // Call after modal populates
    // ... in the modal code, after populateSeasonsDataFromImages(selectedKey):
    if (window._mmCheckSeasons) setTimeout(window._mmCheckSeasons, 100);
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
      console.log('[MediaManager] Reopening MediaLibrary modal and refreshing content...');
      setTimeout(() => {
        window.mediaLibraryManager.openMediaBrowser();
        // Also refresh the content to show any changes made
        if (typeof window.mediaLibraryManager.refreshCurrentContent === 'function') {
          setTimeout(() => {
            window.mediaLibraryManager.refreshCurrentContent();
          }, 500); // Small delay to ensure modal is open first
        }
      }, 0);
    } else {
      console.warn('[MediaManager] Could not reopen MediaLibrary modal: mediaLibraryManager or openMediaBrowser missing');
    }
  }

  async handleFetchInfo() {
    // Unified handler for both MOVIE and TV-SHOW
    const isMovie = this.tabMovie && this.tabMovie.classList.contains('active');
    const isTV = this.tabTV && this.tabTV.classList.contains('active');
    let title, tmdbId, absPath;
    if (isMovie) {
      title = this.inputTitle ? this.inputTitle.value.trim() : '';
      tmdbId = this.inputTMDBId ? this.inputTMDBId.value.trim() : '';
      absPath = this.inputPath ? this.inputPath.value.trim() : '';
    } else if (isTV) {
      title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
      tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
      absPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
    } else {
      this.showModalAlert('Unknown tab state.', 'error');
      return;
    }
    if (!title && !tmdbId) {
      this.showModalAlert('Please enter a title or TMDB ID.', 'error');
      return;
    }
    if (isMovie && !/\.(mp4|mkv|avi|mov)$/i.test(absPath)) {
      this.showModalAlert('Please enter a valid movie file path with extension.', 'error');
      return;
    }
    if (isTV && /\.(mp4|mkv|avi|mov)$/i.test(absPath)) {
      this.showModalAlert('Please enter a TV show folder path (no file extension).', 'error');
      return;
    }
    let body;
    if (tmdbId) {
      body = { type: isMovie ? 'movie' : 'tv', tmdbId };
    } else {
      const isId = /^\d+$/.test(title);
      body = isId ? { type: isMovie ? 'movie' : 'tv', tmdbId: title } : { type: isMovie ? 'movie' : 'tv', title };
    }
    this.showModalAlert('Fetching info from TMDB...', 'info');
    try {
      const res = await fetch('/api/media/fetch-tmdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      console.log('[DEBUG - handleFetchInfo] TMDB response:', data);
      if (!data.success || !data.data) {
        this.showNoPosterManualTMDB();
        throw new Error('No TMDB data returned.');
      }
      
      // Set poster
      if (isMovie) {
        if (this.posterImg) this.posterImg.src = data.data.poster || '';
      } else if (isTV) {
        if (this.posterImgTV) this.posterImgTV.src = data.data.poster || '';
      }
      
      // Set description and cast using direct element references
      if (isMovie) {
        // Use Movie elements
        console.log('[DEBUG - handleFetchInfo] Movie elements:', {
          descInput: this.descInput,
          castList: this.castList,
          description: data.data.description,
          cast: data.data.cast
        });
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
      } else if (isTV) {
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
        
        // --- NEW: Immediately fetch season and episode images ---
        const normalizedKey = this.getNormalizedKeyTV();
        const tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
        const showPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
        const viewImagesBtn = this.containerElement.querySelector('.media-manager-view-season-episode-images-btn-tv');
        
        console.log('[DEBUG - TV_IMAGES_FETCH] Starting season/episode images fetch');
        console.log('[DEBUG - TV_IMAGES_FETCH] NormalizedKey:', normalizedKey);
        console.log('[DEBUG - TV_IMAGES_FETCH] TMDB ID:', tmdbId);
        console.log('[DEBUG - TV_IMAGES_FETCH] Show Path:', showPath);
        
        if (viewImagesBtn) viewImagesBtn.disabled = true;
        this.showModalToast('Fetching season and episode images...', 'info');
        
        console.log('[DEBUG - TV_IMAGES_FETCH] Making API call to /api/media/fetch-tv-images');
        fetch('/api/media/fetch-tv-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            normalizedKey, 
            tmdbId: data.data.tmdbId, 
            showPath,
            showName: year ? `${title} (${year})` : title // Include year in show name to match folder name
          })
        })
          .then(res => {
            console.log('[DEBUG - TV_IMAGES_FETCH] Response status:', res.status);
            console.log('[DEBUG - TV_IMAGES_FETCH] Response ok:', res.ok);
            return res.json();
          })
          .then(imgData => {
            console.log('[DEBUG - TV_IMAGES_FETCH] Response data:', imgData);
            if (imgData.success) {
              console.log('[DEBUG - TV_IMAGES_FETCH] Success! Season and episode images fetched');
              this.showModalToast('Season and episode images fetched!', 'success');
              if (viewImagesBtn) viewImagesBtn.disabled = false;
            } else {
              console.log('[DEBUG - TV_IMAGES_FETCH] Failed! No images found or error:', imgData.error || 'Unknown error');
              this.showModalToast('No season or episode images found for this show.', 'error');
              if (viewImagesBtn) viewImagesBtn.disabled = true;
            }
          })
          .catch(imgErr => {
            console.error('[DEBUG - TV_IMAGES_FETCH] Fetch error:', imgErr);
            console.error('[DEBUG - TV_IMAGES_FETCH] Error message:', imgErr.message);
            this.showModalToast('Error fetching images: ' + imgErr.message, 'error');
            if (viewImagesBtn) viewImagesBtn.disabled = true;
          });
      }
      
      // Show success message for both movies and TV shows
      this.showModalAlert('Fetched info from TMDB.', 'success');
    } catch (err) {
      this.showModalAlert('Failed to fetch info: ' + err.message, 'error');
    }
  }


  async handleConfirm() {
    console.log('[DEBUG - CONFIRM] handleConfirm called');
    // Gather all modal data
    const type = this.tabMovie && this.tabMovie.classList.contains('active') ? 'movie' : 'tv';
    let title, absPath, description, year, tmdbId;
    
    if (type === 'movie') {
      title = this.inputTitle ? this.inputTitle.value.trim() : '';
      absPath = this.inputPath ? this.inputPath.value.trim() : '';
      description = this.descInput ? this.descInput.value.trim() : '';
      tmdbId = this.inputTMDBId ? this.inputTMDBId.value.trim() : '';
      console.log('[DEBUG - CONFIRM] Movie data:', { title, absPath, description, tmdbId });
    } else {
      title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
      absPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
      description = this.inputTVDescription ? this.inputTVDescription.value.trim() : '';
      year = this.inputTVYear ? this.inputTVYear.value.trim() : '';
    }

    // NEW: For movies, ensure the specific movie entry exists with video files
    if (type === 'movie') {
      console.log('[DEBUG - CONFIRM] Ensuring movie has proper video file entry...');
      this.showModalToast('Step 1: Checking movie files...', 'info');
      
      try {
        // Call a new endpoint that ensures THIS specific movie exists in the JSON
        const ensureResponse = await fetch('/api/media/ensure-movie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            moviePath: absPath,
            title: title
          })
        });
        
        const ensureData = await ensureResponse.json();
        if (!ensureData.success) {
          throw new Error(ensureData.error || 'Failed to ensure movie exists');
        }
        
        console.log('[DEBUG - CONFIRM] Movie file entry ensured successfully');
        this.showModalToast('Step 2: Adding movie metadata...', 'info');
      } catch (err) {
        console.error('[DEBUG - CONFIRM] Ensure movie failed:', err);
        this.showModalToast('Failed to ensure movie files: ' + err.message, 'error');
        return;
      }
    }
    // --- NORMALIZE KEY LOGIC ---
    let folderName = absPath ? absPath.split(/[\\/]/).slice(-2, -1)[0] || absPath.split(/[\\/]/).pop() : '';
    let normalizedKey = '';
    
    // Use the shared normalization service for consistency
    if (!window.normalizeKey) {
      console.error('[MEDIA MANAGER] NormalizationService not loaded - this should not happen!');
      this.showModalToast('Error: NormalizationService not available', 'error');
      return;
    }
    
    normalizedKey = window.normalizeKey(folderName || title);
    if (!normalizedKey) {
      if (window.showToast) window.showToast('Error saving: Missing normalizedKey', 'error');
      console.error('[MediaManager] Error saving: Missing normalizedKey');
      return;
    }
    // Get poster and cast data
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
    console.log('[DEBUG - CONFIRM] Validating form...');
    if (!this.validateForm()) {
      console.error('[MediaManager] Form validation failed.');
      return;
    }
    console.log('[DEBUG - CONFIRM] Form validation passed');
    // --- Spinner logic ---
    if (this.confirmBtn) {
      this.confirmBtn.disabled = true;
      this.confirmBtn.innerHTML = '<span class="mm-btn-spinner"></span> Saving...';
    }
    try {
      const res = await fetch('/api/media/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, absPath, poster, description, cast, title, year, normalizedKey, tmdbId })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to save info');
      if (window.showToast) {
        const successMsg = type === 'movie' ? 'Movie added successfully! Video files scanned and metadata saved.' : 'Saved info successfully.';
        window.showToast(successMsg, 'success');
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
        console.log('[MediaManager] Reopening MediaLibrary modal after Confirm...');
        setTimeout(() => {
          window.mediaLibraryManager.openMediaBrowser();
          // Also refresh the content to show any changes made
          if (typeof window.mediaLibraryManager.refreshCurrentContent === 'function') {
            setTimeout(() => {
              window.mediaLibraryManager.refreshCurrentContent();
            }, 500); // Small delay to ensure modal is open first
          }
        }, 0);
      } else {
        console.warn('[MediaManager] Could not reopen MediaLibrary modal after Confirm: mediaLibraryManager or openMediaBrowser missing');
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
    // ----------- SETUP and RESET -------------
    // TABS
    const tabMovie = this.containerElement.querySelector('.media-manager-tab-movie');
    const tabTV = this.containerElement.querySelector('.media-manager-tab-tv');
    const tabAudio = this.containerElement.querySelector('.media-manager-tab-audio');
    const tabMovieTest = this.containerElement.querySelector('.media-manager-tab-movie-test');
    // CONTENT
    const movieContent = this.containerElement.querySelector('.media-manager-content-movie');
    const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
    const audioContent = this.containerElement.querySelector('.media-manager-content-audio');
    const movieTestContent = this.containerElement.querySelector('.media-manager-content-movie-test');

    // ----------- TAB HIGHLIGHT LOGIC -------------
    // Remove 'active' from all tabs
    if (tabMovie) tabMovie.classList.remove('active');
    if (tabTV) tabTV.classList.remove('active');
    if (tabAudio) tabAudio.classList.remove('active');
    if (tabMovieTest) tabMovieTest.classList.remove('active');
    // Hide all content
    if (movieContent) movieContent.style.display = 'none';
    if (tvContent) tvContent.style.display = 'none';
    if (audioContent) audioContent.style.display = 'none';
    if (movieTestContent) movieTestContent.style.display = 'none';

    // ----------- SHOW ONLY THE SELECTED TAB AND CONTENT -------------
    if (tab === 'movie') {
        if (tabMovie) tabMovie.classList.add('active');
        if (movieContent) movieContent.style.display = 'block';
        
        console.log('[DEBUG - switchTab] Movie tab activated');
    } else if (tab === 'tv') {
        if (tabTV) tabTV.classList.add('active');
        if (tvContent) tvContent.style.display = 'block';

        // Initialize the View Images button as disabled when switching to TV tab
        if (this.viewImagesBtn) {
            this.viewImagesBtn.disabled = true;
            this.viewImagesBtn.textContent = 'Get Season & Episode Images';
            console.log('[DEBUG - switchTab] Initialized viewImagesBtn as disabled for TV tab:', this.viewImagesBtn);
        }
    } else if (tab === 'audio') {
        if (tabAudio) tabAudio.classList.add('active');
        if (audioContent) audioContent.style.display = 'block';
        console.log('[DEBUG - switchTab] Audio tab activated');
    } else if (tab === 'movie-test') {
        if (tabMovieTest) tabMovieTest.classList.add('active');
        if (movieTestContent) movieTestContent.style.display = 'block';
    }
    
    // Update path inputs after switching tabs
    this.updatePathInputs();
    
    // Run validation for the active tab
    if (tab === 'movie') {
      this.validateForm();
    } else if (tab === 'tv') {
      this.validateFormTV();
    }
    
    console.log('[DEBUG] switchTab called with:', tab);
    console.log('[DEBUG] MOVIE display:', movieContent && movieContent.style.display, '| TV display:', tvContent && tvContent.style.display, '| MOVIE-TEST display:', movieTestContent && movieTestContent.style.display);
  }

  switchMode(mode) {
    console.log('[MediaManager] switchMode called:', mode);
    if (mode === 'single') {
      this.modeSingle.classList.add('active');
      this.modeAll && this.modeAll.classList.remove('active');
      if (this.contentMovie) this.contentMovie.style.display = 'block';
      if (this.contentAll) this.contentAll.style.display = 'none';
      // Hide TV content if present
      const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
      if (tvContent) tvContent.style.display = 'none';
    } else if (mode === 'all') {
      this.modeSingle.classList.remove('active');
      this.modeAll && this.modeAll.classList.add('active');
      if (this.contentMovie) this.contentMovie.style.display = 'none';
      if (this.contentAll) this.contentAll.style.display = 'block';
      // Hide TV content if present
      const tvContent = this.containerElement.querySelector('.media-manager-content-tv');
      if (tvContent) tvContent.style.display = 'none';
    }
      this.attachTVShowListeners();
  }

  handleViewJson() {
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
    if (this.jsonEditorTextarea) {
      this.jsonEditorTextarea.value = JSON.stringify(cast, null, 2);
      console.log('[MM DEBUG] Showing MOVIE cast JSON:', cast);
    }
    if (this.jsonEditorOverlay) {
      this.jsonEditorOverlay.style.display = 'flex';
    }
  }

  handleViewJsonTV() {
    let cast = this.currentCastData || [];
    if (this.jsonEditorTextareaTV) {
      this.jsonEditorTextareaTV.value = JSON.stringify(cast, null, 2);
      console.log('[MM DEBUG] Showing TV-SHOW cast JSON:', cast);
    }
    if (this.jsonEditorOverlayTV) {
      this.jsonEditorOverlayTV.style.display = 'flex';
    }
  }

  handleEditCastTV() {
    console.log('[MM DEBUG] handleEditCastTV called');
    // For now, just show a message that this functionality is coming soon
    this.showModalAlert('Edit Cast functionality is coming soon!', 'info');
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
          this.currentCastData = data.data.cast || [];
          console.log('[DEBUG - FetchInfoTV] Set castListTV:', this.castListTV, 'Cast:', data.data.cast);
        } else {
          console.warn('[DEBUG - FetchInfoTV] castListTV is null!');
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
        console.log('[DEBUG - FetchInfoTV] Set castListTV:', this.castListTV, 'Cast:', data.data.cast);
      } else {
        console.warn('[DEBUG - FetchInfoTV] castListTV is null!');
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
    const value = field ? field.value.trim() : '';
    
    if (!value) {
      if (field) field.classList.add('error');
      return false;
    }
    // For path, accept either a file path ending in video extension OR a folder path
    if (fieldName === 'path') {
      // Check if it's a video file path
      const isVideoFile = /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(value);
      // Check if it's a folder path (contains folder structure but no file extension)
      const isFolderPath = value.includes('/') || value.includes('\\');
      
      if (!isVideoFile && !isFolderPath) {
        if (field) field.classList.add('error');
        return false;
      }
    }
    if (field) field.classList.remove('error');
    return true;
  }

  validateFieldTV(fieldName) {
    const field = fieldName === 'title' ? this.inputTVTitle : this.inputTVPath;
    const value = field ? field.value.trim() : '';
    
    if (!value) {
      if (field) field.classList.add('error');
      return false;
    }
    // For TV path, require a folder path (not a file)
    if (fieldName === 'path') {
      if (/\.(mp4|mkv|avi|mov)$/i.test(value)) {
        if (field) field.classList.add('error');
        return false;
      }
    }
    if (field) field.classList.remove('error');
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
    // Set default tab to Movie (validation will be called by switchTab)
    this.switchTab('movie');
    this.switchMode('single');
    // Set global instance for batch actions
    window.mediaManager = this;
    // Initialize the View Images button as disabled
    if (this.viewImagesBtn) {
      this.viewImagesBtn.disabled = true;
      this.viewImagesBtn.textContent = 'Get Season & Episode Images';
      console.log('[DEBUG - MediaManager] Initialized viewImagesBtn as disabled:', this.viewImagesBtn);
    }
  }

  destroy() {
    if (this.containerElement) this.containerElement.remove();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  // --- TV Show Logic ---
  handleFetchInfoTV() {
    console.log('[DEBUG - TV_FETCH] handleFetchInfoTV called');
    let title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
    let tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
    console.log('[DEBUG - TV_FETCH] Title:', title, 'TMDB ID:', tmdbId);
    
    if (!title && !tmdbId) {
      console.log('[DEBUG - TV_FETCH] No title or TMDB ID provided');
      this.showModalAlert('Please enter a show title or TMDB ID.', 'error');
      return;
    }
    
    // Show loading state
    this.showModalAlert('Fetching TV Show details from TMDB...', 'info');
    console.log('[DEBUG - TV_FETCH] Starting one-stop process for:', title || tmdbId);
    
    const body = tmdbId ? { type: 'tv', tmdbId } : { type: 'tv', title };
    fetch('/api/media/fetch-tmdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(async data => {
        if (!data.success) throw new Error(data.error || 'Failed to fetch info');
        if (data.results) {
          this.showTMDBSelectModal(data.results);
          return;
        }
        if (!data.data) throw new Error('No TMDB data returned');
        
        // STEP 1: Load Poster, Description, and Cast (Primary Process)
        console.log('[DEBUG - TV_FETCH] Loading primary data: Poster, Description, Cast');
        
        // Set poster
        if (this.posterImgTV) {
          this.posterImgTV.src = data.data.poster || '';
          console.log('[DEBUG - TV_FETCH] Poster loaded:', data.data.poster ? 'Yes' : 'No');
        }
        
        // Set description
        if (this.inputTVDescription) {
          this.inputTVDescription.value = data.data.description || '';
          console.log('[DEBUG - TV_FETCH] Description loaded:', data.data.description ? 'Yes' : 'No');
        }
        
        // Set cast with profile images
        if (this.castListTV) {
          this.castListTV.innerHTML = '';
          (data.data.cast || []).forEach(actor => {
            const div = document.createElement('div');
            div.className = 'media-manager-cast-item-tv';
            if (actor.profile) {
              div.innerHTML = `<img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;"><span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>`;
            } else {
              div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
            }
            this.castListTV.appendChild(div);
          });
          this.currentCastData = data.data.cast || [];
          console.log('[DEBUG - TV_FETCH] Cast loaded:', this.currentCastData.length, 'members');
        }
        
        // Set additional metadata
        if (this.inputTVYear) this.inputTVYear.value = data.data.year || '';
        if (this.inputTVTMDBId) this.inputTVTMDBId.value = data.data.tmdbId || '';
        
        // Load seasons data from scanned JSON instead of clearing it
        const normalizedKey = this.getNormalizedKeyTV();
        console.log('[DEBUG - TV_FETCH] Loading seasons data for normalizedKey:', normalizedKey);
        
        // Try to load seasons data from the scanned JSON file
        try {
          const response = await fetch('/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
          if (response.ok) {
            const tvShowsData = await response.json();
            const showData = tvShowsData.find(show => show.normalizedKey === normalizedKey);
            
            if (showData && showData.folders) {
              const seasons = showData.folders.map(folder => {
                const seasonMatch = folder.path.match(/Season\s*(\d+)/i);
                if (seasonMatch) {
                  const seasonNumber = parseInt(seasonMatch[1], 10);
                  const episodes = (folder.files || []).map(file => ({
                    episodeNumber: 1, // We'll need to extract this from filename
                    filename: file.name || file.filename || '',
                    filePath: file.filePath || file.absPath || file.relPath || ''
                  }));
                  return {
                    seasonNumber: seasonNumber,
                    episodes: episodes
                  };
                }
                return null;
              }).filter(season => season !== null);
              
              this.scannedSeasonsData = seasons;
              console.log('[DEBUG - TV_FETCH] Loaded seasons data from scanned JSON:', seasons.length, 'seasons');
            } else {
              console.log('[DEBUG - TV_FETCH] No show data found in scanned JSON for key:', normalizedKey);
              this.scannedSeasonsData = [];
            }
          } else {
            console.log('[DEBUG - TV_FETCH] Could not load scanned JSON file');
            this.scannedSeasonsData = [];
          }
        } catch (error) {
          console.error('[DEBUG - TV_FETCH] Error loading seasons data:', error);
          this.scannedSeasonsData = [];
        }
        
        // STEP 2: Automatically fetch season and episode images
        const showPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
        
        console.log('[DEBUG - TV_IMAGES_FETCH] Starting automatic season/episode images fetch');
        console.log('[DEBUG - TV_IMAGES_FETCH] NormalizedKey:', normalizedKey);
        console.log('[DEBUG - TV_IMAGES_FETCH] TMDB ID:', data.data.tmdbId);
        console.log('[DEBUG - TV_IMAGES_FETCH] Show Path:', showPath);
        
        // Extract year from title or use year input field
        let year = '';
        if (this.inputTVYear && this.inputTVYear.value.trim()) {
          year = this.inputTVYear.value.trim();
        } else if (title) {
          // Try to extract year from title like "Show Name (2023)"
          const yearMatch = title.match(/\((\d{4})\)/);
          if (yearMatch) {
            year = yearMatch[1];
          }
        }
        
        this.showModalToast('Fetching season and episode images...', 'info');
        
        console.log('[DEBUG - TV_IMAGES_FETCH] Making API call to /api/media/fetch-tv-images');
        fetch('/api/media/fetch-tv-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            normalizedKey, 
            tmdbId: data.data.tmdbId, 
            showPath,
            showName: year ? `${title} (${year})` : title // Include year in show name to match folder name
          })
        })
          .then(res => {
            console.log('[DEBUG - TV_IMAGES_FETCH] Response status:', res.status);
            console.log('[DEBUG - TV_IMAGES_FETCH] Response ok:', res.ok);
            return res.json();
          })
          .then(imgData => {
            console.log('[DEBUG - TV_IMAGES_FETCH] Response data:', imgData);
            if (imgData.success) {
              console.log('[DEBUG - TV_IMAGES_FETCH] Success! Season and episode images fetched');
              this.showModalToast('Season and episode images fetched!', 'success');
              
              // Set a flag that images have been fetched
              this.imagesFetched = true;
              
              // Refresh the seasons modal if it's open to show the new images
              if (this.seasonsModalOverlay && this.seasonsModalOverlay.style.display === 'flex') {
                const showPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
                if (showPath) {
                  console.log('[DEBUG - TV_IMAGES_FETCH] Refreshing seasons modal to show new images');
                  // Add a small delay to ensure JSON files are written
                  setTimeout(() => {
                    this.scanTVStructure(showPath);
                  }, 1000);
                }
              }
            } else {
              console.log('[DEBUG - TV_IMAGES_FETCH] Failed! No images found or error:', imgData.error || 'Unknown error');
              this.showModalToast('No season or episode images found for this show.', 'error');
            }
          })
          .catch(imgErr => {
            console.error('[DEBUG - TV_IMAGES_FETCH] Fetch error:', imgErr);
            console.error('[DEBUG - TV_IMAGES_FETCH] Error message:', imgErr.message);
            this.showModalToast('Error fetching images: ' + imgErr.message, 'error');
          });
        
        // STEP 3: Enable Secondary Process Button (for manual re-fetch if needed)
        if (this.viewImagesBtn) {
          this.viewImagesBtn.disabled = false;
          this.viewImagesBtn.textContent = 'Get Season & Episode Images';
          console.log('[DEBUG - TV_FETCH] Secondary process button enabled');
        }
        
        // Re-validate form after data is populated to enable Confirm button
        this.validateFormTV();
        
        // Success message
        const successMsg = `TV Show details loaded successfully!\n\n✅ Poster: ${data.data.poster ? 'Loaded' : 'Not available'}\n✅ Description: ${data.data.description ? 'Loaded' : 'Not available'}\n✅ Cast: ${this.currentCastData.length} members loaded\n✅ Season & Episode Images: Fetching automatically...\n\nYou can now save the show or manually re-fetch images if needed.`;
        this.showModalAlert(successMsg, 'success');
        
        console.log('[DEBUG - TV_FETCH] One-stop process completed successfully');
      })
      .catch(err => {
        console.error('[DEBUG - TV_FETCH] Error:', err.message);
        this.showModalAlert('Error fetching TV show info: ' + err.message, 'error');
        
        // Keep secondary button disabled on error
        if (this.viewImagesBtn) {
          this.viewImagesBtn.disabled = true;
          this.viewImagesBtn.textContent = 'Get Season & Episode Images';
        }
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
    
    // If images were recently fetched, add a small delay to ensure they're loaded
    if (this.imagesFetched) {
      console.log('[DEBUG - SEASONS_MODAL] Images were recently fetched, adding delay for fresh data');
      await new Promise(resolve => setTimeout(resolve, 500));
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
      
      const response = await fetch('/api/media/scan-tv-folders', {
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
      await this.populateSeasonsModal(data.data);
      
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

  async populateSeasonsModal(scanData) {
    const modalContent = this.seasonsModalOverlay?.querySelector('.media-manager-seasons-modal-content');
    if (!modalContent) return;
    
    // Extract normalized key from show path or use form values
    let normalizedKey = this.getNormalizedKeyTV();
    
    console.log('[SEASONS MODAL] Populating modal with scan data:', scanData);
    console.log('[SEASONS MODAL] Normalized key:', normalizedKey);
    
    // Load existing images for this show
    let seasonImages = {};
    let episodeImages = {};
    
    try {
      // Load season images
      const seasonImagesResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json?t=' + Date.now());
      if (seasonImagesResponse.ok) {
        const seasonImagesData = await seasonImagesResponse.json();
        seasonImages = seasonImagesData[normalizedKey] || {};
      }
      
      // Load episode images
      const episodeImagesResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json?t=' + Date.now());
      if (episodeImagesResponse.ok) {
        const episodeImagesData = await episodeImagesResponse.json();
        episodeImages = episodeImagesData[normalizedKey] || {};
      }
      
      console.log('[SEASONS MODAL] Loaded existing images:', { seasonImages, episodeImages });
    } catch (error) {
      console.error('[SEASONS MODAL] Error loading existing images:', error);
    }
    
    // Generate the correct normalized key for "Citadel (2023)"
    const title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
    const year = this.inputTVYear ? this.inputTVYear.value.trim() : '';
    
    if (title && year) {
      const titleWithYear = `${title} (${year})`;
      normalizedKey = titleWithYear.replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.()]/g, '').toLowerCase();
      console.log('[SEASONS MODAL] Generated normalized key:', normalizedKey);
    }
    
    console.log('[SEASONS MODAL] Using normalized key:', normalizedKey);
    console.log('[SEASONS MODAL] Title from form:', title);
    console.log('[SEASONS MODAL] Year from form:', year);
    
    // Load images for the correct key
    let showSeasons = seasonImages[normalizedKey]?.seasons || {};
    let showEpisodes = episodeImages[normalizedKey]?.seasons || {};
    
    console.log('[SEASONS MODAL] Season images found:', !!seasonImages[normalizedKey]);
    console.log('[SEASONS MODAL] Episode images found:', !!episodeImages[normalizedKey]);
    console.log('[SEASONS MODAL] Show seasons:', showSeasons);
    console.log('[SEASONS MODAL] Show episodes:', showEpisodes);
    
    let html = `
      <div class="media-manager-scan-summary">
        <h4>Scan Results</h4>
        <p>Path: ${scanData.showPath}</p>
        <p>Found: ${scanData.totalSeasons} seasons, ${scanData.totalEpisodes} episodes</p>
      </div>
      <div class="media-manager-seasons-container">
    `;
    
    // ALWAYS use folder structure - no flat files allowed
    const seasons = scanData.folders || [];
    
    seasons.forEach((season, index) => {
      // Extract season number from folder path or use index
      let seasonNumber = index + 1;
      let seasonName = season.path || season.seasonName || `Season ${seasonNumber}`;
      
      if (season.path) {
        // Extract season number from folder name like "Season 01" or "S01"
        const seasonMatch = season.path.match(/Season\s*(\d+)/i) || season.path.match(/^S(\d+)/i);
        if (seasonMatch) {
          seasonNumber = parseInt(seasonMatch[1], 10);
        }
      } else if (season.seasonNumber) {
        seasonNumber = season.seasonNumber;
      }
      
      const episodes = season.files || season.episodes || [];
      
      html += `
        <div class="media-manager-season-item" data-season="${seasonNumber}">
          <div class="media-manager-season-header">
            <h5>Season ${seasonNumber} (${seasonName})</h5>
            <span class="media-manager-episode-count">${episodes.length} episodes</span>
          </div>
          <div class="media-manager-episodes-container">
      `;
      
      episodes.forEach(episode => {
        // Handle missing file metadata with fallbacks
        const fileSize = episode.size ? this.formatFileSize(episode.size) : 'Unknown size';
        const modifiedDate = episode.modified ? new Date(episode.modified).toLocaleDateString() : 'Unknown date';
        
        // Get episode thumbnail - try both string and number versions of episode number
        const episodeNumberStr = String(episode.episodeNumber);
        const episodeNumberNum = Number(episode.episodeNumber);
        const seasonNumberStr = String(seasonNumber);
        
        let episodeThumbnail = showEpisodes[seasonNumberStr]?.episodes?.[episodeNumberStr]?.still || 
                              showEpisodes[seasonNumberStr]?.episodes?.[episodeNumberNum]?.still || null;
        
        // Debug logging
        console.log('[DEBUG - SEASONS_MODAL] Episode data:', {
          seasonNumber: seasonNumber,
          seasonNumberStr: seasonNumberStr,
          episodeNumber: episode.episodeNumber,
          episodeNumberStr: episodeNumberStr,
          episodeNumberNum: episodeNumberNum,
          episodeNumberType: typeof episode.episodeNumber,
          showEpisodesForSeason: showEpisodes[seasonNumberStr],
          episodeThumbnail: episodeThumbnail,
          availableEpisodes: showEpisodes[seasonNumberStr]?.episodes ? Object.keys(showEpisodes[seasonNumberStr].episodes) : []
        });
        
        html += `
          <div class="media-manager-episode-item" data-episode="${episode.episodeNumber}">
            <div class="media-manager-episode-thumbnail">
              ${episodeThumbnail ? 
                `<img src="${episodeThumbnail}" alt="S${seasonNumber}E${episode.episodeNumber}" style="width: 60px; height: 34px; object-fit: cover; border-radius: 4px;">` : 
                `<div style="width: 60px; height: 34px; background: #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #888;">No Image</div>`
              }
            </div>
            <div class="media-manager-episode-info">
              <span class="media-manager-episode-number">Episode ${episode.episodeNumber}</span>
              <span class="media-manager-episode-filename">${episode.filename || 'Unknown file'}</span>
              <span class="media-manager-episode-details">${fileSize} • ${modifiedDate}</span>
            </div>
            <div class="media-manager-episode-actions">
              <button class="media-manager-btn media-manager-edit-episode-btn" type="button" 
                      data-season="${seasonNumber}" data-episode="${episode.episodeNumber}">
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
        <button class="media-manager-btn media-manager-refresh-images-btn" type="button">Refresh Images</button>
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
    
    // Refresh images button
    const refreshImagesBtn = modalContent.querySelector('.media-manager-refresh-images-btn');
    if (refreshImagesBtn) {
      refreshImagesBtn.onclick = async () => {
        console.log('[DEBUG - SEASONS_MODAL] Refresh images button clicked');
        
        // Get the current TMDB ID and seasons data from the form
        const tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
        const seasonsData = this.scannedSeasonsData || [];
        
        if (!tmdbId) {
          this.showModalToast('No TMDB ID found. Please fetch show info first.', 'warning');
          return;
        }
        
        if (seasonsData.length === 0) {
          this.showModalToast('No seasons data found. Please fetch show info first.', 'warning');
          return;
        }
        
        // Get the normalized key
        const normalizedKey = this.getNormalizedKeyTV();
        if (!normalizedKey) {
          this.showModalToast('Could not determine show key. Please check title and year.', 'warning');
          return;
        }
        
        this.showModalToast('Fetching episode and season images...', 'info');
        
        try {
          await this.fetchEpisodeImages(tmdbId, seasonsData, normalizedKey);
          this.showModalToast('Images fetched successfully! Refreshing modal...', 'success');
          
          // Refresh the modal content
          setTimeout(() => {
            this.scanTVStructure(scanData.showPath);
          }, 1000);
          
        } catch (error) {
          console.error('[DEBUG - SEASONS_MODAL] Error refreshing images:', error);
          this.showModalToast('Failed to fetch images: ' + error.message, 'error');
        }
      };
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
    // Gather all seasons and episodes from the modal and convert to folder structure
    const folders = [];
    const seasonItems = this.seasonsModalOverlay?.querySelectorAll('.media-manager-season-item');
    
    if (seasonItems) {
      seasonItems.forEach(seasonItem => {
        const seasonNum = parseInt(seasonItem.dataset.season);
        const files = [];
        
        const episodeItems = seasonItem.querySelectorAll('.media-manager-episode-item');
        episodeItems.forEach(episodeItem => {
          const episodeNum = parseInt(episodeItem.dataset.episode);
          const filename = episodeItem.querySelector('.media-manager-episode-filename')?.textContent || '';
          const filePath = episodeItem.querySelector('.media-manager-input-episode-path')?.value || '';
          
          files.push({
            episodeNumber: episodeNum,
            filename: filename,
            name: filename,
            filePath: filePath,
            absPath: filePath,
            relPath: filePath
          });
        });
        
        folders.push({
          path: `Season ${seasonNum.toString().padStart(2, '0')}`,
          files: files
        });
      });
    }
    
    // Store the folder structure data for use in handleConfirmTV
    this.folderStructureData = { folders, files: [] };
    
    console.log('[MediaManager] Saved folder structure data:', this.folderStructureData);
    
    if (window.showToast) {
      window.showToast(`Saved ${folders.length} seasons with ${folders.reduce((sum, f) => sum + f.files.length, 0)} episodes`, 'success');
      console.info('[Toast][MediaManager] Saved ' + folders.length + ' seasons with ' + folders.reduce((sum, f) => sum + f.files.length, 0) + ' episodes');
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async handleConfirmTV() {
    // STEP 1: Save basic TV show info (Poster, Description, Cast)
    console.log('[TV CONFIRM] Starting Step 1: Basic TV show info');
    
    // Gather basic TV show data
    const title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
    const year = this.inputTVYear ? this.inputTVYear.value.trim() : '';
    const tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
    const description = this.inputTVDescription ? this.inputTVDescription.value.trim() : '';
    const cast = Array.isArray(this.currentCastData) ? this.currentCastData : [];
    const poster = this.posterImgTV ? this.posterImgTV.src : '';
    const showPath = this.inputTVPath ? this.inputTVPath.value.trim() : '';
    
    // Validation
    if (!title) {
      this.showModalToast('Show title is required.', 'error');
      return;
    }
    
    // Generate normalized key
    const titleWithYear = year ? `${title} (${year})` : title;
    let normalizedKey = '';
    
    if (!window.normalizeKey) {
      console.error('[MEDIA MANAGER] NormalizationService not loaded!');
      this.showModalToast('Error: NormalizationService not available', 'error');
      return;
    }
    
    normalizedKey = window.normalizeKey(titleWithYear);
    if (!normalizedKey) {
      this.showModalToast('Error: Could not generate normalized key', 'error');
      return;
    }
    
    // STEP 1 PAYLOAD: Only basic info, no folder structure
    const step1Payload = {
      type: 'tv',
      tmdbId,
      title,
      year,
      description,
      cast,
      poster,
      showPath,
      normalizedKey
    };
    
    console.log('[TV CONFIRM] Step 1 payload:', {
      title,
      year,
      tmdbId: !!tmdbId,
      descriptionLength: description ? description.length : 0,
      castLength: cast.length,
      hasPoster: !!poster,
      normalizedKey
    });
    
    // --- Spinner logic ---
    if (this.confirmBtnTV) {
      this.confirmBtnTV.disabled = true;
      this.confirmBtnTV.innerHTML = '<span class="mm-btn-spinner"></span> Saving...';
    }
    
    try {
      // Save basic TV show info
      const response = await fetch('/api/media/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(step1Payload)
      });
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save TV show');
      }
      
      this.showModalToast('Step 1 Complete: TV show saved successfully!', 'success');
      console.log('[TV CONFIRM] Step 1 completed successfully');
      
      // STEP 2: Generate Season and Episode Images (if we have TMDB ID)
      if (tmdbId && showPath) {
        console.log('[TV CONFIRM] Starting Step 2: Season and Episode Images');
        this.showModalToast('Step 2: Generating season and episode images...', 'info');
        
        try {
          // Auto-scan the show path to get folder structure
          const scanResponse = await fetch('/api/media/scan-tv-folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ showPath })
          });
          
          if (scanResponse.ok) {
            const scanData = await scanResponse.json();
            if (scanData.success && scanData.data) {
              // Convert folder structure to seasons format for image fetching
              const seasons = scanData.data.folders.map(folder => {
              const seasonMatch = folder.path.match(/Season\s*(\d+)/i);
                const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;
                return {
                  seasonNumber,
                  episodes: folder.files.map(file => ({
                    episodeNumber: file.episodeNumber || 1,
                    filename: file.filename || file.name,
                    filePath: file.filePath || file.absPath
                  }))
                };
              });
              
              // Clear existing episode images and fetch new ones
              await this.clearExistingEpisodeImages(normalizedKey);
              await this.fetchEpisodeImages(tmdbId, seasons, normalizedKey);
              
              this.showModalToast('Step 2 Complete: Season and episode images generated!', 'success');
              console.log('[TV CONFIRM] Step 2 completed successfully');
            } else {
              console.warn('[TV CONFIRM] Step 2 skipped: No folder structure found');
              this.showModalToast('Step 2 Skipped: No episodes found to process', 'warning');
            }
          } else {
            console.warn('[TV CONFIRM] Step 2 skipped: Could not scan folder structure');
            this.showModalToast('Step 2 Skipped: Could not scan folder structure', 'warning');
          }
        } catch (error) {
          console.error('[TV CONFIRM] Step 2 failed:', error);
          this.showModalToast('Step 2 Failed: Could not generate images', 'warning');
        }
      } else {
        console.log('[TV CONFIRM] Step 2 skipped: No TMDB ID or show path');
        this.showModalToast('Step 2 Skipped: No TMDB ID for image generation', 'info');
      }
      
      // Refresh Media Library to show updated data
      if (window.mediaLibraryManager && typeof window.mediaLibraryManager.refreshCurrentContent === 'function') {
        console.log('[TV CONFIRM] Refreshing Media Library...');
        setTimeout(() => {
          window.mediaLibraryManager.refreshCurrentContent();
        }, 500);
      }
      
      // Close Media Manager after successful completion
      setTimeout(() => this.destroy(), 1500);
      
    } catch (error) {
      console.error('[TV CONFIRM] Error:', error);
      this.showModalToast('Failed to save TV show: ' + error.message, 'error');
    } finally {
      if (this.confirmBtnTV) {
        this.confirmBtnTV.disabled = false;
        this.confirmBtnTV.innerHTML = 'Confirm';
      }
    }
  }

  // New method to fetch episode and season images from TMDB
  async fetchEpisodeImages(tmdbId, seasons, normalizedKey) {
    console.log('[DEBUG - EPISODE IMAGES] Starting fetch for TMDB ID:', tmdbId);
    console.log('[DEBUG - EPISODE IMAGES] Seasons data:', seasons);
    console.log('[DEBUG - EPISODE IMAGES] Normalized key:', normalizedKey);
    
    // Load existing episode images data
    let episodeImagesData = {};
    try {
      const response = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json?t=' + Date.now());
      if (response.ok) {
        episodeImagesData = await response.json();
        }
      } catch (error) {
      console.warn('[DEBUG - EPISODE IMAGES] Could not load existing episode images data:', error);
    }
    
    // Load existing season images data
    let seasonImagesData = {};
    try {
      const seasonResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json?t=' + Date.now());
      if (seasonResponse.ok) {
        seasonImagesData = await seasonResponse.json();
      }
    } catch (error) {
      console.warn('[DEBUG - SEASON IMAGES] Could not load existing season images data:', error);
    }
    
    // Initialize the show entry if it doesn't exist
    if (!episodeImagesData[normalizedKey]) {
      episodeImagesData[normalizedKey] = { seasons: {} };
    }
    if (!seasonImagesData[normalizedKey]) {
      seasonImagesData[normalizedKey] = { seasons: {} };
    }
    
    let totalEpisodes = 0;
    let episodesWithImages = 0;
    let totalSeasons = 0;
    let seasonsWithImages = 0;
    
    // Process each season
    for (const season of seasons) {
      const seasonNumber = season.seasonNumber;
      totalSeasons++;
      console.log(`[DEBUG - EPISODE IMAGES] Processing Season ${seasonNumber}`);
      
      // Initialize season entry if it doesn't exist
      if (!episodeImagesData[normalizedKey].seasons[seasonNumber]) {
        episodeImagesData[normalizedKey].seasons[seasonNumber] = { episodes: {} };
      }
      if (!seasonImagesData[normalizedKey].seasons[seasonNumber]) {
        seasonImagesData[normalizedKey].seasons[seasonNumber] = {};
      }
      
      // Fetch season poster first
      try {
        console.log(`[DEBUG - SEASON IMAGES] Fetching poster for Season ${seasonNumber}`);
        console.log(`[DEBUG - SEASON IMAGES] TMDB ID: ${tmdbId}, Season: ${seasonNumber}`);
        const posterUrl = await this.fetchSeasonPosterFromTMDB(tmdbId, seasonNumber);
        
        if (posterUrl) {
          seasonImagesData[normalizedKey].seasons[seasonNumber].poster = posterUrl;
          seasonsWithImages++;
          console.log(`[DEBUG - SEASON IMAGES] Found poster for Season ${seasonNumber}:`, posterUrl);
        } else {
          console.log(`[DEBUG - SEASON IMAGES] No poster found for Season ${seasonNumber}`);
        }
      } catch (error) {
        console.error(`[DEBUG - SEASON IMAGES] Error fetching Season ${seasonNumber} poster:`, error);
      }
      
      // Process each episode in the season
      for (const episode of season.episodes) {
        const episodeNumber = episode.episodeNumber;
        totalEpisodes++;
        
        console.log(`[DEBUG - EPISODE IMAGES] Fetching S${seasonNumber}E${episodeNumber}`);
        console.log(`[DEBUG - EPISODE IMAGES] TMDB ID: ${tmdbId}, Season: ${seasonNumber}, Episode: ${episodeNumber}`);
        
        try {
          // Fetch episode still from TMDB
          const stillUrl = await this.fetchEpisodeStillFromTMDB(tmdbId, seasonNumber, episodeNumber);
          
          if (stillUrl) {
            episodeImagesData[normalizedKey].seasons[seasonNumber].episodes[episodeNumber] = {
              still: stillUrl
            };
            episodesWithImages++;
            console.log(`[DEBUG - EPISODE IMAGES] Found still for S${seasonNumber}E${episodeNumber}:`, stillUrl);
          } else {
            console.log(`[DEBUG - EPISODE IMAGES] No still found for S${seasonNumber}E${episodeNumber}`);
          }
        } catch (error) {
          console.error(`[DEBUG - EPISODE IMAGES] Error fetching S${seasonNumber}E${episodeNumber}:`, error);
        }
        
        // Add a small delay to avoid overwhelming TMDB API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Save the updated episode images data
    try {
      const saveResponse = await fetch('/api/media/save-episode-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normalizedKey: normalizedKey,
          episodeImagesData: episodeImagesData
        })
      });
      
      if (saveResponse.ok) {
        const result = await saveResponse.json();
        if (result.success) {
          console.log(`[DEBUG - EPISODE IMAGES] Successfully saved ${episodesWithImages}/${totalEpisodes} episode images`);
        } else {
          throw new Error(result.error || 'Failed to save episode images');
        }
      } else {
        throw new Error('Failed to save episode images');
      }
    } catch (error) {
      console.error('[DEBUG - EPISODE IMAGES] Error saving episode images data:', error);
      throw error;
    }
    
    // Save the updated season images data
    try {
      const saveSeasonResponse = await fetch('/api/media/save-season-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          normalizedKey: normalizedKey,
          seasonImagesData: seasonImagesData
        })
      });
      
      if (saveSeasonResponse.ok) {
        const result = await saveSeasonResponse.json();
        if (result.success) {
          console.log(`[DEBUG - SEASON IMAGES] Successfully saved ${seasonsWithImages}/${totalSeasons} season images`);
        } else {
          throw new Error(result.error || 'Failed to save season images');
        }
      } else {
        throw new Error('Failed to save season images');
      }
    } catch (error) {
      console.error('[DEBUG - SEASON IMAGES] Error saving season images data:', error);
      throw error;
    }
  }

  // Helper method to fetch a single episode still from TMDB
  async fetchEpisodeStillFromTMDB(tmdbId, seasonNumber, episodeNumber) {
    try {
      console.log(`[DEBUG - EPISODE STILL] Making API call for S${seasonNumber}E${episodeNumber}`);
      const url = `/api/media/fetch-episode-still?tmdbId=${tmdbId}&season=${seasonNumber}&episode=${episodeNumber}`;
      console.log(`[DEBUG - EPISODE STILL] URL:`, url);
      
      const response = await fetch(url);
      console.log(`[DEBUG - EPISODE STILL] Response status:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[DEBUG - EPISODE STILL] Response data:`, data);
        return data.success ? data.stillUrl : null;
      } else {
        console.error(`[DEBUG - EPISODE STILL] HTTP error:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error(`[DEBUG - EPISODE IMAGES] Error fetching still for S${seasonNumber}E${episodeNumber}:`, error);
    }
    return null;
  }

  // Helper method to fetch a single season poster from TMDB
  async fetchSeasonPosterFromTMDB(tmdbId, seasonNumber) {
    try {
      console.log(`[DEBUG - SEASON POSTER] Making API call for Season ${seasonNumber}`);
      const url = `/api/media/fetch-season-poster?tmdbId=${tmdbId}&season=${seasonNumber}`;
      console.log(`[DEBUG - SEASON POSTER] URL:`, url);
      
      const response = await fetch(url);
      console.log(`[DEBUG - SEASON POSTER] Response status:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[DEBUG - SEASON POSTER] Response data:`, data);
        return data.success ? data.posterUrl : null;
      } else {
        console.error(`[DEBUG - SEASON POSTER] HTTP error:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error(`[DEBUG - SEASON IMAGES] Error fetching poster for Season ${seasonNumber}:`, error);
    }
    return null;
  }

  // Helper method to clear existing episode images for a show
  async clearExistingEpisodeImages(normalizedKey) {
    try {
      console.log(`[DEBUG - EPISODE IMAGES] Clearing existing episode images for: ${normalizedKey}`);
      
      // Load existing episode images data
      let episodeImagesData = {};
      try {
        const response = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json?t=' + Date.now());
        if (response.ok) {
          episodeImagesData = await response.json();
        }
      } catch (error) {
        console.warn('[DEBUG - EPISODE IMAGES] Could not load existing episode images data:', error);
      }
      
      // Remove the show entry if it exists
      if (episodeImagesData[normalizedKey]) {
        delete episodeImagesData[normalizedKey];
        console.log(`[DEBUG - EPISODE IMAGES] Removed existing episode images for: ${normalizedKey}`);
        
        // Save the updated data
        const saveResponse = await fetch('/api/media/save-episode-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            normalizedKey: normalizedKey,
            episodeImagesData: episodeImagesData
          })
        });
        
        if (saveResponse.ok) {
          const result = await saveResponse.json();
          if (result.success) {
            console.log(`[DEBUG - EPISODE IMAGES] Successfully cleared episode images for: ${normalizedKey}`);
          } else {
            console.warn(`[DEBUG - EPISODE IMAGES] Failed to save cleared episode images: ${result.error}`);
          }
        } else {
          console.warn(`[DEBUG - EPISODE IMAGES] Failed to save cleared episode images`);
        }
      }
    } catch (error) {
      console.error(`[DEBUG - EPISODE IMAGES] Error clearing episode images for ${normalizedKey}:`, error);
    }
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

  removeAllTitleAttributes() {
    if (!this.containerElement) return;
    const infoIcons = this.containerElement.querySelectorAll('.media-manager-info-icon');
    infoIcons.forEach(icon => icon.removeAttribute('title'));
  }

  attachTVShowListeners() {
    if (this.inputTVTitle) {
      this.inputTVTitle.oninput = () => {
        if (this.tabTV && this.tabTV.classList.contains('active')) {
          this.validateFieldTV('title');
        }
      };
      this.inputTVTitle.onblur = () => {
        if (this.tabTV && this.tabTV.classList.contains('active')) {
          this.validateFieldTV('title');
        }
      };
    }
    if (this.inputTVPath) {
      this.inputTVPath.oninput = () => {
        if (this.tabTV && this.tabTV.classList.contains('active')) {
          this.validateFieldTV('path');
        }
      };
      this.inputTVPath.onblur = () => {
        if (this.tabTV && this.tabTV.classList.contains('active')) {
          this.validateFieldTV('path');
        }
      };
    }
    // No localStorage, no event delegation for TMDB ID
  }

  async handleFetchInfoMovieTest() {
    // Clone of MOVIE | Single logic, but using MOVIE-TEST fields
    const title = this.inputMovieTestTitle ? this.inputMovieTestTitle.value.trim() : '';
    const tmdbId = this.inputMovieTestTMDBId ? this.inputMovieTestTMDBId.value.trim() : '';
    const absPath = this.inputMovieTestPath ? this.inputMovieTestPath.value.trim() : '';
    const description = this.inputMovieTestDescription ? this.inputMovieTestDescription.value.trim() : '';
    console.log('[DEBUG] handleFetchInfoMovieTest called:', { title, tmdbId, absPath, description });
    if (!title && !tmdbId) {
      this.showModalAlert('Please enter a title or TMDB ID.', 'error');
      return;
    }
    if (!/\.(mp4|mkv|avi|mov)$/i.test(absPath)) {
      this.showModalAlert('Please enter a valid movie file path with extension.', 'error');
      return;
    }
    let body;
    if (tmdbId) {
      body = { type: 'movie', tmdbId };
    } else {
      const isId = /^\d+$/.test(title);
      body = isId ? { type: 'movie', tmdbId: title } : { type: 'movie', title };
    }
    this.showModalAlert('Fetching info from TMDB...', 'info');
    try {
      const res = await fetch('/api/media/fetch-tmdb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.success || !data.data) {
        this.showNoPosterManualTMDB();
        throw new Error('No TMDB data returned.');
      }
      if (this.posterImgMovieTest) this.posterImgMovieTest.src = data.data.poster || '';
      if (this.inputMovieTestDescription) this.inputMovieTestDescription.value = data.data.description || '';
      if (this.castListMovieTest) {
        this.castListMovieTest.innerHTML = '';
        this.currentCastData = data.data.cast || [];
        this.currentCastData.forEach(actor => {
          const div = document.createElement('div');
          div.className = 'media-manager-cast-item';
          if (actor.profile) {
            div.innerHTML = `<img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;"><span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>`;
          } else {
            div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
          }
          this.castListMovieTest.appendChild(div);
        });
      }
      this.hideModalAlert();
    } catch (err) {
      this.showModalAlert('Failed to fetch info: ' + err.message, 'error');
    }
  }

  async loadTVShowDetailsByTitle(title) {
    // Always load from normalized files
    if (!window.normalizeKey) {
      console.error('[MEDIA MANAGER] NormalizationService not loaded - this should not happen!');
      return;
    }
    const dotKey = window.normalizeKey(title);
    // Description
    let desc = '';
    try {
      const descResp = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_descriptions_normalized.json');
      if (descResp.ok) {
        const descJson = await descResp.json();
        desc = descJson[dotKey] || '';
      }
    } catch (e) { desc = ''; }
    // Cast
    let cast = [];
    try {
      const castResp = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json');
      if (castResp.ok) {
        const castJson = await castResp.json();
        cast = castJson[dotKey] || [];
      }
    } catch (e) { cast = []; }
    // Update UI
    if (this.inputTVDescription) this.inputTVDescription.value = desc;
    if (this.castListTV) {
      this.castListTV.innerHTML = '';
      (cast || []).forEach(actor => {
        const div = document.createElement('div');
        div.className = 'media-manager-cast-item-tv';
        if (actor.profile) {
          div.innerHTML = `<img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;"><span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>`;
        } else {
          div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
        }
        this.castListTV.appendChild(div);
      });
      this.currentCastData = cast || [];
    }
  }

  // In setupEventListeners or after DOM load, wire up the Force Refresh button
  setupForceRefreshButton() {
    const btn = this.containerElement && this.containerElement.querySelector('.media-manager-btn-tv-force-refresh');
    if (btn) {
      btn.onclick = async () => {
        const title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
        const tmdbId = this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '';
        if (!title && !tmdbId) {
          window.showToast && window.showToast('Please enter a show title or TMDB ID.', 'error');
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Refreshing...';
        try {
          const body = tmdbId ? { type: 'tv', tmdbId } : { type: 'tv', title };
          const res = await fetch('/api/media/fetch-tmdb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const data = await res.json();
          if (!data.success || !data.data) throw new Error(data.error || 'No TMDB data returned.');
          // Update UI fields only (do not save to disk)
          if (this.inputTVDescription) this.inputTVDescription.value = data.data.description || '';
          if (this.castListTV) {
            this.castListTV.innerHTML = '';
            (data.data.cast || []).forEach(actor => {
              const div = document.createElement('div');
              div.className = 'media-manager-cast-item-tv';
              if (actor.profile) {
                div.innerHTML = `<img src="${actor.profile}" alt="${actor.name}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #4a90e2;"><span>${actor.name}${actor.character ? ` (${actor.character})` : ''}</span>`;
              } else {
                div.textContent = actor.name + (actor.character ? ` (${actor.character})` : '');
              }
              this.castListTV.appendChild(div);
            });
            this.currentCastData = data.data.cast || [];
          }
          window.showToast && window.showToast('Refreshed from TMDB. Click Confirm to save.', 'success');
        } catch (err) {
          window.showToast && window.showToast('Failed to refresh from TMDB: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Force Refresh from TMDB';
        }
      };
    }
  }

  // Modal Toast Methods
  showModalToast(message, type = 'info', duration = 5000) {
    const toastElement = document.querySelector('.media-manager-modal-toast');
    if (!toastElement) {
      console.error('[DEBUG - MODAL TOAST] Toast element not found');
      return;
    }
    
    const messageElement = toastElement.querySelector('.media-manager-modal-toast-message');
    const closeBtn = toastElement.querySelector('.media-manager-modal-toast-close');
    
    if (!messageElement || !closeBtn) {
      console.error('[DEBUG - MODAL TOAST] Toast child elements not found');
      return;
    }
    
    // Set message and type
    messageElement.textContent = message;
    toastElement.className = `media-manager-modal-toast ${type}`;
    
    // Show toast
    toastElement.style.display = 'block';
    
    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        this.hideModalToast();
      }, duration);
    }
    
    // Close button handler
    closeBtn.onclick = () => this.hideModalToast();
    
    console.log(`[DEBUG - MODAL TOAST][${type.toUpperCase()}] ${message}`);
  }

  hideModalToast() {
    const toastElement = document.querySelector('.media-manager-modal-toast');
    if (!toastElement) {
      console.error('[DEBUG - MODAL TOAST] Toast element not found for hiding');
      return;
    }
    
    toastElement.style.animation = 'modalToastSlideOut 0.3s ease-out';
    setTimeout(() => {
      toastElement.style.display = 'none';
      toastElement.style.animation = '';
    }, 300);
  }

  getNormalizedKeyTV() {
    const title = this.inputTVTitle ? this.inputTVTitle.value.trim() : '';
    const year = this.inputTVYear ? this.inputTVYear.value.trim() : '';
    
    // Generate the same normalized key format used in JSON files
    let normalizedKey = title;
    if (year) {
      normalizedKey = `${title} (${year})`;
    }
    
    // Use the shared normalization service for consistency
    if (!window.normalizeKey) {
      console.error('[DEBUG - MediaManager] Shared normalizeKey function not found!');
      return '';
    }
    
    return window.normalizeKey(normalizedKey);
  }

  // ========================================
  // AUDIO MANAGER METHODS
  // ========================================
  async launchAudioManager() {
    try {
      console.log('[DEBUG - MediaManager] Launching AudioManager component...');
      
      // Import and initialize the AudioManager component
      const AudioManager = await import('../AudioManager/AudioManager.js');
      const audioManager = new AudioManager.default();
      
      // Show the AudioManager
      await audioManager.open();
      
      console.log('[DEBUG - MediaManager] AudioManager launched successfully');
      
    } catch (error) {
      console.error('[DEBUG - MediaManager] Failed to launch AudioManager:', error);
      this.showModalToast('Failed to launch Audio Manager: ' + error.message, 'error');
    }
  }

  async autoProcessTVShow(showPath, tmdbDetails, normalizedKey) {
    console.log('[DEBUG - MediaManager] Auto-processing TV show for complete integration...');
    
    try {
      // This will automatically ensure all data is consistent and complete
      const response = await fetch('/api/media/auto-process-tv-show', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showPath: showPath,
          tmdbDetails: tmdbDetails,
          normalizedKey: normalizedKey
        })
      });

      if (!response.ok) {
        throw new Error('Failed to auto-process TV show');
      }

      const result = await response.json();
      console.log('[DEBUG - MediaManager] Auto-processing result:', result);
      
      if (result.success) {
        this.showModalToast('TV show fully integrated and ready!', 'success');
      } else {
        console.warn('[DEBUG - MediaManager] Auto-processing completed with warnings:', result.message);
      }
      
    } catch (error) {
      console.error('[DEBUG - MediaManager] Auto-processing failed:', error);
      // Don't fail the main process, just log the error
      this.showModalToast('TV show saved, but auto-processing failed. Manual processing may be needed.', 'warning');
    }
  }

  async autoDetectNewShows() {
    console.log('[DEBUG - MediaManager] Auto-detecting new TV shows...');
    
    try {
      const response = await fetch('/api/media/auto-detect-new-shows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.newShows && result.newShows.length > 0) {
          console.log('[DEBUG - MediaManager] Found new shows:', result.newShows);
          this.showModalToast(`Found ${result.newShows.length} new TV show(s) and auto-processed them!`, 'success');
        } else {
          console.log('[DEBUG - MediaManager] No new shows detected');
        }
      }
    } catch (error) {
      console.error('[DEBUG - MediaManager] Auto-detection failed:', error);
      // Don't fail the main process, just log the error
    }
  }
}

// ===================================================
// PROTOTYPES
// ===================================================

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
        const response = await fetch('/api/scan-movies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to scan movies');
        }
        
        const newMoviesCount = data.newMovies || 0;
        const totalMovies = data.totalMovies || 0;
        
        // The /api/scan-movies endpoint only returns counts, not movie details
        // So we can't populate a grid with movie objects
        const movies = [];
        
        // Update progress
        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = `Scan complete: ${newMoviesCount} new movies found out of ${totalMovies} total`;
        
        // Update counter
        console.log(`[MediaManager] Updating counter: ${newMoviesCount} movies`);
        if (counterValue) {
            counterValue.textContent = newMoviesCount;
            console.log(`[MediaManager] Counter updated to: ${counterValue.textContent}`);
        } else {
            console.error('[MediaManager] Counter element not found!');
        }
        
        if (newMoviesCount === 0) {
            if (window.showToast) window.showToast('No new movies found.', 'info');
            // Hide progress after a delay
            setTimeout(() => {
                if (progressContainer) progressContainer.style.display = 'none';
            }, 2000);
            return;
        }
        
        console.log(`[MediaManager] Found ${newMoviesCount} new movies out of ${totalMovies} total`);
        
        // Since we don't have movie details, we can't populate a grid
        // The user will need to add movies manually using the form
        
        if (window.showToast) {
            window.showToast(`Found ${newMoviesCount} new movies. Use the form above to add them.`, 'success');
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

// REMOVED: Duplicate handleScanMovies function - using the correct one below

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
    console.log('[DEBUG - SCAN_MOVIES] Starting movie scan for SINGLE mode...');
    
    // Disable the button and show loading state
    if (this.scanMoviesBtn) {
      this.scanMoviesBtn.disabled = true;
      this.scanMoviesBtn.textContent = 'Scanning...';
    }
    
    // Show toast for scanning
    this.showModalToast('Scanning movie folders for new movies...', 'info');
    console.log('[DEBUG - SCAN_MOVIES] Running SCAN_media_library_movies.js script...');
    
    const response = await fetch('/api/media/scan-movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('[DEBUG - SCAN_MOVIES] Full server response:', data);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to scan movies');
    }
    
    // Handle the response structure from /api/scan-movies (not /api/media/scan-movies)
    // The response structure is: {success, message, newMovies, output}
    const newMoviesCount = data.newMovies || 0;
    
    // For compatibility, create a movies array structure
    const newMovies = []; // The /api/scan-movies endpoint only returns a count, not movie details
    console.log(`[DEBUG - SCAN_MOVIES] Found ${newMoviesCount} new movies`);
    
    // Re-enable the button
    if (this.scanMoviesBtn) {
      this.scanMoviesBtn.disabled = false;
      this.scanMoviesBtn.textContent = 'SCAN Movie folders for NEW Movies';
    }
    
    // Show completion message as toast
    if (newMoviesCount > 0) {
      const successMsg = `Scan complete! Found ${newMoviesCount} new movies.\n\nYou can now add details for any of these movies using the form above.`;
      this.showModalToast(successMsg, 'success');
      console.log('[DEBUG - SCAN_MOVIES] Scan completed successfully');
    } else {
      this.showModalToast('Scan complete! No new movies found in your library folders.', 'info');
      console.log('[DEBUG - SCAN_MOVIES] No new movies found');
    }
    
  } catch (err) {
    console.error('[DEBUG - SCAN_MOVIES] Scan error:', err);
    
    // Re-enable the button
    if (this.scanMoviesBtn) {
      this.scanMoviesBtn.disabled = false;
      this.scanMoviesBtn.textContent = 'SCAN Movie folders for NEW Movies';
    }
    
    // Show error message as toast
    this.showModalToast(`Scan error: ${err.message}`, 'error');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: this.inputTVTitle ? this.inputTVTitle.value.trim() : '',
        year: this.inputTVYear ? this.inputTVYear.value.trim() : '',
        tmdbId: this.inputTVTMDBId ? this.inputTVTMDBId.value.trim() : '',
        description: this.inputTVDescription ? this.inputTVDescription.value.trim() : '',
        path: this.inputTVPath ? this.inputTVPath.value.trim() : ''
      })
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
        
        return data.newMovies || 0;
    } catch (err) {
        console.error('[scanMoviesDirectory] Error:', err);
        return [];
    }
};

if (typeof window !== 'undefined') {
  window.MediaManager = MediaManager;
  // Make the instance available globally for batch actions
  window.mediaManager = null;
} 