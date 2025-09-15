/*
  GLOBALDATASYNCCONTROLLER.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

/**
 * GLOBAL DATA SYNC CONTROLLER - STREAM-BASED ARCHITECTURE
 * Universal controller implementing stream-based data flow for all data types
 * 
 * STREAM RETRIEVE FLOW: localStorage (cache) → JSON (local store) → MongoDB (persistent store)
 * STREAM STORAGE FLOW: localStorage (cache) → JSON (local store) → MongoDB (persistent store)
 * 
 * Handles any data type: collections, favorites, media library, settings, etc.
 * Prevents recurring synchronization issues across the entire application
 * Implements proper cache invalidation and data streaming
 */

class GlobalDataSyncController {
  constructor() {
    this.isInitialized = false;
    this.syncInProgress = new Map(); // Track sync progress per data type
    this.syncQueues = new Map(); // Separate queues for each data type
    this.dataSources = new Map(); // Configure data sources per type
    this.validators = new Map(); // Custom validators per data type
    this.lastSyncTimestamps = new Map(); // Track last sync per data type
    
    // Initialize default data types
    this.initializeDataTypes();
    
    console.log('🌐 [GLOBAL-SYNC] Global Data Sync Controller initialized');
  }

  /**
   * Initialize default data types and their configurations
   */
  initializeDataTypes() {
    // Collections data type
    this.registerDataType('collections', {
      localStorage: 'mediaCollections',
      jsonFile: '/components/MediaLibrary/data/collections.json',
      mongodb: 'collections_backup',
      validator: this.validateCollectionsData.bind(this),
      cleaner: this.cleanCollectionsData.bind(this)
    });

    // Favorites data type
    this.registerDataType('favorites', {
      localStorage: 'mediaLibraryFavoritesByType',
      jsonFile: '/components/MediaLibrary/data/favorites.json',
      mongodb: 'favorites_backup',
      validator: this.validateFavoritesData.bind(this),
      cleaner: this.cleanFavoritesData.bind(this)
    });

    // Media Library data type
    this.registerDataType('mediaLibrary', {
      localStorage: 'mediaLibraryData',
      jsonFile: '/components/MediaLibrary/data/media-library.json',
      mongodb: 'mediaLibrary_backup',
      validator: this.validateMediaLibraryData.bind(this),
      cleaner: this.cleanMediaLibraryData.bind(this)
    });

    // Settings data type
    this.registerDataType('settings', {
      localStorage: 'appSettings',
      jsonFile: '/components/Settings/settings.json',
      mongodb: 'settings_backup',
      validator: this.validateSettingsData.bind(this),
      cleaner: this.cleanSettingsData.bind(this)
    });

    // YouTube Searches data type
    this.registerDataType('youtubeSearches', {
      localStorage: 'youtubeSearchCache',
      jsonFile: '/components/YouTubeSearch/data/youtube-searches.json',
      mongodb: 'youtube_searches_backup',
      validator: this.validateYouTubeSearchesData.bind(this),
      cleaner: this.cleanYouTubeSearchesData.bind(this)
    });

    console.log('📋 [GLOBAL-SYNC] Initialized data types:', Array.from(this.dataSources.keys()));
  }

  /**
   * Register a new data type with its configuration
   */
  registerDataType(dataType, config) {
    this.dataSources.set(dataType, {
      localStorage: config.localStorage,
      jsonFile: config.jsonFile,
      mongodb: config.mongodb,
      validator: config.validator || this.defaultValidator,
      cleaner: config.cleaner || this.defaultCleaner
    });
    console.log(`📝 [GLOBAL-SYNC] Registered data type: ${dataType}`);
  }

