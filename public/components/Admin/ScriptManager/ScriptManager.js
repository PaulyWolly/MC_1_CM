/*
  SCRIPTMANAGER.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

/**
 * ScriptManager Component
 * 
 * Manages and categorizes all scripts in the /scripts folder
 * Provides a user-friendly interface to view, run, and manage scripts
 * 
 * Categories:
 * - Movies: Movie-related scripts (posters, scanning, etc.)
 * - TV Shows: TV show scripts (posters, season/episode images, etc.)
 * - System: System maintenance scripts (backup, cleanup, etc.)
 * - Audio: Audio processing scripts
 * - YouTube: YouTube-related scripts
 * - Fixes: Bug fix scripts
 * - Development: Development and utility scripts
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */

class ScriptManager {
    constructor() {
        this.isVisible = false;
        this.currentCategory = 'all';
        this.scripts = {};
        this.logPollingInterval = null;
        this.currentLogScriptName = null;
        this.categories = {
            'movies': {
                name: 'Movies',
                icon: '🎬',
                description: 'Movie-related scripts for posters, scanning, and management'
            },
            'tv-shows': {
                name: 'TV Shows',
                icon: '📺',
                description: 'TV show scripts for posters, season/episode images, and management'
            },
            'system': {
                name: 'System',
                icon: '⚙️',
                description: 'System maintenance, backup, and cleanup scripts'
            },
            'audio': {
                name: 'Audio',
                icon: '🎵',
                description: 'Audio processing and conversion scripts'
            },
            'youtube': {
                name: 'YouTube',
                icon: '📹',
                description: 'YouTube cache and playlist management scripts'
            },
            'fixes': {
                name: 'Fixes',
                icon: '🔧',
                description: 'Bug fixes and code correction scripts'
            },
            'development': {
                name: 'Development',
                icon: '💻',
                description: 'Development utilities and testing scripts'
            }
        };
        
        this.scriptCategories = {
            'movies': [
                'scan_media_library_movies.js',
                'fetch_tv_posters.js',
                'convert_tv_posters.js',
                'interactive_movie_poster_selector.js',
                'check_audio_codecs_movies.js',
                'convert_audio_to_aac_movies.js',
                'update_poster_mapping_dryrun.js',
                'update_poster_mapping_write.js',
                'normalize_movie_names.js'
            ],
            'tv-shows': [
                'scan_media_library_tv-shows.js',
                'fetch_tmdb_posters_tv-shows.js',
                'fetch_tmdb_tv-show_season_images.js',
                'fetch_tmdb_tv-show_episode_images.js',
                'download_tv_images.js',
                'setup_tmdb.js',
                'test_tv_images.js',
                'interactive_tv_poster_selector.js',
                'check_audio_codecs_tv-shows.js',
                'convert_audio_to_aac_tv-shows.js',
                'normalize_tv_shows.js'
            ],
            'system': [
                'BACKUP_APP.js',
                'RESTORE_BACKUP.js',
                'RESTORE_APP.js',
                'AI_BKUP.js',
                'scan_media_library.js',
                'scan_emby_posters.js',
                'generate-superadmin-code.js',
                'test-auth.js',
                'check_video_player_setup.js',
                'start-with-config.js',
                'start-frontend-with-config.js'
            ],
            'audio': [
                'convert_audio_to_aac.js',
                'scan_audio_codecs.js',
                'check_audio_codecs.js',
                'convert_incompatible_audio.js'
            ],
            'youtube': [
                'repopulate-youtube-cache.js',
                'refresh-youtube-cache.js',
                'migrate-youtube-queries.js',
                'clear-youtube-cache.js',
                'migrate_playlist_videos.js'
            ],
            'fixes': [
                'fix_json_linebreaks.js',
                'fix-joke-audio-syntax.js',
                'fix-playNextInQueue-placement.js',
                'fix-joke-audio-mode.js',
                'fix-joke-audio-playback-v2.js',
                'fix-joke-audio-playback.js',
                'fix-enterAISpeakingMode-error.js',
                'fix-duplicate-appjs.js',
                'fix-duplicate-function-code.js',
                'fix-api-urls.js'
            ],
            'development': [
                'playlist-duration-backfill.js',
                'merge-santana-json.js',
                'merge-playlist-duplicates.js',
                'convert_old_to_new_cachekeys_for_santanta.js',
                'clean-localStorage-cache.js',
                'update_release-notes_readme.mjs',
                'update_headers.mjs',
                'see_colors.js',
                'refactor-api-calls.js',
                'download-icons.js',
                'download-mock-thumbs.js',
                'VALIDATE_FUNCTIONS.js',
                'test_parameterized_script.js'
            ]
        };
    }

