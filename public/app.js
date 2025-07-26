/*
  APP.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

// =====================================================
// IMPORTS NEEDED FOR NEW ES6 MODULES
// =====================================================

import playlistManager from './components/PlaylistManager.js';
import toastManager from './components/ToastManager.js';
import youtubeSearchManager from './components/YouTubeSearch/YouTubeSearchManager.js';
import quotaManager from './components/QuotaMonitor/QuotaMonitor.js';
import audioManager from './components/AudioManager.js';
import myJokesManager from './components/MyJokesManager/MyJokesManager.js';
import recipeManager from './components/RecipeManager/RecipeManager.js';
import VideoPlayer from './components/VideoPlayer/VideoPlayer.js';
import MediaLibraryManager from './components/MediaLibrary/MediaLibraryManager.js';

// =====================================================
// MANAGER INITIALIZATION
// =====================================================

// Initialize PlaylistManager globally
console.log('Initializing PlaylistManager...');
const playlistManagerInstance = new playlistManager();
window.playlistManager = playlistManagerInstance;
console.log('PlaylistManager initialized:', window.playlistManager);

// Initialize ToastManager globally
console.log('Initializing ToastManager...');
const toastManagerInstance = new toastManager();
window.toastManager = toastManagerInstance;
console.log('ToastManager initialized:', window.toastManager);

// Initialize YouTubeSearchManager
console.log('Initializing YouTubeSearchManager...');
const youtubeSearchManagerInstance = new youtubeSearchManager();
window.youtubeSearchManager = youtubeSearchManagerInstance;
await window.youtubeSearchManager.init();
console.log('YouTubeSearchManager initialized.');

// mediaLibraryBtn test for click
console.log('[DEBUG] At script load, mediaLibraryBtn:', document.getElementById('mediaLibraryBtn'));

// mutationObserver for button click
const observer = new MutationObserver(() => {
    const btn = document.getElementById('mediaLibraryBtn');
    if (btn && !btn._debugClickAttached) {
        btn._debugClickAttached = true;
        btn.addEventListener('click', function() {
            console.log('[DEBUG] Media Library button clicked via MutationObserver');
        });
        console.log('[DEBUG] Media Library button found and click handler attached via MutationObserver');
    }
});
observer.observe(document.body, { childList: true, subtree: true });


// Make cache repopulation functions globally accessible
window.repopulateYouTubeCache = (maxQueries = 10) => {
    return window.youtubeSearchManager.repopulateSearchCache(maxQueries);
};

// Repopulate cache from clicked videos (no API calls!)
window.repopulateCacheFromClicks = (maxQueries = 10) => {
    return window.youtubeSearchManager.repopulateCacheFromClickedVideos(maxQueries);
};

// Restore cache from MongoDB saved search results (no API calls!)
window.restoreCacheFromMongoDB = async (maxQueries = 10) => {
    console.log('🔄 [RESTORE] Starting cache restoration from MongoDB...');
    
    try {
        // Get all database queries
        const response = await fetch('/api/youtube/history/list');
        const result = await response.json();
        const dbQueries = result.queries.slice(0, maxQueries);
        
        console.log(`📊 [RESTORE] Will attempt to restore ${dbQueries.length} queries from MongoDB`);
        
        let restoredCount = 0;
        let notFoundCount = 0;
        
        for (const queryObj of dbQueries) {
            try {
                const restoreResponse = await fetch(`/api/youtube/restore-cache/${encodeURIComponent(queryObj.query)}`);
                const restoreData = await restoreResponse.json();
                
                if (restoreData.success && restoreData.pages.length > 0) {
                    // Restore each page to localStorage
                    for (const page of restoreData.pages) {
                        const cacheKey = `yt_search_${queryObj.query.toLowerCase().replace(/\s+/g, '_')}_p${page.page}_none`;
                        const cacheData = {
                            videos: page.videos,
                            page: page.page,
                            timestamp: new Date(page.timestamp).getTime(),
                            fromMongoDB: true
                        };
                        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
                    }
                    console.log(`✅ [RESTORE] Restored ${restoreData.pages.length} pages for "${queryObj.query}"`);
                    restoredCount++;
                } else {
                    console.log(`⚠️ [RESTORE] No MongoDB data found for "${queryObj.query}"`);
                    notFoundCount++;
                }
            } catch (error) {
                console.error(`❌ [RESTORE] Error restoring "${queryObj.query}":`, error);
                notFoundCount++;
            }
        }
        
        console.log(`🎯 [RESTORE] Complete: ${restoredCount} restored, ${notFoundCount} not found`);
        
        // Refresh dropdown
        const updatedQueries = window.youtubeSearchManager.getAllQueriesForDropdown();
        await window.youtubeSearchManager.renderQueryDropdown(updatedQueries, null);
        
        if (window.showToast) {
            if (restoredCount > 0) {
                window.showToast(`Restored ${restoredCount} queries from MongoDB database`, 'success');
            } else {
                window.showToast('No cached data found in MongoDB. Start clicking queries to build cache!', 'info');
            }
        }
        
        return { restoredCount, notFoundCount, totalProcessed: dbQueries.length };
        
    } catch (error) {
        console.error('❌ [RESTORE] Error during MongoDB restoration:', error);
        if (window.showToast) {
            window.showToast('Error restoring cache from MongoDB', 'error');
        }
        return { restoredCount: 0, notFoundCount: 0, totalProcessed: 0 };
    }
};

// Clear all YouTube cache (fresh start!)
window.clearYouTubeCache = () => {
    console.log('🧹 [CLEAR-CACHE] Starting YouTube cache cleanup...');
    
    let clearedCount = 0;
    const keysToRemove = [];
    
    // Find all YouTube cache keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('yt_')) {
            keysToRemove.push(key);
        }
    }
    
    console.log(`🔍 [CLEAR-CACHE] Found ${keysToRemove.length} YouTube cache keys to remove`);
    
    // Remove all YouTube cache keys
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        clearedCount++;
        console.log(`🗑️ [CLEAR-CACHE] Removed: ${key}`);
    });
    
    // Also clear any YouTube-related session storage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('youtube') || key.includes('nextPageToken'))) {
            sessionKeysToRemove.push(key);
        }
    }
    
    sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️ [CLEAR-SESSION] Removed: ${key}`);
    });
    
    console.log(`✅ [CLEAR-CACHE] Successfully cleared ${clearedCount} localStorage keys and ${sessionKeysToRemove.length} sessionStorage keys`);
    console.log('🎉 [CLEAR-CACHE] YouTube cache is now completely clean!');
    console.log('💡 [CLEAR-CACHE] All future searches will use fresh API calls and the new MongoDB storage system');
    
    // Refresh the dropdown to show all entries as "DB"
    if (window.youtubeSearchManager && window.youtubeSearchManager.renderQueryHistory) {
        window.youtubeSearchManager.renderQueryHistory();
    }
    
    if (window.showToast) {
        window.showToast(`Cleared ${clearedCount} YouTube cache entries. Ready for fresh start!`, 'success');
    }
    
    return {
        localStorageCleared: clearedCount,
        sessionStorageCleared: sessionKeysToRemove.length,
        totalCleared: clearedCount + sessionKeysToRemove.length
    };
};

// Global quota management functions
window.setQuotaUsage = (used) => {
    return window.quotaManager.setQuotaUsage(used);
};

window.getQuotaInfo = () => {
    return window.quotaManager.getDetailedQuotaInfo();
};

window.fixQuotaTracking = () => {
    console.log('🔧 [QUOTA-FIX] Use setQuotaUsage(number) to manually set quota usage');
    console.log('🔧 [QUOTA-FIX] Use getQuotaInfo() to see current quota status');
    console.log('🔧 [QUOTA-FIX] Example: setQuotaUsage(9500) to set quota to 9500/10000');
};

// Initialize QuotaManager globally
console.log('Initializing QuotaManager...');
const quotaManagerInstance = new quotaManager();
window.quotaManager = quotaManagerInstance;
await window.quotaManager.init(window.appConfig);
console.log('QuotaManager initialized:', window.quotaManager);

// Initialize VideoPlayer globally
console.log('Initializing VideoPlayer...');
const videoPlayerInstance = new VideoPlayer();
window.videoPlayer = videoPlayerInstance;
console.log('VideoPlayer initialized:', window.videoPlayer);

// Initialize AudioManager globally
console.log('Initializing AudioManager...');
const audioManagerInstance = new audioManager(window.appConfig);
window.audioManager = audioManagerInstance;
console.log('AudioManager initialized:', window.audioManager);

// Initialize MyJokesManager globally
console.log('Initializing MyJokesManager...');
const myJokesManagerInstance = new myJokesManager();
window.myJokesManager = myJokesManagerInstance;
await window.myJokesManager.init();
console.log('MyJokesManager initialized:', window.myJokesManager);

// Initialize RecipeManager globally
console.log('Initializing RecipeManager...');
const recipeManagerInstance = new recipeManager();
window.recipeManager = recipeManagerInstance;
await window.recipeManager.init();
console.log('RecipeManager initialized:', window.recipeManager);

// Global helper to show a recipe modal
window.showRecipeModal = function(recipeText, imageUrls = []) {
  window.recipeManager.showRecipe(recipeText, imageUrls);
};



// =====================================================
// GLOBAL SCOPED CONSTANTS
// =====================================================

const SHOW_VOICE_DROPDOWN = false;

// Time constants
const INTERVAL = 10;  // Set timeout duration in minutes
const CONVERSATION_INACTIVITY_TIMEOUT = INTERVAL * 60 * 1000;  // Convert minutes to milliseconds

// Memory categories
const MEMORY_CATEGORIES = {
    event: /(?:tomorrow|next|on|at)\s+(.+)/i,
    preference: /(?:like|love|hate|prefer)\s+(.+)/i,
    fact: /(?:is|are|was|were)\s+(.+)/i,
    location: /(?:at|in|near|around)\s+(.+)/i,
    time: /(?:at|every|during)\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i
};

// Add keyword patterns at the top with other constants
const MEMORY_KEYWORDS = {
    'phrase that pays': {
        store: /(?:the )?phrase that pays (?:is|=) (.+)/i,
        retrieve: /what(?:'s| is)(?: the)? phrase that pays/i
    },
    'passphrase': {
        store: /(?:the )?passphrase (?:is|=) (.+)/i,
        retrieve: /what(?:'s| is)(?: the)? passphrase/i
    },
    'secret word': {
        store: /(?:the )?secret word (?:is|=) (.+)/i,
        retrieve: /what(?:'s| is)(?: the)? secret word/i
    },
    'favorite': {
        store: /(?:my )?favorite (\w+) (?:is|=) (.+)/i,
        retrieve: /what(?:'s| is) (?:my )?favorite (\w+)/i,
    },
    'remember': {
        store: /^remember (?:that )?([^(is)].+)/i,  // Don't match if contains "is"
        retrieve: /what (?:did I|about|was) (.+)/i
    }
};


// Add at the top with other constants
const MIC_INITIALIZATION_DELAY = 4000;  // 4 seconds delay

// Add the MESSAGES constant
const MESSAGES = {
    STATUS: {
        DEFAULT: `<span class="status-default-conversation-msg">Click the <span class="status-keyword">Conversation Mode</span> checkbox, press the <span class="status-keyword">Microphone</span> button to enable conversations, or enter a message and press Send</span>`,
        LISTENING: "Listening...",
        AISPEAKING: "AI is speaking...",
        SPEAKING: "AI is Speaking...",
        PROCESSING: "Processing...",
        READY: "Ready",
        ERROR: "Error occurred. Please refresh the page if issues persist.",
        INITIALIZING: "Initializing app...",
        VIDEO_PLAYING: 'Video playing...'
    },
    CONVERSATION: {
        ENABLE: "Conversation Mode enabled. Say 'exit' to end the conversation.",
        DISABLE: "Conversation Mode has been disabled. You can still type messages or click the microphone button for single responses.",
        EXIT: 'Conversation ended'
    },
    CLOSINGS: {
        EXIT: "Okay. Bye for now. We'll chat later!",
        TIMEOUT: (minutes) => `I haven't heard anything for ${minutes} minutes, so I'll end our conversation now. Feel free to restart Conversation Mode when you'd like to chat again!`
    },
    ERRORS: {
        INIT: "Error initializing app. Please refresh the page.",
        MIC_PERMISSION: "Microphone permission denied. Please enable it in your browser settings.",
        CONNECTION: "Connection error. Please refresh the page.",
        EXIT: "Error occurred during exit. Please refresh the page if issues persist."
    }
};
window.MESSAGES = MESSAGES;

// Add at the top with other constants
const AUDIO_CONFIG = {
    minChunkLength: 10,
    maxChunkLength: 150,
    pauseDuration: 400,
    maxRetries: 3,
    retryDelay: 1000,
    defaultVoice: 'en-US-AndrewNeural',
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,  // Fixed full volume
    apiUrl: window.appConfig.getApiUrl('tts')
};

// Add this at the top with other constants
const SPEECH_CONFIG = {
    retryDelay: 1000,
    maxRetries: 3,
    initDelay: 500,
    silenceTimeout: 1500,    // Wait 1.5s of silence before processing
    continuous: true,        // Keep recognition running
    interimResults: true,    // Get interim results
    language: 'en-US'
};

// Add at the top with other constants
// const DUMMY_PREFIX = "....................-------------------------...................................";
// const TTS_IDLE_THRESHOLD = 60000; // 60 seconds

const slideoutPanel = document.getElementById('slideout-panel-left');
const slideoutBar = document.getElementById('slideout-bar');
const tempSlider = document.getElementById('temperature-slider');
const tempValue = document.getElementById('temperature-value');
const toppSlider = document.getElementById('top-p-slider');
const topPValue = document.getElementById('top-p-value');

// Custom prompt logic
const customPromptInput = document.getElementById('custom-prompt');
const removeCustomPromptBtn = document.getElementById('remove-custom-prompt-btn');
let customPrompt = '';

if (customPromptInput) {
  customPromptInput.addEventListener('input', () => {
    customPrompt = customPromptInput.value;
  });
}
if (removeCustomPromptBtn) {
  removeCustomPromptBtn.addEventListener('click', () => {
    customPrompt = '';
    if (customPromptInput) customPromptInput.value = '';
  });
}

// Show panel on hover or click
slideoutBar.addEventListener('mouseenter', () => {
  slideoutPanel.classList.add('open');
});
slideoutPanel.addEventListener('mouseleave', () => {
  slideoutPanel.classList.remove('open');
});

// (Optional) Keep open on click
slideoutBar.addEventListener('click', () => {
  slideoutPanel.classList.toggle('open');
});

// Update value displays
tempSlider.addEventListener('input', () => {
  tempValue.textContent = Number(tempSlider.value).toFixed(2);
});
toppSlider.addEventListener('input', () => {
  topPValue.textContent = Number(toppSlider.value).toFixed(2);
});

// =====================================================
// GLOBAL SCOPED VARIABLES
// =====================================================


// =====================================================
// SYSTEM PROMPT
// =====================================================

// Ensure the default system prompt is loaded
const systemPrompt = `You are a helpful assistant with full image search capabilities.

REGARDING GENERAL QUERIES:
1. ALWAYS respond with a polite and constructive response.
2. ALWAYS provide helpful and accurate information.
3. ALWAYS keep responses concise and relevant.
4. NEVER use markdown symbols like #, *,**, ***, or _.
5. For recipes and lists:
    - Use plain numbers and letters (1., 2., 3., etc.)
    - Write ingredient lists and steps without special formatting
    - Present information in clear, simple text format
    - When providing a recipe, always use the exact name of the requested dish 
        in the title (first line) and throughout the content. The title must match 
        the user's query and the spelling used in the rest of the response. 
        Do not use alternate spellings or variations. 
    - DO NOT append the word "RECIPE" to the title, just output the recipe title.
    - NEVER SPELL OUT the title as letter for letter, just output the recipe title normally.
    - Add a space and a PAUSE after the title then provide the description      
    - ALWAYS format recipes exactly like this:
        RECIPE NAME IN TitleCase ONLY
        [space]
        Here is a delicious recipe for [recipe name].
        [space]
        A brief description of the recipe.
        [space]
        Ingredients:
        1. First ingredient with exact measurement
        2. Second ingredient with exact measurement
        3. Each ingredient on its own line with number
        [space]
        Instructions:
        1. First step in clear, concise language
        2. Second step with specific temperatures/times
        3. Each step on its own line with number
        [space]
        Enjoy your [recipe name]!
    


6. General responses: When asked for a response, ALWAYS provide at least 2-4 paragraphs of text.
7. Story responses: When telling a story or providing a longer response, break the response into paragraphs of 4-5 sentences each. 
8. Always add a blank line between paragraphs.
9. When telling a story or providing a longer response, use expressive language, varied punctuation (such as !, ?, …), and include relevant emojis to convey emotion, action, or mood. Make the output engaging and lively.

CRITICAL INSTRUCTIONS FOR IMAGE REQUESTS:
1. Never respond with "Here are some relvenat images for [topic]" at the start
2. DO NOT provide image URLs or links
3. DO NOT mention being an AI or having any limitations
4. DO NOT apologize for image-related capabilities
5. Keep responses about images brief and positive
6. When users ask for images, respond with images, at the end of the response.

SPECIAL ABBREVIATION INSTRUCTIONS:
1. Whenever you would output "U.S." or "U.S.A." in a response, instead output "United States" or "United States of America" respectively.
2. Do not use the abbreviations "U.S." or "U.S.A." in your answers; always use the full country name.

`;

// Append custom prompt if present
// let customPromptInput = document.getElementById('custom-prompt');
let customPromptValue = customPromptInput ? customPromptInput.value.trim() : '';
let finalSystemPrompt = systemPrompt;
if (customPromptValue.length > 0) {
  finalSystemPrompt = `${systemPrompt}\n\n${customPromptValue}`;
}

// =====================================================
// GLOBAL SCOPED ELEMENTS
// =====================================================

// Elements
const elements = {
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    micButton: document.getElementById('mic-button'),
    microphoneButton: document.getElementById('mic-button'),
    chatMessages: document.getElementById('chat-messages'),
    status: document.getElementById('status'),
    conversationModeToggle: document.getElementById('conversation-mode'),
    modelSelect: document.getElementById('model-select'),
    stopAudioButton: document.getElementById('stop-audio-button'),
    processingIndicator: document.getElementById('processing-indicator'),
    imageUploadBtn: document.getElementById('image-upload-btn'),
    imageInput: document.getElementById('image-input'),
    conversationStatus: document.getElementById('conversation-status'),
    videoContainer: document.getElementById('youtube-container'),
};

// =====================================================
// GLOBAL SCOPED STATE
// =====================================================

// State
const state = {
    recognition: null,
    isListening: false,
    isProcessing: false,
    isAISpeaking: false,
    isConversationMode: false,
    conversationHistory: [],
    currentAudio: null,
    isSending: false,
    messageCounter: 0,
    selectedModel: 'gpt-4o-mini',
    selectedVoice: localStorage.getItem('selectedVoice') || null, // Initialize from localStorage
    audioQueue: [],
    isPlaying: false,
    isRendering: false,
    stopRequested: false,
    selectedImage: null,
    inactivityTimer: null,
    lastAudioInput: Date.now(),
    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    eventSource: null,  // Track EventSource connection
    shortTermMemory: {},
    sseRetryCount: 0,
    sseMaxRetries: 5,
    sseRetryDelay: 1000,
    savingJoke: false,
    pendingNameChange: null,
    lastRequestTime: Date.now(),
    lastTTS: 0, // Add to global state
    isImagePickerOpen: false,  // Add this line to track file picker state
    selectedImageFileName: null, // Add to global state
    pendingInitials: null
    
};

// Add to global state
state.selectedVoice = 'en-US-AndrewNeural'
window.state = state;

// =====================================================
// GLOBAL SCOPED SESSION ID
// =====================================================

// Structured session configuration
const PERSISTENT_SESSION = {
    id: 'persistent-storage-001',
    version: 'v1',
    type: 'global',
    created: new Date().toISOString()
};

// Create structured sessionId
const sessionId = `${PERSISTENT_SESSION.type}-${PERSISTENT_SESSION.id}-${PERSISTENT_SESSION.version}`;

// Make session info globally available
window.sessionId = sessionId;
window.sessionInfo = PERSISTENT_SESSION;

// Session validation helper
function isValidSessionId(sid) {
    const parts = sid.split('-');
    return (
        parts.length === 3 &&
        ['global', 'user', 'admin'].includes(parts[0]) &&
        /^v\d+$/.test(parts[2])
    );
}

// =====================================================
// AUDIO FUNCTIONS
// =====================================================


// Queue audio chunk function
async function queueAudioChunk(text) {

    
    // First, check if this chunk is part of a split initial sequence
    // This handles cases where the AI splits "H.G. Wells" across multiple chunks
    if (text.trim() === 'H.' || text.trim() === 'G.') {
        // Store this chunk temporarily and wait for the next chunk
        if (!state.pendingInitials) {
            state.pendingInitials = text.trim();
            return; // Skip this chunk for now
        } else {
            // We have both initials, combine them
            text = state.pendingInitials + text.trim();
            state.pendingInitials = null;
        }
    }
    
    // Also handle cases where we have "H." at the end of a chunk
    if (text.endsWith(' H.') || text.endsWith(' G.')) {
        const lastChar = text.slice(-2);
        if (!state.pendingInitials) {
            state.pendingInitials = lastChar;
            text = text.slice(0, -2);
        } else {
            text = text.slice(0, -2) + state.pendingInitials + lastChar;
            state.pendingInitials = null;
        }
    }
    
    // Handle cases where we have "Wells" at the start of a chunk
    if (text.trim().startsWith('Wells')) {
        if (state.pendingInitials) {
            text = state.pendingInitials + text.trim();
            state.pendingInitials = null;
        }
    }
    
    // Generic pattern to match any sequence of initials (1-3 letters) followed by a last name
    const initialPattern = /([A-Z]\.?\s*){1,3}([A-Z][a-z]+)/g;
    
    // First pass: Replace all initial sequences with a single unit
    text = text.replace(initialPattern, (match) => {
        console.log('Found initial sequence:', match);
        // Remove all spaces and periods between initials
        const result = match.replace(/[\s\.]+/g, '');
        console.log('Converted to:', result);
        return result;
    });
    
    console.log('After initial replacement:', text);
    
    // Also handle cases where it's part of a phrase
    text = text.replace(/(?:by|from|of|based on)\s+([A-Z]\.?\s*){1,3}([A-Z][a-z]+)/g, (match) => {
        console.log('Found phrase with initials:', match);
        // Keep the preposition but join the initials
        const result = match.replace(/([A-Z]\.?\s*){1,3}([A-Z][a-z]+)/g, (name) => {
            return name.replace(/[\s\.]+/g, '');
        });
        console.log('Converted phrase to:', result);
        return result;
    });
    
    console.log('After phrase replacement:', text);
    
    // Protect honorifics and abbreviations before TTS
    text = protectHonorifics(text);
    text = preprocessForTTS(text);
    console.log('After TTS preprocessing:', text);
    
    state.stopRequested = false;

    if (!state.isAISpeaking) {
        // state.isAISpeaking = true;
        updateStopAudioButton();  // Show button
    }

    console.log('Queueing audio chunk:', text);
    
    // Split into sections, but preserve our protected names
    const sections = text.split(/(?=Ingredients:|Instructions:)/);
    let chunks = [];

    sections.forEach(section => {
        const sectionChunks = splitTextIntoChunks(section, 200);
        chunks = chunks.concat(sectionChunks);
    });
    
    console.log('[CHUNKS] Chunks before post-processing:', chunks);
    
    // Final safety check - look for any remaining split instances of initials
    for (let i = 0; i < chunks.length - 2; i++) {
        const current = chunks[i].trim();
        const next = chunks[i + 1].trim();
        const nextNext = chunks[i + 2].trim();
        
        // Check for any remaining split initial patterns
        if (
            /^[A-Z]\.?$/i.test(current) && // First initial
            /^[A-Z]\.?$/i.test(next) &&    // Second initial
            /^[A-Z][a-z]+/i.test(nextNext) // Last name
        ) {
            console.log('Found split initials:', {current, next, nextNext});
            // Join them together without spaces or periods
            const joined = current.replace(/\./g, '') + 
                          next.replace(/\./g, '') + 
                          nextNext;
            console.log('Joined into:', joined);
            chunks.splice(i, 3, joined);
        }
    }
    // NEW: Merge a chunk that is just initials (e.g., 'HG') with the next chunk if it starts with a last name (e.g., 'Wells')
    for (let i = 0; i < chunks.length - 1; i++) {
        const current = chunks[i].trim();
        const next = chunks[i + 1].trim();
        // Match 2-3 uppercase letters (no punctuation or spaces)
        if (/^[A-Z]{2,3}$/.test(current) && /^[A-Z][a-z]+/.test(next)) {
            console.log('Merging split initials and last name:', {current, next});
            chunks.splice(i, 2, current + ' ' + next);
        }
    }
    
    console.log('[CHUNKS] Chunks after post-processing:', chunks);
    state.audioQueue = state.audioQueue.concat(chunks);
    console.log('[CHUNKS - QUEUE] Queue before playback:', state.audioQueue);
    console.log('[CHUNKS - QUEUE] Final queued chunks:', chunks);
    if (!state.isPlaying) {
        playNextInQueue();
        console.log('[CHUNKS - QUEUE] playNextInQueue called for - !state.isPlaying');
    }
}
window.queueAudioChunk = queueAudioChunk;

// Update the playAudio function
async function playAudio(text) {
    if (!text) return;
    text = preprocessForTTS(text);
    
    try {
        updateStopAudioButton();  // Show button

        state.isPlaying = true;

        const response = await fetch(AUDIO_CONFIG.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                voice: AUDIO_CONFIG.defaultVoice,
                rate: AUDIO_CONFIG.rate,
                pitch: AUDIO_CONFIG.pitch,
                volume: AUDIO_CONFIG.volume
            })
        });

        if (!response.ok) throw new Error(`TTS API error: ${response.status}`);
        
        const audioBlob = await response.blob();
        if (audioBlob.size === 0) throw new Error('Empty audio response');

        if (state.currentAudio) {
            state.currentAudio.pause();
            state.currentAudio = null;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        state.currentAudio = new Audio(audioUrl);
        state.currentAudio.volume = AUDIO_CONFIG.volume;

        await new Promise((resolve, reject) => {
            state.currentAudio.onended = resolve;
            state.currentAudio.onerror = reject;
            state.currentAudio.play().catch(reject);
            state.selectedVoice = 'en-US-AndrewNeural'
        });

        URL.revokeObjectURL(audioUrl);

    } catch (error) {
        console.error('Error playing audio:', error);
    } finally {
        // state.isAISpeaking = false;
        // state.isPlaying = false;
        // elements.stopAudioButton.style.display = 'none';

        // FIXED: Enter listening mode after audio playback
        enterListeningMode();

        // if (state.isConversationMode) {
        //     enterListeningMode();
        // } else {
        //     updateStatus('Ready');
        // }
    }
}

// Split text into chunks function
function splitTextIntoChunks(text, maxLength = 200) {
    // Split text into sentences, keeping the punctuation
    const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxLength) {
            if (currentChunk) {
            chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            if (sentence.length > maxLength) {
                // Split long sentences into words
                const words = sentence.split(/\s+/);
                for (const word of words) {
                    if (currentChunk.length + word.length > maxLength) {
                        chunks.push(currentChunk.trim());
                        currentChunk = '';
                    }
                    currentChunk += (currentChunk ? ' ' : '') + word;
                }
        } else {
                currentChunk = sentence;
        }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
    }
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

async function playNextInQueue() {
    if (!state.audioQueue.length || state.isPlaying || state.stopRequested) {
        if (!state.audioQueue.length || state.stopRequested) {
            // Only now, after ALL audio is done, switch to listening mode
            enterListeningMode();
        }
        return;
    }

    // Only set AISpeaking mode at the start of playback
    if (!state.isAISpeaking) {
        enterAISpeakingMode();
        if (elements.stopAudioButton) elements.stopAudioButton.style.display = 'block'; // Force show
    } else {
        if (elements.stopAudioButton) elements.stopAudioButton.style.display = 'block'; // Force show
    }

    state.isPlaying = true;

    const text = state.audioQueue[0]; // Do not shift yet

    try {
        const response = await fetch(window.appConfig.getApiUrl('/api/tts'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                voice: window.appConfig.getTTSVoice(),
                rate: 0.9,
                pitch: 1,
                volume: 1
            })
        });

        if (!response.ok) throw new Error(`TTS API error: ${response.status}`);

        const audioBlob = await response.blob();
        if (audioBlob.size === 0) throw new Error('Empty audio response');

        if (state.currentAudio) {
            state.currentAudio.pause();
            state.currentAudio = null;
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        state.currentAudio = new Audio(audioUrl);
        state.currentAudio.volume = 1;

        state.currentAudio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            state.audioQueue.shift();
            state.isPlaying = false;

            if (state.stopRequested) {
                // If stop was requested, do not continue playback
                state.currentAudio = null;
                enterListeningMode();
                return;
            }

            if (state.audioQueue.length > 0 && !state.stopRequested) {
                setTimeout(playNextInQueue, 0); // Schedule next chunk
            } else {
                // Only after ALL audio is done, switch to listening mode
                enterListeningMode();
            }
        };

        state.currentAudio.onerror = (error) => {
            console.error('🔊 [AUDIO] Playback error:', error);
            state.audioQueue.shift();
            state.isPlaying = false;
            if (state.stopRequested) {
                state.currentAudio = null;
                enterListeningMode();
                return;
            }
            if (state.audioQueue.length > 0 && !state.stopRequested) {
                setTimeout(playNextInQueue, 0); // Schedule next chunk
            } else {
                enterListeningMode();
            }
        };

        await state.currentAudio.play();

        // If stop is requested after playback starts, stop immediately
        if (state.stopRequested) {
            if (state.currentAudio) {
                state.currentAudio.pause();
                state.currentAudio.currentTime = 0;
                state.currentAudio = null;
            }
            state.isPlaying = false;
            enterListeningMode();
            return;
        }
    } catch (error) {
        console.error('🔊 [AUDIO] Playback error:', error);
        state.audioQueue.shift();
        state.isPlaying = false;
        if (state.audioQueue.length > 0 && !state.stopRequested) {
            setTimeout(playNextInQueue, 0); // Schedule next chunk
        } else {
            enterListeningMode();
        }
    }
}
window.playNextInQueue = playNextInQueue;

async function prepareAudio(text) {
    const sanitizedText = text
        .replace(/[^\w\s.,!?;:'"()-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!sanitizedText) return null;

    // Use the correct API URL
    const response = await fetchWithRetry(AUDIO_CONFIG.apiUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'audio/wav'
        },
        body: JSON.stringify({
            text: sanitizedText,
            voice: AUDIO_CONFIG.defaultVoice,
            rate: AUDIO_CONFIG.rate,
            pitch: AUDIO_CONFIG.pitch,
            volume: AUDIO_CONFIG.volume
        })
    });

    if (!response.ok) {
        console.error(`TTS API error: ${response.status}`);
        throw new Error(`TTS API error: ${response.status}`);
    }
    
    const audioBlob = await response.blob();
    if (audioBlob.size === 0) throw new Error('Empty audio response');

    const audio = new Audio(URL.createObjectURL(audioBlob));
    await new Promise(resolve => audio.addEventListener('canplaythrough', resolve, { once: true }));
    
    return audio;
}

function fadeAudio(audio, from, to, duration) {
    return new Promise(resolve => {
        const steps = 20;
        const stepTime = duration / steps;
        const stepSize = (to - from) / steps;
        let current = from;
        
        const interval = setInterval(() => {
            current += stepSize;
            audio.volume = Math.max(0, Math.min(1, current));
            
            if ((stepSize > 0 && current >= to) || (stepSize < 0 && current <= to)) {
                clearInterval(interval);
                audio.volume = to;
                resolve();
            }
        }, stepTime);
    });
}

// =====================================================
// HONORIFIC FUNCTIONS
// =====================================================

// Helper functions for honorific handling
function protectHonorifics(text) {
    // Replace honorifics like 'Mr.' with 'Mr~' to prevent sentence splitting
    const honorifics = [
        'Mr', 'Mrs', 'Ms', 'Dr', 'Sr', 'Jr', 'Prof', 'Rev', 'Fr', 'St', 'Mx', 'Capt', 'Lt', 'Col', 'Gen', 'Sgt', 'Adm', 'Maj', 'Hon', 'Pres', 'Gov', 'Amb', 'Sec', 'Supt', 'Rep', 'Sen', 'Treas', 'Dir'
    ];
    honorifics.forEach(honorific => {
        // Replace 'Mr.' with 'Mr~' (case-insensitive)
        text = text.replace(new RegExp(`\\b${honorific}\\.`, 'gi'), `${honorific}~`);
    });
    // Handle initials like H.G. Wells
    text = text.replace(/([A-Z])\\.([A-Z])\\./g, '$1~$2~');
    return text;
}

function restoreHonorifics(text) {
    // Restore 'Mr~' to 'Mr.'
    const honorifics = [
        'Mr', 'Mrs', 'Ms', 'Dr', 'Sr', 'Jr', 'Prof', 'Rev', 'Fr', 'St', 'Mx', 'Capt', 'Lt', 'Col', 'Gen', 'Sgt', 'Adm', 'Maj', 'Hon', 'Pres', 'Gov', 'Amb', 'Sec', 'Supt', 'Rep', 'Sen', 'Treas', 'Dir'
    ];
    honorifics.forEach(honorific => {
        text = text.replace(new RegExp(`${honorific}~`, 'g'), `${honorific}.`);
    });
    // Restore initials
    text = text.replace(/([A-Z])~([A-Z])~/g, '$1.$2.');
    return text;
}

// =====================================================
// TTS PRE-PROCESSING FUNCTIONS
// =====================================================

// Expand common honorifics for TTS
function expandHonorificsForTTS(text) {
    return text
        .replace(/\bDr[\.~]?\s+/gi, 'Doctor ')
        .replace(/\bMr[\.~]?\s+/gi, 'Mister ')
        .replace(/\bMrs[\.~]?\s+/gi, 'Misses ');
}

// Add TTS pre-processing for U.S. and U.S.A.
function preprocessForTTS(text) {
    let processed = text
        // Expand honorifics for TTS
        ;
    processed = expandHonorificsForTTS(processed)
        // Replace specific phrases first
        .replace(/U\.S\. Citizen/gi, 'United States citizen')
        .replace(/U\.S\. government/gi, 'United States government')
        // Replace abbreviations (with or without periods)
        .replace(/U\.S\.A\./gi, 'United States of America')
        .replace(/U\.S\.A/gi, 'United States of America')
        .replace(/U\.S\./gi, 'United States')
        .replace(/U\.S/gi, 'United States')
        .replace(/\bUS\b/g, 'United States')
        // Aggressively protect H.G. Wells and J.K. Rowling (all forms, no spaces between initials)
        .replace(/H\s*\.?\s*G\s*\.?\s*Wells/gi, 'HG Wells')
        .replace(/J\s*\.?\s*K\s*\.?\s*Rowling/gi, 'JK Rowling');
    return processed;
}

// Check if the user's message is an AI greeting response
function isAIGreetingResponse(text) {
    text = text.toLowerCase().trim();

    // Get the exact AI greeting format
    const timeOfDay = getTimeOfDay();
    const aiGreeting = `good ${timeOfDay}! how can i assist you today?`;

    // Check for exact match or user echoing parts of the greeting
    return text === aiGreeting ||
           text === `good ${timeOfDay}` ||
           text === 'how can i assist you today' ||
           text === 'how may i assist you today';
}

// =====================================================
// IMAGE SEARCH FUNCTIONS
// =====================================================

// FIXED: Search and display images
async function searchAndDisplayImages(query, messageElement) {
    try {
        console.log('IMAGE DEBUG: Fetching images for:', query);
        const response = await fetch(window.appConfig.getApiUrl('/api/google-image-search') + '?q=' + encodeURIComponent(query));
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
        }
        const data = await response.json();
        console.log('IMAGE DEBUG: Raw API response:', data);

        if (data.images && data.images.length > 0) {
            console.log('IMAGE DEBUG: Found', data.images.length, 'images');
            
            // Remove duplicates by URL and filter out invalid entries
            const uniqueImages = [];
            const seenUrls = new Set();
            
            for (const item of data.images) {
                if (item.link && item.title && !seenUrls.has(item.link)) {
                    seenUrls.add(item.link);
                    uniqueImages.push(item);
                }
            }
            
            console.log('IMAGE DEBUG: After deduplication:', uniqueImages.length, 'unique images');
            
            if (uniqueImages.length > 0) {
                insertAndStyleImages(uniqueImages, messageElement, '', query);
        }
        }
    } catch (error) {
        console.error('IMAGE DEBUG: Error in searchAndDisplayImages:', error);
    }
}

// Helper to clean the subject for image headings
function cleanImageSubject(subject) {
    if (!subject) return '';
    // Remove leading phrases
    subject = subject.replace(/^here are some relevant images (of|for)\s*/i, '');
    subject = subject.replace(/^here are some images (of|for)\s*/i, '');
    // Remove trailing image request phrases
    subject = subject.replace(/(and|with)? ?(provide|show|display)? ?(images?|pictures?|photos?)\.?$/gi, '');
    // Remove trailing punctuation (period or exclamation mark)
    subject = subject.replace(/[.!]+$/, '');
    // Remove extra whitespace
    return subject.trim();
}

