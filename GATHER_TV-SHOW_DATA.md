# TV Show Data Gathering Script Guide

## Overview
The `scripts/fetch_tv_show_data.js` script is a Node.js utility that fetches comprehensive TV show data from The Movie Database (TMDB) and formats it for integration into your `tv-shows-unified.json` file.

## Prerequisites
- Node.js installed
- Valid TMDB API key (stored in `server/.env`)
- Access to the project directory

## Usage

### Basic Command
```bash
node scripts/fetch_tv_show_data.js "Show Name" TMDB_ID "Show Path"
```

### Parameters
1. **Show Name** (required): The display name of the TV show
2. **TMDB ID** (required): The unique identifier from TMDB
3. **Show Path** (optional): File system path to the show's directory

### Examples

#### Example 1: Jupiter's Legacy
```bash
node scripts/fetch_tv_show_data.js "Jupiter's Legacy" 93484 "S:/MEDIA/TV-SHOWS/Jupiter's Legacy (2021)"
```

#### Example 2: The Mandalorian
```bash
node scripts/fetch_tv_show_data.js "The Mandalorian" 82856 "S:/MEDIA/TV-SHOWS/The Mandalorian (2019)"
```

#### Example 3: Without file path
```bash
node scripts/fetch_tv_show_data.js "Stranger Things" 66732
```

## Finding TMDB IDs

### Method 1: TMDB Website
1. Go to [themoviedb.org](https://www.themoviedb.org)
2. Search for your TV show
3. Click on the show
4. The TMDB ID is in the URL: `https://www.themoviedb.org/tv/93484-jupiter-s-legacy`

### Method 2: Search API
You can also search programmatically using the TMDB search API.

## What the Script Fetches

### Core Information
- **Title**: Official show title
- **TMDB Title**: Exact title from TMDB
- **Year**: First air date year
- **TMDB ID**: Unique identifier
- **Media Type**: Set to "tv-show"
- **Path Information**: File system paths

### Visual Assets
- **Poster**: High-quality poster image (500px width)
- **Backdrop**: Background image (1280px width)
- **Season Posters**: Individual season artwork

### Detailed Metadata
- **Description**: Full show overview
- **Genres**: Categorized genres (e.g., Sci-Fi & Fantasy, Drama)
- **Status**: Show status (Ended, Canceled, Returning Series, etc.)
- **Air Dates**: First and last air dates
- **Episode Count**: Total episodes and seasons

### Cast Information
- **Main Cast**: Primary actors with character names
- **Profile Images**: High-quality headshots
- **Character Names**: In-show character names

### Season Data
- **Season Numbers**: Sequential season information
- **Season Names**: Official season titles
- **Episode Counts**: Episodes per season
- **Air Dates**: Season premiere dates

## Output Format

The script generates data in your project's standardized format:

```json
{
  "normalizedKey": "jupiters.legacy",
  "title": "Jupiter's Legacy",
  "TMDBTitle": "Jupiter's Legacy",
  "year": 2021,
  "tmdbId": 93484,
  "isMovie": false,
  "mediaType": "tv-show",
  "path": "S:/MEDIA/TV-SHOWS/Jupiter's Legacy (2021)",
  "absPath": "S:/MEDIA/TV-SHOWS/Jupiter's Legacy (2021)",
  "poster": "https://image.tmdb.org/t/p/w500/9yxep7oJdkj3Pla9TD9gKflRApY.jpg",
  "backdrop": "https://image.tmdb.org/t/p/w1280/hT4HTQJhfnWNl7tHBY3E6Nda9M6.jpg",
  "description": "Show description...",
  "about": {
    "description": "Detailed description...",
    "genres": ["Sci-Fi & Fantasy", "Action & Adventure"],
    "status": "Canceled",
    "first_air_date": "2021-05-07",
    "last_air_date": "2021-05-07",
    "number_of_seasons": 1,
    "number_of_episodes": 8,
    "vote_average": 6.945,
    "vote_count": 723
  },
  "cast": [
    {
      "name": "Actor Name",
      "character": "Character Name",
      "profile_path": "https://image.tmdb.org/t/p/w500/actor.jpg"
    }
  ],
  "seasons": [
    {
      "season_number": 1,
      "name": "Volume 1",
      "overview": "Season description...",
      "poster_path": "https://image.tmdb.org/t/p/w500/season.jpg",
      "air_date": "2021-05-07",
      "episode_count": 8
    }
  ],
  "created": "2025-09-06T19:32:23.637Z",
  "updated": "2025-09-06T19:32:23.642Z"
}
```

## File Integration

### Automatic Integration
The script automatically:
1. Loads existing `tv-shows-unified.json`
2. Adds the new show data
3. Saves the updated file
4. Preserves all existing data

### Normalized Key Generation
The script creates a normalized key by:
- Converting to lowercase
- Replacing spaces with dots
- Removing special characters
- Example: "Jupiter's Legacy" → "jupiters.legacy"

## Error Handling

### Common Issues
1. **401 Unauthorized**: Check TMDB API key in `server/.env`
2. **404 Not Found**: Verify TMDB ID is correct
3. **Network Errors**: Check internet connection
4. **File Permissions**: Ensure write access to project directory

### Debugging
The script provides detailed logging:
- ✅ Success indicators
- ⚠️ Warning messages
- ❌ Error details
- 📊 Progress updates

## Best Practices

### Before Running
1. **Verify TMDB ID**: Double-check the ID is correct
2. **Check File Path**: Ensure the path format matches your system
3. **Backup Data**: Consider backing up `tv-shows-unified.json`

### After Running
1. **Test Integration**: Verify the show appears in MediaLibrary
2. **Check Images**: Ensure posters and cast images load
3. **Validate Data**: Review the generated data for accuracy

### File Path Guidelines
- Use forward slashes: `S:/MEDIA/TV-SHOWS/Show Name (Year)`
- Include year in parentheses
- Match your existing naming convention
- Use absolute paths for consistency

## Troubleshooting

### Script Won't Run
```bash
# Check Node.js version
node --version

# Verify script exists
ls scripts/fetch_tv_show_data.js

# Check permissions
ls -la scripts/fetch_tv_show_data.js
```

### API Key Issues
```bash
# Check .env file exists
ls server/.env

# Verify API key format
grep TMDB_API_KEY server/.env
```

### Data Not Appearing
1. Restart your server
2. Hard refresh browser (Ctrl+Shift+R)
3. Check browser console for errors
4. Verify the normalized key matches

## Integration with MediaLibrary

Once added, the TV show will be available in:
- **TV Shows Tab**: Main grid view
- **Search**: Findable by title
- **Collections**: Can be added to custom collections
- **Details Modal**: Full show information and cast

## Support

For issues or questions:
1. Check the console output for error messages
2. Verify all parameters are correct
3. Ensure TMDB API key is valid
4. Check file permissions and paths

---

**Note**: This script is designed as a temporary workaround for the MediaManager's complexity. It provides a reliable way to add new TV shows with complete metadata from TMDB.
