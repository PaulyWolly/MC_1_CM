/*
  CLEAN-LOCALSTORAGE-CACHE.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

/**
 * Client-side script to clean up localStorage YouTube cache keys
 * This should be run in the browser console after the MongoDB migration
 * 
 * USAGE:
 * 1. Open browser console on your app
 * 2. Copy and paste this entire script
 * 3. Run: cleanYouTubeLocalStorageCache()
 */

function cleanYouTubeLocalStorageCache() {
    console.log('🧹 Starting localStorage cache cleanup...');
    
    const keysToProcess = [];
    const keysToDelete = [];
    const migrationReport = [];
    
    // Find all YouTube cache keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('yt_') && key.includes('_search_')) {
            keysToProcess.push(key);
        }
    }
    
    console.log(`📊 Found ${keysToProcess.length} YouTube cache keys to process`);
    
    if (keysToProcess.length === 0) {
        console.log('ℹ️ No cache keys found to migrate');
        return;
    }
    
    keysToProcess.forEach(oldKey => {
        try {
            // Extract the data
            const data = JSON.parse(localStorage.getItem(oldKey));
            
            // Extract query from old key format: yt_Youtube search privettricker_search_21
            const parts = oldKey.split('_search_');
            if (parts.length === 2) {
                const fullQuery = parts[0].substring(3); // Remove 'yt_'
                const pageNumber = parts[1];
                
                // Clean the query
                const cleanedQuery = fullQuery
                    .replace(/^youtube\s+search\s+/i, '')
                    .replace(/^youtube\s+/i, '')
                    .replace(/^search\s+/i, '')
                    .trim();
                
                // Create new key format: yt_[cleanedQuery]_search_[page]
                const newKey = `yt_${cleanedQuery}_search_${pageNumber}`;
                
                if (oldKey !== newKey) {
                    console.log(`🔄 Migrating cache key: "${oldKey}" → "${newKey}"`);
                    
                    // Update the query in the data object
                    if (data.query) {
                        data.query = cleanedQuery;
                    }
                    if (data.subject) {
                        data.subject = cleanedQuery;
                    }
                    
                    // Check if new key already exists
                    if (localStorage.getItem(newKey)) {
                        console.log(`⚠️ New key already exists: ${newKey}. Keeping newer data...`);
                        const existingData = JSON.parse(localStorage.getItem(newKey));
                        
                        // Keep the data with newer timestamp
                        if (data.timestamp > existingData.timestamp) {
                            localStorage.setItem(newKey, JSON.stringify(data));
                            console.log(`✅ Updated ${newKey} with newer data`);
                        }
                    } else {
                        // Set new key
                        localStorage.setItem(newKey, JSON.stringify(data));
                        console.log(`✅ Created new cache key: ${newKey}`);
                    }
                    
                    // Mark old key for deletion
                    keysToDelete.push(oldKey);
                    
                    migrationReport.push({
                        oldKey,
                        newKey,
                        query: cleanedQuery,
                        page: pageNumber
                    });
                } else {
                    console.log(`✅ Already clean: ${oldKey}`);
                }
            }
        } catch (error) {
            console.error(`❌ Error processing key ${oldKey}:`, error);
        }
    });
    
    // Delete old keys
    console.log(`🗑️ Deleting ${keysToDelete.length} old cache keys...`);
    keysToDelete.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Deleted: ${key}`);
    });
    
    console.log('\n📋 Cache Cleanup Summary:');
    console.log(`✅ Migrated: ${migrationReport.length} cache keys`);
    console.log(`🗑️ Deleted: ${keysToDelete.length} old keys`);
    console.log(`📊 Total processed: ${keysToProcess.length} keys`);
    
    if (migrationReport.length > 0) {
        console.log('\n📝 Detailed Migration Report:');
        migrationReport.forEach((report, index) => {
            console.log(`${index + 1}. Query: "${report.query}" Page: ${report.page}`);
            console.log(`   Old: ${report.oldKey}`);
            console.log(`   New: ${report.newKey}`);
        });
    }
    
    console.log('\n🎉 localStorage cache cleanup completed!');
    console.log('💡 Refresh the page to see the updated dropdown');
    
    return {
        migrated: migrationReport.length,
        deleted: keysToDelete.length,
        total: keysToProcess.length,
        report: migrationReport
    };
}

// Also provide a function to just list what would be changed (dry run)
function previewYouTubeLocalStorageMigration() {
    console.log('👀 Previewing localStorage cache migration...');
    
    const keysToProcess = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('yt_') && key.includes('_search_')) {
            keysToProcess.push(key);
        }
    }
    
    console.log(`📊 Found ${keysToProcess.length} keys that would be processed:`);
    
    keysToProcess.forEach((key, index) => {
        const parts = key.split('_search_');
        if (parts.length === 2) {
            const fullQuery = parts[0].substring(3);
            const pageNumber = parts[1];
            const cleanedQuery = fullQuery
                .replace(/^youtube\s+search\s+/i, '')
                .replace(/^youtube\s+/i, '')
                .replace(/^search\s+/i, '')
                .trim();
            const newKey = `yt_${cleanedQuery}_search_${pageNumber}`;
            
            console.log(`${index + 1}. "${key}" → "${newKey}"`);
            console.log(`   Query: "${fullQuery}" → "${cleanedQuery}"`);
        }
    });
    
    console.log('\n💡 To run the actual migration, execute: cleanYouTubeLocalStorageCache()');
}

console.log('🚀 YouTube localStorage Cache Cleanup Tool Loaded');
console.log('📋 Available functions:');
console.log('  - previewYouTubeLocalStorageMigration() - See what would be changed');
console.log('  - cleanYouTubeLocalStorageCache() - Run the actual migration');
console.log('');
console.log('💡 Run previewYouTubeLocalStorageMigration() first to see what will be changed'); 