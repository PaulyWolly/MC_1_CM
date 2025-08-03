/*
  MEDIALIBRARYMANAGER.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

// Import the shared VideoPlayer
import VideoPlayer from '../VideoPlayer/VideoPlayer.js';

class MediaLibraryManager {
    constructor() {
        console.log('[DEBUG] MediaLibraryManager constructor called');
        this.mediaLibrary = [];
        this.embyPosters = [];
        this.moviePosters = {};
        this.tvPosters = {};
        this.currentTab = 'movies';
        this.currentTabFlag = 'movies'; // Track current tab for return location
        this.lastActiveTab = 'movies'; // Track last active tab
        this.isLoading = false;
        this.videoPlayer = null;
        this.currentVideo = null;
        this.nextVideo = null;
        this.isModalOpen = false;
        this.currentCollectionView = null;
        
        // Separate data storage for movies and TV shows
        this.moviesData = [];
        this.tvShowsData = [];
        this.mediaLibraryRaw = []; // Keep for backward compatibility
        
        // Search and sort properties
        this.searchTerm = '';
        this.sortBy = 'asc';
        this.selectedGenre = 'All Genres';
        
        // Voice command patterns for media library
        this.voiceCommands = [
            'open media library',
            'show media library',
            'media library',
            'open movies',
            'show movies',
            'movie library',
            'open TV-Shows',
            'show TV-Shows',
            'tv show library',
            'browse movies',
            'browse TV-Shows',
            'view media',
            'media browser',
            'open media browser',
            'show media browser',
            'movie listings',
            'tv show listings',
            'media listings',
            'view movie listings',
            'view tv show listings',
            'view media listings'
        ];
        
        this.init();
        this.cacheBusters = {}; // Add cacheBusters map for poster cache-busting
        // Add at the top of the class
        this.movieGenres = {};
        this.tvGenres = {};
    }

    async init() {
        this.isLoading = false;
        
        // Wait for the global VideoPlayer to be available
        if (window.videoPlayer) {
            this.videoPlayer = window.videoPlayer;
        } else {
            // Wait for it to be created
            const checkVideoPlayer = () => {
                if (window.videoPlayer) {
                    this.videoPlayer = window.videoPlayer;
                    this.continueInit();
                } else {
                    setTimeout(checkVideoPlayer, 100);
                }
            };
            checkVideoPlayer();
            return;
        }
        
        this.continueInit();
    }

    async continueInit() {
        await this.loadAllMediaData();
        await this.loadEmbyPosters();
        await this.loadMoviePosters();
        await this.loadTVPosters();
        await this.loadSeasonEpisodeImages();
        this.setupEventListeners();
        this.setupVoiceCommandIntegration();
        this.setupTextCommandIntegration();
        console.log('🎬 [MEDIA-LIBRARY] Media library manager initialized with voice/text command support');
        // Ensure posters are rendered after all poster data is loaded
        if (this.currentTab === 'movies' && this.isModalOpen) {
            this.renderMediaGrid();
        }
        // In the constructor or init, load the normalized genres file
        this.loadMovieGenres();
        this.loadTVGenres();
    }

    async loadAllMediaData() {
        console.log('🎬 [MEDIA-LIBRARY] Loading all media data (movies and TV shows)...');
        
        try {
            // Load movies data
            console.log('🎬 [MEDIA-LIBRARY] Loading movies data...');
            const moviesResponse = await fetch('/components/MediaLibrary/data/movies/media-library-movies_normalized.json');
            const moviesResult = await moviesResponse.json();
            
            let moviesRaw = null;
            if (moviesResult && Array.isArray(moviesResult.folders)) {
                moviesRaw = moviesResult.folders;
            } else if (Array.isArray(moviesResult)) {
                moviesRaw = moviesResult;
            } else {
                throw new Error('Unrecognized movies media library format');
            }
            
            this.moviesData = moviesRaw;
            console.log('🎬 [MEDIA-LIBRARY] Movies data loaded:', this.moviesData ? this.moviesData.length : 'undefined', 'movies');
            
            // Load TV shows data
            console.log('🎬 [MEDIA-LIBRARY] Loading TV shows data...');
            const tvShowsResponse = await fetch('/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
            const tvShowsResult = await tvShowsResponse.json();
            
            let tvShowsRaw = null;
            if (Array.isArray(tvShowsResult)) {
                tvShowsRaw = tvShowsResult;
            } else if (tvShowsResult && Array.isArray(tvShowsResult.folders)) {
                tvShowsRaw = tvShowsResult.folders;
            } else {
                throw new Error('Unrecognized tvshows media library format');
            }
            
                                        this.tvShowsData = tvShowsRaw;
        console.log('🎬 [MEDIA-LIBRARY] TV shows data loaded:', this.tvShowsData ? this.tvShowsData.length : 'undefined', 'TV shows');
            
            // Set mediaLibraryRaw to current tab's data for backward compatibility
            if (this.currentTab === 'movies') {
                this.mediaLibraryRaw = this.moviesData;
            } else if (this.currentTab === 'tvshows') {
                this.mediaLibraryRaw = this.tvShowsData;
            }
            
            console.log('🎬 [MEDIA-LIBRARY] All media data loaded successfully!');
            console.log('🎬 [MEDIA-LIBRARY] Movies:', this.moviesData ? this.moviesData.length : 0);
            console.log('🎬 [MEDIA-LIBRARY] TV Shows:', this.tvShowsData ? this.tvShowsData.length : 0);
            
        } catch (error) {
            this.showError('Failed to load media library.');
            console.error('🎬 [MEDIA-LIBRARY] Error loading media data:', error);
        }
    }

    async loadMediaLibrary() {
        try {
            let endpoint = '/api/media-library';
            if (this.currentTab === 'movies') {
                // Use the normalized movies file
                endpoint = '/components/MediaLibrary/data/movies/media-library-movies_normalized.json';
            } else if (this.currentTab === 'tvshows') {
                // Use the normalized tv-shows file
                endpoint = '/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json';
            } else if (this.currentTab === 'favorites') {
                // FAVORITES IS INDEPENDENT - no data loading needed
                console.log('[DEBUG - FAVORITES] Favorites tab - no data loading needed');
                return;
            }
            console.log('🎬 [MEDIA-LIBRARY] Loading media library from:', endpoint);
            const response = await fetch(endpoint);
            const result = await response.json();
            
            console.log('🎬 [MEDIA-LIBRARY] Raw result:', result);
            console.log('🎬 [MEDIA-LIBRARY] Raw result type:', typeof result, 'isArray:', Array.isArray(result));
            if (Array.isArray(result)) {
                console.log('🎬 [MEDIA-LIBRARY] Result is array with', result.length, 'items');
                if (result.length > 0) {
                    console.log('🎬 [MEDIA-LIBRARY] First item sample:', result[0]);
                }
            }
            // --- FLEXIBLE FORMAT HANDLING ---
            // Try to extract the main library array from various possible formats
            let raw = null;
            if (this.currentTab === 'movies') {
                // Normalized movies file: { path: '', folders: [...] }
                if (result && Array.isArray(result.folders)) {
                    raw = result.folders;
                } else if (Array.isArray(result)) {
                    raw = result;
                } else {
                    throw new Error('Unrecognized movies media library format');
                }
            } else if (this.currentTab === 'tvshows') {
                // Normalized tv-shows file: array of show objects
                if (Array.isArray(result)) {
                    raw = result;
                } else if (result && Array.isArray(result.folders)) {
                    raw = result.folders;
                } else {
                    throw new Error('Unrecognized tvshows media library format');
                }
            } else {
                // Fallback for other tabs
                if (Array.isArray(result)) {
                    raw = result;
                } else if (result && Array.isArray(result.folders)) {
                    raw = result;
                } else if (result && result.library && Array.isArray(result.library.folders)) {
                    raw = result.library.folders;
                } else if (result && result.tvShows && Array.isArray(result.tvShows)) {
                    raw = result.tvShows;
                } else {
                    throw new Error('Unrecognized media library format');
                }
            }
            console.log('🎬 [MEDIA-LIBRARY] Extracted media array:', raw);
            console.log('🎬 [MEDIA-LIBRARY] Extracted media array length:', raw ? raw.length : 'undefined');
            
            // Store data in the appropriate property based on current tab
            if (this.currentTab === 'movies') {
                this.moviesData = raw;
                this.mediaLibraryRaw = raw; // Keep for backward compatibility
                console.log('🎬 [MEDIA-LIBRARY] Set moviesData to:', this.moviesData);
                console.log('🎬 [MEDIA-LIBRARY] moviesData length:', this.moviesData ? this.moviesData.length : 'undefined');
            } else if (this.currentTab === 'tvshows') {
                this.tvShowsData = raw;
                this.mediaLibraryRaw = raw; // Keep for backward compatibility
                console.log('🎬 [MEDIA-LIBRARY] Set tvShowsData to:', this.tvShowsData);
                console.log('🎬 [MEDIA-LIBRARY] tvShowsData length:', this.tvShowsData ? this.tvShowsData.length : 'undefined');
            }
        } catch (error) {
            this.showError('Failed to load media library.');
            console.error(error);
        }
    }



    async loadEmbyPosters() {
        this.isLoading = true;
        this.renderSpinner();
        try {
            console.log('🎬 [MEDIA-LIBRARY] Loading Emby posters...');
            const response = await fetch('/emby-posters.json');
            this.embyPosters = await response.json();
            console.log('🎬 [MEDIA-LIBRARY] Loaded', this.embyPosters.length, 'poster entries');
        } catch (error) {
            console.error('🎬 [MEDIA-LIBRARY] Failed to load Emby posters:', error);
            this.embyPosters = [];
            this.showError('Failed to load poster images.');
        } finally {
            this.isLoading = false;
            this.removeSpinner();
        }
    }

    async loadMoviePosters() {
        console.log('[DEBUG] loadMoviePosters called');
        try {
            console.log('🎬 [MEDIA-LIBRARY] Loading movie posters...');
            let response = await fetch('/components/MediaLibrary/data/movies/movie_posters_normalized.json?t=' + Date.now());
            if (response.ok) {
                this.moviePosters = await response.json();
                const keys = Object.keys(this.moviePosters);
                console.log(`[DEBUG] Loaded movie_posters_normalized.json with ${keys.length} keys. First 5:`, keys.slice(0,5));
                console.log('✅ [MEDIA-LIBRARY - normalized JSON used] Loaded movie_posters_normalized.json');
            } else {
                console.error('❌ [MEDIA-LIBRARY] Failed to load movie_posters_normalized.json');
                this.moviePosters = {};
            }
        } catch (error) {
            console.error('❌ [MEDIA-LIBRARY] Error loading movie_posters_normalized.json:', error);
            this.moviePosters = {};
        }
        if (this.currentTab === 'movies') {
            this.renderMediaGrid();
        }
    }

    async loadTVPosters() {
        try {
            console.log('📺 [MEDIA-LIBRARY] Loading TV show posters...');
            const response = await fetch('/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json');
            if (response.ok) {
                this.tvPosters = await response.json();
                console.log(`✅ [MEDIA-LIBRARY] Loaded ${Object.keys(this.tvPosters).length} TV show posters`);
            } else {
                console.warn('⚠️ [MEDIA-LIBRARY] Could not load TV show posters');
                this.tvPosters = {};
            }
        } catch (error) {
            console.warn('⚠️ [MEDIA-LIBRARY] Error loading TV show posters:', error);
            this.tvPosters = {};
        }
    }

    async loadSeasonEpisodeImages() {
        try {
            console.log('🎬 [MEDIA-LIBRARY] Loading season and episode images...');
            
            // Load season images
            const seasonResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json');
            let seasonData = {};
            if (seasonResponse.ok) {
                seasonData = await seasonResponse.json();
                console.log(`✅ [DEBUG MEDIA-LIBRARY] Loaded season images for ${Object.keys(seasonData).length} shows`);
                console.log(`🎬 [MEDIA-LIBRARY] Season data keys:`, Object.keys(seasonData));
                if (seasonData['Terra.Nova.(2011)']) {
                    console.log(`🎬 [MEDIA-LIBRARY] Terra Nova season data:`, seasonData['Terra.Nova.(2011)']);
                }
            } else {
                console.warn('⚠️ [MEDIA-LIBRARY] Could not load season images');
            }
            
            // Load episode images
        const episodeResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_episode_images_normalized.json');
            let episodeData = {};
            if (episodeResponse.ok) {
                episodeData = await episodeResponse.json();
                console.log(`✅ [MEDIA-LIBRARY] Loaded episode images for ${Object.keys(episodeData).length} shows`);
            } else {
                console.warn('⚠️ [MEDIA-LIBRARY] Could not load episode images');
            }
            
            // Merge the data into a single structure for compatibility
            this.seasonEpisodeImages = {};
            for (const showName in seasonData) {
                this.seasonEpisodeImages[showName] = { seasons: {} };
                if (seasonData[showName].seasons) {
                    for (const seasonNum in seasonData[showName].seasons) {
                        this.seasonEpisodeImages[showName].seasons[seasonNum] = {
                            poster: seasonData[showName].seasons[seasonNum].poster || null,
                            episodes: {}
                        };
                        
                        // Add episode data if available
                        if (episodeData[showName] && 
                            episodeData[showName].seasons && 
                            episodeData[showName].seasons[seasonNum] &&
                            episodeData[showName].seasons[seasonNum].episodes) {
                            this.seasonEpisodeImages[showName].seasons[seasonNum].episodes = episodeData[showName].seasons[seasonNum].episodes;
                        }
                    }
                }
            }
            
            console.log(`✅ [MEDIA-LIBRARY] Merged season/episode images for ${Object.keys(this.seasonEpisodeImages).length} shows`);
            console.log(`🎬 [MEDIA-LIBRARY] Final merged keys:`, Object.keys(this.seasonEpisodeImages));
            if (this.seasonEpisodeImages['Terra.Nova.(2011)']) {
                console.log(`🎬 [MEDIA-LIBRARY] Final Terra Nova data:`, this.seasonEpisodeImages['Terra.Nova.(2011)']);
            }
        } catch (error) {
            console.warn('⚠️ [MEDIA-LIBRARY] Error loading season episode images:', error);
            this.seasonEpisodeImages = {};
        }
    }

    renderSpinner() {
        let modal = document.getElementById('mediaLibraryModal');
        if (!modal) return;
        if (!document.getElementById('mediaLibrarySpinner')) {
            const spinnerOverlay = document.createElement('div');
            spinnerOverlay.className = 'media-library-spinner-overlay';
            spinnerOverlay.id = 'mediaLibrarySpinner';
            spinnerOverlay.innerHTML = `<div class="media-library-spinner"></div>`;
            modal.appendChild(spinnerOverlay);
        }
    }

    removeSpinner() {
        const spinner = document.getElementById('mediaLibrarySpinner');
        if (spinner) spinner.remove();
    }

    showError(msg) {
        let modal = document.getElementById('mediaLibraryModal');
        if (!modal) return;
        let errDiv = document.getElementById('mediaLibraryError');
        if (!errDiv) {
            errDiv = document.createElement('div');
            errDiv.id = 'mediaLibraryError';
            errDiv.style.cssText = 'color: red; text-align: center; margin: 20px; font-weight: bold;';
            modal.appendChild(errDiv);
        }
        errDiv.textContent = msg;
    }

    setupEventListeners() {
        console.log('[DEBUG] MediaLibraryManager.setupEventListeners called');
        // Add event listeners for media library button
        const mediaLibraryBtn = document.getElementById('mediaLibraryBtn');
        if (mediaLibraryBtn) {
            mediaLibraryBtn.addEventListener('click', () => this.openMediaBrowser()); // ensure arrow function
        }
        
        // Add keyboard shortcut for refresh (Ctrl+R) when Media Library is open
        document.addEventListener('keydown', (e) => {
            if (this.isModalOpen && e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 [MEDIA-LIBRARY] Keyboard shortcut detected: Ctrl+R - Refreshing content');
                this.refreshCurrentContent();
            }
        });
    }

    async openMediaBrowser() {
        console.log('[OPEN-MEDIA-BROWSER-DEBUG] Opening media browser');
        console.log('[OPEN-MEDIA-BROWSER-DEBUG] Current tab:', this.currentTab);
        console.log('[OPEN-MEDIA-BROWSER-DEBUG] Current TV show:', this.currentTVShow);
        console.log('[OPEN-MEDIA-BROWSER-DEBUG] Current TV season:', this.currentTVSeason);
        
        this.isModalOpen = true;
        
        // Show spinner immediately when opening the media browser
        this.isLoading = true;
        this.renderModal();
        this.renderSpinner();
        
        try {
            // Update mediaLibraryRaw to point to the correct data for current tab
            if (this.currentTab === 'movies') {
                this.mediaLibraryRaw = this.moviesData;
                console.log('🎬 [MEDIA-LIBRARY] Set mediaLibraryRaw to moviesData:', this.moviesData ? this.moviesData.length : 'undefined', 'movies');
            } else if (this.currentTab === 'tvshows') {
                this.mediaLibraryRaw = this.tvShowsData;
                console.log('🎬 [MEDIA-LIBRARY] Set mediaLibraryRaw to tvShowsData:', this.tvShowsData ? this.tvShowsData.length : 'undefined', 'TV shows');
            } else if (this.currentTab === 'watchlater') {
                // For watchlater tab, we don't need to set mediaLibraryRaw since it uses its own data
                this.mediaLibraryRaw = null;
                console.log('🎬 [MEDIA-LIBRARY] Set mediaLibraryRaw to null for watchlater tab');
            }
            
            // Update the modal content after setting the correct data
            await this.updateModalContent();
        } catch (error) {
            console.error('[DEBUG - MediaLibrary] Error during loading:', error);
            this.showError('Failed to load media library.');
        } finally {
            // Always remove spinner and set loading to false
            this.isLoading = false;
            this.removeSpinner();
        }
    }

    closeMediaBrowser() {
        this.isModalOpen = false;
        this.removeModal();
        // Remove the media-library-overlay if present
        const overlay = document.querySelector('.media-library-overlay');
        if (overlay) overlay.remove();
        // Remove Video.js overlay alert if present
        const videoOverlay = document.querySelector('.videojs-overlay-alert');
        if (videoOverlay) videoOverlay.remove();
        // Stop video playback if open
        if (this.videoPlayer && typeof this.videoPlayer.pause === 'function') {
            this.videoPlayer.pause();
            if (typeof this.videoPlayer.currentTime === 'function') {
                this.videoPlayer.currentTime(0); // Optionally reset to start
            } else if (typeof this.videoPlayer.currentTime === 'number') {
                this.videoPlayer.currentTime = 0;
            }
        }
        // Always reopen MediaLibrary modal with the last active tab
        if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
            // Restore the last active tab before reopening
            this.currentTab = this.lastActiveTab;
            setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
        }
    }

    // Dedicated function to render the tab bar/header
    renderTabBar() {
        const tabs = [
            { id: 'movies', label: 'Movies' },
            { id: 'tvshows', label: 'TV-Shows' },
            { id: 'favorites', label: 'Favorites' },
            { id: 'collections', label: 'Collections' },
            { id: 'suggestions', label: 'Suggestions' },
            { id: 'watchlater', label: 'Watch Later' }
        ];
        return `
          <div class="media-library-modal-tabs-row">
            <div class="media-library-modal-tabs-left">
              ${tabs.map(tab =>
                  `<button class="media-library-tab-btn${this.currentTab === tab.id ? ' active' : ''}"
                    onclick="mediaLibraryManager.switchTab('${tab.id}')">${tab.label}</button>`
              ).join('')}
            </div>
            <div class="media-library-modal-tabs-spacer"></div>
            <button class="media-library-media-manager-btn" onclick="mediaLibraryManager.openMediaManager()">Media Manager</button>
          </div>
        `;
    }

    async renderModal() {
        // Add overlay if not present
        if (!document.querySelector('.media-library-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'media-library-overlay';
            document.body.appendChild(overlay);
        }
        // Remove existing modal if any (but NOT the overlay)
        const existingModal = document.getElementById('mediaLibraryModal');
        if (existingModal) {
            existingModal.remove();
        }
        // --- Ensure correct tab is highlighted based on navigation state ---
        // Preserve currentTabFlag for return location tracking
        const preservedTabFlag = this.currentTabFlag;
        
        if (this.currentTab === 'tvshows' && this.currentTVShow) {
            this.currentTab = 'tvshows';
        } else if (this.currentTab === 'collections' && this.currentCollectionView) {
            this.currentTab = 'collections';
        }
        
        // Restore currentTabFlag if it was changed
        if (preservedTabFlag && preservedTabFlag !== this.currentTab) {
            this.currentTabFlag = preservedTabFlag;
            console.log('[RENDER-MODAL-DEBUG] Restored currentTabFlag to:', this.currentTabFlag);
        }
        const getSearchPlaceholder = () => {
            switch (this.currentTab) {
                case 'tvshows': return 'Search TV-Shows...';
                case 'favorites': return 'Search Favorites...';
                case 'collections': return 'Search Collections...';
                case 'watchlater': return 'Search Watch Later...';
                case 'suggestions': return 'Search Suggestions...';
                default: return 'Search Movies...';
            }
        };

        // Create only the modal, no overlay
        const modal = document.createElement('div');
        modal.id = 'mediaLibraryModal';
        modal.className = 'media-library-modal';
        modal.innerHTML = `
            <div class="media-library-modal-header">
            <div class="media-library-header-overlay"></div>
            <h2 class="media-library-header-title media-library-header-title-glow">Media Library</h2>
            <button class="media-library-close-btn" id="mediaLibraryCloseBtn">&times;</button>
            </div>
            <div class="media-library-modal-content">
              ${this.renderTabBar()}
              <div class="media-library-top-bar">
                <span class="media-library-count" id="mediaLibraryCount"></span>
                <div class="media-library-search-container">
                  <input type="text" id="mediaLibrarySearch" class="media-library-search" placeholder="${getSearchPlaceholder()}" oninput="mediaLibraryManager.handleSearchInput(event)">
                  <button id="mediaLibraryClearSearch" class="media-library-clear-search">&times;</button>
                </div>
                <select id="mediaLibraryGenre" class="media-library-genre" onchange="mediaLibraryManager.handleGenreChange(event)"></select>
                <select id="mediaLibrarySort" class="media-library-sort" onchange="mediaLibraryManager.handleSortChange(event)">
                  <option value="asc">A-Z</option>
                  <option value="desc">Z-A</option>
                </select>
                <button class="media-library-refresh-btn" onclick="mediaLibraryManager.refreshCurrentContent()" title="Refresh Content">🔄</button>
              </div>
              <div class="media-library-content-wrapper">
                <div class="media-library-flex-row">
                  <div id="mediaGrid" class="media-library-movie-grid media-library-movie-grid-scroll"></div>
                  <div id="mediaLibraryAZSidebarMovie" class="media-library-az-sidebar media-library-az-sidebar-movies"></div>
                  <div id="mediaLibraryAZSidebarTVShow" class="media-library-az-sidebar media-library-az-sidebar-tvshows"></div>
                </div>
              </div>
            </div>
          </div>
        `;
        // Add tab-specific class to modal content for CSS targeting
        const modalContent = modal.querySelector('.media-library-modal-content');
        if (modalContent) {
            // Remove all possible tab classes first
            modalContent.classList.remove('movies', 'tvshows', 'favorites', 'collections', 'suggestions', 'watchlater');
            modalContent.classList.add(this.currentTab);
        }
        document.body.appendChild(modal);
        document.getElementById('mediaLibraryCloseBtn').onclick = () => this.closeMediaLibrary();
        if (this.isLoading) this.renderSpinner();
        
        // Use updateModalContent to properly render the grid with click handlers
        await this.updateModalContent();
      
        // A-Z sidebar visibility is now controlled by updateModalContent() to avoid conflicts
        
        if (this.currentTab === 'tvshows' && !this.currentTVShow && !this.currentTVSeason) {
            const grid = document.getElementById('mediaGrid');
            if (grid) {
                grid.innerHTML = this.renderTVShowsTab();
                // Attach click handler to each TV show card using addEventListener (like MOVIE)
                grid.querySelectorAll('.media-library-tv-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.poster-selector-btn')) return; // Prevent card click if icon was clicked
                        e.preventDefault();
                        e.stopPropagation();
                        window.mediaLibraryManager.openTVShowFromData(card);
                    });
                });
                // Attach poster selector handlers after rendering (like MOVIE)
                this.attachPosterSelectorHandlers();
            }
            // --- Ensure the A-Z sidebar is always populated ---
            if (this.currentTab === 'tvshows') {
                this.renderAZSidebarTVShow();
            } else if (this.currentTab === 'movies') {
                this.renderAZSidebarMovie();
            }
            // Update count for TV-Shows tab
            this.updateCount();
            return;
        }
        // A-Z sidebar rendering is now handled by updateModalContent() to avoid conflicts
        console.log('[DEBUG - RENDER MODAL] A-Z sidebar rendering deferred to updateModalContent()');
        this.updateCount();
        this.restoreSearchSortUI();
        if (this.currentTab === 'watchlater') {
            const grid = document.getElementById('mediaGrid');
            if (grid) grid.innerHTML = this.renderWatchLaterContent();
        }
        // Defer collections rendering until grid exists
        if (this.currentTab === 'collections') {
            setTimeout(() => this.renderCollectionsTab(), 0);
        }
        // --- Add clear search button logic ---
        const searchInput = document.getElementById('mediaLibrarySearch');
        const clearBtn = document.getElementById('mediaLibraryClearSearch');
        
        console.log('[DEBUG - SEARCH-SETUP] Search input found:', !!searchInput);
        console.log('[DEBUG - SEARCH-SETUP] Clear button found:', !!clearBtn);
        if (clearBtn) {
            console.log('[DEBUG - SEARCH-SETUP] Clear button display style:', clearBtn.style.display);
            console.log('[DEBUG - SEARCH-SETUP] Clear button onclick:', !!clearBtn.onclick);
        }
        const updateClearBtn = () => {
            if (searchInput.value) {
                clearBtn.style.display = 'flex';
            } else {
                clearBtn.style.display = 'none';
            }
        };
        
        // Add input event listener for search input
        searchInput.addEventListener('input', updateClearBtn);
        updateClearBtn();
        
        // Define clear button click handler
        const clearBtnClickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[DEBUG - CLEAR-BTN] Clear button clicked for tab:', this.currentTab);
            console.log('[DEBUG - CLEAR-BTN] Search input value before clear:', searchInput.value);
            
            searchInput.value = '';
            console.log('[DEBUG - CLEAR-BTN] Search input value after clear:', searchInput.value);
            
            this.handleSearchInput({ target: searchInput });
            updateClearBtn();
            searchInput.focus();
            
            console.log('[DEBUG - CLEAR-BTN] Clear button action completed');
        };
        
        // Remove any existing click handlers and add new one
        clearBtn.onclick = null; // Clear any existing onclick
        clearBtn.addEventListener('click', clearBtnClickHandler);
        
        // Also set onclick as a backup method
        clearBtn.onclick = clearBtnClickHandler;
        
        console.log('[DEBUG - SEARCH-SETUP] Clear button event handlers attached');
        console.log('[DEBUG - SEARCH-SETUP] Clear button onclick set:', !!clearBtn.onclick);
        console.log('[DEBUG - SEARCH-SETUP] Clear button event listeners:', clearBtn.onclick ? 'onclick handler set' : 'no onclick handler');
        
        // Add a global click handler to catch any clear button clicks
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'mediaLibraryClearSearch') {
                console.log('[DEBUG - GLOBAL-CLEAR] Global click handler caught clear button click');
                console.log('[DEBUG - GLOBAL-CLEAR] Target element:', e.target);
                console.log('[DEBUG - GLOBAL-CLEAR] Current tab:', this.currentTab);
                
                // Manually trigger the clear action
                const searchInput = document.getElementById('mediaLibrarySearch');
                if (searchInput) {
                    console.log('[DEBUG - GLOBAL-CLEAR] Found search input, clearing...');
                    searchInput.value = '';
                    this.handleSearchInput({ target: searchInput });
                    
                    // Update clear button visibility
                    const clearBtn = document.getElementById('mediaLibraryClearSearch');
                    if (clearBtn) {
                        clearBtn.style.display = 'none';
                    }
                    
                    searchInput.focus();
                    console.log('[DEBUG - GLOBAL-CLEAR] Clear action completed via global handler');
                }
            }
        });
        
        // --- Add genre dropdown logic ---
        const genreDropdown = document.getElementById('mediaLibraryGenre');
        genreDropdown.innerHTML = '';
        
        // Populate genre dropdown based on current tab
        let genres = [];
        if (this.currentTab === 'tvshows') {
            // For TV shows, get TV show genres
            genres = this.getTVShowGenres();
        } else {
            // For movies and other tabs, get movie genres
            genres = this.getCommonGenres();
        }
        
        genres.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.textContent = g;
            genreDropdown.appendChild(opt);
        });
        genreDropdown.value = this.selectedGenre || 'All Genres';
        genreDropdown.onchange = (e) => this.handleGenreChange(e);



        // --- Attach click handlers to poster-selector-btn after rendering ---
        setTimeout(() => {
            document.querySelectorAll('.poster-selector-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Ensure this always stops the card click
                    const card = btn.closest('.media-library-movie-card, .media-library-tv-card');
                    let itemPath = card ? card.getAttribute('data-path') : '';
                    let item = null;
                    if (this.currentTab === 'tvshows') {
                        const tvShows = this.getTVShows();
                        item = tvShows.find(show =>
                            (show.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                        );
                        if (!item) {
                            console.error(`[ERROR] TV Show not found by path: ${itemPath}`);
                            this.showToast(`Error: TV Show not found by path: ${itemPath}`, 'error');
                            return false;
                        }
                    } else {
                        const items = this.getFilteredAndSortedItems();
                        item = items.find(i =>
                            (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                        );
                        if (!item) {
                            console.error(`[ERROR] Movie not found by path: ${itemPath}`);
                            this.showToast(`Error: Movie not found by path: ${itemPath}`, 'error');
                            return false;
                        }
                    }
                    if (window.PosterSelector) {
                        const mode = this.currentTab === 'tvshows' ? 'tv' : 'movie';
                        const selector = new window.PosterSelector(mode, { title: item?.title || item?.name || '' });
                        selector.getMediaContext = () => {
                            if (item) {
                                return {
                            mediaId: item.path,
                            name: item.name || item.title,
                            path: item.path,
                            type: mode
                                };
                            } else {
                                console.error('[ERROR] No item found for PosterSelector context');
                                return null;
                            }
                        };
                        selector.onPosterSelected = async ({filePath, posterType, poster}) => {
                            // Always reload the full poster mapping after update
                            await this.loadMoviePosters();
                            this.renderMediaGrid();
                            this.showToast('Poster updated!');
                        };
                        selector.init();
                    }
                    return false;
                };
            });
        }, 10); // Attach after card click handler

        // After rendering the modal, attach click handlers to TV show posters
        setTimeout(() => {
            document.querySelectorAll('.tvshow-poster-img').forEach(img => {
                img.onclick = (e) => {
                    console.log('[DEBUG] TV show poster clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    const card = img.closest('.media-library-tv-card');
                    console.log('[DEBUG] Found card:', card);
                    if (card) {
                        console.log('[DEBUG] Card data-path:', card.getAttribute('data-path'));
                        console.log('[DEBUG] Card data-show-name:', card.getAttribute('data-show-name'));
                        window.mediaLibraryManager.openTVShowFromData(card);
                    } else {
                        console.error('[DEBUG] No card found for clicked poster');
                    }
                };
            });
        }, 0);

        // if (this.currentTab === 'movies') {
        //     await this.loadMoviePosters();
        // }
        // Ensure A-Z sidebar is rendered for Movies and TV-Shows (main tab)
        if (this.currentTab === 'movies' || (this.currentTab === 'tvshows' && !this.currentTVShow && !this.currentTVSeason)) {
            setTimeout(() => {
                if (this.currentTab === 'tvshows') {
                    this.renderAZSidebarTVShow();
                } else if (this.currentTab === 'movies') {
                    this.renderAZSidebarMovie();
                }
            }, 100); // Small delay to ensure content is loaded
        }
    }

    removeModal() {
        // Remove the modal from the DOM
        const modal = document.querySelector('.media-library-modal');
        if (modal) modal.remove();
    }

    // Add this method to close the MediaLibrary and remove the overlay
    closeMediaLibrary() {
        this.removeModal();
        const overlay = document.querySelector('.media-library-overlay');
        if (overlay) overlay.remove();
    }

    switchTab(tab) {
        console.log('[SWITCH-TAB-DEBUG] Switching to tab:', tab);
        console.log('[SWITCH-TAB-DEBUG] Previous currentTab was:', this.currentTab);
        console.log('[SWITCH-TAB-DEBUG] Previous currentTabFlag was:', this.currentTabFlag);
        this.lastActiveTab = this.currentTab;
        this.currentTab = tab;
        console.log('[SWITCH-TAB-DEBUG] New currentTab is:', this.currentTab);
        
        // Set the current tab flag for return location tracking
        this.currentTabFlag = tab;
        console.log('[SWITCH-TAB-DEBUG] Set currentTabFlag to:', this.currentTabFlag);
        
        // Update mediaLibraryRaw to match current tab's data for backward compatibility
        if (this.currentTab === 'movies') {
            this.mediaLibraryRaw = this.moviesData;
        } else if (this.currentTab === 'tvshows') {
            this.mediaLibraryRaw = this.tvShowsData;
        } else if (this.currentTab === 'watchlater') {
            // For watchlater tab, we don't need to set mediaLibraryRaw since it uses its own data
            this.mediaLibraryRaw = null;
        }
        
        console.log('[SWITCH-TAB-DEBUG] mediaLibraryRaw set to:', this.mediaLibraryRaw);
        
        // Restore search input value for the new tab
        const searchInput = document.getElementById('mediaLibrarySearch');
        if (searchInput) {
            let searchValue = '';
            switch (this.currentTab) {
                case 'movies':
                    searchValue = this.movieSearchQuery || '';
                    break;
                case 'tvshows':
                    searchValue = this.tvShowSearchQuery || '';
                    break;
                case 'favorites':
                    searchValue = this.favoritesSearchQuery || '';
                    break;
                case 'collections':
                    searchValue = this.collectionsSearchQuery || '';
                    break;
                case 'watchlater':
                    searchValue = this.watchLaterSearchQuery || '';
                    break;
                case 'suggestions':
                    searchValue = this.suggestionsSearchQuery || '';
                    break;
                default:
                    searchValue = this.searchQuery || '';
                    break;
            }
            searchInput.value = searchValue;
            
            // Update clear button visibility
            const clearBtn = document.getElementById('mediaLibraryClearSearch');
            if (clearBtn) {
                clearBtn.style.display = searchValue ? 'flex' : 'none';
            }
        }
        
        console.log('[SWITCH-TAB-DEBUG] Calling openMediaBrowser()');
        this.openMediaBrowser();
    }

    updateTabSpecificUI() {
        const searchInput = document.getElementById('mediaLibrarySearch');
        const genreDropdown = document.getElementById('mediaLibraryGenre');
        
        if (searchInput) {
            const getSearchPlaceholder = () => {
                switch (this.currentTab) {
                    case 'tvshows': return 'Search TV-Shows...';
                    case 'favorites': return 'Search Favorites...';
                    case 'collections': return 'Search Collections...';
                    case 'watchlater': return 'Search Watch Later...';
                    case 'suggestions': return 'Search Suggestions...';
                    default: return 'Search Movies...';
                }
            };
            searchInput.placeholder = getSearchPlaceholder();
            
            // Restore search input value for the current tab
            let searchValue = '';
            switch (this.currentTab) {
                case 'movies':
                    searchValue = this.movieSearchQuery || '';
                    break;
                case 'tvshows':
                    searchValue = this.tvShowSearchQuery || '';
                    break;
                case 'favorites':
                    searchValue = this.favoritesSearchQuery || '';
                    break;
                case 'collections':
                    searchValue = this.collectionsSearchQuery || '';
                    break;
                case 'watchlater':
                    searchValue = this.watchLaterSearchQuery || '';
                    break;
                case 'suggestions':
                    searchValue = this.suggestionsSearchQuery || '';
                    break;
                default:
                    searchValue = this.searchQuery || '';
                    break;
            }
            searchInput.value = searchValue;
            
            // Update clear button visibility
            const clearBtn = document.getElementById('mediaLibraryClearSearch');
            if (clearBtn) {
                clearBtn.style.display = searchValue ? 'flex' : 'none';
            }
        }
        
        // Update genre dropdown based on current tab
        if (genreDropdown) {
            genreDropdown.innerHTML = '';
            
            // Populate genre dropdown based on current tab
            let genres = [];
            if (this.currentTab === 'tvshows') {
                // For TV shows, get TV show genres
                genres = this.getTVShowGenres();
            } else {
                // For movies and other tabs, get movie genres
                genres = this.getCommonGenres();
            }
            
            genres.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                genreDropdown.appendChild(opt);
            });
            genreDropdown.value = this.selectedGenre || 'All Genres';
        }
    }

    async updateModalContent() {
        // Called after modal is rendered, updates the main grid content
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        grid.innerHTML = await this.renderTabContent();
        
        console.log('[DEBUG - UPDATE MODAL] Current tab:', this.currentTab);
        
        // Update tab-specific UI elements (search placeholder, genre dropdown, etc.)
        this.updateTabSpecificUI();
        
        // Show/hide appropriate A-Z sidebars based on current tab
        const movieSidebar = document.getElementById('mediaLibraryAZSidebarMovie');
        const tvSidebar = document.getElementById('mediaLibraryAZSidebarTVShow');
        
        console.log('[DEBUG - UPDATE MODAL] Found movieSidebar:', !!movieSidebar);
        console.log('[DEBUG - UPDATE MODAL] Found tvSidebar:', !!tvSidebar);
        
        if (movieSidebar && tvSidebar) {
        if (this.currentTab === 'movies') {
                console.log('[DEBUG - UPDATE MODAL] Setting movie sidebar to flex, tv sidebar to none');
                movieSidebar.style.display = 'flex';
                tvSidebar.style.display = 'none';
            } else if (this.currentTab === 'tvshows') {
                console.log('[DEBUG - UPDATE MODAL] Setting movie sidebar to none, tv sidebar to flex');
                movieSidebar.style.display = 'none';
                tvSidebar.style.display = 'flex';
            } else {
                console.log('[DEBUG - UPDATE MODAL] Setting both sidebars to none');
                movieSidebar.style.display = 'none';
                tvSidebar.style.display = 'none';
            }
        } else {
            console.warn('[DEBUG - UPDATE MODAL] One or both sidebar elements not found!');
        }
        
        // Handle different tabs appropriately
        if (this.currentTab === 'movies') {
            // For movies tab, attach click handlers to the rendered cards
            console.log('[DEBUG - UPDATE MODAL] Attaching movie card handlers');
            this.attachMovieCardHandlers();
            this.updateHeartIcons();
            // Ensure A-Z sidebar is rendered for movies
            console.log('[DEBUG - UPDATE MODAL] About to render movie A-Z sidebar');
            setTimeout(() => {
                console.log('[DEBUG - A-Z] Rendering A-Z sidebar for movies');
                this.renderAZSidebarMovie();
            }, 100);
        } else if (this.currentTab === 'tvshows') {
            // For TV shows tab, attach TV show specific handlers
            console.log('[DEBUG - UPDATE MODAL] Attaching TV show handlers');
            // Add delay to ensure DOM is ready
            setTimeout(() => {
                this.attachTVShowHandlers();
                this.updateHeartIcons();
            }, 50);
            // Ensure A-Z sidebar is rendered for TV shows
            setTimeout(() => {
                console.log('[DEBUG - A-Z] Rendering A-Z sidebar for TV shows');
                this.renderAZSidebarTVShow();
            }, 100);
        } else if (this.currentTab === 'favorites') {
            // Favorites content already rendered by renderTabContent
            console.log('[DEBUG - UPDATE MODAL] Favorites tab - content already rendered');
            
            this.attachFavoritesHandlers();
            this.updateHeartIcons();
            this.hideGridSpinner();
        } else if (this.currentTab === 'collections') {
            // For collections tab, attach collection handlers and hide spinner
            console.log('[DEBUG - UPDATE MODAL] Attaching collection handlers');
            this.attachCollectionHandlers();
            this.hideGridSpinner();
        } else if (this.currentTab === 'watchlater') {
            // For Watch Later tab, content is already rendered by renderWatchLaterContent()
            console.log('[DEBUG - UPDATE MODAL] Watch Later tab - content already rendered');
            this.hideGridSpinner();
        } else {
            // For other tabs (suggestions, etc.), use the general renderMediaGrid
            console.log('[DEBUG - UPDATE MODAL] Using renderMediaGrid for other tabs');
            this.renderMediaGrid();
        }
    }

    async renderTabContent() {
        console.log('[DEBUG - RenderTabContent] currentTab:', this.currentTab);
        console.log('[DEBUG - RenderTabContent] currentTVShow:', this.currentTVShow);
        console.log('[DEBUG - RenderTabContent] currentTVSeason:', this.currentTVSeason);
        
        switch (this.currentTab) {
            case 'movies':
                console.log('[DEBUG - RenderTabContent] Rendering movies tab');
                return this.renderMoviesContent();
            case 'tvshows':
                if (this.currentTVShow) {
                    if (this.currentTVSeason) {
                        console.log('[DEBUG - RenderTabContent] Rendering episodes view');
                        return this.renderEpisodesView();
                    } else {
                        console.log('[DEBUG - RenderTabContent] Rendering seasons view');
                        return await this.renderSeasonsView(this.currentTVShow);
                    }
                } else {
                    console.log('[DEBUG - RenderTabContent] Rendering TV-Shows tab');
                    return this.renderTVShowsTab();
                }
            case 'favorites':
                console.log('[DEBUG - RenderTabContent] Rendering favorites tab');
                return this.renderFavoritesContent();
            case 'collections':
                console.log('[DEBUG - RenderTabContent] Rendering collections tab');
                return this.renderCollectionsTab();
            case 'suggestions':
                console.log('[DEBUG - RenderTabContent] Rendering suggestions tab');
                return this.renderSuggestionsContent();
            case 'watchlater':
                console.log('[DEBUG - RenderTabContent] Rendering watchlater tab');
                return this.renderWatchLaterContent();
            default:
                console.log('[DEBUG - RenderTabContent] Falling back to movies tab (default case)');
                return this.renderMoviesContent();
        }
    }

    renderMediaGrid() {
        console.log('>> 1. >>>>[MOVIE-LIBRARY] renderMediaGrid called');

        // Show spinner overlay while images load
        this.showGridSpinner();

        // TV shows are handled by renderTVShowsTab() and attachTVShowHandlers()
        // Watch Later is handled by renderWatchLaterContent()
        // This method is only for movies and other content
        if (this.currentTab === 'tvshows') {
            console.log('[DEBUG] TV shows tab - using renderTVShowsTab instead of renderMediaGrid');
            this.hideGridSpinner();
            return;
        }
        
        if (this.currentTab === 'watchlater') {
            console.log('[DEBUG] Watch Later tab - using renderWatchLaterContent instead of renderMediaGrid');
            this.hideGridSpinner();
            return;
        }

        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        const items = this.getFilteredAndSortedItems();
        grid.innerHTML = '';
        
        // Track which letters we've already added anchors for
        const addedAnchors = new Set();
        
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'media-library-movie-card';
            card.style.position = 'relative';
            
            // Get the first letter of the movie title for anchor
            const cleanTitle = this.cleanMovieTitle(item.title || item.name || item.filename || item.path || '');
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            
            // Create anchor element if this is the first movie starting with this letter
            let anchorHTML = '';
            if (!addedAnchors.has(firstLetter)) {
                anchorHTML = `<div class="media-library-anchor" data-anchor="${firstLetter}"></div>`;
                addedAnchors.add(firstLetter);
            }
            
            // For movies, use the HTML string method with proper anchor elements
            card.innerHTML = `
                ${anchorHTML}
                <div class="media-card-actions-movies">
                    <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                    <button class="favorite-btn" title="Toggle Favorite">${this.isFavorite(item.path) ? '❤️' : '🤍'}</button>
                    <button class="collection-btn" title="Add to Collection">➕</button>
                </div>
                <img src="${this.getPosterPath(item)}" alt="${item.title}" class="media-library-poster">
                <div class="media-info"><h3>${cleanTitle}</h3></div>
            `;

            // Ensure favorite and collection buttons do not trigger card click
            card.querySelector('.favorite-btn').onclick = (e) => {
                e.stopPropagation();
                // Determine type: if current tab is 'tvshows', use 'tv', else 'movie'
                const type = this.currentTab === 'tvshows' ? 'tv' : 'movie';
                this.toggleFavorite(item.path, type);
                // Force immediate heart icon update
                setTimeout(() => this.updateHeartIcons(), 50);
            };
            card.querySelector('.collection-btn').onclick = (e) => {
                e.stopPropagation();
                this.showAddToCollectionModal(item);
            };
            // Main card click opens details
            console.log('>>> 2. >>>[MOVIE-LIBRARY] Attaching click handler to:', item.path);
            card.addEventListener('click', async (e) => {
                console.log('>>> 3. >>>[MOVIE-LIBRARY] Movie card clicked:', item.path);
                console.log('>>> 4. >>>[MOVIE-LIBRARY] Full item object:', item);
                await this.showMovieDetailsModal(item);
            });
            card.setAttribute('data-path', item.path);
            grid.appendChild(card);
        });
        // After rendering the grid, attach poster selector handlers
        this.attachPosterSelectorHandlers();

        // Wait for all images to load or error, then hide spinner
        const images = grid.querySelectorAll('img');
        let loaded = 0;
        const total = images.length;
        if (total === 0) {
            this.hideGridSpinner();
        } else {
            images.forEach(img => {
                const done = () => {
                    loaded++;
                    if (loaded === total) this.hideGridSpinner();
                };
                img.onload = done;
                img.onerror = done;
            });
        }
    }

    showGridSpinner() {
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        const parent = grid.parentElement;
        if (!parent) return;
        if (!document.getElementById('mediaGridSpinnerOverlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'mediaGridSpinnerOverlay';
            overlay.className = 'media-library-spinner-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = 0;
            overlay.style.left = 0;
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.background = 'rgba(255,255,255,0.7)';
            overlay.style.zIndex = 10000;
            overlay.innerHTML = `<div class="media-library-spinner"></div>`;
            parent.style.position = 'relative';
            parent.appendChild(overlay);
        }
    }

    hideGridSpinner() {
        const overlay = document.getElementById('mediaGridSpinnerOverlay');
        if (overlay) overlay.remove();
    }

    getItemsForCurrentTab() {
        let items = [];
        console.log('[DEBUG] getItemsForCurrentTab called, currentTab:', this.currentTab);
        console.log('[DEBUG] moviesData length:', this.moviesData ? this.moviesData.length : 'undefined');
        console.log('[DEBUG] tvShowsData length:', this.tvShowsData ? this.tvShowsData.length : 'undefined');
        
        if (this.currentTab === 'movies') {
            items = this.moviesData || [];
            console.log('[MOVIE DEBUG] Raw movies array:', items.slice(0, 5));
            console.log('[MOVIE DEBUG] Total movies found:', items.length);
        } else if (this.currentTab === 'tvshows') {
            items = this.getTVShows();
        } else if (this.currentTab === 'favorites') {
            // Favorites tab uses its own rendering logic (renderFavoritesContent)
            // Return empty array to prevent filtering/sorting errors
            items = [];
        } else if (this.currentTab === 'collections') {
            items = this.getCollections();
        } else if (this.currentTab === 'suggestions') {
            items = this.getSuggestions();
        } else if (this.currentTab === 'watchlater') {
            items = this.getResumeList();
        }
        
        console.log('[DEBUG] Returning items:', items.length);
        return items;
    }

    getPosterPath(mediaItem) {
        // Use shared normalization service
        if (!window.normalizeKey) {
            console.error('[MEDIA-LIBRARY] NormalizationService not loaded - this should not happen!');
            return '/assets/img/placeholder-poster.jpg';
        }
        
        if (!mediaItem) {
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // Use correct poster map for movies vs TV-Shows
        const isTV = (this.currentTab === 'tvshows');
        const posterMap = isTV ? this.tvPosters : this.moviePosters;
        
        // For TV shows in Media Manager format, check if poster is directly available
        if (isTV && mediaItem.poster && mediaItem.poster.trim() !== '') {
            console.log('[MEDIA-LIBRARY] Found direct poster URL for TV show:', mediaItem.poster);
            return mediaItem.poster;
        }
        
        if (!posterMap) {
            console.warn('[MEDIA-LIBRARY] No poster map available for current tab:', this.currentTab);
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // For TV-Shows, prefer the name property, then fallback to path extraction
        let showName = null;
        if (isTV) {
            // Use normalizedKey first (most reliable)
            if (mediaItem.normalizedKey) {
                showName = mediaItem.normalizedKey;
            } else {
                showName = mediaItem.name || mediaItem.title || mediaItem.filename;
                if (!showName && mediaItem.path) {
                    // Extract show name from path (e.g., "TV-SHOWS/Daisy Jones & The Six" -> "Daisy Jones & The Six")
                    showName = mediaItem.path.split(/[\\/]/).pop();
                }
            }
        } else {
            // For movies, use the normalizedKey if available, otherwise extract folder name from path
            if (mediaItem.normalizedKey) {
                showName = mediaItem.normalizedKey;
            } else if (mediaItem.path) {
                showName = mediaItem.path.split(/[\\/]/).pop();
            }
        }
        
        if (!showName) {
            console.warn('[MEDIA-LIBRARY] No show name found for:', mediaItem);
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // For TV shows, if we already have a normalizedKey, use it directly
        let dotKey = isTV ? (mediaItem.normalizedKey || window.normalizeKey(showName)) : (mediaItem.normalizedKey || window.normalizeKey(showName));
        
        // For TV shows, try the normalizedKey first, then fallback to derived keys
        let possibleKeys = [dotKey];
        if (isTV && !mediaItem.normalizedKey) {
            possibleKeys = [
                dotKey,  // "Tera.Nova"
                window.normalizeKey(showName + ' (2011)'),  // "Tera.Nova.(2011)"
                window.normalizeKey(showName + ' (2012)'),  // Try other common years
                window.normalizeKey(showName + ' (2013)'),
                window.normalizeKey(showName + ' (2014)'),
                window.normalizeKey(showName + ' (2015)'),
                window.normalizeKey(showName + ' (2016)'),
                window.normalizeKey(showName + ' (2017)'),
                window.normalizeKey(showName + ' (2018)'),
                window.normalizeKey(showName + ' (2019)'),
                window.normalizeKey(showName + ' (2020)'),
                window.normalizeKey(showName + ' (2021)'),
                window.normalizeKey(showName + ' (2022)'),
                window.normalizeKey(showName + ' (2023)'),
                window.normalizeKey(showName + ' (2024)'),
                window.normalizeKey(showName + ' (2025)'),
                // Handle spelling variations (Tera vs Terra)
                window.normalizeKey(showName.replace(/Terra/g, 'Tera') + ' (2011)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Terra') + ' (2011)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Tera') + ' (2012)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Terra') + ' (2012)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Tera') + ' (2013)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Terra') + ' (2013)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Tera') + ' (2014)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Terra') + ' (2014)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Tera') + ' (2015)'),
                window.normalizeKey(showName.replace(/Tera/g, 'Terra') + ' (2015)')
            ];
        }
        
        console.log('[MEDIA-LIBRARY] Looking for poster with keys:', possibleKeys, 'for show:', showName);
        
        // Try exact match first
        for (const key of possibleKeys) {
            if (posterMap[key]) {
                let url = posterMap[key];
                if (this.cacheBusters && this.cacheBusters[key]) {
                    url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[key];
                }
                console.log('[MEDIA-LIBRARY] Found poster with key:', key, 'URL:', url);
                return url;
            }
        }
        
        // Case-insensitive fallback for all possible keys
        for (const possibleKey of possibleKeys) {
            const lowerPossibleKey = possibleKey.toLowerCase();
            for (const key of Object.keys(posterMap)) {
                if (key.toLowerCase() === lowerPossibleKey) {
                    let url = posterMap[key];
                    if (this.cacheBusters && this.cacheBusters[key]) {
                        url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[key];
                    }
                    console.log('[MEDIA-LIBRARY] Found poster with case-insensitive match for key:', possibleKey, 'URL:', url);
                    return url;
                }
            }
        }
        
        // Log a warning if no poster found
        console.warn('[MEDIA-LIBRARY] No poster found for:', mediaItem, 'Tried dot notation key:', dotKey);
        console.warn('[MEDIA-LIBRARY] Available poster keys:', Object.keys(posterMap));
        return '/assets/img/placeholder-poster.jpg';
    }

    getTVShowPosterPath(mediaItem) {
        // Use the standardized normalization service
        if (!window.getInternalKey) {
            console.error('[TV SHOW POSTER] NormalizationService not loaded - this should not happen!');
            return '/assets/img/placeholder-poster.jpg';
        }
        
        if (!mediaItem) {
            console.warn('[MEDIA-LIBRARY] No mediaItem provided to getTVShowPosterPath');
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // Always use TV posters for this method
        const posterMap = this.tvPosters;
        
        if (!posterMap) {
            console.warn('[MEDIA-LIBRARY] No TV poster map available');
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // For TV-Shows, prefer the name property, then fallback to path extraction
        let showName = mediaItem.name || mediaItem.title || mediaItem.filename;
        if (!showName && mediaItem.path) {
            // Extract show name from path (e.g., "TV-SHOWS/Daisy Jones & The Six" -> "Daisy Jones & The Six")
            showName = mediaItem.path.split(/[\\/]/).pop();
        }
        
        // If we still don't have a show name, try to extract from the full path
        if (!showName && mediaItem.path) {
            // Look for TV-SHOWS directory and get the show name from there
            const pathParts = mediaItem.path.split(/[\\/]/);
            const tvShowsIndex = pathParts.findIndex(part => part.toLowerCase().includes('tv-shows'));
            if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
                showName = pathParts[tvShowsIndex + 1];
            }
        }
        
        if (!showName) {
            console.warn('[MEDIA-LIBRARY] No show name found for TV show:', mediaItem);
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // Extract year from showName if present
        const yearMatch = showName.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : null;
        
        // Create standardized key
        const showKey = window.getInternalKey(showName, year);
        
        console.log('[MEDIA-LIBRARY] Looking for TV poster with key:', showKey, 'for show:', showName, 'year:', year, 'mediaItem:', mediaItem);
        
        // Try exact match first
        if (posterMap[showKey]) {
            let url = posterMap[showKey];
            if (this.cacheBusters && this.cacheBusters[showKey]) {
                url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[showKey];
            }
            console.log('[MEDIA-LIBRARY] Found TV poster with exact match:', url);
            return url;
        }
        
        // Case-insensitive fallback
        const lowerShowKey = showKey.toLowerCase();
        for (const key of Object.keys(posterMap)) {
            if (key.toLowerCase() === lowerShowKey) {
                let url = posterMap[key];
                if (this.cacheBusters && this.cacheBusters[key]) {
                    url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[key];
                }
                console.log('[MEDIA-LIBRARY] Found TV poster with case-insensitive match:', url);
                return url;
            }
        }
        
        // Log a warning if no poster found
        console.warn('[MEDIA-LIBRARY] No TV poster found for:', mediaItem, 'Tried standardized key:', showKey);
        console.warn('[MEDIA-LIBRARY] Available TV poster keys (first 10):', Object.keys(posterMap).slice(0, 10));
        return '/assets/img/placeholder-poster.jpg';
    }

    // Add this helper to wait for the Video.js player to be ready
    async waitForVideoPlayerReady(timeout = 2000) {
        const start = Date.now();
        while (!this.videoPlayer || typeof this.videoPlayer.playUrl !== 'function') {
            if (Date.now() - start > timeout) {
                throw new Error('Video.js player not initialized after waiting');
            }
            await new Promise(res => setTimeout(res, 100));
        }
    }

    async playMedia(mediaItem, startTime = 0) {
        window.mediaLibraryManager.currentMediaItem = mediaItem;
        window.mediaLibraryManager.currentFile = mediaItem;
        console.log('[MEDIA-LIBRARY] playMedia called:', {mediaItem, startTime});
        
        // Check if this is a TV show episode (from Watch Later)
        const pathToCheck = (mediaItem.path || mediaItem.absPath || mediaItem.relPath || '').toLowerCase();
        const isTVShow = pathToCheck.includes('tv-shows') || 
                        pathToCheck.includes('tv_shows') ||
                        pathToCheck.includes('season') ||
                        (mediaItem.title && (mediaItem.title.includes('S00E') || mediaItem.title.includes('S01E') || mediaItem.title.includes('S02E'))) ||
                        (mediaItem.type === 'tv-show'); // Check the type property directly
        
        console.log('[MEDIA-LIBRARY] TV show detection:', {
            path: mediaItem.path,
            title: mediaItem.title,
            type: mediaItem.type,
            isTVShow: isTVShow
        });
        
        // If it's a TV show episode, use the TV show playback logic
        if (isTVShow) {
            console.log('[MEDIA-LIBRARY] TV show episode detected, using TV show playback logic');
            console.log('[MEDIA-LIBRARY] Current tab flag before calling playEpisodeFromObject:', this.currentTabFlag);
            
            // For Watch Later TV shows, if we already have filePath, use it directly
            if (mediaItem.filePath) {
                console.log('[MEDIA-LIBRARY] Watch Later TV show has filePath, using directly:', mediaItem.filePath);
                await this.playEpisodeFromObject(JSON.stringify(mediaItem), startTime);
                return;
            }
            
            // For Watch Later TV shows without filePath, we need to find the actual episode data
            if (!mediaItem.absPath) {
                console.log('[MEDIA-LIBRARY] Watch Later TV show missing filePath, searching for episode data...');
                
                // Try to find the episode in the TV shows data using the new normalized structure
                const tvShows = this.tvShowsData || [];
                let foundEpisode = null;
                
                console.log('[MEDIA-LIBRARY] Searching for episode in', tvShows.length, 'TV shows');
                console.log('[MEDIA-LIBRARY] Looking for path:', mediaItem.path);
                
                for (const tvShow of tvShows) {
                    if (tvShow.folders) {
                        for (const season of tvShow.folders) {
                            if (season.files) {
                                for (const episode of season.files) {
                                    const epPath = (episode.relPath || episode.path || '').replace(/\\/g, '/').trim();
                                    const searchPath = (mediaItem.path || '').replace(/\\/g, '/').trim();
                                    
                                    console.log('[MEDIA-LIBRARY] Comparing:', epPath, 'with:', searchPath);
                                    
                                    if (epPath === searchPath) {
                                        foundEpisode = episode;
                                        console.log('[MEDIA-LIBRARY] Found matching episode:', episode);
                                        break;
                                    }
                                }
                                if (foundEpisode) break;
                            }
                        }
                        if (foundEpisode) break;
                    }
                }
                
                if (foundEpisode) {
                    // Use the found episode data which has the proper filePath
                    console.log('[MEDIA-LIBRARY] Found episode data, playing with filePath:', foundEpisode.filePath);
                    await this.playEpisodeFromObject(JSON.stringify(foundEpisode), startTime);
                    return;
                } else {
                    console.warn('[MEDIA-LIBRARY] Could not find episode data for Watch Later TV show:', mediaItem.path);
                    console.warn('[MEDIA-LIBRARY] Available properties in mediaItem:', Object.keys(mediaItem));
                    console.warn('[MEDIA-LIBRARY] mediaItem.filePath:', mediaItem.filePath);
                    console.warn('[MEDIA-LIBRARY] mediaItem.absPath:', mediaItem.absPath);
                }
            }
        }
        
        this.closeMediaBrowser();
        await this.waitForVideoPlayerReady(); // Ensure player is ready before playback
        if (!this.videoPlayer) {
            console.error('🎬 [MEDIA-LIBRARY] VideoPlayer not available');
            this.showMediaLibraryError('Video player not available. Please try again.');
            return;
        }
        
        // Handle Watch Later items that don't have full file information
        let fullMediaItem = mediaItem;
        if (!mediaItem.files && !mediaItem.absPath && mediaItem.path) {
            console.log('[MEDIA-LIBRARY] Watch Later item missing file info, searching media library...');
            console.log('[MEDIA-LIBRARY] Watch Later item path:', mediaItem.path);
            console.log('[MEDIA-LIBRARY] Watch Later item title:', mediaItem.title);
            
            // Ensure media library is loaded
            if (!this.mediaLibraryRaw || this.mediaLibraryRaw.length === 0) {
                console.log('[MEDIA-LIBRARY] Media library not loaded, loading now...');
                await this.loadMediaLibrary();
            }
            
            console.log('[MEDIA-LIBRARY] Media library length:', this.mediaLibraryRaw.length);
            console.log('[MEDIA-LIBRARY] Media library structure:', this.mediaLibraryRaw.map(item => ({
                name: item.name,
                path: item.path,
                hasFolders: !!(item.folders && item.folders.length),
                hasFiles: !!(item.files && item.files.length)
            })));
            
            // Debug: Let's see what's actually in the MOVIES folder
            const moviesFolder = this.mediaLibraryRaw.find(item => item.name === 'MOVIES' || item.path === 'MOVIES');
            if (moviesFolder && moviesFolder.folders) {
                console.log('[MEDIA-LIBRARY] MOVIES folder contents:', moviesFolder.folders.map(folder => ({
                    name: folder.name,
                    path: folder.path,
                    hasFiles: !!(folder.files && folder.files.length)
                })));
            }
            
            // Try to find the original movie in the media library
            // First, try direct match
            let originalMovie = this.mediaLibraryRaw.find(item => 
                item.path === mediaItem.path || 
                item.title === mediaItem.title ||
                (item.name && item.name === mediaItem.title)
            );
            
            // If not found, search recursively through folders
            if (!originalMovie) {
                console.log('[MEDIA-LIBRARY] Direct match failed, searching recursively...');
                const searchInFolders = (folders, depth = 0) => {
                    for (const folder of folders) {
                        console.log(`[MEDIA-LIBRARY] Searching at depth ${depth}:`, folder.name, folder.path);
                        
                        // Check if this folder matches
                        if (folder.path === mediaItem.path || 
                            folder.title === mediaItem.title ||
                            (folder.name && folder.name === mediaItem.title)) {
                            console.log('[MEDIA-LIBRARY] Found matching folder:', folder);
                            return folder;
                        }
                        
                        // Search in subfolders
                        if (folder.folders && folder.folders.length > 0) {
                            const found = searchInFolders(folder.folders, depth + 1);
                            if (found) return found;
                        }
                        
                        // Search in files
                        if (folder.files && folder.files.length > 0) {
                            console.log(`[MEDIA-LIBRARY] Checking ${folder.files.length} files in ${folder.name}`);
                            const found = folder.files.find(file => 
                                file.path === mediaItem.path ||
                                file.title === mediaItem.title ||
                                (file.name && file.name === mediaItem.title)
                            );
                            if (found) {
                                console.log('[MEDIA-LIBRARY] Found matching file:', found);
                                return found;
                            }
                        }
                    }
                    return null;
                };
                
                originalMovie = searchInFolders(this.mediaLibraryRaw);
            }
            
            if (originalMovie) {
                console.log('[MEDIA-LIBRARY] Found original movie for Watch Later item:', originalMovie);
                console.log('[MEDIA-LIBRARY] Original movie has files:', !!originalMovie.files);
                console.log('[MEDIA-LIBRARY] Original movie has absPath:', !!originalMovie.absPath);
                fullMediaItem = originalMovie;
                // Update the current media item to use the full version
                window.mediaLibraryManager.currentMediaItem = fullMediaItem;
                window.mediaLibraryManager.currentFile = fullMediaItem;
            } else {
                console.warn('[MEDIA-LIBRARY] Could not find original movie in media library for:', mediaItem.path);
                console.warn('[MEDIA-LIBRARY] Available movie paths:', this.mediaLibraryRaw.map(item => item.path).slice(0, 5));
            }
        }
        
        // Always use absolute path for playback
        let pathParam = '';
        if (fullMediaItem.absPath) {
            pathParam = fullMediaItem.absPath;
        } else if (fullMediaItem.files && fullMediaItem.files.length > 0 && fullMediaItem.files[0].absPath) {
            pathParam = fullMediaItem.files[0].absPath;
        } else if (fullMediaItem.path && fullMediaItem.files && fullMediaItem.files.length > 0 && fullMediaItem.files[0].name) {
            // Construct the full path
            pathParam = `S:/MEDIA/MOVIES/${fullMediaItem.path}/${fullMediaItem.files[0].name}`;
        } else {
            pathParam = fullMediaItem.path || fullMediaItem.relPath || '';
        }
        if (!pathParam.includes('%')) {
            pathParam = encodeURIComponent(pathParam);
        }
        const videoUrl = `/api/video?path=${pathParam}`;
        console.log('[MEDIA-LIBRARY] Final video URL:', videoUrl);
        
        // Set return location based on current context
        if (window.videoPlayer) {
            // Determine where we're coming from
            let returnLocation = { type: 'media-library' };
            
            console.log('[RETURN-LOCATION-DEBUG] Current tab flag:', this.currentTabFlag);
            console.log('[RETURN-LOCATION-DEBUG] Current TV show:', this.currentTVShow);
            console.log('[RETURN-LOCATION-DEBUG] Current TV season:', this.currentTVSeason);
            
            // Check if we're in Watch Later context
            if (this.currentTabFlag === 'watchlater') {
                returnLocation = { type: 'watch-later' };
                console.log('[RETURN-LOCATION-DEBUG] Setting return location to watch-later');
            }
            // Check if we're in Movies context
            else if (this.currentTabFlag === 'movies') {
                returnLocation = { type: 'movies' };
                console.log('[RETURN-LOCATION-DEBUG] Setting return location to movies');
            }
            // Check if we're in TV-Shows context
            else if (this.currentTabFlag === 'tvshows') {
                returnLocation = { type: 'media-library', tab: 'TV-Shows' };
                console.log('[RETURN-LOCATION-DEBUG] Setting return location to tvshows');
            }
            
            console.log('[RETURN-LOCATION-DEBUG] Final return location:', returnLocation);
            window.videoPlayer.setReturnLocation(returnLocation);
        }
        
        this.videoPlayer.playUrl(videoUrl, 'video/mp4', startTime, fullMediaItem);
        this.currentVideo = fullMediaItem;
        this.findNextVideo(fullMediaItem);
        // Attach resume event listeners
        this.attachResumeEvents(fullMediaItem);
    }

    createVideoPlayer() {
        // Remove any existing player container
        const container = document.getElementById('videoPlayerContainer');
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        } else {
            const newContainer = document.createElement('div');
            newContainer.id = 'videoPlayerContainer';
            newContainer.className = 'video-player-container';
            document.body.appendChild(newContainer);
        }
        const playerContainer = document.getElementById('videoPlayerContainer');

        // Insert a <video> element without a fixed id (let Video.js assign one)
        const video = document.createElement('video');
        video.className = 'video-js vjs-default-skin';
        video.setAttribute('controls', '');
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'contain';
        video.style.background = '#000';
        playerContainer.appendChild(video);

        // Disable MediaLibraryManager's overlay system - let VideoPlayer handle it
        // Add overlays/buttons as needed (Up Next, Skip Intro, etc.)
        // let upNextOverlay = document.getElementById('upNextOverlay');
        // if (!upNextOverlay) {
        //     upNextOverlay = document.createElement('div');
        //     upNextOverlay.id = 'upNextOverlay';
        //     upNextOverlay.className = 'up-next-overlay';
        //     upNextOverlay.style.display = 'none';
        //     upNextOverlay.innerHTML = `
        //         <div class="up-next-content">
        //             <h3>Up Next</h3>
        //             <div id="nextVideoInfo"></div>
        //             <div class="up-next-buttons">
        //             <button id="playNextBtn" class="btn btn-primary">Play Now</button>
        //             <button id="cancelNextBtn" class="btn btn-secondary">Cancel</button>
        //             </div>
        //         </div>
        //     `;
        //     playerContainer.appendChild(upNextOverlay);
        // }
        let skipIntroBtn = document.getElementById('skipIntroBtn');
        if (!skipIntroBtn) {
            skipIntroBtn = document.createElement('button');
            skipIntroBtn.id = 'skipIntroBtn';
            skipIntroBtn.className = 'skip-intro-btn';
            skipIntroBtn.style.display = 'none';
            skipIntroBtn.textContent = 'Skip Intro';
            playerContainer.appendChild(skipIntroBtn);
        }

        // --- Custom Seek Buttons ---
        const Button = videojs.getComponent('Button');
        class Back10Button extends Button {
            handleClick() {
                const player = this.player();
                player.currentTime(Math.max(0, player.currentTime() - 10));
            }
        }
        Back10Button.prototype.controlText_ = 'Back 10 seconds';
        videojs.registerComponent('Back10Button', Back10Button);
        class Forward10Button extends Button {
            handleClick() {
                const player = this.player();
                player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
            }
        }
        Forward10Button.prototype.controlText_ = 'Forward 10 seconds';
        videojs.registerComponent('Forward10Button', Forward10Button);

        // Initialize Video.js on the video element (let it assign a dynamic id)
        const player = videojs(video, {
            controlBar: {
                volumePanel: {inline: false}
            },
            fluid: true,
            preload: 'auto',
            playbackRates: [0.5, 1, 1.25, 1.5, 2]
        });
        // Add custom buttons after player is ready
        player.ready(function() {
            // Only add if not already present
            if (!player.getChild('controlBar').getChild('Back10Button')) {
                player.getChild('controlBar').addChild('Back10Button', {}, 1);
            }
            if (!player.getChild('controlBar').getChild('Forward10Button')) {
                player.getChild('controlBar').addChild('Forward10Button', {}, 2);
            }
        });
        // Continue with any other setup (events, overlays, etc.)
        this.setupVideoPlayerEvents(player);
        this.videoPlayer = player;
    }

    setupVideoPlayerEvents(player) {
        let skipIntroTimeout;
        let upNextTimeout;
        player.on('loadedmetadata', () => {
            setTimeout(() => {
                const skipBtn = document.getElementById('skipIntroBtn');
                if (skipBtn) {
                    skipBtn.style.display = 'block';
                    skipBtn.onclick = () => {
                        player.currentTime(90);
                        skipBtn.style.display = 'none';
                    };
                }
            }, 5000);
        });
        player.on('timeupdate', () => {
            const currentTime = player.currentTime();
            const duration = player.duration();
            // Disable MediaLibraryManager's overlay system - let VideoPlayer handle it
            // if (duration && currentTime > duration - MEDIA_LIBRARY_UP_NEXT_BEFORE_END_SECONDS) {
            //     this.showUpNextOverlay();
            // }
            const skipToNextBtn = document.getElementById('skipToNextBtn');
            if (skipToNextBtn) {
                if (duration && (duration - currentTime <= SKIP_TO_NEXT_BEFORE_END_SECONDS) && this.nextVideo) {
                    skipToNextBtn.style.display = 'block';
                } else {
                    skipToNextBtn.style.display = 'none';
                }
            }
        });
        
        // Auto-save resume progress on pause
        player.on('pause', () => {
            const currentTime = player.currentTime();
            const duration = player.duration();
            
            // Use the current media item that's being played
            const mediaItem = this.currentMediaItem || this.currentFile;
            
            if (mediaItem && currentTime > 0 && duration > 0) {
                this.saveResumeProgress(mediaItem, currentTime, duration, false); // false = auto-save
            }
        });
        
        player.on('ended', () => {
            // Always reopen MediaLibrary modal when video ends with last active tab
            if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
                // Restore the last active tab before reopening
                window.mediaLibraryManager.currentTab = window.mediaLibraryManager.lastActiveTab;
                setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
            }
            // Hide skip to next button on end
            const skipToNextBtn = document.getElementById('skipToNextBtn');
            if (skipToNextBtn) skipToNextBtn.style.display = 'none';
        });
        // Patch player close event to always reopen MediaLibrary with last active tab
        player.on('close', () => {
            if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
                // Restore the last active tab before reopening
                window.mediaLibraryManager.currentTab = window.mediaLibraryManager.lastActiveTab;
                setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
            }
        });
    }

    findNextVideo(currentVideo) {
        if (currentVideo.type === 'tvshow' && currentVideo.season && currentVideo.episode) {
            // Find next episode in the same season
            this.nextVideo = this.mediaLibrary.find(item => 
                item.type === 'tvshow' &&
                item.title === currentVideo.title &&
                item.season === currentVideo.season &&
                item.episode === currentVideo.episode + 1
            );

            // If no next episode in same season, try next season
            if (!this.nextVideo) {
                this.nextVideo = this.mediaLibrary.find(item => 
                    item.type === 'tvshow' &&
                    item.title === currentVideo.title &&
                    item.season === currentVideo.season + 1 &&
                    item.episode === 1
                );
            }
        }
    }

    showUpNextOverlay() {
        if (!this.nextVideo) return;

        const overlay = document.getElementById('upNextOverlay');
        const nextInfo = document.getElementById('nextVideoInfo');
        
        if (overlay && nextInfo) {
            nextInfo.innerHTML = `
                <h4>${this.nextVideo.title}</h4>
                <p>Season ${this.nextVideo.season}, Episode ${this.nextVideo.episode}</p>
            `;
            overlay.style.display = 'flex';
            
            // Set up button events
            document.getElementById('playNextBtn').onclick = () => this.playNextVideo();
            document.getElementById('cancelNextBtn').onclick = () => overlay.style.display = 'none';
        }
    }

    playNextVideo() {
        if (this.nextVideo) {
            this.playMedia(this.nextVideo);
        }
    }

    setupVoiceCommandIntegration() {
        // Listen for voice commands from the main app
        document.addEventListener('voiceCommand', (event) => {
            const command = event.detail?.command?.toLowerCase();
            if (command && this.voiceCommands.some(pattern => command.includes(pattern))) {
                console.log('🎬 [MEDIA-LIBRARY] Voice command detected:', command);
                this.openMediaBrowser();
                
                // Add a message to the chat about the voice command
                if (window.addMessageToChat) {
                    window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV-Shows.');
                }
            }
        });

        // Also listen for speech recognition results directly
        if (window.speechRecognition) {
            const originalOnResult = window.speechRecognition.onresult;
            window.speechRecognition.onresult = (event) => {
                if (originalOnResult) {
                    originalOnResult.call(window.speechRecognition, event);
                }
                
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
                if (this.voiceCommands.some(pattern => transcript.includes(pattern))) {
                    console.log('🎬 [MEDIA-LIBRARY] Direct speech recognition detected:', transcript);
                    this.openMediaBrowser();
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV-Shows.');
                    }
                }
            };
        }
    }

    setupTextCommandIntegration() {
        // Listen for text input commands
        document.addEventListener('textCommand', (event) => {
            const command = event.detail?.command?.toLowerCase();
            if (command && this.voiceCommands.some(pattern => command.includes(pattern))) {
                console.log('🎬 [MEDIA-LIBRARY] Text command detected:', command);
                this.openMediaBrowser();
                
                if (window.addMessageToChat) {
                    window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV-Shows.');
                }
            }
        });

        // Hook into the main sendMessage function if available
        if (window.sendMessage) {
            const originalSendMessage = window.sendMessage;
            window.sendMessage = (message, isGreeting = false) => {
                const lowerMessage = message.toLowerCase();
                if (this.voiceCommands.some(pattern => lowerMessage.includes(pattern))) {
                    console.log('🎬 [MEDIA-LIBRARY] Text input command detected:', message);
                    this.openMediaBrowser();
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV-Shows.');
                    }
                    return; // Don't send the command to the AI
                }
                
                // Call the original function
                return originalSendMessage(message, isGreeting);
            };
        }
    }

    // Method to check if a command should trigger the media library
    shouldTriggerMediaLibrary(command) {
        const lowerCommand = command.toLowerCase();
        return this.voiceCommands.some(pattern => lowerCommand.includes(pattern));
    }

    // Method to handle media library commands
    handleMediaLibraryCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        if (this.shouldTriggerMediaLibrary(lowerCommand)) {
            console.log('🎬 [MEDIA-LIBRARY] Command handled:', command);
            this.openMediaBrowser();
            
            if (window.addMessageToChat) {
                window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV-Shows.');
            }
            return true; // Command was handled
        }
        
        return false; // Command was not handled
    }

    // Public method to register with the main app's command system
    registerWithCommandSystem() {
        if (window.registerCommandHandler) {
            window.registerCommandHandler('mediaLibrary', (command) => {
                return this.handleMediaLibraryCommand(command);
            });
            console.log('🎬 [MEDIA-LIBRARY] Registered with command system');
        }
    }

    // Recursively flatten the media library tree into a flat array of video items
    flattenMediaLibrary(node, parentTitle = '', parentPath = '') {
        let items = [];
        if (!node) return items;
        // Add files in this node
        if (Array.isArray(node.files)) {
            for (const file of node.files) {
                items.push({
                    ...file,
                    title: file.name || parentTitle,
                    path: file.absPath || file.relPath || '',
                    absPath: file.absPath || '', // Preserve absPath for cast lookup
                    relPath: file.relPath || '', // Preserve relPath for cast lookup
                    parent: parentTitle,
                    folder: parentPath
                });
            }
        }
        // Recurse into folders
        if (Array.isArray(node.folders)) {
            for (const folder of node.folders) {
                const folderTitle = folder.path || parentTitle;
                items = items.concat(this.flattenMediaLibrary(folder, folderTitle, folder.path));
            }
        }
        return items;
    }

    // Utility to capitalize each word in a string
    capitalizeTitle(str) {
        if (!str || typeof str !== 'string') return '';
        return str.replace(/\b\w/g, c => c.toUpperCase());
    }

    // Utility to clean up movie titles for display
    cleanMovieTitle(filename) {
        if (!filename || typeof filename !== 'string') return '';
        // Remove extension
        let name = filename.replace(/\.[^/.]+$/, "");
        // Remove (year) and [quality] only
        name = name.replace(/\((19|20)\d{2}\)/g, ""); // Remove (2021)
        name = name.replace(/\[\d{3,4}p\]/gi, "");    // Remove [1080p], [720p], etc.
        // Remove years
        name = name.replace(/\b(19|20)\d{2}\b/g, "");
        // Remove audio channel tags like AAC5 1, AAC51, DDP5 1, DDP51, etc.
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*5[ ._\-]*1\b/gi, "");
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*7[ ._\-]*1\b/gi, "");
        // Remove common tags (only as whole words or after separators)
        name = name.replace(/(?:^|[ ._\-])(?:480p|720p|1080p|2160p|4k|8k|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|aac|dts|yify|rarbg|repack|extended|unrated|directors cut|remux|hdtv|amzn|nf|web|ddp|dd5[ ._\-]?1|5[ ._\-]?1|7[ ._\-]?1|mp3|flac|truehd|atmos|hevc|h265|h264|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion)(?=$|[ ._\-])/gi, "");
        // Remove trailing group tags (e.g., -YTS, -RARBG, etc.)
        name = name.replace(/[-_. ]+(yts( mx| am)?|rarbg|jyk|kogi|web|amzn|nf|ddp|dd5[ ._\-]?1|aac|dts|hdtv|remux|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)\b.*$/i, "");
        // Replace dots, underscores, dashes with spaces
        name = name.replace(/[._-]+/g, " ");
        // Remove extra spaces
        name = name.replace(/\s+/g, " ").trim();
        // Capitalize each word
        name = this.capitalizeTitle(name);
        return name;
    }

    // Add/Update: Top bar count
    updateCount() {
        const countSpan = document.getElementById('mediaLibraryCount');
        if (!countSpan) return;
        
        // Hide count on Watch Later tab
        if (this.currentTab === 'watchlater') {
            countSpan.textContent = '';
            countSpan.style.display = 'none';
            return;
        }
        
        const items = this.getFilteredAndSortedItems();
        let countText = '';
        
        if (this.currentTab === 'movies') {
            const totalMovies = this.getTotalMovieCount();
            countText = `Movies: ${totalMovies}`;
        } else if (this.currentTab === 'tvshows') {
            const totalTVShows = this.getTotalTVShowCount();
            countText = `TV-Shows: ${totalTVShows}`;
        } else if (this.currentTab === 'favorites') {
            const favorites = this.getFavoritesList();
            const totalFavorites = favorites.movies.length + favorites.tvshows.length;
            countText = `Favorites: ${totalFavorites}`;
        } else if (this.currentTab === 'collections') {
            const collections = this.getCollections();
            const totalCollections = Object.keys(collections).length;
            countText = `Collections: ${totalCollections}`;
        } else if (this.currentTab === 'suggestions') {
            const suggestions = this.getSuggestions();
            countText = `Suggestions: ${suggestions.length}`;
        } else {
            countText = `${items.length} Items`;
        }
        
        countSpan.textContent = countText;
        countSpan.style.display = '';
    }

    // Add/Update: Search and sort UI state
    restoreSearchSortUI() {
        const searchInput = document.getElementById('mediaLibrarySearch');
        if (searchInput) {
            // Restore search input value based on current tab
            let searchValue = '';
            switch (this.currentTab) {
                case 'movies':
                    searchValue = this.movieSearchQuery || '';
                    break;
                case 'tvshows':
                    searchValue = this.tvShowSearchQuery || '';
                    break;
                case 'favorites':
                    searchValue = this.favoritesSearchQuery || '';
                    break;
                case 'collections':
                    searchValue = this.collectionsSearchQuery || '';
                    break;
                case 'watchlater':
                    searchValue = this.watchLaterSearchQuery || '';
                    break;
                case 'suggestions':
                    searchValue = this.suggestionsSearchQuery || '';
                    break;
                default:
                    searchValue = this.searchQuery || '';
                    break;
            }
            searchInput.value = searchValue;
        }
        const sortSelect = document.getElementById('mediaLibrarySort');
        if (sortSelect) sortSelect.value = this.sortBy || 'asc';
    }

    // Add: Search and sort state - separate for each tab
    searchQuery = '';
    movieSearchQuery = '';
    tvShowSearchQuery = '';
    favoritesSearchQuery = '';
    collectionsSearchQuery = '';
    watchLaterSearchQuery = '';
    suggestionsSearchQuery = '';

    handleSearchInput(event) {
        const searchValue = event.target.value;
        console.log('[DEBUG - SEARCH-INPUT] handleSearchInput called with value:', searchValue);
        console.log('[DEBUG - SEARCH-INPUT] Current tab:', this.currentTab);
        
        // Store search query based on current tab
        switch (this.currentTab) {
            case 'movies':
                this.movieSearchQuery = searchValue;
                console.log('[DEBUG - SEARCH-INPUT] Set movieSearchQuery to:', searchValue);
                break;
            case 'tvshows':
                this.tvShowSearchQuery = searchValue;
                console.log('[DEBUG - SEARCH-INPUT] Set tvShowSearchQuery to:', searchValue);
                break;
            case 'favorites':
                this.favoritesSearchQuery = searchValue;
                console.log('[DEBUG - SEARCH-INPUT] Set favoritesSearchQuery to:', searchValue);
                break;
            case 'collections':
                this.collectionsSearchQuery = searchValue;
                console.log('[DEBUG - SEARCH-INPUT] Set collectionsSearchQuery to:', searchValue);
                break;
            case 'watchlater':
                this.watchLaterSearchQuery = searchValue;
                console.log('[DEBUG - SEARCH-INPUT] Set watchLaterSearchQuery to:', searchValue);
                break;
            case 'suggestions':
                this.suggestionsSearchQuery = searchValue;
                console.log('[DEBUG - SEARCH-INPUT] Set suggestionsSearchQuery to:', searchValue);
                break;
            default:
                this.searchQuery = searchValue; // fallback
                console.log('[DEBUG - SEARCH-INPUT] Set searchQuery to:', searchValue);
                break;
        }
        
        // Use updateModalContent to handle all tabs including TV-Shows
        this.updateModalContent();
        this.updateCount();
    }

    handleSortChange(event) {
        this.sortBy = event.target.value;
        // Use updateModalContent to handle all tabs including TV-Shows
        this.updateModalContent();
        this.updateCount();
    }



    // Add: A-Z sidebar rendering
    renderAZSidebarMovie() {
        console.log('[DEBUG - A-Z] renderAZSidebarMovie called');
        
        // Clear both sidebars first to prevent duplicates
        const movieSidebar = document.getElementById('mediaLibraryAZSidebarMovie');
        const tvSidebar = document.getElementById('mediaLibraryAZSidebarTVShow');
        
        if (tvSidebar) {
            tvSidebar.innerHTML = '';
            tvSidebar.style.display = 'none';
        }
        
        if (!movieSidebar) {
            console.warn('[DEBUG - A-Z] No mediaLibraryAZSidebarMovie element found');
            return;
        }
        
        // Get the current filtered and sorted items to determine which letters are available
        const filteredItems = this.getFilteredAndSortedItems();
        const availableLetters = new Set();
        
        // Collect all first letters from the filtered items
        filteredItems.forEach(item => {
            const cleanTitle = this.cleanMovieTitle(item.title || item.name || item.filename || item.path || '');
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            if (firstLetter && /[A-Z]/.test(firstLetter)) {
                availableLetters.add(firstLetter);
            }
        });
        
        console.log('[DEBUG - A-Z] Found movie sidebar, rendering letters for filtered items');
        movieSidebar.innerHTML = '';
        movieSidebar.style.display = 'flex';
        
        // Only render letters that have movies in the current filtered results
        const letters = Array.from(availableLetters).sort();
        letters.forEach(letter => {
            const btn = document.createElement('div');
            btn.className = 'media-library-az-letter-movie';
            btn.textContent = letter;
            btn.setAttribute('data-letter', letter);
            movieSidebar.appendChild(btn);
        });
        
        // Use event delegation - single listener on the sidebar for movies only
        movieSidebar.onclick = (e) => {
            const letterElement = e.target.closest('.media-library-az-letter-movie');
            if (letterElement) {
                const letter = letterElement.getAttribute('data-letter');
                if (letter) {
                    this.scrollToLetterMovie(letter);
                }
            }
        };
        
        console.log('[DEBUG - A-Z] Movie A-Z sidebar rendered with', letters.length, 'letters:', letters.join(', '));
    }

    renderAZSidebarTVShow() {
        console.log('[DEBUG - A-Z] renderAZSidebarTVShow called');
        
        // Clear both sidebars first to prevent duplicates
        const movieSidebar = document.getElementById('mediaLibraryAZSidebarMovie');
        const tvSidebar = document.getElementById('mediaLibraryAZSidebarTVShow');
        
        if (movieSidebar) {
            movieSidebar.innerHTML = '';
            movieSidebar.style.display = 'none';
        }
        
        if (!tvSidebar) {
            console.warn('[DEBUG - A-Z] No mediaLibraryAZSidebarTVShow element found');
            return;
        }
        
        // Get the current filtered and sorted items to determine which letters are available
        const filteredItems = this.getFilteredAndSortedItems();
        const availableLetters = new Set();
        
        // Collect all first letters from the filtered items
        filteredItems.forEach(item => {
            const cleanTitle = this.cleanTVShowTitle(item.name || item.title || item.filename || item.path || '');
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            if (firstLetter && /[A-Z]/.test(firstLetter)) {
                availableLetters.add(firstLetter);
            }
        });
        
        console.log('[DEBUG - A-Z] Found sidebar, rendering TV show letters for filtered items');
        tvSidebar.innerHTML = '';
        tvSidebar.style.display = 'flex';
        
        // Only render letters that have shows in the current filtered results
        const letters = Array.from(availableLetters).sort();
        letters.forEach(letter => {
            const btn = document.createElement('div');
            btn.className = 'media-library-az-letter-tvshow';
            btn.textContent = letter;
            btn.setAttribute('data-letter', letter);
            tvSidebar.appendChild(btn);
        });
        
        // Use event delegation - single listener on the sidebar for TV shows only
        tvSidebar.onclick = (e) => {
            const letterElement = e.target.closest('.media-library-az-letter-tvshow');
            if (letterElement) {
                const letter = letterElement.getAttribute('data-letter');
                if (letter) {
                    this.scrollToLetterTVShows(letter);
                }
            }
        };
        console.log('[DEBUG - A-Z] TV show A-Z sidebar rendered with', letters.length, 'letters:', letters.join(', '));
    }

    scrollToLetterMovie(letter) {
        console.log('🔤 [A-Z] scrollToLetterMovie called with letter:', letter);
        // Find the anchor for this letter (movies use .media-library-anchor)
        const anchor = document.querySelector(`.media-library-anchor[data-anchor="${letter}"]`);
        // Highlight the active letter in the A-Z sidebar for movies
        const azSidebar = document.getElementById('mediaLibraryAZSidebarMovie');
        if (azSidebar) {
            azSidebar.querySelectorAll('.media-library-az-letter-movie').forEach(btn => btn.classList.remove('az-active-movie'));
            const activeBtn = azSidebar.querySelector(`.media-library-az-letter-movie[data-letter='${letter}']`);
            if (activeBtn) activeBtn.classList.add('az-active-movie');
        }
        if (anchor) {
            // Find the parent card (movies use .media-library-movie-card)
            const card = anchor.closest('.media-library-movie-card');
            if (card) {
                card.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
                card.style.transition = 'background 0.3s';
                const originalBg = card.style.background;
                card.style.background = '#fff9c4'; // light yellow
            setTimeout(() => {
                    card.style.background = originalBg || '';
            }, 600);
            console.log('🔤 [A-Z] Found and scrolled to movie card for letter:', letter);
            } else {
                // fallback: scroll to anchor itself
                anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            console.warn('🔤 [A-Z] No movie anchor found for letter:', letter);
        }
    }

    scrollToLetterTVShows(letter) {
        console.log('🔤 [A-Z] scrollToLetterTVShows called with letter:', letter);
        // Find the anchor for this letter (TV-Shows use .media-library-anchor)
        const anchor = document.querySelector(`.media-library-anchor[data-anchor="${letter}"]`);
        console.log('[DEBUG - A-Z] Looking for anchor with data-anchor="' + letter + '", found:', anchor);
        
        // Highlight the active letter in the A-Z sidebar for TV shows
        const azSidebar = document.getElementById('mediaLibraryAZSidebarTVShow');
        if (azSidebar) {
            azSidebar.querySelectorAll('.media-library-az-letter-tvshow').forEach(btn => btn.classList.remove('az-active-tvshow'));
            const activeBtn = azSidebar.querySelector(`.media-library-az-letter-tvshow[data-letter='${letter}']`);
            if (activeBtn) activeBtn.classList.add('az-active-tvshow');
        }
        
        if (anchor) {
            // Find the parent card (TV-Shows use .media-library-tv-card)
            const card = anchor.closest('.media-library-tv-card');
            console.log('[DEBUG - A-Z] Found card:', card);
            if (card) {
                card.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
                card.style.transition = 'background 0.3s';
                const originalBg = card.style.background;
                card.style.background = '#fff9c4'; // light yellow
            setTimeout(() => {
                    card.style.background = originalBg || '';
            }, 600);
                console.log('🔤 [A-Z] Found and scrolled to TV show card for letter:', letter);
            } else {
                // fallback: scroll to anchor itself
                anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } else {
            console.warn('🔤 [A-Z] No TV show anchor found for letter:', letter);
            // Try alternative selector for TV show cards
            const tvCard = document.querySelector(`.media-library-tv-card[data-anchor="${letter}"]`);
            console.log('[DEBUG - A-Z] Trying alternative selector, found TV card:', tvCard);
            if (tvCard) {
                tvCard.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' 
                });
                tvCard.style.transition = 'background 0.3s';
                const originalBg = tvCard.style.background;
                tvCard.style.background = '#fff9c4';
                setTimeout(() => {
                    tvCard.style.background = originalBg || '';
                }, 600);
                console.log('🔤 [A-Z] Found and scrolled to TV show card using alternative selector for letter:', letter);
            }
        }
    }

    // Remove duplicate scrollToLetterTVShows method

    // Update: renderMediaGrid to use search, sort, shuffle
    getFilteredAndSortedItems() {
        const items = this.getItemsForCurrentTab();
        if (!items || !Array.isArray(items)) {
            console.log('[DEBUG] No items or items is not an array, returning empty array');
            return [];
        }
        console.log('[MOVIE DEBUG] Items before filtering:', items.length, items.slice(0, 3));
        
        // Get the appropriate search query for the current tab
        let currentSearchQuery = '';
        switch (this.currentTab) {
            case 'movies':
                currentSearchQuery = this.movieSearchQuery;
                break;
            case 'tvshows':
                currentSearchQuery = this.tvShowSearchQuery;
                break;
            case 'favorites':
                currentSearchQuery = this.favoritesSearchQuery;
                break;
            case 'collections':
                currentSearchQuery = this.collectionsSearchQuery;
                break;
            case 'watchlater':
                currentSearchQuery = this.watchLaterSearchQuery;
                break;
            case 'suggestions':
                currentSearchQuery = this.suggestionsSearchQuery;
                break;
            default:
                currentSearchQuery = this.searchQuery; // fallback
                break;
        }
        
        console.log('[DEBUG - FILTER] Current tab:', this.currentTab);
        console.log('[DEBUG - FILTER] Current search query:', currentSearchQuery);
        console.log('[DEBUG - FILTER] movieSearchQuery:', this.movieSearchQuery);
        console.log('[DEBUG - FILTER] tvShowSearchQuery:', this.tvShowSearchQuery);
        
        // Apply search filter
        let filtered = this.filterItems(items, currentSearchQuery);
        console.log('[MOVIE DEBUG] Items after search filtering:', filtered.length, filtered.slice(0, 3));
        
        // Apply genre filter if not "All Genres"
        if (this.selectedGenre && this.selectedGenre !== 'All Genres') {
            filtered = this.filterByGenre(filtered, this.selectedGenre);
            console.log('[MOVIE DEBUG] Items after genre filtering:', filtered.length, filtered.slice(0, 3));
        }
        
        // For movies, sort by clean display title; for TV-Shows, keep as is
        if (this.currentTab === 'movies') {
            return filtered.slice().sort((a, b) => {
                const titleA = this.cleanMovieTitle(a.title || a.name || a.filename || a.path || '').toLowerCase();
                const titleB = this.cleanMovieTitle(b.title || b.name || b.filename || b.path || '').toLowerCase();
                if (this.sortBy === 'asc') {
                    return titleA.localeCompare(titleB);
                } else {
                    return titleB.localeCompare(titleA);
                }
            });
        } else {
            return this.sortItems(filtered, this.sortBy, 'name');
        }
    }

    // Format time for resume info
    formatTime(seconds) {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    renderGrid(items, labelFn) {
        // Add anchors to the grid
        let lastLetter = null;
        items.forEach((item, index) => {
            const title = labelFn(item).trim();
            const firstLetter = title[0] ? title[0].toUpperCase() : '';
            let anchorHTML = '';
            if (firstLetter && firstLetter !== lastLetter) {
                anchorHTML = `<div class="media-library-anchor" data-anchor="${firstLetter}"></div>`;
                lastLetter = firstLetter;
            }
            grid += `
                ${anchorHTML}
                <div class="media-library-movie-card" data-item-index="${index}" data-item-path="${item.path}">
                    <img src="${item.poster}" alt="${labelFn(item)}">
                    <div class="media-info"><h3>${labelFn(item)}</h3></div>
                    <div class="media-library-resume-info" style="margin-bottom:6px;">Resume at ${this.formatTime(item.currentTime)} / ${this.formatTime(item.duration)}</div>
                    <div style="display:flex;justify-content:center;gap:8px;">
                        <button class="resume-btn" style="margin-top: 0; padding: 6px 14px; border-radius: 6px; background: #007bff; color: #fff; border: none; cursor: pointer; font-size: 1em;">Watch</button>
                        <button class="delete-btn" title="Remove from Watch Later" style="margin-top: 0; padding: 6px 10px; border-radius: 6px; background: #e53935; color: #fff; border: none; cursor: pointer; font-size: 1em;">🗑️</button>
                    </div>
                </div>
            `;
        });
        grid += '</div>';
        
        // Add event listeners after the HTML is inserted into the DOM
        setTimeout(() => {
            const cards = document.querySelectorAll('.media-library-movie-grid .media-library-movie-card');
            cards.forEach(card => {
                const resumeBtn = card.querySelector('.resume-btn');
                const deleteBtn = card.querySelector('.delete-btn');
                const itemPath = card.getAttribute('data-item-path');
                
                // Find the corresponding item from the resume list
                const resumeList = this.getResumeList();
                const item = resumeList.find(resumeItem => resumeItem.path === itemPath);
                
                if (item) {
                    // Resume button click handler
                    resumeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.playMedia(item, item.currentTime);
                    });
                    
                    // Delete button click handler
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.removeResumeProgress(item.path);
                        this.renderWatchLaterContent();
                        this.showToast('Removed from Watch Later');
                    });
                    
                    // Card click handler (resume from saved position)
                    card.addEventListener('click', () => {
                        console.log('[WATCH-LATER] Card clicked for:', item);
                        this.playMedia(item, item.currentTime);
                    });
                }
            });
        }, 100);
        
        return grid;
    }

    renderWatchLaterContent() {
        // Always clean up duplicates when rendering Watch Later content
        this.cleanupWatchLaterDuplicates();
        
        // Get the resume list sorted by lastWatched (newest first)
        const resumeList = this.getResumeList();
        
        // Improved TV-Show detection: check for episode patterns, TV show paths, and type
        const tvshows = resumeList.filter(item => {
            const path = (item.path || '').toLowerCase();
            const type = (item.type || '').toLowerCase();
            const title = (item.title || '').toLowerCase();
            
            // Check for TV show type
            if (type.includes('tv-show') || type.includes('tv') || type.includes('show')) {
                return true;
            }
            
            // Check for TV show paths
            if (path.includes('tv-shows') || path.includes('tv_shows') || path.includes('tv shows')) {
                return true;
            }
            
            // Check for episode patterns in path or title (S01E01, S02E05, etc.)
            if (path.match(/s\d+e\d+/i) || title.match(/s\d+e\d+/i)) {
                return true;
            }
            
            // Check for season patterns in path
            if (path.includes('season') || path.includes('s01') || path.includes('s02')) {
                return true;
            }
            
            return false;
        });
        
        const movies = resumeList.filter(item => !tvshows.includes(item));
        // Helper for TV show label and screenshot
        const getTvShowLabel = (item) => {
            let path = decodeURIComponent(item.path || '');
            // Try to extract show name and SxxExx
            let show = '', code = '', year = '';
            
            console.log('[DEBUG - WATCH-LATER] getTvShowLabel called with path:', path);
            console.log('[DEBUG - WATCH-LATER] tvShowsData available:', this.tvShowsData ? 'YES' : 'NO');
            console.log('[DEBUG - WATCH-LATER] tvShowsData length:', this.tvShowsData ? this.tvShowsData.length : 'N/A');
            
            // First, try to find the show data from the JSON to get the year
            if (this.tvShowsData && Array.isArray(this.tvShowsData)) {
                console.log('[DEBUG - WATCH-LATER] Searching through', this.tvShowsData.length, 'TV shows for path:', path);
                
                for (const tvShow of this.tvShowsData) {
                    // Check if this episode belongs to this show by matching the path
                    if (tvShow.folders) {
                        for (const season of tvShow.folders) {
                            if (season.files) {
                                for (const episode of season.files) {
                                    const epPath = (episode.relPath || episode.path || '').replace(/\\/g, '/').trim();
                                    const searchPath = path.replace(/\\/g, '/').trim();
                                    
                                    if (epPath === searchPath) {
                                        console.log('[DEBUG - WATCH-LATER] Found matching episode!');
                                        console.log('[DEBUG - WATCH-LATER] Show path:', tvShow.path);
                                        console.log('[DEBUG - WATCH-LATER] Show normalizedKey:', tvShow.normalizedKey);
                                        
                                        // Found the show! Extract year from the normalizedKey
                                        if (tvShow.normalizedKey) {
                                            const yearMatch = tvShow.normalizedKey.match(/\((\d{4})\)/);
                                            if (yearMatch) {
                                                year = yearMatch[1];
                                                console.log('[DEBUG - WATCH-LATER] Extracted year from normalizedKey:', year);
                                            } else {
                                                console.log('[DEBUG - WATCH-LATER] No year found in normalizedKey');
                                            }
                                            
                                            // Extract show name from normalizedKey (remove the year part)
                                            show = tvShow.normalizedKey.replace(/\.\(\d{4}\)$/, '').replace(/\./g, ' ').trim();
                                            console.log('[DEBUG - WATCH-LATER] Extracted show name from normalizedKey:', show);
                                        } else {
                                            // Fallback to path parsing if no normalizedKey
                                            const yearMatch = tvShow.path.match(/\((\d{4})\)/);
                                            if (yearMatch) {
                                                year = yearMatch[1];
                                                console.log('[DEBUG - WATCH-LATER] Extracted year from path (fallback):', year);
                                            }
                                            show = tvShow.path.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                                            console.log('[DEBUG - WATCH-LATER] Extracted show name from path (fallback):', show);
                                        }
                                        break;
                                    }
                                }
                                if (year) break;
                            }
                        }
                        if (year) break;
                    }
                }
                
                if (!year) {
                    console.log('[DEBUG - WATCH-LATER] No matching show found in JSON data, falling back to path parsing');
                }
            } else {
                console.log('[DEBUG - WATCH-LATER] tvShowsData not available, falling back to path parsing');
            }
            
            // If we didn't find the show in JSON data, fall back to path parsing
            if (!show) {
                console.log('[DEBUG - WATCH-LATER] Falling back to path parsing for:', path);
                
                // Try to match 'TV-SHOWS/Show/Season 01/Show S01E02 ...'
                let match = path.match(/TV-?SHOWS[\\/](.*?)[\\/].*?[Ss](\d{2})[Ee](\d{2})/i);
                if (match) {
                    const folderName = match[1].replace(/_/g, ' ').trim();
                    console.log('[DEBUG - WATCH-LATER] Extracted folder name:', folderName);
                    
                    // Extract year from folder name
                    const yearMatch = folderName.match(/\((\d{4})\)/);
                    if (yearMatch) {
                        year = yearMatch[1];
                        show = folderName.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                        console.log('[DEBUG - WATCH-LATER] Found year in folder name:', year);
                        console.log('[DEBUG - WATCH-LATER] Extracted show name:', show);
                    } else {
                        show = folderName;
                        console.log('[DEBUG - WATCH-LATER] No year in folder name, using:', show);
                    }
                    code = `S${match[2]}E${match[3]}`;
                    console.log('[DEBUG - WATCH-LATER] Extracted episode code:', code);
                } else {
                    console.log('[DEBUG - WATCH-LATER] No TV-SHOWS pattern match, trying filename parsing');
                    
                    // Fallback: try to extract from filename
                    let file = path.split(/[\\/]/).pop();
                    let epMatch = file.match(/[Ss](\d{2})[Ee](\d{2})/i);
                    if (epMatch) {
                        code = `S${epMatch[1]}E${epMatch[2]}`;
                        console.log('[DEBUG - WATCH-LATER] Extracted episode code from filename:', code);
                    }
                    
                    // Try to get show from parent folder
                    let parts = path.split(/[\\/]/);
                    if (parts.length > 2) {
                        const folderName = parts[parts.length - 3].replace(/_/g, ' ').trim();
                        console.log('[DEBUG - WATCH-LATER] Extracted folder name from path parts:', folderName);
                        
                        const yearMatch = folderName.match(/\((\d{4})\)/);
                        if (yearMatch) {
                            year = yearMatch[1];
                            show = folderName.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                            console.log('[DEBUG - WATCH-LATER] Found year in folder name:', year);
                            console.log('[DEBUG - WATCH-LATER] Extracted show name:', show);
                        } else {
                            show = folderName;
                            console.log('[DEBUG - WATCH-LATER] No year in folder name, using:', show);
                        }
                    }
                }
            }
            
            // If we have show name but no episode code, try to extract from filename
            if (show && !code) {
                const filename = path.split(/[\\/]/).pop() || '';
                console.log('[DEBUG - WATCH-LATER] Extracting episode code from filename:', filename);
                const epMatch = filename.match(/[Ss](\\d{2})[Ee](\\d{2})/i);
                if (epMatch) {
                    code = `S${epMatch[1]}E${epMatch[2]}`;
                    console.log('[DEBUG - WATCH-LATER] Extracted episode code:', code);
                }
            }
            
            // Build the label with year if available
            if (show && code) {
                const finalLabel = year ? `${show} (${year}): ${code}` : `${show}: ${code}`;
                console.log('[DEBUG - WATCH-LATER] Final label:', finalLabel);
                return finalLabel;
            } else if (show) {
                // If we have show name but no episode code, just show the show with year
                const finalLabel = year ? `${show} (${year})` : show;
                console.log('[DEBUG - WATCH-LATER] Final label (no episode code):', finalLabel);
                return finalLabel;
            }
            
            const fallbackLabel = item.title || item.name || 'Episode';
            console.log('[DEBUG - WATCH-LATER] Using fallback label:', fallbackLabel);
            return fallbackLabel;
        };
        function getTvShowScreenshot(item, self) {
            // Try to robustly extract show/season/episode for screenshot
            let path = decodeURIComponent(item.path || '');
            let show = '', season = '', episode = '';
            // Try to match common patterns
            let match = path.match(/TV-?SHOWS[\\/](.*?)[\\/]Season[ _-]?(\d+)[\\/].*?[Ss](\d+)[Ee](\d+)/i);
            if (match) {
                show = match[1].replace(/_/g, ' ').trim();
                season = `Season ${parseInt(match[2], 10)}`;
                episode = match[0].match(/[Ss](\d+)[Ee](\d+)/i) ? match[0] : (item.name || item.title || '');
            } else {
                // Fallback: try to extract from filename
                let file = path.split(/[\\/]/).pop();
                let epMatch = file.match(/[Ss](\d+)[Ee](\d+)/i);
                if (epMatch) {
                    season = `Season ${parseInt(epMatch[1], 10)}`;
                    episode = file;
                }
                // Try to get show from parent folder
                let parts = path.split(/[\\/]/);
                if (parts.length > 2) show = parts[parts.length - 3].replace(/_/g, ' ').trim();
            }
            if (show && season && episode) {
                // Pass an object with .name and .path for compatibility
                const epObj = { name: episode, path: path };
                const img = self.getEpisodeImage(show, season, epObj);
                if (img && !img.includes('placeholder') && !img.includes('undefined') && img.trim() !== '') return img;
            }
            // Try show poster as fallback
            if (show) {
                const poster = self.getPosterPath({ name: show, path: path });
                if (poster && !poster.includes('placeholder') && !poster.includes('undefined') && poster.trim() !== '') return poster;
            }
            return '/assets/img/placeholder-poster.jpg';
        }
        // Main flex container
        let html = `
        <div class="watch-later-flex-container">
            <div class="watch-later-column">
                <div class="watch-later-section-title">Movies</div>
                <hr class="watch-later-section-divider">
                <div class="watch-later-scroll">
                    <div class="watch-later-grid">
                        ${movies.map(item => `
                            <div class="media-library-movie-card-movies watch-later-card" data-path="${item.path}">
                                <img class="watch-later-img-movie watch-later-img watch-later-img-clickable" src="${this.getPosterPath(item)}" alt="${item.title}">
                                ${item.lastWatched ? `<div class="watch-later-timestamp">Last watched: ${this.formatDateTime(item.lastWatched)}<br><span class=\"watch-later-resume-info\">Resume from ${this.formatTime(item.currentTime)}</span></div>` : ''}
                                <div class="media-info"><h3 class="watch-later-title">${this.cleanMovieTitle(item.title || item.name || 'Movie')}</h3></div>
                                <div class="watch-later-btn-row">
                                    <button class="watch-later-resume-btn">Watch</button>
                                    <button class="watch-later-delete-btn">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                        ${movies.length === 0 ? '<div class="watch-later-empty">(No items)</div>' : ''}
                    </div>
                </div>
            </div>
            <div class="watch-later-column">
                <div class="watch-later-section-title">TV-Shows</div>
                <hr class="watch-later-section-divider">
                <div class="watch-later-scroll">
                    <div class="watch-later-grid">
                                        ${tvshows.map(item => {
                    // Use the EXACT SAME method as main TV-SHOWS tab - get episode object directly
                    const episodeObj = this.getEpisodeObjectFromPath(item.path);
                    if (!episodeObj) {
                        console.error('[DEBUG - WATCH-LATER] No episode object found for path:', item.path, '- SKIPPING THIS ITEM');
                        return ''; // Skip this item entirely - no fallback
                    }
                    
                    // Create the EXACT SAME HTML structure as main TV-SHOWS tab
                    const episodeData = JSON.stringify(episodeObj).replace(/"/g, '&quot;').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                    return `<div class="media-library-card episode watch-later-card" data-episode="${episodeData}" data-resume-time="${item.currentTime || 0}">
                        <div class="media-library-card-poster">
                            <img src="${getTvShowScreenshot(item, this)}" alt="${getTvShowLabel(item)}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                            <div class="media-library-play-overlay">▶</div>
                        </div>
                        <div class="media-library-card-info">
                            <h3 class="tv-show-season-episode-name">${getTvShowLabel(item)}</h3>
                            ${item.lastWatched ? `<div class="watch-later-timestamp">Last watched: ${this.formatDateTime(item.lastWatched)}<br><span class="watch-later-resume-info">Resume from ${this.formatTime(item.currentTime)}</span></div>` : ''}
                        </div>
                        <div class="watch-later-btn-row">
                            <button class="watch-later-resume-btn">Watch</button>
                            <button class="watch-later-delete-btn">🗑️</button>
                        </div>
                    </div>`;
                }).join('')}
                        ${tvshows.length === 0 ? '<div class="watch-later-empty">(No items)</div>' : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
        // Update the modal content if the modal is open
        const mediaGrid = document.getElementById('mediaGrid');
        if (mediaGrid) {
            mediaGrid.innerHTML = html;
            // Attach handlers for movies and delete buttons
            setTimeout(() => {
                console.log('[DEBUG - WATCH-LATER] Setting up handlers...');
                
                // Delete handlers for both movies and TV shows
                document.querySelectorAll('.watch-later-delete-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        // Use .watch-later-card to match both movie and tvshow cards
                        const card = btn.closest('.watch-later-card');
                        let path = null;
                        
                        if (card) {
                            // For movies, get path from data-path attribute
                            path = card.getAttribute('data-path');
                            
                            // For TV shows, extract path from episode data
                            if (!path) {
                                const episodeData = card.getAttribute('data-episode');
                                if (episodeData) {
                                    try {
                                        const episodeObj = JSON.parse(episodeData);
                                        path = episodeObj.path;
                                        console.log('[DEBUG - WATCH-LATER] Extracted path from episode data:', path);
                                    } catch (error) {
                                        console.error('[DEBUG - WATCH-LATER] Error parsing episode data:', error);
                                    }
                                }
                            }
                        }
                        
                        if (path) {
                            this.removeResumeProgress(path);
                            this.renderWatchLaterContent();
                            this.showToast('Removed from Watch Later');
                        } else {
                            console.error('[DEBUG - WATCH-LATER] Could not find path for delete operation');
                            this.showToast('Error: Could not remove item', 'error');
                        }
                    };
                });
                
                // Resume handlers for movies
                document.querySelectorAll('.media-library-movie-card-movies .watch-later-resume-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const card = btn.closest('.watch-later-card');
                        const path = card ? card.getAttribute('data-path') : null;
                        const item = resumeList.find(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (path || '').replace(/\\/g, '/').toLowerCase().trim());
                        if (item) {
                            console.log('[DEBUG - WATCH-LATER] Playing movie with:', item.path, item.currentTime);
                            this.playMedia(item, item.currentTime);
                        }
                    };
                });
                
                // Resume handlers for TV shows
                document.querySelectorAll('.media-library-card.episode .watch-later-resume-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const card = btn.closest('.watch-later-card');
                        if (card) {
                            console.log('[DEBUG - WATCH-LATER] Playing TV show from Watch Later');
                            this.playEpisodeFromDataAttributeAsync(card);
                        }
                    };
                });
                
                // Image click handlers for movies only (TV shows use onclick)
                document.querySelectorAll('.media-library-movie-card-movies .watch-later-img-clickable').forEach(img => {
                    img.onclick = async (e) => {
                        e.stopPropagation();
                        const card = img.closest('.watch-later-card');
                        const path = card ? card.getAttribute('data-path') : null;
                        const item = resumeList.find(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (path || '').replace(/\\/g, '/').toLowerCase().trim());
                        if (item) {
                            console.log('[DEBUG - WATCH-LATER] Playing movie (img click) with:', item.path, item.currentTime);
                            this.playMedia(item, item.currentTime);
                        }
                    };
                });
                
                // Image click handlers for TV shows (same functionality as Watch button)
                document.querySelectorAll('.media-library-card.episode .media-library-card-poster img').forEach(img => {
                    img.onclick = async (e) => {
                        e.stopPropagation();
                        const card = img.closest('.watch-later-card');
                        if (card) {
                            console.log('[DEBUG - WATCH-LATER] Playing TV show (img click) from Watch Later');
                            this.playEpisodeFromDataAttributeAsync(card);
                        }
                    };
                });
                
                // Add manual cleanup button
                const cleanupBtn = document.createElement('button');
                cleanupBtn.innerHTML = '🧹 Clean Duplicates';
                cleanupBtn.className = 'cleanup-btn';
                cleanupBtn.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; background: #ff4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;';
                cleanupBtn.onclick = () => {
                    this.renderWatchLaterContent();
                    this.showToast('Content refreshed!');
                };
                document.body.appendChild(cleanupBtn);
                

            }, 0);
        }
        return html;
    }

    // --- UTILITY METHODS ---
    filterItems(items, searchTerm) {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item =>
            (item.name && item.name.toLowerCase().includes(term)) ||
            (item.title && item.title.toLowerCase().includes(term)) ||
            (item.filename && item.filename.toLowerCase().includes(term)) ||
            (item.path && item.path.toLowerCase().includes(term)) ||
            (item.TMDBTitle && item.TMDBTitle.toLowerCase().includes(term))
        );
    }

    filterByGenre(items, selectedGenre) {
        if (!selectedGenre || selectedGenre === 'All Genres') return items;
        
        const genre = selectedGenre.toLowerCase();
        return items.filter(item => {
            let itemGenres = [];
            
            if (this.currentTab === 'movies') {
                // For movies, get genres using the existing method
                itemGenres = this.getMovieGenres(item);
            } else if (this.currentTab === 'tvshows') {
                // For TV shows, get genres using the TV show method
                itemGenres = this.getTVGenres(item);
            }
            
            // Check if the selected genre is in the item's genres
            return itemGenres.some(itemGenre => 
                itemGenre.toLowerCase() === genre ||
                itemGenre.toLowerCase().includes(genre) ||
                genre.includes(itemGenre.toLowerCase())
            );
        });
    }

    formatDateTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        // Format: e.g., "Jul 15, 2025 3:17 PM"
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    sortItems(items, sortBy, field = 'name') {
        if (!items || items.length === 0) return items;
        
        return items.slice().sort((a, b) => {
            const aValue = (a[field] || '').toString().toLowerCase();
            const bValue = (b[field] || '').toString().toLowerCase();
            
            if (sortBy === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    }



    closeModal() {
        // Remove the modal from the DOM
        const modal = document.querySelector('.media-library-modal');
        if (modal) modal.remove();
    }

    // --- FAVORITES LOGIC ---
    
    // Initialize favorites localStorage if it doesn't exist
    initializeFavoritesStorage() {
        const favs = localStorage.getItem('mediaLibraryFavoritesByType');
        if (!favs) {
            const initialFavs = { movies: [], tvshows: [] };
            localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(initialFavs));
            console.log('[DEBUG - FAVORITES] Initialized favorites localStorage');
        }
    }
    
    // Backup favorites to localStorage
    backupFavorites() {
        const favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        const backup = {
            timestamp: new Date().toISOString(),
            data: favs
        };
        localStorage.setItem('mediaLibraryFavoritesBackup', JSON.stringify(backup));
        console.log('[DEBUG - FAVORITES] Backed up favorites to localStorage');
    }
    
    // Restore favorites from backup
    restoreFavorites() {
        const backup = localStorage.getItem('mediaLibraryFavoritesBackup');
        if (backup) {
            try {
                const backupData = JSON.parse(backup);
                localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(backupData.data));
                console.log('[DEBUG - FAVORITES] Restored favorites from backup');
                return true;
            } catch (e) {
                console.error('[DEBUG - FAVORITES] Failed to restore favorites from backup:', e);
                return false;
            }
        }
        return false;
    }
    
    isFavorite(path) {
        // Initialize favorites storage if needed
        this.initializeFavoritesStorage();
        
        let favs;
        try {
            favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        } catch (error) {
            console.error('[DEBUG - FAVORITES] Failed to read from localStorage in isFavorite:', error);
            return false;
        }
        
        const isFav = (favs.movies || []).includes(path) || (favs.tvshows || []).includes(path);
        console.log('[DEBUG - FAVORITES] isFavorite check for path:', path, 'result:', isFav);
        return isFav;
    }
    toggleFavorite(path, type) {
        console.log('[DEBUG - FAVORITES] toggleFavorite called with path:', path, 'type:', type);
        
        // Initialize favorites storage if needed
        this.initializeFavoritesStorage();
        
        let favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        if (!favs.movies) favs.movies = [];
        if (!favs.tvshows) favs.tvshows = [];
        
        const list = (type === 'tv' || type === 'tvshow' || type === 'tvshows') ? favs.tvshows : favs.movies;
        
        if (list.includes(path)) {
            // Remove from favorites
            favs.movies = favs.movies.filter(p => p !== path);
            favs.tvshows = favs.tvshows.filter(p => p !== path);
            console.log('[DEBUG - FAVORITES] Removed from favorites:', path);
        } else {
            // Add to favorites
            if (type === 'tv' || type === 'tvshow' || type === 'tvshows') {
                favs.tvshows.push(path);
                console.log('[DEBUG - FAVORITES] Added TV show to favorites:', path);
            } else {
                favs.movies.push(path);
                console.log('[DEBUG - FAVORITES] Added movie to favorites:', path);
            }
        }
        
        localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(favs));
        console.log('[DEBUG - FAVORITES] Saved to localStorage');
        
        // Update heart icons immediately
        setTimeout(() => {
            this.updateHeartIcons();
        }, 50);
        
        // If on favorites tab, refresh the content
        if (this.currentTab === 'favorites') {
            this.updateModalContent();
        }
    }
    getFavoritesList() {
        // SIMPLE: Just return localStorage data
        let favs;
        try {
            favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        } catch (error) {
            console.error('[DEBUG - FAVORITES] Failed to read from localStorage:', error);
            favs = { movies: [], tvshows: [] };
        }
        
        return {
            movies: favs.movies || [],
            tvshows: favs.tvshows || [],
        };
    }

    // --- COLLECTIONS LOGIC ---
    getCollections() {
        return JSON.parse(localStorage.getItem('mediaLibraryCollections') || '{}');
    }
    saveCollections(collections) {
        localStorage.setItem('mediaLibraryCollections', JSON.stringify(collections));
    }
    showAddToCollectionModal(movie) {
        // Remove any existing modal
        const existing = document.getElementById('addToCollectionModal');
        if (existing) existing.remove();
        // Modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'addToCollectionModal';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.25);z-index:99999;display:flex;align-items:center;justify-content:center;';
        // Modal box
        const modal = document.createElement('div');
        modal.style.cssText = 'background:#fff;padding:28px 28px 20px 28px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.18);min-width:320px;max-width:90vw;position:relative;';
        modal.innerHTML = `
            <h3 style="margin-top:0;margin-bottom:18px;font-size:1.2em;">Add to Collection</h3>
            <label style="font-size:1em;">Choose collection:</label><br>
            <select id="collectionDropdown" style="width:100%;margin:8px 0 12px 0;padding:6px 8px;font-size:1em;">
                <option value="">-- Select --</option>
            </select>
            <div style="margin:10px 0 8px 0;text-align:center;color:#888;">or</div>
            <input id="newCollectionInput" type="text" placeholder="New collection name" style="width:100%;padding:6px 8px;font-size:1em;margin-bottom:16px;">
            <div style="display:flex;justify-content:flex-end;gap:12px;">
                <button id="cancelCollectionBtn" style="padding:7px 18px;border-radius:6px;background:#eee;color:#333;border:none;cursor:pointer;font-size:1em;">Cancel</button>
                <button id="addCollectionBtn" style="padding:7px 18px;border-radius:6px;background:#1976d2;color:#fff;border:none;cursor:pointer;font-size:1em;">Add</button>
            </div>
            <button id="closeCollectionModal" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.3em;cursor:pointer;color:#888;">&times;</button>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        // Populate dropdown
        const collections = this.getCollections();
        const dropdown = modal.querySelector('#collectionDropdown');
        Object.keys(collections).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            dropdown.appendChild(opt);
        });
        // Close modal logic
        const closeModal = () => { overlay.remove(); };
        modal.querySelector('#closeCollectionModal').onclick = closeModal;
        modal.querySelector('#cancelCollectionBtn').onclick = closeModal;
        overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
        // Add logic
        modal.querySelector('#addCollectionBtn').onclick = () => {
            let collectionName = dropdown.value.trim();
            const newName = modal.querySelector('#newCollectionInput').value.trim();
            if (newName) collectionName = newName;
            if (!collectionName) {
                alert('Please select or enter a collection name.');
                return;
            }
            // Save to localStorage
            const collections = this.getCollections();
            if (!collections[collectionName]) collections[collectionName] = [];
            if (collections[collectionName].includes(movie.path)) {
                this.showToast('Already in this collection!');
                closeModal();
                return;
            }
            collections[collectionName].push(movie.path);
            this.saveCollections(collections);
            this.showToast(`Added to "${collectionName}"!`);
            closeModal();
        };
    }

    // --- COLLECTIONS TAB RENDERING ---
    renderCollectionsTab() {
        try {
            const collections = this.getCollections();
            const names = Object.keys(collections);
            
        // If viewing a specific collection, show its movies
        if (this.currentCollectionView) {
            const moviePaths = collections[this.currentCollectionView] || [];
                const normalize = p => (p || '').replace(/\\/g, '/').toLowerCase();
                const normalizedMoviePaths = moviePaths.map(normalize);
                const movies = this.mediaLibrary.filter(item => normalizedMoviePaths.includes(normalize(item.path)));
                
                // Header with back and delete
                const headerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 12px 18px 12px 0; border-bottom: 1px solid #eee; background: #fafbfc; border-radius: 10px 10px 0 0;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <button id="backToCollectionsBtn" style="padding:6px 16px;border-radius:6px;background:#eee;color:#333;border:none;cursor:pointer;font-size:1em;">← Back</button>
                <h3 style="margin:0;font-size:1.2em;">${this.currentCollectionView}</h3>
              </div>
              <button id="deleteCollectionBtn" style="padding:6px 16px;border-radius:6px;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:1em;">Delete Collection</button>
                    </div>
                `;

            // Movie grid
                const movieGridHTML = `
                    <div class="media-library-movie-grid">
                        ${movies.map(item => `
                    <div class="media-library-movie-card" data-path="${(item.path || '').replace(/\\/g, '/').toLowerCase().trim()}" data-show-name="${item.title || item.name || ''}" style="position:relative;">
                                <div class="media-card-actions-movies" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
                        <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                        <button class="favorite-btn" title="Toggle Favorite" style="background:none;border:none;cursor:pointer;font-size:1.5em;line-height:1;">${this.isFavorite(item.path) ? '❤️' : '🤍'}</button>
                        <button class="collection-btn" title="Add to Collection" style="background:none;border:none;cursor:pointer;font-size:1.4em;line-height:1;">➕</button>
                      </div>
                      <div class="media-library-card-poster" style="position:relative;">
                        <img src="${this.getPosterPath(item)}" alt="${item.title}" style="margin-top:6px;">
                      </div>
                      <div class="media-library-card-info">
                        <h3>${this.cleanMovieTitle(item.title)}</h3>
                      </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                
                return headerHTML + movieGridHTML;
            }
            
            // Show collections list if not viewing a specific collection
            if (names.length === 0) {
                return '<div style="padding:40px;text-align:center;color:#888;font-size:1.1em;">No collections yet.<br>Add movies to a collection using the ➕ icon.</div>';
            }
            
            const collectionsListHTML = `
                <div style="display:flex;flex-wrap:wrap;gap:24px;padding:24px 0;">
                    ${names.map(name => `
                        <button class="collection-btn" data-collection="${name}" style="padding:28px 36px;border-radius:12px;background:#f5f5f5;color:#1976d2;font-size:1.1em;font-weight:bold;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:background 0.2s;">
                            ${name}
                        </button>
                    `).join('')}
                </div>
            `;
            
            return collectionsListHTML;
        } catch (e) {
            console.error('[COLLECTIONS FATAL ERROR]', e);
            return '<div style="color:red;font-size:2em;">[COLLECTIONS FATAL ERROR] ' + e.message + '</div>';
        }
    }

    // --- GENRE FILTER LOGIC ---
    getCommonGenres() {
        // You can expand this list as needed
        return [
            'All Genres',
            'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama',
            'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance',
            'Sci-Fi', 'Science Fiction', 'Thriller', 'War', 'Western'
        ];
    }

    getTVShowGenres() {
        // TV show specific genres
        return [
            'All Genres',
            'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama',
            'Family', 'Fantasy', 'Horror', 'Mystery', 'Reality', 'Romance', 'Sci-Fi', 
            'Science Fiction', 'Thriller', 'War'
        ];
    }
    getMovieGenres(movie) {
        // Try to get genres from normalized genre file using normalizedKey
        if (movie.normalizedKey && this.movieGenres && this.movieGenres[movie.normalizedKey]) {
            return this.movieGenres[movie.normalizedKey].map(g => g.toLowerCase());
        }
        // Fallbacks as before
        if (Array.isArray(movie.genre)) return movie.genre.map(g => g.toLowerCase());
        if (Array.isArray(movie.genres)) return movie.genres.map(g => g.toLowerCase());
        if (typeof movie.genre === 'string') return movie.genre.toLowerCase().split(/[,/]/).map(g => g.trim());
        if (typeof movie.genres === 'string') return movie.genres.toLowerCase().split(/[,/]/).map(g => g.trim());
        // Fallback: try to guess from title
        const title = (movie.title || '').toLowerCase();
        const genres = this.getCommonGenres().slice(1).map(g => g.toLowerCase());
        return genres.filter(g => title.includes(g));
    }

    selectedGenre = 'All Genres';
    handleGenreChange(event) {
        this.selectedGenre = event.target.value;
        
        // Use appropriate rendering method based on current tab
        if (this.currentTab === 'tvshows') {
            // For TV shows, use updateModalContent to properly re-render
            this.updateModalContent();
        } else {
            // For movies and other tabs, use renderMediaGrid
            this.renderMediaGrid();
        }
        
        this.updateCount();
    }

    async showMovieDetailsModal(movie) {
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        try {
        let movieDescriptions = {};
        try {
                const response = await fetch('/components/MediaLibrary/data/movies/movie_descriptions_normalized.json');
            if (response.ok) {
                movieDescriptions = await response.json();
            }
        } catch (error) {
            console.log('Could not load movie descriptions:', error);
        }
        // --- DEBUG LOGGING ---
        console.log('[DETAILS DEBUG] Movie object:', movie);
        // Poster, genres, etc. as before
        const poster = `<img src="${this.getPosterPath(movie)}" alt="${movie.title}" style="width:180px;max-width:40vw;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.12);">`;
        const genres = (movie.genre || movie.genres || []).toString();
        const year = movie.year || (movie.releaseDate ? ('' + movie.releaseDate).slice(0,4) : '');
            let desc = '';
            if (!window.normalizeKey) {
                console.error('[MOVIE DETAILS] NormalizationService not loaded - this should not happen!');
                return;
            }
            let folderName = movie.path ? movie.path.split(/[\\/]/).pop() : '';
            let dotKey = window.normalizeKey(folderName);
            if (movieDescriptions[dotKey] && movieDescriptions[dotKey].description) {
                desc = movieDescriptions[dotKey].description;
                console.log('[DETAILS DEBUG] Found description with dot notation key:', dotKey);
            } else {
                console.log('[DETAILS DEBUG] No description found for dot notation key:', dotKey);
        }
        // --- ACTOR IMAGES ROW ---
        let castRow = '';
            this.movieCast = null;
        const movieCast = await this.loadMovieCast();
        let castData = null;
            if (movieCast[dotKey] && Array.isArray(movieCast[dotKey].cast) && movieCast[dotKey].cast.length > 0) {
                castData = movieCast[dotKey].cast;
                console.log('[DETAILS DEBUG] Found cast with dot notation key:', dotKey);
            } else {
                console.log('[DETAILS DEBUG] No cast found for dot notation key:', dotKey);
            }
            let cast = '';
            if (castData && Array.isArray(castData) && castData.length > 0) {
                // Render cast as round images with names
                cast = `<div class="media-library-details-cast-row" style="display:flex;gap:18px;overflow-x:auto;margin:18px 0 8px 0;">` +
                    castData.map(actor => `
                        <div class="media-library-cast-member" style="display:flex;flex-direction:column;align-items:center;min-width:72px;max-width:90px;">
                            <div class="media-library-cast-img-wrapper" style="width:64px;height:64px;overflow:hidden;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
                                <img src="${actor.profile ? actor.profile : '/assets/img/user-default.png'}" alt="${actor.name}" style="width:64px;height:64px;object-fit:cover;border-radius:50%;background:#fff;" onerror="this.src='/assets/img/user-default.png'">
                        </div>
                            <div class="media-library-cast-name" style="font-size:13px;margin-top:6px;text-align:center;white-space:normal;word-break:break-word;">${actor.name}</div>
                    </div>
                    `).join('') +
                    `</div>`;
        }
        grid.innerHTML = `
            <div class="media-library-details-modal">
                <div class="media-library-details-poster">${poster}</div>
                <div class="media-library-details-content">
                    <button id="backToGridBtn" class="media-library-details-back">← Back</button>
                    <h2 class="media-library-details-title">${this.cleanMovieTitle(movie.title)}</h2>
                    <div class="media-library-details-meta">${year ? year + ' • ' : ''}${genres}</div>
                    <div class="media-library-details-description">${desc ? desc : '<span class="no-description">No description available.</span>'}</div>
                    <div class="media-library-details-buttons">
                        <button id="playMovieBtn" class="media-library-details-play">▶ Play</button>
                        <button id="detailsFavoriteBtn" title="Toggle Favorite" class="media-library-details-favorite">${this.isFavorite(movie.path) ? '❤️' : '🤍'}</button>
                        <button id="detailsCollectionBtn" title="Add to Collection" class="media-library-details-collection">➕</button>
                    </div>
                        ${cast ? `<div class="media-library-details-cast-list"><b>Cast:</b>${cast}</div>` : ''}
                </div>
            </div>
        `;
        document.getElementById('backToGridBtn').onclick = () => this.renderMediaGrid();
        document.getElementById('playMovieBtn').onclick = () => {
            this.closeModal();
            this.playMedia(movie);
        };
        document.getElementById('detailsFavoriteBtn').onclick = async (e) => {
            e.stopPropagation();
            const type = (movie.type && movie.type.toLowerCase().includes('tv')) ? 'tv' : 'movie';
            this.toggleFavorite(movie.path, type);
            await this.showMovieDetailsModal(movie); // Re-render to update icon
        };
        document.getElementById('detailsCollectionBtn').onclick = (e) => {
            e.stopPropagation();
            this.showAddToCollectionModal(movie);
        };
        } catch (err) {
            console.error('[DETAILS MODAL ERROR]', err);
            grid.innerHTML = `<div class='media-library-details-modal-error'>An error occurred loading details. Check the console for more info.</div>`;
        }
    }

    // --- TV SHOW NAVIGATION ---
    currentTVShow = null;
    currentTVSeason = null;

    // --- TV SHOW STRUCTURE ---
    getTVShows() {
        // Returns array of main TV show objects from the array structure
        const tvShows = [];
        
        if (this.tvShowsData) {
            // Handle array format (current format)
            if (Array.isArray(this.tvShowsData)) {
                this.tvShowsData.forEach(show => {
                    // Only include main show entries, not season/episode entries
                    const path = show.path || '';
                    
                    // Skip entries that are season folders (contain backslashes and season patterns)
                    if (path.includes('\\') && (path.includes('S01') || path.includes('S02') || path.includes('S03') || path.includes('S04') || path.includes('Season'))) {
                        return; // Skip this entry
                    }
                    
                    // Check if this is a TV show by looking for seasons or folders
                    const hasSeasons = show.seasons && Array.isArray(show.seasons);
                    const hasFolders = show.folders && Array.isArray(show.folders);
                    const hasFiles = show.files && Array.isArray(show.files);
                    
                    // Consider it a TV show if it has seasons, folders with season-like names, or files with episode patterns
                    const isTVShow = hasSeasons || hasFolders || hasFiles;
                    
                    const name = show.title || show.name || show.path || '';
                    if (name && isTVShow) {
                        tvShows.push({
                            name,
                            path: show.path || name,
                            normalizedKey: show.normalizedKey,
                            TMDBTitle: show.TMDBTitle, // Include TMDBTitle field
                            data: show
                        });
                    }
                });
            } else if (typeof this.tvShowsData === 'object' && !Array.isArray(this.tvShowsData)) {
                // Object format support (future format)
                Object.keys(this.tvShowsData).forEach(key => {
                    const show = this.tvShowsData[key];
                    if (show && show.title) {
                        tvShows.push({
                            name: show.title,
                            path: show.path || show.title,
                            data: show,
                            normalizedKey: key,
                            TMDBTitle: show.TMDBTitle // Include TMDBTitle field
                        });
                    }
                });
            }
        }
        
        return tvShows;
    }

    extractShowName(path) {
        // Handles both 'TV-SHOWS/Show Name' and just 'Show Name' formats
        if (!path || typeof path !== 'string') return 'Unknown Show';
        const parts = path.split(/[\/]/).filter(Boolean);
        // Try to find after TV-SHOWS
        const tvShowsIndex = parts.findIndex(part => 
            part.toLowerCase() === 'tv-shows' || part.toLowerCase() === 'tv_shows'
        );
        if (tvShowsIndex !== -1 && tvShowsIndex + 1 < parts.length) {
            return parts[tvShowsIndex + 1];
        }
        // Otherwise, just use the last part (should be the show name)
        return parts[parts.length - 1] || 'Unknown Show';
    }

    getSeasonsForShow(showOrPath) {
        // Accepts either a show object or a show path
        let show = null;
        if (typeof showOrPath === 'object' && showOrPath && showOrPath.data) {
            show = showOrPath.data;
        } else if (typeof showOrPath === 'object' && showOrPath) {
            show = showOrPath;
        } else {
            show = this.findShowByPath(showOrPath);
        }

        if (!show) {
            console.log('[SEASON DEBUG] No show found for:', showOrPath);
            return [];
        }

        // Get show name for JSON lookup
        let showName = '';
        if (show.title) {
            showName = show.title;
        } else if (show.name) {
            showName = show.name;
        } else if (show.path) {
            showName = this.extractShowName(show.path);
        }

        // DEBUG: Log the show name being used
        console.log('[DEBUG - SEASON] Show name for JSON lookup:', showName);
        console.log('[DEBUG - SEASON] Show object keys:', Object.keys(show));
        if (show.data) {
            console.log('[DEBUG - SEASON] Show.data keys:', Object.keys(show.data));
            console.log('[DEBUG - SEASON] Show.data.name:', show.data.name);
        }
        if (show.TMDBTitle) {
            console.log('[DEBUG - SEASON] Show has TMDBTitle:', show.TMDBTitle);
        }

        // Check for seasons in the show object first (Media Manager format)
        if (show.seasons && Array.isArray(show.seasons)) {
            console.log('[DEBUG - SEASON] Found seasons in show object (Media Manager format)');
            const seasons = show.seasons.map(season => ({
                seasonNumber: season.seasonNumber,
                path: `Season ${season.seasonNumber.toString().padStart(2, '0')}`,
                episodes: season.episodes || {},
                poster: null // Will be loaded from seasonEpisodeImages
            }));
            return seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
        }

        // Check for seasons in JSON data (from TMDB)
        console.log('[DEBUG - SEASON] seasonEpisodeImages available:', !!this.seasonEpisodeImages);
        if (this.seasonEpisodeImages) {
            console.log('[DEBUG - SEASON] seasonEpisodeImages keys:', Object.keys(this.seasonEpisodeImages));
            console.log('[DEBUG - SEASON] Looking for Cosmos keys:', Object.keys(this.seasonEpisodeImages).filter(key => key.includes('Cosmos')));
        }
        if (showName && this.seasonEpisodeImages) {
            // Use standardized normalization service
            if (!window.getInternalKey) {
                console.error('[SEASON LOOKUP] NormalizationService not loaded - this should not happen!');
                return [];
            }
            
            // Extract year from showName if present
            const yearMatch = showName.match(/\((\d{4})\)/);
            const year = yearMatch ? yearMatch[1] : null;
            
            // Create standardized key using our normalization service
            const standardizedKey = window.getInternalKey(showName, year);
            console.log('[DEBUG - SEASON] Generated standardized key:', standardizedKey, 'for showName:', showName, 'year:', year);
            
            // Try multiple key formats to match the saved data (for backward compatibility)
            const possibleKeys = [
                standardizedKey,  // Our new standardized key
                showName.toLowerCase().replace(/\s*&\s*/g, '.and.').replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.\[\]()]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, ''),  // Simple lowercase
                showName.replace(/\s*&\s*/g, '.&.').replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.&.\[\]()]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, ''),  // Old format for compatibility
                // Add year variations for backward compatibility
                standardizedKey.replace(/\((\d{4})\)/, ''),
                showName.toLowerCase().replace(/\s*&\s*/g, '.and.').replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.\[\]()]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '').replace(/\((\d{4})\)/, ''),
                showName.replace(/\s*&\s*/g, '.&.').replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.&.\[\]()]/g, '').replace(/\.+/g, '.').replace(/^\.|\.$/g, '').replace(/\((\d{4})\)/, '')
            ];

            // DEBUG: Log the possible keys being tried
            console.log('[DEBUG - SEASON] Possible keys for', showName, ':', possibleKeys);
            console.log('[DEBUG - SEASON] Available keys in seasonEpisodeImages:', Object.keys(this.seasonEpisodeImages));
            console.log('[DEBUG - SEASON] Show name being processed:', showName);
            console.log('[DEBUG - SEASON] Show object:', show);

            for (const key of possibleKeys) {
                if (this.seasonEpisodeImages[key] && this.seasonEpisodeImages[key].seasons) {
                    console.log('[DEBUG - SEASON] Found seasons in JSON data for key:', key);
                    const seasons = [];
                    for (const seasonNum in this.seasonEpisodeImages[key].seasons) {
                        const seasonData = this.seasonEpisodeImages[key].seasons[seasonNum];
                        const episodeCount = seasonData.episodes ? Object.keys(seasonData.episodes).length : 0;
                        seasons.push({
                            seasonNumber: parseInt(seasonNum, 10),
                            path: `Season ${seasonNum.padStart(2, '0')}`,
                            episodes: seasonData.episodes || {},
                            poster: seasonData.poster || null
                        });
                    }
                    return seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
                }
            }
            
            // DEBUG: Log if no match was found
            console.log('[DEBUG - SEASON] No JSON data found for any of the possible keys');
        }

        // Handle flat array structure where seasons are directly in the show object
        // BUT only if we don't have JSON data (prioritize JSON data over file system)
        if (show.seasons && Array.isArray(show.seasons) && show.seasons.length > 0) {
            console.log('[DEBUG - SEASON] Found seasons array with', show.seasons.length, 'seasons');
            
            // Handle new format: array of season names like ["Season 01", "Season 02"]
            if (typeof show.seasons[0] === 'string') {
                console.log('[DEBUG - SEASON] Processing string-based seasons array');
                return show.seasons.map(seasonName => {
                    // Extract season number from "Season XX" format
                    const match = seasonName.match(/season\s*(\d+)/i);
                    const seasonNumber = match ? parseInt(match[1], 10) : 0;
                    return {
                        seasonNumber: seasonNumber,
                        path: seasonName,
                        episodes: [] // Will be populated by getEpisodesForSeason
                    };
                }).sort((a, b) => a.seasonNumber - b.seasonNumber);
            }
            
            // Handle old format: array of season objects with seasonNumber
            const seen = new Set();
            const uniqueSeasons = [];
            for (const season of show.seasons) {
                if (!season || season.seasonNumber == null) continue;
                const key = String(season.seasonNumber);
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueSeasons.push(season);
                }
            }
            return uniqueSeasons.map(season => ({
                seasonNumber: season.seasonNumber,
                path: `Season ${season.seasonNumber.toString().padStart(2, '0')}`,
                episodes: season.episodes || []
            })).sort((a, b) => a.seasonNumber - b.seasonNumber);
        }

        // Fallback to folder-based detection for legacy support
        if (show.folders && Array.isArray(show.folders)) {
            function findSeasons(folders, parentPath, showPath) {
                let seasons = [];
                if (!Array.isArray(folders)) return seasons;
                for (const folder of folders) {
                    const name = (folder.name || folder.path.split(/[\\/]/).pop() || '').toLowerCase();
                    console.log('[SEASON DETECTION DEBUG] Checking folder name:', name);
                    if (/^(season[ _-]?\d+|s\d+|series[ _-]?\d+)$/i.test(name) ||
                        /season[ _-]?\d+/i.test(name) ||
                        /^s\d+/i.test(name) ||
                        /series[ _-]?\d+/i.test(name) ||
                        /^season\d+$/i.test(name) ||
                        /^s\d+$/i.test(name)) {
                        let fullPath = folder.path;
                        if (showPath && fullPath && !fullPath.startsWith(showPath)) {
                            fullPath = showPath.replace(/\/+$/, '') + '/' + fullPath.replace(/^\/+/, '');
                        }
                        fullPath = fullPath.replace(/\\/g, '/');
                        console.log('[SEASON DETECTION DEBUG] Computed fullPath for season:', fullPath);
                        seasons.push({ ...folder, path: fullPath });
                    }
                    if (Array.isArray(folder.folders) && folder.folders.length > 0) {
                        seasons = seasons.concat(findSeasons(folder.folders, folder.path, showPath));
                    }
                }
                return seasons;
            }

            function dedupeSeasons(seasons) {
                const seen = new Set();
                return seasons.filter(folder => {
                    const name = (folder.name || folder.path.split(/[\\/]/).pop() || '').toLowerCase();
                    const match = name.match(/season[ _-]?(\d+)/i) || name.match(/^s(\d+)/i) || name.match(/series[ _-]?(\d+)/i);
                    if (match) {
                        const seasonNum = match[1].padStart(2, '0');
                        if (seen.has(seasonNum)) return false;
                        seen.add(seasonNum);
                        return true;
                    }
                    return false;
                });
            }

            const allSeasons = findSeasons(show.folders, show.path, show.path);
            console.log('[SEASON DETECTION DEBUG] All detected season folders:', allSeasons.map(f => f.name || f.path));
            return dedupeSeasons(allSeasons).sort((a, b) => {
                const getNum = s => {
                    const m = (s.name || s.path).match(/season[ _-]?(\d+)/i) || (s.name || s.path).match(/^s(\d+)/i);
                    return m ? parseInt(m[1], 10) : 0;
                };
                return getNum(a) - getNum(b);
            });
        }

        return [];
    }

    getEpisodesForSeason(showPath, seasonPath) {
        if (!showPath || !seasonPath) return [];
        
        let show = null;
        console.log('[EPISODE DEBUG] getEpisodesForSeason called with showPath:', showPath, 'seasonPath:', seasonPath);
        
        if (typeof showPath === 'object' && showPath && showPath.data) {
            show = showPath.data;
        } else if (typeof showPath === 'object' && showPath) {
            show = showPath;
        } else {
            show = this.findShowByPath(showPath);
        }
        
        console.log('[EPISODE DEBUG] show object:', show);
        
        if (!show) {
            console.log('[EPISODE DEBUG] show is null or undefined');
            return [];
        }

        // Handle the normalized TV shows format with folders structure
        if (show.folders && Array.isArray(show.folders) && show.folders.length > 0) {
            console.log('[EPISODE DEBUG] Found folders array with', show.folders.length, 'folders');
            
            // Find the season folder that matches the seasonPath
            const seasonFolder = show.folders.find(folder => {
                const folderPath = folder.path || '';
                const normalizedFolderPath = folderPath.replace(/\\/g, '/');
                const normalizedSeasonPath = seasonPath.replace(/\\/g, '/');
                
                console.log('[EPISODE DEBUG] Comparing folder path:', normalizedFolderPath, 'with season path:', normalizedSeasonPath);
                
                // Extract season number from seasonPath (e.g., "Season 01" -> "01", "S01" -> "01")
                const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i) || seasonPath.match(/^s(\d+)/i);
                const seasonNumber = seasonMatch ? seasonMatch[1] : null;
                
                // Extract season number from folder path (e.g., "S01" -> "01")
                const folderMatch = folderPath.match(/s(\d+)/i);
                const folderSeasonNumber = folderMatch ? folderMatch[1] : null;
                
                console.log('[EPISODE DEBUG] Season numbers - seasonPath:', seasonNumber, 'folderPath:', folderSeasonNumber);
                
                // Try multiple matching strategies
                return (seasonNumber && folderSeasonNumber && seasonNumber === folderSeasonNumber) ||
                       normalizedFolderPath.includes(normalizedSeasonPath) || 
                       normalizedSeasonPath.includes(normalizedFolderPath) ||
                       folderPath === seasonPath ||
                       folderPath.endsWith(seasonPath) ||
                       seasonPath.endsWith(folderPath.split(/[\\/]/).pop());
            });
            
            if (!seasonFolder) {
                console.log('[EPISODE DEBUG] Season folder not found for path:', seasonPath);
                console.log('[EPISODE DEBUG] Available folders:', show.folders.map(f => f.path));
                return [];
            }
            
            console.log('[EPISODE DEBUG] Found season folder:', seasonFolder.path);
            console.log('[EPISODE DEBUG] Season folder has', seasonFolder.files?.length || 0, 'files');
            
            if (!seasonFolder.files || seasonFolder.files.length === 0) {
                console.log('[EPISODE DEBUG] No files found in season folder');
                return [];
            }
            
            // Convert files to episode objects
            let episodes = seasonFolder.files.map(file => ({
                name: file.name || file.filename,
                filename: file.filename || file.name,
                path: file.relPath,
                relPath: file.relPath,
                filePath: file.filePath,
                absPath: file.absPath
            }));
            
            // Sort by episode number (S01E01, S01E02, ...)
            episodes.sort((a, b) => {
                const aMatch = (a.name || a.filename || '').match(/E(\d{1,2})/i);
                const bMatch = (b.name || b.filename || '').match(/E(\d{1,2})/i);
                if (!aMatch && !bMatch) return 0;
                if (!aMatch) return 1;
                if (!bMatch) return -1;
                const aNum = parseInt(aMatch[1], 10);
                const bNum = parseInt(bMatch[1], 10);
                return aNum - bNum;
            });
            
            console.log('[EPISODE DEBUG] Returning', episodes.length, 'episodes');
            return episodes;
        }
        
        // Handle old seasons array format (fallback)
        if (show.seasons && Array.isArray(show.seasons) && show.seasons.length > 0) {
            console.log('[EPISODE DEBUG] Found seasons array with', show.seasons.length, 'seasons');
            
            // Handle new format: array of season objects with episodes
            if (show.seasons[0] && typeof show.seasons[0] === 'object' && show.seasons[0].episodes) {
                console.log('[EPISODE DEBUG] Processing new format with season objects containing episodes');
                // Extract season number from seasonPath (e.g., "Season 01" -> 1)
                const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i) || seasonPath.match(/^s(\d+)/i);
                if (!seasonMatch) {
                    console.log('[EPISODE DEBUG] Could not extract season number from:', seasonPath);
                    return [];
                }
                const seasonNumber = parseInt(seasonMatch[1], 10);
                console.log('[EPISODE DEBUG] Looking for season number:', seasonNumber);
                
                // Find season by seasonNumber
                const season = show.seasons.find(s => s.seasonNumber === seasonNumber);
                if (!season) {
                    console.log('[EPISODE DEBUG] Season not found for season number:', seasonNumber);
                    console.log('[EPISODE DEBUG] Available seasons:', show.seasons.map(s => s.seasonNumber));
                    return [];
                }
                
                console.log('[EPISODE DEBUG] Found season with', season.episodes?.length || 0, 'episodes');
                let episodes = (season.episodes || []).map(ep => {
                    if (!ep.filePath) {
                        ep.filePath = ep.absPath || ep.path || ep.relPath;
                        if (!ep.filePath) {
                            // Try to construct from season path and episode name/filename
                            const seasonFolderPath = season.path || season.relPath || '';
                            const epName = ep.name || ep.filename || '';
                            if (seasonFolderPath && epName) {
                                ep.filePath = seasonFolderPath.replace(/\\/g, '/') + '/' + epName;
                            } else if (epName) {
                                ep.filePath = epName;
                            } else {
                                ep.filePath = '';
                            }
                        }
                    }
                    return ep;
                });
                
                // Sort by episode number (S01E01, S01E02, ...)
                episodes.sort((a, b) => {
                    const aMatch = (a.name || a.filename || '').match(/E(\d{1,2})/i);
                    const bMatch = (b.name || b.filename || '').match(/E(\d{1,2})/i);
                    if (!aMatch && !bMatch) return 0;
                    if (!aMatch) return 1;
                    if (!bMatch) return -1;
                    const aNum = parseInt(aMatch[1], 10);
                    const bNum = parseInt(bMatch[1], 10);
                    return aNum - bNum;
                });
                return episodes;
            }
            
            // Handle old format: array of season objects with seasonNumber
            if (show.seasons[0] && typeof show.seasons[0] === 'object' && show.seasons[0].seasonNumber !== undefined) {
                console.log('[EPISODE DEBUG] Processing old format with seasonNumber');
            // Extract season number from seasonPath (e.g., "Season 01" -> 1)
            const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i) || seasonPath.match(/^s(\d+)/i);
            if (!seasonMatch) {
                console.log('[EPISODE DEBUG] Could not extract season number from:', seasonPath);
                return [];
            }
            const seasonNumber = parseInt(seasonMatch[1], 10);
            console.log('[EPISODE DEBUG] Looking for season number:', seasonNumber);
            const season = show.seasons.find(s => s.seasonNumber === seasonNumber);
            if (!season) {
                console.log('[EPISODE DEBUG] Season not found:', seasonNumber);
                return [];
            }
            console.log('[EPISODE DEBUG] Found season with', season.episodes?.length || 0, 'episodes');
            // PATCH: Ensure every episode has a filePath property
            // --- SORT EPISODES BY EPISODE NUMBER ---
            let episodes = (season.episodes || []).map(ep => {
                if (!ep.filePath) {
                    ep.filePath = ep.absPath || ep.path || ep.relPath;
                    if (!ep.filePath) {
                        // Try to construct from season path and episode name/filename
                        const seasonFolderPath = season.path || season.relPath || '';
                        const epName = ep.name || ep.filename || '';
                        if (seasonFolderPath && epName) {
                            ep.filePath = seasonFolderPath.replace(/\\/g, '/') + '/' + epName;
                        } else if (epName) {
                            ep.filePath = epName;
                        } else {
                            ep.filePath = '';
                        }
                    }
                }
                return ep;
            });
            // Sort by episode number (S01E01, S01E02, ...)
            episodes.sort((a, b) => {
                const aMatch = (a.name || a.filename || '').match(/E(\d{1,2})/i);
                const bMatch = (b.name || b.filename || '').match(/E(\d{1,2})/i);
                if (!aMatch && !bMatch) return 0;
                if (!aMatch) return 1;
                if (!bMatch) return -1;
                const aNum = parseInt(aMatch[1], 10);
                const bNum = parseInt(bMatch[1], 10);
                return aNum - bNum;
            });
            return episodes;
            }
        }

        // Fallback to folder-based detection for legacy support (or if seasons array is missing/empty)
        if (show.folders && Array.isArray(show.folders)) {
            console.log('[EPISODE DEBUG] Using folder-based episode detection');
            
            const normalizedSeasonPath = (seasonPath || '').replace(/\\/g, '/').toLowerCase().trim();
            console.log('[EPISODE DEBUG] Normalized seasonPath:', normalizedSeasonPath);

            function findSeasonFolder(folders, parentPath = '') {
                for (const folder of folders) {
                    let folderPath = (folder.path || '').replace(/\\/g, '/').toLowerCase().trim();
                    console.log('[EPISODE DEBUG] Checking folderPath:', folderPath);
                    if (folderPath === normalizedSeasonPath) {
                        console.log('[EPISODE DEBUG] Found matching season folder:', folderPath);
                        console.log('[EPISODE DEBUG] season.files:', folder.files);
                        return folder;
                    }
                    if (folder.folders && folder.folders.length) {
                        const found = findSeasonFolder(folder.folders, folderPath);
                        if (found) return found;
                    }
                }
                return null;
            }

            const seasonFolder = findSeasonFolder(show.folders);
            if (!seasonFolder) {
                console.log('[EPISODE DEBUG] No matching season folder found for:', normalizedSeasonPath);
                return [];
            }
            if (!Array.isArray(seasonFolder.files)) {
                console.log('[EPISODE DEBUG] seasonFolder.files is not an array:', seasonFolder.files);
                return [];
            }
            
            // Filter for video files (basic check)
            let episodes = seasonFolder.files.filter(f => /\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i.test(f.name));
            
            // Sort episodes by episode number (S01E01, S01E02, etc.)
            episodes.sort((a, b) => {
                const aMatch = (a.name || '').match(/E(\d{1,2})/i);
                const bMatch = (b.name || '').match(/E(\d{1,2})/i);
                
                if (!aMatch && !bMatch) return 0;
                if (!aMatch) return 1;  // Put episodes without numbers at the end
                if (!bMatch) return -1;
                
                const aNum = parseInt(aMatch[1], 10);
                const bNum = parseInt(bMatch[1], 10);
                return aNum - bNum;
            });
            
            console.log('[EPISODE DEBUG] Sorted episodes:', episodes.map(e => e.name));
            // PATCH: Ensure every episode has a filePath property
            return episodes.map(ep => {
                if (!ep.filePath) {
                    ep.filePath = ep.absPath || ep.path || ep.relPath;
                    if (!ep.filePath) {
                        // Try to construct from season folder path and episode name/filename
                        const seasonFolderPath = seasonFolder.path || seasonFolder.relPath || '';
                        const epName = ep.name || ep.filename || '';
                        if (seasonFolderPath && epName) {
                            ep.filePath = seasonFolderPath.replace(/\\/g, '/') + '/' + epName;
                        } else if (epName) {
                            ep.filePath = epName;
                        } else {
                            ep.filePath = '';
                        }
                    }
                }
                return ep;
            });
        }

        return [];
    }

    findShowByPath(showPath) {
        if (!showPath) return null;
        const target = (showPath || '').replace(/\\/g, '/').toLowerCase();
        console.log('[FIND SHOW DEBUG] Searching for showPath:', showPath, 'normalized:', target);
        // 1. Search top-level TV show objects
        const tvShows = this.getTVShows();
        for (const show of tvShows) {
            const showObjPath = (show.path || '').replace(/\\/g, '/').toLowerCase();
            if (showObjPath === target) {
                console.log('[FIND SHOW DEBUG] Found top-level show:', show);
                return show;
            }
        }
        // 2. Optionally, search recursively in folders (legacy/edge cases)
        function recursiveSearch(folders) {
            if (!Array.isArray(folders)) return null;
            for (const folder of folders) {
                const folderPath = (folder.path || '').replace(/\\/g, '/').toLowerCase();
                if (folderPath === target) {
                    console.log('[FIND SHOW DEBUG] Found nested folder:', folder);
                    return folder;
                }
                const found = recursiveSearch(folder.folders);
            if (found) return found;
            }
            return null;
        }
        for (const show of tvShows) {
            const found = recursiveSearch(show.folders);
            if (found) return found;
        }
        console.log('[FIND SHOW DEBUG] No show found for path:', showPath);
        return null;
    }

    cleanEpisodeName(filename) {
        // Clean episode name from filename
        // Remove file extension and common patterns
        let name = filename.replace(/\.[^/.]+$/, ""); // Remove extension
        name = name.replace(/\.(mkv|mp4|avi|mov|wmv)$/i, ""); // Remove video extensions
        name = name.replace(/\.(720p|1080p|480p)/i, ""); // Remove quality indicators
        name = name.replace(/\.(BluRay|WEBRip|HDTV|AMZN|Netflix)/i, ""); // Remove source indicators
        name = name.replace(/\.(x264|x265|HEVC)/i, ""); // Remove codec indicators
        name = name.replace(/\.(DDP5\.1|AAC|AC3)/i, ""); // Remove audio indicators
        name = name.replace(/\.(GalaxyTV|ProLover|d3g|FENiX)/i, ""); // Remove release group names
        name = name.replace(/\[.*?\]/g, ""); // Remove anything in brackets
        name = name.replace(/\(.*?\)/g, ""); // Remove anything in parentheses
        name = name.replace(/\.+/g, " "); // Replace multiple dots with spaces
        name = name.replace(/\s+/g, " ").trim(); // Clean up multiple spaces
        return name;
    }

    getSeasonImage(showName, seasonPath) {
        try {
            if (!this.seasonEpisodeImages) {
                return '/assets/img/placeholder-poster.jpg';
            }
            
            // Use the standardized normalization service
            if (!window.getInternalKey) {
                console.error('[SEASON IMAGE] NormalizationService not loaded - this should not happen!');
                return '/assets/img/placeholder-poster.jpg';
            }
            
            // Extract year from showName if present
            const yearMatch = showName.match(/\((\d{4})\)/);
            const year = yearMatch ? yearMatch[1] : null;
            
            // Create standardized key
            const showKey = window.getInternalKey(showName, year);
            
            console.log('[SEASON IMAGE LOOKUP]', { showName, showKey, year });

            // Extract season number from seasonPath
            const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i);
            if (!seasonMatch) {
                return '/assets/img/placeholder-poster.jpg';
            }
            const seasonNum = String(parseInt(seasonMatch[1], 10));
            
            // Look up using the standardized key
            const showData = this.seasonEpisodeImages[showKey];
            if (showData && showData.seasons && showData.seasons[seasonNum]) {
                const seasonData = showData.seasons[seasonNum];
                if (seasonData.poster) {
                    console.log('[SEASON IMAGE] Found poster for', showName, 'season', seasonNum, 'using key:', showKey);
                    return seasonData.poster;
                }
            }
            
            console.warn('[SEASON IMAGE] No poster found for', showName, 'season', seasonNum, 'using key:', showKey);
            return '/assets/img/placeholder-poster.jpg';
        } catch (error) {
            console.error('[SEASON IMAGE ERROR]', error);
            return '/assets/img/placeholder-poster.jpg';
        }
    }

    getEpisodeImage(showName, seasonName, episode) {
        try {
            if (!this.seasonEpisodeImages) {
                console.warn('[EPISODE IMAGE] seasonEpisodeImages not loaded');
                return '/assets/img/placeholder-poster.jpg';
            }
            
            // Use the standardized normalization service
            if (!window.getInternalKey) {
                console.error('[EPISODE IMAGE] NormalizationService not loaded - this should not happen!');
                return '/assets/img/placeholder-poster.jpg';
            }
            
            // Extract year from showName if present
            const yearMatch = showName.match(/\((\d{4})\)/);
            const year = yearMatch ? yearMatch[1] : null;
            
            // Create standardized key
            const showKey = window.getInternalKey(showName, year);
            // Normalize season number (handle both 'Season 01' and 1)
            let seasonNum = null;
            if (typeof seasonName === 'string') {
                const match = seasonName.match(/season[ _-]?(\d+)/i);
                if (match) seasonNum = String(parseInt(match[1], 10));
            } else if (typeof seasonName === 'number') {
                seasonNum = String(seasonName);
            }
            // Try to get episode number from episode object
            let episodeNum = null;
            if (episode) {
                if (typeof episode.episodeNumber !== 'undefined') {
                    episodeNum = String(parseInt(episode.episodeNumber, 10));
                } else if (episode.name || episode.filename || episode.path) {
                    const epStr = episode.name || episode.filename || episode.path;
                    const match = epStr.match(/E(\d{1,2})/i);
                    if (match) episodeNum = String(parseInt(match[1], 10));
                }
            }
            // Debug log the lookup keys
            console.log('[EPISODE IMAGE LOOKUP]', { showName, showKey, year, seasonNum, episodeNum, episodeName: episode?.name });
            // Lookup
            const showData = this.seasonEpisodeImages[showKey];
            if (!showData) {
                console.warn('[EPISODE IMAGE] No showData for', showKey);
                return '/assets/img/placeholder-poster.jpg';
            }
            const seasonData = showData.seasons && showData.seasons[seasonNum];
            if (!seasonData) {
                console.warn('[EPISODE IMAGE] No seasonData for', showKey, seasonNum);
                return '/assets/img/placeholder-poster.jpg';
            }
            if (!seasonData.episodes) {
                console.warn('[EPISODE IMAGE] No episodes for', showKey, seasonNum);
                return '/assets/img/placeholder-poster.jpg';
            }
            const epData = seasonData.episodes[episodeNum];
            if (!epData || !epData.still) {
                console.warn('[EPISODE IMAGE] No still for', showKey, seasonNum, episodeNum);
                return '/assets/img/placeholder-poster.jpg';
            }
            // If the still path starts with /media/, convert to /assets/ if needed
            let stillPath = epData.still;
            if (stillPath.startsWith('/media/TV-SHOWS/')) {
                // Try to map to /assets/img/ if the file exists there
                const localPath = stillPath.replace('/media/TV-SHOWS/', '/assets/img/');
                // Optionally, check if the file exists (requires async or pre-scan)
                // For now, just use the mapped path
                stillPath = localPath;
            }
            console.log('[EPISODE IMAGE] Found still:', stillPath);
            return stillPath;
        } catch (error) {
            console.error('[EPISODE IMAGE ERROR]', error);
            return '/assets/img/placeholder-poster.jpg';
        }
    }

    // --- TV SHOW UI METHODS ---
    async loadTVShowDetails(showObjOrName) {
        // Accepts either a show object or a show name
        let showName = typeof showObjOrName === 'string' ? showObjOrName : (showObjOrName?.name || showObjOrName?.title || showObjOrName?.path || '');
        let showPath = typeof showObjOrName === 'object' ? (showObjOrName.path || '') : '';
        if (!this.tvShowDescriptions) {
            try {
                const descResp = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_descriptions_normalized.json?ts=' + Date.now());
                this.tvShowDescriptions = descResp.ok ? await descResp.json() : {};
            } catch (e) { this.tvShowDescriptions = {}; }
        }
        if (!this.tvShowCast) {
            try {
                const castResp = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json?ts=' + Date.now());
                this.tvShowCast = castResp.ok ? await castResp.json() : {};
            } catch (e) { this.tvShowCast = {}; }
        }
                // Use the standardized normalization service
        if (!window.getInternalKey) {
            console.error('[TV SHOW DETAILS] NormalizationService not loaded - this should not happen!');
            return { description: '', cast: [] };
        }
        
        // Extract year from showName if present
        const yearMatch = showName.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : null;
        
        // Create standardized key
        const showKey = window.getInternalKey(showName, year);
        
        console.log('[TV SHOW DETAILS LOOKUP]', { showName, showKey, year });
        console.log('[TV SHOW DETAILS] Available keys in tvShowDescriptions:', Object.keys(this.tvShowDescriptions || {}).filter(key => key.includes('lois')));
        console.log('[TV SHOW DETAILS] Available keys in tvShowCast:', Object.keys(this.tvShowCast || {}).filter(key => key.includes('lois')));
        
        // Description lookup using standardized key
        let description = '';
        if (this.tvShowDescriptions[showKey]) {
            description = this.tvShowDescriptions[showKey];
            console.log('[TV SHOW DETAILS] Found description with key:', showKey);
        } else {
            console.warn('[TV SHOW DETAILS] No description found for key:', showKey);
        }
        
        // Cast lookup using standardized key
        let cast = [];
        if (this.tvShowCast[showKey] && Array.isArray(this.tvShowCast[showKey])) {
            cast = this.tvShowCast[showKey];
            console.log('[TV SHOW DETAILS] Found cast with key:', showKey);
        } else {
            console.warn('[TV SHOW DETAILS] No cast found for key:', showKey);
        }
        return {
            description,
            cast
        };
        }

    async renderSeasonsView(showPath) {
        // Handle both show names and paths for showPath
        let show = this.findShowByPath(showPath);
        let showName = showPath;
        
        // If showPath is a path, extract the show name
        if (showPath && showPath.includes('\\')) {
            showName = this.extractShowName(showPath);
        }
        
        // If we couldn't find the show by path, try to find it by title
        if (!show && this.tvShowsData) {
            show = this.tvShowsData.find(tvShow => 
                tvShow.title === showPath || 
                tvShow.name === showPath
            );
            
            // If we found the show by title, use the title as the show name
            if (show && show.title) {
                showName = show.title;
            }
        }
        
        console.log('[DEBUG - RenderSeasonsView] renderSeasonsView for showPath:', showPath);
        console.log('[DEBUG - RenderSeasonsView] renderSeasonsView show:', show);
        console.log('[DEBUG - RenderSeasonsView] typeof show:', typeof show);
        if (show) {
            console.log('[DEBUG - RenderSeasonsView] Object.keys(show):', Object.keys(show));
            if (show.data) {
                console.log('[DEBUG - RenderSeasonsView] show.data:', show.data);
                if (show.data.name) {
                    console.log('[DEBUG - RenderSeasonsView] show.data.name:', show.data.name);
                }
            }
        }
        const seasons = this.getSeasonsForShow(show && show.data ? show.data : show);
        console.log('[DEBUG - RenderSeasonsView] renderSeasonsView seasons:', seasons);
        // Load description and cast
        console.log('[DEBUG - RENDER SEASONS] About to load TV show details for showName:', showName);
        let { description, cast } = await this.loadTVShowDetails(showName);
        console.log('[DEBUG - RENDER SEASONS] Loaded description length:', description ? description.length : 0);
        console.log('[DEBUG - RENDER SEASONS] Loaded cast length:', cast ? cast.length : 0);
        // --- DUMMY PLACEHOLDER CONTENT IF MISSING ---
        if (!description || description.trim() === '' || description.includes('No description')) {
            description = "A quirky group of friends navigate life's ups and downs in this hilarious and heartwarming TV show. Will they find love, solve mysteries, or just order more pizza? Tune in to find out!";
        }
        if (!Array.isArray(cast) || cast.length === 0) {
            cast = [
                { name: 'Jane Doe', image: '/assets/img/placeholder-poster.jpg' },
                { name: 'John Smith', image: '/assets/img/placeholder-poster.jpg' },
                { name: 'Alex Lee', image: '/assets/img/placeholder-poster.jpg' },
                { name: 'Sam Taylor', image: '/assets/img/placeholder-poster.jpg' },
                { name: 'Chris Jordan', image: '/assets/img/placeholder-poster.jpg' }
            ];
        }
        // --- NEW FLEX LAYOUT ---
        // Description to the right of title/season count
        // Cast as a horizontal row under the season images
        let castRow = '';
        if (Array.isArray(cast) && cast.length > 0) {
            castRow = `<div class=\"media-library-cast-horizontal-row\">${cast.map(actor => `
                <div class=\"media-library-cast-card\">
                    <div class=\"media-library-cast-avatar\" style=\"background-image:url('${actor.profile || '/assets/img/placeholder-poster.jpg'}');\"></div>
                    <div class=\"media-library-cast-name\">${actor.name || actor}</div>
                </div>
            `).join('')}</div>`;
        } else if (typeof cast === 'string' && cast) {
            castRow = `<div class=\"media-library-cast-horizontal-row\"><div class=\"media-library-cast-card\">${cast}</div></div>`;
        }
        // --- ARROW NAVIGATION ---
        // Unique class for grid and wrapper
        const gridClass = 'media-library-seasons-grid';
        const wrapperClass = 'media-library-seasons-arrows-wrapper';
        // Only show arrows if more than 5 seasons (adjust as needed)
        const showArrows = seasons.length > 5;
        // --- RENDER HTML ---
        const html = `
            <div class="media-library-breadcrumbs">
                <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV-Shows</span>
                <span class="breadcrumb-separator"> > </span>
                <span>${showName}</span>
            </div>
            <div class="media-library-seasons-main-col">
                <div class="media-library-seasons-header-row">
                                    <div class="media-library-seasons-title">
                    <h2 class="${showName.toLowerCase().includes('lois & clark') || showName.toLowerCase().includes('lois and clark') ? 'media-library-tv-show-title-lois-clark' : 'media-library-tv-show-title'}">${showName}</h2>
                    <p>${seasons.length} ${seasons.length === 1 ? 'Season' : 'Seasons'}</p>
                </div>
                    <div class="media-library-seasons-description">${description}</div>
                </div>
                <div class="${wrapperClass}">
                    ${showArrows ? `<button class="media-library-arrow-btn left" type="button">&#8592;</button>` : ''}
                    <div class="${gridClass}">
                        ${seasons.map(season => {
                            const seasonImage = this.getSeasonImage(showName, season.path);
                            const episodeCount = season.episodes ? Object.keys(season.episodes).length : 0;
                            return `
                                <div class=\"media-library-card season\" onclick=\"mediaLibraryManager.openTVSeason('${season.path.replace(/\\/g, '/')}')\">
                                    <div class=\"media-library-card-poster\">
                                        <img class=\"media-library-poster season\" src=\"${seasonImage}\" alt=\"${season.path.split(/[\\/]/).pop()}\" onerror=\"this.src='/assets/img/placeholder-poster.jpg'\">
                                    </div>
                                    <div class=\"media-library-card-info\">
                                        <h3>${season.path.split(/[\\/]/).pop()}</h3>
                                        <p>${episodeCount} Episode${episodeCount === 1 ? '' : 's'}</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${showArrows ? `<button class=\"media-library-arrow-btn right\" type=\"button\">&#8594;</button>` : ''}
                </div>
                ${castRow}
            </div>
        `;
        // After rendering, attach arrow handlers
        setTimeout(() => { this.attachSeasonArrowHandlers(); }, 0);
        return html;
    }

    openTVShowFromData(element) {
        const showPath = element.getAttribute('data-path');
        const showName = element.getAttribute('data-show-name');
        console.log('[DEBUG - OpenTVShowFromData] openTVShowFromData called with path from data attribute:', showPath);
        console.log('[DEBUG - OpenTVShowFromData] show name from data attribute:', showName);
        
        // For Media Manager entries, use the show name instead of full path for breadcrumb
        if (showName && showPath && showPath.includes('\\MEDIA\\TV-SHOWS\\')) {
            // This is a Media Manager entry, use the show name for display
            this.currentTVShow = showName;
        } else {
            // This is a scan-based entry, use the path
            this.currentTVShow = showPath;
        }
        
        this.currentTVSeason = null;
        this.renderModal(); // Re-render modal to update tab highlight
    }

    openTVShow(showPath) {
        console.log('[DEBUG - OpenTVShow] openTVShow called with:', showPath);
        this.currentTVShow = showPath;
        this.currentTVSeason = null;
        this.renderModal(); // Re-render modal to update tab highlight
    }

    openTVSeason(seasonPath) {
        this.currentTVSeason = seasonPath;
        this.renderModal(); // Re-render modal to update tab highlight
    }

    renderEpisodesView() {
        try {
            // Handle both show names and paths for currentTVShow
            let show = this.findShowByPath(this.currentTVShow);
            let showName = this.currentTVShow;
            
            // If currentTVShow is a path, extract the show name
            if (this.currentTVShow && this.currentTVShow.includes('\\')) {
                showName = this.extractShowName(this.currentTVShow);
            }
            
            // If we couldn't find the show by path, try to find it by title
            if (!show && this.tvShowsData) {
                show = this.tvShowsData.find(tvShow => 
                    tvShow.title === this.currentTVShow || 
                    tvShow.name === this.currentTVShow
                );
            }
            
            const seasonName = this.currentTVSeason.split(/[\/]/).pop();
            
            // Get episodes from the real file system
            let episodes = this.getEpisodesForSeason(show, this.currentTVSeason) || [];
            console.log('[DEBUG] Episodes from getEpisodesForSeason:', episodes.length);
            
            // If no episodes found, let's debug what's happening
            if (episodes.length === 0) {
                console.log('[DEBUG] No episodes found! Debugging...');
                console.log('[DEBUG] show object:', show);
                console.log('[DEBUG] currentTVShow:', this.currentTVShow);
                console.log('[DEBUG] currentTVSeason:', this.currentTVSeason);
                
                // Try to find episodes directly in the TV shows data
                if (this.tvShowsData) {
                    for (const tvShow of this.tvShowsData) {
                        console.log('[DEBUG] Checking TV show:', tvShow.path);
                        if (tvShow.path === this.currentTVShow || tvShow.normalizedKey === this.currentTVShow) {
                            console.log('[DEBUG] Found matching TV show:', tvShow.name);
                            if (tvShow.folders) {
                                for (const folder of tvShow.folders) {
                                    console.log('[DEBUG] Checking folder:', folder.path);
                                    if (folder.path === this.currentTVSeason) {
                                        console.log('[DEBUG] Found matching season folder:', folder.name);
                                        if (folder.files) {
                                            console.log('[DEBUG] Found', folder.files.length, 'files in season');
                                            episodes = folder.files.map(file => ({
                                                name: file.name || file.filename,
                                                filename: file.filename || file.name,
                                                path: file.relPath,
                                                relPath: file.relPath,
                                                filePath: file.filePath,
                                                absPath: file.absPath
                                            }));
                                            console.log('[DEBUG] Created episodes from folder files:', episodes.length);
                                            break;
                                        }
                                    }
                                }
                            }
                            if (episodes.length > 0) break;
                        }
                    }
                }
            }

            console.log('[DEBUG] Final episodes array:', episodes);

            // Only show arrows if more than 4 episodes
            const showArrows = episodes.length > 4;
            const gridClass = 'media-library-episodes-grid' + (episodes.length < 6 ? ' center-episodes' : '');
            const wrapperClass = 'media-library-episodes-arrows-wrapper';

            // Attach handlers after render
            setTimeout(() => this.attachEpisodeArrowHandlers(), 0);

            return `
                <div class="media-library-breadcrumbs">
                    <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV-Shows</span>
                    <span class="breadcrumb-separator"> > </span>
                    <span class="breadcrumb-link" onclick="mediaLibraryManager.backToSeasons()">${showName}</span>
                    <span class="breadcrumb-separator"> > </span>
                    <span>${seasonName}</span>
                </div>
                <div class="media-library-season-info">
                    <h2>${seasonName}</h2>
                    <p>${episodes.length} Episodes</p>
                </div>
                <div class="${wrapperClass}">
                    ${showArrows ? `<button class=\"media-library-arrow-episode-btn left\" type=\"button\">&#8592;</button>` : ''}
                    <div class="${gridClass}">
                        ${episodes.map((episode, index) => {
                            // Use episode image from still property if available, otherwise fallback to getEpisodeImage
                            const episodeImage = episode.still || this.getEpisodeImage(showName, seasonName, episode);
                            // Robust relPath for playback
                            let relPath = ((episode.relPath) ? episode.relPath : (this.currentTVSeason.replace(/\\/g, '/') + '/' + (episode.name || episode.filename || '').replace(/\\/g, '/'))).replace(/\\/g, '/');
                            relPath = relPath.replace(/'/g, "\\'");
                            // Ensure filePath is present and correct
                            if (!episode.filePath) {
                                episode.filePath = episode.absPath || episode.path || episode.relPath || '';
                            }
                            const episodeData = JSON.stringify(episode).replace(/"/g, '&quot;').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
                            const epNum = episode.episodeNumber ? `E${episode.episodeNumber.toString().padStart(2, '0')}` : (() => {
                                            const match = ((episode.name || episode.filename || episode.path) || '').match(/E(\d{1,2})/i);
                                            return match ? `E${match[1].padStart(2, '0')}` : '';
                            })();
                            // For new Media Manager format, extract episode title from filename
                            let epTitle = '';
                            if (episode.filename && episode.filename.includes('\\')) {
                                // This is a full path, extract just the filename
                                const filename = episode.filename.split(/[\\/]/).pop() || '';
                                epTitle = this.extractEpisodeTitle(filename);
                            } else {
                                // This is already just a filename
                                epTitle = this.extractEpisodeTitle(episode.name || episode.filename || episode.path || '');
                            }
                            
                            // All episodes are real video files - show as clickable
                            return `<div class=\"media-library-card episode\" data-episode=\"${episodeData}\" onclick=\"mediaLibraryManager.playEpisodeFromDataAttributeAsync(this)\">`
                                + `<div class=\"media-library-card-poster\">`
                                + `<img src=\"${episodeImage}\" alt=\"${episode.name || episode.filename}\" onerror=\"this.src='/assets/img/placeholder-poster.jpg'\">`
                                + `<div class=\"media-library-play-overlay\">▶</div>`
                                + `</div>`
                                + `<div class=\"media-library-card-info\">`
                                + `<h4 class=\"tv-show-season-episode-name\">${epTitle}</h4>`
                                + `</div>`
                                + `</div>`;
                        }).join('')}
                    </div>
                    ${showArrows ? `<button class=\"media-library-arrow-episode-btn right\" type=\"button\">&#8594;</button>` : ''}
                </div>
            `;
        } catch (e) {
            return `<div style=\"color:red;\">[ERROR] Failed to render episodes: ${e.message}</div>`;
        }
    }

    backToTVShows() {
        this.currentTVShow = null;
        this.currentTVSeason = null;
        this.currentTab = 'tvshows'; // Track current tab for return location
        this.renderModal(); // Re-render modal to update tab highlight
        // Update count after navigating back to main TV-Shows page
        setTimeout(() => this.updateCount(), 0);
    }

    backToSeasons() {
        this.currentTVSeason = null;
        this.renderModal(); // Re-render modal to update tab highlight
    }

        // SINGLE SOURCE OF TRUTH for ALL TV show episode playing
    async playTVShowEpisode(episodePath, startTime = 0, sourceContext = 'unknown') {
        console.log('[DEBUG - SINGLE-SOURCE-TV] playTVShowEpisode called');
        console.log('[DEBUG - SINGLE-SOURCE-TV] episodePath:', episodePath);
        console.log('[DEBUG - SINGLE-SOURCE-TV] startTime:', startTime);
        console.log('[DEBUG - SINGLE-SOURCE-TV] sourceContext:', sourceContext);
        
        // STEP 1: Find the episode object using centralized function
        const episodeObj = this.findEpisodeObjectByPath(episodePath);
        
        console.log('[DEBUG - SINGLE-SOURCE-TV] Episode object found:', episodeObj ? 'YES' : 'NO');
        
        // STEP 2: Process episode object (add year, clean title, etc.)
        if (episodeObj) {
            console.log('[DEBUG - SINGLE-SOURCE-TV] Processing episode object');
            console.log('[DEBUG - SINGLE-SOURCE-TV] - name:', episodeObj.name);
            console.log('[DEBUG - SINGLE-SOURCE-TV] - filename:', episodeObj.filename);
            console.log('[DEBUG - SINGLE-SOURCE-TV] - absPath:', episodeObj.absPath);
            console.log('[DEBUG - SINGLE-SOURCE-TV] - relPath:', episodeObj.relPath);
            console.log('[DEBUG - SINGLE-SOURCE-TV] - filePath:', episodeObj.filePath);
            
            // Add year information to the episode object
            const year = this.getDateForTvShow(episodeObj);
            if (year) {
                console.log('[DEBUG - SINGLE-SOURCE-TV] Adding year to episode object:', year);
                
                // Add year to episode object
                episodeObj.year = year;
                episodeObj.data = episodeObj.data || {};
                episodeObj.data.year = year;
                
                // Add year to title for VideoPlayer to display
                if (episodeObj.title && !episodeObj.title.includes(`(${year})`)) {
                    episodeObj.title = episodeObj.title.replace(/^([^(]+)/, `$1 (${year})`);
                    console.log('[DEBUG - SINGLE-SOURCE-TV] Updated title with year:', episodeObj.title);
                }
                
                console.log('[DEBUG - SINGLE-SOURCE-TV] Added year to episode object and title');
            } else {
                console.log('[DEBUG - SINGLE-SOURCE-TV] No year found for episode');
            }
            
            // Set global current media item
            window.mediaLibraryManager.currentMediaItem = episodeObj;
            window.mediaLibraryManager.currentFile = episodeObj;
        } else {
            console.log('[DEBUG - SINGLE-SOURCE-TV] No episode object found, using basic path object');
            window.mediaLibraryManager.currentMediaItem = { path: episodePath };
            window.mediaLibraryManager.currentFile = { path: episodePath };
        }
        
        // STEP 3: Close modal and prepare video player
        this.closeMediaBrowser();
        await this.waitForVideoPlayerReady();
        
        if (!this.videoPlayer) {
            console.error('[DEBUG - SINGLE-SOURCE-TV] VideoPlayer not available');
            this.showMediaLibraryError('Video player not available. Please try again.');
            return;
        }
        
        // STEP 4: Build video URL
        let videoUrl;
        if (episodeObj && episodeObj.filePath) {
            const filePath = episodeObj.filePath;
            const encodedPath = encodeURIComponent(filePath);
            videoUrl = `/api/video?path=${encodedPath}`;
            console.log('[DEBUG - SINGLE-SOURCE-TV] Using filePath from episodeObj:', filePath);
            console.log('[DEBUG - SINGLE-SOURCE-TV] Full video URL:', videoUrl);
        } else {
            // Fallback: construct path from episodePath
            let normalizedPath = (episodePath || '').replace(/\\/g, '/');
            if (normalizedPath.startsWith('/media/')) {
                normalizedPath = normalizedPath.replace(/^\/media\//, '');
            }
            try {
                normalizedPath = decodeURIComponent(normalizedPath);
            } catch (e) {}
            const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
            videoUrl = `/media/${encodedPath}`;
            console.log('[DEBUG - SINGLE-SOURCE-TV] Using fallback path construction:', normalizedPath);
        }
        
        console.log('[DEBUG - SINGLE-SOURCE-TV] Final video URL:', videoUrl);
        
        // STEP 5: Set return location based on source context
        if (window.videoPlayer) {
            console.log('[DEBUG - SINGLE-SOURCE-TV] Setting return location for source:', sourceContext);
            
            let returnLocation;
            if (sourceContext === 'watchlater') {
                returnLocation = { type: 'watch-later' };
            } else if (sourceContext === 'tvshows') {
                returnLocation = { type: 'tv-show-episodes', showPath: this.currentTVShow, seasonPath: this.currentTVSeason };
            } else {
                returnLocation = { type: 'media-library', tab: 'TV-Shows' };
            }
            
            console.log('[DEBUG - SINGLE-SOURCE-TV] Return location:', returnLocation);
            window.videoPlayer.setReturnLocation(returnLocation);
            
            // STEP 6: Play the video with the episode object
            console.log('[DEBUG - SINGLE-SOURCE-TV] Calling playUrl with episode object');
            window.videoPlayer.playUrl(videoUrl, 'video/mp4', startTime, episodeObj);
        }
    }

    // NEW METHOD: Get episode object from path using the SAME logic as main TV-SHOWS tab
    getEpisodeObjectFromPath(episodePath) {
        console.log('[DEBUG - REAL-METHOD] getEpisodeObjectFromPath called with:', episodePath);
        
        if (!episodePath) {
            console.log('[DEBUG - REAL-METHOD] No episodePath provided');
            return null;
        }
        
        // Parse the path to extract show, season, and episode info
        const pathParts = episodePath.split('/');
        if (pathParts.length < 3) {
            console.log('[DEBUG - REAL-METHOD] Invalid path format:', episodePath);
            return null;
        }
        
        const showPath = pathParts[0]; // e.g., "Bored to Death (2009)"
        const seasonPath = pathParts[0] + '/' + pathParts[1]; // e.g., "Bored to Death (2009)/Season 01"
        const episodeFilename = pathParts[2]; // e.g., "Bored to Death - S01E03 - The Case of the Missing Screenplay.mkv"
        
        console.log('[DEBUG - REAL-METHOD] Parsed path:', { showPath, seasonPath, episodeFilename });
        
        // Use the SAME method as main TV-SHOWS tab
        const show = this.findShowByPath(showPath);
        if (!show) {
            console.log('[DEBUG - REAL-METHOD] Show not found:', showPath);
            return null;
        }
        
        console.log('[DEBUG - REAL-METHOD] Found show:', show.name);
        
        // Get episodes from the SAME method as main TV-SHOWS tab
        let episodes = this.getEpisodesForSeason(show, seasonPath) || [];
        console.log('[DEBUG - REAL-METHOD] Found episodes:', episodes.length);
        
        // Find the specific episode by filename
        const episodeObj = episodes.find(episode => {
            const episodeName = episode.name || episode.filename || '';
            return episodeName.toLowerCase().includes(episodeFilename.toLowerCase()) || 
                   episodeFilename.toLowerCase().includes(episodeName.toLowerCase());
        });
        
        if (episodeObj) {
            console.log('[DEBUG - REAL-METHOD] Found episode object:', episodeObj.name);
            return episodeObj;
        } else {
            console.log('[DEBUG - REAL-METHOD] Episode not found in episodes list');
            return null;
        }
    }

    // CENTRALIZED FUNCTION: Find episode object by path from tvShowsData
    findEpisodeObjectByPath(episodePath) {
        console.log('[DEBUG - CENTRALIZED] findEpisodeObjectByPath called with:', episodePath);
        
        if (!this.tvShowsData || !episodePath) {
            console.log('[DEBUG - CENTRALIZED] No tvShowsData or episodePath available');
            return null;
        }
        
        console.log('[DEBUG - CENTRALIZED] tvShowsData length:', this.tvShowsData.length);
        console.log('[DEBUG - CENTRALIZED] First few shows:', this.tvShowsData.slice(0, 3).map(s => s.name));
        
        // Search through all TV shows and their seasons/episodes
        for (const show of this.tvShowsData) {
            if (show.seasons && Array.isArray(show.seasons)) {
                for (const season of show.seasons) {
                    if (season.episodes && Array.isArray(season.episodes)) {
                        const episodeObj = season.episodes.find(episode => {
                            const normalizePath = (p) => p ? p.replace(/\\/g, '/').toLowerCase().trim() : '';
                            const normalizedEpisodePath = normalizePath(episodePath);
                            const normalizedEpisodePath2 = normalizePath(episode.path);
                            const normalizedEpisodeAbsPath = normalizePath(episode.absPath);
                            const normalizedEpisodeFilePath = normalizePath(episode.filePath);
                            const normalizedEpisodeRelPath = normalizePath(episode.relPath);
                            
                            // Debug logging for first few episodes to see path formats
                            if (show.name === 'Bored to Death' && season.name === 'Season 01' && episode.name && episode.name.includes('S01E03')) {
                                console.log('[DEBUG - PATH-MATCHING] Looking for:', normalizedEpisodePath);
                                console.log('[DEBUG - PATH-MATCHING] Episode paths available:');
                                console.log('[DEBUG - PATH-MATCHING]   episode.path:', episode.path);
                                console.log('[DEBUG - PATH-MATCHING]   episode.absPath:', episode.absPath);
                                console.log('[DEBUG - PATH-MATCHING]   episode.filePath:', episode.filePath);
                                console.log('[DEBUG - PATH-MATCHING]   episode.relPath:', episode.relPath);
                                console.log('[DEBUG - PATH-MATCHING] Full episode object:', episode);
                            }
                            
                            // Try exact path matches first
                            if (normalizedEpisodePath === normalizedEpisodePath2 ||
                                normalizedEpisodePath === normalizedEpisodeAbsPath ||
                                normalizedEpisodePath === normalizedEpisodeFilePath ||
                                normalizedEpisodePath === normalizedEpisodeRelPath) {
                                return true;
                            }
                            
                            // If exact path doesn't match, try matching just the filename
                            const getFilename = (path) => {
                                if (!path) return '';
                                const parts = path.split('/');
                                return parts[parts.length - 1].toLowerCase().trim();
                            };
                            
                            const episodeFilename = getFilename(normalizedEpisodePath);
                            const storedFilename = getFilename(normalizedEpisodePath2) || 
                                                  getFilename(normalizedEpisodeAbsPath) || 
                                                  getFilename(normalizedEpisodeFilePath) || 
                                                  getFilename(normalizedEpisodeRelPath);
                            
                            if (episodeFilename && storedFilename && episodeFilename === storedFilename) {
                                console.log('[DEBUG - PATH-MATCHING] Matched by filename:', episodeFilename);
                                return true;
                            }
                            
                            // If filename doesn't match, try matching by show name and episode info
                            const extractShowAndEpisode = (path) => {
                                if (!path) return null;
                                const parts = path.split('/');
                                if (parts.length < 3) return null;
                                
                                const showPart = parts[0]; // e.g., "Bored to Death (2009)"
                                const seasonPart = parts[1]; // e.g., "Season 01"
                                const episodePart = parts[2]; // e.g., "Bored to Death - S01E03 - The Case of the Missing Screenplay.mkv"
                                
                                // Extract show name without year
                                const showMatch = showPart.match(/^(.+?)\s*\(\d{4}\)$/);
                                const showName = showMatch ? showMatch[1].trim() : showPart;
                                
                                // Extract season and episode numbers
                                const episodeMatch = episodePart.match(/S(\d{1,2})E(\d{1,2})/i);
                                const seasonNum = episodeMatch ? episodeMatch[1] : null;
                                const episodeNum = episodeMatch ? episodeMatch[2] : null;
                                
                                return { showName, seasonNum, episodeNum };
                            };
                            
                            const episodeInfo = extractShowAndEpisode(normalizedEpisodePath);
                            const storedInfo = extractShowAndEpisode(normalizedEpisodePath2) || 
                                              extractShowAndEpisode(normalizedEpisodeAbsPath) || 
                                              extractShowAndEpisode(normalizedEpisodeFilePath) || 
                                              extractShowAndEpisode(normalizedEpisodeRelPath);
                            
                            if (episodeInfo && storedInfo && 
                                episodeInfo.showName === storedInfo.showName &&
                                episodeInfo.seasonNum === storedInfo.seasonNum &&
                                episodeInfo.episodeNum === storedInfo.episodeNum) {
                                console.log('[DEBUG - PATH-MATCHING] Matched by show/season/episode:', episodeInfo);
                                return true;
                            }
                            
                            return false;
                        });
                        
                        if (episodeObj) {
                            console.log('[DEBUG - CENTRALIZED] Found episode in show:', show.name, 'season:', season.name);
                            return episodeObj;
                        }
                    }
                }
            }
        }
        
        console.log('[DEBUG - CENTRALIZED] No episode object found for path:', episodePath);
        return null;
    }

    // Legacy method - now calls the working method
    async playEpisode(episodePath, startTime = 0) {
        console.log('[DEBUG - LEGACY] playEpisode called, redirecting to working method');
        // Find the episode object and use the working method
        const episodeObj = this.findEpisodeObjectByPath(episodePath);
        if (episodeObj) {
            // Create a fake element with the episode data
            const fakeElement = document.createElement('div');
            fakeElement.setAttribute('data-episode', JSON.stringify(episodeObj));
            await this.playEpisodeFromDataAttribute(fakeElement, startTime);
        } else {
            console.error('[DEBUG - LEGACY] No episode object found for path:', episodePath);
            this.showMediaLibraryError('Episode not found. Please try again.');
        }
    }

    // ORIGINAL WORKING IMPLEMENTATION - Restored for Watch Later
    async playEpisodeFromObject(episodeDataJson, startTime = 0) {
        console.log('[DEBUG - WORKING] playEpisodeFromObject called');
        
        try {
            const episodeObj = JSON.parse(episodeDataJson);
            console.log('[DEBUG - WORKING] parsed episodeObj:', episodeObj);
            
            // Add year information to the episode object for video player using dedicated method
            const year = this.getDateForTvShow(episodeObj);
            if (year) {
                console.log('[DEBUG - WORKING] Adding year to episode object:', year);
                
                // Add year to episode object (but NOT to title/name - let VideoPlayer handle that)
                episodeObj.year = year;
                episodeObj.data = episodeObj.data || {};
                episodeObj.data.year = year;
                
                console.log('[DEBUG - WORKING] Added year to episode object (not title/name)');
            } else {
                console.log('[DEBUG - WORKING] No year found for episode');
            }
            
            window.mediaLibraryManager.currentMediaItem = episodeObj;
            window.mediaLibraryManager.currentFile = episodeObj;
            
            // Remove both modal and overlay
            this.closeMediaBrowser();
            
            // Wait for video player to be ready before proceeding
            await this.waitForVideoPlayerReady();
            
            if (!this.videoPlayer) {
                console.error('[DEBUG - WORKING] VideoPlayer not available for TV show episode');
                this.showMediaLibraryError('Video player not available. Please try again.');
                return;
            }
            
            // Use the absolute filePath from the episode object
            let videoUrl;
            
            if (episodeObj && episodeObj.filePath) {
                // Use the absolute filePath from the TV-Shows data
                const filePath = episodeObj.filePath;
                const encodedPath = encodeURIComponent(filePath);
                videoUrl = `/api/video?path=${encodedPath}`;
                console.log('[DEBUG - WORKING] Using filePath:', filePath);
                console.log('[DEBUG - WORKING] Encoded path:', encodedPath);
            } else if (episodeObj && episodeObj.absPath) {
                // Fallback to absPath if filePath is not available
                const filePath = episodeObj.absPath;
                const encodedPath = encodeURIComponent(filePath);
                videoUrl = `/api/video?path=${encodedPath}`;
                console.log('[DEBUG - WORKING] Using absPath as fallback:', filePath);
            } else {
                console.error('[DEBUG - WORKING] No filePath or absPath found in episode object');
                console.error('[DEBUG - WORKING] Available properties:', Object.keys(episodeObj));
                this.showMediaLibraryError('No video file path found for this episode. Please check if the video file exists.');
                return;
            }
            
            console.log('[DEBUG - WORKING] Final video URL:', videoUrl, 'startTime:', startTime);
            
            // Set up return location based on current context
            if (window.videoPlayer) {
                console.log('[DEBUG - WORKING] Setting return location for TV show episode from Watch Later');
                console.log('[DEBUG - WORKING] Current tab flag:', this.currentTabFlag);
                
                // Determine the correct return location based on current context
                let returnLocation;
                if (this.currentTabFlag === 'watchlater') {
                    returnLocation = { type: 'watch-later' };
                    console.log('[DEBUG - WORKING] Setting return location to watch-later');
                } else if (this.currentTabFlag === 'tvshows') {
                    returnLocation = { type: 'tv-show-episodes', showPath: this.currentTVShow, seasonPath: this.currentTVSeason };
                    console.log('[DEBUG - WORKING] Setting return location to tv-show-episodes');
                } else {
                    returnLocation = { type: 'media-library', tab: 'TV-Shows' };
                    console.log('[DEBUG - WORKING] Setting return location to media-library TV-Shows');
                }
                
                console.log('[DEBUG - WORKING] Return location object:', returnLocation);
                window.videoPlayer.setReturnLocation(returnLocation);
                
                // Ensure video player is ready before calling playUrl
                console.log('[DEBUG - WORKING] Calling playUrl with startTime:', startTime);
                console.log('[DEBUG - WORKING] Passing episodeObj to playUrl:', episodeObj);
                window.videoPlayer.playUrl(videoUrl, 'video/mp4', startTime, episodeObj);
            }
        } catch (error) {
            console.error('[DEBUG - WORKING] Error parsing episode data:', error);
            this.showMediaLibraryError('Error playing episode. Please try again.');
        }
    }

    // Wrapper method for inline onclick handlers to handle async playEpisodeFromDataAttribute
    playEpisodeFromDataAttributeAsync(element, startTime = 0) {
        // Check if there's a resume time stored in the element (for Watch Later)
        const resumeTime = element.getAttribute('data-resume-time');
        if (resumeTime) {
            console.log('[DEBUG - RESUME] Found resume time in element:', resumeTime);
            startTime = parseFloat(resumeTime) || 0;
            // Clear the resume time after using it
            element.removeAttribute('data-resume-time');
        }
        
        // Set the current tab flag based on the element class
        if (element.classList.contains('watch-later-card')) {
            this.currentTabFlag = 'watchlater';
            console.log('[DEBUG - RESUME] Set currentTabFlag to watchlater');
        } else {
            this.currentTabFlag = 'tvshows';
            console.log('[DEBUG - RESUME] Set currentTabFlag to tvshows');
        }
        
        this.playEpisodeFromDataAttribute(element, startTime).catch(error => {
            console.error('[PLAY EPISODE FROM DATA ATTRIBUTE ASYNC] Error:', error);
        });
    }

    // ORIGINAL WORKING IMPLEMENTATION - Restored for main TV-SHOWS tab
    async playEpisodeFromDataAttribute(element, startTime = 0) {
        console.log('[DEBUG - WORKING] playEpisodeFromDataAttribute called with startTime:', startTime);
        
        try {
            const episodeData = element.getAttribute('data-episode');
            if (!episodeData) {
                console.error('[DEBUG - WORKING] No episode data found in data-episode attribute');
                this.showMediaLibraryError('No episode data found. Please try again.');
                return;
            }
            
            // Unescape the JSON data before parsing
            const unescapedData = episodeData.replace(/&quot;/g, '"').replace(/\\'/g, "'");
            const episodeObj = JSON.parse(unescapedData);
            
            // Add year information to the episode object for video player using dedicated method
            const year = this.getDateForTvShow(episodeObj);
            if (year) {
                console.log('[DEBUG - WORKING] Adding year to episode object:', year);
                
                // Add year to episode object (but NOT to title/name - let VideoPlayer handle that)
                episodeObj.year = year;
                episodeObj.data = episodeObj.data || {};
                episodeObj.data.year = year;
                
                console.log('[DEBUG - WORKING] Added year to episode object (not title/name)');
            } else {
                console.log('[DEBUG - WORKING] No year found for episode');
            }
            
            window.mediaLibraryManager.currentMediaItem = episodeObj;
            window.mediaLibraryManager.currentFile = episodeObj;
            
            // Remove both modal and overlay
            this.closeMediaBrowser();
            
            // Wait for video player to be ready before proceeding
            await this.waitForVideoPlayerReady();
            
            if (!this.videoPlayer) {
                console.error('[DEBUG - WORKING] VideoPlayer not available for TV show episode from data attribute');
                this.showMediaLibraryError('Video player not available. Please try again.');
                return;
            }
            
            // Show video player immediately for better UX
            if (window.videoPlayer) {
                console.log('[DEBUG - WORKING] Setting return location for TV show episode');
                console.log('[DEBUG - WORKING] Current tab flag:', this.currentTabFlag);
                console.log('[DEBUG - WORKING] currentTVShow:', this.currentTVShow);
                console.log('[DEBUG - WORKING] currentTVSeason:', this.currentTVSeason);
                
                // Set return location based on current tab flag
                let returnLocation;
                if (this.currentTabFlag === 'watchlater') {
                    returnLocation = { type: 'watch-later' };
                    console.log('[DEBUG - WORKING] Setting return location to watch-later');
                } else if (this.currentTabFlag === 'tvshows' || this.currentTab === 'tvshows') {
                    returnLocation = {
                        type: 'tv-show-episodes',
                        showPath: this.currentTVShow,
                        seasonPath: this.currentTVSeason
                    };
                    console.log('[DEBUG - WORKING] Setting return location to tv-show-episodes');
                } else {
                    returnLocation = { type: 'media-library', tab: 'TV-Shows' };
                    console.log('[DEBUG - WORKING] Setting return location to media-library TV-Shows');
                }
                
                console.log('[DEBUG - WORKING] Return location object:', returnLocation);
                window.videoPlayer.setReturnLocation(returnLocation);
                window.videoPlayer.show();
            } else {
                console.error('[DEBUG - WORKING] Video player not available!');
            }
            
            // Use the absolute filePath from the episode object
            let videoUrl;
            
            if (episodeObj && episodeObj.filePath) {
                // Use the absolute filePath from the TV-Shows data
                const filePath = episodeObj.filePath;
                const encodedPath = encodeURIComponent(filePath);
                videoUrl = `/api/video?path=${encodedPath}`;
                console.log('[DEBUG - WORKING] Using filePath:', filePath);
                console.log('[DEBUG - WORKING] Encoded path:', encodedPath);
                console.log('[DEBUG - WORKING] Final video URL:', videoUrl);
                
                // Note: Removed URL test to improve responsiveness - video player will handle errors
            } else {
                console.error('[DEBUG - WORKING] No filePath found in episode object');
                console.error('[DEBUG - WORKING] Available properties:', Object.keys(episodeObj));
                
                // Try alternative paths
                if (episodeObj.absPath) {
                    const encodedPath = encodeURIComponent(episodeObj.absPath);
                    videoUrl = `/api/video?path=${encodedPath}`;
                    console.log('[DEBUG - WORKING] Using absPath as fallback:', episodeObj.absPath);
                } else if (episodeObj.path) {
                    const encodedPath = encodeURIComponent(episodeObj.path);
                    videoUrl = `/api/video?path=${encodedPath}`;
                    console.log('[DEBUG - WORKING] Using path as fallback:', episodeObj.path);
                } else {
                    console.error('[DEBUG - WORKING] No valid video path found in episode object');
                    this.showMediaLibraryError('No video file found for this episode. Please check if the video file exists.');
                    return;
                }
            }
            
            console.log('[DEBUG - WORKING] Final video URL:', videoUrl, 'startTime:', startTime);
            
            // Set up a callback to restore the MediaLibrary modal when the Video Player is closed
            if (window.videoPlayer) {
                window.videoPlayer.onClose = () => {
                    // Restore the MediaLibrary modal in the same state (showing episodes for the current show/season)
                    this.renderModal();
                };
                
                // Ensure video player is ready before calling playUrl
                console.log('[DEBUG - WORKING] Calling playUrl with startTime:', startTime);
                console.log('[DEBUG - WORKING] Passing episodeObj to playUrl:', episodeObj);
                window.videoPlayer.playUrl(videoUrl, 'video/mp4', startTime, episodeObj);
            }
        } catch (error) {
            console.error('[DEBUG - WORKING] Error parsing episode data:', error);
            this.showMediaLibraryError('Error loading episode. Please try again.');
        }
    }



    // --- TAB CONTENT RENDERING METHODS ---
    renderMoviesContent() {
        const items = this.getFilteredAndSortedItems();
        const addedAnchors = new Set();
        let html = '<div class="media-library-movie-grid">';
        items.forEach((item, index) => {
            const cleanTitle = this.cleanMovieTitle(item.title || item.name || item.filename || item.path || '');
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            
            // Create anchor element if this is the first movie starting with this letter
            let anchorHTML = '';
            if (!addedAnchors.has(firstLetter)) {
                anchorHTML = `<div class="media-library-anchor" data-anchor="${firstLetter}"></div>`;
                addedAnchors.add(firstLetter);
            }
            
            html += `
                <div class="media-library-movie-card" data-item-index="${index}" data-item-path="${item.path}">
                    ${anchorHTML}
                    <div class="media-card-actions-movies">
                        <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                        <button class="favorite-btn favorite-btn-movie" title="Toggle Favorite">${this.isFavorite(item.path) ? '❤️' : '🤍'}</button>
                        <button class="collection-btn" title="Add to Collection">➕</button>
                    </div>
                    <img src="${this.getPosterPath(item)}" alt="${cleanTitle}" class="media-library-poster">
                    <div class="media-info"><h3>${cleanTitle}</h3></div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    attachMovieCardHandlers() {
        console.log('[DEBUG] Attaching movie card handlers');
        const items = this.getFilteredAndSortedItems();
        
        // Attach click handlers to movie cards
        document.querySelectorAll('.media-library-movie-card').forEach((card, index) => {
            const item = items[index];
            if (!item) return;
            
            // Attach favorite button handler - specifically target movie favorite buttons
            const favoriteBtn = card.querySelector('.favorite-btn-movie');
            if (favoriteBtn) {
                favoriteBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleFavorite(item.path, 'movie');
                    // Force immediate heart icon update
                    setTimeout(() => this.updateHeartIcons(), 50);
                };
            }
            
            // Attach collection button handler
            const collectionBtn = card.querySelector('.collection-btn');
            if (collectionBtn) {
                collectionBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.showAddToCollectionModal(item);
                };
            }
            
            // Attach main card click handler for movie details
            card.addEventListener('click', async (e) => {
                if (e.target.closest('.poster-selector-btn') || e.target.closest('.favorite-btn') || e.target.closest('.favorite-btn-movie') || e.target.closest('.collection-btn')) {
                    return; // Don't trigger card click for action buttons
                }
                console.log('[DEBUG] Movie card clicked:', item.path);
                await this.showMovieDetailsModal(item);
            });
        });
    }

    attachTVShowHandlers() {
        console.log('[DEBUG] Attaching TV show handlers');
        
        // Attach click handlers to TV show cards using the same mechanism as favorited TV shows
        const tvCards = document.querySelectorAll('.media-library-tv-card');
        console.log('[DEBUG] Found TV show cards to attach handlers to:', tvCards.length);
        
        tvCards.forEach(card => {
            const path = card.getAttribute('data-path');
            console.log('[DEBUG] Attaching TV show handler for:', path);
            
            // Attach favorite button handler
            const favoriteBtn = card.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    console.log('[DEBUG] Toggling TV show favorite:', path);
                    this.toggleFavorite(path, 'tv');
                    // Force immediate heart icon update
                    setTimeout(() => this.updateHeartIcons(), 50);
                    return false;
                };
            }
            
            // Attach collection button handler
            const collectionBtn = card.querySelector('.collection-btn');
            if (collectionBtn) {
                collectionBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    const showName = card.getAttribute('data-show-name');
                    const showData = { path: path, name: showName };
                    this.showAddToCollectionModal(showData);
                    return false;
                };
            }
            
            // Attach card click handler for opening TV shows - using the same mechanism as favorited TV shows
            card.onclick = (e) => {
                if (e.target.closest('.favorite-btn') || e.target.closest('.poster-selector-btn') || e.target.closest('.collection-btn')) return; // Don't trigger for action buttons
                console.log('[DEBUG] Opening TV show from main tab:', path);
                this.openTVShow(path);
            };
        });
    }

    // Force refresh the current content to get new classes
    forceRefreshContent() {
        console.log('[DEBUG] Force refreshing content to get new classes');
        this.updateModalContent();
    }

    attachFavoritesHandlers() {
        console.log('[DEBUG] Attaching favorites handlers');
        
        // Attach click handlers for movie favorites
        document.querySelectorAll('.media-library-movie-card-movies').forEach(card => {
            const path = card.getAttribute('data-path');
            console.log('[DEBUG - FAVORITES] Attaching movie handler for:', path);
            
            // Attach favorite button handler - specifically target movie favorite buttons
            const favoriteBtn = card.querySelector('.favorite-btn-movie');
            if (favoriteBtn) {
                favoriteBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    console.log('[DEBUG - FAVORITES] Removing movie from favorites:', path);
                    this.toggleFavorite(path, 'movie');
                    // Force immediate heart icon update
                    setTimeout(() => this.updateHeartIcons(), 50);
                    return false;
                };
            }
            
            // Attach card click handler for playing movies
            card.onclick = (e) => {
                if (e.target.closest('.favorite-btn') || e.target.closest('.favorite-btn-movie') || e.target.closest('.poster-selector-btn') || e.target.closest('.collection-btn')) return; // Don't trigger for action buttons
                
                // Create a movie object from the path for playback
                const movieObj = { path: path };
                console.log('[DEBUG - FAVORITES] Playing movie from favorites:', path);
                this.playMedia(movieObj);
                };
            });
        
        // Attach click handlers for TV show favorites
        document.querySelectorAll('.media-library-movie-card-tvshows').forEach(card => {
            const path = card.getAttribute('data-path');
            console.log('[DEBUG - FAVORITES] Attaching TV show handler for:', path);
            
            // Attach favorite button handler - specifically target TV show favorite buttons
            const favoriteBtn = card.querySelector('.favorite-btn-tv');
            if (favoriteBtn) {
                favoriteBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    console.log('[DEBUG - FAVORITES] Removing TV show from favorites:', path);
                    this.toggleFavorite(path, 'tv');
                    // Force immediate heart icon update
                    setTimeout(() => this.updateHeartIcons(), 50);
                    return false;
                };
            }
            
            // Attach card click handler for opening TV shows
            card.onclick = (e) => {
                if (e.target.closest('.favorite-btn') || e.target.closest('.favorite-btn-tv') || e.target.closest('.poster-selector-btn') || e.target.closest('.collection-btn')) return; // Don't trigger for action buttons
                console.log('[DEBUG - FAVORITES] Opening TV show from favorites:', path);
                // Switch to TV shows tab first, then open the specific show
                this.currentTab = 'tvshows';
                this.currentTabFlag = 'tvshows'; // Update the flag as well
                this.openTVShow(path);
                };
            });
    }

    attachCollectionHandlers() {
        console.log('[DEBUG] Attaching collection handlers');
        
        // Attach click handlers for collection buttons
        document.querySelectorAll('.collection-btn[data-collection]').forEach(btn => {
            const collectionName = btn.getAttribute('data-collection');
            btn.onclick = () => {
                console.log('[DEBUG - COLLECTIONS] Opening collection:', collectionName);
                this.currentCollectionView = collectionName;
                this.renderModal();
            };
        });
        
        // Attach click handlers for back button
        const backBtn = document.getElementById('backToCollectionsBtn');
        if (backBtn) {
            backBtn.onclick = () => {
                console.log('[DEBUG - COLLECTIONS] Going back to collections list');
                this.currentCollectionView = null;
                this.renderModal();
            };
        }
        
        // Attach click handlers for delete button
        const deleteBtn = document.getElementById('deleteCollectionBtn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                console.log('[DEBUG - COLLECTIONS] Deleting collection:', this.currentCollectionView);
                await window.ConfirmModal.init();
                window.ConfirmModal.open({
                    message: `Are you sure you want to delete the collection "${this.currentCollectionView}"? This cannot be undone.`,
                    onConfirm: () => {
                        const collections = this.getCollections();
                        delete collections[this.currentCollectionView];
                        this.saveCollections(collections);
                        this.currentCollectionView = null;
                        this.showToast('Collection deleted!');
                        this.renderModal();
                    }
                });
            };
        }
        
        // Attach click handlers for movie cards in collections
        document.querySelectorAll('.media-library-movie-card').forEach(card => {
            const path = card.getAttribute('data-path');
            if (path) {
                // Attach favorite button handler - specifically target movie favorite buttons
                const favoriteBtn = card.querySelector('.favorite-btn-movie');
                if (favoriteBtn) {
                    favoriteBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.toggleFavorite(path, 'movie');
                    };
                }
                
                // Attach card click handler for playing movies
                card.onclick = (e) => {
                    if (e.target.closest('.favorite-btn') || e.target.closest('.favorite-btn-movie') || e.target.closest('.poster-selector-btn') || e.target.closest('.collection-btn')) {
                        return; // Don't trigger for action buttons
                    }
                    const movie = this.mediaLibraryRaw.find(item => item.path === path);
                    if (movie) {
                        console.log('[DEBUG - COLLECTIONS] Playing movie from collection:', movie.title);
                        this.playMedia(movie);
                    }
                };
            }
        });
    }

    updateHeartIcons() {
        console.log('[DEBUG - HEART ICONS] Updating heart icons');
        
        // Update heart icons for TV show cards (using the correct selector)
        const tvHearts = document.querySelectorAll('.media-library-tv-card .favorite-btn');
        console.log('[DEBUG - HEART ICONS] Found TV show heart buttons:', tvHearts.length);
        
        tvHearts.forEach(btn => {
            const card = btn.closest('.media-library-tv-card');
            const path = card ? card.getAttribute('data-path') : null;
            if (path) {
                const isFav = this.isFavorite(path);
                const oldText = btn.textContent;
                btn.textContent = isFav ? '❤️' : '🤍';
                btn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
                console.log('[DEBUG - HEART ICONS] Updated TV show heart:', path, 'isFavorite:', isFav, 'oldText:', oldText, 'newText:', btn.textContent);
            } else {
                console.warn('[DEBUG - HEART ICONS] No path found for TV show heart button');
            }
        });
        
        // Update heart icons for movie cards (using the actual class being used)
        const movieHearts = document.querySelectorAll('.media-library-movie-card .favorite-btn');
        console.log('[DEBUG - HEART ICONS] Found movie heart buttons:', movieHearts.length);
        
        movieHearts.forEach(btn => {
            const card = btn.closest('.media-library-movie-card');
            const path = card ? card.getAttribute('data-path') : null;
            if (path) {
                const isFav = this.isFavorite(path);
                btn.textContent = isFav ? '❤️' : '🤍';
                btn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
                console.log('[DEBUG - HEART ICONS] Updated movie heart:', path, 'isFavorite:', isFav);
            }
        });
        
        // Update heart icons for favorites cards (these should always be red since they're in favorites)
        document.querySelectorAll('.media-library-movie-card-movies .favorite-btn, .media-library-movie-card-tvshows .favorite-btn').forEach(btn => {
            const card = btn.closest('[data-path]');
            const path = card ? card.getAttribute('data-path') : null;
            if (path) {
                btn.textContent = '❤️';
                btn.title = 'Remove from Favorites';
                console.log('[DEBUG - HEART ICONS] Updated favorites heart:', path);
            }
        });
        
        console.log('[DEBUG - HEART ICONS] Heart icon update complete');
    }



    renderSuggestionsContent() {
        return '<div class="media-library-suggestions-placeholder"><h3>Suggestions coming soon...</h3></div>';
    }

    // --- UTILITY METHODS ---
    filterItems(items, searchTerm) {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item =>
            (item.name && item.name.toLowerCase().includes(term)) ||
            (item.title && item.title.toLowerCase().includes(term)) ||
            (item.filename && item.filename.toLowerCase().includes(term)) ||
            (item.path && item.path.toLowerCase().includes(term)) ||
            (item.TMDBTitle && item.TMDBTitle.toLowerCase().includes(term))
        );
    }

    sortItems(items, sortBy, field = 'name') {
        if (!items || items.length === 0) return items;
        
        return items.slice().sort((a, b) => {
            const aValue = (a[field] || '').toString().toLowerCase();
            const bValue = (b[field] || '').toString().toLowerCase();
            
            if (sortBy === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        });
    }

    cleanTVShowTitle(title) {
        if (!title || typeof title !== 'string') return '';
        // For TV shows, extract just the show name for clean UI display
        // Remove year and quality info for user-friendly display
        let name = title.trim();
        
        // Remove (year) and [quality] info for display
        name = name.replace(/\((19|20)\d{2}\)/g, ""); // Remove (2021)
        name = name.replace(/\[\d{3,4}p\]/gi, "");    // Remove [1080p], [720p], etc.
        
        // Replace dots, underscores, dashes with spaces
        name = name.replace(/[._-]+/g, " ");
        // Remove extra spaces
        name = name.replace(/\s+/g, " ").trim();
        // Capitalize each word
        name = this.capitalizeTitle(name);
        return name;
    }

    renderTVShowsTab() {
        // Ensure NormalizationService is available
        if (!window.getInternalKey) {
            console.error('[MEDIA-LIBRARY] NormalizationService not loaded - this should not happen!');
            return '<div class="error">NormalizationService not available</div>';
        }
        
        const sortedShows = this.getFilteredAndSortedItems();
        const addedAnchors = new Set();
        let html = '<div class="media-library-movie-grid">';
        sortedShows.forEach(show => {
            // Use TMDBTitle field if available, otherwise fallback to file system name
            let displayTitle;
            if (show.TMDBTitle) {
                // Use the TMDBTitle field directly
                displayTitle = show.TMDBTitle;
            } else {
                // Fallback to file system name
                const cleanTitle = this.cleanTVShowTitle(show.name || show.title || show.filename || show.path || '');
                displayTitle = this.capitalizeTitle(cleanTitle);
            }
            const firstLetter = displayTitle.charAt(0).toUpperCase();
            let anchorAttr = '';
            if (!addedAnchors.has(firstLetter)) {
                anchorAttr = ` data-anchor="${firstLetter}"`;
                addedAnchors.add(firstLetter);
            }
            html += `
                <div class="media-library-tv-card"${anchorAttr} data-path="${show.path}" data-show-name="${show.name || show.title || ''}" data-normalized-key="${show.normalizedKey || ''}">
                  <div class="media-card-actions">
                    <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                    <button class="favorite-btn" title="Toggle Favorite">${this.isFavorite(show.path) ? '❤️' : '🩷'}</button>
                    <button class="collection-btn" title="Add to Collection">➕</button>
                  </div>
                  <img class="media-library-poster poster" src="${this.getPosterPath(show)}" alt="${show.name}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                  <div class="media-info"><h3 class="media-library-tv-show-title">${displayTitle}</h3></div>
                </div>
            `;
        });
        html += '</div>';
        // Insert the A-Z sidebar inside the grid container
        html = `<div class="media-library-grid-container">
            <div id="mediaLibraryAZSidebar" class="media-library-az-sidebar"></div>
            ${html}
        </div>`;
        return html;
    }

    closeModal() {
        // Remove the modal from the DOM
        const modal = document.querySelector('.media-library-modal');
        if (modal) modal.remove();
    }

    // --- TV SHOW DATE EXTRACTION ---
    getDateForTvShow(episodeObj) {
        console.log('[DEBUG - GET-DATE-FOR-TV-SHOW] Getting date for episode:', episodeObj.path || episodeObj.relPath || episodeObj.filePath);
        
        // Use the same logic as the video player's extractEpisodeInfo method
        const filePath = episodeObj.filePath || episodeObj.absPath || episodeObj.path || episodeObj.relPath || '';
        console.log('[DEBUG - GET-DATE-FOR-TV-SHOW] Using file path:', filePath);
        
        if (!filePath) {
            console.log('[DEBUG - GET-DATE-FOR-TV-SHOW] No file path available');
            return null;
        }
        
        const path = filePath.replace(/\\/g, '/'); // Normalize path separators
        
        // Extract show name from TV-SHOWS directory structure (same as video player)
        const tvShowsMatch = path.match(/TV[-_]SHOWS?[\/\\]([^\/\\]+)/i);
        let showYear = null;
        
        if (tvShowsMatch) {
            const folderName = tvShowsMatch[1];
            console.log('[DEBUG - GET-DATE-FOR-TV-SHOW] Raw folder name:', folderName);
            
            // Extract year from folder name if present (same as video player)
            const yearMatch = folderName.match(/\((\d{4})\)/);
            if (yearMatch) {
                showYear = yearMatch[1];
                console.log('[DEBUG - GET-DATE-FOR-TV-SHOW] Found year in folder name:', showYear);
            } else {
                console.log('[DEBUG - GET-DATE-FOR-TV-SHOW] No year found in folder name');
            }
        } else {
            console.log('[DEBUG - GET-DATE-FOR-TV-SHOW] No TV-SHOWS directory found in path');
        }
        
        return showYear;
    }
    
    // --- WATCH LATER / RESUME LOGIC ---
    saveResumeProgress(mediaItem, currentTime, duration, isManualSave = false) {
        console.log('[MEDIA-LIBRARY] saveResumeProgress called:', {mediaItem, currentTime, duration, isManualSave});
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        
        // Determine if this is a TV show by checking the path (do this BEFORE duplicate removal)
        const pathToCheck = (mediaItem.path || mediaItem.absPath || mediaItem.relPath || '').toLowerCase();
        const isTVShow = pathToCheck.includes('tv-shows') || 
                        pathToCheck.includes('tv_shows') ||
                        pathToCheck.includes('season') ||
                        (mediaItem.title && (mediaItem.title.includes('S00E') || mediaItem.title.includes('S01E') || mediaItem.title.includes('S02E')));
        
        // Remove any existing entry for this path (deduplication)
        resumeList = resumeList.filter(item => {
            const itemPath = (item.path || '').replace(/\\/g, '/').toLowerCase().trim();
            const mediaPath = (mediaItem.path || '').replace(/\\/g, '/').toLowerCase().trim();
            
            // Remove exact path matches
            if (itemPath === mediaPath && itemPath !== '') {
                return false; // Remove duplicate
            }
            
            // For TV shows, also check by title to catch different path formats
            if (isTVShow && mediaItem.title && item.title) {
                const itemTitle = item.title.toLowerCase().trim();
                const mediaTitle = mediaItem.title.toLowerCase().trim();
                if (itemTitle === mediaTitle) {
                    return false; // Remove duplicate by title
                }
            }
            
            return true; // Keep this item
        });

        let savePath = mediaItem.path || mediaItem.absPath || mediaItem.relPath;
        
        // For TV-Shows, ensure we have the correct path format
        if (isTVShow && savePath) {
            // If it's an absolute path, convert to relative
            if (savePath.startsWith('/media/')) {
                savePath = savePath.replace(/^\/media\//, '');
            }
            
            // Handle Windows paths with backslashes - NORMALIZE ALL PATHS
            if (savePath.includes('\\')) {
                savePath = savePath.replace(/\\/g, '/');
            }
        }
        
        // If path is missing, try to look up from main media library by filename or title
        if (!savePath && this.mediaLibrary && (mediaItem.title || mediaItem.name)) {
            const filename = (mediaItem.title || mediaItem.name).split(/[\\/]/).pop();
            const found = this.mediaLibrary.find(item => {
                return (
                    (item.path && item.path.split(/[\\/]/).pop() === filename) ||
                    (item.title && item.title === mediaItem.title) ||
                    (item.name && item.name === mediaItem.name)
                );
            });
            if (found && found.path) {
                savePath = found.path;
            }
        }
        
        // Always decode before saving to avoid double-encoding
        try {
            savePath = decodeURIComponent(savePath);
        } catch (e) {}
        
        // For manual saves (Save for Later button), always save regardless of position
        // For automatic saves (pause events), only save if not near the end
        if (isManualSave || (duration - currentTime > 60)) {
            const savedItem = {
                path: savePath,
                title: mediaItem.title,
                poster: this.getPosterPath(mediaItem),
                currentTime,
                duration,
                lastWatched: Date.now(),
                type: isTVShow ? 'tv-show' : 'movie' // Add type for better filtering
            };
            
            // --- Ensure filePath is included for TV shows ---
            if (isTVShow) {
                if (mediaItem.filePath) {
                    // Use the filePath as-is if it's already an absolute path
                    savedItem.filePath = mediaItem.filePath;
                } else if (mediaItem.absPath) {
                    savedItem.filePath = mediaItem.absPath;
                } else if (mediaItem.path) {
                    // Convert relative path to absolute path for TV shows
                    // The path should be like "TV-SHOWS/Show/Season 01/Episode.mp4"
                    // Convert to "S:/MEDIA/TV-SHOWS/Show/Season 01/Episode.mp4"
                    if (mediaItem.path.startsWith('tv-shows/') || mediaItem.path.startsWith('TV-SHOWS/')) {
                        const cleanPath = mediaItem.path.replace(/^tv-shows\//i, '');
                        savedItem.filePath = `S:/MEDIA/TV-SHOWS/${cleanPath}`;
                    } else {
                        savedItem.filePath = `S:/MEDIA/TV-SHOWS/${mediaItem.path}`;
                    }
                }
                
                console.log('[DEBUG - WATCH-LATER] Saved TV show filePath:', savedItem.filePath);
            }
            
            // --- Ensure absPath is included for movies ---
            if (!isTVShow) {
            if (!mediaItem.absPath && mediaItem.files && mediaItem.files.length > 0) {
                // Find the first video file
                const videoFile = mediaItem.files.find(f => f.name && /\.(mp4|mkv|avi)$/i.test(f.name));
                if (videoFile) {
                    savedItem.absPath = `/media/movies/${mediaItem.path}/${videoFile.name}`;
                }
            } else if (mediaItem.absPath) {
                savedItem.absPath = mediaItem.absPath;
            }
            }
            
            resumeList.push(savedItem);
        }
        
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
        
        this.renderWatchLaterContent();
        if (isManualSave) {
            this.showToast('Saved to Watch Later!');
        }
    }

    removeResumeProgress(path) {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        
        // Normalize the target path
        const normalizedPath = path.replace(/\\/g, '/').toLowerCase().trim();
        
        // Remove items that match the path (check all possible path properties)
        const originalCount = resumeList.length;
        resumeList = resumeList.filter(item => {
            const itemPaths = [
                item.path,
                item.relPath,
                item.filePath,
                item.absPath
            ].filter(p => p).map(p => p.replace(/\\/g, '/').toLowerCase().trim());
            
            return !itemPaths.some(itemPath => itemPath === normalizedPath);
        });
        
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
        
        // Refresh the Watch Later content if we're currently on that tab
        if (this.currentTab === 'watchlater') {
            this.renderWatchLaterContent();
        }
    }

    getResumeList() {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        // Sort by lastWatched desc (most recent first)
        return resumeList.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
    }

    cleanupWatchLaterDuplicates() {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        const originalCount = resumeList.length;
        
        // Group items by normalized path and title
        const groups = {};
        resumeList.forEach(item => {
            const path = (item.path || '').replace(/\\/g, '/').toLowerCase().trim();
            const title = (item.title || '').toLowerCase().trim();
            const key = path || title; // Use path if available, otherwise title
            
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });
        
        // Keep only the most recent item from each group
        const cleanedList = [];
        Object.keys(groups).forEach(key => {
            const items = groups[key];
            if (items.length > 1) {
                // Sort by lastWatched and keep the most recent
                items.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
                cleanedList.push(items[0]); // Keep the most recent
            } else {
                cleanedList.push(items[0]); // Keep single items
            }
        });
        
        // Sort the cleaned list by lastWatched (most recent first)
        cleanedList.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
        
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(cleanedList));
        
        return cleanedList;
    }

    showToast(msg, type) {
        if (type === 'success') type = 'blue';
        if (type === 'error') type = 'red';
        console.log(`[TOAST][${type}] ${msg}`);
        let toast = document.getElementById('mediaLibraryToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mediaLibraryToast';
        }
        toast.className = 'media-library-toast';
        toast.textContent = msg;
        toast.classList.remove('success', 'error');
        if (type === 'blue') toast.classList.add('success');
        if (type === 'red') toast.classList.add('error');
        toast.style.display = 'flex';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.display = 'none'; }, 1800);
    }

    showMediaLibraryError(message) {
        console.log('[MEDIA-LIBRARY] Error:', message);
        
        // Get or create the error display area in the Media Library footer
        let errorDisplay = document.getElementById('mediaLibraryErrorDisplay');
        if (!errorDisplay) {
            errorDisplay = document.createElement('div');
            errorDisplay.id = 'mediaLibraryErrorDisplay';
            errorDisplay.className = 'media-library-error-display';
            
            // Append to the Media Library modal instead of body
            const mediaLibraryModal = document.querySelector('.media-library-modal');
            if (mediaLibraryModal) {
                mediaLibraryModal.appendChild(errorDisplay);
            } else {
                // Fallback to body if modal not found
                document.body.appendChild(errorDisplay);
            }
        }
        
        // Only show if it's a different message or if no message is currently showing
        if (errorDisplay.textContent !== message || errorDisplay.style.display === 'none') {
            errorDisplay.textContent = message;
            errorDisplay.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDisplay.style.display = 'none';
            }, 5000);
        }
    }

    attachResumeEvents(mediaItem) {
        // This method is called when a video starts playing
        // It sets up automatic saving of progress when the video is paused
        console.log('[MEDIA-LIBRARY] attachResumeEvents called for:', mediaItem);
        
        // The actual pause event handling is now done in the VideoPlayer component
        // This method is kept for compatibility and future enhancements
    }

    extractEpisodeTitle(filename) {
        console.log('[DEBUG - EPISODE-TITLE] Extracting title from:', filename);
        console.log('[DEBUG - EPISODE-TITLE] Current TV show:', this.currentTVShow);
        
        // Remove extension
        let name = filename.replace(/\.[^/.]+$/, "");
        console.log('[DEBUG - EPISODE-TITLE] After extension removal:', name);
        
        // For Lois & Clark specifically, handle the dot-separated format
        if (name.includes('Lois.And.Clark.The.New.Adventures.Of.Superman')) {
            console.log('[DEBUG - EPISODE-TITLE] Detected Lois & Clark format');
            
            // Split by dots and find the episode part
            const parts = name.split('.');
            let episodeIndex = -1;
            
            // Find where the episode code starts (S01E01, S01E01E02, etc.)
            for (let i = 0; i < parts.length; i++) {
                if (/^S\d{1,2}E\d{1,2}/i.test(parts[i])) {
                    episodeIndex = i;
                    break;
                }
            }
            
            if (episodeIndex !== -1) {
                // Get everything after the episode code
                const episodeParts = parts.slice(episodeIndex + 1);
                name = episodeParts.join(' ');
                console.log('[DEBUG - EPISODE-TITLE] Extracted episode parts:', episodeParts);
                console.log('[DEBUG - EPISODE-TITLE] Final name:', name);
            } else {
                // Fallback: remove the show name pattern
                name = name.replace(/Lois\.And\.Clark\.The\.New\.Adventures\.Of\.Superman\.?/i, '');
            }
        } else {
            // General approach for other shows
            if (this.currentTVShow) {
                const showName = this.extractShowName(this.currentTVShow);
                if (showName) {
                    // Try exact match first
                    const exactPattern = new RegExp('^' + this.escapeRegExp(showName) + '[ ._-]*', "i");
                    if (name.match(exactPattern)) {
                        name = name.replace(exactPattern, "");
                    } else {
                        // Try removing just the main title part (without year)
                        const mainTitle = showName.replace(/\s*\(\d{4}\).*$/, '').trim();
                        const mainPattern = new RegExp('^' + this.escapeRegExp(mainTitle) + '[ ._-]*', "i");
                        name = name.replace(mainPattern, "");
                    }
                }
            }
            
            // Remove season/episode codes
            name = name.replace(/S\d{1,2}E\d{1,2}/gi, "");
            name = name.replace(/Season[ _-]?\d{1,2}/gi, "");
            name = name.replace(/Episode[ _-]?\d{1,2}/gi, "");
            name = name.replace(/E\d{1,2}/gi, "");
        }
        
        // Clean up any remaining artifacts
        name = name.replace(/^[ ._-]+/, "");
        name = name.replace(/[ ._-]+$/, "");
        name = name.replace(/[ ._-]{2,}/g, " "); // Replace multiple dots/dashes with single space
        
        // If still empty or just numbers, provide a fallback
        if (!name.trim() || /^\d+$/.test(name.trim())) {
            // Extract episode number for fallback
            const episodeMatch = filename.match(/S\d{1,2}E(\d{1,2})/i);
            if (episodeMatch) {
                name = `Episode ${episodeMatch[1]}`;
            } else {
                name = "Episode";
            }
        }
        
        console.log('[DEBUG - EPISODE-TITLE] Final result:', name.trim());
        return name.trim();
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    async reloadMoviePostersAndRefreshGrid() {
        try {
            // Reload movie posters
            const response = await fetch('/components/MediaLibrary/data/movies/movie_posters_normalized.json?_=' + Date.now());
            if (response.ok) {
                this.moviePosters = await response.json();
            }
        } catch (e) {
            console.warn('[MediaLibrary] Failed to reload movie_posters_normalized.json:', e);
        }
        
        // Reload the entire media library data to get the new movie
        try {
            await this.loadMediaLibrary();
        } catch (e) {
            console.warn('[MediaLibrary] Failed to reload media library data:', e);
        }
        
        this.renderMediaGrid();
        this.attachPosterSelectorHandlers();
    }

    async refreshCurrentContent() {
        console.log('[DEBUG - REFRESH] 🚀 Starting refresh for tab:', this.currentTab);
        
        // Show loading spinner
        this.showGridSpinner();
        
        try {
            console.log('[DEBUG - REFRESH] 📋 Current state - Tab:', this.currentTab, 'Show:', this.currentTVShow || 'none', 'Season:', this.currentTVSeason || 'none');
            
            // Store current tab
            const currentTab = this.currentTab;
            const currentShow = this.currentTVShow;
            const currentSeason = this.currentTVSeason;
            
            // Clear the grid first
            const grid = document.getElementById('mediaGrid');
            if (grid) {
                grid.innerHTML = '<div style="text-align: center; padding: 20px;">Refreshing...</div>';
                console.log('[DEBUG - REFRESH] ✅ Grid cleared, showing refreshing message');
            } else {
                console.log('[DEBUG - REFRESH] ❌ Could not find mediaGrid element');
            }
            
            // Small delay to show the refreshing message
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('[DEBUG - REFRESH] ⏱️ 100ms delay completed');
            
            // Force reload the current tab
            console.log('[DEBUG - REFRESH] 🔄 Calling switchTab(' + currentTab + ')...');
            await this.switchTab(currentTab);
            console.log('[DEBUG - REFRESH] ✅ switchTab completed successfully');
            
            // If we were in a specific TV show view, restore it
            if (currentTab === 'tvshows' && currentShow) {
                if (currentSeason) {
                    // We were in episodes view
                    console.log('[DEBUG - REFRESH] 🔄 Restoring episodes view for:', currentShow, 'Season:', currentSeason);
                    this.currentTVShow = currentShow;
                    this.currentTVSeason = currentSeason;
                    this.renderEpisodesView();
                    console.log('[DEBUG - REFRESH] ✅ Episodes view restored');
                } else {
                    // We were in seasons view
                    console.log('[DEBUG - REFRESH] 🔄 Restoring seasons view for:', currentShow);
                    this.currentTVShow = currentShow;
                    this.renderSeasonsView(currentShow);
                    console.log('[DEBUG - REFRESH] ✅ Seasons view restored');
                }
            } else {
                console.log('[DEBUG - REFRESH] ℹ️ No TV show view to restore');
            }
            
            console.log('[DEBUG - REFRESH] ✅ Refresh completed successfully');
            this.showToast('Content refreshed successfully!', 'success');
            
        } catch (error) {
            console.error('[DEBUG - REFRESH] ❌ ERROR:', error.message);
            console.error('[DEBUG - REFRESH] ❌ Stack:', error.stack);
            this.showToast(`Error refreshing content: ${error.message}`, 'error');
        } finally {
            // Always hide loading spinner
            this.hideGridSpinner();
            console.log('[DEBUG - REFRESH] 🏁 Refresh operation finished (spinner hidden)');
        }
    }

    attachPosterSelectorHandlers() {
        setTimeout(() => {
            document.querySelectorAll('.poster-selector-btn').forEach(btn => {
                btn.onclick = (e) => { // ensure arrow function
                    e.preventDefault();
                    e.stopPropagation();
                    const card = btn.closest('.media-library-movie-card');
                    let itemPath = card ? card.getAttribute('data-path') : '';
                    let item = null;
                    let errorDetails = '';
                    if (this.currentTab === 'tvshows') {
                        const tvShows = this.getTVShows();
                        item = tvShows.find(show =>
                            (show.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                        );
                        if (!item && card) {
                            // Fallback: try by title
                            const title = card.querySelector('h3')?.textContent?.trim().toLowerCase();
                            item = tvShows.find(show => (show.name || show.title || '').trim().toLowerCase() === title);
                            errorDetails += `\nTried fallback by title: ${title}`;
                        }
                    } else {
                        const items = this.getFilteredAndSortedItems();
                        item = items.find(i =>
                            (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (itemPath || '').replace(/\\/g, '/').toLowerCase().trim()
                        );
                        if (!item && card) {
                            // Fallback: try by title
                            const title = card.querySelector('h3')?.textContent?.trim().toLowerCase();
                            item = items.find(i => (i.title || i.name || '').trim().toLowerCase() === title);
                            errorDetails += `\nTried fallback by title: ${title}`;
                        }
                    }
                    if (window.PosterSelector) {
                        const mode = this.currentTab === 'tvshows' ? 'tv' : 'movie';
                        const fallbackTitle = card?.querySelector('h3')?.textContent || '';
                        const rawTitle = item?.title || item?.name || fallbackTitle;
                        const selector = new window.PosterSelector(mode, { title: this.capitalizeTitle(rawTitle) });
                        selector.getMediaContext = () => {
                            if (item) {
                                return {
                            mediaId: item.path,
                            name: item.name || item.title,
                            path: item.path,
                            type: mode
                                };
                            } else {
                                // Minimal fallback context
                                // --- DEBUG LOGGING FOR PATH MISMATCH ---
                                console.warn('[PosterSelector DEBUG] Fallback context used!');
                                console.warn('[PosterSelector DEBUG] itemPath:', itemPath);
                                if (this.currentTab === 'tvshows') {
                                    const tvShows = this.getTVShows();
                                    console.warn('[PosterSelector DEBUG] Available TV show paths:', tvShows.map(s => s.path));
                                } else {
                                    const items = this.getFilteredAndSortedItems();
                                    console.warn('[PosterSelector DEBUG] Available movie paths:', items.map(i => i.path));
                                }
                                console.warn('[PosterSelector DEBUG] Card HTML:', card ? card.outerHTML : '[none]');
                                // --- END DEBUG LOGGING ---
                                return {
                                    mediaId: itemPath || '[unknown]',
                                    name: fallbackTitle || '[unknown]',
                                    path: itemPath || '[unknown]',
                                    type: mode
                                };
                            }
                        };
                        selector.onPosterSelected = async ({filePath, posterType, poster}) => {
                            // Always reload the full poster mapping after update
                            await this.loadMoviePosters();
                            // Just update heart icons instead of full re-render
                            this.updateHeartIcons();
                            this.showToast('Poster updated!');
                        };
                        selector.init();
                        if (!item) {
                            // Show a warning toast if fallback was used
                            const warnMsg = 'Warning: Movie/Show not found by path. Fallback context used.';
                            this.showToast(warnMsg);
                            // --- ALWAYS LOG ALERTS TO CONSOLE ---
                            console.warn('[PosterSelector ALERT]', warnMsg);
                            console.warn('[PosterSelector DEBUG] itemPath:', itemPath);
                            if (this.currentTab === 'tvshows') {
                                const tvShows = this.getTVShows();
                                console.warn('[PosterSelector DEBUG] Available TV show paths:', tvShows.map(s => s.path));
                    } else {
                                const items = this.getFilteredAndSortedItems();
                                console.warn('[PosterSelector DEBUG] Available movie paths:', items.map(i => i.path));
                            }
                            console.warn('[PosterSelector DEBUG] Card HTML:', card ? card.outerHTML : '[none]');
                        }
                    } else {
                        // Show detailed error info in the alert/toast
                        let details = `PosterSelector is not available or item not found.\n`;
                        details += `itemPath: ${itemPath}\n`;
                        details += `card: ${card ? card.outerHTML : '[none]'}\n`;
                        details += `errorDetails: ${errorDetails}`;
                        this.showToast(details);
                    }
                    return false;
                };
            });
        }, 0);
    }

    async loadMovieCast() {
        if (this.movieCast) return this.movieCast;
        try {
            const response = await fetch('/components/MediaLibrary/data/movies/movie_cast_normalized.json?t=' + Date.now());
            if (response.ok) {
                this.movieCast = await response.json();
                console.log('[CAST DEBUG] Loaded movie cast data with keys:', Object.keys(this.movieCast).filter(k => k.includes('Family')));
                return this.movieCast;
            }
        } catch (error) {
            console.warn('Could not load movie cast:', error);
        }
        this.movieCast = {};
        return this.movieCast;
    }

    attachSeasonArrowHandlers() {
        const wrapper = document.querySelector('.media-library-seasons-arrows-wrapper');
        if (!wrapper) return;
        const grid = wrapper.querySelector('.media-library-seasons-grid');
        if (!grid) return;
        const left = wrapper.querySelector('.media-library-arrow-btn.left');
        const right = wrapper.querySelector('.media-library-arrow-btn.right');
        const scrollAmount = 1080;
        if (left) left.onclick = function(e) {
            e.preventDefault();
            grid.scrollBy({left: -scrollAmount, behavior: 'smooth'});
        };
        if (right) right.onclick = function(e) {
            e.preventDefault();
            grid.scrollBy({left: scrollAmount, behavior: 'smooth'});
        };
    }

    // Attach arrow scroll handlers after render
    attachEpisodeArrowHandlers() {
        const wrapper = document.querySelector('.media-library-episodes-arrows-wrapper');
        if (!wrapper) return;
        const grid = wrapper.querySelector('.media-library-episodes-grid');
        if (!grid) return;
        const left = wrapper.querySelector('.media-library-arrow-episode-btn.left');
        const right = wrapper.querySelector('.media-library-arrow-episode-btn.right');
        const scrollAmount = 1170; // width of 6 cards
        if (left) left.onclick = function(e) {
            e.preventDefault();
            console.log('[EPISODE ARROW] Left arrow clicked');
            grid.scrollBy({left: -scrollAmount, behavior: 'smooth'});
        };
        if (right) right.onclick = function(e) {
            e.preventDefault();
            console.log('[EPISODE ARROW] Right arrow clicked');
            grid.scrollBy({left: scrollAmount, behavior: 'smooth'});
        };
    }

    // Call this after rendering episodes view
    // Example: setTimeout(() => mediaLibraryManager.attachEpisodeArrowHandlers(), 0);

    openMediaManager() {
        console.log('[DEBUG - MEDIA MANAGER] Attempting to open Media Manager...');
        console.log('[DEBUG - MEDIA MANAGER] window.MediaManager exists:', !!window.MediaManager);
        console.log('[DEBUG - MEDIA MANAGER] window.showToast exists:', !!window.showToast);
        
        this.closeMediaLibrary();
        if (window.MediaManager) {
            try {
                console.log('[DEBUG - MEDIA MANAGER] Creating MediaManager instance...');
                const mm = new window.MediaManager();
                console.log('[DEBUG - MEDIA MANAGER] Initializing MediaManager...');
                mm.init();
                console.log('[DEBUG - MEDIA MANAGER] MediaManager initialization started');
            } catch (error) {
                console.error('[DEBUG - MEDIA MANAGER] Error creating/initializing MediaManager:', error);
                if (window.showToast) {
                    window.showToast('Error initializing Media Manager: ' + error.message, 'error', 4000);
                }
            }
        } else {
            console.error('[DEBUG - MEDIA MANAGER] MediaManager component not loaded. window.MediaManager is undefined.');
            if (window.showToast) {
                window.showToast('MediaManager component not loaded.', 'error', 4000);
            } else {
                console.error('MediaManager component not loaded.');
            }
        }
    }

    // Add methods to get total counts
    getTotalMovieCount() {
        return this.mediaLibraryRaw ? this.mediaLibraryRaw.length : 0;
    }

    getTotalTVShowCount() {
        return this.getTVShows().length;
    }

    async loadMovieGenres() {
        try {
            const response = await fetch('/components/MediaLibrary/data/movies/movie_genres_normalized.json?t=' + Date.now());
            if (response.ok) {
                this.movieGenres = await response.json();
                console.log('[DEBUG] Loaded movie_genres_normalized.json with keys:', Object.keys(this.movieGenres).slice(0,5));
            } else {
                this.movieGenres = {};
                console.warn('[DEBUG] Failed to load movie_genres_normalized.json');
            }
        } catch (e) {
            this.movieGenres = {};
            console.warn('[DEBUG] Error loading movie_genres_normalized.json:', e);
        }
    }

    async loadTVGenres() {
      try {
        const response = await fetch('/components/MediaLibrary/data/tv-shows/tv_genres_normalized.json?t=' + Date.now());
        if (response.ok) {
          this.tvGenres = await response.json();
          console.log('[DEBUG] Loaded tv_genres_normalized.json with keys:', Object.keys(this.tvGenres).slice(0,5));
        } else {
          this.tvGenres = {};
          console.warn('[DEBUG] Failed to load tv_genres_normalized.json');
        }
      } catch (e) {
        this.tvGenres = {};
        console.warn('[DEBUG] Error loading tv_genres_normalized.json:', e);
      }
    }

    getTVGenres(show) {
      // Try to get genres from normalized genre file using normalizedKey or name
      if (show.normalizedKey && this.tvGenres && this.tvGenres[show.normalizedKey]) {
        return this.tvGenres[show.normalizedKey].map(g => g.toLowerCase());
      }
      if (show.name && this.tvGenres && this.tvGenres[show.name]) {
        return this.tvGenres[show.name].map(g => g.toLowerCase());
      }
      // Fallbacks as before
      if (Array.isArray(show.genre)) return show.genre.map(g => g.toLowerCase());
      if (Array.isArray(show.genres)) return show.genres.map(g => g.toLowerCase());
      if (typeof show.genre === 'string') return show.genre.toLowerCase().split(/[,/]/).map(g => g.trim());
      if (typeof show.genres === 'string') return show.genres.toLowerCase().split(/[,/]/).map(g => g.trim());
      // Fallback: try to guess from title
      const title = (show.title || '').toLowerCase();
      const genres = this.getCommonGenres().slice(1).map(g => g.toLowerCase());
      return genres.filter(g => title.includes(g));
    }

    getSuggestions() {
        // Return empty array for now - can be implemented later
        return [];
    }



    renderFavoritesContent() {
        // SIMPLE: Just read from localStorage - NO DEPENDENCIES
        const stored = localStorage.getItem('mediaLibraryFavoritesByType');
        let favorites = { movies: [], tvshows: [] };
        if (stored) {
            try { 
                favorites = JSON.parse(stored); 
            } catch (e) {
                console.error('[DEBUG - FAVORITES] Failed to parse localStorage:', e);
            }
        }
        
        const movies = favorites.movies || [];
        const tvshows = favorites.tvshows || [];
        console.log('[DEBUG - FAVORITES] Rendering favorites - Movies:', movies.length, 'TV Shows:', tvshows.length);
        
        // Build the HTML for the favorites view with proper two-column layout
        let html = '<div class="favorites-container" style="display: flex; gap: 20px;">';
        
        // MOVIES SECTION (LEFT SIDE)
        html += '<div class="favorites-movies-section" style="flex: 1;">';
        html += '<h3 class="favorites-section-title-movies">MOVIES</h3>';
        if (movies.length > 0) {
            html += '<div class="media-library-movie-grid">';
            movies.forEach(path => {
                const cleanTitle = this.cleanMovieTitle(path.split(/[\\/]/).pop() || '');
                const displayTitle = this.capitalizeTitle(cleanTitle);
                
                // Create a simple movie object for poster lookup
                const movieObj = { path: path, title: displayTitle };
                // Force movie poster lookup by temporarily setting currentTab
                const originalTab = this.currentTab;
                this.currentTab = 'movies';
                const posterSrc = this.getPosterPath(movieObj);
                this.currentTab = originalTab;
                
                html += `
                    <div class="media-library-movie-card-movies" data-path="${path}">
                        <div class="media-card-actions-favorites">
                            <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                            <button class="favorite-btn favorite-btn-movie" title="Remove from Favorites">❤️</button>
                            <button class="collection-btn" title="Add to Collection">➕</button>
                        </div>
                        <img class="media-library-poster poster" src="${posterSrc}" alt="${displayTitle}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                        <div class="media-info"><h3>${displayTitle}</h3></div>
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += '<div class="favorites-empty-state">No favorited movies</div>';
        }
        html += '</div>';
        
        // TV-SHOWS SECTION (RIGHT SIDE)
        html += '<div class="favorites-tvshows-section" style="flex: 1;">';
        html += '<h3 class="favorites-section-title-tvshows">TV-SHOWS</h3>';
        if (tvshows.length > 0) {
            html += '<div class="media-library-movie-grid">';
            tvshows.forEach(path => {
                // For TV shows, extract the show name from the full path to preserve the year
                const pathParts = path.split(/[\\/]/);
                const tvShowsIndex = pathParts.findIndex(part => part.toLowerCase().includes('tv-shows'));
                let showName = path.split(/[\\/]/).pop() || '';
                
                if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
                    showName = pathParts[tvShowsIndex + 1]; // Get the actual show name with year
                }
                

                
                const displayTitle = this.capitalizeTitle(showName);
                
                // Create a proper TV show object for poster lookup
                const tvShowObj = { 
                    path: path, 
                    name: showName,
                    normalizedKey: window.normalizeKey ? window.normalizeKey(showName) : null
                };
                
                // Force TV show poster lookup by temporarily setting currentTab
                const originalTab = this.currentTab;
                this.currentTab = 'tvshows';
                const posterSrc = this.getPosterPath(tvShowObj);
                this.currentTab = originalTab;
                
                console.log('[DEBUG - FAVORITES] TV Show poster lookup for:', showName, {
                    path: path,
                    showName: showName,
                    normalizedKey: tvShowObj.normalizedKey,
                    posterSrc: posterSrc
                });
                

                
                html += `
                    <div class="media-library-movie-card-tvshows" data-path="${path}">
                        <div class="media-card-actions-tvshows">
                            <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                            <button class="favorite-btn favorite-btn-tv" title="Remove from Favorites">❤️</button>
                            <button class="collection-btn" title="Add to Collection">➕</button>
                        </div>
                        <img class="media-library-poster poster" src="${posterSrc}" alt="${displayTitle}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                        <div class="media-info"><h3 class="media-library-tv-show-title">${displayTitle}</h3></div>
                    </div>
                `;
            });
            html += '</div>';
        } else {
            html += '<div class="favorites-empty-state">No favorited TV shows</div>';
        }
        html += '</div>';
        
        html += '</div>';
        
        return html;
    }

}

export default MediaLibraryManager;