    async init() {
        await this.loadCSS();
        await this.loadScripts();
        this.setupEventListeners();
        console.log('🔧 [ScriptManager] Initialized successfully');
    }

    async loadScripts() {
        try {
            const response = await fetch('/api/admin/scripts');
            if (response.ok) {
                this.scripts = await response.json();
            } else {
                console.warn('⚠️ [ScriptManager] Could not load scripts from API, using fallback');
                this.scripts = this.getFallbackScripts();
            }
        } catch (error) {
            console.warn('⚠️ [ScriptManager] Error loading scripts:', error);
            this.scripts = this.getFallbackScripts();
        }
    }

    getFallbackScripts() {
        // Fallback script data if API is not available
        const scripts = {};
        
        // Add all scripts from categories
        Object.keys(this.scriptCategories).forEach(category => {
            this.scriptCategories[category].forEach(scriptName => {
                scripts[scriptName] = {
                    name: scriptName,
                    category: category,
                    description: this.getScriptDescription(scriptName),
                    size: 'Unknown',
                    modified: 'Unknown'
                };
            });
        });
        
        return scripts;
    }

    getScriptDescription(scriptName) {
        const descriptions = {
            'download_tv_images.js': 'Download season and episode images from TMDb',
            'setup_tmdb.js': 'Setup TMDb API key and run image scripts',
            'test_tv_images.js': 'Test TV show image integration',
            'fetch_tmdb_tv-show_season_images.js': 'Fetch season poster image URLs from TMDb',
            'fetch_tmdb_tv-show_episode_images.js': 'Fetch episode still image URLs from TMDb',
            'fetch_tmdb_posters_tv-shows.js': 'Fetch TV show posters from TMDb',
            'interactive_movie_poster_selector.js': 'Interactive tool to browse and select correct movie posters from TMDb',
            'interactive_tv_poster_selector.js': 'Interactive tool to browse and select correct TV show posters from TMDb',
            'scan_media_library_movies.js': 'Scan movie library for new content',
            'scan_media_library_tv-shows.js': 'Scan TV show library for new content',
            'BACKUP_APP.js': 'Create backup of the application',
            'RESTORE_BACKUP.js': 'Restore from backup',
            'convert_audio_to_aac.js': 'Convert audio files to AAC format',
            'repopulate-youtube-cache.js': 'Repopulate YouTube cache data',
            'clear-youtube-cache.js': 'Clear YouTube cache',
            'fix-duplicate-appjs.js': 'Fix duplicate app.js issues',
            'generate-superadmin-code.js': 'Generate superadmin access code',
            'check_audio_codecs_movies.js': 'Check audio codecs for all MOVIES (browser compatibility)',
            'convert_audio_to_aac_movies.js': 'Convert incompatible audio in MOVIES to AAC (browser compatible)',
            'check_audio_codecs_tv-shows.js': 'Check audio codecs for all TV SHOWS (browser compatibility)',
            'convert_audio_to_aac_tv-shows.js': 'Convert incompatible audio in TV SHOWS to AAC (browser compatible)',
            'update_poster_mapping_dryrun.js': 'Dry run: See which normalized movie files will be mapped to posters (no changes made)',
            'update_poster_mapping_write.js': 'Write: Update movie_posters.json to match normalized movie files (backs up old mapping)'
        };
        
        return descriptions[scriptName] || 'Script for system maintenance';
    }

