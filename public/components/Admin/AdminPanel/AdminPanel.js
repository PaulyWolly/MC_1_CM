/*
  ADMINPANEL.JS
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
  Created by Paul Welby
*/

/**
 * AdminPanel Component
 * 
 * Main admin panel component that provides administrative tools and utilities.
 * Manages the admin interface and coordinates with sub-components.
 * 
 * Features:
 * - Script Runner for server maintenance
 * - System Status monitoring
 * - Configuration management
 * - Log viewing
 * - Database tools
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */
class AdminPanel {
    constructor() {
        // Component state
        this.isInitialized = false;
        this.isVisible = false;
        this.currentTab = 'script-runner';
        this.htmlTemplate = null;
        this.currentUser = null; // Store current user info
        this.token = localStorage.getItem('jwtToken');
        
        // DOM element references
        this.containerElement = null;
        this.tabElements = null;
        this.contentElements = null;
        this.backButton = null;
        
        // Bind methods to preserve 'this' context
        this.init = this.init.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.switchTab = this.switchTab.bind(this);
        this.handleScriptRun = this.handleScriptRun.bind(this);
        this.handleBackClick = this.handleBackClick.bind(this);
        this.checkAuth = this.checkAuth.bind(this);
        this.logout = this.logout.bind(this);
    }

    /**
     * Initialize the component
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🔧 [AdminPanel] Initializing admin panel...');
            
            // Load component assets (CSS and HTML template) - DON'T load LoginManager automatically
            await Promise.all([
                this.loadCSS(),
                // this.loadLoginManagerCSS(), // Don't load automatically
                this.loadHTML(),
                // this.loadLoginManagerHTML() // Don't load automatically
            ]);
            
            // Create component from HTML template
            this.createFromTemplate();
            
            // Setup DOM element references
            this.setupElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Component-specific initialization
            this.initializeComponent();
            
            // DON'T automatically restore session - only restore when explicitly requested
            // this.restoreSession();
            
            // Setup login callback
            if (window.LoginManager) {
                console.log('🔧 [AdminPanel] Setting up onLogin callback in init()...');
                window.LoginManager.onLogin = (user) => {
                    console.log(`🔧 [AdminPanel] === LOGIN CALLBACK EXECUTED ===`);
                    console.log(`🔧 [AdminPanel] Login callback received for user: ${user.email} (${user.role})`);
                    console.log(`🔧 [AdminPanel] this.containerElement exists:`, !!this.containerElement);
                    console.log(`🔧 [AdminPanel] this.containerElement display:`, this.containerElement?.style.display);
                    
                    // Store the authenticated user
                    this.currentUser = user;
                    
                    // Track successful login
                    this.trackActivity(`User ${user.email} logged in successfully`, 'success');
                    
                    // Ensure we're in the admin context
                    this.isVisible = true;
                    
                    // Update UI based on user role
                    this.updateRoleBasedUI();
                    
                    // Force show the admin panel
                    if (this.containerElement) {
                        this.containerElement.style.display = 'block';
                        console.log('🔧 [AdminPanel] Admin panel displayed after login');
                    } else {
                        console.error('🔧 [AdminPanel] ERROR: containerElement is null!');
                    }
                    
                    // CRITICAL: Hide the main app when showing admin panel
                    const mainApp = document.querySelector('.chat-container, .main-content, #app');
                    if (mainApp) {
                        mainApp.style.display = 'none';
                        console.log('🔧 [AdminPanel] Main app hidden after login');
                    } else {
                        console.warn('🔧 [AdminPanel] Main app element not found');
                    }
                    
                    // Force hide any login modals that might still be visible
                    this.forceHideLoginModal();
                    
                    // Also update the main app's adminPanel instance if it exists
                    if (window.adminPanel && window.adminPanel !== this) {
                        window.adminPanel.currentUser = user;
                        window.adminPanel.updateRoleBasedUI();
                        // Don't automatically show - only show when explicitly requested
                        // window.adminPanel.show();
                    }
                    
                    // Debug the current state
                    this.debugAuthState();
                    
                    console.log(`🔧 [AdminPanel] === LOGIN CALLBACK COMPLETE ===`);
                    console.log(`🔧 [AdminPanel] User successfully logged in and admin panel is now visible`);
                };
                console.log('🔧 [AdminPanel] onLogin callback set up successfully');
            } else {
                console.warn('🔧 [AdminPanel] LoginManager not available during init()');
            }
            
            this.isInitialized = true;
            console.log('🔧 [AdminPanel] Admin panel initialized successfully');
            
            // Note: AdminPanel instance is now managed by the main app
            // to avoid conflicts and ensure proper session persistence
            
        } catch (error) {
            console.error('🔧 [AdminPanel] Initialization error:', error);
        }
    }

    /**
     * Load CSS for the component
     */
    async loadCSS() {
        return new Promise((resolve, reject) => {
            try {
                // Check if CSS is already loaded
                const existingLink = document.querySelector('link[href*="AdminPanel.css"]');
                if (existingLink) {
                    console.log('🔧 [AdminPanel] CSS already loaded');
                    resolve();
                    return;
                }

                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = './components/Admin/AdminPanel/AdminPanel.css';
                link.onload = () => {
                    console.log('🔧 [AdminPanel] CSS loaded successfully');
                    resolve();
                };
                link.onerror = () => {
                    console.error('🔧 [AdminPanel] Failed to load CSS');
                    reject(new Error('Failed to load AdminPanel CSS'));
                };
                document.head.appendChild(link);
            } catch (error) {
                console.error('🔧 [AdminPanel] CSS loading error:', error);
                reject(error);
            }
        });
    }

    /**
     * Load LoginManager CSS
     */
    async loadLoginManagerCSS() {
        return new Promise((resolve, reject) => {
            try {
                // Check if LoginManager CSS is already loaded
                const existingLink = document.querySelector('link[href*="LoginManager.css"]');
                if (existingLink) {
                    console.log('🔧 [AdminPanel] LoginManager CSS already loaded');
                    resolve();
                    return;
                }

                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = 'text/css';
                link.href = './components/Admin/LoginManager/LoginManager.css';
                link.onload = () => {
                    console.log('🔧 [AdminPanel] LoginManager CSS loaded successfully');
                    resolve();
                };
                link.onerror = () => {
                    console.error('🔧 [AdminPanel] Failed to load LoginManager CSS');
                    reject(new Error('Failed to load LoginManager CSS'));
                };
                document.head.appendChild(link);
            } catch (error) {
                console.error('🔧 [AdminPanel] LoginManager CSS loading error:', error);
                reject(error);
            }
        });
    }

    /**
     * Load HTML template for the component
     */
    async loadHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('./components/Admin/AdminPanel/AdminPanel.html');
                if (!response.ok) {
                    throw new Error(`Failed to fetch HTML template: ${response.status}`);
                }
                