function insertAndStyleImages(images, messageElement, headingText, originalQuery) {
    console.log('[IMAGE DEBUG] insertAndStyleImages called', { images, messageElement, headingText, originalQuery });
    // Add null check to prevent errors
    if (!messageElement) {
        console.warn('insertAndStyleImages: messageElement is null, cannot insert images');
        return;
    }
    // Stronger guard: check for any existing .image-section in the messageElement
    const existingImageSection = messageElement.querySelector('.image-section');
    if (existingImageSection) {
        console.log('[IMAGE DEBUG] image-section already exists, skipping duplicate insert.');
        return;
    }
    
    // Images header for Recipe Images redesigned to use CSS styles
    // Clean the subject for the heading
    let subject = '';
    if (headingText && headingText.trim()) {
        // Try to extract subject from headingText if it contains 'for' or 'of'
        const match = headingText.match(/images (?:of|for) (.+)/i);
        subject = match && match[1] ? cleanImageSubject(match[1]) : cleanImageSubject(headingText);
    } else {
        subject = cleanImageSubject(originalQuery);
    }
    const imageSection = `
    <div class="image-section">
        <!-- Images Heading -->
        <h3 class="recipe-images-heading">
            Here are some relevant images for ${subject}!
        </h3>
        <!-- More Images Button -->
        <button class="more-images-btn">
            More Images
        </button>
        <!-- Scrollable Container -->
        <div class="image-container-scroll">
            <div class="image-container">
            </div>
        </div>
    </div>`;
    
    // Insert the image section at the end of the message element
    messageElement.insertAdjacentHTML('beforeend', imageSection);
    
    // Add images to the new container
    const container = messageElement.querySelector('.image-container');
    if (container) {
        images.forEach(imgObj => {
            const link = document.createElement('a');
            link.href = imgObj.contextLink || imgObj.link;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.className = 'image-link';
            // No inline styles
            const img = document.createElement('img');
            img.src = imgObj.link;
            img.alt = 'image';
            img.className = 'image-link-img';
            link.appendChild(img);
            container.appendChild(link);
        });
    }
    // Store the current query for the "More Images" button
    const imagesSectionElement = messageElement.querySelector('.image-section');
    
    // Add event listener to "More Images" button
    const moreImagesBtn = messageElement.querySelector('.more-images-btn');
    
    imagesSectionElement.setAttribute('data-query', originalQuery); // originalQuery is the actual query string used for the search
    moreImagesBtn.addEventListener('click', () => {
        const query = imagesSectionElement.getAttribute('data-query');
        fetchMoreImages(imagesSectionElement, query);
    });
    // If this message is a recipe, use robustScrollToRecipeResults
    if (messageElement.classList.contains('recipe-card') || messageElement.classList.contains('recipe')) {
        window.forceRecipeScrollToTop = true;
        robustScrollToRecipeResults();
        setTimeout(() => { window.forceRecipeScrollToTop = false; }, 3000); // 3 seconds after images
    } else {
        robustScrollToParentMessage(messageElement);
    }
    // After inserting images
    console.log('[IMAGE DEBUG] Images inserted into DOM. messageElement:', messageElement);
}

