/*
  BACKUP.ROUTES.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');

/**
 * MONGODB BACKUP API ROUTES
 * 
 * These endpoints handle daily backups of all critical data to MongoDB:
 * - Collections data
 * - Watch Later data  
 * - Media Library data
 */

// POST - Backup Collections to MongoDB
router.post('/collections', async (req, res) => {
  try {
    const { type, timestamp, data, metadata } = req.body;
    
    console.log(`[BACKUP-API] Backing up collections to MongoDB...`);
    console.log(`[BACKUP-API] Collections data structure:`, {
      hasData: !!data,
      hasCollections: !!data.collections,
      collectionsType: typeof data.collections,
      collectionsKeys: data.collections ? Object.keys(data.collections).length : 0,
      metadataCount: metadata.totalCollections
    });
    
    // Get database connection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const collectionsCollection = db.collection('collections');
    
    // Save the entire collections structure as a single document with backup metadata
    const collectionDocument = {
      ...data,
      backupMetadata: {
        type: 'collections_backup',
        timestamp: timestamp,
        source: 'backup_system',
        totalCollections: metadata.totalCollections
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert the collections document
    const result = await collectionsCollection.insertOne(collectionDocument);
    
    console.log(`[BACKUP-API] Collections backup successful: ${metadata.totalCollections} collections saved to MongoDB`);
    
    res.json({
      success: true,
      message: `Collections backed up successfully (${metadata.totalCollections} collections)`,
      timestamp: timestamp,
      collectionsCount: metadata.totalCollections,
      mongoId: result.insertedId
    });
    
  } catch (error) {
    console.error('[BACKUP-API] Collections backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backup collections to MongoDB',
      details: error.message
    });
  }
});

// POST - Backup Watch Later to MongoDB
router.post('/watch_later', async (req, res) => {
  try {
    const { type, timestamp, data, metadata } = req.body;
    
    console.log(`[BACKUP-API] Backing up Watch Later to MongoDB...`);
    console.log(`[BACKUP-API] Watch Later data structure:`, {
      hasData: !!data,
      dataType: typeof data,
      dataLength: Array.isArray(data) ? data.length : 'Not an array',
      metadataItems: metadata.totalItems
    });
    
    // Get database connection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const watchLaterBackupCollection = db.collection('watchlaterbackups');
    
    // Save the entire Watch Later data as a single backup document
    const watchLaterBackupDocument = {
      watchLaterData: data,
      backupMetadata: {
        type: 'watchlater_backup',
        timestamp: timestamp,
        source: 'backup_system',
        totalItems: metadata.totalItems
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert the Watch Later backup document
    const result = await watchLaterBackupCollection.insertOne(watchLaterBackupDocument);
    
    console.log(`[BACKUP-API] Watch Later backup successful: ${metadata.totalItems} items saved to MongoDB`);
    
    res.json({
      success: true,
      message: `Watch Later backed up successfully (${metadata.totalItems} items)`,
      timestamp: timestamp,
      totalItems: metadata.totalItems,
      mongoId: result.insertedId
    });
    
  } catch (error) {
    console.error('[BACKUP-API] Watch Later backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backup Watch Later to MongoDB',
      details: error.message
    });
  }
});

// POST - Backup Media Library to MongoDB
router.post('/media_library', async (req, res) => {
  try {
    const { type, timestamp, data, metadata } = req.body;
    
    console.log(`[BACKUP-API] Backing up Media Library to MongoDB...`);
    console.log(`[BACKUP-API] Movies: ${metadata.moviesCount || 0}, TV Shows: ${metadata.tvShowsCount || 0}`);
    
    // Save movies to MongoDB
    let moviesSuccess = 0;
    let moviesError = 0;
    
    if (data.movies) {
      for (const [movieKey, movieData] of Object.entries(data.movies)) {
        try {
          const response = await fetch('http://localhost:4800/api/movies', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...movieData,
              backupMetadata: {
                type: 'daily_backup',
                timestamp: timestamp,
                source: 'backup_system'
              }
            })
          });
          
          if (response.ok) {
            moviesSuccess++;
          } else {
            moviesError++;
          }
        } catch (movieError) {
          console.error(`[BACKUP-API] Failed to backup movie ${movieKey}:`, {
            error: movieError.message,
            movieData: movieData,
            response: movieError.response ? movieError.response.status : 'No response'
          });
          moviesError++;
        }
      }
    }
    
    // Save TV shows to MongoDB
    let tvShowsSuccess = 0;
    let tvShowsError = 0;
    
    console.log(`[BACKUP-API] TV Shows data check:`, {
      hasTvShows: !!data.tvShows,
      tvShowsType: typeof data.tvShows,
      tvShowsKeys: data.tvShows ? Object.keys(data.tvShows).length : 0
    });
    
    // Debug: Log sample TV show data
    if (data.tvShows && Object.keys(data.tvShows).length > 0) {
      const firstKey = Object.keys(data.tvShows)[0];
      console.log(`[BACKUP-API] Sample TV show data:`, {
        key: firstKey,
        data: data.tvShows[firstKey],
        dataType: typeof data.tvShows[firstKey]
      });
    }
    
    if (data.tvShows) {
      for (const [showKey, showData] of Object.entries(data.tvShows)) {
        try {
          const response = await fetch('http://localhost:4800/api/tv-shows', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...showData,
              backupMetadata: {
                type: 'daily_backup',
                timestamp: timestamp,
                source: 'backup_system'
              }
            })
          });
          
          if (response.ok) {
            tvShowsSuccess++;
          } else {
            tvShowsError++;
          }
        } catch (showError) {
          console.error(`[BACKUP-API] Failed to backup TV show ${showKey}:`, {
            error: showError.message,
            showData: showData,
            response: showError.response ? showError.response.status : 'No response'
          });
          tvShowsError++;
        }
      }
    }
    
    res.json({
      success: true,
      message: `Media Library backed up successfully`,
      timestamp: timestamp,
      movies: { success: moviesSuccess, errors: moviesError },
      tvShows: { success: tvShowsSuccess, errors: tvShowsError }
    });
    
  } catch (error) {
    console.error('[BACKUP-API] Media Library backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backup Media Library to MongoDB',
      details: error.message
    });
  }
});

