/*
  SETUP_TMDB.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function main() {
    console.log('🎬 TMDb TV Show Image Setup');
    console.log('============================\n');
    
    // Check if .env exists
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        console.log('✅ Found existing .env file');
    } else {
        console.log('📝 Creating new .env file...');
        envContent = `# OpenAI API KEY
OPENAI_API_KEY=OpenAI APIkey

# SPEECH API KEY
SPEECH_API_KEY=Speech key
SPEECH_REGION=eastus

# Huggingface.co API KEY
HUGGINGFACE_API_KEY=Huggingface API key

# Google API Keys
GOOGLE_API_KEY=Google API key
GOOGLE_SEARCH_ENGINE_ID=Google search engine ID

# Bing API (Thermo Fisher)
BING_SUBSCRIPTION_KEY=Bing subscription key
BING_SEARCH_V7_SUBSCRIPTION_KEY=Bing subscription key
BING_SEARCH_URL=Bing search URL

# MongoDB Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.k82k8qn.mongodb.net/Chat_Streaming_Image?retryWrites=true&w=majority&appName=Cluster0

# TMDb API Key for TV Show Images
TMDB_API_KEY=your_tmdb_api_key_here
`;
    }
    
    // Check if TMDB_API_KEY is already set
    if (envContent.includes('TMDB_API_KEY=your_tmdb_api_key_here') || 
        envContent.includes('TMDB_API_KEY=') && !envContent.includes('TMDB_API_KEY=your_tmdb_api_key_here')) {
        
        console.log('\n🔑 TMDb API Key Setup:');
        console.log('1. Go to https://www.themoviedb.org/settings/api');
        console.log('2. Create an account if you don\'t have one');
        console.log('3. Request an API key (v3 auth)');
        console.log('4. Copy your API key\n');
        
        const apiKey = await question('Enter your TMDb API key: ');
        
        if (apiKey && apiKey.trim() !== '') {
            // Update or add TMDB_API_KEY
            if (envContent.includes('TMDB_API_KEY=')) {
                envContent = envContent.replace(/TMDB_API_KEY=.*$/m, `TMDB_API_KEY=${apiKey.trim()}`);
            } else {
                envContent += `\n# TMDb API Key for TV Show Images\nTMDB_API_KEY=${apiKey.trim()}\n`;
            }
            
            fs.writeFileSync(envPath, envContent);
            console.log('✅ TMDb API key saved to .env file');
        } else {
            console.log('❌ No API key provided. Please run this script again with a valid API key.');
            rl.close();
            return;
        }
    } else {
        console.log('✅ TMDb API key already configured');
    }
    
    // Check TV Shows directory
    const tvShowsDir = 'S:/MEDIA/TV-SHOWS/';
    if (!fs.existsSync(tvShowsDir)) {
        console.log(`\n❌ TV Shows directory not found: ${tvShowsDir}`);
        console.log('Please make sure your TV shows are in the correct directory.');
        rl.close();
        return;
    }
    
    console.log(`✅ TV Shows directory found: ${tvShowsDir}`);
    
    // Show available scripts
    console.log('\n📜 Available Scripts:');
    console.log('1. fetch_tmdb_tv-show_season_images.js - Fetch season poster URLs only (JSON output)');
    console.log('2. fetch_tmdb_tv-show_episode_images.js - Fetch episode still URLs only (JSON output)');
    
    const choice = await question('\nWhich script would you like to run? (1 or 2): ');
    
    rl.close();
    
    if (choice === '1') {
        console.log('\n🚀 Running fetch_tmdb_tv-show_season_images.js...');
        require('./fetch_tmdb_tv-show_season_images.js');
    } else if (choice === '2') {
        console.log('\n🚀 Running fetch_tmdb_tv-show_episode_images.js...');
        require('./fetch_tmdb_tv-show_episode_images.js');
    } else {
        console.log('❌ Invalid choice. Please run the script manually:');
        console.log('   node scripts/fetch_tmdb_tv-show_season_images.js');
        console.log('   node scripts/fetch_tmdb_tv-show_episode_images.js');
    }
}

main().catch(console.error); 