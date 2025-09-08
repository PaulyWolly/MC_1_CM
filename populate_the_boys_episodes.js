const fs = require('fs');
const path = require('path');

// Path to the unified JSON file
const unifiedJsonPath = 'public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json';

console.log('🔧 [THE BOYS EPISODES] Populating The Boys (2019) episodes and files...');

try {
  // Read the unified JSON file
  const jsonData = fs.readFileSync(unifiedJsonPath, 'utf8');
  const unifiedData = JSON.parse(jsonData);
  
  console.log('📖 [THE BOYS EPISODES] Successfully loaded unified JSON data');
  
  // Find The Boys (2019) entry
  const boysKey = 'the.boys.(2019)';
  const boysEntry = unifiedData[boysKey];
  
  if (!boysEntry) {
    console.error('❌ [THE BOYS EPISODES] The Boys (2019) entry not found!');
    process.exit(1);
  }
  
  console.log('✅ [THE BOYS EPISODES] Found The Boys (2019) entry');
  
  // Base path for The Boys (2019)
  const basePath = 'S:/MEDIA/TV-SHOWS/The Boys (2019)';
  
  // Scan each season folder
  const seasons = ['1', '2', '3', '4'];
  let totalEpisodes = 0;
  const files = [];
  
  for (const seasonNum of seasons) {
    const seasonPath = path.join(basePath, `Season ${seasonNum.padStart(2, '0')}`);
    console.log(`📺 [THE BOYS EPISODES] Processing Season ${seasonNum}...`);
    
    try {
      // Check if season folder exists
      if (!fs.existsSync(seasonPath)) {
        console.log(`⚠️ [THE BOYS EPISODES] Season ${seasonNum} folder not found: ${seasonPath}`);
        continue;
      }
      
      // Read season folder contents
      const seasonFiles = fs.readdirSync(seasonPath);
      const videoFiles = seasonFiles.filter(file => 
        file.toLowerCase().endsWith('.mkv') || 
        file.toLowerCase().endsWith('.mp4') || 
        file.toLowerCase().endsWith('.avi')
      );
      
      console.log(`📁 [THE BOYS EPISODES] Found ${videoFiles.length} video files in Season ${seasonNum}`);
      
      // Process each video file
      videoFiles.forEach((file, index) => {
        const episodeNum = (index + 1).toString();
        const episodeKey = episodeNum;
        
        // Extract episode title from filename (remove season/episode info)
        let episodeTitle = file
          .replace(/\.(mkv|mp4|avi)$/i, '') // Remove extension
          .replace(/S\d{2}E\d{2}/i, '') // Remove S01E01 pattern
          .replace(/Season\s*\d+/i, '') // Remove Season X
          .replace(/The\s*Boys\s*\(\d{4}\)/i, '') // Remove show name
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
          .trim();
        
        // If episode title is empty, use a default
        if (!episodeTitle) {
          episodeTitle = `Episode ${episodeNum}`;
        }
        
        // Create episode data
        const episodeData = {
          episode_number: parseInt(episodeNum),
          season_number: parseInt(seasonNum),
          title: episodeTitle,
          episodeTitle: episodeTitle,
          path: `The Boys (2019)\\Season ${seasonNum.padStart(2, '0')}\\${file}`,
          absPath: path.join(seasonPath, file).replace(/\\/g, '/'),
          filePath: path.join(seasonPath, file).replace(/\\/g, '/'),
          relPath: `The Boys (2019)\\Season ${seasonNum.padStart(2, '0')}\\${file}`,
          videoFormat: path.extname(file),
          supportsVideo: true,
          still: null, // Will be populated later
          duration: 0 // Will be populated later
        };
        
        // Add to seasons episodes
        if (!boysEntry.seasons[seasonNum].episodes) {
          boysEntry.seasons[seasonNum].episodes = {};
        }
        boysEntry.seasons[seasonNum].episodes[episodeKey] = episodeData;
        
        // Add to files array
        files.push({
          name: `The Boys (2019) | S${seasonNum.padStart(2, '0')}E${episodeNum.padStart(2, '0')} | ${episodeTitle}`,
          path: `The Boys (2019)\\Season ${seasonNum.padStart(2, '0')}\\${file}`,
          absPath: path.join(seasonPath, file).replace(/\\/g, '/'),
          filePath: path.join(seasonPath, file).replace(/\\/g, '/'),
          relPath: `The Boys (2019)\\Season ${seasonNum.padStart(2, '0')}\\${file}`,
          duration: 0,
          season: parseInt(seasonNum),
          episode: parseInt(episodeNum),
          type: 'episode',
          videoFormat: path.extname(file),
          supportsVideo: true,
          still: null,
          episodeTitle: episodeTitle
        });
        
        totalEpisodes++;
      });
      
      // Update episode count for this season
      boysEntry.seasons[seasonNum].episode_count = videoFiles.length;
      
    } catch (error) {
      console.error(`❌ [THE BOYS EPISODES] Error processing Season ${seasonNum}:`, error.message);
    }
  }
  
  // Process Featurettes folder
  const featurettesPath = path.join(basePath, 'Featurettes');
  if (fs.existsSync(featurettesPath)) {
    console.log('📁 [THE BOYS EPISODES] Processing Featurettes folder...');
    
    try {
      const featuretteFiles = fs.readdirSync(featurettesPath);
      const videoFiles = featuretteFiles.filter(file => 
        file.toLowerCase().endsWith('.mkv') || 
        file.toLowerCase().endsWith('.mp4') || 
        file.toLowerCase().endsWith('.avi')
      );
      
      console.log(`📁 [THE BOYS EPISODES] Found ${videoFiles.length} featurette files`);
      
      // Process each featurette file
      videoFiles.forEach((file, index) => {
        const episodeNum = (index + 1).toString();
        const episodeKey = episodeNum;
        
        // Extract featurette title from filename
        let featuretteTitle = file
          .replace(/\.(mkv|mp4|avi)$/i, '') // Remove extension
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
          .trim();
        
        // If title is empty, use a default
        if (!featuretteTitle) {
          featuretteTitle = `Featurette ${episodeNum}`;
        }
        
        // Create featurette data
        const featuretteData = {
          episode_number: parseInt(episodeNum),
          season_number: 0,
          title: featuretteTitle,
          episodeTitle: featuretteTitle,
          path: `The Boys (2019)\\Featurettes\\${file}`,
          absPath: path.join(featurettesPath, file).replace(/\\/g, '/'),
          filePath: path.join(featurettesPath, file).replace(/\\/g, '/'),
          relPath: `The Boys (2019)\\Featurettes\\${file}`,
          videoFormat: path.extname(file),
          supportsVideo: true,
          still: null,
          duration: 0
        };
        
        // Add to Featurettes episodes
        if (!boysEntry.seasons['Featurettes'].episodes) {
          boysEntry.seasons['Featurettes'].episodes = {};
        }
        boysEntry.seasons['Featurettes'].episodes[episodeKey] = featuretteData;
        
        // Add to files array
        files.push({
          name: `The Boys (2019) | Featurettes | ${featuretteTitle}`,
          path: `The Boys (2019)\\Featurettes\\${file}`,
          absPath: path.join(featurettesPath, file).replace(/\\/g, '/'),
          filePath: path.join(featurettesPath, file).replace(/\\/g, '/'),
          relPath: `The Boys (2019)\\Featurettes\\${file}`,
          duration: 0,
          season: 0,
          episode: parseInt(episodeNum),
          type: 'featurette',
          videoFormat: path.extname(file),
          supportsVideo: true,
          still: null,
          episodeTitle: featuretteTitle
        });
        
        totalEpisodes++;
      });
      
      // Update episode count for Featurettes
      boysEntry.seasons['Featurettes'].episode_count = videoFiles.length;
      
    } catch (error) {
      console.error('❌ [THE BOYS EPISODES] Error processing Featurettes:', error.message);
    }
  } else {
    console.log('⚠️ [THE BOYS EPISODES] Featurettes folder not found');
  }
  
  // Update files array
  boysEntry.files = files;
  
  console.log('✅ [THE BOYS EPISODES] Successfully populated episodes and files');
  console.log('📊 [THE BOYS EPISODES] Summary:');
  console.log(`   - Total episodes: ${totalEpisodes}`);
  console.log(`   - Files array: ${files.length} entries`);
  console.log(`   - Season 1: ${boysEntry.seasons['1'].episode_count} episodes`);
  console.log(`   - Season 2: ${boysEntry.seasons['2'].episode_count} episodes`);
  console.log(`   - Season 3: ${boysEntry.seasons['3'].episode_count} episodes (AAC audio)`);
  console.log(`   - Season 4: ${boysEntry.seasons['4'].episode_count} episodes`);
  console.log(`   - Featurettes: ${boysEntry.seasons['Featurettes'].episode_count} featurettes`);
  
  // Write the updated data back to the file
  fs.writeFileSync(unifiedJsonPath, JSON.stringify(unifiedData, null, 2));
  
  console.log('✅ [THE BOYS EPISODES] Successfully updated tv-shows-unified.json');
  console.log('🎉 [THE BOYS EPISODES] The Boys (2019) episodes and files populated!');
  
} catch (error) {
  console.error('❌ [THE BOYS EPISODES] Error:', error.message);
  process.exit(1);
}
