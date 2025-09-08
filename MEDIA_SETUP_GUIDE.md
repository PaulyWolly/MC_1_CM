# 📺 MEDIA SETUP GUIDE
## Complete TV Show Configuration for MultiChat Media Library

### 🎯 **PURPOSE**
This guide explains how to properly set up TV shows in the Media Library so that:
- ✅ Episode titles display correctly in the video player
- ✅ Episode images show unique thumbnails (not generic fallbacks)
- ✅ Season/episode data loads properly
- ✅ All metadata flows correctly from JSON to UI

---

## 📋 **REQUIRED DATA STRUCTURE**

### **1. Show-Level Configuration**
```json
{
  "prehistoric.planet.(2022)": {
    "type": "tvshow",
    "TMDBTitle": "Prehistoric Planet (2022)",
    "normalizedKey": "prehistoric.planet.(2022)",
    "title": "prehistoric.planet.(2022)",
    "tmdbId": null,
    "poster": "https://image.tmdb.org/t/p/w500/6wRfelwK3D0tKs9cJmYd0G0HmDf.jpg",
    "about": {
      "title": "prehistoric.planet.(2022)",
      "year": "2022",
      "description": "Experience the wonders of our world like never before..."
    },
    "genres": ["Documentary"],
    "seasons": { /* See Section 2 */ },
    "files": [ /* See Section 3 */ }
  }
}
```

### **2. Seasons Structure (CRITICAL)**
```json
"seasons": {
  "1": {
    "episodes": {
      "1": {
        "still": "https://media.themoviedb.org/t/p/w454_and_h254_bestv2/d5wq6gBAyuXOFDQVKzxhTtVqTGZ.jpg",
        "path": "Prehistoric Planet (2022)\\Season 01\\Prehistoric.Planet.(2022).S01E01.mkv",
        "title": "Prehistoric Planet (2022) | S01E01 | Episode Title Here",
        "duration": null,
        "isSpecials": false,
        "videoFormat": ".mkv",
        "supportsVideo": true,
        "episodeTitle": "Episode Title Here"
      }
    },
    "poster": "https://image.tmdb.org/t/p/w500/v85DCYcQ72xTiOzBStNKrJJ0Le7.jpg"
  }
}
```

### **3. Files Array (CRITICAL)**
```json
"files": [
  {
    "name": "prehistoric planet (2022) | S01E01 | Episode Title Here",
    "path": "Prehistoric Planet (2022)\\Season 01\\Prehistoric.Planet.(2022).S01E01.mkv",
    "absPath": "S:\\MEDIA\\TV-SHOWS\\Prehistoric Planet (2022)\\Season 01\\Prehistoric.Planet.(2022).S01E01.mkv",
    "relPath": "Prehistoric Planet (2022)\\Season 01\\Prehistoric.Planet.(2022).S01E01.mkv",
    "filePath": "S:\\MEDIA\\TV-SHOWS\\Prehistoric Planet (2022)\\Season 01\\Prehistoric.Planet.(2022).S01E01.mkv",
    "season": 1,
    "episode": 1,
    "episodeTitle": "Episode Title Here",
    "videoFormat": ".mkv",
    "duration": null,
    "still": "https://media.themoviedb.org/t/p/w454_and_h254_bestv2/d5wq6gBAyuXOFDQVKzxhTtVqTGZ.jpg"
  }
]
```

---

## 🔑 **CRITICAL REQUIREMENTS**

### **A. Title Format (MUST MATCH)**
The `title` field in BOTH `seasons.episodes` AND `files` array MUST follow this exact format:
```
"Show Title (Year) | SxxExx | Episode Title"
```

**Examples:**
- ✅ `"Prehistoric Planet (2022) | S01E01 | Coasts"`
- ✅ `"Lost (2004) | S01E01 | Pilot"`
- ❌ `"Prehistoric Planet (2022) | S01E01"` (missing episode title)
- ❌ `"S01E01 | Coasts"` (missing show title and year)

### **B. Episode Images**
- **Local Images:** Place in `public/api/thumbnails/[Show Name]/thumbnails/Season XX/`
- **TMDB URLs:** Use full TMDB image URLs (recommended)
- **Format:** Must be `.jpg` files
- **Naming:** Match the episode file naming convention

### **C. Data Consistency**
- **Show Key:** Must match `normalizedKey` (lowercase, dots, parentheses)
- **TMDBTitle:** Should match the show's actual TMDB title with proper capitalization (e.g., "Prehistoric Planet (2022)", not "prehistoric planet (2022)")
- **File Paths:** Must use backslashes (`\\`) for Windows paths
- **Episode Numbers:** Must match between seasons structure and files array

---

## 🛠️ **SETUP PROCESS**

