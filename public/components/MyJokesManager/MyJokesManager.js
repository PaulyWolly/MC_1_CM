/*
  MYJOKESMANAGER.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

/**
 * MyJokesManager Component
 * 
 * A modular component for managing jokes with text input interface.
 * Provides voice-activated functionality for adding, editing, and managing jokes.
 * 
 * Features:
 * - Voice-activated interface ("Add a joke", "List my jokes")
 * - Text input with audio testing
 * - Integration with existing My Jokes functionality
 * - Modular CSS and JavaScript separation
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */

export default class MyJokesManager {
    constructor() {
        this.panel = null;
        this.titleInput = null;
        this.contentInput = null;
        this.characterCount = null;
        this.testButton = null;
        this.submitButton = null;
        this.currentMode = 'save'; // 'save' or 'update'
        this.currentEditingJoke = null;
        this.isInitialized = false;
        
        // Bind methods to preserve 'this' context
        this.init = this.init.bind(this);
        this.handleVoiceCommand = this.handleVoiceCommand.bind(this);
        this.showPanel = this.showPanel.bind(this);
        this.hidePanel = this.hidePanel.bind(this);
        this.testJokeOutput = this.testJokeOutput.bind(this);
        this.submitJoke = this.submitJoke.bind(this);
    }


    // =====================================================
    // HELPER FUNCTIONS
    // =====================================================

    async speakJokeContent(jokeContent) {
        // Set AISPEAKING status before playing
        state.isAISpeaking = true;
        updateStopAudioButton();  // Show button
        updateStatus(MESSAGES.STATUS.SPEAKING);  // Update status to show AI is speaking

        // Split on newlines or punctuation, trim, and filter out empty lines
        const lines = jokeContent.split(/\\n|\\r|[.!?]/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            await queueAudioChunk(line);
        }
    }

    // =====================================================
    // INITIALIZATION
    // =====================================================

