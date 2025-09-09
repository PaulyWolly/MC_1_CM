/*
  WATCHLATERSYNC.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/


/**
 * Watch Later MongoDB Storage System
 * Automatically syncs Watch Later data between localStorage and MongoDB
 */

class WatchLaterSync {
    constructor() {
        this.apiBase = '/api/watch-later';
        this.backupInterval = 30000; // 30 seconds
        this.lastBackup = 0;
        this.isBackingUp = false;
        
        // Start automatic backup
        this.startAutoBackup();
        
        // Listen for localStorage changes
        this.setupStorageListener();
        
        // Automatically restore from MongoDB on initialization
        this.autoRestoreFromMongoDB();
        
        console.log('[WATCH-LATER-SYNC] MongoDB storage system initialized');
    }
    
    startAutoBackup() {
        setInterval(() => {
            this.backupToMongoDB();
        }, this.backupInterval);
    }
    
    setupStorageListener() {
        // Override the original localStorage.setItem to catch changes
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = (key, value) => {
            originalSetItem.call(localStorage, key, value);
            if (key === 'mediaLibraryResumeList') {
                console.log('[WATCH-LATER-SYNC] localStorage changed, triggering MongoDB backup');
                this.backupToMongoDB();
            }
        };
    }
    
    async backupToMongoDB() {
        if (this.isBackingUp) return;
        
        try {
            this.isBackingUp = true;
            const data = localStorage.getItem('mediaLibraryResumeList');
            if (!data) return;
            
            const watchLaterData = JSON.parse(data);
            
            // Use bulk import endpoint for efficiency
            const response = await fetch(`${this.apiBase}/bulk-import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: watchLaterData })
            });
            
            if (response.ok) {
                this.lastBackup = Date.now();
                const result = await response.json();
                console.log('[WATCH-LATER-SYNC] MongoDB backup successful:', result.totalItems, 'items');
            } else {
                console.error('[WATCH-LATER-SYNC] MongoDB backup failed:', response.status);
            }
        } catch (error) {
            console.error('[WATCH-LATER-SYNC] MongoDB backup error:', error);
        } finally {
            this.isBackingUp = false;
        }
    }
    
    async restoreFromMongoDB() {
        try {
            const response = await fetch(this.apiBase);
            if (response.ok) {
                const backupData = await response.json();
                if (backupData.items && Array.isArray(backupData.items)) {
                    localStorage.setItem('mediaLibraryResumeList', JSON.stringify(backupData.items));
                    console.log('[WATCH-LATER-SYNC] Restored from MongoDB:', backupData.items.length, 'items');
                    return backupData.items;
                }
            }
        } catch (error) {
            console.error('[WATCH-LATER-SYNC] MongoDB restore error:', error);
        }
        return null;
    }
    
    async getMongoDBInfo() {
        try {
            const response = await fetch(`${this.apiBase}/info`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('[WATCH-LATER-SYNC] Get MongoDB info error:', error);
        }
        return null;
    }
    
    // Manual backup trigger
    async manualBackup() {
        console.log('[WATCH-LATER-SYNC] Manual MongoDB backup triggered');
        await this.backupToMongoDB();
    }
    
    // Manual restore trigger
    async manualRestore() {
        console.log('[WATCH-LATER-SYNC] Manual MongoDB restore triggered');
        const restored = await this.restoreFromMongoDB();
        if (restored) {
            // Trigger UI refresh
            if (window.mediaLibraryManager) {
                window.mediaLibraryManager.updateModalContent();
            }
        }
        return restored;
    }

    async autoRestoreFromMongoDB() {
        try {
            console.log('[WATCH-LATER-SYNC] Attempting auto-restore from MongoDB...');
            const restored = await this.restoreFromMongoDB();
            if (restored) {
                console.log('[WATCH-LATER-SYNC] MongoDB auto-restore successful:', restored.length, 'items');
                // Trigger UI refresh if MediaLibraryManager is available
                if (window.mediaLibraryManager && window.mediaLibraryManager.updateModalContent) {
                    setTimeout(() => {
                        window.mediaLibraryManager.updateModalContent();
                    }, 1000);
                }
            } else {
                console.log('[WATCH-LATER-SYNC] No MongoDB data found or restore failed');
            }
        } catch (error) {
            console.error('[WATCH-LATER-SYNC] MongoDB auto-restore error:', error);
        }
    }

    // Force sync current UI data to MongoDB (overwrites MongoDB with current localStorage)
    async forceSyncUIToMongoDB() {
        try {
            console.log('[WATCH-LATER-SYNC] Force syncing current UI data to MongoDB...');
            const data = localStorage.getItem('mediaLibraryResumeList');
            if (!data) {
                console.log('[WATCH-LATER-SYNC] No localStorage data found to sync');
                return false;
            }
            
            const watchLaterData = JSON.parse(data);
            console.log('[WATCH-LATER-SYNC] Current UI data to sync:', watchLaterData.length, 'items');
            
            // First clear MongoDB collection
            const clearResponse = await fetch(`${this.apiBase}/clear`, {
                method: 'DELETE'
            });
            
            if (!clearResponse.ok) {
                console.error('[WATCH-LATER-SYNC] Failed to clear MongoDB collection');
                return false;
            }
            
            // Then bulk import current UI data
            const response = await fetch(`${this.apiBase}/bulk-import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: watchLaterData })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('[WATCH-LATER-SYNC] Force sync successful:', result.totalItems, 'items synced to MongoDB');
                
                // Trigger UI refresh
                if (window.mediaLibraryManager && window.mediaLibraryManager.updateModalContent) {
                    setTimeout(() => {
                        window.mediaLibraryManager.updateModalContent();
                    }, 500);
                }
                
                return true;
            } else {
                console.error('[WATCH-LATER-SYNC] Force sync failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('[WATCH-LATER-SYNC] Force sync error:', error);
            return false;
        }
    }

    // Get sync status and statistics
    async getSyncStatus() {
        try {
            const localStorageData = localStorage.getItem('mediaLibraryResumeList');
            const localStorageItems = localStorageData ? JSON.parse(localStorageData) : [];
            
            const mongoInfo = await this.getMongoDBInfo();
            
            return {
                localStorage: {
                    itemCount: localStorageItems.length,
                    lastModified: localStorageData ? new Date().toISOString() : null
                },
                mongodb: mongoInfo || { itemCount: 0, lastModified: null },
                isInSync: localStorageItems.length === (mongoInfo?.itemCount || 0)
            };
        } catch (error) {
            console.error('[WATCH-LATER-SYNC] Get sync status error:', error);
            return null;
        }
    }
}

// Initialize the sync system when the page loads
if (typeof window !== 'undefined') {
    window.watchLaterSync = new WatchLaterSync();
}

export default WatchLaterSync;