  /**
   * Initialize the global sync controller
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🔄 [GLOBAL-SYNC] Initializing global sync controller...');
      
      // Load actor names for collections validation (if needed)
      await this.loadActorNames();
      
      // Perform initial sync check for all data types
      await this.performInitialSyncCheck();
      
      this.isInitialized = true;
      console.log('✅ [GLOBAL-SYNC] Global sync controller initialized successfully');
      
    } catch (error) {
      console.error('❌ [GLOBAL-SYNC] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Load actor names for collections validation
   */
  async loadActorNames() {
    try {
      this.actorNames = new Set();
      
      // Load TV show actors
      const tvResponse = await fetch('/components/MediaLibrary/data/tv-shows/tv-shows-unified.json');
      if (tvResponse.ok) {
        const tvShowsData = await tvResponse.json();
        Object.values(tvShowsData).forEach(show => {
          if (show.cast && Array.isArray(show.cast)) {
            show.cast.forEach(actor => {
              if (actor.name) {
                this.actorNames.add(actor.name);
              }
            });
          }
        });
      }
      
      // Load movie actors
      const movieResponse = await fetch('/components/MediaLibrary/data/movies/movies-unified.json');
      if (movieResponse.ok) {
        const moviesData = await movieResponse.json();
        Object.values(moviesData).forEach(movie => {
          if (movie.cast && Array.isArray(movie.cast)) {
            movie.cast.forEach(actor => {
              if (actor.name) {
                this.actorNames.add(actor.name);
              }
            });
          }
        });
      }
      
      console.log(`👥 [GLOBAL-SYNC] Loaded ${this.actorNames.size} actor names for validation`);
      
    } catch (error) {
      console.warn('⚠️ [GLOBAL-SYNC] Could not load actor names:', error);
    }
  }

  /**
   * Perform initial sync check for all data types
   */
  async performInitialSyncCheck() {
    try {
      console.log('🔍 [GLOBAL-SYNC] Performing initial sync check for all data types...');
      
      for (const dataType of this.dataSources.keys()) {
        await this.checkDataTypeSync(dataType);
      }
      
      console.log('✅ [GLOBAL-SYNC] Initial sync check completed for all data types');
      
    } catch (error) {
      console.error('❌ [GLOBAL-SYNC] Initial sync check failed:', error);
    }
  }

  /**
   * Check sync status for a specific data type
   */
  async checkDataTypeSync(dataType) {
    try {
      console.log(`🔍 [GLOBAL-SYNC] Checking sync for data type: ${dataType}`);
      
      const localStorageData = this.getLocalStorageData(dataType);
      const jsonFileData = await this.getJsonFileData(dataType);
      
      const cleanLocalStorageData = this.cleanData(dataType, localStorageData);
      const cleanJsonFileData = this.cleanData(dataType, jsonFileData);
      
      const inconsistencies = this.detectInconsistencies(cleanLocalStorageData, cleanJsonFileData);
      
      if (inconsistencies.length > 0) {
        console.warn(`⚠️ [GLOBAL-SYNC] Found inconsistencies in ${dataType}:`, inconsistencies);
        await this.resolveInconsistencies(dataType, cleanLocalStorageData, cleanJsonFileData);
      } else {
        console.log(`✅ [GLOBAL-SYNC] ${dataType} is in sync`);
      }
      
    } catch (error) {
      console.error(`❌ [GLOBAL-SYNC] Failed to check sync for ${dataType}:`, error);
    }
  }

  /**
   * MAIN SYNC METHOD - Universal sync for any data type
   * Follows STREAM STORAGE flow: localStorage (cache) → JSON (local store) → MongoDB (persistent store)
   */
  async sync(dataType, newData, operation = 'update') {
    if (!this.dataSources.has(dataType)) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    if (this.syncInProgress.get(dataType)) {
      console.log(`⏳ [GLOBAL-SYNC] Sync already in progress for ${dataType}, queuing operation...`);
      return new Promise((resolve) => {
        if (!this.syncQueues.has(dataType)) {
          this.syncQueues.set(dataType, []);
        }
        this.syncQueues.get(dataType).push({ newData, operation, resolve });
      });
    }
    
    this.syncInProgress.set(dataType, true);
    
    try {
      console.log(`🌊 [GLOBAL-SYNC] Starting STREAM STORAGE for ${dataType}: ${operation}`);
      
      // STREAM STEP 1: GATHER current data using retrieve flow
      const currentData = await this.getCleanData(dataType);
      console.log(`📊 [GLOBAL-SYNC] Current ${dataType} data retrieved:`, this.getDataSize(currentData));
      
      // STREAM STEP 2: MERGE new data with current data
      const mergedData = { ...currentData, ...newData };
      console.log(`🔀 [GLOBAL-SYNC] Merged ${dataType} with new data:`, this.getDataSize(mergedData));
      
      // STREAM STEP 3: CLEAN the merged data
      const cleanedData = this.cleanData(dataType, mergedData);
      console.log(`🧹 [GLOBAL-SYNC] Cleaned ${dataType} data:`, this.getDataSize(cleanedData));
      
      // STREAM STEP 4: STORE following stream flow: localStorage → JSON → MongoDB
      await this.streamStorage(dataType, cleanedData);
      
      // Update timestamp
      this.lastSyncTimestamps.set(dataType, Date.now());
      
      console.log(`✅ [GLOBAL-SYNC] STREAM STORAGE completed for ${dataType}: ${operation}`);
      
      // Process queued operations
      this.processSyncQueue(dataType);
      
      return { success: true, data: cleanedData };
      
    } catch (error) {
      console.error(`❌ [GLOBAL-SYNC] STREAM STORAGE failed for ${dataType}: ${operation}`, error);
      this.syncInProgress.set(dataType, false);
      throw error;
    }
  }

