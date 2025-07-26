/*
  STANDARDIZE_DATA_STRUCTURES.JS
  Version: 1
  AppName: MC_1_CM [v9]
  Created: 1/6/2025
  Created by Paul Welby
  
  This script standardizes the data structures between movies and TV shows
  to use the same format: { path: "", folders: [...] }
*/

const fs = require('fs');
const path = require('path');

console.log('🔄 [STANDARDIZE] Standardizing data structures...');
console.log('='.repeat(60));

// File paths
const moviesFile = 'public/components/MediaLibrary/data/movies/media-library-movies_normalized.json';
const tvShowsFile = 'public/components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json';

// Backup function
function createBackup(filePath) {
    const backupPath = filePath + '.backup-' + Date.now();
    fs.copyFileSync(filePath, backupPath);
    console.log(`📦 [STANDARDIZE] Created backup: ${backupPath}`);
    return backupPath;
}

// Standardize TV Shows to match Movies structure
function standardizeTVShows() {
    console.log('\n📺 [STANDARDIZE] Standardizing TV Shows structure...');
    
    if (!fs.existsSync(tvShowsFile)) {
        console.log('❌ [STANDARDIZE] TV Shows file not found');
        return false;
    }
    
    // Create backup
    createBackup(tvShowsFile);
    
    // Read current TV shows data
    const tvShowsData = JSON.parse(fs.readFileSync(tvShowsFile, 'utf8'));
    
    // Check if already standardized
    if (tvShowsData.path !== undefined && tvShowsData.folders !== undefined) {
        console.log('✅ [STANDARDIZE] TV Shows already standardized');
        return true;
    }
    
    // Convert array to standardized structure
    const standardizedData = {
        path: "",
        folders: tvShowsData
    };
    
    // Write back to file
    fs.writeFileSync(tvShowsFile, JSON.stringify(standardizedData, null, 2));
    
    console.log(`✅ [STANDARDIZE] TV Shows standardized: ${tvShowsData.length} shows`);
    return true;
}

// Verify Movies structure
function verifyMoviesStructure() {
    console.log('\n🎬 [STANDARDIZE] Verifying Movies structure...');
    
    if (!fs.existsSync(moviesFile)) {
        console.log('❌ [STANDARDIZE] Movies file not found');
        return false;
    }
    
    const moviesData = JSON.parse(fs.readFileSync(moviesFile, 'utf8'));
    
    if (moviesData.path !== undefined && moviesData.folders !== undefined) {
        console.log(`✅ [STANDARDIZE] Movies structure is correct: ${moviesData.folders.length} movies`);
        return true;
    } else {
        console.log('❌ [STANDARDIZE] Movies structure is incorrect');
        return false;
    }
}

// Update validation script to use consistent structure
function updateValidationScript() {
    console.log('\n🔧 [STANDARDIZE] Updating validation script...');
    
    const validateFile = 'validate.js';
    if (!fs.existsSync(validateFile)) {
        console.log('❌ [STANDARDIZE] Validation file not found');
        return false;
    }
    
    // Create backup
    createBackup(validateFile);
    
    let validateCode = fs.readFileSync(validateFile, 'utf8');
    
    // Update TV Shows validation to use folders structure
    const oldTVShowsCheck = `// TV shows file is an array directly (not wrapped in folders property)
                if (!Array.isArray(data)) {
                    return 'TV shows data is not an array (expected array of TV shows)';
                }
                
                if (data.length === 0) {
                    return \`TV shows array is empty (0 shows found, expected > 0)\`;
                }
                
                // Check if first show has proper structure
                const firstShow = data[0];`;
    
    const newTVShowsCheck = `// Check if folders property exists
                if (!data.folders) {
                    return 'Missing "folders" property in TV shows data structure';
                }
                
                // Check if folders array is empty
                if (!Array.isArray(data.folders)) {
                    return 'TV shows "folders" property is not an array';
                }
                
                if (data.folders.length === 0) {
                    return \`TV shows folders array is empty (0 shows found, expected > 0)\`;
                }
                
                // Check if first show has proper structure
                const firstShow = data.folders[0];`;
    
    validateCode = validateCode.replace(oldTVShowsCheck, newTVShowsCheck);
    
    // Write updated validation script
    fs.writeFileSync(validateFile, validateCode);
    
    console.log('✅ [STANDARDIZE] Validation script updated');
    return true;
}

// Main execution
async function main() {
    try {
        console.log('🎯 [STANDARDIZE] Starting standardization process...');
        
        // Verify movies structure first
        const moviesOK = verifyMoviesStructure();
        if (!moviesOK) {
            console.log('❌ [STANDARDIZE] Movies structure verification failed');
            return;
        }
        
        // Standardize TV shows
        const tvShowsOK = standardizeTVShows();
        if (!tvShowsOK) {
            console.log('❌ [STANDARDIZE] TV Shows standardization failed');
            return;
        }
        
        // Update validation script
        const validationOK = updateValidationScript();
        if (!validationOK) {
            console.log('❌ [STANDARDIZE] Validation script update failed');
            return;
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ [STANDARDIZE] STANDARDIZATION COMPLETE');
        console.log('='.repeat(60));
        console.log('🎯 [STANDARDIZE] Both Movies and TV Shows now use:');
        console.log('   { path: "", folders: [...] }');
        console.log('🎯 [STANDARDIZE] Validation script updated to match');
        console.log('🎯 [STANDARDIZE] Backups created for all modified files');
        
    } catch (error) {
        console.error('💥 [STANDARDIZE] Standardization failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { standardizeTVShows, verifyMoviesStructure, updateValidationScript }; 