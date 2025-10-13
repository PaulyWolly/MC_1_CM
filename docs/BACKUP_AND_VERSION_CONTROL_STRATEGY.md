# 🎯 BACKUP & VERSION CONTROL STRATEGY

## Overview
This document defines **what goes in Git** vs **what gets backed up locally** for your Media Library application.

---

## 📋 TABLE OF CONTENTS
1. [Git Strategy (GitHub)](#git-strategy)
2. [Local Backup Strategy](#local-backup-strategy)
3. [Decision Framework](#decision-framework)
4. [Deployment Considerations](#deployment-considerations)

---

## 🌿 GIT STRATEGY (GitHub)

### **WHAT SHOULD BE IN GIT:**

#### ✅ **1. Application Source Code**
```
/public/
  ├── components/       # All UI components
  ├── services/         # API services
  ├── app.js           # Main app logic
  ├── index.html       # Entry point
  └── styles.css       # Stylesheets
/server/
  ├── routes/          # Express routes
  ├── middleware/      # Server middleware
  └── server.js        # Server entry point
/shared/
  └── NormalizationService.js  # Shared utilities
/utils/
  └── *.js             # Utility functions
```

#### ✅ **2. Configuration Templates**
```
/config/
  ├── config.js        # WITHOUT sensitive values
  ├── config.json.example  # Template with placeholders
  └── version.js       # Version tracking
```

#### ✅ **3. Documentation**
```
/docs/
  └── *.md             # All documentation
README.md              # Project README
```

#### ✅ **4. Reusable Scripts**
Keep scripts that are **part of your application's tooling**:
```
/scripts/
  ├── FETCH/           # API data fetching (reusable)
  ├── GENERATE/        # Still/thumbnail generation
  ├── TEMPLATES/       # Script templates
  ├── BACKUP/          # Backup utilities
  └── UTILS/           # General utilities
```

#### ✅ **5. Dependencies Manifest**
```
package.json         # ALWAYS commit
package-lock.json    # OPTIONAL (team decision)
```

---

### **WHAT SHOULD NOT BE IN GIT:**

#### ❌ **1. User Data & Runtime Files**
```
/public/components/MediaLibrary/data/  # User's media metadata
/server/data/                          # User collections, etc.
/cache/                                # Runtime cache
localStorage*.json                     # User preferences
watch_later.json                       # User state
```
**Why?** User-specific, changes frequently, can be regenerated.

#### ❌ **2. Media Files**
```
*.mkv, *.mp4, *.avi                   # Video files
/public/assets/media/                  # Large media assets
/public/api/                           # Thumbnail images
```
**Why?** Too large (hundreds of GB), stored elsewhere.

#### ❌ **3. Secrets & Environment**
```
.env                                   # API keys, passwords
.env.*                                 # Any env variant
*api*key*                              # Key files
*token*                                # Token files
```
**Why?** SECURITY! Never commit secrets to Git.

#### ❌ **4. Dependencies**
```
/node_modules/                         # NPM packages
```
**Why?** Huge (100+ MB), can be regenerated with `npm install`.

#### ❌ **5. Backups & Logs**
```
/backups/                              # All backups
*.backup, *.bak                        # Backup files
*.log                                  # Log files
*-backup-*.json                        # Timestamped backups
```
**Why?** Temporary, historical, bloats repository.

#### ❌ **6. One-Off Migration Scripts**
```
/scripts/FIX/                          # Historical fixes
/scripts/MIGRATE/                      # Data migrations
/scripts/CLEANUP/                      # One-time cleanups
/scripts/RENAME/                       # Filesystem renames
/scripts/CONVERT/                      # Format conversions
/scripts/DEBUG/                        # Debugging scripts
```
**Why?** These are **development artifacts** - they fixed a problem **once** but aren't part of your application. Keep them in local backups for reference.

---

## 💾 LOCAL BACKUP STRATEGY

### **WHAT SHOULD BE BACKED UP LOCALLY:**

#### 📁 **1. Full Project Snapshots**
- **Frequency:** Before major changes
- **Location:** `/backups/enhanced_backup_YYYY-MM-DD/`
- **Contents:** Entire project (code + data + scripts)
- **Retention:** Keep last 5-10 snapshots

#### 📁 **2. User Data**
- **Frequency:** Daily (automated)
- **What:**
  ```
  /public/components/MediaLibrary/data/tv-shows-unified.json
  /public/components/MediaLibrary/data/movies/movies-unified.json
  /server/data/collections.json
  /server/data/watchLater.json
  ```
- **Why:** This is YOUR media library metadata - irreplaceable!

#### 📁 **3. Configuration**
- **Frequency:** After changes
- **What:**
  ```
  .env (SECURE LOCATION)
  /config/*
  ```

#### 📁 **4. Development Scripts Archive**
- **Location:** `/backups/scripts-archive/`
- **Contents:** All one-off fix/migration scripts
- **Why:** Historical reference for "how did we fix that?"

---

## 🎯 DECISION FRAMEWORK

### **Ask These Questions:**

| Question | Git | Backup | Neither |
|----------|-----|--------|---------|
| Is it source code? | ✅ | ✅ | |
| Is it user data? | | ✅ | |
| Can it be regenerated from code? | ✅ | | ❌ |
| Is it a secret/credential? | ❌ | ✅* | |
| Is it > 100MB? | ❌ | ✅ | |
| Did it fix a one-time problem? | ❌ | ✅ | |
| Is it a dependency? | ❌ | | ❌ |
| Is it documentation? | ✅ | ✅ | |

*Secrets should be backed up in a **secure, encrypted** location, NOT in plain text!

---

## 🚀 DEPLOYMENT CONSIDERATIONS

### **For Production Deployment:**

1. **Git Repository** contains:
   - Clean, working source code
   - Documentation
   - `package.json` with dependencies

2. **Deployment Process:**
   ```bash
   git clone <repository>
   npm install                    # Install dependencies
   cp .env.example .env          # Create .env from template
   # Edit .env with production values
   npm start                      # Start application
   ```

3. **Data Setup:**
   - User must provide their own media files
   - User must run setup scripts to generate metadata
   - User configures paths in `.env`

---

## 📊 REPOSITORY SIZE TARGETS

### **Ideal Repository Size:**
- **Current (bloated):** 2+ GB (too large!)
- **Target:** < 50 MB (code + docs only)
- **Maximum:** < 100 MB

### **If Repository is Too Large:**
```bash
# Check repository size
git count-objects -vH

# Find large files
git rev-list --objects --all | grep "$(git verify-pack -v .git/objects/pack/*.idx | sort -k 3 -n | tail -10 | awk '{print $1}')"

# Remove large files from history (CAREFUL!)
git filter-branch --tree-filter 'rm -f path/to/large/file' HEAD
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Review and update `.gitignore`
- [ ] Remove large files from Git history
- [ ] Set up automated local backups for user data
- [ ] Create `.env.example` template (without secrets)
- [ ] Document required environment variables
- [ ] Archive one-off migration scripts locally
- [ ] Test clean clone and setup process
- [ ] Push cleaned repository to GitHub

---

## 🔐 SECURITY NOTES

### **NEVER Commit:**
1. `.env` files
2. API keys (TMDB, YouTube, etc.)
3. Database credentials
4. User personal data
5. Authentication tokens

### **If You Accidentally Commit a Secret:**
1. **IMMEDIATELY** revoke/rotate the credential
2. Remove from Git history using `git filter-branch` or BFG Repo Cleaner
3. Force push to remote (if applicable)
4. Treat the old secret as compromised forever

---

## 📞 SUPPORT

For questions about this strategy, refer to:
- Project Standards: `/docs/PROJECT_STANDARDS.md`
- Migration Guide: `/docs/MIGRATION_GUIDE.md`
- Quick Start: `/docs/QUICK_START_GUIDE.md`

---

**Last Updated:** October 9, 2025  
**Version:** 1.0