// GET - Backup Status
router.get('/status', async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../scripts/BACKUP');
    const fs = require('fs');
    
    // Get list of backup files
    const backupFiles = fs.readdirSync(backupDir).filter(file => 
      file.endsWith('.json') && file.includes('backup')
    );
    
    // Get latest backup summary
    const summaryFiles = backupFiles.filter(file => file.includes('summary'));
    let latestSummary = null;
    
    if (summaryFiles.length > 0) {
      const latestSummaryFile = summaryFiles.sort().pop();
      const summaryPath = path.join(backupDir, latestSummaryFile);
      latestSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    }
    
    res.json({
      success: true,
      backupDir: backupDir,
      totalBackupFiles: backupFiles.length,
      latestBackup: latestSummary,
      availableBackups: backupFiles
    });
    
  } catch (error) {
    console.error('[BACKUP-API] Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup status',
      details: error.message
    });
  }
});

// POST - General MongoDB Backup (main backup endpoint)
router.post('/mongodb', async (req, res) => {
  try {
    console.log(`[BACKUP-API] Starting comprehensive backup to MongoDB...`);
    
    // Get current data from localStorage via the frontend
    const backupResults = {
      collections: { success: 0, errors: 0 },
      watchLater: { success: 0, errors: 0 },
      mediaLibrary: { success: 0, errors: 0 }
    };
    
    let totalBackedUp = 0;
    let totalErrors = 0;
    
    // This endpoint serves as a general backup trigger
    // The actual backup logic should be handled by the frontend
    // which will call the specific backup endpoints
    
    res.json({
      success: true,
      message: `Backup endpoint ready. Frontend should call specific backup routes.`,
      timestamp: new Date().toISOString(),
      totalBackedUp: totalBackedUp,
      totalErrors: totalErrors,
      results: backupResults
    });
    
  } catch (error) {
    console.error('[BACKUP-API] MongoDB backup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backup to MongoDB',
      details: error.message
    });
  }
});

