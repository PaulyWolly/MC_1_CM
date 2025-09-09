// Complete The Boys (2019) data using the established recipe
const fs = require('fs');

// Load the unified data
const unifiedDataPath = 'public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json';
const unifiedData = JSON.parse(fs.readFileSync(unifiedDataPath, 'utf8'));

console.log('=== COMPLETING THE BOYS (2019) DATA ===\n');

const boysKey = 'the.boys.(2019)';
if (unifiedData[boysKey]) {
  // Fix 1: Add missing season_poster and season_thumbnail to Season 1
  unifiedData[boysKey].seasons["1"].season_poster = "https://media.themoviedb.org/t/p/w260_and_h390_bestv2/iikrapejulhIvbNgUjj468mUE0I.jpg";
  unifiedData[boysKey].seasons["1"].season_thumbnail = "https://media.themoviedb.org/t/p/w260_and_h390_bestv2/iikrapejulhIvbNgUjj468mUE0I.jpg";
  
  // Fix 2: Fix cast images with full TMDB URLs
  unifiedData[boysKey].cast = [
    {
      "name": "Karl Urban",
      "character": "Billy Butcher",
      "profile_path": "https://image.tmdb.org/t/p/w500/tHYOUOa8If6n2sk4MGzG1gD0k9l.jpg"
    },
    {
      "name": "Jack Quaid", 
      "character": "Hughie Campbell",
      "profile_path": "https://image.tmdb.org/t/p/w500/6IX0BbbQ8dVDWjF7FTWm6ppWOU3.jpg"
    },
    {
      "name": "Antony Starr",
      "character": "Homelander", 
      "profile_path": "https://image.tmdb.org/t/p/w500/54v6O1Qa4SFGjBOYk8t3n3d1n3Q.jpg"
    }
  ];
  
  // Fix 3: Fix Episode 2 path (it's pointing to Jupiter's Legacy)
  if (unifiedData[boysKey].seasons["1"].episodes["02"]) {
    unifiedData[boysKey].seasons["1"].episodes["02"].absPath = "S:/MEDIA/TV-SHOWS/The Boys (2019)/Season 01/The Boys (2019) - S01E02_AAC - Cherry.mkv";
  }
  
  console.log('✓ Added season_poster and season_thumbnail to Season 1');
  console.log('✓ Fixed cast images with full TMDB URLs');
  console.log('✓ Fixed Episode 2 path');
  
  // Save the updated data
  fs.writeFileSync(unifiedDataPath, JSON.stringify(unifiedData, null, 2));
  console.log('✓ Saved updated unified data');
} else {
  console.log('✗ The Boys (2019) not found in unified data');
}

console.log('\n=== THE BOYS DATA COMPLETED ===');
