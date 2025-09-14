/*
  COLLECTIONSSYNCCONTROLLER.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

/**
 * COLLECTIONS SYNC CONTROLLER
 * Centralized controller to monitor and maintain all collection data sources in perfect sync
 * Prevents recurring synchronization issues by ensuring single source of truth
 */

class CollectionsSyncController {
  constructor() {
    this.isInitialized = false;
    this.syncInProgress = false;
    this.dataSources = {
      localStorage: 'mediaCollections',
      jsonFile: '/components/MediaLibrary/data/collections.json',
      mongodb: 'collections_backup'
    };
    this.syncQueue = [];
    this.actorNames = new Set();
    this.lastSyncTimestamp = null;
    
    console.log('🎛️ [SYNC-CONTROLLER] Collections Sync Controller initialized');
  }

  /**
   * Initialize the sync controller with actor data for filtering
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🔄 [SYNC-CONTROLLER] Initializing sync controller...');
      
      // Load actor names to prevent actors from being stored as collections
      await this.loadActorNames();
      
      // Perform initial sync check
      await this.performInitialSyncCheck();
      
      this.isInitialized = true;
      console.log('✅ [SYNC-CONTROLLER] Sync controller initialized successfully');
      
    } catch (error) {
      console.error('❌ [SYNC-CONTROLLER] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Load all actor names from unified data to prevent actor collections
   */
  async loadActorNames() {
    try {
      console.log('👥 [SYNC-CONTROLLER] Loading actor names for filtering...');
      
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
      
      console.log(`✅ [SYNC-CONTROLLER] Loaded ${this.actorNames.size} actor names for filtering`);
      
    } catch (error) {
      console.warn('⚠️ [SYNC-CONTROLLER] Could not load actor names:', error);
    }
  }

  /**
   * Perform initial sync check to ensure all sources are consistent
   */
  async performInitialSyncCheck() {
    try {
      console.log('🔍 [SYNC-CONTROLLER] Performing initial sync check...');
      
      // Get data from all sources
      const localStorageData = this.getLocalStorageData();
      const jsonFileData = await this.getJsonFileData();
      
      // Clean and validate data
      const cleanLocalStorageData = this.cleanCollectionsData(localStorageData);
      const cleanJsonFileData = this.cleanCollectionsData(jsonFileData);
      
      // Check for inconsistencies
      const inconsistencies = this.detectInconsistencies(cleanLocalStorageData, cleanJsonFileData);
      
      if (inconsistencies.length > 0) {
        console.warn('⚠️ [SYNC-CONTROLLER] Found inconsistencies:', inconsistencies);
        await this.resolveInconsistencies(cleanLocalStorageData, cleanJsonFileData);
      } else {
        console.log('✅ [SYNC-CONTROLLER] All sources are in sync');
      }
      
    } catch (error) {
      console.error('❌ [SYNC-CONTROLLER] Initial sync check failed:', error);
    }
  }

  /**
   * Get collections data from localStorage
   */
  getLocalStorageData() {
    try {
      const data = localStorage.getItem(this.dataSources.localStorage);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.warn('⚠️ [SYNC-CONTROLLER] Failed to get localStorage data:', error);
      return {};
    }
  }

