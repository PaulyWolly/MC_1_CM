const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing "tv-shows" to "tvshows" in MediaLibraryManager.js...');

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

const filePath = path.join(__dirname, 'public', 'components', 'MediaLibrary', 'MediaLibraryManager.js');

if (!fs.existsSync(filePath)) {
  console.log('❌ MediaLibraryManager.js not found');
  process.exit(1);
}

let totalReplacements = 0;

// Replace "tv-shows" with "tvshows" (with quotes)
if (replaceInFile(filePath, '"tv-shows"', '"tvshows"')) {
  totalReplacements++;
}

// Replace 'tv-shows' with 'tvshows' (with single quotes)
if (replaceInFile(filePath, "'tv-shows'", "'tvshows'")) {
  totalReplacements++;
}

// Replace tv-shows with tvshows (without quotes)
if (replaceInFile(filePath, 'tv-shows', 'tvshows')) {
  totalReplacements++;
}

console.log(`🎯 SUMMARY:`);
console.log(`🔄 Total replacements: ${totalReplacements}`);
console.log(`📋 Now restart your server - the syntax error should be fixed!`);
