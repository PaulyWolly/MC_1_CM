/*
  AUDIOMANAGER.JS
  Version: 1.0
  AppName: MC_1_CM [v9]
  Updated: 7/28/2025 @7:00AM
  Created by Paul Welby
  
  Audio Conversion Manager Component
  Handles conversion of audio codecs and video containers for Video.js compatibility
*/

export default class AudioManager {
    constructor() {
        this.isInitialized = false;
        this.currentConversion = null;
        this.conversionQueue = [];
        this.supportedAudioCodecs = ['aac', 'mp3', 'ac3', 'eac3', 'aac3', 'flac', 'opus'];
        this.supportedVideoContainers = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv'];
        this.targetAudioCodec = 'aac';
        this.targetVideoContainer = 'mp4';
        this.ffmpegPath = null;
        this.isConverting = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('[DEBUG - AUDIOMANAGER] Initializing AudioManager component...');
            
            // Load CSS first
            await this.loadCSS();
            
            // Initialize UI first so DOM elements are available for error handling
            this.initializeUI();
            
            // Check if FFmpeg is available
            await this.checkFFmpegAvailability();
            
            // Load configuration
            await this.loadConfiguration();
            
            this.isInitialized = true;
            console.log('[DEBUG - AUDIOMANAGER] AudioManager initialized successfully');
            
        } catch (error) {
            console.error('[DEBUG - AUDIOMANAGER] Initialization failed:', error);
            this.showError('AudioManager initialization failed: ' + error.message);
        }
    }

    async loadCSS() {
        // Check if CSS is already loaded
        if (document.querySelector('link[href*="AudioManager.css"]')) {
            console.log('[DEBUG - AUDIOMANAGER] CSS already loaded');
            return;
        }

        try {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = '/components/AudioManager/AudioManager.css';
            
            // Wait for CSS to load
            await new Promise((resolve, reject) => {
                link.onload = resolve;
                link.onerror = reject;
                document.head.appendChild(link);
            });
            
            console.log('[DEBUG - AUDIOMANAGER] CSS loaded successfully');
        } catch (error) {
            console.warn('[DEBUG - AUDIOMANAGER] Failed to load CSS:', error);
            // Continue without CSS - the modal will still work with basic styling
        }
    }

    async checkFFmpegAvailability() {
        try {
            const response = await fetch('/api/audio/check-ffmpeg');
            const result = await response.json();
            
            if (!result.available) {
                throw new Error('FFmpeg is not available on the system');
            }
            
            this.ffmpegPath = result.path;
            console.log('[DEBUG - AUDIOMANAGER] FFmpeg found at:', this.ffmpegPath);
            
        } catch (error) {
            console.warn('[DEBUG - AUDIOMANAGER] FFmpeg check failed (API endpoint may not exist yet):', error);
            // Don't throw error - just log a warning and continue
            this.ffmpegPath = null;
            this.addLogEntry('Warning: FFmpeg availability check failed - API endpoint not implemented yet');
        }
    }

    async loadConfiguration() {
        try {
            const response = await fetch('/api/audio/config');
            const config = await response.json();
            
            this.targetAudioCodec = config.targetAudioCodec || 'aac';
            this.targetVideoContainer = config.targetVideoContainer || 'mp4';
            
            console.log('[DEBUG - AUDIOMANAGER] Configuration loaded:', config);
            
        } catch (error) {
            console.warn('[DEBUG - AUDIOMANAGER] Using default configuration (API endpoint may not exist yet):', error);
            this.addLogEntry('Info: Using default configuration - API endpoint not implemented yet');
        }
    }

    initializeUI() {
        // Create and inject the AudioManager UI
        this.createAudioManagerUI();
        this.bindEventListeners();
        this.updateUI();
    }

    createAudioManagerUI() {
        console.log('[DEBUG - AUDIOMANAGER] Creating AudioManager UI...');
        const audioManagerHTML = `
            <div id="audio-manager-container" class="audio-manager-container" style="display: none;">
                <div class="audio-manager-content">
                    <!-- Header with title and close button -->
                    <div class="audio-manager-header">
                        <h2>Audio & Video Converter</h2>
                        <button id="audio-manager-close" class="audio-manager-close-btn">×</button>
                    </div>
                    
                    <!-- Tab Navigation -->
                    <div class="audio-manager-tabs">
                        <button class="tab-btn active" data-tab="settings">
                            <span class="tab-icon">⚙️</span>
                            <span class="tab-text">Settings</span>
                        </button>
                        <button class="tab-btn" data-tab="files">
                            <span class="tab-icon">📁</span>
                            <span class="tab-text">Files</span>
                        </button>
                        <button class="tab-btn" data-tab="progress">
                            <span class="tab-icon">📊</span>
                            <span class="tab-text">Progress</span>
                        </button>
                        <button class="tab-btn" data-tab="log">
                            <span class="tab-icon">📝</span>
                            <span class="tab-text">Log</span>
                        </button>
                    </div>
                    
                    <!-- Tab Content -->
                    <div class="tab-content">
                        <!-- Settings Tab -->
                        <div id="settings-tab" class="tab-panel active">
                            <div class="tab-panel-content">
                                <h3>Conversion Settings</h3>
                                <div class="settings-grid">
                                    <div class="setting-group">
                                        <label for="target-audio-codec">Target Audio Codec:</label>
                                        <select id="target-audio-codec" class="audio-manager-select">
                                            <option value="aac">AAC (Recommended)</option>
                                            <option value="mp3">MP3</option>
                                            <option value="opus">Opus</option>
                                        </select>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label for="target-video-container">Target Container:</label>
                                        <select id="target-video-container" class="audio-manager-select">
                                            <option value="mp4">MP4 (Recommended)</option>
                                            <option value="mkv">MKV</option>
                                            <option value="mov">MOV</option>
                                        </select>
                                    </div>
                                    
                                    <div class="setting-group">
                                        <label for="quality-preset">Quality Preset:</label>
                                        <select id="quality-preset" class="audio-manager-select">
                                            <option value="high">High Quality</option>
                                            <option value="medium">Medium Quality</option>
                                            <option value="low">Low Quality (Faster)</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="conversion-controls">
                                    <button id="start-conversion" class="audio-manager-btn audio-manager-btn-primary" disabled>Start Conversion</button>
                                    <button id="stop-conversion" class="audio-manager-btn audio-manager-btn-secondary" disabled>Stop Conversion</button>
                                    <button id="clear-queue" class="audio-manager-btn audio-manager-btn-secondary">Clear Queue</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Files Tab -->
                        <div id="files-tab" class="tab-panel">
                            <div class="tab-panel-content">
                                <h3>File Selection</h3>
                                <div class="file-input-group">
                                    <input type="file" id="audio-file-input" accept="video/*,audio/*" multiple class="audio-manager-file-input">
                                    <label for="audio-file-input" class="audio-manager-file-label">Choose Files</label>
                                </div>
                                <div id="selected-files-list" class="selected-files-list"></div>
                            </div>
                        </div>
                        
                        <!-- Progress Tab -->
                        <div id="progress-tab" class="tab-panel">
                            <div class="tab-panel-content">
                                <h3>Conversion Progress</h3>
                                <div id="conversion-queue" class="conversion-queue"></div>
                                <div id="current-conversion" class="current-conversion"></div>
                                <div class="progress-bar-container">
                                    <div id="conversion-progress-bar" class="conversion-progress-bar"></div>
                                </div>
                                <div id="conversion-status" class="conversion-status"></div>
                            </div>
                        </div>
                        
                        <!-- Log Tab -->
                        <div id="log-tab" class="tab-panel">
                            <div class="tab-panel-content">
                                <h3>Conversion Log</h3>
                                <div id="conversion-log-content" class="conversion-log-content"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Inject into the DOM
        document.body.insertAdjacentHTML('beforeend', audioManagerHTML);
        console.log('[DEBUG - AUDIOMANAGER] AudioManager UI injected into DOM');
        
        // Verify the element was created
        const container = document.getElementById('audio-manager-container');
        if (container) {
            console.log('[DEBUG - AUDIOMANAGER] ✅ AudioManager container successfully created');
            
            // Verify tab elements
            const settingsTab = document.getElementById('settings-tab');
            const filesTab = document.getElementById('files-tab');
            const progressTab = document.getElementById('progress-tab');
            const logTab = document.getElementById('log-tab');
            
            console.log('[DEBUG - AUDIOMANAGER] Tab panels found:', {
                settings: !!settingsTab,
                files: !!filesTab,
                progress: !!progressTab,
                log: !!logTab
            });
            
            // Verify settings tab content
            if (settingsTab) {
                const settingsContent = settingsTab.querySelector('.tab-panel-content');
                const settingsGrid = settingsTab.querySelector('.settings-grid');
                const conversionControls = settingsTab.querySelector('.conversion-controls');
                
                console.log('[DEBUG - AUDIOMANAGER] Settings tab content:', {
                    content: !!settingsContent,
                    grid: !!settingsGrid,
                    controls: !!conversionControls,
                    isActive: settingsTab.classList.contains('active')
                });
            }
        } else {
            console.error('[DEBUG - AUDIOMANAGER] ❌ AudioManager container not found after creation');
        }
    }

    bindEventListeners() {
        // Close button
        document.getElementById('audio-manager-close').addEventListener('click', () => {
            this.hide();
        });
        
        // Click outside - do nothing (modal stays open)
        document.getElementById('audio-manager-container').addEventListener('click', (e) => {
            if (e.target.id === 'audio-manager-container') {
                // Do nothing - modal stays open
                console.log('[DEBUG - AUDIOMANAGER] Clicked outside modal - keeping modal open');
            }
        });
        
        // Escape key - do nothing (modal stays open)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                // Do nothing - modal stays open
                console.log('[DEBUG - AUDIOMANAGER] Escape key pressed - keeping modal open');
            }
        });
        
        // File input
        document.getElementById('audio-file-input').addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
        
        // Conversion controls
        document.getElementById('start-conversion').addEventListener('click', () => {
            this.startConversion();
        });
        
        document.getElementById('stop-conversion').addEventListener('click', () => {
            this.stopConversion();
        });
        
        document.getElementById('clear-queue').addEventListener('click', () => {
            this.clearQueue();
        });
        
        // Settings changes
        document.getElementById('target-audio-codec').addEventListener('change', (e) => {
            this.targetAudioCodec = e.target.value;
            this.updateUI();
        });
        
        document.getElementById('target-video-container').addEventListener('change', (e) => {
            this.targetVideoContainer = e.target.value;
            this.updateUI();
        });
        
        // Tab switching functionality
        document.querySelectorAll('.tab-btn').forEach(tabBtn => {
            tabBtn.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });
    }
    
    switchTab(targetTab) {
        console.log('[DEBUG - AUDIOMANAGER] Switching to tab:', targetTab);
        
        // Remove active class from all tabs and panels
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            console.log('[DEBUG - AUDIOMANAGER] Removed active from tab button:', btn.getAttribute('data-tab'));
        });
        
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
            console.log('[DEBUG - AUDIOMANAGER] Removed active from panel:', panel.id);
        });
        
        // Add active class to target tab and panel
        const targetTabBtn = document.querySelector(`[data-tab="${targetTab}"]`);
        const targetPanel = document.getElementById(`${targetTab}-tab`);
        
        if (targetTabBtn) {
            targetTabBtn.classList.add('active');
            console.log('[DEBUG - AUDIOMANAGER] Added active to tab button:', targetTab);
        } else {
            console.error('[DEBUG - AUDIOMANAGER] Target tab button not found:', targetTab);
        }
        
        if (targetPanel) {
            targetPanel.classList.add('active');
            console.log('[DEBUG - AUDIOMANAGER] Added active to panel:', targetPanel.id);
        } else {
            console.error('[DEBUG - AUDIOMANAGER] Target panel not found:', `${targetTab}-tab`);
        }
        
        console.log('[DEBUG - AUDIOMANAGER] Tab switch completed for:', targetTab);
    }

    handleFileSelection(files) {
        if (!files || files.length === 0) return;
        
        console.log('[DEBUG - AUDIOMANAGER] Files selected:', files.length);
        
        const fileList = document.getElementById('selected-files-list');
        fileList.innerHTML = '';
        
        this.conversionQueue = [];
        
        Array.from(files).forEach((file, index) => {
            const fileInfo = this.analyzeFile(file);
            this.conversionQueue.push(fileInfo);
            
            const fileElement = this.createFileElement(fileInfo, index);
            fileList.appendChild(fileElement);
        });
        
        this.updateUI();
    }

    analyzeFile(file) {
        const fileInfo = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file,
            status: 'pending',
            progress: 0,
            error: null,
            outputPath: null
        };
        
        // Determine if it's audio or video
        if (file.type.startsWith('video/')) {
            fileInfo.mediaType = 'video';
        } else if (file.type.startsWith('audio/')) {
            fileInfo.mediaType = 'audio';
        } else {
            fileInfo.mediaType = 'unknown';
        }
        
        return fileInfo;
    }

    createFileElement(fileInfo, index) {
        const fileElement = document.createElement('div');
        fileElement.className = 'file-item';
        fileElement.dataset.fileId = fileInfo.id;
        
        fileElement.innerHTML = `
            <div class="file-info">
                <span class="file-name">${fileInfo.name}</span>
                <span class="file-size">${this.formatFileSize(fileInfo.size)}</span>
                <span class="file-type">${fileInfo.mediaType}</span>
            </div>
            <div class="file-status">
                <span class="status-text" id="status-${fileInfo.id}">Pending</span>
                <div class="file-progress-bar">
                    <div class="file-progress-fill" id="progress-${fileInfo.id}"></div>
                </div>
            </div>
        `;
        
        return fileElement;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async startConversion() {
        if (this.conversionQueue.length === 0) {
            this.showError('No files in conversion queue');
            return;
        }
        
        if (this.isConverting) {
            this.showError('Conversion already in progress');
            return;
        }
        
        this.isConverting = true;
        this.updateUI();
        
        console.log('[DEBUG - AUDIOMANAGER] Starting conversion of', this.conversionQueue.length, 'files');
        
        for (let i = 0; i < this.conversionQueue.length; i++) {
            const fileInfo = this.conversionQueue[i];
            
            if (fileInfo.status === 'completed' || fileInfo.status === 'error') {
                continue;
            }
            
            try {
                await this.convertFile(fileInfo);
            } catch (error) {
                console.error('[DEBUG - AUDIOMANAGER] Conversion failed for', fileInfo.name, error);
                fileInfo.status = 'error';
                fileInfo.error = error.message;
                this.updateFileStatus(fileInfo);
            }
        }
        
        this.isConverting = false;
        this.updateUI();
        this.showSuccess('Conversion completed');
    }

    async convertFile(fileInfo) {
        fileInfo.status = 'converting';
        this.updateFileStatus(fileInfo);
        
        const formData = new FormData();
        formData.append('file', fileInfo.file);
        formData.append('targetAudioCodec', this.targetAudioCodec);
        formData.append('targetVideoContainer', this.targetVideoContainer);
        formData.append('qualityPreset', document.getElementById('quality-preset').value);
        
        try {
            const response = await fetch('/api/audio/convert', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.trim()) {
                        const data = JSON.parse(line);
                        this.handleConversionProgress(fileInfo, data);
                    }
                }
            }
            
            fileInfo.status = 'completed';
            this.updateFileStatus(fileInfo);
            
        } catch (error) {
            fileInfo.status = 'error';
            fileInfo.error = error.message;
            this.updateFileStatus(fileInfo);
            throw error;
        }
    }

    handleConversionProgress(fileInfo, data) {
        if (data.progress !== undefined) {
            fileInfo.progress = data.progress;
            this.updateFileProgress(fileInfo);
        }
        
        if (data.outputPath) {
            fileInfo.outputPath = data.outputPath;
        }
        
        if (data.log) {
            this.addLogEntry(data.log);
        }
    }

    updateFileStatus(fileInfo) {
        const statusElement = document.getElementById(`status-${fileInfo.id}`);
        if (statusElement) {
            statusElement.textContent = this.getStatusText(fileInfo.status);
            statusElement.className = `status-text status-${fileInfo.status}`;
        }
    }

    updateFileProgress(fileInfo) {
        const progressElement = document.getElementById(`progress-${fileInfo.id}`);
        if (progressElement) {
            progressElement.style.width = `${fileInfo.progress}%`;
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pending',
            'converting': 'Converting...',
            'completed': 'Completed',
            'error': 'Error'
        };
        return statusMap[status] || status;
    }

    stopConversion() {
        this.isConverting = false;
        this.updateUI();
        this.addLogEntry('Conversion stopped by user');
    }

    clearQueue() {
        this.conversionQueue = [];
        document.getElementById('selected-files-list').innerHTML = '';
        this.updateUI();
        this.addLogEntry('Conversion queue cleared');
    }

    updateUI() {
        const startBtn = document.getElementById('start-conversion');
        const stopBtn = document.getElementById('stop-conversion');
        
        startBtn.disabled = this.conversionQueue.length === 0 || this.isConverting;
        stopBtn.disabled = !this.isConverting;
    }

    addLogEntry(message) {
        const logContent = document.getElementById('conversion-log-content');
        if (!logContent) {
            console.warn('[DEBUG - AUDIOMANAGER] Log container not found, logging to console only:', message);
            return;
        }
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = `[${timestamp}] ${message}`;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    show() {
        const container = document.getElementById('audio-manager-container');
        if (container) {
            console.log('[DEBUG - AUDIOMANAGER] Found audio manager container, showing modal');
            container.style.display = 'flex';
            // Use setTimeout to ensure display change is applied before adding show class
            setTimeout(() => {
                container.classList.add('show');
                console.log('[DEBUG - AUDIOMANAGER] Modal should now be visible');
                
                // Ensure Settings tab is active and visible
                const settingsTab = document.getElementById('settings-tab');
                if (settingsTab) {
                    settingsTab.classList.add('active');
                    console.log('[DEBUG - AUDIOMANAGER] Settings tab activated on show');
                    
                    // Verify tab content is visible
                    const settingsContent = settingsTab.querySelector('.tab-panel-content');
                    if (settingsContent) {
                        console.log('[DEBUG - AUDIOMANAGER] Settings content found:', {
                            textContent: settingsContent.textContent.substring(0, 100) + '...',
                            isVisible: settingsContent.offsetHeight > 0,
                            display: window.getComputedStyle(settingsContent).display
                        });
                    }
                }
            }, 10);
        } else {
            console.error('[DEBUG - AUDIOMANAGER] Audio manager container not found');
            console.error('[DEBUG - AUDIOMANAGER] Available elements with "audio" in ID:', 
                Array.from(document.querySelectorAll('[id*="audio"]')).map(el => el.id));
            console.error('[DEBUG - AUDIOMANAGER] Available elements with "manager" in ID:', 
                Array.from(document.querySelectorAll('[id*="manager"]')).map(el => el.id));
        }
    }

    hide() {
        const container = document.getElementById('audio-manager-container');
        if (container) {
            container.classList.remove('show');
            // Wait for animation to complete before hiding
            setTimeout(() => {
                container.style.display = 'none';
            }, 300);
        }
    }

    showError(message) {
        console.error('[DEBUG - AUDIOMANAGER] Error:', message);
        this.addLogEntry(`ERROR: ${message}`);
        
        // Show toast notification if available
        if (window.showToast) {
            window.showToast(message, 'error');
        }
    }

    showSuccess(message) {
        console.log('[DEBUG - AUDIOMANAGER] Success:', message);
        this.addLogEntry(`SUCCESS: ${message}`);
        
        // Show toast notification if available
        if (window.showToast) {
            window.showToast(message, 'success');
        }
    }

    // Public API methods
    async open() {
        // Ensure initialization is complete before showing
        if (!this.isInitialized) {
            console.log('[DEBUG - AUDIOMANAGER] Waiting for initialization to complete...');
            await this.init();
        }
        this.show();
    }

    close() {
        this.hide();
    }

    isOpen() {
        const container = document.getElementById('audio-manager-container');
        return container && container.classList.contains('show');
    }
} 