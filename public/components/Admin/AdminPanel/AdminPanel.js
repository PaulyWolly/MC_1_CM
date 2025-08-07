/*
  ADMINPANEL.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
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
            
            // Load component assets (CSS and HTML template) and LoginManager resources
            await Promise.all([
                this.loadCSS(),
                this.loadLoginManagerCSS(),
                this.loadHTML(),
                this.loadLoginManagerHTML()
            ]);
            
            // Create component from HTML template
            this.createFromTemplate();
            
            // Setup DOM element references
            this.setupElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Component-specific initialization
            this.initializeComponent();
            
            // Setup login callback
            if (window.LoginManager) {
                window.LoginManager.onLogin = (user) => {
                    this.currentUser = user;
                    this.updateRoleBasedUI();
                    this.show(); // Ensure admin panel is shown after login
                    console.log(`🔧 [AdminPanel] User logged in: ${user.email} (${user.role})`);
                };
            }
            
            this.isInitialized = true;
            console.log('🔧 [AdminPanel] Admin panel initialized successfully');
            
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
                // Check if LoginManager HTML is already loaded
                if (document.getElementById('login-manager-modal')) {
                    console.log('🔧 [AdminPanel] LoginManager HTML already loaded');
                    resolve();
                    return;
                }

                const response = await fetch('./components/Admin/LoginManager/LoginManager.html');
                if (!response.ok) {
                    throw new Error(`Failed to fetch LoginManager HTML template: ${response.status}`);
                }
                
                const htmlContent = await response.text();
                // Add LoginManager HTML to body
                document.body.insertAdjacentHTML('beforeend', htmlContent);
                console.log('🔧 [AdminPanel] LoginManager HTML loaded successfully');
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
        // Initialize with script-runner tab active
        this.switchTab('script-runner');
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
        
        console.log('🔧 [AdminPanel] Component-specific initialization complete');
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
     * Show the admin panel
     */
    async show() {
        if (this.containerElement) {
            const isAuthenticated = await this.checkAuth();
            if (!isAuthenticated) return;

            this.containerElement.style.display = 'block';
            this.isVisible = true;
            
            // Update UI based on user role
            this.updateRoleBasedUI();
            
            console.log('🔧 [AdminPanel] Admin panel shown');
        }
    }

    /**
     * Hide the admin panel
     */
    hide() {
        if (this.containerElement) {
            this.containerElement.style.display = 'none';
            this.isVisible = false;
            console.log('🔧 [AdminPanel] Admin panel hidden');
        }
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
        this.hide();
        // Do NOT show the main chat interface or change chatContainer display. Overlay only.
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
     * Check authentication before showing admin panel
     */
    async checkAuth() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('🔧 [AdminPanel] No auth token found, showing login');
                await this.ensureLoginManagerLoaded();
                
                // Debug: Check if LoginManager HTML elements exist
                const modal = document.getElementById('login-manager-modal');
                console.log('🔧 [AdminPanel] LoginManager modal element:', modal);
                
                if (window.LoginManager) {
                    console.log('🔧 [AdminPanel] Calling LoginManager.checkAuth()');
                    window.LoginManager.checkAuth();
                } else {
                    console.error('🔧 [AdminPanel] LoginManager not available after ensureLoginManagerLoaded');
                }
                return false;
            }

            // Verify token with backend
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                console.log('🔧 [AdminPanel] Token invalid, showing login');
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                await this.ensureLoginManagerLoaded();
                
                // Debug: Check if LoginManager HTML elements exist
                const modal = document.getElementById('login-manager-modal');
                console.log('🔧 [AdminPanel] LoginManager modal element:', modal);
                
                if (window.LoginManager) {
                    console.log('🔧 [AdminPanel] Calling LoginManager.checkAuth()');
                    window.LoginManager.checkAuth();
                } else {
                    console.error('🔧 [AdminPanel] LoginManager not available after ensureLoginManagerLoaded');
                }
                return false;
            }

            // Store user info
            this.currentUser = data.user;
            localStorage.setItem('authUser', JSON.stringify(data.user));
            console.log(`🔧 [AdminPanel] Authenticated as: ${data.user.email} (${data.user.role})`);
            return true;

        } catch (error) {
            console.error('🔧 [AdminPanel] Auth check error:', error);
            await this.ensureLoginManagerLoaded();
            
            // Debug: Check if LoginManager HTML elements exist
            const modal = document.getElementById('login-manager-modal');
            console.log('🔧 [AdminPanel] LoginManager modal element:', modal);
            
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
        // If LoginManager is already available, return immediately
        if (window.LoginManager && typeof window.LoginManager.checkAuth === 'function') {
            console.log('🔧 [AdminPanel] LoginManager already available');
            return;
        }

        console.log('🔧 [AdminPanel] LoginManager not available, waiting for it to load...');
        
        // Wait for LoginManager to be available (it should be loaded by app.js)
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max wait
        while (!window.LoginManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        // If still not available, try loading it ourselves
        if (!window.LoginManager) {
            console.log('🔧 [AdminPanel] LoginManager not found, loading it ourselves...');
            
            // Load LoginManager script if not already loaded
            if (!document.querySelector('script[src*="LoginManager.js"]')) {
                const loginManagerScript = document.createElement('script');
                loginManagerScript.src = './components/Admin/LoginManager/LoginManager.js';
                
                await new Promise((resolve, reject) => {
                    loginManagerScript.onload = resolve;
                    loginManagerScript.onerror = reject;
                    document.head.appendChild(loginManagerScript);
                });
            }

            // Wait again for LoginManager to be available
            attempts = 0;
            while (!window.LoginManager && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }

        if (!window.LoginManager) {
            throw new Error('LoginManager failed to load after multiple attempts');
        }

        console.log('🔧 [AdminPanel] LoginManager loaded successfully');
    }

    /**
     * Logout and show login modal
     */
    async logout() {
        this.currentUser = null;
        this.hide();
        await this.ensureLoginManagerLoaded();
        if (window.LoginManager) {
            window.LoginManager.logout();
        }
    }

    /**
     * Update UI based on user role
     */
    updateRoleBasedUI() {
        if (!this.currentUser) return;

        // Hide SuperAdmin features from non-superadmin users
        const superAdminElements = document.querySelectorAll('[data-role="superadmin"]');
        const isSuperAdmin = this.currentUser.role === 'superadmin';
        
        superAdminElements.forEach(element => {
            element.style.display = isSuperAdmin ? '' : 'none';
        });

        // Add user info to UI if available
        const userInfoElement = document.getElementById('admin-user-info');
        if (userInfoElement) {
            userInfoElement.textContent = `${this.currentUser.email} (${this.currentUser.role})`;
        }

        // Set welcome message in header
        const welcomeDiv = document.getElementById('admin-welcome');
        if (welcomeDiv) {
            let name = this.currentUser.name || this.currentUser.email || 'User';
            // If email is present but no name, use the part before @
            if (!this.currentUser.name && this.currentUser.email) {
                name = this.currentUser.email.split('@')[0];
                name = name.charAt(0).toUpperCase() + name.slice(1);
            }
            if (this.currentUser.role === 'superadmin') {
                welcomeDiv.textContent = `Welcome, SuperAdmin`;
            } else {
                welcomeDiv.textContent = `Welcome, ${name}`;
            }
        }

        // Add logout button if not present
        this.addLogoutButton();
    }

    /**
     * Add logout button to admin panel
     */
    addLogoutButton() {
        // Check if logout button already exists
        if (document.getElementById('admin-logout-btn')) return;

        const header = document.querySelector('.admin-header');
        if (header) {
            const logoutBtn = document.createElement('button');
            logoutBtn.id = 'admin-logout-btn';
            logoutBtn.className = 'admin-logout-btn';
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = this.logout;
            
            header.appendChild(logoutBtn);
        }
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
  const logBuffer = window.__browserConsoleLogBuffer || [];
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