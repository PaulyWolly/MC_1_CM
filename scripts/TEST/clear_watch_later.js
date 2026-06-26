/*
  CLEAR_WATCH_LATER.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
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