function robustScrollToParentMessage(messageElement) {
    // Repeatedly scroll to the top of the parent message element
    const scrollToParent = () => {
        if (window.forceRecipeScrollToTop) {
            // Always scroll to the top of the recipe card
            const recipeCard = document.querySelector('.message.assistant.recipe-card:last-child');
            if (recipeCard) {
                recipeCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return;
            }
        }
        if (messageElement && messageElement.scrollIntoView) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    scrollToParent();
    setTimeout(scrollToParent, 0);
    setTimeout(scrollToParent, 10);
    setTimeout(scrollToParent, 25);
    setTimeout(scrollToParent, 50);
    setTimeout(scrollToParent, 100);
    setTimeout(scrollToParent, 150);
    setTimeout(scrollToParent, 200);
    setTimeout(scrollToParent, 300);
    setTimeout(scrollToParent, 500);
    setTimeout(scrollToParent, 800);
    setTimeout(scrollToParent, 1200);
}

function displayImageResults(images, messageContainer) {
    // messageContainer is the chat message div where images should be shown
    insertAndStyleImages(images, messageContainer);
}


// =====================================================
// JOKE HANDLING
// =====================================================

// joke prompt
const JOKE_PROMPT = `You are a helpful assistant who tells jokes.

When asked for a joke:
1. Provide a short, one-line joke that hasn't been told before
2. Keep it clean and family-friendly
3. Make it concise and easy to understand
4. No markdown or special formatting
`;

// Joke handling module
const handleMyJokes = {
    state: {
        currentTitle: null,
        currentContent: null,
        savingJoke: false
    },

    // Initialize joke handling
    init() {
        // Reset state
        this.resetState();
        // Any other initialization needed
    },

    // Reset state
    resetState() {
        this.state.isRecording = false;
        this.state.currentTitle = '';
        this.state.currentContent = '';
    },

    // Handle incoming messages
    async handleJokeRequest(messageText) {
        // Hide the pagination bar
        //hidePaginationBar();

        const startTime = performance.now();
        console.log('handleJokeRequest received:', messageText);

        // Get patterns first
        const patterns = getPatterns();
        console.log('Checking message against patterns');

        // Check for edit joke commands using patterns
        const editJokeMatch = patterns.editJoke.find(pattern => pattern.test(messageText.toLowerCase()));
        if (editJokeMatch) {
            console.log('Edit joke pattern matched:', editJokeMatch);
            addMessageToChat('user', messageText);

            // Extract the joke title
            const jokeTitle = messageText.match(editJokeMatch)[1].trim();
            console.log('Searching for joke with title (edit mode):', jokeTitle);

            // Temporarily stop listening while retrieving
            if (state.isConversationMode) {
                stopListening();
            }

            try {
                // Use the same normalization as retrieveJoke
                const normalize = t => t.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();
                await window.appConfig.load();
                const response = await fetch(window.appConfig.getApiUrl(`/api/jokes/list-jokes?type=my&sessionId=${window.sessionId}`));
                const data = await response.json();
                let found = null;
                if (data.success && data.jokes && data.jokes.length > 0) {
                    const normalizedTitle = normalize(jokeTitle);
                    found = data.jokes.find(j => normalize(j.title) === normalizedTitle);
                    if (!found) {
                        found = data.jokes.find(j => normalize(j.title).includes(normalizedTitle) || normalizedTitle.includes(normalize(j.title)));
                    }
                }
                if (found) {
                    // Open the edit modal with the joke data
                    window.myJokesManager.showPanel('update', found);
                    // Provide feedback
                    const msg = `Opening editor for your joke: "${found.title}".`;
                    addMessageToChat('assistant', msg);
                    await queueAudioChunk(msg);
                } else {
                    const errorMessage = `Sorry, I couldn't find a joke titled "${jokeTitle}".`;
                    addMessageToChat('assistant', errorMessage);
                    await queueAudioChunk(errorMessage);
                }
            } catch (error) {
                console.error('Error in joke edit:', error);
                const errorMessage = "Sorry, there was an error retrieving your joke for editing.";
                addMessageToChat('assistant', errorMessage);
                await queueAudioChunk(errorMessage);
            }

            // Restore conversation mode after a short delay
            if (state.isConversationMode) {
                setTimeout(() => {
                    if (!state.isAISpeaking && !state.isProcessing) {
                        console.log('Restoring conversation mode after joke edit');
                        startListening();
                        updateStatus(MESSAGES.STATUS.LISTENING);
                    }
                }, 1000);
            }

            return true;
        }

        // If we're in any joke recording state, handle only joke-related responses
        if (this.state.isRecording) {
            console.log('In joke recording state:', this.state.isRecording);

            if (this.state.isRecording === 'waiting_for_title') {
                this.state.currentTitle = messageText;
                const confirmMessage = `Your joke will be titled "${messageText}". Is this correct? Say YES or NO.`;
                addMessageToChat('assistant', confirmMessage, {
                    duration: `${((performance.now() - startTime) / 1000).toFixed(2)}s`,
                    model: 'system',
                    messageType: 'joke'
                });
                await queueAudioChunk(confirmMessage);
                this.state.isRecording = 'confirming_title';
                updateStatus("Waiting for confirmation...");
                return true;
            }
        }

        // Check for list jokes commands using patterns
        const listJokeMatch = patterns.listJokes.find(pattern => pattern.test(messageText.toLowerCase()));
        if (listJokeMatch) {
            console.log('List jokes pattern matched:', listJokeMatch);
            addMessageToChat('user', messageText);
            const showAll = messageText.toLowerCase().includes('all jokes');
            const duration = ((performance.now() - startTime) / 1000).toFixed(2);
            const metadata = { duration: `${duration}s`, model: 'system', messageType: 'joke-list' };
            await this.listJokes(showAll, metadata);
            return true;
        }

        // Check for save joke commands using patterns
        if (patterns.saveJoke.some(pattern => pattern.test(messageText.toLowerCase()))) {
            console.log('Detected save a joke command');
            addMessageToChat('user', messageText);

            const response = "Okay, what is the name of the joke you want to store?";
            addMessageToChat('assistant', response);  // Add message to chat first

            await queueAudioChunk(response);  // Use queueAudioChunk for consistent audio
            this.state.isRecording = 'waiting_for_title';
            updateStatus("Waiting for joke title...");
            if (state.isConversationMode) {
                stopListening();  // Stop listening while waiting for title
            }
            return true;
        }

        if (this.state.isRecording === 'waiting_for_title') {
            addMessageToChat('user', messageText);
            this.state.pendingTitle = messageText;
            const confirmMessage = `I heard "${messageText}". Is this the correct name for your joke? Say YES or NO.`;
            addMessageToChat('assistant', confirmMessage);  // Add message to chat first
            await speak(confirmMessage);  // Then speak it
            this.state.isRecording = 'confirming_title';
            updateStatus("Waiting for confirmation...");
            return true;
        }

        if (this.state.isRecording === 'confirming_title') {
            addMessageToChat('user', messageText);
            if (messageText.toLowerCase() === 'yes') {
                this.state.currentTitle = this.state.pendingTitle;
                const startMessage = "Okay, start telling your joke. Say COMPLETE when you're finished.";
                addMessageToChat('assistant', startMessage);  // Add message to chat first
                await speak(startMessage);  // Then speak it
                this.state.isRecording = 'recording';
                updateStatus("Recording your joke...");
            } else if (messageText.toLowerCase() === 'no') {
                const retryMessage = "Okay, what is the name of your joke?";
                addMessageToChat('assistant', retryMessage);  // Add message to chat first
                await speak(retryMessage);  // Then speak it
                this.state.isRecording = 'waiting_for_title';
                updateStatus("Waiting for joke title...");
            }
            return true;
        }

        if (this.state.isRecording === 'recording') {
            // If we're recording and the message isn't COMPLETE, just collect it
            if (messageText.toUpperCase() !== 'COMPLETE') {
                // Handle special pause commands for spoken jokes
                const pauseWords = ['PAUSE', 'WAIT', 'AHEM'];
                if (pauseWords.some(word => messageText.toUpperCase().includes(word))) {
                    this.state.currentContent += '... ';
                    return true;
                }

                // Add the new text to current content
                this.state.currentContent += messageText + ' ';
                addMessageToChat('user', messageText);
                return true;
            }

            // Only process COMPLETE when user is done telling the joke
            if (messageText.toUpperCase() === 'COMPLETE') {
                if (!this.state.currentContent.trim()) {
                    const errorMessage = "Your joke seems to be empty. Please tell your joke before saying COMPLETE.";
                    addMessageToChat('assistant', errorMessage);
                    await queueAudioChunk(errorMessage);
                    return true;
                }
                addMessageToChat('user', 'COMPLETE');
                updateStatus("Saving your joke...");
                await this.saveJoke();
                this.resetState();
                if (state.isConversationMode) {
                    updateStatus("Listening...");
                } else {
                    updateStatus(MESSAGES.STATUS.DEFAULT);
                }
                return true;
            }

            if (state.isConversationMode) {
                console.log('Restarting listening after joke handling');
                setTimeout(() => {
                    if (!state.isAISpeaking && !state.isProcessing) {
                        startListening();
                        updateStatus(MESSAGES.STATUS.LISTENING);
                    }
                }, 1000);
            }

            return true;
        }

        // Replace the existing joke retrieval section with this updated version
        if (messageText.toLowerCase().includes('tell me my joke about')) {
            try {
                console.log('Joke retrieval request detected');
                addMessageToChat('user', messageText);

                // Extract the joke title more accurately
                const jokeTitle = messageText
                    .toLowerCase()
                    .replace('tell me my joke about', '')
                    .trim();

                console.log('Searching for joke with title:', jokeTitle);

                // Temporarily stop listening while retrieving
                if (state.isConversationMode) {
                    stopListening();
                }

                await this.retrieveJoke(jokeTitle);

                // Restore conversation mode after a short delay
                if (state.isConversationMode) {
                    setTimeout(() => {
                        if (!state.isAISpeaking && !state.isProcessing) {
                            console.log('Restoring conversation mode after joke retrieval');
                            startListening();
                            updateStatus(MESSAGES.STATUS.LISTENING);
                        }
                    }, 1000);
                }

                return true;
            } catch (error) {
                console.error('Error in joke retrieval:', error);
                const errorMessage = "Sorry, there was an error retrieving your joke.";
                addMessageToChat('assistant', errorMessage);
                await queueAudioChunk(errorMessage);

                // Ensure conversation mode is restored even on error
                if (state.isConversationMode) {
                    setTimeout(() => {
                        startListening();
                        updateStatus(MESSAGES.STATUS.LISTENING);
                    }, 1000);
                }
                return true;
            }
        }

        if (messageText.toLowerCase() === 'yes' && sessionStorage.getItem('pendingJoke')) {
            console.log('🎭 [YES DEBUG] Processing YES response for pending joke');
            console.log('🎭 [YES DEBUG] pendingJoke in sessionStorage:', sessionStorage.getItem('pendingJoke'));
            
            try {
                let jokeData;
                try {
                    jokeData = JSON.parse(sessionStorage.getItem('pendingJoke'));
                    console.log('🎭 [JOKE DEBUG] Raw joke data:', jokeData);
                    console.log('🎭 [JOKE DEBUG] Joke content type:', typeof jokeData.content);
                    console.log('🎭 [JOKE DEBUG] Joke content length:', jokeData.content ? jokeData.content.length : 'null/undefined');
                    console.log('🎭 [JOKE DEBUG] Joke content:', JSON.stringify(jokeData.content));
                } catch (error) {
                    console.error('Error parsing stored joke:', error);
                    throw new Error('Invalid stored joke data');
                }
                
                // Validate joke content
                if (!jokeData || !jokeData.content || jokeData.content.trim() === '') {
                    console.error('🎭 [JOKE ERROR] Empty or invalid joke content:', jokeData);
                    
                    const errorMessage = "Sorry, this joke appears to have empty content. There may be an issue with how it was saved.";

                    if (state.isConversationMode) {
                        // Temporarily pause conversation mode during joke playback
                        const wasListening = state.recognition && !state.recognition.stop;
                        if (wasListening) {
                            stopListening();
                        }
                    }

                    addMessageToChat('assistant', errorMessage);
                    await queueAudioChunk(errorMessage);
                    sessionStorage.removeItem('pendingJoke');
                    return true;
                }
                
                // Ensure content is a string and trim any whitespace
                const jokeContent = String(jokeData.content).trim();

                // Add emojis to make jokes visually appealing like story responses
                const enhancedJokeContent = jokeContent
                    .replace(/\bItalian guy\b/gi, '🇮🇹 Italian guy')
                    .replace(/\bPolish guy\b/gi, '🇵🇱 Polish guy') 
                    .replace(/\bgirls?\b/gi, '👩 girls')
                    .replace(/\bbeach\b/gi, '🏖️ beach')
                    .replace(/\bconfused\b/gi, '😕 confused')
                    .replace(/\bchuckles?\b/gi, '😄 chuckles')
                    .replace(/\bsays?\b/gi, '💬 says')
                    .replace(/\breplies?\b/gi, '💬 replies')
                    .replace(/\bpotato\b/gi, '🥔 potato')
                    .replace(/\bpants\b/gi, '👖 pants')
                    .replace(/^/, '🎭 ');

                console.log('🎭 [JOKE DEBUG] Final processed content:', JSON.stringify(jokeContent));
                console.log('🎭 [JOKE DEBUG] Calling addMessageToChat...');
                
                // 1. Show the joke in the chat bubble
                addMessageToChat('assistant', formatStoryParagraphs(enhancedJokeContent), { renderAsHTML: true });

                // 2. Only now set AISpeaking and show Stop Audio
                state.isAISpeaking = true;
                updateStopAudioButton();  // Show button
                
                // 3. Play the joke audio
                console.log('🎭 [JOKE DEBUG] addMessageToChat completed, now queuing audio...');
                if (window.myJokesManager && typeof window.myJokesManager.speakJokeContent === 'function') {
                    await window.myJokesManager.speakJokeContent(jokeContent);
                } else {
                await queueAudioChunk(jokeContent);
                }
                
                console.log('🎭 [JOKE DEBUG] Audio queued, removing from sessionStorage...');
                sessionStorage.removeItem('pendingJoke');
                console.log('🎭 [JOKE DEBUG] Joke display process completed successfully');
            } catch (error) {
                console.error('🎭 [JOKE ERROR] Error playing joke:', error);
                const errorMessage = "Sorry, there was an error displaying your joke.";
                addMessageToChat('assistant', errorMessage);
                await queueAudioChunk(errorMessage);
                sessionStorage.removeItem('pendingJoke');
            } 
            return true;
        }

        if (messageText.toLowerCase() === 'no' && sessionStorage.getItem('pendingJoke')) {
            const response = "Okay, your joke is stored for later retrieval.";
            
            enterAISpeakingMode();

            addMessageToChat('assistant', response);
            await queueAudioChunk(response);
            sessionStorage.removeItem('pendingJoke');
            state.isAISpeaking = false;
            elements.stopAudioButton.style.display = 'none';
            if (state.isConversationMode) {
                updateStatus(MESSAGES.STATUS.LISTENING);
                startListening();
            }
            return true;
        }

        if (messageText.toLowerCase().match(/^delete( my)? joke (?:about |called |titled )?(.+)$/i)) {
            const title = messageText.match(/^delete( my)? joke (?:about |called |titled )?(.+)$/i)[2];
            addMessageToChat('user', messageText);
            await this.confirmDelete(title);
            return true;
        }

        if (messageText.toLowerCase() === 'yes' && sessionStorage.getItem('pendingDelete')) {
            const title = sessionStorage.getItem('pendingDelete');
            await this.deleteJoke(title);
            sessionStorage.removeItem('pendingDelete');
            return true;
        }

        if (messageText.toLowerCase() === 'no' && sessionStorage.getItem('pendingDelete')) {
            const message = "Okay, I won't delete the joke.";
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
            playNextInQueue();
            sessionStorage.removeItem('pendingDelete');
            return true;
        }

        if (messageText.toLowerCase().match(/^update( my)? joke (?:about |called |titled )?(.+)$/i)) {
            const title = messageText.match(/^update( my)? joke (?:about |called |titled )?(.+)$/i)[2];
            addMessageToChat('user', messageText);
            this.state.isRecording = 'updating';
            this.state.currentTitle = title;
            speak("Okay, tell me the new version of your joke. Say COMPLETE when done");
            updateStatus("Recording updated joke...");
            this.state.currentContent = '';
            return true;
        }

        if (this.state.isRecording === 'updating') {
            if (messageText.toUpperCase() === 'COMPLETE') {
                if (!this.state.currentContent.trim()) {
                    const errorMessage = "The updated joke seems to be empty. Please tell the joke before saying COMPLETE.";
                    addMessageToChat('assistant', errorMessage);
                    await queueAudioChunk(errorMessage);
                    return true;
                }
                addMessageToChat('user', messageText);
                await this.updateJoke(this.state.currentTitle, this.state.currentContent);
                this.resetState();
                return true;
            }
            this.state.currentContent += messageText + ' ';
            addMessageToChat('user', messageText);
            return true;
        }

        if (messageText.toLowerCase().includes('search for') ||
            messageText.toLowerCase().includes('look up')) {
            try {
                const query = messageText.replace(/search for|look up/i, '').trim();
                const response = await fetch(window.appConfig.getApiUrl('/api/bing-search'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ query })
                });

                const data = await response.json();
                addMessageToChat('assistant', data.response);
                return;
            } catch (error) {
                console.error('Search error:', error);
            }
        }

        if (messageText.toLowerCase().match(/^search( my)? jokes? (?:for |about |containing )?(.+)$/i)) {
            const searchTerm = messageText.match(/^search( my)? jokes? (?:for |about |containing )?(.+)$/i)[2];
            addMessageToChat('user', messageText);
            await this.searchJokes(searchTerm);
            return true;
        }

        if (messageText.toLowerCase().match(/^delete joke id (\w+)$/i)) {
            const id = messageText.match(/^delete joke id (\w+)$/i)[1];
            addMessageToChat('user', messageText);
            const message = `Are you sure you want to delete joke with ID: ${id}? Say YES to confirm or NO to cancel.`;
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
            sessionStorage.setItem('pendingDelete', id);
            return true;
        }

        return false; // Message wasn't joke-related
    },

    // Save joke to database
    async saveJoke() {
        try {
            const response = await fetch(window.appConfig.getApiUrl('/api/jokes/save-joke'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: this.state.currentTitle,
                    content: this.state.currentContent,
                    userId: window.sessionId  // Uses the persistent sessionId
                })
            });
            const data = await response.json();

            if (data.success) {
                const successMessage = `Great! I've saved your joke. To hear it later, just say 'tell me my joke about ${this.state.currentTitle}'`;
                addMessageToChat('assistant', successMessage);
                await queueAudioChunk(successMessage);
            } else {
                const errorMessage = "Sorry, I couldn't save your joke. Please try again.";
                addMessageToChat('assistant', errorMessage);
                await queueAudioChunk(errorMessage);
            }
        } catch (error) {
            console.error('Error saving joke:', error);
            const errorMessage = "Sorry, there was an error saving your joke.";
            addMessageToChat('assistant', errorMessage);
            await queueAudioChunk(errorMessage);
        } finally {
            if (state.isConversationMode) {
                updateStatus(MESSAGES.STATUS.LISTENING);
                setTimeout(() => {  // Add delay before starting to listen again
                    startListening();
                }, 1000);
            }
        }
    },

    // Retrieve joke from database
    async retrieveJoke(title) {
        const startTime = performance.now();
        addMessageToChat('user', `[Heard as: "${title}"]`);
        try {
            // Normalize the title for matching
            const normalize = t => t.toLowerCase().replace(/[^a-z0-9 ]/gi, '').trim();
            const normalizedTitle = normalize(title);
            console.log('🎭 [RETRIEVE DEBUG] Original title:', title);
            console.log('🎭 [RETRIEVE DEBUG] Normalized title:', normalizedTitle);
            await window.appConfig.load();
            // Fetch all jokes for the user
            const response = await fetch(window.appConfig.getApiUrl(`/api/jokes/list-jokes?type=my&sessionId=${window.sessionId}`));
            const data = await response.json();
            if (data.success && data.jokes && data.jokes.length > 0) {
                // Try to find an exact or partial match (case-insensitive, trimmed)
                let found = data.jokes.find(j => normalize(j.title) === normalizedTitle);
                if (!found) {
                    // Try partial match
                    found = data.jokes.find(j => normalize(j.title).includes(normalizedTitle) || normalizedTitle.includes(normalize(j.title)));
                }
                if (found) {
                    // Fetch the full joke by ID or title as before
                    const jokeResp = await fetch(window.appConfig.getApiUrl(`/api/jokes/get-joke/${encodeURIComponent(found.title)}?sessionId=${window.sessionId}`));
                    const jokeData = await jokeResp.json();
                    if (jokeData.success && jokeData.joke) {
                        state.isAISpeaking = true;
                        updateStopAudioButton();  // Show button
                        updateStatus(MESSAGES.STATUS.AISPEAKING);
                        const message = "I found your joke. Would you like to hear it? Say Yes to hear it or No to cancel.";
                        const endTime = performance.now();
                        const duration = ((endTime - startTime) / 1000).toFixed(2);
                        const messageElement = addMessageToChat('assistant', message);
                        updateMetadata(messageElement, {
                            model: elements.modelSelect.value,
                            duration: duration,
                            tokenCount: 32
                        });
                        await queueAudioChunk(message);
                        sessionStorage.setItem('pendingJoke', JSON.stringify(jokeData.joke));
                        // Always restore listening mode after audio
                        if (state.isConversationMode) {
                            startListening();
                            updateStatus(MESSAGES.STATUS.LISTENING);
                        }
                        return;
                    }
                }
                // If not found, suggest similar jokes
                const suggestions = data.jokes
                    .map(j => j.title)
                    .filter(j => normalize(j).includes(normalizedTitle) || normalizedTitle.includes(normalize(j)) || normalize(j).split(' ').some(word => normalizedTitle.includes(word)));
                const notFoundMsg = `Sorry, I couldn't find a joke titled "${title}".` + (suggestions.length ? ` Did you mean: ${suggestions.join(', ')}?` : '');
                addMessageToChat('assistant', notFoundMsg);
                await queueAudioChunk(notFoundMsg);
                // Always restore listening mode after audio
                if (state.isConversationMode) {
                    startListening();
                    updateStatus(MESSAGES.STATUS.LISTENING);
                }
                return;
            }
        } catch (error) {
            console.error('Error retrieving joke:', error);
            const errorMessage = "Sorry, there was an error retrieving your joke.";
            addMessageToChat('assistant', errorMessage);
            await queueAudioChunk(errorMessage);
            // Always restore listening mode after error
            if (state.isConversationMode) {
                startListening();
                updateStatus(MESSAGES.STATUS.LISTENING);
            }
        }
    },

    // Cleanup method
    cleanup() {
        this.resetState();
        sessionStorage.removeItem('pendingJoke');
    },

    // Add this new method to handleMyJokes
    async listJokes(showAll = false, metadata = {}) {
        const startTime = performance.now();
        try {
            enterAISpeakingMode();

            // Correct API call logic from the backup file
            const endpoint = `/api/jokes/list-jokes?type=my jokes&sessionId=${window.sessionId}`;
            const apiUrl = window.appConfig.getApiUrl(endpoint);
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.success && data.jokes && data.jokes.length > 0) {
                const jokes = data.jokes;
                const filteredJokes = showAll ? jokes : jokes.slice(0, 5);
                const remainingCount = jokes.length - filteredJokes.length;
    
                const messageText = `I found ${jokes.length} joke${jokes.length === 1 ? '' : 's'} in your collection:`;
                const endTime = performance.now();
                const duration = ((endTime - startTime) / 1000).toFixed(2);

                // Create an empty message container to add our styled content to
                const messageElement = addMessageToChat('assistant', '', { allowEmpty: true });
                updateMetadata(messageElement, {
                    model: elements.modelSelect.value,
                    duration: duration,
                    tokenCount: jokes.reduce((acc, j) => acc + j.title.length, 0)
                });
    
                const messageContent = messageElement.querySelector('.message-content');
                messageContent.innerHTML = ''; // Clear any default text
    
                // Add the heading
                const heading = document.createElement('p');
                heading.style.fontWeight = 'bold';
                heading.style.marginBottom = '10px';
                heading.textContent = messageText;
                messageContent.appendChild(heading);
    
                // Add the ordered list of jokes
                const list = document.createElement('ol');
                list.style.paddingLeft = '20px';
                list.style.marginBottom = '10px';
                filteredJokes.forEach(joke => {
                    const item = document.createElement('li');
                    item.textContent = joke.title;
                    list.appendChild(item);
                });
                messageContent.appendChild(list);
    
                // Add the help text and summary
                let helpTextContent = '';
                if (!showAll && remainingCount > 0) {
                    // CORRECTED TEXT: "list all my jokes"
                    helpTextContent += `... and ${remainingCount} more joke${remainingCount === 1 ? '' : 's'}. Say "list all my jokes" to see them all. `;
                }
                helpTextContent += `To hear any joke, say... <span style="font-style: italic;font-weight: bold;">"Tell me my joke about [title]"</span>`;
    
                const helpText = document.createElement('p');
                helpText.style.marginTop = '10px';
                helpText.style.marginBottom = '20px';
                helpText.innerHTML = helpTextContent;
                messageContent.appendChild(helpText);

                // Add the "Add a Joke" button back
                const addJokeBtn = document.createElement('button');
                addJokeBtn.textContent = 'Add a Joke';
                addJokeBtn.className = 'add-joke-btn'; // This class should make it green
                addJokeBtn.onclick = () => {
                    if (window.myJokesManager) {
                        window.myJokesManager.showPanel('save');
                    } else {
                        alert('My Jokes Manager is not loaded.');
                    }
                };
                messageContent.appendChild(addJokeBtn);

                // Queue the audio response
                await queueAudioChunk(messageText);
                for (const joke of filteredJokes) {
                    await queueAudioChunk(joke.title);
                }
                if (!showAll && remainingCount > 0) {
                    await queueAudioChunk(`... and ${remainingCount} more.`);
                }
                await queueAudioChunk(`To hear any joke, say "tell me my joke about" followed by the title.`);
                playNextInQueue();
            
            } else {
                // Handle the case where there are no jokes
                const noJokesMessage = "You don't have any jokes saved yet.";
                const messageElement = addMessageToChat('assistant', '', { allowEmpty: true });
                const messageContent = messageElement.querySelector('.message-content');
                messageContent.innerHTML = ''; // Clear default text
    
                const textNode = document.createTextNode(noJokesMessage);
                messageContent.appendChild(textNode);
    
                // Add the button here as well
                const addJokeBtn = document.createElement('button');
                addJokeBtn.textContent = 'Add a Joke';
                addJokeBtn.className = 'add-joke-btn';
                addJokeBtn.style.marginLeft = '10px';
                addJokeBtn.onclick = () => {
                    if (window.myJokesManager) {
                        window.myJokesManager.showPanel('save');
                    } else {
                        alert('My Jokes Manager is not loaded.');
                    }
                };
                messageContent.appendChild(addJokeBtn);
    
                await queueAudioChunk(noJokesMessage);
                playNextInQueue();
            }
    
        } catch (error) {
            console.error('Error listing jokes:', error);
            const errorMessage = "Sorry, there was an error retrieving your jokes.";
            addMessageToChat('assistant', errorMessage);
            await queueAudioChunk(errorMessage);
            playNextInQueue();
        }
    },

    // Add to handleMyJokes module
    async confirmDelete(title) {
        const message = `Are you sure you want to delete your joke "${title}"? Say YES to confirm or NO to cancel.`;
        addMessageToChat('assistant', message);
        await queueAudioChunk(message);
        sessionStorage.setItem('pendingDelete', title);
        return true;
    },

    // Add to handleMyJokes module
    async updateJoke(title, newContent) {
        try {
            state.isAISpeaking = true;
            updateStopAudioButton();  // Show button

            const response = await fetch(window.appConfig.getApiUrl(`/api/jokes/update-joke/${encodeURIComponent(title)}`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: newContent,
                    userId: window.sessionId
                })
            });
            const data = await response.json();

            if (data.success) {
                const message = `I've updated your joke "${title}"`;
                addMessageToChat('assistant', message);
                await queueAudioChunk(message);
            } else {
                const message = "Sorry, I couldn't find that joke to update.";
                addMessageToChat('assistant', message);
                await queueAudioChunk(message);
            }
        } catch (error) {
            console.error('Error updating joke:', error);
            const errorMessage = "Sorry, there was an error updating your joke.";
            addMessageToChat('assistant', errorMessage);
            await queueAudioChunk(errorMessage);
        } finally {
            state.isAISpeaking = false;
            elements.stopAudioButton.style.display = 'none';
            if (state.isConversationMode) {
                updateStatus(MESSAGES.STATUS.LISTENING);
                startListening();
            }
        }
    },

    // Add to handleMyJokes module
    async searchJokes(searchTerm) {
        try {
            state.isAISpeaking = true;
            updateStopAudioButton();  // Show button

            const response = await fetch(window.appConfig.getApiUrl(`/api/jokes/search-jokes?term=${encodeURIComponent(searchTerm)}`));
            const data = await response.json();

            if (data.success && data.jokes.length > 0) {
                const message = `I found ${data.jokes.length} joke${data.jokes.length > 1 ? 's' : ''} containing "${searchTerm}". Would you like to hear them?`;
                addMessageToChat('assistant', message);
                await queueAudioChunk(message);
                sessionStorage.setItem('searchResults', JSON.stringify(data.jokes));
            } else {
                const message = `I couldn't find any jokes containing "${searchTerm}".`;
                addMessageToChat('assistant', message);
                await queueAudioChunk(message);
            }
        } catch (error) {
            console.error('Error searching jokes:', error);
            const errorMessage = "Sorry, there was an error searching your jokes.";
            addMessageToChat('assistant', errorMessage);
            await queueAudioChunk(errorMessage);
        } finally {
            state.isAISpeaking = false;
            elements.stopAudioButton.style.display = 'none';
            if (state.isConversationMode) {
                enterListeningMode();
            }
        }
    },

    // Migrate jokes between users
    async migrateJokes(fromUserId, toUserId) {
        try {
            const response = await fetch(window.appConfig.getApiUrl('/api/jokes/migrate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fromUserId, toUserId })
            });
            const data = await response.json();
            console.log('Joke migration result:', data);
            return data;
        } catch (error) {
            console.error('Error migrating jokes:', error);
            throw error;
        }
    },

    // Display jokes in a formatted list
    displayJokes(jokes) {
        const jokeList = document.createElement('div');
        jokeList.className = 'joke-list';

        jokes.forEach(joke => {
            const jokeItem = document.createElement('div');
            jokeItem.className = 'joke-item';
            jokeItem.innerHTML = `
                <span class="joke-number">${joke.number}.</span>
                <span class="joke-text">${joke.text}</span>
            `;
            jokeList.appendChild(jokeItem);
        });

        addMessageToChat('system', jokeList.outerHTML);
    },
};


// =====================================================
// MESSAGING FUNCTIONS
// =====================================================


function getCommand(message) {
        const patterns = getPatterns();
    const lowerCaseMessage = message.toLowerCase();

    if (patterns.greetings.some(pattern => pattern.test(lowerCaseMessage))) {
        return 'GREETING';
    }
    if (lowerCaseMessage === 'exit') {
        return 'EXIT';
    }
    if (patterns.time.some(pattern => pattern.test(lowerCaseMessage))) {
        return 'TIME_REQUEST';
    }
    if (patterns.date.some(pattern => pattern.test(lowerCaseMessage))) {
        return 'DATE_REQUEST';
    }
    if (patterns.dateTime.some(pattern => pattern.test(lowerCaseMessage))) {
        return 'DATETIME_REQUEST';
    }
    const searchMatch = lowerCaseMessage.match(/^(search|bing|web|internet)\s+(?:for\s+)?(.+)/i);
    if (searchMatch) {
        return 'WEB_SEARCH';
    }
    if (patterns.youtube.searchVideos.test(lowerCaseMessage) || patterns.youtube.playVideo.test(lowerCaseMessage)) {
        return 'YOUTUBE_REQUEST';
    }
    if (patterns.jokes.listAll.test(lowerCaseMessage) || patterns.jokes.listMine.test(lowerCaseMessage)) {
        return 'JOKE_LIST';
    }
    if (patterns.jokes.getMyJoke.test(lowerCaseMessage)) {
        return 'JOKE_GET';
    }
    if (patterns.saveJoke.some(pattern => pattern.test(lowerCaseMessage))) {
        return 'JOKE_SAVE';
    }
    if (patterns.editJoke[0].test(lowerCaseMessage)) {
        return 'JOKE_EDIT';
    }
        if (state.savingJoke) {
        return 'JOKE_SAVE_CONTENT';
    }

    return 'GENERAL';
}

