const fs = require('fs');
const path = require('path');

console.log('🔧 [TV-SHOWS UPDATE] Starting to add "isMovie": false to all TV shows...');

const filePath = path.join(__dirname, 'public', 'components', 'MediaLibrary', 'data', 'tv-shows', 'tv-shows-unified.json');

try {
  // Read the current TV shows data
  console.log('📖 [TV-SHOWS UPDATE] Reading tv-shows-unified.json...');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const tvShowsData = JSON.parse(rawData);
  
  console.log(`📊 [TV-SHOWS UPDATE] Found ${Object.keys(tvShowsData).length} TV shows to update`);
  
  let updatedCount = 0;
  let alreadyHadProperty = 0;
  
  // Process each TV show entry
  Object.keys(tvShowsData).forEach((showKey, index) => {
    const show = tvShowsData[showKey];
    
    // Progress indicator every 100 shows
    if ((index + 1) % 100 === 0) {
      console.log(`⏳ [TV-SHOWS UPDATE] Processing show ${index + 1} of ${Object.keys(tvShowsData).length}...`);
    }
    
    // Check if it already has the isMovie property
    if (show.hasOwnProperty('isMovie')) {
      alreadyHadProperty++;
      // Ensure it's set to false for TV shows
      if (show.isMovie !== false) {
        show.isMovie = false;
        updatedCount++;
      }
    } else {
      // Add the isMovie property
      show.isMovie = false;
      updatedCount++;
    }
  });
  
  console.log(`✅ [TV-SHOWS UPDATE] Processing complete:`);
  console.log(`   - Updated shows: ${updatedCount}`);
  console.log(`   - Already had isMovie property: ${alreadyHadProperty}`);
  console.log(`   - Total shows processed: ${Object.keys(tvShowsData).length}`);
  
  // Write the updated data back to the file
  console.log('💾 [TV-SHOWS UPDATE] Writing updated data to file...');
  fs.writeFileSync(filePath, JSON.stringify(tvShowsData, null, 2), 'utf8');
  
  console.log('🎉 [TV-SHOWS UPDATE] Successfully added "isMovie": false to all TV shows!');
  console.log(`📁 [TV-SHOWS UPDATE] Updated file: ${filePath}`);
  
} catch (error) {
  console.error('❌ [TV-SHOWS UPDATE] Error updating TV shows:', error);
  process.exit(1);
}