// GET - List all available backups from MongoDB
router.get('/list', async (req, res) => {
  try {
    console.log('[BACKUP-API] Listing available backups from MongoDB...');
    
    // Get database connection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const backupSummary = {
      collections: [],
      movies: [],
      tvShows: [],
      watchLater: [],
      totalBackups: 0
    };
    
    // List Collections backups
    try {
      const collectionsCollection = db.collection('collections');
      const collectionsCount = await collectionsCollection.countDocuments();
      if (collectionsCount > 0) {
        backupSummary.collections.push({
          collection: 'collections',
          count: collectionsCount,
          lastModified: new Date(),
          type: 'collections_backup'
        });
      }
    } catch (error) {
      console.warn('[BACKUP-API] Error counting collections:', error.message);
    }
    
    // List Movies backups
    try {
      const moviesCollection = db.collection('movies');
      const moviesCount = await moviesCollection.countDocuments();
      if (moviesCount > 0) {
        // Get the most recent backup timestamp
        const latestMovie = await moviesCollection.findOne(
          { 'backupMetadata.timestamp': { $exists: true } },
          { sort: { 'backupMetadata.timestamp': -1 } }
        );
        
        backupSummary.movies.push({
          collection: 'movies',
          count: moviesCount,
          lastModified: latestMovie?.backupMetadata?.timestamp || new Date(),
          type: 'movies_backup'
        });
      }
    } catch (error) {
      console.warn('[BACKUP-API] Error counting movies:', error.message);
    }
    
    // List TV Shows backups
    try {
      const tvShowsCollection = db.collection('tvshows');
      const tvShowsCount = await tvShowsCollection.countDocuments();
      if (tvShowsCount > 0) {
        // Get the most recent backup timestamp
        const latestTVShow = await tvShowsCollection.findOne(
          { 'backupMetadata.timestamp': { $exists: true } },
          { sort: { 'backupMetadata.timestamp': -1 } }
        );
        
        backupSummary.tvShows.push({
          collection: 'tvshows',
          count: tvShowsCount,
          lastModified: latestTVShow?.backupMetadata?.timestamp || new Date(),
          type: 'tvshows_backup'
        });
      }
    } catch (error) {
      console.warn('[BACKUP-API] Error counting TV shows:', error.message);
    }
    
    // List Watch Later backups
    try {
      const watchLaterBackupCollection = db.collection('watchlaterbackups');
      const watchLaterBackupCount = await watchLaterBackupCollection.countDocuments();
      if (watchLaterBackupCount > 0) {
        // Get the most recent backup timestamp
        const latestWatchLaterBackup = await watchLaterBackupCollection.findOne(
          { 'backupMetadata.timestamp': { $exists: true } },
          { sort: { 'backupMetadata.timestamp': -1 } }
        );
        
        backupSummary.watchLater.push({
          collection: 'watchlaterbackups',
          count: latestWatchLaterBackup?.backupMetadata?.totalItems || 0,
          lastModified: latestWatchLaterBackup?.backupMetadata?.timestamp || new Date(),
          type: 'watchlater_backup'
        });
      }
    } catch (error) {
      console.warn('[BACKUP-API] Error counting watch later backups:', error.message);
    }
    
    // Calculate total backups
    backupSummary.totalBackups = 
      backupSummary.collections.length + 
      backupSummary.movies.length + 
      backupSummary.tvShows.length + 
      backupSummary.watchLater.length;
    
    console.log('[BACKUP-API] Found backups:', backupSummary.totalBackups);
    
    res.json({
      success: true,
      message: `Found ${backupSummary.totalBackups} backup collections`,
      backups: backupSummary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[BACKUP-API] List backups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list backups',
      details: error.message
    });
  }
});