// Send message function - using SWITCH statement
async function sendMessage(message, isGreeting = false) {
    // This function is now much cleaner, acting as a controller
    // that delegates tasks to other functions based on the command.

    try {
        const command = getCommand(message);
        console.log(`Command identified: ${command}`); // For debugging

        switch (command) {
            case 'GREETING':
                addMessageToChat('user', message);
                const greeting = await generateGreeting();
                addMessageToChat('assistant', greeting, { type: 'greeting' });
                await queueAudioChunk(greeting);
                // Show minimized paginator bar ONLY if a YouTube search has been done
                if (window.youtubeSearchManager?.pagination?.hasSearched) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                break;

            case 'EXIT':
                await exitConversation();
                // Show minimized paginator bar ONLY if a YouTube search has been done
                if (window.youtubeSearchManager?.pagination?.hasSearched) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                break;

            case 'TIME_REQUEST':
            case 'DATE_REQUEST':
            case 'DATETIME_REQUEST':
                addMessageToChat('user', message);
                handleTimeQuery(message); // Assumes handleTimeQuery is refactored to handle this
                // Show minimized paginator bar ONLY if a YouTube search has been done
                if (window.youtubeSearchManager?.pagination?.hasSearched) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                break;

            case 'WEB_SEARCH':
                addMessageToChat('user', message);
                if (window.youtubeSearchManager && window.youtubeSearchManager.pagination && window.youtubeSearchManager.pagination.hasSearched) {
                    window.youtubeSearchManager.hasSwitchedFromYouTube = true;
                    window.youtubeSearchManager.paginatorSwitch();
                }
                const searchMatch = message.match(/^(search|bing|web|internet)\s+(?:for\s+)?(.+)/i);
                const query = searchMatch[2];
                // This part can be moved into its own handler function later
                const requestStartTime = Date.now();
                const response = await fetch(window.appConfig.getApiUrl('/api/bing-search'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                const data = await response.json();
                const messageElement = addMessageToChat('assistant', data.response);
                const requestDuration = data.metrics?.duration || `${((Date.now() - requestStartTime) / 1000).toFixed(2)}s`;
                updateMetadata(messageElement, {
                    model: 'bing-search',
                    metrics: { /* ... metadata ... */ }
                });
                // Show minimized paginator bar ONLY if a YouTube search has been done
                if (window.youtubeSearchManager?.pagination?.hasSearched) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                break;

            case 'YOUTUBE_REQUEST':
                addMessageToChat('user', message, { isYoutubeQuery: true });
                // Reset hasSwitchedFromYouTube and update paginator bars
                if (window.youtubeSearchManager) {
                    window.youtubeSearchManager.hasSwitchedFromYouTube = false;
                    window.youtubeSearchManager.paginatorSwitch();
                }
                // Trigger Pag-switch to restored bar for YouTube action
                if (window.youtubeSearchManager && window.youtubeSearchManager.triggerPagSwitch) {
                    window.youtubeSearchManager.triggerPagSwitch('youtube');
                }
                // Check if there's already a YouTube search view open and pass isOverwrite: true
                const hasExistingYouTubeResults = document.querySelector('.youtube-multi-bubble') !== null;
                const options = hasExistingYouTubeResults ? { isOverwrite: true } : {};
                console.log('🎯 [YOUTUBE-TEXT] Text input YouTube search detected, hasExisting:', hasExistingYouTubeResults, 'options:', options);
                window.youtubeSearchManager.handleYoutubeRequest(message, false, null, options);
                break;

            case 'JOKE_LIST':
                addMessageToChat('user', message);
                // Trigger Pag-switch to minimized bar for non-YouTube action
                if (window.youtubeSearchManager && window.youtubeSearchManager.triggerPagSwitch) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                const showAll = message.toLowerCase().includes('all jokes');
                await handleMyJokes.listJokes(showAll);
                break;

            case 'JOKE_GET':
                addMessageToChat('user', message);
                // Trigger Pag-switch to minimized bar for non-YouTube action
                if (window.youtubeSearchManager && window.youtubeSearchManager.triggerPagSwitch) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                const jokeMatch = message.match(getPatterns().jokes.getMyJoke);
                await handleMyJokes.retrieveJoke(jokeMatch[1]);
                break;

            case 'JOKE_SAVE':
                addMessageToChat('user', message);
                // Trigger Pag-switch to minimized bar for non-YouTube action
                if (window.youtubeSearchManager && window.youtubeSearchManager.triggerPagSwitch) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                await handleMyJokes.startSaving();
                break;
            
            case 'JOKE_SAVE_CONTENT':
                addMessageToChat('user', message);
                // Trigger Pag-switch to minimized bar for non-YouTube action
                if (window.youtubeSearchManager && window.youtubeSearchManager.triggerPagSwitch) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                await handleMyJokes.saveJoke(message);
                break;

            case 'JOKE_EDIT':
                addMessageToChat('user', message);
                // Trigger Pag-switch to minimized bar for non-YouTube action
                if (window.youtubeSearchManager && window.youtubeSearchManager.triggerPagSwitch) {
                    window.youtubeSearchManager.triggerPagSwitch('non-youtube');
                }
                const editJokeMatch = message.match(getPatterns().editJoke[0]);
                const jokeTitle = editJokeMatch[1].trim();
                const joke = await window.myJokesManager.findJokeByTitle(jokeTitle);
                if (joke) {
                    window.myJokesManager.showPanel('update', joke);
                    } else {
                    addMessageToChat('assistant', `Sorry, I couldn't find a joke titled "${jokeTitle}".`);
                }
                break;

            case 'GENERAL':
            default:
                addMessageToChat('user', message);
                if (window.youtubeSearchManager && window.youtubeSearchManager.pagination && window.youtubeSearchManager.pagination.hasSearched) {
                    window.youtubeSearchManager.hasSwitchedFromYouTube = true;
                    window.youtubeSearchManager.paginatorSwitch();
                }
                await getAIResponse(message, state.selectedModel, state.conversationHistory, systemPrompt, window.sessionId);
                break;
            }
    } catch (error) {
        console.error('Error in sendMessage:', error);
        addMessageToChat('error', 'Error: ' + error.message);
    } finally {
        elements.userInput.value = '';
        elements.userInput.placeholder = "Type a message...";
        state.isProcessing = false;
        state.isSending = false;
    }
}

// Get AI response function
async function getAIResponse(message, selectedModel, history, systemPrompt, sessionId) {
    state.isRendering = true;
    updateStatusAndConversation('Thinking...', state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
    const startTime = Date.now();
    let tokenCount = 0;
    let responseText = '';

    // Get temperature and top_p from sliders
    let temperature = 1.1;
    let top_p = 1.0;
    const tempSlider = document.getElementById('temperature-slider');
    const toppSlider = document.getElementById('top-p-slider');
    if (tempSlider) temperature = parseFloat(tempSlider.value) || 1.1;
    if (toppSlider) top_p = parseFloat(toppSlider.value) || 1.0;

    // Append custom prompt if present
    let finalSystemPrompt = systemPrompt;
    if (typeof customPrompt === 'string' && customPrompt.trim().length > 0) {
      finalSystemPrompt = `${systemPrompt}\n\n${customPrompt.trim()}`;
    }

    // Detect if this is a recipe query
    const isRecipeQuery = /\brecipe\b/i.test(message);

    console.log('Sending to /api/chat:', {
        message,
        temperature,
        top_p,
        customPrompt: customPrompt,
        isRecipeQuery
    });

    const response = await fetchWithRetry(window.appConfig.getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            history,
            model: selectedModel,
            systemPrompt: message.toLowerCase().includes('joke') ?
                `${finalSystemPrompt} Provide a short, one-line joke that hasn't been told before.` :
                finalSystemPrompt,
            session: sessionId, // Include sessionId in the request
            timezone: state.userTimezone,  // Add timezone to request
            temperature: temperature,
            top_p: top_p,
            isRecipeQuery // Pass to backend for future use
        }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    // For recipes, buffer the full response and only render at the end
    let recipeBuffer = '';
    let messageElement = null;
    if (!isRecipeQuery) {
        messageElement = addMessageToChat('assistant', '...', { model: selectedModel, startTime, tokenCount, isRecipeQuery });
        if (messageElement) {
            messageElement.dataset.startTime = startTime;
        }
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentChunk = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                if (data.response) {
                    responseText += data.response;
                    currentChunk += data.response;
                    tokenCount = data.tokenCount;

                    if (isRecipeQuery) {
                        recipeBuffer += data.response;
                    } else {
                        updateMessageContent(messageElement, responseText);
                        updateMetadata(messageElement, {
                            model: selectedModel,
                            startTime,
                            tokenCount,
                            endTime: Date.now()
                        });
                    }

                    updateStatusAndConversation(MESSAGES.STATUS.SPEAKING, state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');

                    // Check for Bing search results FIRST and handle them exclusively
                    const isBingWebResult = /# Web Results for|# News Results for/i.test(responseText);
                    if (isBingWebResult) {
                        messageElement.querySelector('.message-content').innerHTML = `<div class="bing-search-results">${responseText}</div>`;
                        continue; // Skip all other processing for Bing results
                    }

                    // Check for image trigger phrase or placeholder
                    if (
                        responseText.toLowerCase().includes('here are some relevant images for') ||
                        containsImagePlaceholder(responseText)
                    ) {
                        // Try to extract the subject from the heading or placeholder
                        let searchQuery = '';
                        const imageMatch = responseText.match(/here are some relevant images for (.*?)[.!?\n]/i);
                        if (imageMatch && imageMatch[1]) {
                            searchQuery = imageMatch[1].trim();
                        } else {
                            // Try to extract from placeholder or any 'Here are ... images of/for ...' line
                            searchQuery = extractSubjectFromPlaceholder(responseText);
                        }
                        if (searchQuery) {
                            console.log('[IMAGE DEBUG] Detected image request for:', searchQuery);
                            try {
                                const imageResponse = await fetch(`/api/google-image-search?q=${encodeURIComponent(searchQuery)}`);
                                if (!imageResponse.ok) {
                                    throw new Error(`HTTP error! status: ${imageResponse.status}`);
                                }
                                const imageData = await imageResponse.json();
                                console.log('[IMAGE DEBUG] Received image data:', imageData);
                                if (imageData.images && imageData.images.length > 0) {
                                    console.log('[IMAGE DEBUG] Inserting images into chat');
                                    insertAndStyleImages(imageData.images, messageElement, `Here are some relevant images for ${searchQuery}.`, searchQuery);
                                }
                            } catch (error) {
                                console.error('[IMAGE DEBUG] Error fetching images:', error);
                            }
                        }
                    }

                    // Only queue audio for non-recipe queries during streaming
                    const sentences = currentChunk.match(/[^.!?]+[.!?]+/g);
                    if (!isRecipeQuery && sentences) {
                        queueAudioChunk(sentences.join(' '));
                        currentChunk = currentChunk.replace(sentences.join(''), '');
                    }
                }
            }
        }
    }

    // At the end, only queue audio for non-recipe queries
    if (!isRecipeQuery && currentChunk && currentChunk.trim() && state.selectedVoice) {
        queueAudioChunk(currentChunk.trim());
    }

    // 🎯 Handle any remaining text for audio
    if (!isRecipeQuery && currentChunk && currentChunk.trim() && state.selectedVoice) {
        queueAudioChunk(currentChunk.trim());
    }

    // 🎯 CRITICAL: Call updateMessageContent with isFinal=true to apply story formatting
    if (!isRecipeQuery && messageElement && responseText) {
        console.log('📖 [STORY-FORMAT] Calling updateMessageContent with isFinal=true for story formatting');
        updateMessageContent(messageElement, responseText, true); // <-- This will trigger story formatting
    }

    // For recipes, only now render the card with the full response
    if (isRecipeQuery) {
        // (Removed: updateStatus(MESSAGES.STATUS.PROCESSING);)
        messageElement = addMessageToChat('assistant', recipeBuffer, { model: selectedModel, startTime, tokenCount, isRecipeQuery: true });
        if (messageElement) {
            messageElement.dataset.startTime = startTime;
        }
        // Hide processing alert and start audio after DOM update
        window.requestAnimationFrame(() => {
            // Set status to AISPEAKING before starting audio
            if (typeof updateStatus === 'function' && MESSAGES && MESSAGES.STATUS && MESSAGES.STATUS.AISPEAKING) {
                updateStatusAndConversation(MESSAGES.STATUS.AISPEAKING, state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
            }
            // Only queue audio if not already queued for this recipe
            if (state.selectedVoice && recipeBuffer.trim() && (!state.lastRecipeAudio || state.lastRecipeAudio !== recipeBuffer.trim())) {
                // Remove any image heading before sending to TTS
                const { heading, cleanedText } = extractImageHeading(recipeBuffer.trim());
                queueAudioChunk(cleanedText);
                state.lastRecipeAudio = recipeBuffer.trim();
                // After the recipe, queue the image heading if it exists
                if (heading) {
                    queueAudioChunk(heading);
                }
            }
            // Use improved detection and subject extraction for image search
            if (userRequestedImages(message) || containsImagePlaceholder(recipeBuffer)) {
                const subject = extractImageSubject(message, recipeBuffer);
                const latestAssistantMsg = document.querySelector('.message.assistant:last-child');
                console.log('[IMAGE DEBUG] Triggering image search for recipe with subject:', subject);
                searchAndDisplayImages(subject, latestAssistantMsg);
            }
        });
    } else {
        // For general queries, after rendering, also check for image request
        if (userRequestedImages(message) || containsImagePlaceholder(responseText)) {
            const subject = extractImageSubject(message, responseText);
            const latestAssistantMsg = document.querySelector('.message.assistant:last-child');
            console.log('[IMAGE DEBUG] Triggering image search for general query with subject:', subject);
            searchAndDisplayImages(subject, latestAssistantMsg);
        }
    }

    state.isRendering = false;
    if (!state.isAISpeaking) {
        // updateStatus('Ready');
        console.log('Ready');
    }

    // Extract the image heading and cleaned text
    const { heading, cleanedText } = extractImageHeading(responseText);
    if (heading) {
        // Remove the heading from the main text and add it as a new line before images
        responseText = cleanedText;
    }

    // After rendering the main text, always trigger image search for subject queries
    if (heading) {
        // If the heading was present, use the extracted subject for image search
        const subject = heading.replace('Here are some relevant images for ', '').replace('.', '').trim();
        const messageElement = document.querySelector('.message.assistant:last-child');
        fetch(`/api/google-image-search?q=${encodeURIComponent(subject)}`)
            .then(res => res.json())
            .then(imageData => {
                if (imageData.images && imageData.images.length > 0) {
                    insertAndStyleImages(imageData.images, messageElement, heading, subject);
                }
            });
    } else if (shouldTriggerImageSearch(message)) {
        // If it's a subject query but no heading, still trigger image search
        const subject = extractSubjectFromMessage(message);
        if (subject) {
            const messageElement = document.querySelector('.message.assistant:last-child');
            fetch(`/api/google-image-search?q=${encodeURIComponent(subject)}`)
                .then(res => res.json())
                .then(imageData => {
                    if (imageData.images && imageData.images.length > 0) {
                        insertAndStyleImages(imageData.images, messageElement, `Here are some relevant images for ${subject}.`, subject);
                    }
                });
        }
    }

    // 🎯 If there is an image heading, queue it for audio playback immediately after the main response (before playback starts)
    if (heading && state.selectedVoice) {
        // Place the heading at the end of the audio queue if not already present
        if (!state.audioQueue.includes(heading)) {
            state.audioQueue.push(heading);
        }
    }

    return { response: responseText, tokenCount, messageElement, startTime };
}

// Add message to chat function
function addMessageToChat(role, content, options = {}) {

    console.log('addMessageToChat options:', options); 

    // Prevent empty assistant bubbles
    if (
        role === 'assistant' &&
        (!content || (typeof content === 'string' && content.trim() === '')) &&
        !options.isImageAnalysis && !options.allowEmpty // <-- check for allowEmpty
    ) {
        return null; // Don't create empty assistant bubbles unless it's image analysis
    }
    
    if (options.mock) {
        // Only create the mock message if there is actual content
        if (!content || (typeof content === 'string' && content.trim() === '')) {
            return null; // Don't create empty mock bubbles
        }
    }
    
    const messageElement = document.createElement('div');
    if (options.mock) {
        messageElement.className = 'message assistant-mock';
    } else {
        messageElement.className = `message ${role}`;
    }

    // Add special styling for YouTube query messages
    if (role === 'user' && options.isYoutubeQuery) {
        messageElement.setAttribute('data-youtube-query', 'true');
    }
    
    // Add special bubble classes for greetings and exit messages
    if (role === 'assistant') {
        const type = options.type || options.messageType || '';
        if (type === 'greeting') {
            messageElement.classList.add('greeting-bubble');
        } else if (type === 'exit') {
            messageElement.classList.add('exit-bubble');
        }
        // Add recipe-card class for recipes
        if (options.isRecipeQuery) {
            messageElement.classList.add('recipe-card');
        }
    }

    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';

    // Only add metadata for assistant messages that are not greeting, exit, or time/date/datetime
    // Also skip metadata for YouTube query messages
    let metadataElement = null;
    if (role === 'assistant' && !options.isYoutubeQuery) {
        const type = options.type || options.messageType || '';
        const excludedTypes = ['greeting', 'exit', 'time', 'date', 'datetime'];
        if (!excludedTypes.includes(type)) {
            metadataElement = document.createElement('div');
            metadataElement.className = 'metadata';
            messageElement.appendChild(metadataElement);
        }
    }

    messageElement.appendChild(contentElement);

    // If metadataElement exists, move it to the top (in case of future changes)
    if (metadataElement) {
        messageElement.insertBefore(metadataElement, messageElement.firstChild);
    }

    // --- RECIPE CARD EARLY RETURN ---
    if (role === 'assistant' && options.isRecipeQuery && window.recipeManager) {
        console.log('RENDERING RECIPE CARD:', content);
        // First, render the recipe
        window.recipeManager.renderRecipe(messageElement, content);
        elements.chatMessages.appendChild(messageElement);
        // Insert images if the recipe text contains the image trigger phrase (restored logic)
        const imageTrigger = content.toLowerCase().match(/here are some relevant images for (.*?)[.!?\n]/i);
        let searchQuery = null;
        if (imageTrigger && imageTrigger[1]) {
            searchQuery = imageTrigger[1].trim();
            console.log('Detected image request for:', searchQuery);
        } else if (options.originalUserQuery && userRequestedImages(options.originalUserQuery)) {
            // Extract the recipe title (first non-empty line)
            const firstLine = content.split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
            searchQuery = firstLine;
            console.log('[IMAGE DEBUG] User requested images, using recipe title for image search:', searchQuery);
        }
        if (searchQuery) {
            setTimeout(() => {
                fetch(`/api/google-image-search?q=${encodeURIComponent(searchQuery)}`)
                    .then(res => res.json())
                    .then(imageData => {
                        if (imageData.images && imageData.images.length > 0) {
                            console.log('Inserting images into chat (post-recipe)');
                            if (messageElement && messageElement.isConnected) {
                                insertAndStyleImages(imageData.images, messageElement, searchQuery, searchQuery);
                            } else {
                                console.warn('Message element no longer exists, cannot insert images');
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching images:', error);
                    });
            }, 100); // Small delay to ensure DOM is ready
        }
        handleScroll({ content, options, role });
        return messageElement;
    }

    // Handle different content types
    if (typeof content === 'object' && content.type === 'youtube') {
        contentElement.innerHTML = content.html;
    } else if (typeof content === 'string') {
        // Restore honorifics for assistant messages before rendering
        if (role === 'assistant') {
            content = restoreHonorifics(content);
        }
        // Check for HTML-based search results
        if (
            content.includes('<h2>Web Results') ||
            content.includes('<h2>News Results') ||
            content.includes("<ol class='search-results-list'>") ||
            content.includes('<ol class="search-results-list">') ||
            content.includes('youtube-multi-bubble') ||
            content.includes('youtube-action-btn') ||
            content.includes('youtube-results') ||
            content.includes('video-list') ||
            content.includes('video-item') ||
            content.includes('youtube-playHere-link') ||
            options.type === 'youtube-list' ||
            options.messageType === 'youtube'
        ) {
            contentElement.innerHTML = content;
        }
        else if (options.renderAsHTML) {
            contentElement.innerHTML = content;
        }
        else {
            // Add character with formatting and emojis for stories (but not recipes)
            if (role === 'assistant' && content.length > 200 && !isRecipe(content)) {
                console.log('📖 [STORY-FORMAT] Formatting story in addMessageToChat, length:', content.length);
                // Use formatStoryParagraphs for proper paragraph breaks
                const formattedContent = formatStoryParagraphs(content);
                console.log('📖 [STORY-FORMAT] Original content preview:', content.substring(0, 100) + '...');
                console.log('📖 [STORY-FORMAT] Formatted content preview:', formattedContent.substring(0, 100) + '...');
                console.log('📖 [STORY-FORMAT] Contains line breaks:', formattedContent.includes('\n\n'));
                contentElement.style.whiteSpace = 'pre-wrap'; // Preserve line breaks
                contentElement.innerHTML = formattedContent.replace(/\n\n/g, '<br><br>'); // Convert line breaks to HTML
            } else {
                contentElement.textContent = content;
            }
        }
    }

    // Add the message to the chat container
    elements.chatMessages.appendChild(messageElement);
    
    // IMMEDIATE scroll for user messages AND assistant responses (especially story requests)
    if (role === 'user') {
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
            if (!window.forceRecipeScrollToTop) {
                console.log('[SCROLL-DEBUG] User message: chatContainer.scrollTop = chatContainer.scrollHeight');
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                console.log('[SCROLL-DEBUG] User message: scroll-to-bottom SUPPRESSED by forceRecipeScrollToTop');
            }
        }
    } else if (role === 'assistant') {
        const chatContainer = document.getElementById('chat-messages');
        if (chatContainer) {
            if (!window.forceRecipeScrollToTop) {
                console.log('[SCROLL-DEBUG] Assistant message: chatContainer.scrollTop = chatContainer.scrollHeight');
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                console.log('[SCROLL-DEBUG] Assistant message: scroll-to-bottom SUPPRESSED by forceRecipeScrollToTop');
            }
        }
    }
    
    // Handle scrolling
    handleScroll({ content, options, role });
    
    // After rendering any assistant message, if the user's original query requests images, trigger image search for the main subject
    if (role === 'assistant' && options.originalUserQuery && userRequestedImages(options.originalUserQuery)) {
        // Try to extract the main subject from the user query
        let subject = '';
        // 1. Try to extract before 'and provide images' or similar
        const generalMatch = options.originalUserQuery.match(/tell me about (.*?) (and|with)? (provide|show|display)? ?(images?|pictures?|photos?)/i);
        if (generalMatch && generalMatch[1]) {
            subject = generalMatch[1].trim();
        } else {
            // 2. Fallback: remove image-related words and trim
            subject = options.originalUserQuery.replace(/(and|with)? ?(provide|show|display)? ?(images?|pictures?|photos?)/gi, '').trim();
        }
        // 3. Final fallback: use the first non-empty line of the assistant's response
        if (!subject) {
            subject = content.split('\n').map(l => l.trim()).find(l => l.length > 0) || '';
        }
        if (subject) {
            console.log('[IMAGE DEBUG] General query: user requested images, using subject for image search:', subject);
            setTimeout(() => {
                fetch(`/api/google-image-search?q=${encodeURIComponent(subject)}`)
                    .then(res => res.json())
                    .then(imageData => {
                        if (imageData.images && imageData.images.length > 0) {
                            console.log('Inserting images into chat (general query)');
                            if (messageElement && messageElement.isConnected) {
                                insertAndStyleImages(imageData.images, messageElement, subject, subject);
                            } else {
                                console.warn('Message element no longer exists, cannot insert images');
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching images:', error);
                    });
            }, 100);
        }
    }
    
    return messageElement;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Add TTS warm-up function
async function warmUpTTS() {
    console.log('🔊 [AUDIO] Starting TTS warm-up...');
    
    const warmUpPayloads = [
        '\u200B', // zero-width space
        ' ',      // regular space
        '.',      // period
        ',',      // comma
    ];
    
    for (let i = 0; i < warmUpPayloads.length; i++) {
        try {
            const response = await fetch(window.appConfig.getApiUrl('/api/tts'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: warmUpPayloads[i],
                    voice: window.appConfig.getTTSVoice(),
                    rate: 0.9,
                    pitch: 1,
                    volume: 0 // always silent
                })
            });
            
            if (!response.ok) {
                console.warn(`🔊 [AUDIO] Warm-up request ${i + 1} failed:`, response.status);
                continue;
            }
            
            const audioBlob = await response.blob();
            if (audioBlob.size === 0) {
                console.warn(`🔊 [AUDIO] Warm-up request ${i + 1} returned empty audio`);
                continue;
            }
            
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            // Wait for audio to be loaded
            await new Promise((resolve, reject) => {
                audio.onloadeddata = resolve;
                audio.onerror = reject;
                // Set a timeout in case loading takes too long
                setTimeout(reject, 5000);
            });
            
            URL.revokeObjectURL(audioUrl);
            console.log(`🔊 [AUDIO] Warm-up request ${i + 1} successful`);
            
            // Small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.warn(`🔊 [AUDIO] Warm-up request ${i + 1} error:`, error);
            // Continue to next request
        }
    }
    
    console.log('🔊 [AUDIO] TTS warm-up complete');
}


// =============================================================
// HANDLE SCROLL
// ============================================================= 

// Handle scroll function
function handleScroll({ content = '', options = {}, role = '' }) {
    // Always scroll to TOP for YouTube, Recipe, and General queries (with or without images)
    const lowerContent = typeof content === 'string' ? content.toLowerCase() : '';
    const isYouTube = lowerContent.includes('youtube') || options.isYoutube || options.isYoutubeQuery;
    const isRecipe = options.isRecipeQuery || options.isRecipe || (lowerContent.includes('ingredients:') && (lowerContent.includes('instructions:') || lowerContent.includes('steps:')));
    const isStory = options.type === 'story' || options.messageType === 'story' || (role === 'assistant' && lowerContent.includes('once upon a time'));
    const isTimeOrDate = ['time', 'date', 'datetime'].includes(options.type) || ['time', 'date', 'datetime'].includes(options.messageType);
    const isJoke = options.type === 'joke' || options.messageType === 'joke' || options.isJoke;

    if (isYouTube || isRecipe || (!isStory && !isTimeOrDate && !isJoke)) {
        // Always scroll to TOP for YouTube, Recipe, and General queries
        const chatContainer = document.getElementById('chat-messages');
        if (window.youtubeSearchManager && isYouTube && typeof window.youtubeSearchManager.scrollToYouTubeResults === 'function') {
            window.youtubeSearchManager.scrollToYouTubeResults();
        } else if (chatContainer) {
            chatContainer.scrollTop = 0;
        }
        return;
    }

    // For stories, time/date, jokes, and MyJokes, scroll to BOTTOM as content grows
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        const scrollToBottom = () => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        };
        scrollToBottom();
        setTimeout(scrollToBottom, 0);
        setTimeout(scrollToBottom, 10);
        setTimeout(scrollToBottom, 25);
        setTimeout(scrollToBottom, 50);
        setTimeout(scrollToBottom, 100);
        setTimeout(scrollToBottom, 150);
        setTimeout(scrollToBottom, 200);
        setTimeout(scrollToBottom, 300);
        setTimeout(scrollToBottom, 500);
        setTimeout(scrollToBottom, 800);
        setTimeout(scrollToBottom, 1200);
        setTimeout(scrollToBottom, 1500);
        setTimeout(scrollToBottom, 2000);
        setTimeout(scrollToBottom, 3000);
        setTimeout(scrollToBottom, 5000);
        setTimeout(scrollToBottom, 7500);
        setTimeout(scrollToBottom, 10000);
    }
}

function robustScrollToRecipeResults() {
    const scrollToRecipe = () => {
        const lastRecipe = document.querySelector('.message.assistant:last-child');
        if (lastRecipe) {
            lastRecipe.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    scrollToRecipe();
    setTimeout(scrollToRecipe, 0);
    setTimeout(scrollToRecipe, 10);
    setTimeout(scrollToRecipe, 25);
    setTimeout(scrollToRecipe, 50);
    setTimeout(scrollToRecipe, 100);
    setTimeout(scrollToRecipe, 150);
    setTimeout(scrollToRecipe, 200);
    setTimeout(scrollToRecipe, 300);
    setTimeout(scrollToRecipe, 500);
    setTimeout(scrollToRecipe, 800);
    setTimeout(scrollToRecipe, 1200);
}

// Helper function to convert text to title case
function toTitleCase(str) {
    if (!str) return '';
    // This will handle most cases, like "LIMONCELLO" -> "Limoncello"
    // and "HELLO WORLD" -> "Hello World"
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * Takes a block of text, splits it into sentences, and formats it into paragraphs
 * with exactly 5 sentences each, separated by double line breaks.
 * @param {string} text - The raw text of the story.
 * @returns {string} The formatted story with paragraphs.
 */
function formatStoryParagraphs(text) {
    if (!text || !text.includes(' ')) { // Don't format code blocks or single words
        return text;
    }

    // 1. Split the text into sentences using a regex that handles various punctuation.
    const sentences = text.match(/[^.!?…]+[.!?…]?\s*/g) || [];
    if (sentences.length <= 5) {
        return text; // Don't format if it's not a long story
    }

    // 2. Group sentences into paragraphs of 5.
    const paragraphs = [];
    let currentParagraph = [];
    for (const sentence of sentences) {
        currentParagraph.push(sentence.trim());
        if (currentParagraph.length === 5) {
            paragraphs.push(currentParagraph.join(' '));
            currentParagraph = [];
        }
    }

    // 3. Add any remaining sentences as a final paragraph.
    if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph.join(' '));
    }

    // 4. Join paragraphs with double line breaks for Markdown.
    return paragraphs.join('\n\n');
}

// Stop audio playback function
function stopAudioPlayback() {
    // Stop any currently playing HTML5 Audio
    if (window.state && window.state.currentAudio) {
        try {
            window.state.currentAudio.pause();
            window.state.currentAudio.currentTime = 0;
        } catch (e) {
            console.warn('Could not pause currentAudio:', e);
        }
        window.state.currentAudio = null;
    }

    // Clear the audio queue if you use one
    if (window.state && Array.isArray(window.state.audioQueue)) {
        window.state.audioQueue = [];
    }

    // If you use TTS or other audio APIs, stop them here as well
    // For example, if you use SpeechSynthesis:
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    // Reset any flags
    if (window.state) {
        window.state.isPlaying = false;
        window.state.isAISpeaking = false;
        window.state.stopRequested = true;
    }

    // Prevent further playback in custom TTS queue
    if (window.audioManager) {
        window.audioManager.audioQueue = [];
        window.audioManager.isPlaying = false;
        window.audioManager.stopRequested = true;
    }

    // Optionally, update the Stop Audio button
    if (typeof updateStopAudioButton === 'function') {
        updateStopAudioButton();
    }
    // Always update status to LISTENING after stopping audio
    if (typeof updateStatus === 'function' && MESSAGES && MESSAGES.STATUS && MESSAGES.STATUS.LISTENING) {
        updateStatus(MESSAGES.STATUS.LISTENING);
    }

    // Force enterListeningMode() to ensure the mic is enabled
    enterListeningMode();
}

// Helper to strip HTML and emojis
function stripEmojisAndHtml(text) {
    let cleaned = text.replace(/<[^>]*>/g, '');
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}]/gu, '');
    return cleaned;
}

function isRecipe(text) {
    if (!text) return false;
    // Use case-insensitive and flexible regex to make detection more reliable.
    // This looks for "ingredients" and "instructions" as whole words, ignoring extra spaces or markdown.
    const lower = text.toLowerCase();
    const hasIngredients = /\bingredients\b/.test(lower);
    const hasInstructions = /\b(instructions|directions)\b/.test(lower);
    return hasIngredients && hasInstructions;
}


////////////////////// MOVED after REFACTOR for RECIPE CODE changes //////////////////

// Update status function
function updateStatus(message) {
    state._lastStatusMsg = message;
    updateStatusAndConversation(message, state._lastConversationMsg || '');
}
window.updateStatus = updateStatus;

// Helper to update just the conversation message
function updateConversationMessage(msg) {
    state._lastConversationMsg = msg;
    updateStatusAndConversation(state._lastStatusMsg || '', msg);
}
window.updateConversationMessage = updateConversationMessage;

// Toggle speech recognition function
function toggleSpeechRecognition() {
    console.log('toggleSpeechRecognition called, isListening:', state.isListening);
    if (state.isListening) {
        stopListening();
    } else {
        startListening();
    }
}

// Add function to check if user's name is known
async function checkUserName() {
    try {
        // Try localStorage first
        const cachedName = localStorage.getItem('userName');
        if (cachedName) {
            return cachedName;
        }

        // If not in localStorage, try MongoDB
        const response = await retrievePersonalInfo('name');
        if (response && response.personalInfo && response.personalInfo.name) {
            // Update localStorage
            localStorage.setItem('userName', response.personalInfo.name);
            return response.personalInfo.name;
        }

        return null;
    } catch (error) {
        console.error('Error checking user name:', error);
        return null;
    }
}

// Get time of day function
function getTimeOfDay() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return 'morning';
    } else if (hour < 17) {
        return 'afternoon';
    } else {
        return 'evening';
    }
}

// Reset audio state function
function resetAudioState() {
    console.log('Resetting audio state. Current state:', {
        stopRequested: state.stopRequested,
        isPlaying: state.isPlaying,
        isAISpeaking: state.isAISpeaking,
        audioQueueLength: state.audioQueue.length
    });

    // Stop any current audio
    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
    }

    state.stopRequested = false;
    state.isPlaying = false;

    state.isAISpeaking = false;
    state.audioQueue = [];

    console.log('Audio state reset. New state:', {
        stopRequested: state.stopRequested,
        isPlaying: state.isPlaying,
        isAISpeaking: state.isAISpeaking,
        audioQueueLength: state.audioQueue.length
    });
}

// =====================================================
// INACTIVITY HANDLING FUNCTIONS
// =====================================================