### **Step 1: Create Show Entry**
1. Use the normalized key format: `show.name.(year)`
2. Set `TMDBTitle` to match TMDB database
3. Add show-level metadata (poster, description, genres)

### **Step 2: Configure Seasons Structure**
1. Create season objects: `"1": { "episodes": {...} }`
2. For each episode, set:
   - `still`: Image URL or local path
   - `path`: Relative path to video file
   - `title`: Full formatted title with episode name
   - `episodeTitle`: Just the episode name

### **Step 3: Populate Files Array**
1. Create one entry per episode file
2. Set `name` to match the `title` from seasons structure
3. Ensure `season` and `episode` numbers match
4. Set `still` to match the seasons structure

### **Step 4: Verify Data Flow**
1. **MediaLibraryManager** reads from `seasons` structure for UI display
2. **VideoPlayer** receives data via `currentMediaItem` from `files` array
3. **Title Display** uses `currentMediaItem.title` if properly formatted

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue: Generic Titles in Video Player**
**Cause:** `title` field missing episode name or wrong format
**Fix:** Ensure `title` = `"Show (Year) | SxxExx | Episode Name"`

### **Issue: Same Images for All Episodes**
**Cause:** Missing or incorrect `still` paths
**Fix:** 
- Check image files exist in correct directory
- Use unique TMDB URLs for each episode
- Verify file naming matches episode naming

### **Issue: Seasons Not Loading**
**Cause:** Key mismatch between show name and normalized key
**Fix:** Ensure `normalizedKey` matches the show's top-level key

### **Issue: Episodes Not Found**
**Cause:** Mismatch between `files` array and `seasons` structure
**Fix:** Ensure episode numbers and titles match exactly

---

## 📝 **VALIDATION CHECKLIST**

Before considering a TV show "complete":

- [ ] Show has proper `normalizedKey` format
- [ ] `TMDBTitle` matches actual show title
- [ ] `seasons` structure exists with all seasons
- [ ] Each episode has properly formatted `title`
- [ ] Each episode has unique `still` image
- [ ] `files` array has matching entries
- [ ] Episode numbers match between structures
- [ ] File paths use correct backslashes
- [ ] Video player shows correct episode titles
- [ ] Episode images display correctly

---

## 🎬 **EXAMPLE: Complete Prehistoric Planet Setup**

```json
{
  "prehistoric.planet.(2022)": {
    "type": "tvshow",
    "TMDBTitle": "Prehistoric Planet (2022)",
    "normalizedKey": "prehistoric.planet.(2022)",
    "title": "prehistoric.planet.(2022)",
    "poster": "https://image.tmdb.org/t/p/w500/6wRfelwK3D0tKs9cJmYd0G0HmDf.jpg",
    "about": {
      "title": "prehistoric.planet.(2022)",
      "year": "2022",
      "description": "Experience the wonders of our world like never before in this epic series from Jon Favreau and the producers of Planet Earth."
    },
    "genres": ["Documentary"],
    "seasons": {
      "1": {
        "episodes": {
          "1": {
            "still": "https://media.themoviedb.org/t/p/w454_and_h254_bestv2/d5wq6gBAyuXOFDQVKzxhTtVqTGZ.jpg",
            "path": "Prehistoric Planet (2022)\\Season 01\\Prehistoric.Planet.(2022).S01E01.mkv",
            "title": "Prehistoric Planet (2022) | S01E01 | Coasts",
            "duration": null,
            "isSpecials": false,
            "videoFormat": ".mkv",
            "supportsVideo": true,
            "episodeTitle": "Coasts"
          }
        },
        "poster": "https://image.tmdb.org/t/p/w500/v85DCYcQ72xTiOzBStNKrJJ0Le7.jpg"
      }
    },
    "files": [
      {
        "name": "prehistoric planet (2022) | S01E01 | Coasts",
        "path": "Prehistoric Planet (2022)\\Season 01\\Prehistoric.Planet.(2022).S01E01.mkv",
        "absPath": "S:\\MEDIA\\TV-SHOWS\\Prehistoric Planet (2022)\\Season 01\\Prehistoric.Planet.(2022).S01E01.mkv",
        "season": 1,
        "episode": 1,
        "episodeTitle": "Coasts",
        "videoFormat": ".mkv",
        "duration": null,
        "still": "https://media.themoviedb.org/t/p/w454_and_h254_bestv2/d5wq6gBAyuXOFDQVKzxhTtVqTGZ.jpg"
      }
    ]
  }
}
```

---

## 🚀 **QUICK START**

1. **Copy the example structure above**
2. **Replace show-specific data** (titles, paths, images)
3. **Ensure title format** includes episode names
4. **Test in browser** - refresh and check video player
5. **Verify images** display correctly for each episode

---

*This guide ensures your TV shows will display correctly with proper titles and unique episode images in the Media Library and Video Player.*