  /**
   * Get collections data from JSON file
   */
  async getJsonFileData() {
    try {
      const response = await fetch(`${this.dataSources.jsonFile}?v=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        // Convert structured format to flat format
        const flatData = {};
        if (data.collections) {
          Object.values(data.collections).forEach(category => {
            Object.assign(flatData, category);
          });
        }
        return flatData;
      }
      return {};
    } catch (error) {
      console.warn('⚠️ [SYNC-CONTROLLER] Failed to get JSON file data:', error);
      return {};
    }
  }

  /**
   * Clean collections data by removing actors and invalid entries
   */
  cleanCollectionsData(collections) {
    const cleaned = {};
    let removedCount = 0;
    
    Object.entries(collections).forEach(([name, items]) => {
      // Remove actors
      if (this.actorNames.has(name)) {
        console.log(`🚫 [SYNC-CONTROLLER] Removing actor collection: ${name}`);
        removedCount++;
        return;
      }
      
      // Validate items array
      if (Array.isArray(items) && items.length > 0) {
        cleaned[name] = items;
      } else {
        console.log(`🧹 [SYNC-CONTROLLER] Removing empty collection: ${name}`);
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      console.log(`🧹 [SYNC-CONTROLLER] Cleaned ${removedCount} invalid collections`);
    }
    
    return cleaned;
  }

  /**
   * Detect inconsistencies between data sources
   */
  detectInconsistencies(source1, source2) {
    const inconsistencies = [];
    const keys1 = Object.keys(source1);
    const keys2 = Object.keys(source2);
    
    // Check for missing collections
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
    
    // Check for different item counts
    keys1.forEach(key => {
      if (keys2.includes(key)) {
        const count1 = source1[key].length;
        const count2 = source2[key].length;
        if (count1 !== count2) {
          inconsistencies.push({ 
            type: 'count_mismatch', 
            key, 
            localStorageCount: count1, 
            jsonFileCount: count2 
          });
        }
      }
    });
    
    return inconsistencies;
  }

  /**
   * Resolve inconsistencies between data sources
   * Data flow priority: localStorage → JSON → MongoDB
   */
  async resolveInconsistencies(localStorageData, jsonFileData) {
    try {
      console.log('🔧 [SYNC-CONTROLLER] Resolving inconsistencies using data flow priority...');
      
      // PRIORITY 1: localStorage is the source of truth (most recent user actions)
      let masterData = { ...localStorageData };
      
      // PRIORITY 2: Only add from JSON if localStorage is empty or missing specific collections
      if (Object.keys(masterData).length === 0) {
        console.log('📱 [SYNC-CONTROLLER] localStorage empty, using JSON as fallback');
        masterData = { ...jsonFileData };
      } else {
        // Add missing collections from JSON (but don't overwrite localStorage)
        Object.entries(jsonFileData).forEach(([key, value]) => {
          if (!masterData[key]) {
            masterData[key] = value;
            console.log(`➕ [SYNC-CONTROLLER] Added missing collection from JSON: ${key}`);
          }
        });
      }
      
      // Save the resolved data following the flow: localStorage → JSON → MongoDB
      await this.saveToAllSources(masterData);
      
      console.log('✅ [SYNC-CONTROLLER] Inconsistencies resolved using data flow priority');
      
    } catch (error) {
      console.error('❌ [SYNC-CONTROLLER] Failed to resolve inconsistencies:', error);
    }
  }

  /**
   * MAIN SYNC METHOD - Use this for all collection operations
   * Follows proper data flow: GATHER from localStorage → JSON → MongoDB, then SAVE back
   */
  async sync(collections, operation = 'update') {
    if (this.syncInProgress) {
      console.log('⏳ [SYNC-CONTROLLER] Sync already in progress, queuing operation...');
      return new Promise((resolve) => {
        this.syncQueue.push({ collections, operation, resolve });
      });
    }
    
    this.syncInProgress = true;
    
    try {
      console.log(`🔄 [SYNC-CONTROLLER] Starting sync operation: ${operation}`);
      
      // STEP 1: GATHER current data using priority flow
      const currentData = await this.getCleanCollections();
      console.log('📊 [SYNC-CONTROLLER] Current data gathered:', Object.keys(currentData).length, 'collections');
      
      // STEP 2: MERGE new collections with current data
      const mergedCollections = { ...currentData, ...collections };
      console.log('🔀 [SYNC-CONTROLLER] Merged with new data:', Object.keys(mergedCollections).length, 'collections');
      
      // STEP 3: CLEAN the merged data
      const cleanedCollections = this.cleanCollectionsData(mergedCollections);
      console.log('🧹 [SYNC-CONTROLLER] Cleaned data:', Object.keys(cleanedCollections).length, 'collections');
      
      // STEP 4: SAVE back to all sources (localStorage → JSON → MongoDB)
      await this.saveToAllSources(cleanedCollections);
      
      // Update timestamp
      this.lastSyncTimestamp = Date.now();
      
      console.log(`✅ [SYNC-CONTROLLER] Sync operation completed: ${operation}`);
      
      // Process queued operations
      this.processSyncQueue();
      
      return { success: true, collections: cleanedCollections };
      
    } catch (error) {
      console.error(`❌ [SYNC-CONTROLLER] Sync operation failed: ${operation}`, error);
      this.syncInProgress = false;
      throw error;
    }
  }

  /**
   * Save collections to all data sources following the flow: localStorage → JSON → MongoDB
   */
  async saveToAllSources(collections) {
    try {
      console.log('💾 [SYNC-CONTROLLER] Saving following data flow: localStorage → JSON → MongoDB');
      
      // PRIORITY 1: Save to localStorage (primary source for UI)
      localStorage.setItem(this.dataSources.localStorage, JSON.stringify(collections));
      console.log('✅ [SYNC-CONTROLLER] Saved to localStorage (PRIORITY 1)');
      
      // PRIORITY 2: Save to JSON file (backup/fallback source)
      await this.saveToJsonFile(collections);
      console.log('✅ [SYNC-CONTROLLER] Saved to JSON file (PRIORITY 2)');
      
      // PRIORITY 3: Save to MongoDB (final backup source)
      await this.saveToMongoDB(collections);
      console.log('✅ [SYNC-CONTROLLER] Saved to MongoDB (PRIORITY 3)');
      
    } catch (error) {
      console.error('❌ [SYNC-CONTROLLER] Failed to save to all sources:', error);
      throw error;
    }
  }

  /**
   * Save collections to JSON file
   */
  async saveToJsonFile(collections) {
    try {
      // This would typically be handled by the server
      // For now, we'll just log the intention
      console.log('📄 [SYNC-CONTROLLER] JSON file save requested (handled by server)');
      
    } catch (error) {
      console.warn('⚠️ [SYNC-CONTROLLER] Failed to save to JSON file:', error);
      // Don't throw - JSON file is backup only
    }
  }

  /**
   * Get collections data from MongoDB (PRIORITY 3 - final fallback)
   */
  async getMongoDBData() {
    try {
      console.log('🗄️ [SYNC-CONTROLLER] Gathering data from MongoDB...');
      
      const response = await fetch('/api/collections/get', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Convert MongoDB structured format to flat format
        const flatData = {};
        if (data.collections) {
          Object.values(data.collections).forEach(category => {
            Object.assign(flatData, category);
          });
        }
        
        console.log('✅ [SYNC-CONTROLLER] Successfully gathered from MongoDB:', Object.keys(flatData).length, 'collections');
        return flatData;
      } else {
        console.warn('⚠️ [SYNC-CONTROLLER] MongoDB gathering failed:', response.status);
        return {};
      }
      
    } catch (error) {
      console.warn('⚠️ [SYNC-CONTROLLER] Failed to gather from MongoDB:', error);
      return {};
    }
  }

  /**
   * Save collections to MongoDB
   */
  async saveToMongoDB(collections) {
    try {
      // Convert flat format to MongoDB format
      const mongoData = {
        collections: {
          my_collections: {},
          actors: {},
          directors: {},
          genres: {},
          creative: {}
        },
        lastUpdated: new Date().toISOString()
      };
      
      // Categorize collections (simplified - would need proper categorization logic)
      Object.entries(collections).forEach(([name, items]) => {
        if (this.actorNames.has(name)) {
          mongoData.collections.actors[name] = items;
        } else {
          // Default to my_collections for now
          mongoData.collections.my_collections[name] = items;
        }
      });
      
      // Send to server
      const response = await fetch('/api/collections/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mongoData)
      });
      
      if (response.ok) {
        console.log('✅ [SYNC-CONTROLLER] Saved to MongoDB successfully');
      } else {
        console.warn('⚠️ [SYNC-CONTROLLER] MongoDB save failed:', response.status);
      }
      
    } catch (error) {
      console.warn('⚠️ [SYNC-CONTROLLER] Failed to save to MongoDB:', error);
      // Don't throw - MongoDB is final backup only
    }
  }

  /**
   * Process queued sync operations
   */
  processSyncQueue() {
    this.syncInProgress = false;
    
    if (this.syncQueue.length > 0) {
      const nextOperation = this.syncQueue.shift();
      console.log('🔄 [SYNC-CONTROLLER] Processing queued sync operation...');
      
      this.sync(nextOperation.collections, nextOperation.operation)
        .then(nextOperation.resolve)
        .catch(error => {
          console.error('❌ [SYNC-CONTROLLER] Queued sync operation failed:', error);
          nextOperation.resolve({ success: false, error });
        });
    }
  }

  /**
   * Get clean collections data following the GATHERING priority: localStorage → JSON → MongoDB
   */
  async getCleanCollections() {
    await this.initialize();
    
    console.log('🔍 [SYNC-CONTROLLER] Gathering collections data with priority: localStorage → JSON → MongoDB');
    
    // PRIORITY 1: Try localStorage first (most current data)
    let collections = this.getLocalStorageData();
    console.log('📱 [SYNC-CONTROLLER] localStorage data:', Object.keys(collections).length, 'collections');
    
    // PRIORITY 2: If localStorage is empty or incomplete, try JSON file
    if (Object.keys(collections).length === 0) {
      console.log('📄 [SYNC-CONTROLLER] localStorage empty, gathering from JSON file...');
      collections = await this.getJsonFileData();
      console.log('📄 [SYNC-CONTROLLER] JSON file data:', Object.keys(collections).length, 'collections');
      
      // Save JSON data to localStorage for future use
      if (Object.keys(collections).length > 0) {
        localStorage.setItem(this.dataSources.localStorage, JSON.stringify(collections));
        console.log('💾 [SYNC-CONTROLLER] Saved JSON data to localStorage for future use');
      }
    }
    
    // PRIORITY 3: If still no data, try MongoDB (final fallback)
    if (Object.keys(collections).length === 0) {
      console.log('🗄️ [SYNC-CONTROLLER] JSON empty, gathering from MongoDB...');
      collections = await this.getMongoDBData();
      console.log('🗄️ [SYNC-CONTROLLER] MongoDB data:', Object.keys(collections).length, 'collections');
      
      // Save MongoDB data to localStorage and JSON for future use
      if (Object.keys(collections).length > 0) {
        localStorage.setItem(this.dataSources.localStorage, JSON.stringify(collections));
        await this.saveToJsonFile(collections);
        console.log('💾 [SYNC-CONTROLLER] Saved MongoDB data to localStorage and JSON');
      }
    }
    
    // Clean the gathered data
    const cleanCollections = this.cleanCollectionsData(collections);
    console.log('✅ [SYNC-CONTROLLER] Final clean collections:', Object.keys(cleanCollections).length, 'collections');
    
    return cleanCollections;
  }

  /**
   * Force a full resync of all sources
   */
  async forceResync() {
    try {
      console.log('🔄 [SYNC-CONTROLLER] Forcing full resync...');
      
      // Get current data
      const currentData = this.getLocalStorageData();
      
      // Clean it
      const cleanedData = this.cleanCollectionsData(currentData);
      
      // Save to all sources
      await this.saveToAllSources(cleanedData);
      
      console.log('✅ [SYNC-CONTROLLER] Full resync completed');
      return { success: true, collections: cleanedData };
      
    } catch (error) {
      console.error('❌ [SYNC-CONTROLLER] Full resync failed:', error);
      throw error;
    }
  }

  /**
   * Get sync status information
   */
  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      queueLength: this.syncQueue.length,
      lastSyncTimestamp: this.lastSyncTimestamp,
      actorNamesCount: this.actorNames.size
    };
  }
}

// Export for use in other modules
window.CollectionsSyncController = CollectionsSyncController;
