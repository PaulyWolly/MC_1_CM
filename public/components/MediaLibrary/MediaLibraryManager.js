
/*
  MEDIALIBRARYMANAGER.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

// Making editable in CHROME DEV TOOLS SOURCES TAB

// Import the shared VideoPlayer
import VideoPlayer from "../VideoPlayer/VideoPlayer.js";

class MediaLibraryManager {
  constructor() {
    this.mediaLibrary = [];
    this.currentTab = "movies";
    this.currentTabFlag = "movies"; // Track current tab for return location
    this.lastActiveTab = "movies"; // Track last active tab
    this.isLoading = false;
    this.isRefreshing = false;
    this.videoPlayer = null;
    this.currentVideo = null;
    this.nextVideo = null;
    this.isModalOpen = false;
    this.currentCollectionView = null;
    // Single unified data storage for all media
    this.unifiedData = {};
    // Search and sort properties
    this.searchTerm = "";
    this.sortBy = "asc";
    this.selectedGenre = "All Genres";
    // Voice command patterns for media library
    this.voiceCommands = [
      "open media library",
      "show media library",
      "media library",
      "open movies",
      "show movies",
      "movie library",
      "open TV-Shows",
      "show TV-Shows",
      "tv show library",
      "browse movies",
      "browse TV-Shows",
      "view media",
      "media browser",
      "open media browser",
      "show media browser",
      "movie listings",
      "tv show listings",
      "media listings",
      "view movie listings",
      "view tv show listings",
      "view media listings",
    ];
    this.init();
    this.cacheBusters = {}; // Add cacheBusters map for poster cache-busting
    // Add at the top of the class
    this.movieGenres = {};
    this.tvGenres = {};
    this.isShowingModalOverlay = false;
    this.azSidebarLoaded = false;
  }

  // Initialize the MediaLibraryManager
  async init() {
    try {
      // Load unified TV shows data
      const response = await fetch('/components/MediaLibrary/data/tv-shows/tv-shows-unified.json');
      if (response.ok) {
        this.unifiedData = await response.json();
        console.log('[MEDIA LIBRARY] Loaded unified data with', Object.keys(this.unifiedData).length, 'shows');
      } else {
        console.error('[MEDIA LIBRARY] Failed to load unified data:', response.status);
      }
    } catch (error) {
      console.error('[MEDIA LIBRARY] Error loading unified data:', error);
    }
    // Make restore methods available globally for debugging
    window.restoreWatchLaterData = () => this.restoreWatchLaterFromBackup();
    window.loadLocalBackup = async () => {
      const response = await fetch(
        "/components/MediaLibrary/data/watch_later/watch_later.json"
      );
    };
    // Make cleanup methods available globally for debugging
    window.cleanupWatchLaterPaths = () => this.cleanupWatchLaterPaths();
    // Debug method for A-Z sidebar flag
    window.checkAZSidebarFlag = () => {
      console.log(
        "[DEBUG - A-Z] Current azSidebarLoaded flag:",
        this.azSidebarLoaded
      );
      console.log(
        "[DEBUG - A-Z] Current isRefreshing flag:",
        this.isRefreshing
      );
      console.log(
        "[DEBUG - A-Z] Current isShowingModalOverlay flag:",
        this.isShowingModalOverlay
      );
    };
    // Debug method to manually set A-Z sidebar flag
    window.setAZSidebarFlag = (value) => {
      this.azSidebarLoaded = value;
      console.log("[DEBUG - A-Z] Manually set azSidebarLoaded flag to:", value);
    };
    // Debug method to manually reset all spinners
    window.resetAllSpinners = () => {
      this.forceRemoveAllSpinners();
      console.log("[DEBUG - SPINNER] All spinners manually reset");
    };
    // Debug method to force resolve the waiting promise
    window.forceResolveAZSidebar = () => {
      this.azSidebarLoaded = true;
      console.log("[DEBUG - A-Z] Force set azSidebarLoaded flag to true");
      // Force hide any remaining overlays
      const overlays = document.querySelectorAll(
        ".media-library-modal-loading-overlay"
      );
      overlays.forEach((overlay) => overlay.remove());
      console.log(
        "[DEBUG - A-Z] Forced removal of",
        overlays.length,
        "overlays"
      );
    };
    // Debug method to check A-Z sidebar status
    window.checkAZSidebarStatus = () => {
      const movieSidebar = document.getElementById(
        "mediaLibraryAZSidebarMovie"
      );
      const tvSidebar = document.getElementById("mediaLibraryAZSidebarTVShow");
      console.log("[DEBUG - A-Z] A-Z Sidebar Status Check:");
      console.log(
        "[DEBUG - A-Z] - azSidebarLoaded flag:",
        this.azSidebarLoaded
      );
      console.log("[DEBUG - A-Z] - Movie sidebar exists:", !!movieSidebar);
      console.log("[DEBUG - A-Z] - TV sidebar exists:", !!tvSidebar);
      if (movieSidebar) {
        console.log(
          "[DEBUG - A-Z] - Movie sidebar display:",
          movieSidebar.style.display
        );
        console.log(
          "[DEBUG - A-Z] - Movie sidebar children:",
          movieSidebar.children.length
        );
        console.log(
          "[DEBUG - A-Z] - Movie sidebar text:",
          movieSidebar.textContent.trim().substring(0, 100)
        );
      }
      if (tvSidebar) {
        console.log(
          "[DEBUG - A-Z] - TV sidebar display:",
          tvSidebar.style.display
        );
        console.log(
          "[DEBUG - A-Z] - TV sidebar children:",
          tvSidebar.children.length
        );
        console.log(
          "[DEBUG - A-Z] - TV sidebar text:",
          tvSidebar.textContent.trim().substring(0, 100)
        );
      }
    };
    // Debug localStorage collections on initialization
    this.debugLocalStorageCollections();
    // Add global error handler to prevent stuck spinners
    this.setupGlobalErrorHandler();
    // Make cleanup methods available globally for debugging
    window.cleanupWatchLaterPaths = () => this.cleanupWatchLaterPaths();
  }
  
  // Step 1 of unified data loading
  async loadUnifiedData() {
    try {
      // Load movies data first (smaller file) NOT updaing in the view.. we need to see FEEDBACK.. animations.. counts timelines.
      const moviesResponse = await fetch('/components/MediaLibrary/data/movies/movies-unified.json?t=' + Date.now());
      const moviesData = moviesResponse.ok ? await moviesResponse.json() : {};
      
      // Load TV shows data with timeout handling
      const tvShowsResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv-shows-unified.json?t=' + Date.now());
      const tvShowsData = tvShowsResponse.ok ? await tvShowsResponse.json() : {};
      
      // Merge both datasets
        this.unifiedData = { ...moviesData, ...tvShowsData };
        
      console.log("[FORCE-NEW-DATA] ✅ Data loaded - Movies:", Object.keys(moviesData).length, "TV Shows:", Object.keys(tvShowsData).length, "Total:", Object.keys(this.unifiedData).length);
    } catch (error) {
      console.error("[FORCE-NEW-DATA] ❌ Error loading unified data:", error);
      // Fallback: try to load just movies if TV shows fails
      try {
        const moviesResponse = await fetch('/components/MediaLibrary/data/movies/movies-unified.json?t=' + Date.now());
        if (moviesResponse.ok) {
          this.unifiedData = await moviesResponse.json();
          console.log("[FORCE-NEW-DATA] ⚠️ Fallback: Loaded movies only:", Object.keys(this.unifiedData).length);
        }
      } catch (fallbackError) {
        console.error("[FORCE-NEW-DATA] ❌ Fallback also failed:", fallbackError);
        this.unifiedData = {};
      }
    }
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
    // Movie posters are now loaded from unified data
    // await this.loadMoviePosters();
    await this.loadTVPosters();
    await this.loadSeasonEpisodeImages();
    
    // Clean up existing Watch Later items with absolute paths
    await this.cleanupWatchLaterPaths();
    
    this.setupEventListeners();
    this.setupVoiceCommandIntegration();
    this.setupTextCommandIntegration();
    console.log(
      "🎬 [MEDIA-LIBRARY] Media library manager initialized with voice/text command support"
    );
    // Ensure posters are rendered after all poster data is loaded
    if (this.currentTab === "movies" && this.isModalOpen) {
      this.renderMediaGrid();
    }
    // In the constructor or init, load the normalized genres file
    this.loadMovieGenres();
    // TV genres are now loaded from unified JSON
    
    // Update collection buttons to show current collection status
    await this.updateCollectionButtons();
  }
  async loadAllMediaData() {
    console.log(
      "🎬 [MEDIA-LIBRARY] Loading unified data for movies and TV shows..."
    );
    // Load unified data for both movies and TV shows
    await this.loadUnifiedData();
  }
  async loadMediaLibrary() {
    try {
      let endpoint = "/api/media-library";
      if (this.currentTab === "movies") {
        // Use the normalized movies file
        endpoint =
          "/components/MediaLibrary/data/movies/movies-unified.json";
      } else if (this.currentTab === "tvshows") {
        // TV shows data is loaded from unified JSON
        console.log("[MEDIA-LIBRARY] TV shows use unified JSON data");
        return;
      } else if (this.currentTab === "favorites") {
        // FAVORITES IS INDEPENDENT - no data loading needed
        return;
      }
      console.log("🎬 [MEDIA-LIBRARY] Loading media library from:", endpoint);
      const response = await fetch(endpoint);
      const result = await response.json();
      console.log("🎬 [MEDIA-LIBRARY] Raw result:", result);
      console.log(
        "🎬 [MEDIA-LIBRARY] Raw result type:",
        typeof result,
        "isArray:",
        Array.isArray(result)
      );
      if (Array.isArray(result)) {
        console.log(
          "🎬 [MEDIA-LIBRARY] Result is array with",
          result.length,
          "items"
        );
        if (result.length > 0) {
          console.log("🎬 [MEDIA-LIBRARY] First item sample:", result[0]);
        }
      }
      // --- FLEXIBLE FORMAT HANDLING ---
      // Try to extract the main library array from various possible formats
      let raw = null;
      if (this.currentTab === "movies") {
        // NEW: Unified movies file: { "movie.key": { movie data }, ... }
        if (result && typeof result === "object" && !Array.isArray(result)) {
          // Convert object keys to array format for compatibility
          raw = Object.keys(result).map(key => ({
            ...result[key],
            normalizedKey: key // Add the key as normalizedKey for compatibility
          }));
          console.log(`🎬 [MEDIA-LIBRARY] Converted ${raw.length} movies from unified format`);
        } else if (result && Array.isArray(result.folders)) {
          raw = result.folders;
        } else if (Array.isArray(result)) {
          raw = result;
        } else {
          throw new Error("Unrecognized movies media library format");
        }
      } else if (this.currentTab === "tvshows") {
        // Normalized tvshows file: array of show objects or object with numeric keys
        if (Array.isArray(result)) {
          raw = result;
        } else if (result && Array.isArray(result.folders)) {
          raw = result.folders;
        } else if (typeof result === "object" && !Array.isArray(result)) {
          // Handle object format with numeric keys (current format)
          raw = result;
        } else {
          throw new Error("Unrecognized tvshows media library format");
        }
      } else {
        // Fallback for other tabs
        if (Array.isArray(result)) {
          raw = result;
        } else if (result && Array.isArray(result.folders)) {
          raw = result;
        } else if (
          result &&
          result.library &&
          Array.isArray(result.library.folders)
        ) {
          raw = result.library.folders;
        } else if (result && result.tvShows && Array.isArray(result.tvShows)) {
          raw = result.tvShows;
        } else {
          throw new Error("Unrecognized media library format");
        }
      }
      console.log("🎬 [MEDIA-LIBRARY] Extracted media array:", raw);
      console.log(
        "🎬 [MEDIA-LIBRARY] Extracted media array length:",
        raw ? raw.length : "undefined"
      );
      // Unified data is now loaded in loadSeasonEpisodeImages
      console.log("🎬 [MEDIA-LIBRARY] Raw data loaded, but using unified data structure");
    } catch (error) {
      this.showError("Failed to load media library.");
      console.error(error);
    }
  }
  async loadEmbyPosters() {
    this.isLoading = true;
    this.renderSpinner();
    try {
      console.log("🎬 [MEDIA-LIBRARY] Loading Emby posters...");
      const response = await fetch("/emby-posters.json");
      this.embyPosters = await response.json();
      console.log(
        "🎬 [MEDIA-LIBRARY] Loaded",
        this.embyPosters.length,
        "poster entries"
      );
    } catch (error) {
      console.error("🎬 [MEDIA-LIBRARY] Failed to load Emby posters:", error);
      this.embyPosters = [];
      this.showError("Failed to load poster images.");
    } finally {
      this.isLoading = false;
      this.removeSpinner();
    }
  }
  // Movie posters are now loaded from unified JSON in loadSeasonEpisodeImages
  async loadMoviePosters() {
    console.log('🎬 [MEDIA-LIBRARY] Movie posters loaded from unified JSON...');
  }
  async loadTVPosters() {
    // TV show posters are now loaded from unified JSON in loadSeasonEpisodeImages
    console.log('📺 [MEDIA-LIBRARY] TV show posters loaded from unified JSON...');
    // this.tvPosters is populated in loadSeasonEpisodeImages from unified data
  }
  async loadSeasonEpisodeImages() {
    try {
      console.log('🎬 [MEDIA-LIBRARY] Loading unified media data...');
      
      // NormalizationService should be available from app initialization
      if (!window.isNormalizationServiceReady()) {
        console.error('❌ [MEDIA-LIBRARY] NormalizationService not available! This should not happen.');
        throw new Error('NormalizationService not loaded - check app initialization order');
      }
      
      console.log('✅ [MEDIA-LIBRARY] NormalizationService is available');
      
      // Load TV shows unified data
      const tvShowsResponse = await fetch(
        "/components/MediaLibrary/data/tv-shows/tv-shows-unified.json"
      );
      
      if (!tvShowsResponse.ok) {
        throw new Error(`Failed to load TV shows unified data: ${tvShowsResponse.status}`);
      }
      
      const tvShowsData = await tvShowsResponse.json();
      console.log(`✅ [MEDIA-LIBRARY] Loaded TV shows unified data for ${Object.keys(tvShowsData).length} shows`);
      console.log(`🔍 [MEDIA-LIBRARY] DEBUG: Checking Lois & Clark data in loaded JSON...`);
      const loisClarkData = tvShowsData["lois.and.clark.the.new.adventures.of.superman.(1993)"];
      if (loisClarkData && loisClarkData.seasons) {
        console.log(`🔍 [MEDIA-LIBRARY] DEBUG: Lois & Clark seasons keys:`, Object.keys(loisClarkData.seasons));
        console.log(`🔍 [MEDIA-LIBRARY] DEBUG: Lois & Clark has Featurettes:`, !!loisClarkData.seasons.Featurettes);
      } else {
        console.log(`🔍 [MEDIA-LIBRARY] DEBUG: Lois & Clark data not found or no seasons`);
      }
      
      // Load movies unified data
      const moviesResponse = await fetch(
        "/components/MediaLibrary/data/movies/movies-unified.json"
      );
      
      if (!moviesResponse.ok) {
        throw new Error(`Failed to load movies unified data: ${moviesResponse.status}`);
      }
      
      const moviesData = await moviesResponse.json();
      console.log(`✅ [MEDIA-LIBRARY] Loaded movies unified data for ${Object.keys(moviesData).length} movies`);
      
      // Combine both data sources into unified data
      this.unifiedData = { ...tvShowsData, ...moviesData };
      console.log(`✅ [MEDIA-LIBRARY] Combined unified data for ${Object.keys(this.unifiedData).length} total media items`);
      
      // Debug: Log some sample data
      const movieCount = Object.values(this.unifiedData).filter(item => item.isMovie).length;
      const tvShowCount = Object.values(this.unifiedData).filter(item => !item.isMovie).length;
      console.log(`🔍 [MEDIA-LIBRARY] DEBUG: Movies: ${movieCount}, TV Shows: ${tvShowCount}`);
      console.log(`🔍 [MEDIA-LIBRARY] DEBUG: Sample movie keys:`, Object.keys(this.unifiedData).filter(key => this.unifiedData[key].isMovie).slice(0, 5));
      console.log(`🔍 [MEDIA-LIBRARY] DEBUG: Sample TV show keys:`, Object.keys(this.unifiedData).filter(key => !this.unifiedData[key].isMovie).slice(0, 5));
      
      // Initialize seasonEpisodeImages from unified data for backward compatibility
      this.seasonEpisodeImages = {};
      
      // Initialize tvShowsData for the getTVShows() method
      this.tvShowsData = [];
      
      // Initialize tvPosters for the getPosterPath method
      this.tvPosters = {};
      
      // Process unified data directly - no more merging needed
      for (const showName in this.unifiedData) {
        const show = this.unifiedData[showName];
        
        if (show.seasons) {
          // Use the original showName key from unified data to match the lookup
          // This ensures the key matches exactly what's in the unified data
          const storageKey = showName;
          console.log(`🔍 [SEASON-DEBUG] Using storage key "${storageKey}" for show "${showName}"`);
          this.seasonEpisodeImages[storageKey] = { seasons: {} };
          
          console.log(`🔍 [SEASON-DEBUG] Processing show: "${showName}" with storage key: "${storageKey}"`);
          console.log(`🔍 [SEASON-DEBUG] Show has ${Object.keys(show.seasons).length} seasons`);
          console.log(`🔍 [SEASON-DEBUG] Available seasons:`, Object.keys(show.seasons));
          
          for (const seasonNum in show.seasons) {
            const season = show.seasons[seasonNum];
            
            // Initialize episodes object for this season
            const seasonEpisodes = {};
            if (season.episodes) {
              console.log(`🔍 [SEASON-DEBUG] Season ${seasonNum} has ${Object.keys(season.episodes).length} episodes`);
              console.log(`🔍 [SEASON-DEBUG] Episode keys:`, Object.keys(season.episodes));
              for (const episodeNum in season.episodes) {
                const episode = season.episodes[episodeNum];
                seasonEpisodes[episodeNum] = {
                  still: episode.still || null,
                  path: episode.path || null,
                  title: episode.title || null,
                  duration: episode.duration || null,
                  isSpecials: episode.isSpecials || false,
                  videoFormat: episode.videoFormat || null,
                  supportsVideo: episode.supportsVideo || false
                };
              }
            } else {
              console.log(`⚠️ [SEASON-DEBUG] Season ${seasonNum} has NO episodes object!`);
              console.log(`⚠️ [SEASON-DEBUG] Season data:`, season);
            }
            
            this.seasonEpisodeImages[storageKey].seasons[seasonNum] = {
              poster: season.poster || null,
              episodes: seasonEpisodes,
              isSpecials: seasonNum === "Specials",
              specialsCategory: seasonNum === "Specials" ? "Specials" : null,
            };
          }
          
          // Unified data already contains all necessary information
          // No need to populate separate data structures
        } else {
          // console.log(`⚠️ [SEASON-DEBUG] Show "${showName}" has NO seasons object!`);
        }
      }
      
      // Debug: Show what was actually built
      console.log(`🔍 [SEASON-DEBUG] Final seasonEpisodeImages structure:`, this.seasonEpisodeImages);
      
      console.log(`✅ [MEDIA-LIBRARY] Processed unified data for ${Object.keys(this.seasonEpisodeImages).length} shows`);
      console.log('✅ [MEDIA-LIBRARY] Using unified data as single source of truth');
      
      // Debug season and episode data
      const firstShow = Object.keys(this.seasonEpisodeImages)[0];
      if (firstShow) {
        const firstShowData = this.seasonEpisodeImages[firstShow];
        console.log(`✅ [MEDIA-LIBRARY] Sample season data for "${firstShow}":`, {
          seasons: Object.keys(firstShowData.seasons),
          firstSeason: firstShowData.seasons[Object.keys(firstShowData.seasons)[0]]
        });
      }
      
      console.log('✅ All metadata (posters, cast, descriptions, genres) is now included in the unified JSON');
      
      // Add debug method to check current state
      window.debugMediaLibraryState = () => {
        console.log('🔍 [DEBUG] MediaLibraryManager State:');
        console.log('  - NormalizationService available:', !!window.normalizeKey);
        console.log('  - Unified data loaded:', !!this.unifiedData);
        console.log('  - Unified data count:', this.unifiedData ? Object.keys(this.unifiedData).length : 0);
        console.log('  - Season episode images loaded:', !!this.seasonEpisodeImages);
        console.log('  - Season episode images count:', this.seasonEpisodeImages ? Object.keys(this.seasonEpisodeImages).length : 0);
        if (this.seasonEpisodeImages && Object.keys(this.seasonEpisodeImages).length > 0) {
          const firstKey = Object.keys(this.seasonEpisodeImages)[0];
          console.log('  - First season key:', firstKey);
          console.log('  - First season data:', this.seasonEpisodeImages[firstKey]);
        }
      };
      
      // Add specific debug method for Bored to Death
      window.debugBoredToDeath = () => {
        console.log('🔍 [DEBUG] Bored to Death Specific Debug:');
        const showKey = 'bored.to.death.(2009)';
        if (this.seasonEpisodeImages && this.seasonEpisodeImages[showKey]) {
          console.log('✅ Found Bored to Death data:', this.seasonEpisodeImages[showKey]);
          console.log('✅ Seasons available:', Object.keys(this.seasonEpisodeImages[showKey].seasons));
          console.log('✅ Season 01 data:', this.seasonEpisodeImages[showKey].seasons['01']);
          if (this.seasonEpisodeImages[showKey].seasons['01']) {
            console.log('✅ Season 01 episodes count:', Object.keys(this.seasonEpisodeImages[showKey].seasons['01'].episodes).length);
            console.log('✅ Season 01 episodes keys:', Object.keys(this.seasonEpisodeImages[showKey].seasons['01'].episodes));
          }
        } else {
          console.log('❌ Bored to Death data NOT found in seasonEpisodeImages');
          console.log('❌ Available keys:', Object.keys(this.seasonEpisodeImages || {}));
        }
      };
      
    } catch (error) {
      console.error('❌ [MEDIA-LIBRARY] Error loading unified data:', error);
      this.seasonEpisodeImages = {};
      this.unifiedData = {};
    }
  }
  

  
  renderSpinner() {
    // Don't show spinner during refresh operations
    if (this.isRefreshing) return;
    let modal = document.getElementById("mediaLibraryModal");
    if (!modal) return;
    if (!document.getElementById("mediaLibrarySpinner")) {
      const spinnerOverlay = document.createElement("div");
      spinnerOverlay.className = "media-library-spinner-overlay";
      spinnerOverlay.id = "mediaLibrarySpinner";
      spinnerOverlay.innerHTML = `<div class="media-library-spinner"></div>`;
      modal.appendChild(spinnerOverlay);
    }
  }
  removeSpinner() {
    const spinner = document.getElementById("mediaLibrarySpinner");
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
    console.log(
      "[DEBUG - SPINNER] All spinners forcefully removed and loading flags reset"
    );
  }
  /**
     * Show full modal loading overlay with spinner
     */
  showModalLoadingOverlay() {
    // Check if we're already showing an overlay
    if (this.isShowingModalOverlay) {
      console.log(
        "[DEBUG - LOADING] Already showing modal overlay, not creating another one"
      );
      return;
    }
    // Check if overlay already exists
    const existingOverlay = document.getElementById(
      "mediaLibraryModalLoadingOverlay"
    );
    if (existingOverlay) {
      console.log(
        "[DEBUG - LOADING] Overlay already exists, not creating another one"
      );
      return;
    }
    const modals = document.querySelectorAll(".media-library-modal");
    console.log("[DEBUG - LOADING] Found", modals.length, "modal elements");
    if (modals.length === 0) {
      console.warn("[DEBUG - LOADING] No modal found, cannot show overlay");
      return;
    }
    if (modals.length > 1) {
      console.warn("[DEBUG - LOADING] Multiple modals found, using first one");
    }
    const modal = modals[0];
    const overlay = document.createElement("div");
    overlay.id = "mediaLibraryModalLoadingOverlay";
    overlay.className = "media-library-modal-loading-overlay";
    overlay.innerHTML = `
            <div class="media-library-modal-loading-content">
                <div class="media-library-modal-spinner"></div>
                <div class="media-library-modal-loading-text">Loading Media Library...</div>
            </div>
        `;
    modal.appendChild(overlay);
    this.isShowingModalOverlay = true;
    console.log(
      "[DEBUG - LOADING] Modal loading overlay shown on modal:",
      modal.id || "no-id"
    );
  }
  /**
     * Hide full modal loading overlay
     */
  hideModalLoadingOverlay() {
    const overlays = document.querySelectorAll(
      ".media-library-modal-loading-overlay"
    );
    console.log(
      "[DEBUG - LOADING] Found",
      overlays.length,
      "modal loading overlays to hide"
    );
    overlays.forEach((overlay, index) => {
      overlay.remove();
      console.log("[DEBUG - LOADING] Removed overlay", index + 1);
    });
    this.isShowingModalOverlay = false;
    console.log("[DEBUG - LOADING] All modal loading overlays hidden");
  }
  /**
     * Setup global error handler to prevent stuck spinners
     */
  setupGlobalErrorHandler() {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      console.error(
        "[DEBUG - SPINNER] Unhandled promise rejection detected:",
        event.reason
      );
      this.forceRemoveAllSpinners();
    });
    // Handle global errors
    window.addEventListener("error", (event) => {
      console.error("[DEBUG - SPINNER] Global error detected:", event.error);
      this.forceRemoveAllSpinners();
    });
    // Add a safety timeout to automatically remove spinners after 10 seconds
    setInterval(() => {
      if (this.isLoading && this.isModalOpen) {
        const spinner = document.getElementById("mediaLibrarySpinner");
        if (spinner) {
          console.warn(
            "[DEBUG - SPINNER] Safety timeout: removing stuck spinners after 10 seconds"
          );
          this.forceRemoveAllSpinners();
        }
      }
    }, 10000); // Check every 10 seconds
    console.log(
      "[DEBUG - SPINNER] Global error handler and safety timeout setup completed"
    );
  }
  showError(msg) {
    let modal = document.getElementById("mediaLibraryModal");
    if (!modal) return;
    let errDiv = document.getElementById("mediaLibraryError");
    if (!errDiv) {
      errDiv = document.createElement("div");
      errDiv.id = "mediaLibraryError";
      errDiv.style.cssText =
        "color: red; text-align: center; margin: 20px; font-weight: bold;";
      modal.appendChild(errDiv);
    }
    errDiv.textContent = msg;
  }
  setupEventListeners() {
    // Add event listeners for media library button
    const mediaLibraryBtn = document.getElementById("mediaLibraryBtn");
    if (mediaLibraryBtn) {
      mediaLibraryBtn.addEventListener("click", () => this.openMediaBrowser()); // ensure arrow function
    }
    // Add keyboard shortcut for refresh (Ctrl+R) when Media Library is open
    document.addEventListener("keydown", (e) => {
      if (this.isModalOpen && e.ctrlKey && e.key === "r") {
        e.preventDefault();
        e.stopPropagation();
        // console.log('🔄 [MEDIA-LIBRARY] Keyboard shortcut detected: Ctrl+R - Refreshing content');
        this.refreshCurrentContent();
      }
    });
  }
  async openMediaBrowser() {
    this.isModalOpen = true;
    console.log("[DEBUG - LOADING] openMediaBrowser called");
    console.log("[DEBUG - LOADING] Current tab:", this.currentTab);
    console.log(
      "[DEBUG - LOADING] Movies data available:",
      this.moviesData ? this.moviesData.length : "undefined"
    );
    console.log(
      "[DEBUG - LOADING] TV shows data available:",
      this.tvShowsData ? this.tvShowsData.length : "undefined"
    );
    // Render modal immediately without loading states
    this.renderModal();
    try {
      // Update mediaLibraryRaw to point to the correct data for current tab
      if (this.currentTab === "movies") {
        this.mediaLibraryRaw = this.moviesData;
        console.log(
          "[DEBUG - LOADING] Set mediaLibraryRaw to moviesData:",
          this.moviesData ? this.moviesData.length : "undefined",
          "movies"
        );
      } else if (this.currentTab === "tvshows") {
        this.mediaLibraryRaw = this.tvShowsData;
        console.log(
          "[DEBUG - LOADING] Set mediaLibraryRaw to tvShowsData:",
          this.tvShowsData ? this.tvShowsData.length : "undefined",
          "TV shows"
        );
      } else if (this.currentTab === "watchlater") {
        // For watchlater tab, we don't need to set mediaLibraryRaw since it uses its own data
        this.mediaLibraryRaw = null;
        console.log(
          "[DEBUG - LOADING] Set mediaLibraryRaw to null for watchlater tab"
        );
      }
      // Update the modal content after setting the correct data
      console.log("[DEBUG - LOADING] About to call updateModalContent");
      await this.updateModalContent();
      console.log("[DEBUG - LOADING] updateModalContent completed");
    } catch (error) {
      console.error("[DEBUG - MediaLibrary] Error during loading:", error);
      this.showError("Failed to load media library.");
    }
  }
  closeMediaBrowser() {
    this.isModalOpen = false;
    this.removeModal();
    // Remove the media-library-overlay if present
    const overlay = document.querySelector(".media-library-overlay");
    if (overlay) overlay.remove();
    // Remove Video.js overlay alert if present
    const videoOverlay = document.querySelector(".videojs-overlay-alert");
    if (videoOverlay) videoOverlay.remove();
    // Stop video playback if open
    if (this.videoPlayer && typeof this.videoPlayer.pause === "function") {
      this.videoPlayer.pause();
      if (typeof this.videoPlayer.currentTime === "function") {
        this.videoPlayer.currentTime(0); // Optionally reset to start
      } else if (typeof this.videoPlayer.currentTime === "number") {
        this.videoPlayer.currentTime = 0;
      }
    }
    // Always reopen MediaLibrary modal with the last active tab
    if (
      window.mediaLibraryManager &&
      typeof window.mediaLibraryManager.openMediaBrowser === "function"
    ) {
      // Restore the last active tab before reopening
      this.currentTab = this.lastActiveTab;
      setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
    }
  }
  // Dedicated function to render the tab bar/header
  renderTabBar() {
    const tabs = [
      { id: "movies", label: "Movies" },
      { id: "tvshows", label: "TV-Shows" },
      { id: "favorites", label: "Favorites" },
      { id: "collections", label: "Collections" },
      { id: "suggestions", label: "Suggestions" },
      { id: "watchlater", label: "Watch Later" },
    ];
    return `
          <div class="media-library-modal-tabs-row">
            <div class="media-library-modal-tabs-left">
              ${tabs
                .map(
                  (tab) =>
                    `<button class="media-library-tab-btn${this.currentTab === tab.id ? " active" : ""}"
                    onclick="mediaLibraryManager.switchTab('${tab.id}')">${tab.label}</button>`
                )
                .join("")}
            </div>
            <div class="media-library-modal-tabs-spacer"></div>
            <button class="media-library-media-manager-btn" onclick="mediaLibraryManager.openMediaManager()">Media Manager</button>
          </div>
        `;
  }
  async renderModal() {
    console.log("[DEBUG - RENDER-MODAL] renderModal called");
    console.log(
      "[DEBUG - RENDER-MODAL] Current state - currentTab:",
      this.currentTab,
      "currentTVShow:",
      this.currentTVShow,
      "currentTVSeason:",
      this.currentTVSeason
    );
    // Add overlay if not present
    if (!document.querySelector(".media-library-overlay")) {
      const overlay = document.createElement("div");
      overlay.className = "media-library-overlay";
      document.body.appendChild(overlay);
    }
    // Remove existing modal if any (but NOT the overlay)
    const existingModal = document.getElementById("mediaLibraryModal");
    if (existingModal) {
      existingModal.remove();
    }
    // --- Ensure correct tab is highlighted based on navigation state ---
    // Preserve currentTabFlag for return location tracking
    const preservedTabFlag = this.currentTabFlag;
    if (this.currentTab === "tvshows" && this.currentTVShow) {
      this.currentTab = "tvshows";
    } else if (
      this.currentTab === "collections" &&
      this.currentCollectionView
    ) {
      this.currentTab = "collections";
    }
    // Restore currentTabFlag if it was changed
    if (preservedTabFlag && preservedTabFlag !== this.currentTab) {
      this.currentTabFlag = preservedTabFlag;
      console.log(
        "[RENDER-MODAL-DEBUG] Restored currentTabFlag to:",
        this.currentTabFlag
      );
    }
    const getSearchPlaceholder = () => {
      switch (this.currentTab) {
        case "tvshows":
          return "Search TV-Shows...";
        case "favorites":
          return "Search Favorites...";
        case "collections":
          return "Search Collections...";
        case "watchlater":
          return "Search Watch Later...";
        case "suggestions":
          return "Search Suggestions...";
        default:
          return "Search Movies...";
      }
    };
    // Create only the modal, no overlay
    const modal = document.createElement("div");
    modal.id = "mediaLibraryModal";
    modal.className = "media-library-modal";
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

                ${this.currentTab === 'watchlater' ? `
                <div class="watch-later-controls-group">
                  <button class="watch-later-fix-btn" onclick="window.mediaLibraryManager.fixWatchLaterNormalizedKeys(); window.mediaLibraryManager.updateWatchLaterGrid();" title="Fix Movie Titles">
                    🔧
                  </button>
                  <button class="watch-later-sync-btn" onclick="window.mediaLibraryManager.syncWatchLaterToMongoDB();" title="Sync to MongoDB">
                    ➡️
                  </button>
                </div>
                ` : ''}

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
    const modalContent = modal.querySelector(".media-library-modal-content");
    if (modalContent) {
      // Remove all possible tab classes first
      modalContent.classList.remove(
        "movies",
        "tvshows",
        "favorites",
        "collections",
        "suggestions",
        "watchlater"
      );
      modalContent.classList.add(this.currentTab);
    }
    document.body.appendChild(modal);
    document.getElementById("mediaLibraryCloseBtn").onclick = () =>
      this.closeMediaLibrary();
    // Use updateModalContent to properly render the grid with click handlers
    await this.updateModalContent();
    // A-Z sidebar visibility is now controlled by updateModalContent() to avoid conflicts
    if (
      this.currentTab === "tvshows" &&
      !this.currentTVShow &&
      !this.currentTVSeason
    ) {
      const grid = document.getElementById("mediaGrid");
      if (grid) {
        grid.innerHTML = this.renderTVShowsTab();
        // Attach click handler to each TV show card using addEventListener (like MOVIE)
        grid.querySelectorAll(".media-library-tv-show-card").forEach((card) => {
          card.addEventListener("click", (e) => {
            if (e.target.closest(".poster-selector-btn")) return; // Prevent card click if icon was clicked
            e.preventDefault();
            e.stopPropagation();
            window.mediaLibraryManager.openTVShowFromData(card);
          });
        });
        // Attach poster selector handlers after rendering (like MOVIE)
        this.attachPosterSelectorHandlers();
        // Update collection buttons to show correct state
        // console.log('[DEBUG - COLLECTIONS] About to update collection buttons after rendering TV shows grid');
        await this.updateCollectionButtons();
        // console.log('[DEBUG - COLLECTIONS] Collection buttons update completed for TV shows');
      }
      // --- Ensure the A-Z sidebar is always populated ---
      if (this.currentTab === "tvshows") {
        this.renderAZSidebarTVShow();
      } else if (this.currentTab === "movies") {
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
    if (this.currentTab === "watchlater") {
      this.updateWatchLaterGrid();
    }
    // Defer collections rendering until grid exists
    if (this.currentTab === "collections") {
      setTimeout(() => this.renderCollectionsTab(), 0);
    }
    // --- Add clear search button logic ---
    const searchInput = document.getElementById("mediaLibrarySearch");
    const clearBtn = document.getElementById("mediaLibraryClearSearch");
    // console.log('[DEBUG - SEARCH-SETUP] Search input found:', !!searchInput);
    // console.log('[DEBUG - SEARCH-SETUP] Clear button found:', !!clearBtn);
    if (clearBtn) {
      // console.log('[DEBUG - SEARCH-SETUP] Clear button display style:', clearBtn.style.display);
      // console.log(
      //   "[DEBUG - SEARCH-SETUP] Clear button onclick:",
      //   !!clearBtn.onclick
      // );
    }
    const updateClearBtn = () => {
      if (searchInput.value) {
        clearBtn.style.display = "flex";
      } else {
        clearBtn.style.display = "none";
      }
    };
    // Add input event listener for search input
    searchInput.addEventListener("input", updateClearBtn);
    updateClearBtn();
    // Define clear button click handler
    const clearBtnClickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // console.log('[DEBUG - CLEAR-BTN] Clear button clicked for tab:', this.currentTab);
      // console.log('[DEBUG - CLEAR-BTN] Search input value before clear:', searchInput.value);
      searchInput.value = "";
      // console.log('[DEBUG - CLEAR-BTN] Search input value after clear:', searchInput.value);
      this.handleSearchInput({ target: searchInput });
      updateClearBtn();
      searchInput.focus();
      // console.log('[DEBUG - CLEAR-BTN] Clear button action completed');
    };
    // Remove any existing click handlers and add new one
    clearBtn.onclick = null; // Clear any existing onclick
    clearBtn.addEventListener("click", clearBtnClickHandler);
    // Also set onclick as a backup method
    clearBtn.onclick = clearBtnClickHandler;
    // console.log('[DEBUG - SEARCH-SETUP] Clear button event handlers attached');
    // console.log('[DEBUG - SEARCH-SETUP] Clear button onclick set:', !!clearBtn.onclick);
    // console.log('[DEBUG - SEARCH-SETUP] Clear button event listeners:', clearBtn.onclick ? 'onclick handler set' : 'no onclick handler');
    // Add a global click handler to catch any clear button clicks
    document.addEventListener("click", (e) => {
      if (e.target && e.target.id === "mediaLibraryClearSearch") {
        // console.log('[DEBUG - GLOBAL-CLEAR] Global click handler caught clear button click');
        // console.log('[DEBUG - GLOBAL-CLEAR] Target element:', e.target);
        // console.log('[DEBUG - GLOBAL-CLEAR] Current tab:', this.currentTab);
        // Manually trigger the clear action
        const searchInput = document.getElementById("mediaLibrarySearch");
        if (searchInput) {
          // console.log('[DEBUG - GLOBAL-CLEAR] Found search input, clearing...');
          searchInput.value = "";
          this.handleSearchInput({ target: searchInput });
          // Update clear button visibility
          const clearBtn = document.getElementById("mediaLibraryClearSearch");
          if (clearBtn) {
            clearBtn.style.display = "none";
          }
          searchInput.focus();
          // console.log('[DEBUG - GLOBAL-CLEAR] Clear action completed via global handler');
        }
      }
    });
    // --- Add genre dropdown logic ---
    const genreDropdown = document.getElementById("mediaLibraryGenre");
    genreDropdown.innerHTML = "";
    // Populate genre dropdown based on current tab
    let genres = [];
    if (this.currentTab === "tvshows") {
      // For TV shows, get TV show genres
      genres = this.getTVShowGenres();
    } else {
      // For movies and other tabs, get movie genres
      genres = this.getCommonGenres();
    }
    genres.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      genreDropdown.appendChild(opt);
    });
    genreDropdown.value = this.selectedGenre || "All Genres";
    genreDropdown.onchange = (e) => this.handleGenreChange(e);
    // --- Attach click handlers to poster-selector-btn after rendering ---
    // Use the dedicated function instead of inline setup
    this.attachPosterSelectorHandlers();
    // After rendering the modal, attach click handlers to TV show posters
    setTimeout(() => {
      document.querySelectorAll(".tvshow-poster-img").forEach((img) => {
        img.onclick = (e) => {
          console.log("[DEBUG] TV show poster clicked!");
          e.preventDefault();
          e.stopPropagation();
          const card = img.closest(".media-library-tv-show-card");
          // console.log('[DEBUG] Found card:', card);
          if (card) {
            // console.log('[DEBUG] Card data-path:', card.getAttribute('data-path'));
            // console.log('[DEBUG] Card data-show-name:', card.getAttribute('data-show-name'));
            window.mediaLibraryManager.openTVShowFromData(card);
          } else {
            console.error("[DEBUG] No card found for clicked poster");
          }
        };
      });
    }, 0);
    // if (this.currentTab === 'movies') {
    //     await this.loadMoviePosters();
    // }
    // Ensure A-Z sidebar is rendered for Movies and TV-Shows (main tab)
    if (
      this.currentTab === "movies" ||
      (this.currentTab === "tvshows" &&
        !this.currentTVShow &&
        !this.currentTVSeason)
    ) {
      setTimeout(() => {
        if (this.currentTab === "tvshows") {
          this.renderAZSidebarTVShow();
        } else if (this.currentTab === "movies") {
          this.renderAZSidebarMovie();
        }
      }, 100); // Small delay to ensure content is loaded
    }
  }
  removeModal() {
    // Remove the modal from the DOM
    const modal = document.querySelector(".media-library-modal");
    if (modal) modal.remove();
  }
  // Add this method to close the MediaLibrary and remove the overlay
  closeMediaLibrary() {
    this.removeModal();
    const overlay = document.querySelector(".media-library-overlay");
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
    if (this.currentTab === "movies") {
      this.mediaLibraryRaw = this.moviesData;
    } else if (this.currentTab === "tvshows") {
      this.mediaLibraryRaw = this.tvShowsData;
    } else if (this.currentTab === "favorites") {
      // For favorites tab, set to movies data so movie clicks work properly
      this.mediaLibraryRaw = this.moviesData;
    } else if (this.currentTab === "watchlater") {
      // For watchlater tab, we don't need to set mediaLibraryRaw since it uses its own data
      this.mediaLibraryRaw = null;
    }
    // console.log('[SWITCH-TAB-DEBUG] mediaLibraryRaw set to:', this.mediaLibraryRaw);
    // Restore search input value for the new tab
    const searchInput = document.getElementById("mediaLibrarySearch");
    if (searchInput) {
      let searchValue = "";
      switch (this.currentTab) {
        case "movies":
          searchValue = this.movieSearchQuery || "";
          break;
        case "tvshows":
          searchValue = this.tvShowSearchQuery || "";
          break;
        case "favorites":
          searchValue = this.favoritesSearchQuery || "";
          break;
        case "collections":
          searchValue = this.collectionsSearchQuery || "";
          break;
        case "watchlater":
          searchValue = this.watchLaterSearchQuery || "";
          break;
        case "suggestions":
          searchValue = this.suggestionsSearchQuery || "";
          break;
        default:
          searchValue = this.searchQuery || "";
          break;
      }
      searchInput.value = searchValue;
      // Update clear button visibility
      const clearBtn = document.getElementById("mediaLibraryClearSearch");
      if (clearBtn) {
        clearBtn.style.display = searchValue ? "flex" : "none";
      }
    }
    // console.log('[SWITCH-TAB-DEBUG] Calling openMediaBrowser()');
    // Open media browser directly without loading states
    await this.openMediaBrowser();
    
    // Update collection buttons for the new tab
    await this.updateCollectionButtons();
  }
  updateTabSpecificUI() {
    const searchInput = document.getElementById("mediaLibrarySearch");
    const genreDropdown = document.getElementById("mediaLibraryGenre");
    if (searchInput) {
      const getSearchPlaceholder = () => {
        switch (this.currentTab) {
          case "tvshows":
            return "Search TV-Shows...";
          case "favorites":
            return "Search Favorites...";
          case "collections":
            return "Search Collections...";
          case "watchlater":
            return "Search Watch Later...";
          case "suggestions":
            return "Search Suggestions...";
          default:
            return "Search Movies...";
        }
      };
      searchInput.placeholder = getSearchPlaceholder();
      // Restore search input value for the current tab
      let searchValue = "";
      switch (this.currentTab) {
        case "movies":
          searchValue = this.movieSearchQuery || "";
          break;
        case "tvshows":
          searchValue = this.tvShowSearchQuery || "";
          break;
        case "favorites":
          searchValue = this.favoritesSearchQuery || "";
          break;
        case "collections":
          searchValue = this.collectionsSearchQuery || "";
          break;
        case "watchlater":
          searchValue = this.watchLaterSearchQuery || "";
          break;
        case "suggestions":
          searchValue = this.suggestionsSearchQuery || "";
          break;
        default:
          searchValue = this.searchQuery || "";
          break;
      }
      searchInput.value = searchValue;
      // Update clear button visibility
      const clearBtn = document.getElementById("mediaLibraryClearSearch");
      if (clearBtn) {
        clearBtn.style.display = searchValue ? "flex" : "none";
      }
    }
    // Update genre dropdown based on current tab
    if (genreDropdown) {
      genreDropdown.innerHTML = "";
      // Populate genre dropdown based on current tab
      let genres = [];
      if (this.currentTab === "tvshows") {
        // For TV shows, get TV show genres
        genres = this.getTVShowGenres();
      } else {
        // For movies and other tabs, get movie genres
        genres = this.getCommonGenres();
      }
      genres.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        genreDropdown.appendChild(opt);
      });
      genreDropdown.value = this.selectedGenre || "All Genres";
    }
  }
  async updateModalContent() {
    // Called after modal is rendered, updates the main grid content
    const grid = document.getElementById("mediaGrid");
    if (!grid) return;
    grid.innerHTML = await this.renderTabContent();
    // console.log('[DEBUG - UPDATE MODAL] Current tab:', this.currentTab);
    // Update tab-specific UI elements (search placeholder, genre dropdown, etc.)
    this.updateTabSpecificUI();
    // Show/hide appropriate A-Z sidebars based on current tab
    const movieSidebar = document.getElementById("mediaLibraryAZSidebarMovie");
    const tvSidebar = document.getElementById("mediaLibraryAZSidebarTVShow");
    // console.log('[DEBUG - UPDATE MODAL] Found movieSidebar:', !!movieSidebar);
    // console.log('[DEBUG - UPDATE MODAL] Found tvSidebar:', !!tvSidebar);
    if (movieSidebar && tvSidebar) {
      if (this.currentTab === "movies") {
        // console.log('[DEBUG - UPDATE MODAL] Setting movie sidebar to flex, tv sidebar to none');
        movieSidebar.style.display = "flex";
        tvSidebar.style.display = "none";
      } else if (this.currentTab === "tvshows") {
        // console.log('[DEBUG - UPDATE MODAL] Setting movie sidebar to none, tv sidebar to flex');
        movieSidebar.style.display = "none";
        tvSidebar.style.display = "flex";
      } else {
        // console.log('[DEBUG - UPDATE MODAL] Setting both sidebars to none');
        movieSidebar.style.display = "none";
        tvSidebar.style.display = "none";
      }
    } else {
      console.warn(
        "[DEBUG - UPDATE MODAL] One or both sidebar elements not found!"
      );
    }
    // Handle different tabs appropriately
    if (this.currentTab === "movies") {
      // For movies tab, attach click handlers to the rendered cards
      console.log('[DEBUG - UPDATE MODAL] Attaching movie card handlers');
      this.attachMovieCardHandlers();
      // Delay heart icon update to ensure cards are fully rendered with data-path attributes
      setTimeout(() => {
      this.updateHeartIcons();
      }, 100);
      // Update collection buttons to show correct state
      setTimeout(async () => {
        await this.updateCollectionButtons();
      }, 50);
      // Ensure A-Z sidebar is rendered for movies - render immediately to prevent loading issues
      // console.log('[DEBUG - UPDATE MODAL] About to render movie A-Z sidebar');
      this.renderAZSidebarMovie();
    } else if (this.currentTab === "tvshows") {
      // For TV shows tab, attach TV show specific handlers
      // console.log('[DEBUG - UPDATE MODAL] Attaching TV show handlers');
      // Add delay to ensure DOM is ready
      setTimeout(async () => {
        this.attachTVShowHandlers();
        this.updateHeartIcons();
        // Update collection buttons to show correct state
        await this.updateCollectionButtons();
      }, 50);
      // Ensure A-Z sidebar is rendered for TV shows - render immediately to prevent loading issues
      // console.log('[DEBUG - UPDATE MODAL] About to render A-Z sidebar for TV shows');
      this.renderAZSidebarTVShow();
    } else if (this.currentTab === "favorites") {
      // Favorites content already rendered by renderTabContent
      // console.log('[DEBUG - UPDATE MODAL] Favorites tab - content already rendered');
      // Add delay to ensure DOM is ready before attaching handlers
      setTimeout(async () => {
        console.log("[DEBUG - FAVORITES] About to attach favorites handlers...");
        this.attachFavoritesHandlers();
        console.log("[DEBUG - FAVORITES] Favorites handlers attached successfully");
        // Don't call updateHeartIcons() for favorites tab - it overrides our immediate visual changes
        // Update collection buttons to show correct state
        await this.updateCollectionButtons();
      }, 50);
    } else if (this.currentTab === "collections") {
      // For collections tab, attach collection handlers
      // console.log('[DEBUG - UPDATE MODAL] Attaching collection handlers');
      this.attachCollectionHandlers();
    } else if (this.currentTab === "watchlater") {
      // For Watch Later tab, render the content
      console.log("[DEBUG - UPDATE MODAL] Rendering Watch Later tab content");
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
      case "movies":
        // console.log('[DEBUG - RenderTabContent] Rendering movies tab');
        return this.renderMoviesContent();
      case "tvshows":
        console.log(
          "[DEBUG - RENDER-TAB-CONTENT] TV shows case - currentTVShow:",
          this.currentTVShow,
          "currentTVSeason:",
          this.currentTVSeason
        );
        if (this.currentTVShow) {
          if (this.currentTVSeason) {
            console.log("[DEBUG - RENDER-TAB-CONTENT] Rendering episodes view");
            return this.renderEpisodesView();
          } else {
            console.log("[DEBUG - RENDER-TAB-CONTENT] Rendering seasons view");
            return await this.renderSeasonsView(this.currentTVShow);
          }
        } else {
          console.log("[DEBUG - RENDER-TAB-CONTENT] Rendering TV-Shows tab");
          return this.renderTVShowsTab();
        }
      case "favorites":
        // console.log('[DEBUG - RenderTabContent] Rendering favorites tab');
        return this.renderFavoritesContent();
      case "collections":
        // console.log('[DEBUG - RenderTabContent] Rendering collections tab');
        return this.renderCollectionsTab();
      case "suggestions":
        // console.log('[DEBUG - RenderTabContent] Rendering suggestions tab');
        return this.renderSuggestionsContent();
      case "watchlater":
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
    const modalContent = document.querySelector(".media-library-modal-content");
    if (modalContent) {
      modalContent.classList.remove(
        "moviedetails",
        "tvshowseason",
        "tvshowepisodes"
      );
      modalContent.classList.add(this.currentTab);
    }
    // TV shows are handled by renderTVShowsTab() and attachTVShowHandlers()
    // Watch Later is handled by renderWatchLaterContent()
    // This method is only for movies and other content
    if (this.currentTab === "tvshows") {
      // console.log('[DEBUG] TV shows tab - using renderTVShowsTab instead of renderMediaGrid');
      return;
    }
    if (this.currentTab === "watchlater") {
      // console.log('[DEBUG] Watch Later tab - using renderWatchLaterContent instead of renderMediaGrid');
      return;
    }
    const grid = document.getElementById("mediaGrid");
    if (!grid) return;
    const items = this.getFilteredAndSortedItems();
    grid.innerHTML = "";
    // Track which letters we've already added anchors for
    const addedAnchors = new Set();
    items.forEach((item) => {
      console.log("[DEBUG - CARD] Creating card for item:", { 
        path: item.path, 
        normalizedKey: item.normalizedKey, 
        title: item.title || item.TMDBTitle 
      });
      const card = document.createElement("div");
      card.className = "media-library-movie-card";
      card.style.position = "relative";
      // Get the TMDB title for display (with periods) or fallback to regular title
      let displayTitle =
        item.TMDBTitle ||
        item.title ||
        item.name ||
        item.filename ||
        item.path ||
        "";
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
      let anchorHTML = "";
      if (!addedAnchors.has(firstLetter)) {
        anchorHTML = `<div class="media-library-anchor" data-anchor="${firstLetter}"></div>`;
        addedAnchors.add(firstLetter);
      }
      // For movies, use the HTML string method with proper anchor elements
      card.innerHTML = `
                ${anchorHTML}
                <div class="media-card-actions-movies">
                    <button class="movie-poster-selector-btn" title="Change Movie Poster">🎬</button>
                    <button class="movie-favorite-btn" title="Toggle Movie Favorite">${this.isFavorite(item.path) ? "❤️" : "🤍"}</button>
                    <button class="movie-collection-btn" title="Add Movie to Collection" data-path="${item.path}">➕</button>
                </div>
                <img src="${this.getPosterPath(item)}" alt="${displayTitle}" class="media-library-poster">
                <div class="media-info"><h3>${displayTitle}</h3></div>
            `;
      // Ensure favorite and collection buttons do not trigger card click
      const heartBtn = card.querySelector(".movie-favorite-btn");
      if (heartBtn) {
        console.log("[DEBUG - HEART] Attaching click handler to heart button for:", item.path);
        heartBtn.onclick = (e) => {
          console.log("[DEBUG - HEART] Heart button clicked for:", item.path);
        e.stopPropagation();
        // Determine type: if current tab is 'tvshows', use 'tv', else 'movie'
        const type = this.currentTab === "tvshows" ? "tvshow" : "movie";
          
          // Toggle the heart icon immediately for instant visual feedback
          const currentIsFav = this.isFavorite(item.path);
          const newIsFav = !currentIsFav;
          heartBtn.textContent = newIsFav ? "❤️" : "🤍";
          heartBtn.title = newIsFav ? "Remove from Favorites" : "Add to Favorites";
          console.log("[DEBUG - HEART] Heart icon toggled immediately:", newIsFav ? "❤️" : "🤍");
          
          // Update the backend
          this.toggleFavorite(item, type);
      };
      } else {
        console.warn("[DEBUG - HEART] No heart button found for item:", item.path);
      }
      card.querySelector(".movie-collection-btn").onclick = async (e) => {
        e.stopPropagation();
        const btn = e.target;
        const path = btn.dataset.path;
        console.log('[DEBUG - COLLECTIONS] Collection button clicked!');
        console.log('[DEBUG - COLLECTIONS] Button dataset.path:', path);
        console.log('[DEBUG - COLLECTIONS] Item object:', item);
        console.log('[DEBUG - COLLECTIONS] Item.path:', item.path);
        console.log('[DEBUG - COLLECTIONS] Item.normalizedKey:', item.normalizedKey);
        try {
          // Always show the manage collections modal for multiple collection support
          // This allows users to add to more collections OR remove from existing ones
          await this.showAddToCollectionModal(item);
        } catch (error) {
          // console.error('[DEBUG - COLLECTIONS] Error handling collection button click:', error);
          this.showToast("Error opening collections modal", "error");
        }
      };
      // Main card click opens details
      // console.log('>>> 2. >>>[MOVIE-LIBRARY] Attaching click handler to:', item.path);
      card.addEventListener("click", async (e) => {
        // console.log('>>> 3. >>>[MOVIE-LIBRARY] Movie card clicked:', item.path);
        // console.log('>>> 4. >>>[MOVIE-LIBRARY] Full item object:', item);
        await this.showMovieDetailsModal(item);
      });
      card.setAttribute("data-path", item.path);
      console.log("[DEBUG - CARD] Setting data-path for card:", item.path, "Card element:", card);
      // Verify the attribute was set
      const verifyPath = card.getAttribute("data-path");
      console.log("[DEBUG - CARD] Verified data-path attribute:", verifyPath);
      grid.appendChild(card);
    });
    // After rendering the grid, attach poster selector handlers
    this.attachPosterSelectorHandlers();
    // Update collection buttons to show correct state
    // console.log('[DEBUG - COLLECTIONS] About to update collection buttons after rendering grid');
    await this.updateCollectionButtons();
    // console.log('[DEBUG - COLLECTIONS] Collection buttons update completed');
    // Images load asynchronously without spinner
    // console.log('[DEBUG - IMAGES] Loading', grid.querySelectorAll('img').length, 'images asynchronously');
  }
  getItemsForCurrentTab() {
    let items = [];
    console.log(
      "[DEBUG] getItemsForCurrentTab called, currentTab:",
      this.currentTab
    );
    
    if (this.currentTab === "movies") {
      // Get movies from unified data and ensure they have normalizedKey
      console.log("[MOVIE DEBUG] unifiedData available:", !!this.unifiedData);
      console.log("[MOVIE DEBUG] unifiedData keys count:", this.unifiedData ? Object.keys(this.unifiedData).length : 0);
      
      // Convert unified data to array format with normalizedKey and path
      const movieKeys = Object.keys(this.unifiedData || {}).filter(key => this.unifiedData[key].isMovie);
      items = movieKeys.map(key => ({
        ...this.unifiedData[key],
        normalizedKey: key, // Add the key as normalizedKey for poster lookup
        path: key // Add the key as path for heart functionality (like the working backup)
      }));
      
      console.log("[MOVIE DEBUG] Movies from unified data:", items.length);
      console.log("[MOVIE DEBUG] First few movie titles:", items.slice(0, 3).map(m => m.title || m.TMDBTitle || "Unknown"));
      console.log("[MOVIE DEBUG] First movie item structure:", items[0]);
      console.log("[MOVIE DEBUG] First movie normalizedKey:", items[0]?.normalizedKey);
      console.log("[MOVIE DEBUG] First movie path:", items[0]?.path);
    } else if (this.currentTab === "tvshows") {
      items = this.getTVShows();
    } else if (this.currentTab === "favorites") {
      // Favorites tab uses its own rendering logic (renderFavoritesContent)
      // Return empty array to prevent filtering/sorting errors
      items = [];
    } else if (this.currentTab === "collections") {
      items = this.getCollections();
    } else if (this.currentTab === "suggestions") {
      items = this.getSuggestions();
    } else if (this.currentTab === "watchlater") {
      items = this.getResumeList();
    }
    console.log("[DEBUG] Returning items:", items.length);
    return items;
  }
  /**
     * Get poster path for movies and TV shows following the standard data flow:
     * PRIORITY 1: JSON files (normalized lowercase dot notation) - MOST RELIABLE
     * PRIORITY 2: localStorage (if we add cached poster data)
     * PRIORITY 3: MongoDB (if we add database poster storage)
     */
  getPosterPath(mediaItem) {
    // console.log('[DEBUG - GET-POSTER-PATH] Called with mediaItem:', {
    //   name: mediaItem?.name,
    //   title: mediaItem?.title,
    //   path: mediaItem?.path,
    //   poster: mediaItem?.poster,
    //   type: mediaItem?.type,
    //   isMovie: mediaItem?.isMovie
    // });
    // console.log('[DEBUG - GET-POSTER-PATH] Current tab:', this.currentTab);
    // console.log('[DEBUG - GET-POSTER-PATH] Unified data available:', !!this.unifiedData);
    // console.log('[DEBUG - GET-POSTER-PATH] Unified data count:', this.unifiedData ? Object.keys(this.unifiedData).length : 0);
    // Debug: Log the call stack to see where this is being called from
    const stack = new Error().stack;
    const caller = stack.split("\n")[2] || "unknown";
    // console.log('[COLLECTIONS_DEBUG] getPosterPath called from:', caller.trim());
    // Use shared normalization service
    if (!window.normalizeKey) {
      // console.error('[MEDIA-LIBRARY] NormalizationService not loaded - this should not happen!');
      return "/assets/img/placeholder-poster.jpg";
    }
    if (!mediaItem) {
      return "/assets/img/placeholder-poster.jpg";
    }
    // Determine if this is a TV show or movie using switch statement
    let isTV = false;
    let contextSource = "unknown";
    switch (mediaItem.type) {
      case "tvshow":
      case "tv":
        isTV = true;
        contextSource = "mediaItem.type";
        // console.log('[COLLECTIONS_DEBUG] Using mediaItem.type:', mediaItem.type, 'isTV:', isTV);
        break;
      case "movie":
        isTV = false;
        contextSource = "mediaItem.type";
        // console.log('[COLLECTIONS_DEBUG] Using mediaItem.type:', mediaItem.type, 'isTV:', isTV);
        break;
      case undefined:
      case null:
        // No type specified, fall back to context-based detection
        if (this.currentTab === "collections" && mediaItem.path && typeof mediaItem.path === 'string') {
          isTV = mediaItem.path.toLowerCase().includes("tvshows");
          contextSource = "collections_path";
          // console.log('[COLLECTIONS_DEBUG] Using collections path detection, isTV:', isTV);
        } else {
          isTV = this.currentTab === "tvshows";
          contextSource = "currentTab";
          // console.log('[COLLECTIONS_DEBUG] Using currentTab detection, isTV:', isTV);
        }
        break;
      default:
        // Unknown type, fall back to path-based detection
        isTV = mediaItem.path && typeof mediaItem.path === 'string' && mediaItem.path.toLowerCase().includes("tvshows");
        contextSource = "path_fallback";
        // console.log('[COLLECTIONS_DEBUG] Unknown mediaItem.type:', mediaItem.type, 'using path fallback, isTV:', isTV);
        break;
    }
    // Use unified data for all media types
    const posterMap = this.unifiedData;
    // console.log('[COLLECTIONS_DEBUG] getPosterPath called for:', mediaItem.title || mediaItem.name);
    // console.log('[COLLECTIONS_DEBUG] mediaItem.type:', mediaItem.type);
    // console.log('[COLLECTIONS_DEBUG] currentTab:', this.currentTab);
    // console.log('[COLLECTIONS_DEBUG] isTV determined as:', isTV);
    // console.log('[COLLECTIONS_DEBUG] contextSource:', contextSource);
    // console.log('[COLLECTIONS_DEBUG] posterMap available:', !!posterMap);
    // console.log('[COLLECTIONS_DEBUG] posterMap keys count:', posterMap ? Object.keys(posterMap).length : 0);
    // For TV shows in Media Manager format, check if poster is directly available
    if (isTV && mediaItem.poster && mediaItem.poster.trim() !== "") {
      console.log('[DEBUG - GET-POSTER-PATH] Found direct poster URL for TV show:', mediaItem.title || mediaItem.name, '->', mediaItem.poster);
      return mediaItem.poster;
    }
    if (!posterMap) {
      console.warn(
        "[MEDIA-LIBRARY] No poster map available for current tab:",
        this.currentTab,
        "isTV:",
        isTV
      );
      console.warn(
        "[MEDIA-LIBRARY] Available poster maps - moviePosters:",
        !!this.moviePosters,
        "tvPosters:",
        !!this.tvPosters
      );
      return "/assets/img/placeholder-poster.jpg";
    }
    // For TV-Shows, prefer the name property, then fallback to path extraction
    let showName = null;
    if (isTV) {
      // Use normalizedKey first (most reliable)
      if (mediaItem.normalizedKey) {
        showName = mediaItem.normalizedKey;
      } else {
        showName = mediaItem.name || mediaItem.title || mediaItem.filename;
        if (!showName && mediaItem.path && typeof mediaItem.path === 'string') {
          // Extract show name from path (e.g., "TV-SHOWS/Daisy Jones & The Six (2023)" -> "Daisy Jones & The Six (2023)")
          // Remove the "TV-SHOWS/" prefix if present
          let pathParts = mediaItem.path.split(/[\\/]/);
          if (
            pathParts[0] && typeof pathParts[0] === 'string' && pathParts[0].toLowerCase().includes("tvshows") ||
            pathParts[0] && typeof pathParts[0] === 'string' && pathParts[0].toLowerCase().includes("tv_shows") ||
            pathParts[0] && typeof pathParts[0] === 'string' && pathParts[0].toLowerCase().includes("tv shows")
          ) {
            // Remove the first part (TV-SHOWS) and join the rest
            pathParts.shift();
            showName = pathParts.join("/");
          } else {
            showName = pathParts.pop();
          }
        }
      }
    } else {
      // For movies, use normalizedKey directly (most reliable)
      if (mediaItem.normalizedKey) {
        showName = mediaItem.normalizedKey;
        // console.log('[DEBUG - GET-POSTER-PATH] Using normalizedKey for movie:', mediaItem.normalizedKey);
      } else if (mediaItem.path) {
        // Fallback to path if normalizedKey not available
        showName = mediaItem.path;
        // console.log('[DEBUG - GET-POSTER-PATH] Fallback to path for movie:', mediaItem.path);
      }
    }
    if (!showName) {
      // console.warn("[MEDIA-LIBRARY] No show name found for:", mediaItem);
      return "/assets/img/placeholder-poster.jpg";
    }
    // For TV shows, if we already have a normalizedKey, use it directly
    let dotKey;
    if (isTV) {
      dotKey = mediaItem.normalizedKey || window.normalizeKey(showName);
    } else {
      // For movies, use the showName directly (which should be the actual key from unifiedData)
      dotKey = showName;
    }
    // For both movies and TV shows, try the normalizedKey first, then fallback to derived keys
    let possibleKeys = [dotKey];
    if (isTV && !mediaItem.normalizedKey) {
      possibleKeys = [
        dotKey, // "Tera.Nova"
        window.normalizeKey(showName + " (2011)"), // "Tera.Nova.(2011)"
        window.normalizeKey(showName + " (2012)"), // Try other common years
        window.normalizeKey(showName + " (2013)"),
        window.normalizeKey(showName + " (2014)"),
        window.normalizeKey(showName + " (2015)"),
        window.normalizeKey(showName + " (2016)"),
        window.normalizeKey(showName + " (2017)"),
        window.normalizeKey(showName + " (2018)"),
        window.normalizeKey(showName + " (2019)"),
        window.normalizeKey(showName + " (2020)"),
        window.normalizeKey(showName + " (2021)"),
        window.normalizeKey(showName + " (2022)"),
        window.normalizeKey(showName + " (2023)"),
        window.normalizeKey(showName + " (2024)"),
        window.normalizeKey(showName + " (2025)"),
        // Handle spelling variations (Tera vs Terra)
        window.normalizeKey(showName.replace(/Terra/g, "Tera") + " (2011)"),
        window.normalizeKey(showName.replace(/Tera/g, "Terra") + " (2011)"),
        window.normalizeKey(showName.replace(/Tera/g, "Tera") + " (2012)"),
        window.normalizeKey(showName.replace(/Tera/g, "Terra") + " (2012)"),
        window.normalizeKey(showName.replace(/Tera/g, "Tera") + " (2013)"),
        window.normalizeKey(showName.replace(/Tera/g, "Terra") + " (2013)"),
        window.normalizeKey(showName.replace(/Tera/g, "Tera") + " (2014)"),
        window.normalizeKey(showName.replace(/Tera/g, "Terra") + " (2014)"),
        window.normalizeKey(showName.replace(/Tera/g, "Tera") + " (2015)"),
        window.normalizeKey(showName.replace(/Tera/g, "Terra") + " (2015)"),
      ];
    }
    
    // console.log('[DEBUG - GET-POSTER-PATH] Looking for poster with keys:', possibleKeys, 'for show:', showName);
    // console.log('[DEBUG - GET-POSTER-PATH] First few available keys in posterMap:', Object.keys(posterMap).slice(0, 10));
    
    // PRIORITY 1: Look up poster from unified data (both movies and TV shows have .poster property)
    // Try exact match first
    for (const key of possibleKeys) {
      let url = null;
      
      // Both movies and TV shows now have .poster property in unified data
      if (posterMap[key] && posterMap[key].poster) {
        url = posterMap[key].poster;
      }
      
      if (url) {
        if (this.cacheBusters && this.cacheBusters[key]) {
          url +=
            (url.includes("?") ? "&" : "?") + "t=" + this.cacheBusters[key];
        }
        // console.log(`[MEDIA-LIBRARY] Found poster with key: ${key}, URL: ${url}, Type: ${isTV ? 'TV Show' : 'Movie'}`);
        return url;
      }
    }
    
    // Case-insensitive fallback for all possible keys
    for (const possibleKey of possibleKeys) {
      if (!possibleKey || typeof possibleKey !== 'string') continue;
      const lowerPossibleKey = possibleKey.toLowerCase();
      for (const key of Object.keys(posterMap)) {
        if (key && typeof key === 'string' && key.toLowerCase() === lowerPossibleKey) {
          let url = null;
          
          if (isTV) {
            // For TV shows: posterMap[key].poster (unified data structure)
            if (posterMap[key] && posterMap[key].poster) {
              url = posterMap[key].poster;
            }
          } else {
            // For movies: posterMap[key].poster (unified data structure)
            if (posterMap[key] && posterMap[key].poster) {
              url = posterMap[key].poster;
            }
          }
          
          if (url) {
          if (this.cacheBusters && this.cacheBusters[key]) {
            url +=
              (url.includes("?") ? "&" : "?") + "t=" + this.cacheBusters[key];
          }
            console.log(`[MEDIA-LIBRARY] Found poster with case-insensitive match for key: ${possibleKey}, URL: ${url}, Type: ${isTV ? 'TV Show' : 'Movie'}`);
          return url;
          }
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
    return "/assets/img/placeholder-poster.jpg";
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
      console.error(
        "[TV SHOW POSTER] NormalizationService not loaded - this should not happen!"
      );
      return "/assets/img/placeholder-poster.jpg";
    }
    if (!mediaItem) {
      console.warn(
        "[MEDIA-LIBRARY] No mediaItem provided to getTVShowPosterPath"
      );
      return "/assets/img/placeholder-poster.jpg";
    }
    // Use unified data for TV show posters
    const posterMap = this.unifiedData;
    if (!posterMap) {
      console.warn("[MEDIA-LIBRARY] No unified data available");
      return "/assets/img/placeholder-poster.jpg";
    }
    // For TV-Shows, prefer the name property, then fallback to path extraction
    let showName = mediaItem.name || mediaItem.title || mediaItem.filename;
    if (!showName && mediaItem.path && typeof mediaItem.path === 'string') {
      // Extract show name from path (e.g., "TV-SHOWS/Daisy Jones & The Six" -> "Daisy Jones & The Six")
      showName = mediaItem.path.split(/[\\/]/).pop();
    }
    // If we still don't have a show name, try to extract from the full path
    if (!showName && mediaItem.path && typeof mediaItem.path === 'string') {
      // Look for TV-SHOWS directory and get the show name from there
      const pathParts = mediaItem.path.split(/[\\/]/);
      const tvShowsIndex = pathParts.findIndex((part) =>
        part && typeof part === 'string' && part.toLowerCase().includes("tvshows")
      );
      if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
        showName = pathParts[tvShowsIndex + 1];
      }
    }
    if (!showName) {
      console.warn(
        "[MEDIA-LIBRARY] No show name found for TV show:",
        mediaItem
      );
      return "/assets/img/placeholder-poster.jpg";
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
    console.log(
      "[MEDIA-LIBRARY] Looking for TV poster with key:",
      showKey,
      "for show:",
      showName,
      "year:",
      year,
      "mediaItem:",
      mediaItem
    );
    // PRIORITY 1: Unified data (normalized lowercase dot notation) - MOST RELIABLE
    // Try exact match first
    if (posterMap[showKey] && posterMap[showKey].poster) {
      let url = posterMap[showKey].poster;
      if (this.cacheBusters && this.cacheBusters[showKey]) {
        url +=
          (url.includes("?") ? "&" : "?") + "t=" + this.cacheBusters[showKey];
      }
      console.log('[MEDIA-LIBRARY] Found TV poster in unified data with exact match:', url);
      return url;
    }
    // Case-insensitive fallback
    if (!showKey || typeof showKey !== 'string') return "/assets/img/placeholder-poster.jpg";
    const lowerShowKey = showKey.toLowerCase();
    for (const key of Object.keys(posterMap)) {
      if (key && typeof key === 'string' && key.toLowerCase() === lowerShowKey && posterMap[key].poster) {
        let url = posterMap[key].poster;
        if (this.cacheBusters && this.cacheBusters[key]) {
          url +=
            (url.includes("?") ? "&" : "?") + "t=" + this.cacheBusters[key];
        }
        console.log('[MEDIA-LIBRARY] Found TV poster in unified data with case-insensitive match:', url);
        return url;
      }
    }
    // PRIORITY 2: localStorage (if we have cached poster data)
    // This would be implemented if we add localStorage poster caching in the future
    // PRIORITY 3: MongoDB (if we add database poster storage in the future)
    // This would be implemented if we add MongoDB poster storage in the future
    // Log a warning if no poster found
    console.warn(
      "[MEDIA-LIBRARY] No TV poster found in unified data for:",
      mediaItem,
      "Tried standardized key:",
      showKey
    );
    console.warn(
      "[MEDIA-LIBRARY] Available unified data keys (first 10):",
      Object.keys(posterMap).slice(0, 10)
    );
    return "/assets/img/placeholder-poster.jpg";
  }
  // Add this helper to wait for the Video.js player to be ready
  async waitForVideoPlayerReady(timeout = 2000) {
    const start = Date.now();
    while (
      !this.videoPlayer ||
      typeof this.videoPlayer.playUrl !== "function"
    ) {
      if (Date.now() - start > timeout) {
        throw new Error("Video.js player not initialized after waiting");
      }
      await new Promise((res) => setTimeout(res, 100));
    }
  }
  
  // WORKING BACKUP METHOD FOR TITLE CONVERSION
  convertNormalizedKeyToDisplayTitle(normalizedKey) {
    if (!normalizedKey || typeof normalizedKey !== 'string') return normalizedKey;
    
    console.log('[DEBUG - TITLE] convertNormalizedKeyToDisplayTitle input:', normalizedKey);
    
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
    
    // Apply corrections
    for (const [incorrect, correct] of Object.entries(corrections)) {
      if (displayTitle.includes(incorrect)) {
        displayTitle = displayTitle.replace(new RegExp(`\\b${incorrect}\\b`, 'g'), correct);
      }
    }
    
    // Add year back if it was present
    if (year) {
      displayTitle = `${displayTitle} (${year})`;
    }
    
    console.log('[DEBUG - TITLE] Final display title:', displayTitle);
    return displayTitle;
  }
  
  // Step 2 of unified data loading
  // New playMedia method that uses unified data

  // NEW CLEAN PLAYMEDIA METHOD - ONLY WORKS WITH UNIFIED DATA
  async playMedia(mediaItem, startTime = 0) {
    console.log("[BRAND-NEW-PLAYMEDIA] 🚀 BRAND NEW CLEAN METHOD CALLED!");
    console.log("[BRAND-NEW-PLAYMEDIA] Media item received:", mediaItem);
    
    // FORCE: Load unified data if not already loaded
    if (!this.unifiedData) {
      console.log("[BRAND-NEW-PLAYMEDIA] Loading unified data...");
      await this.loadUnifiedData();
    }
    
             // FORCE: Find movie in unified data
         let unifiedMovie = null;
         console.log("[BRAND-NEW-PLAYMEDIA] 🔍 Searching for movie with title:", mediaItem.title);
         console.log("[BRAND-NEW-PLAYMEDIA] 🔍 MediaItem normalizedKey:", mediaItem.normalizedKey);
         
         if (mediaItem.normalizedKey && this.unifiedData[mediaItem.normalizedKey]) {
           unifiedMovie = this.unifiedData[mediaItem.normalizedKey];
           console.log("[BRAND-NEW-PLAYMEDIA] ✅ Found by normalizedKey:", mediaItem.normalizedKey);
           console.log("[BRAND-NEW-PLAYMEDIA] ✅ Found movie data:", unifiedMovie);
         } else if (mediaItem.title) {
           console.log("[BRAND-NEW-PLAYMEDIA] 🔍 Searching by title in unified data...");
           const movieKey = Object.keys(this.unifiedData).find(key =>
             this.unifiedData[key].TMDBTitle === mediaItem.title ||
             this.unifiedData[key].title === mediaItem.title
           );
           if (movieKey) {
             unifiedMovie = this.unifiedData[movieKey];
             console.log("[BRAND-NEW-PLAYMEDIA] ✅ Found by title search:", mediaItem.title);
             console.log("[BRAND-NEW-PLAYMEDIA] ✅ Found movie key:", movieKey);
             console.log("[BRAND-NEW-PLAYMEDIA] ✅ Found movie data:", unifiedMovie);
        } else {
             console.log("[BRAND-NEW-PLAYMEDIA] ❌ Movie not found by title search:", mediaItem.title);
             console.log("[BRAND-NEW-PLAYMEDIA] 🔍 Available titles in unified data:", Object.keys(this.unifiedData).slice(0, 5));
           }
         }
    
    if (!unifiedMovie) {
      throw new Error(`[BRAND-NEW-PLAYMEDIA] Movie not found in unified data: ${mediaItem.title}`);
    }
    
             // FORCE: Extract file path from unified data
         if (!unifiedMovie.files || unifiedMovie.files.length === 0) {
           throw new Error(`[BRAND-NEW-PLAYMEDIA] No files found for movie: ${unifiedMovie.TMDBTitle}`);
         }

         console.log("[BRAND-NEW-PLAYMEDIA] 🔍 Unified movie files:", unifiedMovie.files);
         const filePath = unifiedMovie.files[0].relPath;
         console.log("[BRAND-NEW-PLAYMEDIA] 🎯 File path extracted:", filePath);
         console.log("[BRAND-NEW-PLAYMEDIA] 🎯 Full file object:", unifiedMovie.files[0]);
    
    // FORCE: Convert backslashes to forward slashes for server compatibility
    const cleanFilePath = filePath.replace(/\\/g, '/');
    console.log("[BRAND-NEW-PLAYMEDIA] 🧹 Cleaned file path:", cleanFilePath);
    
    // FORCE: Create clean video URL using the correct /api/video endpoint
    const videoUrl = `/api/video?path=${encodeURIComponent(cleanFilePath)}`;
    console.log("[BRAND-NEW-PLAYMEDIA] 🚀 Video URL created:", videoUrl);
    
    // FORCE: Set return location before closing modal
    if (window.videoPlayer && typeof window.videoPlayer.setReturnLocation === 'function') {
      window.videoPlayer.setReturnLocation({
        type: 'media-library',
        tab: this.currentTab || 'movies'
      });
      console.log("[BRAND-NEW-PLAYMEDIA] 🎯 Set return location to:", this.currentTab || 'movies');
    }
    
    // FORCE: Close modal and play video
    this.closeModal();
    
    // FORCE: Set current media item for movies (just like TV shows)
    const movieMediaItem = {
      title: unifiedMovie.TMDBTitle || unifiedMovie.title,
      type: 'movie',
      mediaType: unifiedMovie.mediaType || 'movie', // Use from unified data, fallback to 'movie'
      path: filePath,
      absPath: unifiedMovie.files[0].absPath,
      files: unifiedMovie.files,
      poster: unifiedMovie.poster,
      TMDBTitle: unifiedMovie.TMDBTitle
    };
    window.mediaLibraryManager.currentMediaItem = movieMediaItem;
    window.mediaLibraryManager.currentFile = movieMediaItem;
    console.log("[BRAND-NEW-PLAYMEDIA] 🎯 Set currentMediaItem for movie:", movieMediaItem);
    
    // FORCE: Use video player
    if (window.videoPlayer && typeof window.videoPlayer.playUrl === 'function') {
      console.log("[BRAND-NEW-PLAYMEDIA] 🎬 Playing with window.videoPlayer");
      window.videoPlayer.playUrl(videoUrl, "video/mp4", startTime, movieMediaItem);
      } else {
      throw new Error("[BRAND-NEW-PLAYMEDIA] Video player not available");
    }
    
    console.log("[BRAND-NEW-PLAYMEDIA] ✅ Video playback initiated successfully!");
  }

  createVideoPlayer() {
    // Remove any existing player container
    const container = document.getElementById("videoPlayerContainer");
    if (container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    } else {
      const newContainer = document.createElement("div");
      newContainer.id = "videoPlayerContainer";
      newContainer.className = "video-player-container";
      document.body.appendChild(newContainer);
    }
    const playerContainer = document.getElementById("videoPlayerContainer");
    // Insert a <video> element without a fixed id (let Video.js assign one)
    const video = document.createElement("video");
    video.className = "video-js vjs-default-skin";
    video.setAttribute("controls", "");
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "contain";
    video.style.background = "#000";
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
    let skipIntroBtn = document.getElementById("skipIntroBtn");
    if (!skipIntroBtn) {
      skipIntroBtn = document.createElement("button");
      skipIntroBtn.id = "skipIntroBtn";
      skipIntroBtn.className = "skip-intro-btn";
      skipIntroBtn.style.display = "none";
      skipIntroBtn.textContent = "Skip Intro";
      playerContainer.appendChild(skipIntroBtn);
    }
    // --- Custom Seek Buttons ---
    const Button = videojs.getComponent("Button");
    class Back10Button extends Button {
      handleClick() {
        const player = this.player();
        player.currentTime(Math.max(0, player.currentTime() - 10));
      }
    }
    Back10Button.prototype.controlText_ = "Back 10 seconds";
    videojs.registerComponent("Back10Button", Back10Button);
    class Forward10Button extends Button {
      handleClick() {
        const player = this.player();
        player.currentTime(
          Math.min(player.duration(), player.currentTime() + 10)
        );
      }
    }
    Forward10Button.prototype.controlText_ = "Forward 10 seconds";
    videojs.registerComponent("Forward10Button", Forward10Button);
    // Initialize Video.js on the video element (let it assign a dynamic id)
    const player = videojs(video, {
      controlBar: {
        volumePanel: { inline: false },
      },
      fluid: true,
      preload: "auto",
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
    });
    // Add custom buttons after player is ready
    player.ready(function () {
      // Only add if not already present
      if (!player.getChild("controlBar").getChild("Back10Button")) {
        player.getChild("controlBar").addChild("Back10Button", {}, 1);
      }
      if (!player.getChild("controlBar").getChild("Forward10Button")) {
        player.getChild("controlBar").addChild("Forward10Button", {}, 2);
      }
    });
    // Continue with any other setup (events, overlays, etc.)
    this.setupVideoPlayerEvents(player);
    this.videoPlayer = player;
  }
  setupVideoPlayerEvents(player) {
    let skipIntroTimeout;
    let upNextTimeout;
    player.on("loadedmetadata", () => {
      setTimeout(() => {
        const skipBtn = document.getElementById("skipIntroBtn");
        if (skipBtn) {
          skipBtn.style.display = "block";
          skipBtn.onclick = () => {
            player.currentTime(90);
            skipBtn.style.display = "none";
          };
        }
      }, 5000);
    });
    player.on("timeupdate", () => {
      const currentTime = player.currentTime();
      const duration = player.duration();
      // Disable MediaLibraryManager's overlay system - let VideoPlayer handle it
      // if (duration && currentTime > duration - MEDIA_LIBRARY_UP_NEXT_BEFORE_END_SECONDS) {
      //     this.showUpNextOverlay();
      // }
      const skipToNextBtn = document.getElementById("skipToNextBtn");
      if (skipToNextBtn) {
        if (
          duration &&
          duration - currentTime <= SKIP_TO_NEXT_BEFORE_END_SECONDS &&
          this.nextVideo
        ) {
          skipToNextBtn.style.display = "block";
        } else {
          skipToNextBtn.style.display = "none";
        }
      }
    });
    // REMOVED: Auto-save on pause - this was causing unwanted Watch Later saves
    // Only the "Save for Later" button should save progress
    player.on("ended", () => {
      // Always reopen MediaLibrary modal when video ends with last active tab
      if (
        window.mediaLibraryManager &&
        typeof window.mediaLibraryManager.openMediaBrowser === "function"
      ) {
        // Restore the last active tab before reopening
        window.mediaLibraryManager.currentTab =
          window.mediaLibraryManager.lastActiveTab;
        setTimeout(() => window.mediaLibraryManager.openMediaBrowser(), 0);
      }
      // Hide skip to next button on end
      const skipToNextBtn = document.getElementById("skipToNextBtn");
      if (skipToNextBtn) skipToNextBtn.style.display = "none";
    });
    // Let the video player handle its own return location logic
    // The video player's restoreReturnLocation() method will handle returning to the correct page
  }
  findNextVideo(currentVideo) {
    if (
      currentVideo.type === "tvshow" &&
      currentVideo.season &&
      currentVideo.episode
    ) {
      // Find next episode in the same season
      this.nextVideo = this.mediaLibrary.find(
        (item) =>
          item.type === "tvshow" &&
          item.title === currentVideo.title &&
          item.season === currentVideo.season &&
          item.episode === currentVideo.episode + 1
      );
      // If no next episode in same season, try next season
      if (!this.nextVideo) {
        this.nextVideo = this.mediaLibrary.find(
          (item) =>
            item.type === "tvshow" &&
            item.title === currentVideo.title &&
            item.season === currentVideo.season + 1 &&
            item.episode === 1
        );
      }
    }
  }
  showUpNextOverlay() {
    if (!this.nextVideo) return;
    const overlay = document.getElementById("upNextOverlay");
    const nextInfo = document.getElementById("nextVideoInfo");
    if (overlay && nextInfo) {
      nextInfo.innerHTML = `
                <h4>${this.nextVideo.title}</h4>
                <p>Season ${this.nextVideo.season}, Episode ${this.nextVideo.episode}</p>
            `;
      overlay.style.display = "flex";
      // Set up button events
      document.getElementById("playNextBtn").onclick = () =>
        this.playNextVideo();
      document.getElementById("cancelNextBtn").onclick = () =>
        (overlay.style.display = "none");
    }
  }
  playNextVideo() {
    if (this.nextVideo) {
      this.playMedia(this.nextVideo);
    }
  }
  setupVoiceCommandIntegration() {
    // Listen for voice commands from the main app
    document.addEventListener("voiceCommand", (event) => {
      const command = event.detail?.command?.toLowerCase();
      if (
        command &&
        this.voiceCommands.some((pattern) => command.includes(pattern))
      ) {
        console.log("🎬 [MEDIA-LIBRARY] Voice command detected:", command);
        this.openMediaBrowser();
        // Add a message to the chat about the voice command
        if (window.addMessageToChat) {
          window.addMessageToChat(
            "assistant",
            "🎬 Opening media library... Browse your movies and TV-Shows."
          );
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
        const transcript =
          event.results[event.results.length - 1][0].transcript.toLowerCase();
        if (
          this.voiceCommands.some((pattern) => transcript.includes(pattern))
        ) {
          console.log(
            "🎬 [MEDIA-LIBRARY] Direct speech recognition detected:",
            transcript
          );
          this.openMediaBrowser();
          if (window.addMessageToChat) {
            window.addMessageToChat(
              "assistant",
              "🎬 Opening media library... Browse your movies and TV-Shows."
            );
          }
        }
      };
    }
  }
  setupTextCommandIntegration() {
    // Listen for text input commands
    document.addEventListener("textCommand", (event) => {
      const command = event.detail?.command?.toLowerCase();
      if (
        command &&
        this.voiceCommands.some((pattern) => command.includes(pattern))
      ) {
        console.log("🎬 [MEDIA-LIBRARY] Text command detected:", command);
        this.openMediaBrowser();
        if (window.addMessageToChat) {
          window.addMessageToChat(
            "assistant",
            "🎬 Opening media library... Browse your movies and TV-Shows."
          );
        }
      }
    });
    // Hook into the main sendMessage function if available
    if (window.sendMessage) {
      const originalSendMessage = window.sendMessage;
      window.sendMessage = (message, isGreeting = false) => {
        const lowerMessage = message.toLowerCase();
        if (
          this.voiceCommands.some((pattern) => lowerMessage.includes(pattern))
        ) {
          console.log(
            "🎬 [MEDIA-LIBRARY] Text input command detected:",
            message
          );
          this.openMediaBrowser();
          if (window.addMessageToChat) {
            window.addMessageToChat(
              "assistant",
              "🎬 Opening media library... Browse your movies and TV-Shows."
            );
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
    return this.voiceCommands.some((pattern) => lowerCommand.includes(pattern));
  }
  // Method to handle media library commands
  handleMediaLibraryCommand(command) {
    const lowerCommand = command.toLowerCase();
    if (this.shouldTriggerMediaLibrary(lowerCommand)) {
      console.log("🎬 [MEDIA-LIBRARY] Command handled:", command);
      this.openMediaBrowser();
      if (window.addMessageToChat) {
        window.addMessageToChat(
          "assistant",
          "🎬 Opening media library... Browse your movies and TV-Shows."
        );
      }
      return true; // Command was handled
    }
    return false; // Command was not handled
  }
  // Public method to register with the main app's command system
  registerWithCommandSystem() {
    if (window.registerCommandHandler) {
      window.registerCommandHandler("mediaLibrary", (command) => {
        return this.handleMediaLibraryCommand(command);
      });
      console.log("🎬 [MEDIA-LIBRARY] Registered with command system");
    }
  }
  // Recursively flatten the media library tree into a flat array of video items
  flattenMediaLibrary(node, parentTitle = "", parentPath = "") {
    let items = [];
    if (!node) return items;
    // Add files in this node
    if (Array.isArray(node.files)) {
      for (const file of node.files) {
        items.push({
          ...file,
          title: file.name || parentTitle,
          path: file.absPath || file.relPath || "",
          absPath: file.absPath || "", // Preserve absPath for cast lookup
          relPath: file.relPath || "", // Preserve relPath for cast lookup
          parent: parentTitle,
          folder: parentPath,
        });
      }
    }
    // Recurse into folders
    if (Array.isArray(node.folders)) {
      for (const folder of node.folders) {
        const folderTitle = folder.path || parentTitle;
        items = items.concat(
          this.flattenMediaLibrary(folder, folderTitle, folder.path)
        );
      }
    }
    return items;
  }
  // Utility to capitalize each word in a string
  capitalizeTitle(str) {
    if (!str || typeof str !== "string") return "";
    
    // Handle apostrophes properly - don't capitalize letters after apostrophes
    return str.replace(/\b\w/g, (c, index, string) => {
      // Check if this character is after an apostrophe
      if (index > 0 && string[index - 1] === "'") {
        return c.toLowerCase(); // Keep lowercase after apostrophe
      }
      return c.toUpperCase();
    });
  }
  
  // Utility to convert normalized dot notation to human-readable TV show titles
  humanizeTVShowTitle(normalizedTitle) {
    if (!normalizedTitle || typeof normalizedTitle !== "string") return "";
    
    // Handle common abbreviations that should keep periods
    let title = normalizedTitle
      .replace(/\bU\.S\.\b/gi, "US_ABBREV")
      .replace(/\bU\.K\.\b/gi, "UK_ABBREV")
      .replace(/\bU\.N\.\b/gi, "UN_ABBREV")
      .replace(/\bU\.S\.A\.\b/gi, "USA_ABBREV")
      .replace(/\bMr\.\b/gi, "MR_ABBREV")
      .replace(/\bMrs\.\b/gi, "MRS_ABBREV")
      .replace(/\bDr\.\b/gi, "DR_ABBREV")
      .replace(/\bProf\.\b/gi, "PROF_ABBREV")
      .replace(/\bSt\.\b/gi, "ST_ABBREV")
      .replace(/\bAve\.\b/gi, "AVE_ABBREV")
      .replace(/\bBlvd\.\b/gi, "BLVD_ABBREV")
      .replace(/\bRd\.\b/gi, "RD_ABBREV")
      .replace(/\bLn\.\b/gi, "LN_ABBREV")
      .replace(/\bCt\.\b/gi, "CT_ABBREV")
      .replace(/\bCo\.\b/gi, "CO_ABBREV")
      .replace(/\bInc\.\b/gi, "INC_ABBREV")
      .replace(/\bLtd\.\b/gi, "LTD_ABBREV")
      .replace(/\bCorp\.\b/gi, "CORP_ABBREV");
    
    // Replace dots with spaces (but preserve the abbreviations we just marked)
    title = title.replace(/\./g, " ");
    
    // Restore abbreviations with proper formatting
    title = title
      .replace(/US_ABBREV/gi, "U.S.")
      .replace(/UK_ABBREV/gi, "U.K.")
      .replace(/UN_ABBREV/gi, "U.N.")
      .replace(/USA_ABBREV/gi, "U.S.A.")
      .replace(/MR_ABBREV/gi, "Mr.")
      .replace(/MRS_ABBREV/gi, "Mrs.")
      .replace(/DR_ABBREV/gi, "Dr.")
      .replace(/PROF_ABBREV/gi, "Prof.")
      .replace(/ST_ABBREV/gi, "St.")
      .replace(/AVE_ABBREV/gi, "Ave.")
      .replace(/BLVD_ABBREV/gi, "Blvd.")
      .replace(/RD_ABBREV/gi, "Rd.")
      .replace(/LN_ABBREV/gi, "Ln.")
      .replace(/CT_ABBREV/gi, "Ct.")
      .replace(/CO_ABBREV/gi, "Co.")
      .replace(/INC_ABBREV/gi, "Inc.")
      .replace(/LTD_ABBREV/gi, "Ltd.")
      .replace(/CORP_ABBREV/gi, "Corp.");
    
    // Clean up extra spaces and capitalize
    title = title.replace(/\s+/g, " ").trim();
    title = this.capitalizeTitle(title);
    
    return title;
  }
  
  // Fallback method to create normalized keys when window.normalizeKey is not available
  createFallbackNormalizedKey(title) {
    if (!title || typeof title !== "string") return "";
    
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '.')  // Replace special chars with dots
      .replace(/\s+/g, '.')           // Replace spaces with dots
      .replace(/\.+/g, '.')           // Clean up multiple dots
      .replace(/^\.|\.$/g, '');       // Remove leading/trailing dots
  }
  
  // Utility to convert normalized dot notation to human-readable movie titles
  humanizeMovieTitle(normalizedTitle) {
    if (!normalizedTitle || typeof normalizedTitle !== "string") return "";
    
    // Handle common abbreviations that should keep periods
    let title = normalizedTitle
      .replace(/\bU\.S\.\b/gi, "US_ABBREV")
      .replace(/\bU\.K\.\b/gi, "UK_ABBREV")
      .replace(/\bU\.N\.\b/gi, "UN_ABBREV")
      .replace(/\bU\.S\.A\.\b/gi, "USA_ABBREV")
      .replace(/\bMr\.\b/gi, "MR_ABBREV")
      .replace(/\bMrs\.\b/gi, "MRS_ABBREV")
      .replace(/\bDr\.\b/gi, "DR_ABBREV")
      .replace(/\bProf\.\b/gi, "PROF_ABBREV")
      .replace(/\bSt\.\b/gi, "ST_ABBREV")
      .replace(/\bAve\.\b/gi, "AVE_ABBREV")
      .replace(/\bBlvd\.\b/gi, "BLVD_ABBREV")
      .replace(/\bRd\.\b/gi, "RD_ABBREV")
      .replace(/\bLn\.\b/gi, "LN_ABBREV")
      .replace(/\bCt\.\b/gi, "CT_ABBREV")
      .replace(/\bCo\.\b/gi, "CO_ABBREV")
      .replace(/\bInc\.\b/gi, "INC_ABBREV")
      .replace(/\bLtd\.\b/gi, "LTD_ABBREV")
      .replace(/\bCorp\.\b/gi, "CORP_ABBREV");
    
    // Replace dots with spaces (but preserve the abbreviations we just marked)
    title = title.replace(/\./g, " ");
    
    // Restore abbreviations with proper formatting
    title = title
      .replace(/US_ABBREV/gi, "U.S.")
      .replace(/UK_ABBREV/gi, "U.K.")
      .replace(/UN_ABBREV/gi, "U.N.")
      .replace(/USA_ABBREV/gi, "U.S.A.")
      .replace(/MR_ABBREV/gi, "Mr.")
      .replace(/MRS_ABBREV/gi, "Mrs.")
      .replace(/DR_ABBREV/gi, "Dr.")
      .replace(/PROF_ABBREV/gi, "Prof.")
      .replace(/ST_ABBREV/gi, "St.")
      .replace(/AVE_ABBREV/gi, "Ave.")
      .replace(/BLVD_ABBREV/gi, "Blvd.")
      .replace(/RD_ABBREV/gi, "Rd.")
      .replace(/LN_ABBREV/gi, "Ln.")
      .replace(/CT_ABBREV/gi, "Ct.")
      .replace(/CO_ABBREV/gi, "Co.")
      .replace(/INC_ABBREV/gi, "Inc.")
      .replace(/LTD_ABBREV/gi, "Ltd.")
      .replace(/CORP_ABBREV/gi, "Corp.");
    
    // Clean up extra spaces and capitalize
    title = title.replace(/\s+/g, " ").trim();
    title = this.capitalizeTitle(title);
    
    return title;
  }
  
  // Utility to clean up movie titles for display
  cleanMovieTitle(filename) {
    if (!filename || typeof filename !== "string") return "";
    // Remove extension
    let name = filename.replace(/\.[^/.]+$/, "");
    // Remove (year) and [quality] only
    name = name.replace(/\((19|20)\d{2}\)/g, ""); // Remove (2021)
    name = name.replace(/\[\d{3,4}p\]/gi, ""); // Remove [1080p], [720p], etc.
    // Remove years
    name = name.replace(/\b(19|20)\d{2}\b/g, "");
    // Remove audio channel tags like AAC5 1, AAC51, DDP5 1, DDP51, etc.
    name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*5[ ._\-]*1\b/gi, "");
    name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*7[ ._\-]*1\b/gi, "");
    // Remove common tags (only as whole words or after separators)
    name = name.replace(
      /(?:^|[ ._\-])(?:480p|720p|1080p|2160p|4k|8k|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|aac|dts|yify|rarbg|repack|extended|unrated|directors cut|remux|hdtv|amzn|nf|web|ddp|dd5[ ._\-]?1|5[ ._\-]?1|7[ ._\-]?1|mp3|flac|truehd|atmos|hevc|h265|h264|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion)(?=$|[ ._\-])/gi,
      ""
    );
    // Remove trailing group tags (e.g., -YTS, -RARBG, etc.)
    name = name.replace(
      /[-_. ]+(yts( mx| am)?|rarbg|jyk|kogi|web|amzn|nf|ddp|dd5[ ._\-]?1|aac|dts|hdtv|remux|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)(?=$|[ ._\-])/i,
      ""
    );
    // Preserve common abbreviations with periods before general dot replacement
    name = name.replace(/\bU\.S\.\b/gi, "US_ABBREV");
    name = name.replace(/\bU\.K\.\b/gi, "UK_ABBREV");
    name = name.replace(/\bU\.N\.\b/gi, "UN_ABBREV");
    name = name.replace(/\bU\.S\.A\.\b/gi, "USA_ABBREV");
    name = name.replace(/\bMr\.\b/gi, "MR_ABBREV");
    name = name.replace(/\bMrs\.\b/gi, "MRS_ABBREV");
    name = name.replace(/\bDr\.\b/gi, "DR_ABBREV");
    name = name.replace(/\bProf\.\b/gi, "PROF_ABBREV");
    name = name.replace(/\bSt\.\b/gi, "ST_ABBREV");
    name = name.replace(/\bAve\.\b/gi, "AVE_ABBREV");
    name = name.replace(/\bBlvd\.\b/gi, "BLVD_ABBREV");
    name = name.replace(/\bRd\.\b/gi, "RD_ABBREV");
    name = name.replace(/\bLn\.\b/gi, "LN_ABBREV");
    name = name.replace(/\bCt\.\b/gi, "CT_ABBREV");
    name = name.replace(/\bCo\.\b/gi, "CO_ABBREV");
    name = name.replace(/\bInc\.\b/gi, "INC_ABBREV");
    name = name.replace(/\bLtd\.\b/gi, "LTD_ABBREV");
    name = name.replace(/\bCorp\.\b/gi, "CORP_ABBREV");
    // Replace dots, underscores, dashes with spaces (but preserve the abbreviations we just marked)
    name = name.replace(/[._-]+/g, " ");
    // Restore abbreviations with proper formatting
    name = name.replace(/US_ABBREV/gi, "U.S.");
    name = name.replace(/UK_ABBREV/gi, "U.K.");
    name = name.replace(/UN_ABBREV/gi, "U.N.");
    name = name.replace(/USA_ABBREV/gi, "U.S.A.");
    name = name.replace(/MR_ABBREV/gi, "Mr.");
    name = name.replace(/MRS_ABBREV/gi, "Mrs.");
    name = name.replace(/DR_ABBREV/gi, "Dr.");
    name = name.replace(/PROF_ABBREV/gi, "Prof.");
    name = name.replace(/ST_ABBREV/gi, "St.");
    name = name.replace(/AVE_ABBREV/gi, "Ave.");
    name = name.replace(/BLVD_ABBREV/gi, "Blvd.");
    name = name.replace(/RD_ABBREV/gi, "Rd.");
    name = name.replace(/LN_ABBREV/gi, "Ln.");
    name = name.replace(/CT_ABBREV/gi, "Ct.");
    name = name.replace(/CO_ABBREV/gi, "Co.");
    name = name.replace(/INC_ABBREV/gi, "Inc.");
    name = name.replace(/LTD_ABBREV/gi, "Ltd.");
    name = name.replace(/CORP_ABBREV/gi, "Corp.");
    // Remove extra spaces
    name = name.replace(/\s+/g, " ").trim();
    // Capitalize each word
    name = this.capitalizeTitle(name);
    return name;
  }
  // Restore periods to common movie titles that should have them
  restorePeriodsToTitle(title) {
    if (!title || typeof title !== "string") return title;
    // Common movie title corrections
    const corrections = {
      "Mr and Mrs Smith": "Mr. & Mrs. Smith",
      "Mr Magoriums Wonder Emporium": "Mr. Magorium's Wonder Emporium",
      "Mrs Doubtfire": "Mrs. Doubtfire",
      "U.S. Marshalls": "U.S. Marshals",
      "U.S. Marshals": "U.S. Marshals",
      "Dr Strangelove": "Dr. Strangelove",
      "Prof X": "Prof. X",
      "St Elmos Fire": "St. Elmo's Fire",
      "Ave Maria": "Ave. Maria",
      "Blvd of Broken Dreams": "Blvd. of Broken Dreams",
      "Rd to Perdition": "Rd. to Perdition",
      "Ln of the Lambs": "Ln. of the Lambs",
      "Ct of the Lambs": "Ct. of the Lambs",
      "Co of the Lambs": "Co. of the Lambs",
      "Inc of the Lambs": "Inc. of the Lambs",
      "Ltd of the Lambs": "Ltd. of the Lambs",
      "Corp of the Lambs": "Corp. of the Lambs",
    };
    // Also check for titles with years and quality tags
    const correctionsWithYear = {
      "Mr and Mrs Smith (2005) [1080p]": "Mr. & Mrs. Smith (2005) [1080p]",
      "Mr Magoriums Wonder Emporium (2007) [1080p]":
        "Mr. Magorium's Wonder Emporium (2007) [1080p]",
      "Mrs Doubtfire": "Mrs. Doubtfire",
    };
    // First, extract the base title (remove year and quality tags)
    let baseTitle = title;
    // Remove year in parentheses
    baseTitle = baseTitle.replace(/\(\d{4}\)/g, "");
    // Remove quality tags in brackets
    baseTitle = baseTitle.replace(/\[\d{3,4}p\]/gi, "");
    baseTitle = baseTitle.replace(/\[.*?\]/g, "");
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
        return title.replace(new RegExp(wrong, "gi"), correct);
      }
    }
    // console.log('[DEBUG - TITLE] No corrections found for:', baseTitle);
    return title;
  }
  // Convert normalized key to readable display title
  convertNormalizedKeyToDisplayTitle(normalizedKey) {
    if (!normalizedKey || typeof normalizedKey !== "string")
      return normalizedKey;
    // console.log('[DEBUG - TITLE] convertNormalizedKeyToDisplayTitle input:', normalizedKey);
    // Extract year before removing other elements
    const yearMatch = normalizedKey.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : null;
    // Remove quality tags first
    let cleanKey = normalizedKey.replace(/\[\d{3,4}p\]/gi, ""); // Remove [1080p], [720p], etc.
    cleanKey = cleanKey.replace(/\[.*?\]/g, ""); // Remove any other brackets
    // Remove year in parentheses (we already extracted it above)
    cleanKey = cleanKey.replace(/\(\d{4}\)/g, "");
    // Remove extra spaces and trim
    cleanKey = cleanKey.replace(/\s+/g, " ").trim();
    // Replace dots with spaces and capitalize properly
    let displayTitle = cleanKey.replace(/\./g, " ");
    // Capitalize each word
    displayTitle = displayTitle
      .split(" ")
      .map((word) => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
    // Special corrections for common titles
    const corrections = {
      "Mr and Mrs Smith": "Mr. and Mrs. Smith",
      "Mr Magoriums Wonder Emporium": "Mr. Magorium's Wonder Emporium",
      "Mrs Doubtfire": "Mrs. Doubtfire",
      "Dr Strangelove": "Dr. Strangelove",
      "St Elmos Fire": "St. Elmo's Fire",
      "Ave Maria": "Ave. Maria",
      "Blvd of Broken Dreams": "Blvd. of Broken Dreams",
      "Rd to Perdition": "Rd. to Perdition",
      "Ln of the Lambs": "Ln. of the Lambs",
      "Ct of the Lambs": "Ct. of the Lambs",
      "Co of the Lambs": "Co. of the Lambs",
      "Inc of the Lambs": "Inc. of the Lambs",
      "Ltd of the Lambs": "Ltd. of the Lambs",
      "Corp of the Lambs": "Corp. of the Lambs",
      Mr: "Mr.",
      Mrs: "Mrs.",
      Dr: "Dr.",
      Prof: "Prof.",
      St: "St.",
      Ave: "Ave.",
      Blvd: "Blvd.",
      Rd: "Rd.",
      Ln: "Ln.",
      Ct: "Ct.",
      Co: "Co.",
      Inc: "Inc.",
      Ltd: "Ltd.",
      Corp: "Corp.",
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
      Mr: "Mr.",
      Mrs: "Mrs.",
      Dr: "Dr.",
      Prof: "Prof.",
      St: "St.",
      Ave: "Ave.",
      Blvd: "Blvd.",
      Rd: "Rd.",
      Ln: "Ln.",
      Ct: "Ct.",
      Co: "Co.",
      Inc: "Inc.",
      Ltd: "Ltd.",
      Corp: "Corp.",
    };
    // Apply abbreviation corrections to individual words
    const words = displayTitle.split(" ");
    const correctedWords = words.map((word) => {
      const lowerWord = word.toLowerCase();
      for (const [abbrev, corrected] of Object.entries(
        abbreviationCorrections
      )) {
        if (lowerWord === abbrev.toLowerCase()) {
          return corrected;
        }
      }
      return word;
    });
    displayTitle = correctedWords.join(" ");
    // Add year back to the display title if it exists
    if (year) {
      displayTitle = `${displayTitle} (${year})`;
    }
    // console.log('[DEBUG - TITLE] Final display title:', displayTitle);
    return displayTitle;
  }
  // Clean title for UI display - remove quality tags, keep only title and year
  cleanTitleForDisplay(title) {
    if (!title || typeof title !== "string") return title;
    // console.log('[DEBUG - TITLE] cleanTitleForDisplay input:', title);
    // Remove quality tags in brackets
    let cleanTitle = title.replace(/\[\d{3,4}p\]/gi, ""); // Remove [1080p], [720p], etc.
    // console.log('[DEBUG - TITLE] After removing quality tags:', cleanTitle);
    cleanTitle = cleanTitle.replace(/\[.*?\]/g, ""); // Remove any other brackets
    // console.log('[DEBUG - TITLE] After removing all brackets:', cleanTitle);
    // Remove extra spaces
    cleanTitle = cleanTitle.replace(/\s+/g, " ").trim();
    // console.log('[DEBUG - TITLE] After removing extra spaces:', cleanTitle);
    // Remove trailing/leading spaces around parentheses
    cleanTitle = cleanTitle
      .replace(/\s*\(\s*/g, " (")
      .replace(/\s*\)\s*/g, ") ");
    // console.log('[DEBUG - TITLE] After fixing parentheses spacing:', cleanTitle);
    // Final trim
    cleanTitle = cleanTitle.trim();
    // console.log('[DEBUG - TITLE] Final cleaned title:', cleanTitle);
    return cleanTitle;
  }
  // Add/Update: Top bar count
  updateCount() {
    const countSpan = document.getElementById("mediaLibraryCount");
    if (!countSpan) return;
    // Hide count on Watch Later tab
    if (this.currentTab === "watchlater") {
      countSpan.textContent = "";
      countSpan.style.display = "none";
      return;
    }
    const items = this.getFilteredAndSortedItems();
    let countText = "";
    if (this.currentTab === "movies") {
      const totalMovies = this.getTotalMovieCount();
      countText = `Movies: ${totalMovies}`;
    } else if (this.currentTab === "tvshows") {
      const totalTVShows = this.getTotalTVShowCount();
      countText = `TV-Shows: ${totalTVShows}`;
    } else if (this.currentTab === "favorites") {
      const favorites = this.getFavoritesList();
      const totalFavorites = favorites.movies.length + favorites.tvshows.length;
      countText = `Favorites: ${totalFavorites}`;
    } else if (this.currentTab === "collections") {
      const collections = this.getCollections();
      const totalCollections = Object.keys(collections).length;
      countText = `Collections: ${totalCollections}`;
    } else if (this.currentTab === "suggestions") {
      const suggestions = this.getSuggestions();
      countText = `Suggestions: ${suggestions.length}`;
    } else {
      countText = `${items.length} Items`;
    }
    countSpan.textContent = countText;
    countSpan.style.display = "";
  }
  // Add/Update: Search and sort UI state
  restoreSearchSortUI() {
    const searchInput = document.getElementById("mediaLibrarySearch");
    if (searchInput) {
      // Restore search input value based on current tab
      let searchValue = "";
      switch (this.currentTab) {
        case "movies":
          searchValue = this.movieSearchQuery || "";
          break;
        case "tvshows":
          searchValue = this.tvShowSearchQuery || "";
          break;
        case "favorites":
          searchValue = this.favoritesSearchQuery || "";
          break;
        case "collections":
          searchValue = this.collectionsSearchQuery || "";
          break;
        case "watchlater":
          searchValue = this.watchLaterSearchQuery || "";
          break;
        case "suggestions":
          searchValue = this.suggestionsSearchQuery || "";
          break;
        default:
          searchValue = this.searchQuery || "";
          break;
      }
      searchInput.value = searchValue;
    }
    const sortSelect = document.getElementById("mediaLibrarySort");
    if (sortSelect) sortSelect.value = this.sortBy || "asc";
  }
  // Add: Search and sort state - separate for each tab
  searchQuery = "";
  movieSearchQuery = "";
  tvShowSearchQuery = "";
  favoritesSearchQuery = "";
  collectionsSearchQuery = "";
  watchLaterSearchQuery = "";
  suggestionsSearchQuery = "";
  async handleSearchInput(event) {
    const searchValue = event.target.value;
    console.log(
      "[DEBUG - SEARCH-INPUT] handleSearchInput called with value:",
      searchValue
    );
    console.log("[DEBUG - SEARCH-INPUT] Current tab:", this.currentTab);
    // Store search query based on current tab
    switch (this.currentTab) {
      case "movies":
        this.movieSearchQuery = searchValue;
        console.log(
          "[DEBUG - SEARCH-INPUT] Set movieSearchQuery to:",
          searchValue
        );
        break;
      case "tvshows":
        this.tvShowSearchQuery = searchValue;
        console.log(
          "[DEBUG - SEARCH-INPUT] Set tvShowSearchQuery to:",
          searchValue
        );
        break;
      case "favorites":
        this.favoritesSearchQuery = searchValue;
        console.log(
          "[DEBUG - SEARCH-INPUT] Set favoritesSearchQuery to:",
          searchValue
        );
        break;
      case "collections":
        this.collectionsSearchQuery = searchValue;
        console.log(
          "[DEBUG - SEARCH-INPUT] Set collectionsSearchQuery to:",
          searchValue
        );
        break;
      case "watchlater":
        this.watchLaterSearchQuery = searchValue;
        console.log(
          "[DEBUG - SEARCH-INPUT] Set watchLaterSearchQuery to:",
          searchValue
        );
        break;
      case "suggestions":
        this.suggestionsSearchQuery = searchValue;
        console.log(
          "[DEBUG - SEARCH-INPUT] Set suggestionsSearchQuery to:",
          searchValue
        );
        break;
      default:
        this.searchQuery = searchValue; // fallback
        console.log("[DEBUG - SEARCH-INPUT] Set searchQuery to:", searchValue);
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
    console.log(
      "[DEBUG - A-Z] renderAZSidebarMovie called at:",
      new Date().toISOString()
    );
    console.log(
      "[DEBUG - A-Z] Current azSidebarLoaded flag before render:",
      this.azSidebarLoaded
    );
    // Clear both sidebars first to prevent duplicates
    const movieSidebar = document.getElementById("mediaLibraryAZSidebarMovie");
    const tvSidebar = document.getElementById("mediaLibraryAZSidebarTVShow");
    if (tvSidebar) {
      tvSidebar.innerHTML = "";
      tvSidebar.style.display = "none";
    }
    if (!movieSidebar) {
      console.warn("[DEBUG - A-Z] No mediaLibraryAZSidebarMovie element found");
      return;
    }
    // Get the current filtered and sorted items to determine which letters are available
    const filteredItems = this.getFilteredAndSortedItems();
    console.log("[DEBUG - A-Z] Filtered items count:", filteredItems.length);
    const availableLetters = new Set();
    // Collect all first letters from the filtered items
    filteredItems.forEach((item) => {
      const displayTitle =
        item.TMDBTitle ||
        item.title ||
        item.name ||
        item.filename ||
        item.path ||
        "";
      const firstLetter = displayTitle.charAt(0).toUpperCase();
      if (firstLetter && /[A-Z]/.test(firstLetter)) {
        availableLetters.add(firstLetter);
      }
    });
    console.log(
      "[DEBUG - A-Z] Found movie sidebar, rendering letters for filtered items"
    );
    movieSidebar.innerHTML = "";
    movieSidebar.style.display = "flex";
    // Only render letters that have movies in the current filtered results
    const letters = Array.from(availableLetters).sort();
    console.log("[DEBUG - A-Z] Available letters:", letters);
    letters.forEach((letter) => {
      const btn = document.createElement("div");
      btn.className = "media-library-az-letter-movie";
      btn.textContent = letter;
      btn.setAttribute("data-letter", letter);
      movieSidebar.appendChild(btn);
    });
    // Use event delegation - single listener on the sidebar for movies only
    movieSidebar.onclick = (e) => {
      const letterElement = e.target.closest(".media-library-az-letter-movie");
      if (letterElement) {
        const letter = letterElement.getAttribute("data-letter");
        if (letter) {
          this.scrollToLetterMovie(letter);
        }
      }
    };
    console.log(
      "[DEBUG - A-Z] Movie A-Z sidebar rendered with",
      letters.length,
      "letters:",
      letters.join(", ")
    );
    // console.log(
    //   "[DEBUG - A-Z] Sidebar children count after render:",
    //   movieSidebar.children.length
    // );
    // Set the flag to indicate A-Z sidebar is loaded
    this.azSidebarLoaded = true;
    console.log("[DEBUG - A-Z] A-Z sidebar loading flag set to true");
    // Debug: log the current flag status after setting
    // console.log(
    //   "[DEBUG - A-Z] Current azSidebarLoaded flag after setting:",
    //   this.azSidebarLoaded
    // );
    // console.log(
    //   "[DEBUG - A-Z] Movie A-Z sidebar render completed at:",
    //   new Date().toISOString()
    // );
  }
  renderAZSidebarTVShow() {
    // console.log(
    //   "[DEBUG - A-Z] renderAZSidebarTVShow called at:",
    //   new Date().toISOString()
    // );
    // console.log(
    //   "[DEBUG - A-Z] Current azSidebarLoaded flag before render:",
    //   this.azSidebarLoaded
    // );
    // Clear both sidebars first to prevent duplicates
    const movieSidebar = document.getElementById("mediaLibraryAZSidebarMovie");
    const tvSidebar = document.getElementById("mediaLibraryAZSidebarTVShow");
    if (movieSidebar) {
      movieSidebar.innerHTML = "";
      movieSidebar.style.display = "none";
    }
    if (!tvSidebar) {
      // console.warn(
      //   "[DEBUG - A-Z] No mediaLibraryAZSidebarTVShow element found"
      // );
      return;
    }
    // Get the current filtered and sorted items to determine which letters are available
    const filteredItems = this.getFilteredAndSortedItems();
    const availableLetters = new Set();
    // Collect all first letters from the filtered items
    filteredItems.forEach((item) => {
      const cleanTitle = this.cleanTVShowTitle(
        item.name || item.title || item.filename || item.path || ""
      );
      const firstLetter = cleanTitle.charAt(0).toUpperCase();
      if (firstLetter && /[A-Z]/.test(firstLetter)) {
        availableLetters.add(firstLetter);
      }
    });
    // console.log('[DEBUG - A-Z] Found sidebar, rendering TV show letters for filtered items');
    tvSidebar.innerHTML = "";
    tvSidebar.style.display = "flex";
    // Only render letters that have shows in the current filtered results
    const letters = Array.from(availableLetters).sort();
    letters.forEach((letter) => {
      const btn = document.createElement("div");
      btn.className = "media-library-az-letter-tvshow";
      btn.textContent = letter;
      btn.setAttribute("data-letter", letter);
      tvSidebar.appendChild(btn);
    });
    // Use event delegation - single listener on the sidebar for TV shows only
    tvSidebar.onclick = (e) => {
      const letterElement = e.target.closest(".media-library-az-letter-tvshow");
      if (letterElement) {
        const letter = letterElement.getAttribute("data-letter");
        if (letter) {
          this.scrollToLetterTVShows(letter);
        }
      }
    };
    // console.log('[DEBUG - A-Z] TV show A-Z sidebar rendered with', letters.length, 'letters:', letters.join(', '));
    // Set the flag to indicate A-Z sidebar is loaded
    this.azSidebarLoaded = true;
    console.log("[DEBUG - A-Z] A-Z sidebar loading flag set to true");
    // Debug: log the current flag status after setting
    // console.log(
    //   "[DEBUG - A-Z] Current azSidebarLoaded flag after setting:",
    //   this.azSidebarLoaded
    // );
    // console.log(
    //   "[DEBUG - A-Z] TV Show A-Z sidebar render completed at:",
    //   new Date().toISOString()
    // );
  }
  scrollToLetterMovie(letter) {
    // console.log('🔤 [A-Z] scrollToLetterMovie called with letter:', letter);
    // Find the anchor for this letter (movies use .media-library-anchor)
    const anchor = document.querySelector(
      `.media-library-anchor[data-anchor="${letter}"]`
    );
    // Highlight the active letter in the A-Z sidebar for movies
    const azSidebar = document.getElementById("mediaLibraryAZSidebarMovie");
    if (azSidebar) {
      azSidebar
        .querySelectorAll(".media-library-az-letter-movie")
        .forEach((btn) => btn.classList.remove("az-active-movie"));
      const activeBtn = azSidebar.querySelector(
        `.media-library-az-letter-movie[data-letter='${letter}']`
      );
      if (activeBtn) activeBtn.classList.add("az-active-movie");
    }
    if (anchor) {
      // Find the parent card (movies use .media-library-movie-card)
      const card = anchor.closest(".media-library-movie-card");
      if (card) {
        card.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        card.style.transition = "background 0.3s";
        const originalBg = card.style.background;
        card.style.background = "#fff9c4"; // light yellow
        setTimeout(() => {
          card.style.background = originalBg || "";
        }, 600);
        console.log(
          "🔤 [A-Z] Found and scrolled to movie card for letter:",
          letter
        );
      } else {
        // fallback: scroll to anchor itself
        anchor.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      console.warn("🔤 [A-Z] No movie anchor found for letter:", letter);
    }
  }
  scrollToLetterTVShows(letter) {
    // console.log('🔤 [A-Z] scrollToLetterTVShows called with letter:', letter);
    // Find the anchor for this letter (TV-Shows use .media-library-anchor)
    const anchor = document.querySelector(
      `.media-library-anchor[data-anchor="${letter}"]`
    );
    // console.log('[DEBUG - A-Z] Looking for anchor with data-anchor="' + letter + '", found:', anchor);
    // Highlight the active letter in the A-Z sidebar for TV shows
    const azSidebar = document.getElementById("mediaLibraryAZSidebarTVShow");
    if (azSidebar) {
      azSidebar
        .querySelectorAll(".media-library-az-letter-tvshow")
        .forEach((btn) => btn.classList.remove("az-active-tvshow"));
      const activeBtn = azSidebar.querySelector(
        `.media-library-az-letter-tvshow[data-letter='${letter}']`
      );
      if (activeBtn) activeBtn.classList.add("az-active-tvshow");
    }
    if (anchor) {
      // Find the parent card (TV-Shows use .media-library-tv-show-card)
      const card = anchor.closest(".media-library-tv-show-card");
      // console.log('[DEBUG - A-Z] Found card:', card);
      if (card) {
        card.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        card.style.transition = "background 0.3s";
        const originalBg = card.style.background;
        card.style.background = "#fff9c4"; // light yellow
        setTimeout(() => {
          card.style.background = originalBg || "";
        }, 600);
        console.log(
          "🔤 [A-Z] Found and scrolled to TV show card for letter:",
          letter
        );
      } else {
        // fallback: scroll to anchor itself
        anchor.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      console.warn("🔤 [A-Z] No TV show anchor found for letter:", letter);
      // Try alternative selector for TV show cards
      const tvCard = document.querySelector(
        `.media-library-tv-show-card[data-anchor="${letter}"]`
      );
      // console.log('[DEBUG - A-Z] Trying alternative selector, found TV card:', tvCard);
      if (tvCard) {
        tvCard.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        tvCard.style.transition = "background 0.3s";
        const originalBg = tvCard.style.background;
        tvCard.style.background = "#fff9c4";
        setTimeout(() => {
          tvCard.style.background = originalBg || "";
        }, 600);
        // console.log('🔤 [A-Z] Found and scrolled to TV show card using alternative selector for letter:', letter);
      }
    }
  }
  // Remove duplicate scrollToLetterTVShows method
  // Update: renderMediaGrid to use search, sort, shuffle
  getFilteredAndSortedItems() {
    const items = this.getItemsForCurrentTab();
    console.log('[DEBUG - FILTERED-ITEMS] getFilteredAndSortedItems - currentTab:', this.currentTab, 'items length:', items ? items.length : 'null');
    if (!items || !Array.isArray(items)) {
      console.log('[DEBUG - FILTERED-ITEMS] No items or items is not an array, returning empty array');
      return [];
    }
    // console.log('[MOVIE DEBUG] Items before filtering:', items.length, items.slice(0, 3));
    // Get the appropriate search query for the current tab
    let currentSearchQuery = "";
    switch (this.currentTab) {
      case "movies":
        currentSearchQuery = this.movieSearchQuery;
        break;
      case "tvshows":
        currentSearchQuery = this.tvShowSearchQuery;
        break;
      case "favorites":
        currentSearchQuery = this.favoritesSearchQuery;
        break;
      case "collections":
        currentSearchQuery = this.collectionsSearchQuery;
        break;
      case "watchlater":
        currentSearchQuery = this.watchLaterSearchQuery;
        break;
      case "suggestions":
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
    console.log(
      "[MOVIE DEBUG] Items after search filtering:",
      filtered.length,
      filtered.slice(0, 3)
    );
    // Apply genre filter if not "All Genres"
    if (this.selectedGenre && this.selectedGenre !== "All Genres") {
      filtered = this.filterByGenre(filtered, this.selectedGenre);
      console.log(
        "[MOVIE DEBUG] Items after genre filtering:",
        filtered.length,
        filtered.slice(0, 3)
      );
    }
    // For movies, sort by original display title; for favorites, preserve original order; for others, sort by name
    if (this.currentTab === "movies") {
      return filtered.slice().sort((a, b) => {
        const titleA = (
          a.TMDBTitle ||
          a.title ||
          a.name ||
          a.filename ||
          a.path ||
          ""
        ).toLowerCase();
        const titleB = (
          b.TMDBTitle ||
          b.title ||
          b.name ||
          b.filename ||
          b.path ||
          ""
        ).toLowerCase();
        if (this.sortBy === "asc") {
          return titleA.localeCompare(titleB);
        } else {
          return titleB.localeCompare(titleA);
        }
      });
    } else if (this.currentTab === "favorites") {
      // For favorites, preserve the original order (order added to favorites)
      return filtered;
    } else {
      return this.sortItems(filtered, this.sortBy, "name");
    }
  }
  // Format time for resume info
  formatTime(seconds) {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }
  renderGrid(items, labelFn) {
    // Add anchors to the grid
    let lastLetter = null;
    items.forEach((item, index) => {
      const title = labelFn(item).trim();
      const firstLetter = title[0] ? title[0].toUpperCase() : "";
      let anchorHTML = "";
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
    grid += "</div>";
    // Add event listeners after the HTML is inserted into the DOM
    setTimeout(() => {
      const cards = document.querySelectorAll(
        ".media-library-movie-grid .media-library-movie-card"
      );
      cards.forEach((card) => {
        const resumeBtn = card.querySelector(".resume-btn");
        const deleteBtn = card.querySelector(".delete-btn");
        const itemPath = card.getAttribute("data-item-path");
        // Find the corresponding item from the resume list
        const resumeList = this.getResumeList();
        const item = resumeList.find(
          (resumeItem) => resumeItem.path === itemPath
        );
        if (item) {
          // Resume button click handler
          resumeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.playMedia(item, item.currentTime);
          });
          // Delete button click handler
          deleteBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await this.removeResumeProgress(item.path);
            this.updateWatchLaterGrid().then(() => {
              this.showToast("Removed from Watch Later");
            });
          });
          // Card click handler (resume from saved position)
          card.addEventListener("click", () => {
            console.log("[WATCH-LATER] Card clicked for:", item);
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
    // Fix existing items that are missing normalizedKey
    this.fixWatchLaterNormalizedKeys();
    // Get the resume list sorted by lastWatched (newest first)
    const resumeList = this.getResumeList();
    console.log(
      "[WATCH-LATER DEBUG] Resume list loaded:",
      resumeList.length,
      "items"
    );
    console.log(
      "[WATCH-LATER DEBUG] Sample resume items:",
      resumeList.slice(0, 3)
    );
    // MIGRATION: Fix missing or incorrect type fields for existing Watch Later entries
    resumeList.forEach(item => {
      if (item.path) {
        const pathLower = item.path && typeof item.path === 'string' ? item.path.toLowerCase() : '';
        const titleLower = (item.title && typeof item.title === 'string' ? item.title : "").toLowerCase();
        
        // Check for TV show patterns: Season folders, S01E01 patterns, etc.
        const isTVShow = (
          pathLower.includes("season") ||
          pathLower.includes("s0") ||
          pathLower.includes("s1") ||
          pathLower.includes("s2") ||
          pathLower.includes("s3") ||
          pathLower.includes("s4") ||
          pathLower.includes("s5") ||
          pathLower.includes("s6") ||
          pathLower.includes("s7") ||
          pathLower.includes("s8") ||
          pathLower.includes("s9") ||
          pathLower.includes("episode") ||
          pathLower.includes("e0") ||
          pathLower.includes("e1") ||
          pathLower.includes("e2") ||
          pathLower.includes("e3") ||
          pathLower.includes("e4") ||
          pathLower.includes("e5") ||
          pathLower.includes("e6") ||
          pathLower.includes("e7") ||
          pathLower.includes("e8") ||
          pathLower.includes("e9") ||
          titleLower.match(/s\d+e\d+/i) ||
          pathLower.match(/s\d+e\d+/i)
        );
        
        if (isTVShow) {
          // This is a TV show episode - fix the type field
          if (!item.type || !item.mediaType || item.type === "movie" || item.mediaType === "movie") {
            item.type = "tvshow";
            item.mediaType = "tvshow";
            console.log(`[WATCH-LATER MIGRATION] Fixed type field for TV show: ${item.title || item.path}`);
          }
        } else {
          // This is a movie - ensure it has the correct type field
          if (!item.type || !item.mediaType) {
            item.type = "movie";
            item.mediaType = "movie";
            console.log(`[WATCH-LATER MIGRATION] Fixed missing type field for movie: ${item.title || item.path}`);
          }
        }
      }
    });

    // Save the migrated data back to localStorage if any items were updated
    const hasUpdates = resumeList.some(item => item.type && item.mediaType);
    if (hasUpdates) {
      localStorage.setItem("mediaLibraryResumeList", JSON.stringify(resumeList));
      console.log("[WATCH-LATER MIGRATION] Saved updated Watch Later data to localStorage");
    }

    // Use the type field as the primary method - it's the most reliable!
    const tvshows = resumeList.filter((item) => {
      // Primary method: use the type field
      if (item.type === "tvshow" || item.mediaType === "tvshow") {
        console.log(`[WATCH-LATER DEBUG] Found TV show by type: ${item.title} (type: ${item.type}, mediaType: ${item.mediaType})`);
        return true;
      }
      
      // Fallback: only use path-based detection if type field is missing
      if (!item.type && !item.mediaType) {
        const path = (item.path && typeof item.path === 'string' ? item.path : "").toLowerCase();
        const title = (item.title && typeof item.title === 'string' ? item.title : "").toLowerCase();
        
        // Check for TV show paths
        if (
          path.includes("tvshows") ||
          path.includes("tv_shows") ||
          path.includes("tv shows")
        ) {
          return true;
        }
        // Check for episode patterns in path or title (S01E01, S02E05, etc.)
        if (path.match(/s\d+e\d+/i) || title.match(/s\d+e\d+/i)) {
          return true;
        }
        // Check for season patterns in path (but not in movie titles)
        if (
          (path.includes("season") && path.includes("tvshows")) ||
          path.includes("s01") ||
          path.includes("s02")
        ) {
          return true;
        }
      }
      
      return false;
    });
    const movies = resumeList.filter((item) => !tvshows.includes(item));
    
    console.log(`[WATCH-LATER DEBUG] Initial filtering results: ${movies.length} movies, ${tvshows.length} TV shows`);
    console.log(`[WATCH-LATER DEBUG] TV shows found:`, tvshows.map(tv => ({ title: tv.title, type: tv.type, mediaType: tv.mediaType })));

    // Re-categorize items using unified data (same logic as Favorites)
    const correctlyCategorizedMovies = [];
    const correctlyCategorizedTVShows = [...tvshows]; // Start with existing TV shows

    if (this.unifiedData) {
      console.log('[DEBUG - WATCH-LATER] Re-categorizing items based on unified data...');

      movies.forEach(movieItem => {
        let isActuallyTVShow = false;
        let displayTitle = movieItem.title || movieItem.TMDBTitle || movieItem.name || 'Unknown';

        // Clean the title for comparison (remove quality tags, episode info, etc.)
        displayTitle = displayTitle.replace(/\[\d{3,4}p\]/gi, "").replace(/\[.*?\]/g, "").trim();
        
        // Also create a version without episode info for better matching
        let cleanTitleForMatching = displayTitle
          .replace(/\s*\|\s*S\d+E\d+.*$/i, "") // Remove "| S01E01 | Episode Title"
          .replace(/\s*S\d+E\d+.*$/i, "") // Remove "S01E01 Episode Title"
          .replace(/\s*-\s*S\d+E\d+.*$/i, "") // Remove "- S01E01 Episode Title"
          .trim();

        console.log('[DEBUG - WATCH-LATER] Checking item:', {
          originalTitle: movieItem.title,
          displayTitle: displayTitle,
          cleanTitle: cleanTitleForMatching,
          type: movieItem.type,
          mediaType: movieItem.mediaType
        });

        // First check if the item itself already indicates it's a TV show
        if (movieItem.type === 'tv' || movieItem.type === 'tvshow' || movieItem.mediaType === 'tv' || movieItem.mediaType === 'tvshow') {
          console.log('[DEBUG - WATCH-LATER] ✅ Item already marked as TV show in localStorage:', displayTitle, '- type:', movieItem.type, 'mediaType:', movieItem.mediaType);
          isActuallyTVShow = true;
          correctlyCategorizedTVShows.push({
            ...movieItem,
            type: 'tvshow',
            mediaType: 'tvshow'
          });
        } else {
          // Check for obvious TV show patterns first
          const hasEpisodePattern = /S\d+E\d+/i.test(displayTitle) || /Season\s+\d+/i.test(displayTitle);
          if (hasEpisodePattern) {
            console.log('[DEBUG - WATCH-LATER] ✅ Moving TV show from movies to TV shows (episode pattern detected):', displayTitle);
            isActuallyTVShow = true;
            correctlyCategorizedTVShows.push({
              ...movieItem,
              type: 'tvshow',
              mediaType: 'tvshow'
            });
          } else {
            // Check in unified data to see if this is actually a TV show
            for (const [key, mediaData] of Object.entries(this.unifiedData)) {
              const mediaTitle = mediaData.title || mediaData.about?.title;
              
              // Skip if mediaTitle is undefined or empty
              if (!mediaTitle || typeof mediaTitle !== 'string') {
                continue;
              }
              
              // Try multiple matching strategies
              const exactMatch = mediaTitle === displayTitle;
              const cleanMatch = mediaTitle === cleanTitleForMatching;
              const containsMatch = (cleanTitleForMatching && typeof cleanTitleForMatching === 'string' ? cleanTitleForMatching.toLowerCase().includes(mediaTitle.toLowerCase()) : false) ||
                                   (mediaTitle && typeof mediaTitle === 'string' ? mediaTitle.toLowerCase().includes(cleanTitleForMatching.toLowerCase()) : false);
              
              if (exactMatch || cleanMatch || (containsMatch && mediaTitle.length > 3)) {
                if (mediaData.type === 'tvshow') {
                  console.log('[DEBUG - WATCH-LATER] ✅ Moving TV show from movies to TV shows (found in unified data):', {
                    displayTitle,
                    cleanTitle: cleanTitleForMatching,
                    mediaTitle,
                    matchType: exactMatch ? 'exact' : cleanMatch ? 'clean' : 'contains'
                  });
                  isActuallyTVShow = true;
                  // Add to TV shows array with correct type
                  correctlyCategorizedTVShows.push({
                    ...movieItem,
                    type: 'tvshow',
                    mediaType: 'tvshow'
                  });
                }
                break;
              }
            }
          }
        }

        // If it's not a TV show, keep it in movies
        if (!isActuallyTVShow) {
          correctlyCategorizedMovies.push(movieItem);
        }
      });

      console.log('[DEBUG - WATCH-LATER] Re-categorization complete:');
      console.log('[DEBUG - WATCH-LATER] - Movies:', correctlyCategorizedMovies.length, '(was', movies.length, ')');
      console.log('[DEBUG - WATCH-LATER] - TV Shows:', correctlyCategorizedTVShows.length, '(was', tvshows.length, ')');
    } else {
      // No unified data available, use original arrays
      console.log('[DEBUG - WATCH-LATER] No unified data available for re-categorization');
      correctlyCategorizedMovies.push(...movies);
    }

    // Use the re-categorized arrays for rendering
    const finalMovies = correctlyCategorizedMovies;
    const finalTVShows = correctlyCategorizedTVShows;

    console.log(`[WATCH-LATER DEBUG] Final results: ${finalMovies.length} movies, ${finalTVShows.length} TV shows`);
    
    // Add normalizedKey to movies for poster lookup
    finalMovies.forEach(item => {
      // console.log(`[WATCH-LATER DEBUG] Processing movie item:`, {
      //   title: item.title,
      //   path: item.path,
      //   normalizedKey: item.normalizedKey,
      //   type: item.type
      // });
      if (this.unifiedData) {
        // Try to find matching movie in unified data
        for (const key in this.unifiedData) {
          const mediaItem = this.unifiedData[key];
          if (mediaItem.isMovie) {
            // Match by path, title, or extracted name
            const itemPath = (item.path || "").replace(/\\/g, "/");
            const mediaPath = (mediaItem.path || "").replace(/\\/g, "/");
            
            // Try multiple matching strategies
            let matchFound = false;
            
            // 1. Exact path match
            if (itemPath === mediaPath) {
              matchFound = true;
            }
            // 2. Title match (case-insensitive)
            else if (item.title && mediaItem.title && 
                     typeof item.title === 'string' && typeof mediaItem.title === 'string' &&
                     item.title.toLowerCase() === mediaItem.title.toLowerCase()) {
              matchFound = true;
            }
            // 3. Extract movie folder name from path and match against title
            else if (itemPath && mediaItem.title) {
              const movieFolderName = itemPath.split(/[\\/]/).pop(); // Get folder name
              if (movieFolderName && mediaItem.title && typeof mediaItem.title === 'string' && typeof movieFolderName === 'string' && mediaItem.title.toLowerCase().includes(movieFolderName.toLowerCase())) {
                matchFound = true;
              }
            }
            // 4. Match by normalized key if available
            else if (item.normalizedKey && item.normalizedKey === key) {
              matchFound = true;
            }
            
            if (matchFound) {
              item.normalizedKey = key;
              console.log(`[WATCH-LATER DEBUG] Added normalizedKey "${key}" to movie "${item.title}" via ${matchFound === true ? 'exact match' : 'fallback'}`);
              break;
            }
          }
        }
        
        // If no match found, try to create a normalized key from the title or path
        if (!item.normalizedKey) {
          let normalizedKey = null;
          
          // Try to create from title first
          if (item.title && item.title !== "S:") {
            const cleanTitle = item.title.replace(/\s*\[[^\]]+\]\s*/g, ''); // Remove quality labels
            normalizedKey = window.normalizeKey ? window.normalizeKey(cleanTitle) : this.createFallbackNormalizedKey(cleanTitle);
          }
          
          // If no title or title is problematic, try to create from path
          if (!normalizedKey && item.path && typeof item.path === 'string') {
            const pathParts = item.path.split(/[\\/]/);
            // Look for the movie folder (usually the last folder before the filename)
            for (let i = pathParts.length - 2; i >= 0; i--) {
              const part = pathParts[i];
              if (part && part !== "movies" && part !== "movie" && !part.includes(".")) {
                const cleanPart = part.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
                if (cleanPart) {
                  normalizedKey = window.normalizeKey ? window.normalizeKey(cleanPart) : this.createFallbackNormalizedKey(cleanPart);
                  break;
                }
              }
            }
          }
          
          // Look for this normalized key in unified data
          if (normalizedKey && this.unifiedData[normalizedKey]) {
            item.normalizedKey = normalizedKey;
            console.log(`[WATCH-LATER DEBUG] Created normalizedKey "${normalizedKey}" for movie "${item.title || item.path}"`);
          } else if (normalizedKey) {
            // Even if not found in unified data, store it for display purposes
            item.normalizedKey = normalizedKey;
            console.log(`[WATCH-LATER DEBUG] Created normalizedKey "${normalizedKey}" for movie "${item.title || item.path}" (not found in unified data)`);
          }
        }
        
        // Debug final state
        // console.log(`[WATCH-LATER DEBUG] Final movie item state:`, {
        //   title: item.title,
        //   path: item.path,
        //   normalizedKey: item.normalizedKey,
        //   type: item.type
        // });
      }
    });
    console.log(
      "[WATCH-LATER DEBUG] TV shows filtered:",
      tvshows.length,
      "items"
    );
    console.log("[WATCH-LATER DEBUG] Movies filtered:", movies.length, "items");
    console.log(
      "[WATCH-LATER DEBUG] Sample TV show items:",
      tvshows.slice(0, 2)
    );
    console.log("[WATCH-LATER DEBUG] Sample movie items:", movies.slice(0, 2));
    // Helper for TV show label and screenshot
    const getTvShowLabel = (item) => {
      let path = decodeURIComponent(item.path || "");
      // Try to extract show name and SxxExx
      let show = "",
        code = "",
        year = "";
      // console.log('[DEBUG - WATCH-LATER] getTvShowLabel called with path:', path);
      // console.log('[DEBUG - WATCH-LATER] tvShowsData available:', this.tvShowsData ? 'YES' : 'NO');
      // console.log('[DEBUG - WATCH-LATER] tvShowsData length:', this.tvShowsData ? this.tvShowsData.length : 'N/A');
      // First, try to find the show data from the unified data to get the year
      // Use the new unified data structure instead of old tvShowsData
      let tvShowsArray = [];
      if (this.unifiedData) {
        // Convert unified data to array format for processing
        tvShowsArray = Object.entries(this.unifiedData)
          .filter(([key, item]) => !item.isMovie && item.seasons)
          .map(([key, item]) => ({
            path: item.path || item.absPath,
            normalizedKey: key,
            title: item.title || item.TMDBTitle || item.name,
            poster: item.poster || item.posterUrl || item.image
          }));
      }
      
      if (tvShowsArray.length > 0) {
        console.log('[DEBUG - WATCH-LATER] Searching through', tvShowsArray.length, 'TV shows for path:', path);
        for (const tvShow of tvShowsArray) {
          // Check if this episode belongs to this show by matching the path
          if (tvShow.path) {
            const showPath = (tvShow.path || "").replace(/\\/g, "/").trim();
                  const searchPath = path.replace(/\\/g, "/").trim();
            
            // USE THE WORKING BACKUP APPROACH: Extract show name from path and match normalizedKey
            const showNameFromPath = searchPath.split('/')[0]; // Get show name before first slash
            
            // Convert to normalized key format (same as backup system)
            if (!showNameFromPath || typeof showNameFromPath !== 'string') continue;
            const normalizedShowName = showNameFromPath
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '.')  // Replace special chars with dots
              .replace(/\s+/g, '.')           // Replace spaces with dots
              .replace(/\.+/g, '.')           // Clean up multiple dots
              .replace(/^\.|\.$/g, '')        // Remove leading/trailing dots
              .replace(/\.(\d{4})/, '.($1)'); // Ensure year has dot before it: "2018" -> ".(2018)"
            
            const normalizedShowKey = tvShow.normalizedKey ? tvShow.normalizedKey.toLowerCase() : null;
            
            // Check if the show name matches the show's normalized key
            if (normalizedShowKey && normalizedShowName === normalizedShowKey.replace(/^tvshows\//, '')) {
              console.log('[DEBUG - WATCH-LATER] Found matching episode!');
              console.log('[DEBUG - WATCH-LATER] Show path:', tvShow.path);
              console.log('[DEBUG - WATCH-LATER] Show normalizedKey:', tvShow.normalizedKey);
              console.log('[DEBUG - WATCH-LATER] Path comparison:', {
                originalShowPath: showPath,
                originalSearchPath: searchPath,
                normalizedShowPath,
                normalizedSearchPath,
                matchType: normalizedSearchPath.includes(normalizedShowPath) ? 'search-contains-show' : 'show-contains-search'
              });
                    // Found the show! Extract year from the normalizedKey
                    if (tvShow.normalizedKey) {
                const yearMatch = tvShow.normalizedKey.match(/\((\d{4})\)/);
                      if (yearMatch) {
                        year = yearMatch[1];
                      }
                      // Extract show name from normalizedKey (remove the year part)
                      show = tvShow.normalizedKey
                        .replace(/\.\(\d{4}\)$/, "")
                        .replace(/\./g, " ")
                        .trim();
                    } else {
                      // Fallback to path parsing if no normalizedKey
                      const yearMatch = tvShow.path.match(/\((\d{4})\)/);
                      if (yearMatch) {
                        year = yearMatch[1];
                      }
                      show = tvShow.path.replace(/\s*\(\d{4}\)\s*$/, "").trim();
                    }
                    break;
                  }
                }
                if (year) break;
        }
        // Fallback to path parsing if needed
      }
      // If we didn't find the show in JSON data, fall back to path parsing
      if (!show) {
        // Try to match 'TV-SHOWS/Show/Season 01/Show S01E02 ...'
        let match = path.match(
          /TV-?SHOWS[\\/](.*?)[\\/].*?[Ss](\d{2})[Ee](\d{2})/i
        );
        if (match) {
          const folderName = match[1].replace(/_/g, " ").trim();
          // Extract year from folder name
          const yearMatch = folderName.match(/\((\d{4})\)/);
          if (yearMatch) {
            year = yearMatch[1];
            show = folderName.replace(/\s*\(\d{4}\)\s*$/, "").trim();
          } else {
            show = folderName;
          }
          code = `S${match[2]}E${match[3]}`;
        } else {
          // Fallback: try to extract from filename
          if (!path || typeof path !== 'string') return { show: null, code: null };
          let file = path.split(/[\\/]/).pop();
          let epMatch = file.match(/[Ss](\d{2})[Ee](\d{2})/i);
          if (epMatch) {
            code = `S${epMatch[1]}E${epMatch[2]}`;
          }
          // Try to get show from parent folder
          let parts = path.split(/[\\/]/);
          if (parts.length > 2) {
            const folderName = parts[parts.length - 3]
              .replace(/_/g, " ")
              .trim();
            const yearMatch = folderName.match(/\((\d{4})\)/);
            if (yearMatch) {
              year = yearMatch[1];
              show = folderName.replace(/\s*\(\d{4}\)\s*$/, "").trim();
            } else {
              show = folderName;
            }
          }
        }
      }
      // If we have show name but no episode code, try to extract from filename
      if (show && !code && path && typeof path === 'string') {
        const filename = path.split(/[\\/]/).pop() || "";
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
          .replace(/\./g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ");
      };
      // Build the label with year if available
      if (show && code) {
        const capitalizedShow = capitalizeShowName(show);
        const finalLabel = year
          ? `${capitalizedShow} (${year}): ${code}`
          : `${capitalizedShow}: ${code}`;
        return finalLabel;
      } else if (show) {
        // If we have show name but no episode code, just show the show with year
        const capitalizedShow = capitalizeShowName(show);
        const finalLabel = year
          ? `${capitalizedShow} (${year})`
          : capitalizedShow;
        return finalLabel;
      }
      const fallbackLabel = item.title || item.name || "Episode";
      return fallbackLabel;
    };

    
    function getMoviePosterSimple(item, self) {
      // console.log('[DEBUG - WATCH-LATER] Processing movie item:', item);
      // console.log('[DEBUG - WATCH-LATER] Movie item data:', item);
      
      // UPDATED: Use the unified data structure instead of old moviePosters
      if (self.unifiedData) {
        // console.log('[DEBUG - WATCH-LATER] Using unified data for movie poster lookup');
        
        let path = decodeURIComponent(item.path || item.filePath || "");
        // console.log('[DEBUG - WATCH-LATER] Movie path:', path);
        
        // Strategy 1: Try to find movie in unified data by path
        for (const key in self.unifiedData) {
          const mediaItem = self.unifiedData[key];
          if (mediaItem.isMovie && mediaItem.path === path) {
            console.log('[DEBUG - WATCH-LATER] Found movie in unified data by path:', mediaItem.poster);
            return mediaItem.poster || "/assets/img/placeholder-poster.jpg";
          }
        }
        
        // Strategy 2: Extract movie name and try normalized lookup
        let movieMatch = path.match(/MOVIES[\\/]([^\\\/]+)/i);
        if (movieMatch) {
          let movieName = movieMatch[1].trim();
          console.log('[DEBUG - WATCH-LATER] Extracted movie name:', movieName);
          
          // Try to find by movie name in unified data
          for (const key in self.unifiedData) {
            const mediaItem = self.unifiedData[key];
            if (mediaItem.isMovie && mediaItem.title && mediaItem.title.toLowerCase().includes(movieName.toLowerCase())) {
              console.log('[DEBUG - WATCH-LATER] Found movie in unified data by name match:', mediaItem.poster);
              return mediaItem.poster || "/assets/img/placeholder-poster.jpg";
            }
          }
        }
        
        // Strategy 3: Try using item.title if available
        if (item.title) {
          for (const key in self.unifiedData) {
            const mediaItem = self.unifiedData[key];
            if (mediaItem.isMovie && mediaItem.title && mediaItem.title.toLowerCase() === item.title.toLowerCase()) {
              console.log('[DEBUG - WATCH-LATER] Found movie in unified data by title match:', mediaItem.poster);
              return mediaItem.poster || "/assets/img/placeholder-poster.jpg";
            }
          }
        }
        
        // Strategy 4: Try using item.normalizedKey if available
        if (item.normalizedKey) {
          if (self.unifiedData[item.normalizedKey] && self.unifiedData[item.normalizedKey].isMovie) {
            console.log('[DEBUG - WATCH-LATER] Found movie in unified data by normalizedKey:', self.unifiedData[item.normalizedKey].poster);
            return self.unifiedData[item.normalizedKey].poster || "/assets/img/placeholder-poster.jpg";
          }
        }
      } else {
        console.log('[DEBUG - WATCH-LATER] No unified data available');
      }
      
      console.log('[DEBUG - WATCH-LATER] No movie poster found, using placeholder');
      return "/assets/img/placeholder-poster.jpg";
    }
    // Main flex container
    let html = `
        <div class="watch-later-flex-container">
            <div class="watch-later-content">
                <div class="watch-later-column">
                    <div class="watch-later-section-title">Movies</div>
                    <hr class="watch-later-section-divider">
                    <div class="watch-later-scroll">
                        <div class="watch-later-grid">
                            ${finalMovies
                              .map(
                                (item) => `
                                <div class="media-library-movie-card-movies watch-later-card" data-path="${item.path}">
                                    <img class="watch-later-img-movie watch-later-img watch-later-img-clickable" src="${getMoviePosterSimple(item, this)}" alt="${item.title}">
                                    ${item.lastWatched ? `<div class="watch-later-timestamp">Last watched: ${this.formatDateTime(item.lastWatched)}<br><span class=\"watch-later-resume-info\">Resume from ${this.formatTime(item.currentTime)}</span></div>` : ""}
                                                                    <div class="media-info"><h3 class="watch-later-title">${(() => {
                                  // Use the EXACT SAME priority order as main Movies tab and Favorites
                                  let displayTitle = "";
                                  
                                  // PRIORITY 1: TMDBTitle (from movies-unified.json)
                                  if (item.TMDBTitle) {
                                    displayTitle = item.TMDBTitle;
                                    console.log(`[WATCH-LATER DISPLAY] Using TMDBTitle "${item.TMDBTitle}" -> "${displayTitle}"`);
                                  }
                                  // PRIORITY 2: normalizedKey (convert to readable format)
                                  else if (item.normalizedKey) {
                                    displayTitle = this.humanizeMovieTitle(item.normalizedKey);
                                    console.log(`[WATCH-LATER DISPLAY] Using normalizedKey "${item.normalizedKey}" -> "${displayTitle}"`);
                                  }
                                  // PRIORITY 3: title (if not corrupted)
                                  else if (item.title && item.title !== "S:" && item.title !== item.path) {
                                    displayTitle = item.title;
                                    console.log(`[WATCH-LATER DISPLAY] Using item.title "${item.title}" -> "${displayTitle}"`);
                                  }
                                  // PRIORITY 4: name field
                                  else if (item.name) {
                                    displayTitle = item.name;
                                    console.log(`[WATCH-LATER DISPLAY] Using item.name "${item.name}" -> "${displayTitle}"`);
                                  }
                                  // PRIORITY 5: filename (extract from path)
                                  else if (item.filename) {
                                    displayTitle = item.filename.replace(/\.[^/.]+$/, ''); // Remove extension
                                    console.log(`[WATCH-LATER DISPLAY] Using item.filename "${item.filename}" -> "${displayTitle}"`);
                                  }
                                  // PRIORITY 6: Extract from path as last resort
                                  else if (item.path) {
                                    // Extract movie name from path - get the folder name containing the movie
                                    const pathParts = item.path.split(/[\\/]/);
                                    let movieName = "";
                                    
                                    // Look for the movie folder (usually the last folder before the filename)
                                    for (let i = pathParts.length - 2; i >= 0; i--) {
                                      const part = pathParts[i];
                                      if (part && part !== "movies" && part !== "movie" && !part.includes(".")) {
                                        movieName = part;
                                        break;
                                      }
                                    }
                                    
                                    if (movieName) {
                                      // Clean up the movie name
                                      displayTitle = movieName
                                        .replace(/\([^)]*\)/g, '') // Remove parentheses content
                                        .replace(/\[[^\]]*\]/g, '') // Remove bracket content
                                        .replace(/\s+/g, ' ') // Clean up spaces
                                        .trim();
                                      console.log(`[WATCH-LATER DISPLAY] Extracted from path "${item.path}" -> "${movieName}" -> "${displayTitle}"`);
                                    } else {
                                      // Fallback to filename without extension
                                      const filename = pathParts[pathParts.length - 1];
                                      displayTitle = filename.replace(/\.[^/.]+$/, '');
                                      console.log(`[WATCH-LATER DISPLAY] Using filename from path "${item.path}" -> "${filename}" -> "${displayTitle}"`);
                                    }
                                  }
                                  // PRIORITY 7: Ultimate fallback
                                  else {
                                    displayTitle = "Movie";
                                    console.log(`[WATCH-LATER DISPLAY] Using ultimate fallback -> "${displayTitle}"`);
                                  }
                                  
                                  return displayTitle;
                                })()}</h3></div>
                                    <div class="watch-later-btn-row">
                                        <button class="watch-later-resume-btn">Watch</button>
                                        <button class="watch-later-delete-btn">🗑️</button>
                                    </div>
                                </div>
                            `
                              )
                              .join("")}
                        ${finalMovies.length === 0 ? '<div class="watch-later-empty">(No items)</div>' : ""}
                        </div>
                    </div>
                </div>
                <div class="watch-later-column-tvshows">
                    <div class="watch-later-section-title">TV-Shows</div>
                    <hr class="watch-later-section-divider">
                    <div class="watch-later-scroll-tvshows">
                        <div class="watch-later-tv-grid">
                                        ${finalTVShows
                                          .map((item) => {
                                            // Use the EXACT SAME method as main TV-SHOWS tab - get episode object directly
                                            const episodeObj =
                                              this.getEpisodeObjectFromPath(
                                                item.path
                                              );
                                            console.log(
                                              "[DEBUG - TV-RENDER] Processing TV item:",
                                              item.title,
                                              "path:",
                                              item.path,
                                              "episodeObj found:",
                                              !!episodeObj
                                            );
                                            console.log(
                                              "[DEBUG - TV-RENDER] Item details:",
                                              {
                                                title: item.title,
                                                path: item.path,
                                                type: item.type,
                                                lastWatched: item.lastWatched,
                                              }
                                            );
                                            if (!episodeObj) {
                                              console.error(
                                                "[ERROR - TV-RENDER] Cannot render TV show without episode object:",
                                                item.title,
                                                "path:",
                                                item.path
                                              );
                                              return ""; // Skip this item - it's corrupted
                                            }
                                            // Create the EXACT SAME HTML structure as main TV-SHOWS tab
                                            const episodeData = JSON.stringify(
                                              episodeObj
                                            )
                                              .replace(/"/g, "&quot;")
                                              .replace(/\n/g, "\\n")
                                              .replace(/\r/g, "\\r");
                                            
                                                // Debug thumbnail generation
    const thumbnailSrc = this.getTvShowScreenshot(item);
    console.log("[DEBUG - THUMBNAIL] ==========================================");
    console.log("[DEBUG - THUMBNAIL] Generating thumbnail for:", item.title);
    console.log("[DEBUG - THUMBNAIL] Item path:", item.path);
    console.log("[DEBUG - THUMBNAIL] Item type:", item.type);
    console.log("[DEBUG - THUMBNAIL] Episode object:", episodeObj);
    console.log("[DEBUG - THUMBNAIL] Episode object type:", typeof episodeObj);
    console.log("[DEBUG - THUMBNAIL] Episode object keys:", episodeObj ? Object.keys(episodeObj) : 'null');
    console.log("[DEBUG - THUMBNAIL] Thumbnail result:", thumbnailSrc);
    console.log("[DEBUG - THUMBNAIL] ==========================================");
                                            
                                            return `<div class="media-library-card episode watch-later-card" data-episode="${episodeData}" data-resume-time="${item.currentTime || 0}">
                        <div class="media-library-card-poster">
                            <img src="${thumbnailSrc}" alt="${this.getTvShowLabel(item)}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                            <div class="media-library-play-overlay">▶</div>
                        </div>
                        <div class="media-library-card-info">
                            <h3 class="tvshow-season-episode-name">${this.getTvShowLabel(item)}</h3>
                            ${item.lastWatched ? `<div class="watch-later-timestamp">Last watched: ${this.formatDateTime(item.lastWatched)}<br><span class="watch-later-resume-info">Resume from ${this.formatTime(item.currentTime)}</span></div>` : ""}
                        </div>
                        <div class="watch-later-btn-row-tvshows">
                            <button class="watch-later-resume-btn">Watch</button>
                            <button class="watch-later-delete-btn">🗑️</button>
                        </div>
                    </div>`;
                                          })
                                          .join("")}
                        ${finalTVShows.length === 0 ? '<div class="watch-later-empty">(No items)</div>' : ""}
                    </div>
                </div>
            </div>
        </div>
        `;

    
    // Update the modal content if the modal is open
    const mediaGrid = document.getElementById("mediaGrid");
    if (mediaGrid) {
      mediaGrid.innerHTML = html;
      // Event handlers are now attached by attachWatchLaterHandlers() method
    }
    return html;
  }
  
  // === SYNC AND REFRESH METHODS ===
  
  /**
   * Sync current Watch Later data to MongoDB
   * Pushes all current localStorage data to MongoDB with unified structure
   */
  async syncWatchLaterToMongoDB() {
    try {
      console.log('📤 [SYNC-TO-MONGODB] Starting sync to MongoDB...');
      
      // Disable the sync button to prevent multiple clicks
      const syncBtn = document.querySelector('.watch-later-sync-btn');
      if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.textContent = '⏳';
        syncBtn.title = 'Syncing...';
      }
      
      // Get current Watch Later data from localStorage
      const watchLaterData = JSON.parse(localStorage.getItem('mediaLibraryResumeList') || '[]');
      console.log(`📊 [SYNC-TO-MONGODB] Found ${watchLaterData.length} items in localStorage`);
      
      if (watchLaterData.length === 0) {
        this.showToast('No Watch Later items found in localStorage to sync.', 'warning');
        return;
      }
      
      let successCount = 0;
      let errors = [];
      
      // Sync each item to MongoDB
      for (const item of watchLaterData) {
        try {
          const response = await fetch('/api/watch-later/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
          });
          
          if (response.ok) {
            console.log(`✅ [SYNC-TO-MONGODB] Synced: ${item.title}`);
            successCount++;
          } else {
            const errorText = await response.text();
            const errorMsg = `Failed to sync "${item.title}": ${response.status} - ${errorText}`;
            console.error(`❌ [SYNC-TO-MONGODB] ${errorMsg}`);
            errors.push(errorMsg);
          }
        } catch (error) {
          const errorMsg = `Error syncing "${item.title}": ${error.message}`;
          console.error(`❌ [SYNC-TO-MONGODB] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
      
      // Show results with detailed error information
      let message = `Sync completed!\n✅ Successfully synced: ${successCount}`;
      
      if (errors.length > 0) {
        message += `\n❌ Errors: ${errors.length}`;
        
        // If there are errors, show them in a more detailed way
        if (errors.length <= 3) {
          // Show all errors if 3 or fewer
          message += '\n\nError details:';
          errors.forEach((error, index) => {
            message += `\n${index + 1}. ${error}`;
          });
        } else {
          // Show first 3 errors and indicate there are more
          message += '\n\nFirst 3 errors:';
          errors.slice(0, 3).forEach((error, index) => {
            message += `\n${index + 1}. ${error}`;
          });
          message += `\n... and ${errors.length - 3} more (check console for full details)`;
        }
        
        // Also log all errors to console for full debugging
        console.error('📋 [SYNC-TO-MONGODB] All sync errors:', errors);
      }
      
      // Show sync result with manual dismissal for better error review
      this.showSyncResultModal(message, errors.length > 0 ? 'warning' : 'success');
      
      console.log(`📊 [SYNC-TO-MONGODB] Sync completed: ${successCount} success, ${errors.length} errors`);
      
    } catch (error) {
      console.error('❌ [SYNC-TO-MONGODB] Error:', error);
      // Show sync error with manual dismissal for better error review
      this.showSyncResultModal('Error syncing to MongoDB: ' + error.message, 'error');
    } finally {
      // Re-enable the sync button
      const syncBtn = document.querySelector('.watch-later-sync-btn');
      if (syncBtn) {
        syncBtn.disabled = false;
        syncBtn.textContent = '➡️';
        syncBtn.title = 'Sync to MongoDB';
      }
    }
  }
  
  /**
   * Show sync result modal that requires manual dismissal for better error review
   */
  showSyncResultModal(message, type = 'info') {
    // Remove any existing sync result modal
    const existingModal = document.getElementById('syncResultModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'syncResultModal';
    modal.className = 'sync-result-modal';

    // Determine icon based on type
    let icon;
    switch (type) {
      case 'success':
        icon = '✅';
        break;
      case 'warning':
        icon = '⚠️';
        break;
      case 'error':
        icon = '❌';
        break;
      default:
        icon = 'ℹ️';
    }

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = `sync-result-modal-content ${type}`;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.className = 'sync-result-modal-close';

    // Create content HTML
    modalContent.innerHTML = `
      <div class="sync-result-modal-header">
        <div class="sync-result-modal-icon ${type}">
          ${icon}
        </div>
        <div style="flex: 1;">
          <h3 class="sync-result-modal-title ${type}">
            MongoDB Sync Result
          </h3>
          <div class="sync-result-modal-message">
            ${message}
          </div>
        </div>
      </div>
      <div class="sync-result-modal-footer">
        <button id="syncResultOkBtn" class="sync-result-modal-ok-btn ${type}">
          OK
        </button>
      </div>
    `;

    // Add close button to modal content
    modalContent.appendChild(closeBtn);

    // Add modal content to modal
    modal.appendChild(modalContent);

    // Add modal to page
    document.body.appendChild(modal);

    // Close modal function
    const closeModal = () => {
      modal.remove();
    };

    // Event listeners for closing
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // OK button
    const okBtn = modalContent.querySelector('#syncResultOkBtn');
    okBtn.addEventListener('click', closeModal);

    // Allow ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        console.log("[DEBUG] ESC key pressed - returning to grid");
        try {
          this.renderMediaGrid();
        } catch (error) {
          console.error("[DEBUG] Error in renderMediaGrid from ESC:", error);
          this.closeModal();
        }
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  /**
   * Refresh Watch Later data from MongoDB
   * Pulls all data from MongoDB and updates localStorage and UI
   */

  
      // Helper method for TV show labels
    getTvShowLabel(item) {
      let path = decodeURIComponent(item.path || "");
      console.log("[DEBUG - TV-LABEL] getTvShowLabel called with path:", path);
      console.log("[DEBUG - TV-LABEL] tvShowsData available:", this.tvShowsData ? 'YES' : 'NO');
      if (this.tvShowsData) {
        console.log("[DEBUG - TV-LABEL] tvShowsData type:", typeof this.tvShowsData);
        if (Array.isArray(this.tvShowsData)) {
          console.log("[DEBUG - TV-LABEL] tvShowsData is array with", this.tvShowsData.length, "items");
          console.log("[DEBUG - TV-LABEL] First few show names:", this.tvShowsData.slice(0, 3).map(s => s.name || s.path));
        } else if (typeof this.tvShowsData === "object") {
          console.log("[DEBUG - TV-LABEL] tvShowsData is object with keys:", Object.keys(this.tvShowsData).slice(0, 5));
        }
      }
      
      // Try to extract show name and SxxExx
      let show = "",
        code = "",
        year = "";
    
    // First, try to find the show data from the JSON to get the year
    // Handle both array and object formats for tvShowsData
    let tvShowsArray = [];
    if (Array.isArray(this.tvShowsData)) {
      tvShowsArray = this.tvShowsData;
    } else if (typeof this.tvShowsData === "object" && this.tvShowsData) {
      tvShowsArray = Object.values(this.tvShowsData);
    }
    
    if (tvShowsArray.length > 0) {
      for (const tvShow of tvShowsArray) {
        // Check if this episode belongs to this show by matching the path
        if (tvShow.folders) {
          for (const season of tvShow.folders) {
            if (season.files) {
              for (const episode of season.files) {
                const epPath = (episode.relPath || episode.path || "")
                  .replace(/\\/g, "/")
                  .trim();
                const searchPath = path.replace(/\\/g, "/").trim();
                if (epPath === searchPath) {
                  // Found the show! Extract year from the normalizedKey
                  if (tvShow.normalizedKey) {
                    const yearMatch = tvShow.normalizedKey.match(/\((\d{4})\)/);
                    if (yearMatch) {
                      year = yearMatch[1];
                    }
                    // Extract show name from normalizedKey (remove the year part)
                    show = tvShow.normalizedKey
                      .replace(/\.\(\d{4}\)$/, "")
                      .replace(/\./g, " ")
                      .trim();
                  } else {
                    // Fallback to path parsing if no normalizedKey
                    const yearMatch = tvShow.path.match(/\((\d{4})\)/);
                    if (yearMatch) {
                      year = yearMatch[1];
                    }
                    show = tvShow.path.replace(/\s*\(\d{4}\)\s*$/, "").trim();
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
    }
    
    // If we didn't find the show in JSON data, fall back to path parsing
    if (!show) {
      // Try to match 'TV-SHOWS/Show/Season 01/Show S01E02 ...'
      let match = path.match(
        /TV-?SHOWS[\\/](.*?)[\\/].*?[Ss](\d{2})[Ee](\d{2})/i
      );
      if (match) {
        const folderName = match[1].replace(/_/g, " ").trim();
        // Extract year from folder name
        const yearMatch = folderName.match(/\((\d{4})\)/);
        if (yearMatch) {
          year = yearMatch[1];
          show = folderName.replace(/\s*\(\d{4}\)\s*$/, "").trim();
        } else {
          show = folderName;
        }
        code = `S${match[2]}E${match[3]}`;
      } else {
        // Fallback: try to extract from filename
        if (!path || typeof path !== 'string') return { show: null, code: null };
        let file = path.split(/[\\/]/).pop();
        let epMatch = file.match(/[Ss](\d{2})[Ee](\d{2})/i);
        if (epMatch) {
          code = `S${epMatch[1]}E${epMatch[2]}`;
        }
        // Try to get show from parent folder
        let parts = path.split(/[\\/]/);
        if (parts.length > 2) {
          const folderName = parts[parts.length - 3]
            .replace(/_/g, " ")
            .trim();
          const yearMatch = folderName.match(/\((\d{4})\)/);
          if (yearMatch) {
            year = yearMatch[1];
            show = folderName.replace(/\s*\(\d{4}\)\s*$/, "").trim();
          } else {
            show = folderName;
          }
        }
      }
    }
    
    // If we have show name but no episode code, try to extract from filename
    if (show && !code && path && typeof path === 'string') {
      const filename = path.split(/[\\/]/).pop() || "";
      const epMatch = filename.match(/[Ss](\d{2})[Ee](\d{2})/i);
      if (epMatch) {
        code = `S${epMatch[1]}E${epMatch[2]}`;
      }
    }
    
    // Capitalize the show name properly
    const capitalizeShowName = (showName) => {
      if (!showName) return showName;
      // Replace dots with spaces and capitalize each word
      return showName
        .replace(/\./g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    };
    
    // Build the label with year if available
    if (show && code) {
      const capitalizedShow = capitalizeShowName(show);
      const finalLabel = year
        ? `${capitalizedShow} (${year}): ${code}`
        : `${capitalizedShow}: ${code}`;
      return finalLabel;
    } else if (show) {
      // If we have show name but no episode code, just show the show with year
      const capitalizedShow = capitalizeShowName(show);
      const finalLabel = year
        ? `${capitalizedShow} (${year})`
        : capitalizedShow;
      return finalLabel;
    }
    
    const fallbackLabel = item.title || item.name || "Episode";
    return fallbackLabel;
  }
  
      // Helper method for TV show screenshots
    getTvShowScreenshot(item) {
      console.log('🔍 [TV-IMAGE-DEBUG] ==========================================');
      console.log('🔍 [TV-IMAGE-DEBUG] TV Show Image Lookup Debug');
      console.log('🔍 [TV-IMAGE-DEBUG] ==========================================');
      console.log('🔍 [TV-IMAGE-DEBUG] Item:', item);
      
            // SIMPLIFIED: Find the SPECIFIC EPISODE image from unified JSON data
      if (this.unifiedData) {
        let path = decodeURIComponent(item.path || item.filePath || "");
        console.log('🔍 [TV-IMAGE-DEBUG] Path:', path);
        console.log('🔍 [TV-IMAGE-DEBUG] Available shows:', Object.keys(this.unifiedData).slice(0, 5));
        console.log('🔍 [TV-IMAGE-DEBUG] Item data:', item);
        console.log('🔍 [TV-IMAGE-DEBUG] Self unifiedData keys:', Object.keys(this.unifiedData));
        console.log('🔍 [TV-IMAGE-DEBUG] Total shows in unifiedData:', Object.keys(this.unifiedData).length);
        
        // Debug: Check what's in the first few shows to see thumbnail availability
        const firstShowKey = Object.keys(this.unifiedData)[0];
        if (firstShowKey) {
          const firstShow = this.unifiedData[firstShowKey];
          console.log('🔍 [TV-IMAGE-DEBUG] Sample show structure for:', firstShowKey);
          console.log('🔍 [TV-IMAGE-DEBUG] Show keys:', Object.keys(firstShow));
          if (firstShow.seasons) {
            const firstSeasonKey = Object.keys(firstShow.seasons)[0];
            if (firstSeasonKey) {
              const firstSeason = firstShow.seasons[firstSeasonKey];
              console.log('🔍 [TV-IMAGE-DEBUG] Sample season structure for season:', firstSeasonKey);
              console.log('🔍 [TV-IMAGE-DEBUG] Season keys:', Object.keys(firstSeason));
              if (firstSeason.episodes) {
                const firstEpisodeKey = Object.keys(firstSeason.episodes)[0];
                if (firstEpisodeKey) {
                  const firstEpisode = firstSeason.episodes[firstEpisodeKey];
                  console.log('🔍 [TV-IMAGE-DEBUG] Sample episode structure for episode:', firstEpisodeKey);
                  console.log('🔍 [TV-IMAGE-DEBUG] Episode keys:', Object.keys(firstEpisode));
                  console.log('🔍 [TV-IMAGE-DEBUG] Episode still field:', firstEpisode.still);
                }
              }
            }
          }
        }
      
      // Handle both normalized paths (lost.(2004)/season.01/lost.s01e02.pilot.mkv) 
      // and human-readable paths (TV-SHOWS/Show Name/Season 01/Show S01E02...)
      let showName = null, seasonNum = null, episodeNum = null;
      
      // Try normalized path format first (e.g., "lost.(2004)/season.01/lost.s01e02.pilot.mkv")
      let normalizedMatch = path.match(/^([^\/]+)\/season\.(\d+)\/.*?[Ss](\d+)[Ee](\d+)/i);
      if (normalizedMatch) {
        showName = normalizedMatch[1].trim();
        seasonNum = parseInt(normalizedMatch[2], 10);
        episodeNum = parseInt(normalizedMatch[4], 10);
        console.log('🔍 [TV-IMAGE-DEBUG] ✅ Normalized path match:', { showName, seasonNum, episodeNum });
      } else {
        // Try human-readable path format (e.g., "TV-SHOWS/Show Name/Season 01/Show S01E02...")
        let humanMatch = path.match(/TV-?SHOWS[\\/]([^\\\/]+)[\\/]Season[ _-]?(\d+)[\\/].*?[Ss](\d+)[Ee](\d+)/i);
        if (humanMatch) {
          showName = humanMatch[1].trim();
          seasonNum = parseInt(humanMatch[2], 10);
          episodeNum = parseInt(humanMatch[4], 10);
          console.log('🔍 [TV-IMAGE-DEBUG] ✅ Human-readable path match:', { showName, seasonNum, episodeNum });
        } else {
          // Try the format: "Show Name (Year)/Season XX/Show SXXEXX..."
          let showSeasonMatch = path.match(/^([^\/]+)\/Season[ _-]?(\d+)[\\/].*?[Ss](\d+)[Ee](\d+)/i);
          if (showSeasonMatch) {
            showName = showSeasonMatch[1].trim();
            seasonNum = parseInt(showSeasonMatch[2], 10);
            episodeNum = parseInt(showSeasonMatch[4], 10);
            console.log('🔍 [TV-IMAGE-DEBUG] ✅ Show/Season path match:', { showName, seasonNum, episodeNum });
          } else {
            // Try the format: "Show Name (Year)/Season XX/Show Name SXXEXX..."
            let showSeasonNameMatch = path.match(/^([^\/]+)\/Season[ _-]?(\d+)[\\/]([^\/]+)[ _-]S(\d+)E(\d+)/i);
            if (showSeasonNameMatch) {
              showName = showSeasonNameMatch[1].trim();
              seasonNum = parseInt(showSeasonNameMatch[2], 10);
              episodeNum = parseInt(showSeasonNameMatch[5], 10);
              console.log('🔍 [TV-IMAGE-DEBUG] ✅ Show/Season/Name path match:', { showName, seasonNum, episodeNum });
            } else {
              // Try the format: "Show Name (Year)/Season XX/Show Name - SXXEXX - Episode Title.mp4"
              let showSeasonEpisodeMatch = path.match(/^([^\/]+)\/Season[ _-]?(\d+)[\\/].*?[ _-]S(\d+)E(\d+)/i);
              if (showSeasonEpisodeMatch) {
                showName = showSeasonEpisodeMatch[1].trim();
                seasonNum = parseInt(showSeasonEpisodeMatch[2], 10);
                episodeNum = parseInt(showSeasonEpisodeMatch[4], 10);
                console.log('🔍 [TV-IMAGE-DEBUG] ✅ Show/Season/Episode path match:', { showName, seasonNum, episodeNum });
              } else {
                // Final fallback: try to extract just the show name from the first part of the path
                let pathParts = path.split(/[\\\/]/);
                if (pathParts.length > 0) {
                  showName = pathParts[0].trim();
                  console.log('🔍 [TV-IMAGE-DEBUG] 🔄 Fallback: extracted show name from path:', showName);
                }
              }
            }
          }
        }
      }
      
      if (showName && seasonNum && episodeNum) {
        console.log('🔍 [TV-IMAGE-DEBUG] Extracted:', { showName, seasonNum, episodeNum });
        
        // NORMALIZE the show name to match unified data keys
        let normalizedShowName = window.normalizeKey ? window.normalizeKey(showName) : (showName && typeof showName === 'string' ? showName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.()]/g, '') : '');
        console.log('🔍 [TV-IMAGE-DEBUG] Normalized show name:', normalizedShowName);
        
        // Look for this specific episode in unified data (try both original and normalized)
        let showData = this.unifiedData[showName] || this.unifiedData[normalizedShowName];
        console.log('🔍 [TV-IMAGE-DEBUG] Looking for show with keys:', [showName, normalizedShowName]);
        console.log('🔍 [TV-IMAGE-DEBUG] Available keys in unifiedData:', Object.keys(this.unifiedData));
        if (showData) {
          console.log('🔍 [TV-IMAGE-DEBUG] ✅ Show found:', showName);
          console.log('🔍 [TV-IMAGE-DEBUG] Show data keys:', Object.keys(showData));
          
          // Look for the specific season
          console.log('🔍 [TV-IMAGE-DEBUG] Looking for season:', seasonNum, 'in show data');
          console.log('🔍 [TV-IMAGE-DEBUG] Available seasons:', Object.keys(showData.seasons));
          for (const seasonKey in showData.seasons) {
            const seasonData = showData.seasons[seasonKey];
            // The seasonKey is a string like "1", "2", etc., so convert to number for comparison
            const seasonKeyNum = parseInt(seasonKey, 10);
            console.log('🔍 [TV-IMAGE-DEBUG] Checking season key:', seasonKey, '->', seasonKeyNum, 'vs', seasonNum);
            if (seasonKeyNum === seasonNum) {
              console.log('🔍 [TV-IMAGE-DEBUG] ✅ Season found:', seasonNum);
              
              // Look for the specific episode
              console.log('🔍 [TV-IMAGE-DEBUG] Looking for episode:', episodeNum, 'in season data');
              console.log('🔍 [TV-IMAGE-DEBUG] Available episodes:', Object.keys(seasonData.episodes));
              for (const episodeKey in seasonData.episodes) {
                const episodeData = seasonData.episodes[episodeKey];
                // The episodeKey is a string like "1", "2", etc., so convert to number for comparison
                const episodeKeyNum = parseInt(episodeKey, 10);
                console.log('🔍 [TV-IMAGE-DEBUG] Checking episode key:', episodeKey, '->', episodeKeyNum, 'vs', episodeNum);
                if (episodeKeyNum === episodeNum) {
                  console.log('🔍 [TV-IMAGE-DEBUG] ✅ Episode found:', episodeNum);
                  console.log('🔍 [TV-IMAGE-DEBUG] Episode data:', episodeData);
                  
                                      // Check for thumbnail in the 'still' field (which is the actual thumbnail path)
                    if (episodeData.still && episodeData.still !== "/assets/img/placeholder-poster.jpg") {
                      console.log('🔍 [TV-IMAGE-DEBUG] 🎯 THUMBNAIL FOUND:', episodeData.still);
                      return episodeData.still;
                    } else {
                      console.log('🔍 [TV-IMAGE-DEBUG] ❌ No valid thumbnail in episode data:', episodeData.still);
                      console.log('🔍 [TV-IMAGE-DEBUG] Episode data keys:', Object.keys(episodeData));
                      console.log('🔍 [TV-IMAGE-DEBUG] Full episode data:', episodeData);
                    }
                }
              }
            }
          }
          
          // Fallback: any episode thumbnail from this show
          for (const seasonKey in showData.seasons) {
            for (const episodeKey in showData.seasons[seasonKey].episodes) {
              const episodeData = showData.seasons[seasonKey].episodes[episodeKey];
              if (episodeData.still && episodeData.still !== "/assets/img/placeholder-poster.jpg") {
                console.log('🔍 [TV-IMAGE-DEBUG] 🔄 Fallback thumbnail:', episodeData.still);
                return episodeData.still;
              }
            }
          }
          
          // Final fallback: show poster
          if (showData.poster) {
            console.log('🔍 [TV-IMAGE-DEBUG] 🎭 Show poster fallback:', showData.poster);
            return showData.poster;
          }
        } else {
          console.log('🔍 [TV-IMAGE-DEBUG] ❌ Show NOT found:', showName);
        }
      } else {
        console.log('🔍 [TV-IMAGE-DEBUG] ❌ Path regex failed - could not extract show/season/episode from:', path);
      }
      
      // Safety check: ensure showName is defined
      if (!showName) {
        console.log('🔍 [TV-IMAGE-DEBUG] ⚠️ Show name not extracted, using path fallback');
        let pathParts = path.split(/[\\\/]/);
        if (pathParts.length > 0) {
          showName = pathParts[0].trim();
          console.log('🔍 [TV-IMAGE-DEBUG] 🔄 Safety fallback: extracted show name from path:', showName);
        }
      }
    } else {
      console.log('🔍 [TV-IMAGE-DEBUG] ❌ No unifiedData available');
    }
    
          console.log('🔍 [TV-IMAGE-DEBUG] ❌ No thumbnail found in unified data');
      
      // Try to find any show poster as a fallback
      if (this.tvShowsData) {
        let showsArray = [];
        if (Array.isArray(this.tvShowsData)) {
          showsArray = this.tvShowsData;
        } else if (typeof this.tvShowsData === "object" && this.tvShowsData) {
          showsArray = Object.values(this.tvShowsData);
        }
        
        // Look for the SPECIFIC show poster, not just any show poster
        if (showName) {
          // Try to find the specific show by name
        for (const show of showsArray) {
            const showPath = (show.path && typeof show.path === 'string' ? show.path : "").toLowerCase();
            const showNameLower = (showName && typeof showName === 'string' ? showName : "").toLowerCase();
            
            // Check if this show matches the requested show name
            if (showPath.includes(showNameLower) || 
                showNameLower.includes(showPath.replace(/[^a-z0-9]/g, '')) ||
                (show.normalizedKey && show.normalizedKey.toLowerCase().includes(showNameLower.replace(/[^a-z0-9]/g, '')))) {
              
          if (show.poster && show.poster !== "/assets/img/placeholder-poster.jpg") {
                console.log('🔍 [TV-IMAGE-DEBUG] 🔄 Using SPECIFIC show poster fallback:', show.poster, 'for show:', showName);
            return show.poster;
          }
        }
          }
        } else {
          console.log('🔍 [TV-IMAGE-DEBUG] ❌ No show name extracted from path, cannot search for specific show poster');
        }
        
        // Only if we can't find the specific show, try a generic fallback
        console.log('🔍 [TV-IMAGE-DEBUG] ❌ No specific show poster found, using placeholder instead of random show poster');
      }
      
      console.log('🔍 [TV-IMAGE-DEBUG] ❌ No fallback thumbnail found - using placeholder');
      return "/assets/img/placeholder-poster.jpg";
    }
  
  // Helper method to update Watch Later grid content
  updateWatchLaterGrid() {
    if (this.currentTab === "watchlater") {
      const grid = document.getElementById("mediaGrid");
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
      document.querySelectorAll(".watch-later-delete-btn").forEach((btn) => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          console.log("[WATCH-LATER-DELETE] Delete button clicked");
          // Use .watch-later-card to match both movie and tvshow cards
          const card = btn.closest(".watch-later-card");
          let path = null;
          console.log("[WATCH-LATER-DELETE] Card found:", !!card);
          if (card) {
            console.log("[WATCH-LATER-DELETE] Card classes:", card.className);
            // For movies, get path from data-path attribute
            path = card.getAttribute("data-path");
            console.log(
              "[WATCH-LATER-DELETE] Movie path from data-path:",
              path
            );
            // For TV shows, extract path from episode data
            if (!path) {
              const episodeData = card.getAttribute("data-episode");
              console.log(
                "[WATCH-LATER-DELETE] Episode data found:",
                !!episodeData
              );
              if (episodeData) {
                try {
                  const episodeObj = JSON.parse(episodeData);
                  path = episodeObj.path;
                  console.log(
                    "[WATCH-LATER-DELETE] TV show path extracted:",
                    path
                  );
                  console.log(
                    "[WATCH-LATER-DELETE] Full episode object:",
                    episodeObj
                  );
                } catch (error) {
                  console.error(
                    "[WATCH-LATER] Error parsing episode data:",
                    error
                  );
                  console.error(
                    "[WATCH-LATER] Raw episode data:",
                    episodeData
                  );
                }
              }
            }
          }
          console.log("[WATCH-LATER-DELETE] Final path for deletion:", path);
          if (path) {
            console.log(
              "[WATCH-LATER-DELETE] Proceeding with deletion of:",
              path
            );
            console.log("[WATCH-LATER-DELETE] Path type:", typeof path);
            console.log("[WATCH-LATER-DELETE] Path length:", path.length);
            console.log(
              "[WATCH-LATER-DELETE] Path contains TV-SHOWS:",
              path.includes("TV-SHOWS")
            );
            // Debug: Show current localStorage content before deletion
            const currentResumeList = JSON.parse(
              localStorage.getItem("mediaLibraryResumeList") || "[]"
            );
            console.log(
              "[WATCH-LATER-DELETE] Current localStorage content:",
              currentResumeList.map((item) => ({
                title: item.title,
                path: item.path,
                type: item.type,
                mediaType: item.mediaType,
              }))
            );
            await this.removeResumeProgress(path);
            // Always refresh the UI after deletion attempt
            setTimeout(() => {
              this.updateWatchLaterGrid();
            }, 100);
            this.showToast("Removed from Watch Later");
          } else {
            console.error("[WATCH-LATER-DELETE] No path found for deletion");
            this.showToast("Error: Could not remove item", "error");
          }
        };
      });
      // Resume handlers for movies
      document
        .querySelectorAll(
          ".media-library-movie-card-movies .watch-later-resume-btn"
        )
        .forEach((btn) => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            const card = btn.closest(".watch-later-card");
            const path = card ? card.getAttribute("data-path") : null;
            if (path) {
              // Get the resume list to find the item
              let resumeList = JSON.parse(
                localStorage.getItem("mediaLibraryResumeList") || "[]"
              );
              const item = resumeList.find(
                (i) =>
                  (i.path || "").replace(/\\/g, "/").toLowerCase().trim() ===
                  (path || "").replace(/\\/g, "/").toLowerCase().trim()
              );
              if (item) {
                this.playMedia(item, item.currentTime || 0);
              }
            }
          };
        });
      // Resume handlers for TV shows
      document
        .querySelectorAll(".media-library-card.episode .watch-later-resume-btn")
        .forEach((btn) => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            const card = btn.closest(".watch-later-card");
            if (card) {
              const resumeTime = card.getAttribute("data-resume-time") || 0;
              // Check if this card has episode data or just a path
              const episodeData = card.getAttribute("data-episode");
              if (episodeData) {
                // Full episode card - use playEpisodeFromDataAttribute
                this.playEpisodeFromDataAttribute(card, parseFloat(resumeTime));
              } else {
                // This should never happen - all TV shows should have episode data
                console.error(
                  "[ERROR - WATCH-LATER] TV show card missing episode data:",
                  card
                );
                this.showToast("Error: TV show data is corrupted", "error");
              }
            }
          };
        });
      // Image click handlers for movies only
      document
        .querySelectorAll(
          ".media-library-movie-card-movies .watch-later-img-clickable"
        )
        .forEach((img) => {
          img.onclick = async (e) => {
            e.stopPropagation();
            const card = img.closest(".watch-later-card");
            const path = card ? card.getAttribute("data-path") : null;
            if (path) {
              // Get the resume list to find the item
              let resumeList = JSON.parse(
                localStorage.getItem("mediaLibraryResumeList") || "[]"
              );
              const item = resumeList.find(
                (i) =>
                  (i.path || "").replace(/\\/g, "/").toLowerCase().trim() ===
                  (path || "").replace(/\\/g, "/").toLowerCase().trim()
              );
              if (item) {
                this.playMedia(item, item.currentTime || 0);
              }
            }
          };
        });
      // Image click handlers for TV shows
      document
        .querySelectorAll(
          ".media-library-card.episode .media-library-card-poster img"
        )
        .forEach((img) => {
          img.onclick = async (e) => {
            e.stopPropagation();
            const card = img.closest(".watch-later-card");
            if (card) {
              const resumeTime = card.getAttribute("data-resume-time") || 0;
              // Check if this card has episode data or just a path
              const episodeData = card.getAttribute("data-episode");
              if (episodeData) {
                // Full episode card - use playEpisodeFromDataAttribute
                this.playEpisodeFromDataAttribute(card, parseFloat(resumeTime));
              } else {
                // This should never happen - all TV shows should have episode data
                console.error(
                  "[ERROR - WATCH-LATER] TV show image missing episode data:",
                  card
                );
                this.showToast("Error: TV show data is corrupted", "error");
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
    return items.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.filename && item.filename.toLowerCase().includes(term)) ||
        (item.path && item.path.toLowerCase().includes(term)) ||
        (item.TMDBTitle && item.TMDBTitle.toLowerCase().includes(term))
    );
  }
  filterByGenre(items, selectedGenre) {
    if (!selectedGenre || selectedGenre === "All Genres") return items;
    const genre = selectedGenre.toLowerCase();
    return items.filter((item) => {
      let itemGenres = [];
      if (this.currentTab === "movies") {
        // For movies, get genres using the existing method
        itemGenres = this.getMovieGenres(item);
      } else if (this.currentTab === "tvshows") {
        // For TV shows, get genres using the TV show method
        itemGenres = this.getTVGenres(item);
      }
      // Check if the selected genre is in the item's genres
      return itemGenres.some(
        (itemGenre) =>
          itemGenre.toLowerCase() === genre ||
          itemGenre.toLowerCase().includes(genre) ||
          genre.includes(itemGenre.toLowerCase())
      );
    });
  }
  formatDateTime(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    // Format: e.g., "Jul 15, 2025 3:17 PM"
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  sortItems(items, sortBy, field = "name") {
    if (!items || items.length === 0) return items;
    return items.slice().sort((a, b) => {
      const aValue = (a[field] || "").toString().toLowerCase();
      const bValue = (b[field] || "").toString().toLowerCase();
      if (sortBy === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }
  closeModal() {
    // Remove the modal from the DOM
    const modal = document.querySelector(".media-library-modal");
    if (modal) modal.remove();
    
    // Remove the overlay from the DOM
    const overlay = document.querySelector(".media-library-overlay");
    if (overlay) overlay.remove();
  }
  // --- FAVORITES LOGIC ---
  // Initialize favorites localStorage if it doesn't exist
  initializeFavoritesStorage() {
    const favs = localStorage.getItem("mediaLibraryFavoritesByType");
    if (!favs) {
      const initialFavs = { movies: [], tvshows: [] };
      localStorage.setItem(
        "mediaLibraryFavoritesByType",
        JSON.stringify(initialFavs)
      );
      // console.log('[DEBUG - FAVORITES] Initialized favorites localStorage');
    }
  }
  // Backup favorites to localStorage
  backupFavorites() {
    const favs = JSON.parse(
      localStorage.getItem("mediaLibraryFavoritesByType") || "{}"
    );
    const backup = {
      timestamp: new Date().toISOString(),
      data: favs,
    };
    localStorage.setItem("mediaLibraryFavoritesBackup", JSON.stringify(backup));
    // console.log('[DEBUG - FAVORITES] Backed up favorites to localStorage');
  }
  // Restore favorites from backup
  restoreFavorites() {
    const backup = localStorage.getItem("mediaLibraryFavoritesBackup");
    if (backup) {
      try {
        const backupData = JSON.parse(backup);
        localStorage.setItem(
          "mediaLibraryFavoritesByType",
          JSON.stringify(backupData.data)
        );
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
      favs = JSON.parse(
        localStorage.getItem("mediaLibraryFavoritesByType") || "{}"
      );
    } catch (error) {
      console.error(
        "[DEBUG - FAVORITES] Failed to read from localStorage in isFavorite:",
        error
      );
      return false;
    }
    
    // Check if path exists in movies array (checking object.normalizedKey property first)
    const isMovieFav = (favs.movies || []).some(item => 
      (item.normalizedKey && item.normalizedKey === path) ||
      (item.path && item.path === path) || 
      (item.absPath && item.absPath === path)
    );
    
    // Check if path exists in tvshows array (checking object.normalizedKey property first)
    const isTVShowFav = (favs.tvshows || []).some(item => 
      (item.normalizedKey && item.normalizedKey === path) ||
      (item.path && item.path === path) || 
      (item.absPath && item.absPath === path)
    );
    
    const isFav = isMovieFav || isTVShowFav;
    // console.log('[DEBUG - FAVORITES] isFavorite check for path:', path, 'result:', isFav, 'movieFav:', isMovieFav, 'tvFav:', isTVShowFav);
    return isFav;
  }
  async toggleFavorite(mediaItem, type) {
    console.log('[DEBUG - FAVORITES] ====== TOGGLE FAVORITE CALLED ======');
    console.log('[DEBUG - FAVORITES] mediaItem:', mediaItem);
    console.log('[DEBUG - FAVORITES] type:', type);
    console.log('[DEBUG - FAVORITES] mediaItem.type:', mediaItem.type);
    console.log('[DEBUG - FAVORITES] mediaItem.mediaType:', mediaItem.mediaType);
    
    // Handle backward compatibility: if mediaItem is a string, it's an old path-based call
    if (typeof mediaItem === 'string') {
      console.log('[DEBUG - FAVORITES] Backward compatibility: toggleFavorite called with path string, converting to object');
      mediaItem = { path: mediaItem };
    }
    
    // Auto-detect media type using the unified data structure's "type" field
    if (!type) {
      const path = mediaItem.normalizedKey || mediaItem.path || mediaItem.absPath || '';
      if (this.unifiedData && this.unifiedData[path]) {
        const itemData = this.unifiedData[path];
        // Use the "type" field from the unified data structure
        if (itemData.type === 'tvshow') {
          type = 'tvshow';
          console.log('[DEBUG - FAVORITES] Auto-detected TV show from unified data type field:', path);
        } else if (itemData.type === 'movie') {
          type = 'movie';
          console.log('[DEBUG - FAVORITES] Auto-detected movie from unified data type field:', path);
        } else {
          // Fallback: check for seasons property (legacy detection)
          if (itemData.seasons && typeof itemData.seasons === 'object') {
            type = 'tvshow';
            console.log('[DEBUG - FAVORITES] Fallback: Auto-detected TV show from seasons property:', path);
          } else {
            type = 'movie';
            console.log('[DEBUG - FAVORITES] Fallback: Auto-detected movie from unified data:', path);
          }
        }
      } else {
        // Fallback: check path for TV-SHOWS indicator
        if (path.toLowerCase().includes('tvshows') || path.toLowerCase().includes('tv_show')) {
          type = 'tvshow';
          console.log('[DEBUG - FAVORITES] Fallback: Auto-detected TV show from path:', path);
        } else {
          type = 'movie';
          console.log('[DEBUG - FAVORITES] Fallback: Using default type movie for path:', path);
        }
      }
    }
    
    console.log('[DEBUG - FAVORITES] Final determined type:', type);
    
    // Init  ialize favorites storage if needed
    this.initializeFavoritesStorage();
    let favs = JSON.parse(
      localStorage.getItem("mediaLibraryFavoritesByType") || "{}"
    );
    if (!favs.movies) favs.movies = [];
    if (!favs.tvshows) favs.tvshows = [];
    
    // Use normalizedKey for favorites functionality (consistent with poster system)
    const path = mediaItem.normalizedKey || mediaItem.path || mediaItem.absPath || '';
    
    // console.log('[DEBUG - FAVORITES] Current favorites before toggle:', favs);
    // console.log('[DEBUG - FAVORITES] Checking path:', path, 'type:', type);
    
    const list =
      type === "tvshow" || type === "tvshows"
        ? favs.tvshows
        : favs.movies;
    
    // Check if item is already in favorites by normalizedKey (consistent with poster system)
    const isAlreadyFavorited = list.some(item => 
      (item.normalizedKey && item.normalizedKey === path) ||
      (item.path && item.path === path) || 
      (item.absPath && item.absPath === path)
    );
    
    console.log('[DEBUG - FAVORITES] Is already favorited:', isAlreadyFavorited);
    console.log('[DEBUG - FAVORITES] Current path:', path);
    console.log('[DEBUG - FAVORITES] Current type:', type);
    
    if (isAlreadyFavorited) {
      // Remove from favorites - only remove from the correct type array
      if (type === "tvshow" || type === "tvshows") {
        favs.tvshows = favs.tvshows.filter((item) => 
          !((item.normalizedKey && item.normalizedKey === path) ||
            (item.path && item.path === path) || 
            (item.absPath && item.absPath === path))
        );
      } else {
        favs.movies = favs.movies.filter((item) => 
          !((item.normalizedKey && item.normalizedKey === path) ||
            (item.path && item.path === path) || 
            (item.absPath && item.absPath === path))
        );
      }
      // console.log("[DEBUG - FAVORITES] Removed from favorites:", path);
    } else {
      // Add to favorites - add to the beginning so they appear at the top
      // Store the complete media object, not just the path
      const favoriteItem = {
        ...mediaItem, // Include all properties
        normalizedKey: mediaItem.normalizedKey || mediaItem.path, // Ensure normalizedKey is stored
        favoritedAt: new Date().toISOString() // Add timestamp for sorting
      };
      
      if (type === "tvshow" || type === "tvshows") {
        favs.tvshows.unshift(favoriteItem);
        // console.log('[DEBUG - FAVORITES] Added TV show to favorites (top):', path);
        // console.log('[DEBUG - FAVORITES] TV show object being saved:', favoriteItem);
        // console.log('[DEBUG - FAVORITES] TV show poster property:', favoriteItem.poster);
      } else {
        favs.movies.unshift(favoriteItem);
        // console.log('[DEBUG - FAVORITES] Added movie to favorites (top):', path);
      }
    }
    
    localStorage.setItem("mediaLibraryFavoritesByType", JSON.stringify(favs));
    console.log('[DEBUG - FAVORITES] ====== FAVORITES UPDATED ======');
    console.log('[DEBUG - FAVORITES] Final favorites state:', favs);
    console.log('[DEBUG - FAVORITES] Movies count:', favs.movies.length);
    console.log('[DEBUG - FAVORITES] TV Shows count:', favs.tvshows.length);
    console.log('[DEBUG - FAVORITES] Saved to localStorage, new favs:', favs);
    
    // Note: Heart icons are now updated immediately in the click handler
    // No need to call updateHeartIcons() here to avoid conflicts
    
    // If on favorites tab, refresh the content
    if (this.currentTab === "favorites") {
      // Force immediate refresh to show the updated favorites
      setTimeout(() => {
        this.updateModalContent();
      }, 100);
    }
  }
  getFavoritesList() {
    // SIMPLE: Just return localStorage data
    let favs;
    try {
      favs = JSON.parse(
        localStorage.getItem("mediaLibraryFavoritesByType") || "{}"
      );
    } catch (error) {
      console.error('[DEBUG - FAVORITES] Failed to read from localStorage:', error);
      favs = { movies: [], tvshows: [] };
    }
    console.log('[DEBUG - FAVORITES] getFavoritesList returning:', favs);
    return {
      movies: favs.movies || [],
      tvshows: favs.tvshows || [],
    };
  }
  
  /**
   * Deduplicate movies in favorites by title and year
   * This prevents duplicate movie entries from appearing on the Favorites page
   */
  deduplicateMovies(movies) {
    if (!Array.isArray(movies) || movies.length === 0) {
      return [];
    }
    
    console.log('[DEBUG - DEDUPLICATION] Starting deduplication of', movies.length, 'movies');
    
    // Create a Map to track unique movies by title+year combination
    const uniqueMovies = new Map();
    
    movies.forEach((movie, index) => {
      if (!movie || typeof movie !== 'object') {
        console.warn('[DEBUG - DEDUPLICATION] Skipping invalid movie object at index', index, ':', movie);
        return;
      }
      
      // Extract title and year from the movie object
      const title = movie.title || movie.TMDBTitle || movie.name || '';
      const year = movie.year || movie.releaseYear || '';
      
      if (!title) {
        console.warn('[DEBUG - DEDUPLICATION] Skipping movie without title at index', index, ':', movie);
        return;
      }
      
      // Create a unique key combining title and year
      const uniqueKey = `${title.toLowerCase().trim()}_${year}`;
      
      if (uniqueMovies.has(uniqueKey)) {
        console.log('[DEBUG - DEDUPLICATION] Found duplicate for:', title, year, '- keeping first instance');
        // Keep the first instance, skip this duplicate
        return;
      }
      
      // This is a unique movie, add it to our Map
      uniqueMovies.set(uniqueKey, movie);
      console.log('[DEBUG - DEDUPLICATION] Added unique movie:', title, year);
    });
    
    const deduplicatedList = Array.from(uniqueMovies.values());
    console.log('[DEBUG - DEDUPLICATION] Deduplication complete. Original:', movies.length, 'Deduplicated:', deduplicatedList.length);
    
    return deduplicatedList;
  }
  
  /**
   * Play a movie from the favorites page
   * This method handles clicking on movie cards in the favorites view
   */
  playMovieFromFavorites(moviePath, movieTitle) {
    console.log('🚨 [DEBUG - FAVORITES] ====== METHOD CALLED ======');
    console.log('[DEBUG - FAVORITES] Playing movie from favorites:', movieTitle, 'Path:', moviePath);
    console.log('[DEBUG - FAVORITES] Method called from:', new Error().stack);
    
    if (!moviePath) {
      console.warn('[DEBUG - FAVORITES] No movie path provided');
      return;
    }
    
    // Use the working backup approach: find movie data and call playMedia
    let movieData = null;
    
    // First, try to find the movie in unified data (new approach)
    if (this.unifiedData) {
      console.log('[DEBUG - FAVORITES] Searching unified data for movie:', movieTitle);
      console.log('[DEBUG - FAVORITES] Available movies in unified data:', Object.keys(this.unifiedData).filter(k => this.unifiedData[k].type === 'movie'));
      
      // SIMPLE: Find the movie by the path and get TMDBTitle directly from JSON
      console.log('[DEBUG - FAVORITES] Looking for movie with path:', moviePath);
      
      for (const [key, item] of Object.entries(this.unifiedData)) {
        if (item.type === 'movie' && item.files) {
          // Check if this movie's files contain the path we're looking for
          const hasMatchingFile = item.files.some(file => 
            file.absPath === moviePath || file.relPath === moviePath
          );
          
          if (hasMatchingFile) {
            console.log('[DEBUG - FAVORITES] Found movie by path match:', key);
            console.log('[DEBUG - FAVORITES] Movie TMDBTitle:', item.TMDBTitle);
            console.log('[DEBUG - FAVORITES] Movie files:', item.files);
            
            movieData = {
              ...item, // Include ALL properties from unified data including TMDBTitle
              path: moviePath,
              absPath: item.files[0].absPath, // Use the full file system path from unified data
              title: item.TMDBTitle || item.title, // Use TMDBTitle as primary title
              type: 'movie'
            };
            break;
          }
        }
      }
    }
    
    // If not found in unified data, try the old mediaLibraryRaw approach (backup approach)
    if (!movieData && this.mediaLibraryRaw) {
      console.log('[DEBUG - FAVORITES] Trying old mediaLibraryRaw approach');
      movieData = this.mediaLibraryRaw.find((movie) => movie.path === moviePath);
      if (movieData) {
        console.log('[DEBUG - FAVORITES] Found movie in mediaLibraryRaw:', movieData);
      }
    }
    
    // If still no movie data, create a fallback object
    if (!movieData) {
      console.warn('[DEBUG - FAVORITES] No movie data found, creating fallback object');
      movieData = {
        path: moviePath,
        type: "movie",
        title: movieTitle,
        TMDBTitle: movieTitle // Use the passed title as TMDBTitle for fallback
      };
    }
    
    // Clean the title to remove quality tags for display
    const cleanDisplayTitle = movieData.title.replace(/\[\d{3,4}p\]/gi, "").replace(/\[.*?\]/g, "").trim();
    console.log('[DEBUG - FAVORITES] Clean display title:', cleanDisplayTitle);
    console.log('[DEBUG - FAVORITES] Final movieData object:', movieData);
    
    // Use the working playMedia method from the backup
    if (this.playMedia) {
      console.log('[DEBUG - FAVORITES] Calling playMedia with:', movieData);
      // Ensure the title is properly set for display
      movieData.title = cleanDisplayTitle;
      console.log('[DEBUG - FAVORITES] Updated movieData.title to:', movieData.title);
      this.playMedia(movieData);
    } else if (window.videoPlayer && typeof window.videoPlayer.playUrl === 'function') {
      // Fallback: use video player directly with proper URL encoding and clean title
      console.log('[DEBUG - FAVORITES] Using videoPlayer.playUrl as fallback');
      const videoUrl = `/api/video?path=${encodeURIComponent(movieData.path)}`;
      console.log('[DEBUG - FAVORITES] Playing video URL:', videoUrl);
      console.log('[DEBUG - FAVORITES] Video title being passed:', cleanDisplayTitle);
      
      // Create a proper mediaItem object with the title for the video player
      const mediaItem = {
        title: cleanDisplayTitle,
        TMDBTitle: cleanDisplayTitle,
        path: movieData.path,
        absPath: movieData.path,
        type: 'movie',
        poster: movieData.poster
      };
      
      // Call playUrl with the correct parameters: (src, type, startTime, mediaItem)
      window.videoPlayer.playUrl(videoUrl, 'video/mp4', 0, mediaItem);
    } else {
      console.error('[DEBUG - FAVORITES] Neither playMedia nor videoPlayer available');
    }
  }
  
  /**
   * Fallback method to open a movie from favorites
   */
  openMovieFromFavorites(movieObj) {
    // console.log('[DEBUG - FAVORITES] Using fallback method to open movie:', movieObj);
    
    // Try to construct a proper movie path for the video player
    const videoPath = movieObj.absPath || movieObj.filePath || movieObj.path;
    
    if (videoPath) {
      // Create a temporary movie object with the required structure
      const tempMovie = {
        title: movieObj.title || movieObj.TMDBTitle || movieObj.name,
        path: videoPath,
        absPath: videoPath,
        poster: movieObj.poster,
        year: movieObj.year || movieObj.releaseYear
      };
      
      // Try to use the existing video player methods
      if (window.videoPlayer && typeof window.videoPlayer.playUrl === 'function') {
        // Convert the file path to a video API URL
        const videoUrl = `/api/video?path=${encodeURIComponent(videoPath)}`;
        window.videoPlayer.playUrl(videoUrl, tempMovie.title);
      } else {
        // Last resort: open in a new tab or show an error
        console.error('[DEBUG - FAVORITES] No video player available');
        // Don't show alert, just log the error
      }
    } else {
      console.error('[DEBUG - FAVORITES] No valid video path found for movie:', movieObj);
      // Don't show alert, just log the error
    }
  }
  
  /**
   * Remove a movie from favorites
   */
  removeMovieFromFavorites(moviePath) {
    // console.log('[DEBUG - FAVORITES] Removing movie from favorites:', moviePath);
    
    const favorites = this.getFavoritesList();
    const updatedMovies = favorites.movies.filter(item => 
      (item.path !== moviePath) && 
      (item.absPath !== moviePath) &&
      (item.filePath !== moviePath)
    );
    
    // Update favorites in localStorage
    const updatedFavorites = {
      ...favorites,
      movies: updatedMovies
    };
    
    localStorage.setItem('mediaLibraryFavoritesByType', JSON.stringify(updatedFavorites));
    
    // Refresh the favorites display
    this.renderFavoritesView();
    
    // console.log('[DEBUG - FAVORITES] Movie removed. New count:', updatedMovies.length);
  }
  // ========================================
  // COLLECTIONS MANAGEMENT METHODS
  // ========================================
  /**
     * Get collections from localStorage first, then MongoDB as fallback
     */
  async getCollections() {
    // Load collections from localStorage first (primary source for UI)
    try {
      const collectionsData = localStorage.getItem('mediaCollections');
      if (collectionsData) {
        const collections = JSON.parse(collectionsData);
        console.log('[DEBUG - COLLECTIONS] Loaded collections from localStorage:', Object.keys(collections).length, 'collections');
        return collections;
      }
      
      // Fallback to JSON file if localStorage is empty
      console.log('[DEBUG - COLLECTIONS] localStorage empty, trying JSON file...');
      const response = await fetch("/components/MediaLibrary/data/collections.json?v=" + Date.now());
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG - COLLECTIONS] Loaded collections from JSON file');
        
        // Convert the structured format to flat format for compatibility
        const flatCollections = {};
        
        // Process each category
        for (const [category, collections] of Object.entries(data.collections)) {
          for (const [name, items] of Object.entries(collections)) {
            flatCollections[name] = items;
          }
        }
        
        // Store the structured data for the modal to use
        this.structuredCollectionsData = data;
        
        // Return flat format for backward compatibility (collection buttons, etc.)
        // console.log('[DEBUG - COLLECTIONS] Converted to flat format:', Object.keys(flatCollections).length, 'collections');
        return flatCollections;
      }
    } catch (error) {
      console.warn("[DEBUG - COLLECTIONS] Failed to load collections from JSON:", error);
    }
    
    // Fallback to empty collections if JSON loading fails
    // console.log('[DEBUG - COLLECTIONS] Returning empty collections as fallback');
    return {};
  }
  
  /**
   * Migrate existing collections to have metadata for better categorization
   */
  async migrateCollectionsToMetadata() {
    try {
      // Load collections.json file
      const response = await fetch('/components/MediaLibrary/data/collections.json');
      if (!response.ok) {
        console.log('[DEBUG - COLLECTIONS] No collections.json file found, skipping migration');
        return 0;
      }
      
      const data = await response.json();
      const collections = data.collections || {};
      
      // Check if metadata section exists
      if (!data.metadata) {
        data.metadata = {};
      }
      
      let migrated = 0;
      
      // Predefined categories for migration
      const predefinedCategories = {
        actors: ['Tom Hanks', 'Meryl Streep', 'Robert De Niro', 'Al Pacino', 'Leonardo DiCaprio', 'Denzel Washington', 'Morgan Freeman', 'Samuel L. Jackson', 'Harrison Ford', 'Will Smith', 'Johnny Depp', 'Robin Williams', 'Jim Carrey', 'Adam Sandler', 'Eddie Murphy', 'Chris Pratt', 'Emily Blunt', 'Bradley Cooper', 'Ashley Judd', 'Carrie Anne-Moss', 'Charlton Heston', 'Danny Glover', 'Gregory Peck', 'Jackie Chan', 'Jet Li', 'John Candy', 'John Travolta', 'Drew Barrymore', 'Brad Pitt', 'George Clooney', 'Bruce Willis', 'Steve Martin', 'Mel Gibson', 'Sarrah Jessica-Parker', 'Tom Cruise', 'Cleavon Little', 'Gene Wilder', 'Mel Brooks', 'Wesley Snipes', 'Keanu Reeves', 'Matt Damon', 'Jerry Lewis', 'David Carradine', 'Albert Finney', 'Abbey Cornish', 'Jane Seymour', 'Christopher Reeve', 'Val Kilmer', 'Sean Connery', 'Nicholas Cage', 'Richard Dreyfus', 'Arnold Schwartzenegger', 'David Attenborough', 'Lady Gaga', 'Robert DeNiro', 'Bill Murray', 'Russell Crowe', 'Ryan Reynolds', 'Rodney Dangerfield', 'Dwayne \'The Rock\' Johnson', 'Jack Nicholson', 'Jennifer Lawrence', 'Uma Thurman'],
        directors: ['Steven Spielberg', 'Martin Scorsese', 'Christopher Nolan', 'Quentin Tarantino', 'Stanley Kubrick', 'Alfred Hitchcock', 'Tim Burton', 'Ridley Scott', 'James Cameron', 'George Lucas', 'Francis Ford Coppola', 'Woody Allen', 'David Fincher', 'Coen Brothers', 'Wes Anderson'],
        genres: ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western', 'Spy-Thriller', 'Vampires', 'Martial Arts', 'Military', 'Nature', 'Food', 'Legal'],
        creative: ['MEL BROOKS', 'Ray Harryhausen', 'ROM-COM', 'CLASSIC', 'Colorized', 'LOVE-Romance', '80s Nostalgia', '90s Favorites', 'Cult Classics', 'Feel Good Movies', 'Mind Benders', 'Tearjerkers', 'Guilty Pleasures', 'Date Night', 'Rainy Day', 'Holiday Movies', 'Summer Blockbusters', 'Oscar Winners', 'Hidden Gems', "So Bad It's Good", 'Superhero', 'Zombie', 'Time Travel', 'Space Opera', 'Heist', 'Buddy Cop', 'Road Trip', 'Coming of Age', 'Fish Out of Water', 'Underdog Story', 'Revenge', 'Survival', 'Disaster', 'Martial Arts', 'Spy Thriller', 'Legal Drama', 'Medical Drama', 'Sports', 'Music & Musicians', 'Art & Artists', 'Historical', 'Based on True Story', 'Book Adaptations', 'Comic Book Movies', 'Remakes', 'Sequels', 'Franchises', "Director's Cut", 'Black & White', 'Foreign Films', 'Silent Films', 'Film Noir'],
        decades: ['1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s']
      };
      
      // Check each collection and add metadata if missing
      Object.entries(collections).forEach(([collectionName, items]) => {
        if (!data.metadata[collectionName]) {
          // Try to categorize based on predefined lists
          for (const [category, names] of Object.entries(predefinedCategories)) {
            if (names.includes(collectionName)) {
              data.metadata[collectionName] = {
                type: category.slice(0, -1), // Remove 's' from category
                created: new Date().toISOString(),
                migrated: true
              };
              migrated++;
              console.log(`[DEBUG - COLLECTIONS] Migrated "${collectionName}" to type "${category.slice(0, -1)}"`);
              break;
            }
          }
        }
      });
      
       // Save back to file if any migrations occurred
       if (migrated > 0) {
         const saveResponse = await fetch('/api/collections/save-json', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify(data)
         });
         
         if (saveResponse.ok) {
           // Also update localStorage with the migrated metadata
           const collectionMetadata = JSON.parse(localStorage.getItem('collectionMetadata') || '{}');
           Object.entries(data.metadata).forEach(([collectionName, metadata]) => {
             if (!collectionMetadata[collectionName]) {
               collectionMetadata[collectionName] = {
                 ...metadata,
                 source: 'migration'
               };
             }
           });
           localStorage.setItem('collectionMetadata', JSON.stringify(collectionMetadata));
           
           console.log(`[DEBUG - COLLECTIONS] Migration complete: ${migrated} collections migrated to metadata format in both collections.json and localStorage`);
         } else {
           console.error('[DEBUG - COLLECTIONS] Failed to save migrated metadata to collections.json');
         }
       }
      
      return migrated;
    } catch (error) {
      console.error('[DEBUG - COLLECTIONS] Error during migration:', error);
      return 0;
    }
  }

  /**
   * Set collection type metadata in collections.json file
   */
  async setCollectionTypeInFile(collectionName, type) {
    try {
      // Load current collections.json
      const response = await fetch('/components/MediaLibrary/data/collections.json');
      if (!response.ok) {
        throw new Error('Failed to load collections.json');
      }
      const data = await response.json();
      
      // Ensure metadata section exists
      if (!data.metadata) {
        data.metadata = {};
      }
      
      // Set the collection type
      data.metadata[collectionName] = {
        type: type,
        created: new Date().toISOString(),
        manuallySet: false
      };
      
      // Save back to file via API
      const saveResponse = await fetch('/api/collections/save-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save collections.json');
      }
      
      console.log(`[DEBUG - COLLECTIONS] Set collection type for "${collectionName}" to "${type}" in collections.json`);
      return true;
    } catch (error) {
      console.error('[DEBUG - COLLECTIONS] Error setting collection type in file:', error);
      return false;
    }
  }

  /**
   * Set collection type metadata for a specific collection (both localStorage and collections.json)
   */
  async setCollectionType(collectionName, type) {
    try {
      // Store in localStorage for fast access
      const collectionMetadata = JSON.parse(localStorage.getItem('collectionMetadata') || '{}');
      collectionMetadata[collectionName] = {
        type: type,
        created: new Date().toISOString(),
        manuallySet: true,
        source: 'localStorage'
      };
      localStorage.setItem('collectionMetadata', JSON.stringify(collectionMetadata));
      console.log(`[DEBUG - COLLECTIONS] Set collection type for "${collectionName}" to "${type}" in localStorage`);
      
      // Also store in collections.json for persistence
      await this.setCollectionTypeInFile(collectionName, type);
      
      // Clear cached structured data to force refresh
      this.structuredCollectionsData = null;
      
      return true;
    } catch (error) {
      console.error('[DEBUG - COLLECTIONS] Error setting collection type:', error);
      return false;
    }
  }

  /**
   * Get collection type metadata for a specific collection (checks both sources)
   */
  async getCollectionType(collectionName) {
    try {
      // First try localStorage for fast access
      const collectionMetadata = JSON.parse(localStorage.getItem('collectionMetadata') || '{}');
      const localStorageType = collectionMetadata[collectionName]?.type;
      
      // Also check collections.json file
      let fileType = null;
      try {
        const response = await fetch('/components/MediaLibrary/data/collections.json');
        if (response.ok) {
          const data = await response.json();
          if (data.metadata && data.metadata[collectionName]) {
            fileType = data.metadata[collectionName].type;
          }
        }
      } catch (error) {
        console.warn('[DEBUG - COLLECTIONS] Could not load from collections.json:', error);
      }
      
      // Return localStorage type if available (most recent), otherwise file type
      const finalType = localStorageType || fileType;
      
      // If we have a type from file but not localStorage, sync it
      if (fileType && !localStorageType) {
        collectionMetadata[collectionName] = {
          type: fileType,
          created: new Date().toISOString(),
          source: 'file-sync'
        };
        localStorage.setItem('collectionMetadata', JSON.stringify(collectionMetadata));
        console.log(`[DEBUG - COLLECTIONS] Synced collection type for "${collectionName}" from file to localStorage`);
      }
      
      return finalType;
    } catch (error) {
      console.error('[DEBUG - COLLECTIONS] Error getting collection type:', error);
      return null;
    }
  }
  
  /**
   * Get structured collections data for the modal (separate from flat format for backward compatibility)
   */
  async getStructuredCollections() {
    console.log('[DEBUG - COLLECTIONS] getStructuredCollections called');
    if (this.structuredCollectionsData) {
      console.log('[DEBUG - COLLECTIONS] Using cached structured data');
      return this.structuredCollectionsData;
    }
    
    // Load collections from localStorage (primary source)
    try {
      const collectionsData = localStorage.getItem('mediaCollections');
      if (collectionsData) {
        const collections = JSON.parse(collectionsData);
        
        // Load pre-defined category patterns from collection-listing.json
        let predefinedCategories = {
          actors: ['Tom Hanks', 'Meryl Streep', 'Robert De Niro', 'Al Pacino', 'Leonardo DiCaprio', 'Denzel Washington', 'Morgan Freeman', 'Samuel L. Jackson', 'Harrison Ford', 'Will Smith', 'Johnny Depp', 'Robin Williams', 'Jim Carrey', 'Adam Sandler', 'Eddie Murphy', 'Chris Pratt', 'Emily Blunt', 'Bradley Cooper', 'Ashley Judd', 'Carrie Anne-Moss', 'Charlton Heston', 'Danny Glover', 'Gregory Peck', 'Jackie Chan', 'Jet Li', 'John Candy', 'John Travolta', 'Drew Barrymore', 'Brad Pitt', 'George Clooney', 'Bruce Willis', 'Steve Martin', 'Mel Gibson', 'Sarrah Jessica-Parker', 'Tom Cruise', 'Cleavon Little', 'Gene Wilder', 'Mel Brooks', 'Wesley Snipes', 'Keanu Reeves', 'Matt Damon', 'Jerry Lewis', 'David Carradine', 'Albert Finney', 'Abbey Cornish', 'Jane Seymour', 'Christopher Reeve', 'Val Kilmer', 'Sean Connery', 'Nicholas Cage', 'Richard Dreyfus', 'Arnold Schwartzenegger', 'David Attenborough', 'Lady Gaga', 'Robert DeNiro', 'Bill Murray', 'Russell Crowe', 'Ryan Reynolds', 'Rodney Dangerfield', 'Dwayne \'The Rock\' Johnson', 'Jack Nicholson', 'Jennifer Lawrence', 'Uma Thurman'],
          directors: ['Steven Spielberg', 'Martin Scorsese', 'Christopher Nolan', 'Quentin Tarantino', 'Stanley Kubrick', 'Alfred Hitchcock', 'Tim Burton', 'Ridley Scott', 'James Cameron', 'George Lucas', 'Francis Ford Coppola', 'Woody Allen', 'David Fincher', 'Coen Brothers', 'Wes Anderson'],
          genres: ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western', 'Spy-Thriller', 'Vampires', 'Martial Arts', 'Military', 'Nature', 'Food', 'Legal'],
          creative: ['MEL BROOKS', 'Ray Harryhausen', 'ROM-COM', 'CLASSIC', 'Colorized', 'LOVE-Romance', '80s Nostalgia', '90s Favorites', 'Cult Classics', 'Feel Good Movies', 'Mind Benders', 'Tearjerkers', 'Guilty Pleasures', 'Date Night', 'Rainy Day', 'Holiday Movies', 'Summer Blockbusters', 'Oscar Winners', 'Hidden Gems', "So Bad It's Good", 'Superhero', 'Zombie', 'Time Travel', 'Space Opera', 'Heist', 'Buddy Cop', 'Road Trip', 'Coming of Age', 'Fish Out of Water', 'Underdog Story', 'Revenge', 'Survival', 'Disaster', 'Martial Arts', 'Spy Thriller', 'Legal Drama', 'Medical Drama', 'Sports', 'Music & Musicians', 'Art & Artists', 'Historical', 'Based on True Story', 'Book Adaptations', 'Comic Book Movies', 'Remakes', 'Sequels', 'Franchises', "Director's Cut", 'Black & White', 'Foreign Films', 'Silent Films', 'Film Noir'],
          decades: ['1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s']
        };
        
        // Try to load from collection-listing.json for more complete lists
        try {
          const collectionListingResponse = await fetch('/components/MediaLibrary/data/collection-listing.json');
          if (collectionListingResponse.ok) {
            const collectionListing = await collectionListingResponse.json();
            // Merge the lists, but keep the comprehensive predefined list as the base
            predefinedCategories = {
              actors: [...predefinedCategories.actors, ...(collectionListing.actors || [])].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
              directors: [...predefinedCategories.directors, ...(collectionListing.directors || [])].filter((v, i, a) => a.indexOf(v) === i),
              genres: [...predefinedCategories.genres, ...(collectionListing.genres || [])].filter((v, i, a) => a.indexOf(v) === i),
              creative: [...predefinedCategories.creative, ...(collectionListing.creative || [])].filter((v, i, a) => a.indexOf(v) === i),
              decades: [...predefinedCategories.decades, ...(collectionListing.decades || [])].filter((v, i, a) => a.indexOf(v) === i)
            };
            console.log('[DEBUG - COLLECTIONS] Merged category lists from collection-listing.json with predefined lists');
          }
        } catch (error) {
          console.log('[DEBUG - COLLECTIONS] Using predefined category lists only:', error.message);
        }
        
        // Categorize collections
        const structuredData = {
          collections: {
            my_collections: {},
            actors: {},
            directors: {},
            genres: {},
            creative: {},
            decades: {}
          }
        };
        
        // Debug: Show predefined categories
        console.log('[DEBUG - COLLECTIONS] Predefined categories loaded:');
        Object.entries(predefinedCategories).forEach(([category, names]) => {
          console.log(`- ${category}: ${names.length} items`, names.slice(0, 5), names.length > 5 ? '...' : '');
        });
        
        // Load collection metadata for categorization (from both sources)
        const collectionMetadata = JSON.parse(localStorage.getItem('collectionMetadata') || '{}');
        console.log('[DEBUG - COLLECTIONS] Loaded collection metadata from localStorage:', Object.keys(collectionMetadata).length, 'collections with metadata');
        
        // Also load from collections.json file and merge
        try {
          const response = await fetch('/components/MediaLibrary/data/collections.json');
          if (response.ok) {
            const data = await response.json();
            if (data.metadata) {
              // Merge file metadata with localStorage metadata (localStorage takes priority)
              Object.entries(data.metadata).forEach(([collectionName, metadata]) => {
                if (!collectionMetadata[collectionName]) {
                  collectionMetadata[collectionName] = {
                    ...metadata,
                    source: 'file'
                  };
                }
              });
              console.log('[DEBUG - COLLECTIONS] Merged metadata from collections.json file');
            }
          }
        } catch (error) {
          console.warn('[DEBUG - COLLECTIONS] Could not load metadata from collections.json:', error);
        }
        
        // Process each collection and categorize it
        console.log('[DEBUG - COLLECTIONS] Processing collections for categorization...');
        console.log('[DEBUG - COLLECTIONS] Total collections to process:', Object.keys(collections).length);
        
        Object.entries(collections).forEach(([collectionName, items]) => {
          let categorized = false;
          
          // First, check if we have explicit metadata for this collection
          if (collectionMetadata[collectionName] && collectionMetadata[collectionName].type) {
            const collectionType = collectionMetadata[collectionName].type;
            const categoryKey = collectionType + 's'; // Convert 'actor' to 'actors', 'director' to 'directors', etc.
            
            if (structuredData.collections[categoryKey]) {
              structuredData.collections[categoryKey][collectionName] = items;
              console.log(`[DEBUG - COLLECTIONS] ✅ Categorized "${collectionName}" as ${categoryKey} (from metadata)`);
              categorized = true;
            }
          }
          
          // If no metadata, fall back to predefined category matching
          if (!categorized) {
            for (const [category, names] of Object.entries(predefinedCategories)) {
              if (names.includes(collectionName)) {
                structuredData.collections[category][collectionName] = items;
                console.log(`[DEBUG - COLLECTIONS] ✅ Categorized "${collectionName}" as ${category} (from predefined list)`);
                categorized = true;
                break;
              }
            }
          }
          
          // If still not categorized, it's a custom collection
          if (!categorized) {
            structuredData.collections.my_collections[collectionName] = items;
            console.log(`[DEBUG - COLLECTIONS] ❌ Categorized "${collectionName}" as my_collections (custom) - no metadata or predefined match`);
          }
        });
        
        // Debug: Show what ended up in each category
        console.log('[DEBUG - COLLECTIONS] Final categorization:');
        Object.entries(structuredData.collections).forEach(([category, items]) => {
          console.log(`- ${category}:`, Object.keys(items));
        });
        
        this.structuredCollectionsData = structuredData;
        console.log('[DEBUG - COLLECTIONS] Loaded structured collections from localStorage:');
        console.log('- My Collections:', Object.keys(structuredData.collections.my_collections).length);
        console.log('- Actors:', Object.keys(structuredData.collections.actors).length);
        console.log('- Directors:', Object.keys(structuredData.collections.directors).length);
        console.log('- Genres:', Object.keys(structuredData.collections.genres).length);
        console.log('- Creative:', Object.keys(structuredData.collections.creative).length);
        console.log('- Decades:', Object.keys(structuredData.collections.decades).length);
        return this.structuredCollectionsData;
      }
    } catch (error) {
      console.error('[DEBUG - COLLECTIONS] Error loading collections from localStorage:', error);
    }
    
    // Fallback to empty structure
    this.structuredCollectionsData = { 
      collections: { 
        my_collections: {},
        actors: {},
        directors: {},
        genres: {},
        creative: {},
        decades: {}
      } 
    };
    return this.structuredCollectionsData;
  }
  /**
     * Save collections to MongoDB and localStorage
     */
  async saveCollections(collections) {
    // Save collections to the JSON file (single source of truth)
    try {
      console.log('[DEBUG - COLLECTIONS] Saving collections to JSON file...');
      
      // Load current JSON structure
      const response = await fetch("/components/MediaLibrary/data/collections.json?v=" + Date.now());
      if (response.ok) {
        const data = await response.json();
        
        // CRITICAL FIX: Preserve the original category structure
        // Only update the items within existing collections, don't move collections between categories
        
        // Step 1: Update existing collections with new items (preserve their original categories)
        for (const [collectionName, newItems] of Object.entries(collections)) {
          let collectionFound = false;
          
          // Search through all categories to find where this collection originally exists
          for (const [category, categoryCollections] of Object.entries(data.collections)) {
            if (categoryCollections[collectionName] !== undefined) {
              // Found the collection in its original category - update it there
              data.collections[category][collectionName] = newItems;
              collectionFound = true;
              console.log(`[DEBUG - COLLECTIONS] Updated existing collection "${collectionName}" in ${category} category`);
              break;
            }
          }
          
          // Step 2: Only create NEW collections if they truly don't exist anywhere
          if (!collectionFound && newItems && newItems.length > 0) {
            // This is a genuinely new collection - determine appropriate category
            let targetCategory = 'my_collections'; // Default to my_collections
            
            // Check if this collection name matches predefined category patterns
            if (['Al Pacino', 'Ashley Judd', 'Carrie Anne-Moss', 'Charlton Heston', 'Danny Glover', 'Denzel Washington', 'Eddie Murphy', 'Gregory Peck', 'Harrison Ford', 'Jackie Chan', 'Jet Li', 'Jim Carrey', 'John Candy', 'John Travolta', 'Johnny Depp', 'Drew Barrymore', 'Adam Sandler'].includes(collectionName)) {
              targetCategory = 'actors';
            } else if (['Christopher Nolan', 'Coen Brothers', 'David Fincher', 'Francis Ford Coppola', 'George Lucas', 'James Cameron', 'Martin Scorsese', 'Quentin Tarantino', 'Ridley Scott', 'Stanley Kubrick', 'Steven Spielberg', 'Tim Burton', 'Wes Anderson', 'Woody Allen'].includes(collectionName)) {
              targetCategory = 'directors';
            } else if (['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Disaster', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War'].includes(collectionName)) {
              targetCategory = 'genres';
            } else if (['90s Favorites', 'Art & Artists', 'Based on True Story', 'Black & White', 'Book Adaptations', 'Buddy Cop', 'CLASSIC', 'Colorized', 'Comic Book Movies', 'Coming of Age', 'Cult Classics', 'Date Night', 'Director\'s Cut', 'Feel Good Movies'].includes(collectionName)) {
              targetCategory = 'creative';
            } else if (['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'].includes(collectionName)) {
              targetCategory = 'years';
            }
            
            // Add the new collection to the appropriate category
            if (!data.collections[targetCategory]) {
              data.collections[targetCategory] = {};
            }
            data.collections[targetCategory][collectionName] = newItems;
            console.log(`[DEBUG - COLLECTIONS] Created new collection "${collectionName}" in ${targetCategory} category`);
          }
        }
        
        // Save updated JSON back to file via API
        const saveResponse = await fetch('/api/collections/save-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (saveResponse.ok) {
          console.log('[DEBUG - COLLECTIONS] Collections saved to JSON file successfully');
        } else {
          console.warn('[DEBUG - COLLECTIONS] Failed to save to JSON file, but continuing...');
        }
      }
    } catch (error) {
      console.warn('[DEBUG - COLLECTIONS] Error saving to JSON file:', error);
    }
    
    // Save to localStorage (primary source for UI)
    try {
      // Use the flat collections data directly (this is what addToCollection passes)
      localStorage.setItem('mediaCollections', JSON.stringify(collections));
      console.log('[DEBUG - COLLECTIONS] Collections saved to localStorage successfully:', Object.keys(collections).length, 'collections');
    } catch (error) {
      console.warn('[DEBUG - COLLECTIONS] Error saving to localStorage:', error);
    }
    
    // Also sync to MongoDB for backup - convert data format for MongoDB
    try {
      console.log('[DEBUG - COLLECTIONS] Syncing collections to MongoDB...');
      
      // Convert flat format to MongoDB format
      const mongoCollections = [];
      for (const [collectionName, items] of Object.entries(collections)) {
        if (Array.isArray(items) && items.length > 0) {
          // Convert each item to MongoDB format
          const mongoItems = items.map(itemPath => ({
            path: itemPath,
            title: itemPath, // Use path as title for now
            mediaType: 'movie', // Default to movie, can be enhanced later
            addedAt: new Date()
          }));
          
          mongoCollections.push({
            userId: 'default',
            name: collectionName,
            description: '',
            items: mongoItems
          });
        }
      }
      
      console.log('[DEBUG - COLLECTIONS] Converted collections for MongoDB:', mongoCollections);
      
      // Save each collection to MongoDB
      for (const collection of mongoCollections) {
        const response = await fetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(collection),
        });
        
        if (response.ok) {
          console.log('[DEBUG - COLLECTIONS] Collection synced to MongoDB successfully:', collection.name);
        } else {
          // Check if response is JSON before trying to parse it
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.warn('[DEBUG - COLLECTIONS] MongoDB sync failed for collection:', collection.name, 'Response:', response.status, errorData);
          } else {
            console.warn('[DEBUG - COLLECTIONS] MongoDB sync failed for collection:', collection.name, 'Response:', response.status, 'Content-Type:', contentType);
          }
        }
      }
      
      console.log('[DEBUG - COLLECTIONS] MongoDB sync completed');
    } catch (error) {
      // Check if it's a JSON parsing error
      if (error instanceof SyntaxError && error.message.includes('Unexpected token')) {
        console.warn("[DEBUG - COLLECTIONS] MongoDB API returned non-JSON response (likely 404 or error page), collections remain in localStorage");
      } else {
        console.warn("[DEBUG - COLLECTIONS] MongoDB sync failed, collections remain in localStorage:", error);
      }
    }
  }
  /**
     * Debug localStorage collections on initialization
     */
  debugLocalStorageCollections() {
    // console.log('[DEBUG - COLLECTIONS] === localStorage Collections Debug ===');
    // Check both keys
    const newKey = localStorage.getItem("mediaCollections");
    const oldKey = localStorage.getItem("mediaLibraryCollections");
    // console.log('[DEBUG - COLLECTIONS] New key "mediaCollections":', newKey);
    // console.log('[DEBUG - COLLECTIONS] Old key "mediaLibraryCollections":', oldKey);
    if (newKey) {
      try {
        const parsed = JSON.parse(newKey);
        // console.log('[DEBUG - COLLECTIONS] Parsed new key:', parsed);
        // console.log('[DEBUG - COLLECTIONS] Collection names from new key:', Object.keys(parsed));
      } catch (e) {
        // console.error('[DEBUG - COLLECTIONS] Error parsing new key:', e);
      }
    }
    if (oldKey) {
      try {
        const parsed = JSON.parse(oldKey);
        // console.log('[DEBUG - COLLECTIONS] Parsed old key:', parsed);
        // console.log('[DEBUG - COLLECTIONS] Collection names from old key:', Object.keys(parsed));
      } catch (e) {
        // console.error('[DEBUG - COLLECTIONS] Error parsing old key:', e);
      }
    }
    // console.log('[DEBUG - COLLECTIONS] === End Debug ===');
  }
  /**
     * Normalize path to lowercase dot notation
     */
  normalizePath(path) {
    if (!path || typeof path !== 'string') {
      console.warn('[DEBUG - COLLECTIONS] normalizePath received invalid input:', path, 'type:', typeof path);
      return "";
    }
    const normalized = path.replace(/\\/g, "/").toLowerCase().trim();
    // console.log('[DEBUG - COLLECTIONS] normalizePath input:', path, 'output:', normalized);
    return normalized;
  }
  /**
     * Check if a media item is in a specific collection
     */
  async isInCollection(path, collectionName = null) {
    try {
      const normalizedPath = this.normalizePath(path);
      // console.log('[DEBUG - COLLECTIONS] isInCollection called with path:', path, 'normalized:', normalizedPath, 'collectionName:', collectionName);
      const collectionsData = await this.getCollections();
      const collections = collectionsData.all || collectionsData;
      // console.log('[DEBUG - COLLECTIONS] Collections loaded for check:', collections);
      if (collectionName) {
        // Check specific collection
        const result =
          collections[collectionName] &&
          collections[collectionName].some(
            (storedPath) => this.normalizePath(storedPath) === normalizedPath
          );
        // console.log('[DEBUG - COLLECTIONS] Check in specific collection:', collectionName, 'result:', result);
        return result;
      } else {
        // Check if item is in any collection
        const result = Object.values(collections).some(
          (collection) =>
            collection &&
            collection.some(
              (storedPath) => this.normalizePath(storedPath) === normalizedPath
            )
        );
        // console.log('[DEBUG - COLLECTIONS] Check in any collection, result:', result);
        return result;
      }
    } catch (error) {
      console.error(
        "[DEBUG - COLLECTIONS] Error checking collection membership:",
        error
      );
      return false;
    }
  }
  /**
     * Check if a media item is in a collection (synchronous version for initial render)
     */
  isInCollectionSync(path) {
    try {
      const normalizedPath = this.normalizePath(path);
      // Try to get collections from localStorage first (for backward compatibility)
      let collectionsRaw = localStorage.getItem("mediaCollections");
      if (!collectionsRaw) {
        // If no localStorage, try to get from the JSON file
        // This is a fallback for the new system
        return false; // Will be updated when async methods run
      }
      const collections = JSON.parse(collectionsRaw);
      // Check if item is in any collection
      return Object.values(collections).some(
        (collection) =>
          collection &&
          collection.some(
            (storedPath) => this.normalizePath(storedPath) === normalizedPath
          )
      );
    } catch (error) {
      console.error(
        "[DEBUG - COLLECTIONS] Error checking collection membership (sync):",
        error
      );
      return false;
    }
  }
  /**
     * Get the collection name(s) that a movie belongs to
     */
  getCollectionNameForMovie(path) {
    try {
      const normalizedPath = this.normalizePath(path);
      // Try to get collections from localStorage first (for backward compatibility)
      let collectionsRaw = localStorage.getItem("mediaCollections");
      if (!collectionsRaw) {
        // If no localStorage, try to get from the JSON file
        // This is a fallback for the new system
        return "Unknown Collection"; // Will be updated when async methods run
      }
      const collections = JSON.parse(collectionsRaw);
      const collectionNames = [];
      // Find which collections contain this movie
      Object.entries(collections).forEach(([collectionName, paths]) => {
        if (paths && Array.isArray(paths)) {
          const hasMovie = paths.some(
            (storedPath) => this.normalizePath(storedPath) === normalizedPath
          );
          if (hasMovie) {
            collectionNames.push(collectionName);
          }
        }
      });
      if (collectionNames.length === 0) {
        return "Unknown Collection";
      } else if (collectionNames.length === 1) {
        return collectionNames[0];
      } else {
        return collectionNames.join(", ");
      }
    } catch (error) {
      console.error(
        "[DEBUG - COLLECTIONS] Error getting collection name for movie:",
        error
      );
      return "Unknown Collection";
    }
  }
  /**
     * Add a media item to multiple collections
     */
  async addToCollection(collectionNames, path) {
    try {
      console.log('[DEBUG - ADD-TO-COLLECTION] Adding item to collection:', { collectionNames, path });
      
      // Get the unified data key instead of normalizing the path
      let unifiedKey = null;
      
      // Try to find the item in unified data by path
      if (this.unifiedData) {
        console.log('[DEBUG - ADD-TO-COLLECTION] Searching unified data for path:', path);
        for (const [key, item] of Object.entries(this.unifiedData)) {
          // Check if this item matches the path
          if (item.path === path || item.absPath === path || 
              (item.files && item.files.some(file => file.absPath === path || file.relPath === path))) {
            unifiedKey = key;
            console.log('[DEBUG - ADD-TO-COLLECTION] Found unified key:', key, 'for path:', path);
            break;
          }
        }
        
        // If still not found, try to match by extracting filename from path
        if (!unifiedKey) {
          const pathFilename = path.split(/[\\\/]/).pop().replace(/\.[^/.]+$/, ''); // Extract filename without extension
          console.log('[DEBUG - ADD-TO-COLLECTION] Trying filename match for:', pathFilename);
          for (const [key, item] of Object.entries(this.unifiedData)) {
            if (item.files && item.files.some(file => {
              const fileFilename = file.name.replace(/\.[^/.]+$/, ''); // Extract filename without extension
              return fileFilename.toLowerCase() === pathFilename.toLowerCase();
            })) {
              unifiedKey = key;
              console.log('[DEBUG - ADD-TO-COLLECTION] Found unified key by filename match:', key, 'for path:', path);
              break;
            }
          }
        }
        
        if (!unifiedKey) {
          console.log('[DEBUG - ADD-TO-COLLECTION] No unified key found for path:', path);
          // Try to find by title or name
          for (const [key, item] of Object.entries(this.unifiedData)) {
            const itemTitle = item.TMDBTitle || item.title || item.name || '';
            const pathTitle = path.split(/[\\\/]/).pop().replace(/\.[^/.]+$/, ''); // Extract filename without extension
            if (itemTitle.toLowerCase().includes(pathTitle.toLowerCase()) || 
                pathTitle.toLowerCase().includes(itemTitle.toLowerCase())) {
              unifiedKey = key;
              console.log('[DEBUG - ADD-TO-COLLECTION] Found unified key by title match:', key, 'for path:', path);
              break;
            }
          }
        }
      }
      
      // Fallback to normalized path if no unified key found
      const keyToStore = unifiedKey || this.normalizePath(path);
      console.log('[DEBUG - ADD-TO-COLLECTION] Final key to store:', keyToStore);
      
      const collections = await this.getCollections();
      // Handle both single string and array of collection names
      const namesToAdd = Array.isArray(collectionNames)
        ? collectionNames
        : [collectionNames];
      let addedToAny = false;
      const results = [];
      for (const collectionName of namesToAdd) {
        if (!collectionName.trim()) continue;
        if (!collections[collectionName]) {
          collections[collectionName] = [];
        }
        // Check if key already exists
        const alreadyExists = collections[collectionName].includes(keyToStore);
        if (!alreadyExists) {
          collections[collectionName].push(keyToStore); // Store unified data key
          addedToAny = true;
          results.push({ collection: collectionName, added: true });
          console.log('[DEBUG - COLLECTIONS] Added to collection:', collectionName, 'unified key:', keyToStore);
        } else {
          results.push({
            collection: collectionName,
            added: false,
            reason: "Already exists",
          });
          console.log('[DEBUG - COLLECTIONS] Item already in collection:', collectionName, 'unified key:', keyToStore);
        }
      }
      if (addedToAny) {
        console.log('[DEBUG - COLLECTIONS] Saving collections to localStorage:', Object.keys(collections).length, 'collections');
        await this.saveCollections(collections);
        
        // Clear structured data cache to force recategorization
        this.structuredCollectionsData = null;
        console.log('[DEBUG - COLLECTIONS] Cleared structured data cache for recategorization');
        
        // Immediately update the collection button state
        await this.updateSingleCollectionButton(path);
        console.log('[DEBUG - COLLECTIONS] Successfully added to collections and saved');
        return { success: true, results };
      } else {
        return {
          success: false,
          results,
          message: "Item already in all specified collections",
        };
      }
    } catch (error) {
      console.error("[DEBUG - COLLECTIONS] Error adding to collection:", error);
      return { success: false, error: error.message };
    }
  }
  /**
     * Remove a media item from multiple collections
     */
  async removeFromCollection(collectionNames, path) {
    try {
      console.log('[DEBUG - REMOVE-FROM-COLLECTION] Removing item from collection:', { collectionNames, path });
      
      // Get the unified data key instead of normalizing the path (same as addToCollection)
      let unifiedKey = null;
      
      // Try to find the item in unified data by path
      if (this.unifiedData) {
        console.log('[DEBUG - REMOVE-FROM-COLLECTION] Searching unified data for path:', path);
        for (const [key, item] of Object.entries(this.unifiedData)) {
          // Check if this item matches the path
          if (item.path === path || item.absPath === path || 
              (item.files && item.files.some(file => file.absPath === path || file.relPath === path))) {
            unifiedKey = key;
            console.log('[DEBUG - REMOVE-FROM-COLLECTION] Found unified key:', key, 'for path:', path);
            break;
          }
        }
        
        if (!unifiedKey) {
          console.log('[DEBUG - REMOVE-FROM-COLLECTION] No unified key found for path:', path);
          // Try to find by title or name
          for (const [key, item] of Object.entries(this.unifiedData)) {
            const itemTitle = item.TMDBTitle || item.title || item.name || '';
            const pathTitle = path.split(/[\\\/]/).pop().replace(/\.[^/.]+$/, ''); // Extract filename without extension
            if (itemTitle.toLowerCase().includes(pathTitle.toLowerCase()) || 
                pathTitle.toLowerCase().includes(itemTitle.toLowerCase())) {
              unifiedKey = key;
              console.log('[DEBUG - REMOVE-FROM-COLLECTION] Found unified key by title match:', key, 'for path:', path);
              break;
            }
          }
        }
      }
      
      // Fallback to normalized path if no unified key found
      const keyToRemove = unifiedKey || this.normalizePath(path);
      console.log('[DEBUG - REMOVE-FROM-COLLECTION] Final key to remove:', keyToRemove);
      
      const collections = await this.getCollections();
      // Handle both single string and array of collection names
      const namesToRemove = Array.isArray(collectionNames)
        ? collectionNames
        : [collectionNames];
      let removedFromAny = false;
      const results = [];
      for (const collectionName of namesToRemove) {
        if (!collections[collectionName]) {
          results.push({
            collection: collectionName,
            removed: false,
            reason: "Collection not found",
          });
          console.log('[DEBUG - REMOVE-FROM-COLLECTION] Collection not found:', collectionName);
          continue;
        }
        // Find and remove the item using the same key format as addToCollection
        const originalIndex = collections[collectionName].findIndex(
          (storedKey) => storedKey === keyToRemove
        );
        if (originalIndex !== -1) {
          collections[collectionName].splice(originalIndex, 1);
          removedFromAny = true;
          results.push({ collection: collectionName, removed: true });
          console.log('[DEBUG - REMOVE-FROM-COLLECTION] Removed from collection:', collectionName, 'unified key:', keyToRemove);
          // Remove empty collections
          if (collections[collectionName].length === 0) {
            delete collections[collectionName];
          }
        } else {
          results.push({
            collection: collectionName,
            removed: false,
            reason: "Item not found",
          });
          console.log('[DEBUG - REMOVE-FROM-COLLECTION] Item not found in collection:', collectionName, 'unified key:', keyToRemove);
        }
      }
      if (removedFromAny) {
        await this.saveCollections(collections);
        
        // Clear structured data cache to force recategorization
        this.structuredCollectionsData = null;
        console.log('[DEBUG - COLLECTIONS] Cleared structured data cache for recategorization');
        
        // Immediately update the collection button state
        await this.updateSingleCollectionButton(path);
        return { success: true, results };
      } else {
        return {
          success: false,
          results,
          message: "Item not found in any specified collections",
        };
      }
    } catch (error) {
      console.error(
        "[DEBUG - COLLECTIONS] Error removing from collection:",
        error
      );
      return { success: false, error: error.message };
    }
  }
  /**
     * Get all collections that a media item belongs to
     */
  async getItemCollections(path) {
    try {
      console.log('[DEBUG - COLLECTIONS] getItemCollections called with path:', path);
      
      // If path is undefined or an object, try to extract the proper path
      let actualPath = path;
      if (typeof path === 'object' && path !== null) {
        // If it's an object, try to get the path from it
        actualPath = path.path || path.absPath || (path.files && path.files[0] && path.files[0].absPath);
        console.log('[DEBUG - COLLECTIONS] Extracted path from object:', actualPath);
      }
      
      const normalizedPath = this.normalizePath(actualPath);
      console.log('[DEBUG - COLLECTIONS] Normalized path:', normalizedPath);
      const collections = await this.getCollections();
      console.log('[DEBUG - COLLECTIONS] Total collections loaded:', Object.keys(collections).length);
      const itemCollections = [];
      
      // Try to find the unified data key for this path
      let unifiedKey = null;
      if (this.unifiedData) {
        console.log('[DEBUG - COLLECTIONS] Searching unified data for path:', actualPath);
        
        // First try exact path matching
        for (const [key, item] of Object.entries(this.unifiedData)) {
          if (item.path === actualPath || item.absPath === actualPath || 
              (item.files && item.files.some(file => file.absPath === actualPath || file.relPath === actualPath))) {
            unifiedKey = key;
            console.log('[DEBUG - COLLECTIONS] Found unified key by path match:', key);
            break;
          }
        }
        
        // If no exact match, try title-based matching
        if (!unifiedKey) {
          const pathTitle = actualPath.split(/[\\\/]/).pop().replace(/\.[^/.]+$/, ''); // Extract filename without extension
          console.log('[DEBUG - COLLECTIONS] Trying title-based matching for:', pathTitle);
          
          for (const [key, item] of Object.entries(this.unifiedData)) {
            const itemTitle = item.TMDBTitle || item.title || item.name || '';
            if (itemTitle.toLowerCase().includes(pathTitle.toLowerCase()) || 
                pathTitle.toLowerCase().includes(itemTitle.toLowerCase())) {
              unifiedKey = key;
              console.log('[DEBUG - COLLECTIONS] Found unified key by title match:', key, 'for title:', itemTitle);
              break;
            }
          }
        }
        
        // If still no match and path is undefined, try to find by title in the path parameter
        if (!unifiedKey && (!actualPath || actualPath === 'undefined')) {
          console.log('[DEBUG - COLLECTIONS] Path is undefined, trying to find by title in path parameter');
          // This might be called with a title instead of a path
          for (const [key, item] of Object.entries(this.unifiedData)) {
            const itemTitle = item.TMDBTitle || item.title || item.name || '';
            if (itemTitle.toLowerCase().includes(actualPath.toLowerCase()) || 
                actualPath.toLowerCase().includes(itemTitle.toLowerCase())) {
                unifiedKey = key;
              console.log('[DEBUG - COLLECTIONS] Found unified key by title match (undefined path):', key, 'for title:', itemTitle);
                break;
          }
        }
      }
      
      if (!unifiedKey) {
          console.log('[DEBUG - COLLECTIONS] No unified key found for path:', actualPath);
        }
      } else {
        console.log('[DEBUG - COLLECTIONS] No unified data available');
      }
      
      // Also try to find by normalized key (for collections that store normalized keys)
      const normalizedKey = this.normalizePath(actualPath).replace(/[^a-z0-9.]/g, '.').replace(/\.+/g, '.').replace(/^\.|\.$/g, '');
      
      // Also check structured collections data
      if (this.structuredCollectionsData) {
        console.log('[DEBUG - COLLECTIONS] Checking structured collections data');
        console.log('[DEBUG - COLLECTIONS] Structured collections structure:', Object.keys(this.structuredCollectionsData.collections));
        Object.entries(this.structuredCollectionsData.collections).forEach(([category, categoryCollections]) => {
          console.log(`[DEBUG - COLLECTIONS] Category ${category}:`, typeof categoryCollections, Object.keys(categoryCollections).slice(0, 3));
          Object.entries(categoryCollections).forEach(([collectionName, items]) => {
            if (items && Array.isArray(items) && items.length > 0) {
              // Check if any item matches the unified key
              const unifiedMatch = unifiedKey && items.some(item => item === unifiedKey);
              // Check if any item matches the normalized key
              const keyMatch = items.some(item => this.normalizePath(item) === normalizedKey);
              // Check if any item matches the normalized path
              const pathMatch = items.some(item => this.normalizePath(item) === normalizedPath);
              
              if (unifiedMatch || keyMatch || pathMatch) {
                console.log('[DEBUG - COLLECTIONS] Found match in structured collection:', collectionName, {
                  unifiedMatch, keyMatch, pathMatch, unifiedKey
                });
                if (!itemCollections.includes(collectionName)) {
                  itemCollections.push(collectionName);
                }
              }
            }
          });
        });
      }
      
      for (const [collectionName, paths] of Object.entries(collections)) {
        if (paths && Array.isArray(paths) && paths.length > 0) {
          console.log(`[DEBUG - COLLECTIONS] Checking collection "${collectionName}" with ${paths.length} items`);
          console.log(`[DEBUG - COLLECTIONS] Sample paths in collection:`, paths.slice(0, 3));
          
          // Check if this collection contains "a.good.year" for debugging
          if (collectionName.includes('PICK') || collectionName.includes('Russell') || collectionName.includes('Albert') || collectionName.includes('Drama') || collectionName.includes('Family')) {
            console.log(`[DEBUG - COLLECTIONS] Checking ${collectionName} for a.good.year:`, paths.filter(p => typeof p === 'string' && p.includes('good.year')));
          }
          
          // Check if any path matches the normalized path
          const pathMatch = paths.some(
            (storedPath) => {
              try {
                if (typeof storedPath === 'string') {
                  const normalizedStoredPath = this.normalizePath(storedPath);
                  const match = normalizedStoredPath === normalizedPath;
                  if (match) {
                    console.log(`[DEBUG - COLLECTIONS] Path match found in "${collectionName}":`, storedPath, '->', normalizedStoredPath, '===', normalizedPath);
                  }
                  return match;
                }
                return false;
              } catch (error) {
                console.warn(`[DEBUG - COLLECTIONS] Error processing stored path:`, storedPath, error);
                return false;
              }
            }
          );
          
          // Check if any path matches the normalized key
          const keyMatch = paths.some(
            (storedPath) => {
              try {
                if (typeof storedPath === 'string') {
                  const normalizedStoredPath = this.normalizePath(storedPath);
                  const match = normalizedStoredPath === normalizedKey;
                  if (match) {
                    console.log(`[DEBUG - COLLECTIONS] Key match found in "${collectionName}":`, storedPath, '->', normalizedStoredPath, '===', normalizedKey);
                  }
                  return match;
                }
                return false;
              } catch (error) {
                console.warn(`[DEBUG - COLLECTIONS] Error processing stored path for key match:`, storedPath, error);
                return false;
              }
            }
          );
          
          // Check if any path matches the unified key
          const unifiedMatch = unifiedKey && paths.some(
            (storedPath) => {
              try {
                const match = storedPath === unifiedKey;
                if (match) {
                  console.log(`[DEBUG - COLLECTIONS] Unified key match found in "${collectionName}":`, storedPath, '===', unifiedKey);
                }
                return match;
              } catch (error) {
                console.warn(`[DEBUG - COLLECTIONS] Error processing stored path for unified match:`, storedPath, error);
                return false;
              }
            }
          );
          
          if (pathMatch || keyMatch || unifiedMatch) {
            console.log('[DEBUG - COLLECTIONS] Found match in collection:', collectionName, {
              pathMatch, keyMatch, unifiedMatch, unifiedKey
            });
            if (!itemCollections.includes(collectionName)) {
          itemCollections.push(collectionName);
            }
          }
        }
      }
      
      console.log('[DEBUG - COLLECTIONS] Final result for path:', path, 'Collections:', itemCollections);
      return itemCollections;
    } catch (error) {
      console.error(
        "[DEBUG - COLLECTIONS] Error getting item collections:",
        error
      );
      console.error('[DEBUG - COLLECTIONS] Error details:', {
        message: error.message,
        stack: error.stack,
        path: path
      });
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
      // console.log('[DEBUG - COLLECTIONS] Deleted collection:', collectionName);
      return true;
    } catch (error) {
      console.error("[DEBUG - COLLECTIONS] Error deleting collection:", error);
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
      // console.log('[DEBUG - COLLECTIONS] Viewing collection:', collectionName, collectionItems);
      if (collectionItems.length > 0) {
        await this.showCollectionModal(collectionName, collectionItems);
      } else {
        this.showToast(`Collection "${collectionName}" is empty`, "info");
      }
    } catch (error) {
      console.error("[DEBUG - COLLECTIONS] Error viewing collection:", error);
      this.showToast("Error viewing collection", "error");
    }
  }
  
  // ========================================
  // COLLECTION MODAL HELPER METHODS
  // ========================================
  
  /**
   * Handle creating a new collection from the main input
   */
  async handleCreateNewCollection(modal, input) {
    const collectionName = input.value.trim();
    if (!collectionName) return;
    
    const categorySelect = modal.querySelector('#newCollectionCategory');
    const category = categorySelect ? categorySelect.value : 'My Collections';
    
    console.log(`[DEBUG - COLLECTIONS] Creating new collection: "${collectionName}" in category: ${category}`);
    
    // Map display names to internal category names
    const categoryMap = {
      'My Collections': 'my_collections',
      'Genres': 'genres',
      'Creative': 'creative',
      'Directors': 'directors',
      'Actors': 'actors',
      'Years': 'decades'
    };
    
    const internalCategory = categoryMap[category] || 'my_collections';
    
    // Add to the appropriate category section in the modal
    const categorySection = modal.querySelector(`[data-category="${internalCategory}"]`) || 
                          modal.querySelector('.collections-modal-category');
    
    if (categorySection) {
      // Create new checkbox item
      const newCheckboxHTML = `
        <label class="collections-modal-checkbox-item">
          <input type="checkbox" value="${collectionName}">
          <span class="collections-modal-checkbox-text">${collectionName}</span>
        </label>
      `;
      
      // Insert before the "Add New" section
      const addNewSection = categorySection.querySelector('.collection-add-new-item');
      if (addNewSection) {
        addNewSection.insertAdjacentHTML('beforebegin', newCheckboxHTML);
      }
      
      // Clear the input
      input.value = '';
      
      // Add event handler to the new checkbox
      const newCheckbox = categorySection.querySelector(`input[value="${collectionName}"]`);
      if (newCheckbox) {
        newCheckbox.addEventListener('change', (e) => {
          const label = e.target.value;
          const isChecked = e.target.checked;
          
          // Find all checkboxes with the same label and sync them
          const sameLabelCheckboxes = modal.querySelectorAll(`input[type="checkbox"][value="${label}"]`);
          sameLabelCheckboxes.forEach(sameCheckbox => {
            if (sameCheckbox !== e.target) {
              sameCheckbox.checked = isChecked;
            }
          });
        });
      }
      
      // Show success message
      this.showToast(`Created new collection: "${collectionName}"`, 'success');
    }
  }
  
  /**
   * Handle updating collections when Update Collections button is clicked
   */
  async handleUpdateCollections(modal, mediaItem) {
    console.log('[DEBUG - COLLECTIONS] Update Collections button clicked');
    
    try {
      // Get current collections for this item
      const currentCollections = await this.getItemCollections(mediaItem.path);
      console.log('[DEBUG - COLLECTIONS] Current collections for', mediaItem.path, ':', currentCollections);
      
      // Get all checked checkboxes (only enabled ones - these are new collections to add)
      const checkedBoxes = modal.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)');
      const selectedCollections = Array.from(checkedBoxes).map(cb => cb.value);
      console.log('[DEBUG - COLLECTIONS] Selected collections:', selectedCollections);
      
      // ADD TO COLLECTION MODAL: Only ADD collections, never remove them
      // Since we only selected enabled checkboxes, these are all new collections to add
      const collectionsToAdd = selectedCollections;
      
      console.log('[DEBUG - COLLECTIONS] Collections to add:', collectionsToAdd);
      console.log('[DEBUG - COLLECTIONS] Note: This is an ADD modal - no collections will be removed');
      
      // Add to new collections only
      for (const collectionName of collectionsToAdd) {
        console.log(`[DEBUG - COLLECTIONS] Adding "${collectionName}" to path: ${mediaItem.path}`);
        const result = await this.addToCollection(collectionName, mediaItem.path);
        console.log(`[DEBUG - COLLECTIONS] Add result for "${collectionName}":`, result);
        
        if (result.success) {
          console.log(`[DEBUG - COLLECTIONS] Successfully added "${collectionName}"`);
        } else {
          console.error(`[DEBUG - COLLECTIONS] Failed to add "${collectionName}":`, result);
        }
      }
      
      // Note: Collections are only removed via the collection pill "×" button and confirm modal
      
      // Show success message
      if (collectionsToAdd.length > 0) {
        this.showToast(`Added to ${collectionsToAdd.length} collections!`, 'success');
      } else {
        this.showToast(`No new collections to add`, 'info');
      }
      
      // Close modal
      modal.remove();
      
      // Refresh the main UI to update collection pills
      this.refreshCollectionDisplay();
      
    } catch (error) {
      console.error('[DEBUG - COLLECTIONS] Error updating collections:', error);
      this.showToast('Error updating collections', 'error');
    }
  }
  
  /**
   * Refresh collection display in the UI
   */
  refreshCollectionDisplay() {
    try {
      // Refresh collection pills in the media library
      if (this.currentMediaItem) {
        this.updateCollectionPills(this.currentMediaItem);
      }
      
      // Refresh any collection modals that might be open
      const openModal = document.getElementById('addToCollectionModal');
      if (openModal) {
        // Modal is still open, refresh it
        console.log('[DEBUG - COLLECTIONS] Refreshing open modal');
      }
      
      console.log('[DEBUG - COLLECTIONS] Collection display refreshed');
    } catch (error) {
      console.error('[DEBUG - COLLECTIONS] Error refreshing collection display:', error);
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
      const existing = document.getElementById("addToCollectionModal");
      if (existing) existing.remove();
      
      // Load unified data if not already loaded
      if (!this.unifiedData || Object.keys(this.unifiedData).length === 0) {
        console.log('[DEBUG - COLLECTIONS] Loading unified data for collection modal...');
        await this.loadUnifiedData();
      }
      
      // Run migration to add metadata to existing collections
      console.log('[DEBUG - COLLECTIONS] Running collection metadata migration...');
      const migratedCount = await this.migrateCollectionsToMetadata();
      if (migratedCount > 0) {
        console.log(`[DEBUG - COLLECTIONS] Migrated ${migratedCount} collections to metadata format`);
      }
      
      // Load collection types from JSON and merge with localStorage
      let collectionTypes = {};
      try {
        const response = await fetch('/components/MediaLibrary/data/collection-listing.json?v=' + Date.now());
        if (response.ok) {
          collectionTypes = await response.json();
        }
      } catch (error) {
        console.warn('[COLLECTIONS] Failed to load collection types from server:', error);
      }
      
      // Merge with localStorage collection types (for newly added items)
      try {
        const localStorageTypes = localStorage.getItem('collectionTypes');
        if (localStorageTypes) {
          const parsedLocalTypes = JSON.parse(localStorageTypes);
          // Merge server types with localStorage types
          for (const [category, items] of Object.entries(parsedLocalTypes)) {
            if (!collectionTypes[category]) {
              collectionTypes[category] = [];
            }
            // Add new items from localStorage that aren't in server data
            for (const item of items) {
              if (!collectionTypes[category].includes(item)) {
                collectionTypes[category].push(item);
              }
            }
            // Sort each category
            collectionTypes[category].sort();
          }
          console.log('[DEBUG - COLLECTIONS] Merged localStorage collection types with server data');
        }
      } catch (error) {
        console.warn('[COLLECTIONS] Failed to merge localStorage collection types:', error);
      }
      
      // Get current collections for dropdown using structured data
      const collectionsData = await this.getStructuredCollections();
      
      // Use the myCollections for the "My Collections" section
      const myCollections = collectionsData.collections.my_collections || {};
      const collectionNames = Object.keys(myCollections).sort((a, b) => {
        // Always put "My PICK" first
        if (a === "My PICK") return -1;
        if (b === "My PICK") return 1;
        
        // Sort all other collections alphabetically
        return a.localeCompare(b, undefined, {
          sensitivity: "base",
          numeric: true,
          caseFirst: "upper",
        });
      });
      
      // Don't merge collectionTypes into collectionsData - this causes categorization issues
      // collectionTypes is used separately for the "Add New" inputs
      
      // Get current collections for this item
      console.log('[DEBUG - COLLECTIONS] Modal: About to call getItemCollections with path:', mediaItem.path);
      const itemCollections = await this.getItemCollections(mediaItem.path);
      
      // Debug: Log what collections this item is actually in
      console.log('[DEBUG - COLLECTIONS] Modal: Item collections for', mediaItem.path, ':', itemCollections);
      console.log('[DEBUG - COLLECTIONS] Modal: Media item details:', {
        path: mediaItem.path,
        absPath: mediaItem.absPath,
        normalizedKey: mediaItem.normalizedKey,
        title: mediaItem.title
      });
      
      // Also check what the updateCollectionButtons method would find
      console.log('[DEBUG - COLLECTIONS] Modal: Checking what updateCollectionButtons would find...');
      const testCollections = await this.getItemCollections(mediaItem.path);
      console.log('[DEBUG - COLLECTIONS] Modal: Test collections result:', testCollections);
      

      
      // Debug: Log what title we're using
      const displayTitle = this.getDisplayTitle(mediaItem);
      console.log('[DEBUG - COLLECTIONS] Modal title resolution:', {
        TMDBTitle: mediaItem.TMDBTitle,
        title: mediaItem.title,
        name: mediaItem.name,
        path: mediaItem.path,
        finalDisplayTitle: displayTitle
      });
      
      // Create modal HTML
      const modalHTML = `
                <div id="addToCollectionModal" class="collection-modal-overlay">
                    <div class="collection-modal-add-create-content">
                        <div class="collection-modal-header">
                            <h3>Add to Collections: <span style="color: #4CAF50;">${displayTitle}</span></h3>
                            <button class="collection-modal-btn collection-modal-btn-close" id="closeCollectionModal">&times;</button>
                        </div>
                        <div class="collection-modal-body">
                            <div class="collections-modal-section">
                                <label class="collections-modal-label" style="color: #fff;">Current Collections:</label>
                                <div id="currentCollectionsList" class="collections-modal-current-list">
                                    ${
                                      itemCollections.length > 0
                                        ? itemCollections
                                            .map(
                                              (name) => `
                                            <span class="collections-modal-tag">
                                                ${name} 
                                                <button class="remove-collection-btn" data-collection="${name}">×</button>
                                            </span>
                                        `
                                            )
                                            .join("")
                                        : '<span class="collections-modal-no-collections">Not in any collections</span>'
                                    }
                                </div>
                            </div>
                            <div class="collections-modal-section">
                                <label class="collections-modal-label" style="color: #4CAF50;">Add to Collections:</label>
                                <div class="collections-modal-checkbox-list">
                                    ${(() => {
                                      let html = '';
                                      // Always show My Collections section (even when empty)
                                        html += '<div class="collections-modal-category">';
                                      html += '<h4 style="color: #fff; margin: 10px 0 5px 0;">My Collections</h4>';
                                      if (collectionNames.length > 0) {
                                        html += collectionNames.map(name => `
                                        <label class="collections-modal-checkbox-item">
                                            <input type="checkbox" value="${name}" ${itemCollections.includes(name) ? "disabled" : ""}>
                                            <span class="collections-modal-checkbox-text">${name}</span>
                                        </label>
                                        `).join('');
                                      } else {
                                        html += '<div class="collections-modal-empty-category">';
                                        html += '<span style="color: #666; font-style: italic;">No custom collections yet</span>';
                                        html += '</div>';
                                      }
                                      html += '</div>';
                                      

                                      
                                      // Add collections by category in specific order: Creative, Genres, Actors, Directors, Years
                                      const categoryOrder = ['creative', 'genres', 'actors', 'directors', 'decades', 'moods'];
                                      
                                      for (const category of categoryOrder) {
                                        const collections = collectionsData.collections[category];
                                        if (collections) {
                                          html += '<div class="collections-modal-category">';
                                                                                                                                html += `<h4 style="color: #4CAF50; margin: 15px 0 5px 0; text-transform: capitalize;">${category}</h4>`;
                                          
                                          // Check if this category has any collections (objects with collection names as keys)
                                          if (collections && typeof collections === 'object' && Object.keys(collections).length > 0) {
                                            // Get collection names and sort alphabetically
                                            const collectionNames = Object.keys(collections).sort((a, b) => a.localeCompare(b));
                                            
                                            html += collectionNames.map(collectionName => {
                                              // Use the itemCollections result instead of doing our own checking
                                              const isInCollection = itemCollections.includes(collectionName);
                                              
                                              return `
                                             <label class="collections-modal-checkbox-item">
                                                  <input type="checkbox" value="${collectionName}" ${isInCollection ? "disabled" : ""}>
                                                  <span class="collections-modal-checkbox-text">${collectionName}</span>
                                             </label>
                                              `;
                                            }).join('');
                                          } else {
                                            // Show empty state for categories with no collections
                                            html += '<div class="collections-modal-empty-category">';
                                            html += `<span style="color: #666; font-style: italic;">No ${category} collections yet</span>`;
                                            html += '</div>';
                                          }
                                          
                                           html += `<div class="collection-add-new-item">
                                             <input type="text" class="collection-new-item-input" placeholder="Add new ${category.toLowerCase().slice(0, -1)}..." data-category="${category}">
                                             <button class="collection-add-item-btn" data-category="${category}" title="Add new ${category.toLowerCase().slice(0, -1)}">+</button>
                                           </div>`;
                                           html += '</div>';
                                        }
                                      }
                                      return html;
                                    })()}
                                </div>
                            </div>
                            <div class="collections-modal-divider">
                                <div class="collections-modal-divider-line"></div>
                                <span class="collections-modal-divider-text">or</span>
                        </div>
                            <div class="collections-modal-section">
                                <label class="collections-modal-label">Create new collection:</label>
                                <div class="collections-modal-new-collection">
                                    <select id="newCollectionCategory" class="collection-category-select">
                                        <option value="My Collections">My Collections</option>
                                        <option value="Genres">Genres</option>
                                        <option value="Creative">Creative</option>
                                        <option value="Directors">Directors</option>
                                        <option value="Actors">Actors</option>
                                        <option value="Years">Years</option>
                                    </select>
                                    <input id="newCollectionInput" type="text" placeholder="New collection name" class="collection-input">
                                </div>
                            </div>
                        </div>
                        <div class="collection-modal-footer">
                            <button id="cancelCollectionBtn" class="collection-modal-btn collection-modal-btn-cancel">Cancel</button>
                            <button id="addCollectionBtn" class="collection-modal-btn collection-modal-btn-primary">Add to Collections</button>
                            </div>
                                </div>
                        </div>
                    `;
      // Insert modal into DOM
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      // Get modal elements
      const modal = document.getElementById("addToCollectionModal");
      const newInput = document.getElementById("newCollectionInput");
      const addBtn = document.getElementById("addCollectionBtn");
      const cancelBtn = document.getElementById("cancelCollectionBtn");
      const closeBtn = document.getElementById("closeCollectionModal");
      
      // Debug: Check if button exists
      console.log('[DEBUG - COLLECTIONS] Add button found:', !!addBtn);
      console.log('[DEBUG - COLLECTIONS] Add button element:', addBtn);
      if (!addBtn) {
        console.error('[DEBUG - COLLECTIONS] Add button not found!');
        return;
      }
      
      // Test if button is clickable
      console.log('[DEBUG - COLLECTIONS] Button disabled:', addBtn.disabled);
      console.log('[DEBUG - COLLECTIONS] Button text:', addBtn.textContent);
      // Close modal function
      const closeModal = () => {
        modal.remove();
      };
      // Event listeners
      closeBtn.addEventListener("click", closeModal);
      cancelBtn.addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
      
             // Add synchronized checkbox behavior for duplicate labels
       const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
       checkboxes.forEach(checkbox => {
         checkbox.addEventListener('change', (e) => {
           // Prevent unchecking disabled checkboxes (items already in collections)
           if (e.target.disabled && !e.target.checked) {
             e.target.checked = true; // Re-check the disabled checkbox
             this.showToast('Use the "×" button on the collection pill to remove items', 'info');
             return;
           }
           
           const label = e.target.value;
           const isChecked = e.target.checked;
           
           // Find all checkboxes with the same label and sync them
           const sameLabelCheckboxes = modal.querySelectorAll(`input[type="checkbox"][value="${label}"]`);
           sameLabelCheckboxes.forEach(sameCheckbox => {
             if (sameCheckbox !== e.target) {
               sameCheckbox.checked = isChecked;
             }
           });
         });
       });
       
       // Add "Add New Item" functionality for each category
       const addNewInputs = modal.querySelectorAll('.collection-new-item-input');
       const addNewButtons = modal.querySelectorAll('.collection-add-item-btn');
       
       console.log('[DEBUG - COLLECTIONS] Found add new inputs:', addNewInputs.length);
       console.log('[DEBUG - COLLECTIONS] Found add new buttons:', addNewButtons.length);
       
       addNewInputs.forEach((input, index) => {
         const addButton = addNewButtons[index];
         const category = input.dataset.category;
         console.log(`[DEBUG - COLLECTIONS] Setting up input for category: ${category}`);
         
         // Handle Enter key press
         input.addEventListener('keypress', (e) => {
           if (e.key === 'Enter') {
             addNewItemToCategory(input, addButton, category);
           }
         });
         
         // Handle Add button click
         addButton.addEventListener('click', () => {
           console.log(`[DEBUG - COLLECTIONS] Add button clicked for category: ${category}`);
           addNewItemToCategory(input, addButton, category);
         });
       });
       
       // Function to add new item to a category
       const addNewItemToCategory = async (input, button, category) => {
         const newItemName = input.value.trim();
         if (!newItemName) return;
         
         // Find the category container
         const categoryContainer = input.closest('.collections-modal-category');
         if (!categoryContainer) return;
         
         // Create new checkbox item (checked by default since movie is now in this collection)
         const newCheckboxHTML = `
           <label class="collections-modal-checkbox-item">
             <input type="checkbox" value="${newItemName}" checked disabled>
             <span class="collections-modal-checkbox-text">${newItemName}</span>
           </label>
         `;
         
         // Insert before the "Add New" section
         const addNewSection = categoryContainer.querySelector('.collection-add-new-item');
         addNewSection.insertAdjacentHTML('beforebegin', newCheckboxHTML);
         
         // Clear the input
         input.value = '';
         
         // Add synchronized checkbox behavior to the new checkbox
         const newCheckbox = categoryContainer.querySelector(`input[value="${newItemName}"]`);
         newCheckbox.addEventListener('change', (e) => {
           // Prevent unchecking disabled checkboxes (items already in collections)
           if (e.target.disabled && !e.target.checked) {
             e.target.checked = true; // Re-check the disabled checkbox
             this.showToast('Use the "×" button on the collection pill to remove items', 'info');
             return;
           }
           
           const label = e.target.value;
           const isChecked = e.target.checked;
           
           // Find all checkboxes with the same label and sync them
           const sameLabelCheckboxes = modal.querySelectorAll(`input[type="checkbox"][value="${label}"]`);
           sameLabelCheckboxes.forEach(sameCheckbox => {
             if (sameCheckbox !== e.target) {
               sameCheckbox.checked = isChecked;
             }
           });
         });
         
         // PERSISTENCE: Save the new item using the backup approach
         try {
           console.log(`[DEBUG - COLLECTIONS] Persisting new ${category.toLowerCase().slice(0, -1)}: ${newItemName}`);
           
           // Add the new collection to localStorage (flat format)
           const collections = await this.getCollections();
           if (!collections[newItemName]) {
             collections[newItemName] = [];
             console.log(`[DEBUG - COLLECTIONS] Created new collection "${newItemName}"`);
             
             // Store collection type metadata in BOTH localStorage AND collections.json file
             const collectionType = category.toLowerCase().slice(0, -1);
             
             // Store in localStorage for fast access
             const collectionMetadata = JSON.parse(localStorage.getItem('collectionMetadata') || '{}');
             collectionMetadata[newItemName] = {
               type: collectionType,
               created: new Date().toISOString(),
               source: 'localStorage'
             };
             localStorage.setItem('collectionMetadata', JSON.stringify(collectionMetadata));
             
             // Also store in collections.json for persistence
             await this.setCollectionTypeInFile(newItemName, collectionType);
             
             console.log(`[DEBUG - COLLECTIONS] Added metadata for "${newItemName}": type="${collectionType}" to both localStorage and collections.json`);
           } else {
             console.log(`[DEBUG - COLLECTIONS] Collection "${newItemName}" already exists`);
           }
           
           // CRITICAL: Add the current movie to the new collection
           const moviePath = mediaItem.path;
           const normalizedPath = this.normalizePath(moviePath);
           
           // Check if movie is already in this collection
           if (!collections[newItemName].includes(normalizedPath)) {
             collections[newItemName].push(normalizedPath);
             console.log(`[DEBUG - COLLECTIONS] Added movie "${moviePath}" to new collection "${newItemName}"`);
           } else {
             console.log(`[DEBUG - COLLECTIONS] Movie already in collection "${newItemName}"`);
           }
           
           // Save the updated collections
           await this.saveCollections(collections);
           console.log(`[DEBUG - COLLECTIONS] Successfully saved collections with new item`);
           
           // Add to collectionTypes so it shows up in the category listings
           if (!collectionTypes[category]) {
             collectionTypes[category] = [];
           }
           if (!collectionTypes[category].includes(newItemName)) {
             collectionTypes[category].push(newItemName);
             collectionTypes[category].sort();
             console.log(`[DEBUG - COLLECTIONS] Added "${newItemName}" to collectionTypes[${category}]`);
           }
           
           // CRITICAL: Also add to structuredCollectionsData so it appears in the correct category
           if (this.structuredCollectionsData && this.structuredCollectionsData.collections) {
             if (!this.structuredCollectionsData.collections[category]) {
               this.structuredCollectionsData.collections[category] = {};
             }
             if (!this.structuredCollectionsData.collections[category][newItemName]) {
               this.structuredCollectionsData.collections[category][newItemName] = [];
               console.log(`[DEBUG - COLLECTIONS] Added "${newItemName}" to structuredCollectionsData[${category}]`);
             }
           }
           
         } catch (error) {
           console.error(`[DEBUG - COLLECTIONS] Error persisting new ${category.toLowerCase().slice(0, -1)}:`, error);
           this.showToast(`Error creating collection: ${error.message}`, 'error');
           return;
         }
         
         console.log(`[DEBUG - COLLECTIONS] Added new collection: ${newItemName}`);
         
         // Update the "Current Collections" section to show the new collection
         const currentCollectionsList = modal.querySelector('#currentCollectionsList');
         if (currentCollectionsList) {
           // Add the new collection pill to the current collections
           const newPillHTML = `
             <span class="collections-modal-tag">
               ${newItemName} 
               <button class="remove-collection-btn" data-collection="${newItemName}">×</button>
             </span>
           `;
           currentCollectionsList.insertAdjacentHTML('beforeend', newPillHTML);
           console.log(`[DEBUG - COLLECTIONS] Added "${newItemName}" to current collections display`);
         }
         
         // Show success message
         this.showToast(`Added "${newItemName}" to ${category} and to this movie`, 'success');
         
         // Refresh the modal to show the new actor in the correct category
         setTimeout(() => {
           console.log(`[DEBUG - COLLECTIONS] Refreshing modal to show "${newItemName}" in ${category} category`);
           // Close current modal
           modal.remove();
           // Reopen modal with updated data
           this.showAddToCollectionModal(mediaItem);
         }, 500);
       };
      // Handle remove collection buttons
      modal.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-collection-btn")) {
          e.preventDefault();
          e.stopPropagation();
          const collectionName = e.target.dataset.collection;
          const mediaTitle = this.getDisplayTitle(mediaItem);
          const confirmed = await window.ConfirmModalComponent.confirmRemove(collectionName, mediaTitle);
          if (confirmed) {
            try {
              const result = await this.removeFromCollection(
                collectionName,
                mediaItem.path
              );
              if (result.success) {
                this.showToast(
                  `Removed "${collectionName}" from "${mediaTitle}"!`,
                  "success"
                );
                // Refresh the modal to show updated collections
                await this.showAddToCollectionModal(mediaItem);
                // Refresh the main UI to update collection pills
                await this.refreshCurrentView();
              } else {
                this.showToast("Error removing from collection", "error");
              }
            } catch (error) {
              console.error(
                "[DEBUG - COLLECTIONS] Error removing from collection:",
                error
              );
              this.showToast("Error removing from collection", "error");
            }
          }
        }
      });
      // Add to collection logic
      addBtn.addEventListener("click", async (e) => {
        console.log('[DEBUG - COLLECTIONS] Update button clicked!', e);
        e.preventDefault();
        e.stopPropagation();
        // Show loading state with spinner
        const originalText = addBtn.textContent;
        addBtn.innerHTML =
          '<span class="collection-btn-spinner"></span> Updating...';
        addBtn.disabled = true;
        
        // Get selected collections from checkboxes
        // Only include ENABLED checked checkboxes (new collections to add)
        // Disabled checkboxes represent existing collections that should be preserved
        const selectedCollections = Array.from(
          modal.querySelectorAll(
            'input[type="checkbox"]:checked:not(:disabled)'
          )
        )
          .map((cb) => cb.value.trim())
          .filter((name) => name);
          
        // Get new collection name and category if entered
        const newName = newInput.value.trim();
        const newCategory = document.getElementById('newCollectionCategory').value;
        if (newName) {
          // Add category prefix to new collection name for organization
          // But don't add prefix for "My Collections" since it's redundant
          const categorizedName = newCategory === 'My Collections' ? newName : `${newCategory}: ${newName}`;
          selectedCollections.push(categorizedName);
        }
        
        if (selectedCollections.length === 0) {
          this.showToast(
            "Please select collections or enter a new collection name.",
            "error"
          );
          // Reset button state
          addBtn.innerHTML = originalText;
          addBtn.disabled = false;
          return;
        }
        
        try {
          // Get current collections to determine what to add
          const currentCollections = await this.getItemCollections(mediaItem.path);
          console.log('[DEBUG - COLLECTIONS] Current collections for', mediaItem.path, ':', currentCollections);
          console.log('[DEBUG - COLLECTIONS] Selected collections:', selectedCollections);
          
          // ONLY ADD collections - never remove from this modal
          // The "Add to Collection" modal is for ADDING only
          // Removal should only happen via pill "x" button with confirmation
          // Since we only selected enabled checkboxes, these are all new collections to add
          const collectionsToAdd = selectedCollections;
          
          console.log('[DEBUG - COLLECTIONS] Collections to add:', collectionsToAdd);
          console.log('[DEBUG - COLLECTIONS] NOTE: This modal only ADDS collections, never removes them');
          
          // Add to new collections only
          if (collectionsToAdd.length > 0) {
            console.log('[DEBUG - COLLECTIONS] Adding to collections:', collectionsToAdd);
            const addResult = await this.addToCollection(
              collectionsToAdd,
              mediaItem.path
            );
            console.log('[DEBUG - COLLECTIONS] Add result:', addResult);
            if (!addResult.success) {
              this.showToast(
                addResult.message || "Error adding to collections",
                "error"
              );
              return;
            }
          } else {
            console.log('[DEBUG - COLLECTIONS] No new collections to add');
            this.showToast("No new collections to add", "info");
              return;
          }
          
          // Show success message
          const totalChanges = collectionsToAdd.length;
          if (totalChanges > 0) {
              const mediaTitle = this.getDisplayTitle(mediaItem);
              this.showToast(
              `Updated "${mediaTitle}" in ${totalChanges} collection(s)!`,
                "success"
              );
              
              // Update collection buttons BEFORE closing modal so user can see the change
              console.log('[DEBUG - COLLECTIONS] Updating collection buttons before closing modal...');
              
              // Add a small delay to ensure DOM is ready
              setTimeout(async () => {
                await this.updateCollectionButtons();
                console.log('[DEBUG - COLLECTIONS] Collection buttons updated, now closing modal');
                
                // Close modal after a brief delay so user can see the change
                setTimeout(() => {
                  closeModal();
                }, 500);
              }, 100);
          } else {
            this.showToast("No changes made to collections.", "info");
            closeModal();
          }
          
        } catch (error) {
          console.error(
            "[DEBUG - COLLECTIONS] Error updating collections:",
            error
          );
          this.showToast("Error updating collections", "error");
        } finally {
          // Always reset button state
          addBtn.innerHTML = originalText;
          addBtn.disabled = false;
        }
      });
      // console.log('[DEBUG - COLLECTIONS] Add to collection modal opened for:', mediaItem);
    } catch (error) {
      console.error(
        "[DEBUG - COLLECTIONS] Error opening add to collection modal:",
        error
      );
      this.showToast("Error opening collection modal", "error");
    }
  }
  /**
     * Show collection contents modal (COLLECTIONS ONLY - NO SHARED FUNCTIONALITY)
     */
  async showCollectionModal(collectionName, collectionItems) {
    try {
      console.log('[DEBUG - COLLECTIONS] showCollectionModal called with:', {
        collectionName,
        collectionItems: collectionItems.slice(0, 5), // Log first 5 items
        totalItems: collectionItems.length
      });
      
      // Remove any existing modal
      const existingModal = document.getElementById("collectionModal");
      if (existingModal) {
        existingModal.remove();
      }
      // LOAD UNIFIED DATA FIRST - NO FALLBACKS
      // Load unified data (both movies and TV shows)
      try {
        const movieResponse = await fetch(
          "/components/MediaLibrary/data/movies/movies-unified.json?v=" +
            Date.now()
        );
        const tvResponse = await fetch(
          "/components/MediaLibrary/data/tv-shows/tv-shows-unified.json?v=" +
            Date.now()
        );
        
        if (movieResponse.ok && tvResponse.ok) {
          const moviesData = await movieResponse.json();
          const tvShowsData = await tvResponse.json();
          // Merge into unified data structure
          this.unifiedData = { ...tvShowsData, ...moviesData };
          console.log("[COLLECTIONS] Loaded unified data:", {
            movies: Object.values(this.unifiedData).filter(item => item.isMovie).length,
            tvShows: Object.values(this.unifiedData).filter(item => !item.isMovie).length
          });
        } else {
          console.error("[COLLECTIONS] Failed to load unified data:", {
            movies: movieResponse.status,
            tvShows: tvResponse.status
          });
        }
      } catch (error) {
        console.error("[COLLECTIONS] Error loading unified data:", error);
      }
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
        // Skip if path is not a string
        if (!path || typeof path !== 'string') {
          console.warn('[DEBUG - COLLECTIONS] Skipping non-string path in collection items:', path);
          return;
        }
        const pathLower = path.toLowerCase();
        // Use type field for accurate detection
        const isTVShow = false; // Collections don't have type field, so we'll handle this differently
      });
      // For collections, we use path-based detection since collections store paths
      console.log('[DEBUG - COLLECTION FILTERING] Collection items:', collectionItems);
      
      const tvShows = collectionItems.filter((key) => {
        if (!key || typeof key !== 'string') return false;
        
        // Check if this is a TV show by looking it up in unified data
        if (this.unifiedData && this.unifiedData[key]) {
          const item = this.unifiedData[key];
          return !item.isMovie; // TV shows have isMovie: false or undefined
        }
        
        // Fallback: check key patterns (for backward compatibility)
        const keyLower = key.toLowerCase();
        return (
          keyLower.includes("tvshows") ||
          keyLower.includes("tv_shows") ||
          keyLower.includes("tv shows") ||
          keyLower.startsWith("tvshows.") ||
          keyLower.includes(".tvshows.")
        );
      });
      
      const movies = collectionItems.filter((key) => {
        if (!key || typeof key !== 'string') return true; // Treat non-strings as movies
        
        // Check if this is a movie by looking it up in unified data
        if (this.unifiedData && this.unifiedData[key]) {
          const item = this.unifiedData[key];
          return item.isMovie === true; // Movies have isMovie: true
        }
        
        // Fallback: check key patterns (for backward compatibility)
        const keyLower = key.toLowerCase();
        const isMovie = (
          !keyLower.includes("tvshows") &&
          !keyLower.includes("tv_shows") &&
          !keyLower.includes("tv shows")
        );
        if (keyLower.includes('bored') || keyLower.includes('death')) {
          console.log('[DEBUG - COLLECTION FILTERING] Bored to Death key:', key, 'isMovie:', isMovie);
        }
        return isMovie;
      });
      
      console.log('[DEBUG - COLLECTION FILTERING] Final counts - Movies:', movies.length, 'TV Shows:', tvShows.length);
      // Sort movies alphabetically by title
      const sortedMovies = movies.sort((a, b) => {
        const titleA = this.extractTitleFromPath(a);
        const titleB = this.extractTitleFromPath(b);
        return titleA.localeCompare(titleB, undefined, {
          sensitivity: "base",
          numeric: true,
          caseFirst: "upper",
        });
      });
      modalHTML += `
                <div class="modal-collections-section modal-collections-movies-section">
                    <h3 class="modal-collections-section-title" style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">MOVIES (${sortedMovies.length})</h3>
                    <div class="modal-collections-movies-grid">
            `;
      if (sortedMovies.length > 0) {
        for (const path of sortedMovies) {
          // Skip if path is not a string
          if (!path || typeof path !== 'string') {
            console.warn('[DEBUG - COLLECTIONS] Skipping non-string path in movies:', path);
            continue;
          }
          // Extract title from path and humanize it
          const rawTitle = this.extractTitleFromPath(path);
          const title = this.humanizeMovieTitle(rawTitle);
          
          // Get poster from unified data using proper file path matching
          let posterPath = "/assets/img/placeholder-poster.jpg";
          let movieKey = null;
          let movieData = null;
          
          if (this.unifiedData) {
            // Search for movie by path in unified data (same logic as renderCollectionsTab)
            console.log('[COLLECTIONS DEBUG] Looking for movie with path:', path);
            for (const [key, item] of Object.entries(this.unifiedData)) {
              if (item.type === 'movie' && item.files) {
                console.log('[COLLECTIONS DEBUG] Checking movie:', key);
                console.log('[COLLECTIONS DEBUG] Movie files:', item.files);
                
                // SIMPLE: Check if ANY path in the movie data matches what Collections has stored
                const hasMatchingFile = item.files.some(file => {
                  // Normalize all paths for comparison
                  const normalizeForComparison = (pathStr) => {
                    if (!pathStr) return '';
                    return pathStr
                      .replace(/\\/g, '/') // Convert backslashes to forward slashes
                      .toLowerCase()
                      .trim();
                  };
                  
                  const normalizedCollectionsPath = normalizeForComparison(path);
                  const normalizedAbsPath = normalizeForComparison(file.absPath);
                  const normalizedRelPath = normalizeForComparison(file.relPath);
                  const normalizedItemPath = normalizeForComparison(item.path);
                  
                  // Check if Collections path matches the movie folder name (more precise matching)
                  const extractMovieFolder = (fullPath) => {
                    if (!fullPath) return '';
                    const pathParts = fullPath.split('/');
                    // Look for the movie folder (after 'media/movies' or similar)
                    for (let i = 0; i < pathParts.length; i++) {
                      if (pathParts[i].toLowerCase().includes('movies') && pathParts[i + 1]) {
                        return pathParts[i + 1].toLowerCase().trim();
                      }
                    }
                    // Fallback: get the folder containing the file
                    if (pathParts.length >= 2) {
                      return pathParts[pathParts.length - 2].toLowerCase().trim();
                    }
                    return '';
                  };
                  
                  // For Collections paths, they're already just the folder name (e.g., "open.season.(2006)")
                  // For unified data paths, extract the folder name from the full path
                  const collectionsMovieName = normalizedCollectionsPath; // Collections path IS the folder name
                  const absPathMovieName = extractMovieFolder(normalizedAbsPath);
                  const relPathMovieName = extractMovieFolder(normalizedRelPath);
                  
                  // Convert Collections path dots to spaces for comparison
                  const normalizedCollectionsName = collectionsMovieName.replace(/\./g, ' ').trim();
                  const normalizedAbsName = absPathMovieName.replace(/\./g, ' ').trim();
                  const normalizedRelName = relPathMovieName.replace(/\./g, ' ').trim();
                  
                  // Case-insensitive comparison for better matching
                  const absPathMatch = normalizedAbsName.toLowerCase() === normalizedCollectionsName.toLowerCase();
                  const relPathMatch = normalizedRelName.toLowerCase() === normalizedCollectionsName.toLowerCase();
                  
                  console.log('[COLLECTIONS DEBUG] Folder name matching:', {
                    collectionsPath: path,
                    collectionsMovieName: collectionsMovieName,
                    normalizedCollectionsName: normalizedCollectionsName,
                    absPathMovieName: absPathMovieName,
                    normalizedAbsName: normalizedAbsName,
                    relPathMovieName: relPathMovieName,
                    normalizedRelName: normalizedRelName,
                    absPathMatch: absPathMatch,
                    relPathMatch: relPathMatch
                  });
                  
                  return absPathMatch || relPathMatch;
                });
                
                if (hasMatchingFile) {
                  movieData = item;
                  movieKey = key;
                  posterPath = item.poster || "/assets/img/placeholder-poster.jpg";
                  console.log('[COLLECTIONS DEBUG] ✅ Found match! Movie:', key, 'Poster:', posterPath);
                  break;
                }
              }
            }
            
            if (!movieData) {
              console.log('[COLLECTIONS DEBUG] ❌ No movie found for path:', path);
            }
          }
          
          // Get movie data for description and cast
          let description = '';
          let cast = [];
          if (movieKey && this.unifiedData[movieKey]) {
            const movie = this.unifiedData[movieKey];
            description = movie.description || '';
            cast = movie.cast || [];
          }
          
          // If no movie found by path matching, try direct lookup in unified data
          if (!movieData && this.unifiedData) {
            // Try to find the movie directly by the Collections path
            const directLookup = this.unifiedData[path];
            if (directLookup && directLookup.type === 'movie') {
              movieData = directLookup;
              movieKey = path;
              posterPath = directLookup.poster || "/assets/img/placeholder-poster.jpg";
              console.log('[COLLECTIONS DEBUG] ✅ Direct lookup found! Movie:', path, 'Poster:', posterPath);
            }
          }
          
          modalHTML += `
                        <div class="modal-collections-item" data-path="${path}" data-type="movie">
                            <div class="modal-collections-item-actions">
                                <button class="modal-collections-remove-btn" data-collection="${collectionName}" data-path="${path}" data-type="movie" title="Remove from Collection">➖</button>
                            </div>
                            <img src="${posterPath}" alt="${title}" class="modal-collections-poster" onerror="this.src='assets/img/placeholder-poster.jpg'">
                            <div class="modal-collections-item-title">${title}</div>
                            ${description ? `<div class="modal-collections-item-description">${description}</div>` : ''}
                        </div>
                    `;
        }
      } else {
        modalHTML +=
          '<div class="modal-collections-empty-message">No movies in this collection</div>';
      }
      modalHTML += "</div></div>";
      // Sort TV shows alphabetically by title
      const sortedTVShows = tvShows.sort((a, b) => {
        const titleA = this.extractTitleFromPath(a);
        const titleB = this.extractTitleFromPath(b);
        return titleA.localeCompare(titleB, undefined, {
          sensitivity: "base",
          numeric: true,
          caseFirst: "upper",
        });
      });
      // RIGHT SIDE: TV Shows in collection (using the already-detected tvShows array)
      modalHTML += `
                <div class="modal-collections-section modal-collections-tvshows-section">
                    <h3 class="modal-collections-section-title-tvshows" style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">TV-SHOWS (${sortedTVShows.length})</h3>
                    <div class="modal-collections-tvshows-grid">
            `;
      if (sortedTVShows.length > 0) {
        for (const key of sortedTVShows) {
          // Skip if key is not a string
          if (!key || typeof key !== 'string') {
            console.warn('[DEBUG - COLLECTIONS] Skipping non-string key in TV shows:', key);
            continue;
          }
          
          // Get TV show data directly from unified data using the key
          let tvShowData = null;
          let title = "Unknown TV Show";
          let posterPath = "assets/img/placeholder-poster.jpg";
          
          if (this.unifiedData && this.unifiedData[key]) {
            tvShowData = this.unifiedData[key];
            title = tvShowData.TMDBTitle || tvShowData.title || tvShowData.name || "Unknown TV Show";
            title = this.humanizeTVShowTitle(title);
            
            // Get poster from unified data
            if (tvShowData.poster) {
              posterPath = tvShowData.poster;
            }
          } else {
            // Fallback: extract title from key (for backward compatibility)
            const rawTitle = this.extractTitleFromPath(key);
            title = this.humanizeTVShowTitle(rawTitle);
          }
          
          // Get TV show data for description and cast
          let description = '';
          let cast = [];
          if (tvShowData) {
            description = tvShowData.description || '';
            cast = tvShowData.cast || [];
          }
          
          modalHTML += `
                        <div class="modal-collections-item" data-path="${key}" data-type="tvshow">
                            <div class="modal-collections-item-actions">
                                <button class="modal-collections-remove-btn" data-collection="${collectionName}" data-path="${key}" data-type="tvshow" title="Remove from Collection">➖</button>
                            </div>
                            <img src="${posterPath}" alt="${title}" class="modal-collections-poster" onerror="this.src='assets/img/placeholder-poster.jpg'">
                            <div class="modal-collections-item-title">${title}</div>
                            ${description ? `<div class="modal-collections-item-description">${description}</div>` : ''}
                        </div>
                    `;
        }
      } else {
        modalHTML +=
          '<div class="modal-collections-empty-message">No TV shows in this collection</div>';
      }
      modalHTML += "</div></div>";
      modalHTML += `
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      // Use our dedicated Collections modal handlers
      this.attachCollectionsModalHandlers(collectionName);
    } catch (error) {
      console.error("[COLLECTIONS] Error showing collection modal:", error);
      this.showToast(
        `Error showing collection modal: ${error.message}`,
        "error"
      );
    }
  }
  /**
     * Show favorites modal (FAVORITES ONLY - NO SHARED FUNCTIONALITY)
     */
  async showFavoritesModal(favoritesList) {
    try {
      console.log(
        "[FAVORITES] Opening favorites modal with items:",
        favoritesList
      );
      // Remove any existing modal
      const existingModal = document.getElementById("favoritesModal");
      if (existingModal) {
        existingModal.remove();
      }
      // LOAD JSON DATA FIRST - NO FALLBACKS
      console.log("[FAVORITES] Loading JSON poster data...");
      // Load movie posters JSON into class property
      try {
        const movieResponse = await fetch(
          "/components/MediaLibrary/data/movies/movie_posters_normalized.json?v=" +
            Date.now()
        );
        if (movieResponse.ok) {
          this.moviePosters = await movieResponse.json();
          console.log(
            "[FAVORITES] Loaded movie posters into class property:",
            Object.keys(this.moviePosters).length,
            "keys"
          );
        } else {
          console.error(
            "[FAVORITES] Failed to load movie posters:",
            movieResponse.status
          );
        }
      } catch (error) {
        console.error("[FAVORITES] Error loading movie posters:", error);
      }
      // Load TV show posters JSON into class property
      try {
        const tvResponse = await fetch(
          "/components/MediaLibrary/data/tv-shows/tv-shows-unified.json?v=" +
            Date.now()
        );
        if (tvResponse.ok) {
          this.tvPosters = await tvResponse.json();
          console.log(
            "[FAVORITES] Loaded TV show posters into class property:",
            Object.keys(this.tvPosters).length,
            "keys"
          );
        } else {
          console.error(
            "[FAVORITES] Failed to load TV show posters:",
            tvResponse.status
          );
        }
      } catch (error) {
        console.error("[FAVORITES] Error loading TV show posters:", error);
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
      const movies = favoritesList.filter(
        (item) =>
          item.type === "movie" || item.mediaType === "movie" || (!item.type && !item.mediaType && !(item.path && item.path.toLowerCase && item.path.toLowerCase().includes("tvshows")))
      );
      console.log("[FAVORITES] Movies in favorites:", movies);
      modalHTML += `
                <div class="favorites-modal-section">
                    <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">MOVIES (${movies.length})</h3>
                    <div class="favorites-modal-grid">
            `;
      if (movies.length > 0) {
        for (const item of movies) {
          const title =
            item.title || item.name || this.extractTitleFromPath(item.path);
          console.log(
            "[FAVORITES] Processing movie:",
            title,
            "from path:",
            item.path
          );
          // Get poster from JSON using the smart getPosterPath method
          let posterPath = "assets/img/placeholder-poster.jpg";
          // Create a proper mediaItem object for getPosterPath
          const mediaItem = {
            path: item.path,
            type: "movie",
            title: title,
            name: title,
          };
          console.log(
            "[FAVORITES] About to call getPosterPath for movie:",
            title,
            "from path:",
            item.path
          );
          // Use the smart getPosterPath method that tries multiple key variations
          const jsonPoster = this.getPosterPath(mediaItem);
          if (
            jsonPoster &&
            jsonPoster !== "/assets/img/placeholder-poster.jpg"
          ) {
            posterPath = jsonPoster;
            console.log(
              "[FAVORITES] Using JSON poster for:",
              title,
              "->",
              posterPath
            );
          } else {
            console.log(
              "[FAVORITES] No JSON poster found for:",
              title,
              "- using placeholder"
            );
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
        modalHTML +=
          '<div class="favorites-modal-empty-message">No movies in favorites</div>';
      }
      modalHTML += "</div></div>";
      // RIGHT SIDE: TV Shows in favorites
      const tvShows = favoritesList.filter(
        (item) =>
          item.type === "tvshow" || item.mediaType === "tvshow" || (!item.type && !item.mediaType && (item.path && item.path.toLowerCase && item.path.toLowerCase().includes("tvshows")))
      );
      console.log("[FAVORITES] TV Shows in favorites:", tvShows);
      modalHTML += `
                <div class="favorites-modal-section">
                    <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 18px;">TV-SHOWS (${tvShows.length})</h3>
                    <div class="favorites-modal-grid">
            `;
      if (tvShows.length > 0) {
        for (const item of tvShows) {
          const title =
            item.title || item.name || this.extractTitleFromPath(item.path);
          console.log(
            "[FAVORITES] Processing TV show path:",
            item.path,
            "title:",
            title
          );
          // Get poster from JSON using the smart getPosterPath method
          let posterPath = "assets/img/placeholder-poster.jpg";
          // Create a proper mediaItem object for getPosterPath
          const mediaItem = {
            path: item.path,
            type: "tvshow",
            title: title,
            name: title,
          };
          console.log(
            "[FAVORITES] About to call getPosterPath for TV show:",
            title,
            "from path:",
            item.path
          );
          // Use the smart getPosterPath method that tries multiple key variations
          const jsonPoster = this.getPosterPath(mediaItem);
          if (
            jsonPoster &&
            jsonPoster !== "/assets/img/placeholder-poster.jpg"
          ) {
            posterPath = jsonPoster;
            console.log(
              "[FAVORITES] Using JSON poster for:",
              title,
              "->",
              posterPath
            );
          } else {
            console.log(
              "[FAVORITES] No JSON poster found for:",
              title,
              "- using placeholder"
            );
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
        modalHTML +=
          '<div class="favorites-modal-empty-message">No TV shows in favorites</div>';
      }
      modalHTML += `
                        </div>
                        <div class="favorites-modal-footer">
                            <button class="favorites-modal-close-footer-btn" onclick="document.getElementById('favoritesModal').remove()">Close</button>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML("beforeend", modalHTML);
      // Add event listeners for the buttons (FAVORITES ONLY)
      const modal = document.getElementById("favoritesModal");
      if (modal) {
        // Remove from favorites buttons
        modal
          .querySelectorAll(".favorites-modal-remove-favorite-btn")
          .forEach((btn) => {
            btn.addEventListener("click", async (e) => {
              e.stopPropagation();
              try {
                const path = e.target.dataset.path;
                const type = e.target.dataset.type;
                console.log(
                  "[FAVORITES] Remove from favorites button clicked:",
                  { path, type }
                );
                await this.toggleFavorite(mediaItem, type);
                // Remove the item card from the modal
                const itemCard = e.target.closest(".favorites-modal-item");
                if (itemCard) {
                  itemCard.remove();
                  // Update the favorites count display
                  this.updateFavoritesCounts(modal);
                }
              } catch (error) {
                console.error(
                  "[FAVORITES] Error in remove from favorites button click handler:",
                  error
                );
                this.showToast("Error removing from favorites", "error");
              }
            });
          });
        // Click to play/view media items (FAVORITES ONLY)
        modal
          .querySelectorAll(".favorites-modal-item-content")
          .forEach((content) => {
            content.addEventListener("click", async (e) => {
              try {
                const itemCard = e.target.closest(".favorites-modal-item");
                const path = itemCard.dataset.path;
                const type = itemCard.dataset.type;
                const title = itemCard.querySelector(
                  ".favorites-modal-item-title"
                ).textContent;
                console.log("[FAVORITES] Media item clicked:", {
                  path,
                  type,
                  title,
                });
                if (type === "movie") {
                  // For movies, find the movie data to get the correct path for playback
                  const movieData = this.findMovieByPath(path);
                  if (movieData && movieData.absPath) {
                    console.log(
                      "[FAVORITES] Found movie data, using absPath:",
                      movieData.absPath
                    );
                    const mediaItem = {
                      path: movieData.absPath,
                      title,
                      type: "movie",
                      absPath: movieData.absPath,
                    };
                    await this.playMedia(mediaItem);
                    // Close the modal after starting playback
                    document.getElementById("favoritesModal").remove();
                  } else {
                    console.warn(
                      "[FAVORITES] No movie data found for path:",
                      path
                    );
                    this.showToast("Movie data not found", "error");
                  }
                } else if (type === "tvshow") {
                  // For TV shows, extract the show name and add tvshows/ prefix to match data structure
                  let showPath = "";
                  if (path.includes("\\Season ") || path.includes("/Season ")) {
                    // Extract the TV show name (the directory name before "Season")
                    const pathParts = path.split(/[\\/]/);
                    const seasonIndex = pathParts.findIndex((part) =>
                      part.toLowerCase().startsWith("season")
                    );
                    if (seasonIndex > 0) {
                      const showName = pathParts[seasonIndex - 1];
                      // Add tvshows/ prefix to match the data structure
                      showPath = `tvshows/${showName}`;
                      console.log(
                        "[FAVORITES] Extracted show name and added prefix:",
                        path,
                        "->",
                        showPath
                      );
                    }
                  } else {
                    // If no season in path, use the last directory name with prefix
                    const pathParts = path.split(/[\\/]/);
                    const showName = pathParts[pathParts.length - 1];
                    showPath = `tvshows/${showName}`;
                  }
                  // CRITICAL DEBUG: Log the showPath immediately after extraction
                  console.log(
                    "[DEBUG - FAVORITES] showPath immediately after extraction:",
                    showPath
                  );
                  console.log(
                    "[DEBUG - FAVORITES] showPath type:",
                    typeof showPath
                  );
                  console.log(
                    "[DEBUG - FAVORITES] showPath starts with tvshows/:",
                    showPath.startsWith("tvshows/")
                  );
                  console.log(
                    "[DEBUG - FAVORITES] showPath after extraction:",
                    showPath
                  );
                  console.log(
                    "[DEBUG - FAVORITES] About to open TV show:",
                    showPath
                  );
                  console.log(
                    "[DEBUG - FAVORITES] Current state before opening - currentTVShow:",
                    this.currentTVShow,
                    "currentTVSeason:",
                    this.currentTVSeason
                  );
                  // Use centralized data loading method (SAME AS COLLECTIONS)
                  await this.ensureTVShowDataLoaded();
                  // Set the current TV show before closing the modal (SAME AS COLLECTIONS)
                  this.currentTVShow = showPath;
                  console.log(
                    "[DEBUG - FAVORITES] Set currentTVShow to showPath after ensureTVShowDataLoaded:",
                    this.currentTVShow
                  );
                  // Close the favorites modal first
                  document.getElementById("favoritesModal").remove();
                  // Use the EXACT same approach as Collections
                  this.currentTab = "tvshows";
                  this.openMediaBrowser();
                  // Wait for the modal to render, then navigate to seasons (same as Collections)
                  setTimeout(async () => {
                    console.log("[DEBUG - FAVORITES] Timeout callback started");
                    console.log(
                      "[DEBUG - FAVORITES] Current state in timeout - currentTVShow:",
                      this.currentTVShow,
                      "currentTVSeason:",
                      this.currentTVSeason
                    );
                    console.log(
                      "[DEBUG - FAVORITES] showPath being used:",
                      showPath
                    );
                    // First, ensure we're on the TV shows tab
                    const modalContent = document.querySelector(
                      ".media-library-modal-content"
                    );
                    if (modalContent) {
                      modalContent.classList.remove(
                        "movies",
                        "tvshows",
                        "favorites",
                        "collections",
                        "suggestions",
                        "watchlater",
                        "moviedetails",
                        "tvshowepisodes"
                      );
                      modalContent.classList.add("tvshows");
                      console.log(
                        "[DEBUG - FAVORITES] Set modal content class to tvshows"
                      );
                    } else {
                      console.error(
                        "[DEBUG - FAVORITES] Modal content not found!"
                      );
                    }
                    // Now find the specific TV show that was clicked and navigate to its seasons
                    // Use the showPath that was extracted earlier (with tvshows/ prefix)
                    console.log(
                      "[FAVORITES] Looking for TV show with showPath:",
                      showPath
                    );
                    console.log(
                      "[DEBUG - FAVORITES] tvShowsData available:",
                      !!this.tvShowsData
                    );
                    if (this.tvShowsData) {
                      console.log(
                        "[DEBUG - FAVORITES] tvShowsData length:",
                        this.tvShowsData.length
                      );
                      console.log(
                        "[DEBUG - FAVORITES] First few TV shows:",
                        this.tvShowsData
                          .slice(0, 3)
                          .map((s) => s.path || s.title || s.name)
                      );
                    }
                    // Find the show in TV shows data using the showPath with tvshows/ prefix
                    console.log(
                      "[DEBUG - FAVORITES] About to call findShowByPath with:",
                      showPath
                    );
                    console.log(
                      "[DEBUG - FAVORITES] showPath type:",
                      typeof showPath
                    );
                    console.log(
                      "[DEBUG - FAVORITES] showPath length:",
                      showPath ? showPath.length : "undefined"
                    );
                    const show = this.findShowByPath(showPath);
                    console.log(
                      "[DEBUG - FAVORITES] findShowByPath result:",
                      show
                    );
                    if (show) {
                      console.log(
                        "[FAVORITES] Found show, navigating to seasons view"
                      );
                      console.log("[DEBUG - FAVORITES] Show object:", show);
                      // Navigate to the seasons view for this specific show
                      // IMPORTANT: Set currentTVShow to the showPath with tvshows/ prefix BEFORE calling openTVShow
                      this.currentTVShow = showPath;
                      console.log(
                        "[DEBUG - FAVORITES] Set currentTVShow to showPath before openTVShow:",
                        this.currentTVShow
                      );
                      console.log(
                        "[DEBUG - FAVORITES] About to call openTVShow with showPath:",
                        showPath
                      );
                      await this.openTVShow(showPath);
                      console.log(
                        "[DEBUG - FAVORITES] After openTVShow call, currentTVShow is:",
                        this.currentTVShow
                      );
                    } else {
                      console.error(
                        "[FAVORITES] Could not find TV show with showPath:",
                        showPath
                      );
                      console.log(
                        "[DEBUG - FAVORITES] showPath that failed:",
                        showPath
                      );
                      console.log(
                        "[DEBUG - FAVORITES] Original path that was passed in:",
                        path
                      );
                      this.showToast("TV show not found", "error");
                    }
                  }, 100);
                  console.log(
                    "[DEBUG - FAVORITES] After setup - currentTVShow:",
                    this.currentTVShow,
                    "currentTVSeason:",
                    this.currentTVSeason
                  );
                }
              } catch (error) {
                console.error(
                  "[FAVORITES] Error in media item click handler:",
                  error
                );
                this.showToast("Error playing media", "error");
              }
            });
          });
      }
    } catch (error) {
      console.error("[FAVORITES] Error showing favorites modal:", error);
      this.showToast(
        `Error showing favorites modal: ${error.message}`,
        "error"
      );
    }
  }
  /**
     * Attach event handlers for collection modal items
     */
  attachCollectionsModalHandlers(collectionName) {
    try {
      const modal = document.getElementById("collectionModal");
      if (!modal) return;
      // Remove from collection buttons
      modal.querySelectorAll(".modal-collections-remove-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          try {
            const collectionName = e.target.dataset.collection;
            const path = e.target.dataset.path;
            const type = e.target.dataset.type;
            console.log("[COLLECTIONS] Remove button clicked:", {
              collectionName,
              path,
              type,
            });
            await this.removeFromCollection(collectionName, path);
            // Remove the item card from the modal
            const itemCard = e.target.closest(".modal-collections-item");
            if (itemCard) {
              itemCard.remove();
              // Update the collection count display
              this.updateCollectionCounts(modal, collectionName);
            }
          } catch (error) {
            console.error(
              "[COLLECTIONS] Error in remove button click handler:",
              error
            );
            this.showToast("Error removing from collection", "error");
          }
        });
      });
      // Add click handlers for media items (movies and TV shows)
      modal
        .querySelectorAll(".modal-collections-item")
        .forEach((item, index) => {
          item.addEventListener("click", async (e) => {
            // Don't trigger if clicking on action buttons
            if (e.target.closest(".modal-collections-item-actions")) {
              return;
            }
            const path = item.dataset.path;
            const type = item.dataset.type;
            console.log("[COLLECTIONS] Media item clicked:", { path, type });
            try {
              if (type === "movie") {
                console.log(
                  "[COLLECTIONS] Playing movie from collection:",
                  path
                );
                await this.playMovieFromCollectionsModal(path);
              } else if (type === "tvshow") {
                console.log(
                  "[COLLECTIONS] Opening TV show from collection:",
                  path
                );
                await this.openTVShowFromCollectionsModal(path);
              } else {
                console.error("[COLLECTIONS] Unknown media type:", type);
              }
            } catch (error) {
              console.error(
                "[COLLECTIONS] Error handling media item click:",
                error
              );
              this.showToast("Error opening media item", "error");
            }
          });
        });
    } catch (error) {
      console.error(
        "[COLLECTIONS] Error attaching simple collection modal handlers:",
        error
      );
    }
  }
  /**
     * Play a movie from the Collections modal
     */
  async playMovieFromCollectionsModal(path) {
    try {
      console.log("[COLLECTIONS] Playing movie from collection with path:", path);
      
      // Load unified data if not already loaded
      if (!this.unifiedData || Object.keys(this.unifiedData).length === 0) {
        console.log("[COLLECTIONS] Loading unified data for movie playback...");
        await this.loadUnifiedData();
      }
      
      // Find the movie in unified data using the collection key
      let movieData = null;
      if (this.unifiedData && this.unifiedData[path]) {
        movieData = this.unifiedData[path];
        console.log("[COLLECTIONS] Found movie in unified data:", movieData.title || movieData.name);
      } else {
        console.error("[COLLECTIONS] Movie not found in unified data for key:", path);
        this.showToast("Movie not found in library", "error");
        return;
      }
      
      // Close the collections modal
      const modal = document.getElementById("collectionModal");
      if (modal) {
        modal.remove();
      }
      
      // Play the movie using the unified data
      await this.playMedia(movieData);
    } catch (error) {
      console.error(
        "[COLLECTIONS] Error playing movie from collection:",
        error
      );
      this.showToast("Error playing movie", "error");
    }
  }
  /**
     * Open a TV show from the Collections modal
     */
  async openTVShowFromCollectionsModal(path) {
    try {
      console.log("[COLLECTIONS] Opening TV show from collection:", path);
      
      // Load unified data if not already loaded
      if (!this.unifiedData || Object.keys(this.unifiedData).length === 0) {
        console.log("[COLLECTIONS] Loading unified data for TV show playback...");
        await this.loadUnifiedData();
      }
      
      // Find the TV show in unified data using the collection key
      let tvShowData = null;
      if (this.unifiedData && this.unifiedData[path]) {
        tvShowData = this.unifiedData[path];
        console.log("[COLLECTIONS] Found TV show in unified data:", tvShowData.title || tvShowData.name);
      } else {
        console.error("[COLLECTIONS] TV show not found in unified data for key:", path);
        this.showToast("TV show not found in library", "error");
        return;
      }
      
      // Extract the show path from the episode path if needed
      let showPath = path;
      if (path.includes("\\Season ") || path.includes("/Season ")) {
        // Extract the TV show directory path (remove season and episode info)
        const pathParts = path.split(/[\\/]/);
        const seasonIndex = pathParts.findIndex((part) =>
          part.toLowerCase().startsWith("season")
        );
        if (seasonIndex > 0) {
          showPath = pathParts.slice(0, seasonIndex).join("\\");
          console.log(
            "[COLLECTIONS] Extracted show path from episode path:",
            path,
            "->",
            showPath
          );
        }
      }
      // Set the current TV show before closing the modal
      this.currentTVShow = showPath;
      // Close the collections modal
      const modal = document.getElementById("collectionModal");
      if (modal) {
        modal.remove();
      }
      // Open the main Media Library modal and navigate to TV shows tab
      this.currentTab = "tvshows";
      this.openMediaBrowser();
      // Wait for the modal to render, then find the TV show and navigate to seasons
      setTimeout(async () => {
        // First, ensure we're on the TV shows tab
        const modalContent = document.querySelector(
          ".media-library-modal-content"
        );
        if (modalContent) {
          modalContent.classList.remove(
            "movies",
            "tvshows",
            "favorites",
            "collections",
            "suggestions",
            "watchlater",
            "moviedetails",
            "tvshowepisodes"
          );
          modalContent.classList.add("tvshows");
        }
        // Now find the specific TV show that was clicked and navigate to its seasons
        // Extract the show name from the path for comparison
        const showName = this.extractShowName(path);
        console.log("[COLLECTIONS] Looking for TV show:", showName);
        // Find the show in TV shows data
        const show = this.findShowByPath(showPath);
        if (show) {
          console.log("[COLLECTIONS] Found show, navigating to seasons view");
          // Navigate to the seasons view for this specific show
          await this.openTVShow(showPath);
        } else {
          console.error("[COLLECTIONS] Could not find TV show:", showName);
          this.showToast("TV show not found", "error");
        }
      }, 100);
    } catch (error) {
      console.error(
        "[COLLECTIONS] Error opening TV show from collection:",
        error
      );
      this.showToast("Error opening TV show", "error");
    }
  }
  /**
     * CENTRALIZED: Ensure all TV show data is loaded for navigation
     * This method prevents the recurring TV show navigation issue
     */
  async ensureTVShowDataLoaded() {
    try {
      console.log(
        "[DATA-LOADING] Ensuring TV show data is loaded for navigation..."
      );
      // Check what's already loaded
      const loadedData = {
        tvShowsData: !!this.tvShowsData,
        tvPosters: !!this.tvPosters,
        seasonEpisodeImages: !!this.seasonEpisodeImages,
        tvShowDescriptions: !!this.tvShowDescriptions,
        tvShowCast: !!this.tvShowCast,
      };
      console.log("[DATA-LOADING] Current data status:", loadedData);
      // Load TV shows data if missing (CRITICAL for navigation)
      if (!this.tvShowsData) {
        console.log("[DATA-LOADING] Loading TV shows data...");
        try {
          // TV shows data is loaded from unified JSON in loadSeasonEpisodeImages
          console.log("[DATA-LOADING] ✅ TV shows data loaded from unified JSON");
          if (!this.unifiedData) {
            await this.loadSeasonEpisodeImages();
          }
        } catch (error) {
          console.error("[DATA-LOADING] ❌ Error loading TV shows data:", error);
          throw error;
        }
      }
      // Load TV show posters if missing
      if (!this.tvPosters) {
        console.log("[DATA-LOADING] Loading TV show posters...");
        try {
          const tvResponse = await fetch(
            "/components/MediaLibrary/data/tvshows/tv_posters_normalized.json?v=" +
              Date.now()
          );
          if (tvResponse.ok) {
            this.tvPosters = await tvResponse.json();
            console.log(
              "[DATA-LOADING] ✅ TV show posters loaded:",
              Object.keys(this.tvPosters).length,
              "posters"
            );
          } else {
            console.error(
              "[DATA-LOADING] ❌ Failed to load TV show posters:",
              tvResponse.status
            );
          }
        } catch (error) {
          console.error(
            "[DATA-LOADING] ❌ Error loading TV show posters:",
            error
          );
        }
      }
      // Load season/episode images if missing
      if (!this.seasonEpisodeImages) {
        console.log("[DATA-LOADING] Loading season/episode images...");
        try {
          await this.loadSeasonEpisodeImages();
          console.log("[DATA-LOADING] ✅ Season/episode images loaded");
        } catch (error) {
          console.error(
            "[DATA-LOADING] ❌ Error loading season/episode images:",
            error
          );
        }
      }
      // Load TV show descriptions if missing
      if (!this.tvShowDescriptions) {
        console.log("[DATA-LOADING] Loading TV show descriptions...");
        try {
          const descResp = await fetch(
            "/components/MediaLibrary/data/tvshows/tvshow_descriptions_normalized.json?v=" +
              Date.now()
          );
          if (descResp.ok) {
            this.tvShowDescriptions = await descResp.json();
            console.log(
              "[DATA-LOADING] ✅ TV show descriptions loaded:",
              Object.keys(this.tvShowDescriptions).length,
              "descriptions"
            );
          } else {
            console.error(
              "[DATA-LOADING] ❌ Failed to load TV show descriptions:",
              descResp.status
            );
          }
        } catch (error) {
          console.error(
            "[DATA-LOADING] ❌ Error loading TV show descriptions:",
            error
          );
        }
      }
      // Load TV show cast if missing
      if (!this.tvShowCast) {
        console.log("[DATA-LOADING] Loading TV show cast...");
        try {
          const castResp = await fetch(
            "/components/MediaLibrary/data/tvshows/tvshow_cast_normalized.json?v=" +
              Date.now()
          );
          if (castResp.ok) {
            this.tvShowCast = await castResp.json();
            console.log(
              "[DATA-LOADING] ✅ TV show cast loaded:",
              Object.keys(this.tvShowCast).length,
              "cast entries"
            );
          } else {
            console.error(
              "[DATA-LOADING] ❌ Failed to load TV show cast:",
              castResp.status
            );
          }
        } catch (error) {
          console.error("[DATA-LOADING] ❌ Error loading TV show cast:", error);
        }
      }
      console.log(
        "[DATA-LOADING] ✅ All TV show data loading completed successfully"
      );
    } catch (error) {
      console.error(
        "[DATA-LOADING] ❌ Critical error in TV show data loading:",
        error
      );
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
        const movie = this.movies.find((m) => {
          return m.path === path || m.absPath === path || m.filePath === path;
        });
        if (movie) {
          return movie;
        }
      }
      // If not found, try to find by searching the file system
      // This is a fallback for when movies data isn't loaded
      return null;
    } catch (error) {
      console.error("[COLLECTIONS] Error finding movie by path:", error);
      return null;
    }
  }
  /**
     * Update favorites counts display after removing items
     */
  updateFavoritesCounts(modal) {
    try {
      // Count remaining movies and TV shows
      const movies = modal.querySelectorAll(
        '.favorites-modal-item[data-type="movie"]'
      );
      const tvShows = modal.querySelectorAll(
        '.favorites-modal-item[data-type="tvshow"]'
      );
      // Update the count displays
      const movieSection = modal.querySelector(".favorites-modal-section h3");
      if (movieSection) {
        movieSection.textContent = `MOVIES (${movies.length})`;
      }
      const tvShowSection = modal.querySelectorAll(
        ".favorites-modal-section h3"
      )[1];
      if (tvShowSection) {
        tvShowSection.textContent = `TV-SHOWS (${tvShows.length})`;
      }
      // If no items left in a section, show empty message
      if (movies.length === 0) {
        const movieGrid = modal.querySelector(
          ".favorites-modal-section .favorites-modal-grid"
        );
        if (
          movieGrid &&
          !movieGrid.querySelector(".favorites-modal-empty-message")
        ) {
          movieGrid.innerHTML =
            '<div class="favorites-modal-empty-message">No movies in favorites</div>';
        }
      }
      if (tvShows.length === 0) {
        const tvShowGrid = modal.querySelectorAll(
          ".favorites-modal-section .favorites-modal-grid"
        )[1];
        if (
          tvShowGrid &&
          !tvShowGrid.querySelector(".favorites-modal-empty-message")
        ) {
          tvShowGrid.innerHTML =
            '<div class="favorites-modal-empty-message">No TV shows in favorites</div>';
        }
      }
      console.log(
        "[FAVORITES] Updated counts - Movies:",
        movies.length,
        "TV Shows:",
        tvShows.length
      );
    } catch (error) {
      console.error("[FAVORITES] Error updating favorites counts:", error);
    }
  }
  /**
     * Update collection counts display after removing items
     */
  updateCollectionCounts(modal, collectionName) {
    try {
      // Count remaining movies and TV shows
      const movies = modal.querySelectorAll(
        '.modal-collections-item[data-type="movie"]'
      );
      const tvShows = modal.querySelectorAll(
        '.modal-collections-item[data-type="tvshow"]'
      );
      // Update the count displays
      const movieSection = modal.querySelector(
        ".modal-collections-movies-section h3"
      );
      if (movieSection) {
        movieSection.textContent = `MOVIES (${movies.length})`;
      }
      const tvShowSection = modal.querySelector(
        ".modal-collections-tvshows-section h3"
      );
      if (tvShowSection) {
        tvShowSection.textContent = `TV-SHOWS (${tvShows.length})`;
      }
      // If no items left in a section, show empty message
      if (movies.length === 0) {
        const movieGrid = modal.querySelector(".modal-collections-movies-grid");
        if (
          movieGrid &&
          !movieGrid.querySelector(".modal-collections-empty-message")
        ) {
          movieGrid.innerHTML =
            '<div class="modal-collections-empty-message">No movies in this collection</div>';
        }
      }
      if (tvShows.length === 0) {
        const tvShowGrid = modal.querySelector(
          ".modal-collections-tvshows-grid"
        );
        if (
          tvShowGrid &&
          !tvShowGrid.querySelector(".modal-collections-empty-message")
        ) {
          tvShowGrid.innerHTML =
            '<div class="modal-collections-empty-message">No TV shows in this collection</div>';
        }
      }
    } catch (error) {
      console.error("[COLLECTIONS] Error updating collection counts:", error);
    }
  }
  /**
     * Helper method to get display title for media items
     */
  getDisplayTitle(mediaItem) {
    // PRIORITY 1: Use TMDBTitle (clean, user-friendly title)
    if (mediaItem.TMDBTitle) {
      return mediaItem.TMDBTitle;
    }
    // PRIORITY 2: Use title if it's not dot notation
    if (mediaItem.title && !mediaItem.title.includes('.')) {
      return this.capitalizeTitle(mediaItem.title);
    }
    // PRIORITY 3: Use name if available
    if (mediaItem.name) {
      return this.capitalizeTitle(mediaItem.name);
    }
    // PRIORITY 4: Extract and clean from path
    if (!mediaItem.path || typeof mediaItem.path !== 'string') return "Unknown Title";
    const filename = mediaItem.path.split(/[\\/]/).pop() || "";
    return this.capitalizeTitle(this.cleanMovieTitle(filename));
  }
  /**
     * Update collection buttons in the media grid
     */
  async updateCollectionButtons() {
    try {
      console.log('[DEBUG - COLLECTIONS] updateCollectionButtons() called');
      
      // Handle both movie and TV show collection buttons
      const movieCollectionBtns = document.querySelectorAll(".movie-collection-btn");
      const tvCollectionBtns = document.querySelectorAll(".tv-collection-btn");
      const collectionBtns = [...movieCollectionBtns, ...tvCollectionBtns];
      
      console.log('[DEBUG - COLLECTIONS] Found collection buttons to update:', collectionBtns.length);
      console.log('[DEBUG - COLLECTIONS] Movie buttons:', movieCollectionBtns.length, 'TV buttons:', tvCollectionBtns.length);
      // Debug: Log all found buttons
      collectionBtns.forEach((btn, index) => {
        // console.log(`[DEBUG - COLLECTIONS] Button ${index}:`, {
        //     path: btn.dataset.path,
        //     text: btn.textContent,
        //     classes: btn.className,
        //     title: btn.title
        // });
      });
      for (const btn of collectionBtns) {
        const path = btn.dataset.path;
        if (!path || typeof path !== 'string') {
          console.warn('[DEBUG - COLLECTIONS] Button missing or invalid data-path:', btn, 'path:', path, 'type:', typeof path);
          continue;
        }
        try {
          console.log('[DEBUG - COLLECTIONS] Checking button for path:', path);
          const itemCollections = await this.getItemCollections(path);
          const inCollection = itemCollections.length > 0;
          console.log('[DEBUG - COLLECTIONS] Path in collection:', path, 'Collections:', itemCollections, 'Result:', inCollection);
          if (inCollection) {
            if (itemCollections.length === 1) {
              btn.textContent = "➖";
              btn.title = `Manage Collections (currently in: ${itemCollections[0]})`;
            } else {
              btn.textContent = `${itemCollections.length}`;
              btn.title = `Manage Collections (currently in: ${itemCollections.join(", ")})`;
            }
            // Preserve the original button type (movie or TV)
            const isMovie = btn.classList.contains('movie-collection-btn');
            const isTV = btn.classList.contains('tv-collection-btn');
            if (isMovie) {
              btn.className = "movie-collection-btn collection-btn-remove";
            } else if (isTV) {
              btn.className = "tv-collection-btn collection-btn-remove";
            } else {
            btn.className = "collection-btn collection-btn-remove";
            }
            console.log('[DEBUG - COLLECTIONS] Updated button for collections:', path, itemCollections, 'New text:', btn.textContent);
          } else {
            btn.textContent = "➕";
            // Preserve the original button type (movie or TV)
            const isMovie = btn.classList.contains('movie-collection-btn');
            const isTV = btn.classList.contains('tv-collection-btn');
            if (isMovie) {
              btn.className = "movie-collection-btn collection-btn-add";
            } else if (isTV) {
              btn.className = "tv-collection-btn collection-btn-add";
            } else {
            btn.className = "collection-btn collection-btn-add";
            }
            btn.title = "Add to Collection";
            // console.log('[DEBUG - COLLECTIONS] Updated button to ➕ for:', path);
          }
        } catch (error) {
          console.error(
            "[DEBUG - COLLECTIONS] Error updating collection button:",
            error
          );
        }
      }
      // console.log('[DEBUG - COLLECTIONS] Collection buttons update completed');
    } catch (error) {
      // console.error('[DEBUG - COLLECTIONS] Error updating collection buttons:', error);
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
   * Debug function to check collection state for a specific item
   */
  async debugCollectionState(path) {
    console.log('[DEBUG - COLLECTIONS] Debugging collection state for:', path);
    const collections = await this.getItemCollections(path);
    console.log('[DEBUG - COLLECTIONS] Item is in collections:', collections);
    
    // Find the button for this path
    const buttons = document.querySelectorAll('.movie-collection-btn, .tv-collection-btn');
    const button = Array.from(buttons).find(btn => btn.dataset.path === path);
    if (button) {
      console.log('[DEBUG - COLLECTIONS] Button found:', {
        text: button.textContent,
        classes: button.className,
        title: button.title,
        path: button.dataset.path
      });
    } else {
      console.log('[DEBUG - COLLECTIONS] No button found for path:', path);
      console.log('[DEBUG - COLLECTIONS] Available buttons:', Array.from(buttons).map(btn => ({
        path: btn.dataset.path,
        classes: btn.className
      })));
    }
    
    return { collections, button };
  }
  /**
     * Update a single collection button immediately after adding/removing from collection
     */
  async updateSingleCollectionButton(path) {
    try {
      if (!path || typeof path !== 'string') {
        console.warn('[DEBUG - COLLECTIONS] updateSingleCollectionButton received invalid path:', path, 'type:', typeof path);
        return;
      }
      // Check for both movie and TV show collection buttons
      const btn = document.querySelector(
        `.movie-collection-btn[data-path="${path}"], .tv-collection-btn[data-path="${path}"]`
      );
      if (!btn) {
        // console.log('[DEBUG - COLLECTIONS] Button not found for path:', path);
        return;
      }
      const itemCollections = await this.getItemCollections(path);
      const inCollection = itemCollections.length > 0;
      // console.log('[DEBUG - COLLECTIONS] Checking collection status for:', path, 'Collections:', itemCollections, 'Result:', inCollection);
      if (inCollection) {
        if (itemCollections.length === 1) {
          btn.textContent = "➖";
          btn.title = `Manage Collections (currently in: ${itemCollections[0]})`;
        } else {
          btn.textContent = `${itemCollections.length}`;
          btn.title = `Manage Collections (currently in: ${itemCollections.join(", ")})`;
        }
        // Preserve the original button type (movie or TV)
        const isMovie = btn.classList.contains('movie-collection-btn');
        const isTV = btn.classList.contains('tv-collection-btn');
        if (isMovie) {
          btn.className = "movie-collection-btn collection-btn-remove";
        } else if (isTV) {
          btn.className = "tv-collection-btn collection-btn-remove";
        } else {
        btn.className = "collection-btn collection-btn-remove";
        }
      } else {
        btn.textContent = "➕";
        // Preserve the original button type (movie or TV)
        if (isMovie) {
          btn.className = "movie-collection-btn collection-btn-add";
        } else if (isTV) {
          btn.className = "tv-collection-btn collection-btn-add";
        } else {
        btn.className = "collection-btn collection-btn-add";
        }
        btn.title = "Add to Collection";
      }
      // console.log('[DEBUG - COLLECTIONS] Single collection button updated for:', path, 'State:', inCollection ? 'IN' : 'NOT IN', 'Collections:', itemCollections, 'Button text:', btn.textContent);
    } catch (error) {
      // console.error('[DEBUG - COLLECTIONS] Error updating single collection button:', error);
    }
  }
  /**
     * Update the Movie Details collection button and info
     */
  async updateMovieDetailsCollectionInfo(movie) {
    try {
      const collectionBtn = document.getElementById("detailsCollectionBtn");
      const collectionInfo = document.querySelector(
        ".media-library-details-collection-info"
      );
      if (!collectionBtn) return;
      const inCollection = await this.isInCollection(movie.path);
      // Update button
      collectionBtn.textContent = inCollection ? "➖" : "➕";
      collectionBtn.title = inCollection
        ? "Remove from Collection"
        : "Add to Collection";
      // Update or create collection info
      if (inCollection) {
        const collectionName = this.getCollectionNameForMovie(movie.path);
        if (collectionInfo) {
          collectionInfo.innerHTML = `📁 In Collection: ${collectionName}`;
        } else {
          // Create collection info if it doesn't exist
          const newCollectionInfo = document.createElement("div");
          newCollectionInfo.className = "media-library-details-collection-info";
          newCollectionInfo.innerHTML = `📁 In Collection: ${collectionName}`;
          // Insert after the buttons div
          const buttonsDiv = document.querySelector(
            ".media-library-details-buttons"
          );
          if (buttonsDiv && buttonsDiv.nextSibling) {
            buttonsDiv.parentNode.insertBefore(
              newCollectionInfo,
              buttonsDiv.nextSibling
            );
          }
        }
      } else {
        // Remove collection info if it exists
        if (collectionInfo) {
          collectionInfo.remove();
        }
      }
      console.log(
        "[DEBUG - MOVIE-DETAILS] Collection info updated for:",
        movie.path,
        "In collection:",
        inCollection
      );
    } catch (error) {
      console.error(
        "[DEBUG - MOVIE-DETAILS] Error updating collection info:",
        error
      );
    }
  }
  // --- COLLECTIONS TAB RENDERING ---
  async renderCollectionsTab() {
    try {
      // console.log('[DEBUG - COLLECTIONS] renderCollectionsTab called');
      // Debug: Check localStorage directly
      const localStorageCollectionsRaw =
        localStorage.getItem("mediaCollections");
      // console.log('[DEBUG - COLLECTIONS] localStorage "mediaCollections" raw:', localStorageCollectionsRaw);
      try {
        const parsedLocalStorageCollections = JSON.parse(
          localStorageCollectionsRaw || "{}"
        );
        // console.log('[DEBUG - COLLECTIONS] localStorage "mediaCollections" parsed:', parsedLocalStorageCollections);
        // console.log('[DEBUG - COLLECTIONS] localStorage collections keys (parsed):', Object.keys(parsedLocalStorageCollections));
        // console.log('[DEBUG - COLLECTIONS] localStorage collections length (parsed):', Object.keys(parsedLocalStorageCollections).length);
      } catch (e) {
        console.error(
          '[DEBUG - COLLECTIONS] Error parsing localStorage "mediaCollections":',
          e
        );
      }
      const collections = await this.getCollections();
      // console.log('[DEBUG - COLLECTIONS] getCollections returned:', collections);
      // console.log('[DEBUG - COLLECTIONS] Collections type:', typeof collections);
      // console.log('[DEBUG - COLLECTIONS] Collections keys:', Object.keys(collections));
      // console.log('[DEBUG - COLLECTIONS] Collections length:', Object.keys(collections).length);
      const names = Object.keys(collections).sort((a, b) =>
        a.localeCompare(b, undefined, {
          sensitivity: "base",
          numeric: true,
          caseFirst: "upper",
        })
      );
      // console.log('[DEBUG - COLLECTIONS] Collection names (sorted):', names);
      // console.log('[DEBUG - COLLECTIONS] Collections object:', collections);
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
        const movies = collectionItems.filter(
          (path) => {
            // For collections, we need to check if the path represents a movie
            // Since collections store paths, we'll use path-based detection as fallback
            if (!path || typeof path !== 'string') return true; // Treat non-strings as movies
            return !path.toLowerCase().includes("tvshows");
          }
        );
        // Sort movies alphabetically by title
        const sortedMovies = movies.sort((a, b) => {
          const titleA = this.extractTitleFromPath(a);
          const titleB = this.extractTitleFromPath(b);
          return titleA.localeCompare(titleB, undefined, {
            sensitivity: "base",
            numeric: true,
            caseFirst: "upper",
          });
        });
        html += '<div class="movies-section-collections">';
        html += '<h3 class="section-title-movies-collections">MOVIES</h3>';
        html += '<div class="media-library-movie-grid-collections">';
        if (sortedMovies.length > 0) {
          sortedMovies.forEach((path) => {
            const title = this.extractTitleFromPath(path);
            // console.log('[COLLECTIONS] Processing movie path:', path);
            // console.log('[COLLECTIONS] Extracted title:', title);
            
            // Find the movie in unified data instead of creating a synthetic mediaItem
            let movieData = null;
            let posterPath = "/assets/img/placeholder-poster.jpg";
            
            if (this.unifiedData) {
              // Search for movie by path in unified data using normalized path comparison
              for (const [key, item] of Object.entries(this.unifiedData)) {
                if (item.type === 'movie' && item.files) {
                  const hasMatchingFile = item.files.some(file => {
                    // Extract folder name from Collections path (e.g., "open.season.(2006)" -> "open season (2006)")
                    const extractFolderName = (pathStr) => {
                      if (!pathStr) return '';
                      // Convert dots to spaces and clean up
                      return pathStr
                        .replace(/\./g, ' ') // Convert dots to spaces
                        .replace(/\s+/g, ' ') // Normalize multiple spaces
                        .trim()
                        .toLowerCase();
                    };
                    
                    // Extract folder name from file paths
                    const extractFileFolderName = (filePath) => {
                      if (!filePath) return '';
                      const pathParts = filePath.split(/[\\\/]/);
                      // Look for the movie folder (after MEDIA/MOVIES)
                      for (let i = 0; i < pathParts.length; i++) {
                        if (pathParts[i].toLowerCase().includes('movies') && pathParts[i + 1]) {
                          return pathParts[i + 1].toLowerCase().trim();
                        }
                      }
                      // Fallback: get the folder containing the file
                      if (pathParts.length >= 2) {
                        return pathParts[pathParts.length - 2].toLowerCase().trim();
                      }
                      return '';
                    };
                    
                    const collectionsFolderName = extractFolderName(path);
                    const absPathFolderName = extractFileFolderName(file.absPath);
                    const relPathFolderName = extractFileFolderName(file.relPath);
                    
                    return absPathFolderName === collectionsFolderName || relPathFolderName === collectionsFolderName;
                  });
                  
                  if (hasMatchingFile) {
                    movieData = item;
                    posterPath = item.poster || "/assets/img/placeholder-poster.jpg";
                    break;
                  }
                }
              }
            }
            
            // console.log('[COLLECTIONS] Found movie data:', movieData);
            // console.log('[COLLECTIONS] Poster path result:', posterPath);
            html += `
                            <div class="media-library-movie-card-collections" data-path="${path}">
                                <div class="media-card-actions-collections-collections">
                                    <button class="collection-btn-collections collection-btn-remove-collections" title="Remove from Collection" onclick="window.mediaLibraryManager.removeFromCollection('${collectionName}', '${path}')">➖</button>
                                    <button class="heart-btn" title="Toggle Favorite" onclick="window.mediaLibraryManager.toggleFavorite(${JSON.stringify(mediaItem)}, 'movie')">❤️</button>
                                </div>
                                <div class="media-library-card-poster">
                                    <img src="${posterPath}" alt="${title}" onerror="this.src='assets/img/placeholder-poster.jpg'">
                                </div>
                            </div>
                        `;
          });
        } else {
          html +=
            '<div class="no-movies-message">No movies in this collection</div>';
        }
        html += "</div>";
        html += "</div>";
        // RIGHT SIDE: Show TV shows in the collection
        const tvShows = collectionItems.filter((path) => {
          // For collections, we need to check if the path represents a TV show
          // Since collections store paths, we'll use path-based detection as fallback
          if (!path || typeof path !== 'string') return false; // Treat non-strings as movies
          return path.toLowerCase().includes("tvshows");
        });
        // Sort TV shows alphabetically by title
        const sortedTVShows = tvShows.sort((a, b) => {
          const titleA = this.extractTitleFromPath(a);
          const titleB = this.extractTitleFromPath(b);
          return titleA.localeCompare(titleB, undefined, {
            sensitivity: "base",
            numeric: true,
            caseFirst: "upper",
          });
        });
        html += '<div class="tvshows-section-collections">';
        html += '<h3 class="section-title-tvshows-collections">TV SHOWS</h3>';
        html += '<div class="media-library-movie-grid-collections">';
        if (sortedTVShows.length > 0) {
          sortedTVShows.forEach((path) => {
            const title = this.extractTitleFromPath(path);
            // console.log('[COLLECTIONS] Processing TV show path:', path);
            // console.log('[COLLECTIONS] Extracted title:', title);
            
            // Find the TV show in unified data instead of creating a synthetic mediaItem
            let tvShowData = null;
            let posterPath = "/assets/img/placeholder-poster.jpg";
            
            if (this.unifiedData) {
              // Search for TV show by path in unified data using normalized path comparison
              for (const [key, item] of Object.entries(this.unifiedData)) {
                if (item.type === 'tvshow' && item.files) {
                  const hasMatchingFile = item.files.some(file => {
                    // Extract show name from Collections path (e.g., "bored.to.death.(2009)" -> "bored to death (2009)")
                    const extractShowName = (pathStr) => {
                      if (!pathStr) return '';
                      // Convert dots to spaces and clean up
                      return pathStr
                        .replace(/\./g, ' ') // Convert dots to spaces
                        .replace(/\s+/g, ' ') // Normalize multiple spaces
                        .trim()
                        .toLowerCase();
                    };
                    
                    // Extract show name from file paths
                    const extractFileShowName = (filePath) => {
                      if (!filePath) return '';
                      const pathParts = filePath.split(/[\\\/]/);
                      // Look for the TV show folder (after MEDIA/TV-SHOWS)
                      for (let i = 0; i < pathParts.length; i++) {
                        if (pathParts[i].toLowerCase().includes('tvshows') && pathParts[i + 1]) {
                          return pathParts[i + 1].toLowerCase();
                        }
                      }
                      return '';
                    };
                    
                    const collectionShowName = extractShowName(path);
                    const fileShowName = extractFileShowName(file.path || file.absPath || '');
                    
                    return collectionShowName && fileShowName && 
                           (collectionShowName.includes(fileShowName) || fileShowName.includes(collectionShowName));
                  });
                  
                  if (hasMatchingFile) {
                    tvShowData = item;
                    break;
                  }
                }
              }
              
              if (tvShowData) {
                // Use the actual TV show data for poster lookup
            const mediaItem = {
              path: path,
              type: "tvshow",
                  title: tvShowData.TMDBTitle || tvShowData.title || title,
                  normalizedKey: tvShowData.normalizedKey || key
                };
                posterPath = this.getTVShowPosterPath(mediaItem);
                // console.log('[COLLECTIONS] Found TV show data, poster path:', posterPath);
              } else {
                // console.log('[COLLECTIONS] No TV show data found for path:', path);
              }
            }
            html += `
                            <div class="media-library-movie-card-tvshows" data-path="${path}">
                                <div class="media-card-actions-collections-tvShows-collections">
                                    <button class="collection-btn-collections collection-btn-remove-collections" title="Remove from Collection" onclick="window.mediaLibraryManager.removeFromCollection('${collectionName}', '${path}')">➖</button>
                                    <button class="heart-btn" title="Toggle Favorite" onclick="window.mediaLibraryManager.toggleFavorite(${JSON.stringify(tvShowData || {path: path, type: 'tvshow', title: title})}, 'tvshow')">❤️</button>
                                </div>
                                <div class="media-library-card-poster">
                                    <img src="${posterPath}" alt="${title}" onerror="this.src='assets/img/placeholder-poster.jpg'">
                                </div>
                            </div>
                        `;
          });
        } else {
          html +=
            '<div class="no-tvshows-message">No TV shows in this collection</div>';
        }
        html += "</div>";
        html += "</div>";
        html += "</div>";
        // Add back button at the top
        html =
          `
                    <div class="collection-header">
                        <button class="back-to-collections-btn" onclick="window.mediaLibraryManager.viewCollection(null)">
                            ← Back to Collections
                        </button>
                        <h2 class="collection-title">Collection: ${collectionName}</h2>
                    </div>
                ` + html;
        return html;
      } else {
        // Filter out empty collections - only show collections that have items
        const nonEmptyCollections = names.filter((name) => {
          const collectionPaths = collections[name] || [];
          return collectionPaths.length > 0;
        });
        
        // Show main collections list
        if (nonEmptyCollections.length === 0) {
          return '<div class="no-collections-message">No collections yet.<br>Add movies to a collection using the ➕ icon.</div>';
        }
        // Build the HTML for the collections view with proper two-column layout
        let html = '<div class="container-collections">';
        // LEFT SIDE: Show collections list (70%)
        html += '<div class="movies-section-collections">';
        html +=
          '  <h3 class="section-title-movies-collections"><span class="collections-header-text">COLLECTIONS</span></h3>';
        html += '    <div class="media-library-movie-grid-collections">';
        nonEmptyCollections.forEach((name) => {
          const collectionPaths = collections[name] || [];
          // Use unified data lookup for accurate counts
          const movieCount = collectionPaths.filter((key) => {
            if (!key || typeof key !== 'string') return true; // Treat non-strings as movies
            if (this.unifiedData && this.unifiedData[key]) {
              const item = this.unifiedData[key];
              return item.isMovie === true; // Movies have isMovie: true
            }
            return false;
          }).length;
          
          const tvCount = collectionPaths.filter((key) => {
            if (!key || typeof key !== 'string') return false; // Treat non-strings as movies
            if (this.unifiedData && this.unifiedData[key]) {
              const item = this.unifiedData[key];
              return !item.isMovie; // TV shows have isMovie: false or undefined
            }
            return false;
          }).length;
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
        html += "</div>";
        html += "</div>";
        // RIGHT SIDE: Show collection stats or help (30%)
        html += '<div class="tvshows-section-favorites">';
        html +=
          '<h3 class="section-title-tvshows-collections">COLLECTION INFO</h3>';
        html += '<div class="collection-info-panel">';
        html += `<h4 class="collection-total-count">Total Collections: <span class="collection-count-number">${nonEmptyCollections.length}</span></h4>`;
        html += '<p class="collection-description">';
        html += "Collections help you organize your media into themed groups. ";
        html +=
          "Click the 👁️ button to view a collection, or use the ➕ icon on any movie or TV show to add it to a collection.";
        html += "</p>";
        html += '<div class="collection-tip">';
        html += '<strong class="tip-label">💡 Tip:</strong> ';
        html +=
          "You can create new collections by adding items to them. The collection will be created automatically.";
        html += "</div>";
        html += "</div>";
        html += "</div>";
        html += "</div>";
        return html;
      }
    } catch (e) {
      console.error("[COLLECTIONS FATAL ERROR]", e);
      return (
        '<div class="collections-error">[COLLECTIONS FATAL ERROR] ' +
        e.message +
        "</div>"
      );
    }
  }
  // --- UTILITY METHODS ---
  extractTitleFromPath(path) {
    if (!path || typeof path !== 'string') return "";
    // Split path by both forward and backward slashes
    const pathParts = path.split(/[\/\\]/);
    console.log("[COLLECTIONS] Path parts for extraction:", pathParts);
    // For movie paths like: S:\MEDIA\MOVIES\Back to the Future (1985) [1080p]\filename.ext
    // We want the folder name: "Back to the Future (1985)" (without resolution info)
    // For TV show paths like: S:\MEDIA\TV-SHOWS\Cosmos (2014)\S01\filename.ext
    // We want the show name: "Cosmos (2014)"
    if (pathParts.length >= 4) {
      // Look for the actual media folder (not the parent category folder)
      // Skip drive letter, MEDIA, and category folders (MOVIES/TV-SHOWS)
      for (let i = 2; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        // Skip category folders like "MOVIES", "TV-SHOWS", "TVSHOWS"
        if (part && !part.match(/^(MOVIES|TV-SHOWS|TVSHOWS)$/i)) {
          // Remove resolution info like [1080p], [720p], etc.
          const cleanTitle = part.replace(/\s*\[\d+p\]\s*$/i, "");
          console.log(
            "[COLLECTIONS] Extracted clean media folder name from path:",
            cleanTitle,
            "at index",
            i,
            "for path:",
            path
          );
          return cleanTitle;
        }
      }
    }
    // Fallback: try to get the filename and clean it
    const filename = pathParts[pathParts.length - 1] || "";
    const cleanedFilename = filename.replace(/\.[^/.]+$/, ""); // Remove file extension
    // Also remove resolution info from filename if present
    const finalCleanFilename = cleanedFilename.replace(/\s*\[\d+p\]\s*$/i, "");
    // console.log('[COLLECTIONS] Fallback to filename extraction:', finalCleanFilename, 'for path:', path);
    return finalCleanFilename;
  }
  findMediaItemByPath(path, type) {
    if (!path) return {};
    try {
      // Normalize the path for comparison
      const normalizedPath = path.replace(/\\/g, "/").toLowerCase().trim();
      // For movies, search in the movies data
      if (type === "movie" && this.movies) {
        const movie = this.movies.find((m) => {
          const moviePath = (m.path || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const movieAbsPath = (m.absPath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const movieFilePath = (m.filePath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const movieRelPath = (m.relPath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          return (
            moviePath === normalizedPath ||
            movieAbsPath === normalizedPath ||
            movieFilePath === normalizedPath ||
            movieRelPath === normalizedPath
          );
        });
        if (movie) {
          console.log("[COLLECTIONS] Found movie in movies data:", movie);
          return movie;
        }
      }
      // For TV shows, search in the TV shows data
      if (type === "tvshow" && this.tvShows) {
        const tvShow = this.tvShows.find((tv) => {
          const tvPath = (tv.path || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const tvAbsPath = (tv.absPath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const tvFilePath = (tv.filePath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const tvRelPath = (tv.relPath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          return (
            tvPath === normalizedPath ||
            tvAbsPath === normalizedPath ||
            tvFilePath === normalizedPath ||
            tvRelPath === normalizedPath
          );
        });
        if (tvShow) {
          console.log("[COLLECTIONS] Found TV show in TV shows data:", tvShow);
          return tvShow;
        }
      }
      // Try to find in current tab items as fallback
      const currentItems = this.getItemsForCurrentTab();
      if (
        currentItems &&
        Array.isArray(currentItems) &&
        currentItems.length > 0
      ) {
        const foundItem = currentItems.find((item) => {
          const itemPath = (item.path || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const itemAbsPath = (item.absPath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const itemFilePath = (item.filePath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const itemRelPath = (item.relPath || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          return (
            itemPath === normalizedPath ||
            itemAbsPath === normalizedPath ||
            itemFilePath === normalizedPath ||
            itemRelPath === normalizedPath
          );
        });
        if (foundItem) {
          console.log("[COLLECTIONS] Found item in current tab:", foundItem);
          return foundItem;
        }
      } else {
        console.log("[COLLECTIONS] Current tab items not available or empty");
      }
      // Don't create incomplete objects - log warning and return null
      console.warn(
        "[COLLECTIONS] No complete media item found for path:",
          path,
        "type:",
        type
      );
      return null;
      console.log(
        "[COLLECTIONS] No media item found for path:",
        path,
        "type:",
        type
      );
      return {};
    } catch (error) {
      console.warn("[COLLECTIONS] Error finding media item by path:", error);
      return {};
    }
  }
  // --- GENRE FILTER LOGIC ---
  getCommonGenres() {
    // You can expand this list as needed
    return [
      "All Genres",
      "Action",
      "Adventure",
      "Animation",
      "Comedy",
      "Crime",
      "Documentary",
      "Drama",
      "Family",
      "Fantasy",
      "History",
      "Horror",
      "Music",
      "Mystery",
      "Romance",
      "Sci-Fi",
      "Science Fiction",
      "Thriller",
      "War",
      "Western",
    ];
  }
  getTVShowGenres() {
    // TV show specific genres
    return [
      "All Genres",
      "Action",
      "Adventure",
      "Animation",
      "Comedy",
      "Crime",
      "Documentary",
      "Drama",
      "Family",
      "Fantasy",
      "Horror",
      "Mystery",
      "Reality",
      "Romance",
      "Sci-Fi",
      "Science Fiction",
      "Thriller",
      "War",
    ];
  }
  getMovieGenres(movie) {
    // Try to get genres from normalized genre file using normalizedKey
    if (
      movie.normalizedKey &&
      this.movieGenres &&
      this.movieGenres[movie.normalizedKey]
    ) {
      return this.movieGenres[movie.normalizedKey].map((g) => g.toLowerCase());
    }
    // Fallbacks as before
    if (Array.isArray(movie.genre))
      return movie.genre.map((g) => g.toLowerCase());
    if (Array.isArray(movie.genres))
      return movie.genres.map((g) => g.toLowerCase());
    if (typeof movie.genre === "string")
      return movie.genre
        .toLowerCase()
        .split(/[,/]/)
        .map((g) => g.trim());
    if (typeof movie.genres === "string")
      return movie.genres
        .toLowerCase()
        .split(/[,/]/)
        .map((g) => g.trim());
    // Fallback: try to guess from title
    const title = (movie.title || "").toLowerCase();
    const genres = this.getCommonGenres()
      .slice(1)
      .map((g) => g.toLowerCase());
    return genres.filter((g) => title.includes(g));
  }
  selectedGenre = "All Genres";
  handleGenreChange(event) {
    this.selectedGenre = event.target.value;
    // Use appropriate rendering method based on current tab
    if (this.currentTab === "tvshows") {
      // For TV shows, use updateModalContent to properly re-render
      this.updateModalContent();
    } else {
      // For movies and other tabs, use renderMediaGrid
      this.renderMediaGrid();
    }
    this.updateCount();
  }

  // --- MOVIE DETAILS MODAL ---
  async showMovieDetailsModal(movie) {
    console.log(
      "[DEBUG - MOVIE-DETAILS] showMovieDetailsModal called with movie:",
      movie
    );
    const grid = document.getElementById("mediaGrid");
    if (!grid) return;
    // Update modal content class to hide A-Z sidebar
    const modalContent = document.querySelector(".media-library-modal-content");
    if (modalContent) {
      modalContent.classList.remove(
        "movies",
        "tvshows",
        "favorites",
        "collections",
        "suggestions",
        "watchlater"
      );
      modalContent.classList.add("moviedetails");
    }
    // Render basic movie details immediately to prevent flash
    const poster = `<img src="${this.getPosterPath(movie)}" alt="${movie.title}" style="width:180px;max-width:40vw;border-radius:10px;box-shadow:0 2px 12px rgba(0,0,0,0.12);">`;
    const genres = (movie.genre || movie.genres || []).toString();
    const year =
      movie.year ||
      (movie.releaseDate ? ("" + movie.releaseDate).slice(0, 4) : "");
    // Render basic content immediately
    grid.innerHTML = `
            <div class="media-library-details-modal">
                <!-- Poster -->
                <div class="media-library-details-poster">${poster}</div>
                
                <!-- Main Content Area -->
                <div class="media-library-details-main-content">
                    <!-- Content Section -->
                <div class="media-library-details-content">
                    <button id="backToGridBtn" class="media-library-details-back">← Back</button>
                        
                    <h2 class="media-library-details-title">${(() => {
                      // Use normalizedKey for display title, fallback to path if needed
                      let displayTitle = "";
                      if (movie.normalizedKey) {
                        // Convert normalized key to readable display format
                        displayTitle = this.convertNormalizedKeyToDisplayTitle(
                          movie.normalizedKey
                        );
                      } else if (movie.path) {
                        // Fallback to path and clean it
                        displayTitle = this.cleanTitleForDisplay(movie.path);
                      } else {
                        displayTitle =
                          movie.TMDBTitle ||
                          movie.title ||
                          movie.name ||
                          movie.filename ||
                          "";
                      }
                      return displayTitle;
                    })()}</h2>
                    <div class="media-library-details-meta">${year ? year + " • " : ""}${genres}</div>
                    <div class="media-library-details-description">
                        <div class="media-library-details-loading">Loading description...</div>
                    </div>
                    <div class="media-library-details-buttons">
                        <button id="playMovieBtn" class="media-library-details-play">▶ Play</button>
                        <button id="detailsFavoriteBtn" title="Toggle Favorite" class="media-library-details-favorite">${this.isFavorite(movie.path) ? "❤️" : "🤍"}</button>
                        <button id="detailsCollectionBtn" title="${this.isInCollectionSync(movie.path) ? "Remove from Collection" : "Add to Collection"}" class="media-library-details-collection">${this.isInCollectionSync(movie.path) ? "➖" : "➕"}</button>
                    </div>
                    </div>
                    
                    <!-- Cast Section -->
                    <div class="media-library-details-cast-list">
                        <b>Cast:</b>
                        <div class="media-library-details-loading">Loading cast information...</div>
                    </div>
                    
                    <!-- Collections Info Section -->
                    <div class="media-library-details-collections-container">
                        ${this.isInCollectionSync(movie.path) ? `<div class="media-library-details-collection-info">📁 In Collection: ${this.getCollectionNameForMovie(movie.path)}</div>` : ""}
                    </div>
                </div>
            </div>
        `;
    // Attach event handlers immediately
    document.getElementById("backToGridBtn").onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("[DEBUG] Back button clicked - returning to movies grid");
      
      // Remove the movie details modal content
      const movieDetailsModal = document.querySelector(".media-library-details-modal");
      if (movieDetailsModal) {
        movieDetailsModal.remove();
      }
      
      // Re-render the movies grid to show the movies list again
      try {
      this.renderMediaGrid();
      } catch (error) {
        console.error("[DEBUG] Error in renderMediaGrid:", error);
      }
    };
    
    document.getElementById("playMovieBtn").onclick = () => {
      console.log(
        "[DEBUG - PLAY-BUTTON] Play button clicked for movie:",
        movie
      );
      console.log("[DEBUG - PLAY-BUTTON] Movie properties:", {
        path: movie.path,
        absPath: movie.absPath,
        filePath: movie.filePath,
        files: movie.files,
        type: movie.type,
        mediaType: movie.mediaType,
        title: movie.title,
        name: movie.name,
        normalizedKey: movie.normalizedKey,
      });
      this.closeModal();
      this.playMedia(movie);
    };
    document.getElementById("detailsFavoriteBtn").onclick = async (e) => {
      e.stopPropagation();
      const type =
        movie.type && movie.type.toLowerCase().includes("tv") ? "tv" : "movie";
      this.toggleFavorite(movie.path, type);
      await this.showMovieDetailsModal(movie); // Re-render to update icon
    };
    document.getElementById("detailsCollectionBtn").onclick = async (e) => {
      e.stopPropagation();
      await this.showAddToCollectionModal(movie);
      // Update the collection button and info without refreshing the entire modal
      await this.updateMovieDetailsCollectionInfo(movie);
    };

    // Add ESC key handler for movie details modal
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        console.log("[DEBUG] ESC key pressed in movie details - returning to movies grid");
        
        // Remove the movie details modal content
        const movieDetailsModal = document.querySelector(".media-library-details-modal");
        if (movieDetailsModal) {
          movieDetailsModal.remove();
        }
        
        // Re-render the movies grid to show the movies list again
        try {
          this.renderMediaGrid();
        } catch (error) {
          console.error("[DEBUG] Error in renderMediaGrid from ESC:", error);
        }
        
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Now load async data and update the content using UNIFIED DATA
    try {
      console.log("[DETAILS DEBUG] Movie object:", movie);
      let desc = "";
      
      // Use the unified data structure instead of old separate files
      if (this.unifiedData && movie.normalizedKey) {
        const movieData = this.unifiedData[movie.normalizedKey];
        if (movieData) {
          // Get description from unified data
          desc = movieData.about?.description || movieData.description || "";
          console.log("[DETAILS DEBUG] Found description in unified data:", !!desc);
          
          // Get cast from unified data
          let castData = movieData.cast || movieData.cast?.cast || [];
          console.log("[DETAILS DEBUG] Found cast in unified data:", castData.length, "members");
          
          // If no cast in unified data, try to load from separate cast file
          if (!castData || castData.length === 0) {
            try {
              const movieCast = await this.loadMovieCast();
              // Try different key variations including quality labels
      const keyVariations = [
                movie.normalizedKey,
                movie.normalizedKey + ".[1080p]",
                movie.normalizedKey + ".[720p]",
                movie.title,
                movie.path
              ];
              
      for (const key of keyVariations) {
                if (key && movieCast[key] && Array.isArray(movieCast[key].cast) && movieCast[key].cast.length > 0) {
                  castData = movieCast[key].cast;
                  console.log("[DETAILS DEBUG] Found cast in cast file with key:", key, "members:", castData.length);
          break;
        }
      }
            } catch (error) {
              console.log("[DETAILS DEBUG] Error loading cast file:", error);
            }
          }
          
      // Update description
      const descElement = document.querySelector(
        ".media-library-details-description"
      );
      if (descElement) {
        descElement.innerHTML = desc
          ? desc
          : '<span class="no-description">No description available.</span>';
      }
          
          // Render cast information
      let cast = "";
      if (castData && Array.isArray(castData) && castData.length > 0) {
        // Render cast as round images with names
        cast =
          `<div class="media-library-details-cast-row" style="display:flex;gap:18px;overflow-x:auto;margin:18px 0 8px 0;">` +
          castData
            .map(
              (actor) => `
                        <div class="media-library-cast-member" style="display:flex;flex-direction:column;align-items:center;min-width:72px;max-width:90px;">
                            <div class="media-library-cast-img-wrapper" style="width:64px;height:64px;overflow:hidden;border-radius:50%;background:#eee;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.10);">
                                    <img src="${actor.profile ? actor.profile : "/assets/img/user-default.png"}" alt="${actor.name}" style="width:64px;height:64px;object-fit:cover;border-radius:50%;border-radius:50%;background:#fff;" onerror="this.src='/assets/img/user-default.png'">
                        </div>
                            <div class="media-library-cast-name" style="font-size:13px;margin-top:6px;text-align:center;white-space:normal;word-break:break-word;">${actor.name}</div>
                    </div>
                    `
            )
            .join("") +
          `</div>`;
      }
          
      // Update cast section
      const castElement = document.querySelector(
        ".media-library-details-cast-list"
      );
      if (castElement) {
        if (cast) {
          castElement.innerHTML = `<b>Cast:</b>${cast}`;
        } else {
              castElement.innerHTML = '<b>Cast:</b> <span class="no-cast">No cast information available.</span>';
            }
          }
        } else {
          console.log("[DETAILS DEBUG] Movie not found in unified data with key:", movie.normalizedKey);
          // Fallback: show no data available
          const descElement = document.querySelector(".media-library-details-description");
          if (descElement) {
            descElement.innerHTML = '<span class="no-description">No description available.</span>';
          }
          
          const castElement = document.querySelector(".media-library-details-cast-list");
          if (castElement) {
            castElement.innerHTML = '<b>Cast:</b> <span class="no-cast">No cast information available.</span>';
          }
        }
      } else {
        console.log("[DETAILS DEBUG] No unified data or normalizedKey available");
        // Fallback: show no data available
        const descElement = document.querySelector(".media-library-details-description");
        if (descElement) {
          descElement.innerHTML = '<span class="no-description">No description available.</span>';
        }
        
        const castElement = document.querySelector(".media-library-details-cast-list");
        if (castElement) {
          castElement.innerHTML = '<b>Cast:</b> <span class="no-cast">No cast information available.</span>';
        }
      }
      
      
      // Update collection info with real-time data
      await this.updateMovieDetailsCollectionInfo(movie);
    } catch (err) {
      console.error("[DETAILS MODAL ERROR]", err);
      // Update error state without clearing the entire modal
      const descElement = document.querySelector(
        ".media-library-details-description"
      );
      if (descElement) {
        descElement.innerHTML =
          '<span class="error-description">Error loading description. Check the console for more info.</span>';
      }
      const castElement = document.querySelector(
        ".media-library-details-cast-list"
      );
      if (castElement) {
        castElement.innerHTML =
          '<b>Cast:</b><span class="error-cast">Error loading cast information.</span>';
      }
    }
  }

  // --- TV SHOW NAVIGATION ---
  currentTVShow = null;
  currentTVSeason = null;
  // --- TV SHOW STRUCTURE ---
  getTVShows() {
    // Returns array of main TV show objects from unified data
    const tvShows = [];
    
    if (this.unifiedData && Object.keys(this.unifiedData).length > 0) {
      console.log('[DEBUG - GET-TV-SHOWS] Using unified data with', Object.keys(this.unifiedData).length, 'shows');
      
      Object.entries(this.unifiedData).forEach(([key, show]) => {
        // Only include entries that are TV shows (not movies and have seasons)
        if (!show.isMovie && show.seasons && typeof show.seasons === 'object') {
          const name = show.TMDBTitle || show.title || key;
          const normalizedKey = key;
          
            tvShows.push({
              name,
            path: `TV-SHOWS/${name}`,
            normalizedKey,
            TMDBTitle: show.TMDBTitle,
              data: show,
            });
          }
        });
    }
    
    console.log('[DEBUG - GET-TV-SHOWS] Found', tvShows.length, 'TV shows');
    return tvShows;
  }
  extractShowName(path) {
    // Handles both 'TV-SHOWS/Show Name' and just 'Show Name' formats
    if (!path || typeof path !== "string") return "Unknown Show";
    const parts = path.split(/[\/]/).filter(Boolean);
    // Try to find after TV-SHOWS
    const tvShowsIndex = parts.findIndex(
      (part) =>
        part.toLowerCase() === "tvshows" || part.toLowerCase() === "tv_shows"
    );
    if (tvShowsIndex !== -1 && tvShowsIndex + 1 < parts.length) {
      return parts[tvShowsIndex + 1];
    }
    // Otherwise, just use the last part (should be the show name)
    return parts[parts.length - 1] || "Unknown Show";
  }
  getSeasonsForShow(showOrPath) {
    // Accepts either a show object or a show path
    let show = null;
    if (typeof showOrPath === "object" && showOrPath && showOrPath.data) {
      show = showOrPath.data;
    } else if (typeof showOrPath === "object" && showOrPath) {
      show = showOrPath;
    } else {
      show = this.findShowByPath(showOrPath);
    }
    if (!show) {
      console.log("[SEASON DEBUG] No show found for:", showOrPath);
      return [];
    }
    // Get show name for JSON lookup
    let showName = "";
    if (show.title) {
      showName = show.title;
    } else if (show.name) {
      showName = show.name;
    } else if (show.path) {
      showName = this.extractShowName(show.path);
    }
    // DEBUG: Log the show name being used
    console.log("[DEBUG - SEASON] Show name for JSON lookup:", showName);
    console.log("[DEBUG - SEASON] Show object keys:", Object.keys(show));
    if (show.data) {
      console.log("[DEBUG - SEASON] Show.data keys:", Object.keys(show.data));
      console.log("[DEBUG - SEASON] Show.data.name:", show.data.name);
    }
    if (show.TMDBTitle) {
      console.log("[DEBUG - SEASON] Show has TMDBTitle:", show.TMDBTitle);
    }
    // Check for seasons in the show object first (Media Manager format)
    if (show.seasons && Array.isArray(show.seasons)) {
      console.log(
        "[DEBUG - SEASON] Found seasons in show object (Media Manager format)"
      );
      const seasons = show.seasons.map((season) => ({
        seasonNumber: season.seasonNumber,
        path: `Season ${season.seasonNumber.toString().padStart(2, "0")}`,
        episodes: season.episodes || {},
        poster: null, // Will be loaded from seasonEpisodeImages
      }));
      return seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
    }
    // Check for seasons in JSON data (from TMDB)
    console.log(
      "[DEBUG - SEASON] seasonEpisodeImages available:",
      !!this.seasonEpisodeImages
    );
    if (this.seasonEpisodeImages) {
      console.log(
        "[DEBUG - SEASON] seasonEpisodeImages keys:",
        Object.keys(this.seasonEpisodeImages)
      );
      console.log(
        "[DEBUG - SEASON] Looking for Cosmos keys:",
        Object.keys(this.seasonEpisodeImages).filter((key) =>
          key.includes("Cosmos")
        )
      );
    }
    // PRIORITY 1: Use ONLY unified data for everything
    if (this.unifiedData && showName) {
      console.log("[DEBUG - SEASON] Using ONLY unified data for:", showName);
      
      // Convert showName to normalized key format using the same logic as our robust system
      let normalizedKey = showName.toLowerCase().trim();
      
      // Use the year from show.about.year if available, otherwise extract from title
      let year = null;
      if (show.about && show.about.year) {
        year = show.about.year;
        console.log("[DEBUG - SEASON] Using year from about.year:", year);
      } else {
        // Extract year from title as fallback
        const yearMatch = showName.match(/\((\d{4})\)/);
        if (yearMatch) {
          year = yearMatch[1];
          console.log("[DEBUG - SEASON] Using year from title:", year);
        }
      }
      
      // Remove the year from title and add it back with dot format
      normalizedKey = normalizedKey.replace(/\s*\(\d{4}\)/, "");
      if (year) {
        normalizedKey += ".(" + year + ")";
      }
      
      // Replace & with and before removing special characters
      normalizedKey = normalizedKey.replace(/&/g, "and");
      // Remove special characters but preserve parentheses and dots
      normalizedKey = normalizedKey.replace(/[^\w\s().]/g, "");
      // Convert spaces to dots
      normalizedKey = normalizedKey.replace(/\s+/g, ".");
      // Clean up multiple consecutive dots
      normalizedKey = normalizedKey.replace(/\.{2,}/g, ".");
      // Remove leading/trailing dots
      normalizedKey = normalizedKey.replace(/^\.+|\.+$/g, "");
      
      // For TV shows, try to find a key that contains this base name
      // This handles cases where the key includes year in parentheses
      if (!Object.keys(this.unifiedData).find(key => key === normalizedKey)) {
        // Try to find a key that starts with our normalized key
        const matchingKey = Object.keys(this.unifiedData).find(key => 
          key.startsWith(normalizedKey + ".") || key.startsWith(normalizedKey + "(")
        );
        if (matchingKey) {
          normalizedKey = matchingKey;
        }
      }
      
      console.log("[DEBUG - SEASON] Converted showName to normalized key:", showName, "->", normalizedKey);
      
      // Find the show in unified data using normalized key
      let showKey = Object.keys(this.unifiedData).find(key => key === normalizedKey);

      if (!showKey) {
        // Try exact match as fallback
        showKey = Object.keys(this.unifiedData).find(key => key === showName);
        
        if (!showKey) {
          // Try fuzzy matching as last resort
          showKey = Object.keys(this.unifiedData).find(key => {
            const keyLower = key.toLowerCase();
            const showNameLower = showName.toLowerCase();
            return keyLower.includes(showNameLower.replace(/[^a-z0-9]/g, '')) ||
                   showNameLower.includes(keyLower.replace(/[^a-z0-9]/g, ''));
          });
        }
      }

      console.log("[DEBUG - SEASON] Found show key in unified data:", showKey);

      if (showKey && this.unifiedData[showKey].seasons) {
        console.log("[DEBUG - SEASON] Building seasons from unified data only");
        
        const allSeasons = [];
        
        // Add regular numbered seasons from unified data
        for (const seasonNum in this.unifiedData[showKey].seasons) {
          const seasonData = this.unifiedData[showKey].seasons[seasonNum];
          
          // Skip non-numeric season keys (these are special content)
          if (isNaN(parseInt(seasonNum, 10))) {
            continue;
          }
          
          const episodeCount = seasonData.episodes ? Object.keys(seasonData.episodes).length : 0;
          allSeasons.push({
                seasonNumber: parseInt(seasonNum, 10),
                path: `Season ${seasonNum.padStart(2, "0")}`,
                episodes: seasonData.episodes || {},
                season_poster: seasonData.season_poster || seasonData.poster || null,
                poster: seasonData.season_poster || seasonData.poster || null,
                isSpecials: false,
            episodeCount: episodeCount
          });
        }
        
        // Add special content sections from unified data
        console.log("[DEBUG - SEASON] Checking for Featurettes in unified data for show:", showKey);
        console.log("[DEBUG - SEASON] Available seasons keys:", Object.keys(this.unifiedData[showKey].seasons));
        console.log("[DEBUG - SEASON] Full seasons object:", this.unifiedData[showKey].seasons);
        console.log("[DEBUG - SEASON] Data loading timestamp:", new Date().toISOString());
        console.log("[DEBUG - SEASON] Unified data keys count:", Object.keys(this.unifiedData).length);
        
        // FORCE Featurettes to work for Lois & Clark - check if it exists in the JSON directly
        if (this.unifiedData[showKey].seasons.Featurettes) {
          const featurettesData = this.unifiedData[showKey].seasons.Featurettes;
          const episodeCount = featurettesData.episodes ? Object.keys(featurettesData.episodes).length : 0;
          allSeasons.push({
            seasonNumber: 998, // Featurettes get second-highest number
            path: "Featurettes",
            episodes: featurettesData.episodes || {},
            season_poster: featurettesData.season_poster || featurettesData.poster || null,
            poster: featurettesData.season_poster || featurettesData.poster || null,
            isSpecials: true,
            specialsCategory: "Featurettes",
            episodeCount: episodeCount
          });
          console.log("[DEBUG - SEASON] Added Featurettes section with", episodeCount, "episodes");
        } else {
          // DEBUG: Check if Featurettes exists in the raw JSON data
          console.log("[DEBUG - SEASON] Featurettes NOT found in seasons, checking raw data...");
          console.log("[DEBUG - SEASON] Raw seasons object keys:", Object.keys(this.unifiedData[showKey].seasons));
          console.log("[DEBUG - SEASON] Raw seasons object:", this.unifiedData[showKey].seasons);
        }

        if (this.unifiedData[showKey].seasons.Specials) {
          const specialsData = this.unifiedData[showKey].seasons.Specials;
          const episodeCount = specialsData.episodes ? Object.keys(specialsData.episodes).length : 0;
          allSeasons.push({
            seasonNumber: 999, // Specials get highest number
            path: "Specials",
            episodes: specialsData.episodes || {},
            poster: specialsData.poster || null,
            isSpecials: true,
            specialsCategory: "Specials",
            episodeCount: episodeCount
          });
          console.log("[DEBUG - SEASON] Added Specials section with", episodeCount, "episodes");
        }

        if (this.unifiedData[showKey].seasons.Extras) {
          const extrasData = this.unifiedData[showKey].seasons.Extras;
          const episodeCount = extrasData.episodes ? Object.keys(extrasData.episodes).length : 0;
          allSeasons.push({
            seasonNumber: 997, // Extras get third-highest number
            path: "Extras",
            episodes: extrasData.episodes || {},
            poster: extrasData.poster || null,
            isSpecials: true,
            specialsCategory: "Extras",
            episodeCount: episodeCount
          });
          console.log("[DEBUG - SEASON] Added Extras section with", episodeCount, "episodes");
        }
        
        console.log("[DEBUG - SEASON] Final seasons array from unified data:", allSeasons.map(s => ({ path: s.path, isSpecials: s.isSpecials, episodeCount: s.episodeCount })));
          
          // Sort: regular seasons first (by number), then specials at the end
        return allSeasons.sort((a, b) => {
            if (a.isSpecials && !b.isSpecials) return 1; // Specials go last
            if (!a.isSpecials && b.isSpecials) return -1; // Regular seasons first
            if (a.isSpecials && b.isSpecials) return 0; // Specials order doesn't matter
            return a.seasonNumber - b.seasonNumber; // Regular seasons by number
          });
        }
      }
    
    // No fallback needed - we use ONLY unified data
    console.log("[DEBUG - SEASON] No unified data found for show:", showName);
    return [];
  }

  // Handle Episodes for Seasons as well as Specials/Featurettes/Extra content
  getEpisodesForSeason(showPath, seasonPath) {
    if (!showPath || !seasonPath) return [];
    let show = null;
    console.log(
      "[DEBUG - EPISODES] getEpisodesForSeason called with showPath:",
      showPath,
      "seasonPath:",
      seasonPath
    );
    if (typeof showPath === "object" && showPath && showPath.data) {
      show = showPath.data;
    } else if (typeof showPath === "object" && showPath) {
      show = showPath;
    } else {
      show = this.findShowByPath(showPath);
    }
    console.log("[DEBUG - EPISODES] show object:", show);
    if (!show) {
      console.log("[DEBUG - EPISODES] show is null or undefined");
      return [];
    }
    
    // Try to get episodes from the show object first (this is where the data actually exists)
    if (show && show.seasons) {
      console.log("[DEBUG - EPISODES] Show object has seasons data, checking for episodes");
      console.log("[DEBUG - EPISODES] Available seasons in show object:", Object.keys(show.seasons));
      
      // Check if this is a special content section (Specials, Featurettes, etc.)
      const isSpecialContent = seasonPath.toLowerCase().includes('specials') || 
                              seasonPath.toLowerCase().includes('featurettes') ||
                              seasonPath.toLowerCase().includes('extras');
      
      if (isSpecialContent) {
        console.log("[DEBUG - EPISODES] This is special content section:", seasonPath);
        
        // SWITCH CONTROL for different content types
        let specialContentKey = null;
        let seasonData = null;
        let contentType = null;
        
        // Try to find the special content section
        if (seasonPath.toLowerCase().includes('specials') && show.seasons.Specials) {
          specialContentKey = 'Specials';
          seasonData = show.seasons.Specials;
        } else if (seasonPath.toLowerCase().includes('featurettes') && show.seasons.Featurettes) {
          specialContentKey = 'Featurettes';
          seasonData = show.seasons.Featurettes;
        } else {
          // Try to find any non-numeric season key
          const specialKeys = Object.keys(show.seasons).filter(key => isNaN(parseInt(key)));
          if (specialKeys.length > 0) {
            specialContentKey = specialKeys[0];
            seasonData = show.seasons[specialContentKey];
          }
        }
        
        if (seasonData && seasonData.episodes) {
          console.log("[DEBUG - EPISODES] Found special content episodes for key:", specialContentKey, "episodes:", Object.keys(seasonData.episodes).length);
          
          // Convert unified episode data to the expected format
          const episodes = Object.entries(seasonData.episodes).map(([episodeNum, episode]) => {
            return {
              name: episode.title || `Episode ${episodeNum}`,
              filename: episode.title || `Episode ${episodeNum}`,
              path: episode.filePath || episode.path || "", // Use filePath first, fallback to path
              relPath: episode.relPath || episode.filePath || episode.path || "", // Use relPath first, fallback to filePath
              // Use absPath for video playback, fallback to filePath, then path
              filePath: episode.absPath || episode.filePath || episode.path || "",
              still: episode.still ? (episode.still.startsWith('http') ? episode.still : `/media/TV-SHOWS/${episode.still}`) : (show.poster || ""), // Handle both TMDB URLs and local paths
              thumbnail: episode.thumbnail ? (episode.thumbnail.startsWith('http') ? episode.thumbnail : `/media/TV-SHOWS/${episode.thumbnail}`) : (episode.still ? (episode.still.startsWith('http') ? episode.still : `/media/TV-SHOWS/${episode.still}`) : (show.poster || "")), // Handle both TMDB URLs and local paths
              generated: false,
              timestamp: "",
              episodeNumber: episodeNum,
              isSpecialContent: true,
              contentType: contentType,
              seasonNumber: contentType // Use content type as season number for special content
            };
          });
          
          console.log("[DEBUG - EPISODES] Converted special content episodes:", episodes.length);
          return episodes;
        }
      } else {
        // Handle regular numbered seasons
        const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i);
        if (seasonMatch) {
          const seasonNum = seasonMatch[1];
          console.log("[DEBUG - EPISODES] Looking for season:", seasonNum);
          
          // Convert to integer and back to string to remove leading zeros
          // This matches how seasons are stored: "01" -> "1", "02" -> "2", etc.
          const seasonNumInt = parseInt(seasonNum, 10).toString();
          console.log("[DEBUG - EPISODES] Converted season number:", seasonNum, "->", seasonNumInt);
          
          // Try the integer version first (matches storage format), then fallback to original
          const seasonKeys = [seasonNumInt, seasonNum];
          console.log("[DEBUG - EPISODES] Trying season keys:", seasonKeys);
          console.log("[DEBUG - EPISODES] Available season keys in show object:", Object.keys(show.seasons));
          
          let seasonData = null;
          let foundSeasonKey = null;
          
          for (const key of seasonKeys) {
            console.log("[DEBUG - EPISODES] Checking season key:", key, "exists:", !!show.seasons[key]);
            if (show.seasons[key]) {
              seasonData = show.seasons[key];
              foundSeasonKey = key;
              console.log("[DEBUG - EPISODES] Found season data for key:", key);
              break;
            }
          }
          
          if (seasonData && seasonData.episodes) {
            console.log("[DEBUG - EPISODES] Found episodes in show object for season key:", foundSeasonKey, "episodes:", Object.keys(seasonData.episodes).length);
            
            // Convert unified episode data to the expected format
            const episodes = Object.entries(seasonData.episodes).map(([episodeNum, episode]) => {
              console.log(`[DEBUG - EPISODES] Processing episode ${episodeNum}:`, episode);
              return {
                name: episode.title || `Episode ${episodeNum}`,
                filename: episode.title || `Episode ${episodeNum}`,
                path: episode.absPath || episode.path || "",
                relPath: episode.absPath || episode.path || "",
                // Use absPath for video playback, fallback to path
                filePath: episode.absPath || episode.path || "",
                still: episode.still ? (episode.still.startsWith('http') ? episode.still : episode.still) : "",
                thumbnail: episode.thumbnail ? (episode.thumbnail.startsWith('http') ? episode.thumbnail : episode.thumbnail) : (episode.still ? (episode.still.startsWith('http') ? episode.still : episode.still) : ""),
                generated: false,
                timestamp: "",
                episodeNumber: episodeNum
              };
            });
            
            console.log("[DEBUG - EPISODES] Converted episodes:", episodes.length);
            return episodes;
          }
        }
      }
    }
    
    // Fallback: Try to get episodes from seasonEpisodeImages
    if (this.seasonEpisodeImages && show.name) {
      console.log("[DEBUG - EPISODES] Fallback: Looking in seasonEpisodeImages for key:", show.name);
      // Use the original show name as the key (same as used in loadSeasonEpisodeImages)
      const lookupKey = show.name;
      console.log("[DEBUG - EPISODES] Available keys in seasonEpisodeImages:", Object.keys(this.seasonEpisodeImages));
      
      // Try exact key first, then fallback to finding similar key
      let actualKey = lookupKey;
      if (!this.seasonEpisodeImages[lookupKey]) {
        // Try to find a matching key
        const availableKeys = Object.keys(this.seasonEpisodeImages);
        actualKey = availableKeys.find(key => 
          key.toLowerCase().includes(show.name.toLowerCase()) ||
          show.name.toLowerCase().includes(key.toLowerCase())
        );
        console.log("[DEBUG - EPISODES] Key not found, trying fallback key:", actualKey);
      }
      
      if (this.seasonEpisodeImages[actualKey] && this.seasonEpisodeImages[actualKey].seasons) {
        console.log("[DEBUG - EPISODES] Found show data for key:", actualKey);
        console.log("[DEBUG - EPISODES] Available seasons:", Object.keys(this.seasonEpisodeImages[actualKey].seasons));
        console.log("[DEBUG - EPISODES] Looking for season data in:", this.seasonEpisodeImages[actualKey].seasons);
        
        // Extract season number from seasonPath
        const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i);
        if (seasonMatch) {
          const seasonNum = seasonMatch[1];
          console.log("[DEBUG - EPISODES] Looking for season:", seasonNum);
          
          // Convert to integer and back to string to remove leading zeros
          // This matches how seasons are stored: "01" -> "1", "02" -> "2", etc.
          const seasonNumInt = parseInt(seasonNum, 10).toString();
          console.log("[DEBUG - EPISODES] Converted season number:", seasonNum, "->", seasonNumInt);
          
          // Try the integer version first (matches storage format), then fallback to original
          const seasonKeys = [seasonNumInt, seasonNum];
          console.log("[DEBUG - EPISODES] Trying season keys:", seasonKeys);
          console.log("[DEBUG - EPISODES] Available season keys in data:", Object.keys(this.seasonEpisodeImages[actualKey].seasons));
          
          let seasonData = null;
          let foundSeasonKey = null;
          
          for (const key of seasonKeys) {
            console.log("[DEBUG - EPISODES] Checking season key:", key, "exists:", !!this.seasonEpisodeImages[actualKey].seasons[key]);
            if (this.seasonEpisodeImages[actualKey].seasons[key]) {
              seasonData = this.seasonEpisodeImages[actualKey].seasons[key];
              foundSeasonKey = key;
              console.log("[DEBUG - EPISODES] Found season data for key:", key);
              break;
            }
          }
          
          if (seasonData && seasonData.episodes) {
            console.log("[DEBUG - EPISODES] Found episodes in seasonEpisodeImages for season key:", foundSeasonKey, "episodes:", Object.keys(seasonData.episodes).length);
            
            // Convert unified episode data to the expected format
            const episodes = Object.entries(seasonData.episodes).map(([episodeNum, episode]) => {
              return {
                name: episode.title || `Episode ${episodeNum}`,
                filename: episode.title || `Episode ${episodeNum}`,
                path: episode.absPath || episode.path || "",
                relPath: episode.absPath || episode.path || "",
                // Use absPath for video playback, fallback to path
                filePath: episode.absPath || episode.path || "",
                still: episode.still || "",
                thumbnail: episode.still || "",
                generated: false,
                timestamp: "",
                episodeNumber: episodeNum
              };
            });
            
            console.log("[DEBUG - EPISODES] Converted episodes:", episodes.length);
            return episodes;
          }
        }
      }
    }
    
    console.log("[DEBUG - EPISODES] No episodes found in unified data, falling back to file system data");
    // Handle the normalized TV shows format with folders structure
    if (
      show.folders &&
      Array.isArray(show.folders) &&
      show.folders.length > 0
    ) {
      console.log(
        "[DEBUG - EPISODES] Found folders array with",
        show.folders.length,
        "folders"
      );
      // Check if this is a specials season
      if (
        seasonPath === "Specials" ||
        seasonPath.toLowerCase().includes("specials")
      ) {
        console.log("[DEBUG - EPISODES] Looking for specials folder");
        
        // Find the specials folder in the file system data
        const specialsFolder = show.folders.find((folder) => {
          const folderPath = folder.path || "";
          const normalizedFolderPath = folderPath.replace(/\\/g, "/");
          return normalizedFolderPath.toLowerCase().includes("specials");
        });
        
        if (specialsFolder && specialsFolder.files && specialsFolder.files.length > 0) {
          console.log(
            "[DEBUG - EPISODES] Found specials folder with",
            specialsFolder.files.length,
            "video files"
          );
          
          // Create episodes from file system data (this gives us the video paths)
          let episodes = specialsFolder.files.map((file) => ({
            name: file.name || file.filename,
            filename: file.filename || file.name,
            path: file.absPath || file.relPath,
            relPath: file.absPath || file.relPath,
            filePath: file.absPath || file.filePath,
            absPath: file.absPath,
            // Initialize thumbnail properties (will be populated by merging logic)
            still: "",
            thumbnail: "",
            generated: false,
            timestamp: "",
          }));
          
          // Now merge with thumbnail data from episode images JSON
          const showKey = this.getShowKeyFromPath(show.path || show.name);
          if (
            showKey &&
            this.seasonEpisodeImages[showKey] &&
            this.seasonEpisodeImages[showKey].seasons
          ) {
            const specialsSeason =
              this.seasonEpisodeImages[showKey].seasons["Specials"];
            if (specialsSeason && specialsSeason.episodes) {
              console.log(
                "[DEBUG - EPISODES] Found",
                Object.keys(specialsSeason.episodes).length,
                "episodes in JSON for",
                showKey,
                "Specials"
              );
              
              // Merge thumbnail data from JSON with video file data
              episodes.forEach((episode) => {
                // Find matching episode in JSON data by episode key
                const episodeKey = Object.keys(specialsSeason.episodes).find(
                  (key) => {
                    // Try to match by episode key (which should match the filename)
                    return key.toLowerCase().includes(episode.filename.toLowerCase()) ||
                           episode.filename.toLowerCase().includes(key.toLowerCase());
                  }
                );
                
                if (episodeKey) {
                  const jsonEpisode = specialsSeason.episodes[episodeKey];
                  // Merge thumbnail data
                  episode.still = jsonEpisode.still;
                  episode.thumbnail = jsonEpisode.thumbnail;
                  episode.generated = jsonEpisode.generated;
                  episode.timestamp = jsonEpisode.timestamp;
                  console.log(
                    `[DEBUG - THUMBNAIL] Merged thumbnail for ${episode.filename}: ${jsonEpisode.still}`
                  );
                } else {
                  console.log(
                    `[DEBUG - THUMBNAIL] No JSON match found for episode: ${episode.filename}`
                  );
                }
              });
            }
          }
          
          // Sort by episode number or filename
          episodes.sort((a, b) => {
            const aName = (a.name || a.filename || "").toLowerCase();
            const bName = (b.name || b.filename || "").toLowerCase();
            return aName.localeCompare(bName);
          });
          
          console.log(
            "[DEBUG - EPISODES] Returning",
            episodes.length,
            "specials episodes with merged data"
          );
          
          // Log final episode data for debugging
          episodes.forEach(episode => {
            console.log(`[DEBUG - EPISODE-FINAL] ${episode.filename}: still=${episode.still}, filePath=${episode.filePath}`);
          });
          
          return episodes;
        } else {
          console.log(
            "[DEBUG - EPISODES] No specials folder or video files found in file system"
          );
          return [];
        }
      }
      // Find the season folder that matches the seasonPath
      const seasonFolder = show.folders.find((folder) => {
        const folderPath = folder.path || "";
        const normalizedFolderPath = folderPath.replace(/\\/g, "/");
        const normalizedSeasonPath = seasonPath.replace(/\\/g, "/");
        console.log(
          "[DEBUG - EPISODES] Comparing folder path:",
          normalizedFolderPath,
          "with season path:",
          normalizedSeasonPath
        );
        
        // Extract season number from seasonPath (e.g., "season.03" -> "03")
        const seasonMatch = seasonPath.match(/season\.(\d+)/i);
        const seasonNumber = seasonMatch ? seasonMatch[1] : null;
        
        // Extract season number from folder path (e.g., "Season 03" -> "03")
        const folderMatch = folderPath.match(/season\s+(\d+)/i);
        const folderSeasonNumber = folderMatch ? folderMatch[1] : null;
        
        console.log(
          "[DEBUG - EPISODES] Regex debug - seasonPath:",
          seasonPath,
          "folderPath:",
          folderPath,
          "seasonMatch:",
          seasonMatch,
          "folderMatch:",
          folderMatch,
          "seasonNumber:",
          seasonNumber,
          "folderSeasonNumber:",
          folderSeasonNumber
        );
        
        // Try multiple matching strategies
        const isMatch = (
         // Strategy 1: Match by season numbers
         (seasonNumber &&
           folderSeasonNumber &&
           seasonNumber === folderSeasonNumber) ||
         
         // Strategy 2: Direct path inclusion
         normalizedFolderPath.includes(normalizedSeasonPath) ||
         normalizedSeasonPath.includes(normalizedFolderPath) ||
         
         // Strategy 3: Exact path match
         folderPath === seasonPath ||
         
         // Strategy 4: Path ending match
         folderPath.endsWith(seasonPath) ||
         seasonPath.endsWith(folderPath.split(/[\\/]/).pop()) ||
         
         // Strategy 5: Normalized path comparison (NEW)
         normalizedFolderPath.toLowerCase() === normalizedSeasonPath.toLowerCase() ||
         
         // Strategy 6: Extract and compare season names (NEW)
         (() => {
           const seasonNameFromPath = seasonPath.split(/[\\/]/).pop()?.toLowerCase();
           const seasonNameFromFolder = folderPath.split(/[\\/]/).pop()?.toLowerCase();
           return seasonNameFromPath === seasonNameFromFolder;
         })()
       );
       
       if (isMatch) {
         console.log("[DEBUG - EPISODES] ✅ Season folder MATCHED:", folderPath);
       }
       
       return isMatch;
     });
     
     if (!seasonFolder) {
       console.log(
         "[DEBUG - EPISODES] Season folder not found for path:",
         seasonPath
       );
       console.log(
         "[DEBUG - EPISODES] Available folders:",
         show.folders.map((f) => f.path)
       );
       return [];
     }
     
     console.log("[DEBUG - EPISODES] Found season folder:", seasonFolder.path);
     console.log(
       "[DEBUG - EPISODES] Season folder has",
       seasonFolder.files?.length || 0,
       "files"
     );
     
     if (!seasonFolder.files || seasonFolder.files.length === 0) {
       console.log("[DEBUG - EPISODES] No files found in season folder");
       return [];
     }
     
     // Convert files to episode objects
     let episodes = seasonFolder.files.map((file) => ({
       name: file.name || file.filename,
       filename: file.filename || file.name,
       path: file.relPath,
       relPath: file.relPath,
       filePath: file.filePath,
       absPath: file.absPath,
       // Initialize thumbnail properties (will be populated by merging logic)
       still: "",
       thumbnail: "",
       generated: false,
       timestamp: "",
     }));
     
     // Merge thumbnail data from episode images JSON
     const showKey = this.getShowKeyFromPath(show.path || show.name);
     if (
       showKey &&
       this.seasonEpisodeImages[showKey] &&
       this.seasonEpisodeImages[showKey].seasons
     ) {
       const specialsSeason =
         this.seasonEpisodeImages[showKey].seasons["Specials"];
       if (specialsSeason && specialsSeason.episodes) {
         console.log(`[DEBUG - THUMBNAIL] Found ${Object.keys(specialsSeason.episodes).length} episodes in JSON for ${showKey} Specials`);
         console.log(`[DEBUG - THUMBNAIL] JSON episode keys:`, Object.keys(specialsSeason.episodes));
         console.log(`[DEBUG - THUMBNAIL] Processing ${episodes.length} episodes from file system`);
         episodes.forEach((episode) => {
           // Find matching episode in JSON data by episode key
           const episodeKey = Object.keys(specialsSeason.episodes).find(
             (key) => {
               // Try to match by episode key (which should match the filename)
               return key.toLowerCase().includes(episode.filename.toLowerCase()) ||
                      episode.filename.toLowerCase().includes(key.toLowerCase());
             }
           );
           if (episodeKey) {
             const jsonEpisode = specialsSeason.episodes[episodeKey];
             // Merge thumbnail data
             episode.still = jsonEpisode.still;
             episode.thumbnail = jsonEpisode.thumbnail;
             episode.generated = jsonEpisode.generated;
             episode.timestamp = jsonEpisode.timestamp;
             console.log(`[DEBUG - THUMBNAIL] Merged thumbnail for ${episode.filename}: ${jsonEpisode.still}`);
           } else {
             console.log(`[DEBUG - THUMBNAIL] No JSON match found for episode: ${episode.filename}`);
           }
         });
       }
     }
     
     // Sort by episode number (S01E01, S01E02, ...)
     episodes.sort((a, b) => {
       const aMatch = (a.name || a.filename || "").match(/E(\d{1,2})/i);
       const bMatch = (b.name || b.filename || "").match(/E(\d{1,2})/i);
       if (!aMatch && !bMatch) return 0;
       if (!aMatch) return 1;
       if (!bMatch) return -1;
       const aNum = parseInt(aMatch[1], 10);
       const bNum = parseInt(bMatch[1], 10);
       return aNum - bNum;
     });
     
     console.log("[DEBUG - EPISODES] Returning", episodes.length, "episodes");
     return episodes;
    }
    // Handle shows with episodes directly in files array (like Citadel)
    if (show.files && Array.isArray(show.files) && show.files.length > 0) {
      console.log(
        "[DEBUG - EPISODES] Found files array with",
        show.files.length,
        "files"
      );
      // Extract season number from seasonPath (e.g., "Season 01" -> "01", "S01" -> "01")
      const seasonMatch =
        seasonPath.match(/season[ _-]?(\d+)/i) || seasonPath.match(/^s(\d+)/i);
      const seasonNumber = seasonMatch ? seasonMatch[1] : null;
      console.log(
        "[DEBUG - EPISODES] Looking for season number:",
        seasonNumber
      );
      // Filter files to only include episodes from the requested season
      let episodes = show.files
        .filter((file) => {
          const fileName = file.name || file.filename || "";
          const episodeMatch = fileName.match(/S(\d{1,2})E(\d{1,2})/i);
          if (!episodeMatch) return false;
          const fileSeasonNumber = episodeMatch[1];
          console.log(
            "[DEBUG - EPISODES] File",
            fileName,
            "has season number:",
            fileSeasonNumber
          );
          return seasonNumber && fileSeasonNumber === seasonNumber;
        })
        .map((file) => ({
          name: file.name || file.filename,
          filename: file.filename || file.name,
          path: file.relPath,
          relPath: file.relPath,
          filePath: file.filePath,
          absPath: file.absPath,
        }));
      // Sort by episode number (S01E01, S01E02, ...)
      episodes.sort((a, b) => {
        const aMatch = (a.name || a.filename || "").match(/E(\d{1,2})/i);
        const bMatch = (b.name || b.filename || "").match(/E(\d{1,2})/i);
        if (!aMatch && !bMatch) return 0;
        if (!aMatch) return 1;
        if (!bMatch) return -1;
        const aNum = parseInt(aMatch[1], 10);
        const bNum = parseInt(bMatch[1], 10);
        return aNum - bNum;
      });
      console.log(
        "[DEBUG - EPISODES] Returning",
        episodes.length,
        "episodes from files array"
      );
      return episodes;
    }
    // No more old formats - we only use the normalized TV shows format with folders structure
    return [];
  }
  findShowByPath(showPath) {
    if (!showPath) return null;
    const target = (showPath || "").replace(/\\/g, "/").toLowerCase();
    
    // FIRST: Try to find the show directly in unified data using the normalized key
    if (this.unifiedData && Object.keys(this.unifiedData).length > 0) {
      // Extract the show name from the path (e.g., "TV-SHOWS/Lost in Space (2018)" -> "Lost in Space (2018)")
      let showName = target;
      if (target.startsWith("tv-shows/")) {
        showName = target.replace("tv-shows/", "");
      } else if (target.startsWith("tvshows/")) {
        showName = target.replace("tvshows/", "");
      } else if (target.includes("/tv-shows/") || target.includes("/tvshows/")) {
        // Handle absolute paths like "S:/MEDIA/TV-SHOWS/The Boys (2019)"
        const parts = target.split("/");
        const tvShowsIndex = parts.findIndex(part => part.toLowerCase().includes("tv-shows") || part.toLowerCase().includes("tvshows"));
        if (tvShowsIndex !== -1 && tvShowsIndex + 1 < parts.length) {
          showName = parts.slice(tvShowsIndex + 1).join(" ");
        }
      }
      
      // Convert the show name to the normalized key format used in unified data
      let normalizedKey = showName.toLowerCase().trim();
      // Convert spaces and special characters to dots, but preserve year in parentheses
      normalizedKey = normalizedKey.replace(/[^\w\s().]/g, "");
      normalizedKey = normalizedKey.replace(/\s+/g, ".");
      
      // Look for exact match in unified data
      if (this.unifiedData[normalizedKey]) {
        return {
          name: this.unifiedData[normalizedKey].title || this.unifiedData[normalizedKey].TMDBTitle || showName,
          path: `TV-SHOWS/${showName}`,
          normalizedKey: normalizedKey,
          TMDBTitle: this.unifiedData[normalizedKey].TMDBTitle,
          data: this.unifiedData[normalizedKey]
        };
      }
      
      // Try to find a key that starts with our normalized key (handles year in parentheses)
      const availableKeys = Object.keys(this.unifiedData);
      const matchingKey = availableKeys.find(key => 
        key.startsWith(normalizedKey + ".") || key.startsWith(normalizedKey + "(")
      );
      
      if (matchingKey) {
          return {
          name: this.unifiedData[matchingKey].title || this.unifiedData[matchingKey].TMDBTitle || showName,
            path: `TV-SHOWS/${showName}`,
          normalizedKey: matchingKey,
          TMDBTitle: this.unifiedData[matchingKey].TMDBTitle,
          data: this.unifiedData[matchingKey]
        };
      }
      
      // Special case for Jupiter's Legacy
      if (normalizedKey.includes('jupiter') && normalizedKey.includes('legacy')) {
        const jupiterKey = availableKeys.find(key => 
          key.toLowerCase().includes('jupiter') && key.toLowerCase().includes('legacy')
        );
        if (jupiterKey) {
          return {
            name: this.unifiedData[jupiterKey].title || this.unifiedData[jupiterKey].TMDBTitle || showName,
            path: `TV-SHOWS/${showName}`,
            normalizedKey: jupiterKey,
            TMDBTitle: this.unifiedData[jupiterKey].TMDBTitle,
            data: this.unifiedData[jupiterKey]
          };
        }
      }
    }
    
    // FALLBACK: Search through the old TV shows structure (for backward compatibility)
    console.log("[FIND SHOW DEBUG] Falling back to old TV shows search...");
    // 1. Search top-level TV show objects with multiple matching strategies
    const tvShows = this.getTVShows();
    console.log("[FIND SHOW DEBUG] Total TV shows to search:", tvShows.length);
    console.log(
      "[FIND SHOW DEBUG] First 3 TV shows paths:",
      tvShows.slice(0, 3).map((s) => s.path || s.title || s.name)
    );
    for (const show of tvShows) {
      const showObjPath = (show.path || "").replace(/\\/g, "/").toLowerCase();
      const showNormalizedKey = (show.normalizedKey || "").toLowerCase();
      // ---> console.log('[FIND SHOW DEBUG] Comparing target:', target, 'with showObjPath:', showObjPath, 'showNormalizedKey:', showNormalizedKey);
      // Strategy 1: Exact path match
      if (showObjPath === target) {
        console.log("[FIND SHOW DEBUG] Found exact path match:", show);
        return show;
      }
      // Strategy 2: Normalized key match (NEW - this should fix "Man vs. Bee")
      if (showNormalizedKey && showNormalizedKey === target) {
        console.log("[FIND SHOW DEBUG] Found normalized key match:", show);
        return show;
      }
      // Strategy 2: Match without year (e.g., "bored to death" matches "bored to death (2009)")
      const targetWithoutYear = target.replace(/\s*\(\d{4}\)$/, "");
      const showPathWithoutYear = showObjPath.replace(/\s*\(\d{4}\)$/, "");
      if (
        targetWithoutYear === showPathWithoutYear &&
        targetWithoutYear.length > 0
      ) {
        console.log("[FIND SHOW DEBUG] Found year-flexible match:", show);
        return show;
      }
      // Strategy 3: Normalized match (handle special characters)
      const normalize = (str) =>
        str
          .toLowerCase()
          .replace(/[^\w\s]/g, " ") // Replace special chars with spaces
          .replace(/\s+/g, " ") // Normalize spaces
          .replace(/\s*\d{4}\s*$/, "") // Remove year
          .trim();
      const normalizedTarget = normalize(target);
      const normalizedShowPath = normalize(showObjPath);
      if (
        normalizedTarget === normalizedShowPath &&
        normalizedTarget.length > 0
      ) {
        console.log("[FIND SHOW DEBUG] Found normalized match:", show);
        return show;
      }
    }
    // 2. Optionally, search recursively in folders (legacy/edge cases)
    function recursiveSearch(folders) {
      if (!Array.isArray(folders)) return null;
      for (const folder of folders) {
        const folderPath = (folder.path || "")
          .replace(/\\/g, "/")
          .toLowerCase();
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
  getShowKeyFromPath(showPath) {
    if (!showPath) return null;
    // Convert the show path to the normalized key format used in seasonEpisodeImages
    let normalizedKey = showPath.replace(/\\/g, "/").toLowerCase().trim();
    // Remove the year if present (e.g., "LOST (2004)" -> "lost.(2004)")
    normalizedKey = normalizedKey.replace(/\s*\((\d{4})\)/, ".($1)");
    // Convert spaces and special characters to dots
    normalizedKey = normalizedKey.replace(/[^\w\s().]/g, "");
    normalizedKey = normalizedKey.replace(/\s+/g, ".");
    console.log(
      "[DEBUG - EPISODES] Converted showPath to normalized key:",
      showPath,
      "->",
      normalizedKey
    );
    return normalizedKey;
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
      // First, try to get the poster from unified data for special content sections
      if (this.unifiedData) {
        // Check if this is a special content section (Specials, Featurettes, Extras)
        const isSpecialContent = seasonPath.toLowerCase().includes('specials') ||
                                seasonPath.toLowerCase().includes('featurettes') ||
                                seasonPath.toLowerCase().includes('extras');
        
        if (isSpecialContent) {
          console.log("[SEASON IMAGE] This is special content section:", seasonPath);
          console.log("[SEASON IMAGE] Looking for show:", showName);
          console.log("[SEASON IMAGE] Available keys in unified data:", Object.keys(this.unifiedData).filter(key => key.toLowerCase().includes('curb')));
          
          // Find the show in unified data - try exact match first, then fallback
          let showKey = Object.keys(this.unifiedData).find(key => key === showName);
          
          if (!showKey) {
            // Try normalized matching as fallback
            showKey = Object.keys(this.unifiedData).find(key => {
              const normalizedKey = key.toLowerCase();
              const showNameLower = showName.toLowerCase();
              return normalizedKey.includes(showNameLower.replace(/[^a-z0-9]/g, '')) ||
                     showNameLower.includes(normalizedKey.replace(/[^a-z0-9]/g, ''));
            });
          }
          
          console.log("[SEASON IMAGE] Found show key:", showKey);
          
          if (showKey && this.unifiedData[showKey].seasons) {
            console.log("[SEASON IMAGE] Available seasons in show:", Object.keys(this.unifiedData[showKey].seasons));
            
            // Try to find the special content section
            let specialContentKey = null;
            if (seasonPath.toLowerCase().includes('specials') && this.unifiedData[showKey].seasons.Specials) {
              specialContentKey = 'Specials';
            } else if (seasonPath.toLowerCase().includes('featurettes') && this.unifiedData[showKey].seasons.Featurettes) {
              specialContentKey = 'Featurettes';
            } else if (seasonPath.toLowerCase().includes('extras') && this.unifiedData[showKey].seasons.Extras) {
              specialContentKey = 'Extras';
            }
            
            console.log("[SEASON IMAGE] Special content key found:", specialContentKey);
            
            if (specialContentKey && this.unifiedData[showKey].seasons[specialContentKey]) {
              const specialContentData = this.unifiedData[showKey].seasons[specialContentKey];
              console.log("[SEASON IMAGE] Special content data keys:", Object.keys(specialContentData));
              console.log("[SEASON IMAGE] Poster field value:", specialContentData.poster);
              console.log("[SEASON IMAGE] PosterUrl field value:", specialContentData.posterUrl);
              console.log("[SEASON IMAGE] Image field value:", specialContentData.image);
              
              // Check for poster in multiple possible fields
              const poster = specialContentData.poster || specialContentData.posterUrl || specialContentData.image;
              if (poster) {
                console.log("[SEASON IMAGE] Found special content poster for", showName, specialContentKey, ":", poster);
                return poster;
              } else {
                console.log("[SEASON IMAGE] No poster found in any field for", specialContentKey);
              }
            } else {
              console.log("[SEASON IMAGE] Special content section not found:", specialContentKey);
            }
          } else {
            console.log("[SEASON IMAGE] Show or seasons not found in unified data");
          }
        }
      }
      
      // Fallback to the old seasonEpisodeImages logic for numbered seasons
      if (!this.seasonEpisodeImages) {
        return "/assets/img/placeholder-poster.jpg";
      }
      // Use the standardized normalization service
      if (!window.normalizeKey) {
        console.error(
          "[SEASON IMAGE] NormalizationService not loaded - this should not happen!"
        );
        return "/assets/img/placeholder-poster.jpg";
      }
      // Ensure we use the clean show name for lookup, not the full path
      let cleanShowName = showName;
      if (showName && (showName.includes("\\") || showName.includes("/"))) {
        cleanShowName = this.extractShowName(showName);
      }
      // Extract year from cleanShowName if present
      const yearMatch = cleanShowName.match(/\((\d{4})\)/);
      const year = yearMatch ? yearMatch[1] : null;
      // Use the original show name as the key (same as used in loadSeasonEpisodeImages)
      const showKey = cleanShowName;
      console.log("[SEASON IMAGE LOOKUP]", {
        showName,
        cleanShowName,
        showKey,
        year,
      });
      // Extract season number from seasonPath
      const seasonMatch = seasonPath.match(/season[ _-]?(\d+)/i);
      if (!seasonMatch) {
        return "/assets/img/placeholder-poster.jpg";
      }
      const seasonNum = String(parseInt(seasonMatch[1], 10));
      // Look up using the original show name key
      const showData = this.seasonEpisodeImages[showKey];
      if (showData && showData.seasons && showData.seasons[seasonNum]) {
        const seasonData = showData.seasons[seasonNum];
        if (seasonData.poster) {
          console.log(
            "[SEASON IMAGE] Found poster for",
            showName,
            "season",
            seasonNum,
            "using key:",
            showKey
          );
          return seasonData.poster;
        }
      }
      console.warn(
        "[SEASON IMAGE] No poster found for",
        showName,
        "season",
        seasonNum,
        "using key:",
        showKey
      );
      return "/assets/img/placeholder-poster.jpg";
    } catch (error) {
      console.error("[SEASON IMAGE ERROR]", error);
      return "/assets/img/placeholder-poster.jpg";
    }
  }
  getEpisodeImage(showName, seasonName, episode) {
    try {
      if (!this.seasonEpisodeImages) {
        console.warn("[EPISODE IMAGE] seasonEpisodeImages not loaded");
        return "/assets/img/placeholder-poster.jpg";
      }
      // Use the standardized normalization service
      if (!window.normalizeKey) {
        console.error(
          "[EPISODE IMAGE] NormalizationService not loaded - this should not happen!"
        );
        return "/assets/img/placeholder-poster.jpg";
      }
      // Ensure we use the clean show name for lookup, not the full path
      let cleanShowName = showName;
      if (showName && (showName.includes("\\") || showName.includes("/"))) {
        cleanShowName = this.extractShowName(showName);
      }
      // Extract year from cleanShowName if present
      const yearMatch = cleanShowName.match(/\((\d{4})\)/);
      const year = yearMatch ? yearMatch[1] : null;
      // Create standardized key - use normalizeKey for JSON files (no tvshows prefix)
      const showKey = window.normalizeKey(cleanShowName);
      // Normalize season number (handle both 'Season 01' and 1)
      let seasonNum = null;
      if (typeof seasonName === "string") {
        const match = seasonName.match(/season[ _-]?(\d+)/i);
        if (match) seasonNum = String(parseInt(match[1], 10));
      } else if (typeof seasonName === "number") {
        seasonNum = String(seasonName);
      }
      // Try to get episode number from episode object
      let episodeNum = null;
      if (episode) {
        if (typeof episode.episodeNumber !== "undefined") {
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
      if (cleanShowName && cleanShowName.toLowerCase().includes("citadel")) {
        // console.log('[EPISODE IMAGE DEBUG] Citadel detected!');
        // console.log('[EPISODE IMAGE DEBUG] showName:', showName);
        // console.log('[EPISODE IMAGE DEBUG] cleanShowName:', cleanShowName);
        // console.log('[EPISODE IMAGE DEBUG] showKey:', showKey);
        // console.log('[EPISODE IMAGE DEBUG] seasonNum:', seasonNum);
        // console.log('[EPISODE IMAGE DEBUG] episodeNum:', episodeNum);
        // console.log('[EPISODE IMAGE DEBUG] Has showData:', !!this.seasonEpisodeImages[showKey]);
        if (this.seasonEpisodeImages[showKey]) {
          console.log(
            "[EPISODE IMAGE DEBUG] ShowData seasons:",
            Object.keys(this.seasonEpisodeImages[showKey].seasons || {})
          );
        }
      }
      // Lookup
      const showData = this.seasonEpisodeImages[showKey];
      if (!showData) {
        console.warn("[EPISODE IMAGE] No showData for", showKey);
        console.warn(
          "[EPISODE IMAGE] Available keys:",
          Object.keys(this.seasonEpisodeImages)
        );
        return "/assets/img/placeholder-poster.jpg";
      }
      const seasonData = showData.seasons && showData.seasons[seasonNum];
      if (!seasonData) {
        console.warn("[EPISODE IMAGE] No seasonData for", showKey, seasonNum);
        return "/assets/img/placeholder-poster.jpg";
      }
      if (!seasonData.episodes) {
        console.warn("[EPISODE IMAGE] No episodes for", showKey, seasonNum);
        return "/assets/img/placeholder-poster.jpg";
      }
      const epData = seasonData.episodes[episodeNum];
      if (!epData || !epData.still) {
        console.warn(
          "[EPISODE IMAGE] No still for",
          showKey,
          seasonNum,
          episodeNum
        );
        return "/assets/img/placeholder-poster.jpg";
      }
      // If the still path starts with /media/, convert to /assets/ if needed
      let stillPath = epData.still;
      if (stillPath.startsWith("/media/TV-SHOWS/")) {
        // Try to map to /assets/img/ if the file exists there
        const localPath = stillPath.replace("/media/TV-SHOWS/", "/assets/img/");
        // Optionally, check if the file exists (requires async or pre-scan)
        // For now, just use the mapped path
        stillPath = localPath;
      }
      // console.log('[EPISODE IMAGE] Found still:', stillPath);
      return stillPath;
    } catch (error) {
      console.error("[EPISODE IMAGE ERROR]", error);
      return "/assets/img/placeholder-poster.jpg";
    }
  }
  // --- TV SHOW UI METHODS ---
  async loadTVShowDetails(showObjOrName) {
    // Accepts either a show object or a show name
    let showName =
      typeof showObjOrName === "string"
        ? showObjOrName
        : showObjOrName?.name ||
          showObjOrName?.title ||
          showObjOrName?.path ||
          "";
    let showPath =
      typeof showObjOrName === "object" ? showObjOrName.path || "" : "";
    // Use unified data instead of separate JSON files
    if (!this.unifiedData) {
      await this.loadSeasonEpisodeImages();
    }
    
    // Use the standardized normalization service
    if (!window.normalizeKey) {
      console.error(
        "[TV SHOW DETAILS] NormalizationService not loaded - this should not happen!"
      );
      return { description: "", cast: [] };
    }
    
    // Create standardized key for lookup
    let showKey = window.normalizeKey(showName);
    
    // Debug: Log what we're looking for and what's available
    console.log("[TV SHOW DETAILS DEBUG] Looking for show:", showName);
    console.log("[TV SHOW DETAILS DEBUG] Normalized key:", showKey);
    
    // Direct lookup in unified data
    let description = "";
    let cast = [];
    
    // First try exact key match
    if (this.unifiedData[showKey]) {
      const show = this.unifiedData[showKey];
      // Handle different possible description locations (check both old and new structure)
      description = show.description || show.about?.description || "";
      cast = show.cast || [];
    } else {
      // Try to find a matching key by searching through all keys
      const allKeys = Object.keys(this.unifiedData);
      console.log("[TV SHOW DETAILS DEBUG] Available keys in unified data:", allKeys.slice(0, 10), "...");
      
      const matchingKey = allKeys.find(key => {
        // Check if this key represents a TV show (not a movie)
        const item = this.unifiedData[key];
        if (!item || item.isMovie) return false;
        
        // Try different matching strategies
        const normalizedKey = window.normalizeKey(key);
        const normalizedShowName = window.normalizeKey(showName);
        
        // Strategy 1: Exact normalized key match
        if (normalizedKey === normalizedShowName) {
          console.log("[TV SHOW DETAILS] Strategy 1 match:", key);
          return true;
        }
        
        // Strategy 2: Key contains the show name (for partial matches)
        if (key.toLowerCase().includes(showName.toLowerCase())) {
          console.log("[TV SHOW DETAILS] Strategy 2 match:", key);
          return true;
        }
        
        // Strategy 3: Show name contains the key (for partial matches)
        if (showName.toLowerCase().includes(key.toLowerCase())) {
          console.log("[TV SHOW DETAILS] Strategy 3 match:", key);
          return true;
        }
        
        // Strategy 4: Try matching without periods (common issue)
        const keyWithoutPeriods = key.replace(/\./g, '');
        const showNameWithoutPeriods = showName.replace(/\./g, '');
        if (keyWithoutPeriods.toLowerCase() === showNameWithoutPeriods.toLowerCase()) {
          console.log("[TV SHOW DETAILS] Strategy 4 match (no periods):", key);
          return true;
        }
        
        // Strategy 5: Special case for Jupiter's Legacy
        if (showName.toLowerCase().includes('jupiter') && showName.toLowerCase().includes('legacy')) {
          if (key.toLowerCase().includes('jupiter') && key.toLowerCase().includes('legacy')) {
            console.log("[TV SHOW DETAILS] Strategy 5 match (Jupiter's Legacy):", key);
            return true;
          }
        }
        
        return false;
      });
      
      if (matchingKey) {
        const show = this.unifiedData[matchingKey];
        // Handle different possible description locations (check both old and new structure)
        description = show.description || show.about?.description || "";
        cast = show.cast || [];
        console.log("[TV SHOW DETAILS] Found match with key:", matchingKey);
        console.log("[TV SHOW DETAILS DEBUG] Show object keys:", Object.keys(show));
        console.log("[TV SHOW DETAILS DEBUG] Description value:", show.description);
        console.log("[TV SHOW DETAILS DEBUG] Cast value:", show.cast);
        console.log("[TV SHOW DETAILS DEBUG] About description value:", show.about?.description);
      } else {
        console.warn("[TV SHOW DETAILS] No match found for:", showName, "with key:", showKey);
      }
    }
    
    return {
      description,
      cast,
    };
  }
  async renderSeasonsView(showPath) {
    console.log(
      "[DEBUG - RENDER-SEASONS-VIEW] renderSeasonsView called with showPath:",
      showPath
    );
    // CRITICAL: Set the current TV show state for navigation
    this.currentTVShow = showPath;
    console.log(
      "[DEBUG - RENDER-SEASONS-VIEW] Set currentTVShow to:",
      this.currentTVShow
    );
    // Update modal content class to hide A-Z sidebar for TV show seasons
    const modalContent = document.querySelector(".media-library-modal-content");
    if (modalContent) {
      modalContent.classList.remove(
        "movies",
        "tvshows",
        "favorites",
        "collections",
        "suggestions",
        "watchlater",
        "moviedetails",
        "tvshowepisodes"
      );
      modalContent.classList.add("tvshowseason");
    }
    // Use centralized data loading method to ensure ALL necessary data is available
    await this.ensureTVShowDataLoaded();
    // Handle both show names and paths for showPath
    let show = this.findShowByPath(showPath);
    let showName = showPath;
    // If showPath is a path, extract the show name
    if (showPath && showPath.includes("\\")) {
      showName = this.extractShowName(showPath);
    }
    // If we couldn't find the show by path, try to find it by title
    if (!show && this.tvShowsData) {
      show = this.tvShowsData.find(
        (tvShow) => tvShow.title === showPath || tvShow.name === showPath
      );
      // If we found the show by title, use the title as the show name
      if (show && show.title) {
        showName = show.title;
      }
    }
    console.log(
      "[DEBUG - RenderSeasonsView] renderSeasonsView for showPath:",
      showPath
    );
    console.log("[DEBUG - RenderSeasonsView] renderSeasonsView show:", show);
    console.log("[DEBUG - RenderSeasonsView] typeof show:", typeof show);
    if (show) {
      console.log(
        "[DEBUG - RenderSeasonsView] Object.keys(show):",
        Object.keys(show)
      );
      if (show.data) {
        console.log("[DEBUG - RenderSeasonsView] show.data:", show.data);
        if (show.data.name) {
          console.log(
            "[DEBUG - RenderSeasonsView] show.data.name:",
            show.data.name
          );
        }
      }
    }
    // Load description and cast
    // Ensure we use the clean show name for lookup, not the full path
    let cleanShowName = showName;
    if (showName && (showName.includes("\\") || showName.includes("/"))) {
      cleanShowName = this.extractShowName(showName);
    }
    
    // Always humanize the show name for display
    let displayShowName = this.humanizeTVShowTitle(cleanShowName);
    // Call getSeasonsForShow with the full showPath so it can find the show in TV shows data
    const seasons = this.getSeasonsForShow(showPath);
    console.log(
      "[DEBUG - RenderSeasonsView] renderSeasonsView seasons:",
      seasons
    );
    console.log(
      "[DEBUG - RENDER SEASONS] About to load TV show details for cleanShowName:",
      cleanShowName
    );
    // Try to get description and cast from unified data first
    let description = "";
    let cast = [];
    
    if (this.unifiedData && cleanShowName) {
      // Convert showName to normalized key format
      let normalizedKey = cleanShowName.toLowerCase().trim();
      // Replace & with and before removing special characters
      normalizedKey = normalizedKey.replace(/&/g, "and");
      normalizedKey = normalizedKey.replace(/[^\w\s().]/g, "");
      normalizedKey = normalizedKey.replace(/\s+/g, ".");
      normalizedKey = normalizedKey.replace(/\.{2,}/g, ".");
      normalizedKey = normalizedKey.replace(/^\.+|\.+$/g, "");
      
      // Try to find the show in unified data
      let showKey = Object.keys(this.unifiedData).find(key => key === normalizedKey);
      if (!showKey) {
        showKey = Object.keys(this.unifiedData).find(key => 
          key.startsWith(normalizedKey + ".") || key.startsWith(normalizedKey + "(")
        );
      }
      
      if (showKey && this.unifiedData[showKey]) {
        description = this.unifiedData[showKey].description || "";
        cast = (this.unifiedData[showKey].cast || []).map(actor => ({
          name: actor.name,
          character: actor.character,
          profile_path: actor.profile_path
        }));
        console.log("[DEBUG - RENDER SEASONS] Found data in unified data for:", showKey);
      }
    }
    
    // Fallback to loadTVShowDetails if not found in unified data
    if (!description && !cast.length) {
      let result = await this.loadTVShowDetails(cleanShowName);
      description = result.description || "";
      cast = result.cast || [];
    }
    
    console.log(
      "[DEBUG - RENDER SEASONS] Loaded description length:",
      description ? description.length : 0
    );
    console.log(
      "[DEBUG - RENDER SEASONS] Loaded cast length:",
      cast ? cast.length : 0
    );
    console.log(
      "[DEBUG - RENDER SEASONS] Description preview:",
      description ? description.substring(0, 100) + "..." : "empty"
    );
    console.log(
      "[DEBUG - RENDER SEASONS] Cast preview:",
      cast ? cast.slice(0, 2).map((c) => c.name || c) : "empty"
    );
    // --- DUMMY PLACEHOLDER CONTENT IF MISSING ---
    if (
      !description ||
      description.trim() === "" ||
      description.includes("No description")
    ) {
      description =
        "A quirky group of friends navigate life's ups and downs in this hilarious and heartwarming TV show. Will they find love, solve mysteries, or just order more pizza? Tune in to find out!";
    }
    if (!Array.isArray(cast) || cast.length === 0) {
      cast = [
        { name: "Jane Doe", image: "/assets/img/placeholder-poster.jpg" },
        { name: "John Smith", image: "/assets/img/placeholder-poster.jpg" },
        { name: "Alex Lee", image: "/assets/img/placeholder-poster.jpg" },
        { name: "Sam Taylor", image: "/assets/img/placeholder-poster.jpg" },
        { name: "Chris Jordan", image: "/assets/img/placeholder-poster.jpg" },
      ];
    }
    // --- NEW FLEX LAYOUT ---
    // Description to the right of title/season count
    // Cast as a horizontal row under the season images
    let castRow = "";
    if (Array.isArray(cast) && cast.length > 0) {
      castRow = `<div class=\"media-library-cast-horizontal-row\">${cast
        .map(
          (actor) => `
                <div class=\"media-library-cast-card\">
                    <div class=\"media-library-cast-avatar\" style=\"background-image:url('${actor.profile_path ? `https://image.tmdb.org/t/p/w500${actor.profile_path}` : "/assets/img/placeholder-poster.jpg"}');\"></div>
                    <div class=\"media-library-cast-name\">${actor.name || actor}</div>
                </div>
            `
        )
        .join("")}</div>`;
    } else if (typeof cast === "string" && cast) {
      castRow = `<div class=\"media-library-cast-horizontal-row\"><div class=\"media-library-cast-card\">${cast}</div></div>`;
    }
    // --- ARROW NAVIGATION ---
    // Unique class for grid and wrapper
    const gridClass = "media-library-seasons-grid";
    const wrapperClass = "media-library-seasons-arrows-wrapper";
    // Only show arrows if more than 5 seasons (adjust as needed)
    const showArrows = seasons.length > 5;
    // --- RENDER HTML ---
    const html = `
            <div class="media-library-breadcrumbs">
                <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV-Shows</span>
                <span class="breadcrumb-separator"> > </span>
                <span>${displayShowName.replace(/^TV-SHOWS\//, "")}</span>
            </div>
            <hr class="media-library-tvshows-hr">
            <div class="media-library-seasons-main-col">
                <div class="media-library-seasons-header-row">
                                    <div class="media-library-seasons-title">
                    <h2 class="${displayShowName.toLowerCase().includes("lois & clark") || displayShowName.toLowerCase().includes("lois and clark") ? "media-library-tvshow-title-lois-clark" : "media-library-tvshow-title"}">${displayShowName}</h2>
                    <p>${seasons.length} ${seasons.length === 1 ? "Season" : "Seasons"}</p>
                </div>
                    <div class="media-library-seasons-description">${description}</div>
                </div>
                <div class="${wrapperClass}">
                    ${showArrows ? `<button class="media-library-arrow-btn left" type="button">&#8592;</button>` : ""}
                    <div class="${gridClass}">
                        ${seasons
                          .map((season) => {
                            // Use TMDB poster from seasons data structure first
                            let seasonImage = season.poster || season.season_poster || season.image || '/assets/img/placeholder-poster.jpg';
                            console.log(`[DEBUG - SEASON] Season: ${season.path}, TMDB Poster: ${seasonImage}`);
                            
                            // If no TMDB poster, try to get the main TV show poster as fallback
                            if (
                              !seasonImage ||
                              seasonImage ===
                                "/assets/img/placeholder-poster.jpg"
                            ) {
                              console.log(
                                "[DEBUG - SEASON] No TMDB poster found, trying TV show poster fallback for:",
                                cleanShowName
                              );
                              const tvShowPoster = this.getPosterPath({
                                title: cleanShowName,
                                type: "tvshow",
                                path: showPath,
                              });
                              if (
                                tvShowPoster &&
                                tvShowPoster !==
                                  "/assets/img/placeholder-poster.jpg"
                              ) {
                                seasonImage = tvShowPoster;
                              }
                            }
                            const episodeCount = season.episodeCount || (season.episodes
                              ? Object.keys(season.episodes).length
                              : 0);
                            // Determine display text and CSS class for specials
                            let displayText = season.path;
                            let cssClass = "season";
                            if (season.isSpecials) {
                              displayText =
                                season.specialsCategory || "Specials";
                              cssClass = "season specials";
                            }
                            return `
                                <div class=\"media-library-card ${cssClass}\" onclick=\"mediaLibraryManager.openTVSeason('${season.path.replace(/\\/g, "/")}')\">
                                    <div class=\"media-library-card-poster\">
                                        <img class=\"media-library-poster season\" src=\"${seasonImage}\" alt=\"${displayText}\" onerror=\"this.src='/assets/img/placeholder-poster.jpg'\">
                                    </div>
                                    <div class=\"media-library-card-info\">
                                        <h3>${displayText}</h3>
                                        <p>${episodeCount} Episode${episodeCount === 1 ? "" : "s"}</p>
                                    </div>
                                </div>
                            `;
                          })
                          .join("")}
                    </div>
                    ${showArrows ? `<button class=\"media-library-arrow-btn right\" type=\"button\">&#8594;</button>` : ""}
                </div>
                ${castRow}
            </div>
        `;
    // After rendering, attach arrow handlers
    setTimeout(() => {
      this.attachSeasonArrowHandlers();
    }, 0);
    return html;
  }
  openTVShowFromData(element) {
    const showPath = element.getAttribute("data-path");
    const showName = element.getAttribute("data-show-name");
    // For Media Manager entries, use the show name instead of full path for breadcrumb
    if (showName && showPath && showPath.includes("\\MEDIA\\TV-SHOWS\\")) {
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
    console.log("[DEBUG - OpenTVShow] openTVShow called with:", showPath);
    console.log(
      "[DEBUG - OpenTVShow] Current currentTVShow before setting:",
      this.currentTVShow
    );
    // Only set currentTVShow if it's different or if it doesn't have the tvshows/ prefix
    if (!this.currentTVShow || !this.currentTVShow.startsWith("tvshows/")) {
      this.currentTVShow = showPath;
      console.log(
        "[DEBUG - OpenTVShow] Set currentTVShow to:",
        this.currentTVShow
      );
    } else {
      console.log(
        "[DEBUG - OpenTVShow] Preserved existing currentTVShow:",
        this.currentTVShow
      );
    }
    this.currentTVSeason = null;
    this.renderModal(); // Re-render modal to update tab highlight
  }
  openTVSeason(seasonPath) {
    this.currentTVSeason = seasonPath;
    console.log("[DEBUG - SEASON] Opening season:", seasonPath);
    
    // Render the episodes view for this season
    const episodesContent = this.renderEpisodesView();
    
    // Update the modal content to show episodes
    const modalContent = document.querySelector('.collection-modal-content');
    if (modalContent) {
      modalContent.innerHTML = episodesContent;
      console.log("[DEBUG - SEASON] Episodes view rendered successfully");
    } else {
      console.error("[DEBUG - SEASON] Could not find modal content element");
    }
    
    // Re-render modal to update tab highlight
    this.renderModal();
  }
  renderEpisodesView() {
    // Don't update modal content class here - let the caller handle it
    // This method should just return the HTML content
    try {
      // Handle both show names and paths for currentTVShow
      let show = this.findShowByPath(this.currentTVShow);
      let showName = this.currentTVShow;
      // If currentTVShow is a path, extract the show name
      if (this.currentTVShow && this.currentTVShow.includes("\\")) {
        showName = this.extractShowName(this.currentTVShow);
      }
      // If we couldn't find the show by path, try to find it by title
      if (!show && this.tvShowsData) {
        show = this.tvShowsData.find(
          (tvShow) =>
            tvShow.title === this.currentTVShow ||
            tvShow.name === this.currentTVShow
        );
      }
      // Safety check for currentTVSeason
      if (!this.currentTVSeason) {
        console.error("[RENDER EPISODES] currentTVSeason is null or undefined");
        return '<div style="color:red;">[ERROR] Season information is missing. Please try navigating again.</div>';
      }
      // Debug logging for currentTVShow
      if (!this.currentTVShow) {
        console.warn(
          "[RENDER EPISODES] currentTVShow is null or undefined, but continuing"
        );
      }
      const seasonName = this.currentTVSeason.split(/[\/]/).pop();
      // Get episodes from the new seasons structure first
      let episodes = [];
      if (show && show.seasons) {
        const seasonNumber = this.currentTVSeason.split(/[\/]/).pop();
        // Extract the numeric part and convert to integer to remove leading zeros
        const seasonMatch = seasonNumber.match(/season[ _-]?(\d+)/i);
        const normalizedSeasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10).toString() : seasonNumber;
        console.log("[DEBUG - SEASONS] Original season:", seasonNumber);
        console.log("[DEBUG - SEASONS] Normalized season:", normalizedSeasonNumber);
        console.log("[DEBUG - SEASONS] Available seasons:", Object.keys(show.seasons));
        
        if (show.seasons[normalizedSeasonNumber] && show.seasons[normalizedSeasonNumber].episodes) {
          // Convert episodes object to array format
          const episodesObj = show.seasons[normalizedSeasonNumber].episodes;
          console.log("[DEBUG - SEASONS] Episodes object from unified JSON:", episodesObj);
          episodes = Object.values(episodesObj).map(episode => {
            const mappedEpisode = {
              ...episode,
              // Ensure we have the right properties for rendering
              name: episode.title || episode.name,
              filename: episode.title || episode.name
            };
            console.log("[DEBUG - SEASONS] Mapped episode from unified JSON:", mappedEpisode);
            return mappedEpisode;
          });
          
          // FIXED: Sort episodes by episode number (numerically, not alphabetically)
          // Handle both string keys and episode properties
          episodes.sort((a, b) => {
            // Try to get episode number from various sources
            let aEpisode = parseInt(a.episode) || parseInt(a.episodeNumber) || 1;
            let bEpisode = parseInt(b.episode) || parseInt(b.episodeNumber) || 1;
            
            // If we can't find episode numbers, try to extract from title or other properties
            if (aEpisode === 1 && bEpisode === 1) {
              // Try to extract from title if it contains episode info
              const aTitleMatch = a.title?.match(/S\d+E(\d+)/i) || a.name?.match(/S\d+E(\d+)/i);
              const bTitleMatch = b.title?.match(/S\d+E(\d+)/i) || b.name?.match(/S\d+E(\d+)/i);
              
              if (aTitleMatch) aEpisode = parseInt(aTitleMatch[1]);
              if (bTitleMatch) bEpisode = parseInt(bTitleMatch[1]);
            }
            
            return aEpisode - bEpisode;
          });
          
          console.log("[DEBUG - SEASONS] Found episodes in new structure:", episodes.length);
          console.log("[DEBUG - SEASONS] Episodes sorted by episode number:", episodes.map(e => `E${e.episode || e.episodeNumber || '?'}`).join(', '));
        }
      }
      
      // Fallback to old method if no episodes found
      if (episodes.length === 0) {
        episodes = this.getEpisodesForSeason(show, this.currentTVSeason) || [];
        console.log("[DEBUG] Episodes from getEpisodesForSeason fallback:", episodes.length);
      }
      
      console.log("[DEBUG] showName for episode images:", showName);
      console.log("[DEBUG] currentTVShow:", this.currentTVShow);
      console.log("[DEBUG] currentTVSeason:", this.currentTVSeason);
      console.log("[DEBUG] Final episodes array:", episodes);
      
      // If no episodes found, let's debug what's happening
      if (episodes.length === 0) {
        console.log("[DEBUG] No episodes found! Debugging...");
        console.log("[DEBUG] show object:", show);
        console.log("[DEBUG] currentTVShow:", this.currentTVShow);
        console.log("[DEBUG] currentTVSeason:", this.currentTVSeason);
        // Try to find episodes directly in the TV shows data
        if (this.tvShowsData) {
          // Handle both array and object formats for tvShowsData
          let tvShowsArray = [];
          if (Array.isArray(this.tvShowsData)) {
            tvShowsArray = this.tvShowsData;
          } else if (typeof this.tvShowsData === "object" && this.tvShowsData) {
            tvShowsArray = Object.values(this.tvShowsData);
          }
          for (const tvShow of tvShowsArray) {
            console.log("[DEBUG] Checking TV show:", tvShow.path);
            if (
              tvShow.path === this.currentTVShow ||
              tvShow.normalizedKey === this.currentTVShow
            ) {
              console.log("[DEBUG] Found matching TV show:", tvShow.name);
              if (tvShow.folders) {
                for (const folder of tvShow.folders) {
                  console.log("[DEBUG] Checking folder:", folder.path);
                  if (folder.path === this.currentTVSeason) {
                    console.log(
                      "[DEBUG] Found matching season folder:",
                      folder.name
                    );
                    if (folder.files) {
                      console.log(
                        "[DEBUG] Found",
                        folder.files.length,
                        "files in season"
                      );
                      console.log("[DEBUG - EPISODE CREATION] Folder files:", folder.files);
                      episodes = folder.files.map((file) => {
                        const episode = {
                        name: file.name || file.filename,
                        filename: file.filename || file.name,
                        path: file.relPath,
                        relPath: file.relPath,
                        filePath: file.filePath,
                        absPath: file.absPath,
                        };
                        console.log("[DEBUG - EPISODE CREATION] Created episode:", episode);
                        return episode;
                      });
                      console.log(
                        "[DEBUG] Created episodes from folder files:",
                        episodes.length
                      );
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
      // Debug logging for episodes
      if (!episodes || episodes.length === 0) {
        console.warn(
          "[RENDER EPISODES] No episodes found, but continuing to render empty page"
        );
      }
      // Only show arrows if more than 4 episodes
      const showArrows = episodes.length > 4;
      const gridClass =
        "media-library-episodes-grid" +
        (episodes.length < 6 ? " center-episodes" : "");
      const wrapperClass = "media-library-episodes-arrows-wrapper";
      // Attach handlers after render
      setTimeout(() => this.attachEpisodeArrowHandlers(), 0);
      return `
                <div class="media-library-breadcrumbs">
                    <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV-Shows</span>
                    <span class="breadcrumb-separator"> > </span>
                    <span class="breadcrumb-link" onclick="mediaLibraryManager.backToSeasons()">${this.humanizeTVShowTitle(showName.replace(/^TV-SHOWS\//, ""))}</span>
                </div>
                <div class="media-library-season-info">
                    <h2>${seasonName}</h2>
                    <p>${episodes.length} ${this.getContentTypeLabel(seasonName, episodes)}</p>
                </div>
                <div class="${wrapperClass}">
                    ${showArrows ? `<button class=\"media-library-arrow-episode-btn left\" type=\"button\">&#8592;</button>` : ""}
                    <div class="episode-carousel-container">
                        <div class="${gridClass}">
                            ${episodes
                              .map((episode, index) => {
                                console.log(`[DEBUG - EPISODE RENDER] Original episode ${index}:`, episode);
                                
                                // Use episode image from still property if available, otherwise fallback to getEpisodeImage
                                const episodeImage =
                                  episode.still ||
                                  this.getEpisodeImage(
                                    showName,
                                    seasonName,
                                    episode
                                  );
                                
                                // Create a new episode object with all necessary properties properly set
                                const episodeForSerialization = {
                                  ...episode,
                                  // Ensure filePath, path, and relPath are set from absPath
                                  filePath: episode.absPath || episode.filePath || episode.path || episode.relPath || "",
                                  path: episode.absPath || episode.path || "",
                                  relPath: episode.absPath || episode.relPath || ""
                                };
                                
                                console.log(`[DEBUG - EPISODE] Episode ${index}:`, {
                                  original: { absPath: episode.absPath, filePath: episode.filePath, path: episode.path, relPath: episode.relPath },
                                  prepared: { filePath: episodeForSerialization.filePath, path: episodeForSerialization.path, relPath: episodeForSerialization.relPath }
                                });
                                
                                const episodeData = JSON.stringify(episodeForSerialization)
                                  .replace(/"/g, "&quot;")
                                  .replace(/\n/g, "\\n")
                                  .replace(/\r/g, "\\r");
                                const epNum = episode.episodeNumber
                                  ? `E${episode.episodeNumber.toString().padStart(2, "0")}`
                                  : (() => {
                                      const match = (
                                        episode.name ||
                                        episode.filename ||
                                        episode.path ||
                                        ""
                                      ).match(/E(\d{1,2})/i);
                                      return match
                                        ? `E${match[1].padStart(2, "0")}`
                                        : "";
                                    })();
                                // Use the episode title from the new data structure
                                let epTitle = episode.title || episode.name || "Unknown Episode";
                                
                                // If no title, try to extract from filename as fallback
                                if (!epTitle || epTitle === "Unknown Episode") {
                                if (
                                  episode.filename &&
                                  episode.filename.includes("\\")
                                ) {
                                  // This is a full path, extract just the filename
                                  const filename =
                                    episode.filename.split(/[\\/]/).pop() || "";
                                  epTitle = this.extractEpisodeTitle(filename);
                                } else {
                                  // This is already just a filename
                                  epTitle = this.extractEpisodeTitle(
                                    episode.name ||
                                      episode.filename ||
                                      episode.path ||
                                      ""
                                  );
                                  }
                                }
                                // All episodes are real video files - show as clickable
                                return (
                                  `<div class=\"media-library-card episode\" data-episode=\"${episodeData}\" onclick=\"mediaLibraryManager.playEpisodeFromCard(this)\">` +
                                  `<div class=\"media-library-card-poster\">` +
                                  `<img src=\"${episodeImage}\" alt=\"${episode.name || episode.filename}\" onerror=\"this.src='/assets/img/placeholder-poster.jpg'\">` +
                                  `<div class=\"media-library-play-overlay\">▶</div>` +
                                  `</div>` +
                                  `<div class=\"media-library-card-info\">` +
                                  `<h4 class=\"tvshow-season-episode-name\">${epTitle}</h4>` +
                                  `</div>` +
                                  `</div>`
                                );
                              })
                              .join("")}
                        </div>
                        <div class="episode-carousel-gradient-left"></div>
                        <div class="episode-carousel-gradient-right"></div>
                    </div>
                    ${showArrows ? `<button class=\"media-library-arrow-episode-btn right\" type=\"button\">&#8594;</button>` : ""}
                </div>
            `;
    } catch (e) {
      return `<div style=\"color:red;\">[ERROR] Failed to render episodes: ${e.message}</div>`;
    }
  }
  backToTVShows() {
    this.currentTVShow = null;
    this.currentTVSeason = null;
    this.currentTab = "tvshows"; // Track current tab for return location
    // Restore modal content class to tvshows tab
    const modalContent = document.querySelector(".media-library-modal-content");
    if (modalContent) {
      modalContent.classList.remove(
        "moviedetails",
        "tvshowseason",
        "tvshowepisodes"
      );
      modalContent.classList.add("tvshows");
    }
    this.renderModal(); // Re-render modal to update tab highlight
    // Update count after navigating back to main TV-Shows page
    setTimeout(() => this.updateCount(), 0);
  }
  backToSeasons() {
    this.currentTVSeason = null;
    // Restore modal content class to tvshowseason
    const modalContent = document.querySelector(".media-library-modal-content");
    if (modalContent) {
      modalContent.classList.remove("moviedetails", "tvshowepisodes");
      modalContent.classList.add("tvshowseason");
    }
    this.renderModal(); // Re-render modal to update tab highlight
  }
  // SINGLE SOURCE OF TRUTH for ALL TV show episode playing
  async playTVShowEpisode(
    episodePath,
    startTime = 0,
    sourceContext = "unknown"
  ) {
    console.log("[DEBUG - SINGLE-SOURCE-TV] playTVShowEpisode called");
    console.log("[DEBUG - SINGLE-SOURCE-TV] episodePath:", episodePath);
    console.log("[DEBUG - SINGLE-SOURCE-TV] startTime:", startTime);
    console.log("[DEBUG - SINGLE-SOURCE-TV] sourceContext:", sourceContext);
    // STEP 1: Find the episode object using centralized function
    const episodeObj = this.findEpisodeObjectByPath(episodePath);
    console.log(
      "[DEBUG - SINGLE-SOURCE-TV] Episode object found:",
      episodeObj ? "YES" : "NO"
    );
    // STEP 2: Process episode object (add year, clean title, etc.)
    if (episodeObj) {
      console.log("[DEBUG - SINGLE-SOURCE-TV] Processing episode object");
      console.log("[DEBUG - SINGLE-SOURCE-TV] - name:", episodeObj.name);
      console.log(
        "[DEBUG - SINGLE-SOURCE-TV] - filename:",
        episodeObj.filename
      );
      console.log("[DEBUG - SINGLE-SOURCE-TV] - absPath:", episodeObj.absPath);
      console.log("[DEBUG - SINGLE-SOURCE-TV] - relPath:", episodeObj.relPath);
      console.log(
        "[DEBUG - SINGLE-SOURCE-TV] - filePath:",
        episodeObj.filePath
      );
      // Add year information to the episode object
      const year = this.getDateForTvShow(episodeObj);
      if (year) {
        console.log(
          "[DEBUG - SINGLE-SOURCE-TV] Adding year to episode object:",
          year
        );
        // Add year to episode object
        episodeObj.year = year;
        episodeObj.data = episodeObj.data || {};
        episodeObj.data.year = year;
        // Add year to title for VideoPlayer to display
        if (episodeObj.title && !episodeObj.title.includes(`(${year})`)) {
          episodeObj.title = episodeObj.title.replace(
            /^([^(]+)/,
            `$1 (${year})`
          );
          console.log(
            "[DEBUG - SINGLE-SOURCE-TV] Updated title with year:",
            episodeObj.title
          );
        }
        console.log(
          "[DEBUG - SINGLE-SOURCE-TV] Added year to episode object and title"
        );
      } else {
        console.log("[DEBUG - SINGLE-SOURCE-TV] No year found for episode");
      }
      // FORCE: Set correct type field for TV show episodes
      episodeObj.type = "tvshow";
      episodeObj.mediaType = "tvshow";
      
      // Set global current media item
      // FORCE: Set correct type field for TV show episodes
      episodeObj.type = "tvshow";
      episodeObj.mediaType = "tvshow";
      
      window.mediaLibraryManager.currentMediaItem = episodeObj;
      window.mediaLibraryManager.currentFile = episodeObj;
      console.log("[DEBUG - TV-SHOW] Set currentMediaItem with type:", episodeObj.type);
      console.log("[DEBUG - SINGLE-SOURCE-TV] Set currentMediaItem with type:", episodeObj.type);
    } else {
      console.log(
        "[DEBUG - SINGLE-SOURCE-TV] No episode object found, using basic path object"
      );
      // FORCE: Set correct type field for TV show episodes (fallback case)
      const fallbackEpisodeObj = { 
        path: episodePath,
        type: "tvshow",
        mediaType: "tvshow"
      };
      window.mediaLibraryManager.currentMediaItem = fallbackEpisodeObj;
      window.mediaLibraryManager.currentFile = fallbackEpisodeObj;
      console.log("[DEBUG - SINGLE-SOURCE-TV] Set fallback currentMediaItem with type:", fallbackEpisodeObj.type);
    }
    // STEP 3: Close modal and prepare video player
    this.closeMediaBrowser();
    await this.waitForVideoPlayerReady();
    if (!this.videoPlayer) {
      console.error("[DEBUG - SINGLE-SOURCE-TV] VideoPlayer not available");
      this.showMediaLibraryError(
        "Video player not available. Please try again."
      );
      return;
    }
    // STEP 4: Build video URL
    let videoUrl;
    if (episodeObj && episodeObj.filePath) {
      const filePath = episodeObj.filePath;
      
      // Convert Windows filePath to relative path for server
      let relativePath = filePath;
      
      // If it's a Windows path with backslashes, convert to forward slashes
      if (filePath.includes('\\')) {
        relativePath = filePath.replace(/\\/g, '/');
      }
      
      // If it's an absolute path starting with drive letter, extract the relative part
      if (relativePath.match(/^[A-Z]:\//)) {
        // Remove drive letter and MEDIA/TV-SHOWS prefix
        relativePath = relativePath.replace(/^[A-Z]:\/MEDIA\/TV-SHOWS\//i, '');
      }
      
      // For Featurettes/Specials, we need to include the show name in the path
      // The server expects paths like "Show Name (Year)/Featurettes/episode.avi"
      if (relativePath.startsWith('Featurettes/') || relativePath.startsWith('Specials/')) {
        // Extract show name from the current TV show context
        console.log("[DEBUG - SINGLE-SOURCE-TV] Processing Featurettes path, currentTVShow:", this.currentTVShow);
        const showKey = this.currentTVShow ? this.currentTVShow.replace('TV-SHOWS/', '') : null;
        console.log("[DEBUG - SINGLE-SOURCE-TV] Extracted showKey:", showKey);
        
        if (showKey) {
          // Convert normalized key back to human-readable format
          const humanReadableShowName = showKey
            .replace(/\./g, ' ')
            .replace(/\(/g, ' (')
            .replace(/\)/g, ') ')
            .trim();
          console.log("[DEBUG - SINGLE-SOURCE-TV] Converted to human readable:", humanReadableShowName);
          relativePath = `${humanReadableShowName}/${relativePath}`;
          console.log("[DEBUG - SINGLE-SOURCE-TV] Added show name to Featurettes path:", relativePath);
        } else {
          console.log("[DEBUG - SINGLE-SOURCE-TV] WARNING: Could not extract show name for Featurettes!");
        }
      }
      
      const encodedPath = encodeURIComponent(relativePath);
      videoUrl = `/api/video?path=${encodedPath}`;
      console.log(
        "[DEBUG - SINGLE-SOURCE-TV] Using filePath from episodeObj:",
        filePath
      );
      console.log("[DEBUG - SINGLE-SOURCE-TV] Converted to relative path:",
        relativePath
      );
      console.log("[DEBUG - SINGLE-SOURCE-TV] Full video URL:", videoUrl);
    } else {
      // Fallback: construct path from episodePath
      let normalizedPath = (episodePath || "").replace(/\\/g, "/");
      if (normalizedPath.startsWith("/media/")) {
        normalizedPath = normalizedPath.replace(/^\/media\//, "");
      }
      try {
        normalizedPath = decodeURIComponent(normalizedPath);
      } catch (e) {}
      const encodedPath = normalizedPath
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      videoUrl = `/media/${encodedPath}`;
      console.log(
        "[DEBUG - SINGLE-SOURCE-TV] Using fallback path construction:",
        normalizedPath
      );
    }
    console.log("[DEBUG - SINGLE-SOURCE-TV] Final video URL:", videoUrl);
    // STEP 5: Set return location based on source context
    if (window.videoPlayer) {
      console.log(
        "[DEBUG - SINGLE-SOURCE-TV] Setting return location for source:",
        sourceContext
      );
      let returnLocation;
      if (sourceContext === "watchlater") {
        returnLocation = { type: "watch-later" };
      } else if (sourceContext === "tvshows") {
        returnLocation = {
          type: "tvshow-episodes",
          showPath: this.currentTVShow,
          seasonPath: this.currentTVSeason,
        };
      } else {
        returnLocation = { type: "media-library", tab: "TV-Shows" };
      }
      console.log(
        "[DEBUG - SINGLE-SOURCE-TV] Return location:",
        returnLocation
      );
      window.videoPlayer.setReturnLocation(returnLocation);
      // STEP 6: Play the video with the episode object
      console.log(
        "[DEBUG - SINGLE-SOURCE-TV] Calling playUrl with episode object"
      );
      window.videoPlayer.playUrl(videoUrl, "video/mp4", startTime, episodeObj);
    }
  }
  // NEW METHOD: Get episode object from path using the SAME logic as main TV-SHOWS tab
  getEpisodeObjectFromPath(episodePath) {
    console.log('[DEBUG - REAL-METHOD] getEpisodeObjectFromPath called with:', episodePath);
    if (!episodePath) {
      console.log('[DEBUG - REAL-METHOD] No episodePath provided');
      return null;
    }
    
    // Handle both absolute and relative paths
    let workingPath = episodePath;
    let isAbsolutePath = false;
    
    // Check if it's a REAL absolute path (starts with drive letter or full system path)
    if (workingPath.match(/^[A-Z]:[\\\/]/) || workingPath.match(/^\/[^\/]/) || workingPath.startsWith("S:\\")) {
      isAbsolutePath = true;
      console.log("[DEBUG - PATH-PROCESSING] Detected REAL absolute path:", workingPath);
      const pathParts = workingPath.split(/[\\/]/);
      const tvShowsIndex = pathParts.findIndex((part) =>
        part.toLowerCase().includes("tvshows")
      );
      if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
        // Get everything after TV-SHOWS: ["Show Name", "Season 01", "episode.mkv"]
        workingPath = pathParts.slice(tvShowsIndex + 1).join("/");
        console.log(
          "[DEBUG - PATH-PROCESSING] Converted absolute path:",
          episodePath,
          "to relative:",
          workingPath
        );
      }
    } else if (workingPath.includes("tvshows/") || workingPath.includes("TV-SHOWS/")) {
      // This is a relative path that starts with tvshows/ - extract the show part
      isAbsolutePath = false;
      console.log("[DEBUG - PATH-PROCESSING] Detected relative tvshows path:", workingPath);
      const pathParts = workingPath.split(/[\\/]/);
      const tvShowsIndex = pathParts.findIndex((part) =>
        part.toLowerCase().includes("tvshows")
      );
      if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
        // Get everything after tvshows: ["Show Name", "Season 01", "episode.mkv"]
        workingPath = pathParts.slice(tvShowsIndex + 1).join("/");
        console.log(
          "[DEBUG - PATH-PROCESSING] Converted relative tvshows path:",
          episodePath,
          "to relative:",
          workingPath
        );
      }
    }
    
    // Parse the path to extract show, season, and episode info
    const pathParts = workingPath.split("/");
    if (pathParts.length < 3) {
      console.log(
        "[DEBUG - REAL-METHOD] Invalid path format after processing:",
        workingPath,
        "from original:",
        episodePath
      );
      return null;
    }
    
    const showPath = pathParts[0]; // e.g., "lost.(2004)" or "Bored to Death (2009)"
    const seasonPath = pathParts[0] + "/" + pathParts[1]; // e.g., "lost.(2004)/season.01" or "Bored to Death (2009)/Season 01"
    const episodeFilename = pathParts[2]; // e.g., "lost.s01e02.pilot.mkv"
    
    console.log("[DEBUG - PATH-PARSING] Parsed path:", { 
      showPath, 
      seasonPath, 
      episodeFilename,
      originalPath: episodePath,
      workingPath: workingPath
    });
    
    // Convert normalized season path to human-readable format for matching
    // Handle both "season.01" and "Season 01" formats
    let humanReadableSeasonPath = seasonPath;
    
    // If it's in normalized format (e.g., "lost.(2004)/season.01")
    if (seasonPath.includes("season.")) {
      // Convert "season.01" to "Season 01" format
      const seasonMatch = seasonPath.match(/season\.(\d+)/i);
      if (seasonMatch) {
        const seasonNumber = seasonMatch[1];
        // Extract show name and convert to human-readable format
        const showName = showPath.replace(/\./g, " ").replace(/\(/g, " (").replace(/\)/g, ") ");
        humanReadableSeasonPath = `${showName}/Season ${seasonNumber}`;
        console.log("[DEBUG - PATH-PARSING] Converted normalized season path:", {
          from: seasonPath,
          to: humanReadableSeasonPath
        });
      }
    } else {
      // Already in human-readable format, just convert dots to spaces
      humanReadableSeasonPath = seasonPath.replace(/\./g, " ").replace(/\(/g, " (").replace(/\)/g, ") ");
    }
    
    console.log("[DEBUG - PATH-PARSING] Final season path conversion:", {
      normalized: seasonPath,
      humanReadable: humanReadableSeasonPath
    });
    
    // For findShowByPath, we need to handle both absolute and relative paths
    let fullShowPath = showPath;
    if (isAbsolutePath) {
      // For absolute paths, we need the TV-SHOWS prefix
      fullShowPath = "TV-SHOWS/" + showPath;
    } else {
      // For relative paths, the showPath is already correct (e.g., "Another Life (2019)")
      fullShowPath = showPath;
    }
    
    console.log(
      "[DEBUG - REAL-METHOD] Using fullShowPath for findShowByPath:",
      fullShowPath,
      "(isAbsolutePath:",
      isAbsolutePath,
      ")"
    );
    
    // Use the SAME method as main TV-SHOWS tab
    const show = this.findShowByPath(fullShowPath);
    if (!show) {
      console.log("[DEBUG - REAL-METHOD] Show not found:", fullShowPath);
      // Try alternative lookup methods for relative paths
      if (!isAbsolutePath) {
        console.log("[DEBUG - REAL-METHOD] Trying alternative lookup for relative path...");
        // Try to find the show by name in the unified data instead of old tvShowsData
        if (this.unifiedData) {
          let showsArray = [];
          // Convert unified data to array format for processing
          showsArray = Object.entries(this.unifiedData)
            .filter(([key, item]) => !item.isMovie && item.seasons)
            .map(([key, item]) => ({
              name: item.title || item.TMDBTitle || item.name || key, // Use key as fallback
              path: item.path || item.absPath,
              normalizedKey: key
            }));
          
          // Debug: Log a few items to see the structure
          if (showsArray.length > 0) {
            console.log("[DEBUG - REAL-METHOD] Sample unified data items:", showsArray.slice(0, 3));
          }
          
          console.log("[DEBUG - REAL-METHOD] Searching through", showsArray.length, "shows in unified data for:", showPath);
          console.log("[DEBUG - REAL-METHOD] First few show names:", showsArray.slice(0, 3).map(s => s.name || s.path));
          
          // USE THE WORKING BACKUP APPROACH: Extract show name from path and match normalizedKey
          const foundShow = showsArray.find(s => {
            if (!s.normalizedKey) return false;
            
            // Extract the show name from the path (before the first slash)
            // Example: "Chuck (2007)/Season 03/..." -> "Chuck (2007)"
            const showNameFromPath = showPath.split('/')[0];
            
            // Convert to normalized key format (same as backup system)
            // Example: "Chuck (2007)" -> "chuck.(2007)"
            if (!showNameFromPath || typeof showNameFromPath !== 'string') return false;
            const normalizedShowName = showNameFromPath
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '.')  // Replace special chars with dots
              .replace(/\s+/g, '.')           // Replace spaces with dots
              .replace(/\.+/g, '.')           // Clean up multiple dots
              .replace(/^\.|\.$/g, '')        // Remove leading/trailing dots
              .replace(/\.(\d{4})/, '.($1)'); // Ensure year has dot before it: "2018" -> ".(2018)"
            
            const normalizedUnifiedKey = s.normalizedKey.toLowerCase();
            
            const match = normalizedUnifiedKey === normalizedShowName;
            
            // ONLY LOG WHEN WE FIND A MATCH OR WHEN IT'S THE FIRST SHOW
            if (match) {
              console.log("[WATCH-LATER-MATCH] ✅ FOUND:", {
                showPath,
                normalizedShowName,
                unifiedKey: s.normalizedKey
              });
            } else if (s === showsArray[0]) {
              // Only log first show to see the pattern
              console.log("[WATCH-LATER-MATCH] 🔍 First show pattern:", {
                showPath,
                showNameFromPath,
                normalizedShowName,
                unifiedKey: s.normalizedKey,
                normalizedUnifiedKey
              });
            }
            
            return match;
          });
          
          if (foundShow) {
            console.log("[DEBUG - REAL-METHOD] Found show via unified data lookup:", foundShow.name);
            return this.createEpisodeObjectFromShow(foundShow, seasonPath, episodeFilename);
          } else {
            console.log("[DEBUG - REAL-METHOD] No show found in unified data for:", showPath);
          }
        } else {
          console.log("[DEBUG - REAL-METHOD] No unified data available");
        }
      }
      
      // Don't create incomplete objects - log warning and return null
      console.warn("[DEBUG - REAL-METHOD] Cannot create episode object - show not found in unified data for:", showPath);
      return null;
    }
    
    console.log('[DEBUG - REAL-METHOD] Found show:', show.name);
    
    // Get episodes from the SAME method as main TV-SHOWS tab
    // Use human-readable season path for matching with show.folders
    let episodes = this.getEpisodesForSeason(show, humanReadableSeasonPath) || [];
    console.log('[DEBUG - REAL-METHOD] Found episodes:', episodes.length);
    
    // Find the specific episode by filename
    console.log("[DEBUG - EPISODE-MATCHING] Looking for episode with filename:", episodeFilename);
    console.log("[DEBUG - EPISODE-MATCHING] Available episodes:", episodes.map(ep => ({ name: ep.name, filename: ep.filename })));
    
    const episodeObj = episodes.find((episode) => {
      const episodeName = episode.name || episode.filename || "";
      
      // Try multiple matching strategies
      const isMatch = (
        // Strategy 1: Direct filename match
        episodeName.toLowerCase() === episodeFilename.toLowerCase() ||
        
        // Strategy 2: Episode name contains filename
        episodeName.toLowerCase().includes(episodeFilename.toLowerCase()) ||
        
        // Strategy 3: Filename contains episode name
        episodeFilename.toLowerCase().includes(episodeName.toLowerCase()) ||
        
        // Strategy 4: Match by episode number (S01E02)
        (() => {
          const episodeMatch = episodeFilename.match(/S(\d{1,2})E(\d{1,2})/i);
          const nameMatch = episodeName.match(/S(\d{1,2})E(\d{1,2})/i);
          if (episodeMatch && nameMatch) {
            return episodeMatch[1] === nameMatch[1] && episodeMatch[2] === nameMatch[2];
          }
          return false;
        })()
      );
      
      if (isMatch) {
        console.log("[DEBUG - EPISODE-MATCHING] ✅ MATCHED episode:", episodeName, "with filename:", episodeFilename);
      }
      
      return isMatch;
    });
    
    if (episodeObj) {
      console.log("[DEBUG - EPISODE-MATCHING] Found episode object:", episodeObj.name);
      return episodeObj;
    } else {
      console.log("[DEBUG - EPISODE-MATCHING] ❌ Episode not found in episodes list");
      return null;
    }
  }
  
  // Helper method to create episode object from show data
  createEpisodeObjectFromShow(show, seasonPath, episodeFilename) {
    console.log("[DEBUG - EPISODE-CREATION] Creating episode object for:", episodeFilename);
    console.log("[DEBUG - EPISODE-CREATION] Show:", show.name || show.path);
    console.log("[DEBUG - EPISODE-CREATION] Season path:", seasonPath);
    
    // Extract season number from seasonPath
    const seasonMatch = seasonPath.match(/Season\s*(\d+)/i);
    const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;
    
    // Extract episode number from filename
    const episodeMatch = episodeFilename.match(/S\d+E(\d+)/i);
    const episodeNumber = episodeMatch ? parseInt(episodeMatch[1], 10) : 1;
    
    console.log("[DEBUG - EPISODE-CREATION] Extracted season:", seasonNumber, "episode:", episodeNumber);
    
    // Create a basic episode object
    const episodeObj = {
      name: episodeFilename,
      filename: episodeFilename,
      path: seasonPath + "/" + episodeFilename,
      relPath: seasonPath + "/" + episodeFilename,
      filePath: seasonPath + "/" + episodeFilename,
      absPath: seasonPath + "/" + episodeFilename,
      seasonNumber: seasonNumber,
      episodeNumber: episodeNumber,
      showName: show.name || show.path,
      showPath: show.path
    };
    
    // FORCE: Add type field to episode object for TV show detection
    episodeObj.type = "tvshow";
    episodeObj.mediaType = "tvshow";
    
    console.log("[DEBUG - EPISODE-CREATION] Created episode object:", episodeObj);
    console.log("[DEBUG - EPISODE-CREATION] Added type field:", episodeObj.type);
    return episodeObj;
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
    } else if (typeof this.tvShowsData === "object" && this.tvShowsData) {
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
            const episodeObj = season.episodes.find((episode) => {
              const normalizePath = (p) =>
                p ? p.replace(/\\/g, "/").toLowerCase().trim() : "";
              const normalizedEpisodePath = normalizePath(episodePath);
              const normalizedEpisodePath2 = normalizePath(episode.path);
              const normalizedEpisodeAbsPath = normalizePath(episode.absPath);
              const normalizedEpisodeFilePath = normalizePath(episode.filePath);
              const normalizedEpisodeRelPath = normalizePath(episode.relPath);
              // Debug logging for first few episodes to see path formats
              if (
                show.name === "Bored to Death" &&
                season.name === "Season 01" &&
                episode.name &&
                episode.name.includes("S01E03")
              ) {
                // console.log('[DEBUG - PATH-MATCHING] Looking for:', normalizedEpisodePath);
                // console.log('[DEBUG - PATH-MATCHING] Episode paths available:');
                // console.log('[DEBUG - PATH-MATCHING]   episode.path:', episode.path);
                // console.log('[DEBUG - PATH-MATCHING]   episode.absPath:', episode.absPath);
                // console.log('[DEBUG - PATH-MATCHING]   episode.filePath:', episode.filePath);
                // console.log('[DEBUG - PATH-MATCHING]   episode.relPath:', episode.relPath);
                // console.log('[DEBUG - PATH-MATCHING] Full episode object:', episode);
              }
              // Try exact path matches first
              if (
                normalizedEpisodePath === normalizedEpisodePath2 ||
                normalizedEpisodePath === normalizedEpisodeAbsPath ||
                normalizedEpisodePath === normalizedEpisodeFilePath ||
                normalizedEpisodePath === normalizedEpisodeRelPath
              ) {
                return true;
              }
              // If exact path doesn't match, try matching just the filename
              const getFilename = (path) => {
                if (!path) return "";
                const parts = path.split("/");
                return parts[parts.length - 1].toLowerCase().trim();
              };
              const episodeFilename = getFilename(normalizedEpisodePath);
              const storedFilename =
                getFilename(normalizedEpisodePath2) ||
                getFilename(normalizedEpisodeAbsPath) ||
                getFilename(normalizedEpisodeFilePath) ||
                getFilename(normalizedEpisodeRelPath);
              if (
                episodeFilename &&
                storedFilename &&
                episodeFilename === storedFilename
              ) {
                console.log(
                  "[DEBUG - PATH-MATCHING] Matched by filename:",
                  episodeFilename
                );
                return true;
              }
              // If filename doesn't match, try matching by show name and episode info
              const extractShowAndEpisode = (path) => {
                if (!path) return null;
                const parts = path.split("/");
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
              const storedInfo =
                extractShowAndEpisode(normalizedEpisodePath2) ||
                extractShowAndEpisode(normalizedEpisodeAbsPath) ||
                extractShowAndEpisode(normalizedEpisodeFilePath) ||
                extractShowAndEpisode(normalizedEpisodeRelPath);
              if (
                episodeInfo &&
                storedInfo &&
                episodeInfo.showName === storedInfo.showName &&
                episodeInfo.seasonNum === storedInfo.seasonNum &&
                episodeInfo.episodeNum === storedInfo.episodeNum
              ) {
                // console.log('[DEBUG - PATH-MATCHING] Matched by show/season/episode:', episodeInfo);
                return true;
              }
              return false;
            });
            if (episodeObj) {
              // console.log('[DEBUG - CENTRALIZED] Found episode in show:', show.name, 'season:', season.name);
              // FORCE: Add type field to episode object for TV show detection
              episodeObj.type = "tvshow";
              episodeObj.mediaType = "tvshow";
              console.log('[DEBUG - CENTRALIZED] Added type field to episode object:', episodeObj.type);
              return episodeObj;
            }
          }
        }
      }
    }
    
    // NEW: Search through files arrays for shows that have the new structure
    for (const show of showsArray) {
      if (show.files && Array.isArray(show.files)) {
        const episodeObj = show.files.find((file) => {
          const normalizePath = (p) =>
            p ? p.replace(/\\/g, "/").toLowerCase().trim() : "";
          const normalizedEpisodePath = normalizePath(episodePath);
          const normalizedFilePath = normalizePath(file.path);
          const normalizedFileAbsPath = normalizePath(file.absPath);
          const normalizedFileFilePath = normalizePath(file.filePath);
          const normalizedFileRelPath = normalizePath(file.relPath);
          
          // Try exact path matches first
          if (
            normalizedEpisodePath === normalizedFilePath ||
            normalizedEpisodePath === normalizedFileAbsPath ||
            normalizedEpisodePath === normalizedFileFilePath ||
            normalizedEpisodePath === normalizedFileRelPath
          ) {
            return true;
          }
          
          // If exact path doesn't match, try matching just the filename
          const getFilename = (path) => {
            if (!path) return "";
            const parts = path.split("/");
            return parts[parts.length - 1].toLowerCase().trim();
          };
          const episodeFilename = getFilename(normalizedEpisodePath);
          const storedFilename =
            getFilename(normalizedFilePath) ||
            getFilename(normalizedFileAbsPath) ||
            getFilename(normalizedFileFilePath) ||
            getFilename(normalizedFileRelPath);
          if (
            episodeFilename &&
            storedFilename &&
            episodeFilename === storedFilename
          ) {
            console.log(
              "[DEBUG - FILES-ARRAY] Matched by filename:",
              episodeFilename
            );
            return true;
          }
          
          // If filename doesn't match, try matching by show name and episode info
          const extractShowAndEpisode = (path) => {
            if (!path) return null;
            const parts = path.split("/");
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
          const storedInfo =
            extractShowAndEpisode(normalizedFilePath) ||
            extractShowAndEpisode(normalizedFileAbsPath) ||
            extractShowAndEpisode(normalizedFileFilePath) ||
            extractShowAndEpisode(normalizedFileRelPath);
          if (
            episodeInfo &&
            storedInfo &&
            episodeInfo.showName === storedInfo.showName &&
            episodeInfo.seasonNum === storedInfo.seasonNum &&
            episodeInfo.episodeNum === storedInfo.episodeNum
          ) {
            console.log('[DEBUG - FILES-ARRAY] Matched by show/season/episode:', episodeInfo);
            return true;
          }
          return false;
        });
        if (episodeObj) {
          console.log('[DEBUG - FILES-ARRAY] Found episode in files array for show:', show.TMDBTitle || show.about?.title || 'Unknown');
          // FORCE: Add type field to episode object for TV show detection
          episodeObj.type = "tvshow";
          episodeObj.mediaType = "tvshow";
          console.log('[DEBUG - FILES-ARRAY] Added type field to episode object:', episodeObj.type);
          return episodeObj;
        }
      }
    }
    
    // console.log('[DEBUG - CENTRALIZED] No episode object found for path:', episodePath);
    return null;
  }
  // Legacy method - now calls the working method
  async playEpisode(episodePath, startTime = 0) {
    console.log(
      "[DEBUG - LEGACY] playEpisode called, redirecting to working method"
    );
    // Find the episode object and use the working method
    const episodeObj = this.findEpisodeObjectByPath(episodePath);
    if (episodeObj) {
      // Create a fake element with the episode data
      const fakeElement = document.createElement("div");
      fakeElement.setAttribute("data-episode", JSON.stringify(episodeObj));
      await this.playEpisodeFromDataAttribute(fakeElement, startTime);
    } else {
      console.error(
        "[DEBUG - LEGACY] No episode object found for path:",
        episodePath
      );
      this.showMediaLibraryError("Episode not found. Please try again.");
    }
  }
  // ORIGINAL WORKING IMPLEMENTATION - Restored for Watch Later
  async playEpisodeFromObject(episodeDataJson, startTime = 0) {
    console.log("[DEBUG - WORKING] playEpisodeFromObject called");
    try {
      const episodeObj = JSON.parse(episodeDataJson);
      console.log("[DEBUG - WORKING] parsed episodeObj:", episodeObj);
      // Add year information to the episode object for video player using dedicated method
      const year = this.getDateForTvShow(episodeObj);
      if (year) {
        console.log("[DEBUG - WORKING] Adding year to episode object:", year);
        // Add year to episode object (but NOT to title/name - let VideoPlayer handle that)
        episodeObj.year = year;
        episodeObj.data = episodeObj.data || {};
        episodeObj.data.year = year;
        console.log(
          "[DEBUG - WORKING] Added year to episode object (not title/name)"
        );
      } else {
        console.log("[DEBUG - WORKING] No year found for episode");
      }
      // FORCE: Set correct type field for TV show episodes
      episodeObj.type = "tvshow";
      episodeObj.mediaType = "tvshow";
      
      window.mediaLibraryManager.currentMediaItem = episodeObj;
      window.mediaLibraryManager.currentFile = episodeObj;
      console.log("[DEBUG - TV-SHOW] Set currentMediaItem with type:", episodeObj.type);
      // Remove both modal and overlay
      this.closeMediaBrowser();
      // Wait for video player to be ready before proceeding
      await this.waitForVideoPlayerReady();
      if (!this.videoPlayer) {
        console.error(
          "[DEBUG - WORKING] VideoPlayer not available for TV show episode"
        );
        this.showMediaLibraryError(
          "Video player not available. Please try again."
        );
        return;
      }
      // Use the absolute filePath from the episode object
      let videoUrl;
      if (episodeObj && episodeObj.filePath) {
        // Use the absolute filePath from the TV-Shows data
        const filePath = episodeObj.filePath;
        const encodedPath = encodeURIComponent(filePath);
        videoUrl = `/api/video?path=${encodedPath}`;
        console.log("[DEBUG - WORKING] Using filePath:", filePath);
        console.log("[DEBUG - WORKING] Encoded path:", encodedPath);
      } else {
        console.error(
          "[DEBUG - WORKING] No filePath found in episode object"
        );
        console.error(
          "[DEBUG - WORKING] Available properties:",
          Object.keys(episodeObj)
        );
        this.showMediaLibraryError(
          "No video file path found for this episode. Please check if the video file exists."
        );
        return;
      }
      console.log(
        "[DEBUG - WORKING] Final video URL:",
        videoUrl,
        "startTime:",
        startTime
      );
      // Set up return location based on current context
      if (window.videoPlayer) {
        console.log(
          "[DEBUG - WORKING] Setting return location for TV show episode from Watch Later"
        );
        console.log("[DEBUG - WORKING] Current tab flag:", this.currentTabFlag);
        // Determine the correct return location based on current context
        let returnLocation;
        if (this.currentTabFlag === "watchlater") {
          returnLocation = { type: "watch-later" };
          console.log(
            "[DEBUG - WORKING] Setting return location to watch-later"
          );
        } else if (this.currentTabFlag === "tvshows") {
          returnLocation = {
            type: "tvshow-episodes",
            showPath: this.currentTVShow,
            seasonPath: this.currentTVSeason,
          };
          console.log(
            "[DEBUG - WORKING] Setting return location to tvshow-episodes"
          );
        } else {
          returnLocation = { type: "media-library", tab: "TV-Shows" };
          console.log(
            "[DEBUG - WORKING] Setting return location to media-library TV-Shows"
          );
        }
        console.log(
          "[DEBUG - WORKING] Return location object:",
          returnLocation
        );
        window.videoPlayer.setReturnLocation(returnLocation);
        // Ensure video player is ready before calling playUrl
        console.log(
          "[DEBUG - WORKING] Calling playUrl with startTime:",
          startTime
        );
        console.log(
          "[DEBUG - WORKING] Passing episodeObj to playUrl:",
          episodeObj
        );
        window.videoPlayer.playUrl(
          videoUrl,
          "video/mp4",
          startTime,
          episodeObj
        );
      }
    } catch (error) {
      console.error("[DEBUG - WORKING] Error parsing episode data:", error);
      this.showMediaLibraryError("Error playing episode. Please try again.");
    }
  }
  
  // NEW: Consolidated method for episode cards that uses the new path
  playEpisodeFromCard(element, startTime = 0) {
    try {
      console.log("[DEBUG - CARD] 🚀 playEpisodeFromCard called with element:", element);
      
      // Check if there's a resume time stored in the element (for Watch Later)
      const resumeTime = element.getAttribute("data-resume-time");
      if (resumeTime) {
        console.log("[DEBUG - CARD] Found resume time in element:", resumeTime);
        startTime = parseFloat(resumeTime) || 0;
        // Clear the resume time after using it
        element.removeAttribute("data-resume-time");
      }
      
      // Set the current tab flag
      this.currentTabFlag = "tvshows";
      
      // Get episode data from the element
      const episodeData = element.getAttribute("data-episode");
      if (!episodeData) {
        console.error("[DEBUG - CARD] ❌ No episode data found in element");
        return;
      }
      
      console.log("[DEBUG - CARD] Raw episode data from element:", episodeData);
      
      // Parse the episode data
      const episode = JSON.parse(episodeData);
      console.log("[DEBUG - CARD] ✅ Parsed episode data:", episode);
      
      // Use the new consolidated path: prepareEpisodeForPlayback + VideoPlayer
      if (window.videoPlayer) {
        console.log("[DEBUG - CARD] 🎬 VideoPlayer found, preparing episode for playback");
        
        // Prepare the episode data using our consolidated method
        const cleanedEpisode = this.prepareEpisodeForPlayback(episode);
        console.log("[DEBUG - CARD] 🧹 Cleaned episode:", cleanedEpisode);
        
        // Set return location for the video player
        const returnLocation = {
          type: "tvshow-episodes",
          showPath: this.currentTVShow,
          seasonPath: this.currentTVSeason,
        };
        console.log("[DEBUG - CARD] Setting return location:", returnLocation);
        window.videoPlayer.setReturnLocation(returnLocation);
        
        // Close the media library modal
        this.closeMediaBrowser();
        
        // Show the video player
        window.videoPlayer.show();
        
        // Load the episode directly in the VideoPlayer
        console.log("[DEBUG - CARD] 🎥 Loading episode in VideoPlayer:", cleanedEpisode.name || cleanedEpisode.title);
        window.videoPlayer.loadEpisodeVideo(cleanedEpisode, cleanedEpisode.name || cleanedEpisode.title);
      } else {
        console.error("[DEBUG - CARD] ❌ VideoPlayer not available");
      }
      
    } catch (error) {
      console.error("[DEBUG - CARD] ❌ Error in playEpisodeFromCard:", error);
    }
  }
  
  // Wrapper method for inline onclick handlers to handle async playEpisodeFromDataAttribute
  playEpisodeFromDataAttributeAsync(element, startTime = 0) {
    // Check if there's a resume time stored in the element (for Watch Later)
    const resumeTime = element.getAttribute("data-resume-time");
    if (resumeTime) {
      console.log("[DEBUG - RESUME] Found resume time in element:", resumeTime);
      startTime = parseFloat(resumeTime) || 0;
      // Clear the resume time after using it
      element.removeAttribute("data-resume-time");
    }
    // Set the current tab flag based on the element class
    if (element.classList.contains("watch-later-card")) {
      this.currentTabFlag = "watchlater";
      console.log("[DEBUG - RESUME] Set currentTabFlag to watchlater");
    } else {
      this.currentTabFlag = "tvshows";
      console.log("[DEBUG - RESUME] Set currentTabFlag to tvshows");
    }
    this.playEpisodeFromDataAttribute(element, startTime).catch((error) => {
      console.error("[PLAY EPISODE FROM DATA ATTRIBUTE ASYNC] Error:", error);
    });
  }
  // ORIGINAL WORKING IMPLEMENTATION - Restored for main TV-SHOWS tab
  async playEpisodeFromDataAttribute(element, startTime = 0) {
    console.log(
      "[DEBUG - WORKING] playEpisodeFromDataAttribute called with startTime:",
      startTime
    );
    try {
      const episodeData = element.getAttribute("data-episode");
      if (!episodeData) {
        console.error(
          "[DEBUG - WORKING] No episode data found in data-episode attribute"
        );
        this.showMediaLibraryError("No episode data found. Please try again.");
        return;
      }
      // Unescape the JSON data before parsing
      const unescapedData = episodeData
        .replace(/&quot;/g, '"')
        .replace(/\\'/g, "'");
      const episodeObj = JSON.parse(unescapedData);
      // Add year information to the episode object for video player using dedicated method
      const year = this.getDateForTvShow(episodeObj);
      if (year) {
        console.log("[DEBUG - WORKING] Adding year to episode object:", year);
        // Add year to episode object (but NOT to title/name - let VideoPlayer handle that)
        episodeObj.year = year;
        episodeObj.data = episodeObj.data || {};
        episodeObj.data.year = year;
        console.log(
          "[DEBUG - WORKING] Added year to episode object (not title/name)"
        );
      } else {
        console.log("[DEBUG - WORKING] No year found for episode");
      }
      // FORCE: Set correct type field for TV show episodes
      episodeObj.type = "tvshow";
      episodeObj.mediaType = "tvshow";
      
      window.mediaLibraryManager.currentMediaItem = episodeObj;
      window.mediaLibraryManager.currentFile = episodeObj;
      console.log("[DEBUG - TV-SHOW] Set currentMediaItem with type:", episodeObj.type);
      // Remove both modal and overlay
      this.closeMediaBrowser();
      // Wait for video player to be ready before proceeding
      await this.waitForVideoPlayerReady();
      if (!this.videoPlayer) {
        console.error(
          "[DEBUG - WORKING] VideoPlayer not available for TV show episode from data attribute"
        );
        this.showMediaLibraryError(
          "Video player not available. Please try again."
        );
        return;
      }
      // Show video player immediately for better UX
      if (window.videoPlayer) {
        console.log(
          "[DEBUG - WORKING] Setting return location for TV show episode"
        );
        console.log("[DEBUG - WORKING] Current tab flag:", this.currentTabFlag);
        console.log("[DEBUG - WORKING] currentTVShow:", this.currentTVShow);
        console.log("[DEBUG - WORKING] currentTVSeason:", this.currentTVSeason);
        // Set return location based on current tab flag
        let returnLocation;
        if (this.currentTabFlag === "watchlater") {
          returnLocation = { type: "watch-later" };
          console.log(
            "[DEBUG - WORKING] Setting return location to watch-later"
          );
        } else if (
          this.currentTabFlag === "tvshows" ||
          this.currentTab === "tvshows"
        ) {
          returnLocation = {
            type: "tvshow-episodes",
            showPath: this.currentTVShow,
            seasonPath: this.currentTVSeason,
          };
          console.log(
            "[DEBUG - WORKING] Setting return location to tvshow-episodes"
          );
        } else {
          returnLocation = { type: "media-library", tab: "TV-Shows" };
          console.log(
            "[DEBUG - WORKING] Setting return location to media-library TV-Shows"
          );
        }
        console.log(
          "[DEBUG - WORKING] Return location object:",
          returnLocation
        );
        window.videoPlayer.setReturnLocation(returnLocation);
        window.videoPlayer.show();
      } else {
        console.error("[DEBUG - WORKING] Video player not available!");
      }
      // Use the absolute filePath from the episode object
      let videoUrl;
      if (episodeObj && episodeObj.filePath) {
        // Use the absolute filePath from the TV-Shows data
        const filePath = episodeObj.filePath;
        const encodedPath = encodeURIComponent(filePath);
        videoUrl = `/api/video?path=${encodedPath}`;
        console.log("[DEBUG - WORKING] Using filePath:", filePath);
        console.log("[DEBUG - WORKING] Encoded path:", encodedPath);
        console.log("[DEBUG - WORKING] Final video URL:", videoUrl);
        // Note: Removed URL test to improve responsiveness - video player will handle errors
      } else {
        console.error("[DEBUG - WORKING] No filePath found in episode object");
        console.error(
          "[DEBUG - WORKING] Available properties:",
          Object.keys(episodeObj)
        );
        // Try alternative paths
        if (episodeObj.path) {
          const encodedPath = encodeURIComponent(episodeObj.path);
          videoUrl = `/api/video?path=${encodedPath}`;
          console.log(
            "[DEBUG - WORKING] Using path as fallback:",
            episodeObj.path
          );
        } else {
          console.error(
            "[DEBUG - WORKING] No valid video path found in episode object"
          );
          this.showMediaLibraryError(
            "No video file found for this episode. Please check if the video file exists."
          );
          return;
        }
      }
      console.log(
        "[DEBUG - WORKING] Final video URL:",
        videoUrl,
        "startTime:",
        startTime
      );
      // Set up a callback to restore the MediaLibrary modal when the Video Player is closed
      if (window.videoPlayer) {
        window.videoPlayer.onClose = () => {
          // Restore the MediaLibrary modal in the same state (showing episodes for the current show/season)
          this.renderModal();
        };
        // Ensure video player is ready before calling playUrl
        console.log(
          "[DEBUG - WORKING] Calling playUrl with startTime:",
          startTime
        );
        console.log(
          "[DEBUG - WORKING] Passing episodeObj to playUrl:",
          episodeObj
        );
        window.videoPlayer.playUrl(
          videoUrl,
          "video/mp4",
          startTime,
          episodeObj
        );
      }
    } catch (error) {
      console.error("[DEBUG - WORKING] Error parsing episode data:", error);
      this.showMediaLibraryError("Error loading episode. Please try again.");
    }
  }
  // --- TAB CONTENT RENDERING METHODS ---
  renderMoviesContent() {
    const items = this.getFilteredAndSortedItems();
    const addedAnchors = new Set();
    let html = '<div class="media-library-movie-grid">';
    items.forEach((item, index) => {
      // Use normalizedKey for display title, fallback to path if needed
      let displayTitle = "";
      if (item.normalizedKey) {
        // Convert normalized key to readable display format
        displayTitle = this.convertNormalizedKeyToDisplayTitle(
          item.normalizedKey
        );
      } else if (item.path) {
        // Fallback to path and clean it
        displayTitle = this.cleanTitleForDisplay(item.path);
      } else {
        displayTitle =
          item.TMDBTitle || item.title || item.name || item.filename || "";
      }
      const firstLetter = displayTitle.charAt(0).toUpperCase();
      // Create anchor element if this is the first movie starting with this letter
      let anchorHTML = "";
      if (!addedAnchors.has(firstLetter)) {
        anchorHTML = `<div class="media-library-anchor" data-anchor="${firstLetter}"></div>`;
        addedAnchors.add(firstLetter);
      }
      html += `
                <div class="media-library-movie-card" data-item-index="${index}" data-item-path="${item.path}">
                    ${anchorHTML}
                    <div class="media-card-actions-movies">
                        <button class="movie-poster-selector-btn" title="Change Movie Poster">🎬</button>
                        <button class="movie-favorite-btn" title="Toggle Movie Favorite">${this.isFavorite(item.path) ? "❤️" : "🤍"}</button>
                        <button class="movie-collection-btn" data-path="${item.path}" title="Add Movie to Collection">➕</button>
                    </div>
                    <img src="${this.getPosterPath(item)}" alt="${displayTitle}" class="media-library-poster">
                    <div class="media-info"><h3>${displayTitle}</h3></div>
                </div>
            `;
    });
    html += "</div>";
    
    // Insert the HTML into the DOM
    const grid = document.getElementById("mediaGrid");
    if (grid) {
      grid.innerHTML = html;
      
      // NOW attach the event handlers AFTER the HTML is in the DOM
      this.attachMovieCardHandlers();
    }
    
    return html;
  }
  attachMovieCardHandlers() {
    // console.log("[DEBUG] Attaching movie card handlers");
    const items = this.getFilteredAndSortedItems();
    // console.log("[DEBUG] Found items:", items.length);
    
    // Attach click handlers to movie cards
    const movieCards = document.querySelectorAll(".media-library-movie-card");
    // console.log("[DEBUG] Found movie cards in DOM:", movieCards.length);
    
    movieCards.forEach((card, index) => {
        const item = items[index];
        if (!item) return;
        // Attach favorite button handler - specifically target movie favorite buttons
        const favoriteBtn = card.querySelector(".movie-favorite-btn");
        if (favoriteBtn) {
          // console.log("[DEBUG - HEART] Attaching click handler to heart button for:", item.path);
          favoriteBtn.onclick = (e) => {
            console.log("[DEBUG - HEART] Heart button clicked for:", item.path);
            e.stopPropagation();
            
            // Toggle the heart icon immediately for instant visual feedback
            const currentIsFav = this.isFavorite(item.path);
            const newIsFav = !currentIsFav;
            favoriteBtn.textContent = newIsFav ? "❤️" : "🤍";
            favoriteBtn.title = newIsFav ? "Remove from Favorites" : "Add to Favorites";
            console.log("[DEBUG - MOVIE-HEART] Heart icon toggled immediately:", newIsFav ? "❤️" : "🤍");
            
            this.toggleFavorite(item, "movie");
          };
        } else {
          console.warn("[DEBUG - HEART] No heart button found for item:", item.path);
        }
        // Attach collection button handler
        const collectionBtn = card.querySelector(".movie-collection-btn");
        if (collectionBtn) {
          collectionBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
              // Always show the manage collections modal for multiple collection support
              // This allows users to add to more collections OR remove from existing ones
              await this.showAddToCollectionModal(item);
            } catch (error) {
              // console.error('[DEBUG - COLLECTIONS] Error handling collection button click:', error);
              this.showToast("Error opening collections modal", "error");
            }
          };
        }
        // Attach main card click handler for movie details
        card.addEventListener("click", async (e) => {
          if (
            e.target.closest(".movie-poster-selector-btn") ||
            e.target.closest(".movie-favorite-btn") ||
            e.target.closest(".movie-collection-btn")
          ) {
            return; // Don't trigger card click for action buttons
          }
          console.log("[DEBUG - MOVIE-CARD] Movie card clicked:", item.path);
          console.log("[DEBUG - MOVIE-CARD] Item object:", item);
          console.log("[DEBUG - MOVIE-CARD] Item properties:", {
            path: item.path,
            absPath: item.absPath,
            filePath: item.filePath,
            files: item.files,
            type: item.type,
            mediaType: item.mediaType,
            title: item.title,
            name: item.name,
            normalizedKey: item.normalizedKey,
          });
          await this.showMovieDetailsModal(item);
        });
      });
  }
  attachTVShowHandlers() {
    // console.log("[DEBUG] Attaching TV show handlers");
    // Attach click handlers to TV show cards using the same mechanism as favorited TV shows
    const tvCards = document.querySelectorAll(".media-library-tv-show-card");
    // console.log(
    //   "[DEBUG] Found TV show cards to attach handlers to:",
    //   tvCards.length
    // );
    tvCards.forEach((card) => {
      const path = card.getAttribute("data-path");
      // console.log("[DEBUG] Attaching TV show handler for:", path);
      // Attach favorite button handler
      const favoriteBtn = card.querySelector(".tv-favorite-btn");
      if (favoriteBtn) {
        favoriteBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          // console.log("[DEBUG] Toggling TV show favorite:", path);
          
          // FIXED APPROACH: Get working poster from unified data since cards have placeholders!
          let tvShowObj = null;
          let workingPosterUrl = null;
          
          // Get the working poster URL from unified data (now that it contains poster URLs!)
          if (this.unifiedData) {
            // Extract the show name from the favorites path (remove TV-SHOWS/ prefix)
            const showNameFromPath = path.replace(/^TV-SHOWS\//, '');
            
            // Find the show in unified data
            const show = this.unifiedData[showNameFromPath];
            if (show && show.poster) {
              workingPosterUrl = show.poster;
              // console.log("[FAVORITES-POSTER] ✅ Got working poster from unified data:", workingPosterUrl);
            } else {
              // console.log("[FAVORITES-POSTER] ❌ No poster found in unified data for:", showNameFromPath);
              // Fallback to DOM extraction if needed
              const posterImg = card.querySelector('.media-library-poster');
              if (posterImg && posterImg.src && !posterImg.src.includes('placeholder-poster.jpg')) {
                workingPosterUrl = posterImg.src;
                console.log("[FAVORITES-POSTER] ✅ Fallback: Got working poster from DOM:", workingPosterUrl);
              } else {
                workingPosterUrl = '/assets/img/placeholder-poster.jpg';
                console.log("[FAVORITES-POSTER] ❌ Using placeholder poster");
              }
            }
          } else {
            // console.log("[FAVORITES-POSTER] ❌ Unified data not available, using DOM extraction");
            const posterImg = card.querySelector('.media-library-poster');
            if (posterImg && posterImg.src && !posterImg.src.includes('placeholder-poster.jpg')) {
              workingPosterUrl = posterImg.src;
            } else {
              workingPosterUrl = '/assets/img/placeholder-poster.jpg';
            }
          }
          
          // Get the display title from the card
          const titleElement = card.querySelector('.media-library-tvshow-title');
          const displayTitle = titleElement ? titleElement.textContent : path.split(/[\\/]/).pop();
          
          if (this.unifiedData) {
            for (const [key, item] of Object.entries(this.unifiedData)) {
              if (!item.isMovie && item.seasons && 
                  ((item.path && item.path === path) || 
                   (item.absPath && item.absPath === path))) {
                tvShowObj = { ...item };
                // console.log("[DEBUG] Found TV show in unified data:", tvShowObj.name || tvShowObj.title);
                break;
              }
            }
          }
          
          if (tvShowObj) {
            // Use the working poster URL from the card instead of the broken one in unified data
            tvShowObj.poster = workingPosterUrl || tvShowObj.poster;
            tvShowObj.displayTitle = displayTitle;
            // console.log("[DEBUG] Using working poster URL:", tvShowObj.poster);
            
            // Toggle the heart icon immediately for instant visual feedback
            const currentIsFav = this.isFavorite(tvShowObj.path);
            const newIsFav = !currentIsFav;
            favoriteBtn.textContent = newIsFav ? "❤️" : "🤍";
            favoriteBtn.title = newIsFav ? "Remove from Favorites" : "Add to Favorites";
            console.log("[DEBUG - TV-HEART] Heart icon toggled immediately:", newIsFav ? "❤️" : "🤍");
            
            this.toggleFavorite(tvShowObj, "tvshow");
          } else {
            console.warn("[DEBUG] Could not find TV show in unified data for path:", path);
            // Create a basic object with the working poster from the card
            const fallbackObj = {
              path: path,
              name: displayTitle,
              type: 'tvshow',
              poster: workingPosterUrl || '/assets/img/placeholder-poster.jpg'
            };
            console.log("[DEBUG] Created fallback object with working poster:", fallbackObj.poster);
            this.toggleFavorite(fallbackObj, "tvshow");
            
            // Toggle the heart icon immediately for instant visual feedback
            const currentIsFav = favoriteBtn.textContent === "❤️";
            const newIsFav = !currentIsFav;
            favoriteBtn.textContent = newIsFav ? "❤️" : "🤍";
            favoriteBtn.title = newIsFav ? "Remove from Favorites" : "Add to Favorites";
            console.log("[DEBUG - TV-HEART] Heart icon toggled immediately:", newIsFav ? "❤️" : "🤍");
          }
          
          return false;
        };
      }
      // Attach collection button handler
      const collectionBtn = card.querySelector(".tv-collection-btn");
      if (collectionBtn) {
        collectionBtn.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const showName = card.getAttribute("data-show-name");
          const normalizedKey = card.getAttribute("data-normalized-key");
          // Use normalized key as path for collection lookup
          const showData = { path: normalizedKey || path, name: showName };
          try {
            // Always show the manage collections modal for multiple collection support
            // This allows users to add to more collections OR remove from existing ones
            await this.showAddToCollectionModal(showData);
          } catch (error) {
            // console.error('[DEBUG - COLLECTIONS] Error handling collection button click:', error);
            this.showToast("Error opening collections modal", "error");
          }
          return false;
        };
      }
      // Attach card click handler for opening TV shows - using the same mechanism as favorited TV shows
      card.onclick = (e) => {
        if (
          e.target.closest(".favorites-only-heart-btn") ||
          e.target.closest(".poster-selector-btn") ||
          e.target.closest(".collection-btn")
        )
          return; // Don't trigger for action buttons
        console.log("[DEBUG] Opening TV show from main tab:", path);
        this.openTVShow(path);
      };
    });
  }
  // Force refresh the current content to get new classes
  forceRefreshContent() {
    console.log("[DEBUG] Force refreshing content to get new classes");
    this.updateModalContent();
  }
  attachFavoritesHandlers() {
    console.log("🚨 [DEBUG] ====== ATTACHING FAVORITES HANDLERS ======");
    // Attach click handlers for movie favorites
    const movieCards = document.querySelectorAll(
      ".media-library-movie-card-movies"
    );
    console.log('[DEBUG - FAVORITES] Found', movieCards.length, 'movie cards');
    movieCards.forEach((card, index) => {
      console.log(`[DEBUG - FAVORITES] Processing card ${index}:`, card);
      console.log(`[DEBUG - FAVORITES] Card data-path:`, card.getAttribute('data-path'));
      console.log(`[DEBUG - FAVORITES] Card data-title:`, card.getAttribute('data-title'));
      const path = card.getAttribute("data-path");
      // console.log('[DEBUG - FAVORITES] Attaching movie handler for:', path);
      // Attach favorite button handler - specifically target movie favorite buttons
      const favoriteBtn = card.querySelector(".movie-favorite-btn");
      console.log(`[DEBUG - FAVORITES] Card ${index} - Found movie-favorite-btn:`, !!favoriteBtn);
      if (favoriteBtn) {
        favoriteBtn.onclick = (e) => {
          console.log("🚨 [DEBUG - FAVORITES-MOVIE-CLICK] Movie heart button clicked!");
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('[DEBUG - FAVORITES] Removing movie from favorites:', path);
          
          // Find the complete movie object from the favorites data
          const favorites = this.getFavoritesList();
          console.log('[DEBUG-FAVORITES-MOVIES] Looking for movie with path:', path);
          console.log('[DEBUG-FAVORITES-MOVIES] Available favorites movies:', favorites.movies.map(m => ({ path: m.path, absPath: m.absPath, normalizedKey: m.normalizedKey, title: m.title })));
          console.log('[DEBUG-FAVORITES-MOVIES] First few favorites movies details:', favorites.movies.slice(0, 3));
          
          // Try multiple lookup strategies - now with standardized format
          let movieObj = favorites.movies.find(item => 
            (item.path && item.path === path) || 
            (item.absPath && item.absPath === path) ||
            (item.normalizedKey && item.normalizedKey === path) ||
            (item.title && item.title === path) ||
            (item.TMDBTitle && item.TMDBTitle === path) ||
            (item.name && item.name === path)
          );
          
          // If not found, try to match by extracting the movie name from the full path
          if (!movieObj) {
            console.log('[DEBUG-FAVORITES-MOVIES] Path format:', path);
            
            // Check if path contains file separators (full path) or is just a title
            if (path.includes('\\') || path.includes('/')) {
              // Full path - extract folder name
              const pathParts = path.split(/[\\/]/);
              const movieFolderName = pathParts[pathParts.length - 2]; // Get the folder name (e.g., "20,000 Leagues Under The Sea (1954)")
              console.log('[DEBUG-FAVORITES-MOVIES] Full path detected, folder name:', movieFolderName);
              
              if (movieFolderName) {
                // Show what we're trying to match against
                console.log('[DEBUG-FAVORITES-MOVIES] Available titles for matching:', favorites.movies.map(m => m.title || m.TMDBTitle || m.name || 'NO_TITLE'));
                
                movieObj = favorites.movies.find(item => {
                  const itemTitle = item.title || item.TMDBTitle || item.name || '';
                  
                  // Convert folder name to normalized format (like your internal format)
                  const normalizedFolderName = movieFolderName.toLowerCase()
                    .replace(/[^\w\s()]/g, '')  // Remove special chars but keep parentheses
                    .replace(/\s+/g, '.');      // Replace spaces with dots
                  
                  console.log('[DEBUG-FAVORITES-MOVIES] Looking for normalized title:', normalizedFolderName);
                  console.log('[DEBUG-FAVORITES-MOVIES] Comparing with stored title:', itemTitle);
                  
                  // Direct match with normalized format
                  if (itemTitle.toLowerCase() === normalizedFolderName) {
                    console.log('[DEBUG-FAVORITES-MOVIES] Normalized title match found:', itemTitle);
                    return true;
                  }
                  
                  // Also try the original folder name for backward compatibility
                  if (itemTitle.toLowerCase() === movieFolderName.toLowerCase()) {
                    console.log('[DEBUG-FAVORITES-MOVIES] Direct title match found:', itemTitle);
                    return true;
                  }
                  
                  return false;
                });
              }
            } else {
              // Just a title - try direct title matching
              console.log('[DEBUG-FAVORITES-MOVIES] Title-only path detected, trying direct title match');
              console.log('[DEBUG-FAVORITES-MOVIES] Looking for title:', path);
              
              movieObj = favorites.movies.find(item => {
                const itemTitle = item.title || item.TMDBTitle || item.name || '';
                console.log('[DEBUG-FAVORITES-MOVIES] Comparing with stored title:', itemTitle);
                
                // Direct title match
                if (itemTitle.toLowerCase() === path.toLowerCase()) {
                  console.log('[DEBUG-FAVORITES-MOVIES] Direct title match found:', itemTitle);
                  return true;
                }
                
                return false;
              });
            }
          }
          
          if (movieObj) {
            // On Favorites page, clicking the heart should REMOVE the item
            // Toggle the heart icon immediately for instant visual feedback
            favoriteBtn.textContent = "🤍";
            favoriteBtn.title = "Add to Favorites";
            console.log("[DEBUG-FAVORITES-MOVIES] Removing movie from favorites, heart icon toggled to white");
            console.log("[DEBUG-FAVORITES-MOVIES] Movie object being removed:", movieObj);
            
            // Remove from favorites
            this.toggleFavorite(movieObj, "movie");
            
            // Remove the card from the DOM immediately for instant visual feedback
            card.remove();
          } else {
            console.warn('[DEBUG-FAVORITES-MOVIES] Could not find movie object for path:', path);
            console.warn('[DEBUG-FAVORITES-MOVIES] This might be an older entry with different data format');
            
            // Try to find any movie with similar title as fallback
            const fallbackMatch = favorites.movies.find(item => {
              const itemTitle = item.title || item.TMDBTitle || item.name || '';
              const cardTitle = card.getAttribute('data-title') || '';
              return itemTitle.toLowerCase().includes(cardTitle.toLowerCase()) || 
                     cardTitle.toLowerCase().includes(itemTitle.toLowerCase());
            });
            
            if (fallbackMatch) {
              console.log('[DEBUG-FAVORITES-MOVIES] Found fallback match:', fallbackMatch);
              console.log("[DEBUG-FAVORITES-MOVIES] Removing movie using fallback match");
              
              // Remove from favorites
              this.toggleFavorite(fallbackMatch, "movie");
              
              // Remove the card from the DOM immediately for instant visual feedback
              card.remove();
            } else {
              console.error('[DEBUG-FAVORITES-MOVIES] No fallback match found, skipping this item');
            return;
            }
          }
          
          return false;
        };
      }
      // Attach card click handler for playing movies
      card.onclick = (e) => {
        console.log('🚨 [DEBUG - FAVORITES-CARD] ====== CLICK HANDLER TRIGGERED ======');
        console.log('[DEBUG - FAVORITES-CARD] Favorites movie card clicked for path:', path);
        console.log('[DEBUG - FAVORITES-CARD] Event target:', e.target);
        console.log('[DEBUG - FAVORITES-CARD] Event type:', e.type);
        
        if (
          e.target.closest(".movie-favorite-btn") ||
          e.target.closest(".poster-selector-btn") ||
          e.target.closest(".collection-btn")
        ) {
          console.log('[DEBUG - FAVORITES-CARD] Click blocked - action button clicked');
          return; // Don't trigger for action buttons
        }
          
        // Get the title from the data attribute
        const title = card.getAttribute("data-title");
        console.log('[DEBUG - FAVORITES] Using title from data attribute:', title);
        console.log('[DEBUG - FAVORITES] About to call playMovieFromFavorites with:', {path, title});
        
        // Use the new playMovieFromFavorites method
        this.playMovieFromFavorites(path, title);
      };
    });
    // Attach click handlers for TV show favorites
    document
      .querySelectorAll(".media-library-movie-card-tvshows")
      .forEach((card) => {
        const path = card.getAttribute("data-path");
        // console.log('[DEBUG - FAVORITES] Attaching TV show handler for:', path);
        // Attach favorite button handler - specifically target TV show favorite buttons
        const favoriteBtn = card.querySelector(".tv-favorite-btn");
        console.log(`[DEBUG - FAVORITES] TV card - Found tv-favorite-btn:`, !!favoriteBtn);
        if (favoriteBtn) {
          favoriteBtn.onclick = (e) => {
            console.log("🚨 [DEBUG - FAVORITES-TV-CLICK] TV show heart button clicked!");
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // On Favorites page, clicking the heart should REMOVE the item
            console.log('[DEBUG - FAVORITES] Removing TV show from favorites:', path);
            const favorites = this.getFavoritesList();
            console.log('[DEBUG - FAVORITES] Available favorites TV shows:', favorites.tvshows.map(t => ({ path: t.path, absPath: t.absPath, normalizedKey: t.normalizedKey, name: t.name })));
            
              const tvShowObj = favorites.tvshows.find(item => 
                (item.path && item.path === path) || 
              (item.absPath && item.absPath === path) ||
              (item.normalizedKey && item.normalizedKey === path) ||
              (item.title && item.title === path) ||
              (item.TMDBTitle && item.TMDBTitle === path) ||
              (item.name && item.name === path)
            );
            
              if (tvShowObj) {
              // Toggle the heart icon immediately for instant visual feedback
              favoriteBtn.textContent = "🤍";
              favoriteBtn.title = "Add to Favorites";
              console.log("[DEBUG - FAVORITES-TV-HEART] Removing TV show from favorites, heart icon toggled to white");
              console.log("[DEBUG - FAVORITES-TV-HEART] TV show object being removed:", tvShowObj);
              
              // Remove from favorites
                this.toggleFavorite(tvShowObj, "tvshow");
              
              // Remove the card from the DOM immediately for instant visual feedback
              card.remove();
            } else {
              console.warn('[DEBUG - FAVORITES] Could not find TV show object for path:', path);
              console.warn('[DEBUG - FAVORITES] This might be an older entry with different data format');
              
              // Try to find any TV show with similar title as fallback
              const fallbackMatch = favorites.tvshows.find(item => {
                const itemTitle = item.title || item.TMDBTitle || item.name || '';
                const cardTitle = card.querySelector('.media-library-tvshow-title')?.textContent || '';
                return itemTitle.toLowerCase().includes(cardTitle.toLowerCase()) || 
                       cardTitle.toLowerCase().includes(itemTitle.toLowerCase());
              });
              
              if (fallbackMatch) {
                console.log('[DEBUG - FAVORITES] Found fallback match for TV show:', fallbackMatch);
                console.log("[DEBUG - FAVORITES-TV-HEART] Removing TV show using fallback match");
                
                // Remove from favorites
                this.toggleFavorite(fallbackMatch, "tv");
                
                // Remove the card from the DOM immediately for instant visual feedback
                card.remove();
              } else {
                console.error('[DEBUG - FAVORITES] No fallback match found for TV show, skipping this item');
              }
            }
            
            return false;
          };
        }
        // Attach card click handler for opening TV shows
        card.onclick = async (e) => {
          if (
            e.target.closest(".tv-favorite-btn") ||
            e.target.closest(".poster-selector-btn") ||
            e.target.closest(".collection-btn")
          )
            return; // Don't trigger for action buttons
          console.log(
            "[DEBUG - FAVORITES-HANDLERS] Opening TV show from favorites:",
            path
          );
          // Extract the TV show path from the episode path (same logic as showFavoritesModal)
          let showPath = "";
          if (path.includes("\\Season ") || path.includes("/Season ")) {
            // Extract the TV show name (the directory name before "Season")
            const pathParts = path.split(/[\\/]/);
            const seasonIndex = pathParts.findIndex((part) =>
              part.toLowerCase().startsWith("season")
            );
            if (seasonIndex > 0) {
              const showName = pathParts[seasonIndex - 1];
              // Add tvshows/ prefix to match the data structure
              showPath = `tvshows/${showName}`;
              console.log(
                "[DEBUG - FAVORITES-HANDLERS] Extracted show name and added prefix:",
                path,
                "->",
                showPath
              );
            }
          } else {
            // If no season in path, use the last directory name with prefix
            const pathParts = path.split(/[\\/]/);
            const showName = pathParts[pathParts.length - 1];
            showPath = `tvshows/${showName}`;
          }
          console.log(
            "[DEBUG - FAVORITES-HANDLERS] Final showPath for openTVShow:",
            showPath
          );
          // Switch to TV shows tab first, then open the specific show with the correct path
          this.currentTab = "tvshows";
          this.currentTabFlag = "tvshows"; // Update the flag as well
          this.openTVShow(showPath);
        };
      });
  }
  attachCollectionHandlers() {
    // console.log('[DEBUG] Attaching collection handlers');
    // Attach click handlers for collection buttons
    document
      .querySelectorAll(".collection-btn[data-collection]")
      .forEach((btn) => {
        const collectionName = btn.getAttribute("data-collection");
        btn.onclick = () => {
          // console.log('[DEBUG - COLLECTIONS] Opening collection:', collectionName);
          this.currentCollectionView = collectionName;
          this.renderModal();
        };
      });
    // Attach click handlers for back button
    const backBtn = document.getElementById("backToCollectionsBtn");
    if (backBtn) {
      backBtn.onclick = () => {
        // console.log('[DEBUG - COLLECTIONS] Going back to collections list');
        this.currentCollectionView = null;
        this.renderModal();
      };
    }
    // Attach click handlers for delete button
    const deleteBtn = document.getElementById("deleteCollectionBtn");
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        // console.log('[DEBUG - COLLECTIONS] Deleting collection:', this.currentCollectionView);
        // Create custom confirmation modal
        const modal = document.createElement("div");
        modal.className = "collection-modal-overlay";
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
        const cancelBtn = modal.querySelector(".collection-modal-btn-cancel");
        const confirmBtn = modal.querySelector(".collection-modal-btn-confirm");
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
            this.showToast("Collection deleted!");
            this.renderModal();
            closeModal();
          } catch (error) {
            console.error(
              "[DEBUG - COLLECTIONS] Error deleting collection:",
              error
            );
            this.showToast("Error deleting collection", "error");
          }
        };
        // Close on overlay click
        modal.onclick = (e) => {
          if (e.target === modal) closeModal();
        };
      };
    }
    // Attach click handlers for movie cards in collections
    document.querySelectorAll(".media-library-movie-card").forEach((card) => {
      const path = card.getAttribute("data-path");
      if (path) {
        // Attach favorite button handler - specifically target movie favorite buttons
        const favoriteBtn = card.querySelector(".favorites-only-heart-btn-movie");
        if (favoriteBtn) {
          favoriteBtn.onclick = (e) => {
            e.stopPropagation();
            this.toggleFavorite(path, "movie");
          };
        }
        // Attach card click handler for playing movies
        card.onclick = (e) => {
          if (
            e.target.closest(".favorites-only-heart-btn") ||
            e.target.closest(".favorites-only-heart-btn-movie") ||
            e.target.closest(".poster-selector-btn") ||
            e.target.closest(".collection-btn")
          ) {
            return; // Don't trigger for action buttons
          }
          const movie = this.mediaLibraryRaw.find((item) => item.path === path);
          if (movie) {
            // console.log('[DEBUG - COLLECTIONS] Playing movie from collection:', movie.title);
            this.playMedia(movie);
          }
        };
      }
    });
  }
  updateHeartIcons() {
    // console.log('[DEBUG - HEART ICONS] Updating heart icons...');
    
    // Get current favorites list
    const favorites = this.getFavoritesList();
    // console.log('[DEBUG - HEART ICONS] Current favorites - Movies:', favorites.movies.length, 'TV Shows:', favorites.tvshows.length);
    
    // Update heart icons for TV show cards in TV-Shows tab
    const tvHearts = document.querySelectorAll(
      ".media-library-tv-show-card .tv-favorite-btn"
    );
    // console.log('[DEBUG - HEART ICONS] Found TV show heart buttons:', tvHearts.length);
    tvHearts.forEach((btn) => {
      const card = btn.closest(".media-library-tv-show-card");
      const path = card ? card.getAttribute("data-path") : null;
      if (path) {
        const isFav = favorites.tvshows.some(item => 
          (item.normalizedKey && item.normalizedKey === path) ||
          (item.path && item.path === path) || 
          (item.absPath && item.absPath === path)
        );
        btn.textContent = isFav ? "❤️" : "🤍";
        btn.title = isFav ? "Remove from Favorites" : "Add to Favorites";
        // console.log('[DEBUG - HEART ICONS] TV show heart updated:', path, 'isFavorite:', isFav, 'heart:', btn.textContent);
      } else {
        console.warn('[DEBUG - HEART ICONS] No path found for TV show heart button');
      }
    });
    // Update heart icons for movie cards in Movies tab
    const movieHearts = document.querySelectorAll(
      ".media-library-movie-card .movie-favorite-btn"
    );
    // console.log('[DEBUG - HEART ICONS] Found movie heart buttons:', movieHearts.length);
    movieHearts.forEach((btn, index) => {
      const card = btn.closest(".media-library-movie-card");
      const path = card ? card.getAttribute("data-path") : null;
      // console.log(`[DEBUG - HEART ICONS] Processing movie heart ${index}:`, { 
      //   path, 
      //   card: !!card, 
      //   btnText: btn.textContent,
      //   cardElement: card,
      //   cardAttributes: card ? Array.from(card.attributes).map(attr => `${attr.name}="${attr.value}"`) : null
      // });
      if (path) {
        const isFav = favorites.movies.some(item => 
          (item.normalizedKey && item.normalizedKey === path) ||
          (item.path && item.path === path) || 
          (item.absPath && item.absPath === path)
        );
        btn.textContent = isFav ? "❤️" : "🤍";
        btn.title = isFav ? "Remove from Favorites" : "Add to Favorites";
        // console.log('[DEBUG - HEART ICONS] Movie heart updated:', path, 'isFavorite:', isFav, 'heart:', btn.textContent);
      } else {
        // console.log('[DEBUG - HEART ICONS] No path found for movie heart button');
      }
    });
    // Update heart icons for favorites cards (these should always be red since they're in favorites)
    // Handle both movie and TV show favorites with their distinct classes
    const favoritesMovieHearts = document.querySelectorAll(
      ".media-library-favorites .movie-favorite-btn"
    );
    const favoritesTVHearts = document.querySelectorAll(
      ".media-library-favorites .tv-favorite-btn"
    );
    const allFavoritesHearts = [...favoritesMovieHearts, ...favoritesTVHearts];
    
    console.log('[DEBUG - HEART ICONS] Found favorites tab heart buttons:', allFavoritesHearts.length, '(Movies:', favoritesMovieHearts.length, 'TV:', favoritesTVHearts.length, ')');
    
    allFavoritesHearts.forEach((btn) => {
        const card = btn.closest("[data-path]");
        const path = card ? card.getAttribute("data-path") : null;
        if (path) {
          btn.textContent = "❤️";
          btn.title = "Remove from Favorites";
          console.log('[DEBUG - HEART ICONS] Favorites tab heart updated:', path, 'heart:', btn.textContent);
        }
      });
    
    // console.log('[DEBUG - HEART ICONS] Heart icon update complete');
    
    // DEBUG: Show current favorites state
    // console.log('[DEBUG - HEART ICONS] Current favorites state:', {
    //   movies: favorites.movies.length,
    //   tvshows: favorites.tvshows.length,
    //   moviePaths: favorites.movies.map(m => m.path || m.absPath).slice(0, 3),
    //   tvShowPaths: favorites.tvshows.map(t => t.path || t.absPath).slice(0, 3)
    // });
  }
  
  // DEBUG: Add debug function to window for testing
  debugHeartSystem() {
    console.log('🔍 [DEBUG - HEART SYSTEM] Debugging heart system...');
    
    // Check current favorites
    const favorites = this.getFavoritesList();
    console.log('[DEBUG - HEART SYSTEM] Current favorites:', favorites);
    
    // Check TV show hearts
    const tvHearts = document.querySelectorAll(".media-library-tv-show-card .tv-favorite-btn");
    console.log('[DEBUG - HEART SYSTEM] Found TV show hearts:', tvHearts.length);
    
    // Check movie hearts
    const movieHearts = document.querySelectorAll(".media-library-movie-card .movie-favorite-btn");
    console.log('[DEBUG - HEART SYSTEM] Found movie hearts:', movieHearts.length);
    
    // Force update hearts
    this.updateHeartIcons();
    
    console.log('[DEBUG - HEART SYSTEM] Heart system debug complete');
  }
  renderSuggestionsContent() {
    return '<div class="media-library-suggestions-placeholder"><h3>Suggestions coming soon...</h3></div>';
  }
  // --- UTILITY METHODS ---
  filterItems(items, searchTerm) {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.title && item.title.toLowerCase().includes(term)) ||
        (item.filename && item.filename.toLowerCase().includes(term)) ||
        (item.path && item.path.toLowerCase().includes(term)) ||
        (item.TMDBTitle && item.TMDBTitle.toLowerCase().includes(term))
    );
  }
  sortItems(items, sortBy, field = "name") {
    if (!items || items.length === 0) return items;
    return items.slice().sort((a, b) => {
      const aValue = (a[field] || "").toString().toLowerCase();
      const bValue = (b[field] || "").toString().toLowerCase();
      if (sortBy === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  }
  cleanTVShowTitle(title) {
    if (!title || typeof title !== "string") return "";
    // For TV shows, extract just the show name for clean UI display
    // Remove year and quality info for user-friendly display
    let name = title.trim();
    // Remove (year) and [quality] info for display
    name = name.replace(/\((19|20)\d{2}\)/g, ""); // Remove (2021)
    name = name.replace(/\[\d{3,4}p\]/gi, ""); // Remove [1080p], [720p], etc.
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
      console.error(
        "[MEDIA-LIBRARY] NormalizationService not loaded - this should not happen!"
      );
      return '<div class="error">NormalizationService not available</div>';
    }
    const sortedShows = this.getFilteredAndSortedItems();
    const addedAnchors = new Set();
    let html = '<div class="media-library-tv-show-grid">';
    sortedShows.forEach((show) => {
      // Always use humanized titles for display
      let displayTitle = this.humanizeTVShowTitle(
          show.name || show.title || show.filename || show.path || ""
        );
      const firstLetter = displayTitle.charAt(0).toUpperCase();
      let anchorAttr = "";
      if (!addedAnchors.has(firstLetter)) {
        anchorAttr = ` data-anchor="${firstLetter}"`;
        addedAnchors.add(firstLetter);
      }
      html += `
                <div class="media-library-tv-show-card"${anchorAttr} data-path="${show.path}" data-show-name="${show.name || show.title || ""}" data-normalized-key="${show.normalizedKey || ""}">
                  <div class="media-card-actions-tvshows">
                    <button class="tv-poster-selector-btn" title="Change TV Show Poster">📺</button>
                    <button class="tv-favorite-btn" title="Toggle TV Show Favorite">${this.isFavorite(show.path) ? "❤️" : "🤍"}</button>
                    <button class="tv-collection-btn" title="Add TV Show to Collection" data-path="${show.normalizedKey || show.path}">📁</button>
                  </div>
                  <img class="media-library-poster poster" src="${this.getPosterPath(show)}" alt="${show.name}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                  <div class="media-info"><h3 class="media-library-tvshow-title">${displayTitle}</h3></div>
                </div>
            `;
    });
    html += "</div>";
    // Insert the A-Z sidebar inside the grid container
    html = `<div class="media-library-grid-container">
            <div id="mediaLibraryAZSidebar" class="media-library-az-sidebar"></div>
            ${html}
        </div>`;
    
    // Note: updateCollectionButtons() will be called after this HTML is inserted into the DOM
    // in the openMediaBrowser method, so we don't need to call it here
    
    return html;
  }
  closeModal() {
    // Remove the modal from the DOM
    const modal = document.querySelector(".media-library-modal");
    if (modal) modal.remove();
    
    // Remove the overlay from the DOM
    const overlay = document.querySelector(".media-library-overlay");
    if (overlay) overlay.remove();
  }
  // --- TV SHOW DATE EXTRACTION ---
  getDateForTvShow(episodeObj) {
    console.log(
      "[DEBUG - GET-DATE-FOR-TV-SHOW] Getting date for episode:",
      episodeObj.path || episodeObj.relPath || episodeObj.filePath
    );
    // Use the same logic as the video player's extractEpisodeInfo method
    const filePath =
      episodeObj.filePath ||
      episodeObj.absPath ||
      episodeObj.path ||
      episodeObj.relPath ||
      "";
    console.log("[DEBUG - GET-DATE-FOR-TV-SHOW] Using file path:", filePath);
    if (!filePath) {
      console.log("[DEBUG - GET-DATE-FOR-TV-SHOW] No file path available");
      return null;
    }
    const path = filePath.replace(/\\/g, "/"); // Normalize path separators
    // Extract show name from TV-SHOWS directory structure (same as video player)
    const tvShowsMatch = path.match(/TV[-_]SHOWS?[\/\\]([^\/\\]+)/i);
    let showYear = null;
    if (tvShowsMatch) {
      const folderName = tvShowsMatch[1];
      console.log(
        "[DEBUG - GET-DATE-FOR-TV-SHOW] Raw folder name:",
        folderName
      );
      // Extract year from folder name if present (same as video player)
      const yearMatch = folderName.match(/\((\d{4})\)/);
      if (yearMatch) {
        showYear = yearMatch[1];
        console.log(
          "[DEBUG - GET-DATE-FOR-TV-SHOW] Found year in folder name:",
          showYear
        );
      } else {
        console.log(
          "[DEBUG - GET-DATE-FOR-TV-SHOW] No year found in folder name"
        );
      }
    } else {
      console.log(
        "[DEBUG - GET-DATE-FOR-TV-SHOW] No TV-SHOWS directory found in path"
      );
    }
    return showYear;
  }
  // --- WATCH LATER / RESUME LOGIC ---
  
  // Helper function to convert absolute paths to relative paths for TV shows
  convertToRelativePath(path) {
    if (!path) return path;
    
    // Convert absolute Windows paths to relative paths
    if (path.startsWith("S:/MEDIA/TV-SHOWS/") || path.startsWith("S:\\MEDIA\\TV-SHOWS\\")) {
      return path.replace(/^S:[\/\\]MEDIA[\/\\]TV-SHOWS[\/\\]/i, "");
    }
    
    // Convert absolute Linux/Mac paths to relative paths
    if (path.startsWith("/media/")) {
      return path.replace(/^\/media\//, "");
    }
    
    // Handle Windows backslashes
    if (path.includes("\\")) {
      return path.replace(/\\/g, "/");
    }
    
    return path;
  }
  
  // Function to clean up existing Watch Later items with absolute paths
  async cleanupWatchLaterPaths() {
    try {
      const resumeList = JSON.parse(
        localStorage.getItem("mediaLibraryResumeList") || "[]"
      );
      
      let hasChanges = false;
      
      for (let item of resumeList) {
        if (item.type === "tvshow" && item.path) {
          const oldPath = item.path;
          const newPath = this.convertToRelativePath(oldPath);
          
          if (oldPath !== newPath) {
            console.log(`[WATCH-LATER-CLEANUP] Converting path: ${oldPath} → ${newPath}`);
            item.path = newPath;
            item.filePath = newPath; // Update filePath for API compatibility
            hasChanges = true;
          }
        }
      }
      
      if (hasChanges) {
        localStorage.setItem("mediaLibraryResumeList", JSON.stringify(resumeList));
        console.log("[WATCH-LATER-CLEANUP] Updated existing Watch Later items with relative paths");
        
        // Also update MongoDB if available
        for (let item of resumeList) {
          if (item.mediaId && item.mediaType) {
            try {
              await this.saveToMongoDB(item);
            } catch (error) {
              console.warn("[WATCH-LATER-CLEANUP] Could not update MongoDB:", error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error("[WATCH-LATER-CLEANUP] Error cleaning up paths:", error);
    }
  }
  
  async saveResumeProgress(
    mediaItem,
    currentTime,
    duration,
    isManualSave = false
  ) {
    console.log("[MEDIA-LIBRARY] saveResumeProgress called:", {
      mediaItem,
      currentTime,
      duration,
      isManualSave,
    });
    
    // Validate input
    if (!mediaItem) {
      console.error("[MEDIA-LIBRARY] saveResumeProgress: No mediaItem provided");
      return;
    }
    
    if (!mediaItem.path && !mediaItem.absPath && !mediaItem.relPath) {
      console.error("[MEDIA-LIBRARY] saveResumeProgress: No path found in mediaItem:", mediaItem);
      return;
    }
    try {
      // Get current resume list from localStorage
      let resumeList = JSON.parse(
        localStorage.getItem("mediaLibraryResumeList") || "[]"
      );
      // Determine if this is a TV show by checking the path (do this BEFORE duplicate removal)
      const pathToCheck = (
        mediaItem.path ||
        mediaItem.absPath ||
        mediaItem.relPath ||
        ""
      ).toLowerCase();
      // Use the type field as the primary method - it's the most reliable!
      console.log('[DEBUG-SAVE] MediaItem received for saveResumeProgress:', {
        title: mediaItem.title,
        type: mediaItem.type,
        mediaType: mediaItem.mediaType,
        path: mediaItem.path,
        absPath: mediaItem.absPath
      });
      console.log('[DEBUG-SAVE] Full mediaItem object:', mediaItem);
      
      // Look up the media item in unified data first
      let unifiedItem = null;
      let isTVShow = false;
      
      if (this.unifiedData) {
        console.log('[DEBUG-SAVE] Looking for unified item for:', {
          title: mediaItem.title,
          name: mediaItem.name,
          path: mediaItem.path,
          absPath: mediaItem.absPath
        });
        
        // Try to find the item in unified data by multiple criteria
        for (const key in this.unifiedData) {
          const unified = this.unifiedData[key];
          
          // Check if this is the right item by path matching
          const mediaPath = (mediaItem.path || mediaItem.absPath || "").replace(/\\/g, "/");
          const unifiedPath = (unified.path || "").replace(/\\/g, "/");
          
          console.log('[DEBUG-SAVE] Checking path match:', {
            key,
            mediaPath,
            unifiedPath,
            match: mediaPath && unifiedPath && mediaPath === unifiedPath
          });
          
          if (mediaPath && unifiedPath && mediaPath === unifiedPath) {
            unifiedItem = unified;
            isTVShow = unified.type === "tvshow";
            console.log('[DEBUG-SAVE] Found unified item by path:', key, 'isTVShow:', isTVShow);
            break;
          }
          
          // For TV shows, also check if the mediaItem path matches any episode path
          if (unified.type === "tvshow" && unified.seasons && mediaPath) {
            let foundEpisode = false;
            for (const seasonKey in unified.seasons) {
              const season = unified.seasons[seasonKey];
              if (season.episodes) {
                for (const episodeKey in season.episodes) {
                  const episode = season.episodes[episodeKey];
                  const episodePath = (episode.path || episode.absPath || "").replace(/\\/g, "/");
                  
                  if (episodePath && mediaPath === episodePath) {
                    unifiedItem = unified;
                    isTVShow = true;
                    console.log('[DEBUG-SAVE] Found unified item by episode path:', key, 'episode:', episodeKey, 'season:', seasonKey);
                    foundEpisode = true;
                    break;
                  }
                }
              }
              if (foundEpisode) break;
            }
            if (foundEpisode) break;
          }
          
          // Also check by title matching
          if (mediaItem.title && unified.TMDBTitle && 
              mediaItem.title.toLowerCase() === unified.TMDBTitle.toLowerCase()) {
            unifiedItem = unified;
            isTVShow = unified.type === "tvshow";
            console.log('[DEBUG-SAVE] Found unified item by title:', key, 'isTVShow:', isTVShow);
            break;
          }
          
          // Special case for Jupiter's Legacy - check if the mediaItem contains "Jupiter's Legacy"
          if (mediaItem.name && mediaItem.name.includes("Jupiter's Legacy") && 
              key === "jupiters.legacy.(2021)") {
            unifiedItem = unified;
            isTVShow = unified.type === "tvshow";
            console.log('[DEBUG-SAVE] Found Jupiter\'s Legacy by special case match:', key, 'isTVShow:', isTVShow);
            break;
          }
        }
      }
      
      // Fallback: if not found in unified data, use original detection logic
      if (!unifiedItem) {
        console.log('[DEBUG-SAVE] No unified item found, using fallback detection');
        isTVShow = mediaItem.type === "tvshow" || mediaItem.mediaType === "tvshow";
        
        if (!isTVShow && !mediaItem.type && !mediaItem.mediaType) {
          const pathToCheck = (
            mediaItem.path ||
            mediaItem.absPath ||
            mediaItem.relPath ||
            ""
          ).toLowerCase();
          
          // Check for TV show indicators in path
          if (
            pathToCheck.includes("tvshows") ||
            pathToCheck.includes("tv_shows") ||
            pathToCheck.includes("tv shows") ||
            pathToCheck.includes("season") ||
            pathToCheck.match(/s\d+e\d+/i) || // Season/Episode pattern
            pathToCheck.match(/s\d{2}/i) // Season pattern
          ) {
            isTVShow = true;
            console.log('[DEBUG-SAVE] Detected TV show from path analysis (no unified data found):', pathToCheck);
          }
        }
      }
      
      console.log('[DEBUG-SAVE] isTVShow result:', isTVShow);
      console.log('[DEBUG-SAVE] Path analysis:', {
        pathToCheck: pathToCheck,
        hasTVShowsPath: pathToCheck.includes("tvshows"),
        hasSeason: pathToCheck.includes("season"),
        hasSeasonEpisode: pathToCheck.match(/s\d+e\d+/i),
        hasSeasonPattern: pathToCheck.match(/s\d{2}/i)
      });
      // For TV shows, find and remove any existing entry to ensure we always overwrite
      // This ensures there's only ONE entry per TV show with the most up-to-date resume time
      // For movies, we'll handle duplicates differently
      let existingItem = null;
      if (isTVShow) {
        // For TV shows, find existing entry by multiple criteria to ensure we catch all variations
        existingItem = resumeList.find((item) => {
          // Check by path first
          const itemPath = (item.path || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const mediaPath = (mediaItem.path || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          if (itemPath === mediaPath && itemPath !== "") {
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
            if (
              mediaShowName &&
              itemShowName &&
              mediaShowName.toLowerCase() === itemShowName.toLowerCase() &&
              mediaSeason === itemSeason &&
              mediaEpisode === itemEpisode
            ) {
              return true;
            }
          }
          return false;
        });
        // Remove the existing TV show entry if found
        if (existingItem) {
          resumeList = resumeList.filter((item) => item !== existingItem);
          console.log(
            "[MEDIA-LIBRARY] Removed existing TV show entry for overwrite:",
            existingItem.title
          );
          // Also remove from MongoDB to ensure complete cleanup
          if (existingItem.mediaId && existingItem.mediaType) {
            try {
              await this.removeFromMongoDB(
                existingItem.mediaId,
                existingItem.mediaType
              );
              console.log(
                "[MEDIA-LIBRARY] Removed existing TV show from MongoDB:",
                existingItem.mediaId
              );
            } catch (error) {
              console.warn(
                "[MEDIA-LIBRARY] Could not remove from MongoDB (this is okay):",
                error.message
              );
            }
          }
        }
      } else {
        // For movies, use the SAME overwrite behavior as TV shows - ensure only ONE entry per movie
        existingItem = resumeList.find((item) => {
          // Check by path first
          const itemPath = (item.path || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          const mediaPath = (mediaItem.path || "")
            .replace(/\\/g, "/")
            .toLowerCase()
            .trim();
          if (itemPath === mediaPath && itemPath !== "") {
            return true;
          }
          // Check by title for movies
          if (mediaItem.title && item.title) {
            const itemTitle = item.title.toLowerCase().trim();
            const mediaTitle = mediaItem.title.toLowerCase().trim();
            if (itemTitle === mediaTitle) {
              return true;
            }
          }
          // Check by normalizedKey if available
          if (mediaItem.normalizedKey && item.normalizedKey && 
              mediaItem.normalizedKey === item.normalizedKey) {
            return true;
          }
          return false;
        });
        // Remove the existing movie entry if found
        if (existingItem) {
          resumeList = resumeList.filter((item) => item !== existingItem);
          console.log(
            "[MEDIA-LIBRARY] Removed existing movie entry for overwrite:",
            existingItem.title
          );
          // Also remove from MongoDB to ensure complete cleanup
          if (existingItem.mediaId && existingItem.mediaType) {
            try {
              await this.removeFromMongoDB(
                existingItem.mediaId,
                existingItem.mediaType
              );
              console.log(
                "[MEDIA-LIBRARY] Removed existing movie from MongoDB:",
                existingItem.mediaId
              );
            } catch (error) {
              console.warn(
                "[MEDIA-LIBRARY] Could not remove from MongoDB (this is okay):",
                error.message
              );
            }
          }
        }
      }
      let savePath = mediaItem.path || mediaItem.absPath || mediaItem.relPath;
      // For TV-Shows, ensure we have the correct path format
      if (isTVShow && savePath) {
        // Convert absolute paths to relative paths for Watch Later compatibility
        savePath = this.convertToRelativePath(savePath);
      }
      // If path is missing, try to look up from main media library by filename or title
      if (
        !savePath &&
        this.mediaLibrary &&
        (mediaItem.title || mediaItem.name)
      ) {
        const filename = (mediaItem.title || mediaItem.name)
          .split(/[\\/]/)
          .pop();
        const found = this.mediaLibrary.find((item) => {
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
      if (isManualSave || duration - currentTime > 60) {
        // For TV shows, we already found and removed the existing item above
        // For movies, we need to check if an item exists to preserve its timestamp
        if (!isTVShow) {
          const existingMovieItem = resumeList.find((item) => {
            const itemPath = (item.path || "")
              .replace(/\\/g, "/")
              .toLowerCase()
              .trim();
            const mediaPath = (savePath || "")
              .replace(/\\/g, "/")
              .toLowerCase()
              .trim();
            return itemPath === mediaPath && itemPath !== "";
          });
          if (existingMovieItem) {
            existingItem = existingMovieItem;
          }
        }
        let savedItem;
        // For movies, save the COMPLETE movie object (just like main Movies section)
        // Movies can have multiple entries if they're from different sources
        if (!isTVShow) {
          console.log('[DEBUG-SAVE] Taking MOVIE branch for:', mediaItem.title);
          // Ensure normalizedKey is available for the movie - look it up from unified data
          let normalizedKey = mediaItem.normalizedKey;
          
          // If no normalizedKey, try to find the correct one from unified data
          if (!normalizedKey && this.unifiedData) {
            // Try to find the movie in unified data by multiple criteria
            for (const key in this.unifiedData) {
              const unifiedMovie = this.unifiedData[key];
              if (unifiedMovie.isMovie) {
                let matchFound = false;
                
                // 1. Match by exact path
                if (mediaItem.path && unifiedMovie.path && 
                    mediaItem.path.replace(/\\/g, "/") === unifiedMovie.path.replace(/\\/g, "/")) {
                  matchFound = true;
                }
                // 2. Match by title (case-insensitive)
                else if (mediaItem.title && unifiedMovie.title && 
                         mediaItem.title.toLowerCase() === unifiedMovie.title.toLowerCase()) {
                  matchFound = true;
                }
                // 3. Match by TMDBTitle (case-insensitive)
                else if (mediaItem.title && unifiedMovie.TMDBTitle && 
                         mediaItem.title.toLowerCase() === unifiedMovie.TMDBTitle.toLowerCase()) {
                  matchFound = true;
                }
                // 4. Match by extracted folder name from path
                else if (mediaItem.path && unifiedMovie.title) {
                  const movieFolderName = mediaItem.path.split(/[\\/]/).pop();
                  if (movieFolderName && unifiedMovie.title.toLowerCase().includes(movieFolderName.toLowerCase())) {
                    matchFound = true;
                  }
                }
                
                if (matchFound) {
                  normalizedKey = key;
                  console.log(`[WATCH-LATER SAVE] Found matching movie in unified data: "${key}" for "${mediaItem.title}"`);
                  break;
                }
              }
            }
          }
          
          // If still no normalizedKey, fallback to generating one from title
          if (!normalizedKey && mediaItem.title) {
            const cleanTitle = mediaItem.title.replace(/\s*\[[^\]]+\]\s*/g, ''); // Remove quality labels
            normalizedKey = window.normalizeKey ? window.normalizeKey(cleanTitle) : this.createFallbackNormalizedKey(cleanTitle);
            console.log(`[WATCH-LATER SAVE] Generated fallback normalizedKey: "${normalizedKey}" for "${mediaItem.title}"`);
          }
          
          // Use unified data if available, otherwise fall back to mediaItem
          const baseItem = unifiedItem || mediaItem;
          
          savedItem = {
            // === COMPLETE UNIFIED DATA STRUCTURE ===
            // Start with the complete unified object (has all the correct data)
            ...baseItem,
            
            // === WATCH LATER SPECIFIC OVERRIDES ===
            // Override/add Watch Later specific properties
            currentTime,
            duration,
            lastWatched: existingItem ? existingItem.lastWatched : Date.now(),
            type: "movie",
            mediaType: "movie", // For MongoDB compatibility
            
            // Generate mediaId for MongoDB
            mediaId: this.generateMediaId(baseItem, "movie"),
            
            // Ensure path is present
            path: savePath,
            filePath: savePath, // For MongoDB compatibility
            fileName: savePath
              ? savePath.split(/[\\/]/).pop()
              : baseItem.title || "Unknown",
            
            // Ensure absPath is present for movies - construct full path for proper playback
            absPath: baseItem.absPath || 
                     (baseItem.files && baseItem.files.length > 0 ? baseItem.files[0].absPath : null) ||
                     (savePath.startsWith("S:/") ? savePath : `S:/MEDIA/MOVIES/${savePath}`),
            
            // === PRESERVE ALL UNIFIED DATA FIELDS ===
            // These are now part of the MongoDB schema and will be saved
            TMDBTitle: baseItem.TMDBTitle,
            normalizedKey: baseItem.normalizedKey || normalizedKey,
            poster: baseItem.poster,
            about: baseItem.about,
            genres: baseItem.genres,
            cast: baseItem.cast,
            files: baseItem.files || [],
            tmdbId: baseItem.tmdbId
          };
          
          console.log(`[WATCH-LATER SAVE] Saved movie with normalizedKey: "${normalizedKey}" for title: "${mediaItem.title}"`);
        } else {
          // For TV shows, save the complete episode object
          console.log('[DEBUG-SAVE] Taking TV-SHOW branch for:', mediaItem.title);
          console.log(
            "[MEDIA-LIBRARY] Saving TV show to Watch Later (overwriting any existing entry):",
            mediaItem.title
          );
          
          // Use unified data if available, otherwise fall back to mediaItem
          const baseItem = unifiedItem || mediaItem;
          
          savedItem = {
            // === COMPLETE UNIFIED DATA STRUCTURE ===
            // Start with the complete unified object (has all the correct data)
            ...baseItem,
            
            // === WATCH LATER SPECIFIC OVERRIDES ===
            // Override/add Watch Later specific properties
            currentTime,
            duration,
            lastWatched: Date.now(), // For TV shows, always use current time since we're overwriting
            type: "tvshow",
            mediaType: "tvshow", // For MongoDB compatibility
            
            // Generate mediaId for MongoDB
            mediaId: this.generateMediaId(baseItem, "tvshow"),
            
            // Ensure path is present
            path: savePath,
            // Ensure filePath is present for TV shows - use relative path for API compatibility
            filePath: savePath, // Use the relative path for API calls
            fileName: savePath
              ? savePath.split(/[\\/]/).pop()
              : baseItem.title || "Unknown",
            // Ensure absPath is present for TV shows - construct full path for proper playback
            absPath: baseItem.absPath || 
                     (baseItem.files && baseItem.files.length > 0 ? baseItem.files[0].absPath : null) ||
                     (savePath.startsWith("S:/") ? savePath : `S:/MEDIA/TV-SHOWS/${savePath}`),
            
            // Use unified data for season/episode info if available
            season: baseItem.season || this.extractSeasonNumber(baseItem),
            episode: baseItem.episode || this.extractEpisodeNumber(baseItem),
            episodeTitle: baseItem.episodeTitle || baseItem.title,
            
            // === PRESERVE ALL UNIFIED DATA FIELDS ===
            // These are now part of the MongoDB schema and will be saved
            TMDBTitle: baseItem.TMDBTitle,
            normalizedKey: baseItem.normalizedKey,
            poster: baseItem.poster,
            about: baseItem.about,
            genres: baseItem.genres,
            cast: baseItem.cast,
            files: baseItem.files,
            tmdbId: baseItem.tmdbId
          };
        }
        
        console.log('[DEBUG-SAVE] Final savedItem:', {
          title: savedItem.title,
          type: savedItem.type,
          mediaType: savedItem.mediaType,
          season: savedItem.season,
          episode: savedItem.episode
        });
        
        resumeList.push(savedItem);
        // Save to localStorage
        localStorage.setItem(
          "mediaLibraryResumeList",
          JSON.stringify(resumeList)
        );
        // Also save to MongoDB
        await this.saveToMongoDB(savedItem);
      }
      this.updateWatchLaterGrid();
      // Log the result of the save operation
      if (isTVShow) {
        console.log(
          "[MEDIA-LIBRARY] TV show saved to Watch Later with overwrite behavior - only one entry per show maintained"
        );
      }
      if (isManualSave) {
        this.showToast("Saved to Watch Later!", "info"); // 'info' style gives blue background with yellow border
      }
    } catch (error) {
      console.error("[MEDIA-LIBRARY] Error saving resume progress:", error);
      console.error("[MEDIA-LIBRARY] Error details:", {
        message: error.message,
        stack: error.stack,
        mediaItem: mediaItem?.title,
        currentTime,
        duration,
      });
      this.showToast(`Error saving to Watch Later: ${error.message}`, "error");
    }
  }
  // Helper method to generate consistent mediaId for MongoDB
  generateMediaId(mediaItem, mediaType) {
    // Use title and year as primary identifier for consistent duplicate detection
    let identifier;
    
    if (mediaType === 'movie') {
      // For movies: use title + year as primary identifier
      const title = (mediaItem.title || mediaItem.TMDBTitle || 'unknown').toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const year = mediaItem.year || 'unknown';
      identifier = `${title}_${year}`;
    } else if (mediaType === 'tvshow') {
      // For TV shows: use title + season + episode as primary identifier
      const title = (mediaItem.title || mediaItem.TMDBTitle || 'unknown').toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
      const season = mediaItem.season || 'unknown';
      const episode = mediaItem.episode || 'unknown';
      identifier = `${title}_s${season}_e${episode}`;
    } else {
      // Fallback to old method
      identifier = (mediaItem.path || mediaItem.filePath || mediaItem.title || "unknown")
        .replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    }
    
    return `${mediaType}_${identifier}`;
  }
  // Helper method to extract season number from media item
  extractSeasonNumber(mediaItem) {
    if (mediaItem.season !== undefined) return mediaItem.season;
    // Try to extract from title or path
    const text = (mediaItem.title || mediaItem.path || "").toLowerCase();
    const seasonMatch = text.match(/s(\d+)e\d+|season[\s\-_]*(\d+)/i);
    return seasonMatch ? parseInt(seasonMatch[1] || seasonMatch[2]) : null;
  }
  // Helper method to extract episode number from media item
  extractEpisodeNumber(mediaItem) {
    if (mediaItem.episode !== undefined) return mediaItem.episode;
    // Try to extract from title or path
    const text = (mediaItem.title || mediaItem.path || "").toLowerCase();
    const episodeMatch = text.match(/s\d+e(\d+)|episode[\s\-_]*(\d+)/i);
    return episodeMatch ? parseInt(episodeMatch[1] || episodeMatch[2]) : null;
  }
  // Helper method to convert Windows paths to web-ready format
  convertPathToWebFormat(path) {
    if (!path) return null;
    
    let webPath = path;
    
    // If it's a Windows path with backslashes, convert to forward slashes
    if (path.includes('\\')) {
      webPath = path.replace(/\\/g, '/');
    }
    
    // If it's an absolute path starting with drive letter, extract the relative part
    if (webPath.match(/^[A-Z]:\//)) {
      // Remove drive letter and MEDIA/TV-SHOWS prefix
      webPath = webPath.replace(/^[A-Z]:\/MEDIA\/TV-SHOWS\//i, '');
    }
    
    // IMPORTANT: If the path starts with TV-SHOWS, keep it for the server
    // The server expects paths like "TV-SHOWS/Show Name/Season/Episode"
    if (webPath.startsWith('TV-SHOWS/')) {
      // Keep the TV-SHOWS prefix - the server needs it
      return webPath;
    }
    
    return webPath;
  }

  // Centralized method to prepare episode data for VideoPlayer
  prepareEpisodeForPlayback(selectedEpisode) {
    console.log("[DEBUG - PREPARE] Preparing episode for playback:", selectedEpisode);
    
    // Get the show's TMDBTitle from the unified data
    let showTMDBTitle = null;
    if (this.unifiedData && selectedEpisode.path) {
      // Extract show name from path (first folder)
      const pathParts = selectedEpisode.path.split(/[\\/]/);
      if (pathParts.length > 0) {
        const showFolderName = pathParts[0];
        console.log("[DEBUG - PREPARE] Extracted show folder name:", showFolderName);
        
        // Look for the show in unified data
        for (const [showKey, showData] of Object.entries(this.unifiedData)) {
          if (showData.type === 'tvshow' && showData.TMDBTitle) {
            // Check if this show matches the folder name
            // Convert show folder name to normalized format for comparison
            const normalizedShowName = showFolderName.toLowerCase().replace(/[^a-z0-9]/g, '.');
            if (showKey === normalizedShowName || showData.TMDBTitle.includes(showFolderName)) {
              showTMDBTitle = showData.TMDBTitle;
              console.log("[DEBUG - PREPARE] Found TMDBTitle for show:", showTMDBTitle);
              break;
            }
          }
        }
      }
    }
    
    // PRESERVE ALL ORIGINAL EPISODE DATA for TV show detection
    const episodeData = {
      // Preserve original episode structure
      ...selectedEpisode,
      
      // Preserve the original episode title (which should be properly formatted)
      name: selectedEpisode.title || selectedEpisode.name || showTMDBTitle,
      
      // Store the show's TMDBTitle for video player use
      showTMDBTitle: showTMDBTitle,
      
      // FORCE TV SHOW TYPE for EpisodeModal button
      type: 'episode',
      
      // FORCE TV SHOW DETECTION by adding absPath with TV-SHOWS
      absPath: selectedEpisode.absPath || `S:\\MEDIA\\TV-SHOWS\\${selectedEpisode.path}`,
      
      // Preserve all original paths for TV show detection logic
      filePath: selectedEpisode.filePath,
      path: selectedEpisode.path,
      
      // FORCE EPISODE METADATA for TV show detection
      season: selectedEpisode.season || 1,
      episode: selectedEpisode.episode || 1,
      still: selectedEpisode.still,
      thumbnail: selectedEpisode.thumbnail,
      isSpecials: selectedEpisode.isSpecials
    };

    // Convert the absolute path to web-ready format for video playback
    if (selectedEpisode.absPath || selectedEpisode.filePath || selectedEpisode.path) {
      const originalPath = selectedEpisode.absPath || selectedEpisode.filePath || selectedEpisode.path;
      const webPath = this.convertPathToWebFormat(originalPath);
      
      // Add web-ready path for video playback while preserving original paths
      episodeData.webPath = webPath;
      
      console.log("[DEBUG - PREPARE] Original path:", originalPath);
      console.log("[DEBUG - PREPARE] Converted web path:", webPath);
      console.log("[DEBUG - PREPARE] Preserved absPath for TV show detection:", episodeData.absPath);
    }

    console.log("[DEBUG - PREPARE] Prepared episode data (FORCING TV show fields):", episodeData);
    console.log("[DEBUG - PREPARE] FORCED type:", episodeData.type);
    console.log("[DEBUG - PREPARE] FORCED absPath:", episodeData.absPath);
    console.log("[DEBUG - PREPARE] FORCED season:", episodeData.season);
    console.log("[DEBUG - PREPARE] FORCED episode:", episodeData.episode);
    return episodeData;
  }

  // Helper method to save item to MongoDB
  async saveToMongoDB(item) {
    try {
      console.log("[MEDIA-LIBRARY] Saving to MongoDB:", item.title);
      console.log("[MEDIA-LIBRARY] Item data being sent:", {
        title: item.title,
        mediaType: item.mediaType,
        absPath: item.absPath,
        filePath: item.filePath,
        currentTime: item.currentTime,
      });
      const response = await fetch("/api/watch-later/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      console.log(
        "[MEDIA-LIBRARY] MongoDB API response status:",
        response.status
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[MEDIA-LIBRARY] MongoDB API error response:", errorText);
        throw new Error(
          `MongoDB save failed: ${response.status} - ${errorText}`
        );
      }
      const result = await response.json();
      console.log(
        "[MEDIA-LIBRARY] Successfully saved to MongoDB:",
        result.message
      );
    } catch (error) {
      console.error("[MEDIA-LIBRARY] MongoDB save error:", error);
      throw error; // Re-throw so the parent catch block can handle it
      // Don't throw - we want localStorage to still work if MongoDB fails
    }
  }
  // Method to restore Watch Later data from backup file
  async restoreWatchLaterFromBackup() {
    try {
      console.log(
        "[WATCH-LATER DEBUG] Attempting to restore from backup file..."
      );
      // Try the local backup file first (with actual progress data)
      try {
        const localResponse = await fetch(
          "/components/MediaLibrary/data/watch_later/watch_later.json"
        );
        if (localResponse.ok) {
          const localWatchLaterData = await localResponse.json();
          console.log(
            "[WATCH-LATER DEBUG] Local watch later data received:",
            localWatchLaterData
          );
          if (
            localWatchLaterData.items &&
            Array.isArray(localWatchLaterData.items)
          ) {
            // Data is already in the correct localStorage format
            const items = localWatchLaterData.items;
            console.log(
              "[WATCH-LATER DEBUG] Using local watch later items:",
              items.length,
              "items"
            );
            // Update localStorage
            localStorage.setItem(
              "mediaLibraryResumeList",
              JSON.stringify(items)
            );
            this.updateWatchLaterGrid();
            this.showToast(
              `Watch Later restored from local backup (${items.length} items with progress)`,
              "green"
            );
            return;
          }
        }
      } catch (localError) {
        console.log(
          "[WATCH-LATER DEBUG] Local backup failed, trying server backup:",
          localError.message
        );
      }
      // Fallback to server backup
      const response = await fetch("/api/watch-later/backup");
      if (!response.ok) {
        throw new Error(`Failed to fetch backup: ${response.status}`);
      }
      const backupData = await response.json();
      console.log(
        "[WATCH-LATER DEBUG] Retrieved server backup data:",
        backupData
      );
      if (backupData.items && Array.isArray(backupData.items)) {
        // Convert MongoDB format to localStorage format
        const localStorageItems = backupData.items.map((item) => ({
          ...item,
          type: item.mediaType || item.type,
          path: item.filePath || item.path,
          lastWatched: new Date(item.lastWatched).getTime(),
        }));
        localStorage.setItem(
          "mediaLibraryResumeList",
          JSON.stringify(localStorageItems)
        );
        console.log(
          "[WATCH-LATER DEBUG] Restored",
          localStorageItems.length,
          "items to localStorage"
        );
        this.updateWatchLaterGrid();
        this.showToast(
          `Restored ${localStorageItems.length} items from server backup`,
          "success"
        );
      } else {
        throw new Error("Invalid backup data format");
      }
    } catch (error) {
      console.error("[WATCH-LATER DEBUG] Error restoring from backup:", error);
      this.showToast("Error restoring from backup", "error");
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
        mediaType: "movie",
      },
      {
        title: "Test TV Show S01E01",
        path: "tvshows/Test Show (2023)/Season 1/Test.Show.S01E01.[1080p].mp4",
        currentTime: 900, // 15 minutes
        duration: 2700, // 45 minutes
        lastWatched: Date.now() - 3600000, // 1 hour ago
        type: "tvshow",
        mediaType: "tvshow",
      },
    ];
    localStorage.setItem("mediaLibraryResumeList", JSON.stringify(testData));
    console.log("[WATCH-LATER DEBUG] Populated test data:", testData);
    this.updateWatchLaterGrid();
    this.showToast("Test Watch Later data populated", "success");
  }
  // Method to refresh Watch Later from MongoDB
  async refreshWatchLaterFromMongoDB() {
    try {
      console.log("[MEDIA-LIBRARY] Refreshing Watch Later from MongoDB...");
      const response = await fetch("/api/watch-later");
      if (!response.ok) {
        console.error("[MEDIA-LIBRARY] MongoDB API failed:", response.status);
        const errorData = await response.json().catch(() => ({}));
        console.error("[MEDIA-LIBRARY] MongoDB error details:", errorData);
        return false; // Indicate failure
      }
      const data = await response.json();
      console.log(
        "[MEDIA-LIBRARY] Retrieved",
        data.itemCount,
        "items from MongoDB"
      );
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        // Convert MongoDB format back to localStorage format
        const localStorageItems = data.items.map((item) => ({
          ...item,
          // Ensure compatibility with existing localStorage format
          type: item.mediaType || item.type,
          // PRESERVE ALL PATH FIELDS - don't overwrite!
          path: item.path || item.filePath, // Keep original path if available
          filePath: item.filePath, // Keep filePath for reference
          absPath: item.absPath, // CRITICAL: Preserve the absPath field!
          lastWatched: item.lastWatched
            ? new Date(item.lastWatched).getTime()
            : Date.now(),
        }));
        // Debug: Check the converted data
        console.log(
          "[MEDIA-LIBRARY] Sample converted item:",
          localStorageItems[0]
        );
        console.log(
          "[MEDIA-LIBRARY] John Carter absPath check:",
          localStorageItems.find(
            (item) => item.title && item.title.includes("John Carter")
          )?.absPath
        );
        // Update localStorage with MongoDB data
        localStorage.setItem(
          "mediaLibraryResumeList",
          JSON.stringify(localStorageItems)
        );
        // Re-render the Watch Later content
        this.updateWatchLaterGrid();
        this.showToast(
          `Refreshed ${data.itemCount} items from MongoDB`,
          "success"
        );
        console.log(
          "[MEDIA-LIBRARY] Watch Later refreshed from MongoDB successfully"
        );
        return true; // Indicate success
      } else {
        console.log("[MEDIA-LIBRARY] MongoDB returned no items");
        return false; // No data found
      }
    } catch (error) {
      console.error("[MEDIA-LIBRARY] Error refreshing from MongoDB:", error);
      return false; // Indicate failure
    }
  }
  async removeResumeProgress(path) {
    console.log("[REMOVE-RESUME-PROGRESS] Starting removal for path:", path);
    let resumeList = JSON.parse(
      localStorage.getItem("mediaLibraryResumeList") || "[]"
    );
    console.log(
      "[REMOVE-RESUME-PROGRESS] Original resume list count:",
      resumeList.length
    );
    console.log(
      "[REMOVE-RESUME-PROGRESS] Resume list items:",
      resumeList.map((item) => ({
        title: item.title,
        path: item.path,
        type: item.type,
      }))
    );
    // Normalize the target path
    const normalizedPath = path.replace(/\\/g, "/").toLowerCase().trim();
    console.log("[REMOVE-RESUME-PROGRESS] Normalized path:", normalizedPath);
    // Find the item to remove (for MongoDB removal)
    const itemToRemove = resumeList.find((item) => {
      const itemPaths = [item.path, item.relPath, item.filePath, item.absPath]
        .filter((p) => p)
        .map((p) => p.replace(/\\/g, "/").toLowerCase().trim());
      console.log("[REMOVE-RESUME-PROGRESS] Checking item:", {
        title: item.title,
        path: item.path,
        itemPaths: itemPaths,
        normalizedPath: normalizedPath,
      });
      const match = itemPaths.some((itemPath) => itemPath === normalizedPath);
      if (match) {
        console.log("[REMOVE-RESUME-PROGRESS] Found matching item:", item);
      }
      return match;
    });
    console.log(
      "[REMOVE-RESUME-PROGRESS] Item to remove found:",
      !!itemToRemove
    );
    // Remove items that match the path (check all possible path properties)
    const originalCount = resumeList.length;
    resumeList = resumeList.filter((item) => {
      const itemPaths = [item.path, item.relPath, item.filePath, item.absPath]
        .filter((p) => p)
        .map((p) => p.replace(/\\/g, "/").toLowerCase().trim());
      const shouldRemove = itemPaths.some(
        (itemPath) => itemPath === normalizedPath
      );
      if (shouldRemove) {
        console.log("[REMOVE-RESUME-PROGRESS] Removing item:", {
          title: item.title,
          path: item.path,
          itemPaths: itemPaths,
          normalizedPath: normalizedPath,
        });
      }
      return !shouldRemove;
    });
    let removedCount = originalCount - resumeList.length;
    console.log(
      "[REMOVE-RESUME-PROGRESS] Removed",
      removedCount,
      "items from localStorage"
    );
    // If no items were removed by path matching, try to find by title as fallback
    if (removedCount === 0) {
      console.log(
        "[REMOVE-RESUME-PROGRESS] No items removed by path, trying title fallback..."
      );
      // Try to find and remove by exact filename match only (more conservative)
      const titleToRemove = path
        .split(/[\\/]/)
        .pop()
        ?.replace(/\.[^/.]+$/, ""); // Extract filename without extension
      if (titleToRemove) {
        console.log(
          "[REMOVE-RESUME-PROGRESS] Trying to remove by exact filename:",
          titleToRemove
        );
        const beforeCount = resumeList.length;
        resumeList = resumeList.filter((item) => {
          const itemFilename = (item.path || "")
            .split(/[\\/]/)
            .pop()
            ?.replace(/\.[^/.]+$/, "")
            .toLowerCase();
          // Only match exact filename, not partial matches
          const exactMatch = itemFilename === titleToRemove.toLowerCase();
          if (exactMatch) {
            console.log(
              "[REMOVE-RESUME-PROGRESS] Found item by exact filename match:",
              item
            );
          }
          return !exactMatch;
        });
        const afterCount = resumeList.length;
        if (afterCount < beforeCount) {
          console.log(
            "[REMOVE-RESUME-PROGRESS] Removed",
            beforeCount - afterCount,
            "items by exact filename match"
          );
          removedCount = beforeCount - afterCount;
        }
      }
      // If still no items removed, log the issue but don't use aggressive fallback
      if (removedCount === 0) {
        console.log(
          "[REMOVE-RESUME-PROGRESS] No items removed - this may indicate a path mismatch issue"
        );
        console.log(
          "[REMOVE-RESUME-PROGRESS] Target path:",
          path
        );
        console.log(
          "[REMOVE-RESUME-PROGRESS] Available paths in resume list:",
          resumeList.map(item => ({
            title: item.title,
            path: item.path,
            relPath: item.relPath,
            filePath: item.filePath,
            absPath: item.absPath
          }))
        );
        // Don't use aggressive fallback matching as it can remove wrong items
        console.log(
          "[REMOVE-RESUME-PROGRESS] Skipping aggressive fallback to prevent accidental deletions"
        );
      }
    }
    // Update localStorage
    localStorage.setItem("mediaLibraryResumeList", JSON.stringify(resumeList));
    // Also remove from MongoDB if we found the item
    if (itemToRemove && itemToRemove.mediaId && itemToRemove.mediaType) {
      console.log(
        "[REMOVE-RESUME-PROGRESS] Removing from MongoDB:",
        itemToRemove.mediaId,
        itemToRemove.mediaType
      );
      await this.removeFromMongoDB(
        itemToRemove.mediaId,
        itemToRemove.mediaType
      );
    } else {
      console.log(
        "[REMOVE-RESUME-PROGRESS] No MongoDB removal - missing mediaId or mediaType"
      );
    }
    // Always refresh the Watch Later content if we're currently on that tab
    if (this.currentTab === "watchlater") {
      console.log("[REMOVE-RESUME-PROGRESS] Refreshing Watch Later grid");
      console.log("[REMOVE-RESUME-PROGRESS] Items removed:", removedCount);
      console.log("[REMOVE-RESUME-PROGRESS] Remaining items:", resumeList.length);
      
      // Always refresh the UI regardless of whether items were removed
      setTimeout(() => {
        console.log("[REMOVE-RESUME-PROGRESS] Calling updateWatchLaterGrid()");
        this.updateWatchLaterGrid();
      }, 100);
    }
  }
  // Helper method to remove item from MongoDB
  async removeFromMongoDB(mediaId, mediaType) {
    try {
      console.log("[MEDIA-LIBRARY] Removing from MongoDB:", mediaId);
      const response = await fetch("/api/watch-later/remove", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId, mediaType }),
      });
      if (!response.ok) {
        throw new Error(`MongoDB remove failed: ${response.status}`);
      }
      const result = await response.json();
      console.log(
        "[MEDIA-LIBRARY] Successfully removed from MongoDB:",
        result.message
      );
    } catch (error) {
      console.error("[MEDIA-LIBRARY] MongoDB remove error:", error);
      // Don't throw - we want localStorage removal to still work if MongoDB fails
    }
  }

  // Force remove Lost In Space items (emergency method)
  async forceRemoveLostInSpace() {
    console.log('[FORCE-REMOVE] Starting forced removal of Lost In Space items...');
    
    let resumeList = JSON.parse(localStorage.getItem("mediaLibraryResumeList") || "[]");
    const originalCount = resumeList.length;
    console.log('[FORCE-REMOVE] Original resume list count:', originalCount);
    
    // Remove any items that contain "lost in space" in title or path
    resumeList = resumeList.filter(item => {
      const title = (item.title || '').toLowerCase();
      const path = (item.path || '').toLowerCase();
      const relPath = (item.relPath || '').toLowerCase();
      const filePath = (item.filePath || '').toLowerCase();
      const absPath = (item.absPath || '').toLowerCase();
      
      const isLostInSpace = title.includes('lost in space') || 
                           title.includes('lost.in.space') ||
                           path.includes('lost in space') ||
                           relPath.includes('lost in space') ||
                           filePath.includes('lost in space') ||
                           absPath.includes('lost in space');
      
      if (isLostInSpace) {
        console.log('[FORCE-REMOVE] Removing Lost In Space item:', {
          title: item.title,
          path: item.path,
          relPath: item.relPath
        });
      }
      
      return !isLostInSpace;
    });
    
    const removedCount = originalCount - resumeList.length;
    console.log('[FORCE-REMOVE] Removed', removedCount, 'Lost In Space items');
    
    // Update localStorage
    localStorage.setItem("mediaLibraryResumeList", JSON.stringify(resumeList));
    
    // Refresh the UI
    if (this.currentTab === "watchlater") {
      this.updateWatchLaterGrid();
    }
    
    this.showToast(`Force removed ${removedCount} Lost In Space items`, "success");
    return removedCount;
  }



  getResumeList() {
    let resumeList = JSON.parse(
      localStorage.getItem("mediaLibraryResumeList") || "[]"
    );
    // Sort by lastWatched desc (most recent first)
    return resumeList.sort(
      (a, b) => (b.lastWatched || 0) - (a.lastWatched || 0)
    );
  }
  cleanupWatchLaterDuplicates() {
    let resumeList = JSON.parse(
      localStorage.getItem("mediaLibraryResumeList") || "[]"
    );
    const originalCount = resumeList.length;
    console.log(
      "[WATCH-LATER DEBUG] Cleanup starting with",
      originalCount,
      "items"
    );
    // Group items by normalized path and title
    const groups = {};
    resumeList.forEach((item) => {
      const path = (item.path || "").replace(/\\/g, "/").toLowerCase().trim();
      const title = (item.title || "").toLowerCase().trim();
      const key = path || title; // Use path if available, otherwise title
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    // Keep only the most recent item from each group
    const cleanedList = [];
    Object.keys(groups).forEach((key) => {
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
    localStorage.setItem("mediaLibraryResumeList", JSON.stringify(cleanedList));
    console.log(
      "[WATCH-LATER DEBUG] Cleanup finished with",
      cleanedList.length,
      "items"
    );
    return cleanedList;
  }
  // Try to restore Watch Later data from backup file
  async tryRestoreFromBackup() {
    try {
      console.log(
        "[WATCH-LATER DEBUG] Attempting to restore from backup file..."
      );
      const response = await fetch(
        "/components/MediaLibrary/data/watch_later/watch_later.json"
      );
      if (response.ok) {
        const backupData = await response.json();
        if (
          backupData.items &&
          Array.isArray(backupData.items) &&
          backupData.items.length > 0
        ) {
          console.log(
            "[WATCH-LATER DEBUG] Found backup data with",
            backupData.items.length,
            "items"
          );
          localStorage.setItem(
            "mediaLibraryResumeList",
            JSON.stringify(backupData.items)
          );
          this.showToast(
            `Restored ${backupData.items.length} items from backup!`,
            "blue"
          );
          return backupData.items;
        }
      }
    } catch (error) {
      console.log("[WATCH-LATER DEBUG] Could not restore from backup:", error);
    }
    return [];
  }
  // Fix existing Watch Later items that are missing normalizedKey
  fixWatchLaterNormalizedKeys() {
    console.log("[WATCH-LATER DEBUG] Fixing normalizedKey for existing items...");
    let resumeList = JSON.parse(
      localStorage.getItem("mediaLibraryResumeList") || "[]"
    );
    
    let fixedCount = 0;
    resumeList.forEach(item => {
      if (item.type === "movie") {
        // For movies, try to find the correct normalizedKey from unified data
        if (this.unifiedData) {
          for (const key in this.unifiedData) {
            const unifiedMovie = this.unifiedData[key];
            if (unifiedMovie.isMovie) {
              let matchFound = false;
              
              // 1. Match by exact path
              if (item.path && unifiedMovie.path && 
                  item.path.replace(/\\/g, "/") === unifiedMovie.path.replace(/\\/g, "/")) {
                matchFound = true;
              }
              // 2. Match by title (case-insensitive)
              else if (item.title && unifiedMovie.title && 
                       item.title.toLowerCase() === unifiedMovie.title.toLowerCase()) {
                matchFound = true;
              }
              // 3. Match by TMDBTitle (case-insensitive)
              else if (item.title && unifiedMovie.TMDBTitle && 
                       item.title.toLowerCase() === unifiedMovie.TMDBTitle.toLowerCase()) {
                matchFound = true;
              }
              // 4. Match by extracted folder name from path
              else if (item.path && unifiedMovie.title) {
                const movieFolderName = item.path.split(/[\\/]/).pop();
                if (movieFolderName && unifiedMovie.title.toLowerCase().includes(movieFolderName.toLowerCase())) {
                  matchFound = true;
                }
              }
              
              if (matchFound) {
                const oldKey = item.normalizedKey;
                item.normalizedKey = key;
                fixedCount++;
                console.log(`[WATCH-LATER DEBUG] Fixed normalizedKey for "${item.title}" -> "${oldKey || 'none'}" → "${key}"`);
                break;
              }
            }
          }
        }
        
        // If no match found in unified data, fallback to generating from title
        if (!item.normalizedKey && item.title && item.title !== "S:") {
          const cleanTitle = item.title.replace(/\s*\[[^\]]+\]\s*/g, ''); // Remove quality labels
          const normalizedKey = window.normalizeKey ? window.normalizeKey(cleanTitle) : this.createFallbackNormalizedKey(cleanTitle);
          item.normalizedKey = normalizedKey;
          fixedCount++;
          console.log(`[WATCH-LATER DEBUG] Generated fallback normalizedKey for "${item.title}" -> "${normalizedKey}"`);
        } else if (!item.normalizedKey && item.path) {
          // Try to extract from path
          const pathParts = item.path.split(/[\\/]/);
          for (let i = pathParts.length - 2; i >= 0; i--) {
            const part = pathParts[i];
            if (part && part !== "movies" && part !== "movie" && !part.includes(".")) {
              const cleanPart = part.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
              if (cleanPart) {
                const normalizedKey = window.normalizeKey ? window.normalizeKey(cleanPart) : this.createFallbackNormalizedKey(cleanPart);
                item.normalizedKey = normalizedKey;
                fixedCount++;
                console.log(`[WATCH-LATER DEBUG] Fixed normalizedKey from path "${item.path}" -> "${normalizedKey}"`);
                break;
              }
            }
          }
        }
      }
    });
    
    if (fixedCount > 0) {
      localStorage.setItem("mediaLibraryResumeList", JSON.stringify(resumeList));
      console.log(`[WATCH-LATER DEBUG] Fixed ${fixedCount} items with missing or incorrect normalizedKey`);
    } else {
      console.log("[WATCH-LATER DEBUG] No items needed fixing");
    }
    
    return fixedCount;
  }
  
  // Clear and rebuild Watch Later data with complete file information
  async clearAndRebuildWatchLater() {
    console.log("[MEDIA-LIBRARY] Clearing and rebuilding Watch Later data...");
    localStorage.removeItem("mediaLibraryResumeList");
    this.showToast(
      "Watch Later data cleared. Re-add items to get complete file information."
    );
    this.updateWatchLaterGrid();
  }
  showToast(msg, type) {
    if (type === "success") type = "blue";
    if (type === "error") type = "red";
    console.log(`[TOAST][${type}] ${msg}`);
    let toast = document.getElementById("mediaLibraryToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "mediaLibraryToast";
    }
    toast.className = "media-library-toast";
    toast.textContent = msg;
    toast.classList.remove("success", "error");
    if (type === "blue") toast.classList.add("success");
    if (type === "red") toast.classList.add("error");
    toast.style.display = "flex";
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.display = "none";
    }, 1800);
  }
  showMediaLibraryError(message) {
    console.log("[MEDIA-LIBRARY] Error:", message);
    // Get or create the error display area in the Media Library footer
    let errorDisplay = document.getElementById("mediaLibraryErrorDisplay");
    if (!errorDisplay) {
      errorDisplay = document.createElement("div");
      errorDisplay.id = "mediaLibraryErrorDisplay";
      errorDisplay.className = "media-library-error-display";
      // Append to the Media Library modal instead of body
      const mediaLibraryModal = document.querySelector(".media-library-modal");
      if (mediaLibraryModal) {
        mediaLibraryModal.appendChild(errorDisplay);
      } else {
        // Fallback to body if modal not found
        document.body.appendChild(errorDisplay);
      }
    }
    // Only show if it's a different message or if no message is currently showing
    if (
      errorDisplay.textContent !== message ||
      errorDisplay.style.display === "none"
    ) {
      errorDisplay.textContent = message;
      errorDisplay.style.display = "block";
      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorDisplay.style.display = "none";
      }, 5000);
    }
  }
  attachResumeEvents(mediaItem) {
    // This method is called when a video starts playing
    // It sets up automatic saving of progress when the video is paused
    // console.log("[MEDIA-LIBRARY] attachResumeEvents called for:", mediaItem);
    // The actual pause event handling is now done in the VideoPlayer component
    // This method is kept for compatibility and future enhancements
  }
  extractEpisodeTitle(filename) {
    // console.log("[DEBUG - EPISODE-TITLE] Extracting title from:", filename);
    // console.log("[DEBUG - EPISODE-TITLE] Current TV show:", this.currentTVShow);
    // Remove extension
    let name = filename.replace(/\.[^/.]+$/, "");
    // console.log("[DEBUG - EPISODE-TITLE] After extension removal:", name);
    // For Lois & Clark specifically, handle the dot-separated format
    if (name.includes("Lois.And.Clark.The.New.Adventures.Of.Superman")) {
      // console.log("[DEBUG - EPISODE-TITLE] Detected Lois & Clark format");
      // Split by dots and find the episode part
      const parts = name.split(".");
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
        name = episodeParts.join(" ");
        // console.log(
        //   "[DEBUG - EPISODE-TITLE] Extracted episode parts:",
        //   episodeParts
        // );
        // console.log("[DEBUG - EPISODE-TITLE] Final name:", name);
      } else {
        // Fallback: remove the show name pattern
        name = name.replace(
          /Lois\.And\.Clark\.The\.New\.Adventures\.Of\.Superman\.?/i,
          ""
        );
      }
    } else {
      // General approach for other shows
      if (this.currentTVShow) {
        const showName = this.extractShowName(this.currentTVShow);
        if (showName) {
          // Try exact match first
          const exactPattern = new RegExp(
            "^" + this.escapeRegExp(showName) + "[ ._-]*",
            "i"
          );
          if (name.match(exactPattern)) {
            name = name.replace(exactPattern, "");
          } else {
            // Try removing just the main title part (without year)
            const mainTitle = showName.replace(/\s*\(\d{4}\).*$/, "").trim();
            const mainPattern = new RegExp(
              "^" + this.escapeRegExp(mainTitle) + "[ ._-]*",
              "i"
            );
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
    console.log("[DEBUG - EPISODE-TITLE] Final result:", name.trim());
    return name.trim();
  }
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  async reloadMoviePostersAndRefreshGrid() {
    try {
      console.log("[DEBUG - RELOAD] 🚀 Reloading movie data and refreshing grid...");
      
      // Reload the unified movies data to get any new movies
      const response = await fetch(
        "/components/MediaLibrary/data/movies/movies-unified.json?_=" +
          Date.now()
      );
      if (response.ok) {
        const newMoviesData = await response.json();
        // Update the unified data in memory
        this.unifiedData = newMoviesData;
        console.log("[DEBUG - RELOAD] ✅ Updated unified data with", Object.keys(newMoviesData).length, "movies");
      } else {
        console.warn("[DEBUG - RELOAD] Failed to reload movies-unified.json");
      }
    } catch (e) {
      console.warn(
        "[DEBUG - RELOAD] Failed to reload movies-unified.json:",
        e
      );
    }
    
    // Reload the entire media library data to get the new movie
    try {
      await this.loadMediaLibrary();
    } catch (e) {
      console.warn("[DEBUG - RELOAD] Failed to reload media library data:", e);
    }
    
    // Force a complete refresh of the current view
    if (this.currentTab === "movies") {
      console.log("[DEBUG - RELOAD] Refreshing movies grid...");
      await this.refreshCurrentView();
    }
    
    this.renderMediaGrid();
    this.attachPosterSelectorHandlers();
    
    console.log("[DEBUG - RELOAD] ✅ Movie reload and grid refresh completed");
  }
  
  /**
   * Refresh the current view to show updated data
   */
  async refreshCurrentView() {
    try {
      console.log("[DEBUG - REFRESH-VIEW] 🚀 Refreshing current view for tab:", this.currentTab);
      
      if (this.currentTab === "movies") {
        // For movies, reload the unified data and re-render
        const response = await fetch(
          "/components/MediaLibrary/data/movies/movies-unified.json?_=" + Date.now()
        );
        if (response.ok) {
          this.unifiedData = await response.json();
          console.log("[DEBUG - REFRESH-VIEW] ✅ Reloaded unified data with", Object.keys(this.unifiedData).length, "movies");
        }
      } else if (this.currentTab === "tvshows") {
        // For TV shows, reload the unified data
        const response = await fetch(
          "/components/MediaLibrary/data/tvshows/tvshows-unified.json?_=" + Date.now()
        );
        if (response.ok) {
          this.unifiedTVData = await response.json();
          console.log("[DEBUG - REFRESH-VIEW] ✅ Reloaded unified TV data");
        }
        // Re-render TV show grid specifically
        this.renderTVShowGrid();
        this.attachTVShowHandlers();
      }
      
      // Re-render the current view
      this.renderMediaGrid();
      console.log("[DEBUG - REFRESH-VIEW] ✅ View refresh completed");
      
    } catch (error) {
      console.error("[DEBUG - REFRESH-VIEW] ❌ Error refreshing view:", error);
    }
  }
  
  async refreshCurrentContent() {
    console.log(
      "[DEBUG - REFRESH] 🚀 Starting refresh for tab:",
      this.currentTab
    );
    // Set refresh flag to prevent grid spinners
    this.isRefreshing = true;
    // Reset A-Z sidebar loading flag for new refresh operation
    this.azSidebarLoaded = false;
    // Show loading overlay when refreshing (needed for MongoDB operations)
    this.showModalLoadingOverlay();
    // Set a safety timeout to ensure the loading overlay is always hidden
    const safetyTimeout = setTimeout(() => {
      console.warn(
        "[DEBUG - REFRESH] Safety timeout reached, forcing overlay hide"
      );
      this.hideModalLoadingOverlay();
      this.isRefreshing = false;
    }, 10000); // 10 seconds timeout
    try {
      console.log(
        "[DEBUG - REFRESH] 📋 Current state - Tab:",
        this.currentTab,
        "Show:",
        this.currentTVShow || "none",
        "Season:",
        this.currentTVSeason || "none"
      );
      // Store current tab
      const currentTab = this.currentTab;
      const currentShow = this.currentTVShow;
      const currentSeason = this.currentTVSeason;
      // Clear the grid first
      const grid = document.getElementById("mediaGrid");
      if (grid) {
        grid.innerHTML =
          '<div style="text-align: center; padding: 20px;">Refreshing...</div>';
        console.log(
          "[DEBUG - REFRESH] ✅ Grid cleared, showing refreshing message"
        );
      } else {
        console.log("[DEBUG - REFRESH] ❌ Could not find mediaGrid element");
      }
      // Small delay to show the refreshing message
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log("[DEBUG - REFRESH] ⏱️ 100ms delay completed");
      // For Watch Later tab, refresh from MongoDB first, then fallback to backup
      if (currentTab === "watchlater") {
        console.log("[DEBUG - REFRESH] 🔄 Refreshing Watch Later content...");
        // Always try MongoDB first when refreshing
        console.log("[DEBUG - REFRESH] Attempting to refresh from MongoDB...");
        const mongoResult = await this.refreshWatchLaterFromMongoDB();
        if (!mongoResult) {
          // MongoDB failed, check if localStorage is empty
          const currentData = JSON.parse(
            localStorage.getItem("mediaLibraryResumeList") || "[]"
          );
          console.log(
            "[DEBUG - REFRESH] MongoDB failed, localStorage has",
            currentData.length,
            "items - attempting to restore from backup file..."
          );
          await this.restoreWatchLaterFromBackup();
        } else {
          console.log("[DEBUG - REFRESH] Successfully refreshed from MongoDB");
        }
      }
      // Force reload the current tab without showing additional loading overlays
      console.log(
        "[DEBUG - REFRESH] 🔄 Reloading tab content for:",
        currentTab
      );
      // Update mediaLibraryRaw to match current tab's data
      if (currentTab === "movies") {
        this.mediaLibraryRaw = this.moviesData;
      } else if (currentTab === "tvshows") {
        this.mediaLibraryRaw = this.tvShowsData;
      } else if (currentTab === "favorites") {
        this.mediaLibraryRaw = this.moviesData;
      } else if (currentTab === "watchlater") {
        this.mediaLibraryRaw = null;
      }
      // Update the modal content directly without calling switchTab
      await this.updateModalContent();
      console.log("[DEBUG - REFRESH] ✅ Tab content reloaded successfully");
      // Quick check: if A-Z sidebar is already loaded, skip the wait
      const movieSidebar = document.getElementById(
        "mediaLibraryAZSidebarMovie"
      );
      const tvSidebar = document.getElementById("mediaLibraryAZSidebarTVShow");
      const activeSidebar =
        this.currentTab === "movies" && movieSidebar
          ? movieSidebar
          : this.currentTab === "tvshows" && tvSidebar
            ? tvSidebar
            : null;
      if (activeSidebar && activeSidebar.textContent.match(/[A-Z]/)) {
        console.log(
          "[DEBUG - REFRESH] A-Z sidebar already loaded, skipping wait"
        );
      }
      // If we were in a specific TV show view, restore it
      if (currentTab === "tvshows" && currentShow) {
        if (currentSeason) {
          // We were in episodes view
          console.log(
            "[DEBUG - REFRESH] 🔄 Restoring episodes view for:",
            currentShow,
            "Season:",
            currentSeason
          );
          this.currentTVShow = currentShow;
          this.currentTVSeason = currentSeason;
          this.renderEpisodesView();
          console.log("[DEBUG - REFRESH] ✅ Episodes view restored");
        } else {
          // We were in seasons view
          console.log(
            "[DEBUG - REFRESH] 🔄 Restoring seasons view for:",
            currentShow
          );
          this.currentTVShow = currentShow;
          this.renderSeasonsView(currentShow);
          console.log("[DEBUG - REFRESH] ✅ Seasons view restored");
        }
      } else {
        console.log("[DEBUG - REFRESH] ℹ️ No TV show view to restore");
      }
      console.log("[DEBUG - REFRESH] ✅ Refresh completed successfully");
      this.showToast("Content refreshed successfully!", "success");
    } catch (error) {
      console.error("[DEBUG - REFRESH] ❌ ERROR:", error.message);
      console.error("[DEBUG - REFRESH] ❌ Stack:", error.stack);
      this.showToast(`Error refreshing content: ${error.message}`, "error");
    } finally {
      // Clear the safety timeout
      clearTimeout(safetyTimeout);
      // Reset refresh flag
      this.isRefreshing = false;
      // Hide the loading overlay
      this.hideModalLoadingOverlay();
      console.log("[DEBUG - REFRESH] 🏁 Refresh operation finished");
    }
  }
  attachPosterSelectorHandlers() {
    setTimeout(() => {
      // Handle both movie and TV show poster selector buttons
      const movieButtons = document.querySelectorAll(".movie-poster-selector-btn");
      const tvButtons = document.querySelectorAll(".tv-poster-selector-btn");
      const allButtons = [...movieButtons, ...tvButtons];
      console.log("[DEBUG] Found", allButtons.length, "poster selector buttons (Movies:", movieButtons.length, "TV:", tvButtons.length, ")");
      // Remove any existing click handlers first
      allButtons.forEach((btn) => {
        btn.onclick = null;
        btn.removeEventListener("click", btn._posterSelectorHandler);
      });
      allButtons.forEach((btn, index) => {
        // console.log('[DEBUG] Button', index, ':', btn);
        // Create a named function for the handler
        const clickHandler = (e) => {
          console.log("[DEBUG] Poster selector button clicked!");
          e.preventDefault();
          e.stopPropagation();
          const card = btn.closest(".media-library-movie-card");
          let itemPath = card ? card.getAttribute("data-path") : "";
          let item = null;
          let errorDetails = "";
          if (this.currentTab === "tvshows") {
            const tvShows = this.getTVShows();
            item = tvShows.find(
              (show) =>
                (show.path || "").replace(/\\/g, "/").toLowerCase().trim() ===
                (itemPath || "").replace(/\\/g, "/").toLowerCase().trim()
            );
            if (!item && card) {
              // Fallback: try by title
              const title = card
                .querySelector("h3")
                ?.textContent?.trim()
                .toLowerCase();
              item = tvShows.find(
                (show) =>
                  (show.name || show.title || "").trim().toLowerCase() === title
              );
              errorDetails += `\nTried fallback by title: ${title}`;
            }
          } else {
            const items = this.getFilteredAndSortedItems();
            item = items.find(
              (i) =>
                (i.path || "").replace(/\\/g, "/").toLowerCase().trim() ===
                (itemPath || "").replace(/\\/g, "/").toLowerCase().trim()
            );
            if (!item && card) {
              // Fallback: try by title
              const title = card
                .querySelector("h3")
                ?.textContent?.trim()
                .toLowerCase();
              item = items.find(
                (i) => (i.title || i.name || "").trim().toLowerCase() === title
              );
              errorDetails += `\nTried fallback by title: ${title}`;
            }
          }
          console.log(
            "[DEBUG] PosterSelector available:",
            !!window.PosterSelector
          );
          if (window.PosterSelector) {
            const mode = this.currentTab === "tvshows" ? "tv" : "movie";
            const fallbackTitle = card?.querySelector("h3")?.textContent || "";
            const rawTitle = item?.title || item?.name || fallbackTitle;
            const selector = new window.PosterSelector(mode, {
              title: this.capitalizeTitle(rawTitle),
            });
            selector.getMediaContext = () => {
              if (item) {
                return {
                  mediaId: item.path,
                  name: item.name || item.title,
                  path: item.path,
                  type: mode,
                };
              } else {
                // Minimal fallback context
                // --- DEBUG LOGGING FOR PATH MISMATCH ---
                console.warn("[PosterSelector DEBUG] Fallback context used!");
                console.warn("[PosterSelector DEBUG] itemPath:", itemPath);
                if (this.currentTab === "tvshows") {
                  const tvShows = this.getTVShows();
                  console.warn(
                    "[PosterSelector DEBUG] Available TV show paths:",
                    tvShows.map((s) => s.path)
                  );
                } else {
                  const items = this.getFilteredAndSortedItems();
                  console.warn(
                    "[PosterSelector DEBUG] Available movie paths:",
                    items.map((i) => i.path)
                  );
                }
                console.warn(
                  "[PosterSelector DEBUG] Card HTML:",
                  card ? card.outerHTML : "[none]"
                );
                // --- END DEBUG LOGGING ---
                return {
                  mediaId: itemPath || "[unknown]",
                  name: fallbackTitle || "[unknown]",
                  path: itemPath || "[unknown]",
                  type: mode,
                };
              }
            };
            selector.onPosterSelected = async ({
              filePath,
              posterType,
              poster,
            }) => {
              // Always reload the full poster mapping after update
              await this.loadMoviePosters();
              // Just update heart icons instead of full re-render
              this.updateHeartIcons();
              this.showToast("Poster updated!");
            };
            selector.init();
            if (!item) {
              // Show a warning toast if fallback was used
              const warnMsg =
                "Warning: Movie/Show not found by path. Fallback context used.";
              this.showToast(warnMsg);
              // --- ALWAYS LOG ALERTS TO CONSOLE ---
              console.warn("[PosterSelector ALERT]", warnMsg);
              console.warn("[PosterSelector DEBUG] itemPath:", itemPath);
              if (this.currentTab === "tvshows") {
                const tvShows = this.getTVShows();
                console.warn(
                  "[PosterSelector DEBUG] Available TV show paths:",
                  tvShows.map((s) => s.path)
                );
              } else {
                const items = this.getFilteredAndSortedItems();
                console.warn(
                  "[PosterSelector DEBUG] Available movie paths:",
                  items.map((i) => i.path)
                );
              }
              console.warn(
                "[PosterSelector DEBUG] Card HTML:",
                card ? card.outerHTML : "[none]"
              );
            }
          } else {
            // Show detailed error info in the alert/toast
            let details = `PosterSelector is not available or item not found.\n`;
            details += `itemPath: ${itemPath}\n`;
            details += `card: ${card ? card.outerHTML : "[none]"}\n`;
            details += `errorDetails: ${errorDetails}`;
            this.showToast(details);
          }
          return false;
        };
        // Store the handler reference and attach it
        btn._posterSelectorHandler = clickHandler;
        btn.addEventListener("click", clickHandler);
        btn.onclick = clickHandler; // Backup method
      });
    }, 100); // Increased timeout to ensure DOM is ready
  }
  async loadMovieCast() {
    if (this.movieCast) return this.movieCast;
    try {
      const response = await fetch(
        "/components/MediaLibrary/data/movies/movie_cast_normalized.json?t=" +
          Date.now()
      );
      if (response.ok) {
        this.movieCast = await response.json();
        console.log(
          "[CAST DEBUG] Loaded movie cast data with keys:",
          Object.keys(this.movieCast).filter((k) => k.includes("Family"))
        );
        return this.movieCast;
      }
    } catch (error) {
      console.warn("Could not load movie cast:", error);
    }
    this.movieCast = {};
    return this.movieCast;
  }
  attachSeasonArrowHandlers() {
    const wrapper = document.querySelector(
      ".media-library-seasons-arrows-wrapper"
    );
    if (!wrapper) return;
    const grid = wrapper.querySelector(".media-library-seasons-grid");
    if (!grid) return;
    const left = wrapper.querySelector(".media-library-arrow-btn.left");
    const right = wrapper.querySelector(".media-library-arrow-btn.right");
    const scrollAmount = 1080;
    if (left)
      left.onclick = function (e) {
        e.preventDefault();
        grid.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      };
    if (right)
      right.onclick = function (e) {
        e.preventDefault();
        grid.scrollBy({ left: scrollAmount, behavior: "smooth" });
      };
  }
  // Attach arrow scroll handlers after render
  attachEpisodeArrowHandlers() {
    const wrapper = document.querySelector(
      ".media-library-episodes-arrows-wrapper"
    );
    if (!wrapper) return;
    const grid = wrapper.querySelector(".media-library-episodes-grid");
    if (!grid) return;
    const left = wrapper.querySelector(".media-library-arrow-episode-btn.left");
    const right = wrapper.querySelector(
      ".media-library-arrow-episode-btn.right"
    );
    const scrollAmount = 1170; // width of 6 cards
    if (left)
      left.onclick = function (e) {
        e.preventDefault();
        console.log("[EPISODE ARROW] Left arrow clicked");
        grid.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      };
    if (right)
      right.onclick = function (e) {
        e.preventDefault();
        console.log("[EPISODE ARROW] Right arrow clicked");
        grid.scrollBy({ left: scrollAmount, behavior: "smooth" });
      };
  }
  // Call this after rendering episodes view
  // Example: setTimeout(() => mediaLibraryManager.attachEpisodeArrowHandlers(), 0);
  openMediaManager() {
    console.log("[DEBUG - MEDIA MANAGER] Attempting to open Media Manager...");
    console.log(
      "[DEBUG - MEDIA MANAGER] window.MediaManager exists:",
      !!window.MediaManager
    );
    console.log(
      "[DEBUG - MEDIA MANAGER] window.showToast exists:",
      !!window.showToast
    );
    this.closeMediaLibrary();
    if (window.MediaManager) {
      try {
        console.log(
          "[DEBUG - MEDIA MANAGER] Creating MediaManager instance..."
        );
        const mm = new window.MediaManager();
        console.log("[DEBUG - MEDIA MANAGER] Initializing MediaManager...");
        mm.init();
        console.log(
          "[DEBUG - MEDIA MANAGER] MediaManager initialization started"
        );
      } catch (error) {
        console.error(
          "[DEBUG - MEDIA MANAGER] Error creating/initializing MediaManager:",
          error
        );
        if (window.showToast) {
          window.showToast(
            "Error initializing Media Manager: " + error.message,
            "error",
            4000
          );
        }
      }
    } else {
      console.error(
        "[DEBUG - MEDIA MANAGER] MediaManager component not loaded. window.MediaManager is undefined."
      );
      if (window.showToast) {
        window.showToast("MediaManager component not loaded.", "error", 4000);
      } else {
        console.error("MediaManager component not loaded.");
      }
    }
  }
  // Add methods to get total counts
  getTotalMovieCount() {
    // Use unified data to count movies
    if (!this.unifiedData) return 0;
    return Object.values(this.unifiedData).filter(item => item.isMovie).length;
  }
  getTotalTVShowCount() {
    const count = this.getTVShows().length;
    console.log('[DEBUG - TV-COUNT] getTotalTVShowCount returning:', count);
    return count;
  }
  async loadMovieGenres() {
    try {
      const response = await fetch(
        "/components/MediaLibrary/data/movies/movie_genres_normalized.json?t=" +
          Date.now()
      );
      if (response.ok) {
        this.movieGenres = await response.json();
        console.log(
          "[DEBUG] Loaded movie_genres_normalized.json with keys:",
          Object.keys(this.movieGenres).slice(0, 5)
        );
      } else {
        this.movieGenres = {};
        console.warn("[DEBUG] Failed to load movie_genres_normalized.json");
      }
    } catch (e) {
      this.movieGenres = {};
      console.warn("[DEBUG] Error loading movie_genres_normalized.json:", e);
    }
  }

  getTVGenres(show) {
    // Try to get genres from normalized genre file using normalizedKey or name
    if (
      show.normalizedKey &&
      this.tvGenres &&
      this.tvGenres[show.normalizedKey]
    ) {
      return this.tvGenres[show.normalizedKey].map((g) => g.toLowerCase());
    }
    if (show.name && this.tvGenres && this.tvGenres[show.name]) {
      return this.tvGenres[show.name].map((g) => g.toLowerCase());
    }
    // Fallbacks as before
    if (Array.isArray(show.genre))
      return show.genre.map((g) => g.toLowerCase());
    if (Array.isArray(show.genres))
      return show.genres.map((g) => g.toLowerCase());
    if (typeof show.genre === "string")
      return show.genre
        .toLowerCase()
        .split(/[,/]/)
        .map((g) => g.trim());
    if (typeof show.genres === "string")
      return show.genres
        .toLowerCase()
        .split(/[,/]/)
        .map((g) => g.trim());
    // Fallback: try to guess from title
    const title = (show.title || "").toLowerCase();
    const genres = this.getCommonGenres()
      .slice(1)
      .map((g) => g.toLowerCase());
    return genres.filter((g) => title.includes(g));
  }
  getSuggestions() {
    // Return empty array for now - can be implemented later
    return [];
  }
  // Migrate old path-based favorites to new object-based system
  migrateFavoritesToObjects(favorites) {
    console.log('[DEBUG - FAVORITES] Starting migration of favorites data...');
    
    // Check if migration has already been completed
    const migrationKey = 'mediaLibraryFavoritesMigrationCompleted';
    if (localStorage.getItem(migrationKey)) {
      console.log('[DEBUG - FAVORITES] Migration already completed, skipping...');
      return favorites;
    }
    
    const migrated = { movies: [], tvshows: [] };
    let migratedCount = 0;
    
    // Migrate movies
    if (favorites.movies && Array.isArray(favorites.movies)) {
      favorites.movies.forEach((item, index) => {
        if (typeof item === 'string') {
          // Old path-based format - try to find the movie in unified data
          const path = item;
          const folderName = path.split(/[\\/]/).pop() || '';
          
          // Look for movie in unified data by path match
          let foundMovie = null;
          if (this.unifiedData) {
            // First try exact path match
            for (const key in this.unifiedData) {
              const movieData = this.unifiedData[key];
              if (movieData.isMovie && movieData.path === folderName) {
                foundMovie = { ...movieData };
                break;
              }
            }
            
            // If no exact match, try partial path matching
            if (!foundMovie) {
              for (const key in this.unifiedData) {
                const movieData = this.unifiedData[key];
                if (movieData.isMovie && 
                    (movieData.path && movieData.path.includes(folderName)) ||
                    (movieData.title && movieData.title.includes(folderName))) {
                  foundMovie = { ...movieData };
                  console.log('[DEBUG - FAVORITES] Found movie by partial match:', folderName, '->', movieData.title);
                  break;
                }
              }
            }
          }
          
          if (foundMovie) {
            // Set the path to the original file path for video playback
            foundMovie.path = path;
            foundMovie.absPath = path;
            migrated.movies.push(foundMovie);
            migratedCount++;
            console.log('[DEBUG - FAVORITES] Migrated movie:', folderName, 'with path:', path);
          } else {
            console.warn('[DEBUG - FAVORITES] Could not migrate movie path:', path);
          }
        } else {
          // Already in new format - validate it's complete
          if (item.title || item.TMDBTitle || item.name) {
            if (item.poster) {
              migrated.movies.push(item);
            } else {
              console.warn('[DEBUG - FAVORITES] Skipping movie without poster:', item.title || item.name);
            }
          } else {
            console.warn('[DEBUG - FAVORITES] Skipping movie without title:', item);
          }
        }
      });
    }
    
    // Migrate TV shows
    if (favorites.tvshows && Array.isArray(favorites.tvshows)) {
      console.log('[DEBUG - FAVORITES] Starting TV show migration. Found', favorites.tvshows.length, 'TV shows to process');
      favorites.tvshows.forEach((item, index) => {
        console.log('[DEBUG - FAVORITES] Processing TV show item', index + 1, ':', item);
        if (typeof item === 'string') {
          // Old path-based format - try to find the TV show in unified data
          const path = item;
          const pathParts = path.split(/[\\/]/);
          const tvShowsIndex = pathParts.findIndex((part) =>
            part.toLowerCase().includes("tvshows")
          );
          let showName = path.split(/[\\/]/).pop() || "";
          if (tvShowsIndex !== -1 && tvShowsIndex + 1 < pathParts.length) {
            showName = pathParts[tvShowsIndex + 1]; // Get the actual show name with year
          }
          
          // Look for TV show in unified data by normalized key
          let foundShow = null;
          if (this.unifiedData && window.normalizeKey) {
            const normalizedKey = window.normalizeKey(showName);
            if (this.unifiedData[normalizedKey] && !this.unifiedData[normalizedKey].isMovie) {
              foundShow = { ...this.unifiedData[normalizedKey] };
            }
            
            // If no exact key match, try partial matching
            if (!foundShow) {
              for (const key in this.unifiedData) {
                const showData = this.unifiedData[key];
                if (!showData.isMovie && 
                    (showData.name && showData.name.includes(showName)) ||
                    (showData.title && showData.title.includes(showName))) {
                  foundShow = { ...showData };
                  console.log('[DEBUG - FAVORITES] Found TV show by partial match:', showName, '->', showData.title || showData.name);
                  break;
                }
              }
            }
          }
          
          if (foundShow) {
            migrated.tvshows.push(foundShow);
            migratedCount++;
            console.log('[DEBUG - FAVORITES] ✅ Successfully migrated TV show:', showName, '->', foundShow);
          } else {
            console.warn('[DEBUG - FAVORITES] ❌ Could not migrate TV show path:', path);
            console.warn('[DEBUG - FAVORITES] This TV show will be lost unless it exists in unified data');
          }
        } else {
                  // Already in new format - validate it's complete
        // TV shows can have different property structures than movies
        const hasTitle = item.title || item.TMDBTitle || item.name || item.showName;
        const hasPoster = item.poster || item.posterUrl || item.image;
        
        if (hasTitle) {
          if (hasPoster) {
            migrated.tvshows.push(item);
            console.log('[DEBUG - FAVORITES] Added TV show with title:', hasTitle);
          } else {
            console.warn('[DEBUG - FAVORITES] Skipping TV show without poster:', hasTitle);
          }
        } else {
          console.warn('[DEBUG - FAVORITES] Skipping TV show without title:', item);
        }
        }
      });
    }
    
    // Save migrated data back to localStorage
    if (migratedCount > 0) {
      localStorage.setItem("mediaLibraryFavoritesByType", JSON.stringify(migrated));
      console.log('[DEBUG - FAVORITES] Migration completed. Migrated', migratedCount, 'items');
    }
    
    // Mark migration as completed to prevent re-migration
    localStorage.setItem(migrationKey, 'true');
    console.log('[DEBUG - FAVORITES] Migration marked as completed');
    
    // Clean up any remaining incomplete objects
    console.log('[DEBUG - FAVORITES] Before cleanup - Movies:', migrated.movies.length, 'TV Shows:', migrated.tvshows.length);
    
    const cleanedMovies = migrated.movies.filter(item => 
      item && typeof item === 'object' && 
      (item.title || item.TMDBTitle || item.name) && 
      item.poster
    );
    
    const cleanedTVShows = migrated.tvshows.filter(item => {
      const hasTitle = item && typeof item === 'object' && 
        (item.title || item.TMDBTitle || item.name || item.showName);
      const hasPoster = hasTitle && (item.poster || item.posterUrl || item.image);
      
      if (!hasTitle) {
        console.warn('[DEBUG - FAVORITES] ❌ TV show filtered out - missing title:', item);
      } else if (!hasPoster) {
        console.warn('[DEBUG - FAVORITES] ❌ TV show filtered out - missing poster:', item);
      } else {
        console.log('[DEBUG - FAVORITES] ✅ TV show passed cleanup:', item.title || item.name || item.showName);
      }
      
      return hasTitle && hasPoster;
    });
    
    const cleaned = { movies: cleanedMovies, tvshows: cleanedTVShows };
    
    // Save cleaned data
    localStorage.setItem("mediaLibraryFavoritesByType", JSON.stringify(cleaned));
    console.log('[DEBUG - FAVORITES] Cleanup completed. Final count - Movies:', cleanedMovies.length, 'TV Shows:', cleanedTVShows.length);
    
    return cleaned;
  }
  
  // DEBUG FUNCTION: Check localStorage for missing TV shows
  debugLocalStorageForTVShows() {
    console.log('🔍 [DEBUG - TV SHOWS] Checking localStorage for missing TV shows...');
    
    // Check all localStorage keys
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }
    console.log('[DEBUG - TV SHOWS] All localStorage keys:', allKeys);
    
    // Check for any keys that might contain TV show data
    const tvRelatedKeys = allKeys.filter(key => 
      key && (
        key.toLowerCase().includes('tv') || 
        key.toLowerCase().includes('show') || 
        key.toLowerCase().includes('favorite') ||
        key.toLowerCase().includes('collection')
      )
    );
    
    console.log('[DEBUG - TV SHOWS] TV-related localStorage keys:', tvRelatedKeys);
    
    // Check each TV-related key
    tvRelatedKeys.forEach(key => {
      try {
        const value = JSON.parse(localStorage.getItem(key));
        console.log(`[DEBUG - TV SHOWS] Key "${key}" contains:`, value);
        
        // Look for TV show data in the value
        if (value && typeof value === 'object') {
          if (value.tvshows && Array.isArray(value.tvshows)) {
            console.log(`[DEBUG - TV SHOWS] Found ${value.tvshows.length} TV shows in key "${key}":`, value.tvshows);
          }
          if (value.tvShows && Array.isArray(value.tvShows)) {
            console.log(`[DEBUG - TV SHOWS] Found ${value.tvShows.length} TV shows in key "${key}":`, value.tvShows);
          }
        }
      } catch (e) {
        const rawValue = localStorage.getItem(key);
        console.log(`[DEBUG - TV SHOWS] Key "${key}" contains (raw):`, rawValue);
      }
    });
    
    return tvRelatedKeys;
  }
  
  // QUICK RECOVERY: Check if TV shows exist in unified data that should be favorited
  async quickRecoverTVShowsFromUnifiedData() {
    console.log('⚡ [QUICK RECOVERY] Checking unified data for TV shows that might be favorites...');
    
    if (!this.unifiedData) {
      console.log('[QUICK RECOVERY] No unified data available');
      return [];
    }
    
    const potentialFavorites = [];
    
    // Look for TV shows in unified data
    for (const [key, item] of Object.entries(this.unifiedData)) {
      if (!item.isMovie && item.seasons) {
        // This is a TV show - check if it has any indication it was favorited
        const hasFavoriteIndicator = item.favorited || item.isFavorite || item.favorite || 
                                   item.path?.includes('favorite') || 
                                   item.name?.toLowerCase().includes('favorite');
        
        if (hasFavoriteIndicator) {
          console.log(`[QUICK RECOVERY] Found TV show with favorite indicator:`, item.name || item.title);
          potentialFavorites.push(item);
        }
      }
    }
    
    if (potentialFavorites.length > 0) {
      console.log(`[QUICK RECOVERY] Found ${potentialFavorites.length} TV shows that might be favorites`);
      
      // Ask user if they want to restore these
      const shouldRestore = await window.ConfirmModalComponent.confirmAction(
        'Restore', 
        `${potentialFavorites.length} TV shows`, 
        'These might be your favorites from previous sessions.'
      );
      
      if (shouldRestore) {
        // Get current favorites
        const currentFavorites = this.getFavoritesList();
        
        // Add potential favorites
        currentFavorites.tvshows = [...potentialFavorites, ...currentFavorites.tvshows];
        
        // Save back to localStorage
        localStorage.setItem("mediaLibraryFavoritesByType", JSON.stringify(currentFavorites));
        
        console.log('[QUICK RECOVERY] TV shows restored!');
        
        // Refresh the favorites display
        if (this.currentTab === "favorites") {
          this.updateModalContent();
        }
        
        return potentialFavorites;
      }
    } else {
      console.log('[QUICK RECOVERY] No TV shows with favorite indicators found');
    }
    
    return [];
  }
  
  // MANUAL RECOVERY: Let user select TV shows to add to favorites
  manualRecoverTVShows() {
    console.log('👤 [MANUAL RECOVERY] Starting manual TV show recovery...');
    
    if (!this.unifiedData) {
      console.log('[MANUAL RECOVERY] No unified data available');
      return;
    }
    
    // Get all TV shows from unified data
    const allTVShows = [];
    for (const [key, item] of Object.entries(this.unifiedData)) {
      if (!item.isMovie && item.seasons) {
        allTVShows.push({
          key: key,
          name: item.name || item.title || 'Unknown',
          seasons: Object.keys(item.seasons).length,
          poster: item.poster || '/assets/img/placeholder-poster.jpg'
        });
      }
    }
    
    if (allTVShows.length === 0) {
      console.log('[MANUAL RECOVERY] No TV shows found in unified data');
      return;
    }
    
    console.log(`[MANUAL RECOVERY] Found ${allTVShows.length} TV shows available for manual selection`);
    
    // Create a simple selection interface
    const selectionHTML = `
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                  background: white; border: 2px solid #007bff; border-radius: 10px; 
                  padding: 20px; max-height: 80vh; overflow-y: auto; z-index: 10000;">
        <h3>Select TV Shows to Add to Favorites</h3>
        <p>Found ${allTVShows.length} TV shows. Select the ones you want to add back to favorites:</p>
        <div style="max-height: 400px; overflow-y: auto;">
          ${allTVShows.map(tvShow => `
            <label style="display: block; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
              <input type="checkbox" value="${tvShow.key}" style="margin-right: 10px;">
              <strong>${tvShow.name}</strong> (${tvShow.seasons} seasons)
            </label>
          `).join('')}
        </div>
        <div style="margin-top: 20px; text-align: center;">
          <button onclick="window.mediaLibraryManager.confirmManualRecovery()" 
                  style="background: #007bff; color: white; border: none; padding: 10px 20px; 
                         border-radius: 5px; margin-right: 10px;">Add Selected to Favorites</button>
          <button onclick="document.querySelector('[style*=\"position: fixed\"]').remove()" 
                  style="background: #6c757d; color: white; border: none; padding: 10px 20px; 
                         border-radius: 5px;">Cancel</button>
        </div>
      </div>
    `;
    
    // Add the selection interface to the page
    document.body.insertAdjacentHTML('beforeend', selectionHTML);
    
    // Store the TV shows data for later use
    this.manualRecoveryData = allTVShows;
  }
  
  // Confirm manual recovery selection
  confirmManualRecovery() {
    const selectedKeys = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
      .map(checkbox => checkbox.value);
    
    if (selectedKeys.length === 0) {
      this.showToast('Please select at least one TV show to add to favorites.', 'warning');
      return;
    }
    
    console.log(`[MANUAL RECOVERY] User selected ${selectedKeys.length} TV shows:`, selectedKeys);
    
    // Get current favorites
    const currentFavorites = this.getFavoritesList();
    
    // Add selected TV shows to favorites
    const selectedTVShows = selectedKeys.map(key => this.unifiedData[key]);
    currentFavorites.tvshows = [...selectedTVShows, ...currentFavorites.tvshows];
    
    // Save back to localStorage
    localStorage.setItem("mediaLibraryFavoritesByType", JSON.stringify(currentFavorites));
    
    console.log('[MANUAL RECOVERY] Selected TV shows added to favorites!');
    
    // Remove the selection interface
    document.querySelector('[style*="position: fixed"]').remove();
    
    // Refresh the favorites display
    if (this.currentTab === "favorites") {
      this.updateModalContent();
    }
    
    this.showToast(`Successfully added ${selectedKeys.length} TV shows to favorites!`, 'success');
  }
  
  // RECOVERY FUNCTION: Pull TV shows from all 3 tiers of safety system
  async recoverTVShowsFromAllSources() {
    console.log('🚀 [RECOVERY] Starting TV show recovery from all safety tiers...');
    
    const recoveredTVShows = [];
    let recoverySource = 'none';
    
    // TIER 1: Check localStorage for any hidden TV show data
    console.log('🔍 [RECOVERY] TIER 1: Checking localStorage for hidden TV show data...');
    const localStorageKeys = ['mediaLibraryFavorites', 'favorites', 'tvFavorites', 'tvShowsFavorites', 'mediaCollections'];
    
    for (const key of localStorageKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          console.log(`[RECOVERY] Found data in key "${key}":`, data);
          
          // Look for TV shows in various formats
          if (data.tvshows && Array.isArray(data.tvshows)) {
            console.log(`[RECOVERY] Found ${data.tvshows.length} TV shows in localStorage key "${key}"`);
            recoveredTVShows.push(...data.tvshows);
            recoverySource = `localStorage:${key}`;
          }
          if (data.tvShows && Array.isArray(data.tvShows)) {
            console.log(`[RECOVERY] Found ${data.tvShows.length} TV shows in localStorage key "${key}"`);
            recoveredTVShows.push(...data.tvShows);
            recoverySource = `localStorage:${key}`;
          }
          if (data.tv && Array.isArray(data.tv)) {
            console.log(`[RECOVERY] Found ${data.tv.length} TV shows in localStorage key "${key}"`);
            recoveredTVShows.push(...data.tv);
            recoverySource = `localStorage:${key}`;
          }
        }
      } catch (e) {
        console.log(`[RECOVERY] Key "${key}" not parseable as JSON`);
      }
    }
    
    // TIER 2: Check MongoDB Collections
    console.log('🗄️ [RECOVERY] TIER 2: Checking MongoDB collections...');
    try {
      // Check multiple MongoDB endpoints for TV show data
      const endpoints = [
        '/api/collections',
        '/api/favorites', 
        '/api/tvshows',
        '/api/media'
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`[RECOVERY] Checking MongoDB endpoint: ${endpoint}`);
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            console.log(`[RECOVERY] MongoDB endpoint ${endpoint} returned:`, data);
            
            // Look for TV shows in various data structures
            if (Array.isArray(data)) {
              // Direct array of items
              const tvShowItems = data.filter(item => {
                if (typeof item === 'string') {
                  return item.toLowerCase().includes('tvshows');
                }
                if (typeof item === 'object') {
                  // Use type field if available, otherwise fall back to path detection
                  return item.type === 'tvshow' || item.mediaType === 'tvshow' || 
                         (item.path && item.path.toLowerCase().includes('tvshows'));
                }
                return false;
              });
              
              if (tvShowItems.length > 0) {
                console.log(`[RECOVERY] Found ${tvShowItems.length} TV show items in MongoDB endpoint ${endpoint}`);
                recoveredTVShows.push(...tvShowItems);
                recoverySource = `MongoDB:${endpoint}`;
              }
            } else if (data && typeof data === 'object') {
              // Object with nested arrays
              for (const [key, value] of Object.entries(data)) {
                if (Array.isArray(value)) {
                  const tvShowItems = value.filter(item => {
                    if (typeof item === 'string') {
                      return item.toLowerCase().includes('tvshows');
                    }
                    if (typeof item === 'object') {
                      // Use type field if available, otherwise fall back to path detection
                      return item.type === 'tvshow' || item.mediaType === 'tvshow' || 
                             (item.path && item.path.toLowerCase().includes('tvshows'));
                    }
                    return false;
                  });
                  
                  if (tvShowItems.length > 0) {
                    console.log(`[RECOVERY] Found ${tvShowItems.length} TV show items in MongoDB ${endpoint}.${key}`);
                    recoveredTVShows.push(...tvShowItems);
                    recoverySource = `MongoDB:${endpoint}.${key}`;
                  }
                }
              }
            }
          } else {
            console.log(`[RECOVERY] MongoDB endpoint ${endpoint} returned status: ${response.status}`);
          }
        } catch (error) {
          console.log(`[RECOVERY] MongoDB endpoint ${endpoint} failed:`, error.message);
        }
      }
    } catch (error) {
      console.warn('[RECOVERY] MongoDB fetch failed:', error);
    }
    
    // TIER 3: Check unified data for any TV shows that should be favorited
    console.log('📁 [RECOVERY] TIER 3: Checking unified data for potential TV show favorites...');
    if (this.unifiedData) {
      const potentialTVShows = [];
      for (const [key, item] of Object.entries(this.unifiedData)) {
        if (!item.isMovie && item.seasons) {
          // This is a TV show with seasons - check if it should be favorited
          potentialTVShows.push(item);
        }
      }
      
      if (potentialTVShows.length > 0) {
        console.log(`[RECOVERY] Found ${potentialTVShows.length} TV shows in unified data that could be favorites`);
        // Don't auto-add them, but log them for manual review
        console.log('[RECOVERY] Potential TV show favorites:', potentialTVShows.map(t => t.name || t.title));
      }
    }
    
    // TIER 4: Check local JSON files for favorites data
    console.log('📄 [RECOVERY] TIER 4: Checking local JSON files for favorites data...');
    try {
      // Check if there are any local favorites JSON files
      const localFavoritesEndpoints = [
        '/components/MediaLibrary/data/favorites.json',
        '/components/MediaLibrary/data/tvshows-favorites.json',
        '/components/MediaLibrary/data/movies-favorites.json',
        '/data/favorites.json',
        '/data/tvshows-favorites.json'
      ];
      
      for (const endpoint of localFavoritesEndpoints) {
        try {
          console.log(`[RECOVERY] Checking local JSON file: ${endpoint}`);
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            console.log(`[RECOVERY] Local JSON file ${endpoint} contains:`, data);
            
            // Look for TV shows in the local JSON data
            if (data && typeof data === 'object') {
              // Check various possible structures
              const possibleTVShowArrays = [
                data.tvshows, data.tvShows, data.tv, data.shows,
                data.favorites?.tvshows, data.favorites?.tvShows,
                data.items?.filter(item => item.type === 'tv' || item.mediaType === 'tv')
              ].filter(Boolean);
              
              for (const tvArray of possibleTVShowArrays) {
                if (Array.isArray(tvArray) && tvArray.length > 0) {
                  console.log(`[RECOVERY] Found ${tvArray.length} TV shows in local JSON file ${endpoint}`);
                  recoveredTVShows.push(...tvArray);
                  recoverySource = `LocalJSON:${endpoint}`;
                }
              }
            }
          } else {
            console.log(`[RECOVERY] Local JSON file ${endpoint} not found (status: ${response.status})`);
          }
        } catch (error) {
          console.log(`[RECOVERY] Local JSON file ${endpoint} failed to load:`, error.message);
        }
      }
    } catch (error) {
      console.warn('[RECOVERY] Local JSON file check failed:', error);
    }
    
    // Process recovered TV shows
    if (recoveredTVShows.length > 0) {
      console.log(`[RECOVERY] Successfully recovered ${recoveredTVShows.length} TV shows from ${recoverySource}`);
      
      // Remove duplicates
      const uniqueTVShows = [];
      const seenPaths = new Set();
      
      recoveredTVShows.forEach(tvShow => {
        const path = tvShow.path || tvShow.absPath || '';
        if (path && !seenPaths.has(path)) {
          seenPaths.add(path);
          uniqueTVShows.push(tvShow);
        }
      });
      
      console.log(`[RECOVERY] After deduplication: ${uniqueTVShows.length} unique TV shows`);
      
      // Get current favorites
      const currentFavorites = this.getFavoritesList();
      
      // Add recovered TV shows to favorites
      currentFavorites.tvshows = [...uniqueTVShows, ...currentFavorites.tvshows];
      
      // Save back to localStorage
      localStorage.setItem("mediaLibraryFavoritesByType", JSON.stringify(currentFavorites));
      
      console.log('[RECOVERY] TV shows restored to favorites!');
      console.log('[RECOVERY] New favorites count - Movies:', currentFavorites.movies.length, 'TV Shows:', currentFavorites.tvshows.length);
      
      return uniqueTVShows;
    } else {
      console.log('[RECOVERY] No TV shows found in any safety tier');
      return [];
    }
  }

  renderFavoritesContent() {
    // SIMPLE: Just read from localStorage - NO DEPENDENCIES
    const stored = localStorage.getItem("mediaLibraryFavoritesByType");
    let favorites = { movies: [], tvshows: [] };
    if (stored) {
      try {
        favorites = JSON.parse(stored);
      } catch (e) {
        console.error("[DEBUG - FAVORITES] Failed to parse localStorage:", e);
      }
    }
    
    // DEBUG: Check ALL localStorage keys for any TV show data
    console.log('[DEBUG - FAVORITES] Checking ALL localStorage keys for TV show data...');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes('tv') || key && key.toLowerCase().includes('show')) {
        console.log('[DEBUG - FAVORITES] Found potential TV show key:', key);
        try {
          const value = JSON.parse(localStorage.getItem(key));
          console.log('[DEBUG - FAVORITES] Key value:', value);
        } catch (e) {
          console.log('[DEBUG - FAVORITES] Key value (not JSON):', localStorage.getItem(key));
        }
      }
    }
    
    // DEBUG: Check for old favorites keys
    const oldKeys = ['mediaLibraryFavorites', 'favorites', 'tvFavorites', 'tvShowsFavorites'];
    oldKeys.forEach(oldKey => {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue) {
        console.log('[DEBUG - FAVORITES] Found old favorites key:', oldKey, 'with value:', oldValue);
      }
    });
    
    // Debug: Log the original favorites data before migration
    console.log('[DEBUG - FAVORITES] Original favorites data:', favorites);
    console.log('[DEBUG - FAVORITES] Original TV shows count:', favorites.tvshows ? favorites.tvshows.length : 0);
    
    // Migrate old path-based favorites to new object-based system
    favorites = this.migrateFavoritesToObjects(favorites);
    
    // Debug: Log the migrated favorites data
    console.log('[DEBUG - FAVORITES] After migration - Movies:', favorites.movies ? favorites.movies.length : 0, 'TV Shows:', favorites.tvshows ? favorites.tvshows.length : 0);
    
    const movies = favorites.movies || [];
    const tvshows = favorites.tvshows || [];
    
    // Apply deduplication to movies to prevent duplicate entries
    const deduplicatedMovies = this.deduplicateMovies(movies);
    
    // Re-categorize items: Move TV shows from movies array to TV shows array
    const correctlyCategorizedMovies = [];
    const correctlyCategorizedTVShows = [...tvshows]; // Start with existing TV shows
    
    if (this.unifiedData) {
      console.log('[DEBUG - FAVORITES] Re-categorizing favorites based on unified data...');
      
      deduplicatedMovies.forEach(movieObj => {
        let isActuallyTVShow = false;
        let displayTitle = movieObj.title || movieObj.TMDBTitle || movieObj.name || 'Unknown';
        
        // Clean the title for comparison
        if (this.cleanMovieTitle) {
          displayTitle = this.cleanMovieTitle(displayTitle);
        } else {
          displayTitle = displayTitle.replace(/\[\d{3,4}p\]/gi, "").replace(/\[.*?\]/g, "").trim();
        }
        
        // First check if the item itself already indicates it's a TV show
        if (movieObj.type === 'tv' || movieObj.type === 'tvshow' || movieObj.mediaType === 'tv' || movieObj.mediaType === 'tvshow') {
          console.log('[DEBUG - FAVORITES] ✅ Item already marked as TV show in localStorage:', displayTitle, '- type:', movieObj.type, 'mediaType:', movieObj.mediaType);
          isActuallyTVShow = true;
          correctlyCategorizedTVShows.push({
            ...movieObj,
            type: 'tvshow',
            mediaType: 'tvshow'
          });
        } else {
          // Check in unified data to see if this is actually a TV show
          for (const [key, mediaData] of Object.entries(this.unifiedData)) {
            const mediaTitle = mediaData.title || mediaData.about?.title;
            if (mediaTitle === displayTitle) {
              if (mediaData.type === 'tvshow') {
                console.log('[DEBUG - FAVORITES] ✅ Moving TV show from movies to TV shows (found in unified data):', displayTitle);
                isActuallyTVShow = true;
                // Add to TV shows array with correct type
                correctlyCategorizedTVShows.push({
                  ...movieObj,
                  type: 'tvshow',
                  mediaType: 'tvshow'
                });
              }
              break;
            }
          }
        }
        
        // If it's not a TV show, keep it in movies
        if (!isActuallyTVShow) {
          correctlyCategorizedMovies.push(movieObj);
        }
      });
      
      console.log('[DEBUG - FAVORITES] Re-categorization complete:');
      console.log('[DEBUG - FAVORITES] - Movies:', correctlyCategorizedMovies.length, '(was', deduplicatedMovies.length, ')');
      console.log('[DEBUG - FAVORITES] - TV Shows:', correctlyCategorizedTVShows.length, '(was', tvshows.length, ')');
    } else {
      // No unified data available, use original arrays
      console.log('[DEBUG - FAVORITES] No unified data available for re-categorization');
      correctlyCategorizedMovies.push(...deduplicatedMovies);
    }
    
    console.log('[DEBUG - FAVORITES] Rendering favorites - Movies:', correctlyCategorizedMovies.length, 'TV Shows:', correctlyCategorizedTVShows.length);
    console.log('[DEBUG - FAVORITES] Original movies count:', movies.length, 'Deduplicated count:', deduplicatedMovies.length);
    console.log('[DEBUG - FAVORITES] Correctly categorized movies data:', correctlyCategorizedMovies);
    console.log('[DEBUG - FAVORITES] Correctly categorized TV Shows data:', correctlyCategorizedTVShows);
    
    // Debug: Log the structure of TV show objects to understand their properties
    if (correctlyCategorizedTVShows.length > 0) {
      console.log('[DEBUG - FAVORITES] First TV show object structure:', correctlyCategorizedTVShows[0]);
      console.log('[DEBUG - FAVORITES] TV show object keys:', Object.keys(correctlyCategorizedTVShows[0]));
    }
    console.log('[DEBUG - FAVORITES] Unified data available:', !!this.unifiedData);
    console.log('[DEBUG - FAVORITES] Unified data count:', this.unifiedData ? Object.keys(this.unifiedData).length : 0);
    
    // Debug: Check if we have old path-based data that needs migration
    if (movies.length > 0 && typeof movies[0] === 'string') {
      console.log('[DEBUG - FAVORITES] DETECTED: Old path-based favorites data - need to migrate');
    }
    if (tvshows.length > 0 && typeof tvshows[0] === 'string') {
      console.log('[DEBUG - FAVORITES] DETECTED: Old path-based favorites data - need to migrate');
    }
    // Build the HTML for the favorites view with proper two-column layout
    let html =
      '<div class="container-favorites" style="display: flex; gap: 20px;">';
    // MOVIES SECTION (LEFT SIDE)
    html += '<div class="movies-section-favorites" style="flex: 1;">';
    html += '<h3 class="section-title-movies-favorites">MOVIES</h3>';
    if (correctlyCategorizedMovies.length > 0) {
      html += '<div class="media-library-movie-grid">';
      correctlyCategorizedMovies.forEach((movieObj) => {
        // Defensive check: ensure we have a valid movie object with required properties
        if (!movieObj || typeof movieObj !== 'object') {
          console.warn('[DEBUG - FAVORITES] Invalid movie object:', movieObj);
          return; // Skip this item
        }
        
        // Ensure we have the minimum required properties for a complete movie object
        if (!movieObj.title && !movieObj.TMDBTitle && !movieObj.name) {
          console.warn('[DEBUG - FAVORITES] Movie object missing title:', movieObj);
          return; // Skip incomplete objects
        }
        
        if (!movieObj.poster) {
          console.warn('[DEBUG - FAVORITES] Movie object missing poster:', movieObj);
          return; // Skip objects without posters
        }
        
        // DEBUG: Log the actual movieObj to see what we're working with
        console.log('[DEBUG - FAVORITES] Processing movieObj:', movieObj);
        console.log('[DEBUG - FAVORITES] movieObj type:', typeof movieObj);
        console.log('[DEBUG - FAVORITES] movieObj keys:', movieObj && typeof movieObj === 'object' ? Object.keys(movieObj) : 'N/A');
        
        // Use the working approach from the backup: treat favorites as file paths
        let path = '';
        let displayTitle = '';
        let posterSrc = '';
        
        if (typeof movieObj === 'string') {
          // Old format: favorites stored as file path strings
          path = movieObj;
          const cleanTitle = this.cleanMovieTitle ? this.cleanMovieTitle(path.split(/[\\/]/).pop() || "") : path.split(/[\\/]/).pop() || "";
          displayTitle = this.capitalizeTitle ? this.capitalizeTitle(cleanTitle) : cleanTitle;
          console.log('[DEBUG - FAVORITES] Using old path-based format. Path:', path, 'Title:', displayTitle);
        } else if (movieObj.path || movieObj.absPath || movieObj.type === 'movie') {
          // New format: favorites stored as movie objects
          let basePath = movieObj.path || movieObj.absPath;
          let rawTitle = movieObj.title || movieObj.TMDBTitle || movieObj.name || 'Unknown Movie';
          
          // Clean the title to remove quality information and format it properly
          if (this.cleanMovieTitle) {
            displayTitle = this.cleanMovieTitle(rawTitle);
          } else {
            // Fallback: manually remove quality tags if cleanMovieTitle is not available
            displayTitle = rawTitle.replace(/\[\d{3,4}p\]/gi, "").replace(/\[.*?\]/g, "").trim();
          }
          
          posterSrc = movieObj.poster;
          
          // Always try to find the complete video file path in unified data
          if (this.unifiedData) {
            let foundVideoPath = null;
            
            // First, try to find by normalizedKey if available
            if (movieObj.normalizedKey && this.unifiedData[movieObj.normalizedKey]) {
              const movieData = this.unifiedData[movieObj.normalizedKey];
              if (movieData.type === 'movie' && movieData.files && movieData.files.length > 0) {
                foundVideoPath = movieData.files[0].absPath;
                console.log('[DEBUG - FAVORITES] Found video file path by normalizedKey:', foundVideoPath);
              }
            }
            
            // If not found by normalizedKey, search by title in both movies and TV shows
            if (!foundVideoPath) {
              console.log('[DEBUG - FAVORITES] Searching unified data by title for:', displayTitle);
              for (const [key, mediaData] of Object.entries(this.unifiedData)) {
                // Check both movies and TV shows
                if ((mediaData.type === 'movie' || mediaData.type === 'tvshow') && mediaData.files) {
                  // Check if this item matches by title
                  const mediaTitle = mediaData.title || mediaData.about?.title;
                  console.log('[DEBUG - FAVORITES] Checking', mediaData.type + ':', key, 'Title:', mediaTitle, 'vs:', displayTitle);
                  if (mediaTitle === displayTitle) {
                    // Found the item, get the first video file path
                    if (mediaData.files.length > 0) {
                      foundVideoPath = mediaData.files[0].absPath;
                      console.log('[DEBUG - FAVORITES] Found video file path by title match (', mediaData.type, '):', foundVideoPath);
                      
                      // If this is a TV show but it's in the movies array, we need to move it to TV shows array
                      if (mediaData.type === 'tvshow') {
                        console.log('[DEBUG - FAVORITES] ⚠️  FOUND TV SHOW IN MOVIES ARRAY:', displayTitle, '- This should be moved to TV shows!');
                      }
                      break;
                    }
                  }
                }
              }
            }
            
            if (foundVideoPath) {
              path = foundVideoPath;
              console.log('[DEBUG - FAVORITES] Using complete video file path:', path);
            } else {
              // If we still can't find it, try to construct a path from the title
              console.warn('[DEBUG - FAVORITES] Could not find media in unified data, trying to construct path from title');
              // Try to find any media item with a similar title
              for (const [key, mediaData] of Object.entries(this.unifiedData)) {
                if ((mediaData.type === 'movie' || mediaData.type === 'tvshow') && mediaData.files) {
                  const mediaTitle = mediaData.title || mediaData.about?.title;
                  if (mediaTitle && mediaTitle.toLowerCase().includes(displayTitle.toLowerCase().replace(/[^\w\s]/g, ''))) {
                    if (mediaData.files.length > 0) {
                      path = mediaData.files[0].absPath;
                      console.log('[DEBUG - FAVORITES] Found similar', mediaData.type, 'by fuzzy title match:', key, 'Path:', path);
                      break;
                    }
                  }
                }
              }
              
              if (!path) {
                console.error('[DEBUG - FAVORITES] Could not find any matching media in unified data for:', displayTitle);
                path = displayTitle; // Fallback to title as path
              }
            }
          } else {
            console.warn('[DEBUG - FAVORITES] No unified data available, using title as path');
            path = displayTitle;
          }
          
          console.log('[DEBUG - FAVORITES] Using new object-based format. Final Path:', path, 'Title:', displayTitle);
        } else {
          // Invalid format: skip this item
          console.warn('[DEBUG - FAVORITES] Invalid movie object format:', movieObj);
          return;
        }
        
        // Get poster using the existing getPosterPath method (like the backup did)
        if (!posterSrc && this.getPosterPath) {
          // Force movie poster lookup by temporarily setting currentTab
          const originalTab = this.currentTab;
          this.currentTab = "movies";
          posterSrc = this.getPosterPath({ path: path, title: displayTitle });
          this.currentTab = originalTab;
          console.log('[DEBUG - FAVORITES] Got poster from getPosterPath:', posterSrc);
        }
        
        // FINAL DEBUG: Log what we're actually setting as data-path
        console.log('[DEBUG - FAVORITES] FINAL - Setting data-path to:', path);
        console.log('[DEBUG - FAVORITES] FINAL - This will be passed to playMovieFromFavorites as:', path);
        
        html += `
                    <div class="media-library-movie-card-movies" data-path="${path}" data-title="${displayTitle.replace(/"/g, '&quot;')}" style="cursor: pointer;">
                        <div class="favorites-only-heart-container">
                            <button class="movie-favorite-btn" title="Remove from Favorites">❤️</button>
                        </div>
                        <img class="media-library-poster poster" src="${posterSrc}" alt="${displayTitle}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                        <div class="media-info"><h3>${displayTitle}</h3></div>
                    </div>
                `;
      });
      html += "</div>";
    } else {
      html += '<div class="favorites-empty-state">No favorited movies</div>';
    }
    html += "</div>";
    // TV-SHOWS SECTION (RIGHT SIDE)
    html += '<div class="tvshows-section-favorites" style="flex: 1;">';
    html += '<h3 class="section-title-tvshows-favorites">TV-SHOWS</h3>';
    if (correctlyCategorizedTVShows.length > 0) {
      html += '<div class="media-library-tv-show-grid">';
      correctlyCategorizedTVShows.forEach((tvShowObj) => {
        // Defensive check: ensure we have a valid TV show object with required properties
        if (!tvShowObj || typeof tvShowObj !== 'object') {
          console.warn('[DEBUG - FAVORITES] Invalid TV show object:', tvShowObj);
          return; // Skip this item
        }
        
        // Ensure we have the minimum required properties for a complete TV show object
        // TV shows can have different property structures than movies
        const hasTitle = tvShowObj.title || tvShowObj.TMDBTitle || tvShowObj.name || tvShowObj.showName;
        const hasPoster = tvShowObj.poster || tvShowObj.posterUrl || tvShowObj.image;
        
        if (!hasTitle) {
          console.warn('[DEBUG - FAVORITES] TV show object missing title:', tvShowObj);
          return; // Skip incomplete objects
        }
        
        if (!hasPoster) {
          console.warn('[DEBUG - FAVORITES] TV show object missing poster:', tvShowObj);
          return; // Skip objects without posters
        }
        
        // Use the complete TV show object data
        const displayTitle = hasTitle;
        
        // Use the poster we saved when favoriting (this should be the working one!)
        let posterSrc = hasPoster;
        const path = tvShowObj.path || tvShowObj.absPath || '';
        
        console.log('[DEBUG - FAVORITES] TV show object being rendered:', tvShowObj);
        console.log('[DEBUG - FAVORITES] TV show saved poster:', posterSrc);
        console.log('[DEBUG - FAVORITES] TV show path:', path);
        
        // Only fall back to unified data if we don't have a poster at all
        if (!posterSrc) {
          console.log('[DEBUG - FAVORITES] No saved poster, trying unified data fallback...');
          if (this.unifiedData) {
            for (const [key, item] of Object.entries(this.unifiedData)) {
              if (!item.isMovie && item.seasons && 
                  ((item.path && item.path === path) || 
                   (item.absPath && item.absPath === path))) {
                posterSrc = item.poster || item.posterUrl || item.image;
                console.log('[DEBUG - FAVORITES] Found poster in unified data fallback:', posterSrc);
                break;
              }
            }
          }
        } else {
          console.log('[DEBUG - FAVORITES] Using saved poster (should be working!):', posterSrc);
        }
        
        html += `
                    <div class="media-library-movie-card-tvshows" data-path="${path}">
                        <div class="favorites-only-heart-container">
                            <button class="tv-favorite-btn" title="Remove from Favorites">❤️</button>
                        </div>
                        <img class="media-library-poster poster" src="${posterSrc}" alt="${displayTitle}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
                        <div class="media-info"><h3 class="media-library-tvshow-title">${displayTitle}</h3></div>
                    </div>
                `;
      });
      html += "</div>";
    } else {
      html += '<div class="favorites-empty-state">No favorited TV shows</div>';
    }
    html += "</div>";
    html += "</div>";
    return html;
  }
  
  // Add debug function to window object for testing
  static addDebugFunctionsToWindow(instance) {
    window.mediaLibraryManager = instance;
    window.debugMediaLibraryState = () => instance.debugMediaLibraryState();
    window.debugBoredToDeath = () => instance.debugBoredToDeath();
    window.debugLocalStorageForTVShows = () => instance.debugLocalStorageForTVShows();
    window.recoverTVShowsFromAllSources = () => instance.recoverTVShowsFromAllSources();
    window.quickRecoverTVShowsFromUnifiedData = async () => await instance.quickRecoverTVShowsFromUnifiedData();
    window.manualRecoverTVShows = () => instance.manualRecoverTVShows();
    window.debugHeartSystem = () => instance.debugHeartSystem();
  }

  // Helper method to get appropriate label for different content types
  getContentTypeLabel(seasonName, episodes) {
    if (!episodes || episodes.length === 0) return 'Episodes';
    
    // Check if this is special content based on season name or episode data
    const isSpecialContent = seasonName.toLowerCase().includes('specials') ||
                            seasonName.toLowerCase().includes('featurettes') ||
                            seasonName.toLowerCase().includes('extras');
    
    if (isSpecialContent) {
      // Determine specific content type
      if (seasonName.toLowerCase().includes('specials')) {
        return 'Specials';
      } else if (seasonName.toLowerCase().includes('featurettes') ||
                 seasonName.toLowerCase().includes('featurette')) {
        return 'Featurettes';
      } else if (seasonName.toLowerCase().includes('extras')) {
        return 'Extras';
      } else {
        // Check episode data for contentType
        const firstEpisode = episodes[0];
        if (firstEpisode && firstEpisode.contentType) {
          return firstEpisode.contentType;
        }
        return 'Episodes';
      }
    }
    
    return 'Episodes';
  }
}
export default MediaLibraryManager;
 
 

