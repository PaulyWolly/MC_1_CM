# TMDBTitle Fix for Movies

## Problem Description

When adding new movies through the MediaManager, the `TMDBTitle` field was missing from the movie objects. This caused the player to display "S:" instead of the actual movie title because the MediaLibraryManager prioritizes `TMDBTitle` for display purposes.

## Root Cause

The issue was in several places:

1. **Main movie save endpoint** (`/api/media/save`) - Missing `TMDBTitle` field
2. **Process movie scripts endpoint** (`/api/media/process-movie-scripts`) - Using old data structure, missing `TMDBTitle`
3. **Ensure movie endpoint** (`/api/media/ensure-movie`) - Using old data structure, missing `TMDBTitle`
4. **MediaManager.js** - Missing `normalizedKey` in some save calls

## Changes Made

### 1. Updated `/api/media/save` endpoint

**File**: `server/routes/mediaManager.routes.js`

**Before**:
```javascript
const newMovie = {
  type: "movie",
  isMovie: true,
  title: title || '',
  year: year || '',
  normalizedKey: normalizedKey,
  tmdbId: tmdbId || null,
  description: description || '',
  cast: cast || [],
  poster: poster || '',
  files: []
};
```

**After**:
```javascript
const newMovie = {
  type: "movie",
  isMovie: true,
  title: title || '',
  TMDBTitle: title || '', // Set TMDBTitle to the same as title for proper display
  year: year || '',
  normalizedKey: normalizedKey,
  tmdbId: tmdbId || null,
  description: description || '',
  cast: cast || [],
  poster: poster || '',
  files: []
};
```

### 2. Updated `/api/media/process-movie-scripts` endpoint

**File**: `server/routes/mediaManager.routes.js`

**Before**: Used old separate data files (descriptions, cast, posters)
**After**: Uses unified format with `TMDBTitle` field

```javascript
const newMovie = {
  type: "movie",
  isMovie: true,
  title: title,
  TMDBTitle: bestMatch.title, // Use TMDB title for proper display
  year: year,
  normalizedKey: normalizedKey,
  tmdbId: bestMatch.id,
  description: movieData.overview || '',
  cast: [...],
  poster: bestMatch.poster_url,
  files: []
};
```

### 3. Updated `/api/media/ensure-movie` endpoint

**File**: `server/routes/mediaManager.routes.js`

**Before**: Used old `media-library-movies_normalized.json` format
**After**: Uses unified `movies-unified.json` format with `TMDBTitle`

```javascript
const newMovie = {
  type: "movie",
  isMovie: true,
  title: folderName,
  TMDBTitle: folderName, // Set TMDBTitle to folder name for proper display
  year: '',
  normalizedKey: normalizedKey,
  tmdbId: null,
  description: '',
  cast: [],
  poster: '',
  path: folderName,
  files: videoFiles
};
```

### 4. Updated MediaManager.js

**File**: `public/components/MediaManager/MediaManager.js`

**Before**: Missing `normalizedKey` in `processMovieSingleLogic`
**After**: Generates and sends `normalizedKey` for proper data structure

```javascript
// Generate normalized key for the movie
let normalizedKey = '';
if (window.normalizeKey) {
  normalizedKey = window.normalizeKey(title);
} else {
  // Fallback normalization
  normalizedKey = title.toLowerCase().replace(/[^\w\s]/g, '.').replace(/\s+/g, '.');
}

const saveRes = await fetch('/api/media/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'movie',
    absPath,
    title: tmdbInfo.title || title,
    year: tmdbInfo.year || year,
    poster: tmdbInfo.poster,
    description: tmdbInfo.description,
    cast: tmdbInfo.cast,
    normalizedKey: normalizedKey
  })
});
```

## Data Structure Priority

The MediaLibraryManager now properly prioritizes titles in this order:

1. **PRIORITY 1**: `TMDBTitle` from JSON data (highest priority)
2. **PRIORITY 2**: `TMDBTitle` from unified data lookup
3. **PRIORITY 3**: `title` from unified data lookup
4. **Fallback**: Corruption detection and path-based title extraction

## Testing

### Run the test script:

```bash
node scripts/test_tmdb_title.js
```

This script will:
- Check all movies in `movies-unified.json`
- Identify movies missing `TMDBTitle` field
- Show examples of good vs bad entries
- Provide recommendations for fixing issues

### Manual verification:

1. **Add a new movie** through MediaManager
2. **Check the generated JSON** in `movies-unified.json`
3. **Verify `TMDBTitle` field** is present and correct
4. **Play the movie** to confirm proper title display

## Expected Results

After these changes:

✅ **New movies** will have `TMDBTitle` field set  
✅ **Player will display** actual movie titles instead of "S:"  
✅ **Data consistency** across all movie endpoints  
✅ **Unified format** used throughout the system  

## Files Modified

- `server/routes/mediaManager.routes.js` - All movie save endpoints
- `public/components/MediaManager/MediaManager.js` - Movie processing logic
- `scripts/test_tmdb_title.js` - New test script (created)

## Next Steps

1. **Test the changes** by adding a new movie through MediaManager
2. **Run the test script** to verify existing movies
3. **Re-add problematic movies** if they're missing `TMDBTitle`
4. **Monitor player behavior** to ensure titles display correctly

## Notes

- **Existing movies** without `TMDBTitle` will still show "S:" until re-added
- **The fix is forward-looking** - all new movies will work correctly
- **Data migration** may be needed for existing problematic entries
- **TMDBTitle** is now the primary display title for all new movies