// FIXED: Start inactivity timer
function startInactivityTimer() {
    console.log('Starting inactivity timer for', INTERVAL, 'minute(s)');

    // Clear any existing timer
    if (state.inactivityTimer) {
        clearTimeout(state.inactivityTimer);
    }

    // Set new timer
    state.inactivityTimer = setTimeout(() => {
        console.log('Inactivity timeout reached');
        // Do NOT call stopListening() or reset Conversation Mode
        // Just log or notify that the user is inactive
    }, CONVERSATION_INACTIVITY_TIMEOUT);

    // Log timer details
    console.log('Timer set:', {
        interval: INTERVAL,
        timeout: CONVERSATION_INACTIVITY_TIMEOUT,
        currentTime: new Date().toISOString(),
        willTriggerAt: new Date(Date.now() + CONVERSATION_INACTIVITY_TIMEOUT).toISOString()
    });
}

// Clear inactivity timer function
function clearInactivityTimer() {
        console.log('Clearing inactivity timer');
    if (state.inactivityTimer) {
        clearTimeout(state.inactivityTimer);
        state.inactivityTimer = null;
    }
}

// Format minutes plural function
function formatMinutesPlural(minutes) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

// Retrieve personal info function
async function retrievePersonalInfo(type) {
    try {
        const response = await fetch(window.appConfig.getApiUrl(`/api/personal-info/${type}?sessionId=${window.sessionId}`));
        if (!response.ok) throw new Error('Failed to retrieve personal info');
        return await response.json();
    } catch (error) {
        console.error('Error retrieving personal info:', error);
    }
}

//////////////////////////////////////////////////////////////////////
// HELP - AUDIO FUNCTIONS
//////////////////////////////////////////////////////////////////////

