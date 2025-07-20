# HOW TO USE MediaManager - MOVIE ALL MODE

## Overview
The MediaManager Movie All mode is designed to efficiently process multiple movies in batch operations. This mode allows you to scan for new movies, select which ones to process, and perform batch actions like fetching metadata and assigning posters.

## Quick Start Workflow

### 1. Accessing Movie All Mode
1. Open the MediaManager modal
2. Click the **"Movie"** tab (should be highlighted in blue)
3. Click the **"All"** button (should be highlighted in blue)
4. You should see the movie grid interface with controls above and action buttons below

### 2. Initial Setup
1. **Scan for New Movies**: Click the blue **"Scan for New Movies"** button
2. **Wait for Scan**: A progress bar will show the scanning process
3. **Review Results**: The counter will show "New Movies Found: X" and the grid will populate

## Understanding the Interface

### Top Controls Bar
- **Select All / Deselect All**: Checkbox to select/deselect all movies at once
- **Scan for New Movies**: Blue button to scan your movie directory for new movies
- **Batch Actions**: Dropdown with options (Delete Selected, Fetch Info, Assign Poster)
- **New Movies Found**: Counter showing total number of new movies detected

### Movie Grid
- **Select**: Checkbox for each movie
- **Poster**: Empty placeholder (will be filled when posters are assigned)
- **Title**: Movie title as detected from filename
- **Year**: Release year extracted from filename
- **Path**: Full file path to the movie
- **Status**: Shows "New" for unprocessed movies

### Bottom Action Buttons
- **Process Selected (X)**: Blue button to process only selected movies
- **Process All Movies**: Green button to process all movies in the grid
- **Clear Selection**: Gray button to uncheck all selections
- **Close**: Red button to close the modal

## Recommended Workflow

### Option 1: Process One Movie First (Recommended for Testing)
1. **Scan for movies** using "Scan for New Movies"
2. **Select only one movie** by checking its checkbox
3. **Click "Process Selected (1)"** to process just that movie
4. **Monitor progress** in the progress bar
5. **Review results** and verify the processing worked correctly
6. **Repeat** for other movies or use "Process All Movies"

### Option 2: Process All Movies at Once
1. **Scan for movies** using "Scan for New Movies"
2. **Click "Process All Movies"** to process all detected movies
3. **Monitor progress** as each movie is processed
4. **Review results** when complete

## What Happens During Processing

### Current Implementation (Placeholder)
- **Progress Bar**: Shows real-time progress for each movie
- **Console Logging**: Detailed logs in browser console
- **Toast Notifications**: Success/error messages
- **Simulated Processing**: Currently shows 500ms delay per movie

### Future Implementation (To Be Added)
- **TMDB API Integration**: Fetch movie descriptions and cast data
- **Poster Assignment**: Download and assign movie posters
- **Metadata Storage**: Save processed data to JSON files
- **Status Updates**: Change movie status from "New" to "Processed"

## Best Practices

### 1. Start Small
- Always test with 1-2 movies first
- Verify the process works before batch processing
- Check console logs for any errors

### 2. Monitor Progress
- Watch the progress bar during processing
- Check the progress summary text for current movie being processed
- Review toast notifications for success/error feedback

### 3. Selection Management
- Use "Select All" for processing all movies
- Use individual checkboxes for selective processing
- Use "Clear Selection" to reset selections
- The "Process Selected" button shows the count of selected movies

### 4. Error Handling
- If processing fails, check the browser console for detailed error messages
- Use "Clear Selection" and try processing fewer movies
- Verify your movie files are accessible and have valid filenames

## Troubleshooting

### Common Issues

**"No movies selected" error**
- Make sure you've checked at least one movie checkbox
- Try using "Select All" to select all movies

**"No movies to process" error**
- Run "Scan for New Movies" first
- Verify your movie directory contains new movies

**Progress bar shows errors**
- Check browser console for detailed error messages
- Verify network connectivity for API calls
- Ensure movie files are accessible

**Grid doesn't populate after scan**
- Check browser console for scan errors
- Verify the `/api/media/scan-movies` endpoint is working
- Ensure your movie directory path is correct

### Debug Information
- **Console Logs**: Open browser DevTools (F12) to see detailed logs
- **Network Tab**: Check for failed API requests
- **Progress Summary**: Shows current operation and any errors

## Technical Details

### API Endpoints Used
- `POST /api/media/scan-movies` - Scans movie directory for new movies
- Future: TMDB API calls for movie metadata
- Future: Poster download and assignment endpoints

### Data Flow
1. **Scan**: Backend scans movie directory
2. **Filter**: Compares against existing JSON files (posters, cast, descriptions)
3. **Return**: Only truly new movies (missing metadata)
4. **Display**: Populates grid with new movies
5. **Process**: User selects and processes movies
6. **Update**: Backend updates JSON files with new metadata

### File Structure Expected
```
S:\MEDIA\MOVIES\
├── Movie Title (Year) [Quality].mp4
├── Another Movie (Year) [Quality].mp4
└── ...
```

## Future Enhancements

### Planned Features
- **TMDB Integration**: Automatic metadata fetching
- **Poster Management**: Download and assign movie posters
- **Batch Operations**: Multiple action types (fetch info, assign posters, etc.)
- **Status Tracking**: Track processing status per movie
- **Error Recovery**: Resume interrupted processing
- **Export/Import**: Backup and restore movie metadata

### Configuration Options
- **Movie Directory Path**: Configurable movie source directory
- **Quality Preferences**: Preferred video quality detection
- **TMDB API Key**: For metadata fetching
- **Processing Options**: Customize what gets processed

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all API endpoints are accessible
3. Ensure movie files are in the expected format
4. Check network connectivity for external API calls

---

**Version**: 1.0  
**Last Updated**: 7/19/2025  
**Created By**: Paul Welby 