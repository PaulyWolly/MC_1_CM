/*
  FIX_YOUTUBE_SEARCH_INVALID_DATES.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

// fix_youtube_search_invalid_dates.js
// Script to fix YouTubeSearch entries with missing/invalid dateCreated or lastSearched
// Usage: node scripts/fix_youtube_search_invalid_dates.js

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const YouTubeSearch = require('../../server/models/YouTubeSearch');

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const now = new Date();
    let fixedCount = 0;

    // Find all entries with missing/invalid dateCreated or lastSearched
    const broken = await YouTubeSearch.find({
        $or: [
            { dateCreated: { $exists: false } },
            { lastSearched: { $exists: false } },
            { dateCreated: null },
            { lastSearched: null },
            { dateCreated: '' },
            { lastSearched: '' },
        ]
    });

    console.log(`Found ${broken.length} YouTubeSearch entries with missing/invalid dates.`);

    // Spinner animation setup
    const spinnerFrames = ['|', '/', '-', '\\'];
    let spinnerIndex = 0;
    let processed = 0;
    let spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${spinnerFrames[spinnerIndex]} Fixing entries: ${processed}/${broken.length}`);
        spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    }, 100);

    for (const doc of broken) {
        const fallbackDate = doc._id && doc._id.getTimestamp ? doc._id.getTimestamp() : now;
        let updated = false;
        if (!doc.dateCreated || isNaN(new Date(doc.dateCreated))) {
            doc.dateCreated = fallbackDate;
            updated = true;
        }
        if (!doc.lastSearched || isNaN(new Date(doc.lastSearched))) {
            doc.lastSearched = fallbackDate;
            updated = true;
        }
        if (updated) {
            await doc.save();
            fixedCount++;
        }
        processed++;
    }

    clearInterval(spinnerInterval);
    process.stdout.write(`\r`); // Clear spinner line
    console.log(`Fixed ${fixedCount} YouTubeSearch entries.`);
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
}

main().catch(err => {
    console.error('Error running fix script:', err);
    process.exit(1);
}); 