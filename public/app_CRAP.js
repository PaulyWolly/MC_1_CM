/*
  APP_CRAP.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

// =====================================================
// IMPORTS NEEDED FOR NEW ES6 MODULES
// =====================================================

import playlistManager from './components/PlaylistManager.js';
import toastManager from './components/ToastManager.js';

// Initialize PlaylistManager globally
console.log('Initializing PlaylistManager...');

console.log('>>>>>>> [APP] App.js loaded - using new recipe code from /app_working_recipe');

window.playlistManager = playlistManager;
console.log('PlaylistManager initialized:', window.playlistManager);

// Initialize ToastManager globally
console.log('Initializing ToastManager...');
window.toastManager = toastManager;
console.log('ToastManager initialized:', window.toastManager);

// =====================================================
// GLOBAL SCOPED CONSTANTS
// =====================================================

const SHOW_VOICE_DROPDOWN = false;

// Time constants
const INTERVAL = 10;  // Set timeout duration in minutes
const CONVERSATION_INACTIVITY_TIMEOUT = INTERVAL * 60 * 1000;  // Convert minutes to milliseconds

// YouTube pagination constants
const YOUTUBE_HEADER_HEIGHT = 20;  // Controls how far below the header results appear
const YOUTUBE_SCROLL_PADDING = 20; // Extra padding below the header

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
        DEFAULT: `<br>Click the <span class="status-keyword">Conversation Mode</span> checkbox, or press the <span class="status-keyword">Microphone</span> button <br>...to enable conversations, or enter a message and press Send</span><br><br>`,
        LISTENING: "Listening...",
        SPEAKING: "AI is speaking...",
        PROCESSING: "Processing...",
        READY: "Ready",
        ERROR: "Error occurred. Please refresh the page if issues persist.",
        INITIALIZING: "Initializing app...",
        VIDEO_PLAYING: 'Video playing...'
    },
    CONVERSATION: {
        ENABLE: "Conversation Mode is now enabled. You can speak freely \n ...and say 'exit' when you want to end the conversation.",
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
    - ALWAYS format recipes exactly like this:
        RECIPE NAME IN CAPS ONLY

        Here is a delicious recipe for [recipe name].
        A brief description of the recipe.

        Ingredients:
        1. First ingredient with exact measurement
        2. Second ingredient with exact measurement
        3. Each ingredient on its own line with number

        Instructions:
        1. First step in clear, concise language
        2. Second step with specific temperatures/times
        3. Each step on its own line with number

        Enjoy your [recipe name]!

6. When asked for a response, ALWAYS provide at least 2-4 paragraphs of text.
7. When telling a story or providing a longer response, break the response into paragraphs of 4-5 sentences each. 
8. Always add a blank line between paragraphs.
9. When telling a story or providing a longer response, use expressive language, varied punctuation (such as !, ?, …), and include relevant emojis to convey emotion, action, or mood. Make the output engaging and lively.

CRITICAL INSTRUCTIONS FOR IMAGE REQUESTS:
1. When users ask for images, respond with: "Here are some relevant images for [topic]" at the end of your response.
2. DO NOT provide image URLs or links
3. DO NOT mention being an AI or having any limitations
4. DO NOT apologize for image-related capabilities
5. Keep responses about images brief and positive

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
    chatMessages: document.getElementById('chat-messages'),
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    micButton: document.getElementById('mic-button'),
    status: document.getElementById('status'),
    conversationModeToggle: document.getElementById('conversation-mode'),
    modelSelect: document.getElementById('model-select'),
    voiceSelect: document.getElementById('voice-select'),
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
        // // FIXED: Use enterAISpeakingMode() instead of just setting state
 enterAISpeakingMode();
        updateStopAudioButton();  // Show button
    }

    console.log('Queueing audio chunk:', text);
    
    // Split into sections, but preserve our protected names
    const sections = text.split(/(?=Ingredients:|Instructions:)/);
    let chunks = [];

    sections.forEach(section => {
        const sectionChunks = splitTextIntoChunks(section, 200, true);
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
            if (state.audioQueue.length > 0 && !state.stopRequested) {
                setTimeout(playNextInQueue, 0); // Schedule next chunk
            } else {
                enterListeningMode();
            }
        };

        await state.currentAudio.play();

        // If stop is requested after playback starts
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
    const honorifics = [
        'Mr', 'Mrs', 'Ms', 'Dr', 'Sr', 'Jr', 'Prof', 'Rev', 'Fr', 'St', 'Mx', 'Capt', 'Lt', 'Col', 'Gen', 'Sgt', 'Adm', 'Maj', 'Hon', 'Pres', 'Gov', 'Amb', 'Sec', 'Supt', 'Rep', 'Sen', 'Treas', 'Dir', 'H.G', 'J.K', 'HG', 'JK'
    ];
    // For TTS: completely remove the period after honorifics and abbreviations
    // Also match forms with optional spaces/periods
    return text.replace(new RegExp(`\\b(${honorifics.join('|').replace(/\./g, '\\.?')})\\.?\\s?\\.?\\s?(?=\\w)`, 'gi'), (m) => m.replace(/\./g, ''));
}

function restoreHonorifics(text) {
    const honorifics = [
        'Mr', 'Mrs', 'Ms', 'Dr', 'Sr', 'Jr', 'Prof', 'Rev', 'Fr', 'St', 'Mx', 'Capt', 'Lt', 'Col', 'Gen', 'Sgt', 'Adm', 'Maj', 'Hon', 'Pres', 'Gov', 'Amb', 'Sec', 'Supt', 'Rep', 'Sen', 'Treas', 'Dir', 'H.G', 'J.K', 'HG', 'JK'
    ];
    // For display: ensure periods are present (for classic honorifics only)
    return text.replace(/\b(HG|JK)\b/g, (m) => m[0] + '.' + m[1] + '.');
}

// =====================================================
// TTS PRE-PROCESSING FUNCTIONS
// =====================================================

// Add TTS pre-processing for U.S. and U.S.A.
function preprocessForTTS(text) {
    let processed = text
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
async function searchAndDisplayImages(query, messageElement = null) {
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
                displayImageResults(uniqueImages, messageElement, query);
            }
        }
    } catch (error) {
        console.error('IMAGE DEBUG: Error in searchAndDisplayImages:', error);
    }
}

function insertAndStyleImages(images, messageElement, headingText, originalQuery) {
    // Check if messageElement is provided and valid
    if (!messageElement || !messageElement.querySelector) {
        console.error('IMAGE DEBUG: Invalid messageElement provided to insertAndStyleImages');
        return;
    }
    
    const headingHtml = headingText ? `<h3 style="margin: 15px 0 10px 0; color: #333; font-size: 16px;">${headingText}</h3>` : "";
    
    // Check if images section already exists
    const existingImageSection = messageElement.querySelector('.image-section');
    if (existingImageSection) {
        // If section exists, just add new images to the top
        addMoreImages(images, existingImageSection);
        return;
    }

    const imageSection = `
        ${headingHtml}
        <div class="image-section" style="margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px; position: relative;">
            <!-- More Images Button -->
            <button class="more-images-btn" style="
                position: absolute; 
                top: 10px; 
                right: 10px; 
                background: #007bff; 
                color: white; 
                border: none; 
                padding: 8px 12px; 
                border-radius: 5px; 
                cursor: pointer; 
                font-size: 12px; 
                z-index: 10;
                transition: background 0.2s ease;
            " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                More Images
            </button>
            
            <!-- Scrollable Container -->
            <div class="image-container-scroll" style="
                max-height: 505px; 
                overflow-y: auto; 
                overflow-x: hidden; 
                border: 1px solid #ddd; 
                border-radius: 8px; 
                padding: 10px;
                margin-top: 35px;
            ">
                <div class="image-container" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-width: 100%;">
                    ${images.map(image => `
                        <a href="${image.link}" target="_blank" rel="noopener noreferrer" class="image-link"
                            style="cursor: pointer; text-decoration: none; display: block; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; transition: transform 0.2s ease-in-out; aspect-ratio: 1;">
                            <img src="${image.link}" alt="${image.title}" title="${image.title}"
                                    style="width: 100%; height: 100%; object-fit: cover; display: block;">
                        </a>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    messageElement.insertAdjacentHTML('beforeend', imageSection);

    // Store the current query for the "More Images" button
    const imagesSectionElement = messageElement.querySelector('.image-section');
    
    // const query = headingText ? headingText.replace('Here are some relevant images for ', '').replace('.', '') : 'images';
    // imagesSectionElement.setAttribute('data-query', query);
    // moreImagesBtn.addEventListener('click', () => fetchMoreImages(imagesSectionElement, query));

    // Add event listener to "More Images" button
    const moreImagesBtn = messageElement.querySelector('.more-images-btn');
    
    imagesSectionElement.setAttribute('data-query', originalQuery); // originalQuery is the actual query string used for the search
    moreImagesBtn.addEventListener('click', () => {
        const query = imagesSectionElement.getAttribute('data-query');
        fetchMoreImages(imagesSectionElement, query);
    });

    // Add hover effects and error handling to initial images
    addImageEventListeners(messageElement);
}

function displayImageResults(images, messageContainer, headingText, originalQuery) {
    // Check if messageContainer is provided and valid
    if (!messageContainer || !messageContainer.querySelector) {
        console.error('IMAGE DEBUG: Invalid messageContainer provided to displayImageResults');
        return;
    }
    
    // messageContainer is the chat message div where images should be shown
    insertAndStyleImages(images, messageContainer, headingText, originalQuery);
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
                // FIXED: Use enterAISpeakingMode() instead of just setting state

                enterAISpeakingMode();
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
            
            // FIXED: Use enterAISpeakingMode() instead of just setting state

            
            enterAISpeakingMode();
            updateStopAudioButton();  // Show button

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
                        // FIXED: Use enterAISpeakingMode() instead of just setting state

                        enterAISpeakingMode();
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

/*
