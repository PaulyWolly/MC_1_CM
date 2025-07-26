/*
  UPDATE_POSTER_MAPPING.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const fs = require('fs').promises;
const path = require('path');

const MOVIES_DIR = 'S:/MEDIA/MOVIES';
const POSTER_MAPPING_FILE = 'public/components/MediaLibrary/data/movies/movie_posters_normalized.json';
const BACKUP_FILE = 'public/components/MediaLibrary/data/movie_posters_backup.json';

async function updatePosterMapping() {
    console.log('🔄 Updating poster mapping for normalized movie names...\n');
    
    try {
        // Load current poster mapping
        const currentMapping = JSON.parse(await fs.readFile(POSTER_MAPPING_FILE, 'utf8'));
        console.log(`📄 Loaded ${Object.keys(currentMapping).length} current poster mappings`);
        
        // Create backup
        await fs.writeFile(BACKUP_FILE, JSON.stringify(currentMapping, null, 2));
        console.log(`💾 Created backup at ${BACKUP_FILE}`);
        
        // Get all movie folders
        const movieFolders = await fs.readdir(MOVIES_DIR, { withFileTypes: true });
        const normalizedFolders = movieFolders.filter(f => f.isDirectory());
        
        console.log(`📁 Found ${normalizedFolders.length} movie folders`);
        
        const newMapping = {};
        let updatedCount = 0;
        let notFoundCount = 0;
        
        for (const folder of normalizedFolders) {
            const folderPath = path.join(MOVIES_DIR, folder.name);
            
            // Find the main movie file in the folder
            const files = await fs.readdir(folderPath);
            const movieFile = files.find(f => /\.(mp4|mkv|avi|mov|m4v)$/i.test(f));
            
            if (!movieFile) {
                console.log(`⚠️  No movie file found in ${folder.name}`);
                continue;
            }
            
            const newPath = path.join(folderPath, movieFile).replace(/\//g, '\\');
            
            // Try to find a matching old path in the current mapping
            let foundMatch = false;
            
            // First, try exact folder name match (case insensitive)
            for (const [oldPath, posterUrl] of Object.entries(currentMapping)) {
                const oldFolderName = path.dirname(oldPath).split('\\').pop();
                if (oldFolderName.toLowerCase() === folder.name.toLowerCase()) {
                    newMapping[newPath] = posterUrl;
                    foundMatch = true;
                    updatedCount++;
                    console.log(`✅ Updated: ${folder.name} -> ${posterUrl}`);
                    break;
                }
            }
            
            // If no exact match, try partial folder name match
            if (!foundMatch) {
                const cleanFolderName = folder.name.replace(/\[[^\]]*\]/g, '').trim();
                
                for (const [oldPath, posterUrl] of Object.entries(currentMapping)) {
                    const oldFolderName = path.dirname(oldPath).split('\\').pop();
                    const cleanOldFolderName = oldFolderName.replace(/\[[^\]]*\]/g, '').trim();
                    
                    if (cleanOldFolderName.toLowerCase() === cleanFolderName.toLowerCase()) {
                        newMapping[newPath] = posterUrl;
                        foundMatch = true;
                        updatedCount++;
                        console.log(`✅ Updated (partial match): ${folder.name} -> ${posterUrl}`);
                        break;
                    }
                }
            }
            
            if (!foundMatch) {
                notFoundCount++;
                console.log(`❌ No poster found for: ${folder.name}`);
            }
        }
        
        // Save the new mapping
        await fs.writeFile(POSTER_MAPPING_FILE, JSON.stringify(newMapping, null, 2));
        
        console.log('\n📊 Update Summary:');
        console.log(`✅ Successfully updated: ${updatedCount} posters`);
        console.log(`❌ No poster found for: ${notFoundCount} movies`);
        console.log(`📄 Total new mappings: ${Object.keys(newMapping).length}`);
        console.log(`💾 Backup saved to: ${BACKUP_FILE}`);
        
        if (notFoundCount > 0) {
            console.log('\n💡 For movies without posters, you can now use the PosterSelector to add them!');
        }
        
    } catch (error) {
        console.error('❌ Error updating poster mapping:', error);
    }
}

updatePosterMapping(); 