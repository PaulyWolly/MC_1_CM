/*
  MIGRATE-YOUTUBE-QUERIES.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../server/.env') });

// Load the YouTube History model
const YoutubeHistory = require('../../server/models/YoutubeHistory');

// Override the collection name to match your actual MongoDB collection
YoutubeHistory.collection.name = 'youtube_searches';

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('💡 Make sure your .env file contains MONGODB_URI=your_atlas_connection_string');
    process.exit(1);
}

/**
 * Clean query text by removing common prefixes
 */
function cleanQuery(query) {
    if (!query) return query;
    
    const cleaned = query
        .replace(/^youtube\s+search\s+/i, '')
        .replace(/^youtube\s+/i, '')
        .replace(/^search\s+/i, '')
        .trim();
        
    return cleaned || query; // Return original if cleaning results in empty string
}

/**
 * Migration function to clean up YouTube queries
 */
async function migrateYouTubeQueries() {
    try {
        console.log('🔄 Starting YouTube query migration...');
        console.log('📡 Connecting to MongoDB:', MONGODB_URI);
        
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Get all YouTube queries from the correct collection
        const collection = mongoose.connection.collection('youtube_searches');
        const queries = await collection.find({}).toArray();
        console.log(`📊 Found ${queries.length} YouTube queries to process`);
        
        if (queries.length === 0) {
            console.log('ℹ️ No queries found to migrate');
            return;
        }
        
        let migratedCount = 0;
        let skippedCount = 0;
        const migrationReport = [];
        
        for (const queryDoc of queries) {
            const originalQuery = queryDoc.query;
            const cleanedQuery = cleanQuery(originalQuery);
            
            // Check if query needs cleaning
            if (originalQuery !== cleanedQuery) {
                console.log(`🔄 Migrating: "${originalQuery}" → "${cleanedQuery}"`);
                
                // Check if cleaned query already exists
                const existingCleanQuery = await collection.findOne({ query: cleanedQuery });
                
                if (existingCleanQuery && existingCleanQuery._id.toString() !== queryDoc._id.toString()) {
                    console.log(`⚠️ Conflict: "${cleanedQuery}" already exists. Merging data...`);
                    
                    // Keep the newer timestamp and merge saved status
                    const newerTimestamp = existingCleanQuery.timestamp > queryDoc.timestamp ? 
                        existingCleanQuery.timestamp : queryDoc.timestamp;
                    const mergedSavedStatus = existingCleanQuery.isSaved || queryDoc.isSaved;
                    
                    // Update existing record with merged data
                    await collection.updateOne(
                        { _id: existingCleanQuery._id },
                        { 
                            $set: {
                        timestamp: newerTimestamp,
                        isSaved: mergedSavedStatus
                            }
                        }
                    );
                    
                    // Delete the duplicate
                    await collection.deleteOne({ _id: queryDoc._id });
                    
                    migrationReport.push({
                        action: 'merged',
                        original: originalQuery,
                        cleaned: cleanedQuery,
                        mergedWith: existingCleanQuery._id
                    });
                } else {
                    // Update the query name
                    await collection.updateOne(
                        { _id: queryDoc._id },
                        { $set: { query: cleanedQuery } }
                    );
                    
                    migrationReport.push({
                        action: 'updated',
                        original: originalQuery,
                        cleaned: cleanedQuery
                    });
                }
                
                migratedCount++;
            } else {
                console.log(`✅ Already clean: "${originalQuery}"`);
                skippedCount++;
            }
        }
        
        console.log('\n📋 Migration Summary:');
        console.log(`✅ Migrated: ${migratedCount} queries`);
        console.log(`⏭️ Skipped: ${skippedCount} queries (already clean)`);
        console.log(`📊 Total processed: ${queries.length} queries`);
        
        if (migrationReport.length > 0) {
            console.log('\n📝 Detailed Migration Report:');
            migrationReport.forEach((report, index) => {
                console.log(`${index + 1}. ${report.action.toUpperCase()}: "${report.original}" → "${report.cleaned}"`);
                if (report.mergedWith) {
                    console.log(`   Merged with existing record: ${report.mergedWith}`);
                }
            });
        }
        
        console.log('\n🎉 Migration completed successfully!');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        // Close MongoDB connection
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}

// Add schema update function to add displayName field (optional enhancement)
async function addDisplayNameField() {
    try {
        console.log('🔄 Adding displayName field to existing records...');
        
        await mongoose.connect(MONGODB_URI);
        
        const collection = mongoose.connection.collection('youtube_searches');
        const queries = await collection.find({ displayName: { $exists: false } }).toArray();
        console.log(`📊 Found ${queries.length} records without displayName field`);
        
        for (const queryDoc of queries) {
            const displayName = cleanQuery(queryDoc.query);
            await collection.updateOne(
                { _id: queryDoc._id },
                { $set: { displayName: displayName } }
            );
            console.log(`✅ Added displayName "${displayName}" to query "${queryDoc.query}"`);
        }
        
        console.log('🎉 DisplayName field added to all records!');
        
    } catch (error) {
        console.error('❌ Failed to add displayName field:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
    }
}

// Main execution
async function main() {
    try {
        console.log('🚀 YouTube Query Migration Tool');
        console.log('================================\n');
        
        // Run the migration
        await migrateYouTubeQueries();
        
        // Optionally add displayName field
        const addDisplayName = process.argv.includes('--add-display-name');
        if (addDisplayName) {
            console.log('\n🔄 Adding displayName field...');
            await addDisplayNameField();
        }
        
        console.log('\n✨ All migrations completed successfully!');
        console.log('\n💡 Next steps:');
        console.log('1. Restart your server to pick up the changes');
        console.log('2. Clear browser localStorage to refresh cached queries');
        console.log('3. Test the YouTube search dropdown');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    migrateYouTubeQueries,
    addDisplayNameField,
    cleanQuery
}; 