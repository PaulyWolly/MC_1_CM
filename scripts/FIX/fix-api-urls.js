/*
  FIX-API-URLS.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

function walk(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walk(filepath, filelist);
        } else if (filepath.endsWith('.js')) {
            filelist.push(filepath);
        }
    });
    return filelist;
}

function fixApiUrlsInFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;

    // Replace fetch('/api/xyz'...) with fetch(window.appConfig.getApiUrl('/api/xyz')...)
    content = content.replace(
        /fetch\(\s*(['"`])\/api\/(.*?)(['"`])/g,
        "fetch(window.appConfig.getApiUrl('/api/$2')"
    );

    // Replace fetchWithRetry('/api/xyz'...) with fetchWithRetry(window.appConfig.getApiUrl('/api/xyz')...)
    content = content.replace(
        /fetchWithRetry\(\s*(['"`])\/api\/(.*?)(['"`])/g,
        "fetchWithRetry(window.appConfig.getApiUrl('/api/$2')"
    );

    if (content !== original) {
        // Backup original file
        fs.copyFileSync(filepath, filepath + '.bak');
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated: ${filepath}`);
    }
}

// New (looks for ../public, which is correct if your script is in scripts/)
const targetDir = path.join(process.cwd(), 'public');
const files = walk(targetDir);

files.forEach(fixApiUrlsInFile);

console.log('✅ All API fetch calls updated to use window.appConfig.getApiUrl(...)');