# YouTube Query Migration Guide

This guide will help you migrate your YouTube queries from the old format to the new standardized format.

## What This Migration Does

**BEFORE:**
- MongoDB queries: `"Youtube search privettricker"`
- localStorage cache: `yt_Youtube search privettricker_search_21`

**AFTER:**
- MongoDB queries: `"privettricker"`
- localStorage cache: `yt_privettricker_search_21`

## Migration Steps

### Step 1: Backup Your Data (Recommended)

Before running any migration, backup your MongoDB database:

```bash
# Backup MongoDB (adjust connection string as needed)
mongodump --uri="mongodb://localhost:27017/multichat" --out=./backup-before-migration
```

### Step 2: Run the MongoDB Migration

Navigate to your project directory and run the migration script:

```bash
# Navigate to your project directory
cd /c/Users/pwelb/projects/_NODE_/_MULTICHAT_/6-24-2025

# Run the MongoDB migration
node scripts/migrate-youtube-queries.js

# Optional: Add displayName field for future enhancements
node scripts/migrate-youtube-queries.js --add-display-name
```

**Expected Output:**
```
🚀 YouTube Query Migration Tool
================================

🔄 Starting YouTube query migration...
📡 Connecting to MongoDB: mongodb://localhost:27017/multichat
✅ Connected to MongoDB
📊 Found 5 YouTube queries to process
🔄 Migrating: "Youtube search privettricker" → "privettricker"
✅ Already clean: "cats"
🔄 Migrating: "Youtube search thewhovevo" → "thewhovevo"

📋 Migration Summary:
✅ Migrated: 3 queries
⏭️ Skipped: 2 queries (already clean)
📊 Total processed: 5 queries

🎉 Migration completed successfully!
```

### Step 3: Clean localStorage Cache (Browser)

1. **Open your app in the browser**
2. **Open Developer Console** (F12 → Console tab)
3. **Copy and paste this script:**

```javascript
// Copy the entire contents of scripts/clean-localStorage-cache.js
// Then run:
previewYouTubeLocalStorageMigration(); // Preview what will change
cleanYouTubeLocalStorageCache(); // Run the actual migration
```

**Expected Output:**
```
🧹 Starting localStorage cache cleanup...
📊 Found 10 YouTube cache keys to process
🔄 Migrating cache key: "yt_Youtube search privettricker_search_21" → "yt_privettricker_search_21"
🗑️ Deleting 10 old cache keys...

📋 Cache Cleanup Summary:
✅ Migrated: 10 cache keys
🗑️ Deleted: 10 old keys
🎉 localStorage cache cleanup completed!
```

### Step 4: Restart Your Server

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm start
# or
node server/server.js
```

### Step 5: Test the Changes

1. **Refresh your browser page**
2. **Open the YouTube search dropdown**
3. **Verify you see:**
   - Clean query names (e.g., "privettricker" instead of "Youtube search privettricker")
   - Correct page counts (e.g., "10 pgs" instead of "1 pg")
   - Clicking queries takes you to page 1

## Troubleshooting

### Migration Script Fails

**Error: Cannot connect to MongoDB**
- Check that MongoDB is running
- Verify the connection string in the script
- Update `MONGODB_URI` environment variable if needed

**Error: Module not found**
- Make sure you're running from the project root directory
- Check that `server/models/YoutubeHistory.js` exists

### localStorage Migration Issues

**No cache keys found**
- This is normal if you haven't searched for YouTube videos recently
- The migration will still work for future searches

**Console errors during migration**
- Check browser console for specific error messages
- Try running `previewYouTubeLocalStorageMigration()` first to see what would change

### After Migration Issues

**Dropdown still shows old format**
- Clear browser cache completely (Ctrl+Shift+Delete)
- Try hard refresh (Ctrl+F5)
- Check browser console for JavaScript errors

**Page counts still wrong**
- The new code now properly counts pages from localStorage
- Try searching for a new term to generate fresh cache

**Navigation still goes to wrong page**
- Clear localStorage completely: `localStorage.clear()`
- Restart your server
- Try a fresh search

## Verification Commands

### Check MongoDB Data
```javascript
// In MongoDB shell or Compass
db.youtubehistories.find({}).pretty()
```

### Check localStorage Data
```javascript
// In browser console
Object.keys(localStorage).filter(k => k.startsWith('yt_')).forEach(k => console.log(k));
```

## Rollback (If Needed)

If something goes wrong, you can restore from backup:

```bash
# Restore MongoDB from backup
mongorestore --uri="mongodb://localhost:27017/multichat" ./backup-before-migration/multichat --drop
```

For localStorage, you'll need to manually clear it:
```javascript
// In browser console
localStorage.clear();
```

## Support

If you encounter issues:

1. Check the console logs for specific error messages
2. Verify your MongoDB connection
3. Make sure all files are in the correct locations
4. Try running each step individually

The migration is designed to be safe and preserve all your data while standardizing the format for better performance and consistency. 