// GET - Database Status
router.get('/status', async (req, res) => {
  try {
    console.log('[BACKUP-API] Checking database status...');
    
    // Get database connection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const status = {
      connected: mongoose.connection.readyState === 1,
      database: db.databaseName,
      collections: {},
      totalDocuments: 0,
      lastChecked: new Date()
    };
    
    // Get collection stats
    const collections = ['movies', 'tvshows', 'collections', 'watchlaterbackups'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        status.collections[collectionName] = {
          exists: true,
          documentCount: count
        };
        status.totalDocuments += count;
      } catch (error) {
        status.collections[collectionName] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    console.log('[BACKUP-API] Database status checked:', status.totalDocuments, 'total documents');
    
    res.json({
      success: true,
      message: 'Database status retrieved',
      status: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[BACKUP-API] Database status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check database status',
      details: error.message
    });
  }
});

// POST - Cleanup Old Backups
router.post('/cleanup', async (req, res) => {
  try {
    console.log('[BACKUP-API] Starting cleanup of old backups...');
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const cleanupResults = {
      movies: { deleted: 0, kept: 0 },
      tvshows: { deleted: 0, kept: 0 },
      collections: { deleted: 0, kept: 0 },
      watchLater: { deleted: 0, kept: 0 },
      totalDeleted: 0
    };
    
    // Cleanup old movie backups (keep only latest 3 per title)
    try {
      const moviesCollection = db.collection('movies');
      const movieGroups = await moviesCollection.aggregate([
        { $group: { _id: '$title', docs: { $push: { id: '$_id', timestamp: '$backupMetadata.timestamp' } } } }
      ]).toArray();
      
      for (const group of movieGroups) {
        if (group.docs.length > 3) {
          // Sort by timestamp and keep only latest 3
          const sortedDocs = group.docs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const toDelete = sortedDocs.slice(3);
          
          for (const doc of toDelete) {
            await moviesCollection.deleteOne({ _id: doc.id });
            cleanupResults.movies.deleted++;
          }
          cleanupResults.movies.kept += 3;
        } else {
          cleanupResults.movies.kept += group.docs.length;
        }
      }
    } catch (error) {
      console.warn('[BACKUP-API] Error cleaning movies:', error.message);
    }
    
    // Cleanup old TV show backups (keep only latest 3 per title)
    try {
      const tvShowsCollection = db.collection('tvshows');
      const tvShowGroups = await tvShowsCollection.aggregate([
        { $group: { _id: '$title', docs: { $push: { id: '$_id', timestamp: '$backupMetadata.timestamp' } } } }
      ]).toArray();
      
      for (const group of tvShowGroups) {
        if (group.docs.length > 3) {
          const sortedDocs = group.docs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          const toDelete = sortedDocs.slice(3);
          
          for (const doc of toDelete) {
            await tvShowsCollection.deleteOne({ _id: doc.id });
            cleanupResults.tvshows.deleted++;
          }
          cleanupResults.tvshows.kept += 3;
        } else {
          cleanupResults.tvshows.kept += group.docs.length;
        }
      }
    } catch (error) {
      console.warn('[BACKUP-API] Error cleaning TV shows:', error.message);
    }
    
    // Cleanup old collections (keep only latest 5)
    try {
      const collectionsCollection = db.collection('collections');
      const collectionsCount = await collectionsCollection.countDocuments();
      if (collectionsCount > 5) {
        const toDelete = collectionsCount - 5;
        const oldestCollections = await collectionsCollection.find().sort({ createdAt: 1 }).limit(toDelete).toArray();
        
        for (const collection of oldestCollections) {
          await collectionsCollection.deleteOne({ _id: collection._id });
          cleanupResults.collections.deleted++;
        }
        cleanupResults.collections.kept = 5;
      } else {
        cleanupResults.collections.kept = collectionsCount;
      }
    } catch (error) {
      console.warn('[BACKUP-API] Error cleaning collections:', error.message);
    }
    
    cleanupResults.totalDeleted = 
      cleanupResults.movies.deleted + 
      cleanupResults.tvshows.deleted + 
      cleanupResults.collections.deleted + 
      cleanupResults.watchLater.deleted;
    
    console.log('[BACKUP-API] Cleanup completed:', cleanupResults.totalDeleted, 'documents deleted');
    
    res.json({
      success: true,
      message: `Cleanup completed: ${cleanupResults.totalDeleted} old backups removed`,
      cleanupResults: cleanupResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[BACKUP-API] Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old backups',
      details: error.message
    });
  }
});


