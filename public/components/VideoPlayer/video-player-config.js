/*
  VIDEO-PLAYER-CONFIG.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

// Skip Intro timing (in seconds)
const SKIP_INTRO_SECONDS = 90;

// Skip to Next Episode timing (in seconds before end)
const SKIP_TO_NEXT_BEFORE_END_SECONDS = 240; // 4 minutes before end

// Up Next overlay timing (in seconds before end)
const UP_NEXT_BEFORE_END_SECONDS = 60; // 1 minute before end

// Up Next overlay timing for MediaLibrary (in seconds before end)
const MEDIA_LIBRARY_UP_NEXT_BEFORE_END_SECONDS = 30; // 30 seconds before end

// Make constants globally available for use in other files
window.SKIP_INTRO_SECONDS = SKIP_INTRO_SECONDS;
window.SKIP_TO_NEXT_BEFORE_END_SECONDS = SKIP_TO_NEXT_BEFORE_END_SECONDS;
window.UP_NEXT_BEFORE_END_SECONDS = UP_NEXT_BEFORE_END_SECONDS;
window.MEDIA_LIBRARY_UP_NEXT_BEFORE_END_SECONDS = MEDIA_LIBRARY_UP_NEXT_BEFORE_END_SECONDS;

// Export constants for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SKIP_INTRO_SECONDS,
        SKIP_TO_NEXT_BEFORE_END_SECONDS,
        UP_NEXT_BEFORE_END_SECONDS,
        MEDIA_LIBRARY_UP_NEXT_BEFORE_END_SECONDS
    };
} 