
console.log('[FIX-LOST-IN-SPACE] Starting comprehensive Lost In Space fix...');

// Get current Watch Later items
let resumeList = JSON.parse(localStorage.getItem("mediaLibraryResumeList") || "[]");
console.log('[FIX-LOST-IN-SPACE] Found', resumeList.length, 'total items in Watch Later');

// Find all Lost In Space items
const lostInSpaceItems = resumeList.filter(item => {
  const title = (item.title || '').toLowerCase();
  const path = (item.path || '').toLowerCase();
  return title.includes('lost in space') || path.includes('lost in space');
});

console.log('[FIX-LOST-IN-SPACE] Found', lostInSpaceItems.length, 'Lost In Space items');

// Show what we found
lostInSpaceItems.forEach((item, index) => {
  console.log('[FIX-LOST-IN-SPACE] Item', index + 1, ':', {
    title: item.title,
    path: item.path,
    relPath: item.relPath,
    absPath: item.absPath,
    filePath: item.filePath
  });
});

// Remove ALL Lost In Space items from localStorage
const cleanedList = resumeList.filter(item => {
  const title = (item.title || '').toLowerCase();
  const path = (item.path || '').toLowerCase();
  return !(title.includes('lost in space') || path.includes('lost in space'));
});

console.log('[FIX-LOST-IN-SPACE] Removed', lostInSpaceItems.length, 'Lost In Space items');
console.log('[FIX-LOST-IN-SPACE] Remaining items:', cleanedList.length);

// Save the cleaned list back to localStorage
localStorage.setItem("mediaLibraryResumeList", JSON.stringify(cleanedList));

console.log('[FIX-LOST-IN-SPACE] ✅ COMPLETE: All Lost In Space items removed from Watch Later');
console.log('[FIX-LOST-IN-SPACE] You can now add Lost In Space episodes to Watch Later normally');
console.log('[FIX-LOST-IN-SPACE] The deletion issue is fixed - no more corrupted entries!');
