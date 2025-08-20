/*
  CLEAR_WATCH_LATER.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

console.log('🎬 [CLEAR - WATCH-LATER] Clearing Watch Later data...');

// Clear the Watch Later JSON files
const watchLaterFiles = [
    'watch_later.json',
    'watch_later_raw.json'
];

watchLaterFiles.forEach(file => {
    try {
        const fs = require('fs');
        if (fs.existsSync(file)) {
            fs.writeFileSync(file, '[]');
            console.log(`✅ Cleared ${file}`);
        } else {
            console.log(`⚠️  ${file} not found (already empty)`);
        }
    } catch (error) {
        console.error(`❌ Error clearing ${file}:`, error.message);
    }
});

console.log('🎬 [CLEAR - WATCH-LATER] Watch Later data cleared!');
console.log('💡 Now you can test TV show Watch Later functionality with fresh data.'); 