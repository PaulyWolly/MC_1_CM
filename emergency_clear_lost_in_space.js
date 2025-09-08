
// EMERGENCY: Clear all Lost In Space from localStorage
// Copy and paste this into browser console if deletion still fails

console.log('[EMERGENCY-CLEAR] Clearing all Lost In Space from localStorage...');
let resumeList = JSON.parse(localStorage.getItem("mediaLibraryResumeList") || "[]");
const originalCount = resumeList.length;

const newResumeList = resumeList.filter(item => {
  const title = (item.title || '').toLowerCase();
  const path = (item.path || '').toLowerCase();
  const isLostInSpace = title.includes('lost in space') || path.includes('lost in space');
  
  if (isLostInSpace) {
    console.log('[EMERGENCY-CLEAR] Removing:', item.title);
  }
  
  return !isLostInSpace;
});

localStorage.setItem("mediaLibraryResumeList", JSON.stringify(newResumeList));
const removedCount = originalCount - newResumeList.length;

console.log('[EMERGENCY-CLEAR] Removed', removedCount, 'Lost In Space items');
console.log('[EMERGENCY-CLEAR] Please refresh the page (Ctrl+F5)');

if (window.mediaLibraryManager && window.mediaLibraryManager.updateWatchLaterGrid) {
  window.mediaLibraryManager.updateWatchLaterGrid();
}
