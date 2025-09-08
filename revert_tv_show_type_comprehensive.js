const fs = require('fs');
const path = require('path');

console.log('🔧 Comprehensive fix: Reverting ALL "tv-show" references to "tvshow"...');

// Function to recursively find all files
function findFiles(dir, extensions = ['.js', '.json', '.html', '.css']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Skip node_modules and other common directories
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        results = results.concat(findFiles(filePath, extensions));
      }
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

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

// Find all relevant files
const projectRoot = __dirname;
const files = findFiles(projectRoot);

console.log(`📁 Found ${files.length} files to check...`);

// Process each file
files.forEach(filePath => {
  const relativePath = path.relative(projectRoot, filePath);
  
  // Skip certain files
  if (relativePath.includes('node_modules') || 
      relativePath.includes('.git') ||
      relativePath.includes('dist') ||
      relativePath.includes('build')) {
    return;
  }
  
  let fileChanged = false;
  let replacements = 0;
  
  // Replace "tv-show" with "tvshow"
  if (replaceInFile(filePath, '"tv-show"', '"tvshow"')) {
    fileChanged = true;
    replacements++;
  }
  
  // Replace 'tv-show' with 'tvshow'
  if (replaceInFile(filePath, "'tv-show'", "'tvshow'")) {
    fileChanged = true;
    replacements++;
  }
  
  // Replace tv-show with tvshow (without quotes)
  if (replaceInFile(filePath, 'tv-show', 'tvshow')) {
    fileChanged = true;
    replacements++;
  }
  
  if (fileChanged) {
    console.log(`✅ ${relativePath} - ${replacements} replacements`);
    totalFilesChanged++;
    totalReplacements += replacements;
  }
});

console.log(`🎯 SUMMARY:`);
console.log(`📁 Files changed: ${totalFilesChanged}`);
console.log(`🔄 Total replacements: ${totalReplacements}`);
console.log(`📋 Now restart your server and test the favorites!`);
