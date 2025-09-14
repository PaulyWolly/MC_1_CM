# YouTube Cache Repopulation Guide

## Overview

After migrating YouTube queries to clean database entries (removing "YouTube search" prefixes), the localStorage cache needs to be repopulated with actual search results. This guide explains the available methods to repopulate the cache.

## Current Status

- ✅ **Database Migration**: 64 clean queries in MongoDB
- ✅ **Cache Clearing**: Old cache entries removed
- ✅ **Database Loading**: Dropdown shows database queries
- ❌ **Missing**: Cache repopulation (queries show "DB" instead of page counts)

## Available Methods

### Method 1: Browser Console - Clicked Videos (NEW & RECOMMENDED!)

**🎯 Uses your clicked videos from MongoDB - NO API calls needed!**

```javascript
// Repopulate cache from clicked videos (no API quota used!)
window.repopulateCacheFromClicks(10);

// Or for all queries that have clicked videos
window.repopulateCacheFromClicks(64);
```

This method:
- ✅ **No API quota usage** - completely free!
- ✅ **Instant results** - no waiting for API calls
- ✅ **Personalized cache** - only videos you've actually clicked
- ✅ **Smart storage** - efficient use of localStorage space

### Method 2: Browser Console - Fresh API Calls

This method makes fresh YouTube API calls (uses quota):

```javascript
// Repopulate cache for first 10 database queries
window.repopulateYouTubeCache(10);

// Or for first 5 queries (faster)
window.repopulateYouTubeCache(5);

// Or for all database queries (may take a while)
window.repopulateYouTubeCache(50);
```

**Steps:**
1. Open your app in browser (localhost:5300)
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Paste and run the command above
5. Watch the progress messages and toasts
6. Check the dropdown - "DB" entries should now show page counts

### Method 3: Command Line Script

Run the repopulation script from your project directory:

```bash
# Repopulate first 10 queries
node scripts/repopulate-youtube-cache.js 10

# Repopulate first 5 queries (faster)
node scripts/repopulate-youtube-cache.js 5

# Repopulate first 20 queries
node scripts/repopulate-youtube-cache.js 20
```

**Requirements:**
- Server must be running on port 5301
- MongoDB connection configured in `.env`
- Google API key configured in `.env` (used for YouTube API)

### Method 4: Manual (Click Each Query)

Simply click on each query in the dropdown that shows "DB". This will:
1. Perform the search
2. Cache the results
3. Update the page count from "DB" to actual pages

## How It Works

### Database Queries vs Cache

- **Database**: Contains clean query names (e.g., "Joe Walsh", "tonkinese cats")
- **Cache**: Contains search results stored in localStorage with keys like `yt_Joe Walsh_search_1`

### Page Count Display Logic

- **"DB"**: Query exists in database but has no cached results
- **"1 pg", "2 pgs", etc.**: Query has cached results with page counts
- **Green LED**: Query is saved in database
- **No LED**: Query only exists in localStorage (not saved)

### Cache Key Formats

The system checks multiple cache key formats for compatibility:

1. **Legacy format**: `yt_Youtube search Joe Walsh_search_1` (old format)
2. **Current format**: `yt_Joe Walsh_search_1` (clean format)
3. **New format**: `yt_tonkinese cats_search_1` (database format)

## Troubleshooting

### "DB" Still Shows After Repopulation

1. **Check console logs**: Look for error messages during repopulation
2. **Verify API calls**: Ensure searches are returning results
3. **Check cache keys**: Use browser DevTools > Application > Local Storage
4. **Refresh dropdown**: Sometimes requires page refresh

### Script Fails to Connect

1. **Check server**: Ensure server is running on correct port
2. **Check environment**: Verify `.env` file has correct MongoDB URI
3. **Check API key**: Verify Google API key is valid (used for YouTube API)

### Browser Console Method Fails

1. **Check global function**: Verify `window.repopulateYouTubeCache` exists
2. **Check manager**: Verify `window.youtubeSearchManager` is initialized
3. **Check errors**: Look for JavaScript errors in console

## Technical Details

### Cache Repopulation Process

1. **Load Database Queries**: Get all saved queries from MongoDB
2. **Filter Uncached**: Find queries that show "DB" (no cache)
3. **Batch Process**: Process queries in batches with delays
4. **API Calls**: Make actual YouTube search requests
5. **Cache Storage**: Store results in localStorage
6. **UI Update**: Refresh dropdown to show new page counts

### API Usage

Each repopulation call uses YouTube API quota:
- **10 queries** = ~10 API calls (manageable)
- **50 queries** = ~50 API calls (significant quota usage)

### Cache Storage Format

Results are stored as:
```
Key: yt_[query]_search_[page]
Value: {
  videos: [...],
  totalResults: number,
  pageToken: string,
  query: string
}
```

## Best Practices

1. **Start Small**: Begin with 5-10 queries to test
2. **Monitor Quota**: YouTube API has daily limits
3. **Use Browser Method**: Easier and provides real-time feedback
4. **Check Results**: Verify page counts update correctly
5. **Document Issues**: Note any queries that fail to cache

## Future Improvements

- **Automatic Repopulation**: Trigger on database load
- **Selective Repopulation**: Only repopulate frequently used queries
- **Background Processing**: Repopulate during idle time
- **Quota Management**: Track and limit API usage 