    getScriptParameters(scriptName) {
        const parameterSets = {
            'normalize_movie_names.js': [
                { name: 'Dry Run', params: ['--dry-run'], description: 'Preview changes without making them' },
                { name: 'Rename Folders', params: ['--rename-folders'], description: 'Normalize folder names only' },
                { name: 'Rename Files', params: ['--rename-files'], description: 'Normalize file names only' },
                { name: 'Rename Both', params: ['--rename-folders', '--rename-files'], description: 'Normalize both folders and files' },
                { name: 'Test Mode', params: ['--test'], description: 'Process first 5 movies only' }
            ],
            'normalize_tv_shows.js': [
                { name: 'Dry Run', params: ['--dry-run'], description: 'Preview changes without making them' },
                { name: 'Rename Folders', params: ['--rename-folders'], description: 'Normalize folder names only' },
                { name: 'Rename Files', params: ['--rename-files'], description: 'Normalize file names only' },
                { name: 'Rename Both', params: ['--rename-folders', '--rename-files'], description: 'Normalize both folders and files' }
            ],
            'update_poster_mapping_dryrun.js': [
                { name: 'Dry Run', params: [], description: 'Preview poster mapping updates (no changes)' }
            ],
            'update_poster_mapping_write.js': [
                { name: 'Write Mapping', params: [], description: 'Update poster mapping file (backs up old mapping)' }
            ],
            'test_parameterized_script.js': [
                { name: 'Dry Run', params: ['--dry-run'], description: 'Test dry run mode' },
                { name: 'Rename Folders', params: ['--rename-folders'], description: 'Test rename folders mode' },
                { name: 'Rename Files', params: ['--rename-files'], description: 'Test rename files mode' },
                { name: 'Test Mode', params: ['--test'], description: 'Test mode with limited processing' },
                { name: 'All Options', params: ['--dry-run', '--rename-folders', '--rename-files'], description: 'Test all options together' }
            ]
        };
        
        return parameterSets[scriptName] || [];
    }

    show() {
        this.isVisible = true;
        this.render();
        console.log('🔧 [ScriptManager] Script manager opened');
    }

