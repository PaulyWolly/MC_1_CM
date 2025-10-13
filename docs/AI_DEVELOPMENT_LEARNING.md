# AI Development Learning Document

## Core Principles (Updated: 2025-09-20)

### User Working Style & Preferences
- **Direct Execution Over Exploration**: When user provides clear instructions or shows exact structure, execute immediately - don't explore alternatives
- **Trust User Expertise**: User is experienced and knows exactly what they need - follow their lead
- **No Unnecessary Complexity**: Avoid debug logs, console entries, and extra steps unless explicitly requested
- **Listen First, Execute Second**: Read and understand instructions completely before taking action
- **Speed Over Perfection**: User values quick, direct solutions over elaborate explanations

### Common Mistakes to Avoid
- ❌ Adding debugging/console logs without being asked
- ❌ Exploring multiple approaches when user shows exact solution
- ❌ Second-guessing user's clear instructions
- ❌ Making assumptions instead of asking direct questions
- ❌ Overthinking simple tasks
- ❌ Not following exact patterns when user provides examples
- ❌ Leaving console.log statements in production code
- ❌ Excessive console output that clutters the development environment

### Successful Patterns

#### TV Show Data Structure
- **Season Structure**: Must match existing seasons exactly
- **Example**: Season 1 structure in DC's Legends of Tomorrow:
  ```
  "1": {
    "season": 1,
    "episodes": { "1": {...}, "2": {...} },
    "episodeCount": 17,
    "path": "S:/MEDIA/TV-SHOWS/.../Season 01",
    "absPath": "S:/MEDIA/TV-SHOWS/.../Season 01", 
    "TMDBId": 66315,
    "overview": "...",
    "airDate": "2016-01-21",
    "posterPath": "/xEY4YPu7FCKQNSnMaaHo4NJl3ID.jpg",
    "poster": "https://image.tmdb.org/t/p/w500/xEY4YPu7FCKQNSnMaaHo4NJl3ID.jpg"
  }
  ```
- **Episode Structure**: Each episode needs: episode, title, filename, path, absPath, fileSize, created, TMDBId, overview, airDate, stillPath, voteAverage, voteCount, still, filePath

#### File Paths & Naming
- **TV Shows**: Use backslashes in path statements
- **Quality Tags**: Use internally for organization but remove from display titles
- **Normalized Keys**: Use lowercase dot notation without apostrophes, ampersands, or hyphens
- **Star Trek Movies**: Use era designators (original), (v2), (new) in titles for differentiation

#### Script Organization
- **Location**: All scripts go in /scripts folder with subfolders for specialized scripts
- **Execution**: Use 'node scripts/<scriptName>' command
- **Archiving**: Never delete files, archive them instead
- **User Runs Scripts**: Don't run long processes automatically, let user run them

### Project-Specific Knowledge

#### Media Library Structure
- **Movies**: movies-unified.json
- **TV Shows**: tv-shows-unified.json  
- **Collections**: collections.json
- **TMDB Integration**: Use media.themoviedb.org domain for images (not image.tmdb.org)
- **Cast Images**: Ensure both "profile" and "profile_path" fields exist

#### Console Log Management
- **Production Ready**: Remove ALL console.log statements from production code
- **Working Features**: If functionality is working, remove debug output
- **Clean Environment**: Keep console output minimal and only for actual errors
- **No Debug Clutter**: Avoid excessive logging that slows down development

#### User Communication Style
- **Direct**: User prefers straightforward, concise responses
- **No Fluff**: Skip elaborate planning or commentary
- **Partnership**: Discuss local issues, not global changes
- **Simple Solutions**: Value simplicity in code and explanations

### Learning Updates Log
- **2025-09-20**: Initial document creation based on Season 4 integration frustrations
- **Key Lesson**: When user shows exact structure (like Season 1), copy it precisely instead of exploring alternatives

---

## Usage Instructions for AI
1. **Before starting any task**: Review relevant sections of this document
2. **After completing tasks**: Update this document with new learnings
3. **When uncertain**: Reference this document for established patterns
4. **When corrected**: Add corrections to appropriate sections