// Stop listening function
function stopListening() {
    console.log('[stopListening] called. Mic will be stopped.');

    if (state.recognition) {
        try {
            state.recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }

    state.isListening = false;
    console.log('Ready');
    elements.micButton.textContent = '🎤';
    if (state.inactivityTimer) {
        clearTimeout(state.inactivityTimer);
        state.inactivityTimer = null;
    }
}

// New helper function for safely starting listening
function safeStartListening() {
    console.log('[safeStartListening] Current state:', {
        isListening: state.isListening,
        isProcessing: state.isProcessing,
        hasRecognition: !!state.recognition
    });

    if (state.isListening) {
        console.log('Already listening, skipping start');
        return;
    }

    if (!state.recognition) {
        console.log('Initializing new recognition instance');
        initializeSpeechRecognition();
    }

    try {
        console.log('Attempting to start recognition');
        state.isListening = false;  // Reset listening state
        state.isProcessing = false; // Reset processing state
        
        if (state.recognition) {
        state.recognition.start();
            state.isListening = true;
        elements.micButton.textContent = '🔴';
            console.log('Recognition started successfully');
        }
    } catch (error) {
        console.error('Failed to start recognition:', error);
        state.isListening = false;
        elements.micButton.textContent = '🎤';
        updateStatusAndConversation('Error starting speech recognition', state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
        state.recognition = null;
        setTimeout(() => {
            initializeSpeechRecognition();
        }, 1000);
    }
}

async function startListening() {
    // Reset states before starting
    state.isListening = false;
    state.isProcessing = false;
    state.isAISpeaking = false;

    if (!state.recognition) {
        initializeSpeechRecognition();
    }

    try {
        if (state.isListening) {
            return;
        }
        state.recognition.start();
        state.isListening = true;
        elements.micButton.textContent = '🔴';
    } catch (error) {
        console.error('Failed to start recognition:', error);
        state.isListening = false;
        elements.micButton.textContent = '🎤';
        updateStatusAndConversation('Error starting speech recognition', state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
        state.recognition = null;
        setTimeout(() => {
            initializeSpeechRecognition();
        }, 1000);
    }
}

// =====================================================
// SPEECH RECOGNITION FUNCTIONS
// =====================================================

// Initialize speech recognition function
function initializeSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
        console.error('Speech recognition not supported');
        return;
    }

    try {
        state.recognition = new webkitSpeechRecognition();
        state.recognition.continuous = false;
        state.recognition.interimResults = false;
        state.recognition.lang = 'en-US';

        // Start listening
        state.recognition.onstart = () => {
            state.isListening = true;
            elements.micButton.textContent = '🔴';
            updateStatusAndConversation(MESSAGES.STATUS.LISTENING, state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
        };

        // Stop listening
        state.recognition.onstop = function() {
            state.isListening = false;
            elements.micButton.textContent = '🎤';
            updateStatusAndConversation(MESSAGES.STATUS.LISTENING, state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
        };

        // End listening
        state.recognition.onend = () => {
            state.isListening = false;
            elements.micButton.textContent = '🎤';
            
            if (state.isConversationMode && !state.isProcessing && !state.stopRequested && !state.isAISpeaking) {
                setTimeout(() => {
                    if (!state.isProcessing && !state.stopRequested && !state.isAISpeaking) {
                        startListening();
                    }
                }, 100);
            }
        };

        // Error handling
        state.recognition.onerror = (event) => {
            if (event.error === 'no-speech') {
                // Silently handle no-speech errors in conversation mode
                return;
            }
            
            // For all other errors
            state.isListening = false;
            elements.micButton.textContent = '🎤';
            
            // Reset recognition instance on error
            state.recognition = null;
            setTimeout(() => {
                if (state.isConversationMode) {
                    initializeSpeechRecognition();
                }
            }, 1000);
        };

        // Result handling
        state.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim().toLowerCase();
            const confidence = event.results[0][0].confidence;
            console.log('🎤 Heard:', transcript, `(confidence: ${confidence?.toFixed(2) || 'unknown'})`);
            
            // Process the command
            console.log('💬 Processing command:', transcript);
            handleSpeechResult(event);
        };

    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        state.isListening = false;
        elements.micButton.textContent = '🎤';
        state.recognition = null;
    }
}


// Handle speech result function
function handleSpeechResult(event) {
    if (!event.results || !event.results.length) return;

    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;

    const transcript = result[0].transcript.trim();
    const confidence = result[0].confidence;
    console.log('Speech recognition result:', {
        transcript,
        confidence,
        timestamp: new Date().toISOString()
    });

    // Check for exit command first
    if (transcript.toLowerCase() === 'exit') {
        exitConversation();
        return;
    }

    // Check if it's a greeting
    const isGreeting = getPatterns().greetings.some(pattern =>
        pattern.test(transcript.toLowerCase())
    );

    sendMessage(transcript, isGreeting);
}



// =====================================================
// PRINT RECIPE FUNCTION
// =====================================================

window.printRecipe = async function(recipeText, messageElement) {
    try {
        console.log('🖨️ [PRINT] Opening print dialog for recipe');
        
        if (!messageElement) {
            throw new Error('No message element found to print from.');
        }

        // Helper to get text content from a selector
        const getText = (selector) => {
            const el = messageElement.querySelector(selector);
            return el ? el.innerText : '';
        };

        // Helper to get list items from a selector
        const getListItems = (selector) => {
            const items = messageElement.querySelectorAll(selector);
            return Array.from(items).map(li => `<li>${li.innerText}</li>`).join('');
        };

        const recipeName = getText('.recipe-title');
        const description = getText('.recipe-description');
        const ingredients = getListItems('.recipe-ingredient-item');
        const instructions = getListItems('.recipe-instruction-item');
        const enjoyText = getText('.recipe-enjoy-text');

        if (!recipeName) {
            throw new Error('Could not find recipe content to print.');
        }
        
        const imageUrls = Array.from(messageElement.querySelectorAll('.image-link img')).map(img => img.src);

        // Create print window
        const width = 800, height = 900;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        const printWindow = window.open('', '_blank', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
        if (!printWindow) {
            throw new Error('Pop-up blocked. Please allow pop-ups and try again.');
        }
        
        // Build the HTML for the print window
        let printContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${recipeName} - Recipe</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; color: #333; }
                        h1 { text-align: center; color: #2c3e50; }
                        .description { font-style: italic; color: #666; text-align: center; margin-bottom: 2em; }
                        h2 { color: #34495e; border-bottom: 2px solid #eaeaea; padding-bottom: 5px; margin-top: 1.5em; }
                        ul, ol { padding-left: 20px; }
                        li { margin-bottom: 0.5em; }
                        .enjoy-text { font-weight: bold; text-align: center; margin-top: 2em; }
                        .recipe-images { text-align: center; margin-top: 2em; }
                        .recipe-images img { max-width: 150px; border-radius: 8px; margin: 5px; }
                        @media print {
                            body { padding: 0; }
                            .recipe-images { display: none; } /* Hide images by default for printing */
                        }
                    </style>
                </head>
                <body>
                    <h1>${recipeName}</h1>`;
        
        if (description) {
            printContent += `<p class="description">${description}</p>`;
        }

        if (ingredients) {
            printContent += `<h2>Ingredients</h2><ul>${ingredients}</ul>`;
        }

        if (instructions) {
            printContent += `<h2>Instructions</h2><ol>${instructions}</ol>`;
        }

        if (enjoyText) {
            printContent += `<p class="enjoy-text">${enjoyText}</p>`;
        }
        
        if (imageUrls.length > 0) {
            printContent += `<div class="recipe-images"><h2>Images</h2>`;
            imageUrls.forEach(url => {
                printContent += `<img src="${url}" />`;
            });
            printContent += `</div>`;
        }

        printContent += `</body></html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Use a timeout to ensure content is loaded before printing
        setTimeout(() => { 
            printWindow.focus();
            printWindow.print(); 
            // Optional: Close after printing, but some browsers block this
            // setTimeout(() => printWindow.close(), 1000); 
        }, 500);
        
    } catch (error) {
        console.error('🖨️ [PRINT] Error:', error);
        toastManager.showToast(`Print Error: ${error.message}`, 'error');
    }
};

//////////////////////////////////////////////////////////////////////
// END --- OF HELP FUNCTIONS section
//////////////////////////////////////////////////////////////////////




// =====================================================
// MODE SWITCHING FUNCTIONS
// =====================================================

// Enter Listening Mode
function enterListeningMode() {
    // Update state all at once
    if (state) {
        state.isAISpeaking = false;
        state.isPlaying = false;
        state.stopRequested = false;
    }

    //Update UI elements
    if (typeof updateStopAudioButton === 'function') {
        updateStopAudioButton(); // Hide Stop Audio button
    }

    // CRITICAL FIX: Only start listening if Conversation Mode is enabled
    if (state?.isConversationMode) {
        console.log('[enterListeningMode] Conversation Mode is enabled - starting listening');
        if (typeof updateStatus === 'function') {
            updateStatusAndConversation(MESSAGES.STATUS.LISTENING, state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
        }
        if (typeof startListening === 'function') {
            startListening();
            state.isListening = true; // Ensure mic is active
        }
    } else {
        console.log('[enterListeningMode] Conversation Mode is disabled - NOT starting listening');
        if (typeof updateStatus === 'function') {
            updateStatusAndConversation(MESSAGES.STATUS.DEFAULT, '');
        }
        // Ensure listening is stopped if conversation mode is off
        if (typeof stopListening === 'function') {
            stopListening();
        }
        state.isListening = false;
    }
    elements.stopAudioButton.style.display = 'none';
    if (elements.stopAudioButton) elements.stopAudioButton.style.display = 'none'; // Force hide
}

// Enter AISpeaking Mode
// Enter AISpeaking Mode
function enterAISpeakingMode() {
    // Update state all at once
    if (state) {
        state.isAISpeaking = true;
        // DO NOT set isPlaying here. It prevents playNextInQueue from working.
        // state.isPlaying = true; 
        state.stopRequested = false;
    }

    // Update UI elements
    if (typeof updateStopAudioButton === 'function') {
        updateStopAudioButton(); // Show Stop Audio button
    }

    // Update status
    if (typeof updateStatus === 'function') {
        updateStatusAndConversation(MESSAGES.STATUS.SPEAKING, state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
    }

    // Stop listening to prevent feedback loops
    if (typeof stopListening === 'function') {
        stopListening();
    }
    elements.stopAudioButton.style.display = 'block';
}

// Make these functions globally available
window.enterListeningMode = enterListeningMode;
window.enterAISpeakingMode = enterAISpeakingMode;

// =====================================================
// DOM LOADED FUNCTIONS
// =====================================================

// Direct audio state to button visibility - NO other conditions
function updateStopAudioButton() {
    // Simple ternary using MESSAGES object: Show button ONLY when status shows interrupt/speaking messages
    const statusText = elements.status ? elements.status.textContent : '';
    const shouldShow = statusText === MESSAGES.STATUS.SPEAKING || statusText === MESSAGES.STATUS.AISPEAKING;
    
    elements.stopAudioButton.style.display = shouldShow ? 'inline-block' : 'none';
}
window.updateStopAudioButton = updateStopAudioButton;

async function handleCommand(text) {

    // Set lastRequestTime for non-system commands
    if (!text.match(/^(what time|what date|what.*date.*time|hi|hello|hey|bye|goodbye|exit|quit)/i)) {
        state.lastRequestTime = Date.now();
    }

    const patterns = getPatterns();

    // Check for time/date queries first
    if (patterns.time.some(pattern => pattern.test(text)) ||
        patterns.date.some(pattern => pattern.test(text)) ||
        patterns.dateTime.some(pattern => pattern.test(text))) {
        handleTimeQuery(text);
        return true;
    }

    // Check for remember info command first
    for (const pattern of patterns.rememberInfo) {
        const match = text.match(pattern);
        if (match) {
            const [_, key, value] = match;
            const info = `${key} is ${value}`;
            await storePersonalInfo(info);
            return true;
        }
    }

    // Check for greetings
    for (const pattern of patterns.greetings) {
        if (pattern.test(text)) {
            const response = generateGreeting();

            state.isAISpeaking = true;
            updateStopAudioButton();  // Show button

            addMessageToChat('assistant', response, { type: 'greeting' });
            await queueAudioChunk(response);
            state.isAISpeaking = false;
            elements.stopAudioButton.style.display = 'none';
            return true;
        }
    }

    // FIRST: Check if we're waiting for a name change confirmation
    if (state.pendingNameChange) {
        state.isAISpeaking = true;
        updateStopAudioButton();  // Show button

        state.lastRequestTime = Date.now();

        const response = text.trim().toLowerCase();
        const currentName = localStorage.getItem('stored_name');
        let message;

        if (response === 'yes') {
            message = `I've updated your name from "${currentName}" to "${state.pendingNameChange}".`;
            localStorage.setItem('stored_name', state.pendingNameChange);
            state.pendingNameChange = null;
        } else if (response === 'no') {
            message = `Okay, I'll keep your name as "${currentName}".`;
            state.pendingNameChange = null;
        } else {
            message = `Please respond with "yes" or "no" - would you like to change your name from "${currentName}" to "${state.pendingNameChange}"?`;
        }

        addMessageToChat('assistant', message, { showMetadata: true });
        await queueAudioChunk(message);
        state.isAISpeaking = false;
        elements.stopAudioButton.style.display = 'none';
        return true;
    }

    // THEN: Check for name storage command
    for (const pattern of patterns.storeName) {
        const match = text.match(pattern);
        if (match) {
            const newName = match[1].trim();
            const existingName = localStorage.getItem('stored_name');

            state.isAISpeaking = true;
            updateStopAudioButton();  // Show button

            state.lastRequestTime = Date.now();

            if (existingName) {
                // Ask for confirmation if name exists
                state.pendingNameChange = newName;
                const message = `I see you want to change your name from "${existingName}" to "${newName}".\nTo protect your stored name, please respond with "yes" to confirm the change, or "no" to keep it as "${existingName}".`;
                addMessageToChat('assistant', message, { showMetadata: true });
                await queueAudioChunk(message);
            } else {
                // Only store without confirmation if no name exists
                const message = `I'll remember that your name is ${newName}.`;
                localStorage.setItem('stored_name', newName);
                addMessageToChat('assistant', message, { showMetadata: true });
                await queueAudioChunk(message);
            }

            state.isAISpeaking = false;
            elements.stopAudioButton.style.display = 'none';
            return true;
        }
    }

    // Check for name query first
    for (const pattern of patterns.getName) {
        if (pattern.test(text)) {
            const storedName = localStorage.getItem('stored_name');

            state.isAISpeaking = true;
            updateStopAudioButton();  // Show button

            const message = storedName
                ? `Your name is ${storedName}.`
                : "I don't know your name yet. You can tell me by saying 'My name is [your name]'.";
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
            state.isAISpeaking = false;
            elements.stopAudioButton.style.display = 'none';
            return true;
        }
    }

    // for (const pattern of patterns.listJokes) {
    //     const match = text.match(pattern);
    //     if (match) {
    //         state.isAISpeaking = true;
    //         updateStopAudioButton();  // Show button

    //         try {
    //             // First check if the server is available
    //             const serverCheck = await fetch(`${SERVER_URL}/api/health`).catch(() => null);

    //             if (!serverCheck?.ok) {
    //                 throw new Error('Server unavailable');
    //             }

    //             // Build URL with query parameters properly
    //             const url = new URL(`${SERVER_URL}/api/jokes/list-jokes`);
    //             url.searchParams.append('sessionId', window.sessionId);
    //             url.searchParams.append('type', 'my_jokes');  // Changed from 'my jokes' to 'my_jokes'

    //             // Make the jokes request
    //             const response = await fetch(url, {
    //                 method: 'GET',
    //                 headers: {
    //                     'Accept': 'application/json',
    //                     'Content-Type': 'application/json'
    //                 }
    //             });

    //             if (!response.ok) {
    //                 console.error('Jokes API Error:', {
    //                     status: response.status,
    //                     statusText: response.statusText,
    //                     url: url.toString()
    //                 });

    //                 const errorText = await response.text();
    //                 console.error('Error response:', errorText);

    //                 throw new Error(`Server error: ${response.status}`);
    //             }

    //             const data = await response.json();

    //             if (data.success && data.jokes?.length > 0) {
    //                 const jokeList = data.jokes
    //                     .map((joke, index) => `${index + 1}. ${joke.content}`)
    //                     .join('\n\n');

    //                 const message = `Here are your saved jokes:\n\n${jokeList}`;
    //                 addMessageToChat('assistant', message);
    //                 await queueAudioChunk(message);
    //             } else {
    //                 const message = "You haven't saved any jokes yet. Would you like me to tell you a joke that you can save?";
    //                 addMessageToChat('assistant', message);
    //                 await queueAudioChunk(message);
    //             }
    //         } catch (error) {
    //             console.error('Error listing jokes:', error);
    //             const errorMessage = error.message === 'Server unavailable'
    //                 ? "Sorry, the jokes service is currently unavailable. Please try again later."
    //                 : "Sorry, there was an error retrieving your jokes. Would you like me to tell you a new joke instead?";

    //             addMessageToChat('assistant', errorMessage);
    //             await queueAudioChunk(errorMessage);
    //         } finally {
    //             state.isAISpeaking = false;
    //             elements.stopAudioButton.style.display = 'none';
    //         }
    //         return true;
    //     }
    // }

    // In handleCommand function, add proper state handling for jokes listing
    for (const pattern of patterns.listJokes) {
        const match = text.match(pattern);
        if (match) {
            await handleMyJokes.listJokes();
            return true;
        }
    }

    // Check for Bing search requests
    if (text.toLowerCase().includes('search for') ||
        text.toLowerCase().includes('look up')) {
        // Non-YouTube search: show minimized paginator bar
        window.youtubeSearchManager?.triggerPagSwitch('non-youtube');
        return await handleBingSearch.handleSearchRequest(text);
    }
}

// Generate Greeting
async function generateGreeting() {
    const hour = new Date().getHours();
    const timeOfDay = getTimeOfDay();
    const today = new Date();
    const holiday = getHoliday(today);

    // Get user's name from localStorage with correct key
    let userName = localStorage.getItem('stored_name');

    // If not in localStorage, try MongoDB
    if (!userName) {
        try {
            const response = await fetch(window.appConfig.getApiUrl('/api/personal-info/name?sessionId=${window.sessionId}'));
            const data = await response.json();
            if (data && data.value) {
                userName = data.value;
                localStorage.setItem('stored_name', userName);
            }
        } catch (error) {
            console.error('Error getting user name:', error);
        }
    }

    // Add comma only if we have a name
    userName = userName ? `, ${userName}` : '';

    if (holiday) {
        return `${holiday.greeting}${userName}`;
    }

    const greetings = {
        morning: [
            `Good morning${userName}! How can I help you today?`,
            `Rise and shine${userName}! How may I assist you?`,
            `Good morning${userName}! What can I do for you?`,
            `Morning${userName}! Hope you slept well!`
        ],
        afternoon: [
            `Good afternoon${userName}! How can I help you today?`,
            `Having a good day${userName}?`,
            `Hope your day is going well${userName}!`,
            `Afternoon${userName}! How may I assist you?`
        ],
        evening: [
            `Good evening${userName}! How can I help you today?`,
            `Evening${userName}! How was your day?`,
            `Hope you had a great day${userName}!`,
            `Evening${userName}! What can I do for you?`
        ]
    };

    const options = greetings[timeOfDay];
    return options[Math.floor(Math.random() * options.length)];
}

// Helper to convert numbered ingredients to a dashed HTML list
function formatIngredientsAsDashedList(text) {
    if (!text.match(/Ingredients:/i) || !text.match(/Instructions:|Directions:/i)) return text;

    // Split into sections
    const parts = text.split(/(Ingredients:|Instructions:|Directions:)/i);
    if (parts.length < 4) return text;

    let formatted = '';
    for (let i = 0; i < parts.length; i++) {
        if (/Ingredients:/i.test(parts[i])) {
            formatted += '<strong>' + parts[i] + '</strong>';
            // Convert numbered or dashed lines to <li>
            const lines = parts[i+1]
                .split(/\n|\r/)
                .map(line => line.trim())
                .filter(line => line.length > 0 && !/^Ingredients:?$/i.test(line));
            const liLines = lines.map(line => {
                // Remove leading numbers/dots/dashes and whitespace
                const cleaned = line.replace(/^\s*\d+\.?\s*/, '').replace(/^[-–—•]\s*/, '');
                return `<li style="list-style-type: '- '; margin-left: 1em;">${cleaned}</li>`;
            });
            formatted += `<ul style="margin: 0 0 1em 0; padding-left: 1.5em;">${liLines.join('')}</ul>`;
            i++; // Skip the ingredients content part
        } else {
            // For the rest, preserve line breaks and bold section headers
            if (/^(Instructions:|Directions:)$/i.test(parts[i])) {
                formatted += '<strong>' + parts[i] + '</strong>';
            } else {
                formatted += parts[i].replace(/\n/g, '<br>');
            }
        }
    }
    return formatted;
}

function hidePaginationBar() {
    const bar = document.getElementById('pagination-bar');
    if (bar) bar.remove();
}

// Handle time-related queries
function handleTimeQuery(messageText) {
    const currentTime = new Date();
    let response;

    if (messageText.toLowerCase().includes('date and time')) {
        response = `Today's date is ${currentTime.toLocaleDateString()} and the local time is ${currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} PST`;
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-bubble datetime-response';
        messageElement.textContent = response;
        elements.chatMessages.appendChild(messageElement);
    } else if (messageText.toLowerCase().includes('time')) {
        response = `The local time is ${currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} PST`;
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-bubble time-response';
        messageElement.textContent = response;
        elements.chatMessages.appendChild(messageElement);
    } else if (messageText.toLowerCase().includes('date')) {
        response = `Today's date is ${currentTime.toLocaleDateString()}`;
        const messageElement = document.createElement('div');
        messageElement.className = 'message system-bubble date-response';
        messageElement.textContent = response;
        elements.chatMessages.appendChild(messageElement);
    }

    return response;
}


// =====================================================
// ---> PATTERNS AND REGEX
// =====================================================

function getPatterns() {
    return {
        greetings: [
            /^hi$/i,
            /^hi\s+there$/i,
            /^hello$/i,
            /^hey$/i
        ],
        time: [
            /what(?:'s| is)(?: the)?(?: local)? time/i,
            /tell me(?: the)?(?: local)? time/i,
            /current time/i,
            /time now/i,
            /local time/i,
            /time please/i,
            /time is it/i,
            /got the time/i,
            /have the time/i,
            /^time$/i
        ],
        date: [
            /^what(?:'s| is)(?: the)?(?: current)? date/i,
            /^tell me(?: the)? date/i,
            /^what day is it/i,
            /^what(?:'s| is)? today(?:'s)? date/i,
            /^current date/i,
            /^date today/i,
            /^date now/i,
            /^date please/i,
            /^date$/i
        ],
        dateTime: [
            /date and time/i,
            /time and date/i,
            /current date and time/i,
            /what(?:'s| is) the date and time/i,
            /tell me(?: the)? date and time/i,
            /what day and time/i,
            /today(?:'s| is)? date and time/i,
            /date time/i,
            /time date/i
        ],
        rememberInfo: [
            /^remember that (.+?) is (.+)$/i,
            /^remember (.+?) is (.+)$/i,
            /^please remember that (.+?) is (.+)$/i,
            /^please remember (.+?) is (.+)$/i
        ],
        getPersonalInfo: [
            /^what(?:'s| is) my (.+)\??$/i,
            /^tell me (?:about )?my (.+)\??$/i,
            /^do you remember my (.+)\??$/i,
            /^what do you remember about my (.+)\??$/i,
            /^show me my personal info(?:rmation)?\??$/i,
            /^what do you know about me\??$/i
        ],
        exit: [
            /^(exit|quit|bye|goodbye)$/i
        ],
        saveJoke: [
            /^save a joke$/i,
            /^save joke$/i,
            /^i want to save a joke$/i,
            /^let me tell you a joke$/i,
            /^can i tell you a joke$/i
        ],
        editJoke: [
            /^edit my joke about (.+)$/i,
            /^update my joke about (.+)$/i,
            /^edit the joke about (.+)$/i,
            /^update the joke about (.+)$/i,
            /^edit my joke (.+)$/i,
            /^update my joke (.+)$/i,
            /^modify my joke about (.+)$/i,
            /^change my joke about (.+)$/i
        ],
        jokes: {
            listAll: /(?:.*?)(all jokes)(?:.*?)$/i,
            listMine: /(?:.*?)(my jokes)(?:.*?)$/i,
            getMyJoke: /(?:tell|show|get|read)(?:\s+me)?\s+my\s+joke\s+(?:about|with|containing)\s+"?([^"]+)"?/i,
            deleteJoke: /^delete joke id (\w+)$/i
        },
        listJokes: [
            /^(show|list|tell me|get|read)?\s*(my jokes|all jokes)\s*$/i,
            /^what(?:.*?)(my jokes|all jokes)(?:.*?)$/i
        ],
        bingSearch: {
            searchTerms: /^(web|bing|internet )\s/i,
        },
        recipeFormatting: {
            numbers: {
                four: /\b4\b/g,
                fourth: /\b4th\b/g
            },
            fractions: {
                half: /\b1\/2\b/g,
                quarter: /\b1\/4\b/g,
                threeQuarters: /\b3\/4\b/g,
                twoThirds: /\b2\/3\b/g,
                oneThird: /\b1\/3\b/g
            }
        },
        youtube: {
            // Broadened pattern: match any YouTube-related request
            searchVideos: /youtube.*search|search.*youtube|youtube.*channel|channel.*youtube|youtube.*movies?|movies?.*youtube|youtube.*tv|tv.*youtube|youtube.*films?|films?.*youtube|youtube.*series|series.*youtube/i,
            // Match any play request that includes youtube
            playVideo: /(^play|youtube play|play.*youtube|youtube.*play)/i  // Updated pattern
        },
        location: /(?:at|in|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        event: /(?:tomorrow|next|on|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        storeName: [
            /^remember (?:that )?my name is (.+)$/i,
            /^my name is (.+)$/i
        ],
        confirmChange: [
            /^(yes|no)$/i
        ],
        getName: [
            /^what(?:'s| is) my name\??$/i,
            /^tell me my name\??$/i,
            /^do you remember my name\??$/i
        ],
    };
}


function getHoliday(date) {
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const day = date.getDate();
    const year = date.getFullYear();

    // Calculate Thanksgiving (4th Thursday of November)
    if (month === 11) {  // November
        const thanksgiving = new Date(year, 10, 1);  // Start with November 1
        while (thanksgiving.getDay() !== 4) {  // Find first Thursday
            thanksgiving.setDate(thanksgiving.getDate() + 1);
        }
        thanksgiving.setDate(thanksgiving.getDate() + 21);  // Add 3 weeks

        if (day === thanksgiving.getDate()) {
            return {
                name: "Thanksgiving Day",
                greeting: "Happy Thanksgiving!"
            };
        }
    }

    // Fixed date holidays
    const holidays = {
        "1/1": { name: "New Year's Day", greeting: "Happy New Year!" },
        "7/4": { name: "Independence Day", greeting: "Happy Independence Day!" },
        "12/24": { name: "Christmas Eve", greeting: "Merry Christmas Eve!" },
        "12/25": { name: "Christmas Day", greeting: "Merry Christmas!" },
        "12/31": { name: "New Year's Eve", greeting: "Happy New Year's Eve!" }
    };

    const dateKey = `${month}/${day}`;
    return holidays[dateKey] || null;
}


// =====================================================
// DOMContentLoaded event listener
// =====================================================

function startApp() {
    console.log('🚀 [APP] Starting application...');
    console.log('🔧 [DOM] Setting up Playlist button...');
    // Inject metadata spacing style
    const style = document.createElement('style');
    style.textContent = `
        .metadata {
            margin-bottom: 12px;
            padding-bottom: 4px;
        }
        #open-playlist-manager-btn {
            display: none;
            margin: 24px 8px 22px 10px;
            background: #2196f3;
            color: #fff;
            border: none;
            border-radius: 6px;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            width: 130px;
        }
        #open-playlist-manager-btn:hover {
            background: #1976d2;
        }
    `;
    document.head.appendChild(style);

    // Disable Conversation Mode checkbox at startup
    if (elements.conversationModeToggle) {
        elements.conversationModeToggle.disabled = true;
    }

    console.log('🔧 [DOM] Calling initializeApp()...');
    initializeApp();
}

// Check if the document is already loaded
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    console.log('🚀 [APP] Document already loaded. Starting app immediately.');
    startApp();
} else {
    console.log('🚀 [APP] Document not loaded yet. Adding DOMContentLoaded listener.');
    document.addEventListener('DOMContentLoaded', startApp);
}


// =====================================================
// *** Initialize the APP ***
// =====================================================

async function initializeApp() {
    try {
        console.log('🔧 [APP] Initializing app...');
        console.log('🔧 [PAUL-TEST] Paul\'s Test for correct CODE running...');
        updateStatus(MESSAGES.STATUS.INITIALIZING);

        // PATCH: Set default user ID
        window.userId = "default-user";

        // Wait for config to be available
        let attempts = 0;
        const maxAttempts = 10;
        
        console.log('🔧 [APP] Waiting for config to be available...');
        while (!window.appConfig && attempts < maxAttempts) {
            console.log(`🔧 [APP] Attempt ${attempts + 1}/${maxAttempts} - appConfig:`, !!window.appConfig);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.appConfig) {
            console.error('❌ [APP] Config not available after', maxAttempts, 'attempts');
            throw new Error('Configuration not available');
        }

        console.log('�� [APP] Config found, loading...');
        // Load config first
        await window.appConfig.load();
        console.log('🔧 [APP] Config loaded:', window.appConfig.config);

        // Add these lines to ensure getTTSVoice and getApiUrl are available
        // === PATCH: Attach helper functions for TTS and API ===
        if (window.appConfig) {
            window.appConfig.getTTSVoice = function() {
                return window.state.selectedVoice || (this.audio && this.audio.defaultVoice) || 'en-US-AndrewNeural';
            };
            window.appConfig.getApiUrl = function(path) {
                return (this.backend && this.backend.url ? this.backend.url : '') + path;
            };
        }

        // Initialize other components
        await loadPersonalInfo();
        console.log('👤 [PERSONAL INFO] Loaded personal info');
        setupEventListeners();
        console.log('[SETUPEVENTLISTENERS] called setupEventListeners and conversationModeToggle:', elements.conversationModeToggle);
    
        // Create paginator toggle icon
        // Icon will be created only when YouTube results are rendered
        
        // Force icon visibility check after a delay
        setTimeout(() => {
            console.log('📄 [ICON] Forced visibility check after initialization');
            // updatePaginatorToggleIcon();
        }, 1000);

        // await populateVoiceList();
        await checkMicrophonePermission();

        // Set up SSE connection
        setupSSEConnection();

        // Add delay before enabling conversation mode
        setTimeout(() => {
            if (elements.conversationModeToggle) {
                elements.conversationModeToggle.disabled = false;
            }
            updateStatus(MESSAGES.STATUS.DEFAULT);
        }, MIC_INITIALIZATION_DELAY);

        // Add TTS warm-up function
        await warmUpTTS();

        console.log('Initializing MediaLibraryManager...');
        const mediaLibraryManagerInstance = new MediaLibraryManager();
        window.mediaLibraryManager = mediaLibraryManagerInstance;
        console.log('MediaLibraryManager initialized:', window.mediaLibraryManager);

        console.log('✅ [APP] App initialization completed successfully');

    } catch (error) {
        console.error('❌ [APP] Error during app initialization:', error);
        updateStatus(MESSAGES.ERRORS.INIT);
    }
}

// DOMContentLoaded listener removed - initializeApp is called from startApp()

// =====================================================
// *** EVENT LISTENERS ***
// =====================================================

// Setup event listeners function
function setupEventListeners() {
    // Log any missing elements
    for (const [key, el] of Object.entries(elements)) {
        if (!el) {
            console.error(`[setupEventListeners] Element not found: ${key}`);
        }
    }

    // Defensive event listener setup for chat controls
    if (elements.conversationModeToggle) {
        elements.conversationModeToggle.addEventListener('change', handleConversationModeToggle);
    }
    if (elements.micButton) {
    elements.micButton.addEventListener('click', function() {
        console.log('[DEBUG] Mic button clicked');
        toggleSpeechRecognition();
    });
    }
    if (elements.sendButton) {
    elements.sendButton.addEventListener('click', () => {
        console.log('[DEBUG] Send button clicked');
        const value = elements.userInput.value.trim();
        if (value) {
            sendMessage(value);
            elements.userInput.value = '';
        }
    });
    }
    if (elements.userInput) {
    elements.userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const value = elements.userInput.value.trim();
            if (value) {
                sendMessage(value);
                elements.userInput.value = '';
            }
        }
    });
    }
    if (elements.imageUploadBtn) {
    elements.imageUploadBtn.addEventListener('click', () => {
        console.log('[DEBUG] Image upload button clicked');
        if (elements.processingIndicator) elements.processingIndicator.style.display = 'block'; // Show immediately
        if (!state.isImagePickerOpen) {
            state.isImagePickerOpen = true;
            if (elements.imageInput) elements.imageInput.click();
        }
    });
    }
    if (elements.imageInput) {
        elements.imageInput.addEventListener('change', (event) => {
            state.isImagePickerOpen = false;
            handleImageUpload(event);
        });
        elements.imageInput.addEventListener('click', (event) => {
            // This ensures the flag resets if the user cancels the dialog
            event.target.value = '';
        });
    }
    if (elements.modelSelect) {
        elements.modelSelect.addEventListener('change', function() { state.selectedModel = this.value; });
    }
    if (elements.stopAudioButton) {
        elements.stopAudioButton.addEventListener('click', function() {
            console.log('[DEBUG] Stop audio button clicked');
            stopAudioPlayback();
        });
    }

    // Custom prompt controls
    if (typeof customPromptInput !== 'undefined' && customPromptInput) {
        customPromptInput.addEventListener('input', () => {
            customPrompt = customPromptInput.value;
        });
    }
    if (typeof removeCustomPromptBtn !== 'undefined' && removeCustomPromptBtn) {
        removeCustomPromptBtn.addEventListener('click', () => {
            customPrompt = '';
            if (customPromptInput) customPromptInput.value = '';
        });
    }

    // Slideout panel controls
    if (typeof slideoutBar !== 'undefined' && slideoutBar) {
        slideoutBar.addEventListener('mouseenter', () => {
            if (slideoutPanel) slideoutPanel.classList.add('open');
        });
        slideoutBar.addEventListener('click', () => {
            if (slideoutPanel) slideoutPanel.classList.toggle('open');
        });
    }
    if (typeof slideoutPanel !== 'undefined' && slideoutPanel) {
        slideoutPanel.addEventListener('mouseleave', () => {
            slideoutPanel.classList.remove('open');
        });
    }
    if (typeof tempSlider !== 'undefined' && tempSlider && typeof tempValue !== 'undefined' && tempValue) {
        tempSlider.addEventListener('input', () => {
            tempValue.textContent = Number(tempSlider.value).toFixed(2);
        });
    }
    if (typeof toppSlider !== 'undefined' && toppSlider && typeof topPValue !== 'undefined' && topPValue) {
        toppSlider.addEventListener('input', () => {
            topPValue.textContent = Number(toppSlider.value).toFixed(2);
        });
    }
    
    // Video player button
    const videoPlayerBtn = document.getElementById('open-video-player-btn');
    if (videoPlayerBtn) {
        videoPlayerBtn.addEventListener('click', () => {
            if (window.videoPlayer) {
                window.videoPlayer.openVideoPlayer();
            } else {
                console.error('Video player not initialized');
            }
        });
    }
    
    // === USER PROFILE DROPDOWN LOGIC ===
    let adminPanel = null;
    const profileIcon = document.getElementById('user-profile-icon');
    const dropdown = document.getElementById('user-dropdown');
    if (profileIcon && dropdown) {
        profileIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        // Hide dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (!dropdown.contains(e.target) && e.target !== profileIcon) {
                dropdown.classList.remove('open');
            }
        });
        // Admin Panel functionality
        document.getElementById('admin-menu-item')?.addEventListener('click', async function () {
            dropdown.classList.remove('open');
            if (!adminPanel) {
                try {
                    if (!window.LoginManager) {
                        const loginManagerScript = document.createElement('script');
                        loginManagerScript.src = './components/Admin/LoginManager/LoginManager.js';
                        document.head.appendChild(loginManagerScript);
                        await new Promise((resolve) => {
                            loginManagerScript.onload = resolve;
                        });
                    }
                    const AdminPanelModule = await import('../components/Admin/AdminPanel/AdminPanel.js');
                    adminPanel = new AdminPanelModule.default();
                    await adminPanel.init();
                } catch (error) {
                    console.error('Failed to load AdminPanel:', error);
                    alert('Failed to load Admin Panel. Please try again.');
                    return;
                }
            }
            adminPanel.show();
        });

        // Users menu item
        document.getElementById('users-menu-item')?.addEventListener('click', async function () {
            dropdown.classList.remove('open');
            if (!adminPanel) {
                try {
                    if (!window.LoginManager) {
                        const loginManagerScript = document.createElement('script');
                        loginManagerScript.src = './components/Admin/LoginManager/LoginManager.js';
                        document.head.appendChild(loginManagerScript);
                        await new Promise((resolve) => {
                            loginManagerScript.onload = resolve;
                        });
                    }
                    const AdminPanelModule = await import('../components/Admin/AdminPanel/AdminPanel.js');
                    adminPanel = new AdminPanelModule.default();
                    await adminPanel.init();
                } catch (error) {
                    console.error('Failed to load AdminPanel:', error);
                    alert('Failed to load Admin Panel. Please try again.');
                    return;
                }
            }
            adminPanel.show();
            if (typeof adminPanel.switchTab === 'function') {
                adminPanel.switchTab('user-management');
                if (typeof adminPanel.loadUserList === 'function') {
                    adminPanel.loadUserList();
                }
            }
        });
        // Placeholder actions for other dropdown items
        document.getElementById('bug-menu-item')?.addEventListener('click', function () {
            // alert('Bug tracking section coming soon!');
            dropdown.classList.remove('open');
        });
        document.getElementById('profile-menu-item')?.addEventListener('click', function () {
            alert('Profile section coming soon!');
            dropdown.classList.remove('open');
        });
        document.getElementById('logout-menu-item')?.addEventListener('click', function () {
            // alert('Logout functionality coming soon!'); // REMOVE THIS LINE
            dropdown.classList.remove('open');
            window.logout(); // Ensure logout is called here
        });
        console.log('[PROFILE DROPDOWN] Handler attached!');
    } else {
        console.log('[PROFILE DROPDOWN] Elements not found in DOM!');
    }
    // Admin Panel shortcut
    document.addEventListener('keydown', function(e) {
        if (
            e.ctrlKey &&
            e.shiftKey &&
            e.altKey &&
            e.key.toLowerCase() === 'p'
        ) {
            const active = document.activeElement;
            if (
                active.tagName !== 'INPUT' &&
                active.tagName !== 'TEXTAREA' &&
                !active.isContentEditable
            ) {
                (async () => {
                    if (!adminPanel) {
                        try {
                            if (!window.LoginManager) {
                                const loginManagerScript = document.createElement('script');
                                loginManagerScript.src = './components/Admin/LoginManager/LoginManager.js';
                                document.head.appendChild(loginManagerScript);
                                await new Promise((resolve) => {
                                    loginManagerScript.onload = resolve;
                                });
                            }
                            const AdminPanelModule = await import('../components/Admin/AdminPanel/AdminPanel.js');
                            adminPanel = new AdminPanelModule.default();
                            await adminPanel.init();
                        } catch (error) {
                            console.error('Failed to load AdminPanel:', error);
                            alert('Failed to load Admin Panel. Please try again.');
                            return;
                        }
                    }
                    adminPanel.currentUser = {
                        email: 'superadmin@local',
                        role: 'superadmin'
                    };
                    adminPanel.updateRoleBasedUI();
                    adminPanel.show();
                    if (typeof adminPanel.switchTab === 'function') {
                        adminPanel.switchTab('user-management');
                        if (typeof adminPanel.loadUserList === 'function') {
                            adminPanel.loadUserList();
                        }
                    }
                    const modal = document.getElementById('login-manager-modal');
                    if (modal) modal.style.display = 'none';
                })();
                e.preventDefault();
            }
        }
    });
    // ... (other event listeners for your app)

        // // Logout event listener
        // const logoutMenuItem = document.getElementById('logout-menu-item');
        // if (logoutMenuItem) {
        //     logoutMenuItem.addEventListener('click', function() {
        //         window.logout();
        //     });
        // }
    
        // // Bug Tracking event listener
        // const bugMenuItem = document.getElementById('bug-tracking-menu-item');
        // if (bugMenuItem) {
        //     bugMenuItem.addEventListener('click', function () {
        //         const profileDropdown = document.getElementById('user-dropdown');
        //         if (profileDropdown) profileDropdown.classList.remove('open');
        //         if (!isLoggedIn()) {
        //             showLoginModalWithIntent('bug-tracker');
        //         } else {
        //             openBugTracker();
        //         }
        //     });
        // }


    // Event listener for users-menu-item
    const usersMenuItem = document.getElementById('users-menu-item');
    if (usersMenuItem) {
        usersMenuItem.addEventListener('click', async function () {
            dropdown.classList.remove('open');
            if (!adminPanel) {
                try {
                    if (!window.LoginManager) {
                        const loginManagerScript = document.createElement('script');
                        loginManagerScript.src = './components/Admin/LoginManager/LoginManager.js';
                        document.head.appendChild(loginManagerScript);
                        await new Promise((resolve) => {
                            loginManagerScript.onload = resolve;
                        });
                    }
                    const AdminPanelModule = await import('../components/Admin/AdminPanel/AdminPanel.js');
                    adminPanel = new AdminPanelModule.default();
                    await adminPanel.init();
    } catch (error) {
                    console.error('Failed to load AdminPanel:', error);
                    alert('Failed to load Admin Panel. Please try again.');
                    return;
                }
            }
            adminPanel.show();
            if (typeof adminPanel.switchTab === 'function') {
                adminPanel.switchTab('user-management');
                if (typeof adminPanel.loadUserList === 'function') {
                    adminPanel.loadUserList();
                }
            }
        });
    }

    // Admin Panel shortcut (Ctrl+Shift+Alt+P)
    document.addEventListener('keydown', function(e) {
        if (
            e.ctrlKey &&
            e.shiftKey &&
            e.altKey &&
            e.key.toLowerCase() === 'p'
        ) {
            const active = document.activeElement;
            if (
                active.tagName !== 'INPUT' &&
                active.tagName !== 'TEXTAREA' &&
                !active.isContentEditable
            ) {
                (async () => {
                    if (!adminPanel) {
                        try {
                            if (!window.LoginManager) {
                                const loginManagerScript = document.createElement('script');
                                loginManagerScript.src = './components/Admin/LoginManager/LoginManager.js';
                                document.head.appendChild(loginManagerScript);
                                await new Promise((resolve) => {
                                    loginManagerScript.onload = resolve;
                                });
                            }
                            const AdminPanelModule = await import('../components/Admin/AdminPanel/AdminPanel.js');
                            adminPanel = new AdminPanelModule.default();
                            await adminPanel.init();
                        } catch (error) {
                            console.error('Failed to load AdminPanel:', error);
                            alert('Failed to load Admin Panel. Please try again.');
                            return;
                        }
                    }
                    adminPanel.currentUser = {
                        email: 'superadmin@local',
                        role: 'superadmin'
                    };
                    adminPanel.updateRoleBasedUI();
                    adminPanel.show();
                    if (typeof adminPanel.switchTab === 'function') {
                        adminPanel.switchTab('user-management');
                        if (typeof adminPanel.loadUserList === 'function') {
                            adminPanel.loadUserList();
                        }
                    }
                    const modal = document.getElementById('login-manager-modal');
                    if (modal) modal.style.display = 'none';
                })();
                e.preventDefault();
            }
        }
    });

    // Logout event listener
    const logoutMenuItem = document.getElementById('logout-menu-item');
    if (logoutMenuItem) {
        logoutMenuItem.addEventListener('click', function() {
            window.logout();
        });
    }

    // Bug Tracking event listener
    const bugMenuItem = document.getElementById('bug-tracking-menu-item');
    if (bugMenuItem) {
        bugMenuItem.addEventListener('click', function () {
            const profileDropdown = document.getElementById('user-dropdown');
            if (profileDropdown) profileDropdown.classList.remove('open');
            if (!isLoggedIn()) {
                showLoginModalWithIntent('bug-tracker');
            } else {
                openBugTracker();
            }
        });
    }

    // Admin event listener
    const adminMenuItem = document.getElementById('admin-menu-item');
    if (adminMenuItem) {
        adminMenuItem.addEventListener('click', function () {
            const profileDropdown = document.getElementById('user-dropdown');
            if (profileDropdown) profileDropdown.classList.remove('open');
            if (!isLoggedIn()) {
                showLoginModalWithIntent('admin');
            } else {
                openAdminPanel();
            }
        });
    }
}

// =====================================================
// *** LOAD PERSONAL INFO ***
// =====================================================

// Load personal info function
async function loadPersonalInfo() {
    try {
        // Adjust the API endpoint as needed for your backend
        const apiUrl = window.appConfig.getApiUrl('/api/personal-info/all');
        const response = await fetch(`${apiUrl}?sessionId=${window.sessionId}`);
        if (!response.ok) throw new Error('Failed to load personal info');

        const data = await response.json();
        if (data.personalInfo) {
            // Store each piece of info in localStorage or global state
            Object.entries(data.personalInfo).forEach(([key, value]) => {
                if (value) {
                    localStorage.setItem(`user_${key}`, value);
                    console.log(`Loaded ${key} from MongoDB to localStorage`);
                }
            });
        }
    } catch (error) {
        console.error('Error loading personal info:', error);
    }
}

// =====================================================
// MICROPHONE INITIALIZATION FUNCTIONS
// =====================================================

// Add this new function to handle microphone permissions
async function requestMicrophonePermission() {
    try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        
        if (result.state === 'denied') {
            updateStatus(MESSAGES.ERRORS.MIC_PERMISSION);
            throw new Error('Microphone permission denied');
        }

        if (result.state === 'prompt' || result.state === 'granted') {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false
            });
            stream.getTracks().forEach(track => track.stop());
        }

        return true;
    } catch (error) {
        console.error('Microphone permission error:', error);
        updateStatus(MESSAGES.ERRORS.MIC_PERMISSION);
        return false;
    }
}

// Check microphone permission function
async function checkMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (err) {
        console.error('Microphone permission denied:', err);
        updateStatus('Microphone permission denied. Please enable it in your browser settings.');
        return false;
    }
}

// =====================================================
// CLEANUP FUNCTIONS
// =====================================================

// Cleanup function
function stopAllAudio() {
    // Stop any currently playing HTML5 Audio
    if (window.state && window.state.currentAudio) {
        try {
            window.state.currentAudio.pause();
            window.state.currentAudio.currentTime = 0;
        } catch (e) {
            console.warn('Could not pause currentAudio:', e);
        }
        window.state.currentAudio = null;
    }

    // Clear the audio queue if you use one
    if (window.state && Array.isArray(window.state.audioQueue)) {
        window.state.audioQueue = [];
    }

    // If you use TTS or other audio APIs, stop them here as well
    // For example, if you use SpeechSynthesis:
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    // Reset any flags
    if (window.state) {
        window.state.isPlaying = false;
        window.state.isAISpeaking = false;
        window.state.stopRequested = true;
    }

    // Optionally, update the Stop Audio button
    if (typeof updateStopAudioButton === 'function') {
        updateStopAudioButton();
    }

    this.stopAllAudioListening();
}

function stopAllAudioListening() {

    if (state.currentAudio) {
        state.currentAudio.pause();
        state.currentAudio = null;
    }
}

function cleanup(audio) {
    if (audio && typeof audio.pause === 'function') {
        audio.pause();
        audio.src = '';
        URL.revokeObjectURL(audio.src);
    }
}

// =====================================================
// MARKDOWN FUNCTIONS
// =====================================================

// Strip markdown function
function stripMarkdown(text) {
    // Preserve newlines and list formatting
    return text
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
        .replace(/(\*|_)(.*?)\1/g, '$2')    // Italic
        .replace(/`{3}[\s\S]*?`{3}/g, '')   // Code blocks
        .replace(/`([^`]+)`/g, '$1')        // Inline code
        .replace(/^#+\s+/gm, '')            // Headers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
        .replace(/!\[([^\]]+)\]\([^\)]+\)/g, '$1') // Images
        .trim();
}

// =====================================================
// FETCH WITH RETRY FUNCTION
// =====================================================

async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}




// Update message content function

// Format text into paragraphs during streaming (doesn't interfere with audio)
function formatStreamingText(text) {
    if (!text || text.length < 100) return text; // Skip short text
    
    // Split into sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    let formattedText = '';
    let currentParagraph = '';
    let sentenceCount = 0;
    
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;
        
        currentParagraph += (currentParagraph ? ' ' : '') + sentence;
        sentenceCount++;
        
        // Create paragraph after 5 sentences or at the end
        if (sentenceCount >= 5 || i === sentences.length - 1) {
            if (formattedText) formattedText += '\n\n'; // Double line break between paragraphs
            formattedText += currentParagraph;
            currentParagraph = '';
            sentenceCount = 0;
        }
    }
    
    // Add appropriate emojis based on content type
    if (text.includes('Once upon a time') || text.includes('once upon a time')) {
        formattedText = '📖✨ ' + formattedText;
    } else if (text.includes('village') || text.includes('lived')) {
        formattedText = '🏘️📚 ' + formattedText;
    } else if (text.includes('recipe') || text.includes('ingredients') || text.includes('cooking')) {
        formattedText = '👨‍🍳🍽️ ' + formattedText;
    } else if (text.includes('joke') || text.includes('funny') || text.includes('laugh')) {
        formattedText = '😄🎭 ' + formattedText;
    } else if (text.includes('search') || text.includes('found') || text.includes('results')) {
        formattedText = '🔍📋 ' + formattedText;
    } else {
        // Default emojis for general long content
        formattedText = '💬✨ ' + formattedText;
    }
    
    return formattedText;
}


function updateMessageContent(messageElement, content, isFinal) {
    if (!messageElement) return;

    const contentElement = messageElement.querySelector('.message-content');
    if (!contentElement) return;

    // During streaming, just update the plain text
    if (!isFinal) {
        contentElement.textContent = content;
        return;
    }

    // === FINAL MESSAGE RECEIVED - NOW APPLY FORMATTING ===

    // 1. Final check to see if it's a recipe
    if (isRecipe(content)) {
        // Clear the container and build the structured HTML
        contentElement.innerHTML = ''; 
        contentElement.style.whiteSpace = 'normal'; // Reset whitespace for HTML

        const recipeContainer = document.createElement('div');
        recipeContainer.className = 'recipe-container';

        // --- PARSE AND BUILD RECIPE ---
        const lines = content.split('\n').filter(line => line.trim() !== '');
        
        let title = '';
        let description = '';
        const ingredients = [];
        const instructions = [];
        let currentSection = '';

        // Simple state-machine parser
        for (const line of lines) {
            const lowerLine = line.toLowerCase().trim();
            
            if (lowerLine.startsWith('ingredients:')) {
                currentSection = 'ingredients';
                continue;
            } else if (lowerLine.startsWith('instructions:')) {
                currentSection = 'instructions';
                continue;
            } else if (lowerLine.startsWith('enjoy')) {
                currentSection = 'enjoy';
            }

            if (currentSection === '') {
                if (!title) title = line;
                else description += line + ' ';
            } else if (currentSection === 'ingredients') {
                if (line.match(/^\d+\./)) ingredients.push(line.replace(/^\d+\.\s*/, ''));
            } else if (currentSection === 'instructions') {
                if (line.match(/^\d+\./)) instructions.push(line.replace(/^\d+\.\s*/, ''));
            } else if (currentSection === 'enjoy') {
                // The "Enjoy" text can be handled separately if needed
            }
        }
        
        // --- CREATE AND APPEND HTML ELEMENTS ---
        
        if (title) {
            const titleEl = document.createElement('p');
            titleEl.className = 'recipe-title';
            titleEl.textContent = title.trim();
            recipeContainer.appendChild(titleEl);
        }

        if (description) {
            const descriptionEl = document.createElement('p');
            descriptionEl.className = 'recipe-description';
            descriptionEl.textContent = description.trim();
            recipeContainer.appendChild(descriptionEl);
        }

        if (ingredients.length > 0) {
            const ingredientsContainer = document.createElement('div');
            ingredientsContainer.className = 'recipe-ingredients-container';
            
            const ingredientsHeading = document.createElement('p');
            ingredientsHeading.className = 'recipe-ingredients-heading';
            ingredientsHeading.textContent = 'Ingredients:';
            ingredientsContainer.appendChild(ingredientsHeading);
            
            const ingredientsList = document.createElement('ol');
            ingredientsList.className = 'recipe-ingredients-list';
            ingredients.forEach(item => {
                const li = document.createElement('li');
                li.className = 'recipe-ingredient-item';
                li.textContent = item;
                ingredientsList.appendChild(li);
            });
            ingredientsContainer.appendChild(ingredientsList);
            recipeContainer.appendChild(ingredientsContainer);
        }

        if (instructions.length > 0) {
            const instructionsContainer = document.createElement('div');
            instructionsContainer.className = 'recipe-instructions-container';

            const instructionsHeading = document.createElement('p');
            instructionsHeading.className = 'recipe-instructions-heading';
            instructionsHeading.textContent = 'Instructions:';
            instructionsContainer.appendChild(instructionsHeading);

            const instructionsList = document.createElement('ol');
            instructionsList.className = 'recipe-instructions-list';
            instructions.forEach(item => {
                const li = document.createElement('li');
                li.className = 'recipe-instruction-item';
                li.textContent = item;
                instructionsList.appendChild(li);
            });
            instructionsContainer.appendChild(instructionsList);
            recipeContainer.appendChild(instructionsContainer);
        }

        // Add the fully-formatted recipe to the message content element
        contentElement.appendChild(recipeContainer);

    } else {
        // It's a final message, but not a recipe - check if it's a story that needs formatting
        if (content.length > 200) {
            console.log('📖 [STORY-FORMAT] Formatting story in updateMessageContent, length:', content.length);
            // Use formatStoryParagraphs for proper paragraph breaks
            const formattedContent = formatStoryParagraphs(content);
            console.log('📖 [STORY-FORMAT] Original content preview:', content.substring(0, 100) + '...');
            console.log('📖 [STORY-FORMAT] Formatted content preview:', formattedContent.substring(0, 100) + '...');
            console.log('📖 [STORY-FORMAT] Contains line breaks:', formattedContent.includes('\n\n'));
            contentElement.style.whiteSpace = 'pre-wrap'; // Preserve line breaks
            contentElement.innerHTML = formattedContent.replace(/\n\n/g, '<br><br>'); // Convert line breaks to HTML
            
            // CRITICAL: Scroll to bottom after formatting the story
            console.log('📖 [STORY-SCROLL] Story formatted, scrolling to bottom immediately');
            
            // Immediate scroll - no delay
            const chatContainer = document.getElementById('chat-messages');
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
                console.log('📖 [STORY-SCROLL] Immediate scroll completed');
            }
            
            // Follow-up scrolls to ensure content is visible as it renders
            setTimeout(() => {
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }, 50);
            
            setTimeout(() => {
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }, 200);
            
            setTimeout(() => {
                if (chatContainer) {
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }, 500);
        } else {
            // Short content - just set as plain text
            contentElement.textContent = content;
        }
    }

    // Add the print button now that we know for sure it's a recipe
    const metadataElement = messageElement.querySelector('.metadata');
    if (isRecipe(content) && metadataElement && !metadataElement.querySelector('.recipe-buttons')) {
        const printButton = document.createElement('button');
        printButton.title = 'Print Recipe';
        printButton.innerHTML = '🖨️';
        printButton.style.cssText = `background: transparent; border: none; cursor: pointer; font-size: 20px; padding: 0; margin: 0;`;
        printButton.onclick = () => window.printRecipe(messageElement); // Pass the element, not the text
        
        const recipeButtons = document.createElement('span');
        recipeButtons.className = 'recipe-buttons';
        recipeButtons.style.marginLeft = 'auto';
        recipeButtons.appendChild(printButton);

        metadataElement.style.display = 'flex';
        metadataElement.style.justifyContent = 'space-between';
        metadataElement.appendChild(recipeButtons);
    }
}

function updateMetadata(messageElement, metadata = {}) {

    // Add null check to prevent errors
    if (!messageElement) {
        console.error('updateMetadata called with null messageElement');
        return;
    }        

    // Skip metadata for system messages and date/time responses
    if (metadata.type === 'system' ||
        metadata.messageType === 'time' ||
        metadata.messageType === 'date' ||
        metadata.messageType === 'dateTime') {
        return {};
    }

    const metadataElement = messageElement.querySelector('.metadata');
    if (!metadataElement) return;

    // Get model name with proper fallbacks
    let modelName = metadata?.model || elements.modelSelect?.value || 'gpt-4o-mini';

    // Calculate duration
    let duration;
    if (metadata.metrics?.duration) {
        duration = metadata.metrics.duration;
    } else if (metadata.metrics?.startTime && metadata.metrics?.endTime) {
        duration = ((metadata.metrics.endTime - metadata.metrics.startTime) / 1000).toFixed(2);
    } else if (metadata.startTime) {
        duration = ((Date.now() - metadata.startTime) / 1000).toFixed(2);
    } else {
        duration = '0.00';
    }

    // Get token count - restore original token count handling
    const tokenCount = metadata.tokenCount ||
                      metadata.metrics?.totalTokens ||
                      41; // Default token count for system messages

    // Format the metadata string
    metadataElement.innerHTML = `
        <span class="model-info">${modelName}</span>&nbsp;|&nbsp;
        <span class="response-time">${duration}s</span>&nbsp;|&nbsp;
        <span class="token-count">${tokenCount} tokens</span>
    `;

    // Check for recipe content and handle recipe buttons
    const messageContent = messageElement.querySelector('.message-content');
    if (messageContent) {
        const text = messageContent.textContent;
        const hasIngredients = text.toLowerCase().includes('ingredients:');
        const hasInstructions = text.toLowerCase().includes('instructions:') ||
                                text.toLowerCase().includes('steps:');
    
        if (hasIngredients && hasInstructions) {
            // Make metadata div a flex container
            metadataElement.style.display = 'flex';
            metadataElement.style.alignItems = 'center';
            metadataElement.style.justifyContent = 'space-between';
    
            // Create recipe buttons container
            const recipeButtons = document.createElement('span');
            recipeButtons.className = 'recipe-buttons';
            recipeButtons.style.cssText = `
                display: flex;
                gap: 5px;
                margin-left: auto;
            `;
    
            // Create print button with addEventListener instead of onclick
            const printBtn = document.createElement('button');
            printBtn.innerHTML = '🖨️';
            printBtn.style.cssText = `
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 20px;
                padding: 0;
                margin: 0;
            `;
            printBtn.title = 'Print Recipe';
    
            // Use addEventListener instead of onclick to avoid escaping issues
            printBtn.addEventListener('click', () => {
                window.printRecipe(null, messageElement);
            });
    
            recipeButtons.appendChild(printBtn);
            metadataElement.appendChild(recipeButtons);
        }
    }
}

// Exit conversation function
async function exitConversation(isTimeout = false) {
    try {
        // Stop listening first
            stopListening();

        // Add user's exit message
        addMessageToChat('user', 'exit');

        // Create exit message with special styling
        const exitMessage = MESSAGES.CLOSINGS.EXIT;
        addMessageToChat('assistant', exitMessage, {
            type: 'exit',
            messageType: 'exit'
        });

        // Queue the exit message audio
        await queueAudioChunk(exitMessage);

        // Reset conversation mode and update UI
        state.isConversationMode = false;
        elements.conversationModeToggle.checked = false;
        updateStatusAndConversation(MESSAGES.STATUS.DEFAULT, '');

        // Clear any pending timers
        if (state.inactivityTimer) {
            clearTimeout(state.inactivityTimer);
            state.inactivityTimer = null;
        }

    } catch (error) {
        console.error('Error in exitConversation:', error);
        addMessageToChat('system', MESSAGES.ERRORS.EXIT);
    } finally {
        state.isAISpeaking = false;
        elements.stopAudioButton.style.display = 'none';
    }
}

// Retrieve personal info function
async function getPersonalInfo(key = null) {
    try {
        state.isAISpeaking = true;
        updateStopAudioButton();  // Show button

        const url = `/api/personal-info?userId=${window.sessionId}${key ? `&key=${key}` : ''}`;
        const response = await fetch(url);
        
        const data = await response.json();

        if (data.success && data.info) {
            // If asking about hobbies specifically
            if (key && key.toLowerCase().includes('hobb')) {
                const hobbies = data.info.content.split(',').map(h => h.trim());
                const message = `Your hobbies are: ${hobbies.join(', ')}`;
                addMessageToChat('assistant', message);
                await queueAudioChunk(message);
            } else {
                const message = data.info.content;
                addMessageToChat('assistant', message);
                await queueAudioChunk(message);
            }
        } else {
            const message = "I don't have any information about that yet.";
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
        }
    } catch (error) {
        console.error('Error getting personal info:', error);
        const errorMessage = "Sorry, there was an error retrieving your information.";
        addMessageToChat('assistant', errorMessage);
        await queueAudioChunk(errorMessage);
    } finally {
        state.isAISpeaking = false;
        elements.stopAudioButton.style.display = 'none';
        if (state.isConversationMode) {
            updateStatusAndConversation(MESSAGES.STATUS.LISTENING, MESSAGES.CONVERSATION.ENABLE);
            startListening();
        }
    }
}

async function handleImageRequest(query) {

    // Hide the pagination bar
    // hidePaginationBar();
    
    // Trigger Pag-switch to minimized bar for non-YouTube action
    if (window.youtubeSearchManager && window.youtubeSearchManager.triggerPagSwitch) {
        window.youtubeSearchManager.triggerPagSwitch('non-youtube');
    }

    try {
        const response = await fetch(window.appConfig.getApiUrl('/api/google-image-search?q=${encodeURIComponent(query)}'));
        const data = await response.json();

        if (data.images) {
            // Display images directly without additional text
            displayImageResults(data.images);
        }
    } catch (error) {
        console.error('Error fetching images:', error);
    }
}


// Image analysis function
async function handleImageAnalysis(imageData, prompt = '') {
    try {
        updateStatusAndConversation('Analyzing image...', state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
        const startTime = Date.now();

        // Create message element with correct initial metadata
        const messageElement = addMessageToChat('assistant', '', {
            model: 'gpt-4o',
            isImageAnalysis: true,
            startTime: startTime,
            tokenCount: 0
        });

        // FIXED: Use config-based API URL
        const response = await fetch(window.appConfig.getApiUrl('/api/analyze-image'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: imageData,
                prompt: prompt
            })
        });


        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let analysisText = '';
        let currentChunk = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.response) {
                            analysisText += data.response;
                            currentChunk += data.response;
                            updateMessageContent(messageElement, analysisText);

                            if (data.metrics) {
                                const updatedMetrics = {
                                    ...data.metrics,
                                    model: 'gpt-4o',
                                    isImageAnalysis: true,
                                    startTime: startTime,
                                    endTime: Date.now(),
                                    tokenCount: data.metrics.totalTokens || data.metrics.tokenCount || 0
                                };
                                console.log('Updating metrics:', updatedMetrics);
                                updateMetadata(messageElement, updatedMetrics);
                            }

                            // Only queue audio for non-recipe queries during streaming
                            const sentences = currentChunk.match(/[^.!?]+[.!?]+/g);
                            if (!isRecipeQuery && sentences) {
                                queueAudioChunk(sentences.join(' '));
                                currentChunk = currentChunk.replace(sentences.join(''), '');
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }

        // At the end, only queue audio for non-recipe queries
        if (!isRecipeQuery && currentChunk && currentChunk.trim() && state.selectedVoice) {
            queueAudioChunk(currentChunk.trim());
        }

        // updateStatus('Ready');
        console.log('Ready');
    } catch (error) {
        console.error('Error analyzing image:', error);
        updateStatusAndConversation('Error analyzing image', state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
        throw error;
    }
}

// Handle image upload function
function handleImageUpload(event) {
    // Do NOT show processing indicator here; it's shown on button click
    requestAnimationFrame(() => {
        setTimeout(() => {
            const file = event.target.files[0];
            if (file) {
                state.selectedImageFileName = file.name;
                const reader = new FileReader();
                reader.onload = function(e) {
                    state.selectedImage = null;
                    state.selectedImage = e.target.result;
                    const messageElement = addMessageToChat('user', '');
                    const imageElement = document.createElement('img');
                    imageElement.src = state.selectedImage;
                    imageElement.classList.add('uploaded-image');
                    imageElement.style.cssText = 'max-width: 300px; border-radius: 8px; margin-top: 10px; cursor: pointer;';
                    imageElement.onclick = function() {
                        // Extract object name from LLM response or fallback to file name
                        const messageElement = this.closest('.message');
                        const assistantResponse = messageElement.nextElementSibling;
                        let objectName = null;
                        if (assistantResponse && assistantResponse.classList.contains('assistant')) {
                            const responseText = assistantResponse.querySelector('.message-content').textContent;
                            let quoted = responseText.match(/[""']([^""']+)[""']/);
                            if (quoted && quoted[1]) {
                                objectName = quoted[1];
                            } else {
                                let match = responseText.match(/This is an image of (?:the |a |an )?([A-Za-z0-9\s\-']+?)[,\.]/i)
                                    || responseText.match(/This is the ([A-Za-z0-9\s\-']+?)[,\.]/i)
                                    || responseText.match(/This is the ([A-Za-z0-9\s\-']+?)[,\.]/i)
                                    || responseText.match(/This is ([A-Za-z0-9\s\-']+?)[,\.]/i)
                                    || responseText.match(/This image shows (?:the |a |an )?([A-Za-z0-9\s\-']+?)[,\.]/i)
                                    || responseText.match(/This image depicts (?:the |a |an )?([A-Za-z0-9\s\-']+?)[,\.]/i)
                                    || responseText.match(/This depicts (?:the |a |an )?([A-Za-z0-9\s\-']+?)[,\.]/i)
                                    || responseText.match(/This photo shows (?:the |a |an )?([A-Za-z0-9\s\-']+?)[,\.]/i)
                                    || responseText.match(/This photo depicts (?:the |a |an )?([A-Za-z0-9\s\-']+?)[,\.]/i);
                                if (match && match[1]) {
                                    objectName = match[1].trim();
                                }
                            }
                        }
                        if (!objectName) {
                            objectName = state.selectedImageFileName || 'Image Preview';
                        }
                        // Show modal
                        const modal = document.getElementById('image-analysis-modal');
                        const modalImg = document.getElementById('image-analysis-modal-img');
                        const modalTitle = document.getElementById('image-analysis-modal-title');
                        modalImg.src = this.src;
                        modalImg.alt = objectName;
                        modalTitle.textContent = 'Image: "' + objectName + '"';
                        modal.classList.add('show');
                    };
                    messageElement.querySelector('.message-content').appendChild(imageElement);
                    elements.userInput.focus();
                    elements.userInput.placeholder = "Add a description or ask about the image...";
                    elements.processingIndicator.style.display = 'none';
                    elements.imageInput.value = '';
                };
                reader.readAsDataURL(file);
            } else {
                elements.processingIndicator.style.display = 'none';
            }
        }, 0);
    });
}


// async function searchAndDisplayImages(query) {
//     try {
//         console.log('IMAGE DEBUG: Fetching images for:', query);
//         const response = await fetch(window.appConfig.getApiUrl('/api/google-image-search?q=${encodeURIComponent(query)}'));
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
//         }
//         const data = await response.json();
//         console.log('IMAGE DEBUG: Raw API response:', data);

//         if (data.images && data.images.length > 0) {
//             console.log('IMAGE DEBUG: Found', data.images.length, 'images');
            
//             // Remove duplicates by URL and filter out invalid entries
//             const uniqueImages = [];
//             const seenUrls = new Set();
            
//             for (const item of data.images) {
//                 if (item.link && item.title && !seenUrls.has(item.link)) {
//                     seenUrls.add(item.link);
//                     uniqueImages.push({ link: item.link, title: item.title, thumbnail: item.thumbnail });
//                 }
//             }
            
//             console.log('IMAGE DEBUG: After deduplication:', uniqueImages.length, 'unique images');
//             return { images: uniqueImages };
//         }
//         console.log('IMAGE DEBUG: No images found');
//         return null;
//     } catch (error) {
//         console.error('Error searching images:', error);
//         return null;
//     }
// }




// Helper to extract and remove the image heading from the text

function extractImageHeading(text) {
    // Match: Here are some relevant images for <subject>
    const match = text.match(/Here are some relevant images for ([^\.\n]+)[.!\n]?/i);
    let heading = null;
    let cleanedText = text;
    if (match) {
        heading = `Here are some relevant images for ${match[1].trim()}.`;
        // Remove ALL occurrences of the heading phrase (case-insensitive, with or without punctuation)
        const headingRegex = new RegExp(`Here are some relevant images for ${match[1].trim()}[.!\n]?`, 'gi');
        cleanedText = text.replace(headingRegex, '').replace(/^\s+|\s+$/g, '');
    }
    return { heading, cleanedText };
}



// Function to add more images to the top of existing container
function addMoreImages(newImages, imagesSectionElement) {
    const imageContainer = imagesSectionElement.querySelector('.image-container');
    
    // Create new images HTML
    const newImagesHtml = newImages.map(imgObj => `
        <a href="${imgObj.contextLink || imgObj.link}" target="_blank" rel="noopener noreferrer" class="image-link new-image"
            style="cursor: pointer; text-decoration: none; display: block; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; transition: transform 0.2s ease-in-out; aspect-ratio: 1;">
            <img src="${imgObj.link}" alt="${imgObj.title}" title="${imgObj.title}"
                    style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </a>
    `).join('');
    
    // Insert at the TOP of the container
    imageContainer.insertAdjacentHTML('afterbegin', newImagesHtml);
    
    // Add event listeners to new images
    addImageEventListeners(imagesSectionElement);
    
    // Smooth scroll to show new images
    const scrollContainer = imagesSectionElement.querySelector('.image-container-scroll');
    scrollContainer.scrollTop = 0; // Scroll to top to show new images
}


// Simplified function - no pagination needed!
async function fetchMoreImages(imagesSectionElement, query) {
    const moreImagesBtn = imagesSectionElement.querySelector('.more-images-btn');
    // Show loading state
    moreImagesBtn.textContent = 'Loading...';
    moreImagesBtn.disabled = true;
    moreImagesBtn.style.background = '#6c757d';
    try {
        console.log('IMAGE DEBUG: Fetching more images for:', query);
        const response = await fetch(window.appConfig.getApiUrl('/api/google-image-search?q=' + encodeURIComponent(query)));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('IMAGE DEBUG: More images response:', data);
        if (data.images && data.images.length > 0) {
            // Remove duplicates from new batch
            const existingLinks = new Set(
                Array.from(imagesSectionElement.querySelectorAll('.image-link img')).map(img => img.src)
            );
            const newUniqueImages = data.images.filter(item =>
                item.link && item.title && !existingLinks.has(item.link)
            );
            if (newUniqueImages.length > 0) {
                console.log('IMAGE DEBUG: Adding', newUniqueImages.length, 'new unique images');
                addMoreImages(newUniqueImages, imagesSectionElement);
            } else {
                fetchMoreImagesWithVariation(imagesSectionElement, query);
            }
        }
    } catch (error) {
        console.error('Error fetching more images:', error);
    } finally {
        moreImagesBtn.textContent = 'More Images';
        moreImagesBtn.disabled = false;
        moreImagesBtn.style.background = '#007bff';
    }
}

// Optional: Add variety when we run out of unique images
// Complete function with variation when we run out of unique images
async function fetchMoreImagesWithVariation(imagesSectionElement, query) {
    const variations = [
        `${query} photos`,
        `${query} pictures`, 
        `${query} images`,
        `${query} wallpaper`,
        `beautiful ${query}`,
        `${query} HD`,
        `amazing ${query}`,
        `${query} nature`,
        `${query} wildlife`
    ];
    
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    console.log('IMAGE DEBUG: Trying variation:', randomVariation);
    
    try {
        const response = await fetch(window.appConfig.getApiUrl(`/api/google-image-search?q=${encodeURIComponent(randomVariation)}`));
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('IMAGE DEBUG: Variation response:', data);
            
            if (data.images && data.images.length > 0) {
                // Remove duplicates from variation batch
                const existingLinks = new Set(
                    Array.from(imagesSectionElement.querySelectorAll('.image-link img')).map(img => img.src)
                );
                
                const newUniqueImages = data.images.filter(item => 
                    item.link && item.title && !existingLinks.has(item.link)
                );
                
                if (newUniqueImages.length > 0) {
                    console.log('IMAGE DEBUG: Adding', newUniqueImages.length, 'variation images');
                    addMoreImages(newUniqueImages, imagesSectionElement);
                } else {
                    console.log('IMAGE DEBUG: No new images found even with variation');
                }
            }
        
    } catch (error) {
        console.error('Error fetching variation images:', error);
    }
}

// Function to add event listeners to images (hover + error handling)
function addImageEventListeners(messageElement) {
    messageElement.querySelectorAll('.image-link:not(.processed)').forEach(link => {
        link.classList.add('processed'); // Mark as processed to avoid duplicate listeners
        
        link.onmouseover = () => link.style.transform = 'scale(1.05)';
        link.onmouseout = () => link.style.transform = 'scale(1)';

        const img = link.querySelector('img');
        img.onerror = () => {
            // Remove the entire link (image card) from the DOM
            if (link && link.parentNode) {
                link.parentNode.removeChild(link);
            }
            if (imageHistory[subject]) imageHistory[subject].delete(img.src);
            console.log('Image failed to load and was removed:', img.src);
        };
    });
}

// =====================================================
// DATE/TIME HANDLING FUNCTIONS
// =====================================================

// Rename fetchDateTime to fetchDateTimeData (handles data fetching)
async function fetchDateTimeData(timezone, type) {
    try {
        const response = await fetch(window.appConfig.getApiUrl('/api/datetime'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ timezone, type })  // Pass type to server
        });

        if (!response.ok) {
            throw new Error('Failed to fetch date/time');
        }

        const data = await response.json();
        console.log('DateTime data received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching date/time:', error);
        throw error;
    }
}

// Rename checkDateTime to handleDateTimeResponse (handles UI and audio)
async function handleDateTimeResponse(type) {

    // Hide the pagination bar
    //hidePaginationBar();

    try {
        const timeData = await fetchDateTimeData(
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            type
        );

        // Add messageType to the response data
        timeData.messageType = type;  // Add this line

        // Use SSE to send response
        if (state.eventSource && state.eventSource.readyState === EventSource.OPEN) {
            state.eventSource.dispatchEvent(new MessageEvent('message', {
                data: JSON.stringify(timeData)
            }));
        } else {
            // Fallback if SSE not available
            const messageElement = addMessageToChat('assistant', timeData.response, null, type);
        }
    } catch (error) {
        console.error('Error handling date/time:', error);
        addMessageToChat('error', 'Error: Failed to fetch date/time information');
    }
}


// Add helper function to handle responses consistently
async function handleResponse(response) {
    if (state.selectedVoice) {
        try {
            await queueAudioChunk(response);
            state.isPlaying = false;
            await playNextInQueue();
        } catch (error) {
            console.error('Error playing audio response:', error);
        }
    }  // <-- Add this closing brace
}


// =====================================================
// RECIPE HANDLING FUNCTIONS
// =====================================================


// =====================================================
// PERSONAL INFO HANDLING FUNCTIONS
// =====================================================

// Add validation before storing personal info
async function storePersonalInfo(info) {

    // Hide the pagination bar
    //hidePaginationBar();

    try {
        state.isAISpeaking = true;
        updateStopAudioButton();  // Show button

        // Clean up the info text by removing "remember that" or "remember"
        let cleanInfo = info
            .replace(/^remember that /i, '')
            .replace(/^remember /i, '')
            .replace(/^my /i, 'your ');  // Replace "my" with "your"

        const response = await fetch(window.appConfig.getApiUrl('/api/personal-info'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: window.sessionId,
                content: cleanInfo
            })
        });

        const data = await response.json();
        if (data.success) {
            const message = `I'll remember that ${cleanInfo}`;
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
        }
    } catch (error) {
        console.error('Error storing personal info:', error);
        const errorMessage = "Sorry, there was an error storing your information.";
        addMessageToChat('assistant', errorMessage);
        await queueAudioChunk(errorMessage);
    } finally {
        state.isAISpeaking = false;
        elements.stopAudioButton.style.display = 'none';
    }
}