    hide() {
        this.isVisible = false;
        const modal = document.getElementById('script-manager-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        console.log('🔧 [ScriptManager] Script manager closed');
    }

    render() {
        let modal = document.getElementById('script-manager-modal');
        if (!modal) {
            this.createModal();
            modal = document.getElementById('script-manager-modal'); // re-select after creation
        }
        modal.style.display = 'flex';
        this.renderContent();
    }

    createModal() {
        const modalHTML = `
            <div id="script-manager-modal" class="script-manager-modal" style="display:none;">
                <div class="script-manager-modal-content">
                    <div class="script-manager-header">
                        <h2>🔧 Script Manager</h2>
                        <button id="close-script-manager" class="script-manager-close">&times;</button>
                    </div>
                    <div class="script-manager-body">
                        <div class="script-categories">
                            <button class="category-btn active" data-category="all">
                                📁 All Scripts
                            </button>
                            ${Object.keys(this.categories).map(category => `
                                <button class="category-btn" data-category="${category}">
                                    ${this.categories[category].icon} ${this.categories[category].name}
                                </button>
                            `).join('')}
                        </div>
                        <div class="scripts-container">
                            <div id="scripts-list" class="scripts-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    renderContent() {
        const scriptsList = document.getElementById('scripts-list');
        if (!scriptsList) return;

        // Custom grouped card layout for Movies and TV Shows
        if (this.currentCategory === 'movies' || this.currentCategory === 'tv-shows') {
            let groupTitle = this.currentCategory === 'movies' ? '🎬 Movies' : '📺 TV Shows';
            let checkScript = this.currentCategory === 'movies' ? 'check_audio_codecs_movies.js' : 'check_audio_codecs_tv-shows.js';
            let convertScript = this.currentCategory === 'movies' ? 'convert_audio_to_aac_movies.js' : 'convert_audio_to_aac_tv-shows.js';
            let checkDesc = this.getScriptDescription(checkScript);
            let convertDesc = this.getScriptDescription(convertScript);
            let imageSelectorDesc = this.currentCategory === 'movies'
                ? 'Review and select the correct movie poster images from TMDb'
                : 'Review and select the correct TV show poster images from TMDb';
            let imageSelectorBtn = this.currentCategory === 'movies'
                ? 'Review/Download Movie Posters'
                : 'Review/Download TV Show Posters';
            let mode = this.currentCategory === 'movies' ? 'movie' : 'tv';
            scriptsList.innerHTML = `
                <div class="scripts-header">
                    <h3>${groupTitle}</h3>
                    <p>To ensure all your videos play with audio and have correct images in browsers, follow these steps:</p>
                </div>
                <div class="scripts-grid three-columns">
                    <div class="script-group-card">
                        <div class="script-group-instructions">
                            <b>Step 1:</b> <span>${checkDesc}</span><br>
                            <button class="script-run-btn" style="margin-top:8px;width:100%;" onclick="scriptManager.runScript('${checkScript}', true)">Check Audio Codecs</button>
                            <hr style="margin:18px 0 12px 0;opacity:0.2;">
                            <b>Step 2:</b> <span>${convertDesc}</span><br>
                            <button class="script-run-btn" style="margin-top:8px;width:100%;" onclick="scriptManager.runScript('${convertScript}', true)">Convert Audio to AAC</button>
                            <hr style="margin:18px 0 12px 0;opacity:0.2;">
                            <b>Step 3:</b> <span>${imageSelectorDesc}</span><br>
                            <button class="script-run-btn" style="margin-top:8px;width:100%;background:#3a7bd5;" id="poster-selector-launch-btn">${imageSelectorBtn}</button>
                        </div>
                    </div>
                    <div class="script-group-card script-group-card-empty"></div>
                    <div class="script-group-card script-group-card-empty"></div>
                </div>
            `;
            // Attach event handler for the PosterSelector launch button
            setTimeout(async () => {
                const btn = document.getElementById('poster-selector-launch-btn');
                if (btn) {
                    btn.onclick = async () => {
                        const module = await import('../../PosterSelector/PosterSelector.js');
                        const PosterSelector = module.default;
                        const ps = new PosterSelector(mode);
                        ps.init();
                    };
                }
            }, 0);
            return;
        }

        // Default rendering for other categories
        const filteredScripts = this.getFilteredScripts();
        scriptsList.innerHTML = `
            <div class="scripts-header">
                <h3>${this.currentCategory === 'all' ? 'All Scripts' : this.categories[this.currentCategory]?.name || 'Scripts'}</h3>
                <p>${this.currentCategory === 'all' ? 'All available scripts' : this.categories[this.currentCategory]?.description || ''}</p>
            </div>
            <div class="scripts-grid">
                ${filteredScripts.map(script => this.renderScriptCard(script)).join('')}
            </div>
        `;
    }

    getFilteredScripts() {
        if (this.currentCategory === 'all') {
            return Object.values(this.scripts);
        }
        
        return Object.values(this.scripts).filter(script => 
            script.category === this.currentCategory
        );
    }

    renderScriptCard(script) {
        const category = this.categories[script.category];
        const parameters = this.getScriptParameters(script.name);
        
        let actionButtons = '';
        if (parameters.length > 0) {
            // Script has parameterized options
            actionButtons = parameters.map(param => `
                <button class="script-run-btn script-param-btn" 
                        onclick="scriptManager.runScript('${script.name}', true, ${JSON.stringify(param.params)})"
                        title="${param.description}">
                    ▶️ ${param.name}
                </button>
            `).join('');
        } else {
            // Standard single run button
            actionButtons = `
                <button class="script-run-btn" onclick="scriptManager.runScript('${script.name}', true)">
                    ▶️ Run
                </button>
            `;
        }
        
        return `
            <div class="script-card" data-script="${script.name}">
                <div class="script-card-header">
                    <div class="script-icon">${category?.icon || '📄'}</div>
                    <div class="script-info">
                        <h4>${script.name}</h4>
                        <span class="script-category">${category?.name || script.category}</span>
                    </div>
                </div>
                <div class="script-card-body">
                    <p>${script.description}</p>
                    <div class="script-meta">
                        <span class="script-size">${script.size}</span>
                        <span class="script-modified">${script.modified}</span>
                    </div>
                </div>
                <div class="script-card-actions">
                    ${actionButtons}
                </div>
            </div>
        `;
    }

    async runScript(scriptName, showLog = false, parameters = []) {
        if (showLog) {
            this.showScriptLog(scriptName);
            this.startLogPolling(scriptName);
        } else {
            const scriptLog = document.getElementById('script-log');
            if (!scriptLog) {
                this.showScriptLog(scriptName);
            }
        }

        const paramString = parameters.length > 0 ? ` with parameters: ${parameters.join(' ')}` : '';
        console.log(`🔧 [ScriptManager] Running script: ${scriptName}${paramString}`);
        
        try {
            const response = await fetch('/api/admin/run-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ script: scriptName, parameters })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.addLogMessage(`✅ ${scriptName} completed successfully`, 'success');
                if (result.output) {
                    this.addLogMessage(result.output, 'output');
                }
            } else {
                this.addLogMessage(`❌ ${scriptName} failed: ${result.error}`, 'error');
            }

        } catch (error) {
            this.addLogMessage(`❌ Error running ${scriptName}: ${error.message}`, 'error');
            console.error('🔧 [ScriptManager] Script execution error:', error);
        } finally {
            // Stop polling when script completes (success or failure)
            this.stopLogPolling();
        }
    }

    async viewScript(scriptName) {
        try {
            const response = await fetch(`/api/admin/script-content/${encodeURIComponent(scriptName)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showScriptViewer(scriptName, result.content);
            } else {
                alert(`Failed to load script: ${result.error}`);
            }

        } catch (error) {
            alert(`Error loading script: ${error.message}`);
            console.error('🔧 [ScriptManager] Script viewing error:', error);
        }
    }

