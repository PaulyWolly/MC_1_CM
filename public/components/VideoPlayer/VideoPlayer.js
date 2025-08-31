/*
  VIDEOPLAYER.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

class VideoPlayer {
    constructor(containerId = 'video-player-container') {
        this.containerId = containerId;
        this.container = null;
        this.video = null;
        this.controls = null;
        this.isPlaying = false;
        this.currentFile = null;
        this.currentMediaItem = null;
        this.isFullscreen = false;
        this.isVisible = false;
        this.isCleaningUp = false;
        this.returnLocation = null; // Store where to return when closing
        
        // Audio amplification properties
        this.audioContext = null;
        this.gainNode = null;
        this.sourceNode = null;
        this.amplifyEnabled = false;
        this.amplifyLevel = 1.0; // 1.0 = 100%, 2.0 = 200%, etc.
        this.maxAmplifyLevel = 3.0; // Maximum 300% amplification
        this.sourceCreated = false; // Track if we've created a MediaElementSource
        
        // Voice command patterns
        this.voiceCommands = [
            'video player open',
            'open video player',
            'play video',
            'video player',
            'show video player',
            'launch video player',
            'start video player',
            'video player start',
            'open video',
            'play local video',
            'local video player',
            'video player launch'
        ];
        
        // Title year enforcement interval
        this.titleCheckInterval = null;
        
        this.readyPromise = new Promise(resolve => {
            this._resolveReady = resolve;
        });
        this.init();
    }

    init() {
        // Wait for Video.js to be available before creating the player
        this.waitForVideoJS().then(() => {
            this.createPlayer();
            this.setupEventListeners();
            this.setupVoiceCommandIntegration();
            this.setupTextCommandIntegration();
        }).catch(error => {
            console.error('[VIDEO-PLAYER] Error during initialization:', error);
        });
    }

    waitForVideoJS() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkVideoJS = () => {
                attempts++;
                if (typeof window.videojs !== 'undefined') {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.warn('🎬 [VIDEO-PLAYER] Video.js not loaded after 5 seconds, proceeding with native video element');
                    resolve(); // Continue anyway
                } else {
                    // Check again in 100ms
                    setTimeout(checkVideoJS, 100);
                }
            };
            checkVideoJS();
        });
    }

    setupVoiceCommandIntegration() {
        // Listen for voice commands from the main app
        document.addEventListener('voiceCommand', (event) => {
            const command = event.detail?.command?.toLowerCase();
            if (command && this.voiceCommands.some(pattern => command.includes(pattern))) {
                console.log('🎬 [VIDEO-PLAYER] Voice command detected:', command);
                this.openVideoPlayer();
                
                // Add a message to the chat about the voice command
                if (window.addMessageToChat) {
                    window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
                }
            }
        });

        // Also listen for speech recognition results directly
        if (window.speechRecognition) {
            const originalOnResult = window.speechRecognition.onresult;
            window.speechRecognition.onresult = (event) => {
                if (originalOnResult) {
                    originalOnResult.call(window.speechRecognition, event);
                }
                
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
                if (this.voiceCommands.some(pattern => transcript.includes(pattern))) {
                    console.log('🎬 [VIDEO-PLAYER] Direct speech recognition detected:', transcript);
                    this.openVideoPlayer();
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
                    }
                }
            };
        }
    }

    setupTextCommandIntegration() {
        // Listen for text input commands
        document.addEventListener('textCommand', (event) => {
            const command = event.detail?.command?.toLowerCase();
            if (command && this.voiceCommands.some(pattern => command.includes(pattern))) {
                console.log('🎬 [VIDEO-PLAYER] Text command detected:', command);
                this.openVideoPlayer();
                
                if (window.addMessageToChat) {
                    window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
                }
            }
        });

        // Hook into the main sendMessage function if available
        if (window.sendMessage) {
            const originalSendMessage = window.sendMessage;
            window.sendMessage = (message, isGreeting = false) => {
                const lowerMessage = message.toLowerCase();
                if (this.voiceCommands.some(pattern => lowerMessage.includes(pattern))) {
                    console.log('🎬 [VIDEO-PLAYER] Text input command detected:', message);
                    this.openVideoPlayer();
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
                    }
                    return; // Don't send the command to the AI
                }
                
                // Call the original function
                return originalSendMessage(message, isGreeting);
            };
        }
    }

    // Method to check if a command should trigger the video player
    shouldTriggerVideoPlayer(command) {
        const lowerCommand = command.toLowerCase();
        return this.voiceCommands.some(pattern => lowerCommand.includes(pattern));
    }

    // Method to handle video player commands
    handleVideoPlayerCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        if (this.shouldTriggerVideoPlayer(lowerCommand)) {
            console.log('🎬 [VIDEO-PLAYER] Command handled:', command);
            this.openVideoPlayer();
            
            if (window.addMessageToChat) {
                window.addMessageToChat('assistant', '🎬 Opening video player... You can now select a video file to play.');
            }
            return true; // Command was handled
        }
        
        return false; // Command was not handled
    }

    // Public method to register with the main app's command system
    registerWithCommandSystem() {
        if (window.registerCommandHandler) {
            window.registerCommandHandler('videoPlayer', (command) => {
                return this.handleVideoPlayerCommand(command);
            });
            console.log('🎬 [VIDEO-PLAYER] Registered with command system');
        }
    }

    createPlayer() {
        
        // Inject global CSS for player and controls (no inline styles)
        if (!document.getElementById('videojs-force-controls-style')) {
            const style = document.createElement('style');
            style.id = 'videojs-force-controls-style';
            style.innerHTML = `
                .video-player-container, .video-js {
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 300px;
                    position: relative;
                }
                .vjs-control-bar {
                    display: flex !important;
                    opacity: 0;
                    visibility: visible !important;
                    transition: opacity 0.3s;
                    bottom: 80px !important;
                    border: none !important;
                }
                .video-js:hover .vjs-control-bar,
                .video-player-container:hover .vjs-control-bar {
                    opacity: 1 !important;
                }
                .video-js .vjs-control-bar {
                    z-index: 10010 !important;
                }
                .video-js {
                    background: #000 !important;
                }
                .vjs-progress-control {
                    min-width: 500px !important;
                    max-width: 900px !important;
                    flex: 0 1 600px !important;
                }
            `;
            document.head.appendChild(style);
        }
        // Create container
        this.container = document.createElement('div');
        if (!this.container) {
            console.error('🎬 [VIDEO-PLAYER] Failed to create container element');
            return;
        }
        this.container.id = this.containerId;
        this.container.className = 'video-player-container';
        // Remove all inline styles except for essential layout
        this.container.style.position = 'fixed';
        this.container.style.top = '50%';
        this.container.style.left = '50%';
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.width = '90vw';
        this.container.style.height = '90vh';
        this.container.style.background = '#000';
        this.container.style.borderRadius = '12px';
        this.container.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
        this.container.style.zIndex = '10000';
        this.container.style.display = 'none';
        this.container.style.flexDirection = 'column';
        this.container.style.overflow = 'hidden';

        // Create Video.js video element
        this.video = document.createElement('video');
        if (!this.video) {
            console.error('🎬 [VIDEO-PLAYER] Failed to create video element');
            return;
        }
        this.video.className = 'video-js vjs-default-skin';
        this.video.setAttribute('controls', '');
        this.video.setAttribute('preload', 'auto');
        // Remove all inline styles from video
        this.video.removeAttribute('style');

        // Create custom controls
        this.createControls();

        // Create file browser button
        const fileButton = document.createElement('button');
        fileButton.className = 'video-player-file-btn';
        fileButton.innerHTML = '📁 Open Video File';
        fileButton.removeAttribute('style');
        fileButton.onmouseover = () => fileButton.style.background = 'rgba(0,0,0,0.9)';
        fileButton.onmouseout = () => fileButton.style.background = 'rgba(0,0,0,0.7)';
        fileButton.onclick = () => this.openFileBrowser();

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.className = 'video-player-close-btn';
        closeButton.innerHTML = '✕';
        closeButton.removeAttribute('style');
        closeButton.onmouseover = () => closeButton.style.background = 'rgba(255,0,0,1)';
        closeButton.onmouseout = () => closeButton.style.background = 'rgba(255,0,0,0.8)';
        closeButton.onclick = () => this.hide();



        // Create episode info header
        this.episodeInfoHeader = document.createElement('div');
        this.episodeInfoHeader.className = 'video-player-episode-info';
        this.episodeInfoHeader.style.cssText = `
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: rgba(0,0,0,0.8);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            z-index: 10001;
            transition: background 0.3s;
            text-align: center;
            white-space: nowrap;
            max-width: 60%;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        this.episodeInfoHeader.innerHTML = '';

        // Create file input (hidden)
        this.fileInput = document.createElement('input');
        if (!this.fileInput) {
            console.error('🎬 [VIDEO-PLAYER] Failed to create file input');
            return;
        }
        
        this.fileInput.type = 'file';
        this.fileInput.accept = 'video/*';
        this.fileInput.style.display = 'none';
        this.fileInput.onchange = (e) => this.loadVideo(e.target.files[0]);

        // Assemble the player
        this.container.appendChild(this.video);
        this.container.appendChild(this.controls);
        this.container.appendChild(fileButton);
        this.container.appendChild(closeButton);
        this.container.appendChild(this.episodeInfoHeader);
        this.container.appendChild(this.fileInput);

        // Add to page
        if (document.body) {
            document.body.appendChild(this.container);
        } else {
            console.error('🎬 [VIDEO-PLAYER] Document body not available');
            return;
        }
        // Register custom Video.js seek buttons BEFORE player creation
        if (typeof window.videojs !== 'undefined') {
            const Button = window.videojs.getComponent('Button');
            // Custom Back 10s Button
            if (!window.videojs.getComponent('Back10Button')) {
                class Back10Button extends Button {
                    constructor(player, options) {
                        super(player, options);
                        this.controlText('Back 10 seconds');
                        this.addClass('vjs-back10-button');
                        this.addClass('custom-back10');
                        this.el().innerHTML = `<span class="vjs-back10-icon" title="Back 10 seconds">10s ⏪</span>`;
                        this.el().setAttribute('title', 'Back 10 seconds');
                    }
                    handleClick() {
                        const player = this.player();
                        player.currentTime(Math.max(0, player.currentTime() - 10));
                    }
                }
                window.videojs.registerComponent('Back10Button', Back10Button);
            }
            // Custom Forward 10s Button
            if (!window.videojs.getComponent('Forward10Button')) {
                class Forward10Button extends Button {
                    constructor(player, options) {
                        super(player, options);
                        this.controlText('Forward 10 seconds');
                        this.addClass('vjs-forward10-button');
                        this.addClass('custom-forward10');
                        this.el().innerHTML = `<span class="vjs-forward10-icon" title="Forward 10 seconds">10s ⏩</span>`;
                        this.el().setAttribute('title', 'Forward 10 seconds');
                    }
                    handleClick() {
                        const player = this.player();
                        player.currentTime(Math.min(player.duration(), player.currentTime() + 10));
                    }
                }
                window.videojs.registerComponent('Forward10Button', Forward10Button);
            }
            // Custom Play/Pause Toggle Button
            if (!window.videojs.getComponent('PlayPauseToggleButton')) {
                class PlayPauseToggleButton extends Button {
                    constructor(player, options) {
                        super(player, options);
                        this.addClass('vjs-playpause-toggle-button');
                        this.addClass('custom-playpause');
                        this.updateIcon();
                        player.on('play', () => this.updateIcon());
                        player.on('pause', () => this.updateIcon());
                        this.el().setAttribute('title', 'Play/Pause');
                    }
                    handleClick() {
                        const player = this.player();
                        if (player.paused()) {
                            player.play();
                        } else {
                            player.pause();
                        }
                        this.updateIcon();
                    }
                    updateIcon() {
                        const player = this.player();
                        if (player.paused()) {
                            this.el().innerHTML = '<span class="vjs-play-icon" title="Play">▶️</span>';
                            this.el().setAttribute('title', 'Play');
                        } else {
                            this.el().innerHTML = '<span class="vjs-pause-icon" title="Pause">⏸️</span>';
                            this.el().setAttribute('title', 'Pause');
                        }
                    }
                }
                window.videojs.registerComponent('PlayPauseToggleButton', PlayPauseToggleButton);
            }
            // Custom Save for Later Button
            if (!window.videojs.getComponent('SaveLaterButton')) {
                class SaveLaterButton extends Button {
                    constructor(player, options) {
                        super(player, options);
                        this.addClass('vjs-save-later-button');
                        this.addClass('custom-save-later');
                        this.el().innerHTML = '<span class="save-later-icon">🔖</span>';
                        this.el().setAttribute('title', 'Save for Later');
                    }
                    handleClick() {
                        // Prefer the richest current media context available
                        let movie = 
                            window.mediaLibraryManager?.currentMediaItem ||
                            window.videoPlayer?.currentMediaItem ||
                            window.videoPlayer?.currentFile ||
                            window.mediaLibraryManager?.currentFile;

                        let currentTime = 0, duration = 0;
                        if (this.player()) {
                            currentTime = this.player().currentTime();
                            duration = this.player().duration();
                        }

                        console.log('[VIDEO-PLAYER] Save for Later clicked:', { movie, currentTime, duration });
                        console.log('[VIDEO-PLAYER] MediaLibraryManager available:', !!window.mediaLibraryManager);
                        console.log('[VIDEO-PLAYER] saveResumeProgress function available:', typeof window.mediaLibraryManager?.saveResumeProgress);

                        // Normalize episode paths commonly used for TV shows
                        if (movie && !movie.path) {
                            if (movie.filePath) {
                                movie.path = movie.filePath;
                            } else if (movie.absPath) {
                                movie.path = movie.absPath;
                            } else if (movie.relPath) {
                                movie.path = movie.relPath;
                            }
                        }

                        // Attempt to enrich the media object by looking up in TV shows data if needed
                        if (window.mediaLibraryManager?.tvShowsData && (!movie || !movie.title || !movie.path)) {
                            try {
                                const tvData = window.mediaLibraryManager.tvShowsData;
                                const showsArray = Array.isArray(tvData) ? tvData : (tvData && typeof tvData === 'object' ? Object.values(tvData) : []);

                                const normalize = (p) => (p || '').replace(/\\/g, '/').toLowerCase().trim();
                                const targetPath = normalize(movie?.path || movie?.filePath || movie?.absPath || movie?.relPath);

                                let found = null;
                                for (const show of showsArray) {
                                    // Structure A: { seasons: [{ episodes: [...] }] }
                                    if (!found && Array.isArray(show?.seasons)) {
                                        for (const season of show.seasons) {
                                            if (Array.isArray(season?.episodes)) {
                                                for (const ep of season.episodes) {
                                                    const epPaths = [ep.path, ep.absPath, ep.filePath, ep.relPath].map(normalize);
                                                    if (epPaths.some(p => p && p === targetPath)) {
                                                        found = ep;
                                                        break;
                                                    }
                                                }
                                            }
                                            if (found) break;
                                        }
                                    }

                                    // Structure B: { folders: [{ files: [...] }] }
                                    if (!found && Array.isArray(show?.folders)) {
                                        for (const season of show.folders) {
                                            if (Array.isArray(season?.files)) {
                                                for (const ep of season.files) {
                                                    const epPaths = [ep.path, ep.absPath, ep.filePath, ep.relPath].map(normalize);
                                                    if (epPaths.some(p => p && p === targetPath)) {
                                                        found = ep;
                                                        break;
                                                    }
                                                }
                                            }
                                            if (found) break;
                                        }
                                    }

                                    if (found) {
                                        break;
                                    }
                                }

                                if (found) {
                                    movie = { ...found, path: found.path || found.filePath || found.absPath || found.relPath };
                                    console.log('[VIDEO-PLAYER] Enriched TV episode from tvShowsData:', movie);
                                }
                            } catch (err) {
                                console.warn('[VIDEO-PLAYER] TV shows lookup failed:', err);
                            }
                        }

                        // Ensure we have a title for display and saving
                        if (movie && !movie.title) {
                            movie.title = movie.name || movie.filename || movie.path || 'Untitled';
                            console.log('[VIDEO-PLAYER] Filled movie.title:', movie.title);
                        }

                        // Final fallback: if still no usable object, build one from the currently playing file
                        if ((!movie || !movie.path) && window.videoPlayer?.currentFile) {
                            const f = window.videoPlayer.currentFile;
                            movie = {
                                ...f,
                                title: f.name || f.filename || f.absPath || 'Untitled',
                                path: f.absPath || f.filePath || f.relPath || f.path,
                                type: 'tv-show'
                            };
                            console.log('[VIDEO-PLAYER] Built fallback media object from currentFile:', movie);
                        }

                        // Save to Watch Later using MediaLibraryManager
                        if (window.mediaLibraryManager && typeof window.mediaLibraryManager.saveResumeProgress === 'function' && movie && movie.path) {
                            console.log('[VIDEO-PLAYER] Calling saveResumeProgress with media:', movie);
                            window.mediaLibraryManager.saveResumeProgress(movie, currentTime, duration, true); // true = manual save

                            // if (typeof window.showToast === 'function') {
                            //     window.showToast('Saved to Watch Later section!', 'success');
                            // }
                            // Alert is handled by MediaLibraryManager.saveResumeProgress
                            console.log('[VIDEO-PLAYER] Saved to Watch Later at time/duration:', currentTime, duration);
                        } else {
                            console.warn('[VIDEO-PLAYER] Cannot save to Watch Later:', {
                                hasManager: !!window.mediaLibraryManager,
                                hasSave: typeof window.mediaLibraryManager?.saveResumeProgress,
                                hasMovie: !!movie,
                                hasPath: !!movie?.path
                            });

                            if (typeof window.showToast === 'function') {
                                window.showToast('Cannot save - no media data available', 'error');
                            }
                            if (window.videoPlayer && typeof window.videoPlayer.showOverlayAlert === 'function') {
                                window.videoPlayer.showOverlayAlert('Cannot save - no media data available');
                            }
                        }
                    }
                }
                window.videojs.registerComponent('SaveLaterButton', SaveLaterButton);

                // Custom Subtitle Button
                if (!window.videojs.getComponent('SubtitleButton')) {
                    class SubtitleButton extends Button {
                        constructor(player, options) {
                            super(player, options);
                            this.addClass('vjs-subtitle-button');
                            this.addClass('custom-subtitle');
                            this.subtitleEnabled = false;
                        }
                        
                        handleClick(event) {
                            // Prevent event propagation to avoid triggering play/pause
                            if (event) {
                                event.preventDefault();
                                event.stopPropagation();
                            }
                            
                            this.subtitleEnabled = !this.subtitleEnabled;
                            
                            if (this.subtitleEnabled) {
                                // Turn ON subtitles
                                let overlay = window.videoPlayer.container.querySelector('.simple-subtitle-overlay');
                                if (!overlay) {
                                    overlay = window.videoPlayer.createSimpleSubtitleOverlay();
                                }
                                
                                if (overlay) {
                                    overlay.style.display = 'block';
                                    window.videoPlayer.subtitlesEnabled = true;
                                    
                                    // Get the actual file path (not blob URL) for subtitle loading
                                    let videoPath = null;
                                    
                                    // PRIORITY 1: Use currentMediaItem.absPath (this has the full file system path)
                                    if (window.videoPlayer.currentMediaItem && window.videoPlayer.currentMediaItem.absPath) {
                                        videoPath = window.videoPlayer.currentMediaItem.absPath;
                                        console.log('[SUBTITLE] ✅ SUCCESS: Using currentMediaItem.absPath:', videoPath);
                                        console.log('[SUBTITLE] DEBUG: Full currentMediaItem object:', window.videoPlayer.currentMediaItem);
                                    } else if (window.videoPlayer.currentFile && window.videoPlayer.currentFile.absPath) {
                                        videoPath = window.videoPlayer.currentFile.absPath;
                                        console.log('[SUBTITLE] Using stored file path:', videoPath);
                                    } else if (window.videoPlayer.currentMediaItem && window.videoPlayer.currentMediaItem.path) {
                                        videoPath = window.videoPlayer.currentMediaItem.path;
                                        console.log('[SUBTITLE] Using media item path:', videoPath);
                                    } else {
                                        // Fallback: try to get from MediaLibraryManager
                                        if (window.mediaLibraryManager && window.mediaLibraryManager.currentMediaItem) {
                                            videoPath = window.mediaLibraryManager.currentMediaItem.path;
                                            console.log('[SUBTITLE] Using MediaLibraryManager path:', videoPath);
                                        }
                                    }
                                    
                                    if (videoPath) {
                                        window.videoPlayer.loadSubtitles(videoPath);
                                    } else {
                                        overlay.textContent = '🎬 No file path found for subtitles';
                                        console.log('[SUBTITLE] No file path found for subtitle loading');
                                    }
                                }
                            } else {
                                // Turn OFF subtitles
                                const overlay = window.videoPlayer.container.querySelector('.simple-subtitle-overlay');
                                if (overlay) {
                                    // Clear the subtitle text content completely
                                    overlay.textContent = '';
                                    overlay.style.display = 'none';
                                }
                                
                                window.videoPlayer.subtitlesEnabled = false;
                                
                                // Clear subtitle data
                                if (window.videoPlayer.subtitleCues) {
                                    window.videoPlayer.subtitleCues = [];
                                }
                                
                                // Remove the time update handler
                                if (window.videoPlayer.subtitleTimeUpdateHandler) {
                                    window.videoPlayer.vjsPlayer.off('timeupdate', window.videoPlayer.subtitleTimeUpdateHandler);
                                    window.videoPlayer.subtitleTimeUpdateHandler = null;
                                }
                                
                                console.log('[SUBTITLE] Subtitles turned OFF - text cleared and handlers removed');
                            }
                            
                            this.updateIcon();
                        }
                        
                        updateIcon() {
                            if (this.subtitleEnabled) {
                                this.el().innerHTML = '<span class="subtitle-icon" title="Subtitles ON">📖</span>';
                                this.el().setAttribute('title', 'Subtitles ON');
                                this.addClass('active');
                                console.log('[SUBTITLE] Button set to ACTIVE state');
                            } else {
                                this.el().innerHTML = '<span class="subtitle-icon" title="Subtitles OFF">📚</span>';
                                this.el().setAttribute('title', 'Subtitles OFF');
                                this.removeClass('active');
                                console.log('[SUBTITLE] Button set to INACTIVE state');
                            }
                        }
                    }
                    window.videojs.registerComponent('SubtitleButton', SubtitleButton);

                    // Subtitle Styling Button Component
                    class SubtitleStylingButton extends Button {
                        constructor(player, options) {
                            super(player, options);
                            this.addClass('vjs-subtitle-styling-button');
                            this.addClass('custom-subtitle-styling');
                            this.el().innerHTML = '<span class="subtitle-styling-icon" title="Subtitle Styling">🎨</span>';
                            this.el().setAttribute('title', 'Subtitle Styling');
                            this.currentStyleIndex = 0;
                                                this.styles = [
                        'small bold outline',
                        'small bold glow',
                        'small bold blue',
                        'small bold green',
                        'small bold red',
                        'small bold yellow',
                        'small bold dark',
                        'small bold light',
                        'small bold top',
                        'small bold left',
                        'small bold right'
                    ];
                        }
                        
                        handleClick() {
                            this.currentStyleIndex = (this.currentStyleIndex + 1) % this.styles.length;
                            const newStyle = this.styles[this.currentStyleIndex];
                            
                            if (window.videoPlayer) {
                                window.videoPlayer.applySubtitleStyling(newStyle);
                            }
                            
                            this.updateIcon();
                            console.log('[VIDEO-PLAYER] Applied subtitle style:', newStyle);
                        }
                        
                        updateIcon() {
                            const currentStyle = this.styles[this.currentStyleIndex];
                            let icon = '🎨';
                            
                            if (currentStyle.includes('glow')) icon = '✨';
                            else if (currentStyle.includes('blue')) icon = '🔵';
                            else if (currentStyle.includes('green')) icon = '🟢';
                            else if (currentStyle.includes('red')) icon = '🔴';
                            else if (currentStyle.includes('yellow')) icon = '🟡';
                            else if (currentStyle.includes('dark')) icon = '⚫';
                            else if (currentStyle.includes('light')) icon = '⚪';
                            else if (currentStyle.includes('top')) icon = '⬆️';
                            else if (currentStyle.includes('left')) icon = '⬅️';
                            else if (currentStyle.includes('right')) icon = '➡️';
                            
                            this.el().innerHTML = `<span class="subtitle-styling-icon" title="Subtitle Style: ${currentStyle}">${icon}</span>`;
                        }
                    }
                    window.videojs.registerComponent('SubtitleStylingButton', SubtitleStylingButton);
                }
            }
        }
        // Initialize Video.js with all desired controls and force control bar to show
        try {
            console.log('[VIDEO-PLAYER] Initializing Video.js player...');
            if (typeof window.videojs === 'undefined') {
                console.warn('🎬 [VIDEO-PLAYER] Video.js library not loaded, using native video element');
                this.vjsPlayer = null;
                // Set up native video element event listeners
                this.setupNativeVideoEvents();
                return;
            }
            if (!this.video) {
                console.error('🎬 [VIDEO-PLAYER] Video element not created');
                this.vjsPlayer = null;
                return;
            }

            this.vjsPlayer = window.videojs(this.video, {
                controls: true,
                autoplay: true,
                preload: 'auto',
                fluid: true,
                aspectRatio: '16:9',
                controlBar: {
                    children: [
                        'PlayPauseToggleButton',
                        'Back10Button',
                        'Forward10Button',
                        'currentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'SaveLaterButton',
                        'SubtitleButton',
                        'fullscreenToggle',
                        'volumePanel',
                        'remainingTimeDisplay',
                        'playbackRateMenuButton',
                        'chaptersButton',
                        'descriptionsButton',
                        'audioTrackButton',
                    ]
                },
                userActions: {
                    hotkeys: true
                }
            });

            // Force control bar to always show
            this.vjsPlayer.controlBar.show();
            this.vjsPlayer.controlBar.el().style.display = 'flex';
            this.vjsPlayer.addClass('vjs-has-controls');
            this.vjsPlayer.hasStarted(true);
            this.vjsPlayer.controls(true);
            this.vjsPlayer.on('userinactive', () => {
                this.vjsPlayer.controlBar.show();
                this.vjsPlayer.controlBar.el().style.display = 'flex';
            });
            this.vjsPlayer.on('useractive', () => {
                this.vjsPlayer.controlBar.show();
                this.vjsPlayer.controlBar.el().style.display = 'flex';
            });
            this.vjsPlayer.ready(() => {
                if (this._resolveReady) this._resolveReady();
                this.vjsPlayer.controlBar.show();
                this.vjsPlayer.controlBar.el().style.display = 'flex';
                
                // Connect audio amplification if enabled
                if (this.amplifyEnabled) {
                    this.connectAudioAmplification();
                }
                

                
                // Initialize subtitle button with closed book icon
                const subtitleButton = this.vjsPlayer.controlBar.getChild('SubtitleButton');
                if (subtitleButton) {
                    subtitleButton.updateIcon();
                }
                
                // Apply custom classes to volume and fullscreen icons for DOM targeting
                this.applyCustomIconClasses();
                
                // Create custom time display to show current time / total duration
                this.createCustomTimeDisplay();
                
                // Add timeupdate listener to update the custom time display
                this.vjsPlayer.on('timeupdate', () => {
                    this.updateTimeDisplay();
                });
                
                // REMOVED AUTOMATIC SUBTITLE OVERLAY CREATION - User will click "Subtitles" button when needed
                console.log('[VIDEO-PLAYER] Player ready - subtitle overlay will be created on demand');
            });
            // Add Save for Later button as a custom overlay or Video.js button if needed
            
            // Add persistent click-to-pause handler using Video.js API
            this.vjsPlayer.on('click', (e) => {
                console.log('[VIDEO-PLAYER] Video.js click event fired');
                // Only toggle if not clicking on controls
                if (e && (e.target.closest('.vjs-control-bar') || 
                         e.target.closest('.vjs-big-play-button') || 
                         e.target.closest('.vjs-loading-spinner') ||
                         e.target.closest('.video-player-amplify-controls'))) return; // Exclude AMPLIFY controls
                console.log('[VIDEO-PLAYER] Video clicked - toggling play/pause');
                e.preventDefault();
                e.stopPropagation();
                this.togglePlay();
            });

            // Add debug log to pause event
            this.vjsPlayer.off('pause');
            this.vjsPlayer.on('pause', () => {
                console.log('🎬 [VIDEO-PLAYER] Pause event triggered');
                // No auto-save on pause. Only Save for Later button saves progress.
            });

            // Add error handling for the Video.js player
            this.vjsPlayer.on('error', (error) => {
                console.warn('🎬 [VIDEO-PLAYER] Video.js error:', error);
            });
            
            // Add direct click handler to the video element for reliable click-to-pause
            this.video.addEventListener('click', (e) => {
                console.log('[VIDEO-PLAYER] Direct video element clicked');
                // Don't trigger if clicking on Video.js controls or AMPLIFY controls
                if (e.target.closest('.vjs-control-bar') || 
                    e.target.closest('.vjs-big-play-button') || 
                    e.target.closest('.vjs-loading-spinner') ||
                    e.target.closest('.video-player-amplify-controls')) {
                    return;
                }
                console.log('[VIDEO-PLAYER] Video element clicked - toggling play/pause');
                e.preventDefault();
                e.stopPropagation();
                this.togglePlay();
            }, true); // Use capture phase to ensure this runs first
            
        } catch (error) {
            console.error('🎬 [VIDEO-PLAYER] Failed to initialize Video.js:', error);
            this.vjsPlayer = null;
            // Set up native video element event listeners as fallback
            this.setupNativeVideoEvents();
        }
    }

    setupNativeVideoEvents() {
        if (!this.video) return;
        
        // Set up basic video controls
        this.video.addEventListener('click', (e) => {
            if (e.target.closest('.video-player-controls')) return;
            this.togglePlay();
        });
        
        this.video.addEventListener('pause', () => {
            console.log('🎬 [VIDEO-PLAYER] Native video pause event');
        });
        
        this.video.addEventListener('ended', () => {
            this.onVideoEnd();
        });
        
        this.video.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.video.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplay();
        });
    }

    createControls() {
        this.controls = document.createElement('div');
        this.controls.className = 'video-player-controls';
        this.controls.removeAttribute('style');

        // Removed playButton - not part of AMPLIFY feature

        // Removed progressBar - not part of AMPLIFY feature

        // Removed timeDisplay - not part of AMPLIFY feature

        // Removed volumeControl - not part of AMPLIFY feature

        // Create main amplify controls container
        this.amplifyControlsContainer = document.createElement('div');
        this.amplifyControlsContainer.className = 'amplify-controls-container';
        this.amplifyControlsContainer.removeAttribute('style');

        // Amplify button
        this.amplifyButton = document.createElement('button');
        this.amplifyButton.innerHTML = '🔊 AMPLIFY';
        this.amplifyButton.className = 'video-player-amplify-btn';
        this.amplifyButton.title = 'Audio Amplification: OFF (Click to enable)';
        this.amplifyButton.removeAttribute('style');
        this.amplifyButton.onclick = (e) => {
            e.stopPropagation(); // Prevent event from bubbling up to video player
            this.toggleAmplification();
        };

        // Amplify slider container (initially hidden)
        this.amplifySliderContainer = document.createElement('div');
        this.amplifySliderContainer.className = 'video-player-amplify-controls';
        this.amplifySliderContainer.style.display = 'none';

        // Amplify level display
        this.amplifyLevelDisplay = document.createElement('span');
        this.amplifyLevelDisplay.className = 'video-player-amplify-level';
        this.amplifyLevelDisplay.textContent = '100%';
        this.amplifyLevelDisplay.removeAttribute('style');

        // Amplify slider
        this.amplifySlider = document.createElement('input');
        this.amplifySlider.type = 'range';
        this.amplifySlider.min = '50';  // 50% minimum
        this.amplifySlider.max = '300'; // 300% maximum
        this.amplifySlider.value = '100'; // 100% default
        this.amplifySlider.className = 'video-player-amplify-slider';
        this.amplifySlider.removeAttribute('style');
        this.amplifySlider.oninput = (e) => {
            e.stopPropagation(); // Prevent event from bubbling up to video player
            e.preventDefault(); // Prevent any default behavior
            this.setAmplificationLevel(e.target.value / 100);
        };
        
        // Prevent all mouse events on slider from affecting video playback
        this.amplifySlider.onmousedown = (e) => e.stopPropagation();
        this.amplifySlider.onmouseup = (e) => e.stopPropagation();
        this.amplifySlider.onclick = (e) => e.stopPropagation();
        this.amplifySlider.onchange = (e) => {
            e.stopPropagation();
            this.setAmplificationLevel(e.target.value / 100);
        };

        // Prevent clicks on the amplify slider container from affecting video playback
        this.amplifySliderContainer.onclick = (e) => e.stopPropagation();
        this.amplifySliderContainer.onmousedown = (e) => e.stopPropagation();
        this.amplifySliderContainer.onmouseup = (e) => e.stopPropagation();

        // Prevent clicks on the main amplify container from affecting video playback
        this.amplifyControlsContainer.onclick = (e) => e.stopPropagation();
        this.amplifyControlsContainer.onmousedown = (e) => e.stopPropagation();
        this.amplifyControlsContainer.onmouseup = (e) => e.stopPropagation();

        // Add components to amplify slider container
        this.amplifySliderContainer.appendChild(this.amplifyLevelDisplay);
        this.amplifySliderContainer.appendChild(this.amplifySlider);

        // Add amplify button and slider container to the main container
        this.amplifyControlsContainer.appendChild(this.amplifyButton);
        this.amplifyControlsContainer.appendChild(this.amplifySliderContainer);

        // Removed fullscreenButton - not part of AMPLIFY feature

        // Removed watchLaterButton - not part of AMPLIFY feature

        // Add controls to container
        // Removed all appendChild calls - these controls are not part of AMPLIFY feature
        
        // Add amplify controls container directly to the video container (positioned absolutely)
        this.container.appendChild(this.amplifyControlsContainer);

        // Create RED LED indicator for AMPLIFY status
        this.amplifyLedIndicator = document.createElement('div');
        this.amplifyLedIndicator.className = 'amplify-led-indicator';
        this.amplifyLedIndicator.title = 'AMPLIFY Status Indicator';
        this.amplifyLedIndicator.removeAttribute('style');
        
        // Add LED indicator to container
        this.container.appendChild(this.amplifyLedIndicator);

        // Initialize LED indicator state
        this.updateAmplifyButton();
    }

    setupEventListeners() {
        // Video events (for HTML5 video element)
        this.video.addEventListener('loadedmetadata', () => this.updateTimeDisplay());
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('ended', () => this.onVideoEnd());
        // Note: Click handling is now done in createPlayer() for better Video.js compatibility

        // Container events for showing/hiding controls and click-to-pause
        this.container.addEventListener('mousemove', () => this.showControls());
        this.container.addEventListener('mouseleave', () => this.hideControls());
        this.container.addEventListener('click', (e) => {
            // Don't trigger if clicking on controls
            if (e.target.closest('.video-player-controls') || 
                e.target.closest('.video-player-file-btn') ||
                e.target.closest('.video-player-skip-intro-btn') ||
                e.target.closest('.video-player-up-next-overlay') ||
                e.target.closest('.amplify-controls-container') || // Exclude AMPLIFY controls container
                e.target.closest('.vjs-control-bar')) {
                return;
            }
            console.log('🎬 [VIDEO-PLAYER] Container clicked - toggling play/pause');
            this.togglePlay();
        });

        // Fullscreen event listeners
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Auto-hide controls timer
        this.controlsTimer = null;
    }

    openFileBrowser() {
        this.fileInput.click();
    }

    async loadVideo(file) {
       // console.log('[DEBUG - VIDEO-PLAYER] loadVideo called with:', file);
        // console.log('[DEBUG - VIDEO-PLAYER] File type:', typeof file);
        // console.log('[DEBUG - VIDEO-PLAYER] File properties:', Object.keys(file || {}));
        if (!file) {
            // console.log('[DEBUG - VIDEO-PLAYER] No file provided to loadVideo');
            return;
        }
        
        // Reset audio amplification for new video
        this.sourceCreated = false;
        this.sourceNode = null;
        this.amplifyEnabled = false;
        this.amplifyLevel = 1.0;
        
        // Reset amplify UI state
        if (this.amplifySliderContainer) {
            this.amplifySliderContainer.style.display = 'none';
        }
        
        // Update amplify button and LED to reflect reset state
        this.updateAmplifyButton();
        if (!this.vjsPlayer) {
            // console.error('🎬 [VIDEO-PLAYER] Video.js player not initialized');
            return;
        }
        
        // console.log('🎬 [VIDEO-PLAYER] Loading video:', file.name);
        
        // Clear any existing subtitle data when loading a new video
        this.purgeExistingSubtitles();
        
        // Clear any existing title check interval
        if (this.titleCheckInterval) {
            clearInterval(this.titleCheckInterval);
            this.titleCheckInterval = null;
        }
        
        // Store current TV show info in localStorage
        // console.log('[DEBUG - VIDEO-PLAYER] About to store TV show info for video:', file.name);
        console.log('[DEBUG - VIDEO-PLAYER] File object details:', {
            name: file.name,
            absPath: file.absPath,
            relPath: file.relPath,
            path: file.path
        });
        this.storeCurrentTVShowInfo(file);
        // console.log('[DEBUG - VIDEO-PLAYER] Finished storing TV show info');
        this.currentFile = file;
        const url = URL.createObjectURL(file);
        
        try {
            // Check if the file is a supported video format
            const supportedFormats = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv'];
            const fileType = file.type || this.getFileTypeFromExtension(file.name);
            
            if (!supportedFormats.includes(fileType)) {
                console.warn(`🎬 [VIDEO-PLAYER] Unsupported file type: ${fileType}`);
                this.showMessage(`Warning: ${fileType} may not be supported by your browser`);
            }
            
            // Use Video.js API to set the source
            this.vjsPlayer.src({
                src: url,
                type: fileType,
            });
            
            // Add error handling for video loading
            this.vjsPlayer.on('error', (error) => {
                console.error('🎬 [VIDEO-PLAYER] Video loading error:', error);
                console.error('🎬 [VIDEO-PLAYER] Error details:', {
                    code: error.code,
                    message: error.message,
                    type: error.type,
                    target: error.target,
                    currentSrc: this.vjsPlayer.currentSrc(),
                    readyState: this.vjsPlayer.readyState(),
                    networkState: this.vjsPlayer.networkState()
                });
                this.showMessage(`Error loading video: ${file.name}. The file may be corrupted or in an unsupported format.`);
            });
            
            this.vjsPlayer.on('loadeddata', async () => {
                console.log('🎬 [VIDEO-PLAYER] Video loaded successfully:', file.name);
                this.showMessage(`Loaded: ${file.name}`);
                
                // Update episode info header
                await this.updateMovieInfoHeader();
                
                // Start periodic title check to ensure year is always visible
                this.startTitleCheckInterval();
                
                // REMOVED AUTOMATIC SUBTITLE LOADING - User will click "Subtitles" button when needed
                console.log('🎬 [VIDEO-PLAYER] Video loaded - subtitles will be loaded manually via button click');
                
                // REMOVED: Auto-save on pause - this was causing unwanted Watch Later saves
                // Only the "Save for Later" button should save progress
                console.log('🎬 [VIDEO-PLAYER] Video loaded - auto-save on pause disabled');
            });
            
            // Force hide the big play button and start playing immediately
            this.vjsPlayer.ready(() => {
                // Hide the big play button
                const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                if (bigPlayButton) {
                    bigPlayButton.style.display = 'none';
                }
                
                // Start playing as soon as the video can start
                const playWhenReady = () => {
                    this.vjsPlayer.play().catch(error => {
                        console.warn('🎬 [VIDEO-PLAYER] Auto-play failed:', error);
                        this.showMessage('Click play to start video (auto-play blocked by browser)');
                    });
                    this.vjsPlayer.off('canplay', playWhenReady);
                };
                
                // Try to play immediately, or wait for canplay event
                this.vjsPlayer.play().catch(() => {
                    // If immediate play fails, wait for canplay event
                    this.vjsPlayer.on('canplay', playWhenReady);
                });
            });
            
            this.container.style.display = 'flex';
            this.isVisible = true;

            // Fetch media library and set up Up Next logic (non-blocking)
            this.fetchMediaLibrary().then(() => {
                this.setupUpNextAndSkipIntro();
            }).catch(error => {
                console.warn('🎬 [VIDEO-PLAYER] Media library setup failed:', error);
            });
            
        } catch (error) {
            console.error('🎬 [VIDEO-PLAYER] Error loading video:', error);
            this.showMessage(`Error loading video: ${file.name}`);
        }
    }

    // Helper method to determine file type from extension
    getFileTypeFromExtension(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const typeMap = {
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            'avi': 'video/avi',
            'mov': 'video/mov',
            'wmv': 'video/wmv',
            'mkv': 'video/mp4', // Treat MKV as MP4 for compatibility
            'flv': 'video/mp4', // Treat FLV as MP4 for compatibility
            'm4v': 'video/mp4'
        };
        return typeMap[ext] || 'video/mp4';
    }

    // Helper method to convert any path to web-ready format (delegates to MediaLibraryManager)
    convertPathToWebFormat(path) {
        // Delegate to MediaLibraryManager for path conversion
        if (window.mediaLibraryManager && window.mediaLibraryManager.convertPathToWebFormat) {
            return window.mediaLibraryManager.convertPathToWebFormat(path);
        }
        // Fallback if MediaLibraryManager not available
        if (!path) return null;
        return path.replace(/\\/g, '/');
    }

    // Centralized method to load episode video
    loadEpisodeVideo(episodeFile, episodeName) {
        this.showOverlayAlert(`Loading: ${episodeName}`, 2000);
        
        // Use the same approach as MediaLibraryManager for loading videos
        // Prioritize filePath for Featurettes/Specials (contains show name)
        // Then use path for regular episodes (relative path is more reliable)
        // No absPath fallback needed since we have unified JSON
        let videoPath = episodeFile.filePath || episodeFile.path;
        if (videoPath) {
            console.log('[VIDEO-PLAYER] Loading video from path:', videoPath);
            
            // Convert path to web-ready format using centralized method
            let relativePath = this.convertPathToWebFormat(videoPath);
            
            // For Featurettes/Specials, we need to include the show name in the path
            // The server expects paths like "Show Name (Year)/Featurettes/episode.avi"
            if (relativePath.startsWith('Featurettes/') || relativePath.startsWith('Specials/')) {
                console.log('[VIDEO-PLAYER] Processing Featurettes path, episodeFile:', episodeFile);
                // Extract show name from the episode object or current context
                let showName = null;
                if (episodeFile.showName) {
                    showName = episodeFile.showName;
                    console.log('[VIDEO-PLAYER] Using episodeFile.showName:', showName);
                } else if (episodeFile.path) {
                    // Try to extract from path like "Lois And Clark The New Adventures Of Superman (1993)/Featurettes/..."
                    const pathParts = episodeFile.path.split(/[\\/]/);
                    if (pathParts.length > 0) {
                        showName = pathParts[0];
                        console.log('[VIDEO-PLAYER] Extracted showName from path:', showName);
                    }
                }
                
                if (showName) {
                    relativePath = `${showName}/${relativePath}`;
                    console.log('[VIDEO-PLAYER] Added show name to Featurettes path:', relativePath);
                } else {
                    console.log('[VIDEO-PLAYER] WARNING: Could not extract show name for Featurettes!');
                }
            }
            
            const encodedPath = encodeURIComponent(relativePath);
            const videoUrl = `/api/video?path=${encodedPath}`;
            
            console.log('[VIDEO-PLAYER] Converted to relative path:', relativePath);
            console.log('[VIDEO-PLAYER] Video URL:', videoUrl);
            this.playUrl(videoUrl, 'video/mp4', 0, episodeFile);
        } else {
            console.error('[VIDEO-PLAYER] No video path found for episode:', episodeName);
            this.showOverlayAlert('Error: No video path found', 2000);
        }
    }

    // Extract episode information from file path
    extractEpisodeInfo(filePath) {
        if (!filePath) return null;
        
        console.log('[DEBUG - VIDEO-PLAYER] extractEpisodeInfo called with:', filePath);
        
        // Add more detailed debugging for the file path
        console.log('[DEBUG - VIDEO-PLAYER] File path type:', typeof filePath);
        console.log('[DEBUG - VIDEO-PLAYER] File path length:', filePath.length);
        console.log('[DEBUG - VIDEO-PLAYER] File path contains "Lost in Space":', filePath.includes('Lost in Space'));
        console.log('[DEBUG - VIDEO-PLAYER] File path contains "S01E01":', filePath.includes('S01E01'));
        
        const path = filePath.replace(/\\/g, '/'); // Normalize path separators
        
        // Extract show name from TV-SHOWS directory structure OR relative paths
        let tvShowsMatch = path.match(/TV[-_]SHOWS?[\/\\]([^\/\\]+)/i);
        let showName = 'Unknown Show';
        let showYear = null;
        
        // If no TV-SHOWS match found, try to extract from relative path structure
        if (!tvShowsMatch) {
            // Handle relative paths like "Lucifer (2016)/Season 06/..."
            const relativePathMatch = path.match(/^([^\/\\]+?)(?:\/|\\|$)/);
            if (relativePathMatch) {
                tvShowsMatch = [null, relativePathMatch[1]];
                console.log('[DEBUG - VIDEO-PLAYER] Using relative path match:', relativePathMatch[1]);
            }
        }
        
        if (tvShowsMatch) {
            const folderName = tvShowsMatch[1];
            console.log('[DEBUG - VIDEO-PLAYER] Raw folder name:', folderName);
            
            // Extract year from folder name if present
            const yearMatch = folderName.match(/\((\d{4})\)/);
            if (yearMatch) {
                showYear = yearMatch[1];
                console.log('[DEBUG - VIDEO-PLAYER] Found year in folder name:', showYear);
            }
            
            // Clean the show name but preserve the year for later use
            showName = folderName
                .replace(/\(\d{4}\)/, '') // Remove year in parentheses
                .replace(/\[.*?\]/g, '') // Remove brackets
                .replace(/\d{4}/, '') // Remove standalone years
                .replace(/[._-]+/g, ' ') // Replace separators with spaces
                .replace(/\s+/g, ' ') // Collapse multiple spaces
                .trim();
        }
        
        console.log('[DEBUG - VIDEO-PLAYER] Extracted show name:', showName);
        console.log('[DEBUG - VIDEO-PLAYER] Extracted show year:', showYear);
        console.log('[DEBUG - VIDEO-PLAYER] Show name length:', showName.length);
        console.log('[DEBUG - VIDEO-PLAYER] Show name contains "Daisy":', showName.includes('Daisy'));
        console.log('[DEBUG - VIDEO-PLAYER] Show name contains "Jones":', showName.includes('Jones'));
        
        // Extract season number - try multiple patterns
        let seasonNumber = null;
        const seasonPatterns = [
            /season[\s_-]*(\d+)/i,
            /s(\d+)e\d+/i,
            /s(\d+)/i,
            /(\d+)x\d+/i,
            /season\s*(\d+)/i,
            /s(\d+)/i
        ];
        
        for (const pattern of seasonPatterns) {
            const match = path.match(pattern);
            if (match) {
                seasonNumber = parseInt(match[1], 10);
                console.log('[DEBUG - VIDEO-PLAYER] Found season number:', seasonNumber, 'using pattern:', pattern);
                break;
            }
        }
        
        // Extract episode number from filename - try multiple patterns
        const filename = path.split('/').pop() || '';
        console.log('[DEBUG - VIDEO-PLAYER] Extracting episode from filename:', filename);
        
        let episodeNumber = null;
        const episodePatterns = [
            /S\d+E(\d+)/i,
            /season\s*\d+\s*episode\s*(\d+)/i,
            /ep(?:isode)?[\s_-]*(\d+)/i,
            /E(\d+)/i,
            /\d+x(\d+)/i,
            /[\s_-](\d+)[\s_-]/,
            /(\d+)\.(?:mp4|mkv|avi|mov|wmv|flv|m4v)$/i,
            /episode\s*(\d+)/i,
            /ep\s*(\d+)/i
        ];
        
        for (const pattern of episodePatterns) {
            const match = filename.match(pattern);
            if (match) {
                const num = parseInt(match[1], 10);
                // Only accept reasonable episode numbers (1-999)
                if (num >= 1 && num <= 999) {
                    episodeNumber = num;
                    console.log('[DEBUG - VIDEO-PLAYER] Found episode number:', episodeNumber, 'using pattern:', pattern);
                    break;
                }
            }
        }
        
        // If we still don't have episode number, try to extract from the title
        if (!episodeNumber && filename.includes('Episode')) {
            const episodeMatch = filename.match(/Episode\s*(\d+)/i);
            if (episodeMatch) {
                episodeNumber = parseInt(episodeMatch[1], 10);
                console.log('[DEBUG - VIDEO-PLAYER] Found episode number from title:', episodeNumber);
            }
        }
        
        const result = {
            showName,
            showYear,
            seasonNumber,
            episodeNumber,
            isValid: showName !== 'Unknown Show' && showName.length > 0
        };
        
        console.log('[DEBUG - VIDEO-PLAYER] extractEpisodeInfo result:', result);
        
        return result;
    }

    // Extract episode title from filename
    extractEpisodeTitle(fileName) {
        if (!fileName) return 'Unknown Episode';
        
        // Remove file extension
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        
        // Remove show name and year (e.g., "Blue Planet 2 (2017)")
        let episodeTitle = nameWithoutExt
            .replace(/^.*?\([0-9]{4}\)\s*-\s*/, '') // Remove "Show Name (Year) - "
            .replace(/^.*?S\d{1,2}E\d{1,2}\s*-\s*/, '') // Remove "Show Name S01E01 - "
            .replace(/^.*?Season\s*\d+\s*Episode\s*\d+\s*-\s*/, '') // Remove "Show Name Season 01 Episode 01 - "
            .trim();
        
        // If no title found, try to extract from S01E01 format
        if (!episodeTitle || episodeTitle === nameWithoutExt) {
            const episodeMatch = nameWithoutExt.match(/S\d{1,2}E\d{1,2}\s*[-_]\s*(.+)/i);
            if (episodeMatch) {
                episodeTitle = episodeMatch[1].trim();
            }
        }
        
        return episodeTitle || 'Unknown Episode';
    }

    // NEW METHOD: Single source of truth for TV show title formatting
    async processProperTvShowName(episodeInfo, filePath) {
        console.log('[DEBUG - VIDEO-PLAYER] processProperTvShowName called');
        console.log('[DEBUG - VIDEO-PLAYER] Episode info:', episodeInfo);
        console.log('[DEBUG - VIDEO-PLAYER] File path:', filePath);
        console.log('[DEBUG - VIDEO-PLAYER] Current media item:', this.currentMediaItem);
        console.log('[DEBUG - VIDEO-PLAYER] Current media item title:', this.currentMediaItem?.title);
        console.log('[DEBUG - VIDEO-PLAYER] Current media item year:', this.currentMediaItem?.year);
        console.log('[DEBUG - VIDEO-PLAYER] Current media item data.year:', this.currentMediaItem?.data?.year);
        
        let showName = '';
        let showYear = null;
        
        // Priority 1: Use data from currentMediaItem if available
        if (this.currentMediaItem) {
            // Clean the currentMediaItem.title/name before processing
            const cleanedMediaItemTitle = this.currentMediaItem.title ? this.cleanTVShowTitle(this.currentMediaItem.title) : '';
            const cleanedMediaItemName = this.currentMediaItem.name ? this.cleanTVShowTitle(this.currentMediaItem.name) : '';
            
            // Check if title already contains year (from MediaLibraryManager)
            if (cleanedMediaItemTitle && cleanedMediaItemTitle.includes('(')) {
                // Extract show name and year from the cleaned title
                const titleMatch = cleanedMediaItemTitle.match(/^(.+?)\s*\((\d{4})\)/);
                if (titleMatch) {
                    showName = titleMatch[1].trim();
                    showYear = titleMatch[2];
                    console.log('[DEBUG - VIDEO-PLAYER] Using show name and year from media item title (cleaned):', showName, showYear);
                }
            } else {
                // Title doesn't have year, so we need to add it
                if (cleanedMediaItemName) {
                    showName = cleanedMediaItemName;
                    console.log('[DEBUG - VIDEO-PLAYER] Using show name from media item.name (cleaned):', showName);
                }
                
                // Get year from other properties
                if (this.currentMediaItem.year) {
                    showYear = this.currentMediaItem.year;
                    console.log('[DEBUG - VIDEO-PLAYER] Using year from media item.year:', showYear);
                } else if (this.currentMediaItem.data && this.currentMediaItem.data.year) {
                    showYear = this.currentMediaItem.data.year;
                    console.log('[DEBUG - VIDEO-PLAYER] Using year from media item.data.year:', showYear);
                }
            }
        }
        
        // Priority 2: Use episodeInfo if we don't have complete data
        if (!showName && episodeInfo && episodeInfo.showName) {
            // Ensure episodeInfo.showName is also cleaned
            showName = this.cleanTVShowTitle(episodeInfo.showName);
            console.log('[DEBUG - VIDEO-PLAYER] Using show name from episodeInfo (cleaned):', showName);
        }
        
        if (!showYear && episodeInfo && episodeInfo.showYear) {
            showYear = episodeInfo.showYear;
            console.log('[DEBUG - VIDEO-PLAYER] Using year from episodeInfo:', showYear);
        }
        
        // Priority 3: Extract from file path if still missing data
        if (!showName || !showYear) {
            console.log('[DEBUG - VIDEO-PLAYER] Extracting missing data from file path');
            const extractedInfo = this.extractEpisodeInfo(filePath);
            
            if (!showName && extractedInfo && extractedInfo.showName) {
                // Ensure extractedInfo.showName is also cleaned
                showName = this.cleanTVShowTitle(extractedInfo.showName);
                console.log('[DEBUG - VIDEO-PLAYER] Using show name from path extraction (cleaned):', showName);
            }
            
            if (!showYear && extractedInfo && extractedInfo.showYear) {
                showYear = extractedInfo.showYear;
                console.log('[DEBUG - VIDEO-PLAYER] Using year from path extraction:', showYear);
            }
        }
        
        // Clean the show name
        if (showName) {
            showName = this.cleanTVShowTitle(showName);
        }
        
        // Build the final title
        let finalTitle = '';
        
        if (showName) {
            // Check if the showName already contains the year (from MediaLibraryManager)
            if (showName.includes('(') && showName.match(/\(\d{4}\)/)) {
                // Show name already has year, use it as is
                finalTitle = showName;
                console.log('[DEBUG - VIDEO-PLAYER] Show name already contains year, using as is:', finalTitle);
            } else {
                // Show name doesn't have year, add it
                finalTitle = showName;
                if (showYear) {
                    finalTitle += ` (${showYear})`;
                    console.log('[DEBUG - VIDEO-PLAYER] Added year to show name:', finalTitle);
                }
            }
            
            // Add season info if available
            if (episodeInfo && episodeInfo.seasonNumber !== null) {
                finalTitle += ` | Season ${String(episodeInfo.seasonNumber).padStart(2, '0')}`;
            }
            
            // Add episode info if available
            if (episodeInfo && episodeInfo.episodeNumber !== null) {
                finalTitle += ` | Episode ${String(episodeInfo.episodeNumber).padStart(2, '0')}`;
            }
        } else {
            // Fallback: use the original episodeInfo logic
            console.log('[DEBUG - VIDEO-PLAYER] Using fallback title construction');
            finalTitle = this.cleanTVShowTitle(episodeInfo ? episodeInfo.showName : 'Unknown Show');
            
            if (showYear) {
                finalTitle += ` (${showYear})`;
            } else if (episodeInfo && episodeInfo.showYear) {
                finalTitle += ` (${episodeInfo.showYear})`;
            }
            
            if (episodeInfo && episodeInfo.seasonNumber !== null) {
                finalTitle += ` | Season ${String(episodeInfo.seasonNumber).padStart(2, '0')}`;
            }
            
            if (episodeInfo && episodeInfo.episodeNumber !== null) {
                finalTitle += ` | Episode ${String(episodeInfo.episodeNumber).padStart(2, '0')}`;
            }
        }
        
        console.log('[DEBUG - VIDEO-PLAYER] Final processed TV show title:', finalTitle);
        return finalTitle;
    }

    // Utility to clean up movie titles for display
    cleanMovieTitle(filename) {
        if (!filename || typeof filename !== 'string') return '';
        // Remove extension
        let name = filename.replace(/\.[^/.]+$/, "");
        // Keep (year) but remove [quality] only
        name = name.replace(/\[\d{3,4}p\]/gi, "");    // Remove [1080p], [720p], etc.
        // Remove standalone years (not in parentheses)
        name = name.replace(/\b(19|20)\d{2}\b/g, "");
        // Remove audio channel tags like AAC5 1, AAC51, DDP5 1, DDP51, etc.
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*5[ ._\-]*1\b/gi, "");
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*7[ ._\-]*1\b/gi, "");
        // Remove common tags (only as whole words or after separators)
        name = name.replace(/(?:^|[ ._\-])(?:480p|720p|1080p|2160p|4k|8k|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|aac|dts|yify|rarbg|repack|extended|unrated|directors cut|remux|hdtv|amzn|nf|web|ddp|dd5[ ._\-]?1|5[ ._\-]?1|7[ ._\-]?1|mp3|flac|truehd|atmos|hevc|h265|h264|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion)(?=$|[ ._\-])/gi, "");
        // Remove trailing group tags (e.g., -YTS, -RARBG, etc.)
        name = name.replace(/[-_. ]+(yts( mx| am)?|rarbg|jyk|kogi|web|amzn|nf|ddp|dd5[ ._\-]?1|aac|dts|hdtv|remux|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)(?=$|[ ._\-])/i, "");
        // Replace dots, underscores, dashes with spaces
        name = name.replace(/[._-]+/g, " ");
        // Remove extra spaces
        name = name.replace(/\s+/g, " ").trim();
        // Capitalize each word
        name = this.capitalizeTitle(name);
        return name;
    }

    // Clean movie title for video player display - only title and year
    cleanMovieTitleForDisplay(filename) {
        if (!filename || typeof filename !== 'string') return '';
        
        // Remove extension
        let name = filename.replace(/\.[^/.]+$/, "");
        
        // Extract year from filename if present
        const yearMatch = name.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : null;
        
        // Remove year from name for processing
        name = name.replace(/\(\d{4}\)/, "");
        
        // Remove all quality tags and brackets
        name = name.replace(/\[\d{3,4}p\]/gi, ""); // Remove [1080p], [720p], etc.
        name = name.replace(/\[.*?\]/g, ""); // Remove any other brackets
        
        // Remove standalone years (not in parentheses)
        name = name.replace(/\b(19|20)\d{2}\b/g, "");
        
        // Remove all common video/audio tags
        name = name.replace(/(?:^|[ ._\-])(?:480p|720p|1080p|2160p|4k|8k|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|aac|dts|yify|rarbg|repack|extended|unrated|directors cut|remux|hdtv|amzn|nf|web|ddp|dd5[ ._\-]?1|5[ ._\-]?1|7[ ._\-]?1|mp3|flac|truehd|atmos|hevc|h265|h264|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)(?=$|[ ._\-])/gi, "");
        
        // Remove audio channel tags
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*5[ ._\-]*1\b/gi, "");
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*7[ ._\-]*1\b/gi, "");
        
        // Remove trailing group tags
        name = name.replace(/[-_. ]+(yts( mx| am)?|rarbg|jyk|kogi|web|amzn|nf|ddp|dd5[ ._\-]?1|aac|dts|hdtv|remux|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)(?=$|[ ._\-])/i, "");
        
        // Preserve common abbreviations with periods before general dot replacement
        name = name.replace(/\bU\.S\.\b/gi, 'US_ABBREV');
        name = name.replace(/\bU\.K\.\b/gi, 'UK_ABBREV');
        name = name.replace(/\bU\.N\.\b/gi, 'UN_ABBREV');
        name = name.replace(/\bU\.S\.A\.\b/gi, 'USA_ABBREV');
        name = name.replace(/\bMr\.\b/gi, 'MR_ABBREV');
        name = name.replace(/\bMrs\.\b/gi, 'MRS_ABBREV');
        name = name.replace(/\bDr\.\b/gi, 'DR_ABBREV');
        name = name.replace(/\bProf\.\b/gi, 'PROF_ABBREV');
        name = name.replace(/\bSt\.\b/gi, 'ST_ABBREV');
        name = name.replace(/\bAve\.\b/gi, 'AVE_ABBREV');
        name = name.replace(/\bBlvd\.\b/gi, 'BLVD_ABBREV');
        name = name.replace(/\bRd\.\b/gi, 'RD_ABBREV');
        name = name.replace(/\bLn\.\b/gi, 'LN_ABBREV');
        name = name.replace(/\bCt\.\b/gi, 'CT_ABBREV');
        name = name.replace(/\bCo\.\b/gi, 'CO_ABBREV');
        name = name.replace(/\bInc\.\b/gi, 'INC_ABBREV');
        name = name.replace(/\bLtd\.\b/gi, 'LTD_ABBREV');
        name = name.replace(/\bCorp\.\b/gi, 'CORP_ABBREV');
        
        // Replace dots, underscores, dashes with spaces (but preserve the abbreviations we just marked)
        name = name.replace(/[._-]+/g, " ");
        
        // Restore abbreviations with proper formatting
        name = name.replace(/US_ABBREV/gi, 'U.S.');
        name = name.replace(/UK_ABBREV/gi, 'U.K.');
        name = name.replace(/UN_ABBREV/gi, 'U.N.');
        name = name.replace(/USA_ABBREV/gi, 'U.S.A.');
        name = name.replace(/MR_ABBREV/gi, 'Mr.');
        name = name.replace(/MRS_ABBREV/gi, 'Mrs.');
        name = name.replace(/DR_ABBREV/gi, 'Dr.');
        name = name.replace(/PROF_ABBREV/gi, 'Prof.');
        name = name.replace(/ST_ABBREV/gi, 'St.');
        name = name.replace(/AVE_ABBREV/gi, 'Ave.');
        name = name.replace(/BLVD_ABBREV/gi, 'Blvd.');
        name = name.replace(/RD_ABBREV/gi, 'Rd.');
        name = name.replace(/LN_ABBREV/gi, 'Ln.');
        name = name.replace(/CT_ABBREV/gi, 'Ct.');
        name = name.replace(/CO_ABBREV/gi, 'Co.');
        name = name.replace(/INC_ABBREV/gi, 'Inc.');
        name = name.replace(/LTD_ABBREV/gi, 'Ltd.');
        name = name.replace(/CORP_ABBREV/gi, 'Corp.');
        
        // Remove extra spaces and trim
        name = name.replace(/\s+/g, " ").trim();
        
        // Capitalize each word
        name = this.capitalizeTitle(name);
        
        // Add year back if we found one
        if (year) {
            name = `${name} (${year})`;
        }
        
        return name;
    }

    // Utility to clean up TV show titles for display
    cleanTVShowTitle(title) {
        if (!title || typeof title !== 'string') return '';
        // For TV shows, extract just the show name for clean UI display
        // Keep year in parentheses but remove quality info and file extensions for user-friendly display
        let name = title.trim();
        
        // Remove file extensions first
        name = name.replace(/\.[^/.]+$/, ""); // Remove .mkv, .mp4, etc.
        
        // Remove episode codes like S01e05, S1E5, etc. (before other cleaning)
        name = name.replace(/\b[Ss]\d{1,2}[Ee]\d{1,2}\b/g, ""); // Remove S01e05, S1E5, etc.
        name = name.replace(/\b[Ss]\d{1,2}\s*[Ee]\d{1,2}\b/g, ""); // Remove S01 E05, S1 E5, etc.
        name = name.replace(/\b[Ss]eason\s*\d{1,2}\s*[Ee]pisode\s*\d{1,2}\b/gi, ""); // Remove Season 01 Episode 05, etc.
        name = name.replace(/\b[Ss]eason\s*\d{1,2}\s*[Ee]p\s*\d{1,2}\b/gi, ""); // Remove Season 01 Ep 05, etc.
        name = name.replace(/\b[Ee]pisode\s*\d{1,2}\b/gi, ""); // Remove Episode 05, etc.
        name = name.replace(/\b[Ee]p\s*\d{1,2}\b/gi, ""); // Remove Ep 05, etc.
        
        // Keep (year) but remove [quality] info for display
        name = name.replace(/\[\d{3,4}p\]/gi, "");    // Remove [1080p], [720p], etc.
        
        // Remove common video file tags (only as whole words or after separators)
        name = name.replace(/(?:^|[ ._\-])(?:mkv|mp4|avi|mov|wmv|flv|m4v|webm|ogv|3gp|ts|mts|m2ts)(?=$|[ ._\-])/gi, "");
        
        // Remove audio channel tags like AAC5 1, AAC51, DDP5 1, DDP51, etc.
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*5[ ._\-]*1\b/gi, "");
        name = name.replace(/\b(aac|ddp|dd|dts|ac3)[ ._\-]*7[ ._\-]*1\b/gi, "");
        
        // Remove other common tags (only as whole words or after separators)
        name = name.replace(/(?:^|[ ._\-])(?:480p|720p|1080p|2160p|4k|8k|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|aac|dts|yify|rarbg|repack|extended|unrated|directors cut|remux|hdtv|amzn|nf|web|ddp|dd5[ ._\-]?1|5[ ._\-]?1|7[ ._\-]?1|mp3|flac|truehd|atmos|hevc|h265|h264|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)(?=$|[ ._\-])/gi, "");
        
        // Remove trailing group tags (e.g., -YTS, -RARBG, etc.)
        name = name.replace(/[-_. ]+(yts( mx| am)?|rarbg|jyk|kogi|web|amzn|nf|ddp|dd5[ ._\-]?1|aac|dts|hdtv|remux|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)\b.*$/i, "");
        
        // Replace dots, underscores, dashes with spaces
        name = name.replace(/[._-]+/g, " ");
        // Remove extra spaces
        name = name.replace(/\s+/g, " ").trim();
        // Capitalize each word
        name = this.capitalizeTitle(name);
        return name;
    }

    // Utility to capitalize title words
    capitalizeTitle(str) {
        if (!str || typeof str !== 'string') return '';
        return str.split(' ').map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }

    // Update the movie/TV show info header
    async updateMovieInfoHeader() {
        console.log('[DEBUG - VIDEO-PLAYER] updateMovieInfoHeader called');
        if (!this.episodeInfoHeader) {
            console.log('[DEBUG - VIDEO-PLAYER] No episodeInfoHeader element found');
            console.log('[DEBUG - VIDEO-PLAYER] Creating episodeInfoHeader element...');
            
            // Try to create the element if it doesn't exist
            this.episodeInfoHeader = document.createElement('div');
            this.episodeInfoHeader.id = 'episode-info-header';
            this.episodeInfoHeader.className = 'episode-info-header';
            this.episodeInfoHeader.style.cssText = 'position: absolute; top: 10px; left: 10px; color: white; font-size: 18px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); z-index: 1000;';
            
            // Try to find a container to append it to
            const container = this.container || document.getElementById('video-player-container');
            if (container) {
                container.appendChild(this.episodeInfoHeader);
                console.log('[DEBUG - VIDEO-PLAYER] Created and appended episodeInfoHeader element');
            } else {
                console.error('[DEBUG - VIDEO-PLAYER] Could not find container for episodeInfoHeader');
            return;
            }
        }
        
        let filePath = null;
        
        // Get file path from current file or media item
        // PRIORITY: Use currentMediaItem.path first if it exists (our unified data)
        if (this.currentMediaItem && this.currentMediaItem.path) {
            filePath = this.currentMediaItem.path;
        } else if (this.currentFile && this.currentFile.absPath) {
            filePath = this.currentFile.absPath;
        } else if (this.currentFile && this.currentFile.name) {
            filePath = this.currentFile.name;
        }
        
        console.log('[DEBUG - VIDEO-PLAYER] Current file:', this.currentFile);
        console.log('[DEBUG - VIDEO-PLAYER] Current media item:', this.currentMediaItem);
        console.log('[DEBUG - VIDEO-PLAYER] File path:', filePath);
        
        if (!filePath) {
            console.log('[DEBUG - VIDEO-PLAYER] No file path found, clearing header');
            this.episodeInfoHeader.innerHTML = '';
            return;
        }
        
        // Decode URL-encoded path (handle multiple levels of encoding)
        let decodedPath = filePath;
        try {
            // Keep decoding until no more % characters are found or we've tried 5 times
            let attempts = 0;
            while (decodedPath.includes('%') && attempts < 5) {
                const beforeDecode = decodedPath;
                decodedPath = decodeURIComponent(decodedPath);
                attempts++;
                // If decoding didn't change anything, break to avoid infinite loop
                if (beforeDecode === decodedPath) break;
            }
        } catch (e) {
            // If decoding fails, use the original path
            console.warn('Failed to decode file path:', e);
            decodedPath = filePath;
        }
        
        console.log('[DEBUG - VIDEO-PLAYER] Decoded path:', decodedPath);
        
        const episodeInfo = this.extractEpisodeInfo(decodedPath);
        console.log('[DEBUG - VIDEO-PLAYER] Episode info:', episodeInfo);
        
        if (episodeInfo && episodeInfo.isValid) {
            console.log('[DEBUG - VIDEO-PLAYER] Processing as TV show');
            
            // Use the new centralized method for consistent TV show title formatting
            const infoText = await this.processProperTvShowName(episodeInfo, decodedPath);
            
            console.log('[DEBUG - VIDEO-PLAYER] Final TV show title:', infoText);
            this.episodeInfoHeader.innerHTML = infoText;
        } else {
            console.log('[DEBUG - VIDEO-PLAYER] Processing as movie');
            console.log('[DEBUG - VIDEO-PLAYER] currentMediaItem:', this.currentMediaItem);
            console.log('[DEBUG - VIDEO-PLAYER] currentMediaItem.TMDBTitle:', this.currentMediaItem?.TMDBTitle);
            console.log('[DEBUG - VIDEO-PLAYER] currentMediaItem.title:', this.currentMediaItem?.title);
            console.log('[DEBUG - VIDEO-PLAYER] currentMediaItem.path:', this.currentMediaItem?.path);
            
            // FORCE ALL MOVIES TO HAVE YEARS - NO EXCEPTIONS!
            let displayTitle = '';
            let originalTitle = '';
            
            // For movies, always use TMDB title with only title and year
            if (this.currentMediaItem && this.currentMediaItem.TMDBTitle) {
                console.log('[DEBUG - VIDEO-PLAYER] Using TMDB title from JSON data:', this.currentMediaItem.TMDBTitle);
                displayTitle = this.currentMediaItem.TMDBTitle;
                originalTitle = this.currentMediaItem.TMDBTitle;
            } else if (this.currentMediaItem && this.currentMediaItem.title) {
                console.log('[DEBUG - VIDEO-PLAYER] Using title from JSON data:', this.currentMediaItem.title);
                // Use MediaLibraryManager's title conversion for consistent formatting
                if (window.mediaLibraryManager && window.mediaLibraryManager.convertNormalizedKeyToDisplayTitle) {
                    displayTitle = window.mediaLibraryManager.convertNormalizedKeyToDisplayTitle(this.currentMediaItem.title);
                    console.log('[DEBUG - VIDEO-PLAYER] Converted title using MediaLibraryManager:', displayTitle);
                } else {
                    // Fallback to local function if MediaLibraryManager not available
                    displayTitle = this.cleanMovieTitleForDisplay(this.currentMediaItem.title);
                    console.log('[DEBUG - VIDEO-PLAYER] Fallback cleaned JSON title:', displayTitle);
                }
                originalTitle = this.currentMediaItem.title;
            } else if (this.currentMediaItem && this.currentMediaItem.path) {
                console.log('[DEBUG - VIDEO-PLAYER] Using path from JSON data as title:', this.currentMediaItem.path);
                // Use MediaLibraryManager's title conversion for consistent formatting
                if (window.mediaLibraryManager && window.mediaLibraryManager.convertNormalizedKeyToDisplayTitle) {
                    displayTitle = window.mediaLibraryManager.convertNormalizedKeyToDisplayTitle(this.currentMediaItem.path);
                    console.log('[DEBUG - VIDEO-PLAYER] Converted path using MediaLibraryManager:', displayTitle);
                } else {
                    // Fallback to local function if MediaLibraryManager not available
                    displayTitle = this.cleanMovieTitleForDisplay(this.currentMediaItem.path);
                    console.log('[DEBUG - VIDEO-PLAYER] Fallback cleaned path title:', displayTitle);
                }
                originalTitle = this.currentMediaItem.path;
            } else {
                // Fallback: use clean movie title from filename
                const filename = decodedPath.split(/[\/\\]/).pop() || '';
                
                // Use MediaLibraryManager's title conversion for consistent formatting
                if (window.mediaLibraryManager && window.mediaLibraryManager.convertNormalizedKeyToDisplayTitle) {
                    displayTitle = window.mediaLibraryManager.convertNormalizedKeyToDisplayTitle(filename);
                    console.log('[DEBUG - VIDEO-PLAYER] Converted filename using MediaLibraryManager:', displayTitle);
                } else {
                    // Fallback to local function if MediaLibraryManager not available
                    displayTitle = this.cleanMovieTitleForDisplay(filename);
                    console.log('[DEBUG - VIDEO-PLAYER] Fallback cleaned filename title:', displayTitle);
                }
                
                originalTitle = filename;
                console.log('[DEBUG - VIDEO-PLAYER] Using fallback title from filename:', displayTitle);
            }
            
            // MANDATORY: FORCE EVERY MOVIE TO HAVE A YEAR - NO EXCEPTIONS!
            console.log('[DEBUG - VIDEO-PLAYER] ==========================================');
            console.log('[DEBUG - VIDEO-PLAYER] FORCING year enforcement for movie:', displayTitle);
            console.log('[DEBUG - VIDEO-PLAYER] Original title:', originalTitle);
            console.log('[DEBUG - VIDEO-PLAYER] File path:', decodedPath);
            console.log('[DEBUG - VIDEO-PLAYER] ==========================================');
            
            const finalTitle = await this.ensureTitleHasYear(displayTitle, originalTitle, 'movie', decodedPath);
            
            console.log('[DEBUG - VIDEO-PLAYER] ==========================================');
            console.log('[DEBUG - VIDEO-PLAYER] Final movie title with FORCED year:', finalTitle);
            console.log('[DEBUG - VIDEO-PLAYER] Setting episodeInfoHeader.innerHTML to:', finalTitle);
            console.log('[DEBUG - VIDEO-PLAYER] ==========================================');
            
                this.episodeInfoHeader.innerHTML = finalTitle;
            
            // Double-check that the title was actually set
            if (this.episodeInfoHeader.innerHTML !== finalTitle) {
                console.error('[DEBUG - VIDEO-PLAYER] FAILED to set episodeInfoHeader.innerHTML!');
                console.error('[DEBUG - VIDEO-PLAYER] Expected:', finalTitle);
                console.error('[DEBUG - VIDEO-PLAYER] Actual:', this.episodeInfoHeader.innerHTML);
                
                // Force it again
                this.episodeInfoHeader.textContent = finalTitle;
                console.log('[DEBUG - VIDEO-PLAYER] Forced textContent to:', finalTitle);
            } else {
                console.log('[DEBUG - VIDEO-PLAYER] SUCCESS: episodeInfoHeader.innerHTML set correctly');
            }
            
            // Set up a periodic check to ensure the title stays visible
            if (this.titleCheckInterval) {
                clearInterval(this.titleCheckInterval);
            }
            
            this.titleCheckInterval = setInterval(() => {
                if (this.episodeInfoHeader && this.episodeInfoHeader.innerHTML !== finalTitle) {
                    console.log('[DEBUG - VIDEO-PLAYER] Title check: restoring title to:', finalTitle);
                    this.episodeInfoHeader.innerHTML = finalTitle;
                }
            }, 5000); // Check every 5 seconds
        }
    }
    
    // FORCE TITLE YEAR ENFORCEMENT - PERIODIC CHECK
    startTitleCheckInterval() {
        // Clear any existing interval
        if (this.titleCheckInterval) {
            clearInterval(this.titleCheckInterval);
        }
        
        // Check every 2 seconds to ensure year is always visible
        this.titleCheckInterval = setInterval(() => {
            if (this.episodeInfoHeader && this.currentMediaItem) {
                const currentTitle = this.episodeInfoHeader.innerHTML;
                const expectedTitle = this.currentMediaItem.TMDBTitle || this.currentMediaItem.title;
                
                // If title doesn't have year, force it
                if (expectedTitle && !currentTitle.includes('(') && !currentTitle.includes(')')) {
                    console.log('[DEBUG - VIDEO-PLAYER] FORCING year enforcement - title missing year:', currentTitle);
                    this.updateMovieInfoHeader();
                }
            }
        }, 2000);
        
        console.log('[DEBUG - VIDEO-PLAYER] Started periodic title check interval');
    }
    
    // Clean up title check interval
    clearTitleCheckInterval() {
        if (this.titleCheckInterval) {
            clearInterval(this.titleCheckInterval);
            this.titleCheckInterval = null;
            console.log('[DEBUG - VIDEO-PLAYER] Cleared title check interval');
        }
    }

    // MANDATORY function to ensure every title has a year
    async ensureTitleHasYear(cleanTitle, originalTitle, mediaType, filePath) {
        console.log('[DEBUG - VIDEO-PLAYER] Ensuring title has year:', cleanTitle, 'Type:', mediaType);
        console.log('[DEBUG - VIDEO-PLAYER] Original title:', originalTitle);
        console.log('[DEBUG - VIDEO-PLAYER] File path:', filePath);
        
        // Check if title already has a year in parentheses
        const yearMatch = cleanTitle.match(/\((\d{4})\)/);
        if (yearMatch) {
            console.log('[DEBUG - VIDEO-PLAYER] Title already has year:', yearMatch[1]);
            return cleanTitle;
        }
        
        // First, try to get year from current media item's JSON data
        let year = null;
        
        if (this.currentMediaItem && this.currentMediaItem.year) {
            year = this.currentMediaItem.year;
            console.log('[DEBUG - VIDEO-PLAYER] Found year in media item JSON:', year);
        } else if (this.currentMediaItem && this.currentMediaItem.data && this.currentMediaItem.data.year) {
            year = this.currentMediaItem.data.year;
            console.log('[DEBUG - VIDEO-PLAYER] Found year in media item data:', year);
        }
        
        // For TV shows, also check if we extracted a year from the episode info
        if (!year && mediaType === 'tv') {
            const episodeInfo = this.extractEpisodeInfo(filePath);
            if (episodeInfo && episodeInfo.showYear) {
                year = episodeInfo.showYear;
                console.log('[DEBUG - VIDEO-PLAYER] Found year in episode info:', year);
            }
        }
        
        // If year found in JSON, update the title immediately
        if (year) {
            const updatedTitle = cleanTitle.includes('()') ? 
                cleanTitle.replace('()', `(${year})`) : 
                `${cleanTitle} (${year})`;
            console.log('[DEBUG - VIDEO-PLAYER] Updated title with year from JSON:', updatedTitle);
            return updatedTitle;
        }
        
        // Second, try to get year from movie cast data (for movies)
        if (mediaType === 'movie' && filePath) {
            try {
                console.log('[DEBUG - VIDEO-PLAYER] Checking movie cast data for year...');
                
                // Load movie cast data if not already loaded
                if (!this.movieCastData) {
                    const response = await fetch('/components/MediaLibrary/data/movies/movie_cast_normalized.json?t=' + Date.now());
                    if (response.ok) {
                        this.movieCastData = await response.json();
                        console.log('[DEBUG - VIDEO-PLAYER] Loaded movie cast data with', Object.keys(this.movieCastData).length, 'entries');
                    } else {
                        console.warn('[DEBUG - VIDEO-PLAYER] Failed to load movie cast data');
                        this.movieCastData = {};
                    }
                }
                
                // Try to find the movie in cast data using the file path
                if (this.movieCastData && Object.keys(this.movieCastData).length > 0) {
                    // Try different possible keys for the movie
                    const possibleKeys = [
                        filePath,
                        filePath.replace(/\\/g, '/'),
                        filePath.replace(/\//g, '\\'),
                        originalTitle,
                        cleanTitle
                    ];
                    
                    console.log('[DEBUG - VIDEO-PLAYER] Searching for keys:', possibleKeys);
                    
                    for (const key of possibleKeys) {
                        if (this.movieCastData[key] && this.movieCastData[key].year) {
                            year = this.movieCastData[key].year;
                            console.log('[DEBUG - VIDEO-PLAYER] Found year in movie cast data:', year, 'for key:', key);
                            break;
                        }
                    }
                    
                    // If still not found, try searching by title
                    if (!year) {
                        console.log('[DEBUG - VIDEO-PLAYER] No exact key match, searching by title...');
                        const searchTitle = cleanTitle.toLowerCase();
                        for (const [key, data] of Object.entries(this.movieCastData)) {
                            if (data.title && data.title.toLowerCase().includes(searchTitle) && data.year) {
                                year = data.year;
                                console.log('[DEBUG - VIDEO-PLAYER] Found year in movie cast data by title search:', year, 'for:', data.title, 'key:', key);
                                break;
                            }
                        }
                    }
                    
                    // If still not found, try searching for the movie name in the cast data keys
                    if (!year) {
                        console.log('[DEBUG - VIDEO-PLAYER] Searching cast data keys for movie name...');
                        const movieName = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                        for (const [key, data] of Object.entries(this.movieCastData)) {
                            const keyName = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (keyName.includes(movieName) && data.year) {
                                year = data.year;
                                console.log('[DEBUG - VIDEO-PLAYER] Found year in cast data key search:', year, 'for key:', key);
                                break;
                            }
                        }
                    }
                }
                
                // If year found in cast data, update the title immediately
                if (year) {
                    const updatedTitle = cleanTitle.includes('()') ? 
                        cleanTitle.replace('()', `(${year})`) : 
                        `${cleanTitle} (${year})`;
                    console.log('[DEBUG - VIDEO-PLAYER] Updated title with year from cast data:', updatedTitle);
                    
                    // Save this year to the media item for future use
                    if (this.currentMediaItem) {
                        if (!this.currentMediaItem.data) this.currentMediaItem.data = {};
                        this.currentMediaItem.data.year = year;
                    }
                    
                    return updatedTitle;
                }
            } catch (error) {
                console.warn('[DEBUG - VIDEO-PLAYER] Error checking movie cast data:', error);
            }
        }
        
        // Third, try to get year from TV show cast data (for TV shows)
        if (mediaType === 'tv' && filePath) {
            try {
                console.log('[DEBUG - VIDEO-PLAYER] Checking TV show cast data...');
                
                // Load TV show cast data if not already loaded
                if (!this.tvShowCastData) {
                    const response = await fetch('/components/MediaLibrary/data/tv-shows/tv-show_cast_normalized.json?t=' + Date.now());
                    if (response.ok) {
                        this.tvShowCastData = await response.json();
                        console.log('[DEBUG - VIDEO-PLAYER] Loaded TV show cast data with', Object.keys(this.tvShowCastData).length, 'entries');
                    } else {
                        console.warn('[DEBUG - VIDEO-PLAYER] Failed to load TV show cast data');
                        this.tvShowCastData = {};
                    }
                }
                
                // Note: TV show cast data doesn't contain years, but we check it for completeness
                // The actual year will come from TMDB API call
                console.log('[DEBUG - VIDEO-PLAYER] TV show cast data loaded, proceeding to TMDB API call...');
            } catch (error) {
                console.warn('[DEBUG - VIDEO-PLAYER] Error checking TV show cast data:', error);
            }
        }
        
        // MANDATORY: If no year in JSON or cast data, MUST call TMDB API
        console.log('[DEBUG - VIDEO-PLAYER] No year in JSON or cast data, MANDATORY TMDB API call...');
        
        try {
            // Clean the title for TMDB search
            let searchTitle = originalTitle;
            if (mediaType === 'movie') {
                // Remove file extension and quality tags for movie search
                searchTitle = searchTitle.replace(/\.[^/.]+$/, ""); // Remove extension
                searchTitle = searchTitle.replace(/\[\d{3,4}p\]/gi, ""); // Remove quality tags
                searchTitle = searchTitle.replace(/[._-]+/g, " "); // Replace separators with spaces
                searchTitle = searchTitle.replace(/\s+/g, " ").trim(); // Clean up spaces
            } else if (mediaType === 'tv') {
                // For TV shows, extract the show name from the episode info
                const episodeInfo = this.extractEpisodeInfo(filePath);
                if (episodeInfo && episodeInfo.showName && episodeInfo.showName !== 'Unknown Show') {
                    searchTitle = episodeInfo.showName;
                    console.log('[DEBUG - VIDEO-PLAYER] Using extracted show name for TV search:', searchTitle);
                } else {
                    // Fallback: clean the original title
                    searchTitle = originalTitle.replace(/\.[^/.]+$/, ""); // Remove extension
                    searchTitle = searchTitle.replace(/\[\d{3,4}p\]/gi, ""); // Remove quality tags
                    searchTitle = searchTitle.replace(/[._-]+/g, " "); // Replace separators with spaces
                    searchTitle = searchTitle.replace(/\s+/g, " ").trim(); // Clean up spaces
                    console.log('[DEBUG - VIDEO-PLAYER] Using fallback cleaned title for TV search:', searchTitle);
                }
            }
            
            console.log('[DEBUG - VIDEO-PLAYER] Searching TMDB for:', searchTitle, 'Type:', mediaType);
            
            const response = await fetch('/api/media/fetch-tmdb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: mediaType,
                    title: searchTitle
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('[DEBUG - VIDEO-PLAYER] TMDB response:', result);
                
                if (result.success && result.results && result.results.length > 0) {
                    // Use the first (best) result
                    const bestMatch = result.results[0];
                    year = bestMatch.year || bestMatch.release_date?.split('-')[0] || bestMatch.first_air_date?.split('-')[0];
                    
                    if (year && year !== 'Unknown' && year !== '') {
                        const updatedTitle = cleanTitle.includes('()') ? 
                            cleanTitle.replace('()', `(${year})`) : 
                            `${cleanTitle} (${year})`;
                        console.log('[DEBUG - VIDEO-PLAYER] Updated title with year from TMDB:', updatedTitle);
                        
                        // Save this year to the media item for future use
                        if (this.currentMediaItem) {
                            if (!this.currentMediaItem.data) this.currentMediaItem.data = {};
                            this.currentMediaItem.data.year = year;
                        }
                        
                        return updatedTitle;
                    } else {
                        console.warn('[DEBUG - VIDEO-PLAYER] TMDB returned invalid year for:', searchTitle, 'year:', year);
                    }
                } else {
                    console.warn('[DEBUG - VIDEO-PLAYER] No TMDB results found for:', searchTitle);
                }
            } else {
                console.warn('[DEBUG - VIDEO-PLAYER] TMDB API call failed:', response.status, response.statusText);
            }
        } catch (error) {
            console.warn('[DEBUG - VIDEO-PLAYER] Error fetching year from TMDB:', error);
        }
        
        // If TMDB failed, try a more aggressive search
        console.log('[DEBUG - VIDEO-PLAYER] TMDB failed, trying alternative search...');
        try {
            // Try searching with just the clean title (without file extensions)
            let cleanSearchTitle;
            if (mediaType === 'tv') {
                // For TV shows, try different variations of the show name
                const episodeInfo = this.extractEpisodeInfo(filePath);
                if (episodeInfo && episodeInfo.showName && episodeInfo.showName !== 'Unknown Show') {
                    cleanSearchTitle = episodeInfo.showName.replace(/[._-]+/g, " ").trim();
                } else {
                    cleanSearchTitle = cleanTitle.replace(/[._-]+/g, " ").trim();
                }
            } else {
                cleanSearchTitle = cleanTitle.replace(/[._-]+/g, " ").trim();
            }
            
            console.log('[DEBUG - VIDEO-PLAYER] Alternative TMDB search for:', cleanSearchTitle, 'Type:', mediaType);
            
            const response = await fetch('/api/media/fetch-tmdb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: mediaType,
                    title: cleanSearchTitle
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('[DEBUG - VIDEO-PLAYER] Alternative TMDB response:', result);
                
                if (result.success && result.results && result.results.length > 0) {
                    const bestMatch = result.results[0];
                    year = bestMatch.year || bestMatch.release_date?.split('-')[0] || bestMatch.first_air_date?.split('-')[0];
                    
                    if (year && year !== 'Unknown' && year !== '') {
                        const updatedTitle = cleanTitle.includes('()') ? 
                            cleanTitle.replace('()', `(${year})`) : 
                            `${cleanTitle} (${year})`;
                        console.log('[DEBUG - VIDEO-PLAYER] Updated title with year from alternative TMDB search:', updatedTitle);
                        
                        // Save this year to the media item for future use
                        if (this.currentMediaItem) {
                            if (!this.currentMediaItem.data) this.currentMediaItem.data = {};
                            this.currentMediaItem.data.year = year;
                        }
                        
                        return updatedTitle;
                    }
                }
            }
        } catch (error) {
            console.warn('[DEBUG - VIDEO-PLAYER] Error in alternative TMDB search:', error);
        }
        
        // If we get here, TMDB completely failed - this should NOT happen
        console.error('[DEBUG - VIDEO-PLAYER] CRITICAL: TMDB failed to provide year for:', cleanTitle, 'Type:', mediaType);
        console.error('[DEBUG - VIDEO-PLAYER] This should not happen as TMDB has everything!');
        
        // FORCE A YEAR - NO EXCEPTIONS! Try to extract year from filename or use current year
        let forcedYear = null;
        
        // Try to extract year from the original filename
        if (filePath) {
            const filename = filePath.split(/[\/\\]/).pop() || '';
            const yearMatch = filename.match(/(\d{4})/);
            if (yearMatch) {
                forcedYear = yearMatch[1];
                console.log('[DEBUG - VIDEO-PLAYER] Extracted forced year from filename:', forcedYear);
            }
        }
        
        // If no year found in filename, use current year as absolute fallback
        if (!forcedYear) {
            forcedYear = new Date().getFullYear().toString();
            console.log('[DEBUG - VIDEO-PLAYER] Using current year as forced fallback:', forcedYear);
        }
        
        // ALWAYS return a title with a year - NO EXCEPTIONS!
        const forcedTitle = cleanTitle.includes('()') ? 
            cleanTitle.replace('()', `(${forcedYear})`) : 
            `${cleanTitle} (${forcedYear})`;
        
        console.log('[DEBUG - VIDEO-PLAYER] FORCED title with year:', forcedTitle);
        return forcedTitle;
    }

    togglePlay() {
        if (this.vjsPlayer) {
            // Use Video.js player
            console.log('🎬 [VIDEO-PLAYER] togglePlay called - current state:', this.vjsPlayer.paused() ? 'paused' : 'playing');
            
            if (this.vjsPlayer.paused()) {
                this.vjsPlayer.play();
                // this.playButton.innerHTML = '⏸️'; // Removed custom play button
                this.isPlaying = true;
                console.log('🎬 [VIDEO-PLAYER] Video started playing');
            } else {
                this.vjsPlayer.pause();
                // this.playButton.innerHTML = '▶️'; // Removed custom play button
                this.isPlaying = false;
                console.log('🎬 [VIDEO-PLAYER] Video paused');
            }
        } else if (this.video) {
            // Use native video element
            console.log('🎬 [VIDEO-PLAYER] togglePlay called (native) - current state:', this.video.paused ? 'paused' : 'playing');
            
            if (this.video.paused) {
                this.video.play();
                // this.playButton.innerHTML = '⏸️'; // Removed custom play button
                this.isPlaying = true;
                console.log('🎬 [VIDEO-PLAYER] Native video started playing');
            } else {
                this.video.pause();
                // this.playButton.innerHTML = '▶️'; // Removed custom play button
                this.isPlaying = false;
                console.log('🎬 [VIDEO-PLAYER] Native video paused');
            }
        } else {
            console.warn('🎬 [VIDEO-PLAYER] No video player available');
        }
    }

    seek(event) {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        
        if (this.vjsPlayer) {
            this.vjsPlayer.currentTime(percent * this.vjsPlayer.duration());
        } else if (this.video) {
            this.video.currentTime = percent * this.video.duration;
        }
    }

    setVolume(volume) {
        if (this.vjsPlayer) {
            this.vjsPlayer.volume(volume);
        } else if (this.video) {
            this.video.volume = volume;
        }
    }

    // Initialize Web Audio API for amplification
    initializeAudioContext() {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.gainNode = this.audioContext.createGain();
                this.gainNode.connect(this.audioContext.destination);
                console.log('[DEBUG - AMPLIFY] Audio context initialized');
            }
        } catch (error) {
            console.error('[DEBUG - AMPLIFY] Failed to initialize audio context:', error);
        }
    }

    // Connect video element to Web Audio API
    connectAudioAmplification() {
        if (!this.audioContext || !this.gainNode) return;
        
        try {
            const videoElement = this.vjsPlayer ? this.vjsPlayer.el().querySelector('video') : this.video;
            if (!videoElement) return;

            // Only create MediaElementSource once per video element
            if (!this.sourceCreated) {
            // Create new media element source
            this.sourceNode = this.audioContext.createMediaElementSource(videoElement);
                this.sourceCreated = true;
                console.log('[DEBUG - AMPLIFY] MediaElementSource created');
            }

            // Connect the audio chain: source -> gain -> destination
            if (this.sourceNode) {
                this.sourceNode.disconnect(); // Disconnect from any previous connections
            this.sourceNode.connect(this.gainNode);
                this.gainNode.connect(this.audioContext.destination);
            }
            
            // Set initial gain
            this.gainNode.gain.value = this.amplifyLevel;
            
            console.log('[DEBUG - AMPLIFY] Audio amplification connected, level:', this.amplifyLevel);
        } catch (error) {
            console.error('[DEBUG - AMPLIFY] Failed to connect audio amplification:', error);
            // If we can't connect amplification, disable it
            this.amplifyEnabled = false;
            this.updateAmplifyButton();
        }
    }

    // Toggle amplification on/off
    toggleAmplification() {
        if (!this.amplifyEnabled) {
            // Ensure audio context is ready
            this.ensureAudioContextReady();
            
            if (this.audioContext && this.audioContext.state === 'running') {
                this.connectAudioAmplification();
                this.amplifyEnabled = true;
                this.updateAmplifyButton();
                
                // Track amplification usage
                this.trackAmplificationUsage();
                
                console.log('[DEBUG - AMPLIFY] Amplification enabled');
            } else {
                console.warn('[DEBUG - AMPLIFY] Cannot enable amplification - audio context not ready');
            }
        } else {
            this.amplifyEnabled = false;
            // Don't destroy the source node, just disconnect the gain
            if (this.sourceNode && this.gainNode) {
                this.sourceNode.disconnect();
                // Connect directly to destination (bypass gain)
                this.sourceNode.connect(this.audioContext.destination);
            }
            // Reset gain to normal when disabling
            if (this.gainNode) {
                this.gainNode.gain.value = 1.0;
            }
            this.updateAmplifyButton();
            console.log('[DEBUG - AMPLIFY] Amplification disabled');
        }
    }

    // Set amplification level (1.0 = 100%, 2.0 = 200%, etc.)
    setAmplificationLevel(level) {
        this.amplifyLevel = Math.max(0.1, Math.min(this.maxAmplifyLevel, level));
        
        // Always update the UI elements regardless of audio context state
        if (this.amplifySlider) {
            this.amplifySlider.value = (this.amplifyLevel * 100).toFixed(0);
        }
        
        if (this.amplifyLevelDisplay) {
            const percentage = (this.amplifyLevel * 100).toFixed(0);
            this.amplifyLevelDisplay.textContent = `${percentage}%`;
            
            // Color coding: green (100-150%), yellow (150-200%), red (200%+)
            if (this.amplifyLevel <= 1.5) {
                this.amplifyLevelDisplay.style.color = '#4CAF50'; // Green
            } else if (this.amplifyLevel <= 2.0) {
                this.amplifyLevelDisplay.style.color = '#FF9800'; // Orange
            } else {
                this.amplifyLevelDisplay.style.color = '#F44336'; // Red
            }
        }
        
        // Only update audio if amplification is enabled and audio context is ready
        if (this.gainNode && this.amplifyEnabled && this.audioContext && this.audioContext.state === 'running') {
            this.gainNode.gain.value = this.amplifyLevel;
            console.log('[DEBUG - AMPLIFY] Audio gain updated to:', this.amplifyLevel);
        } else {
            console.log('[DEBUG - AMPLIFY] Amplification level set to:', this.amplifyLevel, 'but audio not ready (enabled:', this.amplifyEnabled, ', context state:', this.audioContext?.state);
        }
    }

    // Update amplify button appearance
    updateAmplifyButton() {
        if (this.amplifyButton) {
            if (this.amplifyEnabled) {
                this.amplifyButton.classList.add('active');
                this.amplifyButton.innerHTML = '🔊 AMPLIFY';
                this.amplifyButton.title = 'Audio Amplification: ON (Click to disable)';
            } else {
                this.amplifyButton.classList.remove('active');
                this.amplifyButton.innerHTML = '🔊 AMPLIFY';
                this.amplifyButton.title = 'Audio Amplification: OFF (Click to enable)';
            }
        }
        
        // Show/hide amplify slider container based on enabled state or fullscreen mode
        if (this.amplifySliderContainer) {
            if (this.amplifyEnabled || this.isFullscreen) {
                this.amplifySliderContainer.style.display = 'flex';
                // CSS will handle opacity based on hover state
            } else {
                this.amplifySliderContainer.style.display = 'none';
            }
        }

        // Update LED indicator based on amplify state
        if (this.amplifyLedIndicator) {
            if (this.amplifyEnabled) {
                this.amplifyLedIndicator.classList.add('active');
                this.amplifyLedIndicator.title = 'AMPLIFY: ON';
            } else {
                this.amplifyLedIndicator.classList.remove('active');
                this.amplifyLedIndicator.title = 'AMPLIFY: OFF';
            }
        }
    }

    // Reset amplification system completely for new videos
    resetAmplification() {
        console.log('[DEBUG - AMPLIFY] Resetting amplification system for new video');
        
        // Reset state variables
        this.amplifyEnabled = false;
        this.amplifyLevel = 1.0;
        this.sourceCreated = false;
        
        // Clean up audio connections but DON'T close the audio context
        if (this.sourceNode) {
            try {
                this.sourceNode.disconnect();
                console.log('[DEBUG - AMPLIFY] Disconnected source node');
            } catch (error) {
                console.warn('[DEBUG - AMPLIFY] Error disconnecting source node:', error);
            }
            this.sourceNode = null;
        }
        
        // Reset gain node but keep it alive
        if (this.gainNode) {
            try {
                this.gainNode.gain.value = 1.0;
                console.log('[DEBUG - AMPLIFY] Reset gain node to 1.0');
            } catch (error) {
                console.warn('[DEBUG - AMPLIFY] Error resetting gain node:', error);
            }
        }
        
        // DON'T close audio context - just reset the source
        // This prevents the slider from breaking on subsequent videos
        
        // Force reset UI state with immediate updates
        this.forceResetAmplificationUI();
        
        // Update button and LED appearance
        this.updateAmplifyButton();
        
        // Ensure slider is responsive by reattaching event handlers if needed
        this.ensureSliderResponsiveness();
        
        console.log('[DEBUG - AMPLIFY] Amplification system reset complete');
    }

    // Ensure audio context is ready for new video
    ensureAudioContextReady() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            console.log('[DEBUG - AMPLIFY] Reinitializing audio context for new video');
            this.initializeAudioContext();
        } else if (this.audioContext.state === 'suspended') {
            console.log('[DEBUG - AMPLIFY] Resuming suspended audio context');
            this.audioContext.resume();
        }
    }

    // Ensure slider is responsive by reattaching event handlers if needed
    ensureSliderResponsiveness() {
        if (!this.amplifySlider) return;
        
        console.log('[DEBUG - AMPLIFY] Ensuring slider responsiveness');
        
        // Remove existing event handlers to prevent duplicates
        this.amplifySlider.oninput = null;
        this.amplifySlider.onchange = null;
        this.amplifySlider.onmousedown = null;
        this.amplifySlider.onmouseup = null;
        this.amplifySlider.onclick = null;
        
        // Reattach event handlers
        this.amplifySlider.oninput = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.setAmplificationLevel(e.target.value / 100);
        };
        
        this.amplifySlider.onchange = (e) => {
            e.stopPropagation();
            this.setAmplificationLevel(e.target.value / 100);
        };
        
        this.amplifySlider.onmousedown = (e) => e.stopPropagation();
        this.amplifySlider.onmouseup = (e) => e.stopPropagation();
        this.amplifySlider.onclick = (e) => e.stopPropagation();
        
        console.log('[DEBUG - AMPLIFY] Slider event handlers reattached');
    }

    // Track amplification usage for dashboard statistics
    trackAmplificationUsage() {
        try {
            // Get existing stats or create new ones
            const amplifyStats = JSON.parse(localStorage.getItem('amplifyStats')) || {
                usageCount: 0,
                avgLevel: 100,
                maxLevel: 100,
                totalLevel: 0,
                usageHistory: []
            };
            
            // Increment usage count
            amplifyStats.usageCount++;
            
            // Add current level to history
            amplifyStats.usageHistory.push({
                level: this.amplifyLevel,
                timestamp: Date.now()
            });
            
            // Keep only last 100 entries
            if (amplifyStats.usageHistory.length > 100) {
                amplifyStats.usageHistory = amplifyStats.usageHistory.slice(-100);
            }
            
            // Calculate new average
            const totalLevel = amplifyStats.usageHistory.reduce((sum, entry) => sum + entry.level, 0);
            amplifyStats.avgLevel = Math.round((totalLevel / amplifyStats.usageHistory.length) * 100);
            
            // Update max level if current is higher
            if (this.amplifyLevel > amplifyStats.maxLevel / 100) {
                amplifyStats.maxLevel = Math.round(this.amplifyLevel * 100);
            }
            
            // Save updated stats
            localStorage.setItem('amplifyStats', JSON.stringify(amplifyStats));
            
            console.log('[DEBUG - AMPLIFY] Usage tracked:', {
                usageCount: amplifyStats.usageCount,
                avgLevel: amplifyStats.avgLevel,
                maxLevel: amplifyStats.maxLevel
            });
            
            } catch (error) {
            console.warn('[DEBUG - AMPLIFY] Error tracking usage:', error);
        }
    }

    // Get amplification statistics for dashboard
    getAmplificationStats() {
        try {
            const amplifyStats = localStorage.getItem('amplifyStats');
            if (amplifyStats) {
                const stats = JSON.parse(amplifyStats);
                return {
                    usageCount: stats.usageCount || 0,
                    avgLevel: stats.avgLevel || 100,
                    maxLevel: stats.maxLevel || 100,
                    currentLevel: Math.round(this.amplifyLevel * 100),
                    isEnabled: this.amplifyEnabled
                };
            }
        } catch (error) {
            console.warn('[DEBUG - AMPLIFY] Error getting amplification stats:', error);
        }
        
        // Return null if no data available - let the dashboard handle this
        return null;
    }

    // Force reset amplification UI elements
    forceResetAmplificationUI() {
        console.log('[DEBUG - AMPLIFY] Force resetting amplification UI');
        
        // Reset slider container display
        if (this.amplifySliderContainer) {
            this.amplifySliderContainer.style.display = 'none';
            console.log('[DEBUG - AMPLIFY] Slider container hidden');
        }
        
        // Reset slider value
        if (this.amplifySlider) {
            this.amplifySlider.value = '100';
            console.log('[DEBUG - AMPLIFY] Slider value reset to 100');
        }
        
        // Reset level display
        if (this.amplifyLevelDisplay) {
            this.amplifyLevelDisplay.textContent = '100%';
            this.amplifyLevelDisplay.style.color = '#4CAF50'; // Reset to green
            console.log('[DEBUG - AMPLIFY] Level display reset to 100%');
        }
        
        // Force a DOM update by triggering a small delay
        setTimeout(() => {
            if (this.amplifySlider) {
                this.amplifySlider.value = '100';
                console.log('[DEBUG - AMPLIFY] Delayed slider reset to 100');
            }
            if (this.amplifyLevelDisplay) {
                this.amplifyLevelDisplay.textContent = '100%';
                console.log('[DEBUG - AMPLIFY] Delayed level display reset to 100%');
            }
        }, 50);
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.container.requestFullscreen();
            this.isFullscreen = true;
        } else {
            document.exitFullscreen();
            this.isFullscreen = false;
        }
    }

    handleFullscreenChange() {
        // Check if we're currently in fullscreen
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        this.isFullscreen = isCurrentlyFullscreen;

        if (isCurrentlyFullscreen) {
            // Entering fullscreen
            console.log('[DEBUG - VIDEO-PLAYER] Entered fullscreen mode');
            
            // Force show AMPLIFY controls in fullscreen
            if (this.amplifySliderContainer) {
                this.amplifySliderContainer.style.display = 'flex';
                this.amplifySliderContainer.style.opacity = '1';
                this.amplifySliderContainer.style.pointerEvents = 'auto';
                this.amplifySliderContainer.style.position = 'fixed';
                this.amplifySliderContainer.style.bottom = '120px';
                this.amplifySliderContainer.style.left = '50px';
                this.amplifySliderContainer.style.zIndex = '10000000020';
                this.amplifySliderContainer.style.background = 'rgba(255, 0, 0, 0.9)'; // Bright red for testing
                this.amplifySliderContainer.style.border = '3px solid yellow'; // Yellow border
                this.amplifySliderContainer.style.padding = '15px';
                console.log('[DEBUG - AMPLIFY] Forced AMPLIFY controls visible in fullscreen');
                console.log('[DEBUG - AMPLIFY] AMPLIFY controls element:', this.amplifySliderContainer);
                console.log('[DEBUG - AMPLIFY] AMPLIFY controls computed style:', window.getComputedStyle(this.amplifySliderContainer));
            } else {
                console.log('[DEBUG - AMPLIFY] ERROR: amplifySliderContainer is null/undefined!');
            }
            
            // Force show close button in fullscreen
            const closeButton = this.container.querySelector('.video-player-close-btn');
            if (closeButton) {
                closeButton.style.display = 'flex';
                closeButton.style.opacity = '1';
                closeButton.style.pointerEvents = 'auto';
                closeButton.style.position = 'fixed';
                closeButton.style.top = '20px';
                closeButton.style.right = '20px';
                closeButton.style.zIndex = '10000000025';
                closeButton.style.background = 'rgba(255, 0, 0, 0.9)'; // Bright red
                closeButton.style.border = '3px solid yellow'; // Yellow border
                console.log('[DEBUG - CLOSE] Forced close button visible in fullscreen');
                console.log('[DEBUG - CLOSE] Close button element:', closeButton);
                console.log('[DEBUG - CLOSE] Close button computed style:', window.getComputedStyle(closeButton));
            } else {
                console.log('[DEBUG - CLOSE] ERROR: Close button not found!');
            }
            
            // Ensure subtitles remain visible in fullscreen
            if (this.vjsPlayer) {
                // Force subtitle display to be visible
                const textTrackDisplay = this.container.querySelector('.vjs-text-track-display');
                if (textTrackDisplay) {
                    textTrackDisplay.style.display = 'block';
                    textTrackDisplay.style.zIndex = '10000000025';
                    textTrackDisplay.style.position = 'fixed';
                    textTrackDisplay.style.bottom = '80px';
                    textTrackDisplay.style.left = '50%';
                    textTrackDisplay.style.transform = 'translateX(-50%)';
                    textTrackDisplay.style.width = '80%';
                    console.log('[DEBUG - SUBTITLES] Forced subtitles visible in fullscreen');
                }
            }
            
        } else {
            // Exiting fullscreen
            console.log('[DEBUG - VIDEO-PLAYER] Exited fullscreen mode');
            
            // Reset AMPLIFY controls to normal behavior
            if (this.amplifySliderContainer) {
                this.amplifySliderContainer.style.position = '';
                this.amplifySliderContainer.style.bottom = '';
                this.amplifySliderContainer.style.left = '';
                this.amplifySliderContainer.style.zIndex = '';
                console.log('[DEBUG - AMPLIFY] Reset AMPLIFY controls to normal');
            }
            
            // Reset close button to normal behavior
            const closeButton = this.container.querySelector('.video-player-close-btn');
            if (closeButton) {
                closeButton.style.display = '';
                closeButton.style.opacity = '';
                closeButton.style.pointerEvents = '';
                console.log('[DEBUG - CLOSE] Reset close button to normal');
            }
            
            // Reset subtitles to normal behavior
            const textTrackDisplay = this.container.querySelector('.vjs-text-track-display');
            if (textTrackDisplay) {
                textTrackDisplay.style.position = '';
                textTrackDisplay.style.bottom = '';
                textTrackDisplay.style.left = '';
                textTrackDisplay.style.transform = '';
                textTrackDisplay.style.width = '';
                textTrackDisplay.style.zIndex = '';
                console.log('[DEBUG - SUBTITLES] Reset subtitles to normal');
            }
        }

        // Update amplify controls visibility for fullscreen mode
        this.updateAmplifyButton();
    }

    updateProgress() {
        let currentTime = 0, duration = 0;
        
        if (this.vjsPlayer && this.vjsPlayer.duration()) {
            currentTime = this.vjsPlayer.currentTime();
            duration = this.vjsPlayer.duration();
        } else if (this.video && this.video.duration) {
            currentTime = this.video.currentTime;
            duration = this.video.duration;
        } else {
            return;
        }
        
        const percent = (currentTime / duration) * 100;
        // this.progressFill.style.width = percent + '%'; // Removed custom progress bar
        this.updateTimeDisplay();
    }

    updateTimeDisplay() {
        let currentTime = 0, duration = 0;
        
        if (this.vjsPlayer) {
            currentTime = this.vjsPlayer.currentTime();
            duration = this.vjsPlayer.duration();
        } else if (this.video) {
            currentTime = this.video.currentTime;
            duration = this.video.duration;
        } else {
            return;
        }
        
        const current = this.formatTime(currentTime);
        const total = this.formatTime(duration);
        
        // Update Video.js time display components
        if (this.vjsPlayer) {
            const currentTimeDisplay = this.vjsPlayer.controlBar.getChild('currentTimeDisplay');
            const durationDisplay = this.vjsPlayer.controlBar.getChild('durationDisplay');
            
            if (currentTimeDisplay && currentTimeDisplay.el_) {
                currentTimeDisplay.el_.querySelector('.vjs-current-time-display').textContent = current;
            }
            if (durationDisplay && durationDisplay.el_) {
                durationDisplay.el_.querySelector('.vjs-duration-display').textContent = total;
            }
        }
        
        // Update custom time display if it exists
        if (this.customTimeDisplay) {
            this.customTimeDisplay.innerHTML = `${current} / ${total}`;
        }
    }

    applyCustomIconClasses() {
        if (!this.vjsPlayer) return;
        
        // Apply custom class to volume icon
        const volumePanel = this.vjsPlayer.controlBar.getChild('volumePanel');
        if (volumePanel && volumePanel.el_) {
            const volumeIcon = volumePanel.el_.querySelector('.vjs-icon-placeholder');
            if (volumeIcon) {
                volumeIcon.classList.add('volume-icon');
                console.log('[VIDEO-PLAYER] Volume icon class applied: volume-icon');
            }
        }
        
        // Apply custom class to fullscreen icon
        const fullscreenControl = this.vjsPlayer.controlBar.getChild('fullscreenToggle');
        if (fullscreenControl && fullscreenControl.el_) {
            const fullscreenIcon = fullscreenControl.el_.querySelector('.vjs-icon-placeholder');
            if (fullscreenIcon) {
                fullscreenIcon.classList.add('fullscreen-icon');
                console.log('[VIDEO-PLAYER] Fullscreen icon class applied: fullscreen-icon');
            }
        }
    }

    createCustomTimeDisplay() {
        if (!this.vjsPlayer) return;
        
        // Create custom time display element
        this.customTimeDisplay = document.createElement('div');
        this.customTimeDisplay.className = 'vjs-custom-time-display';
        this.customTimeDisplay.style.cssText = `
            color: #fff;
            font-size: 1.2em;
            font-weight: bold;
            margin-right: 10px;
            padding: 0 5px;
            display: flex;
            align-items: center;
            height: 100%;
        `;
        
        // Insert it before the currentTimeDisplay in the control bar
        const currentTimeDisplay = this.vjsPlayer.controlBar.getChild('currentTimeDisplay');
        if (currentTimeDisplay && currentTimeDisplay.el_) {
            const controlBar = this.vjsPlayer.controlBar.el();
            const currentTimeElement = currentTimeDisplay.el_;
            
            // Insert before the currentTimeDisplay
            controlBar.insertBefore(this.customTimeDisplay, currentTimeElement);
            
            // Set initial time display
            this.updateTimeDisplay();
            
            console.log('[VIDEO-PLAYER] Custom time display created and positioned');
        }
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showControls() {
        // this.controls.style.opacity = '1'; // Removed custom controls
        clearTimeout(this.controlsTimer);
        this.controlsTimer = setTimeout(() => this.hideControls(), 3000);
    }

    hideControls() {
        // this.controls.style.opacity = '0'; // Removed custom controls
    }

    onVideoEnd() {
        // this.playButton.innerHTML = '▶️'; // Removed custom play button
        this.isPlaying = false;
    }

    handleKeyboard(event) {
        if (!this.isVisible) return;

        switch(event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                if (this.vjsPlayer) {
                    this.vjsPlayer.currentTime(this.vjsPlayer.currentTime() - 10);
                } else if (this.video) {
                    this.video.currentTime = Math.max(0, this.video.currentTime - 10);
                }
                break;
            case 'ArrowRight':
                event.preventDefault();
                if (this.vjsPlayer) {
                    this.vjsPlayer.currentTime(this.vjsPlayer.currentTime() + 10);
                } else if (this.video) {
                    this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 10);
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (this.vjsPlayer) {
                    this.vjsPlayer.volume(Math.min(1, this.vjsPlayer.volume() + 0.1));
                    // this.volumeSlider.value = this.vjsPlayer.volume() * 100; // Removed custom volume slider
                } else if (this.video) {
                    this.video.volume = Math.min(1, this.video.volume + 0.1);
                    // this.volumeSlider.value = this.video.volume * 100; // Removed custom volume slider
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (this.vjsPlayer) {
                    this.vjsPlayer.volume(Math.max(0, this.vjsPlayer.volume() - 0.1));
                    // this.volumeSlider.value = this.vjsPlayer.volume() * 100; // Removed custom volume slider
                } else if (this.video) {
                    this.video.volume = Math.max(0, this.video.volume - 0.1);
                    // this.volumeSlider.value = this.video.volume * 100; // Removed custom volume slider
                }
                break;
            case 'KeyF':
                event.preventDefault();
                this.toggleFullscreen();
                break;
            case 'KeyA':
                event.preventDefault();
                this.toggleAmplification();
                break;
            case 'Equal': // + key
                if (this.amplifyEnabled) {
                    event.preventDefault();
                    this.setAmplificationLevel(this.amplifyLevel + 0.1);
                }
                break;
            case 'Minus': // - key
                if (this.amplifyEnabled) {
                    event.preventDefault();
                    this.setAmplificationLevel(this.amplifyLevel - 0.1);
                }
                break;
            case 'Escape':
                if (this.isFullscreen) {
                    this.toggleFullscreen();
                } else {
                    this.hide();
                }
                break;
        }
    }

    showMessage(message) {
        // Create temporary message
        const msg = document.createElement('div');
        msg.innerHTML = message;
        msg.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            z-index: 10002;
            pointer-events: none;
        `;
        
        this.container.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
    }

    show() {
        this.container.style.display = 'flex';
        this.isVisible = true;
        console.log('🎬 [VIDEO-PLAYER] Video player shown');
    }

    hide() {
        // Set cleanup flag to prevent auto-saving during video player closure
        this.isCleaningUp = true;
        
        // Reset audio amplification
        this.sourceCreated = false;
        this.sourceNode = null;
        this.amplifyEnabled = false;
        
        // Update LED indicator to reflect disabled state
        this.updateAmplifyButton();
        
        // Clear title check interval
        this.clearTitleCheckInterval();
        
        // Always pause and reset the native video element
        if (this.video) {
            console.log('[VIDEO-PLAYER DEBUG] Pausing and resetting video element:', this.video);
            this.video.pause();
            this.video.currentTime = 0;
            this.video.src = ""; // Optional: unload the video
        }

        this.container.style.display = 'none';
        this.isVisible = false;
        
        // Safely handle Video.js player cleanup
        if (this.vjsPlayer && typeof this.vjsPlayer.src === 'function') {
            try {
                const currentSrc = this.vjsPlayer.src();
                if (currentSrc && currentSrc.src) {
                    this.vjsPlayer.pause();
                    URL.revokeObjectURL(currentSrc.src);
                    this.vjsPlayer.src('');
                }
            } catch (error) {
                console.warn('🎬 [VIDEO-PLAYER] Error during cleanup:', error);
            }
        }
        
        // Reset cleanup flag after a short delay
        setTimeout(() => {
            this.isCleaningUp = false;
        }, 100);
        
        // Restore return location if set
        console.log('[VIDEO-PLAYER] Hide method - returnLocation:', this.returnLocation);
        console.log('[VIDEO-PLAYER] Hide method - mediaLibraryManager available:', !!window.mediaLibraryManager);
        if (this.returnLocation && window.mediaLibraryManager) {
            console.log('[VIDEO-PLAYER] Restoring return location:', this.returnLocation);
            this.restoreReturnLocation();
        } else {
            console.log('[VIDEO-PLAYER] Not restoring - missing returnLocation or mediaLibraryManager');
        }
        
        console.log('🎬 [VIDEO-PLAYER] Video player hidden');
    }

    // Public method to open video player from external code
    openVideoPlayer() {
        this.show();
        this.openFileBrowser();
    }

    // Public method to toggle video player visibility
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    // Set the return location when opening from a specific source
    setReturnLocation(location) {
        console.log('[VIDEO-PLAYER] Setting return location to:', location);
        this.returnLocation = location;
        console.log('[VIDEO-PLAYER] Return location set to:', this.returnLocation);
        console.log('[VIDEO-PLAYER] Return location type:', this.returnLocation ? this.returnLocation.type : 'null');
    }
    
    // Restore the return location when closing the video player
    restoreReturnLocation() {
        if (!this.returnLocation || !window.mediaLibraryManager) {
            console.log('[VIDEO-PLAYER] No return location or mediaLibraryManager not available');
            return;
        }
        
        console.log('[VIDEO-PLAYER] Restoring to location:', this.returnLocation);
        
        switch (this.returnLocation.type) {
            case 'media-library':
                console.log('[VIDEO-PLAYER] Restoring to media-library with tab:', this.returnLocation.tab);
                // Return to Media Library with specific tab
                if (this.returnLocation.tab) {
                    window.mediaLibraryManager.switchTab(this.returnLocation.tab);
                }
                window.mediaLibraryManager.renderModal();
                break;
                
            case 'watch-later':
                console.log('[VIDEO-PLAYER] Restoring to watch-later');
                console.log('[VIDEO-PLAYER] Before switchTab - currentTab:', window.mediaLibraryManager.currentTab);
                // Return to Watch Later tab
                window.mediaLibraryManager.switchTab('watchlater');
                console.log('[VIDEO-PLAYER] After switchTab - currentTab:', window.mediaLibraryManager.currentTab);
                window.mediaLibraryManager.renderModal();
                console.log('[VIDEO-PLAYER] After renderModal - currentTab:', window.mediaLibraryManager.currentTab);
                break;
                
            case 'tv-show-episodes':
                console.log('[VIDEO-PLAYER] Restoring to tv-show-episodes:', this.returnLocation.showPath, this.returnLocation.seasonPath);
                // Return to specific TV show episodes view
                if (this.returnLocation.showPath && this.returnLocation.seasonPath) {
                    console.log('[VIDEO-PLAYER] Setting currentTVShow to:', this.returnLocation.showPath);
                    console.log('[VIDEO-PLAYER] Setting currentTVSeason to:', this.returnLocation.seasonPath);
                    window.mediaLibraryManager.currentTVShow = this.returnLocation.showPath;
                    window.mediaLibraryManager.currentTVSeason = this.returnLocation.seasonPath;
                    console.log('[VIDEO-PLAYER] Calling switchTab(tvshows)');
                    window.mediaLibraryManager.switchTab('tvshows');
                    console.log('[VIDEO-PLAYER] Calling renderModal()');
                    window.mediaLibraryManager.renderModal();
                    // Re-render episodes view
                    setTimeout(() => {
                        console.log('[VIDEO-PLAYER] Calling renderEpisodesView()');
                        window.mediaLibraryManager.renderEpisodesView();
                    }, 100);
                } else {
                    console.log('[VIDEO-PLAYER] Missing showPath or seasonPath:', this.returnLocation);
                }
                break;
                
            case 'movies':
                console.log('[VIDEO-PLAYER] Restoring to movies');
                // Return to Movies tab
                window.mediaLibraryManager.switchTab('movies');
                window.mediaLibraryManager.renderModal();
                break;
                
            case 'favorites':
                console.log('[VIDEO-PLAYER] Restoring to favorites');
                // Return to Favorites tab
                window.mediaLibraryManager.switchTab('favorites');
                window.mediaLibraryManager.renderModal();
                break;
                
            default:
                console.log('[VIDEO-PLAYER] Restoring to default media-library');
                // Default: return to Media Library
                window.mediaLibraryManager.renderModal();
                break;
        }
        
        // Clear the return location after restoring
        this.returnLocation = null;
    }

    async fetchMediaLibrary() {
        if (this.mediaLibrary) return this.mediaLibrary;
        try {
            // Use the new data structure from MediaLibraryManager
            if (window.mediaLibraryManager) {
                // Combine movies and TV shows data for backward compatibility
                const moviesData = window.mediaLibraryManager.moviesData || [];
                const tvShowsData = window.mediaLibraryManager.tvShowsData || [];
                
                // Create a combined structure that matches the old format
                this.mediaLibrary = {
                    folders: [
                        {
                            name: 'MOVIES',
                            path: 'MOVIES',
                            folders: moviesData
                        },
                        {
                            name: 'TV-SHOWS',
                            path: 'TV-SHOWS',
                            folders: tvShowsData
                        }
                    ]
                };
                
                console.log('[VideoPlayer] Using MediaLibraryManager data structure');
                return this.mediaLibrary;
            } else {
                // Fallback to old API if MediaLibraryManager is not available
                const response = await fetch('/api/media-library');
                const result = await response.json();
                if (result.success) {
                    this.mediaLibrary = result.library;
                    return this.mediaLibrary;
                } else {
                    throw new Error(result.error || 'Failed to fetch media library');
                }
            }
        } catch (err) {
            console.error('[VideoPlayer] Failed to fetch media library:', err);
            this.mediaLibrary = null;
            return null;
        }
    }

    // Find the current episode and next episode in the library
    findCurrentAndNextEpisode(currentFilePath) {
        console.log('[DEBUG - VIDEO-PLAYER] findCurrentAndNextEpisode called with:', currentFilePath);
        
        if (!this.mediaLibrary) {
            console.log('[DEBUG - VIDEO-PLAYER] No media library available');
            return { current: null, next: null };
        }

        // Extract episode info from current file
        const currentEpisodeInfo = this.extractEpisodeInfo(currentFilePath);
        console.log('[DEBUG - VIDEO-PLAYER] Current episode info:', currentEpisodeInfo);

        if (!currentEpisodeInfo || !currentEpisodeInfo.showName) {
            console.log('[DEBUG - VIDEO-PLAYER] Could not extract episode info');
            console.log('[DEBUG - VIDEO-PLAYER] currentEpisodeInfo:', currentEpisodeInfo);
            console.log('[DEBUG - VIDEO-PLAYER] showName:', currentEpisodeInfo?.showName);
            return { current: null, next: null };
        }

        // Find all episodes for this show
        const showEpisodes = this.findAllEpisodesForShow(currentEpisodeInfo.showName);
        console.log('[DEBUG - VIDEO-PLAYER] Found episodes for show:', showEpisodes.length);

        if (showEpisodes.length === 0) {
            console.log('[DEBUG - VIDEO-PLAYER] No episodes found for show, trying alternative search...');
            
            // Try alternative search - look for any episodes in the media library
            const allEpisodes = [];
            const searchAllEpisodes = (node) => {
            if (node.files && node.files.length > 0) {
                    allEpisodes.push(...node.files);
                }
                if (node.folders && node.folders.length > 0) {
                    for (const folder of node.folders) {
                        searchAllEpisodes(folder);
                    }
                }
            };
            searchAllEpisodes(this.mediaLibrary);
            console.log('[DEBUG - VIDEO-PLAYER] Total episodes in media library:', allEpisodes.length);
            console.log('[DEBUG - VIDEO-PLAYER] First 10 episodes:', allEpisodes.slice(0, 10).map(ep => ep.name));
            
            // Try to find episodes that might be from the same show by looking at the current file path
            const currentPath = currentFilePath.toLowerCase();
            const potentialEpisodes = allEpisodes.filter(ep => {
                const epPath = (ep.absPath || ep.relPath || ep.path || '').toLowerCase();
                // Look for episodes in similar paths (same show folder)
                return epPath.includes('tv-shows') || epPath.includes('tv_shows') || epPath.includes('tv shows');
            });
            console.log('[DEBUG - VIDEO-PLAYER] Potential episodes found:', potentialEpisodes.length);
            console.log('[DEBUG - VIDEO-PLAYER] Potential episode names:', potentialEpisodes.map(ep => ep.name));
            
            if (potentialEpisodes.length > 0) {
                // Use the first potential episode as next (simple fallback)
                const nextEpisode = potentialEpisodes[0];
                console.log('[DEBUG - VIDEO-PLAYER] Using fallback next episode:', nextEpisode.name);
                return { current: null, next: nextEpisode };
            }
            
            return { current: null, next: null };
        }

        // Find current episode in the list
        const currentEpisode = showEpisodes.find(ep => {
            const epPath = ep.absPath || ep.relPath || ep.path || '';
            return epPath === currentFilePath || epPath.includes(currentEpisodeInfo.filename);
        });

        if (!currentEpisode) {
            console.log('[DEBUG - VIDEO-PLAYER] Current episode not found in show episodes');
            return { current: null, next: null };
        }

        // Find next episode based on season/episode numbers
        const nextEpisode = this.findNextEpisodeBySeasonEpisode(showEpisodes, currentEpisodeInfo);
        console.log('[DEBUG - VIDEO-PLAYER] Next episode found:', nextEpisode ? nextEpisode.name : 'None');

        return { current: currentEpisode, next: nextEpisode };
    }

    findAllEpisodesForShow(showName) {
        console.log('[DEBUG - EPISODE-MATCH] findAllEpisodesForShow called with showName:', showName);
        console.log('[DEBUG - EPISODE-MATCH] Media library type:', typeof this.mediaLibrary);
        console.log('[DEBUG - EPISODE-MATCH] Media library is array:', Array.isArray(this.mediaLibrary));
        console.log('[DEBUG - EPISODE-MATCH] Media library length:', this.mediaLibrary ? this.mediaLibrary.length : 'null');
        
        if (this.mediaLibrary && this.mediaLibrary.length > 0) {
            console.log('[DEBUG - EPISODE-MATCH] First media library item:', this.mediaLibrary[0]);
            console.log('[DEBUG - EPISODE-MATCH] First item keys:', this.mediaLibrary[0] ? Object.keys(this.mediaLibrary[0]) : 'null');
        }
        
        const episodes = [];
        
        const searchInNode = (node) => {
            console.log('[DEBUG - EPISODE-MATCH] Searching in node:', node.name);
            console.log('[DEBUG - EPISODE-MATCH] Node type:', typeof node);
            console.log('[DEBUG - EPISODE-MATCH] Node keys:', Object.keys(node));
            
            // Only search in TV-SHOWS directories
            if (node.name && node.name.toLowerCase().includes('tv-shows') || node.name && node.name.toLowerCase().includes('tv_shows')) {
                console.log('[DEBUG - EPISODE-MATCH] Found TV-SHOWS directory:', node.name);
                
                // Search in subfolders (TV show directories) - this is where the actual episodes are
                if (node.folders && node.folders.length > 0) {
                    console.log('[DEBUG - EPISODE-MATCH] Found', node.folders.length, 'folders in TV-SHOWS directory');
                    for (const folder of node.folders) {
                        console.log('[DEBUG - EPISODE-MATCH] Searching in TV show folder:', folder.name);
                        
                        // Check if this folder matches the show name we're looking for
                        const folderName = folder.name || '';
                        const normalizedFolderName = folderName.toLowerCase().replace(/[._-]/g, ' ').trim();
                        const normalizedShowName = showName.toLowerCase().replace(/[._-]/g, ' ').trim();
                        
                        console.log('[DEBUG - EPISODE-MATCH] Comparing folder name:', normalizedFolderName);
                        console.log('[DEBUG - EPISODE-MATCH] With show name:', normalizedShowName);
                        console.log('[DEBUG - EPISODE-MATCH] Match:', normalizedFolderName.includes(normalizedShowName) || normalizedShowName.includes(normalizedFolderName));
                        
                        // If this folder matches our show, search for episodes in its subfolders
                        if (normalizedFolderName.includes(normalizedShowName) || normalizedShowName.includes(normalizedFolderName)) {
                            console.log('[DEBUG - EPISODE-MATCH] Found matching show folder:', folder.name);
                            
                            // Search in season folders
                            if (folder.folders && folder.folders.length > 0) {
                                console.log('[DEBUG - EPISODE-MATCH] Found', folder.folders.length, 'season folders');
                                for (const seasonFolder of folder.folders) {
                                    console.log('[DEBUG - EPISODE-MATCH] Searching in season folder:', seasonFolder.name);
                                    
                                    // Look for episode files in season folders
                                    if (seasonFolder.files && seasonFolder.files.length > 0) {
                                        console.log('[DEBUG - EPISODE-MATCH] Found', seasonFolder.files.length, 'episode files in season folder');
                                        for (const file of seasonFolder.files) {
                                            const fileEpisodeInfo = this.extractEpisodeInfo(file.absPath || file.relPath || file.path || '');
                                            
                                            console.log('[DEBUG - EPISODE-MATCH] Checking episode file:', file.name);
                                            console.log('[DEBUG - EPISODE-MATCH] Extracted show name:', fileEpisodeInfo?.showName);
                                            console.log('[DEBUG - EPISODE-MATCH] Has season number:', !!fileEpisodeInfo?.seasonNumber);
                                            console.log('[DEBUG - EPISODE-MATCH] Has episode number:', !!fileEpisodeInfo?.episodeNumber);
                                            
                                            // Add all episode files from this show (they should all match)
                                            if (fileEpisodeInfo && fileEpisodeInfo.seasonNumber && fileEpisodeInfo.episodeNumber) {
                                                console.log('[DEBUG - EPISODE-MATCH] TV SHOW EPISODE FOUND! Adding episode:', file.name, 'S' + fileEpisodeInfo.seasonNumber + 'E' + fileEpisodeInfo.episodeNumber);
                                                
                    episodes.push({
                        ...file,
                                                    episodeInfo: fileEpisodeInfo
                    });
                }
            }
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (node.folders && node.folders.length > 0) {
                // Continue searching in other directories to find TV-SHOWS
                for (const folder of node.folders) {
                    searchInNode(folder);
                }
            }
        };

        searchInNode(this.mediaLibrary);
        console.log('[DEBUG - EPISODE-MATCH] Found episodes for show:', episodes.length);
        console.log('[DEBUG - EPISODE-MATCH] Episode names:', episodes.map(ep => ep.name));
        return episodes;
    }

    findNextEpisodeBySeasonEpisode(episodes, currentEpisodeInfo) {
        console.log('[DEBUG - VIDEO-PLAYER] Finding next episode for:', currentEpisodeInfo);
        
        // Sort episodes by season and episode number
        const sortedEpisodes = episodes.sort((a, b) => {
            const aInfo = a.episodeInfo || this.extractEpisodeInfo(a.absPath || a.relPath || a.path || '');
            const bInfo = b.episodeInfo || this.extractEpisodeInfo(b.absPath || b.relPath || b.path || '');
            
            if (!aInfo || !bInfo) return 0;
            
            // Compare seasons first
            if (aInfo.seasonNumber !== bInfo.seasonNumber) {
                return aInfo.seasonNumber - bInfo.seasonNumber;
            }
            
            // Then compare episodes
            return aInfo.episodeNumber - bInfo.episodeNumber;
        });

        console.log('[DEBUG - VIDEO-PLAYER] Sorted episodes:', sortedEpisodes.map(ep => {
            const info = ep.episodeInfo || this.extractEpisodeInfo(ep.absPath || ep.relPath || ep.path || '');
            return `${info?.seasonNumber || '?'}x${info?.episodeNumber || '?'} - ${ep.name}`;
        }));

        // Find current episode in sorted list
        const currentIndex = sortedEpisodes.findIndex(ep => {
            const epInfo = ep.episodeInfo || this.extractEpisodeInfo(ep.absPath || ep.relPath || ep.path || '');
            return epInfo && 
                   epInfo.seasonNumber === currentEpisodeInfo.seasonNumber && 
                   epInfo.episodeNumber === currentEpisodeInfo.episodeNumber;
        });

        console.log('[DEBUG - VIDEO-PLAYER] Current episode index:', currentIndex);

        if (currentIndex === -1 || currentIndex === sortedEpisodes.length - 1) {
            console.log('[DEBUG - VIDEO-PLAYER] No next episode available');
            return null;
        }

        const nextEpisode = sortedEpisodes[currentIndex + 1];
        console.log('[DEBUG - VIDEO-PLAYER] Next episode:', nextEpisode.name);
        return nextEpisode;
    }

    setupUpNextAndSkipIntro() {
        if (!this.vjsPlayer) {
            console.warn('🎬 [VIDEO-PLAYER] Video.js player not initialized for Up Next setup');
            return;
        }
        
        // Remove any existing overlays
        this.removeUpNextOverlay();
        this.removeSkipIntroButton();
        this.removeSkipToNextButton();
        this.removeNextShowButton();

        // Add Next Show button for TV shows (appears after intro)
        this.addNextShowButton();

        // Listen for timeupdate to show Skip Intro, Up Next overlay, and Skip to Next button
        this.vjsPlayer.off('timeupdate'); // Remove previous listeners
        this.vjsPlayer.on('timeupdate', () => {
            const duration = this.vjsPlayer.duration();
            const current = this.vjsPlayer.currentTime();
            
            // Show Skip Intro button only during the first SKIP_INTRO_SECONDS (for TV shows only)
            if (current <= SKIP_INTRO_SECONDS && !this.skipIntroShown) {
                this.addSkipIntroButton(SKIP_INTRO_SECONDS);
                this.skipIntroShown = true;
            }
            
            // Hide Skip Intro button after SKIP_INTRO_SECONDS
            if (current > SKIP_INTRO_SECONDS && this.skipIntroBtn) {
                this.removeSkipIntroButton();
            }
            
            // Show Skip to Next Episode button using configurable timing (for TV shows only)
            if (duration && current > duration - SKIP_TO_NEXT_BEFORE_END_SECONDS && !this.skipToNextShown) {
                this.showSkipToNextButton();
                this.skipToNextShown = true;
            }
            
            // Show Up Next overlay using configurable timing
            if (duration && current > duration - UP_NEXT_BEFORE_END_SECONDS && !this.upNextShown) {
                this.showUpNextOverlay();
                this.upNextShown = true;
            }
        });
        this.vjsPlayer.off('ended');
        this.vjsPlayer.on('ended', () => {
            if (this.nextEpisodeInfo) {
                this.playNextEpisode();
            }
        });
    }

    addSkipIntroButton(skipSeconds = 90) {
        if (this.skipIntroBtn) return;
        if (!this.vjsPlayer) {
            console.warn('🎬 [VIDEO-PLAYER] Video.js player not initialized for skip intro button');
            return;
        }

        // Remove any existing overlays
        this.removeUpNextOverlay();
        this.removeSkipIntroButton();

        // Only add Skip Intro for TV shows
        let isTVShow = false;
        if (this.currentMediaItem && this.currentMediaItem.type === 'tvshow') {
            isTVShow = true;
        } else if (this.currentMediaItem && this.currentMediaItem.path && /TV[-_ ]SHOWS?/i.test(this.currentMediaItem.path)) {
            isTVShow = true;
        } else if (this.currentFile && this.currentFile.absPath && /TV[-_ ]SHOWS?/i.test(this.currentFile.absPath)) {
            isTVShow = true;
        }
        if (!isTVShow) return;

        this.skipIntroBtn = document.createElement('button');
        this.skipIntroBtn.className = 'video-player-skip-intro-btn';
        this.skipIntroBtn.innerText = `⏩ Skip Intro (${skipSeconds}s)`;
        this.skipIntroBtn.style.cssText = `
            position: absolute;
            bottom: 100px;
            right: 40px;
            z-index: 10002;
            background: #1976d2;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 18px;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        this.skipIntroBtn.onclick = () => {
            if (this.vjsPlayer) {
                this.vjsPlayer.currentTime(skipSeconds);
            }
            this.removeSkipIntroButton();
        };
        this.container.appendChild(this.skipIntroBtn);
    }

    removeSkipIntroButton() {
        if (this.skipIntroBtn) {
            this.skipIntroBtn.remove();
            this.skipIntroBtn = null;
        }
    }

    addNextShowButton() {
        if (this.nextShowBtn) return;
        
        console.log('[DEBUG - VIDEO-PLAYER] addNextShowButton called');
        console.log('[DEBUG - VIDEO-PLAYER] currentMediaItem:', this.currentMediaItem);
        console.log('[DEBUG - VIDEO-PLAYER] currentFile:', this.currentFile);
        
        // Only add Next Show button for TV shows - improved detection
        let isTVShow = false;
        
        // Check multiple ways to detect TV shows
        if (this.currentMediaItem) {
            if (this.currentMediaItem.type === 'tvshow' || this.currentMediaItem.type === 'tv-show') {
                isTVShow = true;
                console.log('[DEBUG - VIDEO-PLAYER] Detected TV show via mediaItem.type:', this.currentMediaItem.type);
            } else if (this.currentMediaItem.path && /TV[-_ ]SHOWS?/i.test(this.currentMediaItem.path)) {
                isTVShow = true;
                console.log('[DEBUG - VIDEO-PLAYER] Detected TV show via mediaItem.path:', this.currentMediaItem.path);
            }
        }
        
        if (!isTVShow && this.currentFile) {
            if (this.currentFile.absPath && /TV[-_ ]SHOWS?/i.test(this.currentFile.absPath)) {
                isTVShow = true;
                console.log('[DEBUG - VIDEO-PLAYER] Detected TV show via currentFile.absPath:', this.currentFile.absPath);
            } else if (this.currentFile.name && /TV[-_ ]SHOWS?/i.test(this.currentFile.name)) {
                isTVShow = true;
                console.log('[DEBUG - VIDEO-PLAYER] Detected TV show via currentFile.name:', this.currentFile.name);
            }
        }
        
        // Additional check: look for episode patterns in filename
        if (!isTVShow && this.currentFile && this.currentFile.name) {
            const episodePatterns = [/S\d{1,2}E\d{1,2}/i, /Season\s*\d+/i, /Episode\s*\d+/i];
            if (episodePatterns.some(pattern => pattern.test(this.currentFile.name))) {
                isTVShow = true;
                console.log('[DEBUG - VIDEO-PLAYER] Detected TV show via episode pattern in filename:', this.currentFile.name);
            }
        }
        
        console.log('[DEBUG - VIDEO-PLAYER] Final isTVShow result:', isTVShow);
        if (!isTVShow) {
            console.log('[DEBUG - VIDEO-PLAYER] Not a TV show, skipping Next Show button');
            return;
        }
        
        // Force show for any video with episode patterns (fallback)
        if (this.currentFile && this.currentFile.name) {
            const episodePatterns = [/S\d{1,2}E\d{1,2}/i, /Season\s*\d+/i, /Episode\s*\d+/i];
            if (episodePatterns.some(pattern => pattern.test(this.currentFile.name))) {
                isTVShow = true;
                console.log('[DEBUG - VIDEO-PLAYER] Forcing TV show detection due to episode patterns');
            }
        }

        // Get next episode info (but don't require it to show the button)
        const filePath = this.currentFile.absPath || this.currentFile.name;
        console.log('[DEBUG - VIDEO-PLAYER] Looking for next episode with filePath:', filePath);
        const { next } = this.findCurrentAndNextEpisode(filePath);
        console.log('[DEBUG - VIDEO-PLAYER] Next episode found:', next);

        this.nextShowBtn = document.createElement('button');
        this.nextShowBtn.className = 'video-player-next-show-btn';
        
        // Always show the Next Episode button with simple text
        this.nextShowBtn.innerHTML = `
            <div class="next-show-text">
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">📺 Episode List</div>
                <div style="font-size: 12px; opacity: 0.8;">Choose next episode</div>
            </div>
        `;
        this.nextShowBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            z-index: 10002;
            background: rgba(0,0,0,0.8);
            color: white;
            border: 2px solid #43a047;
            border-radius: 12px;
            padding: 12px 16px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 200px;
            transition: all 0.3s ease;
        `;
        
        // Add hover effects for the button itself (scale and background change)
        this.nextShowBtn.onmouseenter = () => {
            this.nextShowBtn.style.transform = 'scale(1.05)';
            this.nextShowBtn.style.background = 'rgba(0,0,0,0.9)';
        };
        
        this.nextShowBtn.onmouseleave = () => {
            this.nextShowBtn.style.transform = 'scale(1)';
            this.nextShowBtn.style.background = 'rgba(0,0,0,0.8)';
        };
        
        this.nextShowBtn.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            console.log('[VIDEO-PLAYER] Episode List button clicked');
            
            // Get show name directly from currentMediaItem if available
            let showName = null;
            if (this.currentMediaItem && this.currentMediaItem.showName) {
                showName = this.currentMediaItem.showName;
                console.log('[VIDEO-PLAYER] Using showName from currentMediaItem:', showName);
            } else if (this.currentMediaItem && this.currentMediaItem.title) {
                showName = this.currentMediaItem.title;
                console.log('[VIDEO-PLAYER] Using title from currentMediaItem:', showName);
            } else if (this.currentMediaItem && this.currentMediaItem.name) {
                showName = this.currentMediaItem.name;
                console.log('[VIDEO-PLAYER] Using name from currentMediaItem:', showName);
            }
            
            // FALLBACK: If no show name found, try to extract from file path
            if (!showName && this.currentMediaItem && this.currentMediaItem.path) {
                console.log('[VIDEO-PLAYER] No show name found, trying to extract from path...');
                const pathInfo = this.extractEpisodeInfo(this.currentMediaItem.path);
                if (pathInfo && pathInfo.showName && pathInfo.showName !== 'Unknown Show') {
                    showName = pathInfo.showName;
                    console.log('[VIDEO-PLAYER] Extracted show name from path:', showName);
                }
            }
            
            // SPECIAL CASE: Handle Lost in Space if show name is still missing
            if (!showName && this.currentMediaItem && this.currentMediaItem.path && 
                this.currentMediaItem.path.includes('Lost in Space')) {
                showName = 'Lost in Space (2018)';
                console.log('[VIDEO-PLAYER] SPECIAL CASE: Set Lost in Space show name to:', showName);
            }
            

            
            // Debug: Show all available properties that might contain show information
            if (this.currentMediaItem) {
                console.log('[VIDEO-PLAYER] currentMediaItem properties:', Object.keys(this.currentMediaItem));
                console.log('[VIDEO-PLAYER] currentMediaItem.title:', this.currentMediaItem.title);
                console.log('[VIDEO-PLAYER] currentMediaItem.name:', this.currentMediaItem.name);
                console.log('[VIDEO-PLAYER] currentMediaItem.mediaType:', this.currentMediaItem.mediaType);
                console.log('[VIDEO-PLAYER] currentMediaItem.showName:', this.currentMediaItem.showName);
                console.log('[VIDEO-PLAYER] currentMediaItem.TMDBTitle:', this.currentMediaItem.TMDBTitle);
                console.log('[VIDEO-PLAYER] currentMediaItem.path:', this.currentMediaItem.path);
                console.log('[VIDEO-PLAYER] currentMediaItem.absPath:', this.currentMediaItem.absPath);
                
                // Show the full currentMediaItem object for debugging
                console.log('[VIDEO-PLAYER] FULL currentMediaItem object:', JSON.stringify(this.currentMediaItem, null, 2));
            }
            
            if (this.currentFile) {
                console.log('[VIDEO-PLAYER] currentFile properties:', Object.keys(this.currentFile));
                console.log('[VIDEO-PLAYER] currentFile.name:', this.currentFile.name);
                console.log('[VIDEO-PLAYER] currentFile.title:', this.currentFile.title);
                console.log('[VIDEO-PLAYER] currentFile.showName:', this.currentFile.showName);
            }
            
            if (!showName) {
                console.log('[VIDEO-PLAYER] No show name found');
                this.showOverlayAlert('Cannot determine current show name', 3000);
                return;
            }
            
            console.log('[VIDEO-PLAYER] Final show name to use:', showName);
            
            // Pause video if it's playing when modal opens
            if (this.vjsPlayer && !this.vjsPlayer.paused()) {
                console.log('[VIDEO-PLAYER] Pausing video for modal');
                this.vjsPlayer.pause();
            }
            
            console.log('[VIDEO-PLAYER] Opening episode modal for show:', showName);
            console.log('[VIDEO-PLAYER] EpisodeModal available:', typeof window.EpisodeModal);
            console.log('[VIDEO-PLAYER] window.episodeModal exists:', !!window.episodeModal);
            console.log('[VIDEO-PLAYER] EPISODE_MODAL_LOADED flag:', window.EPISODE_MODAL_LOADED);
            
            // Initialize episode modal if not already done
            if (!window.episodeModal) {
                console.log('[VIDEO-PLAYER] Creating new EpisodeModal instance');
                console.log('[VIDEO-PLAYER] EpisodeModal constructor:', typeof EpisodeModal);
                if (typeof EpisodeModal === 'undefined') {
                    console.error('[VIDEO-PLAYER] EpisodeModal class is not available!');
                    this.showOverlayAlert('EpisodeModal not loaded', 3000);
                    return;
                }
                window.episodeModal = new EpisodeModal();
                window.episodeModal.init(
                    // onEpisodeSelect callback
                    (selectedEpisode) => {
                        console.log('[VIDEO-PLAYER] Episode selected:', selectedEpisode.name);
                        
                        // Use MediaLibraryManager to prepare episode data for EpisodeModal selection
                        const episodeFile = window.mediaLibraryManager ? 
                            window.mediaLibraryManager.prepareEpisodeForPlayback(selectedEpisode) : 
                            selectedEpisode;
                        
                        // Load the selected episode using centralized method
                        this.loadEpisodeVideo(episodeFile, selectedEpisode.name);
                    },
                    // onClose callback
                    () => {
                        console.log('[VIDEO-PLAYER] Episode modal closed');
                    }
                );
            }
            
            // Open the episode modal
            console.log('[VIDEO-PLAYER] Calling episodeModal.open()');
            window.episodeModal.open(showName);
        };
        
        this.container.appendChild(this.nextShowBtn);
    }

    removeNextShowButton() {
        if (this.nextShowBtn) {
            this.nextShowBtn.remove();
            this.nextShowBtn = null;
        }
    }

    showSkipToNextButton() {
        // Only show for TV shows - using same improved detection logic
        let isTVShow = false;
        
        // Check multiple ways to detect TV shows
        if (this.currentMediaItem) {
            if (this.currentMediaItem.type === 'tvshow' || this.currentMediaItem.type === 'tv-show') {
            isTVShow = true;
            } else if (this.currentMediaItem.path && /TV[-_ ]SHOWS?/i.test(this.currentMediaItem.path)) {
            isTVShow = true;
            }
        }
        
        if (!isTVShow && this.currentFile) {
            if (this.currentFile.absPath && /TV[-_ ]SHOWS?/i.test(this.currentFile.absPath)) {
                isTVShow = true;
            } else if (this.currentFile.name && /TV[-_ ]SHOWS?/i.test(this.currentFile.name)) {
            isTVShow = true;
        }
        }
        
        // Additional check: look for episode patterns in filename
        if (!isTVShow && this.currentFile && this.currentFile.name) {
            const episodePatterns = [/S\d{1,2}E\d{1,2}/i, /Season\s*\d+/i, /Episode\s*\d+/i];
            if (episodePatterns.some(pattern => pattern.test(this.currentFile.name))) {
                isTVShow = true;
            }
        }
        
        if (!isTVShow) return;

        // Find next episode
        const filePath = this.currentFile.absPath || this.currentFile.name;
        const { next } = this.findCurrentAndNextEpisode(filePath);
        this.nextEpisodeInfo = next;
        if (!next) return;

        // Remove any existing skip to next button
        this.removeSkipToNextButton();

        // Create the skip to next button with progress bar
        this.skipToNextBtn = document.createElement('div');
        this.skipToNextBtn.className = 'video-player-skip-to-next-btn';
        this.skipToNextBtn.style.cssText = `
            position: absolute;
            bottom: 160px;
            right: 40px;
            z-index: 10002;
            background: rgba(0,0,0,0.9);
            color: white;
            border-radius: 12px;
            padding: 16px 24px;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 280px;
        `;

        // Create progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 100%;
            height: 4px;
            background: rgba(255,255,255,0.3);
            border-radius: 2px;
            margin-top: 12px;
            overflow: hidden;
        `;

        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.id = 'skip-to-next-progress';
        progressBar.style.cssText = `
            height: 100%;
            background: #43a047;
            border-radius: 2px;
            width: 0%;
            transition: width 0.1s linear;
        `;

        progressContainer.appendChild(progressBar);
        this.skipToNextBtn.appendChild(progressContainer);

        // Set initial content
        this.updateSkipToNextContent(10);

        // Add click handler
        this.skipToNextBtn.onclick = () => {
            this.skipToNextEpisode();
        };

        this.container.appendChild(this.skipToNextBtn);

        // Start countdown and progress bar
        let countdown = 10;
        this.skipToNextTimer = setInterval(() => {
            countdown--;
            this.updateSkipToNextContent(countdown);
            
            if (countdown <= 0) {
                clearInterval(this.skipToNextTimer);
                this.skipToNextEpisode();
            }
        }, 1000);
    }

    updateSkipToNextContent(countdown) {
        if (!this.skipToNextBtn) return;
        
        const progressBar = this.skipToNextBtn.querySelector('#skip-to-next-progress');
        if (progressBar) {
            const progress = ((10 - countdown) / 10) * 100;
            progressBar.style.width = progress + '%';
        }

        // Update text content
        const existingText = this.skipToNextBtn.querySelector('.skip-to-next-text');
        if (existingText) {
            existingText.remove();
        }

        const textDiv = document.createElement('div');
        textDiv.className = 'skip-to-next-text';
        textDiv.style.cssText = `
            text-align: center;
            font-weight: bold;
        `;
        
        if (this.nextEpisodeInfo) {
            textDiv.innerHTML = `
                <div style="margin-bottom: 4px;">⏭️ Skip to Next Episode</div>
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px;">${this.nextEpisodeInfo.name}</div>
                <div style="font-size: 12px; opacity: 0.6;">Auto-skip in ${countdown}s</div>
            `;
        } else {
            textDiv.innerHTML = `
                <div style="margin-bottom: 4px;">⏭️ Skip to Next Episode</div>
                <div style="font-size: 12px; opacity: 0.6;">Auto-skip in ${countdown}s</div>
            `;
        }

        // Insert at the beginning
        this.skipToNextBtn.insertBefore(textDiv, this.skipToNextBtn.firstChild);
    }

    skipToNextEpisode() {
        this.removeSkipToNextButton();
        console.log('[DEBUG - VIDEO-PLAYER] skipToNextEpisode called - using playNextEpisodeInSeries');
        this.playNextEpisodeInSeries();
    }

    removeSkipToNextButton() {
        if (this.skipToNextBtn) {
            this.skipToNextBtn.remove();
            this.skipToNextBtn = null;
        }
        if (this.skipToNextTimer) {
            clearInterval(this.skipToNextTimer);
            this.skipToNextTimer = null;
        }
        this.skipToNextShown = false;
    }

    showUpNextOverlay() {
        // Find next episode using the same logic as playNextEpisode
        let filePath = this.currentFile.absPath || this.currentFile.name;
        
        // If it's a URL, try to extract the actual file path
        if (filePath.startsWith('http') || filePath.startsWith('blob:')) {
            console.log('[DEBUG - VIDEO-PLAYER] showUpNextOverlay: Detected URL, trying to extract file path');
            
            // Try to get the actual file path from the media library
            if (this.currentMediaItem && this.currentMediaItem.filePath) {
                filePath = this.currentMediaItem.filePath;
                console.log('[DEBUG - VIDEO-PLAYER] showUpNextOverlay: Using currentMediaItem.filePath:', filePath);
            } else if (this.currentMediaItem && this.currentMediaItem.absPath) {
                filePath = this.currentMediaItem.absPath;
                console.log('[DEBUG - VIDEO-PLAYER] showUpNextOverlay: Using currentMediaItem.absPath:', filePath);
            } else if (this.currentMediaItem && this.currentMediaItem.path) {
                filePath = this.currentMediaItem.path;
                console.log('[DEBUG - VIDEO-PLAYER] showUpNextOverlay: Using currentMediaItem.path:', filePath);
            } else {
                console.log('[DEBUG - VIDEO-PLAYER] showUpNextOverlay: No file path found in currentMediaItem');
                return; // Don't show overlay if we can't determine the path
            }
        }
        
        const { next } = this.findCurrentAndNextEpisode(filePath);
        this.nextEpisodeInfo = next;
        if (!next) {
            console.log('[DEBUG - VIDEO-PLAYER] showUpNextOverlay: No next episode found - not showing overlay');
            return;
        }
        // Create overlay
        this.removeUpNextOverlay();
        this.upNextOverlay = document.createElement('div');
        this.upNextOverlay.className = 'video-player-up-next-overlay';
        this.upNextOverlay.style.cssText = `
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: white;
            border-radius: 12px;
            padding: 32px 48px;
            font-size: 22px;
            z-index: 10003;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        `;
        let countdown = 10;
        this.upNextOverlay.innerHTML = `
            <div style="font-size: 28px; font-weight: bold; margin-bottom: 12px;">Up Next</div>
            <div style="margin-bottom: 8px;">${next.name}</div>
            <div style="margin-bottom: 16px;">Playing in <span id="up-next-countdown">${countdown}</span> seconds...</div>
            <div style="display: flex; gap: 20px;">
                <button id="up-next-play-now" style="padding: 10px 24px; font-size: 18px; background: #43a047; color: white; border: none; border-radius: 8px; cursor: pointer;">Play Now</button>
                <button id="up-next-cancel" style="padding: 10px 24px; font-size: 18px; background: #b71c1c; color: white; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
            </div>
        `;
        this.container.appendChild(this.upNextOverlay);
        // Countdown logic
        this.upNextTimer = setInterval(() => {
            countdown--;
            const cdElem = this.upNextOverlay.querySelector('#up-next-countdown');
            if (cdElem) cdElem.innerText = countdown;
            if (countdown <= 0) {
                clearInterval(this.upNextTimer);
                this.playNextEpisode();
            }
        }, 1000);
        // Button handlers
        this.upNextOverlay.querySelector('#up-next-play-now').onclick = () => {
            clearInterval(this.upNextTimer);
            this.playNextEpisode();
        };
        this.upNextOverlay.querySelector('#up-next-cancel').onclick = () => {
            clearInterval(this.upNextTimer);
            this.removeUpNextOverlay();
        };
    }

    removeUpNextOverlay() {
        if (this.upNextOverlay) {
            this.upNextOverlay.remove();
            this.upNextOverlay = null;
        }
        if (this.upNextTimer) {
            clearInterval(this.upNextTimer);
            this.upNextTimer = null;
        }
        this.upNextShown = false;
    }

    async playNextEpisodeInSeries() {
        console.log('[DEBUG - VIDEO-PLAYER] playNextEpisodeInSeries called');
        
        // Get current video info from Video.js (same as updateMovieInfoHeader)
        let filePath = null;
        
        // Get file path from current file or media item (same logic as updateMovieInfoHeader)
        if (this.currentFile) {
            filePath = this.currentFile.absPath || this.currentFile.name;
        } else if (this.currentMediaItem) {
            filePath = this.currentMediaItem.path || this.currentMediaItem.absPath;
        }
        
        console.log('[DEBUG - VIDEO-PLAYER] Current file from Video.js:', this.currentFile);
        console.log('[DEBUG - VIDEO-PLAYER] Current media item from Video.js:', this.currentMediaItem);
        console.log('[DEBUG - VIDEO-PLAYER] File path from Video.js:', filePath);
        
        if (!filePath) {
            this.showOverlayAlert('Cannot determine current video path', 3000);
            return;
        }
        
        // Extract episode info from the current video path
        console.log('[DEBUG - EPISODE-MATCH] About to extract episode info from filePath:', filePath);
        
        // Decode URL-encoded path if needed
        let decodedPath = filePath;
        if (filePath.includes('%')) {
            try {
                decodedPath = decodeURIComponent(filePath);
                console.log('[DEBUG - EPISODE-MATCH] Decoded path:', decodedPath);
            } catch (e) {
                console.log('[DEBUG - EPISODE-MATCH] Failed to decode path:', e);
            }
        }
        
        const currentEpisodeInfo = this.extractEpisodeInfo(decodedPath);
        console.log('[DEBUG - EPISODE-MATCH] Current episode info from Video.js:', currentEpisodeInfo);
        
        if (!currentEpisodeInfo || !currentEpisodeInfo.showName) {
            this.showOverlayAlert('Current video is not a TV show episode', 3000);
            return;
        }
        
        // Ensure media library is loaded
        if (!this.mediaLibrary) {
            console.log('[DEBUG - VIDEO-PLAYER] Media library not loaded, fetching...');
            await this.fetchMediaLibrary();
        }
        
        // Find all episodes from the same show
        const showEpisodes = this.findAllEpisodesForShow(currentEpisodeInfo.showName);
        console.log('[DEBUG - EPISODE-MATCH] Episodes from same show:', showEpisodes.length);
        console.log('[DEBUG - EPISODE-MATCH] Show name being searched for:', JSON.stringify(currentEpisodeInfo.showName));
        
        if (showEpisodes.length === 0) {
            console.log('[DEBUG - EPISODE-MATCH] No episodes found for show. This might be a show name matching issue.');
            this.showOverlayAlert(`No episodes found for "${currentEpisodeInfo.showName}"`, 3000);
            return;
        }
        
        console.log('[DEBUG - EPISODE-MATCH] First 5 episodes found for this show:');
        for (let i = 0; i < Math.min(5, showEpisodes.length); i++) {
            const ep = showEpisodes[i];
            const epInfo = ep.episodeInfo || this.extractEpisodeInfo(ep.absPath || ep.relPath || ep.path || '');
            console.log(`[DEBUG - EPISODE-MATCH] Episode ${i}: S${epInfo?.seasonNumber || '?'}E${epInfo?.episodeNumber || '?'} - ${ep.name}`);
        }
        
        // Sort episodes by season and episode number
        const sortedEpisodes = showEpisodes.sort((a, b) => {
            const aInfo = a.episodeInfo || this.extractEpisodeInfo(a.absPath || a.relPath || a.path || '');
            const bInfo = b.episodeInfo || this.extractEpisodeInfo(b.absPath || b.relPath || b.path || '');
            
            if (!aInfo || !bInfo) return 0;
            
            // Compare seasons first
            if (aInfo.seasonNumber !== bInfo.seasonNumber) {
                return aInfo.seasonNumber - bInfo.seasonNumber;
            }
            
            // Then compare episodes
            return aInfo.episodeNumber - bInfo.episodeNumber;
        });
        
        console.log('[DEBUG - VIDEO-PLAYER] Sorted episodes:', sortedEpisodes.map(ep => {
            const info = ep.episodeInfo || this.extractEpisodeInfo(ep.absPath || ep.relPath || ep.path || '');
            return `${info?.seasonNumber || '?'}x${info?.episodeNumber || '?'} - ${ep.name}`;
        }));
        
        // Debug: Show the first few episodes to see the order
        console.log('[DEBUG - VIDEO-PLAYER] First 5 episodes in sorted list:');
        for (let i = 0; i < Math.min(5, sortedEpisodes.length); i++) {
            const ep = sortedEpisodes[i];
            const info = ep.episodeInfo || this.extractEpisodeInfo(ep.absPath || ep.relPath || ep.path || '');
            console.log(`[DEBUG - VIDEO-PLAYER] Episode ${i}: S${info?.seasonNumber || '?'}E${info?.episodeNumber || '?'} - ${ep.name}`);
        }
        
        // Find current episode in sorted list
        console.log('[DEBUG - EPISODE-MATCH] Looking for current episode: S' + currentEpisodeInfo.seasonNumber + 'E' + currentEpisodeInfo.episodeNumber);
        console.log('[DEBUG - EPISODE-MATCH] Current episode info details:', currentEpisodeInfo);
        
        const currentIndex = sortedEpisodes.findIndex(ep => {
            const epInfo = ep.episodeInfo || this.extractEpisodeInfo(ep.absPath || ep.relPath || ep.path || '');
            console.log('[DEBUG - EPISODE-MATCH] Comparing with episode:', ep.name);
            console.log('[DEBUG - EPISODE-MATCH] Episode info from file:', epInfo);
            
            const matches = epInfo && 
                   epInfo.seasonNumber === currentEpisodeInfo.seasonNumber && 
                   epInfo.episodeNumber === currentEpisodeInfo.episodeNumber;
            
            console.log('[DEBUG - EPISODE-MATCH] Season match:', epInfo?.seasonNumber, '===', currentEpisodeInfo.seasonNumber, '=', epInfo?.seasonNumber === currentEpisodeInfo.seasonNumber);
            console.log('[DEBUG - EPISODE-MATCH] Episode match:', epInfo?.episodeNumber, '===', currentEpisodeInfo.episodeNumber, '=', epInfo?.episodeNumber === currentEpisodeInfo.episodeNumber);
            console.log('[DEBUG - EPISODE-MATCH] Overall match:', matches);
            
            if (matches) {
                console.log('[DEBUG - EPISODE-MATCH] Found current episode at index:', sortedEpisodes.indexOf(ep), 'Episode:', ep.name);
            }
            return matches;
        });
        
        console.log('[DEBUG - EPISODE-MATCH] Current episode index:', currentIndex);
        
        if (currentIndex === -1) {
            console.log('[DEBUG - EPISODE-MATCH] Current episode not found in sorted list');
            console.log('[DEBUG - EPISODE-MATCH] Current episode we were looking for: S' + currentEpisodeInfo.seasonNumber + 'E' + currentEpisodeInfo.episodeNumber);
            console.log('[DEBUG - EPISODE-MATCH] Available episodes in sorted list:');
            for (let i = 0; i < Math.min(10, sortedEpisodes.length); i++) {
                const ep = sortedEpisodes[i];
                const epInfo = ep.episodeInfo || this.extractEpisodeInfo(ep.absPath || ep.relPath || ep.path || '');
                console.log(`[DEBUG - EPISODE-MATCH] Episode ${i}: S${epInfo?.seasonNumber || '?'}E${epInfo?.episodeNumber || '?'} - ${ep.name}`);
            }
            this.showOverlayAlert('Could not find current episode in series', 3000);
            return;
        }
        
        if (currentIndex === sortedEpisodes.length - 1) {
            console.log('[DEBUG - VIDEO-PLAYER] This is the last episode in the series');
            this.showOverlayAlert('This is the last episode in the series', 3000);
            return;
        }
        
        // Get the next episode
        const nextEpisode = sortedEpisodes[currentIndex + 1];
        const nextEpisodeInfo = nextEpisode.episodeInfo || this.extractEpisodeInfo(nextEpisode.absPath || nextEpisode.relPath || nextEpisode.path || '');
        
        console.log('[DEBUG - VIDEO-PLAYER] Next episode:', nextEpisode.name);
        console.log('[DEBUG - VIDEO-PLAYER] Next episode info:', nextEpisodeInfo);
        
        // Load the next episode
        const nextFile = {
            name: nextEpisode.name,
            absPath: nextEpisode.absPath,
            relPath: nextEpisode.relPath,
            path: nextEpisode.path,
            type: 'video/mp4',
        };
        
        this.showOverlayAlert(`Loading next episode: ${nextEpisode.name}`, 3000);
        
        // Show episode selection popup instead of automatic loading
        this.showEpisodeSelectionPopup(currentEpisodeInfo.showName);
    }

    async showNextEpisodeOptions() {
        console.log('[DEBUG - VIDEO-PLAYER] showNextEpisodeOptions called');
        
        // Ensure media library is loaded
        if (!this.mediaLibrary) {
            console.log('[DEBUG - VIDEO-PLAYER] Media library not loaded, fetching...');
            await this.fetchMediaLibrary();
        }
        
        // Get the current file path, handling both URL and file path cases
        let filePath = this.currentFile.absPath || this.currentFile.name;
        console.log('[DEBUG - VIDEO-PLAYER] Current file path/URL:', filePath);
        
        // If it's a URL, try to extract the actual file path
        if (filePath.startsWith('http') || filePath.startsWith('blob:')) {
            console.log('[DEBUG - VIDEO-PLAYER] Detected URL, trying to extract file path');
            
            // Try to get the actual file path from the media library
            if (this.currentMediaItem && this.currentMediaItem.filePath) {
                filePath = this.currentMediaItem.filePath;
                console.log('[DEBUG - VIDEO-PLAYER] Using currentMediaItem.filePath:', filePath);
            } else if (this.currentMediaItem && this.currentMediaItem.absPath) {
                filePath = this.currentMediaItem.absPath;
                console.log('[DEBUG - VIDEO-PLAYER] Using currentMediaItem.absPath:', filePath);
            } else if (this.currentMediaItem && this.currentMediaItem.path) {
                filePath = this.currentMediaItem.path;
                console.log('[DEBUG - VIDEO-PLAYER] Using currentMediaItem.path:', filePath);
            } else {
                console.log('[DEBUG - VIDEO-PLAYER] No file path found in currentMediaItem');
                console.log('[DEBUG - VIDEO-PLAYER] currentMediaItem properties:', this.currentMediaItem ? Object.keys(this.currentMediaItem) : 'null');
                this.showOverlayAlert('Cannot determine current episode path', 5000);
                return;
            }
        }
        
        // Find episodes from the SAME TV SHOW SERIES
        if (this.mediaLibrary) {
            // Extract the show name from the current episode
            const currentEpisodeInfo = this.extractEpisodeInfo(filePath);
            console.log('[DEBUG - VIDEO-PLAYER] Current episode info:', currentEpisodeInfo);
            
            if (currentEpisodeInfo && currentEpisodeInfo.showName) {
                // Find all episodes from the same show
                const showEpisodes = this.findAllEpisodesForShow(currentEpisodeInfo.showName);
                console.log('[DEBUG - VIDEO-PLAYER] Episodes from same show:', showEpisodes.length);
                
                if (showEpisodes.length > 0) {
                    // Sort episodes by season and episode number
                    const sortedEpisodes = showEpisodes.sort((a, b) => {
                        const aInfo = a.episodeInfo || this.extractEpisodeInfo(a.absPath || a.relPath || a.path || '');
                        const bInfo = b.episodeInfo || this.extractEpisodeInfo(b.absPath || b.relPath || b.path || '');
                        
                        if (!aInfo || !bInfo) return 0;
                        
                        // Compare seasons first
                        if (aInfo.seasonNumber !== bInfo.seasonNumber) {
                            return aInfo.seasonNumber - bInfo.seasonNumber;
                        }
                        
                        // Then compare episodes
                        return aInfo.episodeNumber - bInfo.episodeNumber;
                    });
                    
                    console.log('[DEBUG - VIDEO-PLAYER] Sorted episodes:', sortedEpisodes.map(ep => {
                        const info = ep.episodeInfo || this.extractEpisodeInfo(ep.absPath || ep.relPath || ep.path || '');
                        return `${info?.seasonNumber || '?'}x${info?.episodeNumber || '?'} - ${ep.name}`;
                    }));
                    
                    // Show episodes from the same show
                    this.showEpisodeSelectionOverlay(sortedEpisodes, currentEpisodeInfo.showName);
                } else {
                    this.showOverlayAlert(`No other episodes found for "${currentEpisodeInfo.showName}"`, 5000);
                }
            } else {
                this.showOverlayAlert('Could not determine current show name', 5000);
            }
        } else {
            this.showOverlayAlert('Media library not available', 5000);
        }
    }

    showEpisodeSelectionOverlay(episodes, showName = '') {
        // Remove any existing overlay
        this.removeUpNextOverlay();
        
        // Create overlay with episode options
        this.episodeSelectionOverlay = document.createElement('div');
        this.episodeSelectionOverlay.className = 'video-player-episode-selection-overlay';
        this.episodeSelectionOverlay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.95);
            color: white;
            border-radius: 12px;
            padding: 24px;
            font-size: 16px;
            z-index: 10004;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        `;
        
        let overlayHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="margin: 0 0 16px 0; color: #43a047;">Select Next Episode</h3>
                <p style="margin: 0; opacity: 0.8; font-size: 14px; color: #43a047;">${showName}</p>
                <p style="margin: 8px 0 0 0; opacity: 0.8;">Click an episode to play it:</p>
            </div>
        `;
        
        episodes.forEach((episode, index) => {
            const episodeName = episode.name || 'Unknown Episode';
            const episodeInfo = episode.episodeInfo || this.extractEpisodeInfo(episode.absPath || episode.relPath || episode.path || '');
            const seasonEpisode = episodeInfo ? `S${episodeInfo.seasonNumber || '?'}E${episodeInfo.episodeNumber || '?'}` : '';
            
            overlayHTML += `
                <div style="
                    padding: 12px;
                    margin: 8px 0;
                    background: rgba(255,255,255,0.1);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background 0.2s;
                    border: 1px solid rgba(255,255,255,0.2);
                " 
                onmouseover="this.style.background='rgba(67,160,71,0.3)'"
                onmouseout="this.style.background='rgba(255,255,255,0.1)'"
                onclick="window.videoPlayer.loadEpisodeFromSelection('${episode.name.replace(/'/g, "\\'")}')">
                    <div style="font-weight: bold; color: #43a047;">${episodeName}</div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
                        ${seasonEpisode} ${episodeInfo?.showName || ''}
                    </div>
                </div>
            `;
        });
        
        overlayHTML += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.videoPlayer.closeEpisodeSelection()" 
                        style="
                            padding: 8px 16px;
                            background: #b71c1c;
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Cancel</button>
            </div>
        `;
        
        this.episodeSelectionOverlay.innerHTML = overlayHTML;
        this.container.appendChild(this.episodeSelectionOverlay);
    }

    loadEpisodeFromSelection(episodeName) {
        console.log('[DEBUG - VIDEO-PLAYER] Loading episode from selection:', episodeName);
        
        // Find the episode in the media library
        const findEpisode = (node) => {
            if (node.files && node.files.length > 0) {
                for (const file of node.files) {
                    if (file.name === episodeName) {
                        return file;
                    }
                }
            }
            if (node.folders && node.folders.length > 0) {
                for (const folder of node.folders) {
                    const found = findEpisode(folder);
                    if (found) return found;
                }
            }
            return null;
        };
        
        const episode = findEpisode(this.mediaLibrary);
        
        if (episode) {
            console.log('[DEBUG - VIDEO-PLAYER] Found episode:', episode);
            this.closeEpisodeSelection();
            
            const nextFile = {
                name: episode.name,
                absPath: episode.absPath,
                relPath: episode.relPath,
                path: episode.path,
                type: 'video/mp4',
            };
            
            this.showOverlayAlert(`Loading: ${episode.name}`, 3000);
            this.loadVideo(nextFile);
        } else {
            this.showOverlayAlert(`Episode not found: ${episodeName}`, 3000);
        }
    }

    storeCurrentTVShowInfo(file) {
        console.log('[DEBUG - VIDEO-PLAYER] storeCurrentTVShowInfo called with:', file);
        
        // Extract episode info from file path
        const filePath = file.absPath || file.relPath || file.path || file.name;
        console.log('[DEBUG - VIDEO-PLAYER] Using filePath for extraction:', filePath);
        console.log('[DEBUG - VIDEO-PLAYER] FilePath contains S01E01:', filePath.includes('S01E01'));
        console.log('[DEBUG - VIDEO-PLAYER] FilePath contains S01E02:', filePath.includes('S01E02'));
        const episodeInfo = this.extractEpisodeInfo(filePath);
        
        if (episodeInfo && episodeInfo.showName) {
            const tvShowInfo = {
                showName: episodeInfo.showName,
                seasonNumber: episodeInfo.seasonNumber,
                episodeNumber: episodeInfo.episodeNumber,
                fileName: file.name,
                filePath: filePath,
                timestamp: Date.now(),
                current: true  // Flag to identify this as the currently viewing episode
            };
            
            console.log('[DEBUG - VIDEO-PLAYER] Storing TV show info:', tvShowInfo);
            console.log('[DEBUG - VIDEO-PLAYER] Storing showName as:', JSON.stringify(tvShowInfo.showName));
            console.log('[DEBUG - VIDEO-PLAYER] Setting current flag to true for:', episodeInfo.showName);
            localStorage.setItem('currentTVShow', JSON.stringify(tvShowInfo));
        } else {
            console.log('[DEBUG - VIDEO-PLAYER] Could not extract episode info, not storing TV show info');
        }
    }

    getCurrentTVShowInfo() {
        const stored = localStorage.getItem('currentTVShow');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                console.log('[DEBUG - VIDEO-PLAYER] Retrieved TV show info from localStorage:', parsed);
                console.log('[DEBUG - VIDEO-PLAYER] Retrieved showName as:', JSON.stringify(parsed.showName));
                return parsed;
            } catch (e) {
                console.log('[DEBUG - VIDEO-PLAYER] Error parsing stored TV show info:', e);
                return null;
            }
        }
        return null;
    }

    stopCurrentVideoAndLoadNext(nextFile) {
        console.log('[DEBUG - VIDEO-PLAYER] stopCurrentVideoAndLoadNext called with:', nextFile);
        
        if (!this.vjsPlayer) {
            console.error('[DEBUG - VIDEO-PLAYER] Video.js player not initialized');
            return;
        }
        
        // STOP the current video completely
        console.log('[DEBUG - VIDEO-PLAYER] Stopping current video...');
        this.vjsPlayer.pause();
        this.vjsPlayer.currentTime(0);
        
        // Clear any existing source
        this.vjsPlayer.src('');
        
        // Wait a moment for the stop to take effect, then load the new video
        setTimeout(() => {
            console.log('[DEBUG - VIDEO-PLAYER] Loading new video:', nextFile.name);
            console.log('[DEBUG - VIDEO-PLAYER] Next file object:', nextFile);
            
            // Create a proper file object for loadVideo
            const fileToLoad = {
                name: nextFile.name,
                absPath: nextFile.absPath,
                relPath: nextFile.relPath,
                path: nextFile.path,
                type: 'video/mp4',
                // Add any other properties that loadVideo might need
                ...nextFile
            };
            
            console.log('[DEBUG - VIDEO-PLAYER] Created file object for loading:', fileToLoad);
            
            // Use the existing loadVideo method which properly handles file loading
            this.loadVideo(fileToLoad);
            
        }, 500); // Wait 500ms for the stop to complete
    }

    closeEpisodeSelection() {
        if (this.episodeSelectionOverlay) {
            this.episodeSelectionOverlay.remove();
            this.episodeSelectionOverlay = null;
        }
        // Clean up any keyboard event listeners
        document.removeEventListener('keydown', this.handleEpisodeSelectionKeyDown);
    }

    // Episode modal functionality moved to dedicated EpisodeModal component
    showEpisodeSelectionPopup(showName) {
        console.log('[VIDEO-PLAYER] showEpisodeSelectionPopup called - use EpisodeModal instead');
        // This method is kept for backward compatibility but functionality moved to EpisodeModal
    }

    async loadEpisodesForSelection(showName) {
        console.log('[EPISODE-SELECTION] Loading episodes for:', showName);
        
        // Get episodes directly from MediaLibraryManager
        let episodes = [];
        
        if (window.mediaLibraryManager && window.mediaLibraryManager.tvShowsData) {
            console.log('[EPISODE-SELECTION] Using MediaLibraryManager data');
            
            // Handle both array and object formats for TV shows data
            let showsArray = [];
            if (Array.isArray(window.mediaLibraryManager.tvShowsData)) {
                showsArray = window.mediaLibraryManager.tvShowsData;
            } else if (typeof window.mediaLibraryManager.tvShowsData === 'object' && window.mediaLibraryManager.tvShowsData) {
                showsArray = Object.values(window.mediaLibraryManager.tvShowsData);
            }
            
            console.log('[EPISODE-SELECTION] TV shows data type:', Array.isArray(window.mediaLibraryManager.tvShowsData) ? 'array' : 'object');
            console.log('[EPISODE-SELECTION] Shows array length:', showsArray.length);
            
            // Find the TV show in the data
            console.log('[EPISODE-SELECTION] Looking for show with name:', showName);
            console.log('[EPISODE-SELECTION] First few shows in array:', showsArray.slice(0, 3).map(s => ({
                name: s.name,
                TMDBTitle: s.TMDBTitle,
                title: s.title,
                path: s.path
            })));
            
            const tvShow = showsArray.find(show => {
                const showTitle = show.TMDBTitle || show.name || show.title || show.path || '';
                console.log('[EPISODE-SELECTION] Checking show:', showTitle, 'against:', showName);
                return showTitle.toLowerCase().includes(showName.toLowerCase()) || 
                       showName.toLowerCase().includes(showTitle.toLowerCase());
            });
            
            if (tvShow) {
                console.log('[EPISODE-SELECTION] Found TV show:', tvShow.path);
                
                // Try to get episodes from unified data first
                if (window.mediaLibraryManager && window.mediaLibraryManager.seasonEpisodeImages) {
                    console.log('[EPISODE-SELECTION] Available keys in seasonEpisodeImages:', Object.keys(window.mediaLibraryManager.seasonEpisodeImages));
                    console.log('[EPISODE-SELECTION] tvShow.name:', tvShow.name);
                    console.log('[EPISODE-SELECTION] tvShow.TMDBTitle:', tvShow.TMDBTitle);
                    console.log('[EPISODE-SELECTION] tvShow.title:', tvShow.title);
                    
                    // Try to find a matching key using multiple strategies
                    let actualKey = null;
                    const availableKeys = Object.keys(window.mediaLibraryManager.seasonEpisodeImages);
                    
                    // Strategy 1: Try exact match with normalizeKey if available
                    if (window.normalizeKey) {
                        const normalizedKey = window.normalizeKey(tvShow.name);
                        console.log('[EPISODE-SELECTION] Normalized key:', normalizedKey);
                        if (window.mediaLibraryManager.seasonEpisodeImages[normalizedKey]) {
                            actualKey = normalizedKey;
                            console.log('[EPISODE-SELECTION] Found exact match with normalized key');
                        }
                    }
                    
                    // Strategy 2: Try partial string matching
                    if (!actualKey) {
                        actualKey = availableKeys.find(key => 
                            key.toLowerCase().includes(tvShow.name.toLowerCase()) ||
                            tvShow.name.toLowerCase().includes(key.toLowerCase()) ||
                            (tvShow.TMDBTitle && key.toLowerCase().includes(tvShow.TMDBTitle.toLowerCase())) ||
                            (tvShow.TMDBTitle && tvShow.TMDBTitle.toLowerCase().includes(key.toLowerCase()))
                        );
                        if (actualKey) {
                            console.log('[EPISODE-SELECTION] Found partial match:', actualKey);
                        }
                    }
                    
                    // Strategy 3: Try humanized title matching
                    if (!actualKey && tvShow.TMDBTitle) {
                        actualKey = availableKeys.find(key => {
                            const humanizedKey = key.replace(/\./g, ' ').toLowerCase();
                            return humanizedKey.includes(tvShow.TMDBTitle.toLowerCase()) ||
                                   tvShow.TMDBTitle.toLowerCase().includes(humanizedKey);
                        });
                        if (actualKey) {
                            console.log('[EPISODE-SELECTION] Found humanized match:', actualKey);
                        }
                    }
                    
                    console.log('[EPISODE-SELECTION] Final key found:', actualKey);
                    
                    if (window.mediaLibraryManager.seasonEpisodeImages[actualKey] && 
                        window.mediaLibraryManager.seasonEpisodeImages[actualKey].seasons) {
                        
                        console.log('[EPISODE-SELECTION] Found unified data, seasons:', Object.keys(window.mediaLibraryManager.seasonEpisodeImages[actualKey].seasons));
                        
                        // Collect all episodes from all seasons in unified data
                        Object.entries(window.mediaLibraryManager.seasonEpisodeImages[actualKey].seasons).forEach(([seasonNum, seasonData]) => {
                            if (seasonData.episodes) {
                                console.log('[EPISODE-SELECTION] Season', seasonNum, 'has', Object.keys(seasonData.episodes).length, 'episodes');
                                
                                // Convert unified episode data to the expected format
                                Object.entries(seasonData.episodes).forEach(([episodeNum, episode]) => {
                                    episodes.push({
                                        name: episode.title || `Episode ${episodeNum}`,
                                        filename: episode.title || `Episode ${episodeNum}`,
                                        path: episode.path || "",
                                        relPath: episode.path || "",
                                        // No absPath reconstruction needed - use path directly
                                        filePath: episode.path || "",
                                        still: episode.still || "",
                                        thumbnail: episode.still || "",
                                        generated: false,
                                        timestamp: "",
                                        episodeNumber: episodeNum,
                                        seasonNumber: seasonNum
                                    });
                                });
                            }
                        });
                    } else {
                        console.log('[EPISODE-SELECTION] No unified data found, falling back to old structure');
                        
                        // Fallback to old folders structure if available
                        if (tvShow.folders) {
                            console.log('[EPISODE-SELECTION] Seasons found in old structure:', tvShow.folders.length);
                
                // Collect all episodes from all seasons
                tvShow.folders.forEach(season => {
                    if (season.files && season.files.length > 0) {
                        console.log('[EPISODE-SELECTION] Season', season.name, 'has', season.files.length, 'episodes');
                        episodes.push(...season.files);
                    }
                });
                        }
                    }
                } else {
                    console.log('[EPISODE-SELECTION] MediaLibraryManager not available, using old structure');
                    
                    // Fallback to old folders structure if available
                    if (tvShow.folders) {
                        console.log('[EPISODE-SELECTION] Seasons found in old structure:', tvShow.folders.length);
                        
                        // Collect all episodes from all seasons
                        tvShow.folders.forEach(season => {
                            if (season.files && season.files.length > 0) {
                                console.log('[EPISODE-SELECTION] Season', season.name, 'has', season.files.length, 'episodes');
                                episodes.push(...season.files);
                            }
                        });
                    }
                }
            } else {
                console.log('[EPISODE-SELECTION] TV show not found. Available shows:');
                showsArray.slice(0, 5).forEach(show => {
                    console.log('[EPISODE-SELECTION] -', show.TMDBTitle || show.name || show.path || 'unknown');
                });
            }
        }
        
        console.log('[EPISODE-SELECTION] Total episodes found:', episodes.length);
        
        const episodeList = document.getElementById('episode-list');
        
        // Update the title to show episode count
        const titleElement = document.querySelector('h2');
        if (titleElement) {
            titleElement.textContent = `Select Episode - ${showName} (${episodes.length} episodes)`;
        }
        
        if (episodes.length === 0) {
            episodeList.innerHTML = `
                <div style="text-align: center; color: #888; padding: 20px;">
                    No episodes found for "${showName}"
                </div>
            `;
            return;
        }
        
        // Sort episodes by season and episode
        const sortedEpisodes = episodes.sort((a, b) => {
            const aInfo = a.episodeInfo || this.extractEpisodeInfo(a.absPath || a.relPath || a.path || '');
            const bInfo = b.episodeInfo || this.extractEpisodeInfo(b.absPath || b.relPath || b.path || '');
            
            if (!aInfo || !bInfo) return 0;
            
            if (aInfo.seasonNumber !== bInfo.seasonNumber) {
                return aInfo.seasonNumber - bInfo.seasonNumber;
            }
            return aInfo.episodeNumber - bInfo.episodeNumber;
        });
        
        // Get current episode info for highlighting
        let currentEpisodeInfo = null;
        if (this.currentFile) {
            const currentFilePath = this.currentFile.absPath || this.currentFile.name;
            currentEpisodeInfo = this.extractEpisodeInfo(currentFilePath);
        }
        
        // Create episode buttons
        let episodeButtons = '';
        sortedEpisodes.forEach((episode, index) => {
            const epInfo = episode.episodeInfo || this.extractEpisodeInfo(episode.absPath || episode.relPath || episode.path || '');
            const episodeLabel = epInfo ? `S${epInfo.seasonNumber}E${epInfo.episodeNumber}` : `Episode ${index + 1}`;
            
            // Check if this is the currently playing episode
            const isCurrentEpisode = currentEpisodeInfo && epInfo && 
                currentEpisodeInfo.seasonNumber === epInfo.seasonNumber && 
                currentEpisodeInfo.episodeNumber === epInfo.episodeNumber;
            
            // Extract episode title for currently playing episode
            let statusText = '';
            if (isCurrentEpisode) {
                const episodeTitle = this.extractEpisodeTitle(episode.name);
                statusText = ` (Playing: S${epInfo.seasonNumber} E${epInfo.episodeNumber} ${episodeTitle})`;
            }
            
            const buttonClass = isCurrentEpisode ? 'episode-button current-episode' : 'episode-button';
            
            episodeButtons += `
                <button class="${buttonClass}" data-index="${index}" ${isCurrentEpisode ? 'disabled' : ''}>
                    <div class="episode-label">${episodeLabel}${statusText}</div>
                    <div class="episode-name">${episode.name}</div>
                </button>
            `;
        });
        
        episodeList.innerHTML = episodeButtons;
        
        // Add click handlers
        document.querySelectorAll('.episode-button').forEach(button => {
            button.onclick = () => {
                // Don't allow clicking on disabled (current) episode
                if (button.disabled) {
                    return;
                }
                
                const index = parseInt(button.dataset.index);
                const selectedEpisode = sortedEpisodes[index];
                console.log('[DEBUG - EPISODE-SELECTION] Selected episode:', selectedEpisode.name);
                
                // Handle episode selection from built-in episode list interface
                console.log('[BUILT-IN-EPISODE-SELECTION] Selected episode object:', selectedEpisode);
                
                // Use MediaLibraryManager to prepare episode data for built-in episode selection
                const episodeFile = window.mediaLibraryManager ? 
                    window.mediaLibraryManager.prepareEpisodeForPlayback(selectedEpisode) : 
                    selectedEpisode;
                
                console.log('[BUILT-IN-EPISODE-SELECTION] Created episode file object:', episodeFile);
                
                this.closeEpisodeSelection();
                
                // Load the selected episode using centralized method
                this.loadEpisodeVideo(episodeFile, selectedEpisode.name);
            };
        });
    }

    async playNextEpisode() {
        console.log('[DEBUG - VIDEO-PLAYER] playNextEpisode called');
        this.removeUpNextOverlay();
        
        // Ensure media library is loaded
        if (!this.mediaLibrary) {
            console.log('[DEBUG - VIDEO-PLAYER] Media library not loaded, fetching...');
            await this.fetchMediaLibrary();
        }
        
        // Get the current file path, handling both URL and file path cases
        let filePath = this.currentFile.absPath || this.currentFile.name;
        console.log('[DEBUG - VIDEO-PLAYER] Current file path/URL:', filePath);
        
        // If it's a URL, try to extract the actual file path
        if (filePath.startsWith('http') || filePath.startsWith('blob:')) {
            console.log('[DEBUG - VIDEO-PLAYER] Detected URL, trying to extract file path');
            
            // Try to get the actual file path from the media library
            if (this.currentMediaItem && this.currentMediaItem.filePath) {
                filePath = this.currentMediaItem.filePath;
                console.log('[DEBUG - VIDEO-PLAYER] Using currentMediaItem.filePath:', filePath);
            } else if (this.currentMediaItem && this.currentMediaItem.absPath) {
                filePath = this.currentMediaItem.absPath;
                console.log('[DEBUG - VIDEO-PLAYER] Using currentMediaItem.absPath:', filePath);
            } else if (this.currentMediaItem && this.currentMediaItem.path) {
                filePath = this.currentMediaItem.path;
                console.log('[DEBUG - VIDEO-PLAYER] Using currentMediaItem.path:', filePath);
            } else {
                console.log('[DEBUG - VIDEO-PLAYER] No file path found in currentMediaItem');
                console.log('[DEBUG - VIDEO-PLAYER] currentMediaItem properties:', this.currentMediaItem ? Object.keys(this.currentMediaItem) : 'null');
                this.showOverlayAlert('Cannot determine current episode path', 2000);
                return;
            }
        }
        
        const { next } = this.findCurrentAndNextEpisode(filePath);
        console.log('[DEBUG - VIDEO-PLAYER] Next episode found:', next);
        
        if (next) {
            // Create a File object for the next episode
            const nextFile = {
                name: next.name,
                absPath: next.absPath,
                relPath: next.relPath,
                path: next.path,
                type: 'video/mp4', // Assume mp4 for now
            };
            console.log('[DEBUG - VIDEO-PLAYER] Loading next episode:', nextFile);
            this.loadVideo(nextFile);
        } else if (this.nextEpisodeInfo) {
            // Fallback to the old nextEpisodeInfo if available
            console.log('[DEBUG - VIDEO-PLAYER] Using fallback nextEpisodeInfo');
            const nextFile = {
                name: this.nextEpisodeInfo.name,
                absPath: this.nextEpisodeInfo.absPath,
                type: 'video/mp4',
            };
            this.loadVideo(nextFile);
        } else {
            console.log('[DEBUG - VIDEO-PLAYER] No next episode found, trying simple fallback...');
            
                    // SIMPLE FALLBACK: Just find ANY episode in the media library and play it
        if (this.mediaLibrary) {
            this.showOverlayAlert('Searching for episodes...', 3000);
            
            const allEpisodes = [];
            const searchAllEpisodes = (node) => {
                if (node.files && node.files.length > 0) {
                    allEpisodes.push(...node.files);
                }
                if (node.folders && node.folders.length > 0) {
                    for (const folder of node.folders) {
                        searchAllEpisodes(folder);
                    }
                }
            };
            searchAllEpisodes(this.mediaLibrary);
            
            console.log('[DEBUG - VIDEO-PLAYER] Total episodes found in media library:', allEpisodes.length);
            this.showOverlayAlert(`Found ${allEpisodes.length} episodes in library`, 3000);
                
                if (allEpisodes.length > 0) {
                    // Find a different episode than the current one
                    const currentFileName = this.currentFile.name || '';
                    const differentEpisode = allEpisodes.find(ep => ep.name !== currentFileName);
                    
                    if (differentEpisode) {
                        console.log('[DEBUG - VIDEO-PLAYER] Using fallback episode:', differentEpisode.name);
                        console.log('[DEBUG - VIDEO-PLAYER] Episode details:', differentEpisode);
                        const nextFile = {
                            name: differentEpisode.name,
                            absPath: differentEpisode.absPath,
                            relPath: differentEpisode.relPath,
                            path: differentEpisode.path,
                            type: 'video/mp4',
                        };
                        console.log('[DEBUG - VIDEO-PLAYER] About to call loadVideo with:', nextFile);
                        this.showOverlayAlert(`Loading: ${nextFile.name}`, 5000);
                        this.loadVideo(nextFile);
                        return;
                    } else {
                        console.log('[DEBUG - VIDEO-PLAYER] No different episode found, using first available');
                        const firstEpisode = allEpisodes[0];
                        const nextFile = {
                            name: firstEpisode.name,
                            absPath: firstEpisode.absPath,
                            relPath: firstEpisode.relPath,
                            path: firstEpisode.path,
                            type: 'video/mp4',
                        };
                        this.loadVideo(nextFile);
                        return;
                    }
                }
            }
            
            console.log('[DEBUG - VIDEO-PLAYER] No episodes found in media library at all');
            this.showOverlayAlert('No episodes found in media library', 5000);
        }
    }

    // Public method to play a video from a URL
    // Accepts optional mediaItem for robust Watch Later saving
    async playUrl(src, type = 'video/mp4', startTime = 0, mediaItem = null) {
        await this.readyPromise;
        if (!this.vjsPlayer) {
            console.error('[DEBUG - VIDEO-PLAYER] Video.js player not initialized');
            return;
        }
        if (!src) {
            console.error('[DEBUG - VIDEO-PLAYER] No source URL provided');
            return;
        }
        console.log('[DEBUG - VIDEO-PLAYER] 🎬 PLAYURL CALLED - NEW VIDEO REQUEST!');
        console.log('[DEBUG - VIDEO-PLAYER] 🎬 Source URL:', src);
        console.log('[DEBUG - VIDEO-PLAYER] 🎬 URL type:', type);
        console.log('[DEBUG - VIDEO-PLAYER] 🎬 Start time:', startTime);
        console.log('[DEBUG - VIDEO-PLAYER] 🎬 Media item:', mediaItem);
        console.log('[DEBUG - VIDEO-PLAYER] 🎬 Current media item BEFORE update:', this.currentMediaItem);
        
        // FORCE: Clear any existing subtitle data when loading a new video
        this.purgeExistingSubtitles();
        
        // FORCE: Reset audio amplification for new video
        this.resetAmplification();
        
        // FORCE: Ensure audio context is ready for new video
        this.ensureAudioContextReady();
        
        // FORCE: Clear previous video state completely
        if (this.vjsPlayer) {
            try {
                // Pause and clear current video
                this.vjsPlayer.pause();
                this.vjsPlayer.currentTime(0);
                // Clear the source to ensure clean state
                this.vjsPlayer.src('');
                console.log('[DEBUG - VIDEO-PLAYER] Cleared previous video state');
            } catch (error) {
                console.warn('[DEBUG - VIDEO-PLAYER] Error clearing previous video:', error);
            }
        }
        
        // FORCE: Set new media item
        console.log('[DEBUG - VIDEO-PLAYER] 🎬 Setting new media item:', mediaItem);
        this.currentMediaItem = mediaItem;
        console.log('[DEBUG - VIDEO-PLAYER] 🎬 Current media item AFTER update:', this.currentMediaItem);
        
        // Use mediaItem if provided, otherwise create a minimal currentFile
        if (mediaItem) {
            this.currentFile = mediaItem;
            console.log('[DEBUG - VIDEO-PLAYER] 🎬 Set currentFile to mediaItem:', this.currentFile);
        } else {
            this.currentFile = { name: src, path: src };
            console.log('[DEBUG - VIDEO-PLAYER] 🎬 Set currentFile to src:', this.currentFile);
        }
        
        // REMOVE AUTOMATIC SUBTITLE LOADING - USER WILL CLICK BLUE BUTTON
        console.log('[VIDEO-PLAYER] Video loaded - subtitles will be loaded via blue button click');
        
        // Sync with MediaLibraryManager
        if (window.mediaLibraryManager) {
            window.mediaLibraryManager.currentMediaItem = mediaItem;
            window.mediaLibraryManager.currentFile = mediaItem;
            console.log('[DEBUG - VIDEO-PLAYER] Synced mediaItem with MediaLibraryManager');
        }
        
        try {
            // REMOVED AUTOMATIC SUBTITLE LOADING - User will click "Subtitles" button when needed
            console.log('[VIDEO-PLAYER] Video loaded - subtitles will be loaded manually via button click');
            // --- Improved resume logic with better error handling ---
            let didResume = false;
            console.log('[RESUME DEBUG] Requested startTime:', startTime);
            
            const setAndPlay = (evt) => {
                if (didResume) return;
                didResume = true;
                console.log('[RESUME DEBUG] Event fired:', evt ? evt.type : 'manual');
                
                try {
                    // Set the time first
                    this.vjsPlayer.currentTime(startTime);
                    console.log('[RESUME DEBUG] Set currentTime to:', startTime, '| Player currentTime after set:', this.vjsPlayer.currentTime());
                    
                    // Wait a moment before trying to play
                    setTimeout(() => {
                        this.vjsPlayer.play().then(() => {
                            console.log('[RESUME DEBUG] Play successful after resume');
                        }).catch(error => {
                            console.warn('[RESUME DEBUG] Play failed after resume:', error);
                            // Show big play button if auto-play fails
                            const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                            if (bigPlayButton) {
                                bigPlayButton.style.display = 'block';
                            }
                        });
                    }, 100);
                    
                } catch (error) {
                    console.error('[RESUME DEBUG] Error in setAndPlay:', error);
                }
                
                this.vjsPlayer.off('loadedmetadata', setAndPlay);
                this.vjsPlayer.off('canplay', setAndPlay);
            };
            
            if (startTime > 0) {
                this.vjsPlayer.on('loadedmetadata', setAndPlay);
                this.vjsPlayer.on('canplay', setAndPlay);
            }
            console.log('[DEBUG - VIDEO-PLAYER] Setting video source:', { src, type });
            this.vjsPlayer.src({ src, type });
            this.show();
            
            // Add error handling for the video source
            this.vjsPlayer.on('error', (error) => {
                console.error('[DEBUG - VIDEO-PLAYER] Video source error:', error);
                console.error('[DEBUG - VIDEO-PLAYER] Error details:', {
                    code: error.code,
                    message: error.message,
                    type: error.type,
                    currentSrc: this.vjsPlayer.currentSrc(),
                    readyState: this.vjsPlayer.readyState(),
                    networkState: this.vjsPlayer.networkState()
                });
                console.error('[DEBUG - VIDEO-PLAYER] Attempted source:', src);
                // SUPPRESSED: Don't show error message to user since video often loads successfully anyway
                // this.showMessage(`Error loading video. Please check the console for details.`);
            });
            
            // Add metadata loaded event to ensure amplification is reset
            this.vjsPlayer.on('loadedmetadata', () => {
                console.log('[DEBUG - AMPLIFY] Video metadata loaded, ensuring amplification reset');
                this.forceResetAmplificationUI();
            });
            
            // Update episode info header
            await this.updateMovieInfoHeader();
            
            // Start periodic title check to ensure year is always visible
            this.startTitleCheckInterval();
            
            // Improved auto-play handling with better error recovery
            this.vjsPlayer.ready(() => {
                console.log('[DEBUG - VIDEO-PLAYER] Video.js player ready, attempting auto-play');
                
                // Force reset amplification UI after video is ready
                this.forceResetAmplificationUI();
                
                // Hide the big play button immediately
                const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                if (bigPlayButton) {
                    bigPlayButton.style.display = 'none';
                    console.log('[DEBUG - VIDEO-PLAYER] Big play button hidden');
                }
                
                // ALWAYS attempt auto-play
                console.log('[DEBUG - VIDEO-PLAYER] Starting auto-play...');
                    this.vjsPlayer.play().then(() => {
                        console.log('[DEBUG - VIDEO-PLAYER] Auto-play successful');
                    }).catch(error => {
                    console.warn('[DEBUG - VIDEO-PLAYER] Auto-play failed:', error);
                    // Show big play button if auto-play fails
                    const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                        if (bigPlayButton) {
                            bigPlayButton.style.display = 'block';
                        console.log('[DEBUG - VIDEO-PLAYER] Big play button shown due to auto-play failure');
                        }
                    this.showMessage('Video will start automatically when ready');
                    });
            });
            
            // Add error handling for video loading
            this.vjsPlayer.on('error', (error) => {
                console.error('[DEBUG - VIDEO-PLAYER] Video loading error:', error);
                console.error('[DEBUG - VIDEO-PLAYER] Error details:', {
                    code: error.target?.error?.code,
                    message: error.target?.error?.message,
                    src: this.vjsPlayer.currentSrc(),
                    readyState: this.vjsPlayer.readyState(),
                    networkState: this.vjsPlayer.networkState()
                });
                const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                if (bigPlayButton) {
                    bigPlayButton.style.display = 'block';
                }
                // SUPPRESSED: Don't show error message to user since video often loads successfully anyway
                // this.showMessage('Error loading video. Please check the console for details.');
            });
            
            // Hide big play button when video starts playing
            this.vjsPlayer.on('play', () => {
                console.log('[DEBUG - VIDEO-PLAYER] Play event fired, hiding big play button');
                const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                if (bigPlayButton) {
                    bigPlayButton.style.display = 'none';
                    console.log('[DEBUG - VIDEO-PLAYER] Big play button hidden');
                }
            });
            
            // Add pause event handler for Watch Later (same as in loadVideo)
            this.vjsPlayer.off('pause'); // Remove any previous handler to avoid duplicates
            this.vjsPlayer.on('pause', () => {
                console.log('🎬 [VIDEO-PLAYER] Pause event triggered (playUrl)');
                
                // Show big play button when paused
                const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                if (bigPlayButton) {
                    bigPlayButton.style.display = 'block';
                    console.log('[DEBUG - VIDEO-PLAYER] Big play button shown on pause');
                }
                
                // REMOVED: Auto-save on pause - this was causing unwanted Watch Later saves
                // Only the "Save for Later" button should save progress
            });
            
            // Handle resume time if specified
            if (startTime > 0) {
                console.log('[DEBUG - VIDEO-PLAYER] Resume time specified:', startTime);
                this.vjsPlayer.on('canplay', () => {
                    this.vjsPlayer.currentTime(startTime);
                    console.log('[DEBUG - VIDEO-PLAYER] Set currentTime to:', startTime);
                    this.vjsPlayer.off('canplay');
                });
            }
            // Fetch media library and set up Up Next logic
            this.fetchMediaLibrary().then(() => this.setupUpNextAndSkipIntro());
        } catch (error) {
            console.error('🎬 [VIDEO-PLAYER] Error playing URL:', error);
            // Show big play button on error
            if (this.vjsPlayer) {
                        const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                        if (bigPlayButton) {
                            bigPlayButton.style.display = 'block';
                        }
            }
            // SUPPRESSED: Don't show error message to user since video often loads successfully anyway
            // this.showMessage('Error loading video. Please try again.');
        }
    }

    // Enhanced subtitle loading method with .srt support - looks in same folder as movie
        async loadSubtitles(videoSrc) {
        // Clear any existing subtitle data first
        this.purgeExistingSubtitles();
        

        try {
            console.log('[VIDEO-PLAYER] Starting subtitle search for videoSrc:', videoSrc);
            console.log('[VIDEO-PLAYER] loadSubtitles function called!');
            
            // Remove any existing subtitle tracks
            const existingTracks = this.video.querySelectorAll('track[data-autosub]');
            existingTracks.forEach(track => track.remove());

            // Use the actual media item data instead of parsing the API URL
            let videoPath = '';
            let videoFileName = '';
            
            // Get the actual file path from the current media item (this has the correct path with quality tags)
            if (this.currentMediaItem && this.currentMediaItem.absPath) {
                videoPath = this.currentMediaItem.absPath;
                videoFileName = this.currentMediaItem.absPath.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
                console.log('[VIDEO-PLAYER] Using absPath from currentMediaItem:', videoPath);
            } else if (this.currentMediaItem && this.currentMediaItem.path) {
                // Convert relative path to absolute
                if (this.currentMediaItem.path.startsWith('movies/') || this.currentMediaItem.path.startsWith('MOVIES/')) {
                    videoPath = `S:/MEDIA/${this.currentMediaItem.path}`;
                    console.log('[VIDEO-PLAYER] Converted relative movie path to absolute:', videoPath);
                } else if (this.currentMediaItem.path.startsWith('tv-shows/') || this.currentMediaItem.path.startsWith('TV-SHOWS/')) {
                    videoPath = `S:/MEDIA/${this.currentMediaItem.path}`;
                    console.log('[VIDEO-PLAYER] Converted relative TV show path to absolute:', videoPath);
                } else {
                    videoPath = this.currentMediaItem.path;
                    console.log('[VIDEO-PLAYER] Using path as-is:', videoPath);
                }
                videoFileName = videoPath.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
            } else {
                // Fallback to parsing the API URL (but this won't have quality tags)
                if (videoSrc.includes('?path=')) {
                    const urlParams = new URLSearchParams(videoSrc.split('?')[1]);
                    const fullPath = decodeURIComponent(urlParams.get('path') || '');
                    videoPath = fullPath;
                    videoFileName = fullPath.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
                    console.log('[VIDEO-PLAYER] Fallback: Extracted from URL params - fullPath:', fullPath);
                } else {
                    videoPath = videoSrc;
                    videoFileName = videoSrc.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
                    console.log('[VIDEO-PLAYER] Fallback: Using videoSrc as-is:', videoPath);
                }
            }

            console.log('[VIDEO-PLAYER] Looking for subtitles for:', videoFileName);
            console.log('[VIDEO-PLAYER] Video path:', videoPath);
            console.log('[VIDEO-PLAYER] Video filename:', videoFileName);
            console.log('[VIDEO-PLAYER] DEBUG: Full absPath:', this.currentMediaItem?.absPath);
            console.log('[VIDEO-PLAYER] DEBUG: Extracted filename:', videoFileName);

            // Try to find subtitle files in the same folder as the movie
            const subtitleFound = await this.findSubtitlesInSameFolder(videoPath, videoFileName);
            
            if (!subtitleFound) {
                            console.log('[VIDEO-PLAYER] No subtitle files found in same folder');
            console.log('[VIDEO-PLAYER] DEBUG: Checked all subtitle extensions but found nothing');
            console.log('[VIDEO-PLAYER] DEBUG: Make sure your .srt file is named exactly like your movie file');
            // Show option to search for subtitles
            this.showSubtitleSearchOption(videoFileName);
            } else {
                console.log('[VIDEO-PLAYER] Subtitle found and loaded successfully!');
                // Setup proper Video.js subtitle display
                console.log('[VIDEO-PLAYER] Setting up Video.js subtitle display...');
                // Note: Video.js subtitle display is handled automatically when tracks are added
            }

        } catch (error) {
            console.error('[VIDEO-PLAYER] Error loading subtitles:', error);
        }
    }

    // Purge existing subtitle data to prevent conflicts
    purgeExistingSubtitles() {
        console.log('[VIDEO-PLAYER] Purging existing subtitle data...');
        
        // Clear subtitle cues array
        if (this.subtitleCues) {
            this.subtitleCues = [];
            console.log('[VIDEO-PLAYER] Cleared subtitle cues array');
        }
        
        // Remove existing subtitle tracks from Video.js
        if (this.vjsPlayer) {
            const tracks = this.vjsPlayer.textTracks();
            for (let i = tracks.length - 1; i >= 0; i--) {
                const track = tracks[i];
                if (track.kind === 'subtitles' || track.kind === 'captions') {
                    console.log('[VIDEO-PLAYER] Removing existing subtitle track:', track.label);
                    this.vjsPlayer.removeRemoteTextTrack(track);
                }
            }
        }
        
        // Clear ALL possible subtitle overlay content
        const overlays = [
            '.simple-subtitle-overlay',
            '.custom-subtitle-overlay',
            '.test-subtitle-overlay',
            '.video-subtitle-text',
            '.subtitle-text',
            '.subtitle-test-text'
        ];
        
        overlays.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.textContent = '';
                    element.style.display = 'none';
                    console.log('[VIDEO-PLAYER] Cleared overlay element:', selector);
                }
            });
        });
        
        // Also clear any subtitle text that might be in the main overlay
        const mainOverlay = this.container.querySelector('.simple-subtitle-overlay');
        if (mainOverlay) {
            mainOverlay.textContent = '';
            mainOverlay.style.display = 'none';
            console.log('[VIDEO-PLAYER] Cleared main subtitle overlay');
        }
        
        // Clear any cached subtitle data
        if (this.subtitleOverlay) {
            this.subtitleOverlay = null;
        }
        
        // Remove any timeupdate handlers for subtitles
        if (this.subtitleTimeUpdateHandler && this.vjsPlayer) {
            this.vjsPlayer.off('timeupdate', this.subtitleTimeUpdateHandler);
            console.log('[VIDEO-PLAYER] Removed subtitle timeupdate handler');
        }
        
        // Reset subtitle state
        this.subtitlesEnabled = false;
        this.subtitleTimeUpdateHandler = null;
        
        // Clear any subtitle button state
        const subtitleButton = this.vjsPlayer ? this.vjsPlayer.controlBar.getChild('SubtitleButton') : null;
        if (subtitleButton) {
            subtitleButton.subtitleEnabled = false;
            subtitleButton.updateIcon();
            console.log('[VIDEO-PLAYER] Reset subtitle button state');
        }
        
        console.log('[VIDEO-PLAYER] Complete subtitle purge finished');
    }

    // Find subtitle files in the same folder as the movie
    async findSubtitlesInSameFolder(videoPath, videoFileName) {
        try {
            // Handle both Windows and Unix path separators
            const pathSeparator = videoPath.includes('\\') ? '\\' : '/';
            const lastSeparatorIndex = videoPath.lastIndexOf(pathSeparator);
            
            if (lastSeparatorIndex === -1) {
                console.log('[VIDEO-PLAYER] No path separator found in:', videoPath);
                return false;
            }
            
            // Extract the directory path from the video path
            const videoDir = videoPath.substring(0, lastSeparatorIndex + 1);
            const baseName = videoFileName;
            
            console.log('[VIDEO-PLAYER] Looking in directory:', videoDir);
            console.log('[VIDEO-PLAYER] Base name:', baseName);
            console.log('[VIDEO-PLAYER] Path separator detected:', pathSeparator);
            console.log('[VIDEO-PLAYER] DEBUG: Full video path:', videoPath);
            console.log('[VIDEO-PLAYER] DEBUG: Video file name:', videoFileName);
            console.log('[VIDEO-PLAYER] DEBUG: Directory path extracted:', videoDir);

            // Try multiple subtitle file extensions (prioritize .srt)
            const subtitleExtensions = ['.srt', '.vtt', '.sub'];
            
            console.log('[VIDEO-PLAYER] DEBUG: Will try these subtitle extensions:', subtitleExtensions);
            
            for (const ext of subtitleExtensions) {
                // Try the base name first (without numbers)
                const subtitlePath = `${videoDir}${baseName}${ext}`;
                const subtitleUrl = `/api/subtitles?path=${encodeURIComponent(subtitlePath)}`;
                
                console.log('[VIDEO-PLAYER] Trying subtitle path:', subtitlePath);
                console.log('[VIDEO-PLAYER] Subtitle URL:', subtitleUrl);
                console.log('[VIDEO-PLAYER] DEBUG: Checking if file exists at:', subtitlePath);
                
                try {
                    const response = await fetch(subtitleUrl, { method: 'HEAD' });
                    console.log('[VIDEO-PLAYER] Response status:', response.status);
                    console.log('[VIDEO-PLAYER] DEBUG: Response headers:', response.headers);
                    
                    if (response.ok) {
                        console.log('[VIDEO-PLAYER] Found subtitle file:', subtitlePath);
                        console.log('[VIDEO-PLAYER] DEBUG: Subtitle file exists and is accessible');
                        
                        // For .srt files, we need to convert them to .vtt format for web compatibility
                        if (ext === '.srt') {
                            await this.convertSrtToVtt(subtitleUrl, baseName);
                        }
                        
                        // Use the working force script approach - add track directly to Video.js
                        if (this.vjsPlayer) {
                            this.vjsPlayer.ready(() => {
                                // Add track to Video.js player using the working method
                                const videojsTrack = this.vjsPlayer.addRemoteTextTrack({
                                    src: subtitleUrl,
                                    kind: 'subtitles',
                                    srclang: 'en',
                                    label: `English`,
                                    default: true
                                }, false);
                                
                                console.log('[VIDEO-PLAYER] Added track to Video.js:', videojsTrack);
                                
                                // Enable the track immediately (this is the key!)
                                videojsTrack.mode = 'showing';
                                console.log('[VIDEO-PLAYER] Enabled subtitle track in Video.js');
                                
                                // Update subtitle button state and icon
                                const subtitleButton = this.vjsPlayer.controlBar.getChild('SubtitleButton');
                                if (subtitleButton) {
                                    subtitleButton.subtitleEnabled = true;
                                    subtitleButton.updateIcon();
                                    console.log('[VIDEO-PLAYER] Updated subtitle button to ACTIVE state');
                                }
                                
                                // Apply default subtitle styling
                                this.applySubtitleStyling('small bold outline');
                                
                                // Set up the subtitle display system
                                this.subtitlesEnabled = true;
                                
                                // Create or get the subtitle overlay
                                let overlay = this.container.querySelector('.simple-subtitle-overlay');
                                if (!overlay) {
                                    overlay = this.createSimpleSubtitleOverlay();
                                }
                                this.subtitleOverlay = overlay;
                                
                                // Load the actual subtitle content and set up sync
                                this.loadSubtitleContentAndSync(subtitleUrl);
                                
                                // Show success message
                                if (overlay) {
                                    overlay.textContent = '🎬 Subtitles Loaded Successfully!';
                                    overlay.style.display = 'block';
                                    
                                    // Hide the message after 3 seconds
                                    setTimeout(() => {
                                        overlay.style.display = 'none';
                                    }, 3000);
                                }
                    });
                } else {
                            // If Video.js isn't ready, wait for it
                            const checkVideoJS = () => {
                                if (this.vjsPlayer) {
                                    this.vjsPlayer.ready(() => {
                                        // Add track to Video.js player
                                        const videojsTrack = this.vjsPlayer.addRemoteTextTrack({
                                            src: subtitleUrl,
                                            kind: 'subtitles',
                                            srclang: 'en',
                                            label: `English`,
                                            default: true
                                        }, false);
                                        
                                        console.log('[VIDEO-PLAYER] Added track to Video.js:', videojsTrack);
                                        
                                        // Enable the track
                                        videojsTrack.mode = 'showing';
                                        console.log('[VIDEO-PLAYER] Enabled subtitle track in Video.js');
                                        
                                        // Update subtitle button state and icon
                                        const subtitleButton = this.vjsPlayer.controlBar.getChild('SubtitleButton');
                                        if (subtitleButton) {
                                            subtitleButton.subtitleEnabled = true;
                                            subtitleButton.updateIcon();
                                            console.log('[VIDEO-PLAYER] Updated subtitle button to ACTIVE state (fallback)');
                                        }
                                        
                                        // Apply default subtitle styling
                                        this.applySubtitleStyling('small bold outline');
                                    });
                                } else {
                                    setTimeout(checkVideoJS, 100);
                                }
                            };
                            checkVideoJS();
                        }
                        
                        return true; // Subtitle found and loaded
                    } else {
                        console.log('[VIDEO-PLAYER] Subtitle file not found (status:', response.status, '):', subtitlePath);
                    }
        } catch (error) {
                    console.log('[VIDEO-PLAYER] Error checking subtitle file:', subtitlePath, error);
                }
            }
            
            console.log('[VIDEO-PLAYER] No subtitle files found for:', baseName);
            
            // Try alternative naming patterns for subtitle files
            console.log('[VIDEO-PLAYER] Trying alternative subtitle naming patterns...');
            
            // Try with numbers at the end (like .srt1, .srt2)
            for (const ext of ['.srt', '.vtt']) {
                for (let i = 1; i <= 5; i++) {
                    const altSubtitlePath = `${videoDir}${baseName}${i}${ext}`;
                    const altSubtitleUrl = `/api/subtitles?path=${encodeURIComponent(altSubtitlePath)}`;
                    
                    console.log('[VIDEO-PLAYER] Trying alternative path:', altSubtitlePath);
                    
                    try {
                        const response = await fetch(altSubtitleUrl, { method: 'HEAD' });
                        if (response.ok) {
                            console.log('[VIDEO-PLAYER] Found alternative subtitle file:', altSubtitlePath);
                            
                            // For .srt files, we need to convert them to .vtt format for web compatibility
                            if (ext === '.srt') {
                                await this.convertSrtToVtt(altSubtitleUrl, baseName);
                            }
                            
                            // Add subtitle track to video element
                            const track = document.createElement('track');
                            track.kind = 'subtitles';
                            track.src = altSubtitleUrl;
                            track.srclang = 'en';
                            track.label = `English`;
                            track.default = true; // Make first track default
                            track.setAttribute('data-autosub', '1');
                            
                            this.video.appendChild(track);
                            
                            // Apply default subtitle styling
                            this.applySubtitleStyling('small bold outline');
                            
                            // Update subtitle button if Video.js player is ready
            if (this.vjsPlayer) {
                                this.vjsPlayer.ready(() => {
                                    const subtitleButton = this.vjsPlayer.controlBar.getChild('SubtitleButton');
                                    if (subtitleButton) {
                                        subtitleButton.subtitleEnabled = true;
                                        subtitleButton.updateIcon();
                                        console.log('[VIDEO-PLAYER] Updated subtitle button to ACTIVE state (alternative pattern)');
                                    }
                                    
                                    // Add track to Video.js player
                                    const videojsTrack = this.vjsPlayer.addRemoteTextTrack({
                                        src: altSubtitleUrl,
                                        kind: 'subtitles',
                                        srclang: 'en',
                                        label: `English`,
                                        default: true
                                    }, false);
                                    
                                    console.log('[VIDEO-PLAYER] Added track to Video.js:', videojsTrack);
                                    
                                    // Enable the track
                                    videojsTrack.mode = 'showing';
                                    console.log('[VIDEO-PLAYER] Enabled subtitle track in Video.js');
                                });
                            }
                            
                            return true; // Subtitle found and loaded
                        }
                    } catch (error) {
                        console.log('[VIDEO-PLAYER] Error checking alternative subtitle file:', altSubtitlePath, error);
                    }
                }
            }
            
            return false; // No subtitle found
        } catch (error) {
            console.error('[VIDEO-PLAYER] Error finding subtitles in same folder:', error);
            return false;
        }
    }

    // Test function to manually check subtitle loading
    testSubtitleLoading() {
        console.log('[VIDEO-PLAYER] Testing subtitle loading...');
        
        if (!this.currentFile) {
            console.log('[VIDEO-PLAYER] No current file loaded');
            return;
        }
        
        console.log('[VIDEO-PLAYER] Current file:', this.currentFile);
        console.log('[VIDEO-PLAYER] Video source:', this.video?.src);
        
        // Check if Video.js player has subtitle tracks
        if (this.vjsPlayer) {
            const tracks = this.vjsPlayer.textTracks();
            console.log('[VIDEO-PLAYER] Video.js text tracks:', tracks);
            console.log('[VIDEO-PLAYER] Number of text tracks:', tracks.length);
            
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                console.log(`[VIDEO-PLAYER] Track ${i}:`, {
                    kind: track.kind,
                    mode: track.mode,
                    label: track.label,
                    language: track.language,
                    src: track.src
                });
            }
        }
        
        // Try to load subtitles for current video
        if (this.video?.src) {
            this.loadSubtitles(this.video.src);
        }
    }

    // Manual subtitle test with specific path
    testSubtitleWithPath(videoPath) {
        console.log('[VIDEO-PLAYER] Manual subtitle test with path:', videoPath);
        
        // Extract filename from path
        const pathSeparator = videoPath.includes('\\') ? '\\' : '/';
        const fileName = videoPath.split(pathSeparator).pop();
        const baseName = fileName.replace(/\.[^.]+$/, '');
        const dirPath = videoPath.substring(0, videoPath.lastIndexOf(pathSeparator) + 1);
        
        console.log('[VIDEO-PLAYER] Extracted info:');
        console.log('  - Directory:', dirPath);
        console.log('  - Base name:', baseName);
        console.log('  - Full filename:', fileName);
        
        // Test subtitle file paths
        const subtitleExtensions = ['.srt', '.vtt', '.sub'];
        for (const ext of subtitleExtensions) {
            for (let i = 1; i <= 5; i++) {
                const subtitlePath = `${dirPath}${baseName}${i}${ext}`;
                console.log(`[VIDEO-PLAYER] Testing subtitle path: ${subtitlePath}`);
                
                // Test if file exists via server
                const subtitleUrl = `/api/subtitles?path=${encodeURIComponent(subtitlePath)}`;
                fetch(subtitleUrl, { method: 'HEAD' })
                    .then(response => {
                        console.log(`[VIDEO-PLAYER] ${subtitlePath} - Status: ${response.status}`);
                        if (response.ok) {
                            console.log(`[VIDEO-PLAYER] ✅ FOUND: ${subtitlePath}`);
                        }
                    })
                    .catch(error => {
                        console.log(`[VIDEO-PLAYER] ❌ ERROR: ${subtitlePath} - ${error.message}`);
                    });
            }
        }
    }

    // Convert .srt to .vtt format for web compatibility
    async convertSrtToVtt(srtUrl, videoFileName) {
        try {
            const response = await fetch(srtUrl);
            const srtContent = await response.text();
            
            // Convert SRT to VTT format
            const vttContent = this.srtToVtt(srtContent);
            
            // Create a blob URL for the converted VTT
            const blob = new Blob([vttContent], { type: 'text/vtt' });
            const vttUrl = URL.createObjectURL(blob);
            
            // Update the track source to use the converted VTT
            const track = this.video.querySelector('track[data-autosub]');
            if (track) {
                track.src = vttUrl;
            }
            
            console.log('[VIDEO-PLAYER] Converted .srt to .vtt format');
        } catch (error) {
            console.error('[VIDEO-PLAYER] Error converting .srt to .vtt:', error);
        }
    }

    // Convert SRT format to VTT format
    srtToVtt(srtContent) {
        console.log('[VIDEO-PLAYER] Converting SRT to VTT format...');
        console.log('[VIDEO-PLAYER] Original SRT content length:', srtContent.length);
        
        // Add VTT header
        let vttContent = 'WEBVTT\n\n';
        
        // Convert SRT timestamps to VTT format
        const lines = srtContent.split('\n');
        let i = 0;
        let cueCount = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Skip empty lines and subtitle numbers
            if (line === '' || /^\d+$/.test(line)) {
                i++;
                continue;
            }
            
            // Check if this line contains timestamps
            if (line.includes('-->')) {
                // Convert SRT timestamp format to VTT format
                const timestampLine = line
                    .replace(/,/g, '.')  // Replace commas with dots
                    .replace(/\s+/g, ' ') // Normalize spaces
                    .trim();
                
                // Validate timestamp format
                if (timestampLine.match(/^\d{2}:\d{2}:\d{2}\.\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}\.\d{3}$/)) {
                    vttContent += timestampLine + '\n';
                    i++;
                    
                    // Add subtitle text
                    let subtitleText = '';
                    while (i < lines.length && lines[i].trim() !== '') {
                        subtitleText += lines[i].trim() + '\n';
                        i++;
                    }
                    
                    if (subtitleText.trim()) {
                        vttContent += subtitleText.trim() + '\n\n';
                        cueCount++;
                    }
                } else {
                    console.warn('[VIDEO-PLAYER] Invalid timestamp format:', timestampLine);
                    i++;
                }
            } else {
                i++;
            }
        }
        
        console.log('[VIDEO-PLAYER] Converted to VTT format with', cueCount, 'cues');
        console.log('[VIDEO-PLAYER] VTT content length:', vttContent.length);
        
        return vttContent;
    }

    // Create subtitle overlay for displaying actual subtitle content
    createSubtitleOverlay() {
        console.log('[VIDEO-PLAYER] Creating subtitle overlay...');
        
        // Remove existing overlay if any
        const existingOverlay = this.container.querySelector('.custom-subtitle-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
            console.log('[VIDEO-PLAYER] Removed existing subtitle overlay');
        }
        
        // Create new subtitle overlay
        const subtitleOverlay = document.createElement('div');
        subtitleOverlay.className = 'custom-subtitle-overlay';
        subtitleOverlay.style.cssText = `
            position: absolute;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            z-index: 1000000000;
            text-align: center;
            max-width: 80%;
            display: block;
            pointer-events: none;
        `;
        
        // Add subtitle text container
        const subtitleText = document.createElement('div');
        subtitleText.className = 'subtitle-text';
        subtitleText.textContent = '🎬 SUBTITLE OVERLAY CREATED - Testing display...';
        subtitleOverlay.appendChild(subtitleText);
        
        this.container.appendChild(subtitleOverlay);
        
        console.log('[VIDEO-PLAYER] Subtitle overlay created and added to container');
        console.log('[VIDEO-PLAYER] Container element:', this.container);
        console.log('[VIDEO-PLAYER] Overlay element:', subtitleOverlay);
        console.log('[VIDEO-PLAYER] Overlay display style:', subtitleOverlay.style.display);
        
        // Show the overlay immediately for testing
        subtitleOverlay.style.display = 'block';
        
        // Hide after 5 seconds for testing
        setTimeout(() => {
            subtitleOverlay.style.display = 'none';
            console.log('[VIDEO-PLAYER] Test overlay hidden after 5 seconds');
        }, 5000);
        
        // Listen for subtitle cues and update the overlay
        if (this.vjsPlayer) {
            // Listen for subtitle track changes
            this.vjsPlayer.on('texttrackchange', () => {
                const tracks = this.vjsPlayer.textTracks();
                let subtitleEnabled = false;
                
                for (let i = 0; i < tracks.length; i++) {
                    const track = tracks[i];
                    if (track.mode === 'showing') {
                        subtitleEnabled = true;
                        break;
                    }
                }
                
                if (subtitleEnabled) {
                    subtitleOverlay.style.display = 'block';
                    console.log('[VIDEO-PLAYER] Subtitles enabled, showing overlay');
                } else {
                    subtitleOverlay.style.display = 'none';
                    console.log('[VIDEO-PLAYER] Subtitles disabled, hiding overlay');
                }
            });
            
            // Listen for time updates to check for active cues
            this.vjsPlayer.on('timeupdate', () => {
                const tracks = this.vjsPlayer.textTracks();
                const currentTime = this.vjsPlayer.currentTime();
                let foundActiveCue = false;
                
                for (let i = 0; i < tracks.length; i++) {
                    const track = tracks[i];
                    if (track.mode === 'showing' && track.cues) {
                        for (let j = 0; j < track.cues.length; j++) {
                            const cue = track.cues[j];
                            if (currentTime >= cue.startTime && currentTime <= cue.endTime) {
                                subtitleText.textContent = cue.text;
                                subtitleOverlay.style.display = 'block';
                                foundActiveCue = true;
                                console.log('[VIDEO-PLAYER] Displaying subtitle:', cue.text);
                                break;
                            }
                        }
                        if (foundActiveCue) break;
                    }
                }
                
                if (!foundActiveCue) {
                    subtitleOverlay.style.display = 'none';
                }
            });
            
            // Also listen for cue changes directly
            this.vjsPlayer.on('cuechange', () => {
                const tracks = this.vjsPlayer.textTracks();
                for (let i = 0; i < tracks.length; i++) {
                    const track = tracks[i];
                    if (track.mode === 'showing' && track.activeCues && track.activeCues.length > 0) {
                        const activeCue = track.activeCues[0];
                        subtitleText.textContent = activeCue.text;
                        subtitleOverlay.style.display = 'block';
                        console.log('[VIDEO-PLAYER] Cue change - displaying:', activeCue.text);
                        return;
                    }
                }
                subtitleOverlay.style.display = 'none';
            });
        }
        
        console.log('[VIDEO-PLAYER] Subtitle overlay creation completed');
    }
    
    // Simple subtitle overlay that actually works
    createSimpleSubtitleOverlay() {
        console.log('[VIDEO-PLAYER] Creating simple subtitle overlay...');
        
        // Remove any existing overlay
        const existingOverlay = this.container.querySelector('.simple-subtitle-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
        
        // Create a simple, visible subtitle overlay
        const overlay = document.createElement('div');
        overlay.className = 'simple-subtitle-overlay';
        overlay.style.cssText = `
            position: absolute;
            bottom: 100px; /* Moved down 20px from 120px */
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            z-index: 1000000000;
            text-align: center;
            max-width: 80%;
            display: none;
            pointer-events: auto; /* Allow targeting in DevTools */
        `;
        
        overlay.textContent = '🎬 SUBTITLES READY - Click to load';
        
        this.container.appendChild(overlay);
        
        console.log('[VIDEO-PLAYER] Simple subtitle overlay created (no automatic loading)');
        
        return overlay;
    }
    
    // Load actual subtitle content and display it
    async loadAndDisplaySubtitles(overlay) {
        console.log('[VIDEO-PLAYER] Loading actual subtitle content...');
        
        try {
            // Test multiple possible subtitle paths
            const possiblePaths = [
                'S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p]1.srt',
                'S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p]2.srt',
                'S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p].srt',
                'S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p]1.vtt',
                'S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p].vtt'
            ];
            
            // Show loading message
            overlay.textContent = '🎬 Loading Subtitles...';
            overlay.style.display = 'block';
            
            let foundSubtitle = false;
            
            for (const subtitlePath of possiblePaths) {
                const subtitleUrl = `/api/subtitles?path=${encodeURIComponent(subtitlePath)}`;
                
                try {
                    const response = await fetch(subtitleUrl);
                    
                    if (response.ok) {
                        const srtContent = await response.text();
                        
                        // Parse all subtitle cues
                        const cues = this.parseSrtContent(srtContent);
                        
                        if (cues.length > 0) {
                            // Store cues for synchronized display
                            this.subtitleCues = cues;
                            this.subtitleOverlay = overlay;
                            
                            // Set up time update listener for synchronized display
                            this.setupSubtitleSync();
                            
                            overlay.textContent = '🎬 Subtitles Active (' + cues.length + ' cues)';
                            foundSubtitle = true;
                            break;
                        }
                    }
        } catch (error) {
                    console.error('[VIDEO-PLAYER] Error loading subtitles:', error);
                }
            }
            
            if (!foundSubtitle) {
                overlay.textContent = '🎬 No Subtitles Found';
                console.log('[VIDEO-PLAYER] No subtitle files found in any of the tested paths');
            }
        } catch (error) {
            overlay.textContent = '🎬 Error Loading Subtitles';
            console.error('[VIDEO-PLAYER] Error loading subtitles:', error);
        }
    }
    
    // Parse SRT content into cue objects
    parseSrtContent(srtContent) {
        const cues = [];
        const lines = srtContent.split('\n');
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i].trim();
            
            // Skip empty lines
            if (line === '') {
                i++;
                continue;
            }
            
            // Check if this is a cue number
            if (/^\d+$/.test(line)) {
                i++; // Skip the number
                
                // Get the time line
                if (i < lines.length) {
                    const timeLine = lines[i].trim();
                    i++;
                    
                    // Parse start and end times
                    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                    
                    if (timeMatch) {
                        const startTime = this.parseSrtTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                        const endTime = this.parseSrtTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
                        
                        // Collect subtitle text
                        let text = '';
                        while (i < lines.length && lines[i].trim() !== '') {
                            text += lines[i].trim() + ' ';
                            i++;
                        }
                        
                        if (text.trim()) {
                            cues.push({
                                start: startTime,
                                end: endTime,
                                text: text.trim()
                            });
                        }
                    }
                }
            } else {
                i++;
            }
        }
        
        return cues;
    }
    
    // Parse SRT time format (HH:MM:SS,mmm) to seconds
    parseSrtTime(hours, minutes, seconds, milliseconds) {
        return parseInt(hours) * 3600 + 
               parseInt(minutes) * 60 + 
               parseInt(seconds) + 
               parseInt(milliseconds) / 1000;
    }
    
    // Set up subtitle synchronization
    setupSubtitleSync() {
        if (!this.vjsPlayer || !this.subtitleCues) return;
        
        console.log('[VIDEO-PLAYER] Setting up subtitle synchronization...');
        
        // Remove existing timeupdate listener if any
        if (this.subtitleTimeUpdateHandler) {
            this.vjsPlayer.off('timeupdate', this.subtitleTimeUpdateHandler);
        }
        
        // Create new timeupdate handler
        this.subtitleTimeUpdateHandler = () => {
            this.updateSubtitleDisplay();
        };
        
        // Add timeupdate listener
        this.vjsPlayer.on('timeupdate', this.subtitleTimeUpdateHandler);
        
        console.log('[VIDEO-PLAYER] Subtitle sync setup complete');
    }
    
    // Update subtitle display based on current video time
    updateSubtitleDisplay() {
        if (!this.subtitleOverlay || !this.subtitleCues || !this.vjsPlayer) {
            // console.log('[DEBUG] updateSubtitleDisplay - Missing required components:', {
            //     overlay: !!this.subtitleOverlay,
            //     cues: !!this.subtitleCues,
            //     player: !!this.vjsPlayer
            // });
            return;
        }
        
        // Check if subtitles are enabled
        if (!this.subtitlesEnabled) {
            // Subtitles are disabled, don't update anything
            return;
        }
        
        const currentTime = this.vjsPlayer.currentTime();
        // console.log('[DEBUG] updateSubtitleDisplay - Current time:', currentTime);
        
        // Find the current cue
        const currentCue = this.subtitleCues.find(cue => 
            currentTime >= cue.start && currentTime <= cue.end
        );
        
        if (currentCue) {
            // console.log('[DEBUG] updateSubtitleDisplay - Found cue:', currentCue.text);
            this.subtitleOverlay.innerHTML = currentCue.text;
            this.subtitleOverlay.style.display = 'block';
        } else {
            // console.log('[DEBUG] updateSubtitleDisplay - No cue found for current time');
            // Don't hide the overlay, just clear the text
            this.subtitleOverlay.innerHTML = '';
            // Keep the overlay visible but empty
        }
    }

    // Test function to manually show subtitle text
    testSubtitleDisplay() {
        console.log('[TEST] Testing subtitle display...');
        
        const overlay = this.container.querySelector('.simple-subtitle-overlay');
        if (overlay) {
            overlay.textContent = '🎬 TEST SUBTITLE TEXT - This should be visible!';
            overlay.style.display = 'block';
            console.log('[TEST] Set test subtitle text');
        } else {
            console.log('[TEST] No subtitle overlay found');
        }
    }
    
    // Test function to manually load subtitles for current video
    testLoadSubtitlesForCurrentVideo() {
        console.log('[TEST] Testing subtitle loading for current video...');
        
        // Get the actual file path (not blob URL) for subtitle loading
        let videoPath = null;
        
        // First try to get the stored file path
        if (this.currentFile && this.currentFile.absPath) {
            videoPath = this.currentFile.absPath;
            console.log('[TEST] Using stored file path:', videoPath);
        } else if (this.currentMediaItem && this.currentMediaItem.path) {
            videoPath = this.currentMediaItem.path;
            console.log('[TEST] Using media item path:', videoPath);
        } else {
            // Fallback: try to get from MediaLibraryManager
            if (window.mediaLibraryManager && window.mediaLibraryManager.currentMediaItem) {
                videoPath = window.mediaLibraryManager.currentMediaItem.path;
                console.log('[TEST] Using MediaLibraryManager path:', videoPath);
            }
        }
        
        if (videoPath) {
            this.loadSubtitles(videoPath);
        } else {
            console.log('[TEST] No file path found for subtitle loading');
        }
    }
    
    // Load subtitle content and set up synchronization
    async loadSubtitleContentAndSync(subtitleUrl) {
        console.log('[VIDEO-PLAYER] Loading subtitle content and setting up sync...');
        
        try {
            // Fetch the subtitle content
            const response = await fetch(subtitleUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch subtitle: ${response.status}`);
            }
            
            const srtContent = await response.text();
            console.log('[VIDEO-PLAYER] Fetched subtitle content, length:', srtContent.length);
            
            // Parse the SRT content into cues
            this.subtitleCues = this.parseSrtContent(srtContent);
            console.log('[VIDEO-PLAYER] Parsed', this.subtitleCues.length, 'subtitle cues');
            
            // Set up subtitle synchronization
            this.setupSubtitleSync();
            
            console.log('[VIDEO-PLAYER] Subtitle content loaded and sync set up');
            
        } catch (error) {
            console.error('[VIDEO-PLAYER] Error loading subtitle content:', error);
        }
    }
    
    // Test function to show actual subtitle cues
    testSubtitleCues() {
        console.log('[TEST] Testing subtitle cues...');
        
        if (this.subtitleCues && this.subtitleCues.length > 0) {
            console.log('[TEST] Found', this.subtitleCues.length, 'subtitle cues');
            
            // Show first few cues
            for (let i = 0; i < Math.min(5, this.subtitleCues.length); i++) {
                const cue = this.subtitleCues[i];
                console.log(`[TEST] Cue ${i}:`, {
                    start: cue.start,
                    end: cue.end,
                    text: cue.text
                });
            }
            
            // Show current time and find matching cue
            if (this.vjsPlayer) {
                const currentTime = this.vjsPlayer.currentTime();
                console.log('[TEST] Current video time:', currentTime);
                
                const currentCue = this.subtitleCues.find(cue => 
                    currentTime >= cue.start && currentTime <= cue.end
                );
                
                if (currentCue) {
                    console.log('[TEST] Found matching cue for current time:', currentCue.text);
                    
                    // Show it in the overlay
                    const overlay = this.container.querySelector('.simple-subtitle-overlay');
                    if (overlay) {
                        overlay.textContent = currentCue.text;
                        overlay.style.display = 'block';
                        console.log('[TEST] Displayed current cue in overlay');
                    }
                } else {
                    console.log('[TEST] No matching cue found for current time');
                    
                    // Show the next cue that will appear
                    const nextCue = this.subtitleCues.find(cue => cue.start > currentTime);
                    if (nextCue) {
                        console.log('[TEST] Next cue will appear at', nextCue.start, 'seconds:', nextCue.text);
                    }
                }
            }
        } else {
            console.log('[TEST] No subtitle cues loaded');
        }
    }

    // Debug function to test subtitle loading
    debugSubtitleLoading() {
        console.log('[DEBUG] Testing subtitle loading...');
        
        // Check if overlay exists
        const overlay = this.container.querySelector('.simple-subtitle-overlay');
        console.log('[DEBUG] Subtitle overlay found:', !!overlay);
        
        if (overlay) {
            console.log('[DEBUG] Overlay display style:', overlay.style.display);
            console.log('[DEBUG] Overlay text content:', overlay.textContent);
            console.log('[DEBUG] Overlay visibility:', overlay.offsetParent !== null);
        }
        
        // Check if subtitle cues are loaded
        console.log('[DEBUG] Subtitle cues loaded:', this.subtitleCues ? this.subtitleCues.length : 0);
        
        // Check if sync is set up
        console.log('[DEBUG] Subtitle sync handler:', !!this.subtitleTimeUpdateHandler);
        
        // Test the subtitle paths
        const testPaths = [
            'S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p]1.srt',
            'S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p]2.srt'
        ];
        
        testPaths.forEach(async (path) => {
            const url = `/api/subtitles?path=${encodeURIComponent(path)}`;
            try {
                const response = await fetch(url);
                console.log(`[DEBUG] ${path} - Status:`, response.status);
                if (response.ok) {
                    const content = await response.text();
                    console.log(`[DEBUG] ${path} - Content length:`, content.length);
                    console.log(`[DEBUG] ${path} - First 100 chars:`, content.substring(0, 100));
                }
            } catch (error) {
                console.log(`[DEBUG] ${path} - Error:`, error);
            }
        });
    }

    // Show subtitle search option when no subtitles are found
    showSubtitleSearchOption(videoFileName) {
        if (!this.vjsPlayer) return;
        
        // Create subtitle search button
        const searchButton = document.createElement('button');
        searchButton.className = 'subtitle-search-btn';
        searchButton.innerHTML = '🔍 Find Subtitles';
        searchButton.title = 'Search for subtitle files';
        searchButton.onclick = () => this.openSubtitleSearch(videoFileName);
        
        // Add to control bar if not already present
        const existingButton = this.vjsPlayer.controlBar.el().querySelector('.subtitle-search-btn');
        if (!existingButton) {
            this.vjsPlayer.controlBar.el().appendChild(searchButton);
        }
    }

    // Apply subtitle styling with CSS classes
    applySubtitleStyling(styleClass = 'default') {
        if (!this.video) return;
        
        console.log('[VIDEO-PLAYER] Applying subtitle styling:', styleClass);
        
        // Style the Video.js subtitle elements directly
            if (this.vjsPlayer) {
            this.vjsPlayer.ready(() => {
                // Get the subtitle display element
                const subtitleDisplay = this.vjsPlayer.el().querySelector('.vjs-text-track-display');
                if (subtitleDisplay) {
                    console.log('[VIDEO-PLAYER] Found subtitle display element');
                    
                    // Apply styling to the subtitle display
                    subtitleDisplay.className = 'vjs-text-track-display custom-subtitle-styling';
                    
                    // Add custom CSS classes to the subtitle display
                    if (styleClass.includes('large')) {
                        subtitleDisplay.classList.add('subtitle-large');
                    }
                    if (styleClass.includes('bold')) {
                        subtitleDisplay.classList.add('subtitle-bold');
                    }
                    if (styleClass.includes('outline')) {
                        subtitleDisplay.classList.add('subtitle-outline');
                    }
                    if (styleClass.includes('glow')) {
                        subtitleDisplay.classList.add('subtitle-glow');
                    }
                    if (styleClass.includes('blue')) {
                        subtitleDisplay.classList.add('subtitle-blue');
                    }
                    if (styleClass.includes('green')) {
                        subtitleDisplay.classList.add('subtitle-green');
                    }
                    if (styleClass.includes('red')) {
                        subtitleDisplay.classList.add('subtitle-red');
                    }
                    if (styleClass.includes('yellow')) {
                        subtitleDisplay.classList.add('subtitle-yellow');
                    }
                    if (styleClass.includes('dark')) {
                        subtitleDisplay.classList.add('subtitle-dark');
                    }
                    if (styleClass.includes('light')) {
                        subtitleDisplay.classList.add('subtitle-light');
                    }
                    
                    console.log('[VIDEO-PLAYER] Applied styling classes to subtitle display');
                } else {
                    console.log('[VIDEO-PLAYER] No subtitle display element found');
                }
            });
        }
        
        // Create a custom subtitle overlay for actual subtitle display
        console.log('[DEBUG] Creating subtitle overlay...');
        const existingOverlay = this.container.querySelector('.custom-subtitle-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
            console.log('[DEBUG] Removed existing subtitle overlay');
        }
        
        const overlay = document.createElement('div');
        overlay.className = 'custom-subtitle-overlay';
        overlay.innerHTML = '<div class="video-subtitle-text">Subtitles loaded successfully!</div>';
        overlay.style.cssText = `
            position: absolute;
            bottom: 120px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            z-index: 1000000000;
            text-align: center;
            max-width: 80%;
            display: none;
            pointer-events: none;
        `;
        this.container.appendChild(overlay);
        
        console.log('[DEBUG] Created subtitle overlay:', overlay);
        console.log('[DEBUG] Container element:', this.container);
        
        // Listen for subtitle cue changes
        const textTrack = this.vjsPlayer ? this.vjsPlayer.textTracks()[0] : null;
        if (textTrack) {
            textTrack.addEventListener('cuechange', (event) => {
                const cues = event.target.activeCues;
                const subtitleText = overlay.querySelector('.video-subtitle-text');
                
                if (cues && cues.length > 0) {
                    const cue = cues[0];
                    subtitleText.textContent = cue.text;
                    subtitleText.style.display = 'block';
                    console.log('[VIDEO-PLAYER] Subtitle cue displayed:', cue.text);
                } else {
                    subtitleText.style.display = 'none';
                    console.log('[VIDEO-PLAYER] No active subtitle cues');
                }
            });
        }
        
        console.log('[VIDEO-PLAYER] Created subtitle overlay with cue listener');
    }

    // Get available subtitle styling options
    getSubtitleStylingOptions() {
        return {
            sizes: ['default', 'large', 'small'],
            weights: ['default', 'bold'],
            styles: ['default', 'italic', 'underline'],
            effects: ['default', 'outline', 'glow'],
            themes: ['default', 'dark', 'light', 'blue', 'green', 'red', 'yellow'],
            positions: ['default', 'top', 'left', 'right'],
            animations: ['default', 'fade-in', 'fade-out', 'slide-up', 'slide-down']
        };
    }

    // Set subtitle styling from user preferences
    setSubtitleStyling(preferences = {}) {
        const {
            size = 'default',
            weight = 'default', 
            style = 'default',
            effect = 'default',
            theme = 'default',
            position = 'default',
            animation = 'default'
        } = preferences;
        
        // Build style class string
        const styleClasses = [size, weight, style, effect, theme, position, animation]
            .filter(cls => cls !== 'default')
            .join(' ');
        
        this.applySubtitleStyling(styleClasses);
    }

    // Manual test function for subtitle loading (call from console)
    testSubtitleLoading(testPath = null) {
        console.log('[VIDEO-PLAYER] Testing subtitle loading...');
        
        if (!testPath) {
            // Use current video source if no test path provided
            if (this.video && this.video.src) {
                testPath = this.video.src;
                console.log('[VIDEO-PLAYER] Using current video source:', testPath);
            } else {
                console.error('[VIDEO-PLAYER] No video source available for testing');
                return;
            }
        }
        
        // Test the subtitle loading process
        this.loadSubtitles(testPath);
    }

    // Manual test function for subtitle styling (call from console)
    testSubtitleStyling() {
        console.log('[VIDEO-PLAYER] Testing subtitle styling...');
        
        // Test different subtitle styles
        const testStyles = [
            'large bold outline',
            'large bold glow',
            'large bold blue',
            'large bold green',
            'large bold red'
        ];
        
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < testStyles.length) {
                console.log('[VIDEO-PLAYER] Testing style:', testStyles[currentIndex]);
                this.applySubtitleStyling(testStyles[currentIndex]);
                currentIndex++;
            } else {
                clearInterval(interval);
                console.log('[VIDEO-PLAYER] Subtitle styling test complete');
            }
        }, 2000);
    }

    // Open subtitle search interface
    openSubtitleSearch(videoFileName) {
        const searchUrl = `https://www.opensubtitles.org/en/search/sublanguageid-eng/moviename-${encodeURIComponent(videoFileName)}`;
        window.open(searchUrl, '_blank');
        
        // Show instructions
        this.showOverlayAlert('Subtitle search opened in new tab. Download .srt file and place in /assets/subtitles/ folder.', 5000);
    }

    // --- Overlay Alert for Progress Saved ---
    showOverlayAlert(message, duration = 1500) {
        // Ensure overlay exists
        let overlay = this.container.querySelector('.videojs-overlay-alert');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'videojs-overlay-alert';
            overlay.style.position = 'absolute';
            overlay.style.bottom = '5%';
            overlay.style.left = '50%';
            overlay.style.transform = 'translate(-50%, -50%)';
            overlay.style.background = 'rgba(0,0,0,0.85)';
            overlay.style.color = '#fff';
            overlay.style.fontSize = '1.4em';
            overlay.style.padding = '18px 36px';
            overlay.style.borderRadius = '12px';
            overlay.style.zIndex = '100001';
            overlay.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
            overlay.style.pointerEvents = 'none';
            overlay.style.textAlign = 'center';
            overlay.style.fontWeight = 'bold';
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s';
            this.container.appendChild(overlay);
        }
        overlay.textContent = message;
        overlay.style.opacity = '1';
        setTimeout(() => {
            overlay.style.opacity = '0';
        }, duration);
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.videoPlayer = new VideoPlayer();
    
    // Add global test functions
    window.testSubtitles = () => {
        if (window.videoPlayer) {
            window.videoPlayer.testSubtitleLoading();
        } else {
            console.log('[TEST] Video player not initialized');
        }
    };
    
    window.manualSubtitleTest = (videoPath) => {
        if (window.videoPlayer) {
            console.log('[TEST] Manual subtitle test for path:', videoPath);
            window.videoPlayer.loadSubtitles(videoPath);
        } else {
            console.log('[TEST] Video player not initialized');
        }
    };
    
    window.testForbiddenKingdomSubtitles = () => {
        if (window.videoPlayer) {
            const testPath = "S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p].mp4";
            console.log('[TEST] Testing Forbidden Kingdom subtitles...');
            window.videoPlayer.testSubtitleWithPath(testPath);
        } else {
            console.log('[TEST] Video player not initialized');
        }
    };

    window.testMummySubtitles = () => {
        if (window.videoPlayer) {
            const testPath = "S:/MEDIA/MOVIES/The Mummy Tomb of the Dragon Emperor (2008) [1080p]/The.Mummy.Tomb.of.the.Dragon.Emperor.(2008).[1080p].mp4";
            console.log('[TEST] Testing Mummy subtitles...');
            window.videoPlayer.testSubtitleWithPath(testPath);
        } else {
            console.log('[TEST] Video player not initialized');
        }
    };

    window.purgeSubtitles = () => {
        if (window.videoPlayer) {
            console.log('[TEST] Manually purging subtitles...');
            window.videoPlayer.purgeExistingSubtitles();
        } else {
            console.log('[TEST] Video player not initialized');
        }
    };

    window.readSrtFile = (filePath) => {
        console.log('[TEST] Reading SRT file:', filePath);
        
        const subtitleUrl = `/api/subtitles?path=${encodeURIComponent(filePath)}`;
        
        fetch(subtitleUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(content => {
                console.log('[TEST] SRT file content:');
                console.log('='.repeat(50));
                console.log(content);
                console.log('='.repeat(50));
                console.log('[TEST] File length:', content.length, 'characters');
                
                // Count subtitle entries
                const lines = content.split('\n');
                let subtitleCount = 0;
                let currentEntry = '';
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Check for subtitle number (starts a new entry)
                    if (/^\d+$/.test(line)) {
                        if (currentEntry) {
                            subtitleCount++;
                            if (subtitleCount <= 5) { // Show first 5 entries
                                console.log(`[TEST] Subtitle Entry ${subtitleCount}:`);
                                console.log(currentEntry);
                                console.log('---');
                            }
                        }
                        currentEntry = line + '\n';
                    } else if (line.includes('-->')) {
                        // Timestamp line
                        currentEntry += line + '\n';
                    } else if (line !== '') {
                        // Subtitle text
                        currentEntry += line + '\n';
                    }
                }
                
                // Count the last entry
                if (currentEntry) {
                    subtitleCount++;
                    if (subtitleCount <= 5) {
                        console.log(`[TEST] Subtitle Entry ${subtitleCount}:`);
                        console.log(currentEntry);
                    }
                }
                
                console.log(`[TEST] Total subtitle entries: ${subtitleCount}`);
                
                // Check for common issues
                if (content.includes('Chinese') || content.includes('Mandarin') || content.includes('Cantonese')) {
                    console.log('[TEST] ✅ Contains Chinese language indicators');
                }
                if (content.includes('English')) {
                    console.log('[TEST] ✅ Contains English language indicators');
                }
                if (content.includes('The Mummy') || content.includes('Dragon Emperor')) {
                    console.log('[TEST] ✅ Contains movie title references');
                }
                
            })
            .catch(error => {
                console.error('[TEST] Error reading SRT file:', error);
                console.log('[TEST] Make sure the file path is correct and the file exists');
            });
    };

    window.testSubtitleCompatibility = (filePath) => {
        console.log('[TEST] Testing subtitle compatibility for:', filePath);
        
        const subtitleUrl = `/api/subtitles?path=${encodeURIComponent(filePath)}`;
        
        fetch(subtitleUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(content => {
                console.log('[TEST] ===== SUBTITLE COMPATIBILITY TEST =====');
                
                // Basic file info
                console.log('[TEST] File size:', content.length, 'characters');
                
                // Check encoding issues
                const hasEncodingIssues = content.includes('') || content.includes('') || content.includes('');
                console.log('[TEST] Encoding issues:', hasEncodingIssues ? '❌ YES' : '✅ NO');
                
                // Check timestamp format
                const timestampMatches = content.match(/\d{2}:\d{2}:\d{2}[,\.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,\.]\d{3}/g);
                console.log('[TEST] Valid timestamps found:', timestampMatches ? timestampMatches.length : 0);
                
                // Check subtitle structure
                const lines = content.split('\n');
                let validEntries = 0;
                let invalidEntries = 0;
                let currentEntry = '';
                let entryNumber = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    if (/^\d+$/.test(line)) {
                        // New entry starts
                        if (currentEntry) {
                            // Validate previous entry
                            const hasTimestamp = currentEntry.includes('-->');
                            const hasText = currentEntry.split('\n').some(l => l.trim() && !l.includes('-->') && !/^\d+$/.test(l));
                            
                            if (hasTimestamp && hasText) {
                                validEntries++;
                            } else {
                                invalidEntries++;
                            }
                        }
                        currentEntry = line + '\n';
                        entryNumber = parseInt(line);
                    } else if (line.includes('-->')) {
                        currentEntry += line + '\n';
                    } else if (line !== '') {
                        currentEntry += line + '\n';
                    }
                }
                
                // Check last entry
                if (currentEntry) {
                    const hasTimestamp = currentEntry.includes('-->');
                    const hasText = currentEntry.split('\n').some(l => l.trim() && !l.includes('-->') && !/^\d+$/.test(l));
                    
                    if (hasTimestamp && hasText) {
                        validEntries++;
                    } else {
                        invalidEntries++;
                    }
                }
                
                console.log('[TEST] Valid subtitle entries:', validEntries);
                console.log('[TEST] Invalid subtitle entries:', invalidEntries);
                console.log('[TEST] Success rate:', Math.round((validEntries / (validEntries + invalidEntries)) * 100) + '%');
                
                // Check for common subtitle types
                const isCommentary = content.toLowerCase().includes('commentary') || content.toLowerCase().includes('director');
                const isForced = content.toLowerCase().includes('forced') || content.toLowerCase().includes('sdh');
                const isDualLanguage = content.match(/[\u4e00-\u9fff]/) && content.match(/[a-zA-Z]/);
                
                console.log('[TEST] Is commentary track:', isCommentary ? '❌ YES' : '✅ NO');
                console.log('[TEST] Is forced subtitles:', isForced ? '⚠️ YES' : '✅ NO');
                console.log('[TEST] Is dual language:', isDualLanguage ? '✅ YES' : '❌ NO');
                
                // Overall compatibility score
                let score = 0;
                if (!hasEncodingIssues) score += 25;
                if (timestampMatches && timestampMatches.length > 100) score += 25;
                if (validEntries > 500) score += 25;
                if (!isCommentary) score += 25;
                
                console.log('[TEST] ===== COMPATIBILITY SCORE:', score + '/100 =====');
                
                if (score >= 75) {
                    console.log('[TEST] ✅ This subtitle file should work well!');
                } else if (score >= 50) {
                    console.log('[TEST] ⚠️ This subtitle file might have issues');
                } else {
                    console.log('[TEST] ❌ This subtitle file likely won\'t work properly');
                }
                
            })
            .catch(error => {
                console.error('[TEST] Error testing subtitle file:', error);
            });
    };
    
    window.loadSubtitlesNow = () => {
        if (window.videoPlayer) {
            console.log('[TEST] Manually loading subtitles for current video...');
            const videoPath = "S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p].mp4";
            window.videoPlayer.loadSubtitles(videoPath);
        } else {
            console.log('[TEST] Video player not initialized');
        }
    };
    
    window.forceEnableSubtitles = () => {
        if (window.videoPlayer && window.videoPlayer.vjsPlayer) {
            console.log('[TEST] Forcing subtitle enable...');
            const tracks = window.videoPlayer.vjsPlayer.textTracks();
            console.log('[TEST] Available tracks:', tracks.length);
            
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                console.log(`[TEST] Track ${i}:`, {
                    kind: track.kind,
                    mode: track.mode,
                    label: track.label,
                    language: track.language
                });
                
                if (track.kind === 'subtitles' || track.kind === 'captions') {
                    track.mode = 'showing';
                    console.log(`[TEST] Enabled track ${i}: ${track.label}`);
                }
            }
            
            // Convert .srt to .vtt first, then add track
            const srtUrl = '/api/subtitles?path=S:/MEDIA/MOVIES/The Forbidden Kingdom (2008) [1080p]/The.Forbidden.Kingdom.(2008).[1080p]1.srt';
            
            fetch(srtUrl)
                .then(response => response.text())
                .then(srtContent => {
                    console.log('[TEST] Fetched .srt content, converting to .vtt...');
                    
                    // Convert SRT to VTT
                    let vttContent = 'WEBVTT\n\n';
                    const lines = srtContent.split('\n');
                    let i = 0;
                    
                    while (i < lines.length) {
                        const line = lines[i].trim();
                        
                        if (line === '' || /^\d+$/.test(line)) {
                            i++;
                            continue;
                        }
                        
                        if (line.includes('-->')) {
                            const timestampLine = line
                                .replace(/,/g, '.')
                                .replace(/\s+/g, ' ');
                            
                            vttContent += timestampLine + '\n';
                            i++;
                            
                            while (i < lines.length && lines[i].trim() !== '') {
                                vttContent += lines[i].trim() + '\n';
                                i++;
                            }
                            vttContent += '\n';
                        } else {
                            i++;
                        }
                    }
                    
                    console.log('[TEST] Converted to VTT format');
                    
                    // Create blob URL for VTT content
                    const blob = new Blob([vttContent], { type: 'text/vtt' });
                    const vttUrl = URL.createObjectURL(blob);
                    
                    console.log('[TEST] Created VTT blob URL:', vttUrl);
                    
                    // Add track with VTT URL
                    const testTrack = window.videoPlayer.vjsPlayer.addRemoteTextTrack({
                        src: vttUrl,
                        kind: 'subtitles',
                        srclang: 'en',
                        label: 'Test English VTT',
                        default: true
                    }, false);
                    
                    console.log('[TEST] Added VTT track:', testTrack);
                    
                                            // Enable the track
                        testTrack.mode = 'showing';
                        console.log('[TEST] Enabled VTT track');
                        
                        // Use our custom overlay to display subtitles
                        setTimeout(() => {
                            const overlay = window.videoPlayer.container.querySelector('.custom-subtitle-overlay');
                            if (overlay) {
                                overlay.style.display = 'block';
                                overlay.style.zIndex = '1000000000';
                                overlay.style.position = 'absolute';
                                overlay.style.bottom = '120px';
                                overlay.style.left = '50%';
                                overlay.style.transform = 'translateX(-50%)';
                                overlay.style.pointerEvents = 'none';
                                
                                // Update the text to show actual subtitle content
                                const subtitleText = overlay.querySelector('.subtitle-test-text');
                                if (subtitleText) {
                                    subtitleText.textContent = '🎬 SUBTITLES LOADED - Check console for content';
                                    subtitleText.style.background = 'rgba(0, 255, 0, 0.9)'; // Green background
                                }
                                
                                console.log('[TEST] Enabled custom subtitle overlay');
                            }
                        }, 1000);
                    
                })
                .catch(error => {
                    console.error('[TEST] Error converting subtitle:', error);
                });
            
        } else {
            console.log('[TEST] Video player not ready');
        }
    };
    
    window.checkSubtitleVisibility = () => {
        if (window.videoPlayer && window.videoPlayer.vjsPlayer) {
            console.log('[TEST] Checking subtitle visibility...');
            
            const subtitleDisplay = window.videoPlayer.vjsPlayer.el().querySelector('.vjs-text-track-display');
            if (subtitleDisplay) {
                console.log('[TEST] Subtitle display found:', subtitleDisplay);
                console.log('[TEST] Subtitle display z-index:', subtitleDisplay.style.zIndex);
                console.log('[TEST] Subtitle display position:', subtitleDisplay.style.position);
                
                // Force make it visible
                subtitleDisplay.style.zIndex = '10000';
                subtitleDisplay.style.position = 'absolute';
                subtitleDisplay.style.bottom = '60px';
                subtitleDisplay.style.left = '50%';
                subtitleDisplay.style.transform = 'translateX(-50%)';
                subtitleDisplay.style.pointerEvents = 'none';
                subtitleDisplay.style.display = 'block';
                
                console.log('[TEST] Forced subtitle display to be visible');
            } else {
                console.log('[TEST] No subtitle display found');
            }
        }
    };
    
    window.testSubtitleDisplay = () => {
        if (window.videoPlayer && window.videoPlayer.vjsPlayer) {
            console.log('[TEST] Testing subtitle display...');
            
            // Create a test subtitle element
            const testSubtitle = document.createElement('div');
            testSubtitle.className = 'test-subtitle-overlay';
            testSubtitle.innerHTML = '<div class="test-subtitle-text">🎬 TEST SUBTITLE - This should be visible!</div>';
            testSubtitle.style.cssText = `
                position: absolute;
                bottom: 120px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1000000000;
                pointer-events: none;
            `;
            
            const testText = testSubtitle.querySelector('.test-subtitle-text');
            testText.style.cssText = `
                background: rgba(255, 0, 0, 0.9);
                color: white;
                padding: 10px 20px;
                border-radius: 6px;
                font-size: 18px;
                font-weight: bold;
                text-align: center;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
            `;
            
            // Add to video player
            window.videoPlayer.vjsPlayer.el().appendChild(testSubtitle);
            
            console.log('[TEST] Added test subtitle overlay');
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (testSubtitle.parentNode) {
                    testSubtitle.parentNode.removeChild(testSubtitle);
                    console.log('[TEST] Removed test subtitle overlay');
                }
            }, 5000);
        }
    };
    
    window.forceShowText = () => {
        console.log('[TEST] Force showing text...');
        
        // Create a simple text element
        const textDiv = document.createElement('div');
        textDiv.innerHTML = '🔥 FORCE TEXT - CAN YOU SEE THIS? 🔥';
        textDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: red;
            color: white;
            padding: 20px;
            font-size: 24px;
            font-weight: bold;
            z-index: 999999999;
            border: 5px solid yellow;
        `;
        
        document.body.appendChild(textDiv);
        
        console.log('[TEST] Added force text to body');
        
        // Remove after 10 seconds
        setTimeout(() => {
            if (textDiv.parentNode) {
                textDiv.parentNode.removeChild(textDiv);
                console.log('[TEST] Removed force text');
            }
        }, 10000);
    };
    
    window.testSubtitleOverlay = () => {
        if (window.videoPlayer) {
            console.log('[TEST] Testing subtitle overlay creation...');
            window.videoPlayer.createSubtitleOverlay();
            
            // Test the overlay after creation
            setTimeout(() => {
                const overlay = window.videoPlayer.container.querySelector('.custom-subtitle-overlay');
                if (overlay) {
                    const subtitleText = overlay.querySelector('.subtitle-text');
                    if (subtitleText) {
                        subtitleText.textContent = '🎬 SUBTITLE OVERLAY TEST - This should be visible!';
                        overlay.style.display = 'block';
                        console.log('[TEST] Subtitle overlay test message displayed');
                        
                        // Hide after 5 seconds
                        setTimeout(() => {
                            overlay.style.display = 'none';
                            console.log('[TEST] Subtitle overlay test message hidden');
                        }, 5000);
                    } else {
                        console.log('[TEST] No subtitle text element found in overlay');
                    }
                } else {
                    console.log('[TEST] No subtitle overlay found after creation');
                }
            }, 100);
        } else {
            console.log('[TEST] Video player not available');
        }
    };
    
    window.debugSubtitles = () => {
        if (window.videoPlayer && window.videoPlayer.vjsPlayer) {
            console.log('[DEBUG] Debugging subtitle system...');
            const player = window.videoPlayer.vjsPlayer;
            const tracks = player.textTracks();
            
            console.log('[DEBUG] Available tracks:', tracks.length);
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                console.log(`[DEBUG] Track ${i}:`, {
                    kind: track.kind,
                    mode: track.mode,
                    label: track.label,
                    language: track.language,
                    readyState: track.readyState,
                    cues: track.cues ? track.cues.length : 0,
                    activeCues: track.activeCues ? track.activeCues.length : 0
                });
                
                if (track.cues && track.cues.length > 0) {
                    console.log('[DEBUG] First few cues:');
                    for (let j = 0; j < Math.min(3, track.cues.length); j++) {
                        const cue = track.cues[j];
                        console.log(`[DEBUG] Cue ${j}:`, {
                            text: cue.text,
                            startTime: cue.startTime,
                            endTime: cue.endTime
                        });
                    }
                }
            }
            
            // Check Video.js subtitle display
            const subtitleDisplay = player.el().querySelector('.vjs-text-track-display');
            if (subtitleDisplay) {
                console.log('[DEBUG] Subtitle display found:', subtitleDisplay);
                console.log('[DEBUG] Subtitle display style:', subtitleDisplay.style.cssText);
                
                // Force make it visible
                subtitleDisplay.style.display = 'block';
                subtitleDisplay.style.zIndex = '1000000000';
                subtitleDisplay.style.position = 'absolute';
                subtitleDisplay.style.bottom = '120px';
                subtitleDisplay.style.left = '50%';
                subtitleDisplay.style.transform = 'translateX(-50%)';
                subtitleDisplay.style.pointerEvents = 'none';
                console.log('[DEBUG] Forced subtitle display to be visible');
            } else {
                console.log('[DEBUG] No subtitle display element found');
            }
            
            // Check current time and active cues
            const currentTime = player.currentTime();
            console.log('[DEBUG] Current time:', currentTime);
            
            for (let i = 0; i < tracks.length; i++) {
                const track = tracks[i];
                if (track.mode === 'showing' && track.cues) {
                    for (let j = 0; j < track.cues.length; j++) {
                        const cue = track.cues[j];
                        if (currentTime >= cue.startTime && currentTime <= cue.endTime) {
                            console.log('[DEBUG] Active cue found:', cue.text);
                            break;
                        }
                    }
                }
            }
        } else {
            console.log('[DEBUG] Video player not available');
        }
    };
    
    // Wait for initialization to complete before setting up additional features
    const checkInitialization = () => {
        if (window.videoPlayer && window.videoPlayer.container) {
            // Register with command system
            window.videoPlayer.registerWithCommandSystem();
            
            // Make debug functions globally accessible
            window.debugSubtitles = () => {
                if (window.videoPlayer) {
                    window.videoPlayer.debugSubtitleLoading();
                } else {
                    console.log('[VIDEO-PLAYER-DEBUG] Video player not available');
                }
            };
            
            window.testSubtitleDisplay = () => {
                if (window.videoPlayer) {
                    window.videoPlayer.testSubtitleDisplay();
                } else {
                    console.log('[VIDEO-PLAYER-DEBUG] Video player not available');
                }
            };
            
            window.testSubtitleCues = () => {
                if (window.videoPlayer) {
                    window.videoPlayer.testSubtitleCues();
                } else {
                    console.log('[VIDEO-PLAYER-DEBUG] Video player not available');
                }
            };
            
            window.forceShowSubtitles = () => {
                if (window.videoPlayer) {
                    const overlay = window.videoPlayer.container.querySelector('.simple-subtitle-overlay');
                    if (overlay) {
                        overlay.style.display = 'block';
                        console.log('[FORCE] Subtitle overlay forced to show');
                    } else {
                        console.log('[FORCE] No subtitle overlay found');
                    }
                } else {
                    console.log('[VIDEO-PLAYER-DEBUG] Video player not available');
                }
            };
            
            // Add keyboard shortcut to open video player (Ctrl+V)
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'v') {
                    // Don't trigger video player if user is typing in an input field
                    const activeElement = document.activeElement;
                    const isInputField = activeElement && (
                        activeElement.tagName === 'INPUT' ||
                        activeElement.tagName === 'TEXTAREA' ||
                        activeElement.contentEditable === 'true' ||
                        activeElement.classList.contains('login-manager-email') ||
                        activeElement.classList.contains('login-manager-password') ||
                        activeElement.classList.contains('login-manager-confirm-password')
                    );
                    
                    if (isInputField) {
                        // Allow normal paste behavior in input fields
                        return;
                    }
                    
                    e.preventDefault();
                    if (window.videoPlayer) {
                        window.videoPlayer.openVideoPlayer();
                    }
                }
            });
            
            console.log('🎬 [VIDEO-PLAYER] Auto-initialized with voice/text command support!');
            console.log('🎬 [VIDEO-PLAYER] Voice commands: "video player open", "open video player", "play video", etc.');
            console.log('🎬 [VIDEO-PLAYER] Keyboard shortcut: Ctrl+V');
            console.log('🎬 [VIDEO-PLAYER] Test functions available: testSubtitles(), manualSubtitleTest(path)');
        } else {
            // Check again in 100ms
            setTimeout(checkInitialization, 100);
        }
    };
    checkInitialization();
});

// Export for module usage
export default VideoPlayer; 