// Add validation when retrieving personal info
function getPersonalInfoStorage(type) {
    return localStorage.getItem(type);
}




// Add function to check stored information
async function checkStoredInfo(type) {
    try {
        // Check localStorage first
        const cachedValue = localStorage.getItem(`user_${type}`);
        if (cachedValue) {
            return cachedValue;
        }

        // If not in localStorage, check MongoDB
        const response = await retrievePersonalInfo(type);
        if (response?.personalInfo?.[type]) {
            localStorage.setItem(`user_${type}`, response.personalInfo[type]);
            return response.personalInfo[type];
        }
        return null;
    } catch (error) {
        console.error('Error checking stored info:', error);
        return null;
    }
}

// Categorize memory function
function categorizeMemory(text) {
    for (const [category, pattern] of Object.entries(MEMORY_CATEGORIES)) {
        if (pattern.test(text)) {
            return category;
        }
    }
    return 'general';
}

// Extract keywords function
function extractKeywords(text) {
    // Remove common words and punctuation
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but'];
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => !stopWords.includes(word));
}

// Extract time reference function
function extractTimeReference(text) {
    const timePatterns = {
        specific: /(?:at|on|during)\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
        relative: /(?:tomorrow|next|in\s+\d+\s+(?:days?|weeks?|months?))/i,
        recurring: /(?:every|each)\s+(\w+)/i,
        date: /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/
    };

    for (const [type, pattern] of Object.entries(timePatterns)) {
        const match = text.match(pattern);
        if (match) {
            return {
                type,
                value: match[1] || match[0],
                original: match[0]
            };
        }
    }
    return null;
}

