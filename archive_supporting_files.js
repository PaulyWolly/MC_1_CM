const fs = require('fs');
const path = require('path');

// List of supporting JSON files to archive
const filesToArchive = [
    './public/components/MediaLibrary/data/tvshows/media-library-tvshows_normalized.json',
    './public/components/MediaLibrary/data/tvshows/tvshow_episode_images_normalized.json',
    './public/components/MediaLibrary/data/tvshows/tvshow_season_images_normalized.json',
    './public/components/MediaLibrary/data/tvshows/tvshow_cast_normalized.json',
    './public/components/MediaLibrary/data/tvshows/tvshow_descriptions_normalized.json',
    './public/components/MediaLibrary/data/tvshows/tv_genres_normalized.json',
    './public/components/MediaLibrary/data/tvshows/tv_posters_normalized.json'
];

// Archive directory path
const archiveDir = './public/components/MediaLibrary/data/tvshows/ARCHIVE/supporting_files';

// Function to safely archive supporting files
function archiveSupportingFiles() {
    try {
        console.log('📦 Starting ARCHIVE of supporting JSON files...\n');
        console.log('⚠️  This will move files to an archive folder instead of deleting them.\n');
        
        // Create archive directory if it doesn't exist
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
            console.log(`📁 Created archive directory: ${archiveDir}`);
        }
        
        let archivedCount = 0;
        let skippedCount = 0;
        let totalSize = 0;
        
        filesToArchive.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                try {
                    // Get file info
                    const stats = fs.statSync(filePath);
                    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
                    totalSize += stats.size;
                    
                    // Create archive filename with timestamp
                    const fileName = path.basename(filePath);
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const archiveFileName = `${fileName.replace('.json', '')}_archived_${timestamp}.json`;
                    const archivePath = path.join(archiveDir, archiveFileName);
                    
                    // Move file to archive
                    fs.renameSync(filePath, archivePath);
                    console.log(`✅ Archived: ${fileName} (${fileSizeMB} MB) → ${archiveFileName}`);
                    archivedCount++;
                    
                } catch (error) {
                    console.log(`❌ Error archiving ${filePath}: ${error.message}`);
                }
            } else {
                console.log(`⚠️  File not found: ${filePath}`);
                skippedCount++;
            }
        });
        
        console.log('\n🎉 Archive Complete!');
        console.log(`✅ Files archived: ${archivedCount}`);
        console.log(`⚠️  Files skipped: ${skippedCount}`);
        console.log(`💾 Total size archived: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        
        if (archivedCount > 0) {
            console.log('\n📦 Supporting files have been archived.');
            console.log('✅ Your media library now uses only tvshows-unified.json');
            console.log('✅ Supporting files are preserved in the archive for future reference');
            console.log(`📁 Archive location: ${archiveDir}`);
        }
        
        // Create an archive manifest
        const manifest = {
            timestamp: new Date().toISOString(),
            action: 'ARCHIVE',
            filesArchived: archivedCount,
            filesSkipped: skippedCount,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            archiveLocation: archiveDir,
            note: 'Supporting JSON files archived after successful data consolidation. These files are preserved for future reference but are no longer used by the main application.',
            reason: 'Data consolidation completed - all metadata now exists in tvshows-unified.json'
        };
        
        const manifestPath = path.join(archiveDir, 'archive_manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`\n📋 Archive manifest created: ${manifestPath}`);
        
        // Create a README in the archive folder
        const readmeContent = `# ARCHIVED SUPPORTING FILES

This folder contains the original supporting JSON files that were used before data consolidation.

## What's Here:
- **media-library-tvshows_normalized.json** - Media library paths and metadata
- **tvshow_episode_images_normalized.json** - Episode thumbnail fallbacks
- **tvshow_season_images_normalized.json** - Season posters and metadata
- **tvshow_cast_normalized.json** - Cast member information
- **tvshow_descriptions_normalized.json** - Show descriptions and overviews
- **tv_genres_normalized.json** - Show genre classifications
- **tv_posters_normalized.json** - Show poster images

## Why They're Archived:
All this data has been successfully consolidated into \`tvshows-unified.json\`, which is now the single source of truth for the media library.

## When You Might Need These:
- **Data Recovery**: If you need to restore specific metadata
- **Reference**: To understand the original data structure
- **Debugging**: If you encounter issues with the consolidated data
- **Future Features**: If you need to add new metadata types

## Important Notes:
- These files are NO LONGER USED by the application
- The main app now only loads from \`tvshows-unified.json\`
- Do NOT modify these archived files unless you know what you're doing
- If you need to restore data, copy it back to the main directory

## Archive Date:
${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}

---
*This archive was created automatically during the data consolidation process.*`;

        const readmePath = path.join(archiveDir, 'README.md');
        fs.writeFileSync(readmePath, readmeContent);
        console.log(`\n📖 Archive README created: ${readmePath}`);
        
        console.log('\n🚀 Your supporting files are now safely archived!');
        console.log('✅ They can be restored if needed in the future');
        console.log('✅ Your main app is now clean and only uses the unified JSON');
        
    } catch (error) {
        console.error('❌ Error during archiving:', error);
    }
}

// Run the archiving
archiveSupportingFiles();
