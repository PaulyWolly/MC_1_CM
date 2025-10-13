# Unified Data Structure

## Overview
This document describes the unified, organized data structure for the Media Library application. All media data is now stored in dedicated folders with consistent "-unified" naming conventions.

## Data Organization

### 📁 File Structure
```
public/components/MediaLibrary/data/
├── movies/
│   └── movies-unified.json          # Single source of truth for all movie data
├── tv-shows/
│   └── tv-shows-unified.json        # Single source of truth for all TV show data
├── watch-later/
│   ├── watch-later-unified.json     # Single source of truth for Watch Later items
│   └── archive/                     # Historical backups
└── collections/
    ├── collections-unified.json     # Single source of truth for all collections
    ├── collection-listing.json      # Collection metadata
    ├── collection-types.json        # Collection type definitions
    └── archive/                     # Historical backups
```

## Data Files

### 1. Movies: `movies-unified.json`
**Location**: `/public/components/MediaLibrary/data/movies/movies-unified.json`

**Purpose**: Contains all movie metadata including:
- TMDB data
- Cast information
- Descriptions
- Posters
- Genres
- File paths

**Data Flow**:
- **Frontend reads**: `/components/MediaLibrary/data/movies/movies-unified.json`
- **Backend writes**: `../public/components/MediaLibrary/data/movies/movies-unified.json`

### 2. TV Shows: `tv-shows-unified.json`
**Location**: `/public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json`

**Purpose**: Contains all TV show metadata including:
- Show information
- Season data
- Episode listings
- Cast information
- TMDB data

**Data Flow**:
- **Frontend reads**: `/components/MediaLibrary/data/tv-shows/tv-shows-unified.json`
- **Backend writes**: `../public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json`

### 3. Watch Later: `watch-later-unified.json`
**Location**: `/public/components/MediaLibrary/data/watch-later/watch-later-unified.json`

**Purpose**: Contains all Watch Later items (movies, TV shows, episodes) with:
- Resume progress data
- Timestamps
- File paths
- Metadata

**Data Flow** (CRITICAL):
1. **JSON File** (Primary storage) → Frontend reads/writes first
2. **localStorage** (Secondary storage) → Backup/fallback
3. **MongoDB** (Tertiary storage) → Historical backup

**Read/Write Priority**:
- Always read from JSON file first
- Always write to JSON file first
- Then sync to localStorage
- Finally sync to MongoDB

**Backend Endpoints**:
- `POST /api/watch-later/update-json` - Update JSON file directly
- `POST /api/watch-later/bulk-import` - Update MongoDB
- `GET /api/watch-later/backup` - Get backup data

### 4. Collections: `collections-unified.json`
**Location**: `/public/components/MediaLibrary/data/collections/collections-unified.json`

**Purpose**: Contains all user-created collections including:
- My Collections
- Favorites
- Custom collections

**Data Flow**:
- **Frontend reads**: `/components/MediaLibrary/data/collections/collections-unified.json`
- **Backend writes**: `../../public/components/MediaLibrary/data/collections/collections-unified.json`

**Backend Endpoints**:
- `POST /api/collections/save` - Save collections to JSON file

## Backend Route Paths

### Watch Later Routes (`server/routes/watchLater.routes.js`)
```javascript
// JSON file path
const jsonFilePath = path.join(__dirname, '../public/components/MediaLibrary/data/watch-later/watch-later-unified.json');

// Backup path
const backupPath = path.join(__dirname, '../public/components/MediaLibrary/data/watch-later/watch-later-unified.json');
```

### Collections Routes (`server/routes/collections.routes.js`)
```javascript
// Collections path
const collectionsPath = path.join(__dirname, '../../public/components/MediaLibrary/data/collections/collections-unified.json');
```

### Media Manager Routes (`server/routes/mediaManager.routes.js`)
```javascript
// Movies path
const MOVIES_UNIFIED_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/movies/movies-unified.json');

// TV Shows path (if applicable)
const TV_SHOWS_UNIFIED_JSON = path.join(__dirname, '../../public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json');
```

## Frontend Fetch Paths

### MediaLibraryManager.js
```javascript
// Watch Later
fetch('/components/MediaLibrary/data/watch-later/watch-later-unified.json')

// Collections
fetch('/components/MediaLibrary/data/collections/collections-unified.json')

// Movies
fetch('/components/MediaLibrary/data/movies/movies-unified.json')

// TV Shows
fetch('/components/MediaLibrary/data/tv-shows/tv-shows-unified.json')
```

## Key Benefits

1. **Single Source of Truth**: Each data type has ONE unified file
2. **Consistent Naming**: All files use `-unified` suffix
3. **Organized Structure**: Data separated into logical folders
4. **Clear Data Flow**: Explicit read/write priorities (especially for Watch Later)
5. **Archive Support**: Historical backups stored in dedicated `archive/` folders
6. **No File Confusion**: No more duplicate or conflicting data files

## Migration Notes

### Previous Issues Fixed:
- ❌ Multiple `watch-later.json` files in different locations
- ❌ Collections data scattered across multiple files
- ❌ Inconsistent naming conventions
- ❌ Unclear data flow priorities

### Current Solution:
- ✅ Single unified file per data type
- ✅ Consistent folder structure
- ✅ Clear `-unified` naming convention
- ✅ Explicit data flow documentation
- ✅ Archive folders for historical data

## Maintenance Guidelines

1. **Never** create additional data files outside this structure
2. **Always** use the `-unified` files as the source of truth
3. **Always** update both frontend and backend paths when making changes
4. **Always** archive old data before major changes
5. **Never** mix data between different unified files

## Future Considerations

- Consider adding validation schemas for each unified file
- Implement automated backup scripts for unified files
- Add file integrity checks on application startup
- Create migration scripts for future structure changes

---

**Last Updated**: January 2025  
**Document Version**: 1.0.0