    /**
     * Initialize the MyJokesManager component
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🎭 [MyJokesManager] Initializing component...');
            
            // Load component CSS and HTML template
            await Promise.all([
                this.loadCSS(),
                this.loadHTML()
            ]);
            
            // Create panel HTML from template
            this.createPanelFromTemplate();
            
            // Setup DOM element references
            this.setupElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize character counter
            this.initCharacterCounter();
            
            // Register voice commands
            this.registerVoiceCommands();
            
            this.isInitialized = true;
            console.log('🎭 [MyJokesManager] Component initialized successfully');
            
        } catch (error) {
            console.error('🎭 [MyJokesManager] Initialization error:', error);
        }
    }

    /**
     * Load component CSS dynamically
     */
    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="MyJokesManager.css"]');
            if (existingLink) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/MyJokesManager/MyJokesManager.css';
            
            link.onload = () => {
                console.log('🎭 [MyJokesManager] CSS loaded successfully');
                resolve();
            };
            
            link.onerror = () => {
                console.error('🎭 [MyJokesManager] Failed to load CSS');
                reject(new Error('Failed to load MyJokesManager CSS'));
            };
            
            document.head.appendChild(link);
        });
    }

    /**
     * Load component HTML template dynamically
     */
    async loadHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('./components/MyJokesManager/MyJokesManager.html');
                if (!response.ok) {
                    throw new Error(`Failed to fetch HTML template: ${response.status}`);
                }
                
                const htmlContent = await response.text();
                this.htmlTemplate = htmlContent;
                console.log('🎭 [MyJokesManager] HTML template loaded successfully');
                resolve();
            } catch (error) {
                console.error('🎭 [MyJokesManager] Failed to load HTML template:', error);
                reject(error);
            }
        });
    }

    /**
     * Create the panel HTML from loaded template
     */
    createPanelFromTemplate() {
        if (!this.htmlTemplate) {
            throw new Error('HTML template not loaded');
        }

        // Remove existing panel if it exists
        const existingPanel = document.getElementById('my-jokes-text-input-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Add new panel to body from template
        document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
        console.log('🎭 [MyJokesManager] Panel created from HTML template');
    }

    /**
     * Setup DOM element references
     */
    setupElements() {
        this.panel = document.getElementById('my-jokes-text-input-panel');
        this.titleInput = document.getElementById('my-jokes-title-input');
        this.contentInput = document.getElementById('my-jokes-content-input');
        this.titleCounter = document.getElementById('my-jokes-title-counter');
        this.contentCounter = document.getElementById('my-jokes-content-counter');
        this.testButton = document.getElementById('my-jokes-test-btn');
        this.submitButton = document.getElementById('my-jokes-submit-btn');
        this.closeButton = document.getElementById('my-jokes-close-btn');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Close panel button
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => this.hidePanel());
        }

        // Panel background click - DO NOT close modal (users should only close via X button or submit)
        // Removed the background click to close functionality to prevent accidental closing

        // Test output button
        if (this.testButton) {
            this.testButton.addEventListener('click', this.testJokeOutput);
        }

        // Submit button
        if (this.submitButton) {
            this.submitButton.addEventListener('click', this.submitJoke);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.panel && this.panel.style.display !== 'none') {
                // Removed ESC key to close - users should only close via X button or submit
                // This prevents accidental closing when typing
                if (e.ctrlKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.submitJoke();
                }
                if (e.ctrlKey && e.key === 't') {
                    e.preventDefault();
                    this.testJokeOutput();
                }
            }
        });
    }

    /**
     * Initialize character counters for both title and content
     */
    initCharacterCounter() {
        // Title character counter - no limit, just show count
        if (this.titleInput && this.titleCounter) {
            this.titleInput.addEventListener('input', () => {
                const length = this.titleInput.value.length;
                this.titleCounter.textContent = `${length}`;
                
                // Simple color coding - green for reasonable length, blue for longer
                if (length > 200) {
                    this.titleCounter.style.color = '#3498db'; // Blue for longer titles
                } else {
                    this.titleCounter.style.color = '#27ae60'; // Green for normal titles
                }
            });
        }

        // Content character counter - no limit, just show count
        if (this.contentInput && this.contentCounter) {
            this.contentInput.addEventListener('input', () => {
                const length = this.contentInput.value.length;
                this.contentCounter.textContent = `${length}`;
                
                // Simple color coding - green for reasonable length, blue for longer
                if (length > 2000) {
                    this.contentCounter.style.color = '#3498db'; // Blue for longer jokes
                } else {
                    this.contentCounter.style.color = '#27ae60'; // Green for normal jokes
                }
            });
        }
    }

    /**
     * Register voice commands with the main app
     */
    registerVoiceCommands() {
        // Integration with existing voice command system
        if (window.myJokesVoiceHandlers) {
            window.myJokesVoiceHandlers.push(this.handleVoiceCommand);
        } else {
            window.myJokesVoiceHandlers = [this.handleVoiceCommand];
        }
    }

    /**
     * Handle voice commands
     * @param {string} messageText - The voice command text
     * @returns {boolean} - Whether the command was handled
     */
    async handleVoiceCommand(messageText) {
        const lowerText = messageText.toLowerCase();
        
        // Check for "Add a joke" or "I want to add a joke" commands
        const addJokePatterns = [
            /^add a joke$/i,
            /^i want to add a joke$/i,
            /^create a joke$/i,
            /^new joke$/i,
            /^make a joke$/i
        ];

        if (addJokePatterns.some(pattern => pattern.test(lowerText))) {
            console.log('🎭 [MyJokesManager] Voice command detected: Add joke');
            this.showPanel('save');
            return true;
        }

        // Check for "Edit my joke number X" commands
        const editJokeNumberPatterns = [
            /^edit my joke number ([a-z0-9]+)$/i,
            /^update my joke number ([a-z0-9]+)$/i,
            /^edit joke number ([a-z0-9]+)$/i,
            /^update joke number ([a-z0-9]+)$/i,
            /^modify my joke number ([a-z0-9]+)$/i,
            /^change my joke number ([a-z0-9]+)$/i
        ];

        for (const pattern of editJokeNumberPatterns) {
            const match = lowerText.match(pattern);
            if (match) {
                const jokeNumberInput = match[1].trim();
                console.log('🎭 [MyJokesManager] Voice command detected: Edit joke number -', jokeNumberInput);
                
                // Convert the number using the same system as playing jokes
                const jokeNumber = this.convertToNumber(jokeNumberInput);
                if (jokeNumber !== null) {
                    // Add confirmation message to chat
                    if (typeof addMessageToChat === 'function') {
                        addMessageToChat('assistant', `Opening joke #${jokeNumber} for editing...`);
                    }
                    
                    // Open the joke for editing by number
                    await this.openForUpdateByNumber(jokeNumber);
                    return true;
                } else {
                    const errorMessage = `Sorry, "${jokeNumberInput}" is not a valid joke number. Please use a number like 1, 2, 3, etc.`;
                    if (typeof addMessageToChat === 'function') {
                        addMessageToChat('assistant', errorMessage);
                    }
                    // Speak the error message
                    if (typeof queueAudioChunk === 'function') {
                        try {
                            await queueAudioChunk(errorMessage);
                        } catch (error) {
                            console.error('🎭 [MyJokesManager] Error speaking invalid number message:', error);
                        }
                    }
                    return true;
                }
            }
        }

        // Check for "Edit my joke about..." or "Update my joke about..." commands
        const editJokePatterns = [
            /^edit my joke about (.+)$/i,
            /^update my joke about (.+)$/i,
            /^edit the joke about (.+)$/i,
            /^update the joke about (.+)$/i,
            /^edit my joke (.+)$/i,
            /^update my joke (.+)$/i,
            /^modify my joke about (.+)$/i,
            /^change my joke about (.+)$/i
        ];

        for (const pattern of editJokePatterns) {
            const match = lowerText.match(pattern);
            if (match) {
                const jokeTitle = match[1].trim();
                console.log('🎭 [MyJokesManager] Voice command detected: Edit joke -', jokeTitle);
                
                // Add confirmation message to chat
                if (typeof addMessageToChat === 'function') {
                    addMessageToChat('assistant', `Looking for your joke about "${jokeTitle}" to edit...`);
                }
                
                // Open the joke for editing
                await this.openForUpdate(jokeTitle);
                return true;
            }
        }

        return false;
    }

    /**
     * Convert string numbers (like "five") to whole numbers
     * Reuses the same logic from handleMyJokes
     */
    convertToNumber(input) {
        if (typeof input === 'number') {
            return Math.floor(input);
        }
        
        if (typeof input !== 'string' && typeof input !== 'number') {
            return null;
        }
        
        // Clean up the input string
        const cleaned = input.toString().trim().toLowerCase();
        
        // Try word-to-number conversion first
        const wordNumber = this.convertWordToNumber(cleaned);
        if (wordNumber !== null) {
            return wordNumber;
        }
        
        // Handle ordinal numbers (1st, 2nd, 3rd, 4th, etc.)
        const ordinalMatch = cleaned.match(/^(\d+)(?:st|nd|rd|th)$/);
        if (ordinalMatch) {
            const num = parseInt(ordinalMatch[1], 10);
            return (num > 0) ? num : null;
        }
        
        // Handle regular numbers
        const numericValue = parseFloat(cleaned);
        if (!isNaN(numericValue) && numericValue > 0) {
            return Math.floor(numericValue);
        }
        
        return null;
    }

    /**
     * Convert word numbers to digits (1-100)
     */
    convertWordToNumber(word) {
        const cleaned = word.toString().trim().toLowerCase().replace(/[-\s]/g, '');
        
        // Basic numbers 0-19
        const basicNumbers = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19
        };
        
        // Tens: 20, 30, 40, etc.
        const tens = {
            'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
            'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
        };
        
        // Check basic numbers first
        if (basicNumbers.hasOwnProperty(cleaned)) {
            return basicNumbers[cleaned];
        }
        
        // Check exact tens
        if (tens.hasOwnProperty(cleaned)) {
            return tens[cleaned];
        }
        
        // Handle compound numbers (twentyone, thirtyfive, etc.)
        for (const [tenWord, tenValue] of Object.entries(tens)) {
            if (cleaned.startsWith(tenWord)) {
                const remainder = cleaned.substring(tenWord.length);
                if (basicNumbers.hasOwnProperty(remainder)) {
                    return tenValue + basicNumbers[remainder];
                }
            }
        }
        
        // Handle "one hundred"
        if (cleaned === 'hundred' || cleaned === 'onehundred') {
            return 100;
        }
        
        return null;
    }

    /**
     * Open a joke for editing by its number in the listing
     */
    async openForUpdateByNumber(jokeNumber) {
        try {
            console.log('🎭 [MyJokesManager] Opening joke for edit by number:', jokeNumber);
            
            // Load configuration
            if (window.appConfig) {
                await window.appConfig.load();
            }
            
            // Get the list of user's jokes
            const apiUrl = window.appConfig ? 
                `${window.appConfig.getApiUrl()}/api/jokes/list-jokes?sessionId=${encodeURIComponent(window.sessionId)}&type=my_jokes` :
                `/api/jokes/list-jokes?sessionId=${encodeURIComponent(window.sessionId)}&type=my_jokes`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.success && data.jokes && data.jokes.length > 0) {
                // Convert to 0-based index (user says "joke 1" for first joke)
                const jokeIndex = jokeNumber - 1;
                
                if (jokeIndex >= 0 && jokeIndex < data.jokes.length) {
                    const joke = data.jokes[jokeIndex];
                    console.log('🎭 [MyJokesManager] Found joke for editing:', joke);
                    
                    // Show the panel in update mode with the joke data
                    this.showPanel('update', joke);
                    
                    // Provide audio and chat feedback
                    const message = `I found your joke "${joke.title}". You can edit it in the panel that just opened.`;
                    if (typeof addMessageToChat === 'function') {
                        addMessageToChat('assistant', message);
                    }
                    
                    // Speak the greeting
                    if (typeof queueAudioChunk === 'function') {
                        try {
                            await queueAudioChunk(message);
                        } catch (error) {
                            console.error('🎭 [MyJokesManager] Error speaking greeting:', error);
                        }
                    }
                } else {
                    const errorMessage = `Sorry, I couldn't find joke number ${jokeNumber}. You have ${data.jokes.length} jokes in total.`;
                    if (typeof addMessageToChat === 'function') {
                        addMessageToChat('assistant', errorMessage);
                    }
                    if (typeof queueAudioChunk === 'function') {
                        try {
                            await queueAudioChunk(errorMessage);
                        } catch (error) {
                            console.error('🎭 [MyJokesManager] Error speaking error message:', error);
                        }
                    }
                }
            } else {
                const errorMessage = "Sorry, I couldn't find any jokes to edit.";
                if (typeof addMessageToChat === 'function') {
                    addMessageToChat('assistant', errorMessage);
                }
                if (typeof queueAudioChunk === 'function') {
                    try {
                        await queueAudioChunk(errorMessage);
                    } catch (error) {
                        console.error('🎭 [MyJokesManager] Error speaking error message:', error);
                    }
                }
            }
        } catch (error) {
            console.error('🎭 [MyJokesManager] Error opening joke for edit:', error);
            const errorMessage = "Sorry, there was an error opening the joke for editing.";
            if (typeof addMessageToChat === 'function') {
                addMessageToChat('assistant', errorMessage);
            }
            if (typeof queueAudioChunk === 'function') {
                try {
                    await queueAudioChunk(errorMessage);
                } catch (speakError) {
                    console.error('🎭 [MyJokesManager] Error speaking error message:', speakError);
                }
            }
        }
    }

    /**
     * Show the panel
     * @param {string} mode - 'save' or 'update'
     * @param {Object} jokeData - Joke data for update mode
     */
    showPanel(mode = 'save', jokeData = null) {
        if (!this.panel) return;

        this.currentMode = mode;
        this.currentEditingJoke = jokeData;

        // Update panel title ONLY based on mode
        const title = this.panel.querySelector('h3');
        if (title) {
            if (mode === 'update') {
                title.textContent = '🎭 My Jokes - Edit a Joke';
            } else {
                title.textContent = '🎭 My Jokes - Add a Joke';
            }
        }

        // Pre-fill fields if updating
        if (mode === 'update' && jokeData) {
            this.titleInput.value = jokeData.title || '';
            this.contentInput.value = jokeData.content || '';
            // Update character counters
            if (this.titleCounter) {
                const titleLength = this.titleInput.value.length;
                this.titleCounter.textContent = `${titleLength}`;
            }
            if (this.contentCounter) {
                const contentLength = this.contentInput.value.length;
                this.contentCounter.textContent = `${contentLength}`;
            }
        } else {
            // Clear fields for new joke
            this.clearForm();
        }

        // Show the panel with animation
        this.panel.style.display = 'flex';
        this.panel.style.opacity = '0';
        requestAnimationFrame(() => {
            this.panel.style.opacity = '1';
        });
        
        // Focus appropriate field
        setTimeout(() => {
            if (mode === 'update') {
                this.contentInput.focus();
            } else {
                this.titleInput.focus();
            }
        }, 100);

        // Add message to chat indicating panel opened
        if (typeof addMessageToChat === 'function') {
            const message = mode === 'update' 
                ? `Opening joke editor for "${jokeData?.title || 'Unknown'}"`
                : 'Opening joke creation interface. Enter your joke details in the panel.';
            addMessageToChat('assistant', message);
        }
        // Add audio introduction for Add a Joke (mode === 'save')
        if (mode === 'save' && typeof queueAudioChunk === 'function') {
            const introText = `Hi there! Use this section to add your joke. You can give it a title and add content to your joke. Then you can test the audio output for the joke, and once you are happy with it, you can then SAVE and SUBMIT it. Have FUN!`;
            try {
                queueAudioChunk(introText);
            } catch (error) {
                console.error('[MyJokesManager] Error playing Add a Joke intro:', error);
            }
        }
    }

    /**
     * Hide the panel
     */
    hidePanel() {
        if (this.panel) {
            this.panel.style.display = 'none';
            this.clearForm();
    
            // Always stop audio and switch mode
            if (typeof window.stopAllAudio === 'function') {
                window.stopAllAudio();
            }
    
            // Switch to Listening mode
            if (typeof window.enterListeningMode === 'function') {
                window.enterListeningMode();
            }
        }
    }

    /**
     * Clear the form
     */
    clearForm() {
        if (this.titleInput) this.titleInput.value = '';
        if (this.contentInput) this.contentInput.value = '';
        if (this.titleCounter) this.titleCounter.textContent = '0/100';
        if (this.contentCounter) this.contentCounter.textContent = '0/1000';
        this.currentEditingJoke = null;
    }

    /**
     * Test joke output by speaking it
     */
    async testJokeOutput() {
        const title = this.titleInput?.value?.trim();
        const content = this.contentInput?.value?.trim();

        if (!content) {
            this.showNotification('Please enter some joke content to test.', 'warning');
            return;
        }

        try {
            // Disable button during test
            this.testButton.disabled = true;
            this.testButton.innerHTML = '🔊 Testing...';

            // Create the text to speak
            let textToSpeak = '';
            if (title) {
                textToSpeak = `Here's your joke titled "${title}": ${content}`;
            } else {
                textToSpeak = `Here's your joke: ${content}`;
            }

            console.log('🎭 [MyJokesManager] Testing joke audio:', textToSpeak);

            // Use the testing version of TTS system to avoid smart interrupt mode conflicts
             if (typeof queueAudioChunk === 'function') {
                console.log('🎭 [MyJokesManager] Fallback to regular queueAudioChunk...');
                await queueAudioChunk(textToSpeak);
                console.log('🎭 [MyJokesManager] queueAudioChunk completed');
            } else {
                console.warn('🎭 [MyJokesManager] No TTS functions available');
                throw new Error('TTS system not available');
            }
            
            this.showNotification('Playing your joke audio test!', 'success');

        } catch (error) {
            console.error('🎭 [MyJokesManager] Error testing joke output:', error);
            this.showNotification(`Audio test failed: ${error.message}`, 'error');
        } finally {
            // Re-enable button
            this.testButton.disabled = false;
            this.testButton.innerHTML = '🔊 Test Output';
        }
    }

    /**
     * Submit the joke
     */
    async submitJoke() {
        const title = this.titleInput?.value?.trim();
        const content = this.contentInput?.value?.trim();

        // Validation - title is optional, content is required
        if (!content) {
            this.showNotification('Please enter the joke content.', 'warning');
            this.contentInput?.focus();
            return;
        }

        // Use default title if none provided
        if (!title) {
            const titleInput = this.titleInput;
            titleInput.value = 'Untitled Joke';
            title = 'Untitled Joke';
        }

        // If in update mode, show confirmation dialog
        if (this.currentMode === 'update') {
            const originalTitle = this.currentEditingJoke?.title;
            const originalContent = this.currentEditingJoke?.content;
            
            // Check if there are actual changes
            if (title === originalTitle && content === originalContent) {
                this.showNotification('No changes detected.', 'info');
                return;
            }
            
            // Show confirmation dialog
            const confirmMessage = `Are you sure you want to update your joke "${originalTitle}"?`;
            if (typeof addMessageToChat === 'function') {
                addMessageToChat('assistant', confirmMessage);
            }
            if (typeof queueAudioChunk === 'function') {
                await queueAudioChunk(confirmMessage);
            }
            
            // Wait for user confirmation
            const confirmed = await new Promise(resolve => {
                const handleResponse = async (event) => {
                    const response = event.detail?.text?.toLowerCase();
                    if (response === 'yes' || response === 'no') {
                        window.removeEventListener('voiceResponse', handleResponse);
                        resolve(response === 'yes');
                    }
                };
                window.addEventListener('voiceResponse', handleResponse);
                
                // Also allow keyboard confirmation
                const handleKeyPress = (e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                        window.removeEventListener('keydown', handleKeyPress);
                        resolve(true);
                    } else if (e.key === 'Escape') {
                        window.removeEventListener('keydown', handleKeyPress);
                        resolve(false);
                    }
                };
                window.addEventListener('keydown', handleKeyPress);
            });
            
            if (!confirmed) {
                this.showNotification('Update cancelled.', 'info');
                return;
            }
        }

        try {
            // Disable submit button during processing
            this.submitButton.disabled = true;
            
            if (this.currentMode === 'update') {
                this.submitButton.innerHTML = '💾 Updating...';
                await this.updateExistingJoke(title, content);
            } else {
                this.submitButton.innerHTML = '💾 Saving...';
                await this.saveNewJoke(title, content);
            }

        } catch (error) {
            console.error('Error submitting joke:', error);
            this.showNotification('Sorry, there was an error saving your joke.', 'error');
        } finally {
            // Re-enable submit button
            this.submitButton.disabled = false;
            if (this.currentMode === 'update') {
                this.submitButton.innerHTML = '<span class="btn-icon">💾</span> Update Your Joke';
            } else {
                this.submitButton.innerHTML = '<span class="btn-icon">💾</span> Submit Your Joke';
            }
        }
    }

    /**
     * Save new joke using existing My Jokes infrastructure
     */
    async saveNewJoke(title, content) {
        try {
            // Load configuration
            if (window.appConfig) {
                await window.appConfig.load();
            }

            const apiUrl = window.appConfig ? 
                `${window.appConfig.getApiUrl()}/api/jokes/save-joke` :
                '/api/jokes/save-joke';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    userId: window.sessionId
                })
            });

            const data = await response.json();

            if (data.success) {
                // Add message to chat
                const successMessage = `Great! I've saved your joke "${title}". To hear it later, just say 'tell me my joke about ${title}'`;
                
                if (typeof addMessageToChat === 'function') {
                    addMessageToChat('assistant', successMessage);
                }
                
                // Speak the success message using testing version to avoid interrupt mode conflicts
                if (typeof queueAudioChunkForTesting === 'function') {
                    await queueAudioChunkForTesting(successMessage);
                } else if (typeof queueAudioChunk === 'function') {
                    await queueAudioChunk(successMessage);
                }
                
                // Show success notification
                this.showNotification('Joke saved successfully!', 'success');
                
                // Hide panel after longer delay to allow audio to complete
                setTimeout(() => {
                    this.hidePanel();
                }, 4000);

            } else {
                throw new Error(data.error || 'Failed to save joke');
            }

        } catch (error) {
            console.error('Error saving joke:', error);
            const errorMessage = "Sorry, I couldn't save your joke. Please try again.";
            
            if (typeof addMessageToChat === 'function') {
                addMessageToChat('assistant', errorMessage);
            }
            
            if (typeof queueAudioChunkForTesting === 'function') {
                await queueAudioChunkForTesting(errorMessage);
            } else if (typeof queueAudioChunk === 'function') {
                await queueAudioChunk(errorMessage);
            }
            
            throw error;
        }
    }

    /**
     * Update existing joke
     */
    async updateExistingJoke(newTitle, content) {
        try {
            // Load configuration
            if (window.appConfig) {
                await window.appConfig.load();
            }

            // Use the original title from currentEditingJoke to identify the joke to update
            const originalTitle = this.currentEditingJoke?.title || newTitle;
            
            console.log('🎭 [UPDATE DEBUG] Original title:', originalTitle);
            console.log('🎭 [UPDATE DEBUG] New title:', newTitle);
            console.log('🎭 [UPDATE DEBUG] Content:', content);
            console.log('🎭 [UPDATE DEBUG] currentEditingJoke:', this.currentEditingJoke);
            
            const apiUrl = window.appConfig ? 
                `${window.appConfig.getApiUrl()}/api/jokes/update-joke/${encodeURIComponent(originalTitle)}` :
                `/api/jokes/update-joke/${encodeURIComponent(originalTitle)}`;

            console.log('🎭 [UPDATE DEBUG] API URL:', apiUrl);
            
            const requestBody = {
                title: newTitle,
                content: content,
                userId: window.sessionId
            };
            
            console.log('🎭 [UPDATE DEBUG] Request body:', requestBody);

            const response = await fetch(apiUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            console.log('🎭 [UPDATE DEBUG] Server response:', data);

            if (data.success) {
                // Add message to chat
                const successMessage = `I've updated your joke "${newTitle}"`;
                
                if (typeof addMessageToChat === 'function') {
                    addMessageToChat('assistant', successMessage);
                }
                
                // Speak the success message using testing version to avoid interrupt mode conflicts
                if (typeof queueAudioChunkForTesting === 'function') {
                    await queueAudioChunkForTesting(successMessage);
                } else if (typeof queueAudioChunk === 'function') {
                    await queueAudioChunk(successMessage);
                }
                
                // Show success notification
                this.showNotification('Joke updated successfully!', 'success');
                
                // Hide panel after even longer delay to prevent audio cutoff
                setTimeout(() => {
                    this.hidePanel();
                }, 5000); // Increased from 3000 to 5000ms

            } else {
                throw new Error(data.error || 'Failed to update joke');
            }

        } catch (error) {
            console.error('Error updating joke:', error);
            const errorMessage = `Sorry, I couldn't update your joke "${newTitle}". Please try again.`;
            
            if (typeof addMessageToChat === 'function') {
                addMessageToChat('assistant', errorMessage);
            }
            
            if (typeof queueAudioChunkForTesting === 'function') {
                await queueAudioChunkForTesting(errorMessage);
            } else if (typeof queueAudioChunk === 'function') {
                await queueAudioChunk(errorMessage);
            }
            
            throw error;
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('my-jokes-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'my-jokes-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 1001;
                opacity: 0;
                transition: opacity 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(notification);
        }

        // Set color based on type
        const colors = {
            success: '#4caf50',
            warning: '#ff9800',
            error: '#f44336',
            info: '#2196f3'
        };

        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        notification.style.opacity = '1';

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Open panel for updating specific joke
     */
    openForUpdate(jokeTitle) {
        // First show the panel with temporary joke data
        this.showPanel('update', { title: jokeTitle });
        
        // Then load the actual joke content which will update currentEditingJoke
        this.loadJokeForUpdate(jokeTitle);
    }

    /**
     * Load joke content for updating
     */
    async loadJokeForUpdate(title) {
        try {
            console.log('🎭 [MyJokesManager] Loading joke for update:', title);
            
            // Load configuration
            if (window.appConfig) {
                await window.appConfig.load();
            }

            const apiUrl = window.appConfig ? 
                `${window.appConfig.getApiUrl()}/api/jokes/get-joke/${encodeURIComponent(title)}?sessionId=${window.sessionId}` :
                `/api/jokes/get-joke/${encodeURIComponent(title)}?sessionId=${window.sessionId}`;

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.success && data.joke) {
                console.log('🎭 [MyJokesManager] Joke found and loaded successfully');
                
                // Populate the form with joke data
                this.titleInput.value = data.joke.title;
                this.contentInput.value = data.joke.content;
                
                // Update character counters  
                if (this.titleCounter) {
                    this.titleCounter.textContent = `${data.joke.title.length}`;
                }
                if (this.contentCounter) {
                    this.contentCounter.textContent = `${data.joke.content.length}`;
                }
                
                // IMPORTANT: Update currentEditingJoke with the complete data from the server
                this.currentEditingJoke = data.joke;
                console.log('🎭 [MyJokesManager] Updated currentEditingJoke:', this.currentEditingJoke);
                
                // Provide audio confirmation
                const successMessage = `Found your joke "${data.joke.title}". You can now edit it in the panel.`;
                if (typeof addMessageToChat === 'function') {
                    addMessageToChat('assistant', successMessage);
                }
                if (typeof queueAudioChunkForTesting === 'function') {
                    await queueAudioChunkForTesting(successMessage);
                } else if (typeof queueAudioChunk === 'function') {
                    await queueAudioChunk(successMessage);
                }
                
                this.showNotification('Joke loaded for editing!', 'success');
                
            } else {
                console.log('🎭 [MyJokesManager] Joke not found:', title);
                
                const notFoundMessage = `Sorry, I couldn't find a joke titled "${title}". Please check the title and try again, or say "list my jokes" to see all available jokes.`;
                
                if (typeof addMessageToChat === 'function') {
                    addMessageToChat('assistant', notFoundMessage);
                }
                if (typeof queueAudioChunkForTesting === 'function') {
                    await queueAudioChunkForTesting(notFoundMessage);
                } else if (typeof queueAudioChunk === 'function') {
                    await queueAudioChunk(notFoundMessage);
                }
                
                this.showNotification(`Could not find joke "${title}".`, 'error');
                this.hidePanel(); // Close the panel since we couldn't load the joke
            }
        } catch (error) {
            console.error('🎭 [MyJokesManager] Error loading joke for update:', error);
            
            const errorMessage = `There was an error loading your joke "${title}". Please try again.`;
            
            if (typeof addMessageToChat === 'function') {
                addMessageToChat('assistant', errorMessage);
            }
            if (typeof queueAudioChunkForTesting === 'function') {
                await queueAudioChunkForTesting(errorMessage);
            } else if (typeof queueAudioChunk === 'function') {
                await queueAudioChunk(errorMessage);
            }
            
            this.showNotification('Error loading joke content.', 'error');
            this.hidePanel(); // Close the panel on error
        }
    }

    /**
     * Add "Add Joke" button to message element
     * @param {HTMLElement} messageElement - The message element to add button to
     */
    addJokeActionButton(messageElement) {
        if (!messageElement) return;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'joke-actions-container';
        buttonContainer.style.cssText = `
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
        `;

        const addButton = document.createElement('button');
        addButton.className = 'add-joke-btn';
        addButton.innerHTML = '✍️ Add New Joke';
        addButton.style.cssText = `
            background: #4caf50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 600;
            transition: all 0.3s;
            margin-right: 10px;
        `;

        addButton.addEventListener('click', () => {
            this.showPanel('save');
        });

        addButton.addEventListener('mouseover', () => {
            addButton.style.background = '#388e3c';
            addButton.style.transform = 'translateY(-1px)';
        });

        addButton.addEventListener('mouseout', () => {
            addButton.style.background = '#4caf50';
            addButton.style.transform = 'translateY(0)';
        });

        buttonContainer.appendChild(addButton);
        messageElement.querySelector('.message-content').appendChild(buttonContainer);
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        // Remove event listeners
        if (this.panel) {
            this.panel.remove();
        }

        // Remove CSS
        const cssLink = document.querySelector('link[href*="MyJokesManager.css"]');
        if (cssLink) {
            cssLink.remove();
        }

        // Remove from voice handlers
        if (window.myJokesVoiceHandlers) {
            const index = window.myJokesVoiceHandlers.indexOf(this.handleVoiceCommand);
            if (index > -1) {
                window.myJokesVoiceHandlers.splice(index, 1);
            }
        }

        this.isInitialized = false;
        console.log('🎭 [MyJokesManager] Component destroyed');
    }
} 