// Migration script to convert collections from old path format to unified data keys
console.log('🔄 [MIGRATION] Starting collections migration to unified data keys...');

// This script should be run in the browser console
function migrateCollectionsToUnifiedKeys() {
    try {
        // Get collections from localStorage
        const collectionsData = localStorage.getItem('collections');
        if (!collectionsData) {
            console.log('❌ [MIGRATION] No collections data found');
            return;
        }

        const collections = JSON.parse(collectionsData);
        console.log('📁 [MIGRATION] Found collections:', Object.keys(collections));

        // Check if MediaLibraryManager is available
        if (!window.mediaLibraryManager || !window.mediaLibraryManager.unifiedData) {
            console.log('❌ [MIGRATION] MediaLibraryManager or unifiedData not available');
            return;
        }

        const unifiedData = window.mediaLibraryManager.unifiedData;
        console.log('📊 [MIGRATION] Unified data loaded:', Object.keys(unifiedData).length, 'items');

        let totalMigrated = 0;
        let totalSkipped = 0;
        let totalErrors = 0;

        // Process each collection
        Object.keys(collections).forEach(collectionName => {
            const collection = collections[collectionName];
            if (!Array.isArray(collection)) return;

            console.log(`\n🔄 [MIGRATION] Processing collection: ${collectionName} (${collection.length} items)`);

            const migratedCollection = [];
            
            collection.forEach((item, index) => {
                try {
                    // Check if item is already a unified data key
                    if (unifiedData[item]) {
                        console.log(`✅ [MIGRATION] Item ${index + 1} already unified key: ${item}`);
                        migratedCollection.push(item);
                        totalSkipped++;
                        return;
                    }

                    // Try to find matching unified data key by path
                    let foundKey = null;
                    for (const [key, data] of Object.entries(unifiedData)) {
                        // Check various path properties
                        if (data.path === item || 
                            data.absPath === item ||
                            (data.files && data.files.some(file => 
                                file.absPath === item || file.relPath === item
                            ))) {
                            foundKey = key;
                            break;
                        }
                        
                        // For TV shows, check if the item path is within the show's directory (episode within show)
                        if (data.type === "tvshow" && data.path && item) {
                            const showPath = data.path.replace(/\\/g, "/");
                            const itemPath = item.replace(/\\/g, "/");
                            
                            if (itemPath.startsWith(showPath + "/") || itemPath.startsWith(showPath + "\\")) {
                                foundKey = key;
                                break;
                            }
                        }
                    }

                    if (foundKey) {
                        console.log(`🔄 [MIGRATION] Item ${index + 1} migrated: "${item}" → "${foundKey}"`);
                        migratedCollection.push(foundKey);
                        totalMigrated++;
                    } else {
                        console.log(`⚠️ [MIGRATION] Item ${index + 1} not found in unified data: "${item}"`);
                        migratedCollection.push(item); // Keep original if not found
                        totalErrors++;
                    }
                } catch (error) {
                    console.error(`❌ [MIGRATION] Error processing item ${index + 1}:`, error);
                    migratedCollection.push(item); // Keep original on error
                    totalErrors++;
                }
            });

            // Update collection if changes were made
            if (migratedCollection.length !== collection.length || 
                !migratedCollection.every((item, index) => item === collection[index])) {
                collections[collectionName] = migratedCollection;
                console.log(`✅ [MIGRATION] Updated collection: ${collectionName}`);
            } else {
                console.log(`⏭️ [MIGRATION] No changes needed for collection: ${collectionName}`);
            }
        });

        // Save updated collections
        localStorage.setItem('collections', JSON.stringify(collections));
        
        console.log('\n🎉 [MIGRATION] Migration completed!');
        console.log(`📊 [MIGRATION] Results:`);
        console.log(`   ✅ Migrated: ${totalMigrated} items`);
        console.log(`   ⏭️ Skipped: ${totalSkipped} items`);
        console.log(`   ❌ Errors: ${totalErrors} items`);
        
        return {
            migrated: totalMigrated,
            skipped: totalSkipped,
            errors: totalErrors
        };

    } catch (error) {
        console.error('❌ [MIGRATION] Migration failed:', error);
        return null;
    }
}

// Make function available globally
window.migrateCollectionsToUnifiedKeys = migrateCollectionsToUnifiedKeys;

console.log('✅ [MIGRATION] Migration function loaded. Run migrateCollectionsToUnifiedKeys() in browser console.');
