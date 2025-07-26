# 🏗️ PROJECT STANDARDS & TEMPLATES

## **CORE PRINCIPLE: CONSISTENCY = RELIABILITY**

---

## 📋 **DATA STRUCTURE STANDARDS**

### **1. Media Library Data Format**
**ALL media data files MUST use this exact structure:**

```json
{
  "path": "",
  "folders": [
    {
      "path": "Item Name",
      "normalizedKey": "Item.Name",
      "tmdbId": 12345,
      "folders": [],
      "files": [
        {
          "name": "filename.mp4",
          "absPath": "S:\\MEDIA\\PATH\\filename.mp4",
          "relPath": "PATH\\filename.mp4"
        }
      ]
    }
  ]
}
```

**✅ APPLIES TO:**
- Movies: `media-library-movies_normalized.json`
- TV Shows: `media-library-tv-shows_normalized.json`
- Any future media types

---

## 🎯 **FILE NAMING STANDARDS**

### **1. Script Files**
```
[ACTION]_[TARGET]_[SPECIFIER].js
```

**Examples:**
- `scan_media_library_movies.js`
- `convert_audio_to_aac_tv-shows_SINGLE.js`
- `fetch_movie_posters_from_tmdb.js`
- `validate_existing_functionality.js`

### **2. Data Files**
```
[type]_[name]_normalized.json
```

**Examples:**
- `movie_posters_normalized.json`
- `media-library-movies_normalized.json`
- `media-library-tv-shows_normalized.json`

### **3. Media Files**
```
Title.(Year).[Quality].mp4
```

**Examples:**
- `E.T..(1984).[1080p].mp4`
- `The.Big.Bang.Theory.S12E12.The.Jerusalem.Duality.mp4`

---

## 🔧 **CODE STRUCTURE STANDARDS**

### **1. JavaScript Class Template**
```javascript
/*
  [CLASS_NAME].JS
  Version: [X]
  AppName: MC_1_CM [v9]
  Created: [DATE]
  Created by Paul Welby
  Purpose: [DESCRIPTION]
*/

class ClassName {
    constructor() {
        // Initialize properties
        this.property = value;
    }

    // Public methods
    methodName() {
        // Implementation
    }

    // Private methods (prefixed with _)
    _privateMethod() {
        // Implementation
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClassName;
}
```

### **2. Script File Template**
```javascript
/*
  [SCRIPT_NAME].JS
  Version: [X]
  AppName: MC_1_CM [v9]
  Created: [DATE]
  Created by Paul Welby
  Purpose: [DESCRIPTION]
*/

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    inputPath: 'path/to/input',
    outputPath: 'path/to/output'
};

// Main function
async function main() {
    try {
        console.log('🚀 [SCRIPT] Starting...');
        
        // Implementation
        
        console.log('✅ [SCRIPT] Complete');
    } catch (error) {
        console.error('💥 [SCRIPT] Failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };
```

### **3. Validation Check Template**
```javascript
{
    name: 'Check Name',
    path: 'path/to/file',
    check: (filePath) => {
        if (!fs.existsSync(filePath)) {
            return 'File missing: [specific error]';
        }
        
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Specific checks
            if (!data.property) {
                return 'Missing "property" in data structure';
            }
            
            return null; // Success
        } catch (parseError) {
            return `JSON parsing error: ${parseError.message}`;
        }
    }
}
```

---

## 🎨 **UI COMPONENT STANDARDS**

### **1. Component File Structure**
```
ComponentName/
├── ComponentName.css
├── ComponentName.html
├── ComponentName.js
└── README.md
```

### **2. CSS Class Naming**
```
[component]-[element]-[modifier]
```

**Examples:**
- `media-library-movie-card`
- `media-library-tab-button-active`
- `video-player-controls-hidden`

### **3. JavaScript Method Naming**
```
[action][Target][Specifier]()
```

**Examples:**
- `getPosterPath()`
- `saveResumeProgress()`
- `renderMoviesContent()`
- `attachMovieCardHandlers()`