  /**
   * Get clean data for any data type following the STREAM RETRIEVE flow: localStorage (cache) → JSON (local store) → MongoDB (persistent store)
   */
  async getCleanData(dataType) {
    if (!this.dataSources.has(dataType)) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    await this.initialize();
    
    console.log(`🌊 [GLOBAL-SYNC] STREAM RETRIEVE: ${dataType} data flow: localStorage (cache) → JSON (local store) → MongoDB (persistent store)`);
    
    // STREAM STEP 1: Try localStorage first (cache - most current data)
    let data = this.getLocalStorageData(dataType);
    console.log(`💾 [GLOBAL-SYNC] ${dataType} localStorage (cache):`, this.getDataSize(data));
    
    // STREAM STEP 2: If cache is empty/outdated, try JSON file (local store)
    if (this.isEmpty(data) || this.isDataOutdated(dataType, data)) {
      console.log(`📄 [GLOBAL-SYNC] ${dataType} cache empty/outdated, retrieving from JSON (local store)...`);
      data = await this.getJsonFileData(dataType);
      console.log(`📄 [GLOBAL-SYNC] ${dataType} JSON (local store):`, this.getDataSize(data));
      
      // Stream the JSON data back to cache for future retrievals
      if (!this.isEmpty(data)) {
        this.streamToCache(dataType, data);
        console.log(`🌊 [GLOBAL-SYNC] Streamed ${dataType} JSON data to localStorage cache`);
      }
    }
    
    // STREAM STEP 3: If local store is empty/purged, try MongoDB (persistent store)
    if (this.isEmpty(data)) {
      console.log(`🗄️ [GLOBAL-SYNC] ${dataType} local store empty/purged, retrieving from MongoDB (persistent store)...`);
      data = await this.getMongoDBData(dataType);
      console.log(`🗄️ [GLOBAL-SYNC] ${dataType} MongoDB (persistent store):`, this.getDataSize(data));
      
      // Stream the MongoDB data back through the entire pipeline
      if (!this.isEmpty(data)) {
        await this.streamToLocalStore(dataType, data);
        this.streamToCache(dataType, data);
        console.log(`🌊 [GLOBAL-SYNC] Streamed ${dataType} MongoDB data through entire pipeline`);
      }
    }
    
    // Clean the streamed data
    const cleanData = this.cleanData(dataType, data);
    console.log(`✅ [GLOBAL-SYNC] Final clean ${dataType} data streamed:`, this.getDataSize(cleanData));
    
    return cleanData;
  }

  /**
   * Get data from localStorage for a specific data type
   */
  getLocalStorageData(dataType) {
    try {
      const key = this.dataSources.get(dataType).localStorage;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn(`⚠️ [GLOBAL-SYNC] Failed to get ${dataType} localStorage data:`, error);
      return {};
    }
  }

  /**
   * Get data from JSON file for a specific data type
   */
  async getJsonFileData(dataType) {
    try {
      const jsonFile = this.dataSources.get(dataType).jsonFile;
      const response = await fetch(`${jsonFile}?v=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        // Handle different JSON structures
        if (data.collections) {
          // Convert structured format to flat format
          const flatData = {};
          Object.values(data.collections).forEach(category => {
            Object.assign(flatData, category);
          });
          return flatData;
        }
        return data;
      }
      return {};
    } catch (error) {
      console.warn(`⚠️ [GLOBAL-SYNC] Failed to get ${dataType} JSON file data:`, error);
      return {};
    }
  }

  /**
   * Get data from MongoDB for a specific data type
   */
  async getMongoDBData(dataType) {
    try {
      console.log(`🗄️ [GLOBAL-SYNC] Gathering ${dataType} data from MongoDB...`);
      
      const response = await fetch(`/api/${dataType}/get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Convert MongoDB structured format to flat format if needed
        let flatData = data;
        if (data.collections) {
          flatData = {};
          Object.values(data.collections).forEach(category => {
            Object.assign(flatData, category);
          });
        }
        
        console.log(`✅ [GLOBAL-SYNC] Successfully gathered ${dataType} from MongoDB:`, this.getDataSize(flatData));
        return flatData;
      } else {
        console.warn(`⚠️ [GLOBAL-SYNC] ${dataType} MongoDB gathering failed:`, response.status);
        return {};
      }
      
    } catch (error) {
      console.warn(`⚠️ [GLOBAL-SYNC] Failed to gather ${dataType} from MongoDB:`, error);
      return {};
    }
  }

