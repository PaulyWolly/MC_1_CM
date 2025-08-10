# 🎵 Lyrics API Setup Guide

## Overview
The lyrics feature uses **FREE** APIs that don't require API keys! Some APIs are completely free, while others require free registration.

## API Keys Required (Optional)

Only add this line to your `/server/.env` file if you want Genius API support:

```bash
# Lyrics API Keys (OPTIONAL)
GENIUS_ACCESS_TOKEN=your_genius_access_token_here
```

## Free APIs Used

### 1. Le Wagon Lyrics API (100% FREE - No Registration)
- **URL**: https://lyrics.lewagon.ai/
- **Cost**: Completely free
- **Registration**: Not required
- **Coverage**: Good for popular songs
- **Already integrated**: ✅ Ready to use

### 2. Lyrics.ovh API (100% FREE - No Registration)  
- **URL**: https://api.lyrics.ovh/
- **Cost**: Completely free
- **Registration**: Not required
- **Coverage**: Basic lyrics database
- **Already integrated**: ✅ Ready to use

### 3. Genius API (FREE - Song Info + Links) - OPTIONAL
1. Go to: https://genius.com/api-clients
2. Sign up/login to Genius account  
3. Create a new API client
4. Generate access token
5. Add to `.env`: `GENIUS_ACCESS_TOKEN=your_token_here`

**Free Tier:**
- No specific limits mentioned
- Provides song metadata and links to lyrics
- Cannot provide full lyrics due to copyright

## How It Works

### API Priority Order:
1. **Le Wagon API** - Tries to get full lyrics (FREE)
2. **Lyrics.ovh API** - Falls back if Le Wagon fails (FREE)
3. **Genius API** - Falls back to song info + link if both fail (FREE but requires token)

### Backend Endpoints:
- `POST /api/lyrics/lewagon` - Get lyrics from Le Wagon API
- `POST /api/lyrics/ovh` - Get lyrics from Lyrics.ovh API
- `POST /api/lyrics/genius` - Get song info from Genius (optional)

### Security Benefits:
- ✅ API keys hidden from frontend code
- ✅ Keys stored securely in server environment
- ✅ No risk of key exposure in browser
- ✅ Rate limiting can be implemented server-side

## Testing

After adding the API keys:

1. **Restart your server** [[memory:4905108]]
2. **Search for a music video** in your YouTube search
3. **Click image or "Play in Popup"** to open video
4. **Click the purple 🎵 LYRICS button** 
5. **Check console** for API call logs

## Console Messages to Look For:

```
🎵 [LYRICS] Trying Musixmatch API...
🎵 [LYRICS-API] Fetching from Musixmatch: {artist: "...", title: "..."}
✅ [LYRICS] Lyrics found from backend Musixmatch API
```

## Troubleshooting

### No Lyrics Found:
- Check if API keys are correctly added to `.env`
- Restart server after adding keys
- Check server console for error messages
- Try with popular songs first (better coverage)

### API Errors:
- Verify API keys are valid and active
- Check API rate limits haven't been exceeded
- Ensure `.env` file is in `/server/` directory

## File Structure:
```
server/
├── .env                    # Add API keys here
├── routes/
│   └── lyrics.routes.js    # Backend API handlers
└── server.js               # Routes registered here

public/components/YouTubeSearch/
└── YouTubeSearchManager.js # Frontend calls backend
```

## Next Steps:
1. Get API keys from Musixmatch and Genius
2. Add keys to `/server/.env`  
3. Restart server
4. Test with popular music videos
5. Enjoy lyrics! 🎵