    showScriptViewer(scriptName, content) {
        const modalHTML = `
            <div id="script-viewer-modal" class="script-viewer-modal">
                <div class="script-viewer-modal-content">
                    <div class="script-viewer-header">
                        <h3>📄 ${scriptName}</h3>
                        <button id="close-script-viewer" class="script-viewer-close">&times;</button>
                    </div>
                    <div class="script-viewer-body">
                        <pre><code>${this.escapeHtml(content)}</code></pre>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing viewer if any
        const existingViewer = document.getElementById('script-viewer-modal');
        if (existingViewer) {
            existingViewer.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const viewer = document.getElementById('script-viewer-modal');
        viewer.style.display = 'flex';
        
        // Setup close button
        document.getElementById('close-script-viewer').onclick = () => {
            viewer.remove();
        };
    }

    showScriptLog(scriptName) {
        const logHTML = `
            <div id="script-log-modal" class="script-log-modal">
                <div class="script-log-modal-content">
                    <div class="script-log-header">
                        <h3>📋 Script Execution Log: <span class="script-log-scriptname">${scriptName || ''}</span></h3>
                        <button id="close-script-log" class="script-log-close">&times;</button>
                    </div>
                    <div class="script-log-body">
                        <div id="script-log" class="script-log">
                            <div class="log-spinner" style="display:none;justify-content:center;align-items:center;height:100%;font-size:1.2em;color:#90cdf4;">
                                <span class="spinner"></span> Running...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', logHTML);
        
        const logModal = document.getElementById('script-log-modal');
        logModal.style.display = 'flex';
        
        // Setup close button
        document.getElementById('close-script-log').onclick = () => {
            this.stopLogPolling();
            logModal.remove();
        };
    }

    addLogMessage(message, type = 'info') {
        const scriptLog = document.getElementById('script-log');
        if (!scriptLog) return;

        const timestamp = new Date().toLocaleTimeString();
        const messageElement = document.createElement('div');
        messageElement.className = `log-message log-${type}`;
        messageElement.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
        
        scriptLog.appendChild(messageElement);
        scriptLog.scrollTop = scriptLog.scrollHeight;
    }

    startLogPolling(scriptName) {
        this.stopLogPolling();
        this.currentLogScriptName = scriptName;
        this.fetchAndDisplayLog(scriptName); // Fetch immediately
        this.logPollingInterval = setInterval(() => {
            this.fetchAndDisplayLog(scriptName);
        }, 1500);
        console.log(`🔧 [ScriptManager] Started log polling for: ${scriptName}`);
    }

    stopLogPolling() {
        if (this.logPollingInterval) {
            clearInterval(this.logPollingInterval);
            this.logPollingInterval = null;
            this.currentLogScriptName = null;
            console.log('🔧 [ScriptManager] Stopped log polling');
        }
    }

    async fetchAndDisplayLog(scriptName) {
        try {
            const response = await fetch(`/api/admin/script-log?name=${encodeURIComponent(scriptName)}`);
            if (response.ok) {
                const data = await response.json();
                const logDiv = document.getElementById('script-log');
                const spinnerDiv = logDiv ? logDiv.querySelector('.log-spinner') : null;
                if (logDiv) {
                    if (data.log && data.log.trim().length > 0) {
                        logDiv.innerHTML = `<pre class="log-content">${this.escapeHtml(data.log)}</pre>`;
                        logDiv.scrollTop = logDiv.scrollHeight;
                    } else {
                        // Show spinner if log is empty
                        if (spinnerDiv) spinnerDiv.style.display = 'flex';
                        else logDiv.innerHTML = `<div class="log-spinner" style="display:flex;justify-content:center;align-items:center;height:100%;font-size:1.2em;color:#90cdf4;"><span class="spinner"></span> Running...</div>`;
                    }
                }
            }
        } catch (error) {
            console.warn('🔧 [ScriptManager] Error fetching log:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupEventListeners() {
        // Category switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                this.switchCategory(e.target.dataset.category);
            }
        });

        // Close button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'close-script-manager') {
                this.hide();
            }
        });
    }

    switchCategory(category) {
        this.currentCategory = category;
        
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Re-render content
        this.renderContent();
    }

    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="ScriptManager.css"]');
            if (existingLink) return resolve();
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/Admin/ScriptManager/ScriptManager.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }
}

window.ScriptManager = ScriptManager;
export default ScriptManager;