                const htmlContent = await response.text();
                this.htmlTemplate = htmlContent;
                console.log('🔧 [AdminPanel] HTML template loaded successfully');
                resolve();
            } catch (error) {
                console.error('🔧 [AdminPanel] Failed to load HTML template:', error);
                reject(error);
            }
        });
    }

    /**
     * Load LoginManager HTML
     */
    async loadLoginManagerHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('🔧 [AdminPanel] === LOAD LOGIN MANAGER HTML START ===');
                
                // Check if LoginManager HTML is already loaded
                if (document.getElementById('login-manager-modal')) {
                    console.log('🔧 [AdminPanel] LoginManager HTML already loaded');
                    resolve();
                    return;
                }

                console.log('🔧 [AdminPanel] Fetching LoginManager HTML from: ./components/Admin/LoginManager/LoginManager.html');
                const response = await fetch('./components/Admin/LoginManager/LoginManager.html');
                if (!response.ok) {
                    throw new Error(`Failed to fetch LoginManager HTML template: ${response.status}`);
                }
                
                const htmlContent = await response.text();
                console.log('🔧 [AdminPanel] HTML content received, length:', htmlContent.length);
                
                // Add LoginManager HTML to body
                document.body.insertAdjacentHTML('beforeend', htmlContent);
                console.log('🔧 [AdminPanel] LoginManager HTML added to body');
                
                // Verify it was added
                const modal = document.getElementById('login-manager-modal');
                if (modal) {
                    console.log('🔧 [AdminPanel] LoginManager HTML verified in DOM');
                } else {
                    console.error('🔧 [AdminPanel] LoginManager HTML not found in DOM after insertion');
                }
                
                console.log('🔧 [AdminPanel] === LOAD LOGIN MANAGER HTML COMPLETE ===');
                resolve();
            } catch (error) {
                console.error('🔧 [AdminPanel] Failed to load LoginManager HTML template:', error);
                reject(error);
            }
        });
    }

    /**
     * Create component from HTML template
     */
    createFromTemplate() {
        if (!this.htmlTemplate) {
            throw new Error('HTML template not loaded');
        }

        // Remove existing component if it exists
        const existingComponent = document.getElementById('admin-panel-container');
        if (existingComponent) {
            existingComponent.remove();
        }

        // Add component to body from template
        document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
        console.log('🔧 [AdminPanel] Component created from HTML template');
    }

    /**
     * Setup DOM element references
     */
    setupElements() {
        this.containerElement = document.getElementById('admin-panel-container');
        this.tabElements = document.querySelectorAll('.admin-tab');
        this.contentElements = document.querySelectorAll('.admin-tab-content');
        this.backButton = document.getElementById('admin-back-btn');
        
        if (!this.containerElement) {
            throw new Error('Admin panel container not found');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        this.tabElements.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Back button
        if (this.backButton) {
            this.backButton.addEventListener('click', this.handleBackClick);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                console.log('🔧 [AdminPanel] Escape key pressed, returning to main app');
                this.handleBackClick();
            }
        });

        // Script buttons
        const scriptButtons = document.querySelectorAll('.script-btn');
        scriptButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const scriptType = e.target.dataset.script;
                this.handleScriptRun(scriptType);
            });
        });

        // Script Manager button
        const scriptManagerBtn = document.getElementById('open-script-manager');
        if (scriptManagerBtn) {
            scriptManagerBtn.addEventListener('click', this.openScriptManager);
        }

        // Activity control buttons
        const refreshActivityBtn = document.getElementById('refresh-activity-btn');
        if (refreshActivityBtn) {
            refreshActivityBtn.addEventListener('click', () => this.refreshActivity());
        }

        const clearActivityBtn = document.getElementById('clear-activity-btn');
        if (clearActivityBtn) {
            clearActivityBtn.addEventListener('click', () => this.clearActivity());
        }

        // Amplification refresh button
        const refreshAmplifyBtn = document.getElementById('refresh-amplify-btn');
        if (refreshAmplifyBtn) {
            refreshAmplifyBtn.addEventListener('click', () => this.refreshAmplificationData());
        }

        // Robust event delegation for modal open/close
        document.addEventListener('click', function(e) {
            // Open modal
            if (e.target && e.target.id === 'show-browser-console-btn') {
                const modal = document.getElementById('browser-console-modal');
                if (modal) {
                    modal.style.display = 'flex';
                    window.renderBrowserConsoleLogs();
                    console.log('[AdminPanel] Show My Browser Console button clicked. Modal opened.');
                }
            }
            // Close modal
            if (e.target && e.target.id === 'close-browser-console-modal') {
                const modal = document.getElementById('browser-console-modal');
                if (modal) {
                    modal.style.display = 'none';
                    console.log('[AdminPanel] Browser Console modal closed.');
                }
            }
        });
    }

    /**
     * Component-specific initialization
     */
    initializeComponent() {
        // Initialize with dashboard tab active
        this.switchTab('dashboard');
        // Theme toggle logic
        const container = document.getElementById('admin-panel-container');
        const themeToggle = document.getElementById('admin-theme-toggle');
        const themeIcon = document.getElementById('admin-theme-icon');
        const themeLabel = document.getElementById('admin-theme-label');
        if (container && themeToggle && themeIcon && themeLabel) {
            themeToggle.addEventListener('click', () => {
                if (container.classList.contains('dark-mode')) {
                    container.classList.remove('dark-mode');
                    container.classList.add('light-mode');
                    themeIcon.textContent = '🌞';
                    themeLabel.textContent = 'Light Mode';
                } else {
                    container.classList.remove('light-mode');
                    container.classList.add('dark-mode');
                    themeIcon.textContent = '🌙';
                    themeLabel.textContent = 'Dark Mode';
                }
            });
        }
        // System Status tab logic
        const systemStatusTab = document.querySelector('.admin-tab[data-tab="system-status"]');
        if (systemStatusTab) {
            systemStatusTab.addEventListener('click', () => {
                this.loadSystemStatus();
            });
        }
        // Add refresh button logic
        const refreshBtn = document.getElementById('system-status-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadSystemStatus());
        }
        // Preload if already active
        if (document.getElementById('system-status').classList.contains('active')) {
            this.loadSystemStatus();
        }
        // User Management tab logic
        const userManagementTab = document.querySelector('.admin-tab[data-tab="user-management"]');
        if (userManagementTab) {
            userManagementTab.addEventListener('click', () => {
                this.loadUserList();
            });
        }
        // If User Management tab is active on load, render users
        const userTabContent = document.getElementById('user-management');
        if (userTabContent && userTabContent.classList.contains('active')) {
            this.loadUserList();
        }
        
        // Add User button logic
        const addUserBtn = document.getElementById('add-user-btn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                this.openAddUserModal();
            });
        }
        
        // Dashboard tab logic
        const dashboardTab = document.querySelector('.admin-tab[data-tab="dashboard"]');
        if (dashboardTab) {
            dashboardTab.addEventListener('click', () => {
                this.loadDashboard();
            });
        }
        
        // If Dashboard tab is active on load, render dashboard
        const dashboardTabContent = document.getElementById('dashboard');
        if (dashboardTabContent && dashboardTabContent.classList.contains('active')) {
            this.loadDashboard();
        }
        
        // Add scan media button logic
        const scanMediaBtn = document.getElementById('scan-media-btn');
        if (scanMediaBtn) {
            scanMediaBtn.addEventListener('click', () => {
                this.scanMediaFiles();
            });
        }

        // Add refresh dashboard button logic
        const refreshDashboardBtn = document.getElementById('refresh-dashboard-btn');
        if (refreshDashboardBtn) {
            refreshDashboardBtn.addEventListener('click', () => {
                this.refreshDashboard();
            });
        }
        
        // Start real-time updates for system performance
        this.startRealTimeUpdates();
        
        console.log('🔧 [AdminPanel] Component-specific initialization complete');
    }

    /**
     * Load dashboard data and update metrics
     */
    async loadDashboard() {
        console.log('🔧 [AdminPanel] Loading dashboard data...');
        
        try {
            // Load media statistics
            await this.loadMediaStatistics();
            
            // Load amplification usage
            await this.loadAmplificationUsage();
            
            // Load system performance
            await this.loadSystemPerformance();
            
            // Load recent activity
            await this.loadRecentActivity();
            
            console.log('🔧 [AdminPanel] Dashboard data loaded successfully');
            
            // Track dashboard load activity
            this.trackActivity('Dashboard data refreshed', 'info');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error loading dashboard:', error);
            this.trackActivity('Dashboard load failed', 'error');
        }
    }

    /**
     * Load media statistics for dashboard
     */
    async loadMediaStatistics() {
        try {
            console.log('🔧 [AdminPanel] Loading real media statistics...');
            
            // Load movies data - count from folders array
            let totalMovies = 0;
            try {
                const moviesResponse = await fetch('./components/MediaLibrary/data/movies/media-library-movies_normalized.json');
                if (moviesResponse.ok) {
                    const moviesData = await moviesResponse.json();
                    // Movies data has a folders array, count the folders
                    totalMovies = moviesData.folders ? moviesData.folders.length : 0;
                    console.log(`🔧 [AdminPanel] Movies loaded from normalized file: ${totalMovies}`);
                } else {
                    console.warn('🔧 [AdminPanel] Could not load movies from primary path');
                }
            } catch (e) {
                console.warn('🔧 [AdminPanel] Could not load movies from primary sources');
            }
            
            // Load TV shows data - count from array
            let totalTvShows = 0;
            try {
                const tvShowsResponse = await fetch('./components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
                if (tvShowsResponse.ok) {
                    const tvShowsData = await tvShowsResponse.json();
                    // TV Shows data is an array, count the array length
                    totalTvShows = Array.isArray(tvShowsData) ? tvShowsData.length : 0;
                    console.log(`🔧 [AdminPanel] TV Shows loaded from normalized file: ${totalTvShows}`);
                } else {
                    console.warn('🔧 [AdminPanel] Could not load TV shows from primary path');
                }
            } catch (e) {
                console.warn('🔧 [AdminPanel] Could not load TV shows from primary sources');
            }
            
            // Calculate total episodes from TV shows - count all files across all seasons
            let totalEpisodes = 0;
            try {
                // Try to get TV shows data again for episode counting
                let tvShowsData = null;
                try {
                    const tvShowsResponse = await fetch('./components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
                    if (tvShowsResponse.ok) {
                        tvShowsData = await tvShowsResponse.json();
                    } else {
                        console.warn('🔧 [AdminPanel] Could not fetch TV shows data for episode counting');
                    }
                } catch (e) {
                    console.warn('🔧 [AdminPanel] Could not fetch TV shows data for episode counting');
                }
                
                if (tvShowsData && Array.isArray(tvShowsData)) {
                    // Count all episodes across all shows and seasons
                    tvShowsData.forEach(show => {
                        if (show.folders) {
                            show.folders.forEach(season => {
                                if (season.files) {
                                    totalEpisodes += season.files.length;
                                }
                            });
                        }
                    });
                    console.log(`🔧 [AdminPanel] Episodes calculated from TV shows data: ${totalEpisodes}`);
                }
            } catch (e) {
                console.warn('🔧 [AdminPanel] Could not calculate episodes');
            }
            
            // Calculate total watch time (placeholder - would need actual watch history)
            const totalWatchTime = '0h 0m'; // TODO: Implement from watch history data
            
            // Only update DOM if we have real data
            if (totalMovies > 0) {
                document.getElementById('total-movies').textContent = totalMovies.toLocaleString();
            } else {
                document.getElementById('total-movies').textContent = 'No Data';
            }
            
            if (totalTvShows > 0) {
                document.getElementById('total-tv-shows').textContent = totalTvShows.toLocaleString();
            } else {
                document.getElementById('total-tv-shows').textContent = 'No Data';
            }
            
            if (totalEpisodes > 0) {
                document.getElementById('total-episodes').textContent = totalEpisodes.toLocaleString();
            } else {
                document.getElementById('total-episodes').textContent = 'No Data';
            }
            
            document.getElementById('total-watch-time').textContent = totalWatchTime;
            
            // Store the values in localStorage for future reference
            localStorage.setItem('total_movies', totalMovies.toString());
            localStorage.setItem('total_tv_shows', totalTvShows.toString());
            localStorage.setItem('total_episodes', totalEpisodes.toString());
            
            console.log(`🔧 [AdminPanel] Media stats loaded: ${totalMovies} movies, ${totalTvShows} TV shows, ${totalEpisodes} episodes`);
        } catch (error) {
            console.error('🔧 [AdminPanel] Error loading media statistics:', error);
            // Show error state instead of fake data
            document.getElementById('total-movies').textContent = 'Error';
            document.getElementById('total-tv-shows').textContent = 'Error';
            document.getElementById('total-episodes').textContent = 'Error';
            document.getElementById('total-watch-time').textContent = 'Error';
        }
    }

    /**
     * Load amplification usage for dashboard
     */
    async loadAmplificationUsage() {
        try {
            console.log('🔧 [AdminPanel] Loading real amplification usage...');
            
            // Check if there's a VideoPlayer instance to get real-time usage data
            if (window.VideoPlayer && window.VideoPlayer.getAmplificationStats) {
                const usageStats = window.VideoPlayer.getAmplificationStats();
                if (usageStats) {
                    document.getElementById('times-used').textContent = usageStats.usageCount.toString();
                    document.getElementById('avg-level').textContent = usageStats.avgLevel + '%';
                    document.getElementById('max-level').textContent = usageStats.maxLevel + '%';
                    console.log('🔧 [AdminPanel] Got real-time amplification stats from VideoPlayer');
                } else {
                    // VideoPlayer returned null - no data available
                    document.getElementById('times-used').textContent = 'No Data';
                    document.getElementById('avg-level').textContent = 'No Data';
                    document.getElementById('max-level').textContent = 'No Data';
                    console.log('🔧 [AdminPanel] VideoPlayer returned no amplification data');
                }
            } else {
                // Try to get from localStorage using the correct key that VideoPlayer uses
                const amplifyStats = localStorage.getItem('amplifyStats');
                if (amplifyStats) {
                    try {
                        const stats = JSON.parse(amplifyStats);
                        document.getElementById('times-used').textContent = stats.usageCount.toString();
                        document.getElementById('avg-level').textContent = stats.avgLevel + '%';
                        document.getElementById('max-level').textContent = stats.maxLevel + '%';
                        console.log('🔧 [AdminPanel] Got amplification stats from localStorage:', stats);
                    } catch (parseError) {
                        console.warn('🔧 [AdminPanel] Could not parse amplifyStats from localStorage');
                        // Show error state instead of fake data
                        document.getElementById('times-used').textContent = 'Error';
                        document.getElementById('avg-level').textContent = 'Error';
                        document.getElementById('max-level').textContent = 'Error';
                    }
                } else {
                    // No data available - show "No Data" instead of fake values
                    document.getElementById('times-used').textContent = 'No Data';
                    document.getElementById('avg-level').textContent = 'No Data';
                    document.getElementById('max-level').textContent = 'No Data';
                }
            }
            
            console.log('🔧 [AdminPanel] Amplification usage loaded');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error loading amplification usage:', error);
            // Show error state instead of fake data
            document.getElementById('times-used').textContent = 'Error';
            document.getElementById('avg-level').textContent = 'Error';
            document.getElementById('max-level').textContent = 'Error';
        }
    }

    /**
     * Load system performance metrics
     */
    async loadSystemPerformance() {
        try {
            console.log('🔧 [AdminPanel] Loading real system performance...');
            
            // Get memory usage from browser performance API
            let memoryUsage = 'Unknown';
            if (performance.memory) {
                const memoryMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
                memoryUsage = `${memoryMB} MB`;
            }
            
            // Get API calls from localStorage or quota monitor
            let apiCallsToday = '0';
            if (window.QuotaMonitor && typeof window.QuotaMonitor.getTodayUsage === 'function') {
                apiCallsToday = window.QuotaMonitor.getTodayUsage() || '0';
            } else {
                // Try to get from localStorage
                const today = new Date().toDateString();
                const storedCalls = localStorage.getItem(`api_calls_${today}`) || '0';
                apiCallsToday = storedCalls;
            }
            
            // Get errors from localStorage or console
            let errorsToday = '0';
            const today = new Date().toDateString();
            const storedErrors = localStorage.getItem(`errors_${today}`) || '0';
            errorsToday = storedErrors;
            
            // Update DOM with real data
            document.getElementById('memory-usage').textContent = memoryUsage;
            document.getElementById('api-calls').textContent = apiCallsToday;
            document.getElementById('errors-today').textContent = errorsToday;
            
            console.log(`🔧 [AdminPanel] System performance loaded: ${memoryUsage}, ${apiCallsToday} API calls, ${errorsToday} errors`);
        } catch (error) {
            console.error('🔧 [AdminPanel] Error loading system performance:', error);
            // Show error state instead of fake data
            document.getElementById('memory-usage').textContent = 'Error';
            document.getElementById('api-calls').textContent = 'Error';
            document.getElementById('errors-today').textContent = 'Error';
        }
    }

    /**
     * Load recent activity for dashboard
     */
    async loadRecentActivity() {
        try {
            console.log('🔧 [AdminPanel] Loading real recent activity...');
            const activityContainer = document.getElementById('recent-activity');
            if (!activityContainer) return;
            
            // Get current time for dashboard load
            const currentTime = new Date().toLocaleTimeString();
            
            // Try to get real activity from various sources
            let activities = [
                {
                    time: currentTime,
                    text: 'Dashboard loaded successfully'
                }
            ];
            
            // Check for recent video player activity
            if (window.VideoPlayer && window.VideoPlayer.getRecentActivity) {
                const videoActivity = window.VideoPlayer.getRecentActivity();
                if (videoActivity) {
                    activities.push(videoActivity);
                }
            }
            
            // Check for recent media library activity
            if (window.MediaLibraryManager && window.MediaLibraryManager.getRecentActivity) {
                const mediaActivity = window.MediaLibraryManager.getRecentActivity();
                if (mediaActivity) {
                    activities.push(mediaActivity);
                }
            }
            
            // Check localStorage for recent activities
            const storedActivities = localStorage.getItem('recent_activities');
            if (storedActivities) {
                try {
                    const parsed = JSON.parse(storedActivities);
                    if (Array.isArray(parsed)) {
                        activities = [...activities, ...parsed.slice(0, 3)]; // Limit to 3 stored activities
                    }
                } catch (e) {
                    console.warn('🔧 [AdminPanel] Could not parse stored activities');
                }
            }
            
            // Only show real activities - no fake/sample data
            if (activities.length === 0) {
                activities = [{
                    time: currentTime,
                    text: 'No recent activity'
                }];
            }
            
            // Update DOM with real activity data
            const activityHTML = activities.map(activity => `
                <div class="activity-item">
                    <span class="activity-time">${activity.time}</span>
                    <span class="activity-text">${activity.text}</span>
                </div>
            `).join('');
            
            activityContainer.innerHTML = activityHTML;
            
            console.log(`🔧 [AdminPanel] Recent activity loaded: ${activities.length} activities`);
        } catch (error) {
            console.error('🔧 [AdminPanel] Error loading recent activity:', error);
            // Show error state instead of fake data
            const activityContainer = document.getElementById('recent-activity');
            if (activityContainer) {
                activityContainer.innerHTML = `
                    <div class="activity-item">
                        <span class="activity-time">${new Date().toLocaleTimeString()}</span>
                        <span class="activity-text">Error loading activity data</span>
                    </div>
                `;
            }
        }
    }

    /**
     * Refresh activity data
     */
    async refreshActivity() {
        try {
            console.log('🔧 [AdminPanel] Refreshing activity data...');
            
            // Add refresh activity to the list
            const currentTime = new Date().toLocaleTimeString();
            const refreshActivity = {
                time: currentTime,
                text: 'Activity data manually refreshed'
            };
            
            // Add to localStorage
            this.addActivityToStorage(refreshActivity);
            
            // Reload the activity list
            await this.loadRecentActivity();
            
            // Track the refresh action
            this.trackActivity('Activity data refreshed', 'info');
            
            console.log('🔧 [AdminPanel] Activity data refreshed successfully');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error refreshing activity:', error);
            this.trackActivity('Activity refresh failed', 'error');
        }
    }

    /**
     * Clear all activity history
     */
    async clearActivity() {
        try {
            console.log('🔧 [AdminPanel] Clearing activity history...');
            
            // Clear localStorage
            localStorage.removeItem('recent_activities');
            
            // Clear the DOM
            const activityContainer = document.getElementById('recent-activity');
            if (activityContainer) {
                activityContainer.innerHTML = `
                    <div class="activity-item">
                        <span class="activity-time">${new Date().toLocaleTimeString()}</span>
                        <span class="activity-text">Activity history cleared</span>
                    </div>
                `;
            }
            
            // Track the clear action
            this.trackActivity('Activity history cleared', 'info');
            
            console.log('🔧 [AdminPanel] Activity history cleared successfully');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error clearing activity:', error);
            this.trackActivity('Activity clear failed', 'error');
        }
    }

    /**
     * Add activity to localStorage
     */
    addActivityToStorage(activity) {
        try {
            const storedActivities = localStorage.getItem('recent_activities');
            let activities = [];
            
            if (storedActivities) {
                try {
                    activities = JSON.parse(storedActivities);
                } catch (e) {
                    console.warn('🔧 [AdminPanel] Could not parse stored activities, starting fresh');
                }
            }
            
            // Add new activity at the beginning
            activities.unshift(activity);
            
            // Keep only the last 50 activities
            activities = activities.slice(0, 50);
            
            // Store back to localStorage
            localStorage.setItem('recent_activities', JSON.stringify(activities));
            
            console.log('🔧 [AdminPanel] Activity added to storage');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error adding activity to storage:', error);
        }
    }

    /**
     * Open ScriptManager modal
     */
    async openScriptManager() {
        if (this.scriptManager) {
            this.scriptManager.show();
            return;
        }
        try {
            const module = await import('../ScriptManager/ScriptManager.js');
            this.scriptManager = new module.default();
            await this.scriptManager.init();
            this.scriptManager.show();
        } catch (error) {
            console.error('🔧 [AdminPanel] Failed to load ScriptManager:', error);
            if (window.ConfirmModal) {
                window.ConfirmModal.open({ message: 'Failed to load Script Manager. Please try again.' });
            }
        }
    }

    async loadSystemStatus() {
        const statusCard = (id) => document.getElementById(id);
        if (statusCard('server-status')) statusCard('server-status').textContent = 'Loading...';
        if (statusCard('memory-usage')) statusCard('memory-usage').textContent = 'Loading...';
        if (statusCard('uptime')) statusCard('uptime').textContent = 'Loading...';
        if (statusCard('cpu-usage')) statusCard('cpu-usage').textContent = 'Loading...';
        try {
            const res = await fetch('/api/admin/system-status');
            if (!res.ok) throw new Error('Failed to fetch system status');
            const data = await res.json();
            if (!data.success) throw new Error('System status error');
            const s = data.status;
            if (statusCard('server-status')) statusCard('server-status').textContent = s.serverStatus === 'online' ? '🟢 Online' : '🔴 Offline';
            if (statusCard('memory-usage')) statusCard('memory-usage').textContent = `${this.formatBytes(s.usedMem)} / ${this.formatBytes(s.totalMem)} (${s.memUsagePercent}%)`;
            if (statusCard('uptime')) statusCard('uptime').textContent = this.formatUptime(s.uptime);
            if (statusCard('cpu-usage')) statusCard('cpu-usage').textContent = `${s.loadAvg[0].toFixed(2)} (1m avg) / ${s.cpuCount} cores`;
        } catch (err) {
            if (statusCard('server-status')) statusCard('server-status').textContent = 'Error';
            if (statusCard('memory-usage')) statusCard('memory-usage').textContent = 'Error';
            if (statusCard('uptime')) statusCard('uptime').textContent = 'Error';
            if (statusCard('cpu-usage')) statusCard('cpu-usage').textContent = 'Error';
        }
    }

    formatBytes(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    formatUptime(seconds) {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
    }

    /**
     * Force hide login modal if it's showing
     */
    forceHideLoginModal() {
        console.log('🔧 [AdminPanel] Force hiding login modal...');
        
        // Hide via LoginManager if available
        if (window.LoginManager && typeof window.LoginManager.hideModal === 'function') {
            window.LoginManager.hideModal();
        }
        
        // Also hide the modal directly with multiple approaches
        const loginModal = document.getElementById('login-manager-modal');
        if (loginModal) {
            // Hide the modal
            loginModal.style.display = 'none';
            
            // Also add hidden class if it exists
            if (loginModal.classList) {
                loginModal.classList.add('hidden');
            }
            
            // Set visibility to hidden as backup
            loginModal.style.visibility = 'hidden';
            loginModal.style.opacity = '0';
            
            console.log('🔧 [AdminPanel] Login modal hidden completely');
        }
        
        // Also try to hide any backdrop/overlay elements
        const backdropElements = document.querySelectorAll('.modal-backdrop, .modal-overlay, .login-backdrop');
        backdropElements.forEach(element => {
            element.style.display = 'none';
            element.style.visibility = 'hidden';
        });
    }

    /**
     * Show the admin panel
     */
    async show() {
        if (this.containerElement) {
            console.log('🔧 [AdminPanel] Show method called, checking authentication...');
            console.log('🔧 [AdminPanel] Current user in memory:', this.currentUser);
            console.log('🔧 [AdminPanel] localStorage authToken:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
            console.log('🔧 [AdminPanel] localStorage authUser:', localStorage.getItem('authUser') ? 'Present' : 'Missing');
            
            // STEP 1: Try to restore session from localStorage if we don't have currentUser
            if (!this.currentUser || !this.currentUser.id) {
                console.log('🔧 [AdminPanel] No current user, attempting to restore session...');
                const sessionRestored = await this.restoreSession();
                if (sessionRestored) {
                    console.log('🔧 [AdminPanel] Session restored successfully');
                }
            }
            
            // STEP 2: Check if already authenticated
            const isAuthenticated = await this.isAuthenticated();
            
            if (isAuthenticated) {
                console.log(`🔧 [AdminPanel] User already authenticated: ${this.currentUser?.email || 'Unknown'} (${this.currentUser?.role || 'Unknown'})`);
                
                // Force hide any login modal that might be showing
                this.forceHideLoginModal();
                
                // Show the Admin Panel directly
                this.containerElement.style.display = 'block';
                this.isVisible = true;
                this.updateRoleBasedUI();
                
                // Also ensure the main app is hidden when showing admin panel
                const mainApp = document.querySelector('.chat-container, .main-content, #app');
                if (mainApp) {
                    mainApp.style.display = 'none';
                    console.log('🔧 [AdminPanel] Main app hidden when showing admin panel');
                }
                
                console.log('🔧 [AdminPanel] Admin panel shown for authenticated user');
                return;
            }
            
            // STEP 3: If we reach here, user is NOT authenticated
            console.log('🔧 [AdminPanel] User not authenticated, showing login modal...');
            
            // Show login modal for unauthenticated users
            console.log('🔧 [AdminPanel] Calling ensureLoginManagerLoaded...');
            try {
                await this.ensureLoginManagerLoaded();
                console.log('🔧 [AdminPanel] ensureLoginManagerLoaded completed');
                
                if (window.LoginManager) {
                    console.log('🔧 [AdminPanel] LoginManager found, enabling login modal and calling checkAuth()');
                    console.log('🔧 [AdminPanel] LoginManager methods available:', Object.getOwnPropertyNames(window.LoginManager));
                    
                    // Enable login modal display for this explicit request
                    window.LoginManager.enableLoginModal();
                    console.log('🔧 [AdminPanel] Login modal enabled, calling checkAuth()');
                    window.LoginManager.checkAuth();
                    console.log('🔧 [AdminPanel] checkAuth() called');
                } else {
                    console.error('🔧 [AdminPanel] LoginManager not available after ensureLoginManagerLoaded');
                    console.error('🔧 [AdminPanel] window.LoginManager:', window.LoginManager);
                }
            } catch (error) {
                console.error('🔧 [AdminPanel] Error in ensureLoginManagerLoaded:', error);
                // Fallback: try to show a simple alert
                alert('Failed to load login manager. Please try again.');
            }
        }
    }

    /**
     * Hide the admin panel
     */
    hide() {
        if (this.containerElement) {
            this.containerElement.style.display = 'none';
            // Don't set isVisible to false - this breaks session persistence
            // this.isVisible = false;
            console.log('🔧 [AdminPanel] Admin panel hidden (session preserved)');
        }
        
        // Ensure the main app is visible
        const mainApp = document.querySelector('.chat-container, .main-content, #app');
        if (mainApp) {
            mainApp.style.display = 'block';
            console.log('🔧 [AdminPanel] Main app made visible');
        }
    }
    
    /**
     * Clear session and hide admin panel
     */
    clearSession() {
        console.log('🔧 [AdminPanel] Clearing session and hiding panel');
        
        // Clear user data
        this.currentUser = null;
        
        // Hide the panel
        this.hide();
        
        // Clear any cached data
        this.isVisible = false;
        
        console.log('🔧 [AdminPanel] Session cleared and panel hidden');
    }

    /**
     * Handle cancellation and return to main app
     */
    handleCancel() {
        console.log('🔧 [AdminPanel] Handling cancellation, returning to main app');
        
        // Hide the admin panel
        this.hide();
        
        // Clear any authentication state if user cancelled login
        if (!this.currentUser || !this.currentUser.id) {
            console.log('🔧 [AdminPanel] Clearing incomplete authentication state');
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
        }
        
        // Ensure the main app is visible and focused
        const mainApp = document.querySelector('.chat-container, .main-content, #app');
        if (mainApp) {
            mainApp.style.display = 'block';
            mainApp.focus();
        }
        
        console.log('🔧 [AdminPanel] Successfully returned to main app');
    }
    
    /**
     * Logout user and clear session
     */
    logout() {
        console.log('🔧 [AdminPanel] Logging out user...');
        
        // Track logout activity before clearing user data
        if (this.currentUser) {
            this.trackActivity(`User ${this.currentUser.email} logged out`, 'info');
        }
        
        // Clear admin authentication state
        this.currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        
        // Also clear main app authentication if this is a full logout
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        
        // Hide the admin panel
        this.hide();
        
        console.log('🔧 [AdminPanel] User logged out successfully from both admin and main app');
    }

    /**
     * Switch between admin tabs
     * @param {string} tabName - The name of the tab to switch to
     */
    switchTab(tabName) {
        // Update tab buttons
        this.tabElements.forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update content areas
        this.contentElements.forEach(content => {
            if (content.id === tabName) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        this.currentTab = tabName;
        console.log(`🔧 [AdminPanel] Switched to tab: ${tabName}`);
    }

    /**
     * Handle script execution
     * @param {string} scriptType - The type of script to run
     */
    async handleScriptRun(scriptType) {
        const scriptLog = document.getElementById('script-log');
        if (!scriptLog) return;

        // Clear previous log
        scriptLog.innerHTML = '';
        // Add initial message
        this.addLogMessage(`Starting ${scriptType}...`, 'info');

        try {
            // Show loading message
            this.addLogMessage('Running script, please wait...', 'info');
            // Call backend API to run script
            const response = await fetch('/api/admin/run-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ script: scriptType })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.addLogMessage(`✅ ${scriptType} completed successfully`, 'success');
                if (result.output) {
                    this.addLogMessage(result.output, 'output');
                }
            } else {
                this.addLogMessage(`❌ ${scriptType} failed: ${result.error}`, 'error');
            }

        } catch (error) {
            this.addLogMessage(`❌ Error running ${scriptType}: ${error.message}`, 'error');
            console.error('🔧 [AdminPanel] Script execution error:', error);
        }
    }

    /**
     * Add message to script log
     * @param {string} message - The message to add
     * @param {string} type - The type of message (info, success, error, output)
     */
    addLogMessage(message, type = 'info') {
        const scriptLog = document.getElementById('script-log');
        if (!scriptLog) return;

        const messageElement = document.createElement('div');
        messageElement.className = `log-message log-${type}`;
        messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        scriptLog.appendChild(messageElement);
        scriptLog.scrollTop = scriptLog.scrollHeight;
    }

    /**
     * Handle back button click
     */
    handleBackClick() {
        console.log('🔧 [AdminPanel] Back button clicked, returning to main app');
        
        // Hide the admin panel but preserve session state
        if (this.containerElement) {
            this.containerElement.style.display = 'none';
            console.log('🔧 [AdminPanel] Admin panel hidden (session preserved)');
        }
        
        // Don't clear currentUser or authentication state
        // This preserves the session for when user returns
        
        // Ensure the main app is visible and focused
        const mainApp = document.querySelector('.chat-container, .main-content, #app');
        if (mainApp) {
            mainApp.style.display = 'block';
            mainApp.focus();
            console.log('🔧 [AdminPanel] Main app made visible and focused');
        }
        
        // Also try to show any other main app elements that might be hidden
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.style.display = 'block';
        }
        
        console.log('🔧 [AdminPanel] Successfully returned to main app (session preserved)');
        console.log('🔧 [AdminPanel] Current user session maintained:', this.currentUser?.email);
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        try {
            // Remove event listeners
            this.tabElements.forEach(tab => {
                tab.removeEventListener('click', this.switchTab);
            });

            if (this.backButton) {
                this.backButton.removeEventListener('click', this.handleBackClick);
            }

            // Remove component from DOM
            if (this.containerElement) {
                this.containerElement.remove();
            }

            this.isInitialized = false;
            console.log('🔧 [AdminPanel] Component destroyed');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error destroying component:', error);
        }
    }

    /**
     * Debug method to check authentication state
     */
    debugAuthState() {
        console.log('🔧 [AdminPanel] === AUTH DEBUG INFO ===');
        console.log('🔧 [AdminPanel] this.currentUser:', this.currentUser);
        console.log('🔧 [AdminPanel] this.isVisible:', this.isVisible);
        console.log('🔧 [AdminPanel] localStorage authToken:', localStorage.getItem('authToken') ? 'Present' : 'Missing');
        console.log('🔧 [AdminPanel] localStorage authUser:', localStorage.getItem('authUser'));
        console.log('🔧 [AdminPanel] window.adminPanel:', window.adminPanel);
        console.log('🔧 [AdminPanel] this === window.adminPanel:', this === window.adminPanel);
        console.log('🔧 [AdminPanel] ===============================');
    }

    /**
     * Force refresh user role from server
     */
    async refreshUserRole() {
        console.log('🔧 [AdminPanel] Refreshing user role from server...');
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log('🔧 [AdminPanel] No token available for role refresh');
            return false;
        }
        
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
                // Update stored user data with fresh data from server
                this.currentUser = data.user;
                localStorage.setItem('authUser', JSON.stringify(data.user));
                console.log(`🔧 [AdminPanel] User role refreshed: ${data.user.email} (${data.user.role})`);
                return true;
            } else {
                console.log('🔧 [AdminPanel] Failed to refresh user role:', data.message);
                return false;
            }
        } catch (error) {
            console.error('🔧 [AdminPanel] Error refreshing user role:', error);
            return false;
        }
    }

    /**
     * Restore user session from localStorage
     */
    async restoreSession() {
        console.log('🔧 [AdminPanel] Attempting to restore user session...');
        
        // First try to restore from admin-specific authentication
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('authUser');
        
        if (token && user) {
            try {
                const parsedUser = JSON.parse(user);
                if (parsedUser && parsedUser.id) {
                    this.currentUser = parsedUser;
                    console.log(`🔧 [AdminPanel] Admin session restored: ${parsedUser.email} (${parsedUser.role})`);
                    
                    // Also refresh the user role from server to ensure it's current
                    const roleRefreshed = await this.refreshUserRole();
                    if (roleRefreshed) {
                        console.log('🔧 [AdminPanel] User role refreshed successfully');
                    }
                    
                    return true;
                }
            } catch (e) {
                console.warn('🔧 [AdminPanel] Invalid stored user data, clearing...');
                localStorage.removeItem('authUser');
                localStorage.removeItem('authToken');
            }
        }
        
        // If no admin session, try to convert main app authentication to admin
        const jwtToken = localStorage.getItem('jwtToken');
        const mainUser = localStorage.getItem('user') || localStorage.getItem('userEmail');
        
        if (jwtToken && mainUser) {
            console.log('🔧 [AdminPanel] Main app authentication found, attempting to convert to admin...');
            
            try {
                // Try to verify the JWT token and get user info
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: jwtToken })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.user) {
                        // Convert main app user to admin user
                        this.currentUser = data.user;
                        localStorage.setItem('authToken', jwtToken);
                        localStorage.setItem('authUser', JSON.stringify(data.user));
                        console.log(`🔧 [AdminPanel] Converted main app auth to admin: ${data.user.email} (${data.user.role})`);
                        return true;
                    }
                }
            } catch (error) {
                console.warn('🔧 [AdminPanel] Failed to convert main app auth to admin:', error);
            }
        }
        
        console.log('🔧 [AdminPanel] No valid session to restore');
        return false;
    }

    /**
     * Check if user is already authenticated without triggering login
     */
    async isAuthenticated() {
        console.log('🔧 [AdminPanel] === CHECKING AUTHENTICATION ===');
        
        // Check if we have a valid user in memory
        if (this.currentUser && this.currentUser.id) {
            console.log(`🔧 [AdminPanel] User authenticated in memory: ${this.currentUser.email} (${this.currentUser.role})`);
            return true;
        }
        
        // Check localStorage directly for immediate response
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('authUser');
        
        console.log('🔧 [AdminPanel] localStorage authToken:', token ? 'Present' : 'Missing');
        console.log('🔧 [AdminPanel] localStorage authUser:', user ? 'Present' : 'Missing');
        
        if (token && user) {
            try {
                const parsedUser = JSON.parse(user);
                if (parsedUser && parsedUser.id) {
                    // Set currentUser for immediate use
                    this.currentUser = parsedUser;
                    console.log(`🔧 [AdminPanel] User authenticated from localStorage: ${parsedUser.email} (${parsedUser.role})`);
                    return true;
                }
            } catch (e) {
                console.warn('🔧 [AdminPanel] Invalid stored user data, clearing...');
                localStorage.removeItem('authUser');
                localStorage.removeItem('authToken');
            }
        }
        
        // Also check if we have a valid JWT token (main app authentication)
        const jwtToken = localStorage.getItem('jwtToken');
        if (jwtToken) {
            console.log('🔧 [AdminPanel] JWT token found, user may be authenticated via main app');
            // Try to restore session from main app auth
            if (await this.restoreSession()) {
                return true;
            }
        }
        
        console.log('🔧 [AdminPanel] User not authenticated');
        console.log('🔧 [AdminPanel] === AUTHENTICATION CHECK COMPLETE ===');
        return false;
    }

    /**
     * Check authentication before showing admin panel
     */
    async checkAuth() {
        try {
            // First check if we already have a valid user in memory
            if (this.currentUser && this.currentUser.id) {
                console.log(`🔧 [AdminPanel] Already authenticated as: ${this.currentUser.email} (${this.currentUser.role})`);
                return true;
            }

            // Use LoginManager's silent auth check first
            if (window.LoginManager && typeof window.LoginManager.checkAuthSilent === 'function') {
                const isAuthenticated = await window.LoginManager.checkAuthSilent();
                if (isAuthenticated) {
                    // Get the user data from localStorage
                    const storedUser = localStorage.getItem('authUser');
                    if (storedUser) {
                        try {
                            const user = JSON.parse(storedUser);
                            if (user && user.id) {
                                this.currentUser = user;
                                console.log(`🔧 [AdminPanel] Session restored via silent auth: ${user.email} (${user.role})`);
                                return true;
                            }
                        } catch (e) {
                            console.warn('🔧 [AdminPanel] Invalid stored user data, clearing...');
                            localStorage.removeItem('authUser');
                            localStorage.removeItem('authToken');
                        }
                    }
                }
            }

            // If silent auth failed, show login modal
            console.log('🔧 [AdminPanel] Silent auth failed, showing login');
            await this.ensureLoginManagerLoaded();
            
            if (window.LoginManager) {
                console.log('🔧 [AdminPanel] Calling LoginManager.checkAuth()');
                window.LoginManager.checkAuth();
            } else {
                console.error('🔧 [AdminPanel] LoginManager not available after ensureLoginManagerLoaded');
            }
            return false;

        } catch (error) {
            console.error('🔧 [AdminPanel] Auth check error:', error);
            await this.ensureLoginManagerLoaded();
            
            if (window.LoginManager) {
                console.log('🔧 [AdminPanel] Calling LoginManager.checkAuth()');
                window.LoginManager.checkAuth();
            } else {
                console.error('🔧 [AdminPanel] LoginManager not available after ensureLoginManagerLoaded');
            }
            return false;
        }
    }

    /**
     * Ensure LoginManager is loaded and available
     */
    async ensureLoginManagerLoaded() {
        console.log('🔧 [AdminPanel] === ENSURE LOGIN MANAGER LOADED START ===');
        
        // If LoginManager is already available, return immediately
        if (window.LoginManager && typeof window.LoginManager.checkAuth === 'function') {
            console.log('🔧 [AdminPanel] LoginManager already available');
            return;
        }

        console.log('🔧 [AdminPanel] LoginManager not available, loading it...');
        
        // Load LoginManager script if not already loaded
        if (!document.querySelector('script[src*="LoginManager.js"]')) {
            console.log('🔧 [AdminPanel] Loading LoginManager script...');
            const loginManagerScript = document.createElement('script');
            loginManagerScript.src = './components/Admin/LoginManager/LoginManager.js';
            
            await new Promise((resolve, reject) => {
                loginManagerScript.onload = () => {
                    console.log('🔧 [AdminPanel] LoginManager script onload triggered');
                    resolve();
                };
                loginManagerScript.onerror = reject;
                document.head.appendChild(loginManagerScript);
            });
            console.log('🔧 [AdminPanel] LoginManager script loaded');
        } else {
            console.log('🔧 [AdminPanel] LoginManager script already exists');
        }

        // Wait for LoginManager to be available with better error handling
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        console.log('🔧 [AdminPanel] Waiting for LoginManager to become available...');
        while (!window.LoginManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            if (attempts % 10 === 0) {
                console.log(`🔧 [AdminPanel] Still waiting for LoginManager... (${attempts}/50)`);
            }
        }

        if (!window.LoginManager) {
            throw new Error('LoginManager failed to load after multiple attempts');
        }

        console.log('🔧 [AdminPanel] LoginManager script loaded, checking for HTML...');

        // Also ensure LoginManager HTML and CSS are loaded
        if (!document.getElementById('login-manager-modal')) {
            console.log('🔧 [AdminPanel] LoginManager HTML not found, loading it...');
            await this.loadLoginManagerHTML();
            console.log('🔧 [AdminPanel] LoginManager HTML loaded');
        } else {
            console.log('🔧 [AdminPanel] LoginManager HTML already exists');
        }
        
        // Also ensure LoginManager CSS is loaded
        if (!document.querySelector('link[href*="LoginManager.css"]')) {
            console.log('🔧 [AdminPanel] LoginManager CSS not found, loading it...');
            await this.loadLoginManagerCSS();
            console.log('🔧 [AdminPanel] LoginManager CSS loaded');
        } else {
            console.log('🔧 [AdminPanel] LoginManager CSS already exists');
        }

        // The onLogin callback is already set up in the init() method
        // No need to set it up again here to avoid conflicts
        console.log('🔧 [AdminPanel] onLogin callback already set up in init(), skipping duplicate setup');

        console.log('🔧 [AdminPanel] === ENSURE LOGIN MANAGER LOADED COMPLETE ===');
    }

    /**
     * Update UI based on user role
     */
    updateRoleBasedUI() {
        if (!this.currentUser) {
            console.log('🔧 [AdminPanel] No current user, cannot update UI');
            return;
        }

        console.log(`🔧 [AdminPanel] Updating UI for user: ${this.currentUser.email} (${this.currentUser.role})`);

        // Hide SuperAdmin features from non-superadmin users
        const superAdminElements = document.querySelectorAll('[data-role="superadmin"]');
        const isSuperAdmin = this.currentUser.role === 'superadmin';
        
        superAdminElements.forEach(element => {
            element.style.display = isSuperAdmin ? '' : 'none';
        });

        // Set welcome message in header with user info
        const welcomeDiv = document.getElementById('admin-welcome');
        if (welcomeDiv) {
            let name = this.currentUser.name || this.currentUser.email || 'User';
            // If email is present but no name, use the part before @
            if (!this.currentUser.name && this.currentUser.email) {
                name = this.currentUser.email.split('@')[0];
                name = name.charAt(0).toUpperCase() + name.slice(1);
            }
            
            if (this.currentUser.role === 'superadmin') {
                welcomeDiv.textContent = `Logged in as: ${name} - Role: SuperAdmin`;
            } else if (this.currentUser.role === 'admin') {
                welcomeDiv.textContent = `Logged in as: ${name} - Role: Admin`;
            } else {
                welcomeDiv.textContent = `Logged in as: ${name} - Role: ${this.currentUser.role}`;
            }
            
            console.log(`🔧 [AdminPanel] Welcome message updated: ${welcomeDiv.textContent}`);
        } else {
            console.warn('🔧 [AdminPanel] admin-welcome div not found');
        }

        // Update any other role-based UI elements here
        console.log('🔧 [AdminPanel] Role-based UI update completed');
    }

    async loadUserList() {
        this.token = localStorage.getItem('jwtToken');
        const content = document.getElementById('user-management-content');
        if (!content) return;
        
        // Show loading state
        content.innerHTML = '<div style="text-align: center; padding: 20px;">Loading users...</div>';
        
        try {
            // Fetch users from API
            const response = await fetch('/api/users', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to load users');
            }

            const users = data.users;
            
            // Render table
            content.innerHTML = `
                <table class="user-table">
                    <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                    <tbody id="user-table-body">
                        <!-- User rows will be rendered here -->
                    </tbody>
                </table>
            `;

            // Render table body
            let tbody = document.getElementById('user-table-body');
            if (!tbody) {
                console.error('Table body not found');
                return;
            }
            
            tbody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                const createdDate = new Date(user.created).toLocaleDateString();
                const statusText = user.isActive ? 'Active' : 'Inactive';
                const statusClass = user.isActive ? 'status-active' : 'status-inactive';
                
                tr.innerHTML = `
                    <td>${user.email}</td>
                    <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                    <td>${createdDate}</td>
                    <td>
                        <button class="action-btn edit-user-btn" title="Edit User" data-user-id="${user.id}">&#9998;</button>
                        ${
                            // Only show delete for SuperAdmin, and not for themselves or other SuperAdmins
                            (this.currentUser && this.currentUser.role === 'superadmin' && 
                             user.id !== this.currentUser.id && user.role !== 'superadmin')
                                ? `<button class="action-btn delete-user-btn" title="Delete User" data-user-id="${user.id}">&#128465;</button>`
                                : ''
                        }
                    </td>
                `;
                
                // Add event listeners for edit/delete
                const editBtn = tr.querySelector('.edit-user-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', () => this.openEditUserModal(user));
                }
                const deleteBtn = tr.querySelector('.delete-user-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => this.openDeleteUserModal(user));
                }
                tbody.appendChild(tr);
            });

            console.log(`[AdminPanel] Loaded ${users.length} users`);
            
        } catch (error) {
            console.error('[AdminPanel] Error loading users:', error);
            content.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #dc2626;">
                    Error loading users: ${error.message}
                    <br><button onclick="adminPanel.loadUserList()" style="margin-top: 10px;">Retry</button>
                </div>
            `;
        }
    }

    // Edit user modal
    openEditUserModal(user) {
        const modal = document.getElementById('user-modal');
        if (!modal) {
            console.error('User modal not found');
            return;
        }

        modal.innerHTML = `
            <div class="user-modal-content">
                <h3>Edit User: ${user.email}</h3>
                <form id="edit-user-form">
                    <div class="form-group">
                        <label for="edit-email">Email:</label>
                        <input type="email" id="edit-email" value="${user.email}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-role">Role:</label>
                        <select id="edit-role">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                            ${this.currentUser.role === 'superadmin' ? '<option value="superadmin" ' + (user.role === 'superadmin' ? 'selected' : '') + '>SuperAdmin</option>' : ''}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-status">Status:</label>
                        <select id="edit-status">
                            <option value="true" ${user.isActive ? 'selected' : ''}>Active</option>
                            <option value="false" ${!user.isActive ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.user-modal').style.display='none'">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        modal.style.display = 'flex';

        // Handle form submission
        const form = document.getElementById('edit-user-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateUser(user.id, {
                email: document.getElementById('edit-email').value,
                role: document.getElementById('edit-role').value,
                isActive: document.getElementById('edit-status').value === 'true'
            });
        });
    }

    // Delete user modal
    openDeleteUserModal(user) {
        const modal = document.getElementById('delete-user-modal');
        if (!modal) {
            console.error('Delete user modal not found');
            return;
        }

        modal.innerHTML = `
            <div class="delete-user-modal-content">
                <h3>Delete User</h3>
                <p>Are you sure you want to delete the user <strong>${user.email}</strong>?</p>
                <p>This action cannot be undone.</p>
                <div class="form-actions">
                    <button class="btn btn-danger" onclick="adminPanel.deleteUser('${user.id}')">Delete User</button>
                    <button class="btn btn-secondary" onclick="this.closest('.delete-user-modal').style.display='none'">Cancel</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    // Update user
    async updateUser(userId, userData) {
        this.token = localStorage.getItem('jwtToken');
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update user');
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('[AdminPanel] User updated successfully');
                // Close modal and reload user list
                document.getElementById('user-modal').style.display = 'none';
                await this.loadUserList();
            } else {
                throw new Error(data.message || 'Failed to update user');
            }
        } catch (error) {
            console.error('[AdminPanel] Error updating user:', error);
            alert(`Error updating user: ${error.message}`);
        }
    }

    // Delete user
    async deleteUser(userId) {
        this.token = localStorage.getItem('jwtToken');
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete user');
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('[AdminPanel] User deleted successfully');
                // Close modal and reload user list
                document.getElementById('delete-user-modal').style.display = 'none';
                await this.loadUserList();
            } else {
                throw new Error(data.message || 'Failed to delete user');
            }
        } catch (error) {
            console.error('[AdminPanel] Error deleting user:', error);
            alert(`Error deleting user: ${error.message}`);
        }
    }

    // Add user modal
    openAddUserModal() {
        const modal = document.getElementById('user-modal');
        if (!modal) {
            console.error('User modal not found');
            return;
        }

        modal.innerHTML = `
            <div class="user-modal-content">
                <h3>Add New User</h3>
                <form id="add-user-form">
                    <div class="form-group">
                        <label for="add-email">Email:</label>
                        <input type="email" id="add-email" required>
                    </div>
                    <div class="form-group">
                        <label for="add-password">Password:</label>
                        <input type="password" id="add-password" required>
                    </div>
                    <div class="form-group">
                        <label for="add-role">Role:</label>
                        <select id="add-role">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            ${this.currentUser.role === 'superadmin' ? '<option value="superadmin">SuperAdmin</option>' : ''}
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Create User</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.user-modal').style.display='none'">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        modal.style.display = 'flex';

        // Handle form submission
        const form = document.getElementById('add-user-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createUser({
                email: document.getElementById('add-email').value,
                password: document.getElementById('add-password').value,
                role: document.getElementById('add-role').value
            });
        });
    }

    // Create user
    async createUser(userData) {
        this.token = localStorage.getItem('jwtToken');
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create user');
            }

            const data = await response.json();
            
            if (data.success) {
                console.log('[AdminPanel] User created successfully');
                // Close modal and reload user list
                document.getElementById('user-modal').style.display = 'none';
                await this.loadUserList();
            } else {
                throw new Error(data.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('[AdminPanel] Error creating user:', error);
            alert(`Error creating user: ${error.message}`);
        }
    }
    
    /**
     * Track real-time activity and update dashboard
     */
    trackActivity(activityText, activityType = 'info') {
        try {
            console.log(`🔧 [AdminPanel] Tracking activity: ${activityText}`);
            
            // Add to localStorage for persistence
            const today = new Date().toDateString();
            const key = `recent_activities_${today}`;
            let activities = [];
            
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    activities = JSON.parse(stored);
                }
            } catch (e) {
                console.warn('🔧 [AdminPanel] Could not parse stored activities');
            }
            
            // Add new activity
            const newActivity = {
                time: new Date().toLocaleTimeString(),
                text: activityText,
                type: activityType,
                timestamp: Date.now()
            };
            
            activities.unshift(newActivity); // Add to beginning
            activities = activities.slice(0, 10); // Keep only last 10
            
            // Store updated activities
            localStorage.setItem(key, JSON.stringify(activities));
            
            // Update dashboard if visible
            if (this.isVisible && this.currentTab === 'dashboard') {
                this.updateRecentActivityDisplay(activities);
            }
            
            console.log(`🔧 [AdminPanel] Activity tracked: ${activityText}`);
        } catch (error) {
            console.error('🔧 [AdminPanel] Error tracking activity:', error);
        }
    }
    
    /**
     * Update recent activity display in dashboard
     */
    updateRecentActivityDisplay(activities) {
        try {
            const activityContainer = document.getElementById('recent-activity');
            if (!activityContainer) return;
            
            // Take first 5 activities for display
            const displayActivities = activities.slice(0, 5);
            
            const activityHTML = displayActivities.map(activity => `
                <div class="activity-item">
                    <span class="activity-time">${activity.time}</span>
                    <span class="activity-text">${activity.text}</span>
                </div>
            `).join('');
            
            activityContainer.innerHTML = activityHTML;
        } catch (error) {
            console.error('🔧 [AdminPanel] Error updating activity display:', error);
        }
    }
    
    /**
     * Refresh dashboard data
     */
    async refreshDashboard() {
        try {
            console.log('🔧 [AdminPanel] Refreshing dashboard data...');
            
            // Track refresh activity
            this.trackActivity('Dashboard manually refreshed', 'info');
            
            // Force refresh media statistics first
            await this.loadMediaStatistics();
            
            // Force refresh amplification usage
            await this.loadAmplificationUsage();
            
            // Then load other dashboard data
            await this.loadSystemPerformance();
            await this.loadRecentActivity();
            
            console.log('🔧 [AdminPanel] Dashboard refreshed successfully');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error refreshing dashboard:', error);
        }
    }

    /**
     * Manually refresh amplification usage data
     */
    async refreshAmplificationData() {
        try {
            console.log('🔧 [AdminPanel] Manually refreshing amplification data...');
            
            // Force refresh from VideoPlayer if available
            if (window.VideoPlayer && window.VideoPlayer.getAmplificationStats) {
                const usageStats = window.VideoPlayer.getAmplificationStats();
                document.getElementById('times-used').textContent = usageStats.usageCount || '0';
                document.getElementById('avg-level').textContent = (usageStats.avgLevel || 100) + '%';
                document.getElementById('max-level').textContent = (usageStats.maxLevel || 100) + '%';
                
                // Track the refresh action
                this.trackActivity(`Amplification data refreshed - Current: ${usageStats.usageCount} uses, Avg: ${usageStats.avgLevel}%, Max: ${usageStats.maxLevel}%`, 'info');
                
                console.log('🔧 [AdminPanel] Amplification data refreshed from VideoPlayer:', usageStats);
            } else {
                // Fallback to localStorage refresh
                await this.loadAmplificationUsage();
                this.trackActivity('Amplification data refreshed from localStorage', 'info');
            }
            
            console.log('🔧 [AdminPanel] Amplification data refreshed successfully');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error refreshing amplification data:', error);
        }
    }
    
    /**
     * Start real-time updates for system performance
     */
    startRealTimeUpdates() {
        try {
            console.log('🔧 [AdminPanel] Starting real-time updates...');
            
            // Update system performance every 30 seconds if dashboard is active
            setInterval(() => {
                if (this.isVisible && this.currentTab === 'dashboard') {
                    this.updateSystemPerformanceRealTime();
                }
            }, 30000); // 30 seconds
            
            console.log('🔧 [AdminPanel] Real-time updates started');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error starting real-time updates:', error);
        }
    }
    
    /**
     * Update system performance metrics in real-time
     */
    updateSystemPerformanceRealTime() {
        try {
            // Update memory usage
            if (performance.memory) {
                const memoryMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
                const memoryElement = document.getElementById('memory-usage');
                if (memoryElement) {
                    memoryElement.textContent = `${memoryMB} MB`;
                }
            }
            
            // Update API calls if available
            if (window.QuotaMonitor && typeof window.QuotaMonitor.getTodayUsage === 'function') {
                const apiCalls = window.QuotaMonitor.getTodayUsage();
                if (apiCalls !== null && apiCalls !== undefined) {
                    const apiElement = document.getElementById('api-calls');
                    if (apiElement) {
                        apiElement.textContent = apiCalls.toString();
                    }
                }
            }
            
            console.log('🔧 [AdminPanel] Real-time system performance updated');
        } catch (error) {
            console.error('🔧 [AdminPanel] Error updating real-time performance:', error);
        }
    }

    /**
     * Manually scan and count media files to get accurate statistics
     */
    async scanMediaFiles() {
        try {
            console.log('🔧 [AdminPanel] Manually scanning media files...');
            
            // This would typically call a backend API to scan the actual file system
            // For now, we'll try to get the most recent data from various sources
            
            let totalMovies = 0;
            let totalTvShows = 0;
            let totalEpisodes = 0;
            
            // Try to get from server-side scan if available
            try {
                const scanResponse = await fetch('/api/admin/scan-media', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        scanType: 'count',
                        includeMovies: true,
                        includeTvShows: true
                    })
                });
                
                if (scanResponse.ok) {
                    const scanData = await scanResponse.json();
                    if (scanData.success) {
                        totalMovies = scanData.counts.movies || 0;
                        totalTvShows = scanData.counts.tvShows || 0;
                        totalEpisodes = scanData.counts.episodes || 0;
                        console.log(`🔧 [AdminPanel] Server scan results: ${totalMovies} movies, ${totalTvShows} TV shows, ${totalEpisodes} episodes`);
                    }
                }
            } catch (e) {
                console.warn('🔧 [AdminPanel] Server scan not available, using file-based counting');
            }
            
            // If server scan failed, try to count from available data files
            if (totalMovies === 0 || totalTvShows === 0) {
                // Load movies count
                try {
                    const moviesResponse = await fetch('./components/MediaLibrary/data/movies/media-library-movies_normalized.json');
                    if (moviesResponse.ok) {
                        const moviesData = await moviesResponse.json();
                        totalMovies = moviesData.folders ? moviesData.folders.length : 0;
                        console.log(`🔧 [AdminPanel] Movies counted from file: ${totalMovies}`);
                    }
                } catch (e) {
                    console.warn('🔧 [AdminPanel] Could not count movies from file');
                }
                
                // Load TV shows count
                try {
                    const tvShowsResponse = await fetch('./components/MediaLibrary/data/tv-shows/media-library-tv-shows_normalized.json');
                    if (tvShowsResponse.ok) {
                        const tvShowsData = await tvShowsResponse.json();
                        totalTvShows = Array.isArray(tvShowsData) ? tvShowsData.length : 0;
                        console.log(`🔧 [AdminPanel] TV Shows counted from file: ${totalTvShows}`);
                        
                        // Count episodes
                        if (Array.isArray(tvShowsData)) {
                            tvShowsData.forEach(show => {
                                if (show.folders) {
                                    show.folders.forEach(season => {
                                        if (season.files) {
                                            totalEpisodes += season.files.length;
                                        }
                                    });
                                }
                            });
                            console.log(`🔧 [AdminPanel] Episodes counted from file: ${totalEpisodes}`);
                        }
                    }
                } catch (e) {
                    console.warn('🔧 [AdminPanel] Could not count TV shows from file');
                }
            }
            
            // Only update DOM if we have real data
            if (totalMovies > 0) {
                document.getElementById('total-movies').textContent = totalMovies.toLocaleString();
            } else {
                document.getElementById('total-movies').textContent = 'No Data';
            }
            
            if (totalTvShows > 0) {
                document.getElementById('total-tv-shows').textContent = totalTvShows.toLocaleString();
            } else {
                document.getElementById('total-tv-shows').textContent = 'No Data';
            }
            
            if (totalEpisodes > 0) {
                document.getElementById('total-episodes').textContent = totalEpisodes.toLocaleString();
            } else {
                document.getElementById('total-episodes').textContent = 'No Data';
            }
            
            // Store the scanned values only if we have real data
            if (totalMovies > 0) localStorage.setItem('total_movies', totalMovies.toString());
            if (totalTvShows > 0) localStorage.setItem('total_tv_shows', totalTvShows.toString());
            if (totalEpisodes > 0) localStorage.setItem('total_episodes', totalEpisodes.toString());
            
            console.log(`🔧 [AdminPanel] Media scan completed: ${totalMovies} movies, ${totalTvShows} TV shows, ${totalEpisodes} episodes`);
            
            // Track the scan activity
            this.trackActivity(`Media files scanned: ${totalMovies} movies, ${totalTvShows} TV shows, ${totalEpisodes} episodes`, 'info');
            
        } catch (error) {
            console.error('🔧 [AdminPanel] Error scanning media files:', error);
            this.trackActivity('Media file scan failed', 'error');
        }
    }
}


// ---- Browser Console Log Capture ----
(function setupBrowserConsoleLogCapture() {
  const logBuffer = [];
  const MAX_LOGS = 500;
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  function addLog(type, args) {
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
    const time = new Date().toLocaleTimeString();
    logBuffer.push(`[${time}] [${type}] ${msg}`);
    if (logBuffer.length > MAX_LOGS) logBuffer.shift();
    // Only try to render if modal exists and is visible
    const modal = document.getElementById('browser-console-modal');
    if (modal && modal.style.display !== 'none') {
      window.renderBrowserConsoleLogs();
    }
  }

  console.log = function(...args) {
    addLog('log', args);
    origLog.apply(console, args);
  };
  console.warn = function(...args) {
    addLog('warn', args);
    origWarn.apply(console, args);
  };
  console.error = function(...args) {
    addLog('error', args);
    origError.apply(console, args);
  };

  window.__getBrowserConsoleLogs = () => logBuffer.slice();

  // Set up modal event listeners when DOM is ready
  function setupModalListeners() {
    const showBtn = document.getElementById('show-browser-console-btn');
    const closeBtn = document.getElementById('close-browser-console-modal');
    const modal = document.getElementById('browser-console-modal');
    
    if (showBtn) {
      showBtn.onclick = function() {
        if (modal) {
          modal.style.display = 'flex';
          window.renderBrowserConsoleLogs();
        }
      };
    }
    
    if (closeBtn) {
      closeBtn.onclick = function() {
        if (modal) {
          modal.style.display = 'none';
        }
      };
    }
    
    if (modal) {
      modal.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          modal.style.display = 'none';
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupModalListeners);
  } else {
    setupModalListeners();
  }

  // Expose log buffer for debugging if needed
  window.__browserConsoleLogBuffer = logBuffer;
})();

// Make renderBrowserConsoleLogs globally accessible
window.renderBrowserConsoleLogs = function() {
  const area = document.getElementById('browser-console-log-area');
  if (!area) return;
  const logBuffer = window.__getBrowserConsoleLogs() || [];
  area.textContent = logBuffer.join('\n');
  area.scrollTop = area.scrollHeight;
}; 

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPanel;
} else {
    // Browser environment
    window.AdminPanel = AdminPanel;
}

export default AdminPanel;