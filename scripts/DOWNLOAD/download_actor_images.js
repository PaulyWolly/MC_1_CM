/*
  DOWNLOAD_ACTOR_IMAGES.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

const https = require('https');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

// TMDB profile URLs for The Family Jewels cast
const actorImages = [
    {
        name: 'Jerry Lewis',
        url: 'https://image.tmdb.org/t/p/w185/1Ar6Aq75Ro35XTqjDr3KgJFRobP.jpg',
        filename: 'jerry-lewis-profile.jpg'
    },
    {
        name: 'Donna Butterworth',
        url: 'https://image.tmdb.org/t/p/w185/41Stuy3kwt7gcreDKfbBzxVqdtH.jpg',
        filename: 'donna-butterworth-profile.jpg'
    },
    {
        name: 'Sebastian Cabot',
        url: 'https://image.tmdb.org/t/p/w185/uAgoTmwvabGX00LnYyDfyL7TPUP.jpg',
        filename: 'sebastian-cabot-profile.jpg'
    },
    {
        name: 'Robert Strauss',
        url: 'https://media.themoviedb.org/t/p/w138_and_h175_face/zGAVmoonAHQvEQcGrxgs5G8Qy7O.jpg',
        filename: 'robert-strauss-profile.jpg'
    }
];

// Create assets/actors directory if it doesn't exist
const actorsDir = path.join(__dirname, '../public/assets/actors');

async function ensureDirectoryExists(dir) {
    try {
        await fsPromises.access(dir);
    } catch {
        await fsPromises.mkdir(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
}

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                file.close();
                fsPromises.unlink(filepath).catch(() => {});
                return reject(new Error(`Failed to download image, status: ${response.statusCode}`));
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                file.close();
                fs.unlink(filepath).catch(() => {});
                reject(err);
            });
        }).on('error', (err) => {
            file.close();
            fs.unlink(filepath).catch(() => {});
            reject(err);
        });
    });
}

async function downloadActorImages() {
    try {
        await ensureDirectoryExists(actorsDir);
        
        console.log('🎬 Downloading actor profile images...');
        
        for (const actor of actorImages) {
            const filepath = path.join(actorsDir, actor.filename);
            
            console.log(`📥 Downloading ${actor.name}...`);
            
            try {
                await downloadImage(actor.url, filepath);
                console.log(`✅ Downloaded: ${actor.name} -> ${actor.filename}`);
            } catch (error) {
                console.error(`❌ Failed to download ${actor.name}:`, error.message);
            }
            
            // Rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('\n🎉 Actor image download complete!');
        console.log(`📁 Images saved to: ${actorsDir}`);
        
        // List downloaded files
        const files = await fsPromises.readdir(actorsDir);
        console.log('\n📋 Downloaded files:');
        files.forEach(file => {
            console.log(`   - ${file}`);
        });
        
    } catch (error) {
        console.error('❌ Error downloading actor images:', error);
    }
}

// Run the script
downloadActorImages(); 