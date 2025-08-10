/*
  TEXTTOSPEECHAUDIO.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

// public/components/TextToSpeech/TextToSpeechAudio.js

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
    volume: 1.0, 
    apiUrl: '/api/tts' // Assuming this is the correct endpoint
};

export default class TextToSpeechAudioManager {
    constructor(appConfig) {
        this.appConfig = appConfig;
        this.audioQueue = [];
        this.isPlaying = false;
        this.currentAudio = null;
        this.stopRequested = false;
    }

    queueAudioChunk(text) {
        if (!text || typeof text !== 'string') {
            console.warn('AudioManager: received invalid text:', text);
            return;
        }
        const chunks = this._splitTextIntoChunks(text);
        this.audioQueue.push(...chunks);
        if (!this.isPlaying) {
            this.playNextInQueue();
        }
    }

    async playNextInQueue() {
        if (this.stopRequested) {
            this.audioQueue = [];
            this.stopRequested = false;
            this.isPlaying = false;
            return;
        }
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        this.isPlaying = true;
        
        // --- OPTIMIZATION ---
        // Group multiple small chunks into one larger request to reduce API calls.
        let combinedChunk = '';
        while (this.audioQueue.length > 0 && (combinedChunk.length + this.audioQueue[0].length) < 1000) {
            combinedChunk += ' ' + this.audioQueue.shift();
        }
        
        if (combinedChunk) {
            try {
                await this._playAudio(combinedChunk.trim());
            } catch (error) {
                console.error("AudioManager: Error playing audio chunk:", error);
            }
        }
        
        // Use requestAnimationFrame to avoid deep recursion issues
        requestAnimationFrame(() => this.playNextInQueue());
    }

    async _playAudio(text) {
        if (!text) return Promise.resolve();
    
        try {
            const preprocessedText = this._preprocessForTTS(text);
            const response = await fetch(this.appConfig.getApiUrl('tts'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: preprocessedText,
                    voice: document.getElementById('voice-select')?.value || AUDIO_CONFIG.defaultVoice,
                    rate: AUDIO_CONFIG.rate,
                    pitch: AUDIO_CONFIG.pitch,
                    volume: AUDIO_CONFIG.volume,
                }),
            });
    
            if (!response.ok) {
                throw new Error(`TTS API request failed with status ${response.status}`);
            }
    
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            
            return new Promise((resolve, reject) => {
                this.currentAudio = new Audio(audioUrl);
                this.currentAudio.volume = AUDIO_CONFIG.volume;
                
                this.currentAudio.onended = () => {
                    this._cleanupAudio(this.currentAudio);
                    resolve();
                };
                this.currentAudio.onerror = (e) => {
                    console.error('AudioManager: Error during audio playback:', e);
                    this._cleanupAudio(this.currentAudio);
                    reject(e);
                };
    
                this.currentAudio.play().catch(e => {
                    console.error('AudioManager: Playback initiation failed:', e);
                    this._cleanupAudio(this.currentAudio);
                    reject(e);
                });
            });
        } catch (error) {
            console.error('Error in _playAudio:', error);
            return Promise.resolve(); // Ensure queue continues
        }
    }

    stopAudio() {
        this.stopRequested = true;
        this.audioQueue = [];
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.src = ''; // Detach source
            this._cleanupAudio(this.currentAudio);
            this.currentAudio = null;
        }
        this.isPlaying = false;
        console.log('AudioManager: Audio playback stopped.');
    }

    _cleanupAudio(audio) {
        if (audio && audio.src) {
            URL.revokeObjectURL(audio.src);
        }
    }

    _splitTextIntoChunks(text, maxLength = 200) {
        if (!text) return [];
        let processedText = this._protectHonorifics(text);
        const sentences = processedText.match(/[^.!?…]+[.!?…]*(?=\\s|$)/g) || [processedText];
        const chunks = [];
        let currentChunk = '';
    
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxLength) {
                currentChunk += sentence;
            } else {
                if (currentChunk) {
                    chunks.push(this._restoreHonorifics(currentChunk.trim()));
                }
                currentChunk = sentence;
            }
        }
    
        if (currentChunk) {
            chunks.push(this._restoreHonorifics(currentChunk.trim()));
        }
        
        return chunks.filter(c => c.length > 0);
    }

    _preprocessForTTS(text) {
        // Simple preprocessing, can be expanded
        return text.replace(/&/g, 'and');
    }

    _protectHonorifics(text) {
        return text
            .replace(/Mr\./g, 'Mr--')
            .replace(/Mrs\./g, 'Mrs--')
            .replace(/Ms\./g, 'Ms--')
            .replace(/Dr\./g, 'Dr--')
            .replace(/St\./g, 'St--');
    }

    _restoreHonorifics(text) {
        return text
            .replace(/Mr--/g, 'Mr.')
            .replace(/Mrs--/g, 'Mrs.')
            .replace(/Ms--/g, 'Ms.')
            .replace(/Dr--/g, 'Dr.')
            .replace(/St--/g, 'St.');
    }
} 