---

## 🔍 **VALIDATION STANDARDS**

### **1. Pre-Change Validation**
```bash
# BEFORE making any changes
node scripts/VALIDATE/check_functionality_baseline.js establish
node scripts/VALIDATE/validate_existing_functionality.js
```

### **2. Post-Change Validation**
```bash
# AFTER making changes
node scripts/VALIDATE/check_functionality_baseline.js compare
node validate.js
```

### **3. Critical Functionality Checks**
- ✅ Movie posters display correctly
- ✅ TV shows filter properly
- ✅ Watch Later functionality works
- ✅ Video player integration works
- ✅ App initialization completes

---

## 📁 **FOLDER STRUCTURE STANDARDS**

```
scripts/
├── SCAN/          # Scanning and data collection
├── CONVERT/       # File conversion scripts
├── FETCH/         # API data fetching
├── VALIDATE/      # Validation and testing
├── FIX/           # Bug fixes and repairs
├── NORMALIZE/     # Data normalization
├── UPDATE/        # Data updates
├── REMOVE/        # Cleanup and removal
├── MERGE/         # Data merging
├── MIGRATE/       # Data migration
├── BACKUP/        # Backup operations
├── RESTORE/       # Restore operations
└── TEST/          # Testing scripts

public/components/
├── [ComponentName]/
│   ├── [ComponentName].css
│   ├── [ComponentName].html
│   ├── [ComponentName].js
│   └── README.md
└── data/
    ├── movies/
    └── tv-shows/
```

---

## 🚨 **ERROR HANDLING STANDARDS**

### **1. Console Logging Format**
```javascript
console.log('[DEBUG - CONTEXT] Message:', data);
console.error('[ERROR - CONTEXT] Error:', error.message);
```

**Examples:**
- `[DEBUG - MOVIES] Loading movie data:`, data
- `[ERROR - VALIDATION] JSON parsing failed:`, error.message

### **2. Error Messages**
- **Specific**: Tell exactly what's wrong
- **Actionable**: Include how to fix it
- **Contextual**: Include relevant data

**Good:**
```
"Missing 'folders' property in TV shows data structure (expected: { path: "", folders: [...] })"
```

**Bad:**
```
"No TV shows data"
```

---

## 🔄 **WORKFLOW STANDARDS**

### **1. Before Making Changes**
1. Establish baseline: `node scripts/VALIDATE/check_functionality_baseline.js establish`
2. Verify current state: `node scripts/VALIDATE/validate_existing_functionality.js`
3. Plan the specific change needed

### **2. While Making Changes**
1. Make ONE change at a time
2. Test the specific change
3. Validate no regressions: `node scripts/VALIDATE/validate_existing_functionality.js`

### **3. After Making Changes**
1. Compare against baseline: `node scripts/VALIDATE/check_functionality_baseline.js compare`
2. Full validation: `node validate.js`
3. Browser testing
4. Only then push to GitHub

---

## 📊 **SUCCESS METRICS**

### **1. Zero Regressions**
- ✅ All existing functionality works after changes
- ✅ No new errors introduced
- ✅ Performance maintained or improved

### **2. Consistent Structure**
- ✅ All data files use same format
- ✅ All scripts follow naming conventions
- ✅ All components follow structure standards

### **3. Clear Validation**
- ✅ Validation catches issues before they become problems
- ✅ Error messages are specific and actionable
- ✅ Baseline comparison detects regressions

---

## 🎯 **ENFORCEMENT**

### **1. Automated Checks**
- Git hooks run validation before commits/pushes
- Scripts check for naming convention compliance
- Templates ensure consistent structure

### **2. Manual Reviews**
- Check this document before making changes
- Follow the workflow standards
- Use the provided templates

### **3. Continuous Improvement**
- Update standards when better patterns emerge
- Document lessons learned
- Share knowledge across the team

---

**🎯 REMEMBER: CONSISTENCY = RELIABILITY = NO MORE BREAKING CHANGES** 