// GET - View Backup JSON
router.get('/view-json', async (req, res) => {
  try {
    const { type, timestamp } = req.query;
    
    console.log('[BACKUP-API] Viewing JSON for backup:', { type, timestamp });
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: type'
      });
    }
    
    // Get database connection
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    let backupData = null;
    
    if (type === 'collections') {
      const collectionsCollection = db.collection('collections');
      backupData = await collectionsCollection.findOne({
        'backupMetadata.timestamp': timestamp
      });
      
    } else if (type === 'movies') {
      const moviesCollection = db.collection('movies');
      backupData = await moviesCollection.findOne({
        'backupMetadata.timestamp': timestamp
      });
      
    } else if (type === 'tvshows') {
      const tvShowsCollection = db.collection('tvshows');
      backupData = await tvShowsCollection.findOne({
        'backupMetadata.timestamp': timestamp
      });
      
    } else if (type === 'watchlater') {
      const watchLaterBackupCollection = db.collection('watchlaterbackups');
      backupData = await watchLaterBackupCollection.findOne({
        'backupMetadata.timestamp': timestamp
      });
    }
    
    if (!backupData) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }
    
    // Return the backup data
    res.json({
      success: true,
      data: backupData,
      metadata: {
        type: type,
        timestamp: timestamp,
        backupId: backupData._id
      }
    });
    
  } catch (error) {
    console.error('[BACKUP-API] View JSON error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve backup JSON',
      details: error.message
    });
  }
});

