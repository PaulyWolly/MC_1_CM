/*
  REFACTOR-API-CALLS.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../public/app.js');
const backupFile = path.join(__dirname, '../public/app.js.bak');

let content = fs.readFileSync(targetFile, 'utf8');
fs.writeFileSync(backupFile, content, 'utf8');

const apiRegex = /fetch\((`?)(\/api\/[\w\-\/\?&=\$\{\}\.]+|\$\{SERVER_URL\}\/api\/[\w\-\/\?&=\$\{\}\.]+)`?/g;
let changes = 0;

content = content.replace(/(\/\*\*\s*API CALLS REFACTORED BY refactor-api-calls\.js .+?\*\/\n)?/, '/** API CALLS REFACTORED BY refactor-api-calls.js ' + new Date().toISOString() + ' **/\n');

content = content.replace(apiRegex, (match, quote, url) => {
    // Don't change YouTube endpoints
    if (/youtube/.test(url)) return match;
    // Don't change config.json or static files
    if (/config\.json|\.html|\.css|\.js/.test(url)) return match;
    changes++;
    return `fetch(window.appConfig.getApiUrl('${url.replace(/\$\{SERVER_URL\}\//, "/")}')`;
});

// Insert await window.appConfig.load(); before each fetch if not present in previous 5 lines
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('fetch(window.appConfig.getApiUrl(')) {
        let found = false;
        for (let j = Math.max(0, i - 5); j < i; j++) {
            if (lines[j].includes('await window.appConfig.load()')) {
                found = true;
                break;
            }
        }
        if (!found) {
            lines.splice(i, 0, '    await window.appConfig.load();');
            i++;
            changes++;
        }
    }
}
content = lines.join('\n');

fs.writeFileSync(targetFile, content, 'utf8');
console.log(`Refactor complete. ${changes} changes made. Please review and test your app.`); 