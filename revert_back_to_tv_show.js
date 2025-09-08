const fs = require('fs');
const path = require('path');

console.log('🔧 URGENT: Reverting "tvshow" back to "tv-show" to fix the app...');

// Function to replace content in a file
function replaceInFile(filePath, searchStr, replaceStr) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(new RegExp(searchStr, 'g'), replaceStr);
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      return true;
    }
    return false;
  } catch (error) {
    console.log(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

let totalFilesChanged = 0;
let totalReplacements = 0;

// Only process specific active files - NO BACKUPS
const activeFiles = [
  'public/components/MediaLibrary/MediaLibraryManager.js',
  'public/components/MediaLibrary/MediaLibrary.css',
  'server/models/WatchLater.js',
  'public/components/ConfirmModalComponent/ConfirmModal.js',
  'public/components/ConfirmModalComponent/ConfirmModal.css',
  'public/components/ConfirmModalComponent/ConfirmModal.html',
  'public/index.html'
];

console.log(`📁 Processing ${activeFiles.length} active files only...`);

// Process each active file
activeFiles.forEach(relativePath => {
  const filePath = path.join(__dirname, relativePath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${relativePath}`);
    return;
  }
  
  let fileChanged = false;
  let replacements = 0;
  
  // Replace "tvshow" with "tv-show"
  if (replaceInFile(filePath, '"tvshow"', '"tv-show"')) {
    fileChanged = true;
    replacements++;
  }
  
  // Replace 'tvshow' with 'tv-show'
  if (replaceInFile(filePath, "'tvshow'", "'tv-show'")) {
    fileChanged = true;
    replacements++;
  }
  
  // Replace tvshow with tv-show (without quotes)
  if (replaceInFile(filePath, 'tvshow', 'tv-show')) {
    fileChanged = true;
    replacements++;
  }
  
  if (fileChanged) {
    console.log(`✅ ${relativePath} - ${replacements} replacements`);
    totalFilesChanged++;
    totalReplacements += replacements;
  } else {
    console.log(`ℹ️ ${relativePath} - no changes needed`);
  }
});

console.log(`🎯 SUMMARY:`);
console.log(`📁 Files changed: ${totalFilesChanged}`);
console.log(`🔄 Total replacements: ${totalReplacements}`);
console.log(`📋 Now restart your server - the app should work again!`);