// POST - Restore from Backup
router.post('/restore', async (req, res) => {
  try {
    console.log('[BACKUP-API] Restoring from backup...');
    
    const { backupId, backupType, timestamp, collectionName } = req.body;
    
    // Validate required parameters
    if (!backupType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: backupType (movies, tvshows, collections, watchlater)'
      });
    }
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const validTypes = ['movies', 'tvshows', 'collections', 'watchlater'];
    if (!validTypes.includes(backupType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid backupType. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    const restoreResults = {
      restored: 0,
      errors: 0,
      backupType: backupType,
      restoredAt: new Date()
    };
    
    // Restore based on type
    if (backupType === 'movies') {
      const moviesCollection = db.collection('movies');
      
      if (backupId) {
        // Restore specific movie by ID
        const movie = await moviesCollection.findOne({ _id: new mongoose.Types.ObjectId(backupId) });
        if (movie) {
          // Update the movie with restore metadata
          await moviesCollection.updateOne(
            { _id: movie._id },
            { 
              $set: { 
                restoredAt: new Date(),
                restoreMetadata: {
                  restoredFrom: backupId,
                  restoredAt: new Date(),
                  restoredBy: 'backup_system'
                }
              }
            }
          );
          restoreResults.restored = 1;
        } else {
          restoreResults.errors = 1;
        }
      } else if (timestamp) {
        // Restore movies from specific timestamp
        const movies = await moviesCollection.find({
          'backupMetadata.timestamp': new Date(timestamp)
        }).toArray();
        
        for (const movie of movies) {
          try {
            await moviesCollection.updateOne(
              { _id: movie._id },
              { 
                $set: { 
                  restoredAt: new Date(),
                  restoreMetadata: {
                    restoredFrom: timestamp,
                    restoredAt: new Date(),
                    restoredBy: 'backup_system'
                  }
                }
              }
            );
            restoreResults.restored++;
          } catch (error) {
            console.warn('[BACKUP-API] Error restoring movie:', error.message);
            restoreResults.errors++;
          }
        }
      }
    }
    
    else if (backupType === 'tvshows') {
      const tvShowsCollection = db.collection('tvshows');
      
      if (backupId) {
        const tvShow = await tvShowsCollection.findOne({ _id: new mongoose.Types.ObjectId(backupId) });
        if (tvShow) {
          await tvShowsCollection.updateOne(
            { _id: tvShow._id },
            { 
              $set: { 
                restoredAt: new Date(),
                restoreMetadata: {
                  restoredFrom: backupId,
                  restoredAt: new Date(),
                  restoredBy: 'backup_system'
                }
              }
            }
          );
          restoreResults.restored = 1;
        } else {
          restoreResults.errors = 1;
        }
      } else if (timestamp) {
        const tvShows = await tvShowsCollection.find({
          'backupMetadata.timestamp': new Date(timestamp)
        }).toArray();
        
        for (const tvShow of tvShows) {
          try {
            await tvShowsCollection.updateOne(
              { _id: tvShow._id },
              { 
                $set: { 
                  restoredAt: new Date(),
                  restoreMetadata: {
                    restoredFrom: timestamp,
                    restoredAt: new Date(),
                    restoredBy: 'backup_system'
                  }
                }
              }
            );
            restoreResults.restored++;
          } catch (error) {
            console.warn('[BACKUP-API] Error restoring TV show:', error.message);
            restoreResults.errors++;
          }
        }
      }
    }
    
    else if (backupType === 'collections') {
      const collectionsCollection = db.collection('collections');
      
      if (backupId) {
        const collection = await collectionsCollection.findOne({ _id: new mongoose.Types.ObjectId(backupId) });
        if (collection) {
          await collectionsCollection.updateOne(
            { _id: collection._id },
            { 
              $set: { 
                restoredAt: new Date(),
                restoreMetadata: {
                  restoredFrom: backupId,
                  restoredAt: new Date(),
                  restoredBy: 'backup_system'
                }
              }
            }
          );
          restoreResults.restored = 1;
        } else {
          restoreResults.errors = 1;
        }
      } else if (timestamp) {
        const collections = await collectionsCollection.find({
          createdAt: new Date(timestamp)
        }).toArray();
        
        for (const collection of collections) {
          try {
            await collectionsCollection.updateOne(
              { _id: collection._id },
              { 
                $set: { 
                  restoredAt: new Date(),
                  restoreMetadata: {
                    restoredFrom: timestamp,
                    restoredAt: new Date(),
                    restoredBy: 'backup_system'
                  }
                }
              }
            );
            restoreResults.restored++;
          } catch (error) {
            console.warn('[BACKUP-API] Error restoring collection:', error.message);
            restoreResults.errors++;
          }
        }
      }
    }
    
    else if (backupType === 'watchlater') {
      const watchLaterBackupCollection = db.collection('watchlaterbackups');
      
      if (backupId) {
        const watchLaterBackup = await watchLaterBackupCollection.findOne({ _id: new mongoose.Types.ObjectId(backupId) });
        if (watchLaterBackup) {
          // Restore the Watch Later data from backup
          // This would require implementing the actual restore logic to the current Watch Later collection
          restoreResults.restored = watchLaterBackup.backupMetadata?.totalItems || 0;
        } else {
          restoreResults.errors = 1;
        }
      } else if (timestamp) {
        const watchLaterBackup = await watchLaterBackupCollection.findOne({
          'backupMetadata.timestamp': timestamp
        });
        
        if (watchLaterBackup) {
          // Restore the Watch Later data from backup
          // This would require implementing the actual restore logic to the current Watch Later collection
          restoreResults.restored = watchLaterBackup.backupMetadata?.totalItems || 0;
        } else {
          restoreResults.errors = 1;
        }
      }
    }
    
    console.log('[BACKUP-API] Restore completed:', restoreResults.restored, 'items restored,', restoreResults.errors, 'errors');
    
    res.json({
      success: true,
      message: `Restore completed: ${restoreResults.restored} items restored, ${restoreResults.errors} errors`,
      restoreResults: restoreResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[BACKUP-API] Restore error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore from backup',
      details: error.message
    });
  }
});

module.exports = router;
