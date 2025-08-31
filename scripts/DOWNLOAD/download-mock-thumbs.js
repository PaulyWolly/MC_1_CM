/*
  DOWNLOAD-MOCK-THUMBS.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

// download-mock-thumbs.js
// Script to download mock PNG thumbnails (16:9, 320x180) for YouTube mock results
// Usage:
//   node download-mock-thumbs.js [numImages] [outputDir]
//   - numImages: Number of images to download (default: 36)
//   - outputDir: Directory to save images (default: ./public/assets/img/mock/)
// BEFORE RUNNING: Purge/delete all old mock thumbnails in the output directory if needed.

const fs = require('fs');
const path = require('path');
const https = require('https');

const numThumbnails = parseInt(process.argv[2], 10) || 36;
const outDir = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(__dirname, 'public', 'assets', 'img', 'mock');
const width = 320;
const height = 180;

// Use Lorem Picsum for placeholder images (16:9, PNG)
const getImageUrl = (i) => `https://picsum.photos/id/${i + 1}/${width}/${height}`;

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
            https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 302 || response.statusCode === 301) {
                const redirectUrl = response.headers.location;
                console.log(`Following redirect to: ${redirectUrl}`);
                https.get(redirectUrl, (redirectResponse) => {
                    if (redirectResponse.statusCode !== 200) {
                        reject(new Error(`Failed to get '${redirectUrl}' (${redirectResponse.statusCode})`));
                    return;
                }
                    redirectResponse.pipe(file);
                    file.on('finish', () => file.close(resolve));
                }).on('error', (err) => {
                    fs.unlink(dest, () => reject(err));
                });
                return;
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
            }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
            });
        });
}

async function downloadMockThumbnails() {
    for (let i = 0; i < numThumbnails; i++) {
        const url = getImageUrl(i);
        const dest = path.join(outDir, `thumb${i + 1}.png`);
        console.log(`Downloading: ${url} -> ${dest}`);
        await downloadImage(url, dest);
    }
}

// Run the download
// BEFORE RUNNING: Purge/delete all old mock thumbnails in the output directory if needed.
downloadMockThumbnails()
    .then(() => {
        console.log(`\nAll ${numThumbnails} mock thumbnails downloaded successfully to ${outDir}!`);
        process.exit(0);
    })
    .catch(err => {
        console.error('Error downloading thumbnails:', err);
        process.exit(1);
    });
