# COMPREHENSIVE DATA MIGRATION GUIDE

## 🚨 CRITICAL: Data Structures That Need Migration

### 1. localStorage (Client-Side) - AUTO-MIGRATES
- **✅ Favorites** - `mediaLibraryFavoritesByType` (Auto-migrates when visiting Favorites tab)
- **⚠️ Watch Later** - `mediaLibraryResumeList` (Visit Watch Later tab to trigger migration)
- **⚠️ Collections** - `mediaCollections` (Visit Collections tab to trigger migration)

### 2. MongoDB (Server-Side) - NEEDS MANUAL MIGRATION
- **⚠️ Poster Collection** - Stores poster metadata (needs migration)
- **⚠️ Collection Collection** - Stores user collections (needs migration)

## 🔄 How to Complete Migration

### Step 1: Auto-Migration (Just visit tabs)
1. **Open your app** in the browser
2. **Visit Favorites tab** - triggers automatic migration ✅
3. **Visit Watch Later tab** - triggers migration for watch later data
4. **Visit Collections tab** - triggers migration for collections data

### Step 2: Verify Migration Success
Run this in browser console to check:
```javascript
// Check favorites structure
const favorites = JSON.parse(localStorage.getItem('mediaLibraryFavoritesByType') || '{}');
console.log('Favorites:', favorites);

// Check if using new object structure
if (favorites.movies && favorites.movies.length > 0) {
  const firstMovie = favorites.movies[0];
  if (typeof firstMovie === 'object') {
    console.log('✅ Favorites using new unified structure');
  } else {
    console.log('❌ Favorites still using old string structure');
  }
}
```

### Step 3: MongoDB Migration (Optional)
- The MongoDB data will continue to work but may contain outdated references
- Consider running MongoDB cleanup scripts if you want to remove old data

## 📊 Migration Status
- **Favorites**: ✅ Auto-migrates
- **Watch Later**: ⚠️ Visit tab to migrate  
- **Collections**: ⚠️ Visit tab to migrate
- **MongoDB**: ⚠️ Manual cleanup recommended

## 🎯 Result
After migration, ALL data will use the newest unified structure with:
- Complete media objects (not just paths)
- All metadata (posters, titles, descriptions, cast)
- Consistent data format across all tabs
- No more placeholder images
