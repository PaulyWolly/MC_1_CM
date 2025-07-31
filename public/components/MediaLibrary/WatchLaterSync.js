/*
  WATCHLATERSYNC.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
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
}

// Initialize the sync system when the page loads
if (typeof window !== 'undefined') {
    window.watchLaterSync = new WatchLaterSync();
}

export default WatchLaterSync;
