
console.log('[FIX-LOCALSTORAGE] Starting localStorage path fix...');

// Get current Watch Later items
let resumeList = JSON.parse(localStorage.getItem("mediaLibraryResumeList") || "[]");
console.log('[FIX-LOCALSTORAGE] Found', resumeList.length, 'items in Watch Later');

let fixedCount = 0;

// Fix each item
resumeList.forEach((item, index) => {
  let needsFix = false;
  
  // Fix path field
  if (item.path && item.path.includes('\\')) {
    item.path = item.path.replace(/\\/g, "/");
    needsFix = true;
  }
  
  // Fix relPath field
  if (item.relPath && item.relPath.includes('\\')) {
    item.relPath = item.relPath.replace(/\\/g, "/");
    needsFix = true;
  }
  
  // Fix absPath field
  if (item.absPath && item.absPath.includes('\\')) {
    item.absPath = item.absPath.replace(/\\/g, "/");
    needsFix = true;
  }
  
  // Fix filePath field
  if (item.filePath && item.filePath.includes('\\')) {
    item.filePath = item.filePath.replace(/\\/g, "/");
    needsFix = true;
  }
  
  // Ensure relPath is populated if missing
  if (!item.relPath && item.path) {
    item.relPath = item.path;
    needsFix = true;
  }
  
  if (needsFix) {
    console.log('[FIX-LOCALSTORAGE] Fixed item', index + 1, ':', item.title);
    fixedCount++;
  }
});

// Save the fixed data back to localStorage
localStorage.setItem("mediaLibraryResumeList", JSON.stringify(resumeList));

console.log('[FIX-LOCALSTORAGE] ✅ COMPLETE: Fixed', fixedCount, 'items in localStorage');
console.log('[FIX-LOCALSTORAGE] All paths now use forward slashes consistently');
console.log('[FIX-LOCALSTORAGE] Try deleting Lost In Space episodes now!');
