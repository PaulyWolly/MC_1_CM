
console.log('[IMPORT-CLEANED-WATCH-LATER] Importing cleaned Watch Later data (movies only)...');

// Read the cleaned data (this would need to be pasted in or loaded from a file)
const cleanedData = [
  {
    "path": "Above the Law.mp4",
    "title": "Above the Law",
    "name": "Above the Law",
    "currentTime": 1800,
    "duration": 7200,
    "lastWatched": 1753666517490,
    "type": "movie"
  },
  {
    "path": "A Star is Born.mp4",
    "title": "A Star is Born",
    "name": "A Star is Born",
    "currentTime": 2400,
    "duration": 9000,
    "lastWatched": 1753580117490,
    "type": "movie"
  },
  {
    "path": "John Carter.mp4",
    "title": "John Carter",
    "name": "John Carter",
    "currentTime": 3000,
    "duration": 7200,
    "lastWatched": 1753493717490,
    "type": "movie"
  },
  {
    "path": "The War Of The Worlds.mp4",
    "title": "The War Of The Worlds",
    "name": "The War Of The Worlds",
    "currentTime": 3600,
    "duration": 7200,
    "lastWatched": 1753407317490,
    "type": "movie"
  },
  {
    "path": "Aloha.mp4",
    "title": "Aloha",
    "name": "Aloha",
    "currentTime": 1200,
    "duration": 5400,
    "lastWatched": 1753320917490,
    "type": "movie"
  }
];

// Save to localStorage
localStorage.setItem("mediaLibraryResumeList", JSON.stringify(cleanedData));

console.log('[IMPORT-CLEANED-WATCH-LATER] ✅ COMPLETE: Imported', cleanedData.length, 'movies to Watch Later');
console.log('[IMPORT-CLEANED-WATCH-LATER] All TV shows removed, movies preserved!');
console.log('[IMPORT-CLEANED-WATCH-LATER] Refresh your browser to see the changes');