  /**
   * STREAM STORAGE: Store data following the stream flow: localStorage (cache) → JSON (local store) → MongoDB (persistent store)
   */
  async streamStorage(dataType, data) {
    try {
      console.log(`🌊 [GLOBAL-SYNC] STREAM STORAGE: ${dataType} following flow: localStorage (cache) → JSON (local store) → MongoDB (persistent store)`);
      
      // STREAM STEP 1: Store to localStorage (cache - immediate access)
      this.streamToCache(dataType, data);
      console.log(`💾 [GLOBAL-SYNC] Streamed ${dataType} to localStorage (cache)`);
      
      // STREAM STEP 2: Clone to JSON file (local store - backup)
      await this.streamToLocalStore(dataType, data);
      console.log(`📄 [GLOBAL-SYNC] Streamed ${dataType} to JSON (local store)`);
      
      // STREAM STEP 3: Push to MongoDB (persistent store - long-term storage)
      await this.streamToPersistentStore(dataType, data);
      console.log(`🗄️ [GLOBAL-SYNC] Streamed ${dataType} to MongoDB (persistent store)`);
      
    } catch (error) {
      console.error(`❌ [GLOBAL-SYNC] STREAM STORAGE failed for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Stream data to localStorage cache
   */
  streamToCache(dataType, data) {
    try {
      const key = this.dataSources.get(dataType).localStorage;
      const dataWithTimestamp = {
        ...data,
        _syncTimestamp: Date.now(),
        _dataType: dataType
      };
      localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
      console.log(`💾 [GLOBAL-SYNC] ${dataType} streamed to cache with timestamp`);
    } catch (error) {
      console.error(`❌ [GLOBAL-SYNC] Failed to stream ${dataType} to cache:`, error);
      throw error;
    }
  }

  /**
   * Stream data to JSON local store
   */
  async streamToLocalStore(dataType, data) {
    try {
      await this.saveToJsonFile(dataType, data);
      console.log(`📄 [GLOBAL-SYNC] ${dataType} streamed to local store`);
    } catch (error) {
      console.warn(`⚠️ [GLOBAL-SYNC] Failed to stream ${dataType} to local store:`, error);
      // Don't throw - local store is backup only
    }
  }

  /**
   * Stream data to MongoDB persistent store
   */
  async streamToPersistentStore(dataType, data) {
    try {
      await this.saveToMongoDB(dataType, data);
      console.log(`🗄️ [GLOBAL-SYNC] ${dataType} streamed to persistent store`);
    } catch (error) {
      console.warn(`⚠️ [GLOBAL-SYNC] Failed to stream ${dataType} to persistent store:`, error);
      // Don't throw - persistent store is final backup only
    }
  }

  /**
   * Check if data is outdated (for cache invalidation)
   */
  isDataOutdated(dataType, data) {
    try {
      if (!data._syncTimestamp) return true;
      
      const maxAge = 5 * 60 * 1000; // 5 minutes cache age
      const age = Date.now() - data._syncTimestamp;
      
      return age > maxAge;
    } catch (error) {
      console.warn(`⚠️ [GLOBAL-SYNC] Failed to check data age for ${dataType}:`, error);
      return true; // Assume outdated if we can't check
    }
  }

  /**
   * Save data to JSON file for a specific data type
   */
  async saveToJsonFile(dataType, data) {
    try {
      console.log(`📄 [GLOBAL-SYNC] ${dataType} JSON file save requested (handled by server)`);
      // This would typically be handled by the server
    } catch (error) {
      console.warn(`⚠️ [GLOBAL-SYNC] Failed to save ${dataType} to JSON file:`, error);
      // Don't throw - JSON file is backup only
    }
  }

  /**
   * Save data to MongoDB for a specific data type
   */
  async saveToMongoDB(dataType, data) {
    try {
      // Convert flat format to MongoDB format if needed
      let mongoData = data;
      if (dataType === 'collections') {
        mongoData = {
          collections: {
            my_collections: {},
            actors: {},
            directors: {},
            genres: {},
            creative: {}
          },
          lastUpdated: new Date().toISOString()
        };
        
        // Categorize collections
        Object.entries(data).forEach(([name, items]) => {
          if (this.actorNames && this.actorNames.has(name)) {
            mongoData.collections.actors[name] = items;
          } else {
            mongoData.collections.my_collections[name] = items;
          }
        });
      }
      
      // Send to server
      const response = await fetch(`/api/${dataType}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mongoData)
      });
      
