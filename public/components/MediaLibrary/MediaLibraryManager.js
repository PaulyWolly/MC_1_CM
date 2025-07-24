/*
  MEDIALIBRARYMANAGER.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
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
        this.isLoading = false;
        this.videoPlayer = null;
        this.currentVideo = null;
        this.nextVideo = null;
        this.isModalOpen = false;
        this.currentCollectionView = null;
        
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
            'open tv shows',
            'show tv shows',
            'tv show library',
            'browse movies',
            'browse tv shows',
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
        await this.loadMediaLibrary();
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
    }

    async loadMediaLibrary() {
        this.isLoading = true;
        this.renderSpinner();
        try {
            let endpoint = '/api/media-library';
            if (this.currentTab === 'movies') {
                endpoint = '/api/media-library-movies';
            } else if (this.currentTab === 'tvshows') {
                endpoint = '/api/media-library-tv-shows';
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
                // Movies endpoint: { success: true, library: { folders: [...] } }
                if (result && result.library && Array.isArray(result.library.folders)) {
                    raw = result.library.folders;
                } else if (Array.isArray(result)) {
                    raw = result;
                } else {
                    throw new Error('Unrecognized movies media library format');
                }
            } else if (this.currentTab === 'tvshows') {
                // TV shows endpoint: { path: '', folders: [...] }
                if (result && Array.isArray(result.folders)) {
                    raw = result.folders;
                } else if (Array.isArray(result)) {
                    raw = result;
                } else {
                    throw new Error('Unrecognized tvshows media library format');
                }
            } else {
                // Fallback for other tabs
                if (Array.isArray(result)) {
                    raw = result;
                } else if (result && Array.isArray(result.folders)) {
                    raw = result.folders;
                } else if (result && result.library && Array.isArray(result.library.folders)) {
                    raw = result.library.folders;
                } else if (result && result.tvShows && Array.isArray(result.tvShows)) {
                    raw = result.tvShows;
                } else {
                    throw new Error('Unrecognized media library format');
                }
            }
            console.log('🎬 [MEDIA-LIBRARY] Extracted media array:', raw);
            this.mediaLibraryRaw = raw;
            this.isLoading = false;
            this.updateModalContent();
        } catch (error) {
            this.isLoading = false;
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
                console.log(`✅ [MEDIA-LIBRARY] Loaded season images for ${Object.keys(seasonData).length} shows`);
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
        this.isModalOpen = true;
        await this.loadMediaLibrary();
        this.renderModal();
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
        // Always reopen MediaLibrary modal
        if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
            setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
        }
    }

    // Dedicated function to render the tab bar/header
    renderTabBar() {
        const tabs = [
            { id: 'movies', label: 'Movies' },
            { id: 'tvshows', label: 'TV Shows' },
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
        if (this.currentTab === 'tvshows' && this.currentTVShow) {
            this.currentTab = 'tvshows';
        } else if (this.currentTab === 'collections' && this.currentCollectionView) {
            this.currentTab = 'collections';
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
        const getShuffleButtonText = () => {
            switch (this.currentTab) {
                case 'tvshows': return 'Shuffle Shows';
                case 'favorites': return 'Shuffle Favorites';
                case 'collections': return 'Shuffle Collection';
                case 'watchlater': return 'Shuffle Watch Later';
                case 'suggestions': return 'Shuffle Suggestions';
                default: return 'Shuffle';
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
                <button class="media-library-shuffle-btn" onclick="mediaLibraryManager.shuffleMovies()">${getShuffleButtonText()}</button>
                <button class="media-library-refresh-btn" onclick="mediaLibraryManager.refreshCurrentContent()" title="Refresh Content">🔄</button>
              </div>
              <div class="media-library-content-wrapper">
                <div class="media-library-flex-row">
                  <div id="mediaGrid" class="media-library-movie-grid media-library-movie-grid-scroll"></div>
                  <!-- A-Z sidebar will be inserted dynamically -->
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
      
        // After rendering the modal and before calling renderAZSidebar, add:
        if (this.currentTab === 'tvshows' && !this.currentTVShow && !this.currentTVSeason) {
            const grid = document.getElementById('mediaGrid');
            if (grid) {
                grid.innerHTML = this.renderTVShowsTab();
                // Attach click handler to each TV show card using addEventListener (like MOVIE)
                grid.querySelectorAll('.media-library-card.poster').forEach(card => {
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
            this.renderAZSidebar();
            // Update count for TV shows tab
            this.updateCount();
            return;
        }
        if (this.currentTab === 'tvshows' && this.currentTVShow && !this.currentTVSeason) {
          const azSidebar = document.getElementById('mediaLibraryAZSidebar');
          if (azSidebar) azSidebar.style.display = 'none';
        } else {
          const azSidebar = document.getElementById('mediaLibraryAZSidebar');
          if (azSidebar) azSidebar.style.display = '';
        }
        this.renderAZSidebar();
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
        const updateClearBtn = () => {
            if (searchInput.value) {
                clearBtn.style.display = 'flex';
            } else {
                clearBtn.style.display = 'none';
            }
        };
        searchInput.addEventListener('input', updateClearBtn);
        updateClearBtn();
        clearBtn.onclick = (e) => {
            e.preventDefault();
            searchInput.value = '';
            this.handleSearchInput({ target: searchInput });
            updateClearBtn();
            searchInput.focus();
        };
        // --- Add genre dropdown logic ---
        const genreDropdown = document.getElementById('mediaLibraryGenre');
        genreDropdown.innerHTML = '';
        this.getCommonGenres().forEach(g => {
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
        // Dynamically insert the A-Z sidebar only for Movies and TV Shows (main tab)
        const flexRow = modal.querySelector('.media-library-flex-row');
        if (flexRow) {
            let azSidebar = document.getElementById('mediaLibraryAZSidebar');
            if (azSidebar) azSidebar.remove(); // Remove any existing sidebar
            if (this.currentTab === 'movies' || (this.currentTab === 'tvshows' && !this.currentTVShow && !this.currentTVSeason)) {
                azSidebar = document.createElement('div');
                azSidebar.className = 'media-library-az-sidebar';
                azSidebar.id = 'mediaLibraryAZSidebar';
                flexRow.appendChild(azSidebar);
                this.renderAZSidebar();
            }
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
        console.log('[TAB DEBUG] Switching to tab:', tab);

        if (this.currentTab === 'collections') {
            setTimeout(() => this.renderCollectionsTab(), 0);
        }

        this.currentTab = tab;
        this.currentTVShow = null;
        this.currentTVSeason = null;
        
        // Update the search placeholder and shuffle button text for the new tab
        this.updateTabSpecificUI();
        
        // Reload the correct media library data for the selected tab
        this.loadMediaLibrary().then(() => {
            this.renderModal();
            // Force a re-render of the grid if Movies tab is opened
            if (this.currentTab === 'movies') {
                setTimeout(() => this.renderMediaGrid(), 0);
            }
        });
    }

    updateTabSpecificUI() {
        const searchInput = document.getElementById('mediaLibrarySearch');
        const shuffleBtn = document.querySelector('.media-library-shuffle-btn');
        
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
        }
        
        if (shuffleBtn) {
            const getShuffleButtonText = () => {
                switch (this.currentTab) {
                    case 'tvshows': return 'Shuffle Shows';
                    case 'favorites': return 'Shuffle Favorites';
                    case 'collections': return 'Shuffle Collection';
                    case 'watchlater': return 'Shuffle Watch Later';
                    case 'suggestions': return 'Shuffle Suggestions';
                    default: return 'Shuffle';
                }
            };
            shuffleBtn.textContent = getShuffleButtonText();
        }
    }

    async updateModalContent() {
        // Called after modal is rendered, updates the main grid content
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        grid.innerHTML = await this.renderTabContent();
        // --- FIX: Attach movie card click handlers on initial load ---
        if (this.currentTab === 'movies') {
            this.renderMediaGrid();
        }
        // ... existing code ...
    }

    async renderTabContent() {
        console.log('[DEBUG - RenderTabContent] currentTab:', this.currentTab);
        console.log('[DEBUG - RenderTabContent] currentTVShow:', this.currentTVShow);
        console.log('[DEBUG - RenderTabContent] currentTVSeason:', this.currentTVSeason);
        
        switch (this.currentTab) {
            case 'movies':
                console.log('[DEBUG - RenderTabContent] Rendering movies tab');
                return `
                    <div class="media-library-az-sidebar-movies">${this.renderAZSidebar()}</div>
                    ${this.renderMoviesContent()}
                `;
            case 'tvshows':
                if (this.currentTVShow) {
                    if (this.currentTVSeason) {
                        console.log('[DEBUG - RenderTabContent] Rendering episodes view');
                        return this.renderEpisodesView();
                    } else {
                        console.log('[DEBUG - RenderTabContent] Rendering seasons view');
                        return `
                            <div class="media-library-az-sidebar-tvshows">${this.renderAZSidebar()}</div>
                            ${await this.renderSeasonsView(this.currentTVShow)}
                        `;
                    }
                } else {
                    console.log('[DEBUG - RenderTabContent] Rendering TV shows tab');
                    return `
                        <div class="media-library-az-sidebar-tvshows">${this.renderAZSidebar()}</div>
                        ${this.renderTVShowsTab()}
                    `;
                }
            case 'favorites':
                return this.renderFavoritesContent();
            case 'collections':
                return this.renderCollectionsTab();
            case 'suggestions':
                return this.renderSuggestionsContent();
            case 'watchlater':
                return this.renderWatchLaterContent();
            default:
                return this.renderMoviesContent();
        }
    }

    renderMediaGrid() {
        console.log('>> 1. >>>>[MOVIE-LIBRARY] renderMediaGrid called');

        // Show spinner overlay while images load
        this.showGridSpinner();

        if (this.currentTab === 'tvshows' && !this.currentTVShow && !this.currentTVSeason) {
            const grid = document.getElementById('mediaGrid');
            if (grid) {
                grid.innerHTML = this.renderTVShowsTab();
                // Attach click handler to TV show poster images
                grid.querySelectorAll('.tvshow-poster-img').forEach(img => {
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
            }
            this.hideGridSpinner();
            // Update count for TV shows tab
            this.updateCount();
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
                <div class="media-card-actions">
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
        if (this.currentTab === 'movies') {
            items = this.mediaLibraryRaw || [];
            console.log('[MOVIE DEBUG] Raw movies array:', items.slice(0, 5));
        } else if (this.currentTab === 'tvshows') {
            items = this.getTVShows();
        }
        // ... existing code ...
        return items;
    }

    getPosterPath(mediaItem) {
        // Use shared normalization service
        const normalizeKey = window.normalizeKey || ((name) => {
            return name
                .replace(/\\/g, '/')
                .replace(/\s*&\s*/g, '.&.') // preserve ampersand as dot-ampersand-dot
                .replace(/\s+/g, '.')
                .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
                .replace(/\.+/g, '.')
                .replace(/^\.|\.$/g, '');
        });
        
        if (!mediaItem) {
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // Use correct poster map for movies vs TV shows
        const isTV = (this.currentTab === 'tvshows');
        const posterMap = isTV ? this.tvPosters : this.moviePosters;
        
        if (!posterMap) {
            console.warn('[MEDIA-LIBRARY] No poster map available for current tab:', this.currentTab);
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // For TV shows, prefer the name property, then fallback to path extraction
        let showName = null;
        if (isTV) {
            showName = mediaItem.name || mediaItem.title || mediaItem.filename;
            if (!showName && mediaItem.path) {
                // Extract show name from path (e.g., "TV-SHOWS/Daisy Jones & The Six" -> "Daisy Jones & The Six")
                showName = mediaItem.path.split(/[\\/]/).pop();
            }
        } else {
            // For movies, extract folder name from path
            if (mediaItem.path) {
                showName = mediaItem.path.split(/[\\/]/).pop();
            }
        }
        
        if (!showName) {
            console.warn('[MEDIA-LIBRARY] No show name found for:', mediaItem);
            return '/assets/img/placeholder-poster.jpg';
        }
        
        const dotKey = normalizeKey(showName);
        console.log('[MEDIA-LIBRARY] Looking for poster with key:', dotKey, 'for show:', showName);
        
        // Try exact match first
        if (posterMap[dotKey]) {
            let url = posterMap[dotKey];
            if (this.cacheBusters && this.cacheBusters[dotKey]) {
                url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[dotKey];
            }
            console.log('[MEDIA-LIBRARY] Found poster with exact match:', url);
            return url;
        }
        
        // Case-insensitive fallback
        const lowerDotKey = dotKey.toLowerCase();
        for (const key of Object.keys(posterMap)) {
            if (key.toLowerCase() === lowerDotKey) {
                let url = posterMap[key];
                if (this.cacheBusters && this.cacheBusters[key]) {
                    url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[key];
                }
                console.log('[MEDIA-LIBRARY] Found poster with case-insensitive match:', url);
                return url;
            }
        }
        
        // Log a warning if no poster found
        console.warn('[MEDIA-LIBRARY] No poster found for:', mediaItem, 'Tried dot notation key:', dotKey);
        console.warn('[MEDIA-LIBRARY] Available poster keys:', Object.keys(posterMap));
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
        this.closeMediaBrowser();
        await this.waitForVideoPlayerReady(); // Ensure player is ready before playback
        if (!this.videoPlayer) {
            console.error('🎬 [MEDIA-LIBRARY] VideoPlayer not available');
            if (window.addMessageToChat) {
                window.addMessageToChat('assistant', '❌ Video player not available. Please try again.');
            }
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

        // Add overlays/buttons as needed (Up Next, Skip Intro, etc.)
        let upNextOverlay = document.getElementById('upNextOverlay');
        if (!upNextOverlay) {
            upNextOverlay = document.createElement('div');
            upNextOverlay.id = 'upNextOverlay';
            upNextOverlay.className = 'up-next-overlay';
            upNextOverlay.style.display = 'none';
            upNextOverlay.innerHTML = `
                <div class="up-next-content">
                    <h3>Up Next</h3>
                    <div id="nextVideoInfo"></div>
                    <div class="up-next-buttons">
                        <button id="playNextBtn" class="btn btn-primary">Play Now</button>
                        <button id="cancelNextBtn" class="btn btn-secondary">Cancel</button>
                    </div>
                </div>
            `;
            playerContainer.appendChild(upNextOverlay);
        }
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
            if (duration && currentTime > duration - 30) {
                this.showUpNextOverlay();
            }
            const skipToNextBtn = document.getElementById('skipToNextBtn');
            if (skipToNextBtn) {
                if (duration && (duration - currentTime <= 120) && this.nextVideo) {
                    skipToNextBtn.style.display = 'block';
                } else {
                    skipToNextBtn.style.display = 'none';
                }
            }
        });
        player.on('ended', () => {
            // Always reopen MediaLibrary modal when video ends
            if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
                setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
            }
            // Hide skip to next button on end
            const skipToNextBtn = document.getElementById('skipToNextBtn');
            if (skipToNextBtn) skipToNextBtn.style.display = 'none';
        });
        // Patch player close event to always reopen MediaLibrary
        player.on('close', () => {
            if (window.mediaLibraryManager && typeof window.mediaLibraryManager.openMediaBrowser === 'function') {
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
                    window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
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
                        window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
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
                    window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
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
                        window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
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
                window.addMessageToChat('assistant', '🎬 Opening media library... Browse your movies and TV shows.');
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
        countSpan.textContent = `${items.length} Items`;
        countSpan.style.display = '';
    }

    // Add/Update: Search and sort UI state
    restoreSearchSortUI() {
        const searchInput = document.getElementById('mediaLibrarySearch');
        if (searchInput) searchInput.value = this.searchQuery || '';
        const sortSelect = document.getElementById('mediaLibrarySort');
        if (sortSelect) sortSelect.value = this.sortBy || 'asc';
    }

    // Add: Search and sort state
    searchQuery = '';

    handleSearchInput(event) {
        this.searchQuery = event.target.value;
        // Use updateModalContent to handle all tabs including TV Shows
        this.updateModalContent();
        this.updateCount();
    }

    handleSortChange(event) {
        this.sortBy = event.target.value;
        // Use updateModalContent to handle all tabs including TV Shows
        this.updateModalContent();
        this.updateCount();
    }

    shuffleMovies() {
        this.shuffle = true;
        // Use updateModalContent to handle all tabs including TV Shows
        this.updateModalContent();
        this.updateCount();
        this.shuffle = false;
    }

    // Add: A-Z sidebar rendering
    renderAZSidebar() {
        const azSidebar = document.getElementById('mediaLibraryAZSidebar');
        if (!azSidebar) return;
        azSidebar.innerHTML = '';
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        letters.forEach(letter => {
            const btn = document.createElement('div');
            btn.className = 'media-library-az-letter';
            btn.textContent = letter;
            btn.setAttribute('data-letter', letter);
            azSidebar.appendChild(btn);
        });
        // Use event delegation - single listener on the sidebar
        azSidebar.onclick = (e) => { // ensure arrow function
            const letterElement = e.target.closest('.media-library-az-letter');
            if (letterElement) {
                const letter = letterElement.getAttribute('data-letter');
                if (letter) {
                    if (this.currentTab === 'movies') {
                        this.scrollToLetterMovies(letter);
                    } else if (this.currentTab === 'tvshows') {
                        this.scrollToLetterTVShows(letter);
                    }
                }
            }
        };
    }

scrollToLetterMovie(letter) {
        console.log('🔤 [A-Z] scrollToLetterMovie called with letter:', letter);
        // Find the anchor for this letter (movies use .media-library-anchor)
        const anchor = document.querySelector(`.media-library-anchor[data-anchor="${letter}"]`);
        // Highlight the active letter in the A-Z sidebar
        const azSidebar = document.getElementById('mediaLibraryAZSidebar');
        if (azSidebar) {
            azSidebar.querySelectorAll('.media-library-az-letter').forEach(btn => btn.classList.remove('az-active'));
            const activeBtn = azSidebar.querySelector(`.media-library-az-letter[data-letter='${letter}']`);
            if (activeBtn) activeBtn.classList.add('az-active');
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
        // Match the movie logic: scroll to the card with data-anchor
        const anchor = document.querySelector(`.media-library-card.poster[data-anchor="${letter}"]`);
        const azSidebar = document.getElementById('mediaLibraryAZSidebar');
        if (azSidebar) {
            azSidebar.querySelectorAll('.media-library-az-letter').forEach(btn => btn.classList.remove('az-active'));
            const activeBtn = azSidebar.querySelector(`.media-library-az-letter[data-letter='${letter}']`);
            if (activeBtn) activeBtn.classList.add('az-active');
        }
        if (anchor) {
            anchor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            anchor.style.transition = 'background 0.3s';
            const originalBg = anchor.style.background;
            anchor.style.background = '#fff9c4';
            setTimeout(() => {
                anchor.style.background = originalBg || '';
            }, 600);
            console.log('🔤 [A-Z] Found and scrolled to TV card for letter:', letter);
        } else {
            console.warn('🔤 [A-Z] No TV show anchor found for letter:', letter);
        }
    }

    // Update: renderMediaGrid to use search, sort, shuffle
    getFilteredAndSortedItems() {
        const items = this.getItemsForCurrentTab();
        console.log('[MOVIE DEBUG] Items before filtering:', items.length, items.slice(0, 3));
        let filtered = this.filterItems(items, this.searchQuery);
        console.log('[MOVIE DEBUG] Items after filtering:', filtered.length, filtered.slice(0, 3));
        // For movies, sort by clean display title; for TV shows, keep as is
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
                        console.log('[WATCH-LATER] Resume clicked for:', item);
                        this.playMedia(item, item.currentTime);
                    });
                    
                    // Delete button click handler
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        console.log('[WATCH-LATER] Delete clicked for:', item);
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
        const resumeList = this.getResumeList();
        // Separate movies and TV shows
        const tvshows = resumeList.filter(item => {
            if (item.type) return item.type.toLowerCase().includes('tv') || item.type.toLowerCase().includes('show');
            if (item.path) return /season\s*\d+|s\d+e\d+/i.test(item.path);
            return false;
        });
        const movies = resumeList.filter(item => !tvshows.includes(item));
        // Helper for TV show label and screenshot
        function getTvShowLabel(item) {
            let path = decodeURIComponent(item.path || '');
            // Try to extract show name and SxxExx
            let show = '', code = '';
            // Try to match 'TV-SHOWS/Show/Season 01/Show S01E02 ...'
            let match = path.match(/TV-?SHOWS[\\/](.*?)[\\/].*?[Ss](\d{2})[Ee](\d{2})/i);
            if (match) {
                show = match[1].replace(/_/g, ' ').trim();
                code = `S${match[2]}E${match[3]}`;
            } else {
                // Fallback: try to extract from filename
                let file = path.split(/[\\/]/).pop();
                let epMatch = file.match(/[Ss](\d{2})[Ee](\d{2})/i);
                if (epMatch) {
                    code = `S${epMatch[1]}E${epMatch[2]}`;
                }
                // Try to get show from parent folder
                let parts = path.split(/[\\/]/);
                if (parts.length > 2) show = parts[parts.length - 3].replace(/_/g, ' ').trim();
            }
            if (show && code) return `${show}: ${code}`;
            return item.title || item.name || 'Episode';
        }
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
                <div class="watch-later-section-title">TV Shows</div>
                <hr class="watch-later-section-divider">
                <div class="watch-later-scroll">
                    <div class="watch-later-grid">
                        ${tvshows.map(item => `
                            <div class="media-library-movie-card-tvshows watch-later-card" data-path="${item.path}">
                                <img class="watch-later-img-tv watch-later-img watch-later-img-clickable" src="${getTvShowScreenshot(item, this)}" alt="${getTvShowLabel(item)}" onerror="this.onerror=null;this.src='/assets/img/placeholder-poster.jpg';">
                                ${item.lastWatched ? `<div class="watch-later-timestamp">Last watched: ${this.formatDateTime(item.lastWatched)}<br><span class=\"watch-later-resume-info\">Resume from ${this.formatTime(item.currentTime)}</span></div>` : ''}
                                <div class="media-info"><h3 class="watch-later-title">${getTvShowLabel(item)}</h3></div>
                                <div class="watch-later-btn-row">
                                    <button class="watch-later-resume-btn">Watch</button>
                                    <button class="watch-later-delete-btn">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
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
            // Attach resume and delete handlers for both columns
            setTimeout(() => {
                console.log('[DEBUG - WATCH-LATER] Setting up event handlers...');
                const resumeButtons = document.querySelectorAll('.watch-later-resume-btn');
                console.log('[DEBUG - WATCH-LATER] Found', resumeButtons.length, 'resume buttons');
                
                resumeButtons.forEach((btn, index) => {
                    console.log('[DEBUG - WATCH-LATER] Setting up button', index, 'with path:', btn.closest('.watch-later-card')?.getAttribute('data-path'));
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        console.log('[DEBUG - WATCH-LATER] Resume button clicked!');
                        // Use .watch-later-card to match both movie and tvshow cards
                        const card = btn.closest('.watch-later-card');
                        const path = card ? card.getAttribute('data-path') : null;
                        console.log('[DEBUG - WATCH-LATER] Resume clicked, resolved path:', path);
                        const item = resumeList.find(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (path || '').replace(/\\/g, '/').toLowerCase().trim());
                        if (item) {
                            if (tvshows.includes(item)) {
                                // TV episode: look up relPath in main TV shows data
                                const tvData = window.mediaLibraryManager?.mediaLibraryRaw || [];
                                console.log('[DEBUG - WATCH-LATER] TV data structure:', tvData);
                                console.log('[DEBUG - WATCH-LATER] TV data type:', typeof tvData);
                                console.log('[DEBUG - WATCH-LATER] TV data length:', Array.isArray(tvData) ? tvData.length : 'not array');
                                console.log('[DEBUG - WATCH-LATER] TV data keys:', tvData ? Object.keys(tvData) : 'no keys');
                                console.log('[DEBUG - WATCH-LATER] TV data folders:', tvData?.folders);
                                console.log('[DEBUG - WATCH-LATER] TV data folders type:', typeof tvData?.folders);
                                console.log('[DEBUG - WATCH-LATER] TV data folders length:', Array.isArray(tvData?.folders) ? tvData.folders.length : 'not array');
                                let foundEpisode = null;
                                function searchFolders(folders) {
                                    console.log('[DEBUG - WATCH-LATER] Searching for item.path:', item.path);
                                    
                                    // Extract relative path from absolute path if needed
                                    let searchPath = (item.path || '').replace(/\\/g, '/').trim();
                                    const lowerPath = searchPath.toLowerCase();
                                    if (lowerPath.includes(':/media/tv-shows/')) {
                                        const parts = searchPath.split('/');
                                        const mediaIndex = parts.findIndex(part => part.toLowerCase() === 'media');
                                        if (mediaIndex !== -1 && parts[mediaIndex + 1] && parts[mediaIndex + 1].toLowerCase() === 'tv-shows') {
                                            searchPath = parts.slice(mediaIndex + 2).join('/');
                                            console.log('[DEBUG - WATCH-LATER] Extracted relative path:', searchPath);
                                        }
                                    }
                                    
                                    for (const show of folders) {
                                        if (show.folders) {
                                            for (const season of show.folders) {
                                                if (season.files) {
                                                    for (const ep of season.files) {
                                                        const epPath = (ep.relPath || '').replace(/\\/g, '/').trim();
                                                        console.log('[DEBUG - WATCH-LATER] Comparing:', epPath, 'vs', searchPath);
                                                        if (epPath === searchPath) {
                                                            foundEpisode = ep;
                                                            console.log('[DEBUG - WATCH-LATER] Found matching episode:', ep);
                                                            return;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    // Debug: Log all episodes in the TV data to see what's available
                                    console.log('[DEBUG - WATCH-LATER] All episodes in TV data:');
                                    for (const show of folders) {
                                        if (show.folders) {
                                            for (const season of show.folders) {
                                                if (season.files) {
                                                    for (const ep of season.files) {
                                                        console.log('[DEBUG - WATCH-LATER] Episode:', ep.relPath, '|', ep.filePath);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    console.log('[DEBUG - WATCH-LATER] No matching episode found');
                                }
                                searchFolders(tvData.folders || tvData);
                                if (foundEpisode && foundEpisode.filePath) {
                                    console.log('[DEBUG - WATCH-LATER] Found episode filePath:', foundEpisode.filePath);
                                    this.playEpisode(foundEpisode.filePath, item.currentTime || 0);
                                } else if (foundEpisode && foundEpisode.relPath) {
                                    console.log('[DEBUG - WATCH-LATER] Found episode relPath:', foundEpisode.relPath);
                                    this.playEpisode(foundEpisode.relPath, item.currentTime || 0);
                                } else {
                                    console.warn('[DEBUG - WATCH-LATER] Could not find episode in main TV data, falling back to item.path:', item.path);
                                    console.warn('[DEBUG - WATCH-LATER] TV data structure:', JSON.stringify(tvData, null, 2));
                                    this.playEpisode(item.path, item.currentTime || 0);
                                }
                            } else {
                                // Movie: playMedia
                                console.log('[DEBUG - WATCH-LATER] Calling playMedia with:', item.path, item.currentTime);
                                this.playMedia(item, item.currentTime);
                            }
                        } else {
                            console.warn('[DEBUG - WATCH-LATER] No matching item found for path:', path);
                    }
                };
                });
                document.querySelectorAll('.watch-later-delete-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        // Use .watch-later-card to match both movie and tvshow cards
                        const card = btn.closest('.watch-later-card');
                        const path = card ? card.getAttribute('data-path') : null;
                        this.removeResumeProgress(path);
                        this.renderWatchLaterContent();
                        this.showToast('Removed from Watch Later');
                };
                });
                const clickableImages = document.querySelectorAll('.watch-later-img-clickable');
                console.log('[DEBUG - WATCH-LATER] Found', clickableImages.length, 'clickable images');
                
                clickableImages.forEach((img, index) => {
                    console.log('[DEBUG - WATCH-LATER] Setting up image', index, 'with path:', img.closest('.watch-later-card')?.getAttribute('data-path'));
                                            img.onclick = async (e) => {
                            e.stopPropagation();
                            console.log('[DEBUG - WATCH-LATER] Image clicked!');
                            const card = img.closest('.watch-later-card');
                            const path = card ? card.getAttribute('data-path') : null;
                            console.log('[DEBUG - WATCH-LATER] Image click, resolved path:', path);
                            const item = resumeList.find(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (path || '').replace(/\\/g, '/').toLowerCase().trim());
                            console.log('[DEBUG - WATCH-LATER] Found item:', item);
                            console.log('[DEBUG - WATCH-LATER] TV shows array:', tvshows);
                            console.log('[DEBUG - WATCH-LATER] Item in tvshows:', item ? tvshows.includes(item) : 'no item');
                            if (item) {
                            if (tvshows.includes(item)) {
                                console.log('[DEBUG - WATCH-LATER] Entering TV show handling (img click)');
                                const tvData = window.mediaLibraryManager?.mediaLibraryRaw || [];
                                console.log('[DEBUG - WATCH-LATER] TV data structure (img click):', tvData);
                                console.log('[DEBUG - WATCH-LATER] TV data type (img click):', typeof tvData);
                                console.log('[DEBUG - WATCH-LATER] TV data length (img click):', Array.isArray(tvData) ? tvData.length : 'not array');
                                console.log('[DEBUG - WATCH-LATER] TV data keys (img click):', tvData ? Object.keys(tvData) : 'no keys');
                                console.log('[DEBUG - WATCH-LATER] TV data folders (img click):', tvData?.folders);
                                console.log('[DEBUG - WATCH-LATER] TV data folders type (img click):', typeof tvData?.folders);
                                console.log('[DEBUG - WATCH-LATER] TV data folders length (img click):', Array.isArray(tvData?.folders) ? tvData.folders.length : 'not array');
                                
                                // If TV data is empty, try to load it first
                                if (!tvData || (Array.isArray(tvData) && tvData.length === 0)) {
                                    console.log('[DEBUG - WATCH-LATER] TV data is empty, attempting to load TV shows...');
                                    try {
                                        await window.mediaLibraryManager?.loadMediaLibrary();
                                        const freshTvData = window.mediaLibraryManager?.mediaLibraryRaw || [];
                                        console.log('[DEBUG - WATCH-LATER] Fresh TV data loaded:', freshTvData);
                                        if (freshTvData && freshTvData.length > 0) {
                                            // Use the fresh data
                                            searchTVShows(freshTvData);
                                            return;
                                        }
                                    } catch (error) {
                                        console.error('[DEBUG - WATCH-LATER] Failed to load TV data:', error);
                                    }
                                }
                                let foundEpisode = null;
                                function searchTVShows(tvData) {
                                    console.log('[DEBUG - WATCH-LATER] Searching for item.path (img click):', item.path);
                                    
                                    // Extract relative path from absolute path if needed
                                    let searchPath = (item.path || '').replace(/\\/g, '/').trim();
                                    const lowerPath = searchPath.toLowerCase();
                                    if (lowerPath.includes(':/media/tv-shows/')) {
                                        const parts = searchPath.split('/');
                                        const mediaIndex = parts.findIndex(part => part.toLowerCase() === 'media');
                                        if (mediaIndex !== -1 && parts[mediaIndex + 1] && parts[mediaIndex + 1].toLowerCase() === 'tv-shows') {
                                            searchPath = parts.slice(mediaIndex + 2).join('/');
                                            console.log('[DEBUG - WATCH-LATER] Extracted relative path:', searchPath);
                                        }
                                    }
                                    
                                    // Get TV shows from the raw data
                                    const tvShows = window.mediaLibraryManager?.getTVShows() || [];
                                    console.log('[DEBUG - WATCH-LATER] Found', tvShows.length, 'TV shows to search through');
                                    console.log('[DEBUG - WATCH-LATER] TV show names:', tvShows.map(show => show.name));
                                    
                                    for (const tvShow of tvShows) {
                                        if (tvShow.data) {
                                            const show = tvShow.data;
                                            const showName = show.title || show.name || show.path;
                                            
                                            // Only search in shows that might match our episode
                                            const searchShowName = searchPath.split('/')[0]; // Get show name from search path
                                            if (showName.toLowerCase().includes(searchShowName.toLowerCase()) || 
                                                searchShowName.toLowerCase().includes(showName.toLowerCase())) {
                                                console.log('[DEBUG - WATCH-LATER] Searching in show:', showName);
                                                
                                                // Check if this show has seasons
                                                if (show.seasons && Array.isArray(show.seasons)) {
                                                    for (const season of show.seasons) {
                                                        if (season.episodes && Array.isArray(season.episodes)) {
                                                            for (const ep of season.episodes) {
                                                                const epPath = (ep.relPath || ep.path || '').replace(/\\/g, '/').trim();
                                                                console.log('[DEBUG - WATCH-LATER] Comparing (img click):', epPath, 'vs', searchPath);
                                                                if (epPath === searchPath) {
                                                                    foundEpisode = ep;
                                                                    console.log('[DEBUG - WATCH-LATER] Found matching episode (img click):', ep);
                                                                    return;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                                
                                                // Fallback to folder-based structure
                                                if (show.folders && Array.isArray(show.folders)) {
                                                    for (const season of show.folders) {
                                                        if (season.files && Array.isArray(season.files)) {
                                                            for (const ep of season.files) {
                                                                const epPath = (ep.relPath || ep.path || '').replace(/\\/g, '/').trim();
                                                                console.log('[DEBUG - WATCH-LATER] Comparing (img click):', epPath, 'vs', searchPath);
                                                                if (epPath === searchPath) {
                                                                    foundEpisode = ep;
                                                                    console.log('[DEBUG - WATCH-LATER] Found matching episode (img click):', ep);
                                                                    return;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    
                                    console.log('[DEBUG - WATCH-LATER] No matching episode found (img click)');
                                }
                                searchTVShows(tvData);
                                if (foundEpisode && foundEpisode.filePath) {
                                    console.log('[DEBUG - WATCH-LATER] Found episode filePath (img click):', foundEpisode.filePath);
                                    this.playEpisode(foundEpisode.filePath, item.currentTime || 0);
                                } else if (foundEpisode && foundEpisode.relPath) {
                                    console.log('[DEBUG - WATCH-LATER] Found episode relPath (img click):', foundEpisode.relPath);
                                    this.playEpisode(foundEpisode.relPath, item.currentTime || 0);
                                } else {
                                    console.warn('[DEBUG - WATCH-LATER] Could not find episode in main TV data (img click), falling back to item.path:', item.path);
                                    this.playEpisode(item.path, item.currentTime || 0);
                                }
                            } else {
                                this.playMedia(item, item.currentTime);
                            }
                        }
                    };
                });
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
            (item.path && item.path.toLowerCase().includes(term))
        );
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

    renderTVShowsTab() {
        const sortedShows = this.getFilteredAndSortedItems();
        const addedAnchors = new Set();
        let html = '<div class="media-library-movie-grid">';
        sortedShows.forEach(show => {
            const cleanTitle = this.cleanMovieTitle(show.name || show.title || show.filename || show.path || '');
            const displayTitle = this.capitalizeTitle(cleanTitle);
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            let anchorAttr = '';
            if (!addedAnchors.has(firstLetter)) {
                anchorAttr = ` data-anchor="${firstLetter}"`;
                addedAnchors.add(firstLetter);
            }
            html += `
                <div class="media-library-card poster"${anchorAttr} data-path="${show.path}" data-show-name="${show.name || show.title || ''}">
                  <div class="media-card-actions">
                    <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                    <button class="favorite-btn" title="Toggle Favorite">${this.isFavorite(show.path) ? '❤️' : '🩷'}</button>
                    <button class="collection-btn" title="Add to Collection">➕</button>
                  </div>
                  <img class="media-library-poster poster" src="${this.getPosterPath(show)}" alt="${show.name}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                  <div class="media-info"><h3>${displayTitle}</h3></div>
                </div>
            `;
        });
        html += '</div>';
        // Insert the A-Z sidebar inside the grid container
        html = `<div class="media-library-grid-container">
            <div id="mediaLibraryAZSidebar" class="media-library-az-sidebar"></div>
            ${html}
        </div>`;
        
        // Update the count after rendering TV shows tab
        setTimeout(() => this.updateCount(), 0);
        
        return html;
    }

    closeModal() {
        // Remove the modal from the DOM
        const modal = document.querySelector('.media-library-modal');
        if (modal) modal.remove();
    }

    // --- FAVORITES LOGIC ---
    isFavorite(path) {
        const favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        return (favs.movies || []).includes(path) || (favs.tvshows || []).includes(path);
    }
    toggleFavorite(path, type) {
        let favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        if (!favs.movies) favs.movies = [];
        if (!favs.tvshows) favs.tvshows = [];
        const list = (type === 'tv' || type === 'tvshow' || type === 'tvshows') ? favs.tvshows : favs.movies;
        if (list.includes(path)) {
            favs.movies = favs.movies.filter(p => p !== path);
            favs.tvshows = favs.tvshows.filter(p => p !== path);
        } else {
            if (type === 'tv' || type === 'tvshow' || type === 'tvshows') {
                favs.tvshows.push(path);
            } else {
                favs.movies.push(path);
            }
        }
        localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(favs));
        this.renderMediaGrid();
    }
    getFavoritesList() {
        const favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        return {
            movies: this.mediaLibrary.filter(item => (favs.movies || []).includes(item.path)),
            tvshows: this.mediaLibrary.filter(item => (favs.tvshows || []).includes(item.path)),
        };
    }
    renderFavoritesContent() {
        const { movies, tvshows } = this.getFavoritesList();
        const html = `
        <div class="watch-later-flex-container">
            <div class="watch-later-column">
                <div class="watch-later-section-title">Favorited MOVIES</div>
                <hr class="watch-later-section-divider">
                <div class="watch-later-scroll">
                    <div class="watch-later-grid">
                        ${movies.map(item => `
                            <div class="media-library-movie-card-movies watch-later-card" data-path="${item.path}">
                                <img class="watch-later-img-movie watch-later-img watch-later-img-clickable" src="${this.getPosterPath(item)}" alt="${item.title}">
                                <div class="media-info"><h3 class="watch-later-title">${this.cleanMovieTitle(item.title || item.name || 'Movie')}</h3></div>
                                <div class="watch-later-btn-row">
                                    <button class="favorite-btn" title="Toggle Favorite">❤️</button>
                                </div>
                            </div>
                        `).join('')}
                        ${movies.length === 0 ? '<div class="watch-later-empty">(No items)</div>' : ''}
                    </div>
                </div>
            </div>
            <div class="watch-later-column">
                <div class="watch-later-section-title">Favorited TV-SHOWS</div>
                <hr class="watch-later-section-divider">
                <div class="watch-later-scroll">
                    <div class="watch-later-grid">
                        ${tvshows.map(item => `
                            <div class="media-library-movie-card-tvshows watch-later-card" data-path="${item.path}">
                                <img class="watch-later-img-tv watch-later-img watch-later-img-clickable" src="${this.getPosterPath(item)}" alt="${item.title}">
                                <div class="media-info"><h3 class="watch-later-title">${this.cleanMovieTitle(item.title || item.name || 'Show')}</h3></div>
                                <div class="watch-later-btn-row">
                                    <button class="favorite-btn" title="Toggle Favorite">❤️</button>
                                </div>
                            </div>
                        `).join('')}
                        ${tvshows.length === 0 ? '<div class="watch-later-empty">(No items)</div>' : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
        setTimeout(() => {
            document.querySelectorAll('.media-library-movie-card-movies .favorite-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.media-library-movie-card-movies');
                    const path = card ? card.getAttribute('data-path') : null;
                    this.toggleFavorite(path, 'movie');
                };
            });
            document.querySelectorAll('.media-library-movie-card-tvshows .favorite-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.media-library-movie-card-tvshows');
                    const path = card ? card.getAttribute('data-path') : null;
                    this.toggleFavorite(path, 'tv');
                };
            });
        }, 0);
        return html;
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
        const grid = document.getElementById('mediaGrid');
            if (!grid) {
                const modalContent = document.querySelector('.media-library-modal-content');
                if (modalContent) {
                    modalContent.innerHTML += '<div style="color:red;font-size:2em;">[COLLECTIONS ERROR] mediaGrid not found</div>';
                }
                console.error('[COLLECTIONS ERROR] mediaGrid not found');
                return '';
            }
        grid.innerHTML = '';
            grid.style.display = 'block'; // Ensure block layout, not flex row
            const collections = this.getCollections();
            const names = Object.keys(collections);
        // If viewing a specific collection, show its movies
        if (this.currentCollectionView) {
            const moviePaths = collections[this.currentCollectionView] || [];
                const normalize = p => (p || '').replace(/\\/g, '/').toLowerCase();
                const normalizedMoviePaths = moviePaths.map(normalize);
                const movies = this.mediaLibrary.filter(item => normalizedMoviePaths.includes(normalize(item.path)));
                
            // Header with back and delete (refactored layout)
            const header = document.createElement('div');
            header.style.cssText = `
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 24px;
              padding: 12px 18px 12px 0;
              border-bottom: 1px solid #eee;
              background: #fafbfc;
              border-radius: 10px 10px 0 0;
            `;
            header.innerHTML = `
              <div style="display: flex; align-items: center; gap: 14px;">
                <button id="backToCollectionsBtn" style="padding:6px 16px;border-radius:6px;background:#eee;color:#333;border:none;cursor:pointer;font-size:1em;">← Back</button>
                <h3 style="margin:0;font-size:1.2em;">${this.currentCollectionView}</h3>
              </div>
              <button id="deleteCollectionBtn" style="padding:6px 16px;border-radius:6px;background:#e53935;color:#fff;border:none;cursor:pointer;font-size:1em;">Delete Collection</button>
            `;
            
            grid.appendChild(header);
            header.querySelector('#backToCollectionsBtn').onclick = () => {
                this.currentCollectionView = null;
                this.renderCollectionsTab();
            };
            header.querySelector('#deleteCollectionBtn').onclick = async () => {
                await window.ConfirmModal.init();
                window.ConfirmModal.open({
                    message: `Are you sure you want to delete the collection "${this.currentCollectionView}"? This cannot be undone.`,
                    onConfirm: () => {
                        delete collections[this.currentCollectionView];
                        this.saveCollections(collections);
                        this.currentCollectionView = null;
                        this.showToast('Collection deleted!');
                        this.renderCollectionsTab();
                    }
                });
            };

            // Movie grid
            const movieGrid = document.createElement('div');
            movieGrid.className = 'media-library-movie-grid';
            movies.forEach(item => {
                const card = document.createElement('div');
                card.className = 'media-library-movie-card';
                card.style.position = 'relative';
                card.innerHTML = `
                    ${anchorHTML}
                    <div class="media-library-movie-card" data-path="${(item.path || '').replace(/\\/g, '/').toLowerCase().trim()}" data-show-name="${item.title || item.name || ''}" style="position:relative;">
                      <div class="media-card-actions" style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding:6px 10px 0 10px;">
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
                `;
                card.querySelector('.remove-from-collection-btn').onclick = async (e) => {
                    e.stopPropagation();
                    await window.ConfirmModal.init();
                    window.ConfirmModal.open({
                        message: 'Are you sure you want to remove this item from the collection?',
                        onConfirm: () => {
                            collections[this.currentCollectionView] = collections[this.currentCollectionView].filter(p => p !== item.path);
                            this.saveCollections(collections);
                            this.showToast('Removed from collection!');
                            this.renderCollectionsTab();
                        }
                    });
                };
                card.onclick = () => this.playMedia(item);
                movieGrid.appendChild(card);
            });
            grid.appendChild(movieGrid);
            if (movies.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding:40px;text-align:center;color:#888;font-size:1.1em;';
                empty.textContent = 'No movies in this collection yet.';
                grid.appendChild(empty);
            }
        } else {
                // Always show all collections if not viewing a specific one
            if (names.length === 0) {
                grid.innerHTML = '<div style="padding:40px;text-align:center;color:#888;font-size:1.1em;">No collections yet.<br>Add movies to a collection using the ➕ icon.</div>';
                    return grid.innerHTML;
            }
            const list = document.createElement('div');
            list.style.cssText = 'display:flex;flex-wrap:wrap;gap:24px;padding:24px 0;';
            names.forEach(name => {
                const btn = document.createElement('button');
                btn.textContent = name;
                btn.style.cssText = 'padding:28px 36px;border-radius:12px;background:#f5f5f5;color:#1976d2;font-size:1.1em;font-weight:bold;border:none;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.08);transition:background 0.2s;';
                btn.onclick = () => {
                    this.currentCollectionView = name;
                    this.renderCollectionsTab();
                };
                list.appendChild(btn);
            });
            grid.appendChild(list);
            }
            return grid.innerHTML;
        } catch (e) {
            console.error('[COLLECTIONS FATAL ERROR]', e);
            document.body.innerHTML += '<div style="color:red;font-size:2em;">[COLLECTIONS FATAL ERROR] ' + e.message + '</div>';
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
    getMovieGenres(movie) {
        // Try to get genres from movie.genre or movie.genres (array or string)
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
        this.renderMediaGrid();
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
            function normalizeKey(name) {
                return name
                    .replace(/\\/g, '/')
                    .replace(/\s*&\s*/g, '.&.') // preserve ampersand as dot-ampersand-dot
                    .replace(/\s+/g, '.')
                    .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '') // include & in allowed characters
                    .replace(/\.+/g, '.')
                    .replace(/^\.|\.$/g, '');
        }
            let folderName = movie.path ? movie.path.split(/[\\/]/).pop() : '';
            let dotKey = normalizeKey(folderName);
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
        // Returns array of main TV show objects from the flat array structure
        const tvShows = [];
        
        if (this.mediaLibraryRaw) {
            let shows = [];
            
            // Handle different possible data structures
            if (Array.isArray(this.mediaLibraryRaw)) {
                // Direct flat array of TV show objects
                shows = this.mediaLibraryRaw;
            } else if (this.mediaLibraryRaw.folders && Array.isArray(this.mediaLibraryRaw.folders)) {
                // Nested structure with folders
                shows = this.mediaLibraryRaw.folders;
            } else if (this.mediaLibraryRaw.tvShows && Array.isArray(this.mediaLibraryRaw.tvShows)) {
                // Nested structure with tvShows
                shows = this.mediaLibraryRaw.tvShows;
            }
            
            shows.forEach(show => {
                // Filter for TV shows only - check if path contains TV-SHOWS or has seasons/episodes
                const path = (show.path || show.name || '').toLowerCase();
                const hasTVShowsPath = path.includes('tv-shows') || path.includes('tv_shows');
                const hasSeasons = show.seasons && Array.isArray(show.seasons);
                const hasFolders = show.folders && Array.isArray(show.folders);
                const isTVShow = hasTVShowsPath || hasSeasons || hasFolders;
                
                // Use title, or fallback to path if title is missing
                const name = show.title || show.name || show.path || show.filename || '';
                if (name && isTVShow) {
                    tvShows.push({
                        name,
                        path: show.path || name,
                        data: show
                    });
                }
            });
        }
        
        console.log('[TV DEBUG] Total TV shows detected:', tvShows.length);
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

        // Handle flat array structure where seasons are directly in the show object
        if (show.seasons && Array.isArray(show.seasons)) {
            console.log('[SEASON DEBUG] Found seasons array with', show.seasons.length, 'seasons');
            // Deduplicate by seasonNumber
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

        // Handle flat array structure where episodes are directly in seasons
        if (show.seasons && Array.isArray(show.seasons)) {
            console.log('[EPISODE DEBUG] Found seasons array with', show.seasons.length, 'seasons');
            
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
            return season.episodes || [];
        }

        // Fallback to folder-based detection for legacy support
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
            
            // Debug: Check if S01E01 and S04E01 are present
            const hasS01E01 = episodes.some(e => e.name && e.name.includes('S01E01'));
            const hasS04E01 = episodes.some(e => e.name && e.name.includes('S04E01'));
            console.log('[EPISODE DEBUG] Has S01E01:', hasS01E01, 'Has S04E01:', hasS04E01);
            
            return episodes;
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
        let name = filename.replace(/\.[^/.]+$/, ''); // Remove extension
        name = name.replace(/\.(mkv|mp4|avi|mov|wmv)$/i, ''); // Remove video extensions
        name = name.replace(/\.(720p|1080p|480p)/i, ''); // Remove quality indicators
        name = name.replace(/\.(BluRay|WEBRip|HDTV|AMZN|Netflix)/i, ''); // Remove source indicators
        name = name.replace(/\.(x264|x265|HEVC)/i, ''); // Remove codec indicators
        name = name.replace(/\.(DDP5\.1|AAC|AC3)/i, ''); // Remove audio indicators
        name = name.replace(/\.(GalaxyTV|ProLover|d3g|FENiX)/i, ''); // Remove release group names
        name = name.replace(/\[.*?\]/g, ''); // Remove anything in brackets
        name = name.replace(/\(.*?\)/g, ''); // Remove anything in parentheses
        name = name.replace(/\.+/g, ' '); // Replace multiple dots with spaces
        name = name.replace(/\s+/g, ' ').trim(); // Clean up multiple spaces
        return name;
    }

    getSeasonImage(showName, seasonPath) {
        try {
            if (!this.seasonEpisodeImages) {
                return '/assets/img/placeholder-poster.jpg';
            }
            // Use shared normalization service
            const normalizeKey = window.normalizeKey || ((name) => {
                return name
                    .replace(/\\/g, '/')
                    .replace(/\s*&\s*/g, '.&.')
                    .replace(/\s+/g, '.')
                    .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
                    .replace(/\.+/g, '.')
                    .replace(/^\\.|\\.$/g, '');
            });
            const showKey = normalizeKey(showName);
            // Extract season number from seasonPath
            const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i);
            if (!seasonMatch) {
                return '/assets/img/placeholder-poster.jpg';
            }
            const seasonNum = String(parseInt(seasonMatch[1], 10));
            
            const showData = this.seasonEpisodeImages[showKey];
            if (!showData || !showData.seasons || !showData.seasons[seasonNum]) {
                return '/assets/img/placeholder-poster.jpg';
            }
            
            const seasonData = showData.seasons[seasonNum];
            if (!seasonData.poster) {
                return '/assets/img/placeholder-poster.jpg';
            }
            
            return seasonData.poster;
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
            // Use shared normalization service
            const normalizeKey = window.normalizeKey || ((name) => {
                return name
                    .replace(/\\/g, '/')
                    .replace(/\s*&\s*/g, '.&.')
                    .replace(/\s+/g, '.')
                    .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
                    .replace(/\.+/g, '.')
                    .replace(/^\\.|\\.$/g, '');
            });
            const showKey = normalizeKey(showName);
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
            console.log('[EPISODE IMAGE LOOKUP]', { showKey, seasonNum, episodeNum, episodeName: episode?.name });
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
                // Use shared normalization service
        const normalizeKey = window.normalizeKey || ((name) => {
            return name
                .replace(/\\/g, '/')
                .replace(/\s*&\s*/g, '.&.')
                .replace(/\s+/g, '.')
                .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
                .replace(/\.+/g, '.')
                .replace(/^\.|\.$/g, '');
        });
        const dotKey = normalizeKey(showName);
        const dotPathKey = normalizeKey(showPath);
        // Description lookup
        let description = '';
        if (this.tvShowDescriptions[dotKey]) {
            description = this.tvShowDescriptions[dotKey];
        } else if (this.tvShowDescriptions[dotPathKey]) {
            description = this.tvShowDescriptions[dotPathKey];
        }
        // Cast lookup
        let cast = [];
        if (this.tvShowCast[dotKey] && Array.isArray(this.tvShowCast[dotKey])) {
            cast = this.tvShowCast[dotKey];
        } else if (this.tvShowCast[dotPathKey] && Array.isArray(this.tvShowCast[dotPathKey])) {
            cast = this.tvShowCast[dotPathKey];
        }
        return {
            description,
            cast
        };
    }

    async renderSeasonsView(showPath) {
        const show = this.findShowByPath(showPath);
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
        // Robust show name extraction
        let showName = 'Unknown Show';
        if (show && show.name) {
            showName = show.name;
        } else if (show && show.data && show.data.name) {
            showName = show.data.name;
        } else if (showPath) {
            showName = this.extractShowName(showPath);
        }
        // Load description and cast
        let { description, cast } = await this.loadTVShowDetails(showName);
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
                <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV Shows</span>
                <span class="breadcrumb-separator"> > </span>
                <span>${showName}</span>
            </div>
            <div class="media-library-seasons-main-col">
                <div class="media-library-seasons-header-row">
                    <div class="media-library-seasons-title">
                        <h2>${showName}</h2>
                        <p>${seasons.length} ${seasons.length === 1 ? 'Season' : 'Seasons'}</p>
                    </div>
                    <div class="media-library-seasons-description">${description}</div>
                </div>
                <div class="${wrapperClass}">
                    ${showArrows ? `<button class="media-library-arrow-btn left" type="button">&#8592;</button>` : ''}
                    <div class="${gridClass}">
                        ${seasons.map(season => {
                            const seasonImage = this.getSeasonImage(showName, season.path);
                            const episodeCount = this.getEpisodesForSeason(show, season.path).length;
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
        console.log('[DEBUG - OpenTVShowFromData] openTVShowFromData called with path from data attribute:', showPath);
        this.openTVShow(showPath);
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
            const show = this.findShowByPath(this.currentTVShow);
            const showName = this.extractShowName(this.currentTVShow);
            const seasonName = this.currentTVSeason.split(/[\/]/).pop();
            const episodes = this.getEpisodesForSeason(show, this.currentTVSeason) || [];

            console.log('[DEBUG] episode:', episodes);

            // Only show arrows if more than 4 episodes
            const showArrows = episodes.length > 4;
            const gridClass = 'media-library-episodes-grid' + (episodes.length < 6 ? ' center-episodes' : '');
            const wrapperClass = 'media-library-episodes-arrows-wrapper';

            // Attach handlers after render
            setTimeout(() => this.attachEpisodeArrowHandlers(), 0);

            return `
                <div class="media-library-breadcrumbs">
                    <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV Shows</span>
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
                            const episodeImage = this.getEpisodeImage(showName, seasonName, episode);
                            // Robust relPath for playback
                            let relPath = ((episode.relPath) ? episode.relPath : (this.currentTVSeason.replace(/\\/g, '/') + '/' + (episode.name || episode.filename || '').replace(/\\/g, '/'))).replace(/\\/g, '/');
                            relPath = relPath.replace(/'/g, "\\'");
                            // Store episode data in data attribute to avoid JSON escaping issues
                            const episodeData = JSON.stringify(episode);
                            return `
                            <div class=\"media-library-card episode\" data-episode='${episodeData}' onclick=\"mediaLibraryManager.playEpisodeFromDataAttribute(this)\">
                                <div class=\"media-library-card-poster\">
                                    <img src=\"${episodeImage}\" alt=\"${episode.name || episode.filename}\" onerror=\"this.src='/assets/img/placeholder-poster.jpg'\">
                                    <div class=\"media-library-play-overlay\">▶</div>
                                </div>
                                <div class=\"media-library-card-info\">
                                    <h3 class=\"tv-show-season-episode-name\">
                                        ${showName} - ${seasonName} - ${(() => {
                                            const match = ((episode.name || episode.filename || episode.path) || '').match(/E(\d{1,2})/i);
                                            return match ? `E${match[1].padStart(2, '0')}` : '';
                                        })()}
                                    </h3>
                                    <div class=\"tv-show-episode-name\">
                                        ${this.extractEpisodeTitle((episode.name || episode.filename || episode.path || '').split(/[\\/]/).pop())}
                                    </div>
                                </div>
                            </div>
                        `;
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
        this.renderModal(); // Re-render modal to update tab highlight
        // Update count after navigating back to main TV shows page
        setTimeout(() => this.updateCount(), 0);
    }

    backToSeasons() {
        this.currentTVSeason = null;
        this.renderModal(); // Re-render modal to update tab highlight
    }

    playEpisode(episodePath, startTime = 0) {
        console.log('[DEBUG - PLAY-EPISODE] episodePath:', episodePath);
        
        // Try to find the episode object in the media library by path
        let episodeObj = null;
        if (this.mediaLibrary && episodePath) {
            episodeObj = this.mediaLibrary.find(item => item.path === episodePath || item.absPath === episodePath || (item.relPath && item.relPath === episodePath));
        }
        
        console.log('[DEBUG - PLAY-EPISODE] Found episodeObj:', episodeObj);
        
        if (episodeObj) {
            window.mediaLibraryManager.currentMediaItem = episodeObj;
            window.mediaLibraryManager.currentFile = episodeObj;
        } else {
            window.mediaLibraryManager.currentMediaItem = { path: episodePath };
            window.mediaLibraryManager.currentFile = { path: episodePath };
        }
        
        // Remove both modal and overlay
        this.closeMediaBrowser();
        
        // For TV shows, we need to use the /api/video route with the absolute filePath
        let videoUrl;
        
        if (episodeObj && episodeObj.filePath) {
            // Use the absolute filePath from the TV shows data
            const filePath = episodeObj.filePath;
            const encodedPath = encodeURIComponent(filePath);
            videoUrl = `/api/video?path=${encodedPath}`;
            console.log('[DEBUG - PLAY-EPISODE] Using filePath from episodeObj:', filePath);
            console.log('[DEBUG - PLAY-EPISODE] Encoded path:', encodedPath);
        } else {
            // Fallback: try to construct path from episodePath
        let normalizedPath = (episodePath || '').replace(/\\/g, '/');
        // Remove any leading '/media/'
        if (normalizedPath.startsWith('/media/')) {
            normalizedPath = normalizedPath.replace(/^\/media\//, '');
        }
        // Always encode only once
        try {
            normalizedPath = decodeURIComponent(normalizedPath);
        } catch (e) {}
        const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
            videoUrl = `/media/${encodedPath}`;
            console.log('[DEBUG - PLAY-EPISODE] Using fallback path construction:', normalizedPath);
            console.log('[DEBUG - PLAY-EPISODE] Fallback encoded path:', encodedPath);
        }
        
        console.log('[DEBUG - PLAY-EPISODE] Final video URL:', videoUrl, 'startTime:', startTime);
        
        // Set up a callback to restore the MediaLibrary modal when the Video Player is closed
        if (window.videoPlayer) {
            window.videoPlayer.onClose = () => {
                // Restore the MediaLibrary modal in the same state (showing episodes for the current show/season)
                this.renderModal();
            };
            window.videoPlayer.playUrl(videoUrl, 'video/mp4', startTime);
        }
    }

    playEpisodeFromObject(episodeDataJson, startTime = 0) {
        console.log('[PLAY EPISODE FROM OBJECT DEBUG] episodeDataJson:', episodeDataJson);
        
        try {
            const episodeObj = JSON.parse(episodeDataJson);
            console.log('[PLAY EPISODE FROM OBJECT DEBUG] parsed episodeObj:', episodeObj);
            
            window.mediaLibraryManager.currentMediaItem = episodeObj;
            window.mediaLibraryManager.currentFile = episodeObj;
            
            // Remove both modal and overlay
            this.closeMediaBrowser();
            
            // Use the absolute filePath from the episode object
            let videoUrl;
            
            if (episodeObj && episodeObj.filePath) {
                // Use the absolute filePath from the TV shows data
                const filePath = episodeObj.filePath;
                const encodedPath = encodeURIComponent(filePath);
                videoUrl = `/api/video?path=${encodedPath}`;
                console.log('[PLAY EPISODE FROM OBJECT DEBUG] Using filePath:', filePath);
            } else {
                console.error('[PLAY EPISODE FROM OBJECT DEBUG] No filePath found in episode object');
                return;
            }
            
            console.log('[PLAY EPISODE FROM OBJECT DEBUG] Final video URL:', videoUrl, 'startTime:', startTime);
            
            // Set up a callback to restore the MediaLibrary modal when the Video Player is closed
            if (window.videoPlayer) {
                window.videoPlayer.onClose = () => {
                    // Restore the MediaLibrary modal in the same state (showing episodes for the current show/season)
                    this.renderModal();
                };
                window.videoPlayer.playUrl(videoUrl, 'video/mp4', startTime);
            }
        } catch (error) {
            console.error('[PLAY EPISODE FROM OBJECT DEBUG] Error parsing episode data:', error);
        }
    }

    playEpisodeFromDataAttribute(element, startTime = 0) {
        console.log('[PLAY EPISODE FROM DATA ATTRIBUTE DEBUG] element:', element);
        
        try {
            const episodeData = element.getAttribute('data-episode');
            console.log('[PLAY EPISODE FROM DATA ATTRIBUTE DEBUG] episodeData:', episodeData);
            
            if (!episodeData) {
                console.error('[PLAY EPISODE FROM DATA ATTRIBUTE DEBUG] No episode data found in data-episode attribute');
                return;
            }
            
            const episodeObj = JSON.parse(episodeData);
            console.log('[PLAY EPISODE FROM DATA ATTRIBUTE DEBUG] parsed episodeObj:', episodeObj);
            
            window.mediaLibraryManager.currentMediaItem = episodeObj;
            window.mediaLibraryManager.currentFile = episodeObj;
            
            // Remove both modal and overlay
            this.closeMediaBrowser();
            
            // Use the absolute filePath from the episode object
            let videoUrl;
            
            if (episodeObj && episodeObj.filePath) {
                // Use the absolute filePath from the TV shows data
                const filePath = episodeObj.filePath;
                const encodedPath = encodeURIComponent(filePath);
                videoUrl = `/api/video?path=${encodedPath}`;
                console.log('[PLAY EPISODE FROM DATA ATTRIBUTE DEBUG] Using filePath:', filePath);
            } else {
                console.error('[PLAY EPISODE FROM DATA ATTRIBUTE DEBUG] No filePath found in episode object');
                return;
            }
            
            console.log('[PLAY EPISODE FROM DATA ATTRIBUTE DEBUG] Final video URL:', videoUrl, 'startTime:', startTime);
            
            // Set up a callback to restore the MediaLibrary modal when the Video Player is closed
            if (window.videoPlayer) {
                window.videoPlayer.onClose = () => {
                    // Restore the MediaLibrary modal in the same state (showing episodes for the current show/season)
                    this.renderModal();
                };
                window.videoPlayer.playUrl(videoUrl, 'video/mp4', startTime);
            }
        } catch (error) {
            console.error('[PLAY EPISODE FROM DATA ATTRIBUTE DEBUG] Error parsing episode data:', error);
        }
    }

    // --- TAB RENDERING ---
    async renderTabContent() {
        console.log('[DEBUG - RenderTabContent] currentTab:', this.currentTab);
        console.log('[DEBUG - RenderTabContent] currentTVShow:', this.currentTVShow);
        console.log('[DEBUG - RenderTabContent] currentTVSeason:', this.currentTVSeason);
        
        switch (this.currentTab) {
            case 'movies':
                console.log('[DEBUG - RenderTabContent] Rendering movies tab');
                return `
                    <div class="media-library-az-sidebar-movies">${this.renderAZSidebar()}</div>
                    ${this.renderMoviesContent()}
                `;
            case 'tvshows':
                if (this.currentTVShow) {
                    if (this.currentTVSeason) {
                        console.log('[DEBUG - RenderTabContent] Rendering episodes view');
                        return this.renderEpisodesView();
                    } else {
                        console.log('[DEBUG - RenderTabContent] Rendering seasons view');
                        return `
                            <div class="media-library-az-sidebar-tvshows">${this.renderAZSidebar()}</div>
                            ${await this.renderSeasonsView(this.currentTVShow)}
                        `;
                    }
                } else {
                    console.log('[DEBUG - RenderTabContent] Rendering TV shows tab');
                    return `
                        <div class="media-library-az-sidebar-tvshows">${this.renderAZSidebar()}</div>
                        ${this.renderTVShowsTab()}
                    `;
                }
            case 'favorites':
                return this.renderFavoritesContent();
            case 'collections':
                return this.renderCollectionsTab();
            case 'suggestions':
                return this.renderSuggestionsContent();
            case 'watchlater':
                return this.renderWatchLaterContent();
            default:
                return this.renderMoviesContent();
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
                    <div class="media-card-actions">
                        <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                        <button class="favorite-btn" title="Toggle Favorite">${this.isFavorite(item.path) ? '❤️' : '🩷'}</button>
                        <button class="collection-btn" title="Add to Collection">➕</button>
                    </div>
                    <img src="${this.getPosterPath(item)}" alt="${cleanTitle}" class="media-library-poster">
                    <div class="media-info"><h3>${cleanTitle}</h3></div>
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

    renderFavoritesContent() {
        const { movies, tvshows } = this.getFavoritesList();
        const html = `
        <div class="watch-later-flex-container">
            <div class="watch-later-column">
                <div class="watch-later-section-title">Favorited MOVIES</div>
                <hr class="watch-later-section-divider">
                <div class="watch-later-scroll">
                    <div class="watch-later-grid">
                        ${movies.map(item => `
                            <div class="media-library-movie-card-movies watch-later-card" data-path="${item.path}">
                                <img class="watch-later-img-movie watch-later-img watch-later-img-clickable" src="${this.getPosterPath(item)}" alt="${item.title}">
                                <div class="media-info"><h3 class="watch-later-title">${this.cleanMovieTitle(item.title || item.name || 'Movie')}</h3></div>
                                <div class="watch-later-btn-row">
                                    <button class="favorite-btn" title="Toggle Favorite">❤️</button>
                                </div>
                            </div>
                        `).join('')}
                        ${movies.length === 0 ? '<div class="watch-later-empty">(No items)</div>' : ''}
                    </div>
                </div>
            </div>
            <div class="watch-later-column">
                <div class="watch-later-section-title">Favorited TV-SHOWS</div>
                <hr class="watch-later-section-divider">
                <div class="watch-later-scroll">
                    <div class="watch-later-grid">
                        ${tvshows.map(item => `
                            <div class="media-library-movie-card-tvshows watch-later-card" data-path="${item.path}">
                                <img class="watch-later-img-tv watch-later-img watch-later-img-clickable" src="${this.getPosterPath(item)}" alt="${item.title}">
                                <div class="media-info"><h3 class="watch-later-title">${this.cleanMovieTitle(item.title || item.name || 'Show')}</h3></div>
                                <div class="watch-later-btn-row">
                                    <button class="favorite-btn" title="Toggle Favorite">❤️</button>
                                </div>
                            </div>
                        `).join('')}
                        ${tvshows.length === 0 ? '<div class="watch-later-empty">(No items)</div>' : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
        setTimeout(() => {
            document.querySelectorAll('.media-library-movie-card-movies .favorite-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.media-library-movie-card-movies');
                    const path = card ? card.getAttribute('data-path') : null;
                    this.toggleFavorite(path, 'movie');
                };
            });
            document.querySelectorAll('.media-library-movie-card-tvshows .favorite-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.media-library-movie-card-tvshows');
                    const path = card ? card.getAttribute('data-path') : null;
                    this.toggleFavorite(path, 'tv');
                };
            });
        }, 0);
        return html;
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
            (item.path && item.path.toLowerCase().includes(term))
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

    renderTVShowsTab() {
        const sortedShows = this.getFilteredAndSortedItems();
        const addedAnchors = new Set();
        let html = '<div class="media-library-movie-grid">';
        sortedShows.forEach(show => {
            const cleanTitle = this.cleanMovieTitle(show.name || show.title || show.filename || show.path || '');
            const displayTitle = this.capitalizeTitle(cleanTitle);
            const firstLetter = cleanTitle.charAt(0).toUpperCase();
            let anchorAttr = '';
            if (!addedAnchors.has(firstLetter)) {
                anchorAttr = ` data-anchor="${firstLetter}"`;
                addedAnchors.add(firstLetter);
            }
            html += `
                <div class="media-library-card poster"${anchorAttr} data-path="${show.path}" data-show-name="${show.name || show.title || ''}">
                  <div class="media-card-actions">
                    <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                    <button class="favorite-btn" title="Toggle Favorite">${this.isFavorite(show.path) ? '❤️' : '🩷'}</button>
                    <button class="collection-btn" title="Add to Collection">➕</button>
                  </div>
                  <img class="media-library-poster poster" src="${this.getPosterPath(show)}" alt="${show.name}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                  <div class="media-info"><h3>${displayTitle}</h3></div>
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

    // --- WATCH LATER / RESUME LOGIC ---
    saveResumeProgress(mediaItem, currentTime, duration, isManualSave = false) {
        console.log('[MEDIA-LIBRARY] saveResumeProgress called:', {mediaItem, currentTime, duration, isManualSave});
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        // Remove any existing entry for this path or relPath
        resumeList = resumeList.filter(item => item.path !== mediaItem.path && item.path !== mediaItem.relPath);

        // Determine if this is a TV show by checking the path
        const pathToCheck = (mediaItem.path || mediaItem.absPath || mediaItem.relPath || '').toLowerCase();
        const isTVShow = pathToCheck.includes('tv-shows') || 
                        pathToCheck.includes('tv_shows') ||
                        pathToCheck.includes('season') ||
                        (mediaItem.title && mediaItem.title.includes('S00E') || mediaItem.title.includes('S01E') || mediaItem.title.includes('S02E'));
        
        console.log('[DEBUG - WATCH-LATER] Path check for TV show detection:', {
            path: mediaItem.path || mediaItem.absPath || mediaItem.relPath,
            title: mediaItem.title,
            isTVShow: isTVShow
        });
        
        let savePath = mediaItem.path || mediaItem.absPath || mediaItem.relPath;
        
        // For TV shows, convert absolute paths to relative paths (like other TV shows)
        if (isTVShow && savePath) {
            console.log('[DEBUG - WATCH-LATER] Processing TV show path conversion:', savePath);
            const lowerPath = savePath.toLowerCase();
            // Handle both forward and backward slashes
            if (lowerPath.includes('media') && lowerPath.includes('tv-shows')) {
                const parts = savePath.split(/[\\/]/);
                const mediaIndex = parts.findIndex(part => part.toLowerCase() === 'media');
                if (mediaIndex !== -1 && parts[mediaIndex + 1] && parts[mediaIndex + 1].toLowerCase() === 'tv-shows') {
                    savePath = parts.slice(mediaIndex + 2).join('/');
                    console.log('[DEBUG - WATCH-LATER] Converted TV show path from absolute to relative:', savePath);
                }
            } else {
                console.log('[DEBUG - WATCH-LATER] Path does not contain media/tv-shows pattern:', lowerPath);
            }
        } else {
            console.log('[DEBUG - WATCH-LATER] Not a TV show or no savePath:', { isTVShow, savePath });
        }
        
        // If path is missing, try to look up from main media library by filename or title
        if (!mediaItem.path && this.mediaLibrary && (mediaItem.title || mediaItem.name)) {
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
        if (savePath && savePath.startsWith('/media/')) {
            savePath = savePath.replace(/^\/media\//, '');
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
                lastWatched: Date.now()
            };
            // --- Ensure absPath is included for movies ---
            if (!mediaItem.absPath && mediaItem.files && mediaItem.files.length > 0) {
                // Find the first video file
                const videoFile = mediaItem.files.find(f => f.name && /\.(mp4|mkv|avi)$/i.test(f.name));
                if (videoFile) {
                    savedItem.absPath = `/media/movies/${mediaItem.path}/${videoFile.name}`;
                }
            } else if (mediaItem.absPath) {
                savedItem.absPath = mediaItem.absPath;
            }
            resumeList.push(savedItem);
            console.log('[MEDIA-LIBRARY] Saved to Watch Later:', savedItem);
        }
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
        console.log('[MEDIA-LIBRARY] Updated resumeList:', resumeList);
        this.renderWatchLaterContent();
        if (isManualSave) {
            this.showToast('Saved to Watch Later!');
        }
    }

    removeResumeProgress(path) {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        // Remove any entry where path matches either item.path or item.relPath
        resumeList = resumeList.filter(item => item.path !== path && item.relPath !== path);
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
        console.log('[MEDIA-LIBRARY] Removed from resume list:', path);
        // Refresh the Watch Later content if we're currently on that tab
        if (this.currentTab === 'watchlater') {
            this.renderWatchLaterContent();
        }
    }

    getResumeList() {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        console.log('[MEDIA-LIBRARY] getResumeList returns:', resumeList);
        // Sort by lastWatched desc (most recent first)
        return resumeList.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
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

    attachResumeEvents(mediaItem) {
        // This method is called when a video starts playing
        // It sets up automatic saving of progress when the video is paused
        console.log('[MEDIA-LIBRARY] attachResumeEvents called for:', mediaItem);
        
        // The actual pause event handling is now done in the VideoPlayer component
        // This method is kept for compatibility and future enhancements
    }

    extractEpisodeTitle(filename) {
        // Remove show name, season/episode codes, and return only the episode title
        let name = filename;
        // Remove extension
        name = name.replace(/\.[^/.]+$/, '');
        // Remove show name (if present)
        const showNamePattern = new RegExp('^' + this.escapeRegExp(this.extractShowName(this.currentTVShow)) + '[ ._-]*', 'i');
        name = name.replace(showNamePattern, '');
        // Remove season/episode codes
        name = name.replace(/S\d{1,2}E\d{1,2}/i, '');
        name = name.replace(/Season[ _-]?\d{1,2}/i, '');
        name = name.replace(/Episode[ _-]?\d{1,2}/i, '');
        name = name.replace(/^[ ._-]+/, '');
        name = name.replace(/[ ._-]+$/, '');
        return name.trim();
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async reloadMoviePostersAndRefreshGrid() {
        try {
            const response = await fetch('/components/MediaLibrary/data/movies/movie_posters_normalized.json?_=' + Date.now());
            if (response.ok) {
                this.moviePosters = await response.json();
            }
        } catch (e) {
            console.warn('[MediaLibrary] Failed to reload movie_posters_normalized.json:', e);
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
                            this.renderMediaGrid();
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
        this.closeMediaLibrary();
        if (window.MediaManager) {
            const mm = new window.MediaManager();
            mm.init();
        } else {
            if (window.showToast) {
                window.showToast('MediaManager component not loaded.', 'error', 4000);
            } else {
                console.error('MediaManager component not loaded.');
            }
        }
    }
}

export default MediaLibraryManager;