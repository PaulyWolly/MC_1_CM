/*
  VIDEOPLAYER.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
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
            console.log('🎬 [VIDEO-PLAYER] Video player initialized with voice/text command support');
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
                /* Unique classes for each custom control */
                .vjs-back10-button.custom-back10 { }
                .vjs-forward10-button.custom-forward10 { }
                .vjs-playpause-toggle-button.custom-playpause { }
                .vjs-save-later-button.custom-save-later { }
                /* Example: .custom-back10 { color: red !important; } */
                .vjs-control-bar .vjs-control {
                    font-size: 1.3em !important;
                    min-width: 48px !important;
                    min-height: 48px !important;
                    height: 48px !important;
                    width: 48px !important;
                }
                .vjs-back10-button, .vjs-forward10-button, .vjs-playpause-toggle-button, .vjs-save-later-button, .vjs-fullscreen-control, .vjs-fullscreen-toggle {
                    font-size: 1.3em !important;
                    min-width: 48px !important;
                    min-height: 48px !important;
                    height: 48px !important;
                    width: 48px !important;
                }
                .custom-save-later {
                    margin-left: auto !important;
                    margin-right: 20px !important;
                    order: 99 !important;
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
        // REMOVE the old custom controls bar
        // (Do NOT call this.createControls() or append this.controls)

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
        // REMOVE the old custom controls bar
        // (Do NOT append this.controls)
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
                        this.el().innerHTML = `<span title="Back 10 seconds">⏪ 10s</span>`;
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
                        this.el().innerHTML = `<span title="Forward 10 seconds">10s ⏩</span>`;
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
                            this.el().innerHTML = '<span title="Play">▶️</span>';
                            this.el().setAttribute('title', 'Play');
                        } else {
                            this.el().innerHTML = '<span title="Pause">⏸️</span>';
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
                        let movie = window.mediaLibraryManager?.currentMediaItem || window.mediaLibraryManager?.currentFile;
                        let currentTime = 0, duration = 0;
                        if (this.player()) {
                            currentTime = this.player().currentTime();
                            duration = this.player().duration();
                        }
                        console.log('[VIDEO-PLAYER] Save for Later clicked: movie=', movie, 'currentTime=', currentTime, 'duration=', duration);
                        
                        // Handle TV show episodes that have filePath instead of path
                        if (movie && movie.filePath && !movie.path) {
                            movie.path = movie.filePath;
                        }
                        
                        // Try to find the media item in the library by path or name if not already a full object
                        if ((!movie?.path || !movie?.title) && window.mediaLibraryManager && window.mediaLibraryManager.mediaLibrary) {
                            const found = window.mediaLibraryManager.mediaLibrary.find(item =>
                                (movie?.path && item.path === movie.path) ||
                                (movie?.title && item.title === movie.title) ||
                                (movie?.name && item.name === movie.name)
                            );
                            if (found) movie = found;
                        }
                        
                        // Ensure title and path are set
                        if (movie && !movie.title) movie.title = movie.name || movie.filename || movie.path || 'Untitled';
                        if (movie && !movie.path && movie.absPath) movie.path = movie.absPath;
                        if (movie && !movie.path && movie.filePath) movie.path = movie.filePath;
                        
                        // Save to Watch Later using MediaLibraryManager
                        if (window.mediaLibraryManager && typeof window.mediaLibraryManager.saveResumeProgress === 'function' && movie && movie.path) {
                            window.mediaLibraryManager.saveResumeProgress(movie, currentTime, duration, true); // true = manual save
                            if (typeof window.mediaLibraryManager.showToast === 'function') {
                                window.mediaLibraryManager.showToast('Saved to Watch Later!', 'success');
                            }
                            this.player().showOverlayAlert?.('Saved to Watch Later!');
                            console.log('[VIDEO-PLAYER] Saved to Watch Later:', movie, currentTime, duration);
                        } else {
                            if (typeof window.mediaLibraryManager?.showToast === 'function') {
                                window.mediaLibraryManager.showToast('Cannot save - no media data available', 'error');
                            }
                            this.player().showOverlayAlert?.('Cannot save - no media data available');
                            console.warn('[VIDEO-PLAYER] Cannot save to Watch Later - missing data or MediaLibraryManager');
                        }
                    }
                }
                window.videojs.registerComponent('SaveLaterButton', SaveLaterButton);
            }
        }
        // Initialize Video.js with all desired controls and force control bar to show
        try {
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
                        'volumePanel',
                        'currentTimeDisplay',
                        'timeDivider',
                        'durationDisplay',
                        'progressControl',
                        'SaveLaterButton',
                        'fullscreenToggle',
                        'remainingTimeDisplay',
                        'subsCapsButton',
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
            });
            // Add Save for Later button as a custom overlay or Video.js button if needed
            
            // Add persistent click-to-pause handler using Video.js API
            this.vjsPlayer.on('click', (e) => {
                console.log('[VIDEO-PLAYER] Video.js click event fired');
                // Only toggle if not clicking on controls
                if (e && (e.target.closest('.vjs-control-bar') || e.target.closest('.vjs-big-play-button') || e.target.closest('.vjs-loading-spinner'))) return;
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
                // Don't trigger if clicking on Video.js controls
                if (e.target.closest('.vjs-control-bar') || e.target.closest('.vjs-big-play-button') || e.target.closest('.vjs-loading-spinner')) {
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

        // Play/Pause button
        this.playButton = document.createElement('button');
        this.playButton.innerHTML = '▶️';
        this.playButton.className = 'video-player-play-btn';
        this.playButton.removeAttribute('style');
        this.playButton.onclick = () => this.togglePlay();
        this.playButton.onmouseover = () => this.playButton.style.background = 'rgba(255,255,255,0.2)';
        this.playButton.onmouseout = () => this.playButton.style.background = 'transparent';

        // Progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'video-player-progress';
        this.progressBar.removeAttribute('style');

        this.progressFill = document.createElement('div');
        this.progressFill.className = 'video-player-progress-fill';
        this.progressFill.removeAttribute('style');

        this.progressBar.appendChild(this.progressFill);
        this.progressBar.onclick = (e) => this.seek(e);

        // Time display
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.className = 'video-player-time';
        this.timeDisplay.innerHTML = '0:00 / 0:00';
        this.timeDisplay.removeAttribute('style');

        // Volume control
        this.volumeControl = document.createElement('input');
        this.volumeControl.type = 'range';
        this.volumeControl.min = '0';
        this.volumeControl.max = '100';
        this.volumeControl.value = '100';
        this.volumeControl.className = 'video-player-volume';
        this.volumeControl.removeAttribute('style');
        this.volumeControl.oninput = (e) => this.setVolume(e.target.value / 100);

        // Fullscreen button
        this.fullscreenButton = document.createElement('button');
        this.fullscreenButton.innerHTML = '⛶';
        this.fullscreenButton.className = 'video-player-fullscreen-btn';
        this.fullscreenButton.removeAttribute('style');
        this.fullscreenButton.onclick = () => this.toggleFullscreen();
        this.fullscreenButton.onmouseover = () => this.fullscreenButton.style.background = 'rgba(255,255,255,0.2)';
        this.fullscreenButton.onmouseout = () => this.fullscreenButton.style.background = 'transparent';

        // Watch Later (Bookmark) button
        this.watchLaterButton = document.createElement('button');
        this.watchLaterButton.className = 'video-player-watch-later-btn';
        this.watchLaterButton.innerHTML = '<span style="font-size:1.3em;">&#128278;</span>';
        this.watchLaterButton.title = 'Watch Later';
        this.watchLaterButton.removeAttribute('style');
        this.watchLaterButton.onclick = () => {
            let movie = this.currentMediaItem || this.currentFile;
            let currentTime = 0, duration = 0;
            if (this.vjsPlayer) {
                currentTime = this.vjsPlayer.currentTime();
                duration = this.vjsPlayer.duration();
            } else if (this.video) {
                currentTime = this.video.currentTime;
                duration = this.video.duration;
            }
            
            console.log('[VIDEO-PLAYER] Save for Later clicked: movie=', movie, 'currentTime=', currentTime, 'duration=', duration);
            
            // Try to find the media item in the library by path or name if not already a full object
            if ((!movie.path || !movie.title) && window.mediaLibraryManager && window.mediaLibraryManager.mediaLibrary) {
                const found = window.mediaLibraryManager.mediaLibrary.find(item =>
                    (movie.path && item.path === movie.path) ||
                    (movie.title && item.title === movie.title) ||
                    (movie.name && item.name === movie.name)
                );
                if (found) movie = found;
            }
            
            // Ensure title and path are set
            if (!movie.title) movie.title = movie.name || movie.filename || movie.path || 'Untitled';
            if (!movie.path && movie.absPath) movie.path = movie.absPath;

            // Save to Watch Later using MediaLibraryManager
            if (window.mediaLibraryManager && typeof window.mediaLibraryManager.saveResumeProgress === 'function' && movie) {
                window.mediaLibraryManager.saveResumeProgress(movie, currentTime, duration, true); // true = manual save
                this.showOverlayAlert('Saved to Watch Later!');
            } else {
                console.warn('[VIDEO-PLAYER] Cannot save to Watch Later - missing data or MediaLibraryManager');
                this.showOverlayAlert('Cannot save - no media data available');
            }
        };

        // Add controls to container
        this.controls.appendChild(this.playButton);
        this.controls.appendChild(this.progressBar);
        this.controls.appendChild(this.timeDisplay);
        this.controls.appendChild(this.volumeControl);
        this.controls.appendChild(this.fullscreenButton);
        this.controls.appendChild(this.watchLaterButton);
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
                e.target.closest('.vjs-control-bar')) {
                return;
            }
            console.log('🎬 [VIDEO-PLAYER] Container clicked - toggling play/pause');
            this.togglePlay();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Auto-hide controls timer
        this.controlsTimer = null;
    }

    openFileBrowser() {
        this.fileInput.click();
    }

    async loadVideo(file) {
        console.log('[DEBUG - VIDEO-PLAYER] loadVideo called with:', file);
        console.log('[DEBUG - VIDEO-PLAYER] File type:', typeof file);
        console.log('[DEBUG - VIDEO-PLAYER] File properties:', Object.keys(file || {}));
        if (!file) {
            console.log('[DEBUG - VIDEO-PLAYER] No file provided to loadVideo');
            return;
        }
        if (!this.vjsPlayer) {
            console.error('🎬 [VIDEO-PLAYER] Video.js player not initialized');
            return;
        }
        
        console.log('🎬 [VIDEO-PLAYER] Loading video:', file.name);
        
        // Store current TV show info in localStorage
        console.log('[DEBUG - VIDEO-PLAYER] About to store TV show info for video:', file.name);
        console.log('[DEBUG - VIDEO-PLAYER] File object details:', {
            name: file.name,
            absPath: file.absPath,
            relPath: file.relPath,
            path: file.path
        });
        this.storeCurrentTVShowInfo(file);
        console.log('[DEBUG - VIDEO-PLAYER] Finished storing TV show info');
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
                this.showMessage(`Error loading video: ${file.name}. The file may be corrupted or in an unsupported format.`);
            });
            
            this.vjsPlayer.on('loadeddata', async () => {
                console.log('🎬 [VIDEO-PLAYER] Video loaded successfully:', file.name);
                this.showMessage(`Loaded: ${file.name}`);
                
                // Update episode info header
                await this.updateEpisodeInfoHeader();
                
                // Add pause event handler for Watch Later
                this.vjsPlayer.off('pause'); // Remove any previous handler to avoid duplicates
                this.vjsPlayer.on('pause', () => {
                    console.log('🎬 [VIDEO-PLAYER] Pause event triggered');
                    
                    // Auto-save progress for TV shows and movies
                    if (window.mediaLibraryManager && typeof window.mediaLibraryManager.saveResumeProgress === 'function') {
                        const currentTime = this.vjsPlayer.currentTime();
                        const duration = this.vjsPlayer.duration();
                        
                        // Use the current media item from MediaLibraryManager
                        const mediaItem = window.mediaLibraryManager.currentMediaItem || window.mediaLibraryManager.currentFile;
                        
                        if (mediaItem && currentTime > 0 && duration > 0) {
                            console.log('🎬 [VIDEO-PLAYER] Auto-saving progress:', { mediaItem, currentTime, duration });
                            window.mediaLibraryManager.saveResumeProgress(mediaItem, currentTime, duration, false); // false = auto-save
                        }
                    }
                });
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
        
        // Extract show name from TV-SHOWS directory structure
        const tvShowsMatch = path.match(/TV[-_]SHOWS?[\/\\]([^\/\\]+)/i);
        let showName = 'Unknown Show';
        let showYear = null;
        
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
        name = name.replace(/[-_. ]+(yts( mx| am)?|rarbg|jyk|kogi|web|amzn|nf|ddp|dd5[ ._\-]?1|aac|dts|hdtv|remux|bluray|brrip|webrip|web-dl|hdrip|dvdrip|xvid|x264|x265|ac3|eac3|subs|dubbed|eng|ita|spa|fre|ger|rus|multi|proper|limited|internal|cam|tc|ts|scr|r5|dvdscr|dvdr|pal|ntsc|hdr|dv|remastered|criterion|criterion collection|criterion-collection|criterion-collection|criterion)\b.*$/i, "");
        // Replace dots, underscores, dashes with spaces
        name = name.replace(/[._-]+/g, " ");
        // Remove extra spaces
        name = name.replace(/\s+/g, " ").trim();
        // Capitalize each word
        name = this.capitalizeTitle(name);
        return name;
    }

    // Utility to clean up TV show titles for display
    cleanTVShowTitle(title) {
        if (!title || typeof title !== 'string') return '';
        // For TV shows, extract just the show name for clean UI display
        // Keep year in parentheses but remove quality info and episode codes for user-friendly display
        let name = title.trim();
        
        // Remove episode codes in various formats (S01e05, S1E5, Season 01 Episode 05, Ep 05, etc.)
        name = name.replace(/\bS\d{1,2}[Ee]\d{1,2}\b/g, ''); // Remove S01e05, S1E5, etc.
        name = name.replace(/\bSeason\s+\d{1,2}\s+Episode\s+\d{1,2}\b/gi, ''); // Remove "Season 01 Episode 05"
        name = name.replace(/\bEp\s*\d{1,2}\b/gi, ''); // Remove "Ep 05", "Episode 05"
        name = name.replace(/\bEpisode\s+\d{1,2}\b/gi, ''); // Remove "Episode 05"
        
        // Remove file extensions and common video format tags
        name = name.replace(/\.(mkv|mp4|avi|mov|wmv|flv|webm)$/gi, ''); // Remove file extensions
        name = name.replace(/\b(mkv|mp4|avi|mov|wmv|flv|webm)\b/gi, ''); // Remove format tags
        
        // Remove audio channel tags
        name = name.replace(/\b(AAC5\.1|AAC51|DDP5\.1|DDP51|DD5\.1|DD51)\b/gi, '');
        
        // Remove quality tags
        name = name.replace(/\b(480p|720p|1080p|2160p|4k|8k|bluray|brrip|webrip|web-dl|hdrip|dvdrip)\b/gi, '');
        
        // Remove release group tags
        name = name.replace(/\b(YTS|RARBG|YIFY)\b/gi, '');
        
        // Keep (year) but remove [quality] info for display
        name = name.replace(/\[\d{3,4}p\]/gi, "");    // Remove [1080p], [720p], etc.
        
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

    // Update the episode info header
    async updateEpisodeInfoHeader() {
        console.log('[DEBUG - VIDEO-PLAYER] updateEpisodeInfoHeader called');
        if (!this.episodeInfoHeader) {
            console.log('[DEBUG - VIDEO-PLAYER] No episodeInfoHeader element found');
            return;
        }
        
        let filePath = null;
        
        // Get file path from current file or media item
        if (this.currentFile) {
            filePath = this.currentFile.absPath || this.currentFile.name;
        } else if (this.currentMediaItem) {
            filePath = this.currentMediaItem.path || this.currentMediaItem.absPath;
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
            // For movies and other files, use clean movie title
            const filename = decodedPath.split(/[\/\\]/).pop() || '';
            let cleanTitle = this.cleanMovieTitle(filename);
            
            console.log('[DEBUG - VIDEO-PLAYER] Clean movie title:', cleanTitle);
            
            // MANDATORY: Ensure movie has a year
            cleanTitle = await this.ensureTitleHasYear(cleanTitle, filename, 'movie', decodedPath);
            
            console.log('[DEBUG - VIDEO-PLAYER] Final movie title:', cleanTitle);
            this.episodeInfoHeader.innerHTML = cleanTitle;
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
        
        // Return the title with empty parentheses as a last resort
        return cleanTitle.includes('()') ? cleanTitle : `${cleanTitle} ()`;
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

    toggleFullscreen() {
        if (!this.isFullscreen) {
            this.container.requestFullscreen();
            this.isFullscreen = true;
        } else {
            document.exitFullscreen();
            this.isFullscreen = false;
        }
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
        // this.timeDisplay.innerHTML = `${current} / ${total}`; // Removed custom time display
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

        // Add Skip Intro button using configurable timing
        this.addSkipIntroButton(SKIP_INTRO_SECONDS);

        // Add Next Show button for TV shows (appears after intro)
        this.addNextShowButton();

        // Listen for timeupdate to show Up Next overlay and Skip to Next button
        this.vjsPlayer.off('timeupdate'); // Remove previous listeners
        this.vjsPlayer.on('timeupdate', () => {
            const duration = this.vjsPlayer.duration();
            const current = this.vjsPlayer.currentTime();
            
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
            this.skipIntroBtn.style.display = 'none';
        };
        this.container.appendChild(this.skipIntroBtn);
        // Hide after skipSeconds or when user clicks
        setTimeout(() => {
            if (this.skipIntroBtn) this.skipIntroBtn.style.display = 'none';
        }, Math.max(1000, skipSeconds * 1000));
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
            
            // Get current episode info to determine show name
            let filePath = null;
            if (this.currentFile) {
                filePath = this.currentFile.absPath || this.currentFile.name;
                console.log('[VIDEO-PLAYER] Using currentFile path:', filePath);
            } else if (this.currentMediaItem) {
                filePath = this.currentMediaItem.path || this.currentMediaItem.absPath;
                console.log('[VIDEO-PLAYER] Using currentMediaItem path:', filePath);
            }
            
            if (!filePath) {
                console.log('[VIDEO-PLAYER] No filePath found');
                this.showOverlayAlert('Cannot determine current video path', 3000);
                return;
            }
            
            // Decode URL-encoded path if needed
            let decodedPath = filePath;
            if (filePath.includes('%')) {
                try {
                    decodedPath = decodeURIComponent(filePath);
                    console.log('[VIDEO-PLAYER] Decoded path:', decodedPath);
                } catch (e) {
                    console.log('[VIDEO-PLAYER] Failed to decode path:', e);
                }
            }
            
            const currentEpisodeInfo = this.extractEpisodeInfo(decodedPath);
            console.log('[VIDEO-PLAYER] Extracted episode info:', currentEpisodeInfo);
            
            if (!currentEpisodeInfo || !currentEpisodeInfo.showName) {
                console.log('[VIDEO-PLAYER] No show name found in episode info');
                this.showOverlayAlert('Current video is not a TV show episode', 3000);
                return;
            }
            
            // Pause video if it's playing when modal opens
            if (this.vjsPlayer && !this.vjsPlayer.paused()) {
                console.log('[VIDEO-PLAYER] Pausing video for modal');
                this.vjsPlayer.pause();
            }
            
            console.log('[VIDEO-PLAYER] Opening episode modal for show:', currentEpisodeInfo.showName);
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
                        
                        const episodeFile = {
                            name: selectedEpisode.name,
                            absPath: selectedEpisode.absPath || selectedEpisode.path,
                            relPath: selectedEpisode.relPath,
                            path: selectedEpisode.path,
                            type: 'video/mp4',
                            ...selectedEpisode
                        };
                        
                        this.showOverlayAlert(`Loading: ${selectedEpisode.name}`, 2000);
                        
                        // Use the same approach as MediaLibraryManager for loading videos
                        const videoPath = episodeFile.absPath || episodeFile.path;
                        if (videoPath) {
                            console.log('[VIDEO-PLAYER] Loading video from path:', videoPath);
                            
                            // Use the API endpoint like MediaLibraryManager does
                            const encodedPath = encodeURIComponent(videoPath);
                            const videoUrl = `/api/video?path=${encodedPath}`;
                            
                            console.log('[VIDEO-PLAYER] Video URL:', videoUrl);
                            this.playUrl(videoUrl, 'video/mp4', 0, episodeFile);
                        } else {
                            console.error('[VIDEO-PLAYER] No video path found for episode:', selectedEpisode);
                            this.showOverlayAlert('Error: No video path found', 2000);
                        }
                    },
                    // onClose callback
                    () => {
                        console.log('[VIDEO-PLAYER] Episode modal closed');
                    }
                );
            }
            
            // Open the episode modal
            console.log('[VIDEO-PLAYER] Calling episodeModal.open()');
            window.episodeModal.open(currentEpisodeInfo.showName);
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
        
        // Get current video info from Video.js (same as updateEpisodeInfoHeader)
        let filePath = null;
        
        // Get file path from current file or media item (same logic as updateEpisodeInfoHeader)
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
            
            // Find the TV show in the data
            const tvShow = window.mediaLibraryManager.tvShowsData.find(show => {
                const showTitle = show.TMDBTitle || show.name || show.path || '';
                return showTitle.toLowerCase().includes(showName.toLowerCase()) || 
                       showName.toLowerCase().includes(showTitle.toLowerCase());
            });
            
            if (tvShow && tvShow.folders) {
                console.log('[EPISODE-SELECTION] Found TV show:', tvShow.path);
                console.log('[EPISODE-SELECTION] Seasons found:', tvShow.folders.length);
                
                // Collect all episodes from all seasons
                tvShow.folders.forEach(season => {
                    if (season.files && season.files.length > 0) {
                        console.log('[EPISODE-SELECTION] Season', season.name, 'has', season.files.length, 'episodes');
                        episodes.push(...season.files);
                    }
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
            
            const statusText = isCurrentEpisode ? ' (Currently Playing)' : '';
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
                
                // Load the selected episode
                console.log('[EPISODE-SELECTION] Selected episode object:', selectedEpisode);
                
                const episodeFile = {
                    name: selectedEpisode.name,
                    absPath: selectedEpisode.absPath || selectedEpisode.path,
                    relPath: selectedEpisode.relPath,
                    path: selectedEpisode.path,
                    type: 'video/mp4',
                    // Add any other properties that might be needed
                    ...selectedEpisode
                };
                
                console.log('[EPISODE-SELECTION] Created episode file object:', episodeFile);
                
                this.closeEpisodeSelection();
                this.showOverlayAlert(`Loading: ${selectedEpisode.name}`, 2000);
                
                // Use the same approach as MediaLibraryManager for loading videos
                const videoPath = episodeFile.absPath || episodeFile.path;
                if (videoPath) {
                    console.log('[EPISODE-SELECTION] Loading video from path:', videoPath);
                    
                    // Use the API endpoint like MediaLibraryManager does
                    const encodedPath = encodeURIComponent(videoPath);
                    const videoUrl = `/api/video?path=${encodedPath}`;
                    
                    console.log('[EPISODE-SELECTION] Video URL:', videoUrl);
                    this.playUrl(videoUrl, 'video/mp4', 0, episodeFile);
                } else {
                    console.error('[EPISODE-SELECTION] No video path found for episode:', selectedEpisode);
                    this.showOverlayAlert('Error: No video path found', 2000);
                }
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
        console.log('[DEBUG - VIDEO-PLAYER] Playing URL:', src);
        console.log('[DEBUG - VIDEO-PLAYER] URL type:', type);
        console.log('[DEBUG - VIDEO-PLAYER] Start time:', startTime);
        console.log('[DEBUG - VIDEO-PLAYER] Media item:', mediaItem);
        this.currentMediaItem = mediaItem;
        this.currentFile = { name: src, absPath: src };
        
        // Store TV show info if this is a TV show episode
        if (mediaItem) {
            console.log('[DEBUG - VIDEO-PLAYER] About to store TV show info for mediaItem:', mediaItem.name);
            this.storeCurrentTVShowInfo(mediaItem);
            console.log('[DEBUG - VIDEO-PLAYER] Finished storing TV show info for mediaItem');
        } else {
            console.log('[DEBUG - VIDEO-PLAYER] No mediaItem provided, not storing TV show info');
        }
        try {
            // --- Remove any existing subtitle track and button ---
            const oldTrack = this.video.querySelector('track[data-autosub]');
            if (oldTrack) oldTrack.remove();
            const oldBtn = this.controls && this.controls.querySelector('.video-player-subtitle-btn');
            if (oldBtn) oldBtn.remove();
            // --- Try to add subtitle track if .vtt exists ---
            let videoFileName = '';
            if (src.includes('?path=')) {
                // Extract the path param, decode, and get the base filename
                const urlParams = new URLSearchParams(src.split('?')[1]);
                const fullPath = decodeURIComponent(urlParams.get('path') || '');
                videoFileName = fullPath.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
            } else {
                videoFileName = src.split('/').pop().replace(/\.[^.]+$/, '');
            }
            const vttUrl = `/assets/subtitles/${videoFileName}.vtt`;
            fetch(vttUrl, { method: 'HEAD' }).then(res => {
                if (res.ok) {
                    // Add <track> for subtitles
                    const track = document.createElement('track');
                    track.kind = 'subtitles';
                    track.src = vttUrl;
                    track.srclang = 'en';
                    track.label = 'English';
                    track.default = false;
                    track.setAttribute('data-autosub', '1');
                    this.video.appendChild(track);
                    // Add Subtitles button
                    if (this.controls) {
                        const subBtn = document.createElement('button');
                        subBtn.className = 'video-player-subtitle-btn';
                        subBtn.innerHTML = '📝 Subtitles';
                        subBtn.style.cssText = `background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 8px; border-radius: 6px;`;
                        subBtn.onclick = () => {
                            // Toggle subtitle track
                            const tracks = this.video.textTracks;
                            if (tracks && tracks.length) {
                                const track = tracks[0];
                                if (track.mode === 'showing') {
                                    track.mode = 'disabled';
                                    subBtn.style.background = 'transparent';
                                } else {
                                    track.mode = 'showing';
                                    subBtn.style.background = '#1976d2';
                                }
                            }
                        };
                        this.controls.appendChild(subBtn);
                    }
                }
            });
            // --- Robust resume logic with debug logging ---
            let didResume = false;
            console.log('[RESUME DEBUG] Requested startTime:', startTime);
            const setAndPlay = (evt) => {
                if (didResume) return;
                didResume = true;
                console.log('[RESUME DEBUG] Event fired:', evt ? evt.type : 'manual');
                this.vjsPlayer.currentTime(startTime);
                console.log('[RESUME DEBUG] Set currentTime to:', startTime, '| Player currentTime after set:', this.vjsPlayer.currentTime());
                this.vjsPlayer.play();
                setTimeout(() => {
                    console.log('[RESUME DEBUG] After play() | readyState:', this.vjsPlayer.readyState(), '| currentTime:', this.vjsPlayer.currentTime());
                }, 500);
                this.vjsPlayer.off('loadedmetadata', setAndPlay);
                this.vjsPlayer.off('canplay', setAndPlay);
            };
            if (startTime > 0) {
                this.vjsPlayer.on('loadedmetadata', setAndPlay);
                this.vjsPlayer.on('canplay', setAndPlay);
            }
            this.vjsPlayer.src({ src, type });
            this.show();
            
            // Update episode info header
            await this.updateEpisodeInfoHeader();
            
            // Improved auto-play handling with better error recovery
            this.vjsPlayer.ready(() => {
                console.log('[DEBUG - VIDEO-PLAYER] Video.js player ready, attempting auto-play');
                
                // Show the big play button initially
                const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                if (bigPlayButton) {
                    bigPlayButton.style.display = 'block';
                    console.log('[DEBUG - VIDEO-PLAYER] Big play button shown');
                }
                
                // Try to start playing
                this.vjsPlayer.play().then(() => {
                    console.log('[DEBUG - VIDEO-PLAYER] Auto-play successful');
                    // Hide the big play button only after successful auto-play
                    if (bigPlayButton) {
                        bigPlayButton.style.display = 'none';
                        console.log('[DEBUG - VIDEO-PLAYER] Big play button hidden after successful auto-play');
                    }
                }).catch(error => {
                    console.warn('🎬 [VIDEO-PLAYER] Auto-play failed:', error);
                    // Keep the big play button visible when auto-play fails
                    if (bigPlayButton) {
                        bigPlayButton.style.display = 'block';
                        console.log('[DEBUG - VIDEO-PLAYER] Big play button kept visible due to auto-play failure');
                    }
                    // Show a more helpful message
                    this.showMessage('Click the play button to start video (auto-play blocked by browser)');
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
                this.showMessage('Error loading video. Please check if the file exists.');
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
                
                // Auto-save progress for TV shows and movies
                if (window.mediaLibraryManager && typeof window.mediaLibraryManager.saveResumeProgress === 'function') {
                    const currentTime = this.vjsPlayer.currentTime();
                    const duration = this.vjsPlayer.duration();
                    
                    // Use the current media item from MediaLibraryManager
                    const mediaItem = window.mediaLibraryManager.currentMediaItem || window.mediaLibraryManager.currentFile;
                    
                    if (mediaItem && currentTime > 0 && duration > 0) {
                        console.log('🎬 [VIDEO-PLAYER] Auto-saving progress:', { mediaItem, currentTime, duration });
                        window.mediaLibraryManager.saveResumeProgress(mediaItem, currentTime, duration, false); // false = auto-save
                    }
                }
            });
            
            // If video is already ready (cached), set time immediately
            if (startTime > 0 && this.vjsPlayer.readyState() > 0) {
                setAndPlay({type: 'immediate'});
            } else if (startTime === 0) {
                // For videos starting from beginning, wait for canplay event before playing
                console.log('[DEBUG - VIDEO-PLAYER] Video starting from beginning, waiting for canplay event');
                const playWhenReady = () => {
                    console.log('[DEBUG - VIDEO-PLAYER] canplay event fired, starting playback');
                    this.vjsPlayer.play().catch(error => {
                        console.warn('[DEBUG - VIDEO-PLAYER] Play failed on canplay event:', error);
                        // Show big play button if play fails
                        const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                        if (bigPlayButton) {
                            bigPlayButton.style.display = 'block';
                        }
                    });
                    this.vjsPlayer.off('canplay', playWhenReady);
                };
                this.vjsPlayer.on('canplay', playWhenReady);
                
                // If already ready, play immediately
                if (this.vjsPlayer.readyState() > 0) {
                    console.log('[DEBUG - VIDEO-PLAYER] Video already ready, playing immediately');
                    this.vjsPlayer.play().catch(error => {
                        console.warn('[DEBUG - VIDEO-PLAYER] Immediate play failed:', error);
                        // Show big play button if play fails
                        const bigPlayButton = this.vjsPlayer.el().querySelector('.vjs-big-play-button');
                        if (bigPlayButton) {
                            bigPlayButton.style.display = 'block';
                        }
                    });
                } else {
                    console.log('[DEBUG - VIDEO-PLAYER] Video not ready yet, waiting for canplay event. ReadyState:', this.vjsPlayer.readyState());
                }
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
            this.showMessage('Error loading video. Please try again.');
        }
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
    
    // Wait for initialization to complete before setting up additional features
    const checkInitialization = () => {
        if (window.videoPlayer && window.videoPlayer.container) {
            // Register with command system
            window.videoPlayer.registerWithCommandSystem();
            
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
        } else {
            // Check again in 100ms
            setTimeout(checkInitialization, 100);
        }
    };
    checkInitialization();
});

// Export for module usage
export default VideoPlayer; 