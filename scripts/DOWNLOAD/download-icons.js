/*
  DOWNLOAD-ICONS.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const https = require('https');
const fs = require('fs');
const path = require('path');

const icons = {
    'folder': 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/folder.svg',
    'file': 'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/file.svg'
};

const iconDir = path.join(__dirname, '..', 'public', 'assets', 'img', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// Download each icon
Object.entries(icons).forEach(([name, url]) => {
    const filePath = path.join(iconDir, `${name}.svg`);
    const file = fs.createWriteStream(filePath);

    https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`✅ Downloaded ${name}.svg`);
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file if there was an error
        console.error(`❌ Error downloading ${name}.svg:`, err.message);
    });
}); 