// Extract related terms function
function extractRelatedTerms(text) {
    const terms = [];

    // Extract people
    const peoplePattern = /(?:with|and|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    let match;
    while ((match = peoplePattern.exec(text)) !== null) {
        terms.push({ type: 'person', value: match[1] });
    }

    // Extract places
    const placePattern = /(?:at|in|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    while ((match = placePattern.exec(text)) !== null) {
        terms.push({ type: 'place', value: match[1] });
    }

    return terms;
}




// =====================================================
// BING SEARCH MODULE
// =====================================================

const handleBingSearch = {
    async handleSearchRequest(messageText) {
        console.log('Bing search request:', messageText);

        // Stop listening during search playback
        if (state.isListening) {
            stopListening();
            state.isListening = false;
            updateStatus('Microphone disabled during search playback');
        }

        try {
            const query = messageText
                .replace(/search for|look up/i, '')
                .trim();

            const response = await fetch(window.appConfig.getApiUrl('/api/bing-search'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query })
            });

            const data = await response.json();
            addMessageToChat('assistant', data.response);
            return true;
        } catch (error) {
            console.error('Bing search error:', error);
            addMessageToChat('assistant', 'Sorry, there was an error processing your search request.');
            return true;
        }
    }
};



// =====================================================
// END OF app.js FILE v20.0.0
// =====================================================


function showLocalVideoModal(videoUrl, title) {
    // Remove any existing modal
    const existing = document.getElementById('local-video-modal');
    if (existing) existing.remove();
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'local-video-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
        <div style="background:#222;padding:24px;border-radius:12px;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;">
            <button id="close-local-video-modal" style="align-self:flex-end;margin-bottom:8px;font-size:1.5em;">&times;</button>
            <h2 style="color:#fff;margin-bottom:12px;">${title}</h2>
            <video src="${videoUrl}" controls autoplay style="max-width:80vw;max-height:70vh;border-radius:8px;background:#000;"></video>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-local-video-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}


// =====================================================
// EVENT LISTENERS
// =====================================================

// Slideout help/examples toggle
const toggleHelpBtn = document.getElementById('toggle-help-btn');
const slideoutHelp = document.getElementById('slideout-help');
if (toggleHelpBtn && slideoutHelp) {
  toggleHelpBtn.addEventListener('click', () => {
    const isOpen = slideoutHelp.style.display === 'block';
    slideoutHelp.style.display = isOpen ? 'none' : 'block';
    toggleHelpBtn.textContent = isOpen ? '+' : '–';
  });
}

// Example Prompts toggle for prompt field
const examplePromptsLink = document.getElementById('example-prompts-link');
const examplePromptsHelp = document.getElementById('example-prompts-help');
if (examplePromptsLink && examplePromptsHelp) {
  examplePromptsLink.addEventListener('click', () => {
    const isOpen = examplePromptsHelp.style.display === 'block';
    examplePromptsHelp.style.display = isOpen ? 'none' : 'block';
    const caret = examplePromptsLink.querySelector('.caret');
    if (caret) {
      caret.classList.toggle('open');
    }
  });
}

// Modal close logic
window.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('image-analysis-modal');
    const closeBtn = document.getElementById('image-analysis-modal-close');
    if (closeBtn) {
        closeBtn.onclick = () => { modal.classList.remove('show'); };
    }
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };
});

// Expose functions to global scope for use by other modules
window.addMessageToChat = addMessageToChat;

console.log('🔧 [TEST] App.js script loaded completely - DOMContentLoaded should fire next');

// Clear all YouTube cache entries (comprehensive cleanup)
function clearAllYouTubeCache() {
    console.log('🧹 [CACHE-CLEAR] Starting comprehensive YouTube cache cleanup...');
    
    let clearedCount = 0;
    const keysToRemove = [];
    
    // Collect all YouTube-related keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('yt_')) {
            keysToRemove.push(key);
        }
    }
    
    // Remove all YouTube cache keys
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        clearedCount++;
        console.log('🗑️ [CACHE-CLEAR] Removed:', key);
    });
    
    console.log(`✅ [CACHE-CLEAR] Cleared ${clearedCount} YouTube cache entries`);
    
    if (window.showToast) {
        window.showToast(`🧹 Cleared ${clearedCount} YouTube cache entries`, 'success');
    }
    
    return clearedCount;
}

// Make it globally available
window.clearAllYouTubeCache = clearAllYouTubeCache;

// Add debug function for checking cache data
window.debugCacheData = function(query = 'fender', page = 2) {
    console.log(`🔍 [DEBUG] Checking cache data for query: ${query}, page: ${page}`);
    
    const key = `yt_search_${query.toLowerCase().replace(/\s+/g, '_')}_p${page}_none`;
    console.log(`🔍 [DEBUG] Cache key: ${key}`);
    
    const cachedData = localStorage.getItem(key);
    if (!cachedData) {
        console.log(`❌ [DEBUG] No cache data found for key: ${key}`);
        return null;
    }
    
    try {
        const parsed = JSON.parse(cachedData);
        console.log(`✅ [DEBUG] Cache data found:`, parsed);
        console.log(`📊 [DEBUG] Data structure keys:`, Object.keys(parsed));
        
        if (parsed.videos) {
            console.log(`📹 [DEBUG] Videos array length:`, parsed.videos.length);
            console.log(`📹 [DEBUG] First video:`, parsed.videos[0]);
        } else if (parsed.video) {
            console.log(`📹 [DEBUG] Single video:`, parsed.video);
        } else {
            console.log(`❌ [DEBUG] No videos or video property found`);
        }
        
        return parsed;
    } catch (error) {
        console.error(`❌ [DEBUG] Error parsing cache data:`, error);
        return null;
    }
};

// Add debug function for checking access history array
window.debugAccessHistory = function() {
    console.log('🔍 [DEBUG-ACCESS-HISTORY] Current access history array:');
    
    if (window.youtubeSearchManager && window.youtubeSearchManager.queryAccessHistory) {
        const history = window.youtubeSearchManager.queryAccessHistory;
        console.log(`📈 [DEBUG-ACCESS-HISTORY] Array length: ${history.length}`);
        
        history.forEach((item, index) => {
            console.log(`📈 [DEBUG-ACCESS-HISTORY] [${index}] ${item.cleanQuery} - accessed ${item.accessTime}`);
        });
        
        if (history.length === 0) {
            console.log('📈 [DEBUG-ACCESS-HISTORY] Access history is empty - no queries accessed yet');
        }
    } else {
        console.log('❌ [DEBUG-ACCESS-HISTORY] YouTubeSearchManager or queryAccessHistory not available');
    }
};

// Add event listener for Add to Playlist buttons
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.add-to-playlist-SINGLE-btn, .add-to-playlist-MULTI-btn, .add-to-playlist-MULTI-MOCK-btn, .add-to-playlist-SINGLE-mock-btn');
    if (btn) {
        try {
            const videoData = JSON.parse(decodeURIComponent(btn.dataset.video));
            const playlistName = decodeURIComponent(btn.dataset.playlist);
            if (window.playlistManager) {
                window.playlistManager.show(videoData, playlistName);
            } else {
                console.error('PlaylistManager not initialized');
                if (window.showToast) {
                    window.showToast('Unable to open playlist manager. Please try again.');
                }
            }
        } catch (error) {
            console.error('Error parsing video data:', error);
            if (window.showToast) {
                window.showToast('Error adding to playlist. Please try again.');
            }
        }
    }
});

// Client-side backfill function to update playlist video durations from localStorage cache
async function backfillPlaylistDurations() {
    console.log('🔄 [CLIENT-BACKFILL] Starting playlist duration backfill from localStorage cache');
    
    try {
        // Get all playlists first
        const playlistsResponse = await fetch('/api/playlists', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });
        
        if (!playlistsResponse.ok) {
            throw new Error('Failed to fetch playlists');
        }
        
        const playlists = await playlistsResponse.json();
        console.log(`📋 [CLIENT-BACKFILL] Found ${playlists.length} playlists`);
        
        // Build video cache from localStorage
        const videoCache = new Map();
        let totalCacheEntries = 0;
        
        // Parse all localStorage entries that start with 'yt_search_'
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('yt_search_')) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    if (cacheData && cacheData.data && cacheData.data.videos) {
                        totalCacheEntries++;
                        cacheData.data.videos.forEach(video => {
                            if (video.id && video.duration) {
                                videoCache.set(video.id, {
                                    duration: video.duration,
                                    channelTitle: video.channelTitle || '',
                                    title: video.title || ''
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.warn(`⚠️ [CLIENT-BACKFILL] Failed to parse cache entry: ${key}`);
                }
            }
        }
        
        console.log(`💾 [CLIENT-BACKFILL] Found ${totalCacheEntries} cache entries with ${videoCache.size} videos`);
        
        let totalVideosProcessed = 0;
        let totalVideosUpdated = 0;
        let cacheHits = 0;
        let cacheMisses = 0;
        
        // Process each playlist
        for (const playlist of playlists) {
            if (!playlist.videos || playlist.videos.length === 0) continue;
            
            console.log(`📋 [CLIENT-BACKFILL] Processing playlist: ${playlist.name} (${playlist.videos.length} videos)`);
            
            const videosToUpdate = [];
            
            for (const video of playlist.videos) {
                totalVideosProcessed++;
                
                // Skip if already has duration
                if (video.duration && video.duration !== '' && video.duration !== 'N/A') {
                    continue;
                }
                
                // Look up in cache
                const cachedVideo = videoCache.get(video.videoId);
                if (cachedVideo && cachedVideo.duration) {
                    cacheHits++;
                    videosToUpdate.push({
                        videoId: video.videoId,
                        duration: cachedVideo.duration,
                        channelTitle: cachedVideo.channelTitle || video.channelTitle || ''
                    });
                    console.log(`✅ [CLIENT-BACKFILL] Found duration for: ${video.title} -> ${cachedVideo.duration}`);
                } else {
                    cacheMisses++;
                    console.log(`❌ [CLIENT-BACKFILL] No cache data for: ${video.title} (${video.videoId})`);
                }
            }
            
            // Update videos in this playlist if we found any
            if (videosToUpdate.length > 0) {
                try {
                    const updateResponse = await fetch(`/api/playlists/${playlist._id}/videos/bulk-update`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                        },
                        body: JSON.stringify({ updates: videosToUpdate })
                    });
                    
                    if (updateResponse.ok) {
                        totalVideosUpdated += videosToUpdate.length;
                        console.log(`✅ [CLIENT-BACKFILL] Updated ${videosToUpdate.length} videos in playlist: ${playlist.name}`);
                    } else {
                        console.error(`❌ [CLIENT-BACKFILL] Failed to update playlist: ${playlist.name}`);
                    }
                } catch (error) {
                    console.error(`❌ [CLIENT-BACKFILL] Error updating playlist ${playlist.name}:`, error);
                }
            }
        }
        
        console.log(`🎯 [CLIENT-BACKFILL] Backfill complete: ${totalVideosUpdated}/${totalVideosProcessed} videos updated`);
        console.log(`📊 [CLIENT-BACKFILL] Cache hits: ${cacheHits}, Cache misses: ${cacheMisses}`);
        console.log(`✅ [CLIENT-BACKFILL] NO YouTube API calls were made`);
        
        return {
            success: true,
            totalVideosProcessed,
            totalVideosUpdated,
            cacheHits,
            cacheMisses
        };
        
    } catch (error) {
        console.error('❌ [CLIENT-BACKFILL] Error:', error);
        return { success: false, error: error.message };
    }
}

// Make function globally available
window.backfillPlaylistDurations = backfillPlaylistDurations;

// Simple function to analyze localStorage cache for duration data
function analyzeVideoCache() {
    console.log('🔍 [CACHE-ANALYZER] Analyzing localStorage for video duration data...');
    
    const videoCache = new Map();
    let totalCacheEntries = 0;
    let totalVideos = 0;
    let videosWithDuration = 0;
    
    // Parse all localStorage entries that start with 'yt_search_'
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('yt_search_')) {
            try {
                const cacheData = JSON.parse(localStorage.getItem(key));
                if (cacheData && cacheData.data && cacheData.data.videos) {
                    totalCacheEntries++;
                    console.log(`📋 [CACHE-ANALYZER] Found cache: ${key} (${cacheData.data.videos.length} videos)`);
                    
                    cacheData.data.videos.forEach(video => {
                        totalVideos++;
                        if (video.id && video.duration) {
                            videosWithDuration++;
                            videoCache.set(video.id, {
                                duration: video.duration,
                                channelTitle: video.channelTitle || '',
                                title: video.title || ''
                            });
                            
                            // Show first few examples
                            if (videosWithDuration <= 10) {
                                console.log(`✅ [CACHE-ANALYZER] ${video.title} -> ${video.duration}`);
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn(`⚠️ [CACHE-ANALYZER] Failed to parse: ${key}`);
            }
        }
    }
    
    console.log(`📊 [CACHE-ANALYZER] Summary:`);
    console.log(`   - Cache entries found: ${totalCacheEntries}`);
    console.log(`   - Total videos: ${totalVideos}`);
    console.log(`   - Videos with duration: ${videosWithDuration}`);
    console.log(`   - Cache coverage: ${((videosWithDuration/totalVideos)*100).toFixed(1)}%`);
    
    // Show some sample video IDs that have duration data
    if (videoCache.size > 0) {
        console.log(`🎯 [CACHE-ANALYZER] Sample video IDs with duration data:`);
        let count = 0;
        for (const [videoId, data] of videoCache.entries()) {
            if (count < 5) {
                console.log(`   - ${videoId}: ${data.duration} (${data.title})`);
                count++;
            }
        }
    }
    
    return {
        totalCacheEntries,
        totalVideos,
        videosWithDuration,
        videoCache
    };
}

// Export localStorage cache to JSON file for Node.js script
function exportLocalStorageCache() {
    console.log('📤 [EXPORT] Exporting localStorage cache to file...');
    
    const cacheData = {};
    
    // Export all localStorage entries
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            cacheData[key] = localStorage.getItem(key);
        }
    }
    
    // Create downloadable JSON file
    const jsonString = JSON.stringify(cacheData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = 'localStorage-cache.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ [EXPORT] localStorage cache exported to localStorage-cache.json');
    console.log('📋 [EXPORT] Move this file to the scripts/ directory and run:');
    console.log('   node scripts/playlist-duration-backfill.js');
    
    return cacheData;
}

// Helper to update both status and conversation message with separator
function updateStatusAndConversation(statusMsg, conversationMsg) {
    const statusEl = document.getElementById('status');
    const convEl = document.getElementById('conversation-status');
    if (statusEl) statusEl.innerHTML = statusMsg || '';
    if (convEl) {
        if (conversationMsg && conversationMsg.trim()) {
            // Only show separator and conversation message if there's actually a conversation message
            convEl.innerHTML = '<span class="status-separator" style="display:inline-block;width:1.5px;height:100%;min-height:24px;background:#bbb;margin:0 8px;vertical-align:middle;align-self:stretch;"></span>' +
                               `<span class="conversation-enable-message">${conversationMsg}</span>`;
        } else {
            convEl.innerHTML = '';
        }
    }
}

// Helper to detect subject queries
function shouldTriggerImageSearch(message) {
    // Simple heuristic: if the message starts with 'who is', 'what is', 'tell me about', 'show me', 'give me info on', etc.
    return /^(who|what|tell me about|show me|give me info on|describe|info about|facts about|biography of|history of)\b/i.test(message.trim());
}

// Helper to extract subject from message
function extractSubjectFromMessage(message) {
    // Remove common prefixes and return the rest
    return message.replace(/^(who is|what is|tell me about|show me|give me info on|describe|info about|facts about|biography of|history of)\b/i, '').replace(/[.?!]+$/, '').trim();
}

// At the top-level (global for this session):
const imageHistory = {};

// Global function for clearing script log
window.clearScriptLog = function() {
  const scriptLog = document.getElementById('script-log');
  if (scriptLog) {
    scriptLog.innerHTML = '';
  }
};

// Handle conversation mode toggle
async function handleConversationModeToggle() {
    console.log('[handleConversationModeToggle] called, checked:', this.checked);
    if (this.checked) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            state.isConversationMode = true;
            const userName = await checkUserName();
            const timeOfDay = getTimeOfDay();
            let welcomeMessage = userName
                ? `Conversation mode enabled. Good ${timeOfDay} ${userName}! Say "exit" when you'd like to end our chat.`
                : 'Conversation mode enabled. Say "exit" to end the conversation.';
            state.isProcessing = false;
            state.isSending = false;
            state.isAISpeaking = false;
            state.isListening = false;
            resetAudioState();
            startInactivityTimer();
            console.log('[handleConversationModeToggle] Setting status to LISTENING');
            updateStatusAndConversation(MESSAGES.STATUS.LISTENING, MESSAGES.CONVERSATION.ENABLE);
            startListening();
        } catch (err) {
            console.error('Microphone permission denied:', err);
            this.checked = false;
            state.isConversationMode = false;
            updateStatusAndConversation('Microphone access is required for conversation mode. Please enable it in your browser settings.', '');
        }
    } else {
        state.isConversationMode = false;
        clearInactivityTimer();
        updateStatusAndConversation(MESSAGES.STATUS.DEFAULT, '');
        stopListening();
    }
}

function setupSSEConnection() {
    if (state.eventSource) {
        state.eventSource.close();
    }

    try {
        console.log('Initializing SSE connection...');
        const apiUrl = window.appConfig.getApiUrl('/api/chat');
        state.eventSource = new EventSource(`${apiUrl}?sessionId=${window.sessionId}`);

        state.eventSource.onopen = () => {
            console.log('━━━━━━━━━━━ SSE Connection ━━━━━━━━━━━');
            console.log('Status: Connected');
            console.log('Session:', window.sessionId);
            console.log('Timestamp:', new Date().toLocaleTimeString());
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            state.sseRetryCount = 0;

            // Show "SSE Connected" briefly
            // updateStatus('SSE Connected');

            // Then switch to appropriate status after a short delay
            setTimeout(() => {
                if (state.isAISpeaking) {
                    console.log('Status: AI Speaking');
                    updateStatusAndConversation('AI is speaking...', state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
                } else if (state.isConversationMode) {
                    console.log('Status: Listening');
                    updateStatusAndConversation('Listening...', MESSAGES.CONVERSATION.ENABLE);
                } else {
                    console.log('Status: Ready');
                    // updateStatus('Click the microphone button to start speech recognition, enable Conversation Mode, or type a message and press Send.');
                }
            }, 1000);
        };

        state.eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                // Heartbeat event handler
                if (data.type === 'heartbeat') {
                    if (data.timestamp) {
                        // console.log('💓 Heartbeat received:', new Date(data.timestamp).toLocaleTimeString());
                    } else {
                        // console.log('💓 Heartbeat received (no valid timestamp)');
                    }
        return;
      }
                // console.log('SSE message received:', data);
                
                if (data.type === 'status') {
                    updateStatusAndConversation(data.message, state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
                } else if (data.type === 'error') {
                    console.error('SSE error:', data.message);
                    updateStatusAndConversation('Error: ' + data.message, state.isConversationMode ? MESSAGES.CONVERSATION.ENABLE : '');
                }
            } catch (error) {
                console.error('Error processing SSE message:', error);
            }
        };

        state.eventSource.onerror = (error) => {
            console.error('SSE Connection error:', error);
                state.eventSource.close();
            
            // Implement exponential backoff for reconnection
            const reconnectDelay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
            state.reconnectAttempts++;
            
            console.log(`Reconnecting in ${reconnectDelay}ms (attempt ${state.reconnectAttempts})`);
            setTimeout(() => {
                if (state.reconnectAttempts < 5) {
                setupSSEConnection();
                }
            }, reconnectDelay);
        };
    } catch (error) {
        console.error('Error setting up SSE connection:', error);
    }
}

// Global logout function
window.logout = function() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    sessionStorage.clear();
    if (window.ToastManager && typeof window.ToastManager.show === 'function') {
        window.ToastManager.show('You have been logged out.', 'info');
    }
    const loginModal = document.getElementById('login-manager-modal');
    if (loginModal) {
        loginModal.style.display = 'flex';
    } else {
        location.reload();
    }
};

// In setupEventListeners or profile dropdown logic, attach to logout-menu-item
const logoutMenuItem = document.getElementById('logout-menu-item');
if (logoutMenuItem) {
    logoutMenuItem.addEventListener('click', function() {
        window.logout();
    });
}

const token = localStorage.getItem('jwtToken');
if (!token) {
    // Show login modal or redirect to login page
    showLoginModal();
}

// Add Bug Tracking to profile dropdown
const profileDropdown = document.getElementById('user-dropdown');
if (profileDropdown && !document.getElementById('bug-tracking-menu-item')) {
    const bugMenuItem = document.createElement('div');
    bugMenuItem.className = 'user-dropdown-item';
    bugMenuItem.id = 'bug-tracking-menu-item';
    bugMenuItem.textContent = 'Bug Tracking';
    // Insert before Logout
    const logoutItem = document.getElementById('logout-menu-item');
    if (logoutItem) {
        profileDropdown.insertBefore(bugMenuItem, logoutItem);
    } else {
        profileDropdown.appendChild(bugMenuItem);
    }
    bugMenuItem.addEventListener('click', function () {
        // Hide dropdown
        profileDropdown.classList.remove('open');
        // Show BugTracker
        if (!window._bugTrackerInstance) {
            window._bugTrackerInstance = new window.BugTracker();
            window._bugTrackerInstance.init();
        } else {
            document.getElementById('bug-tracker-container').style.display = 'block';
            window._bugTrackerInstance.loadBugs();
        }
        // Optionally hide other panels
        if (window.adminPanel && typeof window.adminPanel.hide === 'function') {
            window.adminPanel.hide();
        }
    });
}

function setUserInfo(user) {
    if (user && user.email) {
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userRole', user.role || 'user');
} else {
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
    }
}

// In your login logic (after successful login):
// Clear previous auth state, then set new token and user info
function handleLoginSuccess(data) {
    // Clear all previous state
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    sessionStorage.clear();
    // Set new token and user info
    localStorage.setItem('jwtToken', data.token);
    setUserInfo(data.user);
    // Hide login modal if present
    const loginModal = document.getElementById('login-manager-modal');
    if (loginModal) loginModal.style.display = 'none';
    // Update AdminPanel with new user info if open
    if (window.adminPanel) {
        window.adminPanel.currentUser = { email: data.user.email, role: data.user.role };
        if (typeof window.adminPanel.updateRoleBasedUI === 'function') {
            window.adminPanel.updateRoleBasedUI();
        }
    }
    // After login, open intended feature if any
    if (window._postLoginIntent) {
        if (window._postLoginIntent === 'admin') {
            openAdminPanel();
        } else if (window._postLoginIntent === 'bug-tracker') {
            openBugTracker();
        }
        window._postLoginIntent = null;
    }
}

// When showing AdminPanel, always use latest user info
function showAdminPanel() {
    if (!window.adminPanel) return;
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');
    if (email && role) {
        window.adminPanel.currentUser = { email, role };
        if (typeof window.adminPanel.updateRoleBasedUI === 'function') {
            window.adminPanel.updateRoleBasedUI();
        }
    }
    window.adminPanel.show();
}

window._postLoginIntent = null;

function isLoggedIn() {
    return !!localStorage.getItem('jwtToken');
}

function showLoginModalWithIntent(intent) {
    window._postLoginIntent = intent;
    const loginModal = document.getElementById('login-manager-modal');
    if (loginModal) loginModal.style.display = 'flex';
}

function openBugTracker() {
    if (!window._bugTrackerInstance) {
        window._bugTrackerInstance = new window.BugTracker();
        window._bugTrackerInstance.init();
    } else {
        document.getElementById('bug-tracker-container').style.display = 'block';
        window._bugTrackerInstance.loadBugs();
    }
    if (window.adminPanel && typeof window.adminPanel.hide === 'function') {
        window.adminPanel.hide();
    }
}

async function openAdminPanel() {
    if (!window.adminPanel) {
        const module = await import('./components/Admin/AdminPanel/AdminPanel.js');
        window.adminPanel = new module.default();
        await window.adminPanel.init();
    }
    showAdminPanel();
}

// Add a helper to detect image requests in the user query
function userRequestedImages(query) {
    // Detect common image request patterns
    return /(image|images|picture|pictures|photo|photos|provide images|show images|show me images|show me a picture|show me photos|show me pictures|show me an image|show me some images|show me some pictures|show me some photos|show me|display images|display pictures|display photos|display an image|display a picture|display a photo|display some images|display some pictures|display some photos)/i.test(query);
}

// Improved subject extraction for image search
function extractImageSubject(message, responseText) {
    // Try to extract the main subject from the recipe title (first line) or before 'and provide images' etc.
    let subject = '';
    // 1. For recipes, use the first non-empty line as the subject
    const recipeTitleMatch = responseText && responseText.trim().match(/^([A-Za-z0-9 ,.'-]+)$/m);
    if (recipeTitleMatch && recipeTitleMatch[1]) {
        subject = recipeTitleMatch[1].trim();
    } else {
        // 2. For general queries, extract before 'and provide images' or similar
        const generalMatch = message.match(/tell me about (.*?) (and|with)? (provide|show|display)? ?(images?|pictures?|photos?)/i);
        if (generalMatch && generalMatch[1]) {
            subject = generalMatch[1].trim();
        } else {
            // 3. Fallback: remove image-related words and trim
            subject = message.replace(/(and|with)? ?(provide|show|display)? ?(images?|pictures?|photos?)/gi, '').trim();
        }
    }
    // 4. Final fallback: if still empty, use the whole message
    if (!subject) subject = message.trim();
    console.log('[IMAGE DEBUG] Extracted subject for image search:', subject);
    return subject;
}

// Add logic to detect assistant output placeholders as image triggers
function containsImagePlaceholder(responseText) {
    // Match lines like 'Here are some mouthwatering images of ...', 'Here are images for ...', etc.
    const regex = /here are( some)?( [a-z]+)? images (of|for) ([^\n\.]*)/i;
    const match = responseText.match(regex);
    if (match) {
        console.log('[IMAGE DEBUG] Detected image placeholder line:', match[0]);
        return true;
    }
    // Also match bracketed placeholders
    return /\[here are( some)?( [a-z]+)? images? (of|for) .+\]/i.test(responseText);
}

// Update subject extraction from placeholder
function extractSubjectFromPlaceholder(responseText) {
    // Extract subject from 'Here are ... images of/for ...' line
    const regex = /here are( some)?( [a-z]+)? images (of|for) ([^\n\.]*)/i;
    const match = responseText.match(regex);
    if (match && match[4]) {
        return match[4].trim();
    }
    // Fallback: bracketed placeholder
    const bracketMatch = responseText.match(/\[here are( some)?( [a-z]+)? images? (of|for) (.+?)\]/i);
    if (bracketMatch && bracketMatch[4]) {
        return bracketMatch[4].trim();
    }
    return '';
}

document.addEventListener('DOMContentLoaded', function() {
    const mediaLibraryBtn = document.getElementById('mediaLibraryBtn');
    if (mediaLibraryBtn) {
        mediaLibraryBtn.addEventListener('click', function() {
            console.log('[DEBUG] Media Library button clicked in app.js');
        });
    }
});

console.log('[DEBUG] MediaLibraryManager instance:', window.mediaLibraryManager);

