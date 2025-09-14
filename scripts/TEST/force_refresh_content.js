/*
  FORCE_REFRESH_CONTENT.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

// Force refresh Media Library content to see new heart icon classes
console.log('[DEBUG] Force refreshing Media Library content...');

// Check if MediaLibraryManager is available
if (window.MediaLibraryManager && window.MediaLibraryManager.instance) {
    console.log('[DEBUG] Found MediaLibraryManager instance, forcing refresh...');
    window.MediaLibraryManager.instance.forceRefreshContent();
} else {
    console.log('[DEBUG] MediaLibraryManager not found, trying alternative approach...');
    
    // Try to find the modal and force a refresh
    const modal = document.querySelector('.media-library-modal');
    if (modal) {
        console.log('[DEBUG] Found modal, triggering refresh...');
        // Trigger a tab switch to force re-render
        const currentTab = modal.querySelector('.tab.active');
        if (currentTab) {
            const tabName = currentTab.getAttribute('data-tab');
            console.log('[DEBUG] Current tab:', tabName);
            // Force re-render by switching to the same tab
            if (window.MediaLibraryManager && window.MediaLibraryManager.instance) {
                window.MediaLibraryManager.instance.switchTab(tabName);
            }
        }
    } else {
        console.log('[DEBUG] No modal found');
    }
}

console.log('[DEBUG] Force refresh script completed'); 