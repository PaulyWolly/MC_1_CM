# TV Show Image Management

This guide covers fetching and managing TV show images from TMDb API.

## 📋 Prerequisites

1. **TMDb API Key**: Get a free API key from [The Movie Database](https://www.themoviedb.org/settings/api)
2. **Node.js**: Make sure you have Node.js installed
3. **TV Shows Directory**: Your TV shows should be in `S:/MEDIA/TV-SHOWS/`

## 🚀 Quick Start

1. **Setup TMDb API Key:**
   ```bash
   node scripts/setup_tmdb.js
   ```

2. **Fetch Season Images:**
   ```bash
   node scripts/fetch_tmdb_tv-show_season_images.js
   ```

3. **Fetch Episode Images:**
   ```bash
   node scripts/fetch_tmdb_tv-show_episode_images.js
   ```

4. **Download Images (Optional):**
   ```bash
   node scripts/download_tv_images.js
   ```

## 📁 Scripts Overview

### 1. `fetch_tmdb_tv-show_season_images.js`
- **Purpose:** Fetch season poster URLs from TMDb
- **Output:** `tmdb_tv-show_season_images.json`
- **Overrides:** `season_tmdb_tv-show_overrides.json`

### 2. `fetch_tmdb_tv-show_episode_images.js`
- **Purpose:** Fetch episode still URLs from TMDb
- **Output:** `tmdb_tv-show_episode_images.json`
- **Overrides:** `episode_tmdb_tv-show_overrides.json`

### 3. `download_tv_images.js`
- **Purpose:** Download images as PNG files to TV show folders
- **Input:** Uses both season and episode JSON files
- **Output:** Images saved in `Season_images/` and `Episode_images/` folders

## 📂 Directory Structure

Your TV shows should be organized like this:
```
S:/MEDIA/TV-SHOWS/
├── The Big Bang Theory/
│   ├── Season 1/
│   │   ├── The Big Bang Theory S01E01.mp4
│   │   ├── The Big Bang Theory S01E02.mp4
│   │   └── ...
│   ├── Season 2/
│   │   └── ...
│   └── images/ (created by download script)
│       ├── season_1/
│       │   ├── poster.png
│       │   ├── episode_01.png
│       │   └── ...
│       └── season_2/
│           └── ...
└── Another Show/
    └── ...
```

## 🔧 Configuration

### Manual Overrides
If a show isn't found automatically, you can add manual overrides in:
```
public/components/MediaLibrary/data/season_tmdb_tv-show_overrides.json
```

Example:
```json
{
  "Chuck (2010)": 84947,
  "Another Show": 12345
}
```

### Supported File Formats
- Video files: `.mp4`, `.mkv`, `.avi`, `.mov`
- Episode naming: `S01E01`, `S1E1`, etc.
- Season folders: `Season 1`, `season 1`, `Season_1`, etc.

## 📊 Output Files

### JSON Data Structure
```json
{
  "Show Name": {
    "seasons": {
      "1": {
        "poster": "https://image.tmdb.org/t/p/w500/...",
        "episodes": {
          "1": {
            "still": "https://image.tmdb.org/t/p/w500/..."
          }
        }
      }
    }
  }
}
```

### Image Files (PNG format)
- **Season Posters**: `poster.png` (500px width)
- **Episode Stills**: `episode_01.png`, `episode_02.png`, etc. (500px width)

## 🛠️ Troubleshooting

### Common Issues

1. **"TMDB_API_KEY not found"**
   - Make sure you have a `.env` file with `TMDB_API_KEY=your_key`
   - Run `node scripts/setup_tmdb.js` to configure

2. **"TV Shows directory not found"**
   - Verify your TV shows are in `S:/MEDIA/TV-SHOWS/`
   - Update the path in the script if needed

3. **"No TMDB match for: [Show Name]"**
   - Check the show name cleaning in the script
   - Add manual override in `season_tmdb_tv-show_overrides.json`

4. **Missing episode images**
   - TMDb may not have images for all episodes
   - Check episode numbering matches your files

### Debug Mode
Add this to see more detailed output:
```javascript
// Add to any script
process.env.DEBUG = 'true';
```

## 📈 Performance

- **Rate Limiting**: TMDb allows 40 requests per 10 seconds
- **Large Libraries**: For 100+ shows, expect 10-30 minutes
- **Progress**: Script shows real-time progress and statistics

## 🔄 Updating

To update existing data:
1. Run the script again - it will overwrite existing files
2. New shows will be added automatically
3. Existing shows will be updated with new data

## 📝 Notes

- Images are downloaded at 500px width (good quality, reasonable size)
- Original aspect ratios are preserved
- Script handles network errors gracefully
- Progress is saved to JSON even if some downloads fail 