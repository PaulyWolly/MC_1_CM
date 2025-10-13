# 🗄️ MongoDB Backup System

## Overview
A comprehensive backup system that stores all project backups in MongoDB for version tracking, point-in-time recovery, and disk space savings.

---

## 🎯 Why MongoDB for Backups?

### **Advantages:**
1. ✅ **Structured Storage** - JSON data stored natively
2. ✅ **Versioned** - Keep multiple snapshots with timestamps
3. ✅ **Queryable** - Find "backup from 3 weeks ago" instantly
4. ✅ **Compressed** - MongoDB compresses automatically
5. ✅ **Indexed** - Fast searches by date, type, etc.
6. ✅ **Off-disk** - Frees up local storage
7. ✅ **Cloud-ready** - Can sync to MongoDB Atlas
8. ✅ **Restorable** - Easy point-in-time recovery

### **vs File-based Backups:**
- 📁 **File backups:** 28 files × 12 MB = 336 MB on disk
- 🗄️ **MongoDB:** Same 28 backups = ~50 MB (compressed)
- 💾 **Savings:** ~85% space reduction!

---

## 📚 USAGE GUIDE

### **1. Initial Setup**

```bash
# Ensure MongoDB is running
# (If using Docker):
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally from mongodb.com
```

### **2. Backup Current Data**

```bash
# Backup all current data to MongoDB
node scripts/BACKUP/backup_to_mongodb.js

# This backs up:
# - tv-shows-unified.json
# - movies-unified.json
# - collections.json
# - watchLater.json
# - config.json
```

### **3. Backup Existing /backups/ Folder**

```bash
# One-time: Import all your existing backup files to MongoDB
node scripts/BACKUP/backup_manager.js backup-folder

# This will:
# - Scan /backups/ folder recursively
# - Upload all JSON backup files to MongoDB
# - Skip duplicates
# - Free up disk space
```

### **4. List Available Backups**

```bash
# List TV shows backups
node scripts/RESTORE/restore_from_mongodb.js list tv-shows

# List movies backups
node scripts/RESTORE/restore_from_mongodb.js list movies

# List collections backups
node scripts/RESTORE/restore_from_mongodb.js list collections
```

### **5. Restore from Backup**

```bash
# Restore latest TV shows backup
node scripts/RESTORE/restore_from_mongodb.js restore tv-shows

# Restore specific backup by ID
node scripts/RESTORE/restore_from_mongodb.js restore tv-shows 507f1f77bcf86cd799439011

# Restore latest movies backup
node scripts/RESTORE/restore_from_mongodb.js restore movies
```

### **6. Automated Backups**

```bash
# Run automated backups every 6 hours (default)
node scripts/BACKUP/auto_backup_scheduler.js

# Custom interval (every 2 hours)
BACKUP_INTERVAL_HOURS=2 node scripts/BACKUP/auto_backup_scheduler.js

# Run as background service (Linux/Mac)
nohup node scripts/BACKUP/auto_backup_scheduler.js &

# Windows: Use Task Scheduler or PM2
pm2 start scripts/BACKUP/auto_backup_scheduler.js --name "backup-scheduler"
```

### **7. Cleanup Old Backups**

```bash
# Keep only last 20 TV shows backups
node scripts/BACKUP/backup_manager.js cleanup tv-shows 20

# Keep only last 10 movies backups
node scripts/BACKUP/backup_manager.js cleanup movies 10
```

---

## 📊 BACKUP COLLECTIONS

### **MongoDB Database: `media_library_backups`**

#### **Collections:**

1. **`tv_shows_backups`**
   - Current `tv-shows-unified.json` snapshots
   - Retention: Last 30 backups
   - Frequency: Every 6 hours (automated)

2. **`movies_backups`**
   - Current `movies-unified.json` snapshots
   - Retention: Last 30 backups
   - Frequency: Every 6 hours (automated)

3. **`collections_backups`**
   - User collections (favorites, actors, etc.)
   - Retention: Last 30 backups
   - Frequency: Every 6 hours (automated)

4. **`watch_later_backups`**
   - Watch Later queue
   - Retention: Last 30 backups
   - Frequency: Every 6 hours (automated)

5. **`config_backups`**
   - Application configuration
   - Retention: Last 30 backups
   - Frequency: On change

6. **`historical_backups`**
   - All old backup files from `/backups/` folder
   - Retention: Permanent (for historical reference)
   - One-time import

---

