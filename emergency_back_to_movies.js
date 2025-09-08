// Emergency script to get back to movies page
// Run this in browser console if stuck on movie details page

console.log("🚨 EMERGENCY: Getting back to movies page...");

// Method 1: Try to find and click the back button
const backBtn = document.getElementById("backToGridBtn");
if (backBtn) {
    console.log("Found back button, clicking it...");
    backBtn.click();
} else {
    console.log("Back button not found, trying alternative methods...");
    
    // Method 2: Try to trigger renderMediaGrid directly
    if (window.mediaLibraryManager && typeof window.mediaLibraryManager.renderMediaGrid === 'function') {
        console.log("Found mediaLibraryManager, calling renderMediaGrid...");
        window.mediaLibraryManager.renderMediaGrid();
    } else {
        console.log("mediaLibraryManager not found, trying to reload page...");
        // Method 3: Last resort - reload the page
        window.location.reload();
    }
}

console.log("Emergency script completed. If still stuck, try refreshing the page.");