      if (response.ok) {
        console.log(`✅ [GLOBAL-SYNC] Saved ${dataType} to MongoDB successfully`);
      } else {
        console.warn(`⚠️ [GLOBAL-SYNC] ${dataType} MongoDB save failed:`, response.status);
      }
      
    } catch (error) {
      console.warn(`⚠️ [GLOBAL-SYNC] Failed to save ${dataType} to MongoDB:`, error);
      // Don't throw - MongoDB is final backup only
    }
  }

  /**
   * Clean data for a specific data type
   */
  cleanData(dataType, data) {
    const cleaner = this.dataSources.get(dataType).cleaner;
    return cleaner ? cleaner(data) : data;
  }

  /**
   * Validate data for a specific data type
   */
  validateData(dataType, data) {
    const validator = this.dataSources.get(dataType).validator;
    return validator ? validator(data) : true;
  }

  // ========================================
  // DATA TYPE SPECIFIC CLEANERS AND VALIDATORS
  // ========================================

  /**
   * Clean collections data by removing actors and invalid entries
   */
  cleanCollectionsData(collections) {
    const cleaned = {};
    let removedCount = 0;
    let keptActorCount = 0;
    
    Object.entries(collections).forEach(([name, items]) => {
      // Smart actor handling - only remove if they have no media items
      if (this.actorNames && this.actorNames.has(name)) {
        const hasMediaItems = items && (
          (Array.isArray(items) && items.length > 0) ||
          (typeof items === 'object' && Object.keys(items).length > 0)
        );
        
        if (!hasMediaItems) {
          // console.log(`🚫 [GLOBAL-SYNC] Removing EMPTY actor collection: ${name} (no media items)`);
          removedCount++;
          return;
        } else {
          // console.log(`✅ [GLOBAL-SYNC] Keeping actor collection: ${name} (has ${Array.isArray(items) ? items.length : Object.keys(items).length} media items)`);
          cleaned[name] = items;
          keptActorCount++;
          return;
        }
      }
      
      // Validate items array for non-actor collections
      if (Array.isArray(items) && items.length > 0) {
        cleaned[name] = items;
      } else {
        console.log(`🧹 [GLOBAL-SYNC] Removing empty collection: ${name}`);
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      // console.log(`🧹 [GLOBAL-SYNC] Cleaned ${removedCount} invalid collections, kept ${keptActorCount} actor collections with media`);
    } else if (keptActorCount > 0) {
      // console.log(`✅ [GLOBAL-SYNC] All ${keptActorCount} actor collections have media items - keeping them all`);
    }
    
    return cleaned;
  }

  /**
   * Clean favorites data
   */
  cleanFavoritesData(favorites) {
    // Basic validation for favorites structure
    if (!favorites || typeof favorites !== 'object') {
      return { movies: [], tvshows: [] };
    }
    
    return {
      movies: Array.isArray(favorites.movies) ? favorites.movies : [],
      tvshows: Array.isArray(favorites.tvshows) ? favorites.tvshows : []
    };
  }

  /**
   * Clean media library data
   */
  cleanMediaLibraryData(mediaLibrary) {
    // Basic validation for media library structure
    if (!mediaLibrary || typeof mediaLibrary !== 'object') {
      return {};
    }
    
    return mediaLibrary;
  }

  /**
   * Clean settings data
   */
  cleanSettingsData(settings) {
    // Basic validation for settings structure
    if (!settings || typeof settings !== 'object') {
      return {};
    }
    
    return settings;
  }

  /**
   * Clean YouTube searches data
   */
  cleanYouTubeSearchesData(youtubeData) {
    try {
      console.log('🧹 [GLOBAL-SYNC] Cleaning YouTube searches data...');
      
      if (!youtubeData || typeof youtubeData !== 'object') {
        return {};
      }
      
      const cleanedData = {};
      let removedCount = 0;
      
      // Handle different YouTube data structures
      if (Array.isArray(youtubeData)) {
        // If it's an array of searches, convert to object format
        youtubeData.forEach((search, index) => {
          if (search && search.query) {
            const key = `search_${index}_${Date.now()}`;
            cleanedData[key] = {
              query: search.query,
              timestamp: search.timestamp || Date.now(),
              searchType: search.searchType || 'search',
              results: search.results || [],
              cacheKeys: search.cacheKeys || []
            };
          }
        });
      } else {
        // Handle object format (from localStorage cache keys)
        Object.entries(youtubeData).forEach(([key, data]) => {
          // Skip sync metadata
          if (key.startsWith('_sync') || key.startsWith('_dataType')) {
            return;
          }
          
          // Clean cache entries
          if (key.startsWith('yt_')) {
            // This is a cache key, validate the data structure
            if (data && typeof data === 'object' && data.data) {
              cleanedData[key] = {
                data: data.data,
                timestamp: data.timestamp || Date.now(),
                query: this.extractQueryFromCacheKey(key),
                searchType: this.extractSearchTypeFromCacheKey(key)
              };
            } else {
              console.log(`🗑️ [GLOBAL-SYNC] Removing invalid YouTube cache entry: ${key}`);
              removedCount++;
            }
          } else {
            // This is search metadata, validate it
            if (data && typeof data === 'object' && data.query) {
              cleanedData[key] = {
                query: data.query,
                timestamp: data.timestamp || Date.now(),
                searchType: data.searchType || 'search',
                results: data.results || [],
                cacheKeys: data.cacheKeys || []
              };
            } else {
              console.log(`🗑️ [GLOBAL-SYNC] Removing invalid YouTube search entry: ${key}`);
              removedCount++;
            }
          }
        });
      }
      
      if (removedCount > 0) {
        console.log(`🧹 [GLOBAL-SYNC] Cleaned ${removedCount} invalid YouTube search entries`);
      }
      
      return cleanedData;
      
    } catch (error) {
      console.error('❌ [GLOBAL-SYNC] Error cleaning YouTube searches data:', error);
      return {};
    }
  }

  /**
   * Extract query from YouTube cache key
   */
  extractQueryFromCacheKey(cacheKey) {
    try {
      // Format: yt_search_query_p1_none or yt_channel_query_p1_none
      const parts = cacheKey.split('_');
      if (parts.length >= 3) {
        // Rejoin the query part (everything between search type and page number)
        const queryParts = parts.slice(2, -2); // Remove yt_, search type, p, page number, and token
        return queryParts.join('_').replace(/\./g, ' ');
      }
      return null;
    } catch (error) {
      console.warn('⚠️ [GLOBAL-SYNC] Failed to extract query from cache key:', cacheKey);
      return null;
    }
  }

  /**
   * Extract search type from YouTube cache key
   */
  extractSearchTypeFromCacheKey(cacheKey) {
    try {
      // Format: yt_search_query_p1_none
      const parts = cacheKey.split('_');
      if (parts.length >= 2) {
        return parts[1]; // search, channel, movies, tv, etc.
      }
      return 'search';
    } catch (error) {
      console.warn('⚠️ [GLOBAL-SYNC] Failed to extract search type from cache key:', cacheKey);
      return 'search';
    }
  }

  // ========================================
  // VALIDATOR METHODS
  // ========================================

  /**
   * Validate collections data
   */
  validateCollectionsData(collections) {
    // Basic validation for collections structure
    if (!collections || typeof collections !== 'object') {
      return false;
    }
    
    // Check if it's an empty object (which is valid)
    if (Object.keys(collections).length === 0) {
      return true;
    }
    
    // Validate collection entries
    for (const [collectionName, items] of Object.entries(collections)) {
      if (!Array.isArray(items)) {
        console.warn(`⚠️ [GLOBAL-SYNC] Invalid collection "${collectionName}": not an array`);
        return false;
      }
      
      // Validate collection items
      for (const item of items) {
        if (!item || typeof item !== 'object' || !item.path) {
          console.warn(`⚠️ [GLOBAL-SYNC] Invalid item in collection "${collectionName}": missing path`);
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Validate favorites data
   */
  validateFavoritesData(favorites) {
    // Basic validation for favorites structure
    if (!favorites || typeof favorites !== 'object') {
      return false;
    }
    
    return true;
  }

  /**
   * Validate media library data
   */
  validateMediaLibraryData(mediaLibrary) {
    // Basic validation for media library structure
    if (!mediaLibrary || typeof mediaLibrary !== 'object') {
      return false;
    }
    
    return true;
  }

  /**
   * Validate settings data
   */
  validateSettingsData(settings) {
    // Basic validation for settings structure
    if (!settings || typeof settings !== 'object') {
      return false;
    }
    
    return true;
  }

  /**
   * Validate YouTube searches data
   */
  validateYouTubeSearchesData(youtubeData) {
    // Basic validation for YouTube searches structure
    if (!youtubeData || typeof youtubeData !== 'object') {
      return false;
    }
    
    return true;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if data is empty
   */
  isEmpty(data) {
    if (!data || typeof data !== 'object') return true;
    return Object.keys(data).length === 0;
  }

  /**
   * Get data size for logging
   */
  getDataSize(data) {
    if (!data || typeof data !== 'object') return '0 items';
    return `${Object.keys(data).length} items`;
  }

  /**
   * Detect inconsistencies between data sources
   */
  detectInconsistencies(source1, source2) {
    const inconsistencies = [];
    const keys1 = Object.keys(source1);
    const keys2 = Object.keys(source2);
    
    // Check for missing items
    keys1.forEach(key => {
      if (!keys2.includes(key)) {
        inconsistencies.push({ type: 'missing', key, source: 'jsonFile' });
      }
    });
    
    keys2.forEach(key => {
      if (!keys1.includes(key)) {
        inconsistencies.push({ type: 'missing', key, source: 'localStorage' });
      }
    });
    
    return inconsistencies;
  }

  /**
   * Resolve inconsistencies between data sources
   */
  async resolveInconsistencies(dataType, localStorageData, jsonFileData) {
    try {
      console.log(`🔧 [GLOBAL-SYNC] Resolving inconsistencies for ${dataType}...`);
      
      // Use localStorage as the source of truth (most recent)
      let masterData = { ...localStorageData };
      
      // Add any items from JSON file that aren't in localStorage
      Object.entries(jsonFileData).forEach(([key, value]) => {
        if (!masterData[key]) {
          masterData[key] = value;
          console.log(`➕ [GLOBAL-SYNC] Added missing ${dataType} item from JSON: ${key}`);
        }
      });
      
      // Save the resolved data to all sources
      await this.saveToAllSources(dataType, masterData);
      
      console.log(`✅ [GLOBAL-SYNC] Inconsistencies resolved for ${dataType}`);
      
    } catch (error) {
      console.error(`❌ [GLOBAL-SYNC] Failed to resolve inconsistencies for ${dataType}:`, error);
    }
  }

  /**
   * Process queued sync operations for a specific data type
   */
  processSyncQueue(dataType) {
    this.syncInProgress.set(dataType, false);
    
    const queue = this.syncQueues.get(dataType);
    if (queue && queue.length > 0) {
      const nextOperation = queue.shift();
      console.log(`🔄 [GLOBAL-SYNC] Processing queued sync operation for ${dataType}...`);
      
      this.sync(dataType, nextOperation.newData, nextOperation.operation)
        .then(nextOperation.resolve)
        .catch(error => {
          console.error(`❌ [GLOBAL-SYNC] Queued sync operation failed for ${dataType}:`, error);
          nextOperation.resolve({ success: false, error });
        });
    }
  }

  /**
   * Get sync status for all data types
   */
  getSyncStatus() {
    const status = {
      isInitialized: this.isInitialized,
      dataTypes: Array.from(this.dataSources.keys()),
      syncInProgress: Object.fromEntries(this.syncInProgress),
      queueLengths: Object.fromEntries(
        Array.from(this.syncQueues.entries()).map(([key, queue]) => [key, queue.length])
      ),
      lastSyncTimestamps: Object.fromEntries(this.lastSyncTimestamps),
      actorNamesCount: this.actorNames ? this.actorNames.size : 0
    };
    
    return status;
  }

  /**
   * Force a full resync for a specific data type
   */
  async forceResync(dataType) {
    try {
      console.log(`🔄 [GLOBAL-SYNC] Forcing full resync for ${dataType}...`);
      
      // Get current data
      const currentData = this.getLocalStorageData(dataType);
      
      // Clean it
      const cleanedData = this.cleanData(dataType, currentData);
      
      // Save to all sources
      await this.saveToAllSources(dataType, cleanedData);
      
      console.log(`✅ [GLOBAL-SYNC] Full resync completed for ${dataType}`);
      return { success: true, data: cleanedData };
      
    } catch (error) {
      console.error(`❌ [GLOBAL-SYNC] Full resync failed for ${dataType}:`, error);
      throw error;
    }
  }

  /**
   * Force a full resync for all data types
   */
  async forceResyncAll() {
    try {
      console.log('🔄 [GLOBAL-SYNC] Forcing full resync for all data types...');
      
      const results = {};
      for (const dataType of this.dataSources.keys()) {
        results[dataType] = await this.forceResync(dataType);
      }
      
      console.log('✅ [GLOBAL-SYNC] Full resync completed for all data types');
      return { success: true, results };
      
    } catch (error) {
      console.error('❌ [GLOBAL-SYNC] Full resync failed for all data types:', error);
      throw error;
    }
  }

  /**
   * Sync YouTube searches from the existing YouTubeSearchManager
   * This method integrates with the current YouTube caching system
   */
  async syncYouTubeSearches() {
    try {
      console.log('🎬 [GLOBAL-SYNC] Syncing YouTube searches from existing cache...');
      
      // Get all YouTube cache keys from localStorage
      const youtubeCacheKeys = [];
      const youtubeSearchData = {};
      
      // Scan localStorage for YouTube cache keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('yt_')) {
          youtubeCacheKeys.push(key);
          
          try {
            const data = localStorage.getItem(key);
            if (data) {
              youtubeSearchData[key] = JSON.parse(data);
            }
          } catch (error) {
            console.warn(`⚠️ [GLOBAL-SYNC] Failed to parse YouTube cache key: ${key}`, error);
          }
        }
      }
      
      console.log(`🎬 [GLOBAL-SYNC] Found ${youtubeCacheKeys.length} YouTube cache keys`);
      
      // Also check for saved queries if YouTubeSearchManager is available
      if (window.youtubeSearchManager && window.youtubeSearchManager.savedQueries) {
        const savedQueries = window.youtubeSearchManager.savedQueries;
        console.log(`🎬 [GLOBAL-SYNC] Found ${savedQueries.size} saved YouTube queries`);
        
        // Add saved queries to the data
        savedQueries.forEach((queryData, query) => {
          const key = `saved_query_${query.replace(/\s+/g, '_')}`;
          youtubeSearchData[key] = {
            query: query,
            timestamp: queryData.timestamp || Date.now(),
            searchType: queryData.searchType || 'search',
            results: queryData.results || [],
            cacheKeys: queryData.cacheKeys || [],
            source: 'savedQueries'
          };
        });
      }
      
      // Sync the YouTube search data using the stream flow
      if (Object.keys(youtubeSearchData).length > 0) {
        await this.sync('youtubeSearches', youtubeSearchData, 'syncYouTubeSearches');
        console.log('✅ [GLOBAL-SYNC] YouTube searches synced successfully');
      } else {
        console.log('ℹ️ [GLOBAL-SYNC] No YouTube search data found to sync');
      }
      
    } catch (error) {
      console.error('❌ [GLOBAL-SYNC] Failed to sync YouTube searches:', error);
    }
  }

  /**
   * Get YouTube search cache keys for a specific query
   */
  getYouTubeCacheKeys(query, searchType = 'search') {
    try {
      const cacheKeys = [];
      const normalizedQuery = query.toLowerCase().replace(/\s+/g, '.');
      
      // Check for multiple pages of results
      for (let page = 1; page <= 10; page++) {
        const possibleKeys = [
          `yt_${searchType}_${normalizedQuery}_p${page}_none`,
          `yt_search_${normalizedQuery}_p${page}_none`,
          `yt_channel_${normalizedQuery}_p${page}_none`,
          `yt_movies_${normalizedQuery}_p${page}_none`,
          `yt_tv_${normalizedQuery}_p${page}_none`,
        ];
        
        for (const key of possibleKeys) {
          if (localStorage.getItem(key)) {
            cacheKeys.push(key);
            break;
          }
        }
      }
      
      return cacheKeys;
    } catch (error) {
      console.error('❌ [GLOBAL-SYNC] Failed to get YouTube cache keys:', error);
      return [];
    }
  }
}

// Export for use in other modules
window.GlobalDataSyncController = GlobalDataSyncController;
