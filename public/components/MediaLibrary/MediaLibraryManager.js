/*
  MEDIALIBRARYMANAGER.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

// Import the shared VideoPlayer
import VideoPlayer from '../VideoPlayer/VideoPlayer.js';

class MediaLibraryManager {
    constructor() {

        this.mediaLibrary = [];
        this.embyPosters = [];
        this.moviePosters = {};
        this.tvPosters = {};
        this.currentTab = 'movies';
        this.currentTabFlag = 'movies'; // Track current tab for return location
        this.lastActiveTab = 'movies'; // Track last active tab
        this.isLoading = false;
        this.isRefreshing = false;
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
        this.isShowingModalOverlay = false;
        this.azSidebarLoaded = false;
        
        // Make restore methods available globally for debugging
        window.restoreWatchLaterData = () => this.restoreWatchLaterFromBackup();
        window.loadLocalBackup = async () => {
            const response = await fetch('/components/MediaLibrary/data/watch_later/watch_later.json');
            const data = await response.json();
            console.log('Local watch later data:', data);
            localStorage.setItem('mediaLibraryResumeList', JSON.stringify(data.items));
            this.updateWatchLaterGrid();
            this.showToast(`Loaded ${data.items.length} items from watch later data`, 'green');
        };
        
        // Debug method for A-Z sidebar flag
        window.checkAZSidebarFlag = () => {
            console.log('[DEBUG - A-Z] Current azSidebarLoaded flag:', this.azSidebarLoaded);
            console.log('[DEBUG - A-Z] Current isRefreshing flag:', this.isRefreshing);
            console.log('[DEBUG - A-Z] Current isShowingModalOverlay flag:', this.isShowingModalOverlay);
        };
        
        // Debug method to manually set A-Z sidebar flag
        window.setAZSidebarFlag = (value) => {
            this.azSidebarLoaded = value;
            console.log('[DEBUG - A-Z] Manually set azSidebarLoaded flag to:', value);
        };
        
        // Debug method to manually reset all spinners
        window.resetAllSpinners = () => {
            this.forceRemoveAllSpinners();
            console.log('[DEBUG - SPINNER] All spinners manually reset');
        };
        
        // Debug method to force resolve the waiting promise
        window.forceResolveAZSidebar = () => {
            this.azSidebarLoaded = true;
            console.log('[DEBUG - A-Z] Force set azSidebarLoaded flag to true');
            // Force hide any remaining overlays
            const overlays = document.querySelectorAll('.media-library-modal-loading-overlay');
            overlays.forEach(overlay => overlay.remove());
            console.log('[DEBUG - A-Z] Forced removal of', overlays.length, 'overlays');
        };
        
        // Debug method to check A-Z sidebar status
        window.checkAZSidebarStatus = () => {
            const movieSidebar = document.getElementById('mediaLibraryAZSidebarMovie');
            const tvSidebar = document.getElementById('mediaLibraryAZSidebarTVShow');
            
            console.log('[DEBUG - A-Z] A-Z Sidebar Status Check:');
            console.log('[DEBUG - A-Z] - azSidebarLoaded flag:', this.azSidebarLoaded);
            console.log('[DEBUG - A-Z] - Movie sidebar exists:', !!movieSidebar);
            console.log('[DEBUG - A-Z] - TV sidebar exists:', !!tvSidebar);
            
            if (movieSidebar) {
                console.log('[DEBUG - A-Z] - Movie sidebar display:', movieSidebar.style.display);
                console.log('[DEBUG - A-Z] - Movie sidebar children:', movieSidebar.children.length);
                console.log('[DEBUG - A-Z] - Movie sidebar text:', movieSidebar.textContent.trim().substring(0, 100));
            }
            
            if (tvSidebar) {
                console.log('[DEBUG - A-Z] - TV sidebar display:', tvSidebar.style.display);
                console.log('[DEBUG - A-Z] - TV sidebar children:', tvSidebar.children.length);
                console.log('[DEBUG - A-Z] - TV sidebar text:', tvSidebar.textContent.trim().substring(0, 100));
            }
        };
        
        // Debug localStorage collections on initialization
        this.debugLocalStorageCollections();
        
        // Add global error handler to prevent stuck spinners
        this.setupGlobalErrorHandler();
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
            this.mediaLibraryRaw = moviesRaw; // Set for backward compatibility
            console.log('🎬 [MEDIA-LIBRARY] Movies data loaded:', this.moviesData ? this.moviesData.length : 'undefined', 'movies');
            console.log('🎬 [MEDIA-LIBRARY] Sample movie data:', this.moviesData ? this.moviesData.slice(0, 2) : 'none');
            
            // Load TV shows data
            console.log('🎬 [MEDIA-LIBRARY] Loading TV shows data...');
            const tvShowsResponse = await fetch('/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
            const tvShowsResult = await tvShowsResponse.json();
            
            let tvShowsRaw = null;
            if (Array.isArray(tvShowsResult)) {
                tvShowsRaw = tvShowsResult;
            } else if (tvShowsResult && Array.isArray(tvShowsResult.folders)) {
                tvShowsRaw = tvShowsResult.folders;
            } else if (typeof tvShowsResult === 'object' && !Array.isArray(tvShowsResult)) {
                // Handle object format with numeric keys (current format)
                tvShowsRaw = tvShowsResult;
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
                // Normalized tv-shows file: array of show objects or object with numeric keys
                if (Array.isArray(result)) {
                    raw = result;
                } else if (result && Array.isArray(result.folders)) {
                    raw = result.folders;
                } else if (typeof result === 'object' && !Array.isArray(result)) {
                    // Handle object format with numeric keys (current format)
                    raw = result;
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

        try {
            // console.log('🎬 [MEDIA-LIBRARY] Loading movie posters...');
            let response = await fetch('/components/MediaLibrary/data/movies/movie_posters_normalized.json?t=' + Date.now());
            if (response.ok) {
                this.moviePosters = await response.json();
                const keys = Object.keys(this.moviePosters);
    
                // console.log('✅ [MEDIA-LIBRARY - normalized JSON used] Loaded movie_posters_normalized.json');
            } else {
                // console.error('❌ [MEDIA-LIBRARY] Failed to load movie_posters_normalized.json');
                this.moviePosters = {};
            }
        } catch (error) {
            // console.error('❌ [MEDIA-LIBRARY] Error loading movie_posters_normalized.json:', error);
            this.moviePosters = {};
        }
        if (this.currentTab === 'movies') {
            this.renderMediaGrid();
        }
    }

    async loadTVPosters() {
        try {
            // console.log('📺 [MEDIA-LIBRARY] Loading TV show posters...');
            const response = await fetch('/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json');
            if (response.ok) {
                this.tvPosters = await response.json();
                // console.log(`✅ [MEDIA-LIBRARY] Loaded ${Object.keys(this.tvPosters).length} TV show posters`);
            } else {
                // console.warn('⚠️ [MEDIA-LIBRARY] Could not load TV show posters');
                this.tvPosters = {};
            }
        } catch (error) {
            console.warn('⚠️ [MEDIA-LIBRARY] Error loading TV show posters:', error);
            this.tvPosters = {};
        }
    }

    async loadSeasonEpisodeImages() {
        try {
            // console.log('🎬 [MEDIA-LIBRARY] Loading season and episode images...');
            
            // Load season images
            const seasonResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_season_images_normalized.json');
            let seasonData = {};
            if (seasonResponse.ok) {
                seasonData = await seasonResponse.json();
                // console.log(`✅ [DEBUG MEDIA-LIBRARY] Loaded season images for ${Object.keys(seasonData).length} shows`);
                // console.log(`🎬 [MEDIA-LIBRARY] Season data keys:`, Object.keys(seasonData));
                if (seasonData['Terra.Nova.(2011)']) {
                    // console.log(`🎬 [MEDIA-LIBRARY] Terra Nova season data:`, seasonData['Terra.Nova.(2011)']);
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
            
            // Process shows that have season data
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
            
            // Process shows that only have episode data (no season data)
            for (const showName in episodeData) {
                if (!this.seasonEpisodeImages[showName]) {
                    this.seasonEpisodeImages[showName] = { seasons: {} };
                }
                
                if (episodeData[showName].seasons) {
                    for (const seasonNum in episodeData[showName].seasons) {
                        if (!this.seasonEpisodeImages[showName].seasons[seasonNum]) {
                            this.seasonEpisodeImages[showName].seasons[seasonNum] = {
                                poster: null,
                                episodes: {}
                            };
                        }
                        
                        // Add episode data
                        if (episodeData[showName].seasons[seasonNum].episodes) {
                            this.seasonEpisodeImages[showName].seasons[seasonNum].episodes = episodeData[showName].seasons[seasonNum].episodes;
                        }
                    }
                }
            }
            
            // console.log(`✅ [MEDIA-LIBRARY] Merged season/episode images for ${Object.keys(this.seasonEpisodeImages).length} shows`);
            // console.log(`🎬 [MEDIA-LIBRARY] Final merged keys:`, Object.keys(this.seasonEpisodeImages));
            if (this.seasonEpisodeImages['Terra.Nova.(2011)']) {
                // console.log(`🎬 [MEDIA-LIBRARY] Final Terra Nova data:`, this.seasonEpisodeImages['Terra.Nova.(2011)']);
            }
            if (this.seasonEpisodeImages['citadel.(2023)']) {
                // console.log(`🎬 [MEDIA-LIBRARY] Final Citadel data:`, this.seasonEpisodeImages['citadel.(2023)']);
            }
        } catch (error) {
            console.warn('⚠️ [MEDIA-LIBRARY] Error loading season episode images:', error);
            this.seasonEpisodeImages = {};
        }
    }

    renderSpinner() {
        // Don't show spinner during refresh operations
        if (this.isRefreshing) return;
        
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

    /**
     * Force remove all spinners to prevent infinite loading states
     */
    forceRemoveAllSpinners() {
        // Remove main spinner
        this.removeSpinner();
        
        // Reset loading flags
        this.isLoading = false;
        this.azSidebarLoaded = true;
        
        console.log('[DEBUG - SPINNER] All spinners forcefully removed and loading flags reset');
    }

    /**
     * Show full modal loading overlay with spinner
     */
    showModalLoadingOverlay() {
        // Check if we're already showing an overlay
        if (this.isShowingModalOverlay) {
            console.log('[DEBUG - LOADING] Already showing modal overlay, not creating another one');
            return;
        }
        
        // Check if overlay already exists
        const existingOverlay = document.getElementById('mediaLibraryModalLoadingOverlay');
        if (existingOverlay) {
            console.log('[DEBUG - LOADING] Overlay already exists, not creating another one');
            return;
        }
        
        const modals = document.querySelectorAll('.media-library-modal');
        console.log('[DEBUG - LOADING] Found', modals.length, 'modal elements');
        
        if (modals.length === 0) {
            console.warn('[DEBUG - LOADING] No modal found, cannot show overlay');
            return;
        }
        
        if (modals.length > 1) {
            console.warn('[DEBUG - LOADING] Multiple modals found, using first one');
        }
        
        const modal = modals[0];
        
        const overlay = document.createElement('div');
        overlay.id = 'mediaLibraryModalLoadingOverlay';
        overlay.className = 'media-library-modal-loading-overlay';
        overlay.innerHTML = `
            <div class="media-library-modal-loading-content">
                <div class="media-library-modal-spinner"></div>
                <div class="media-library-modal-loading-text">Loading Media Library...</div>
            </div>
        `;
        
        modal.appendChild(overlay);
        this.isShowingModalOverlay = true;
        console.log('[DEBUG - LOADING] Modal loading overlay shown on modal:', modal.id || 'no-id');
    }

    /**
     * Hide full modal loading overlay
     */
    hideModalLoadingOverlay() {
        const overlays = document.querySelectorAll('.media-library-modal-loading-overlay');
        console.log('[DEBUG - LOADING] Found', overlays.length, 'modal loading overlays to hide');
        
        overlays.forEach((overlay, index) => {
            overlay.remove();
            console.log('[DEBUG - LOADING] Removed overlay', index + 1);
        });
        
        this.isShowingModalOverlay = false;
        console.log('[DEBUG - LOADING] All modal loading overlays hidden');
    }

    /**
     * Setup global error handler to prevent stuck spinners
     */
    setupGlobalErrorHandler() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('[DEBUG - SPINNER] Unhandled promise rejection detected:', event.reason);
            this.forceRemoveAllSpinners();
        });

        // Handle global errors
        window.addEventListener('error', (event) => {
            console.error('[DEBUG - SPINNER] Global error detected:', event.error);
            this.forceRemoveAllSpinners();
        });

        // Add a safety timeout to automatically remove spinners after 10 seconds
        setInterval(() => {
            if (this.isLoading && this.isModalOpen) {
                const spinner = document.getElementById('mediaLibrarySpinner');
                if (spinner) {
                    console.warn('[DEBUG - SPINNER] Safety timeout: removing stuck spinners after 10 seconds');
                    this.forceRemoveAllSpinners();
                }
            }
        }, 10000); // Check every 10 seconds

        console.log('[DEBUG - SPINNER] Global error handler and safety timeout setup completed');
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
                // console.log('🔄 [MEDIA-LIBRARY] Keyboard shortcut detected: Ctrl+R - Refreshing content');
                this.refreshCurrentContent();
            }
        });
    }

    async openMediaBrowser() {
        this.isModalOpen = true;
        
        console.log('[DEBUG - LOADING] openMediaBrowser called');
        console.log('[DEBUG - LOADING] Current tab:', this.currentTab);
        console.log('[DEBUG - LOADING] Movies data available:', this.moviesData ? this.moviesData.length : 'undefined');
        console.log('[DEBUG - LOADING] TV shows data available:', this.tvShowsData ? this.tvShowsData.length : 'undefined');
        
        // Render modal immediately without loading states
        this.renderModal();
        
        try {
            // Update mediaLibraryRaw to point to the correct data for current tab
            if (this.currentTab === 'movies') {
                this.mediaLibraryRaw = this.moviesData;
                console.log('[DEBUG - LOADING] Set mediaLibraryRaw to moviesData:', this.moviesData ? this.moviesData.length : 'undefined', 'movies');
            } else if (this.currentTab === 'tvshows') {
                this.mediaLibraryRaw = this.tvShowsData;
                console.log('[DEBUG - LOADING] Set mediaLibraryRaw to tvShowsData:', this.tvShowsData ? this.tvShowsData.length : 'undefined', 'TV shows');
            } else if (this.currentTab === 'watchlater') {
                // For watchlater tab, we don't need to set mediaLibraryRaw since it uses its own data
                this.mediaLibraryRaw = null;
                console.log('[DEBUG - LOADING] Set mediaLibraryRaw to null for watchlater tab');
            }
            
            // Update the modal content after setting the correct data
            console.log('[DEBUG - LOADING] About to call updateModalContent');
            await this.updateModalContent();
            console.log('[DEBUG - LOADING] updateModalContent completed');
            
        } catch (error) {
            console.error('[DEBUG - MediaLibrary] Error during loading:', error);
            this.showError('Failed to load media library.');
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
                
                // Update collection buttons to show correct state
                console.log('[DEBUG - COLLECTIONS] About to update collection buttons after rendering TV shows grid');
                await this.updateCollectionButtons();
                console.log('[DEBUG - COLLECTIONS] Collection buttons update completed for TV shows');
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
        // console.log('[DEBUG - RENDER MODAL] A-Z sidebar rendering deferred to updateModalContent()');
        this.updateCount();
        this.restoreSearchSortUI();
        if (this.currentTab === 'watchlater') {
            this.updateWatchLaterGrid();
        }
        // Defer collections rendering until grid exists
        if (this.currentTab === 'collections') {
            setTimeout(() => this.renderCollectionsTab(), 0);
        }
        // --- Add clear search button logic ---
        const searchInput = document.getElementById('mediaLibrarySearch');
        const clearBtn = document.getElementById('mediaLibraryClearSearch');
        
        // console.log('[DEBUG - SEARCH-SETUP] Search input found:', !!searchInput);
        // console.log('[DEBUG - SEARCH-SETUP] Clear button found:', !!clearBtn);
        if (clearBtn) {
            // console.log('[DEBUG - SEARCH-SETUP] Clear button display style:', clearBtn.style.display);
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
            // console.log('[DEBUG - CLEAR-BTN] Clear button clicked for tab:', this.currentTab);
            // console.log('[DEBUG - CLEAR-BTN] Search input value before clear:', searchInput.value);
            
            searchInput.value = '';
            // console.log('[DEBUG - CLEAR-BTN] Search input value after clear:', searchInput.value);
            
            this.handleSearchInput({ target: searchInput });
            updateClearBtn();
            searchInput.focus();
            
            // console.log('[DEBUG - CLEAR-BTN] Clear button action completed');
        };
        
        // Remove any existing click handlers and add new one
        clearBtn.onclick = null; // Clear any existing onclick
        clearBtn.addEventListener('click', clearBtnClickHandler);
        
        // Also set onclick as a backup method
        clearBtn.onclick = clearBtnClickHandler;
        
        // console.log('[DEBUG - SEARCH-SETUP] Clear button event handlers attached');
        // console.log('[DEBUG - SEARCH-SETUP] Clear button onclick set:', !!clearBtn.onclick);
        // console.log('[DEBUG - SEARCH-SETUP] Clear button event listeners:', clearBtn.onclick ? 'onclick handler set' : 'no onclick handler');
        
        // Add a global click handler to catch any clear button clicks
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'mediaLibraryClearSearch') {
                // console.log('[DEBUG - GLOBAL-CLEAR] Global click handler caught clear button click');
                // console.log('[DEBUG - GLOBAL-CLEAR] Target element:', e.target);
                // console.log('[DEBUG - GLOBAL-CLEAR] Current tab:', this.currentTab);
                
                // Manually trigger the clear action
                const searchInput = document.getElementById('mediaLibrarySearch');
                if (searchInput) {
                    // console.log('[DEBUG - GLOBAL-CLEAR] Found search input, clearing...');
                    searchInput.value = '';
                    this.handleSearchInput({ target: searchInput });
                    
                    // Update clear button visibility
                    const clearBtn = document.getElementById('mediaLibraryClearSearch');
                    if (clearBtn) {
                        clearBtn.style.display = 'none';
                    }
                    
                    searchInput.focus();
                    // console.log('[DEBUG - GLOBAL-CLEAR] Clear action completed via global handler');
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
        // Use the dedicated function instead of inline setup
        this.attachPosterSelectorHandlers();

        // After rendering the modal, attach click handlers to TV show posters
        setTimeout(() => {
            document.querySelectorAll('.tvshow-poster-img').forEach(img => {
                img.onclick = (e) => {
                    console.log('[DEBUG] TV show poster clicked!');
                    e.preventDefault();
                    e.stopPropagation();
                    const card = img.closest('.media-library-tv-card');
                    // console.log('[DEBUG] Found card:', card);
                    if (card) {
                        // console.log('[DEBUG] Card data-path:', card.getAttribute('data-path'));
                        // console.log('[DEBUG] Card data-show-name:', card.getAttribute('data-show-name'));
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

    async switchTab(tab) {
        // console.log('[SWITCH-TAB-DEBUG] Switching to tab:', tab);
        // console.log('[SWITCH-TAB-DEBUG] Previous currentTab was:', this.currentTab);
        // console.log('[SWITCH-TAB-DEBUG] Previous currentTabFlag was:', this.currentTabFlag);
        this.lastActiveTab = this.currentTab;
        this.currentTab = tab;
        // console.log('[SWITCH-TAB-DEBUG] New currentTab is:', this.currentTab);
        
        // Set the current tab flag for return location tracking
        this.currentTabFlag = tab;
        // console.log('[SWITCH-TAB-DEBUG] Set currentTabFlag to:', this.currentTabFlag);
        
        // Update mediaLibraryRaw to match current tab's data for backward compatibility
        if (this.currentTab === 'movies') {
            this.mediaLibraryRaw = this.moviesData;
        } else if (this.currentTab === 'tvshows') {
            this.mediaLibraryRaw = this.tvShowsData;
        } else if (this.currentTab === 'favorites') {
            // For favorites tab, set to movies data so movie clicks work properly
            this.mediaLibraryRaw = this.moviesData;
        } else if (this.currentTab === 'watchlater') {
            // For watchlater tab, we don't need to set mediaLibraryRaw since it uses its own data
            this.mediaLibraryRaw = null;
        }
        
        // console.log('[SWITCH-TAB-DEBUG] mediaLibraryRaw set to:', this.mediaLibraryRaw);
        
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
        
        // console.log('[SWITCH-TAB-DEBUG] Calling openMediaBrowser()');
        
        // Open media browser directly without loading states
        await this.openMediaBrowser();
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
        
        // console.log('[DEBUG - UPDATE MODAL] Current tab:', this.currentTab);
        
        // Update tab-specific UI elements (search placeholder, genre dropdown, etc.)
        this.updateTabSpecificUI();
        
        // Show/hide appropriate A-Z sidebars based on current tab
        const movieSidebar = document.getElementById('mediaLibraryAZSidebarMovie');
        const tvSidebar = document.getElementById('mediaLibraryAZSidebarTVShow');
        
        // console.log('[DEBUG - UPDATE MODAL] Found movieSidebar:', !!movieSidebar);
        // console.log('[DEBUG - UPDATE MODAL] Found tvSidebar:', !!tvSidebar);
        
        if (movieSidebar && tvSidebar) {
        if (this.currentTab === 'movies') {
                // console.log('[DEBUG - UPDATE MODAL] Setting movie sidebar to flex, tv sidebar to none');
                movieSidebar.style.display = 'flex';
                tvSidebar.style.display = 'none';
            } else if (this.currentTab === 'tvshows') {
                // console.log('[DEBUG - UPDATE MODAL] Setting movie sidebar to none, tv sidebar to flex');
                movieSidebar.style.display = 'none';
                tvSidebar.style.display = 'flex';
            } else {
                // console.log('[DEBUG - UPDATE MODAL] Setting both sidebars to none');
                movieSidebar.style.display = 'none';
                tvSidebar.style.display = 'none';
            }
        } else {
            console.warn('[DEBUG - UPDATE MODAL] One or both sidebar elements not found!');
        }
        
        // Handle different tabs appropriately
        if (this.currentTab === 'movies') {
            // For movies tab, attach click handlers to the rendered cards
            // console.log('[DEBUG - UPDATE MODAL] Attaching movie card handlers');
            this.attachMovieCardHandlers();
            this.updateHeartIcons();
            // Update collection buttons to show correct state
            setTimeout(async () => {
                await this.updateCollectionButtons();
            }, 50);
            // Ensure A-Z sidebar is rendered for movies - render immediately to prevent loading issues
            // console.log('[DEBUG - UPDATE MODAL] About to render movie A-Z sidebar');
            this.renderAZSidebarMovie();
        } else if (this.currentTab === 'tvshows') {
            // For TV shows tab, attach TV show specific handlers
            // console.log('[DEBUG - UPDATE MODAL] Attaching TV show handlers');
            // Add delay to ensure DOM is ready
            setTimeout(() => {
                this.attachTVShowHandlers();
                this.updateHeartIcons();
            }, 50);
            // Ensure A-Z sidebar is rendered for TV shows - render immediately to prevent loading issues
            // console.log('[DEBUG - UPDATE MODAL] About to render A-Z sidebar for TV shows');
            this.renderAZSidebarTVShow();
        } else if (this.currentTab === 'favorites') {
            // Favorites content already rendered by renderTabContent
            // console.log('[DEBUG - UPDATE MODAL] Favorites tab - content already rendered');
            
            // Add delay to ensure DOM is ready before attaching handlers
            setTimeout(() => {
                this.attachFavoritesHandlers();
                this.updateHeartIcons();
            }, 50);
        } else if (this.currentTab === 'collections') {
            // For collections tab, attach collection handlers
            // console.log('[DEBUG - UPDATE MODAL] Attaching collection handlers');
            this.attachCollectionHandlers();
        } else if (this.currentTab === 'watchlater') {
            // For Watch Later tab, render the content
            console.log('[DEBUG - UPDATE MODAL] Rendering Watch Later tab content');
            this.updateWatchLaterGrid();
        } else {
            // For other tabs (suggestions, etc.), use the general renderMediaGrid
            // console.log('[DEBUG - UPDATE MODAL] Using renderMediaGrid for other tabs');
            this.renderMediaGrid();
        }
    }

    async renderTabContent() {
        // console.log('[DEBUG - RenderTabContent] currentTab:', this.currentTab);
        // console.log('[DEBUG - RenderTabContent] currentTVShow:', this.currentTVShow);
        // console.log('[DEBUG - RenderTabContent] currentTVSeason:', this.currentTVSeason);
        
        switch (this.currentTab) {
            case 'movies':
                // console.log('[DEBUG - RenderTabContent] Rendering movies tab');
                return this.renderMoviesContent();
            case 'tvshows':
                if (this.currentTVShow) {
                    if (this.currentTVSeason) {
                        // console.log('[DEBUG - RenderTabContent] Rendering episodes view');
                        return this.renderEpisodesView();
                    } else {
                        // console.log('[DEBUG - RenderTabContent] Rendering seasons view');
                        return await this.renderSeasonsView(this.currentTVShow);
                    }
                } else {
                    // console.log('[DEBUG - RenderTabContent] Rendering TV-Shows tab');
                    return this.renderTVShowsTab();
                }
            case 'favorites':
                // console.log('[DEBUG - RenderTabContent] Rendering favorites tab');
                return this.renderFavoritesContent();
            case 'collections':
                // console.log('[DEBUG - RenderTabContent] Rendering collections tab');
                return this.renderCollectionsTab();
            case 'suggestions':
                // console.log('[DEBUG - RenderTabContent] Rendering suggestions tab');
                return this.renderSuggestionsContent();
            case 'watchlater':
                // console.log('[DEBUG - RenderTabContent] Rendering watchlater tab');
                return this.renderWatchLaterContent();
            default:
                // console.log('[DEBUG - RenderTabContent] Falling back to movies tab (default case)');
                return this.renderMoviesContent();
        }
    }

    async renderMediaGrid() {
        // console.log('>> 1. >>>>[MOVIE-LIBRARY] renderMediaGrid called');

        // Restore modal content class to current tab when returning from details views
        const modalContent = document.querySelector('.media-library-modal-content');
        if (modalContent) {
            modalContent.classList.remove('moviedetails', 'tvshowseason', 'tvshowepisodes');
            modalContent.classList.add(this.currentTab);
        }

        // TV shows are handled by renderTVShowsTab() and attachTVShowHandlers()
        // Watch Later is handled by renderWatchLaterContent()
        // This method is only for movies and other content
        if (this.currentTab === 'tvshows') {
            // console.log('[DEBUG] TV shows tab - using renderTVShowsTab instead of renderMediaGrid');
            return;
        }
        
        if (this.currentTab === 'watchlater') {
            // console.log('[DEBUG] Watch Later tab - using renderWatchLaterContent instead of renderMediaGrid');
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
            
            // Get the TMDB title for display (with periods) or fallback to regular title
            let displayTitle = item.TMDBTitle || item.title || item.name || item.filename || item.path || '';
            
            // If no TMDBTitle, try to restore periods to common titles
            if (!item.TMDBTitle && displayTitle) {
                // console.log('[DEBUG - TITLE] Original title:', displayTitle);
                displayTitle = this.restorePeriodsToTitle(displayTitle);
                // console.log('[DEBUG - TITLE] After restorePeriodsToTitle:', displayTitle);
            }
            
            // Clean the display title for UI - remove quality tags and keep only title and year
            // console.log('[DEBUG - TITLE] Before cleanTitleForDisplay:', displayTitle);
            displayTitle = this.cleanTitleForDisplay(displayTitle);
            // console.log('[DEBUG - TITLE] After cleanTitleForDisplay:', displayTitle);
            
            const firstLetter = displayTitle.charAt(0).toUpperCase();
            
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
                    <button class="collection-btn collection-btn-add" title="Add to Collection" data-path="${item.path}">➕</button>
                </div>
                <img src="${this.getPosterPath(item)}" alt="${displayTitle}" class="media-library-poster">
                <div class="media-info"><h3>${displayTitle}</h3></div>
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
            
            card.querySelector('.collection-btn').onclick = async (e) => {
                e.stopPropagation();
                const btn = e.target;
                const path = btn.dataset.path;
                
                try {
                    // Always show the manage collections modal for multiple collection support
                    // This allows users to add to more collections OR remove from existing ones
                    await this.showAddToCollectionModal(item);
                } catch (error) {
                    console.error('[DEBUG - COLLECTIONS] Error handling collection button click:', error);
                    this.showToast('Error opening collections modal', 'error');
                }
            };
            // Main card click opens details
            // console.log('>>> 2. >>>[MOVIE-LIBRARY] Attaching click handler to:', item.path);
            card.addEventListener('click', async (e) => {
                // console.log('>>> 3. >>>[MOVIE-LIBRARY] Movie card clicked:', item.path);
                // console.log('>>> 4. >>>[MOVIE-LIBRARY] Full item object:', item);
                await this.showMovieDetailsModal(item);
            });
            card.setAttribute('data-path', item.path);
            grid.appendChild(card);
        });
        // After rendering the grid, attach poster selector handlers
        this.attachPosterSelectorHandlers();

        // Update collection buttons to show correct state
        console.log('[DEBUG - COLLECTIONS] About to update collection buttons after rendering grid');
        await this.updateCollectionButtons();
        console.log('[DEBUG - COLLECTIONS] Collection buttons update completed');

        // Images load asynchronously without spinner
        console.log('[DEBUG - IMAGES] Loading', grid.querySelectorAll('img').length, 'images asynchronously');
    }











    getItemsForCurrentTab() {
        let items = [];
        console.log('[DEBUG] getItemsForCurrentTab called, currentTab:', this.currentTab);
        console.log('[DEBUG] moviesData length:', this.moviesData ? this.moviesData.length : 'undefined');
        console.log('[DEBUG] tvShowsData length:', this.tvShowsData ? this.tvShowsData.length : 'undefined');
        
        if (this.currentTab === 'movies') {
            items = this.moviesData || [];
            console.log('[MOVIE DEBUG] Raw movies array:', items.slice(0, 2));
            console.log('[MOVIE DEBUG] Total movies found:', items.length);
            console.log('[MOVIE DEBUG] First few movie titles:', items.slice(0, 3).map(m => m.TMDBTitle || m.title || m.name || m.filename || m.path || 'Unknown'));
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

    /**
     * Get poster path for movies and TV shows following the standard data flow:
     * PRIORITY 1: JSON files (normalized lowercase dot notation) - MOST RELIABLE
     * PRIORITY 2: localStorage (if we add cached poster data)
     * PRIORITY 3: MongoDB (if we add database poster storage)
     */
    getPosterPath(mediaItem) {
        // Debug: Log the call stack to see where this is being called from
        const stack = new Error().stack;
        const caller = stack.split('\n')[2] || 'unknown';
        // console.log('[COLLECTIONS_DEBUG] getPosterPath called from:', caller.trim());
        
        // Use shared normalization service
        if (!window.normalizeKey) {
            // console.error('[MEDIA-LIBRARY] NormalizationService not loaded - this should not happen!');
            return '/assets/img/placeholder-poster.jpg';
        }
        
        if (!mediaItem) {
            return '/assets/img/placeholder-poster.jpg';
        }
        
        // Determine if this is a TV show or movie using switch statement
        let isTV = false;
        let contextSource = 'unknown';
        
        switch (mediaItem.type) {
            case 'tvshow':
            case 'tv':
                isTV = true;
                contextSource = 'mediaItem.type';
                // console.log('[COLLECTIONS_DEBUG] Using mediaItem.type:', mediaItem.type, 'isTV:', isTV);
                break;
                
            case 'movie':
                isTV = false;
                contextSource = 'mediaItem.type';
                // console.log('[COLLECTIONS_DEBUG] Using mediaItem.type:', mediaItem.type, 'isTV:', isTV);
                break;
                
            case undefined:
            case null:
                // No type specified, fall back to context-based detection
                if (this.currentTab === 'collections' && mediaItem.path) {
                    isTV = mediaItem.path.toLowerCase().includes('tv-shows');
                    contextSource = 'collections_path';
                    // console.log('[COLLECTIONS_DEBUG] Using collections path detection, isTV:', isTV);
                } else {
                    isTV = (this.currentTab === 'tvshows');
                    contextSource = 'currentTab';
                    // console.log('[COLLECTIONS_DEBUG] Using currentTab detection, isTV:', isTV);
                }
                break;
                
            default:
                // Unknown type, fall back to path-based detection
                isTV = mediaItem.path.toLowerCase().includes('tv-shows');
                contextSource = 'path_fallback';
                // console.log('[COLLECTIONS_DEBUG] Unknown mediaItem.type:', mediaItem.type, 'using path fallback, isTV:', isTV);
                break;
        }
        
        // Get the correct poster map - try multiple sources to handle different loading scenarios
        let posterMap = null;
        if (isTV) {
            // Try tvPosters first, then tvShowPosters as fallback (for collections)
            posterMap = this.tvPosters || this.tvShowPosters;
        } else {
            posterMap = this.moviePosters;
        }
        
        // console.log('[COLLECTIONS_DEBUG] getPosterPath called for:', mediaItem.title || mediaItem.name);
        // console.log('[COLLECTIONS_DEBUG] mediaItem.type:', mediaItem.type);
        // console.log('[COLLECTIONS_DEBUG] currentTab:', this.currentTab);
        // console.log('[COLLECTIONS_DEBUG] isTV determined as:', isTV);
        // console.log('[COLLECTIONS_DEBUG] contextSource:', contextSource);
        // console.log('[COLLECTIONS_DEBUG] posterMap available:', !!posterMap);
        // console.log('[COLLECTIONS_DEBUG] posterMap keys count:', posterMap ? Object.keys(posterMap).length : 0);
        
        // For TV shows in Media Manager format, check if poster is directly available
        if (isTV && mediaItem.poster && mediaItem.poster.trim() !== '') {
            // console.log('[MEDIA-LIBRARY] Found direct poster URL for TV show:', mediaItem.poster);
            return mediaItem.poster;
        }
        
        if (!posterMap) {
            console.warn('[MEDIA-LIBRARY] No poster map available for current tab:', this.currentTab, 'isTV:', isTV);
            console.warn('[MEDIA-LIBRARY] Available poster maps - moviePosters:', !!this.moviePosters, 'tvPosters:', !!this.tvPosters);
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
                    // Extract show name from path (e.g., "TV-SHOWS/Daisy Jones & The Six (2023)" -> "Daisy Jones & The Six (2023)")
                    // Remove the "TV-SHOWS/" prefix if present
                    let pathParts = mediaItem.path.split(/[\\/]/);
                    if (pathParts[0].toLowerCase().includes('tv-shows') || pathParts[0].toLowerCase().includes('tv_shows') || pathParts[0].toLowerCase().includes('tv shows')) {
                        // Remove the first part (TV-SHOWS) and join the rest
                        pathParts.shift();
                        showName = pathParts.join('/');
                    } else {
                        showName = pathParts.pop();
                    }
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
        
        // For both movies and TV shows, try the normalizedKey first, then fallback to derived keys
        let possibleKeys = [dotKey];
        if (!mediaItem.normalizedKey) {
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
        
        // console.log('[COLLECTIONS_DEBUG] Looking for poster with keys:', possibleKeys, 'for show:', showName, 'in posterMap:', Object.keys(posterMap).slice(0, 10));
        // console.log('[COLLECTIONS_DEBUG] First few available keys in posterMap:', Object.keys(posterMap).slice(0, 5));
        
        // PRIORITY 1: JSON files (normalized lowercase dot notation) - MOST RELIABLE
        // Try exact match first
        for (const key of possibleKeys) {
            if (posterMap[key]) {
                let url = posterMap[key];
                if (this.cacheBusters && this.cacheBusters[key]) {
                    url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[key];
                }
                // console.log('[MEDIA-LIBRARY] Found poster with key:', key, 'URL:', url);
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
                    // console.log('[MEDIA-LIBRARY] Found poster with case-insensitive match for key:', possibleKey, 'URL:', url);
                    return url;
                }
            }
        }
        
        // PRIORITY 2: localStorage (if we have cached poster data)
        // This would be implemented if we add localStorage poster caching in the future
        
        // PRIORITY 3: MongoDB (if we add database poster storage in the future)
        // This would be implemented if we add MongoDB poster storage in the future
        
        // Log a warning if no poster found
        // console.warn('[COLLECTIONS_DEBUG] No poster found for:', mediaItem.title || mediaItem.name, 'Tried dot notation key:', dotKey);
        // console.warn('[COLLECTIONS_DEBUG] Available poster keys (first 10):', Object.keys(posterMap).slice(0, 10));
        // console.warn('[COLLECTIONS_DEBUG] Returning placeholder for:', mediaItem.title || mediaItem.name);
        return '/assets/img/placeholder-poster.jpg';
    }

    /**
     * Get poster path for TV shows following the standard data flow:
     * PRIORITY 1: JSON files (normalized lowercase dot notation) - MOST RELIABLE
     * PRIORITY 2: localStorage (if we add cached poster data)
     * PRIORITY 3: MongoDB (if we add database poster storage)
     */
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
        
        // Create standardized key - use normalizeKey for JSON files (no tvshows prefix)
        let showKey;
        if (year && !showName.includes(`(${year})`)) {
            // If we have a year but it's not in the title, append it before normalization
            showKey = window.normalizeKey(`${showName} (${year})`);
        } else {
            // Year is already in the title or no year, use normalizeKey directly
            showKey = window.normalizeKey(showName);
        }
        
        console.log('[MEDIA-LIBRARY] Looking for TV poster with key:', showKey, 'for show:', showName, 'year:', year, 'mediaItem:', mediaItem);
        
        // PRIORITY 1: JSON files (normalized lowercase dot notation) - MOST RELIABLE
        // Try exact match first
        if (posterMap[showKey]) {
            let url = posterMap[showKey];
            if (this.cacheBusters && this.cacheBusters[showKey]) {
                url += (url.includes('?') ? '&' : '?') + 't=' + this.cacheBusters[showKey];
            }
            // console.log('[MEDIA-LIBRARY] Found TV poster with exact match:', url);
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
                // console.log('[MEDIA-LIBRARY] Found TV poster with case-insensitive match:', url);
                return url;
            }
        }
        
        // PRIORITY 2: localStorage (if we have cached poster data)
        // This would be implemented if we add localStorage poster caching in the future
        
        // PRIORITY 3: MongoDB (if we add database poster storage in the future)
        // This would be implemented if we add MongoDB poster storage in the future
        
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
        console.log('[MEDIA-LIBRARY] playMedia called:', {mediaItem, startTime});
        console.log('[MEDIA-LIBRARY] Current tab:', this.currentTab);
        console.log('[MEDIA-LIBRARY] Media item properties:', {
            path: mediaItem.path,
            absPath: mediaItem.absPath,
            filePath: mediaItem.filePath,
            files: mediaItem.files,
            type: mediaItem.type,
            mediaType: mediaItem.mediaType,
            title: mediaItem.title,
            name: mediaItem.name
        });
        
        window.mediaLibraryManager.currentMediaItem = mediaItem;
        window.mediaLibraryManager.currentFile = mediaItem;
        
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
            // console.log('[MEDIA-LIBRARY] TV show episode detected, using TV show playback logic');
            // console.log('[MEDIA-LIBRARY] Current tab flag before calling playEpisodeFromObject:', this.currentTabFlag);
            
            // For Watch Later TV shows, if we already have filePath, use it directly
            if (mediaItem.filePath) {
                // console.log('[MEDIA-LIBRARY] Watch Later TV show has filePath, using directly:', mediaItem.filePath);
                await this.playEpisodeFromObject(JSON.stringify(mediaItem), startTime);
                return;
            }
            
            // For Watch Later TV shows without filePath, we need to find the actual episode data
            if (!mediaItem.absPath) {
                // console.log('[MEDIA-LIBRARY] Watch Later TV show missing filePath, searching for episode data...');
                
                // Try to find the episode in the TV shows data using the new normalized structure
                const tvShows = this.tvShowsData || [];
                let foundEpisode = null;
                
                // console.log('[MEDIA-LIBRARY] Searching for episode in', tvShows.length, 'TV shows');
                // console.log('[MEDIA-LIBRARY] Looking for path:', mediaItem.path);
                
                for (const tvShow of tvShows) {
                    if (tvShow.folders) {
                        for (const season of tvShow.folders) {
                            if (season.files) {
                                for (const episode of season.files) {
                                    const epPath = (episode.relPath || episode.path || '').replace(/\\/g, '/').trim();
                                    const searchPath = (mediaItem.path || '').replace(/\\/g, '/').trim();
                                    
                                    // console.log('[MEDIA-LIBRARY] Comparing:', epPath, 'with:', searchPath);
                                    
                                    if (epPath === searchPath) {
                                        foundEpisode = episode;
                                        // console.log('[MEDIA-LIBRARY] Found matching episode:', episode);
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
                    // console.log('[MEDIA-LIBRARY] Found episode data, playing with filePath:', foundEpisode.filePath);
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
        
        // ENSURE ALL MOVIE OBJECTS HAVE COMPLETE INFORMATION
        let fullMediaItem = { ...mediaItem }; // Create a copy to avoid modifying original
        
        // Always ensure absPath is present
        if (!fullMediaItem.absPath) {
            // console.log('[MEDIA-LIBRARY] Movie object missing absPath, constructing it...');
            // console.log('[MEDIA-LIBRARY] Original mediaItem:', mediaItem);
            
            // PRIORITY 1: Extract absPath from files array (for normalized movies)
            if (fullMediaItem.files && fullMediaItem.files.length > 0 && fullMediaItem.files[0].absPath) {
                fullMediaItem.absPath = fullMediaItem.files[0].absPath;
                console.log('[MEDIA-LIBRARY] ✅ EXTRACTED absPath from files array:', fullMediaItem.absPath);
            }
            // PRIORITY 2: Convert relative path to absolute path
            else if (fullMediaItem.path) {
                if (fullMediaItem.path.startsWith('movies/') || fullMediaItem.path.startsWith('MOVIES/')) {
                    fullMediaItem.absPath = `S:/MEDIA/${fullMediaItem.path}`;
                    // console.log('[MEDIA-LIBRARY] Constructed absPath for movie:', fullMediaItem.absPath);
                } else if (fullMediaItem.path.startsWith('tv-shows/') || fullMediaItem.path.startsWith('TV-SHOWS/')) {
                    fullMediaItem.absPath = `S:/MEDIA/${fullMediaItem.path}`;
                    // console.log('[MEDIA-LIBRARY] Constructed absPath for TV show:', fullMediaItem.absPath);
                } else if (fullMediaItem.path.includes(':/') || fullMediaItem.path.includes(':\\')) {
                    // Already an absolute path
                    fullMediaItem.absPath = fullMediaItem.path;
                    // console.log('[MEDIA-LIBRARY] Using existing absolute path:', fullMediaItem.absPath);
                } else {
                    // Assume it's a movie path
                    fullMediaItem.absPath = `S:/MEDIA/MOVIES/${fullMediaItem.path}`;
                    // console.log('[MEDIA-LIBRARY] Constructed absPath with MOVIES prefix:', fullMediaItem.absPath);
                }
            }
        }
        
        // Handle Watch Later items that don't have full file information
        if (!fullMediaItem.files && !fullMediaItem.absPath && fullMediaItem.path) {
            // console.log('[MEDIA-LIBRARY] Watch Later item missing file info, searching media library...');
            // console.log('[MEDIA-LIBRARY] Watch Later item path:', mediaItem.path);
            // console.log('[MEDIA-LIBRARY] Watch Later item title:', mediaItem.title);
            
            // Ensure media library is loaded
            if (!this.mediaLibraryRaw || this.mediaLibraryRaw.length === 0) {
                // console.log('[MEDIA-LIBRARY] Media library not loaded, loading now...');
                await this.loadMediaLibrary();
            }
            
            console.log('[MEDIA-LIBRARY] Media library length:', this.mediaLibraryRaw.length);
            
            // Try to find the original movie in the media library
            // First, try direct match by path
            let originalMovie = this.mediaLibraryRaw.find(item => 
                item.path === mediaItem.path || 
                item.title === mediaItem.title ||
                (item.name && item.name === mediaItem.title)
            );
            
            // If not found, search recursively through folders
            if (!originalMovie) {
                // console.log('[MEDIA-LIBRARY] Direct match failed, searching recursively...');
                const searchInFolders = (folders, depth = 0) => {
                    for (const folder of folders) {
                        // console.log(`[MEDIA-LIBRARY] Searching at depth ${depth}:`, folder.name, folder.path);
                        
                        // Check if this folder matches
                        if (folder.path === mediaItem.path || 
                            folder.title === mediaItem.title ||
                            (folder.name && folder.name === mediaItem.title)) {
                            // console.log('[MEDIA-LIBRARY] Found matching folder:', folder);
                            return folder;
                        }
                        
                        // Search in subfolders
                        if (folder.folders && folder.folders.length > 0) {
                            const found = searchInFolders(folder.folders, depth + 1);
                            if (found) return found;
                        }
                        
                        // Search in files
                        if (folder.files && folder.files.length > 0) {
                            // console.log(`[MEDIA-LIBRARY] Checking ${folder.files.length} files in ${folder.name}`);
                            const found = folder.files.find(file => 
                                file.path === mediaItem.path ||
                                file.title === mediaItem.title ||
                                (file.name && file.name === mediaItem.title)
                            );
                            if (found) {
                                // console.log('[MEDIA-LIBRARY] Found matching file:', found);
                                return found;
                            }
                        }
                    }
                    return null;
                };
                
                originalMovie = searchInFolders(this.mediaLibraryRaw);
            }
            
            if (originalMovie) {
                // console.log('[MEDIA-LIBRARY] Found original movie for Watch Later item:', originalMovie);
                // console.log('[MEDIA-LIBRARY] Original movie has files:', !!originalMovie.files);
                // console.log('[MEDIA-LIBRARY] Original movie has absPath:', !!originalMovie.absPath);
                
                // Merge the original movie data with our enhanced data
                fullMediaItem = { ...originalMovie, ...fullMediaItem };
                
                // Ensure absPath is still present
                if (!fullMediaItem.absPath && fullMediaItem.path) {
                    if (fullMediaItem.path.startsWith('movies/') || fullMediaItem.path.startsWith('MOVIES/')) {
                        fullMediaItem.absPath = `S:/MEDIA/${fullMediaItem.path}`;
                    } else if (fullMediaItem.path.startsWith('tv-shows/') || fullMediaItem.path.startsWith('TV-SHOWS/')) {
                        fullMediaItem.absPath = `S:/MEDIA/${fullMediaItem.path}`;
                    } else if (fullMediaItem.path.includes(':/') || fullMediaItem.path.includes(':\\')) {
                        fullMediaItem.absPath = fullMediaItem.path;
                    } else {
                        fullMediaItem.absPath = `S:/MEDIA/MOVIES/${fullMediaItem.path}`;
                    }
                }
                
                // Update the current media item to use the full version
                window.mediaLibraryManager.currentMediaItem = fullMediaItem;
                window.mediaLibraryManager.currentFile = fullMediaItem;
            } else {
                console.warn('[MEDIA-LIBRARY] Could not find original movie in media library for:', fullMediaItem.path);
                console.warn('[MEDIA-LIBRARY] Available movie paths:', this.mediaLibraryRaw.map(item => item.path).slice(0, 5));
            }
        }
        
        // Final verification - ensure absPath is present
        if (!fullMediaItem.absPath) {
            console.error('[MEDIA-LIBRARY] CRITICAL ERROR: Movie object still missing absPath after all attempts!');
            console.error('[MEDIA-LIBRARY] fullMediaItem:', fullMediaItem);
            this.showMediaLibraryError('Failed to load movie information. Please try again.');
            return;
        }
        
        // console.log('[MEDIA-LIBRARY] Final movie object with complete information:', fullMediaItem);
        
                // SIMPLE PATH RESOLUTION - Get video path regardless of data structure
        let pathParam = '';
        console.log('[MEDIA-LIBRARY] Resolving video path for:', {
            title: fullMediaItem.title,
            absPath: fullMediaItem.absPath,
            filePath: fullMediaItem.filePath,
            path: fullMediaItem.path,
            hasFiles: fullMediaItem.files && fullMediaItem.files.length > 0
        });
        
        // Get the video path - simple and direct
        if (fullMediaItem.absPath) {
            // Use the standardized absPath field
            pathParam = fullMediaItem.absPath;
            console.log('[MEDIA-LIBRARY] ✅ Using absPath:', pathParam);
        } else if (fullMediaItem.files && fullMediaItem.files.length > 0 && fullMediaItem.files[0].absPath) {
            // Extract from files array (for normalized movies)
            pathParam = fullMediaItem.files[0].absPath;
            console.log('[MEDIA-LIBRARY] ✅ Extracted from files array:', pathParam);
        } else if (fullMediaItem.filePath) {
            // Use filePath (for TV shows or movies with filePath)
            if (fullMediaItem.mediaType === 'tv-show' || fullMediaItem.type === 'tv-show') {
                pathParam = `S:/MEDIA/TV-SHOWS/${fullMediaItem.filePath}`;
            } else {
                // For movies: construct from filePath
            const folderPath = fullMediaItem.filePath;
            const videoFilename = folderPath.replace(/\s+/g, '.') + '.mp4';
            pathParam = `S:/MEDIA/MOVIES/${folderPath}/${videoFilename}`;
            }
            console.log('[MEDIA-LIBRARY] 🔧 Constructed from filePath:', pathParam);
        } else if (fullMediaItem.path && this.currentTab === 'movies') {
            // For movies from main tab: construct from path
            const folderPath = fullMediaItem.path;
            const videoFilename = folderPath.replace(/\s+/g, '.') + '.mp4';
            pathParam = `S:/MEDIA/MOVIES/${folderPath}/${videoFilename}`;
            console.log('[MEDIA-LIBRARY] 🔧 Constructed from path (main tab):', pathParam);
        } else {
            // Last resort - this shouldn't happen with proper data
            pathParam = fullMediaItem.path || fullMediaItem.relPath || '';
            console.error('[MEDIA-LIBRARY] ❌ No valid path found for:', fullMediaItem.title);
        }
        
        console.log('[MEDIA-LIBRARY] Path before encoding:', pathParam);
        if (!pathParam.includes('%')) {
            pathParam = encodeURIComponent(pathParam);
        }
        const videoUrl = `/api/video?path=${pathParam}`;
        console.log('[MEDIA-LIBRARY] Final video URL:', videoUrl);
        console.log('[MEDIA-LIBRARY] Decoded path for verification:', decodeURIComponent(pathParam));
        
        // Set return location based on current context
        if (window.videoPlayer) {
            // Determine where we're coming from
            let returnLocation = { type: 'media-library' };
            
            // console.log('[RETURN-LOCATION-DEBUG] Current tab flag:', this.currentTabFlag);
            // console.log('[RETURN-LOCATION-DEBUG] Current TV show:', this.currentTVShow);
            // console.log('[RETURN-LOCATION-DEBUG] Current TV season:', this.currentTVSeason);
            
            // Use switch statement for cleaner return location logic
            switch (this.currentTabFlag) {
                case 'watchlater':
                    returnLocation = { type: 'watch-later' };
                    console.log('[RETURN-LOCATION-DEBUG] Setting return location to watch-later');
                    break;
                    
                case 'movies':
                    returnLocation = { type: 'movies' };
                    console.log('[RETURN-LOCATION-DEBUG] Setting return location to movies');
                    break;
                    
                case 'favorites':
                    returnLocation = { type: 'favorites' };
                    console.log('[RETURN-LOCATION-DEBUG] Setting return location to favorites');
                    break;
                    
                case 'tvshows':
                    returnLocation = { type: 'media-library', tab: 'TV-Shows' };
                    console.log('[RETURN-LOCATION-DEBUG] Setting return location to tvshows');
                    break;
                    
                default:
                    console.log('[RETURN-LOCATION-DEBUG] Using default return location: media-library');
                    break;
            }
            
            console.log('[RETURN-LOCATION-DEBUG] Final return location:', returnLocation);
            window.videoPlayer.setReturnLocation(returnLocation);
        }
        
                console.log('[DEBUG - MEDIA-LIBRARY] About to call playUrl with:');
        //console.log('[DEBUG - MEDIA-LIBRARY] videoUrl:', videoUrl);
        //console.log('[DEBUG - MEDIA-LIBRARY] fullMediaItem:', fullMediaItem);
        //console.log('[DEBUG - MEDIA-LIBRARY] fullMediaItem.absPath:', fullMediaItem?.absPath);
        //console.log('[DEBUG - MEDIA-LIBRARY] fullMediaItem.path:', fullMediaItem?.path);
        //console.log('[DEBUG - MEDIA-LIBRARY] fullMediaItem.files:', fullMediaItem?.files);
        //console.log('[DEBUG - MEDIA-LIBRARY] fullMediaItem.title:', fullMediaItem?.title);
        //console.log('[DEBUG - MEDIA-LIBRARY] fullMediaItem.name:', fullMediaItem?.name);

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
        
        // REMOVED: Auto-save on pause - this was causing unwanted Watch Later saves
        // Only the "Save for Later" button should save progress
        
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
        
        // Preserve common abbreviations with periods before general dot replacement
        name = name.replace(/\bU\.S\.\b/gi, 'US_ABBREV');
        name = name.replace(/\bU\.K\.\b/gi, 'UK_ABBREV');
        name = name.replace(/\bU\.N\.\b/gi, 'UN_ABBREV');
        name = name.replace(/\bU\.S\.A\.\b/gi, 'USA_ABBREV');
        name = name.replace(/\bMr\.\b/gi, 'MR_ABBREV');
        name = name.replace(/\bMrs\.\b/gi, 'MRS_ABBREV');
        name = name.replace(/\bDr\.\b/gi, 'DR_ABBREV');
        name = name.replace(/\bProf\.\b/gi, 'PROF_ABBREV');
        name = name.replace(/\bSt\.\b/gi, 'ST_ABBREV');
        name = name.replace(/\bAve\.\b/gi, 'AVE_ABBREV');
        name = name.replace(/\bBlvd\.\b/gi, 'BLVD_ABBREV');
        name = name.replace(/\bRd\.\b/gi, 'RD_ABBREV');
        name = name.replace(/\bLn\.\b/gi, 'LN_ABBREV');
        name = name.replace(/\bCt\.\b/gi, 'CT_ABBREV');
        name = name.replace(/\bCo\.\b/gi, 'CO_ABBREV');
        name = name.replace(/\bInc\.\b/gi, 'INC_ABBREV');
        name = name.replace(/\bLtd\.\b/gi, 'LTD_ABBREV');
        name = name.replace(/\bCorp\.\b/gi, 'CORP_ABBREV');
        
        // Replace dots, underscores, dashes with spaces (but preserve the abbreviations we just marked)
        name = name.replace(/[._-]+/g, " ");
        
        // Restore abbreviations with proper formatting
        name = name.replace(/US_ABBREV/gi, 'U.S.');
        name = name.replace(/UK_ABBREV/gi, 'U.K.');
        name = name.replace(/UN_ABBREV/gi, 'U.N.');
        name = name.replace(/USA_ABBREV/gi, 'U.S.A.');
        name = name.replace(/MR_ABBREV/gi, 'Mr.');
        name = name.replace(/MRS_ABBREV/gi, 'Mrs.');
        name = name.replace(/DR_ABBREV/gi, 'Dr.');
        name = name.replace(/PROF_ABBREV/gi, 'Prof.');
        name = name.replace(/ST_ABBREV/gi, 'St.');
        name = name.replace(/AVE_ABBREV/gi, 'Ave.');
        name = name.replace(/BLVD_ABBREV/gi, 'Blvd.');
        name = name.replace(/RD_ABBREV/gi, 'Rd.');
        name = name.replace(/LN_ABBREV/gi, 'Ln.');
        name = name.replace(/CT_ABBREV/gi, 'Ct.');
        name = name.replace(/CO_ABBREV/gi, 'Co.');
        name = name.replace(/INC_ABBREV/gi, 'Inc.');
        name = name.replace(/LTD_ABBREV/gi, 'Ltd.');
        name = name.replace(/CORP_ABBREV/gi, 'Corp.');
        
        // Remove extra spaces
        name = name.replace(/\s+/g, " ").trim();
        // Capitalize each word
        name = this.capitalizeTitle(name);
        return name;
    }

    // Restore periods to common movie titles that should have them
    restorePeriodsToTitle(title) {
        if (!title || typeof title !== 'string') return title;
        
        // Common movie title corrections
        const corrections = {
            'Mr and Mrs Smith': 'Mr. & Mrs. Smith',
            'Mr Magoriums Wonder Emporium': 'Mr. Magorium\'s Wonder Emporium',
            'Mrs Doubtfire': 'Mrs. Doubtfire',
            'U.S. Marshalls': 'U.S. Marshals',
            'U.S. Marshals': 'U.S. Marshals',
            'Dr Strangelove': 'Dr. Strangelove',
            'Prof X': 'Prof. X',
            'St Elmos Fire': 'St. Elmo\'s Fire',
            'Ave Maria': 'Ave. Maria',
            'Blvd of Broken Dreams': 'Blvd. of Broken Dreams',
            'Rd to Perdition': 'Rd. to Perdition',
            'Ln of the Lambs': 'Ln. of the Lambs',
            'Ct of the Lambs': 'Ct. of the Lambs',
            'Co of the Lambs': 'Co. of the Lambs',
            'Inc of the Lambs': 'Inc. of the Lambs',
            'Ltd of the Lambs': 'Ltd. of the Lambs',
            'Corp of the Lambs': 'Corp. of the Lambs'
        };
        
        // Also check for titles with years and quality tags
        const correctionsWithYear = {
            'Mr and Mrs Smith (2005) [1080p]': 'Mr. & Mrs. Smith (2005) [1080p]',
            'Mr Magoriums Wonder Emporium (2007) [1080p]': 'Mr. Magorium\'s Wonder Emporium (2007) [1080p]',
            'Mrs Doubtfire': 'Mrs. Doubtfire'
        };
        
        // First, extract the base title (remove year and quality tags)
        let baseTitle = title;
        
        // Remove year in parentheses
        baseTitle = baseTitle.replace(/\(\d{4}\)/g, '');
        
        // Remove quality tags in brackets
        baseTitle = baseTitle.replace(/\[\d{3,4}p\]/gi, '');
        baseTitle = baseTitle.replace(/\[.*?\]/g, '');
        
        // Remove extra spaces
        baseTitle = baseTitle.trim();
        
        // console.log('[DEBUG - TITLE] Base title after cleaning:', baseTitle);
        
        // Check for exact matches with year and quality tags first
        if (correctionsWithYear[title]) {
            // console.log('[DEBUG - TITLE] Found exact match with year/quality for:', title);
            return correctionsWithYear[title];
        }
        
        // Check for exact matches in base title
        if (corrections[baseTitle]) {
            // console.log('[DEBUG - TITLE] Found exact match for:', baseTitle);
            return corrections[baseTitle];
        }
        
        // Check for partial matches (case insensitive)
        const lowerBaseTitle = baseTitle.toLowerCase();
        for (const [wrong, correct] of Object.entries(corrections)) {
            if (lowerBaseTitle.includes(wrong.toLowerCase())) {
                // console.log('[DEBUG - TITLE] Found partial match:', wrong, '->', correct);
                // Replace in the original title to preserve year and quality tags
                return title.replace(new RegExp(wrong, 'gi'), correct);
            }
        }
        
        // console.log('[DEBUG - TITLE] No corrections found for:', baseTitle);
        return title;
    }

    // Convert normalized key to readable display title
    convertNormalizedKeyToDisplayTitle(normalizedKey) {
        if (!normalizedKey || typeof normalizedKey !== 'string') return normalizedKey;
        
        // console.log('[DEBUG - TITLE] convertNormalizedKeyToDisplayTitle input:', normalizedKey);
        
        // Extract year before removing other elements
        const yearMatch = normalizedKey.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : null;
        
        // Remove quality tags first
        let cleanKey = normalizedKey.replace(/\[\d{3,4}p\]/gi, ''); // Remove [1080p], [720p], etc.
        cleanKey = cleanKey.replace(/\[.*?\]/g, ''); // Remove any other brackets
        
        // Remove year in parentheses (we already extracted it above)
        cleanKey = cleanKey.replace(/\(\d{4}\)/g, '');
        
        // Remove extra spaces and trim
        cleanKey = cleanKey.replace(/\s+/g, ' ').trim();
        
        // Replace dots with spaces and capitalize properly
        let displayTitle = cleanKey.replace(/\./g, ' ');
        
        // Capitalize each word
        displayTitle = displayTitle.split(' ').map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
        
        // Special corrections for common titles
        const corrections = {
            'Mr and Mrs Smith': 'Mr. and Mrs. Smith',
            'Mr Magoriums Wonder Emporium': 'Mr. Magorium\'s Wonder Emporium',
            'Mrs Doubtfire': 'Mrs. Doubtfire',
            'Dr Strangelove': 'Dr. Strangelove',
            'St Elmos Fire': 'St. Elmo\'s Fire',
            'Ave Maria': 'Ave. Maria',
            'Blvd of Broken Dreams': 'Blvd. of Broken Dreams',
            'Rd to Perdition': 'Rd. to Perdition',
            'Ln of the Lambs': 'Ln. of the Lambs',
            'Ct of the Lambs': 'Ct. of the Lambs',
            'Co of the Lambs': 'Co. of the Lambs',
            'Inc of the Lambs': 'Inc. of the Lambs',
            'Ltd of the Lambs': 'Ltd. of the Lambs',
            'Corp of the Lambs': 'Corp. of the Lambs',
            'Mr': 'Mr.',
            'Mrs': 'Mrs.',
            'Dr': 'Dr.',
            'Prof': 'Prof.',
            'St': 'St.',
            'Ave': 'Ave.',
            'Blvd': 'Blvd.',
            'Rd': 'Rd.',
            'Ln': 'Ln.',
            'Ct': 'Ct.',
            'Co': 'Co.',
            'Inc': 'Inc.',
            'Ltd': 'Ltd.',
            'Corp': 'Corp.'
        };
        
        // Apply corrections - first check for exact matches
        for (const [wrong, correct] of Object.entries(corrections)) {
            if (displayTitle.toLowerCase() === wrong.toLowerCase()) {
                displayTitle = correct;
                break;
            }
        }
        
        // Then apply word-level corrections for abbreviations
        const abbreviationCorrections = {
            'Mr': 'Mr.',
            'Mrs': 'Mrs.',
            'Dr': 'Dr.',
            'Prof': 'Prof.',
            'St': 'St.',
            'Ave': 'Ave.',
            'Blvd': 'Blvd.',
            'Rd': 'Rd.',
            'Ln': 'Ln.',
            'Ct': 'Ct.',
            'Co': 'Co.',
            'Inc': 'Inc.',
            'Ltd': 'Ltd.',
            'Corp': 'Corp.'
        };
        
        // Apply abbreviation corrections to individual words
        const words = displayTitle.split(' ');
        const correctedWords = words.map(word => {
            const lowerWord = word.toLowerCase();
            for (const [abbrev, corrected] of Object.entries(abbreviationCorrections)) {
                if (lowerWord === abbrev.toLowerCase()) {
                    return corrected;
                }
            }
            return word;
        });
        displayTitle = correctedWords.join(' ');
        
        // Add year back to the display title if it exists
        if (year) {
            displayTitle = `${displayTitle} (${year})`;
        }
        
        // console.log('[DEBUG - TITLE] Final display title:', displayTitle);
        return displayTitle;
    }

    // Clean title for UI display - remove quality tags, keep only title and year
    cleanTitleForDisplay(title) {
        if (!title || typeof title !== 'string') return title;
        
        // console.log('[DEBUG - TITLE] cleanTitleForDisplay input:', title);
        
        // Remove quality tags in brackets
        let cleanTitle = title.replace(/\[\d{3,4}p\]/gi, ''); // Remove [1080p], [720p], etc.
        // console.log('[DEBUG - TITLE] After removing quality tags:', cleanTitle);
        
        cleanTitle = cleanTitle.replace(/\[.*?\]/g, ''); // Remove any other brackets
        // console.log('[DEBUG - TITLE] After removing all brackets:', cleanTitle);
        
        // Remove extra spaces
        cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();
        // console.log('[DEBUG - TITLE] After removing extra spaces:', cleanTitle);
        
        // Remove trailing/leading spaces around parentheses
        cleanTitle = cleanTitle.replace(/\s*\(\s*/g, ' (').replace(/\s*\)\s*/g, ') ');
        // console.log('[DEBUG - TITLE] After fixing parentheses spacing:', cleanTitle);
        
        // Final trim
        cleanTitle = cleanTitle.trim();
        
        // console.log('[DEBUG - TITLE] Final cleaned title:', cleanTitle);
        
        return cleanTitle;
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

    async handleSearchInput(event) {
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
        await this.updateModalContent();
        this.updateCount();
    }

    async handleSortChange(event) {
        this.sortBy = event.target.value;
        // Use updateModalContent to handle all tabs including TV-Shows
        await this.updateModalContent();
        this.updateCount();
    }



    // Add: A-Z sidebar rendering
    renderAZSidebarMovie() {
        console.log('[DEBUG - A-Z] renderAZSidebarMovie called at:', new Date().toISOString());
        console.log('[DEBUG - A-Z] Current azSidebarLoaded flag before render:', this.azSidebarLoaded);
        
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
        console.log('[DEBUG - A-Z] Filtered items count:', filteredItems.length);
        
        const availableLetters = new Set();
        
        // Collect all first letters from the filtered items
        filteredItems.forEach(item => {
            const displayTitle = item.TMDBTitle || item.title || item.name || item.filename || item.path || '';
            const firstLetter = displayTitle.charAt(0).toUpperCase();
            if (firstLetter && /[A-Z]/.test(firstLetter)) {
                availableLetters.add(firstLetter);
            }
        });
        
        console.log('[DEBUG - A-Z] Found movie sidebar, rendering letters for filtered items');
        movieSidebar.innerHTML = '';
        movieSidebar.style.display = 'flex';
        
        // Only render letters that have movies in the current filtered results
        const letters = Array.from(availableLetters).sort();
        console.log('[DEBUG - A-Z] Available letters:', letters);
        
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
        console.log('[DEBUG - A-Z] Sidebar children count after render:', movieSidebar.children.length);
        
        // Set the flag to indicate A-Z sidebar is loaded
        this.azSidebarLoaded = true;
        console.log('[DEBUG - A-Z] A-Z sidebar loading flag set to true');
        
        // Debug: log the current flag status after setting
        console.log('[DEBUG - A-Z] Current azSidebarLoaded flag after setting:', this.azSidebarLoaded);
        console.log('[DEBUG - A-Z] Movie A-Z sidebar render completed at:', new Date().toISOString());
    }

    renderAZSidebarTVShow() {
        console.log('[DEBUG - A-Z] renderAZSidebarTVShow called at:', new Date().toISOString());
        console.log('[DEBUG - A-Z] Current azSidebarLoaded flag before render:', this.azSidebarLoaded);
        
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
        
        // console.log('[DEBUG - A-Z] Found sidebar, rendering TV show letters for filtered items');
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
        // console.log('[DEBUG - A-Z] TV show A-Z sidebar rendered with', letters.length, 'letters:', letters.join(', '));
        
        // Set the flag to indicate A-Z sidebar is loaded
        this.azSidebarLoaded = true;
        console.log('[DEBUG - A-Z] A-Z sidebar loading flag set to true');
        
        // Debug: log the current flag status after setting
        console.log('[DEBUG - A-Z] Current azSidebarLoaded flag after setting:', this.azSidebarLoaded);
        console.log('[DEBUG - A-Z] TV Show A-Z sidebar render completed at:', new Date().toISOString());
    }

    scrollToLetterMovie(letter) {
        // console.log('🔤 [A-Z] scrollToLetterMovie called with letter:', letter);
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
        // console.log('🔤 [A-Z] scrollToLetterTVShows called with letter:', letter);
        // Find the anchor for this letter (TV-Shows use .media-library-anchor)
        const anchor = document.querySelector(`.media-library-anchor[data-anchor="${letter}"]`);
        // console.log('[DEBUG - A-Z] Looking for anchor with data-anchor="' + letter + '", found:', anchor);
        
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
            // console.log('[DEBUG - A-Z] Found card:', card);
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
            // console.log('[DEBUG - A-Z] Trying alternative selector, found TV card:', tvCard);
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
                // console.log('🔤 [A-Z] Found and scrolled to TV show card using alternative selector for letter:', letter);
            }
        }
    }

    // Remove duplicate scrollToLetterTVShows method

    // Update: renderMediaGrid to use search, sort, shuffle
    getFilteredAndSortedItems() {
        const items = this.getItemsForCurrentTab();
        if (!items || !Array.isArray(items)) {
            // console.log('[DEBUG] No items or items is not an array, returning empty array');
            return [];
        }
        // console.log('[MOVIE DEBUG] Items before filtering:', items.length, items.slice(0, 3));
        
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
        
        // console.log('[DEBUG - FILTER] Current tab:', this.currentTab);
        // console.log('[DEBUG - FILTER] Current search query:', currentSearchQuery);
        // console.log('[DEBUG - FILTER] movieSearchQuery:', this.movieSearchQuery);
        // console.log('[DEBUG - FILTER] tvShowSearchQuery:', this.tvShowSearchQuery);
        
        // Apply search filter
        let filtered = this.filterItems(items, currentSearchQuery);
        console.log('[MOVIE DEBUG] Items after search filtering:', filtered.length, filtered.slice(0, 3));
        
        // Apply genre filter if not "All Genres"
        if (this.selectedGenre && this.selectedGenre !== 'All Genres') {
            filtered = this.filterByGenre(filtered, this.selectedGenre);
            console.log('[MOVIE DEBUG] Items after genre filtering:', filtered.length, filtered.slice(0, 3));
        }
        
                    // For movies, sort by original display title; for favorites, preserve original order; for others, sort by name
            if (this.currentTab === 'movies') {
                return filtered.slice().sort((a, b) => {
                    const titleA = (a.TMDBTitle || a.title || a.name || a.filename || a.path || '').toLowerCase();
                    const titleB = (b.TMDBTitle || b.title || b.name || b.filename || b.path || '').toLowerCase();
                    if (this.sortBy === 'asc') {
                        return titleA.localeCompare(titleB);
                    } else {
                        return titleB.localeCompare(titleA);
                    }
                });
        } else if (this.currentTab === 'favorites') {
            // For favorites, preserve the original order (order added to favorites)
            return filtered;
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
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await this.removeResumeProgress(item.path);
                        this.updateWatchLaterGrid().then(() => {
                        this.showToast('Removed from Watch Later');
                        });
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
        console.log('[WATCH-LATER DEBUG] Resume list loaded:', resumeList.length, 'items');
        console.log('[WATCH-LATER DEBUG] Sample resume items:', resumeList.slice(0, 3));
        
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
        
        console.log('[WATCH-LATER DEBUG] TV shows filtered:', tvshows.length, 'items');
        console.log('[WATCH-LATER DEBUG] Movies filtered:', movies.length, 'items');
        console.log('[WATCH-LATER DEBUG] Sample TV show items:', tvshows.slice(0, 2));
        console.log('[WATCH-LATER DEBUG] Sample movie items:', movies.slice(0, 2));
        // Helper for TV show label and screenshot
        const getTvShowLabel = (item) => {
            let path = decodeURIComponent(item.path || '');
            // Try to extract show name and SxxExx
            let show = '', code = '', year = '';
            
            // console.log('[DEBUG - WATCH-LATER] getTvShowLabel called with path:', path);
            // console.log('[DEBUG - WATCH-LATER] tvShowsData available:', this.tvShowsData ? 'YES' : 'NO');
            // console.log('[DEBUG - WATCH-LATER] tvShowsData length:', this.tvShowsData ? this.tvShowsData.length : 'N/A');
            
            // First, try to find the show data from the JSON to get the year
            // Handle both array and object formats for tvShowsData
            let tvShowsArray = [];
            if (Array.isArray(this.tvShowsData)) {
                tvShowsArray = this.tvShowsData;
            } else if (typeof this.tvShowsData === 'object' && this.tvShowsData) {
                tvShowsArray = Object.values(this.tvShowsData);
            }
            
            if (tvShowsArray.length > 0) {
                // console.log('[DEBUG - WATCH-LATER] Searching through', tvShowsArray.length, 'TV shows for path:', path);
                
                for (const tvShow of tvShowsArray) {
                    // Check if this episode belongs to this show by matching the path
                    if (tvShow.folders) {
                        for (const season of tvShow.folders) {
                            if (season.files) {
                                for (const episode of season.files) {
                                    const epPath = (episode.relPath || episode.path || '').replace(/\\/g, '/').trim();
                                    const searchPath = path.replace(/\\/g, '/').trim();
                                    
                                    if (epPath === searchPath) {
                                        // console.log('[DEBUG - WATCH-LATER] Found matching episode!');
                                        // console.log('[DEBUG - WATCH-LATER] Show path:', tvShow.path);
                                        // console.log('[DEBUG - WATCH-LATER] Show normalizedKey:', tvShow.normalizedKey);
                                        
                                        // Found the show! Extract year from the normalizedKey
                                        if (tvShow.normalizedKey) {
                                            const yearMatch = tvShow.normalizedKey.match(/\((\d{4})\)/);
                                            if (yearMatch) {
                                                year = yearMatch[1];
                                            }
                                            
                                            // Extract show name from normalizedKey (remove the year part)
                                            show = tvShow.normalizedKey.replace(/\.\(\d{4}\)$/, '').replace(/\./g, ' ').trim();
                                        } else {
                                            // Fallback to path parsing if no normalizedKey
                                            const yearMatch = tvShow.path.match(/\((\d{4})\)/);
                                            if (yearMatch) {
                                                year = yearMatch[1];
                                            }
                                            show = tvShow.path.replace(/\s*\(\d{4}\)\s*$/, '').trim();
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
                
                // Fallback to path parsing if needed
            }
            
            // If we didn't find the show in JSON data, fall back to path parsing
            if (!show) {
                
                // Try to match 'TV-SHOWS/Show/Season 01/Show S01E02 ...'
                let match = path.match(/TV-?SHOWS[\\/](.*?)[\\/].*?[Ss](\d{2})[Ee](\d{2})/i);
                if (match) {
                    const folderName = match[1].replace(/_/g, ' ').trim();
                    
                    // Extract year from folder name
                    const yearMatch = folderName.match(/\((\d{4})\)/);
                    if (yearMatch) {
                        year = yearMatch[1];
                        show = folderName.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                    } else {
                        show = folderName;
                    }
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
                    if (parts.length > 2) {
                        const folderName = parts[parts.length - 3].replace(/_/g, ' ').trim();
                        
                        const yearMatch = folderName.match(/\((\d{4})\)/);
                        if (yearMatch) {
                            year = yearMatch[1];
                            show = folderName.replace(/\s*\(\d{4}\)\s*$/, '').trim();
                        } else {
                            show = folderName;
                        }
                    }
                }
            }
            
            // If we have show name but no episode code, try to extract from filename
            if (show && !code) {
                const filename = path.split(/[\\/]/).pop() || '';
                const epMatch = filename.match(/[Ss](\\d{2})[Ee](\\d{2})/i);
                if (epMatch) {
                    code = `S${epMatch[1]}E${epMatch[2]}`;
                }
            }
            
            // Capitalize the show name properly
            const capitalizeShowName = (showName) => {
                if (!showName) return showName;
                // Replace dots with spaces and capitalize each word
                return showName
                    .replace(/\./g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            };
            
            // Build the label with year if available
            if (show && code) {
                const capitalizedShow = capitalizeShowName(show);
                const finalLabel = year ? `${capitalizedShow} (${year}): ${code}` : `${capitalizedShow}: ${code}`;
                return finalLabel;
            } else if (show) {
                // If we have show name but no episode code, just show the show with year
                const capitalizedShow = capitalizeShowName(show);
                const finalLabel = year ? `${capitalizedShow} (${year})` : capitalizedShow;
                return finalLabel;
            }
            
            const fallbackLabel = item.title || item.name || 'Episode';
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
                                <div class="media-info"><h3 class="watch-later-title">${(() => {
                                    // Use normalizedKey for display title, fallback to path if needed
                                    let displayTitle = '';
                                    if (item.normalizedKey) {
                                        // Convert normalized key to readable display format
                                        displayTitle = this.convertNormalizedKeyToDisplayTitle(item.normalizedKey);
                                    } else if (item.path) {
                                        // Fallback to path and clean it
                                        displayTitle = this.cleanTitleForDisplay(item.path);
                                    } else {
                                        displayTitle = item.TMDBTitle || item.title || item.name || item.filename || 'Movie';
                                    }
                                    return displayTitle;
                                })()}</h3></div>
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
                <div class="watch-later-scroll-tv-shows">
                    <div class="watch-later-grid">
                                        ${tvshows.map(item => {
                    // Use the EXACT SAME method as main TV-SHOWS tab - get episode object directly
                    const episodeObj = this.getEpisodeObjectFromPath(item.path);
                    console.log('[DEBUG - TV-RENDER] Processing TV item:', item.title, 'path:', item.path, 'episodeObj found:', !!episodeObj);
                    console.log('[DEBUG - TV-RENDER] Item details:', { title: item.title, path: item.path, type: item.type, lastWatched: item.lastWatched });
                    
                    if (!episodeObj) {
                        console.error('[ERROR - TV-RENDER] Cannot render TV show without episode object:', item.title, 'path:', item.path);
                        return ''; // Skip this item - it's corrupted
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

            // Attach handlers for movies and delete buttons after DOM update
            setTimeout(() => {
                // Delete handlers for both movies and TV shows
                document.querySelectorAll('.watch-later-delete-btn').forEach(btn => {
                    btn.onclick = async (e) => {
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
                                        // Path extracted successfully
                                    } catch (error) {
                                        // Error parsing episode data
                                    }
                                }
                            }
                        }
                        
                        if (path) {
                            await this.removeResumeProgress(path);
                            this.updateWatchLaterGrid();
                            this.showToast('Removed from Watch Later');
                        } else {
                            this.showToast('Error: Could not remove item', 'error');
                        }
                    };
                });
                
                // Resume handlers for movies - USE SAME CODE AS MAIN MOVIES SECTION
                document.querySelectorAll('.media-library-movie-card-movies .watch-later-resume-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const card = btn.closest('.watch-later-card');
                        const path = card ? card.getAttribute('data-path') : null;
                        const item = resumeList.find(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (path || '').replace(/\\/g, '/').toLowerCase().trim());
                        if (item) {
                            // Use the same playMedia method as main Movies section
                            this.playMedia(item, item.currentTime || 0);
                        }
                    };
                });
                
                // Resume handlers for TV shows - USE SAME CODE AS MAIN TV-SHOWS SECTION
                document.querySelectorAll('.media-library-card.episode .watch-later-resume-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        const card = btn.closest('.watch-later-card');
                        if (card) {
                            const resumeTime = card.getAttribute('data-resume-time') || 0;
                            
                            // Check if this card has episode data or just a path
                            const episodeData = card.getAttribute('data-episode');
                            if (episodeData) {
                                // Full episode card - use playEpisodeFromDataAttribute
                            this.playEpisodeFromDataAttribute(card, parseFloat(resumeTime));
                            } else {
                                // This should never happen - all TV shows should have episode data
                                console.error('[ERROR - WATCH-LATER] TV show card missing episode data:', card);
                                this.showToast('Error: TV show data is corrupted', 'error');
                            }
                        }
                    };
                });
                
                // Image click handlers for movies only - USE SAME CODE AS MAIN MOVIES SECTION
                document.querySelectorAll('.media-library-movie-card-movies .watch-later-img-clickable').forEach(img => {
                    img.onclick = async (e) => {
                        e.stopPropagation();
                        const card = img.closest('.watch-later-card');
                        const path = card ? card.getAttribute('data-path') : null;
                        const item = resumeList.find(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (path || '').replace(/\\/g, '/').toLowerCase().trim());
                        if (item) {
                            // Use the same playMedia method as main Movies section
                            this.playMedia(item, item.currentTime || 0);
                        }
                    };
                });
                
                // Image click handlers for TV shows - USE SAME CODE AS MAIN TV-SHOWS SECTION
                document.querySelectorAll('.media-library-card.episode .media-library-card-poster img').forEach(img => {
                    img.onclick = async (e) => {
                        e.stopPropagation();
                        const card = img.closest('.watch-later-card');
                        if (card) {
                            const resumeTime = card.getAttribute('data-resume-time') || 0;
                            
                            // Check if this card has episode data or just a path
                            const episodeData = card.getAttribute('data-episode');
                            if (episodeData) {
                                // Full episode card - use playEpisodeFromDataAttribute
                            this.playEpisodeFromDataAttribute(card, parseFloat(resumeTime));
                            } else {
                                // This should never happen - all TV shows should have episode data
                                console.error('[ERROR - WATCH-LATER] TV show image missing episode data:', card);
                                this.showToast('Error: TV show data is corrupted', 'error');
                            }
                        }
                    };
                });
                

                

            }, 0);
        }
        return html;
    }

    // Helper method to update Watch Later grid content
    updateWatchLaterGrid() {
        if (this.currentTab === 'watchlater') {
            const grid = document.getElementById('mediaGrid');
            if (grid) {
                const html = this.renderWatchLaterContent();
                grid.innerHTML = html;
                this.attachWatchLaterHandlers();
            }
        }
    }

    // Helper method to attach Watch Later event handlers
    attachWatchLaterHandlers() {
        setTimeout(() => {
            // Delete handlers for both movies and TV shows
            document.querySelectorAll('.watch-later-delete-btn').forEach(btn => {
                btn.onclick = async (e) => {
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
                } catch (error) {
                                    console.error('[WATCH-LATER] Error parsing episode data:', error);
                                }
                            }
                        }
                    }
                    
                    if (path) {
                        await this.removeResumeProgress(path);
                        this.updateWatchLaterGrid();
                        this.showToast('Removed from Watch Later');
                    } else {
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
                    
                    if (path) {
                        // Get the resume list to find the item
                        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
                        const item = resumeList.find(i => (i.path || '').replace(/\\/g, '/').toLowerCase().trim() === (path || '').replace(/\\/g, '/').toLowerCase().trim());
                        if (item) {
                            this.playMedia(item, item.currentTime || 0);
                        }
                    }
                };
            });
            
            // Resume handlers for TV shows
            document.querySelectorAll('.media-library-card.episode .watch-later-resume-btn').forEach(btn => {
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    const card = btn.closest('.watch-later-card');
                    const episodeData = card ? card.getAttribute('data-episode') : null;
                    
                    if (episodeData) {
                        try {
                            const episode = JSON.parse(episodeData);
                            this.playEpisode(episode, episode.currentTime || 0);
                } catch (error) {
                            console.error('[WATCH-LATER] Error parsing episode data:', error);
                            this.showToast('Error loading episode data', 'error');
                        }
                    }
                };
            });
        }, 0);
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
            // console.log('[DEBUG - FAVORITES] Initialized favorites localStorage');
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
        // console.log('[DEBUG - FAVORITES] Backed up favorites to localStorage');
    }
    
    // Restore favorites from backup
    restoreFavorites() {
        const backup = localStorage.getItem('mediaLibraryFavoritesBackup');
        if (backup) {
            try {
                const backupData = JSON.parse(backup);
                localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(backupData.data));
                // console.log('[DEBUG - FAVORITES] Restored favorites from backup');
                return true;
            } catch (e) {
                // console.error('[DEBUG - FAVORITES] Failed to restore favorites from backup:', e);
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
        //console.log('[DEBUG - FAVORITES] isFavorite check for path:', path, 'result:', isFav, 'favs:', favs);
        return isFav;
    }
    async toggleFavorite(path, type) {
        // console.log('[DEBUG - FAVORITES] toggleFavorite called with path:', path, 'type:', type);
        
        // Initialize favorites storage if needed
        this.initializeFavoritesStorage();
        
        let favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        if (!favs.movies) favs.movies = [];
        if (!favs.tvshows) favs.tvshows = [];
        
        // console.log('[DEBUG - FAVORITES] Current favorites before toggle:', favs);
        
        const list = (type === 'tv' || type === 'tvshow' || type === 'tvshows') ? favs.tvshows : favs.movies;
        
        if (list.includes(path)) {
            // Remove from favorites
            favs.movies = favs.movies.filter(p => p !== path);
            favs.tvshows = favs.tvshows.filter(p => p !== path);
                console.log('[DEBUG - FAVORITES] Removed from favorites:', path);
        } else {
            // Add to favorites - add to the beginning so they appear at the top
            if (type === 'tv' || type === 'tvshow' || type === 'tvshows') {
                favs.tvshows.unshift(path);
                // console.log('[DEBUG - FAVORITES] Added TV show to favorites (top):', path);
            } else {
                favs.movies.unshift(path);
                // console.log('[DEBUG - FAVORITES] Added movie to favorites (top):', path);
            }
        }
        
        localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(favs));
            // console.log('[DEBUG - FAVORITES] Saved to localStorage, new favs:', favs);
        
        // Update heart icons immediately
        setTimeout(() => {
            this.updateHeartIcons();
        }, 50);
        
        // If on favorites tab, refresh the content
        if (this.currentTab === 'favorites') {
            await this.updateModalContent();
        }
    }
    getFavoritesList() {
        // SIMPLE: Just return localStorage data
        let favs;
        try {
            favs = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
        } catch (error) {
            // console.error('[DEBUG - FAVORITES] Failed to read from localStorage:', error);
            favs = { movies: [], tvshows: [] };
        }
        
        return {
            movies: favs.movies || [],
            tvshows: favs.tvshows || [],
        };
    }

    // ========================================
    // COLLECTIONS MANAGEMENT METHODS
    // ========================================

    /**
     * Get collections from localStorage first, then MongoDB as fallback
     */
    async getCollections() {
        // Check localStorage first for existing collections
        try {
            // Check both the old key (mediaLibraryCollections) and new key (mediaCollections)
            let stored = localStorage.getItem('mediaCollections');
            let keyUsed = 'mediaCollections';
            
            // If new key is empty, try the old key
            if (!stored) {
                stored = localStorage.getItem('mediaLibraryCollections');
                keyUsed = 'mediaLibraryCollections';
            }
            
            console.log('[DEBUG - COLLECTIONS] Raw localStorage data from key "' + keyUsed + '":', stored);
            
            if (stored) {
                const collections = JSON.parse(stored);
                console.log('[DEBUG - COLLECTIONS] Parsed localStorage collections:', collections);
                console.log('[DEBUG - COLLECTIONS] Collection keys:', Object.keys(collections));
                console.log('[DEBUG - COLLECTIONS] Total collections count:', Object.keys(collections).length);
                
                // If we have collections in localStorage, return them immediately
                if (collections && Object.keys(collections).length > 0) {
                    console.log('[DEBUG - COLLECTIONS] Returning collections from localStorage');
                    
                    // If we found collections in the old key, migrate them to the new key
                    if (keyUsed === 'mediaLibraryCollections') {
                        console.log('[DEBUG - COLLECTIONS] Migrating collections from old key to new key');
                        localStorage.setItem('mediaCollections', JSON.stringify(collections));
                        localStorage.removeItem('mediaLibraryCollections');
                    }
                    
                    return collections;
            } else {
                    console.log('[DEBUG - COLLECTIONS] localStorage collections are empty or invalid');
                }
            } else {
                console.log('[DEBUG - COLLECTIONS] No data found in localStorage for either key');
            }
                } catch (error) {
            console.warn('[DEBUG - COLLECTIONS] Error parsing localStorage collections:', error);
        }

        // Only try MongoDB if localStorage is empty
        console.log('[DEBUG - COLLECTIONS] localStorage empty, trying MongoDB...');
        try {
            const response = await fetch('/api/collections');
            if (response.ok) {
                const collections = await response.json();
                console.log('[DEBUG - COLLECTIONS] getCollections from MongoDB:', collections);
                
                // If MongoDB has collections, save them to localStorage for future use
                if (collections && Object.keys(collections).length > 0) {
                    localStorage.setItem('mediaCollections', JSON.stringify(collections));
                    console.log('[DEBUG - COLLECTIONS] Collections synced from MongoDB to localStorage');
                }
                
                return collections || {};
            }
        } catch (error) {
            console.warn('[DEBUG - COLLECTIONS] MongoDB fetch failed:', error);
        }

        // Return empty collections if both sources fail
        console.log('[DEBUG - COLLECTIONS] Both sources failed, returning empty collections');
        return {};
    }

    /**
     * Save collections to MongoDB and localStorage
     */
        async saveCollections(collections) {
        // Save to localStorage first for immediate access
        try {
            localStorage.setItem('mediaCollections', JSON.stringify(collections));
            console.log('[DEBUG - COLLECTIONS] Collections saved to localStorage with key "mediaCollections"');
            
            // Also remove the old key if it exists to avoid confusion
            if (localStorage.getItem('mediaLibraryCollections')) {
                localStorage.removeItem('mediaLibraryCollections');
                console.log('[DEBUG - COLLECTIONS] Removed old localStorage key "mediaLibraryCollections"');
            }
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error saving to localStorage:', error);
        }
        
        // Then sync to MongoDB as backup
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(collections)
            });
            
            if (response.ok) {
                console.log('[DEBUG - COLLECTIONS] Collections synced to MongoDB successfully');
            } else {
                console.warn('[DEBUG - COLLECTIONS] MongoDB sync failed, response:', response.status);
            }
        } catch (error) {
            console.warn('[DEBUG - COLLECTIONS] MongoDB sync failed, collections remain in localStorage:', error);
        }
    }

    /**
     * Debug localStorage collections on initialization
     */
    debugLocalStorageCollections() {
        console.log('[DEBUG - COLLECTIONS] === localStorage Collections Debug ===');
        
        // Check both keys
        const newKey = localStorage.getItem('mediaCollections');
        const oldKey = localStorage.getItem('mediaLibraryCollections');
        
        console.log('[DEBUG - COLLECTIONS] New key "mediaCollections":', newKey);
        console.log('[DEBUG - COLLECTIONS] Old key "mediaLibraryCollections":', oldKey);
        
        if (newKey) {
            try {
                const parsed = JSON.parse(newKey);
                console.log('[DEBUG - COLLECTIONS] Parsed new key:', parsed);
                console.log('[DEBUG - COLLECTIONS] Collection names from new key:', Object.keys(parsed));
            } catch (e) {
                console.error('[DEBUG - COLLECTIONS] Error parsing new key:', e);
            }
        }
        
        if (oldKey) {
            try {
                const parsed = JSON.parse(oldKey);
                console.log('[DEBUG - COLLECTIONS] Parsed old key:', parsed);
                console.log('[DEBUG - COLLECTIONS] Collection names from old key:', Object.keys(parsed));
            } catch (e) {
                console.error('[DEBUG - COLLECTIONS] Error parsing old key:', e);
            }
        }
        
        console.log('[DEBUG - COLLECTIONS] === End Debug ===');
    }

    /**
     * Normalize path to lowercase dot notation
     */
    normalizePath(path) {
        if (!path) return '';
        const normalized = path.replace(/\\/g, '/').toLowerCase().trim();
        console.log('[DEBUG - COLLECTIONS] normalizePath input:', path, 'output:', normalized);
        return normalized;
    }

    /**
     * Check if a media item is in a specific collection
     */
    async isInCollection(path, collectionName = null) {
        try {
            const normalizedPath = this.normalizePath(path);
            console.log('[DEBUG - COLLECTIONS] isInCollection called with path:', path, 'normalized:', normalizedPath, 'collectionName:', collectionName);
            const collections = await this.getCollections();
            console.log('[DEBUG - COLLECTIONS] Collections loaded for check:', collections);
            
            if (collectionName) {
                // Check specific collection
                const result = collections[collectionName] && collections[collectionName].some(storedPath => 
                    this.normalizePath(storedPath) === normalizedPath
                );
                console.log('[DEBUG - COLLECTIONS] Check in specific collection:', collectionName, 'result:', result);
                return result;
            } else {
                // Check if item is in any collection
                const result = Object.values(collections).some(collection => 
                    collection && collection.some(storedPath => 
                        this.normalizePath(storedPath) === normalizedPath
                    )
                );
                console.log('[DEBUG - COLLECTIONS] Check in any collection, result:', result);
                return result;
            }
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error checking collection membership:', error);
            return false;
        }
    }

    /**
     * Add a media item to multiple collections
     */
    async addToCollection(collectionNames, path) {
        try {
            const normalizedPath = this.normalizePath(path);
            const collections = await this.getCollections();
            
            // Handle both single string and array of collection names
            const namesToAdd = Array.isArray(collectionNames) ? collectionNames : [collectionNames];
            
            let addedToAny = false;
            const results = [];
            
            for (const collectionName of namesToAdd) {
                if (!collectionName.trim()) continue;
            
            if (!collections[collectionName]) {
                collections[collectionName] = [];
            }
            
            // Check if normalized path already exists
            const alreadyExists = collections[collectionName].some(storedPath => 
                this.normalizePath(storedPath) === normalizedPath
            );
            
            if (!alreadyExists) {
                collections[collectionName].push(path); // Store original path
                    addedToAny = true;
                    results.push({ collection: collectionName, added: true });
                console.log('[DEBUG - COLLECTIONS] Added to collection:', collectionName, 'original path:', path, 'normalized:', normalizedPath);
            } else {
                    results.push({ collection: collectionName, added: false, reason: 'Already exists' });
                console.log('[DEBUG - COLLECTIONS] Item already in collection:', collectionName, 'original path:', path, 'normalized:', normalizedPath);
                }
            }
            
            if (addedToAny) {
                await this.saveCollections(collections);
                
                // Immediately update the collection button state
                await this.updateSingleCollectionButton(path);
                
                return { success: true, results };
            } else {
                return { success: false, results, message: 'Item already in all specified collections' };
            }
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error adding to collection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove a media item from multiple collections
     */
    async removeFromCollection(collectionNames, path) {
        try {
            const normalizedPath = this.normalizePath(path);
            const collections = await this.getCollections();
            
            // Handle both single string and array of collection names
            const namesToRemove = Array.isArray(collectionNames) ? collectionNames : [collectionNames];
            
            let removedFromAny = false;
            const results = [];
            
            for (const collectionName of namesToRemove) {
                if (!collections[collectionName]) {
                    results.push({ collection: collectionName, removed: false, reason: 'Collection not found' });
                    console.log('[DEBUG - COLLECTIONS] Collection not found:', collectionName);
                    continue;
                }
                
                // Find and remove the item
                const originalIndex = collections[collectionName].findIndex(storedPath => 
                    this.normalizePath(storedPath) === normalizedPath
                );
                
                if (originalIndex !== -1) {
                    collections[collectionName].splice(originalIndex, 1);
                    removedFromAny = true;
                    results.push({ collection: collectionName, removed: true });
                    console.log('[DEBUG - COLLECTIONS] Removed from collection:', collectionName, 'original path:', path, 'normalized:', normalizedPath);
                
                // Remove empty collections
                if (collections[collectionName].length === 0) {
                    delete collections[collectionName];
                    }
                } else {
                    results.push({ collection: collectionName, removed: false, reason: 'Item not found' });
                    console.log('[DEBUG - COLLECTIONS] Item not found in collection:', collectionName, 'original path:', path, 'normalized:', normalizedPath);
                }
                }
                
            if (removedFromAny) {
                await this.saveCollections(collections);
                
                // Immediately update the collection button state
                await this.updateSingleCollectionButton(path);
                
                return { success: true, results };
            } else {
                return { success: false, results, message: 'Item not found in any specified collections' };
            }
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error removing from collection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all collections that a media item belongs to
     */
    async getItemCollections(path) {
        try {
            const normalizedPath = this.normalizePath(path);
            const collections = await this.getCollections();
            const itemCollections = [];
            
            console.log('[DEBUG - COLLECTIONS] getItemCollections called for path:', path);
            console.log('[DEBUG - COLLECTIONS] Normalized path:', normalizedPath);
            console.log('[DEBUG - COLLECTIONS] All collections:', collections);
            
            for (const [collectionName, paths] of Object.entries(collections)) {
                console.log(`[DEBUG - COLLECTIONS] Checking collection "${collectionName}":`, paths);
                if (paths && paths.some(storedPath => 
                    this.normalizePath(storedPath) === normalizedPath
                )) {
                    itemCollections.push(collectionName);
                    console.log(`[DEBUG - COLLECTIONS] Found in collection "${collectionName}"`);
                }
            }
            
            console.log('[DEBUG - COLLECTIONS] Final result for path:', path, 'Collections:', itemCollections);
            return itemCollections;
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error getting item collections:', error);
            return [];
        }
    }

    /**
     * Delete an entire collection
     */
    async deleteCollection(collectionName) {
        try {
            const collections = await this.getCollections();
            delete collections[collectionName];
            await this.saveCollections(collections);
            console.log('[DEBUG - COLLECTIONS] Deleted collection:', collectionName);
            return true;
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error deleting collection:', error);
            return false;
        }
    }

    /**
     * View a collection (get its items)
     */
    async viewCollection(collectionName) {
        try {
            const collections = await this.getCollections();
            const collectionItems = collections[collectionName] || [];
            console.log('[DEBUG - COLLECTIONS] Viewing collection:', collectionName, collectionItems);
            
            if (collectionItems.length > 0) {
                await this.showCollectionModal(collectionName, collectionItems);
            } else {
                this.showToast(`Collection "${collectionName}" is empty`, 'info');
            }
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error viewing collection:', error);
            this.showToast('Error viewing collection', 'error');
        }
    }

    // ========================================
    // COLLECTION MODAL METHODS
    // ========================================

    /**
     * Show modal to add/create a collection
     */
    async showAddToCollectionModal(mediaItem) {
        try {
            // Remove any existing modal
            const existing = document.getElementById('addToCollectionModal');
            if (existing) existing.remove();

            // Get current collections for dropdown
            const collections = await this.getCollections();
            const collectionNames = Object.keys(collections).sort((a, b) => 
                a.localeCompare(b, undefined, { 
                    sensitivity: 'base',
                    numeric: true,
                    caseFirst: 'upper'
                })
            );

            // Get current collections for this item
            const itemCollections = await this.getItemCollections(mediaItem.path);

            // Create modal HTML
            const modalHTML = `
                <div id="addToCollectionModal" class="collection-modal-overlay">
                    <div class="collection-modal-add-create-content">
                        <div class="collection-modal-header">
                            <h3>Manage Collections: ${this.getDisplayTitle(mediaItem)}</h3>
                            <button class="collection-modal-btn collection-modal-btn-close" id="closeCollectionModal">&times;</button>
                        </div>
                        
                        <div class="collection-modal-body">
                            <div class="collections-modal-section">
                                <label class="collections-modal-label">Current Collections:</label>
                                <div id="currentCollectionsList" class="collections-modal-current-list">
                                    ${itemCollections.length > 0 
                                        ? itemCollections.map(name => `
                                            <span class="collections-modal-tag">
                                                ${name} 
                                                <button class="remove-collection-btn" data-collection="${name}">×</button>
                                            </span>
                                        `).join('')
                                        : '<span class="collections-modal-no-collections">Not in any collections</span>'
                                    }
                                </div>
                            </div>
                            
                            <div class="collections-modal-section">
                                <label class="collections-modal-label">Add to Collections:</label>
                                <div class="collections-modal-checkbox-list">
                                    ${collectionNames.map(name => `
                                        <label class="collections-modal-checkbox-item">
                                            <input type="checkbox" value="${name}" ${itemCollections.includes(name) ? 'checked disabled' : ''}>
                                            <span class="collections-modal-checkbox-text">${name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            
                            <div class="collections-modal-divider">
                                <div class="collections-modal-divider-line"></div>
                                <span class="collections-modal-divider-text">or</span>
                        </div>
                        
                            <div class="collections-modal-section">
                                <label class="collections-modal-label">Create new collection:</label>
                                <input id="newCollectionInput" type="text" placeholder="New collection name" class="collection-input">
                            </div>
                        </div>
                        
                        <div class="collection-modal-footer">
                            <button id="cancelCollectionBtn" class="collection-modal-btn collection-modal-btn-cancel">Cancel</button>
                            <button id="addCollectionBtn" class="collection-modal-btn collection-modal-btn-primary">Update Collections</button>
                            </div>
                                </div>
                        </div>
                    `;

            // Insert modal into DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Get modal elements
            const modal = document.getElementById('addToCollectionModal');
            const newInput = document.getElementById('newCollectionInput');
            const addBtn = document.getElementById('addCollectionBtn');
            const cancelBtn = document.getElementById('cancelCollectionBtn');
            const closeBtn = document.getElementById('closeCollectionModal');

            // Close modal function
            const closeModal = () => {
                modal.remove();
            };

            // Event listeners
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
            
            // Handle remove collection buttons
            modal.addEventListener('click', async (e) => {
                if (e.target.classList.contains('remove-collection-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const collectionName = e.target.dataset.collection;
                    const mediaTitle = this.getDisplayTitle(mediaItem);
                    if (confirm(`Remove "${mediaTitle}" from "${collectionName}"?`)) {
                        try {
                            const result = await this.removeFromCollection(collectionName, mediaItem.path);
                            if (result.success) {
                                this.showToast(`Removed "${mediaTitle}" from "${collectionName}"!`, 'success');
                                
                                // Refresh the modal to show updated collections
                                await this.showAddToCollectionModal(mediaItem);
                            } else {
                                this.showToast('Error removing from collection', 'error');
                            }
                        } catch (error) {
                            console.error('[DEBUG - COLLECTIONS] Error removing from collection:', error);
                            this.showToast('Error removing from collection', 'error');
                        }
                    }
                }
            });

            // Add to collection logic
            addBtn.addEventListener('click', async () => {
                // Show loading state with spinner
                const originalText = addBtn.textContent;
                addBtn.innerHTML = '<span class="collection-btn-spinner"></span> Updating...';
                addBtn.disabled = true;
                
                // Get selected collections from checkboxes
                const selectedCollections = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)'))
                    .map(cb => cb.value.trim())
                    .filter(name => name);
                
                // Get new collection name if entered
                const newName = newInput.value.trim();
                if (newName) {
                    selectedCollections.push(newName);
                }
                
                if (selectedCollections.length === 0) {
                    this.showToast('Please select collections or enter a new collection name.', 'error');
                    // Reset button state
                    addBtn.innerHTML = originalText;
                    addBtn.disabled = false;
                    return;
                }

                try {
                    const result = await this.addToCollection(selectedCollections, mediaItem.path);
                                        if (result.success) {
                        const addedCount = result.results.filter(r => r.added).length;
                        if (addedCount > 0) {
                            const mediaTitle = this.getDisplayTitle(mediaItem);
                            this.showToast(`Added "${mediaTitle}" to ${addedCount} collection(s)!`, 'success');
                        } else {
                            this.showToast('No changes made to collections.', 'info');
                        }
                        closeModal();
                        
                        // Update collection buttons in the grid
                        await this.updateCollectionButtons();
                        
                        console.log('[DEBUG - COLLECTIONS] Collection buttons updated after updating collections');
                    } else {
                        this.showToast(result.message || 'Error updating collections', 'error');
                    }
                } catch (error) {
                    console.error('[DEBUG - COLLECTIONS] Error updating collections:', error);
                    this.showToast('Error updating collections', 'error');
                } finally {
                    // Always reset button state
                    addBtn.innerHTML = originalText;
                    addBtn.disabled = false;
                }
            });

            console.log('[DEBUG - COLLECTIONS] Add to collection modal opened for:', mediaItem);
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error opening add to collection modal:', error);
            this.showToast('Error opening collection modal', 'error');
        }
    }



    /**
     * Show collection contents modal (COLLECTIONS ONLY - NO SHARED FUNCTIONALITY)
     */
    async showCollectionModal(collectionName, collectionItems) {
        try {
            // Remove any existing modal
            const existingModal = document.getElementById('collectionModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // LOAD JSON DATA FIRST - NO FALLBACKS
            
            // Load movie posters JSON into class property
            try {
                const movieResponse = await fetch('/components/MediaLibrary/data/movies/movie_posters_normalized.json?v=' + Date.now());
                if (movieResponse.ok) {
                    this.moviePosters = await movieResponse.json();
                } else {
                    console.error('[COLLECTIONS] Failed to load movie posters:', movieResponse.status);
                }
            } catch (error) {
                console.error('[COLLECTIONS] Error loading movie posters:', error);
            }
            
            // Load TV show posters JSON into class property
            try {
                const tvResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json?v=' + Date.now());
                if (tvResponse.ok) {
                    this.tvPosters = await tvResponse.json();
                } else {
                    console.error('[COLLECTIONS] Failed to load TV show posters:', tvResponse.status);
                }
            } catch (error) {
                console.error('[COLLECTIONS] Error loading TV show posters:', error);
            }
            
            // Use centralized data loading method for TV shows
            await this.ensureTVShowDataLoaded();
            
            // Create modal HTML
            let modalHTML = `
                <div id="collectionModal" class="modal-collections-overlay">
                    <div class="modal-collections-content">
                        <div class="modal-collections-header">
                            <h3 class="modal-collections-header-title">Collection: ${collectionName}</h3>
                            <button onclick="document.getElementById('collectionModal').remove()" class="modal-collections-btn modal-collections-btn-cancel">×</button>
                        </div>
                        <div class="modal-collections-body">
            `;
            
            // PROPER MEDIA TYPE DETECTION - Check for TV show paths first
            collectionItems.forEach((path, index) => {
                const pathLower = path.toLowerCase();
                const isTVShow = pathLower.includes('tv-shows') || pathLower.includes('tv_shows') || pathLower.includes('tv shows');
            });
            
            const tvShows = collectionItems.filter(path => {
                const pathLower = path.toLowerCase();
                return pathLower.includes('tv-shows') || pathLower.includes('tv_shows') || pathLower.includes('tv shows');
            });
            
            const movies = collectionItems.filter(path => {
                const pathLower = path.toLowerCase();
                return !pathLower.includes('tv-shows') && !pathLower.includes('tv_shows') && !pathLower.includes('tv shows');
            });
            

            modalHTML += `
                <div class="modal-collections-section modal-collections-movies-section">
                    <h3 class="modal-collections-section-title" style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">MOVIES (${movies.length})</h3>
                    <div class="modal-collections-movies-grid">
            `;
            
            if (movies.length > 0) {
                for (const path of movies) {
                    // Extract title from path
                    const title = this.extractTitleFromPath(path);
                    
                    // Get poster from JSON using the smart getPosterPath method
                    let posterPath = 'assets/img/placeholder-poster.jpg';
                    
                    // Create a proper mediaItem object for getPosterPath
                    const mediaItem = { 
                        path: path, 
                        type: 'movie',
                        title: title,
                        name: title
                    };
                    
                    // Force movie poster lookup by temporarily setting currentTab
                    const originalTab = this.currentTab;
                    this.currentTab = 'movies';
                    const jsonPoster = this.getPosterPath(mediaItem);
                    this.currentTab = originalTab;
                    
                    if (jsonPoster && jsonPoster !== '/assets/img/placeholder-poster.jpg') {
                        posterPath = jsonPoster;
                    }
                    
                    modalHTML += `
                        <div class="modal-collections-item" data-path="${path}" data-type="movie">
                            <div class="modal-collections-item-actions">
                                <button class="modal-collections-remove-btn" data-collection="${collectionName}" data-path="${path}" data-type="movie" title="Remove from Collection">➖</button>
                            </div>
                            <img src="${posterPath}" alt="${title}" class="modal-collections-poster" onerror="this.src='assets/img/placeholder-poster.jpg'">
                            <div class="modal-collections-item-title">${title}</div>
                        </div>
                    `;
                }
            } else {
                modalHTML += '<div class="modal-collections-empty-message">No movies in this collection</div>';
            }
            modalHTML += '</div></div>';
            
            // RIGHT SIDE: TV Shows in collection (using the already-detected tvShows array)
            modalHTML += `
                <div class="modal-collections-section modal-collections-tvshows-section">
                    <h3 class="modal-collections-section-title" style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">TV-SHOWS (${tvShows.length})</h3>
                    <div class="modal-collections-tvshows-grid">
            `;
            
            if (tvShows.length > 0) {
                for (const path of tvShows) {
                    const title = this.extractTitleFromPath(path);
                    
                    // Get poster from JSON using the smart getPosterPath method
                    let posterPath = 'assets/img/placeholder-poster.jpg';
                    
                    // Create a proper mediaItem object for getPosterPath
                    const mediaItem = { 
                        path: path, 
                        type: 'tvshow',
                        title: title,
                        name: title
                    };
                    
                    // Force TV show poster lookup by temporarily setting currentTab
                    const originalTab = this.currentTab;
                    this.currentTab = 'tvshows';
                    const jsonPoster = this.getPosterPath(mediaItem);
                    this.currentTab = originalTab;
                    
                    if (jsonPoster && jsonPoster !== '/assets/img/placeholder-poster.jpg') {
                        posterPath = jsonPoster;
                    }
                    
                    modalHTML += `
                        <div class="modal-collections-item" data-path="${path}" data-type="tvshow">
                            <div class="modal-collections-item-actions">
                                <button class="modal-collections-remove-btn" data-collection="${collectionName}" data-path="${path}" data-type="tvshow" title="Remove from Collection">➖</button>
                            </div>
                            <img src="${posterPath}" alt="${title}" class="modal-collections-poster" onerror="this.src='assets/img/placeholder-poster.jpg'">
                            <div class="modal-collections-item-title">${title}</div>
                        </div>
                    `;
                }
            } else {
                modalHTML += '<div class="modal-collections-empty-message">No TV shows in this collection</div>';
            }
            modalHTML += '</div></div>';
            
            modalHTML += `
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Use our dedicated Collections modal handlers
            this.attachCollectionsModalHandlers(collectionName);
        } catch (error) {
            console.error('[COLLECTIONS] Error showing collection modal:', error);
            this.showToast(`Error showing collection modal: ${error.message}`, 'error');
        }
    }

    /**
     * Show favorites modal (FAVORITES ONLY - NO SHARED FUNCTIONALITY)
     */
    async showFavoritesModal(favoritesList) {
        try {
            console.log('[FAVORITES] Opening favorites modal with items:', favoritesList);
            
            // Remove any existing modal
            const existingModal = document.getElementById('favoritesModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // LOAD JSON DATA FIRST - NO FALLBACKS
            console.log('[FAVORITES] Loading JSON poster data...');
            
            // Load movie posters JSON into class property
            try {
                const movieResponse = await fetch('/components/MediaLibrary/data/movies/movie_posters_normalized.json?v=' + Date.now());
                if (movieResponse.ok) {
                    this.moviePosters = await movieResponse.json();
                    console.log('[FAVORITES] Loaded movie posters into class property:', Object.keys(this.moviePosters).length, 'keys');
                } else {
                    console.error('[FAVORITES] Failed to load movie posters:', movieResponse.status);
                        }
                    } catch (error) {
                console.error('[FAVORITES] Error loading movie posters:', error);
            }
            
            // Load TV show posters JSON into class property
            try {
                const tvResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json?v=' + Date.now());
                if (tvResponse.ok) {
                    this.tvPosters = await tvResponse.json();
                    console.log('[FAVORITES] Loaded TV show posters into class property:', Object.keys(this.tvPosters).length, 'keys');
                } else {
                    console.error('[FAVORITES] Failed to load TV show posters:', tvResponse.status);
                }
            } catch (error) {
                console.error('[FAVORITES] Error loading TV show posters:', error);
            }
            
            // Create modal HTML
            let modalHTML = `
                <div id="favoritesModal" class="favorites-modal-overlay">
                    <div class="favorites-modal-content">
                        <div class="favorites-modal-header">
                            <h2>Favorites</h2>
                            <button onclick="document.getElementById('favoritesModal').remove()" class="favorites-modal-btn favorites-modal-btn-cancel">×</button>
                        </div>
                        <div class="favorites-modal-body">
            `;
            
            // LEFT SIDE: Movies in favorites
            const movies = favoritesList.filter(item => item.type === 'movie' || !item.path.toLowerCase().includes('tv-shows'));
            console.log('[FAVORITES] Movies in favorites:', movies);
                    
                    modalHTML += `
                <div class="favorites-modal-section">
                    <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">MOVIES (${movies.length})</h3>
                    <div class="favorites-modal-grid">
            `;
            
            if (movies.length > 0) {
                for (const item of movies) {
                    const title = item.title || item.name || this.extractTitleFromPath(item.path);
                    console.log('[FAVORITES] Processing movie:', title, 'from path:', item.path);
                    
                    // Get poster from JSON using the smart getPosterPath method
                    let posterPath = 'assets/img/placeholder-poster.jpg';
                    
                    // Create a proper mediaItem object for getPosterPath
                    const mediaItem = {
                        path: item.path,
                        type: 'movie',
                        title: title,
                        name: title
                    };
                    
                    console.log('[FAVORITES] About to call getPosterPath for movie:', title, 'from path:', item.path);
                    
                    // Use the smart getPosterPath method that tries multiple key variations
                    const jsonPoster = this.getPosterPath(mediaItem);
                    if (jsonPoster && jsonPoster !== '/assets/img/placeholder-poster.jpg') {
                        posterPath = jsonPoster;
                        console.log('[FAVORITES] Using JSON poster for:', title, '->', posterPath);
                    } else {
                        console.log('[FAVORITES] No JSON poster found for:', title, '- using placeholder');
                    }
                    
                    modalHTML += `
                        <div class="favorites-modal-item" data-path="${item.path}" data-type="movie">
                            <div class="favorites-modal-item-actions">
                                <button class="favorites-modal-remove-favorite-btn" data-path="${item.path}" data-type="movie" title="Remove from Favorites">➖</button>
                            </div>
                            <div class="favorites-modal-item-content" style="cursor: pointer;" title="Click to play movie">
                                <img src="${posterPath}" alt="${title}" class="favorites-modal-poster" onerror="this.src='assets/img/placeholder-poster.jpg'">
                                <div class="favorites-modal-item-title">${title}</div>
                            </div>
                        </div>
                    `;
                }
            } else {
                modalHTML += '<div class="favorites-modal-empty-message">No movies in favorites</div>';
            }
            modalHTML += '</div></div>';
            
            // RIGHT SIDE: TV Shows in favorites
            const tvShows = favoritesList.filter(item => item.type === 'tvshow' || item.path.toLowerCase().includes('tv-shows'));
            console.log('[FAVORITES] TV Shows in favorites:', tvShows);
            
            modalHTML += `
                <div class="favorites-modal-section">
                    <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">TV-SHOWS (${tvShows.length})</h3>
                    <div class="favorites-modal-grid">
            `;
            
            if (tvShows.length > 0) {
                for (const item of tvShows) {
                    const title = item.title || item.name || this.extractTitleFromPath(item.path);
                    console.log('[FAVORITES] Processing TV show path:', item.path, 'title:', title);
                    
                    // Get poster from JSON using the smart getPosterPath method
                    let posterPath = 'assets/img/placeholder-poster.jpg';
                    
                    // Create a proper mediaItem object for getPosterPath
                    const mediaItem = {
                        path: item.path,
                        type: 'tvshow',
                        title: title,
                        name: title
                    };
                    
                    console.log('[FAVORITES] About to call getPosterPath for TV show:', title, 'from path:', item.path);
                    
                    // Use the smart getPosterPath method that tries multiple key variations
                    const jsonPoster = this.getPosterPath(mediaItem);
                    if (jsonPoster && jsonPoster !== '/assets/img/placeholder-poster.jpg') {
                        posterPath = jsonPoster;
                        console.log('[FAVORITES] Using JSON poster for:', title, '->', posterPath);
                    } else {
                        console.log('[FAVORITES] No JSON poster found for:', title, '- using placeholder');
                    }
                    
                    modalHTML += `
                        <div class="favorites-modal-item" data-path="${item.path}" data-type="tvshow">
                            <div class="favorites-modal-item-actions">
                                <button class="favorites-modal-remove-favorite-btn" data-path="${item.path}" data-type="tvshow" title="Remove from Favorites">➖</button>
                        </div>
                            <div class="favorites-modal-item-content" style="cursor: pointer;" title="Click to view TV show seasons">
                                <img src="${posterPath}" alt="${title}" class="favorites-modal-poster" onerror="this.src='assets/img/placeholder-poster.jpg'">
                                <div class="favorites-modal-item-title">${title}</div>
                            </div>
                        </div>
                    `;
                }
            } else {
                modalHTML += '<div class="favorites-modal-empty-message">No TV shows in favorites</div>';
            }
            
            modalHTML += `
                        </div>
                        <div class="favorites-modal-footer">
                            <button class="favorites-modal-close-footer-btn" onclick="document.getElementById('favoritesModal').remove()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            // Add event listeners for the buttons (FAVORITES ONLY)
            const modal = document.getElementById('favoritesModal');
            if (modal) {
                // Remove from favorites buttons
                modal.querySelectorAll('.favorites-modal-remove-favorite-btn').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                        try {
                            const path = e.target.dataset.path;
                            const type = e.target.dataset.type;
                            console.log('[FAVORITES] Remove from favorites button clicked:', { path, type });
                            
                            await this.toggleFavorite(path, type);
                            // Remove the item card from the modal
                            const itemCard = e.target.closest('.favorites-modal-item');
                            if (itemCard) {
                                itemCard.remove();
                                // Update the favorites count display
                                this.updateFavoritesCounts(modal);
                            }
                        } catch (error) {
                            console.error('[FAVORITES] Error in remove from favorites button click handler:', error);
                            this.showToast('Error removing from favorites', 'error');
                        }
                    });
                });
                

                
                // Click to play/view media items (FAVORITES ONLY)
                modal.querySelectorAll('.favorites-modal-item-content').forEach(content => {
                    content.addEventListener('click', async (e) => {
                        try {
                            const itemCard = e.target.closest('.favorites-modal-item');
                            const path = itemCard.dataset.path;
                            const type = itemCard.dataset.type;
                            const title = itemCard.querySelector('.favorites-modal-item-title').textContent;
                            
                            console.log('[FAVORITES] Media item clicked:', { path, type, title });
                            
                            if (type === 'movie') {
                                // For movies, find the movie data to get the correct path for playback
                                const movieData = this.findMovieByPath(path);
                                if (movieData && movieData.absPath) {
                                    console.log('[FAVORITES] Found movie data, using absPath:', movieData.absPath);
                                    const mediaItem = { 
                                        path: movieData.absPath, 
                                        title, 
                                        type: 'movie',
                                        absPath: movieData.absPath 
                                    };
                                    await this.playMedia(mediaItem);
                                    // Close the modal after starting playback
                                    document.getElementById('favoritesModal').remove();
                        } else {
                                    console.warn('[FAVORITES] No movie data found for path:', path);
                                    this.showToast('Movie data not found', 'error');
                                }
                            } else if (type === 'tvshow') {
                                // For TV shows, navigate to seasons view
                                await this.openTVShow(path);
                                // Close the modal after navigation
                                document.getElementById('favoritesModal').remove();
                        }
                        } catch (error) {
                            console.error('[FAVORITES] Error in media item click handler:', error);
                            this.showToast('Error playing media', 'error');
                        }
                    });
                });
            }
        } catch (error) {
            console.error('[FAVORITES] Error showing favorites modal:', error);
            this.showToast(`Error showing favorites modal: ${error.message}`, 'error');
        }
    }

    /**
     * Attach event handlers for collection modal items
     */
    attachCollectionsModalHandlers(collectionName) {
        try {
            const modal = document.getElementById('collectionModal');
            if (!modal) return;

            // Remove from collection buttons
            modal.querySelectorAll('.modal-collections-remove-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try {
                        const collectionName = e.target.dataset.collection;
                        const path = e.target.dataset.path;
                        const type = e.target.dataset.type;
                        
                        console.log('[COLLECTIONS] Remove button clicked:', { collectionName, path, type });
                        await this.removeFromCollection(collectionName, path);
                        
                        // Remove the item card from the modal
                        const itemCard = e.target.closest('.modal-collections-item');
                        if (itemCard) {
                            itemCard.remove();
                            // Update the collection count display
                            this.updateCollectionCounts(modal, collectionName);
                        }
                    } catch (error) {
                        console.error('[COLLECTIONS] Error in remove button click handler:', error);
                        this.showToast('Error removing from collection', 'error');
                    }
                });
            });



            // Add click handlers for media items (movies and TV shows)
            modal.querySelectorAll('.modal-collections-item').forEach((item, index) => {
                item.addEventListener('click', async (e) => {
                    // Don't trigger if clicking on action buttons
                    if (e.target.closest('.modal-collections-item-actions')) {
                        return;
                    }
                    
                    const path = item.dataset.path;
                    const type = item.dataset.type;
                    
                    console.log('[COLLECTIONS] Media item clicked:', { path, type });
                    
                    try {
                        if (type === 'movie') {
                            console.log('[COLLECTIONS] Playing movie from collection:', path);
                            await this.playMovieFromCollectionsModal(path);
                        } else if (type === 'tvshow') {
                            console.log('[COLLECTIONS] Opening TV show from collection:', path);
                            await this.openTVShowFromCollectionsModal(path);
                        } else {
                            console.error('[COLLECTIONS] Unknown media type:', type);
                        }
                    } catch (error) {
                        console.error('[COLLECTIONS] Error handling media item click:', error);
                        this.showToast('Error opening media item', 'error');
                    }
                });
            });

        } catch (error) {
            console.error('[COLLECTIONS] Error attaching simple collection modal handlers:', error);
        }
    }

    /**
     * Play a movie from the Collections modal
     */
    async playMovieFromCollectionsModal(path) {
        try {
            
            // First try to find the movie in the current movies data
            let movieData = null;
            if (this.moviesData && Array.isArray(this.moviesData)) {
                movieData = this.moviesData.find(m => {
                    const match = (m.path === path || m.absPath === path || m.filePath === path);
                    return match;
                });
            }
            
            if (!movieData) {
                // If not found in current data, try to construct a basic movie object
                const title = this.extractTitleFromPath(path);
                movieData = {
                    path: path,
                    title: title,
                    name: title,
                    type: 'movie'
                };

            }
            
            // Close the collections modal
            const modal = document.getElementById('collectionModal');
            if (modal) {
                modal.remove();
            }
            
            // Play the movie
            await this.playMedia(movieData);
            
        } catch (error) {
            console.error('[COLLECTIONS] Error playing movie from collection:', error);
            this.showToast('Error playing movie', 'error');
        }
    }
    
    /**
     * Open a TV show from the Collections modal
     */
    async openTVShowFromCollectionsModal(path) {
        try {
            console.log('[COLLECTIONS] Opening TV show from collection:', path);
            
            // Use centralized data loading method
            await this.ensureTVShowDataLoaded();
            
            // Set the current TV show before closing the modal
            this.currentTVShow = path;
            
            // Close the collections modal
            const modal = document.getElementById('collectionModal');
            if (modal) {
                modal.remove();
            }
            
            // Open the main Media Library modal and navigate to TV shows tab
            this.currentTab = 'tvshows';
            this.openMediaBrowser();
            
            // Wait for the modal to render, then find the TV show and navigate to seasons
            setTimeout(async () => {
                // First, ensure we're on the TV shows tab
                const modalContent = document.querySelector('.media-library-modal-content');
                if (modalContent) {
                    modalContent.classList.remove('movies', 'tvshows', 'favorites', 'collections', 'suggestions', 'watchlater', 'moviedetails', 'tvshowepisodes');
                    modalContent.classList.add('tvshows');
                }
                
                // Now find the specific TV show that was clicked and navigate to its seasons
                // Extract the show name from the path for comparison
                const showName = this.extractShowName(path);
                console.log('[COLLECTIONS] Looking for TV show:', showName);
                
                // Find the show in TV shows data
                const show = this.findShowByPath(path);
                if (show) {
                    console.log('[COLLECTIONS] Found show, navigating to seasons view');
                    // Navigate to the seasons view for this specific show
                    await this.openTVShow(path);
                } else {
                    console.error('[COLLECTIONS] Could not find TV show:', showName);
                    this.showToast('TV show not found', 'error');
                }
            }, 100);
            
        } catch (error) {
            console.error('[COLLECTIONS] Error opening TV show from collection:', error);
            this.showToast('Error opening TV show', 'error');
        }
    }
    
    /**
     * CENTRALIZED: Ensure all TV show data is loaded for navigation
     * This method prevents the recurring TV show navigation issue
     */
    async ensureTVShowDataLoaded() {
        try {
            console.log('[DATA-LOADING] Ensuring TV show data is loaded for navigation...');
            
            // Check what's already loaded
            const loadedData = {
                tvShowsData: !!this.tvShowsData,
                tvPosters: !!this.tvPosters,
                seasonEpisodeImages: !!this.seasonEpisodeImages,
                tvShowDescriptions: !!this.tvShowDescriptions,
                tvShowCast: !!this.tvShowCast
            };
            
            console.log('[DATA-LOADING] Current data status:', loadedData);
            
            // Load TV shows data if missing (CRITICAL for navigation)
            if (!this.tvShowsData) {
                console.log('[DATA-LOADING] Loading TV shows data...');
                try {
                    const tvShowsResponse = await fetch('/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json?v=' + Date.now());
                    if (tvShowsResponse.ok) {
                        this.tvShowsData = await tvShowsResponse.json();
                        console.log('[DATA-LOADING] ✅ TV shows data loaded:', Object.keys(this.tvShowsData).length, 'shows');
                    } else {
                        console.error('[DATA-LOADING] ❌ Failed to load TV shows data:', tvShowsResponse.status);
                        throw new Error(`Failed to load TV shows data: ${tvShowsResponse.status}`);
                    }
                } catch (error) {
                    console.error('[DATA-LOADING] ❌ Error loading TV shows data:', error);
                    throw error;
                }
            }
            
            // Load TV show posters if missing
            if (!this.tvPosters) {
                console.log('[DATA-LOADING] Loading TV show posters...');
                try {
                    const tvResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json?v=' + Date.now());
                    if (tvResponse.ok) {
                        this.tvPosters = await tvResponse.json();
                        console.log('[DATA-LOADING] ✅ TV show posters loaded:', Object.keys(this.tvPosters).length, 'posters');
                    } else {
                        console.error('[DATA-LOADING] ❌ Failed to load TV show posters:', tvResponse.status);
                    }
                } catch (error) {
                    console.error('[DATA-LOADING] ❌ Error loading TV show posters:', error);
                }
            }
            
            // Load season/episode images if missing
            if (!this.seasonEpisodeImages) {
                console.log('[DATA-LOADING] Loading season/episode images...');
                try {
                    await this.loadSeasonEpisodeImages();
                    console.log('[DATA-LOADING] ✅ Season/episode images loaded');
                } catch (error) {
                    console.error('[DATA-LOADING] ❌ Error loading season/episode images:', error);
                }
            }
            
            // Load TV show descriptions if missing
            if (!this.tvShowDescriptions) {
                console.log('[DATA-LOADING] Loading TV show descriptions...');
                try {
                    const descResp = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_descriptions_normalized.json?v=' + Date.now());
                    if (descResp.ok) {
                        this.tvShowDescriptions = await descResp.json();
                        console.log('[DATA-LOADING] ✅ TV show descriptions loaded:', Object.keys(this.tvShowDescriptions).length, 'descriptions');
                    } else {
                        console.error('[DATA-LOADING] ❌ Failed to load TV show descriptions:', descResp.status);
                    }
                } catch (error) {
                    console.error('[DATA-LOADING] ❌ Error loading TV show descriptions:', error);
                }
            }
            
            // Load TV show cast if missing
            if (!this.tvShowCast) {
                console.log('[DATA-LOADING] Loading TV show cast...');
                try {
                    const castResp = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json?v=' + Date.now());
                    if (castResp.ok) {
                        this.tvShowCast = await castResp.json();
                        console.log('[DATA-LOADING] ✅ TV show cast loaded:', Object.keys(this.tvShowCast).length, 'cast entries');
                    } else {
                        console.error('[DATA-LOADING] ❌ Failed to load TV show cast:', castResp.status);
                    }
                } catch (error) {
                    console.error('[DATA-LOADING] ❌ Error loading TV show cast:', error);
                }
            }
            
            console.log('[DATA-LOADING] ✅ All TV show data loading completed successfully');
            
        } catch (error) {
            console.error('[DATA-LOADING] ❌ Critical error in TV show data loading:', error);
            throw error;
        }
    }

    /**
     * Find movie data by path (for playback)
     */
    findMovieByPath(path) {
        try {
            // First try to find in the current movies data
            if (this.movies && Array.isArray(this.movies)) {
                const movie = this.movies.find(m => {
                    return (m.path === path || m.absPath === path || m.filePath === path);
                });
                            if (movie) {
                return movie;
            }
        }
        
        // If not found, try to find by searching the file system
        // This is a fallback for when movies data isn't loaded
        return null;
        } catch (error) {
            console.error('[COLLECTIONS] Error finding movie by path:', error);
            return null;
        }
    }

    /**
     * Update favorites counts display after removing items
     */
    updateFavoritesCounts(modal) {
        try {
            // Count remaining movies and TV shows
            const movies = modal.querySelectorAll('.favorites-modal-item[data-type="movie"]');
            const tvShows = modal.querySelectorAll('.favorites-modal-item[data-type="tvshow"]');
            
            // Update the count displays
            const movieSection = modal.querySelector('.favorites-modal-section h3');
            if (movieSection) {
                movieSection.textContent = `MOVIES (${movies.length})`;
            }
            
            const tvShowSection = modal.querySelectorAll('.favorites-modal-section h3')[1];
            if (tvShowSection) {
                tvShowSection.textContent = `TV-SHOWS (${tvShows.length})`;
            }
            
            // If no items left in a section, show empty message
            if (movies.length === 0) {
                const movieGrid = modal.querySelector('.favorites-modal-section .favorites-modal-grid');
                if (movieGrid && !movieGrid.querySelector('.favorites-modal-empty-message')) {
                    movieGrid.innerHTML = '<div class="favorites-modal-empty-message">No movies in favorites</div>';
                }
            }
            
            if (tvShows.length === 0) {
                const tvShowGrid = modal.querySelectorAll('.favorites-modal-section .favorites-modal-grid')[1];
                if (tvShowGrid && !tvShowGrid.querySelector('.favorites-modal-empty-message')) {
                    tvShowGrid.innerHTML = '<div class="favorites-modal-empty-message">No TV shows in favorites</div>';
                }
            }
            
            console.log('[FAVORITES] Updated counts - Movies:', movies.length, 'TV Shows:', tvShows.length);
        } catch (error) {
            console.error('[FAVORITES] Error updating favorites counts:', error);
        }
    }

    /**
     * Update collection counts display after removing items
     */
    updateCollectionCounts(modal, collectionName) {
        try {
                    // Count remaining movies and TV shows
        const movies = modal.querySelectorAll('.modal-collections-item[data-type="movie"]');
        const tvShows = modal.querySelectorAll('.modal-collections-item[data-type="tvshow"]');
        
        // Update the count displays
        const movieSection = modal.querySelector('.modal-collections-movies-section h3');
        if (movieSection) {
            movieSection.textContent = `MOVIES (${movies.length})`;
        }
        
        const tvShowSection = modal.querySelector('.modal-collections-tvshows-section h3');
        if (tvShowSection) {
            tvShowSection.textContent = `TV-SHOWS (${tvShows.length})`;
        }
        
        // If no items left in a section, show empty message
        if (movies.length === 0) {
            const movieGrid = modal.querySelector('.modal-collections-movies-grid');
            if (movieGrid && !movieGrid.querySelector('.modal-collections-empty-message')) {
                movieGrid.innerHTML = '<div class="modal-collections-empty-message">No movies in this collection</div>';
            }
        }
        
        if (tvShows.length === 0) {
            const tvShowGrid = modal.querySelector('.modal-collections-tvshows-grid');
            if (tvShowGrid && !tvShowGrid.querySelector('.modal-collections-empty-message')) {
                tvShowGrid.innerHTML = '<div class="modal-collections-empty-message">No TV shows in this collection</div>';
            }
        }
            

        } catch (error) {
            console.error('[COLLECTIONS] Error updating collection counts:', error);
        }
    }

    /**
     * Helper method to get display title for media items
     */
    getDisplayTitle(mediaItem) {
        if (mediaItem.title) {
            return this.capitalizeTitle(mediaItem.title);
        } else if (mediaItem.name) {
            return this.capitalizeTitle(mediaItem.name);
        } else {
            // Extract from path
            const filename = mediaItem.path.split(/[\\/]/).pop() || '';
            return this.capitalizeTitle(this.cleanMovieTitle(filename));
        }
    }

    /**
     * Update collection buttons in the media grid
     */
    async updateCollectionButtons() {
        try {
            const collectionBtns = document.querySelectorAll('.collection-btn');
            console.log('[DEBUG - COLLECTIONS] Found collection buttons to update:', collectionBtns.length);
            
            // Debug: Log all found buttons
            collectionBtns.forEach((btn, index) => {
                console.log(`[DEBUG - COLLECTIONS] Button ${index}:`, {
                    path: btn.dataset.path,
                    text: btn.textContent,
                    classes: btn.className,
                    title: btn.title
                });
            });
            
            for (const btn of collectionBtns) {
                const path = btn.dataset.path;
                if (!path) {
                    console.log('[DEBUG - COLLECTIONS] Button missing data-path:', btn);
                    continue;
                }

                try {
                    console.log('[DEBUG - COLLECTIONS] Checking button for path:', path);
                    const itemCollections = await this.getItemCollections(path);
                    const inCollection = itemCollections.length > 0;
                    console.log('[DEBUG - COLLECTIONS] Path in collection:', path, 'Collections:', itemCollections, 'Result:', inCollection);
                    
                                        if (inCollection) {
                        if (itemCollections.length === 1) {
                            btn.textContent = '➖';
                            btn.title = `Manage Collections (currently in: ${itemCollections[0]})`;
                        } else {
                            btn.textContent = `${itemCollections.length}`;
                            btn.title = `Manage Collections (currently in: ${itemCollections.join(', ')})`;
                        }
                        btn.className = 'collection-btn collection-btn-remove';
                        console.log('[DEBUG - COLLECTIONS] Updated button for collections:', path, itemCollections);
                    } else {
                        btn.textContent = '➕';
                        btn.className = 'collection-btn collection-btn-add';
                        btn.title = 'Add to Collection';
                        console.log('[DEBUG - COLLECTIONS] Updated button to ➕ for:', path);
                    }
                } catch (error) {
                    console.error('[DEBUG - COLLECTIONS] Error updating collection button:', error);
                }
            }

            console.log('[DEBUG - COLLECTIONS] Collection buttons update completed');
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error updating collection buttons:', error);
        }
    }

    /**
     * Manual refresh of collection buttons for testing
     */
    async manualRefreshCollectionButtons() {
        console.log('[DEBUG - COLLECTIONS] Manual refresh of collection buttons requested');
        await this.updateCollectionButtons();
    }

    /**
     * Update a single collection button immediately after adding/removing from collection
     */
    async updateSingleCollectionButton(path) {
        try {
            const btn = document.querySelector(`.collection-btn[data-path="${path}"]`);
            if (!btn) {
                console.log('[DEBUG - COLLECTIONS] Button not found for path:', path);
                return;
            }

            const itemCollections = await this.getItemCollections(path);
            const inCollection = itemCollections.length > 0;
            console.log('[DEBUG - COLLECTIONS] Checking collection status for:', path, 'Collections:', itemCollections, 'Result:', inCollection);
            
            if (inCollection) {
                if (itemCollections.length === 1) {
                    btn.textContent = '➖';
                    btn.title = `Manage Collections (currently in: ${itemCollections[0]})`;
                } else {
                    btn.textContent = `${itemCollections.length}`;
                    btn.title = `Manage Collections (currently in: ${itemCollections.join(', ')})`;
                }
                btn.className = 'collection-btn collection-btn-remove';
            } else {
                btn.textContent = '➕';
                btn.className = 'collection-btn collection-btn-add';
                btn.title = 'Add to Collection';
            }
            
            console.log('[DEBUG - COLLECTIONS] Single collection button updated for:', path, 'State:', inCollection ? 'IN' : 'NOT IN', 'Collections:', itemCollections, 'Button text:', btn.textContent);
        } catch (error) {
            console.error('[DEBUG - COLLECTIONS] Error updating single collection button:', error);
        }
    }

    // --- COLLECTIONS TAB RENDERING ---
    async renderCollectionsTab() {
        try {
            console.log('[DEBUG - COLLECTIONS] renderCollectionsTab called');
            
            // Debug: Check localStorage directly
            const localStorageCollectionsRaw = localStorage.getItem('mediaCollections');
            console.log('[DEBUG - COLLECTIONS] localStorage "mediaCollections" raw:', localStorageCollectionsRaw);
            try {
                const parsedLocalStorageCollections = JSON.parse(localStorageCollectionsRaw || '{}');
                console.log('[DEBUG - COLLECTIONS] localStorage "mediaCollections" parsed:', parsedLocalStorageCollections);
                console.log('[DEBUG - COLLECTIONS] localStorage collections keys (parsed):', Object.keys(parsedLocalStorageCollections));
                console.log('[DEBUG - COLLECTIONS] localStorage collections length (parsed):', Object.keys(parsedLocalStorageCollections).length);
            } catch (e) {
                console.error('[DEBUG - COLLECTIONS] Error parsing localStorage "mediaCollections":', e);
            }

            const collections = await this.getCollections();
            console.log('[DEBUG - COLLECTIONS] getCollections returned:', collections);
            console.log('[DEBUG - COLLECTIONS] Collections type:', typeof collections);
            console.log('[DEBUG - COLLECTIONS] Collections keys:', Object.keys(collections));
            console.log('[DEBUG - COLLECTIONS] Collections length:', Object.keys(collections).length);
            const names = Object.keys(collections).sort((a, b) => 
                a.localeCompare(b, undefined, { 
                    sensitivity: 'base',
                    numeric: true,
                    caseFirst: 'upper'
                })
            );
            console.log('[DEBUG - COLLECTIONS] Collection names (sorted):', names);
            console.log('[DEBUG - COLLECTIONS] Collections object:', collections);
            
            // Check if we're viewing a specific collection or the main list
            if (this.currentCollectionView) {
                // Show specific collection contents
                const collectionName = this.currentCollectionView;
                const collectionItems = collections[collectionName] || [];
                
                if (collectionItems.length === 0) {
                    return `
                        <div class="collection-empty-message">
                            Collection "${collectionName}" is empty.<br>
                            <button class="back-to-collections-btn" onclick="window.mediaLibraryManager.viewCollection(null)">
                                ← Back to Collections
                            </button>
                        </div>
                    `;
                }
                
                // Build the HTML for the collection view with full-width layout
                let html = '<div class="container-collections">';
                
                // LEFT SIDE: Show movies in the collection
                const movies = collectionItems.filter(path => !path.toLowerCase().includes('tv-shows'));
                html += '<div class="movies-section-collections">';
                html += '<h3 class="section-title-movies-collections">MOVIES</h3>';
                html += '<div class="media-library-movie-grid-collections">';
                
                if (movies.length > 0) {
                    movies.forEach(path => {
                        const title = this.extractTitleFromPath(path);
                        console.log('[COLLECTIONS] Processing movie path:', path);
                        console.log('[COLLECTIONS] Extracted title:', title);
                        
                        // Create a proper media item object for poster lookup
                        const mediaItem = {
                            path: path,
                            type: 'movie',
                            title: title,
                            normalizedKey: window.normalizeKey ? window.normalizeKey(title) : null
                        };
                        console.log('[COLLECTIONS] Created media item object:', mediaItem);
                        
                        const posterPath = this.getPosterPath(mediaItem);
                        console.log('[COLLECTIONS] Poster path result:', posterPath);
                        
                        html += `
                            <div class="media-library-movie-card-collections" data-path="${path}">
                                <div class="media-card-actions-collections-collections">
                                    <button class="collection-btn-collections collection-btn-remove-collections" title="Remove from Collection" onclick="window.mediaLibraryManager.removeFromCollection('${collectionName}', '${path}')">➖</button>
                                    <button class="heart-btn" title="Toggle Favorite" onclick="window.mediaLibraryManager.toggleFavorite('${path}', 'movie')">❤️</button>
                                </div>
                                <div class="media-library-card-poster">
                                    <img src="${posterPath}" alt="${title}" onerror="this.src='assets/img/placeholder-poster.jpg'">
                                </div>
                            </div>
                        `;
                    });
                } else {
                    html += '<div class="no-movies-message">No movies in this collection</div>';
                }
                
                html += '</div>';
                html += '</div>';
                
                // RIGHT SIDE: Show TV shows in the collection
                const tvShows = collectionItems.filter(path => path.toLowerCase().includes('tv-shows'));
                html += '<div class="tvshows-section-collections">';
                html += '<h3 class="section-title-tvshows-collections">TV SHOWS</h3>';
                html += '<div class="media-library-movie-grid-collections">';
                
                if (tvShows.length > 0) {
                    tvShows.forEach(path => {
                        const title = this.extractTitleFromPath(path);
                        console.log('[COLLECTIONS] Processing TV show path:', path);
                        console.log('[COLLECTIONS] Extracted title:', title);
                        
                        // Create a proper media item object for poster lookup
                        const mediaItem = {
                            path: path,
                            type: 'tvshow',
                            title: title,
                            normalizedKey: window.normalizeKey ? window.normalizeKey(title) : null
                        };
                        console.log('[COLLECTIONS] Created TV show media item object:', mediaItem);
                        
                        const posterPath = this.getTVShowPosterPath(mediaItem);
                        console.log('[COLLECTIONS] TV show poster path result:', posterPath);
                        
                        html += `
                            <div class="media-library-movie-card-tvshows" data-path="${path}">
                                <div class="media-card-actions-collections-tvShows-collections">
                                    <button class="collection-btn-collections collection-btn-remove-collections" title="Remove from Collection" onclick="window.mediaLibraryManager.removeFromCollection('${collectionName}', '${path}')">➖</button>
                                    <button class="heart-btn" title="Toggle Favorite" onclick="window.mediaLibraryManager.toggleFavorite('${path}', 'tvshow')">❤️</button>
                                </div>
                                <div class="media-library-card-poster">
                                    <img src="${posterPath}" alt="${title}" onerror="this.src='assets/img/placeholder-poster.jpg'">
                                </div>
                            </div>
                        `;
                    });
                } else {
                    html += '<div class="no-tvshows-message">No TV shows in this collection</div>';
                }
                
                html += '</div>';
                html += '</div>';
                
                html += '</div>';
                
                // Add back button at the top
                html = `
                    <div class="collection-header">
                        <button class="back-to-collections-btn" onclick="window.mediaLibraryManager.viewCollection(null)">
                            ← Back to Collections
                        </button>
                        <h2 class="collection-title">Collection: ${collectionName}</h2>
                    </div>
                ` + html;
                
                return html;
            } else {
                // Show main collections list
            if (names.length === 0) {
                    return '<div class="no-collections-message">No collections yet.<br>Add movies to a collection using the ➕ icon.</div>';
            }
            
            // Build the HTML for the collections view with proper two-column layout
                let html = '<div class="container-collections">';
                
                // LEFT SIDE: Show collections list (70%)
            html += '<div class="movies-section-collections">';
            html += '  <h3 class="section-title-movies-collections"><span class="collections-header-text">COLLECTIONS</span></h3>';
            html += '    <div class="media-library-movie-grid-collections">';
            
            names.forEach(name => {
                const collectionPaths = collections[name] || [];
                const movieCount = collectionPaths.filter(path => !path.toLowerCase().includes('tv-shows')).length;
                const tvCount = collectionPaths.filter(path => path.toLowerCase().includes('tv-shows')).length;
                        
                        html += `
                            <div class="media-library-movie-card-movies-collections" data-collection="${name}">
                                <div class="media-card-actions-collections-movies-collections">
                                    <button class="collection-btn-collections collection-btn-remove-collections" title="Delete Collection" onclick="window.mediaLibraryManager.deleteCollection('${name}')">🗑️</button>
                                    <button class="collection-btn-collections collection-btn-add-collections" title="View Collection" onclick="window.mediaLibraryManager.viewCollection('${name}')">👁️</button>
                      </div>
                                <div class="collection-card-poster-collections">
                                    <div class="collection-card-content-collections">
                                        <div class="collection-icon-collections">📁</div>
                                        <div class="collection-name-collections">${name}</div>
                                        <div class="collection-counts-collections">
                                    ${movieCount} Movies, ${tvCount} TV Shows
                                </div>
                            </div>
                                </div>
                    </div>
                `;
                    });
            
                    html += '</div>';
                html += '</div>';
                
                // RIGHT SIDE: Show collection stats or help (30%)
                html += '<div class="tvshows-section-favorites">';
                            html += '<h3 class="section-title-tvshows-collections">COLLECTION INFO</h3>';
                html += '<div class="collection-info-panel">';
                html += `<h4 class="collection-total-count">Total Collections: <span class="collection-count-number">${names.length}</span></h4>`;
                html += '<p class="collection-description">';
            html += 'Collections help you organize your media into themed groups. ';
            html += 'Click the 👁️ button to view a collection, or use the ➕ icon on any movie or TV show to add it to a collection.';
            html += '</p>';
                html += '<div class="collection-tip">';
                html += '<strong class="tip-label">💡 Tip:</strong> ';
            html += 'You can create new collections by adding items to them. The collection will be created automatically.';
                    html += '</div>';
            html += '</div>';
                html += '</div>';
                
                html += '</div>';
                
            return html;
            }
        } catch (e) {
            console.error('[COLLECTIONS FATAL ERROR]', e);
            return '<div class="collections-error">[COLLECTIONS FATAL ERROR] ' + e.message + '</div>';
        }
    }

    // --- UTILITY METHODS ---
    extractTitleFromPath(path) {
        if (!path) return '';
        
        // Split path by both forward and backward slashes
        const pathParts = path.split(/[\/\\]/);
        
        console.log('[COLLECTIONS] Path parts for extraction:', pathParts);
        
        // For movie paths like: S:\MEDIA\MOVIES\Back to the Future (1985) [1080p]\filename.ext
        // We want the folder name: "Back to the Future (1985)" (without resolution info)
        // For TV show paths like: S:\MEDIA\TV-SHOWS\Cosmos (2014)\S01\filename.ext
        // We want the show name: "Cosmos (2014)"
        
        if (pathParts.length >= 4) {
            // Look for the actual media folder (not the parent category folder)
            // Skip drive letter, MEDIA, and category folders (MOVIES/TV-SHOWS)
            for (let i = 2; i < pathParts.length - 1; i++) {
                const part = pathParts[i];
                // Skip category folders like "MOVIES", "TV-SHOWS"
                if (part && !part.match(/^(MOVIES|TV-SHOWS|TVSHOWS)$/i)) {
                    // Remove resolution info like [1080p], [720p], etc.
                    const cleanTitle = part.replace(/\s*\[\d+p\]\s*$/i, '');
                    console.log('[COLLECTIONS] Extracted clean media folder name from path:', cleanTitle, 'at index', i, 'for path:', path);
                    return cleanTitle;
                }
            }
        }
        
        // Fallback: try to get the filename and clean it
        const filename = pathParts[pathParts.length - 1] || '';
        const cleanedFilename = filename.replace(/\.[^/.]+$/, ''); // Remove file extension
        // Also remove resolution info from filename if present
        const finalCleanFilename = cleanedFilename.replace(/\s*\[\d+p\]\s*$/i, '');
        console.log('[COLLECTIONS] Fallback to filename extraction:', finalCleanFilename, 'for path:', path);
        return finalCleanFilename;
    }

    findMediaItemByPath(path, type) {
        if (!path) return {};
        
        try {
            // Normalize the path for comparison
            const normalizedPath = path.replace(/\\/g, '/').toLowerCase().trim();
            
            // For movies, search in the movies data
            if (type === 'movie' && this.movies) {
                const movie = this.movies.find(m => {
                    const moviePath = (m.path || '').replace(/\\/g, '/').toLowerCase().trim();
                    const movieAbsPath = (m.absPath || '').replace(/\\/g, '/').toLowerCase().trim();
                    const movieFilePath = (m.filePath || '').replace(/\\/g, '/').toLowerCase().trim();
                    const movieRelPath = (m.relPath || '').replace(/\\/g, '/').toLowerCase().trim();
                    return moviePath === normalizedPath || movieAbsPath === normalizedPath || movieFilePath === normalizedPath || movieRelPath === normalizedPath;
                });
                if (movie) {
                    console.log('[COLLECTIONS] Found movie in movies data:', movie);
                    return movie;
                }
            }
            
            // For TV shows, search in the TV shows data
            if (type === 'tvshow' && this.tvShows) {
                const tvShow = this.tvShows.find(tv => {
                    const tvPath = (tv.path || '').replace(/\\/g, '/').toLowerCase().trim();
                    const tvAbsPath = (tv.absPath || '').replace(/\\/g, '/').toLowerCase().trim();
                    const tvFilePath = (tv.filePath || '').replace(/\\/g, '/').toLowerCase().trim();
                    const tvRelPath = (tv.relPath || '').replace(/\\/g, '/').toLowerCase().trim();
                    return tvPath === normalizedPath || tvAbsPath === normalizedPath || tvFilePath === normalizedPath || tvRelPath === normalizedPath;
                });
                if (tvShow) {
                    console.log('[COLLECTIONS] Found TV show in TV shows data:', tvShow);
                    return tvShow;
                }
            }
            
            // Try to find in current tab items as fallback
            const currentItems = this.getItemsForCurrentTab();
            if (currentItems && Array.isArray(currentItems) && currentItems.length > 0) {
                const foundItem = currentItems.find(item => {
                    const itemPath = (item.path || '').replace(/\\/g, '/').toLowerCase().trim();
                    const itemAbsPath = (item.absPath || '').replace(/\\/g, '/').toLowerCase().trim();
                    const itemFilePath = (item.filePath || '').replace(/\\/g, '/').toLowerCase().trim();
                    const itemRelPath = (item.relPath || '').replace(/\\/g, '/').toLowerCase().trim();
                    return itemPath === normalizedPath || itemAbsPath === normalizedPath || itemFilePath === normalizedPath || itemRelPath === normalizedPath;
                });
                if (foundItem) {
                    console.log('[COLLECTIONS] Found item in current tab:', foundItem);
                    return foundItem;
                }
            } else {
                console.log('[COLLECTIONS] Current tab items not available or empty');
            }
            
            // If not found in main data, try to create a basic object with normalized key
            if (window.normalizeKey) {
                const title = this.extractTitleFromPath(path);
                const normalizedKey = window.normalizeKey(title);
                console.log('[COLLECTIONS] Created basic media item object for path:', path, 'title:', title, 'normalizedKey:', normalizedKey);
                return { normalizedKey, title, path };
            }
            
            console.log('[COLLECTIONS] No media item found for path:', path, 'type:', type);
            return {};
        } catch (error) {
            console.warn('[COLLECTIONS] Error finding media item by path:', error);
            return {};
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
        console.log('[DEBUG - MOVIE-DETAILS] showMovieDetailsModal called with movie:', movie);
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        
        // Update modal content class to hide A-Z sidebar
        const modalContent = document.querySelector('.media-library-modal-content');
        if (modalContent) {
            modalContent.classList.remove('movies', 'tvshows', 'favorites', 'collections', 'suggestions', 'watchlater');
            modalContent.classList.add('moviedetails');
        }
        
        // Render basic movie details immediately to prevent flash
        const poster = `<img src="${this.getPosterPath(movie)}" alt="${movie.title}" style="width:180px;max-width:40vw;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.12);">`;
        const genres = (movie.genre || movie.genres || []).toString();
        const year = movie.year || (movie.releaseDate ? ('' + movie.releaseDate).slice(0,4) : '');
        
        // Render basic content immediately
        grid.innerHTML = `
            <div class="media-library-details-modal">
                <div class="media-library-details-poster">${poster}</div>
                <div class="media-library-details-content">
                    <button id="backToGridBtn" class="media-library-details-back">← Back</button>
                    <h2 class="media-library-details-title">${(() => {
                        // Use normalizedKey for display title, fallback to path if needed
                        let displayTitle = '';
                        if (movie.normalizedKey) {
                            // Convert normalized key to readable display format
                            displayTitle = this.convertNormalizedKeyToDisplayTitle(movie.normalizedKey);
                        } else if (movie.path) {
                            // Fallback to path and clean it
                            displayTitle = this.cleanTitleForDisplay(movie.path);
                        } else {
                            displayTitle = movie.TMDBTitle || movie.title || movie.name || movie.filename || '';
                        }
                        return displayTitle;
                    })()}</h2>
                    <div class="media-library-details-meta">${year ? year + ' • ' : ''}${genres}</div>
                    <div class="media-library-details-description">
                        <div class="media-library-details-loading">Loading description...</div>
                    </div>
                    <div class="media-library-details-buttons">
                        <button id="playMovieBtn" class="media-library-details-play">▶ Play</button>
                        <button id="detailsFavoriteBtn" title="Toggle Favorite" class="media-library-details-favorite">${this.isFavorite(movie.path) ? '❤️' : '🤍'}</button>
                        <button id="detailsCollectionBtn" title="Add to Collection" class="media-library-details-collection">➕</button>
                    </div>
                    <div class="media-library-details-cast-list">
                        <b>Cast:</b>
                        <div class="media-library-details-loading">Loading cast information...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Attach event handlers immediately
        document.getElementById('backToGridBtn').onclick = () => this.renderMediaGrid();
        document.getElementById('playMovieBtn').onclick = () => {
            console.log('[DEBUG - PLAY-BUTTON] Play button clicked for movie:', movie);
            console.log('[DEBUG - PLAY-BUTTON] Movie properties:', {
                path: movie.path,
                absPath: movie.absPath,
                filePath: movie.filePath,
                files: movie.files,
                type: movie.type,
                mediaType: movie.mediaType,
                title: movie.title,
                name: movie.name,
                normalizedKey: movie.normalizedKey
            });
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
        
        // Now load async data and update the content
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
            
            let desc = '';
            if (!window.normalizeKey) {
                console.error('[MOVIE DETAILS] NormalizationService not loaded - this should not happen!');
                return;
            }
            // Get the folder name from the path (same method as MediaManager)
            let folderName = movie.path ? movie.path.split(/[\\/]/).slice(-2, -1)[0] || movie.path.split(/[\\/]/).pop() : '';
            // Use the standard normalizeKey function since all JSON files are now normalized
            let dotKey = window.normalizeKey(folderName);
            console.log('[DETAILS DEBUG] Looking for description with key:', dotKey);
            console.log('[DETAILS DEBUG] Folder name extracted:', folderName);
            console.log('[DETAILS DEBUG] Movie path:', movie.path);
            console.log('[DETAILS DEBUG] Movie title:', movie.title);
            console.log('[DETAILS DEBUG] Movie normalizedKey:', movie.normalizedKey);
            
            // Try multiple key variations to ensure we find the data
            const keyVariations = [
                dotKey, // Primary key from folder name
                window.normalizeKey(movie.title || ''), // From movie title
                window.normalizeKey(movie.path ? movie.path.split(/[\\/]/).pop() : ''), // From filename
                movie.normalizedKey || '', // From movie object
                // Try with and without year
                window.normalizeKey(folderName.replace(/\s*\(\d{4}\)\s*$/, '')), // Without year
                window.normalizeKey(folderName.replace(/\s*\(\d{4}\)\s*$/, '') + ' (1993)'), // With 1993
                window.normalizeKey(folderName.replace(/\s*\(\d{4}\)\s*$/, '') + ' (1994)'), // With 1994
                window.normalizeKey(folderName.replace(/\s*\(\d{4}\)\s*$/, '') + ' (1995)'), // With 1995
                // Try with different punctuation handling
                window.normalizeKey(folderName.replace(/\./g, ' ')), // Replace dots with spaces
                window.normalizeKey(folderName.replace(/\./g, ' ').replace(/\s+/g, '.')), // Then back to dots
            ];
            
            console.log('[DETAILS DEBUG] Trying key variations:', keyVariations);
            
            // Try each key variation
            let foundDesc = false;
            for (const key of keyVariations) {
                if (key && movieDescriptions[key] && movieDescriptions[key].description) {
                    desc = movieDescriptions[key].description;
                    console.log('[DETAILS DEBUG] Found description with key:', key);
                    foundDesc = true;
                    break;
                }
            }
            
            if (!foundDesc) {
                console.log('[DETAILS DEBUG] No description found for any key variation');
                // Show available keys for debugging
                const availableKeys = Object.keys(movieDescriptions).filter(key => 
                    key.toLowerCase().includes('doubtfire') || key.toLowerCase().includes('mrs')
                );
                console.log('[DETAILS DEBUG] Available keys containing "doubtfire" or "mrs":', availableKeys);
            }
            
            // Update description
            const descElement = document.querySelector('.media-library-details-description');
            if (descElement) {
                descElement.innerHTML = desc ? desc : '<span class="no-description">No description available.</span>';
            }
            
        // --- ACTOR IMAGES ROW ---
        let castRow = '';
            this.movieCast = null;
        const movieCast = await this.loadMovieCast();
        let castData = null;
        
        // Try the same key variations for cast data
        let foundCast = false;
        for (const key of keyVariations) {
            if (key && movieCast[key] && Array.isArray(movieCast[key].cast) && movieCast[key].cast.length > 0) {
                castData = movieCast[key].cast;
                console.log('[DETAILS DEBUG] Found cast with key:', key);
                foundCast = true;
                break;
            }
        }
        
        if (!foundCast) {
            console.log('[DETAILS DEBUG] No cast found for any key variation');
            // Show available cast keys for debugging
            const availableCastKeys = Object.keys(movieCast).filter(key => 
                key.toLowerCase().includes('doubtfire') || key.toLowerCase().includes('mrs')
            );
            console.log('[DETAILS DEBUG] Available cast keys containing "doubtfire" or "mrs":', availableCastKeys);
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
            
            // Update cast section
            const castElement = document.querySelector('.media-library-details-cast-list');
            if (castElement) {
                if (cast) {
                    castElement.innerHTML = `<b>Cast:</b>${cast}`;
                        } else {
                    castElement.innerHTML = '<b>Cast:</b><span class="no-cast">No cast information available.</span>';
                }
            }
            
        } catch (err) {
            console.error('[DETAILS MODAL ERROR]', err);
            // Update error state without clearing the entire modal
            const descElement = document.querySelector('.media-library-details-description');
            if (descElement) {
                descElement.innerHTML = '<span class="error-description">Error loading description. Check the console for more info.</span>';
            }
            const castElement = document.querySelector('.media-library-details-cast-list');
            if (castElement) {
                castElement.innerHTML = '<b>Cast:</b><span class="error-cast">Error loading cast information.</span>';
            }
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
                        // Construct proper full path for TV shows
                        let fullPath = show.path;
                        if (!fullPath || fullPath === name) {
                            // If path is missing or just the display name, construct the full path
                            // Assuming TV shows are in a TV-SHOWS directory structure
                            fullPath = `TV-SHOWS/${name}`;
                        }
                        
                        // console.log('[TV-SHOW-PATH-FIX] Constructed path for:', name, '->', fullPath);
                        tvShows.push({
                            name,
                            path: fullPath,
                            normalizedKey: show.normalizedKey,
                            TMDBTitle: show.TMDBTitle, // Include TMDBTitle field
                            data: show
                        });
                    }
                });
            } else if (typeof this.tvShowsData === 'object' && !Array.isArray(this.tvShowsData)) {
                // Object format support (current format)
                Object.keys(this.tvShowsData).forEach(key => {
                    const show = this.tvShowsData[key];
                    if (show && (show.path || show.title)) {
                        const name = show.title || show.path || key;
                        
                        // Construct proper full path for TV shows
                        let fullPath = show.path;
                        if (!fullPath || fullPath === name) {
                            // If path is missing or just the display name, construct the full path
                            // Assuming TV shows are in a TV-SHOWS directory structure
                            fullPath = `TV-SHOWS/${name}`;
                        }
                        
                        // console.log('[TV-SHOW-PATH-FIX] Object format - Constructed path for:', name, '->', fullPath);
                        tvShows.push({
                            name: name,
                            path: fullPath,
                            data: show,
                            normalizedKey: show.normalizedKey || key,
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
            if (!window.normalizeKey) {
                console.error('[SEASON LOOKUP] NormalizationService not loaded - this should not happen!');
                return [];
            }
            
            // Extract year from showName if present
            const yearMatch = showName.match(/\((\d{4})\)/);
            const year = yearMatch ? yearMatch[1] : null;
            
            // Create standardized key using our normalization service - use normalizeKey for JSON files (no tvshows prefix)
            const standardizedKey = window.normalizeKey(showName);
            console.log('[DEBUG - SEASON] Generated standardized key:', standardizedKey, 'for showName:', showName, 'year:', year);
            
            // Try multiple key formats to match the saved data (for backward compatibility)
            const possibleKeys = [
                standardizedKey,  // Our new standardized key (no tvshows prefix)
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
        // console.log('[EPISODE DEBUG] getEpisodesForSeason called with showPath:', showPath, 'seasonPath:', seasonPath);
        
        if (typeof showPath === 'object' && showPath && showPath.data) {
            show = showPath.data;
        } else if (typeof showPath === 'object' && showPath) {
            show = showPath;
        } else {
            show = this.findShowByPath(showPath);
        }
        
        // console.log('[EPISODE DEBUG] show object:', show);
        
        if (!show) {
            // console.log('[EPISODE DEBUG] show is null or undefined');
            return [];
        }

        // Handle the normalized TV shows format with folders structure
        if (show.folders && Array.isArray(show.folders) && show.folders.length > 0) {
            // console.log('[EPISODE DEBUG] Found folders array with', show.folders.length, 'folders');
            
            // Find the season folder that matches the seasonPath
            const seasonFolder = show.folders.find(folder => {
                const folderPath = folder.path || '';
                const normalizedFolderPath = folderPath.replace(/\\/g, '/');
                const normalizedSeasonPath = seasonPath.replace(/\\/g, '/');
                
                // console.log('[EPISODE DEBUG] Comparing folder path:', normalizedFolderPath, 'with season path:', normalizedSeasonPath);
                
                // Extract season number from seasonPath (e.g., "Season 01" -> "01", "S01" -> "01")
                const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i) || seasonPath.match(/^s(\d+)/i);
                const seasonNumber = seasonMatch ? seasonMatch[1] : null;
                
                // Extract season number from folder path (e.g., "S01" -> "01")
                const folderMatch = folderPath.match(/s(\d+)/i);
                const folderSeasonNumber = folderMatch ? folderMatch[1] : null;
                
                // console.log('[EPISODE DEBUG] Season numbers - seasonPath:', seasonNumber, 'folderPath:', folderSeasonNumber);
                
                // Try multiple matching strategies
                return (seasonNumber && folderSeasonNumber && seasonNumber === folderSeasonNumber) ||
                       normalizedFolderPath.includes(normalizedSeasonPath) || 
                       normalizedSeasonPath.includes(normalizedFolderPath) ||
                       folderPath === seasonPath ||
                       folderPath.endsWith(seasonPath) ||
                       seasonPath.endsWith(folderPath.split(/[\\/]/).pop());
            });
            
            if (!seasonFolder) {
                // console.log('[EPISODE DEBUG] Season folder not found for path:', seasonPath);
                // console.log('[EPISODE DEBUG] Available folders:', show.folders.map(f => f.path));
                return [];
            }
            
            // console.log('[EPISODE DEBUG] Found season folder:', seasonFolder.path);
            // console.log('[EPISODE DEBUG] Season folder has', seasonFolder.files?.length || 0, 'files');
            
            if (!seasonFolder.files || seasonFolder.files.length === 0) {
                // console.log('[EPISODE DEBUG] No files found in season folder');
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
            
            // console.log('[EPISODE DEBUG] Returning', episodes.length, 'episodes');
            return episodes;
        }
        
        // Handle shows with episodes directly in files array (like Citadel)
        if (show.files && Array.isArray(show.files) && show.files.length > 0) {
            // console.log('[EPISODE DEBUG] Found files array with', show.files.length, 'files');
            
            // Extract season number from seasonPath (e.g., "Season 01" -> "01", "S01" -> "01")
            const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i) || seasonPath.match(/^s(\d+)/i);
            const seasonNumber = seasonMatch ? seasonMatch[1] : null;
            
            // console.log('[EPISODE DEBUG] Looking for season number:', seasonNumber);
            
            // Filter files to only include episodes from the requested season
            let episodes = show.files.filter(file => {
                const fileName = file.name || file.filename || '';
                const episodeMatch = fileName.match(/S(\d{1,2})E(\d{1,2})/i);
                if (!episodeMatch) return false;
                
                const fileSeasonNumber = episodeMatch[1];
                // console.log('[EPISODE DEBUG] File', fileName, 'has season number:', fileSeasonNumber);
                
                return seasonNumber && fileSeasonNumber === seasonNumber;
            }).map(file => ({
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
            
            // console.log('[EPISODE DEBUG] Returning', episodes.length, 'episodes from files array');
            return episodes;
        }
        
        // Handle old seasons array format (fallback)
        if (show.seasons && Array.isArray(show.seasons) && show.seasons.length > 0) {
            // console.log('[EPISODE DEBUG] Found seasons array with', show.seasons.length, 'seasons');
            
            // Handle new format: array of season objects with episodes
            if (show.seasons[0] && typeof show.seasons[0] === 'object' && show.seasons[0].episodes) {
                // console.log('[EPISODE DEBUG] Processing new format with season objects containing episodes');
                // Extract season number from seasonPath (e.g., "Season 01" -> 1)
                const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i) || seasonPath.match(/^s(\d+)/i);
                if (!seasonMatch) {
                    // console.log('[EPISODE DEBUG] Could not extract season number from:', seasonPath);
                    return [];
                }
                const seasonNumber = parseInt(seasonMatch[1], 10);
                // console.log('[EPISODE DEBUG] Looking for season number:', seasonNumber);
                
                // Find season by seasonNumber
                const season = show.seasons.find(s => s.seasonNumber === seasonNumber);
                if (!season) {
                    // console.log('[EPISODE DEBUG] Season not found for season number:', seasonNumber);
                    // console.log('[EPISODE DEBUG] Available seasons:', show.seasons.map(s => s.seasonNumber));
                    return [];
                }
                
                // console.log('[EPISODE DEBUG] Found season with', season.episodes?.length || 0, 'episodes');
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
                // console.log('[EPISODE DEBUG] Processing old format with seasonNumber');
            // Extract season number from seasonPath (e.g., "Season 01" -> 1)
            const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i) || seasonPath.match(/^s(\d+)/i);
            if (!seasonMatch) {
                // console.log('[EPISODE DEBUG] Could not extract season number from:', seasonPath);
                return [];
            }
            const seasonNumber = parseInt(seasonMatch[1], 10);
            // console.log('[EPISODE DEBUG] Looking for season number:', seasonNumber);
            const season = show.seasons.find(s => s.seasonNumber === seasonNumber);
            if (!season) {
                // console.log('[EPISODE DEBUG] Season not found:', seasonNumber);
                return [];
            }
            // console.log('[EPISODE DEBUG] Found season with', season.episodes?.length || 0, 'episodes');
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
            // console.log('[EPISODE DEBUG] Using folder-based episode detection');
            
            const normalizedSeasonPath = (seasonPath || '').replace(/\\/g, '/').toLowerCase().trim();
            // console.log('[EPISODE DEBUG] Normalized seasonPath:', normalizedSeasonPath);

            function findSeasonFolder(folders, parentPath = '') {
                for (const folder of folders) {
                    let folderPath = (folder.path || '').replace(/\\/g, '/').toLowerCase().trim();
                    // console.log('[EPISODE DEBUG] Checking folderPath:', folderPath);
                    if (folderPath === normalizedSeasonPath) {
                        // console.log('[EPISODE DEBUG] Found matching season folder:', folderPath);
                        // console.log('[EPISODE DEBUG] season.files:', folder.files);
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
                // console.log('[EPISODE DEBUG] No matching season folder found for:', normalizedSeasonPath);
                return [];
            }
            if (!Array.isArray(seasonFolder.files)) {
                // console.log('[EPISODE DEBUG] seasonFolder.files is not an array:', seasonFolder.files);
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
            
            // console.log('[EPISODE DEBUG] Sorted episodes:', episodes.map(e => e.name));
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
        
        // 1. Search top-level TV show objects with multiple matching strategies
        const tvShows = this.getTVShows();
        for (const show of tvShows) {
            const showObjPath = (show.path || '').replace(/\\/g, '/').toLowerCase();
            const showNormalizedKey = (show.normalizedKey || '').toLowerCase();
            
            // Strategy 1: Exact path match
            if (showObjPath === target) {
                console.log('[FIND SHOW DEBUG] Found exact path match:', show);
                return show;
            }
            
            // Strategy 2: Normalized key match (NEW - this should fix "Man vs. Bee")
            if (showNormalizedKey && showNormalizedKey === target) {
                console.log('[FIND SHOW DEBUG] Found normalized key match:', show);
                return show;
            }
            
            // Strategy 2: Match without year (e.g., "bored to death" matches "bored to death (2009)")
            const targetWithoutYear = target.replace(/\s*\(\d{4}\)$/, '');
            const showPathWithoutYear = showObjPath.replace(/\s*\(\d{4}\)$/, '');
            if (targetWithoutYear === showPathWithoutYear && targetWithoutYear.length > 0) {
                console.log('[FIND SHOW DEBUG] Found year-flexible match:', show);
                return show;
            }
            
            // Strategy 3: Normalized match (handle special characters)
            const normalize = (str) => str.toLowerCase()
                .replace(/[^\w\s]/g, ' ')  // Replace special chars with spaces
                .replace(/\s+/g, ' ')      // Normalize spaces
                .replace(/\s*\d{4}\s*$/, '') // Remove year
                .trim();
            
            const normalizedTarget = normalize(target);
            const normalizedShowPath = normalize(showObjPath);
            if (normalizedTarget === normalizedShowPath && normalizedTarget.length > 0) {
                console.log('[FIND SHOW DEBUG] Found normalized match:', show);
                return show;
            }
        }
        // 2. Optionally, search recursively in folders (legacy/edge cases)
        function recursiveSearch(folders) {
            if (!Array.isArray(folders)) return null;
            for (const folder of folders) {
                const folderPath = (folder.path || '').replace(/\\/g, '/').toLowerCase();
                if (folderPath === target) {
                    // console.log('[FIND SHOW DEBUG] Found nested folder:', folder);
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
        // console.log('[FIND SHOW DEBUG] No show found for path:', showPath);
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
            if (!window.normalizeKey) {
                console.error('[SEASON IMAGE] NormalizationService not loaded - this should not happen!');
                return '/assets/img/placeholder-poster.jpg';
            }
            
            // Ensure we use the clean show name for lookup, not the full path
            let cleanShowName = showName;
            if (showName && (showName.includes('\\') || showName.includes('/'))) {
                cleanShowName = this.extractShowName(showName);
            }
            
            // Extract year from cleanShowName if present
            const yearMatch = cleanShowName.match(/\((\d{4})\)/);
            const year = yearMatch ? yearMatch[1] : null;
            
            // Create standardized key - use normalizeKey for JSON files (no tvshows prefix)
            const showKey = window.normalizeKey(cleanShowName);
            
            console.log('[SEASON IMAGE LOOKUP]', { showName, cleanShowName, showKey, year });

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
            if (!window.normalizeKey) {
                console.error('[EPISODE IMAGE] NormalizationService not loaded - this should not happen!');
                return '/assets/img/placeholder-poster.jpg';
            }
            
            // Ensure we use the clean show name for lookup, not the full path
            let cleanShowName = showName;
            if (showName && (showName.includes('\\') || showName.includes('/'))) {
                cleanShowName = this.extractShowName(showName);
            }
            
            // Extract year from cleanShowName if present
            const yearMatch = cleanShowName.match(/\((\d{4})\)/);
            const year = yearMatch ? yearMatch[1] : null;
            
            // Create standardized key - use normalizeKey for JSON files (no tvshows prefix)
            const showKey = window.normalizeKey(cleanShowName);
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
            // console.log('[EPISODE IMAGE LOOKUP]', { showName, cleanShowName, showKey, year, seasonNum, episodeNum, episodeName: episode?.name });
            //console.log('[EPISODE IMAGE LOOKUP] Available keys:', Object.keys(this.seasonEpisodeImages));
            
            // Add more detailed debugging for Citadel specifically
            if (cleanShowName && cleanShowName.toLowerCase().includes('citadel')) {
                // console.log('[EPISODE IMAGE DEBUG] Citadel detected!');
                // console.log('[EPISODE IMAGE DEBUG] showName:', showName);
                // console.log('[EPISODE IMAGE DEBUG] cleanShowName:', cleanShowName);
                // console.log('[EPISODE IMAGE DEBUG] showKey:', showKey);
                // console.log('[EPISODE IMAGE DEBUG] seasonNum:', seasonNum);
                // console.log('[EPISODE IMAGE DEBUG] episodeNum:', episodeNum);
                // console.log('[EPISODE IMAGE DEBUG] Has showData:', !!this.seasonEpisodeImages[showKey]);
                if (this.seasonEpisodeImages[showKey]) {
                    console.log('[EPISODE IMAGE DEBUG] ShowData seasons:', Object.keys(this.seasonEpisodeImages[showKey].seasons || {}));
                }
            }
            // Lookup
            const showData = this.seasonEpisodeImages[showKey];
            if (!showData) {
                console.warn('[EPISODE IMAGE] No showData for', showKey);
                console.warn('[EPISODE IMAGE] Available keys:', Object.keys(this.seasonEpisodeImages));
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
            // console.log('[EPISODE IMAGE] Found still:', stillPath);
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
        
        console.log('[TV SHOW DETAILS DEBUG] Loading details for:', showName);
        
        if (!this.tvShowDescriptions) {
            try {
                console.log('[TV SHOW DETAILS DEBUG] Loading descriptions file...');
                const descResp = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_descriptions_normalized.json?ts=' + Date.now());
                this.tvShowDescriptions = descResp.ok ? await descResp.json() : {};
                console.log('[TV SHOW DETAILS DEBUG] Descriptions loaded, keys count:', Object.keys(this.tvShowDescriptions || {}).length);
            } catch (e) { 
                console.error('[TV SHOW DETAILS DEBUG] Error loading descriptions:', e);
                this.tvShowDescriptions = {}; 
            }
        }
        if (!this.tvShowCast) {
            try {
                console.log('[TV SHOW DETAILS DEBUG] Loading cast file...');
                const castResp = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json?ts=' + Date.now());
                this.tvShowCast = castResp.ok ? await castResp.json() : {};
                console.log('[TV SHOW DETAILS DEBUG] Cast loaded, keys count:', Object.keys(this.tvShowCast || {}).length);
            } catch (e) { 
                console.error('[TV SHOW DETAILS DEBUG] Error loading cast:', e);
                this.tvShowCast = {}; 
            }
        }
        
        // Use the standardized normalization service
        if (!window.normalizeKey) {
            console.error('[TV SHOW DETAILS] NormalizationService not loaded - this should not happen!');
            return { description: '', cast: [] };
        }
        
        // Extract year from showName if present
        const yearMatch = showName.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : null;
        
        // Create standardized key - use normalizeKey to avoid tvshows prefix
        let showKey = window.normalizeKey(showName);
        
        console.log('[TV SHOW DETAILS LOOKUP]', { showName, showKey, year });
        console.log('[TV SHOW DETAILS DEBUG] All description keys:', Object.keys(this.tvShowDescriptions || {}));
        console.log('[TV SHOW DETAILS DEBUG] All cast keys:', Object.keys(this.tvShowCast || {}));
        
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
        
        console.log('[TV SHOW DETAILS DEBUG] Returning:', { description: description ? description.substring(0, 50) + '...' : 'empty', cast: cast ? cast.length : 0 });
        
        return {
            description,
            cast
        };
        }

    async renderSeasonsView(showPath) {
        // CRITICAL: Set the current TV show state for navigation
        this.currentTVShow = showPath;
        
        // Update modal content class to hide A-Z sidebar for TV show seasons
        const modalContent = document.querySelector('.media-library-modal-content');
        if (modalContent) {
            modalContent.classList.remove('movies', 'tvshows', 'favorites', 'collections', 'suggestions', 'watchlater', 'moviedetails', 'tvshowepisodes');
            modalContent.classList.add('tvshowseason');
        }
        
        // Use centralized data loading method to ensure ALL necessary data is available
        await this.ensureTVShowDataLoaded();
        
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
        
        // Load description and cast
        // Ensure we use the clean show name for lookup, not the full path
        let cleanShowName = showName;
            if (showName && (showName.includes('\\') || showName.includes('/'))) {
            cleanShowName = this.extractShowName(showName);
        }
        
        // Call getSeasonsForShow with the full showPath so it can find the show in TV shows data
        const seasons = this.getSeasonsForShow(showPath);
        console.log('[DEBUG - RenderSeasonsView] renderSeasonsView seasons:', seasons);
        console.log('[DEBUG - RENDER SEASONS] About to load TV show details for cleanShowName:', cleanShowName);
        let { description, cast } = await this.loadTVShowDetails(cleanShowName);
        console.log('[DEBUG - RENDER SEASONS] Loaded description length:', description ? description.length : 0);
        console.log('[DEBUG - RENDER SEASONS] Loaded cast length:', cast ? cast.length : 0);
        console.log('[DEBUG - RENDER SEASONS] Description preview:', description ? description.substring(0, 100) + '...' : 'empty');
        console.log('[DEBUG - RENDER SEASONS] Cast preview:', cast ? cast.slice(0, 2).map(c => c.name || c) : 'empty');
        
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
                <span>${cleanShowName.replace(/^TV-SHOWS\//, '')}</span>
            </div>
            <hr class="media-library-tvshows-hr">
            <div class="media-library-seasons-main-col">
                <div class="media-library-seasons-header-row">
                                    <div class="media-library-seasons-title">
                    <h2 class="${cleanShowName.toLowerCase().includes('lois & clark') || cleanShowName.toLowerCase().includes('lois and clark') ? 'media-library-tv-show-title-lois-clark' : 'media-library-tv-show-title'}">${cleanShowName}</h2>
                    <p>${seasons.length} ${seasons.length === 1 ? 'Season' : 'Seasons'}</p>
                </div>
                    <div class="media-library-seasons-description">${description}</div>
                </div>
                <div class="${wrapperClass}">
                    ${showArrows ? `<button class="media-library-arrow-btn left" type="button">&#8592;</button>` : ''}
                    <div class="${gridClass}">
                        ${seasons.map(season => {
                            // Try to get season-specific image first
                            let seasonImage = this.getSeasonImage(cleanShowName, season.path);
                            
                            // If no season image, try to get the main TV show poster as fallback
                            if (!seasonImage || seasonImage === '/assets/img/placeholder-poster.jpg') {
                                console.log('[COLLECTIONS] No season image found, trying TV show poster fallback for:', cleanShowName);
                                const tvShowPoster = this.getPosterPath({ 
                                    title: cleanShowName, 
                                    type: 'tvshow',
                                    path: showPath 
                                });
                                if (tvShowPoster && tvShowPoster !== '/assets/img/placeholder-poster.jpg') {
                                    seasonImage = tvShowPoster;
                                }
                            }
                            
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
        // Don't update modal content class here - let the caller handle it
        // This method should just return the HTML content
        
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
            
            // Safety check for currentTVSeason
            if (!this.currentTVSeason) {
                console.error('[RENDER EPISODES] currentTVSeason is null or undefined');
                return '<div style="color:red;">[ERROR] Season information is missing. Please try navigating again.</div>';
            }
            
            // Debug logging for currentTVShow
            if (!this.currentTVShow) {
                console.warn('[RENDER EPISODES] currentTVShow is null or undefined, but continuing');
            }
            
            const seasonName = this.currentTVSeason.split(/[\/]/).pop();
            
            // Get episodes from the real file system
            let episodes = this.getEpisodesForSeason(show, this.currentTVSeason) || [];
            console.log('[DEBUG] Episodes from getEpisodesForSeason:', episodes.length);
            console.log('[DEBUG] showName for episode images:', showName);
            console.log('[DEBUG] currentTVShow:', this.currentTVShow);
            console.log('[DEBUG] currentTVSeason:', this.currentTVSeason);
            
            // If no episodes found, let's debug what's happening
            if (episodes.length === 0) {
                console.log('[DEBUG] No episodes found! Debugging...');
                console.log('[DEBUG] show object:', show);
                console.log('[DEBUG] currentTVShow:', this.currentTVShow);
                console.log('[DEBUG] currentTVSeason:', this.currentTVSeason);
                
                // Try to find episodes directly in the TV shows data
                if (this.tvShowsData) {
                    // Handle both array and object formats for tvShowsData
                    let tvShowsArray = [];
                    if (Array.isArray(this.tvShowsData)) {
                        tvShowsArray = this.tvShowsData;
                    } else if (typeof this.tvShowsData === 'object' && this.tvShowsData) {
                        tvShowsArray = Object.values(this.tvShowsData);
                    }
                    
                    for (const tvShow of tvShowsArray) {
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
            
            // Debug logging for episodes
            if (!episodes || episodes.length === 0) {
                console.warn('[RENDER EPISODES] No episodes found, but continuing to render empty page');
            }

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
                    <span class="breadcrumb-link" onclick="mediaLibraryManager.backToSeasons()">${showName.replace(/^TV-SHOWS\//, '')}</span>
                </div>
                <div class="media-library-season-info">
                    <h2>${seasonName}</h2>
                    <p>${episodes.length} Episodes</p>
                </div>
                <div class="${wrapperClass}">
                    ${showArrows ? `<button class=\"media-library-arrow-episode-btn left\" type=\"button\">&#8592;</button>` : ''}
                    <div class="episode-carousel-container">
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
                        <div class="episode-carousel-gradient-left"></div>
                        <div class="episode-carousel-gradient-right"></div>
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
        
        // Restore modal content class to tvshows tab
        const modalContent = document.querySelector('.media-library-modal-content');
        if (modalContent) {
            modalContent.classList.remove('moviedetails', 'tvshowseason', 'tvshowepisodes');
            modalContent.classList.add('tvshows');
        }
        
        this.renderModal(); // Re-render modal to update tab highlight
        // Update count after navigating back to main TV-Shows page
        setTimeout(() => this.updateCount(), 0);
    }

    backToSeasons() {
        this.currentTVSeason = null;
        
        // Restore modal content class to tvshowseason
        const modalContent = document.querySelector('.media-library-modal-content');
        if (modalContent) {
            modalContent.classList.remove('moviedetails', 'tvshowepisodes');
            modalContent.classList.add('tvshowseason');
        }
        
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
        // console.log('[DEBUG - REAL-METHOD] getEpisodeObjectFromPath called with:', episodePath);
        
        if (!episodePath) {
            // console.log('[DEBUG - REAL-METHOD] No episodePath provided');
            return null;
        }
        
        // Handle both absolute and relative paths
        let workingPath = episodePath;
        
        // If it's an absolute path, extract the relative part after TV-SHOWS
        if (workingPath.includes('TV-SHOWS') || workingPath.includes('tv-shows')) {
            const pathParts = workingPath.split(/[\\/]/);
            const tvShowsIndex = pathParts.findIndex(part => part.toLowerCase().includes('tv-shows'));
            if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
                // Get everything after TV-SHOWS: ["Show Name", "Season 01", "episode.mkv"]
                workingPath = pathParts.slice(tvShowsIndex + 1).join('/');
                console.log('[DEBUG - PATH-PROCESSING] Converted absolute path:', episodePath, 'to relative:', workingPath);
            }
        }
        
        // Parse the path to extract show, season, and episode info
        const pathParts = workingPath.split('/');
        if (pathParts.length < 3) {
            console.log('[DEBUG - REAL-METHOD] Invalid path format after processing:', workingPath, 'from original:', episodePath);
            return null;
        }
        
        const showPath = pathParts[0]; // e.g., "Bored to Death (2009)"
        const seasonPath = pathParts[0] + '/' + pathParts[1]; // e.g., "Bored to Death (2009)/Season 01"
        const episodeFilename = pathParts[2]; // e.g., "Bored to Death - S01E03 - The Case of the Missing Screenplay.mkv"
        
        // console.log('[DEBUG - REAL-METHOD] Parsed path:', { showPath, seasonPath, episodeFilename });
        
        // For findShowByPath, we need the FULL path including TV-SHOWS prefix
        // But we need to reconstruct it from the original episodePath
        let fullShowPath = showPath;
        if (episodePath.includes('TV-SHOWS') || episodePath.includes('tv-shows')) {
            fullShowPath = 'TV-SHOWS/' + showPath;
        }
        
        console.log('[DEBUG - REAL-METHOD] Using fullShowPath for findShowByPath:', fullShowPath);
        
        // Use the SAME method as main TV-SHOWS tab
        const show = this.findShowByPath(fullShowPath);
        if (!show) {
                console.log('[DEBUG - REAL-METHOD] Show not found:', fullShowPath);
            return null;
        }
        
        // console.log('[DEBUG - REAL-METHOD] Found show:', show.name);
        
        // Get episodes from the SAME method as main TV-SHOWS tab
        let episodes = this.getEpisodesForSeason(show, seasonPath) || [];
        // console.log('[DEBUG - REAL-METHOD] Found episodes:', episodes.length);
        
        // Find the specific episode by filename
        const episodeObj = episodes.find(episode => {
            const episodeName = episode.name || episode.filename || '';
            return episodeName.toLowerCase().includes(episodeFilename.toLowerCase()) || 
                   episodeFilename.toLowerCase().includes(episodeName.toLowerCase());
        });
        
        if (episodeObj) {
            // console.log('[DEBUG - REAL-METHOD] Found episode object:', episodeObj.name);
            return episodeObj;
        } else {
            // console.log('[DEBUG - REAL-METHOD] Episode not found in episodes list');
            return null;
        }
    }

    // CENTRALIZED FUNCTION: Find episode object by path from tvShowsData
    findEpisodeObjectByPath(episodePath) {
        // console.log('[DEBUG - CENTRALIZED] findEpisodeObjectByPath called with:', episodePath);
        
        if (!this.tvShowsData || !episodePath) {
            // console.log('[DEBUG - CENTRALIZED] No tvShowsData or episodePath available');
            return null;
        }
        
        // Handle both array and object formats
        let showsArray = [];
        if (Array.isArray(this.tvShowsData)) {
            showsArray = this.tvShowsData;
        } else if (typeof this.tvShowsData === 'object' && this.tvShowsData) {
            showsArray = Object.values(this.tvShowsData);
        }
        
        // console.log('[DEBUG - CENTRALIZED] tvShowsData type:', Array.isArray(this.tvShowsData) ? 'array' : 'object');
        // console.log('[DEBUG - CENTRALIZED] showsArray length:', showsArray.length);
        // console.log('[DEBUG - CENTRALIZED] First few shows:', showsArray.slice(0, 3).map(s => s.path || s.name || 'unknown'));
        
        // Search through all TV shows and their seasons/episodes
        for (const show of showsArray) {
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
                                // console.log('[DEBUG - PATH-MATCHING] Looking for:', normalizedEpisodePath);
                                // console.log('[DEBUG - PATH-MATCHING] Episode paths available:');
                                // console.log('[DEBUG - PATH-MATCHING]   episode.path:', episode.path);
                                // console.log('[DEBUG - PATH-MATCHING]   episode.absPath:', episode.absPath);
                                // console.log('[DEBUG - PATH-MATCHING]   episode.filePath:', episode.filePath);
                                // console.log('[DEBUG - PATH-MATCHING]   episode.relPath:', episode.relPath);
                                // console.log('[DEBUG - PATH-MATCHING] Full episode object:', episode);
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
                                // console.log('[DEBUG - PATH-MATCHING] Matched by show/season/episode:', episodeInfo);
                                return true;
                            }
                            
                            return false;
                        });
                        
                        if (episodeObj) {
                            // console.log('[DEBUG - CENTRALIZED] Found episode in show:', show.name, 'season:', season.name);
                            return episodeObj;
                        }
                    }
                }
            }
        }
        
        // console.log('[DEBUG - CENTRALIZED] No episode object found for path:', episodePath);
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
            // Use normalizedKey for display title, fallback to path if needed
            let displayTitle = '';
            if (item.normalizedKey) {
                // Convert normalized key to readable display format
                displayTitle = this.convertNormalizedKeyToDisplayTitle(item.normalizedKey);
            } else if (item.path) {
                // Fallback to path and clean it
                displayTitle = this.cleanTitleForDisplay(item.path);
            } else {
                displayTitle = item.TMDBTitle || item.title || item.name || item.filename || '';
            }
            
            const firstLetter = displayTitle.charAt(0).toUpperCase();
            
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
                        <button class="collection-btn" data-path="${item.path}" title="Add to Collection">➕</button>
                    </div>
                    <img src="${this.getPosterPath(item)}" alt="${displayTitle}" class="media-library-poster">
                    <div class="media-info"><h3>${displayTitle}</h3></div>
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
                collectionBtn.onclick = async (e) => {
                    e.stopPropagation();
                    try {
                        // Always show the manage collections modal for multiple collection support
                        // This allows users to add to more collections OR remove from existing ones
                        await this.showAddToCollectionModal(item);
                    } catch (error) {
                        console.error('[DEBUG - COLLECTIONS] Error handling collection button click:', error);
                        this.showToast('Error opening collections modal', 'error');
                    }
                };
            }
            
            // Attach main card click handler for movie details
            card.addEventListener('click', async (e) => {
                if (e.target.closest('.poster-selector-btn') || e.target.closest('.favorite-btn') || e.target.closest('.favorite-btn-movie') || e.target.closest('.collection-btn')) {
                    return; // Don't trigger card click for action buttons
                }
                console.log('[DEBUG - MOVIE-CARD] Movie card clicked:', item.path);
                console.log('[DEBUG - MOVIE-CARD] Item object:', item);
                console.log('[DEBUG - MOVIE-CARD] Item properties:', {
                    path: item.path,
                    absPath: item.absPath,
                    filePath: item.filePath,
                    files: item.files,
                    type: item.type,
                    mediaType: item.mediaType,
                    title: item.title,
                    name: item.name,
                    normalizedKey: item.normalizedKey
                });
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
                collectionBtn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    const showName = card.getAttribute('data-show-name');
                    const showData = { path: path, name: showName };
                    
                    try {
                        // Always show the manage collections modal for multiple collection support
                        // This allows users to add to more collections OR remove from existing ones
                        await this.showAddToCollectionModal(showData);
                    } catch (error) {
                        console.error('[DEBUG - COLLECTIONS] Error handling collection button click:', error);
                        this.showToast('Error opening collections modal', 'error');
                    }
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
        const movieCards = document.querySelectorAll('.media-library-movie-card-movies');
        // console.log('[DEBUG - FAVORITES] Found', movieCards.length, 'movie cards');
        
        movieCards.forEach(card => {
            const path = card.getAttribute('data-path');
            // console.log('[DEBUG - FAVORITES] Attaching movie handler for:', path);
            
            // Attach favorite button handler - specifically target movie favorite buttons
            const favoriteBtn = card.querySelector('.favorites-only-heart-btn');
            if (favoriteBtn) {
                favoriteBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // console.log('[DEBUG - FAVORITES] Removing movie from favorites:', path);
                    this.toggleFavorite(path, 'movie');
                    // Force immediate heart icon update
                    setTimeout(() => this.updateHeartIcons(), 50);
                    return false;
                };
            }
            
            // Attach card click handler for playing movies
            card.onclick = (e) => {
                // console.log('[DEBUG - FAVORITES-CARD] Favorites movie card clicked for path:', path);
                if (e.target.closest('.favorites-only-heart-btn') || e.target.closest('.poster-selector-btn') || e.target.closest('.collection-btn')) return; // Don't trigger for action buttons
                
                // Find the movie data from the media library JSON
                const movieData = this.mediaLibraryRaw ? this.mediaLibraryRaw.find(movie => movie.path === path) : null;
                
                if (movieData) {
                    // console.log('[DEBUG - FAVORITES] Found movie data from JSON:', movieData);
                    this.playMedia(movieData);
                } else {
                    // console.warn('[DEBUG - FAVORITES] Movie not found in media library JSON:', path);
                    // Fallback: create basic object but with proper type
                    const movieObj = { 
                        path: path,
                        type: 'movie'
                    };
                    this.playMedia(movieObj);
                }
                };
            });
        
        // Attach click handlers for TV show favorites
        document.querySelectorAll('.media-library-movie-card-tvshows').forEach(card => {
            const path = card.getAttribute('data-path');
            // console.log('[DEBUG - FAVORITES] Attaching TV show handler for:', path);
            
            // Attach favorite button handler - specifically target TV show favorite buttons
            const favoriteBtn = card.querySelector('.favorites-only-heart-btn');
            if (favoriteBtn) {
                favoriteBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    // console.log('[DEBUG - FAVORITES] Removing TV show from favorites:', path);
                    this.toggleFavorite(path, 'tv');
                    // Force immediate heart icon update
                    setTimeout(() => this.updateHeartIcons(), 50);
                    return false;
                };
            }
            
            // Attach card click handler for opening TV shows
            card.onclick = (e) => {
                if (e.target.closest('.favorites-only-heart-btn') || e.target.closest('.poster-selector-btn') || e.target.closest('.collection-btn')) return; // Don't trigger for action buttons
                // console.log('[DEBUG - FAVORITES] Opening TV show from favorites:', path);
                // Switch to TV shows tab first, then open the specific show
                this.currentTab = 'tvshows';
                this.currentTabFlag = 'tvshows'; // Update the flag as well
                this.openTVShow(path);
                };
            });
    }

    attachCollectionHandlers() {
        // console.log('[DEBUG] Attaching collection handlers');
        
        // Attach click handlers for collection buttons
        document.querySelectorAll('.collection-btn[data-collection]').forEach(btn => {
            const collectionName = btn.getAttribute('data-collection');
            btn.onclick = () => {
                // console.log('[DEBUG - COLLECTIONS] Opening collection:', collectionName);
                this.currentCollectionView = collectionName;
                this.renderModal();
            };
        });
        
        // Attach click handlers for back button
        const backBtn = document.getElementById('backToCollectionsBtn');
        if (backBtn) {
            backBtn.onclick = () => {
                // console.log('[DEBUG - COLLECTIONS] Going back to collections list');
                this.currentCollectionView = null;
                this.renderModal();
            };
        }
        
        // Attach click handlers for delete button
        const deleteBtn = document.getElementById('deleteCollectionBtn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                console.log('[DEBUG - COLLECTIONS] Deleting collection:', this.currentCollectionView);
                
                // Create custom confirmation modal
                const modal = document.createElement('div');
                modal.className = 'collection-modal-overlay';
                modal.innerHTML = `
                    <div class="collection-modal">
                        <div class="collection-modal-header">
                            <h3>Delete Collection</h3>
                        </div>
                        <div class="collection-modal-body">
                            <p>Are you sure you want to delete the collection "${this.currentCollectionView}"? This cannot be undone.</p>
                        </div>
                        <div class="collection-modal-footer">
                            <button class="collection-modal-btn collection-modal-btn-cancel">Cancel</button>
                            <button class="collection-modal-btn collection-modal-btn-confirm">Delete</button>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(modal);
                
                // Add event listeners
                const cancelBtn = modal.querySelector('.collection-modal-btn-cancel');
                const confirmBtn = modal.querySelector('.collection-modal-btn-confirm');
                
                const closeModal = () => {
                    document.body.removeChild(modal);
                };
                
                cancelBtn.onclick = closeModal;
                confirmBtn.onclick = async () => {
                    try {
                        const collections = await this.getCollections();
                        delete collections[this.currentCollectionView];
                        await this.saveCollections(collections);
                        this.currentCollectionView = null;
                        this.showToast('Collection deleted!');
                        this.renderModal();
                        closeModal();
                    } catch (error) {
                        console.error('[DEBUG - COLLECTIONS] Error deleting collection:', error);
                        this.showToast('Error deleting collection', 'error');
                    }
                };
                
                // Close on overlay click
                modal.onclick = (e) => {
                    if (e.target === modal) closeModal();
                };
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
                        // console.log('[DEBUG - COLLECTIONS] Playing movie from collection:', movie.title);
                        this.playMedia(movie);
                    }
                };
            }
        });
    }

    updateHeartIcons() {
        // console.log('[DEBUG - HEART ICONS] Updating heart icons');
        
        // Update heart icons for TV show cards (using the correct selector)
        const tvHearts = document.querySelectorAll('.media-library-tv-card .favorite-btn');
        // console.log('[DEBUG - HEART ICONS] Found TV show heart buttons:', tvHearts.length);
        
        tvHearts.forEach(btn => {
            const card = btn.closest('.media-library-tv-card');
            const path = card ? card.getAttribute('data-path') : null;
            if (path) {
                const isFav = this.isFavorite(path);
                const oldText = btn.textContent;
                btn.textContent = isFav ? '❤️' : '🤍';
                btn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
                // console.log('[DEBUG - HEART ICONS] Updated TV show heart:', path, 'isFavorite:', isFav, 'oldText:', oldText, 'newText:', btn.textContent);
            } else {
                // console.warn('[DEBUG - HEART ICONS] No path found for TV show heart button');
            }
        });
        
        // Update heart icons for movie cards (using the correct class being used)
        const movieHearts = document.querySelectorAll('.media-library-movie-card .favorite-btn-movie');
        // console.log('[DEBUG - HEART ICONS] Found movie heart buttons:', movieHearts.length);
        
        movieHearts.forEach(btn => {
            const card = btn.closest('.media-library-movie-card');
            const path = card ? card.getAttribute('data-item-path') : null;
            if (path) {
                const isFav = this.isFavorite(path);
                const oldText = btn.textContent;
                btn.textContent = isFav ? '❤️' : '🤍';
                btn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
                // console.log('[DEBUG - HEART ICONS] Updated movie heart:', path, 'isFavorite:', isFav, 'oldText:', oldText, 'newText:', btn.textContent);
            } else {
                // console.warn('[DEBUG - HEART ICONS] No path found for movie heart button');
            }
        });
        
        // Update heart icons for favorites cards (these should always be red since they're in favorites)
        document.querySelectorAll('.media-library-movie-card-movies .favorite-btn, .media-library-movie-card-tvshows .favorite-btn').forEach(btn => {
            const card = btn.closest('[data-path]');
            const path = card ? card.getAttribute('data-path') : null;
            if (path) {
                btn.textContent = '❤️';
                btn.title = 'Remove from Favorites';
                // console.log('[DEBUG - HEART ICONS] Updated favorites heart:', path);
            }
        });
        
        // console.log('[DEBUG - HEART ICONS] Heart icon update complete');
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
        if (!window.normalizeKey) {
            console.error('[MEDIA-LIBRARY] NormalizationService not loaded - this should not happen!');
            return '<div class="error">NormalizationService not available</div>';
        }
        
        const sortedShows = this.getFilteredAndSortedItems();
        const addedAnchors = new Set();
        let html = '<div class="media-library-tvshow-grid">';
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
                  <div class="media-card-actions-tvshows">
                    <button class="poster-selector-btn" title="Change Poster">🖼️</button>
                    <button class="favorite-btn" title="Toggle Favorite">${this.isFavorite(show.path) ? '❤️' : '🩷'}</button>
                    <button class="collection-btn collection-btn-add" title="Add to Collection" data-path="${show.path}">➕</button>
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
    async saveResumeProgress(mediaItem, currentTime, duration, isManualSave = false) {
        console.log('[MEDIA-LIBRARY] saveResumeProgress called:', {mediaItem, currentTime, duration, isManualSave});
        
        try {
            // Get current resume list from localStorage
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        
        // Determine if this is a TV show by checking the path (do this BEFORE duplicate removal)
        const pathToCheck = (mediaItem.path || mediaItem.absPath || mediaItem.relPath || '').toLowerCase();
        
        const isTVShow = pathToCheck.includes('tv-shows') || 
                        pathToCheck.includes('tv_shows') ||
                        pathToCheck.includes('season') ||
                        (mediaItem.title && (mediaItem.title.includes('S00E') || mediaItem.title.includes('S01E') || mediaItem.title.includes('S02E')));
        
        // For TV shows, find and remove any existing entry to ensure we always overwrite
        // This ensures there's only ONE entry per TV show with the most up-to-date resume time
        // For movies, we'll handle duplicates differently
        let existingItem = null;
        
        if (isTVShow) {
            // For TV shows, find existing entry by multiple criteria to ensure we catch all variations
            existingItem = resumeList.find(item => {
                // Check by path first
            const itemPath = (item.path || '').replace(/\\/g, '/').toLowerCase().trim();
            const mediaPath = (mediaItem.path || '').replace(/\\/g, '/').toLowerCase().trim();
            if (itemPath === mediaPath && itemPath !== '') {
                    return true;
            }
            
                // Check by title for TV shows
                if (mediaItem.title && item.title) {
                const itemTitle = item.title.toLowerCase().trim();
                const mediaTitle = mediaItem.title.toLowerCase().trim();
                if (itemTitle === mediaTitle) {
                        return true;
                    }
                }
                
                // Check by show name and season/episode for TV shows
                if (mediaItem.title && item.title) {
                    const mediaShowName = this.extractShowName(mediaItem.title);
                    const itemShowName = this.extractShowName(item.title);
                    const mediaSeason = this.extractSeasonNumber(mediaItem);
                    const itemSeason = this.extractSeasonNumber(item);
                    const mediaEpisode = this.extractEpisodeNumber(mediaItem);
                    const itemEpisode = this.extractEpisodeNumber(item);
                    
                    if (mediaShowName && itemShowName && 
                        mediaShowName.toLowerCase() === itemShowName.toLowerCase() &&
                        mediaSeason === itemSeason && 
                        mediaEpisode === itemEpisode) {
                        return true;
                    }
                }
                
                return false;
            });
            
            // Remove the existing TV show entry if found
            if (existingItem) {
                resumeList = resumeList.filter(item => item !== existingItem);
                console.log('[MEDIA-LIBRARY] Removed existing TV show entry for overwrite:', existingItem.title);
                
                // Also remove from MongoDB to ensure complete cleanup
                if (existingItem.mediaId && existingItem.mediaType) {
                    try {
                        await this.removeFromMongoDB(existingItem.mediaId, existingItem.mediaType);
                        console.log('[MEDIA-LIBRARY] Removed existing TV show from MongoDB:', existingItem.mediaId);
                    } catch (error) {
                        console.warn('[MEDIA-LIBRARY] Could not remove from MongoDB (this is okay):', error.message);
                    }
                }
            }
        } else {
            // For movies, use the existing deduplication logic
            resumeList = resumeList.filter(item => {
                const itemPath = (item.path || '').replace(/\\/g, '/').toLowerCase().trim();
                const mediaPath = (mediaItem.path || '').replace(/\\/g, '/').toLowerCase().trim();
                
                // Remove exact path matches
                if (itemPath === mediaPath && itemPath !== '') {
                    return false; // Remove duplicate
                }
            
            return true; // Keep this item
        });
        }

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
            // For TV shows, we already found and removed the existing item above
            // For movies, we need to check if an item exists to preserve its timestamp
            if (!isTVShow) {
                const existingMovieItem = resumeList.find(item => {
                const itemPath = (item.path || '').replace(/\\/g, '/').toLowerCase().trim();
                const mediaPath = (savePath || '').replace(/\\/g, '/').toLowerCase().trim();
                return itemPath === mediaPath && itemPath !== '';
            });
                if (existingMovieItem) {
                    existingItem = existingMovieItem;
                }
            }
                
                let savedItem;
            
                    // For movies, save the COMPLETE movie object (just like main Movies section)
                    // Movies can have multiple entries if they're from different sources
            if (!isTVShow) {
                    savedItem = {
                    // Save the COMPLETE movie object with all properties
                    ...mediaItem,
                    
                    // Override/add Watch Later specific properties
                    currentTime,
                    duration,
                    lastWatched: existingItem ? existingItem.lastWatched : Date.now(),
                    type: 'movie',
                        mediaType: 'movie', // For MongoDB compatibility
                        
                        // Generate mediaId for MongoDB
                        mediaId: this.generateMediaId(mediaItem, 'movie'),
                    
                    // Ensure path is present
                    path: savePath,
                        filePath: savePath, // For MongoDB compatibility
                        fileName: savePath ? savePath.split(/[\\/]/).pop() : (mediaItem.title || 'Unknown'),
                    
                    // Ensure we have the complete files array
                    files: mediaItem.files || [],
                    
                        // Ensure absPath is present for movies
                        absPath: mediaItem.absPath || 
                               (mediaItem.files && mediaItem.files.length > 0 ? mediaItem.files[0].absPath : null) || 
                               (savePath.startsWith('S:/') ? savePath : `S:/MEDIA/MOVIES/${savePath}`)
                    };
            } else {
                // For TV shows, save the complete episode object
                console.log('[MEDIA-LIBRARY] Saving TV show to Watch Later (overwriting any existing entry):', mediaItem.title);
                    savedItem = {
                    // Save the COMPLETE episode object with all properties
                    ...mediaItem,
                    
                    // Override/add Watch Later specific properties
                    currentTime,
                    duration,
                    lastWatched: Date.now(), // For TV shows, always use current time since we're overwriting
                    type: 'tv-show',
                        mediaType: 'tv-show', // For MongoDB compatibility
                        
                        // Generate mediaId for MongoDB
                        mediaId: this.generateMediaId(mediaItem, 'tv-show'),
                    
                    // Ensure path is present
                    path: savePath,
                    
                    // Ensure filePath is present for TV shows
                        filePath: mediaItem.filePath || mediaItem.absPath || (savePath.startsWith('S:/') ? savePath : `S:/MEDIA/TV-SHOWS/${savePath}`),
                        fileName: savePath ? savePath.split(/[\\/]/).pop() : (mediaItem.title || 'Unknown'),
                        
                        // Ensure absPath is present for TV shows
                        absPath: mediaItem.absPath || mediaItem.filePath || (savePath.startsWith('S:/') ? savePath : `S:/MEDIA/TV-SHOWS/${savePath}`),
                        
                        // Extract season/episode info for MongoDB
                        season: this.extractSeasonNumber(mediaItem),
                        episode: this.extractEpisodeNumber(mediaItem),
                        episodeTitle: mediaItem.episodeTitle || mediaItem.title
                    };
                }
                
                resumeList.push(savedItem);
                
                // Save to localStorage
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
        
                // Also save to MongoDB
                await this.saveToMongoDB(savedItem);
            }
            
            this.updateWatchLaterGrid();
            
            // Log the result of the save operation
            if (isTVShow) {
                console.log('[MEDIA-LIBRARY] TV show saved to Watch Later with overwrite behavior - only one entry per show maintained');
            }
            
        if (isManualSave) {
                this.showToast('Saved to Watch Later!', 'info'); // 'info' style gives blue background with yellow border
            }
            
        } catch (error) {
            console.error('[MEDIA-LIBRARY] Error saving resume progress:', error);
            console.error('[MEDIA-LIBRARY] Error details:', {
                message: error.message,
                stack: error.stack,
                mediaItem: mediaItem?.title,
                currentTime,
                duration
            });
            this.showToast(`Error saving to Watch Later: ${error.message}`, 'error');
        }
    }

    // Helper method to generate consistent mediaId for MongoDB
    generateMediaId(mediaItem, mediaType) {
        // Use path as primary identifier, fallback to title
        const identifier = mediaItem.path || mediaItem.filePath || mediaItem.title || 'unknown';
        return `${mediaType}_${identifier.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    }

    // Helper method to extract season number from media item
    extractSeasonNumber(mediaItem) {
        if (mediaItem.season !== undefined) return mediaItem.season;
        
        // Try to extract from title or path
        const text = (mediaItem.title || mediaItem.path || '').toLowerCase();
        const seasonMatch = text.match(/s(\d+)e\d+|season[\s\-_]*(\d+)/i);
        return seasonMatch ? parseInt(seasonMatch[1] || seasonMatch[2]) : null;
    }

    // Helper method to extract episode number from media item
    extractEpisodeNumber(mediaItem) {
        if (mediaItem.episode !== undefined) return mediaItem.episode;
        
        // Try to extract from title or path
        const text = (mediaItem.title || mediaItem.path || '').toLowerCase();
        const episodeMatch = text.match(/s\d+e(\d+)|episode[\s\-_]*(\d+)/i);
        return episodeMatch ? parseInt(episodeMatch[1] || episodeMatch[2]) : null;
    }

    // Helper method to save item to MongoDB
    async saveToMongoDB(item) {
        try {
            console.log('[MEDIA-LIBRARY] Saving to MongoDB:', item.title);
            console.log('[MEDIA-LIBRARY] Item data being sent:', {
                title: item.title,
                mediaType: item.mediaType,
                absPath: item.absPath,
                filePath: item.filePath,
                currentTime: item.currentTime
            });
            
            const response = await fetch('/api/watch-later/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item)
            });

            console.log('[MEDIA-LIBRARY] MongoDB API response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[MEDIA-LIBRARY] MongoDB API error response:', errorText);
                throw new Error(`MongoDB save failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log('[MEDIA-LIBRARY] Successfully saved to MongoDB:', result.message);
            
        } catch (error) {
            console.error('[MEDIA-LIBRARY] MongoDB save error:', error);
            throw error; // Re-throw so the parent catch block can handle it
            // Don't throw - we want localStorage to still work if MongoDB fails
        }
    }

    // Method to restore Watch Later data from backup file
    async restoreWatchLaterFromBackup() {
        try {
            console.log('[WATCH-LATER DEBUG] Attempting to restore from backup file...');
            
            // Try the local backup file first (with actual progress data)
            try {
                const localResponse = await fetch('/components/MediaLibrary/data/watch_later/watch_later.json');
                if (localResponse.ok) {
                    const localWatchLaterData = await localResponse.json();
                    console.log('[WATCH-LATER DEBUG] Local watch later data received:', localWatchLaterData);
                    
                    if (localWatchLaterData.items && Array.isArray(localWatchLaterData.items)) {
                        // Data is already in the correct localStorage format
                        const items = localWatchLaterData.items;
                        console.log('[WATCH-LATER DEBUG] Using local watch later items:', items.length, 'items');
                        
                        // Update localStorage
                        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(items));
                        
                        this.updateWatchLaterGrid();
                        this.showToast(`Watch Later restored from local backup (${items.length} items with progress)`, 'green');
                        return;
                    }
                }
            } catch (localError) {
                console.log('[WATCH-LATER DEBUG] Local backup failed, trying server backup:', localError.message);
            }
            
            // Fallback to server backup
            const response = await fetch('/api/watch-later/backup');
            if (!response.ok) {
                throw new Error(`Failed to fetch backup: ${response.status}`);
            }
            
            const backupData = await response.json();
            console.log('[WATCH-LATER DEBUG] Retrieved server backup data:', backupData);
            
            if (backupData.items && Array.isArray(backupData.items)) {
                // Convert MongoDB format to localStorage format
                const localStorageItems = backupData.items.map(item => ({
                    ...item,
                    type: item.mediaType || item.type,
                    path: item.filePath || item.path,
                    lastWatched: new Date(item.lastWatched).getTime()
                }));
                
                localStorage.setItem('mediaLibraryResumeList', JSON.stringify(localStorageItems));
                console.log('[WATCH-LATER DEBUG] Restored', localStorageItems.length, 'items to localStorage');
                
                this.updateWatchLaterGrid();
                this.showToast(`Restored ${localStorageItems.length} items from server backup`, 'success');
            } else {
                throw new Error('Invalid backup data format');
            }
            
        } catch (error) {
            console.error('[WATCH-LATER DEBUG] Error restoring from backup:', error);
            this.showToast('Error restoring from backup', 'error');
            
            // Fallback to test data
            this.populateTestWatchLaterData();
        }
    }

    // Method to manually populate Watch Later with test data (for debugging)
    populateTestWatchLaterData() {
        const testData = [
            {
                title: "Test Movie 1",
                path: "movies/Test.Movie.1.(2023).[1080p].mp4",
                currentTime: 1800, // 30 minutes
                duration: 7200, // 2 hours
                lastWatched: Date.now() - 86400000, // 1 day ago
                type: "movie",
                mediaType: "movie"
            },
            {
                title: "Test TV Show S01E01",
                path: "tv-shows/Test Show (2023)/Season 1/Test.Show.S01E01.[1080p].mp4",
                currentTime: 900, // 15 minutes
                duration: 2700, // 45 minutes
                lastWatched: Date.now() - 3600000, // 1 hour ago
                type: "tv-show",
                mediaType: "tv-show"
            }
        ];
        
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(testData));
        console.log('[WATCH-LATER DEBUG] Populated test data:', testData);
        this.updateWatchLaterGrid();
        this.showToast('Test Watch Later data populated', 'success');
    }

    // Method to refresh Watch Later from MongoDB
    async refreshWatchLaterFromMongoDB() {
        try {
            console.log('[MEDIA-LIBRARY] Refreshing Watch Later from MongoDB...');
            
            const response = await fetch('/api/watch-later');
            if (!response.ok) {
                console.error('[MEDIA-LIBRARY] MongoDB API failed:', response.status);
                const errorData = await response.json().catch(() => ({}));
                console.error('[MEDIA-LIBRARY] MongoDB error details:', errorData);
                return false; // Indicate failure
            }

            const data = await response.json();
            console.log('[MEDIA-LIBRARY] Retrieved', data.itemCount, 'items from MongoDB');

            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
                // Convert MongoDB format back to localStorage format
                const localStorageItems = data.items.map(item => ({
                    ...item,
                    // Ensure compatibility with existing localStorage format
                    type: item.mediaType || item.type,
                    // PRESERVE ALL PATH FIELDS - don't overwrite!
                    path: item.path || item.filePath, // Keep original path if available
                    filePath: item.filePath, // Keep filePath for reference
                    absPath: item.absPath,   // CRITICAL: Preserve the absPath field!
                    lastWatched: item.lastWatched ? new Date(item.lastWatched).getTime() : Date.now()
                }));

                // Debug: Check the converted data
                console.log('[MEDIA-LIBRARY] Sample converted item:', localStorageItems[0]);
                console.log('[MEDIA-LIBRARY] John Carter absPath check:', localStorageItems.find(item => 
                    item.title && item.title.includes('John Carter'))?.absPath);

                // Update localStorage with MongoDB data
                localStorage.setItem('mediaLibraryResumeList', JSON.stringify(localStorageItems));
                
                // Re-render the Watch Later content
                this.updateWatchLaterGrid();
                
                this.showToast(`Refreshed ${data.itemCount} items from MongoDB`, 'success');
                console.log('[MEDIA-LIBRARY] Watch Later refreshed from MongoDB successfully');
                
                return true; // Indicate success
            } else {
                console.log('[MEDIA-LIBRARY] MongoDB returned no items');
                return false; // No data found
            }
            
        } catch (error) {
            console.error('[MEDIA-LIBRARY] Error refreshing from MongoDB:', error);
            return false; // Indicate failure
        }
    }

    async removeResumeProgress(path) {
        let resumeList = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
        
        // Normalize the target path
        const normalizedPath = path.replace(/\\/g, '/').toLowerCase().trim();
        
        // Find the item to remove (for MongoDB removal)
        const itemToRemove = resumeList.find(item => {
            const itemPaths = [
                item.path,
                item.relPath,
                item.filePath,
                item.absPath
            ].filter(p => p).map(p => p.replace(/\\/g, '/').toLowerCase().trim());
            
            return itemPaths.some(itemPath => itemPath === normalizedPath);
        });
        
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
        
        // Update localStorage
        localStorage.setItem('mediaLibraryResumeList', JSON.stringify(resumeList));
        
        // Also remove from MongoDB if we found the item
        if (itemToRemove && itemToRemove.mediaId && itemToRemove.mediaType) {
            await this.removeFromMongoDB(itemToRemove.mediaId, itemToRemove.mediaType);
        }
        
        // Refresh the Watch Later content if we're currently on that tab
        if (this.currentTab === 'watchlater') {
            this.updateWatchLaterGrid();
        }
    }

    // Helper method to remove item from MongoDB
    async removeFromMongoDB(mediaId, mediaType) {
        try {
            console.log('[MEDIA-LIBRARY] Removing from MongoDB:', mediaId);
            
            const response = await fetch('/api/watch-later/remove', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mediaId, mediaType })
            });

            if (!response.ok) {
                throw new Error(`MongoDB remove failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('[MEDIA-LIBRARY] Successfully removed from MongoDB:', result.message);
            
        } catch (error) {
            console.error('[MEDIA-LIBRARY] MongoDB remove error:', error);
            // Don't throw - we want localStorage removal to still work if MongoDB fails
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
        console.log('[WATCH-LATER DEBUG] Cleanup starting with', originalCount, 'items');
        
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
        console.log('[WATCH-LATER DEBUG] Cleanup finished with', cleanedList.length, 'items');
        
        return cleanedList;
    }

    // Try to restore Watch Later data from backup file
    async tryRestoreFromBackup() {
        try {
            console.log('[WATCH-LATER DEBUG] Attempting to restore from backup file...');
            const response = await fetch('/components/MediaLibrary/data/watch_later/watch_later.json');
            if (response.ok) {
                const backupData = await response.json();
                if (backupData.items && Array.isArray(backupData.items) && backupData.items.length > 0) {
                    console.log('[WATCH-LATER DEBUG] Found backup data with', backupData.items.length, 'items');
                    localStorage.setItem('mediaLibraryResumeList', JSON.stringify(backupData.items));
                    this.showToast(`Restored ${backupData.items.length} items from backup!`, 'blue');
                    return backupData.items;
                }
            }
        } catch (error) {
            console.log('[WATCH-LATER DEBUG] Could not restore from backup:', error);
        }
        return [];
    }

    // Clear and rebuild Watch Later data with complete file information
    async clearAndRebuildWatchLater() {
        console.log('[MEDIA-LIBRARY] Clearing and rebuilding Watch Later data...');
        localStorage.removeItem('mediaLibraryResumeList');
        this.showToast('Watch Later data cleared. Re-add items to get complete file information.');
        this.updateWatchLaterGrid();
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
        
        // Set refresh flag to prevent grid spinners
        this.isRefreshing = true;
        
        // Reset A-Z sidebar loading flag for new refresh operation
        this.azSidebarLoaded = false;
        
        // Show loading overlay when refreshing (needed for MongoDB operations)
        this.showModalLoadingOverlay();
        
        // Set a safety timeout to ensure the loading overlay is always hidden
        const safetyTimeout = setTimeout(() => {
            console.warn('[DEBUG - REFRESH] Safety timeout reached, forcing overlay hide');
            this.hideModalLoadingOverlay();
            this.isRefreshing = false;
        }, 10000); // 10 seconds timeout
        
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
            
            // For Watch Later tab, refresh from MongoDB first, then fallback to backup
            if (currentTab === 'watchlater') {
                console.log('[DEBUG - REFRESH] 🔄 Refreshing Watch Later content...');
                
                // Always try MongoDB first when refreshing
                console.log('[DEBUG - REFRESH] Attempting to refresh from MongoDB...');
                const mongoResult = await this.refreshWatchLaterFromMongoDB();
                
                if (!mongoResult) {
                    // MongoDB failed, check if localStorage is empty
                    const currentData = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
                    console.log('[DEBUG - REFRESH] MongoDB failed, localStorage has', currentData.length, 'items - attempting to restore from backup file...');
                    await this.restoreWatchLaterFromBackup();
                } else {
                    console.log('[DEBUG - REFRESH] Successfully refreshed from MongoDB');
                }
            }
            
            // Force reload the current tab without showing additional loading overlays
            console.log('[DEBUG - REFRESH] 🔄 Reloading tab content for:', currentTab);
            
            // Update mediaLibraryRaw to match current tab's data
            if (currentTab === 'movies') {
                this.mediaLibraryRaw = this.moviesData;
            } else if (currentTab === 'tvshows') {
                this.mediaLibraryRaw = this.tvShowsData;
            } else if (currentTab === 'favorites') {
                this.mediaLibraryRaw = this.moviesData;
            } else if (currentTab === 'watchlater') {
                this.mediaLibraryRaw = null;
            }
            
            // Update the modal content directly without calling switchTab
            await this.updateModalContent();
            console.log('[DEBUG - REFRESH] ✅ Tab content reloaded successfully');
            
            // Quick check: if A-Z sidebar is already loaded, skip the wait
            const movieSidebar = document.getElementById('mediaLibraryAZSidebarMovie');
            const tvSidebar = document.getElementById('mediaLibraryAZSidebarTVShow');
            const activeSidebar = (this.currentTab === 'movies' && movieSidebar) ? movieSidebar : 
                                 (this.currentTab === 'tvshows' && tvSidebar) ? tvSidebar : null;
            
            if (activeSidebar && activeSidebar.textContent.match(/[A-Z]/)) {
                console.log('[DEBUG - REFRESH] A-Z sidebar already loaded, skipping wait');
            }
            
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
            // Clear the safety timeout
            clearTimeout(safetyTimeout);
            
            // Reset refresh flag
            this.isRefreshing = false;
            
            // Hide the loading overlay
            this.hideModalLoadingOverlay();
            
            console.log('[DEBUG - REFRESH] 🏁 Refresh operation finished');
        }
    }

    attachPosterSelectorHandlers() {
        setTimeout(() => {
            const buttons = document.querySelectorAll('.poster-selector-btn');
            console.log('[DEBUG] Found', buttons.length, 'poster selector buttons');
            
            // Remove any existing click handlers first
            buttons.forEach(btn => {
                btn.onclick = null;
                btn.removeEventListener('click', btn._posterSelectorHandler);
            });
            
            buttons.forEach((btn, index) => {
                // console.log('[DEBUG] Button', index, ':', btn);
                
                // Create a named function for the handler
                const clickHandler = (e) => {
                    console.log('[DEBUG] Poster selector button clicked!');
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
                    console.log('[DEBUG] PosterSelector available:', !!window.PosterSelector);
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
                
                // Store the handler reference and attach it
                btn._posterSelectorHandler = clickHandler;
                btn.addEventListener('click', clickHandler);
                btn.onclick = clickHandler; // Backup method
            });
        }, 100); // Increased timeout to ensure DOM is ready
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
        return this.moviesData ? this.moviesData.length : 0;
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
        // console.log('[DEBUG - FAVORITES] Rendering favorites - Movies:', movies.length, 'TV Shows:', tvshows.length);
        
        // Build the HTML for the favorites view with proper two-column layout
        let html = '<div class="container-favorites" style="display: flex; gap: 20px;">';
        
        // MOVIES SECTION (LEFT SIDE)
        html += '<div class="movies-section-favorites" style="flex: 1;">';
        html += '<h3 class="section-title-movies-favorites">MOVIES</h3>';
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
                        <div class="favorites-only-heart-container">
                            <button class="favorites-only-heart-btn" title="Remove from Favorites">❤️</button>
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
        html += '<div class="tvshows-section-favorites" style="flex: 1;">';
        html += '<h3 class="section-title-tvshows-favorites">TV-SHOWS</h3>';
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
                
                // console.log('[DEBUG - FAVORITES] TV Show poster lookup for:', showName, {
                //     path: path,
                //     showName: showName,
                //     normalizedKey: tvShowObj.normalizedKey,
                //     posterSrc: posterSrc
                // });
                

                
                html += `
                    <div class="media-library-movie-card-tvshows" data-path="${path}">
                        <div class="favorites-only-heart-container">
                            <button class="favorites-only-heart-btn" title="Remove from Favorites">❤️</button>
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