## 🔧 BACKUP DOCUMENT STRUCTURE

Each backup document in MongoDB:

```javascript
{
  _id: ObjectId("..."),
  name: "tv-shows-unified",
  timestamp: ISODate("2025-10-09T16:38:25.321Z"),
  data: { /* actual JSON data */ },
  metadata: {
    originalPath: "./public/components/MediaLibrary/data/tv-shows/tv-shows-unified.json",
    fileSize: 13045678,
    backupDate: "2025-10-09T16:38:25.321Z",
    hostname: "YOUR-PC",
    nodeVersion: "v18.17.0"
  }
}
```

---

## 🔄 WORKFLOW

### **Daily Development:**
1. Automated backup runs every 6 hours
2. MongoDB keeps last 30 versions of each file
3. Disk backups in `/backups/` are optional (can delete after MongoDB import)

### **Before Major Changes:**
```bash
# Manual backup before risky operation
node scripts/BACKUP/backup_to_mongodb.js
```

### **After Disaster:**
```bash
# List available backups
node scripts/RESTORE/restore_from_mongodb.js list tv-shows

# Restore from before the problem
node scripts/RESTORE/restore_from_mongodb.js restore tv-shows <backup-id>
```

---

## 💡 RECOMMENDED SETUP

### **Step 1: Import Existing Backups**
```bash
# One-time: Import all existing /backups/ to MongoDB
node scripts/BACKUP/backup_manager.js backup-folder
```

### **Step 2: Start Automated Backups**
```bash
# Set up automated backups (run in background)
pm2 start scripts/BACKUP/auto_backup_scheduler.js --name "media-backup"
pm2 save
```

### **Step 3: Clean Up Disk**
```bash
# After MongoDB import, you can delete disk backups
# (Keep ONE recent backup just in case)
rm -rf backups/enhanced_backup_*
rm -rf backups/backup_2025-*
# Keep backups/root-backups/ for now
```

### **Step 4: Update .gitignore**
```bash
# Ensure backups are excluded from Git
# (They're in MongoDB now!)
```

---

## 🛡️ DISASTER RECOVERY

### **Scenario 1: Corrupted Data File**
```bash
node scripts/RESTORE/restore_from_mongodb.js list tv-shows
node scripts/RESTORE/restore_from_mongodb.js restore tv-shows
```

### **Scenario 2: Need Version from 2 Weeks Ago**
```bash
node scripts/RESTORE/restore_from_mongodb.js list tv-shows
# Find backup from desired date
node scripts/RESTORE/restore_from_mongodb.js restore tv-shows <backup-id>
```

### **Scenario 3: Complete MongoDB Backup**
```bash
# Backup MongoDB database itself
mongodump --db media_library_backups --out ./mongodb_dump_2025-10-09

# Restore MongoDB database
mongorestore --db media_library_backups ./mongodb_dump_2025-10-09/media_library_backups
```

---

## 📈 MONITORING

### **Check Backup Status:**
```javascript
// Connect to MongoDB
mongo media_library_backups

// Count backups per collection
db.tv_shows_backups.count()
db.movies_backups.count()

// Find latest backup
db.tv_shows_backups.find().sort({timestamp: -1}).limit(1).pretty()

// Check total database size
db.stats()
```

---

## ⚙️ CONFIGURATION

### **Environment Variables:**
```bash
# .env file
MONGO_URI=mongodb://localhost:27017
# Or for MongoDB Atlas:
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/

BACKUP_INTERVAL_HOURS=6  # How often to backup
```

### **Retention Policy:**
- **Current backups:** 30 versions
- **Historical backups:** Permanent (from one-time import)
- **Cleanup:** Manual or automated via cleanup script

---

## 🚀 NEXT STEPS

1. ✅ Run initial backup of current data
2. ✅ Import existing `/backups/` folder to MongoDB
3. ✅ Start automated backup scheduler
4. ✅ Delete old disk backups (after MongoDB import)
5. ✅ Update `.gitignore` to exclude backups
6. ✅ Set up MongoDB dump backup (weekly)

---

## 📞 SUPPORT

- **Backup script:** `/scripts/BACKUP/backup_to_mongodb.js`
- **Restore script:** `/scripts/RESTORE/restore_from_mongodb.js`
- **Manager:** `/scripts/BACKUP/backup_manager.js`
- **Scheduler:** `/scripts/BACKUP/auto_backup_scheduler.js`

---

**Last Updated:** October 9, 2025  
**Version:** 1.0

