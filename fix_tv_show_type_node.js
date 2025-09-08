const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing TV show type field in unified JSON files...');

// Paths to the unified JSON files
const tvShowsPath = path.join(__dirname, 'public', 'components', 'MediaLibrary', 'data', 'tv-shows', 'tv-shows-unified.json');
const moviesPath = path.join(__dirname, 'public', 'components', 'MediaLibrary', 'data', 'movies', 'movies-unified.json');

let totalChanged = 0;

// Fix TV shows file
if (fs.existsSync(tvShowsPath)) {
  console.log('📺 Processing tv-shows-unified.json...');
  const tvShowsData = JSON.parse(fs.readFileSync(tvShowsPath, 'utf8'));
  
  let tvShowsChanged = 0;
  Object.keys(tvShowsData).forEach(key => {
    if (tvShowsData[key].type === "tvshow") {
      tvShowsData[key].type = "tv-show";
      tvShowsChanged++;
    }
  });
  
  if (tvShowsChanged > 0) {
    fs.writeFileSync(tvShowsPath, JSON.stringify(tvShowsData, null, 2));
    console.log(`✅ Changed ${tvShowsChanged} TV shows from 'tvshow' to 'tv-show'`);
    totalChanged += tvShowsChanged;
  } else {
    console.log('ℹ️ No TV shows needed type field changes');
  }
} else {
  console.log('❌ TV shows file not found:', tvShowsPath);
}

// Fix movies file
if (fs.existsSync(moviesPath)) {
  console.log('🎬 Processing movies-unified.json...');
  const moviesData = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
  
  let moviesChanged = 0;
  Object.keys(moviesData).forEach(key => {
    if (moviesData[key].type === "tvshow") {
      moviesData[key].type = "tv-show";
      moviesChanged++;
    }
  });
  
  if (moviesChanged > 0) {
    fs.writeFileSync(moviesPath, JSON.stringify(moviesData, null, 2));
    console.log(`✅ Changed ${moviesChanged} movies from 'tvshow' to 'tv-show'`);
    totalChanged += moviesChanged;
  } else {
    console.log('ℹ️ No movies needed type field changes');
  }
} else {
  console.log('❌ Movies file not found:', moviesPath);
}

console.log(`🎯 Total changes made: ${totalChanged}`);
console.log('📋 Now restart your server and run the favorites fix script!');
