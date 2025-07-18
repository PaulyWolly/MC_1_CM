/*
  VIDEOPLAYER.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
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
                    margin: 0 30px !important;
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
                        this.el().innerHTML = '<span>🔖</span>';
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
                autoplay: false,
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
        if (!file) return;
        if (!this.vjsPlayer) {
            console.error('🎬 [VIDEO-PLAYER] Video.js player not initialized');
            return;
        }
        
        console.log('🎬 [VIDEO-PLAYER] Loading video:', file.name);
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
            
            this.vjsPlayer.on('loadeddata', () => {
                console.log('🎬 [VIDEO-PLAYER] Video loaded successfully:', file.name);
                this.showMessage(`Loaded: ${file.name}`);
                
                // Update episode info header
                this.updateEpisodeInfoHeader();
                
                // Add pause event handler for Watch Later
                this.vjsPlayer.off('pause'); // Remove any previous handler to avoid duplicates
                this.vjsPlayer.on('pause', () => {
                    console.log('🎬 [VIDEO-PLAYER] Pause event triggered');
                    // No auto-save on pause. Only Save for Later button saves progress.
                });
            });
            
            this.vjsPlayer.play().catch(error => {
                console.warn('🎬 [VIDEO-PLAYER] Auto-play failed:', error);
                this.showMessage('Click play to start video (auto-play blocked by browser)');
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
        
        const path = filePath.replace(/\\/g, '/'); // Normalize path separators
        
        // Extract show name from TV-SHOWS directory structure
        const tvShowsMatch = path.match(/TV[-_]SHOWS?[\/\\]([^\/\\]+)/i);
        let showName = 'Unknown Show';
        if (tvShowsMatch) {
            showName = tvShowsMatch[1]
                .replace(/\(\d{4}\)/, '') // Remove year in parentheses
                .replace(/\[.*?\]/g, '') // Remove brackets
                .replace(/\d{4}/, '') // Remove standalone years
                .replace(/[._-]+/g, ' ') // Replace separators with spaces
                .replace(/\s+/g, ' ') // Collapse multiple spaces
                .trim();
        }
        
        // Extract season number - try multiple patterns
        let seasonNumber = null;
        const seasonPatterns = [
            /season[\s_-]*(\d+)/i,
            /s(\d+)e\d+/i,
            /s(\d+)/i,
            /(\d+)x\d+/i
        ];
        
        for (const pattern of seasonPatterns) {
            const match = path.match(pattern);
            if (match) {
                seasonNumber = parseInt(match[1], 10);
                break;
            }
        }
        
        // Extract episode number from filename - try multiple patterns
        const filename = path.split('/').pop() || '';
        let episodeNumber = null;
        const episodePatterns = [
            /S\d+E(\d+)/i,
            /season\s*\d+\s*episode\s*(\d+)/i,
            /ep(?:isode)?[\s_-]*(\d+)/i,
            /E(\d+)/i,
            /\d+x(\d+)/i,
            /[\s_-](\d+)[\s_-]/,
            /(\d+)\.(?:mp4|mkv|avi|mov|wmv|flv|m4v)$/i
        ];
        
        for (const pattern of episodePatterns) {
            const match = filename.match(pattern);
            if (match) {
                const num = parseInt(match[1], 10);
                // Only accept reasonable episode numbers (1-999)
                if (num >= 1 && num <= 999) {
                    episodeNumber = num;
                    break;
                }
            }
        }
        
        return {
            showName,
            seasonNumber,
            episodeNumber,
            isValid: showName !== 'Unknown Show' && (seasonNumber !== null || episodeNumber !== null)
        };
    }

    // Update the episode info header
    updateEpisodeInfoHeader() {
        if (!this.episodeInfoHeader) return;
        
        let filePath = null;
        
        // Get file path from current file or media item
        if (this.currentFile) {
            filePath = this.currentFile.absPath || this.currentFile.name;
        } else if (this.currentMediaItem) {
            filePath = this.currentMediaItem.path || this.currentMediaItem.absPath;
        }
        
        if (!filePath) {
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
        
        const episodeInfo = this.extractEpisodeInfo(decodedPath);
        
        if (episodeInfo && episodeInfo.isValid) {
            let infoText = episodeInfo.showName;
            
            if (episodeInfo.seasonNumber !== null) {
                infoText += ` | Season ${episodeInfo.seasonNumber}`;
            }
            
            if (episodeInfo.episodeNumber !== null) {
                infoText += ` | Episode ${episodeInfo.episodeNumber}`;
            }
            
            this.episodeInfoHeader.innerHTML = infoText;
        } else {
            // For non-TV show files, just show the filename without extension
            const filename = decodedPath.split(/[\/\\]/).pop() || '';
            const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
            this.episodeInfoHeader.innerHTML = nameWithoutExt;
        }
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

    async fetchMediaLibrary() {
        if (this.mediaLibrary) return this.mediaLibrary;
        try {
            const response = await fetch('/api/media-library');
            const result = await response.json();
            if (result.success) {
                this.mediaLibrary = result.library;
                return this.mediaLibrary;
            } else {
                throw new Error(result.error || 'Failed to fetch media library');
            }
        } catch (err) {
            console.error('[VideoPlayer] Failed to fetch media library:', err);
            this.mediaLibrary = null;
            return null;
        }
    }

    // Find the current episode and next episode in the library
    findCurrentAndNextEpisode(currentFilePath) {
        // Flatten the media library to find the current and next episode
        const flattenEpisodes = (node, episodes = []) => {
            if (node.files && node.files.length > 0) {
                for (const file of node.files) {
                    episodes.push({
                        ...file,
                        folder: node.path
                    });
                }
            }
            if (node.folders && node.folders.length > 0) {
                for (const folder of node.folders) {
                    flattenEpisodes(folder, episodes);
                }
            }
            return episodes;
        };
        if (!this.mediaLibrary) return { current: null, next: null };
        const allEpisodes = flattenEpisodes(this.mediaLibrary);
        const idx = allEpisodes.findIndex(ep => ep.absPath === currentFilePath || ep.relPath === currentFilePath);
        if (idx === -1) return { current: null, next: null };
        const current = allEpisodes[idx];
        const next = allEpisodes[idx + 1] || null;
        return { current, next };
    }

    setupUpNextAndSkipIntro() {
        if (!this.vjsPlayer) {
            console.warn('🎬 [VIDEO-PLAYER] Video.js player not initialized for Up Next setup');
            return;
        }
        
        // Remove any existing overlays
        this.removeUpNextOverlay();
        this.removeSkipIntroButton();

        // Add Skip Intro button (default 90s)
        this.addSkipIntroButton(90);

        // Listen for timeupdate to show Up Next overlay
        this.vjsPlayer.off('timeupdate'); // Remove previous listeners
        this.vjsPlayer.on('timeupdate', () => {
            const duration = this.vjsPlayer.duration();
            const current = this.vjsPlayer.currentTime();
            if (duration && current > duration - 60 && !this.upNextShown) {
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

    showUpNextOverlay() {
        // Find next episode
        const filePath = this.currentFile.absPath || this.currentFile.name;
        const { next } = this.findCurrentAndNextEpisode(filePath);
        this.nextEpisodeInfo = next;
        if (!next) return;
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

    playNextEpisode() {
        this.removeUpNextOverlay();
        if (this.nextEpisodeInfo) {
            // Simulate a File object for the next episode
            const nextFile = {
                name: this.nextEpisodeInfo.name,
                absPath: this.nextEpisodeInfo.absPath,
                type: 'video/mp4', // Assume mp4 for now
            };
            this.loadVideo(nextFile);
        }
    }

    // Public method to play a video from a URL
    // Accepts optional mediaItem for robust Watch Later saving
    async playUrl(src, type = 'video/mp4', startTime = 0, mediaItem = null) {
        await this.readyPromise;
        if (!this.vjsPlayer) {
            console.error('🎬 [VIDEO-PLAYER] Video.js player not initialized');
            return;
        }
        if (!src) {
            console.error('🎬 [VIDEO-PLAYER] No source URL provided');
            return;
        }
        console.log('🎬 [VIDEO-PLAYER] Playing URL:', src);
        this.currentMediaItem = mediaItem;
        this.currentFile = { name: src, absPath: src };
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
            this.updateEpisodeInfoHeader();
            
            // Add pause event handler for Watch Later (same as in loadVideo)
            this.vjsPlayer.off('pause'); // Remove any previous handler to avoid duplicates
            this.vjsPlayer.on('pause', () => {
                console.log('🎬 [VIDEO-PLAYER] Pause event triggered (playUrl)');
                // No auto-save on pause. Only Save for Later button saves progress.
            });
            
            // If video is already ready (cached), set time immediately
            if (startTime > 0 && this.vjsPlayer.readyState() > 0) {
                setAndPlay({type: 'immediate'});
            } else if (startTime === 0) {
                this.vjsPlayer.play();
            }
            // Fetch media library and set up Up Next logic
            this.fetchMediaLibrary().then(() => this.setupUpNextAndSkipIntro());
        } catch (error) {
            console.error('🎬 [VIDEO-PLAYER] Error playing URL:', error);
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