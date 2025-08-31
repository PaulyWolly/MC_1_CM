/*
  QUOTAMONITOR.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

/**
 * QuotaMonitor Component
 * 
 * Manages YouTube API quota monitoring and provides visual feedback
 * Handles quota limits, warnings, and cache-only mode functionality
 * 
 * @version 1.1.0
 * @author MultiChat_Chatty
 */

export default class QuotaMonitor {
    constructor() {
        // YouTube API quota settings
        this.dailyLimit = 10000; // This will be updated from server
        this.dailyUsed = 0; // This will be updated from server
        this.warningThresholds = {
            yellow: 0.6,   // 60% - Show warning
            orange: 0.8,   // 80% - Show caution
            red: 0.9       // 90% - Show critical warning
        };
        
        this.isInitialized = false;
        this.serverSyncInterval = 60000; // Sync with server every 60 seconds
    }

    /**
     * Fetch the latest quota status from the server
     */
    async fetchQuotaFromServer() {
        try {
            const response = await fetch('/api/youtube/quota-status');
            if (!response.ok) {
                console.warn('🎯 [QUOTA] Could not fetch quota from server, using local values.');
                return null;
            }
            const data = await response.json();
            
            this.dailyUsed = data.used;
            this.dailyLimit = data.total;
            
            localStorage.setItem('youtube_quota_used', this.dailyUsed);
            localStorage.setItem('youtube_quota_reset', data.resetTime);
            
            // console.log('🎯 [QUOTA] Synced with server:', data);
            return data;
        } catch (error) {
            console.error('🎯 [QUOTA] Error fetching quota from server:', error);
            return null;
        }
    }

    /**
     * Initialize the QuotaMonitor
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🎯 [QUOTA] Initializing YouTube API quota monitoring');
            
            this.loadCSS();
            this.addQuotaDashboard(); // Create the element first
            
            // Now that the element exists, perform the initial data fetch and render
            await this.updateQuotaDashboard();

            this.isInitialized = true;
            
            // Periodically sync with server
            setInterval(() => this.fetchQuotaFromServerAndUpdate(), this.serverSyncInterval);
            
            console.log('🎯 [QUOTA] Quota monitor initialized successfully');
        } catch (error) {
            console.error('🎯 [QUOTA] Initialization error:', error);
        }
    }

    /**
     * Fetch from server and update the dashboard UI
     */
    async fetchQuotaFromServerAndUpdate() {
        await this.fetchQuotaFromServer();
        this.updateQuotaDashboard();
    }

    /**
     * Load the dedicated CSS file for the component.
     */
    loadCSS() {
        if (document.getElementById('quota-monitor-css')) return;

        const link = document.createElement('link');
        link.id = 'quota-monitor-css';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = 'components/QuotaMonitor/QuotaMonitor.css';
        document.head.appendChild(link);
    }

    /**
     * Get the current usage count
     */
    getCurrentUsage() {
        return this.dailyUsed || parseInt(localStorage.getItem('youtube_quota_used'), 10) || 0;
    }

    /**
     * Increment the usage count
     */
    incrementUsage(cost = 101) { // Default cost for a typical search
        this.dailyUsed = this.getCurrentUsage() + cost;
        localStorage.setItem('youtube_quota_used', this.dailyUsed);
        
        // No need to call server here, server tracks usage independently.
        // We just update the UI optimistically. The next server sync will correct any drift.
        
        this.updateQuotaDashboard();
        this.checkThresholds(this.dailyUsed);
    }

    /**
     * Check if we've hit warning thresholds
     */
    checkThresholds(currentCount) {
        const percentage = currentCount / this.dailyLimit;
        const remaining = this.dailyLimit - currentCount;
        
        // Handle quota exceeded case
        if (currentCount >= this.dailyLimit) {
            this.showQuotaExceededWarning();
            this.enableCacheOnlyMode();
            return;
        }
        
        if (percentage >= this.warningThresholds.red) {
            this.showCriticalWarning(remaining);
        } else if (percentage >= this.warningThresholds.orange) {
            this.showCautionWarning(remaining);
        } else if (percentage >= this.warningThresholds.yellow) {
            this.showWarning(remaining);
        }
    }

    /**
     * Show different warning levels
     */
    showWarning(remaining) {
        const percentage = Math.round(((10000 - remaining) / 10000) * 100);
        this.showToast(`🟡 YouTube API Warning: ${remaining} calls remaining today (${percentage}% used)`, 'warning', 6000);
    }

    showCautionWarning(remaining) {
        const percentage = Math.round(((10000 - remaining) / 10000) * 100);
        this.showToast(`🟠 HIGH USAGE ALERT: Only ${remaining} calls left today (${percentage}% used)! Consider using cached queries.`, 'error', 10000);
        this.showQuotaAlert('caution', remaining, percentage);
    }

    showCriticalWarning(remaining) {
        const percentage = Math.round(((10000 - remaining) / 10000) * 100);
        this.showToast(`🔴 DANGER ZONE: Only ${remaining} YouTube API calls remaining today (${percentage}% used)! You're very close to the limit!`, 'error', 15000);
        this.showQuotaAlert('critical', remaining, percentage);
        
        // Don't auto-enable cache-only mode until 95%
        if (remaining <= 500) { // 95%
            this.enableCacheOnlyMode();
        }
    }

    /**
     * Show prominent quota alert banner in UI
     */
    showQuotaAlert(level, remaining, percentage) {
        // Remove existing alert if present
        const existingAlert = document.getElementById('quota-alert-banner');
        if (existingAlert) {
            existingAlert.remove();
        }

        const banner = document.createElement('div');
        banner.id = 'quota-alert-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 10000;
            padding: 15px 20px;
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            animation: slideDown 0.5s ease-out;
        `;

        if (level === 'caution') {
            banner.style.background = 'linear-gradient(45deg, #ff9800, #f57c00)';
            banner.innerHTML = `🟠 HIGH USAGE ALERT: ${remaining} YouTube API calls remaining (${percentage}% used)! Consider using cached queries.`;
        } else if (level === 'critical') {
            banner.style.background = 'linear-gradient(45deg, #f44336, #d32f2f)';
            banner.innerHTML = `🔴 DANGER ZONE: Only ${remaining} YouTube API calls left (${percentage}% used)! You're very close to the limit!`;
            banner.style.animation = 'pulse 2s infinite';
        }

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(255,255,255,0.3);
            border: none;
            color: white;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            cursor: pointer;
            font-weight: bold;
        `;
        closeBtn.onclick = () => banner.remove();
        banner.appendChild(closeBtn);

        // Add CSS animations if not already present
        if (!document.getElementById('quota-alert-styles')) {
            const style = document.createElement('style');
            style.id = 'quota-alert-styles';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(banner);

        // Auto-remove after 30 seconds for caution, keep critical until manually closed
        if (level === 'caution') {
            setTimeout(() => {
                if (banner.parentNode) {
                    banner.remove();
                }
            }, 30000);
        }
    }

    showQuotaExceededWarning() {
        this.showToast(`🚫 QUOTA EXCEEDED: YouTube API daily limit reached! Cache-only mode enabled automatically.`, 'error', 20000);
        console.error('🚫 [QUOTA] Daily quota exceeded!');
    }

    /**
     * Enable cache-only mode
     */
    enableCacheOnlyMode() {
        // console.log('🔒 [QUOTA] Enabling cache-only mode to preserve remaining quota');
        localStorage.setItem('youtube_cache_only_mode', 'true');
        this.showToast('🔒 Cache-only mode enabled to preserve quota. Only cached results will be shown.', 'info', 10000);
        this.updateQuotaDashboard();
    }

    /**
     * Disable cache-only mode
     */
    disableCacheOnlyMode() {
        // console.log('🔓 [QUOTA] Disabling cache-only mode');
        localStorage.removeItem('youtube_cache_only_mode');
        this.showToast('🔓 Cache-only mode disabled. API calls re-enabled.', 'success');
        this.updateQuotaDashboard();
    }

    /**
     * Check if cache-only mode is active
     */
    isCacheOnlyMode() {
        return localStorage.getItem('youtube_cache_only_mode') === 'true';
    }

    /**
     * Display current quota status
     */
    displayQuotaStatus() {
        const usage = this.getCurrentUsage();
        console.log(`📊 [QUOTA] Current usage: ${usage}/${this.dailyLimit} (${((usage/this.dailyLimit)*100).toFixed(1)}%) - ${this.dailyLimit - usage} remaining`);
        
        if (this.isCacheOnlyMode()) {
            console.log('🔒 [QUOTA] Cache-only mode is active');
        }
    }

    /**
     * Add quota dashboard to UI (dual-object: minimized and restored always in DOM)
     */
    addQuotaDashboard() {
        // Always default to minimized view on load
        localStorage.setItem('quota_dashboard_minimized', 'true');
        if (document.getElementById('quota-dashboard-restored') && document.getElementById('quota-dashboard-minimized')) return;
        
        // Restored (full) dashboard
        let restored = document.getElementById('quota-dashboard-restored');
        if (!restored) {
            restored = document.createElement('div');
            restored.id = 'quota-dashboard-restored';
            restored.className = 'quota-dashboard restored-dashboard';
            document.body.appendChild(restored);
        }
        // Minimized bar
        let minimized = document.getElementById('quota-dashboard-minimized');
        if (!minimized) {
            minimized = document.createElement('div');
            minimized.id = 'quota-dashboard-minimized';
            minimized.className = 'quota-dashboard minimized-dashboard';
            document.body.appendChild(minimized);
        }
        this.updateQuotaDashboard();
    }

    /**
     * Update both dashboard elements' content and toggle visibility
     */
    async updateQuotaDashboard() {
        const currentCount = this.getCurrentUsage();
        const remaining = this.dailyLimit - currentCount;
        const percentage = this.dailyLimit > 0 ? (currentCount / this.dailyLimit) * 100 : 0;
        const colorStateName = this._getProgressColorStateName(percentage);
        const colorClass = `quota-color-${colorStateName}`;
        const cacheOnlyMode = this.isCacheOnlyMode();
        // Always read minimized state from localStorage
        const isMinimized = localStorage.getItem('quota_dashboard_minimized') === 'true';

        // Update restored
        const restored = document.getElementById('quota-dashboard-restored');
        if (restored) {
    
            restored.innerHTML = `
                <div class="quota-header">
                    <span class="quota-drag-handle" title="Drag to move">⠿</span>
                    <span class="quota-title">YouTube API Quota</span>
                    <div class="quota-header-buttons">
                        <button class="quota-refresh-btn" title="Refresh Quota">🔄</button>
                        <button class="quota-minimize-btn" title="Minimize">🗕</button>
                    </div>
                </div>
                <div class="quota-content-restored">
                    <div class="quota-stats">
                        <span class="quota-count">${currentCount}/${this.dailyLimit}</span>
                        <span class="quota-percentage ${colorClass}">${percentage.toFixed(0)}%</span>
                        <span class="quota-remaining">${remaining} remaining</span>
                    </div>
                    <progress class="quota-progress-bar quota-bgcolor-${colorStateName}" value="${currentCount}" max="${this.dailyLimit}"></progress>
                    <div class="quota-actions">
                        <button class="quota-toggle-cache-mode-btn${cacheOnlyMode ? ' cache-on' : ''}">${cacheOnlyMode ? 'Disable' : 'Enable'} Cache-Only Mode</button>
                        <button class="quota-test-warnings-btn">Test Warnings</button>
                    </div>
                    <div class="quota-script-runner">
                        <div class="quota-script-header">
                            <span>🔧 Quota Scripts (Click to toggle)</span>
                            <button class="quota-script-toggle-btn" title="Toggle Script Panel">▼</button>
                        </div>
                        <div class="quota-script-panel hidden">
                            <div class="quota-script-buttons">
                                <button class="quota-script-btn" data-script="fix_quota_monitor">🔧 Fix Quota Monitor</button>
                                <button class="quota-script-btn" data-script="check_real_youtube_quota">🌐 Check Real API</button>
                                <button class="quota-script-btn" data-script="force_quota_sync">🔄 Force Sync</button>
                                <button class="quota-script-btn" data-script="auto_quota_sync">⏰ Auto Sync (5min)</button>
                            </div>
                            <div class="quota-script-status">
                                <div class="quota-script-output"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    
            // Toggle visibility
            restored.classList.toggle('hidden', isMinimized);
        }
        // Update minimized
        const minimized = document.getElementById('quota-dashboard-minimized');
        if (minimized) {
            minimized.innerHTML = `
                <div class="quota-content-minimized">
                    <span class="quota-minimized-icon">📊</span>
                    <span class="quota-minimized-text">${currentCount}/${this.dailyLimit}</span>
                    <span class="quota-minimized-percentage ${colorClass}">${percentage.toFixed(0)}%</span>
                    ${cacheOnlyMode ? '<span class="quota-minimized-cache-icon">🔒</span>' : ''}
                </div>
            `;
            minimized.classList.toggle('hidden', !isMinimized);
        }
        this.attachDashboardEvents();
    }

    /**
     * Attach event listeners for both dashboard elements
     */
    attachDashboardEvents() {

        const restored = document.getElementById('quota-dashboard-restored');
        const minimized = document.getElementById('quota-dashboard-minimized');

        
        if (restored) {
            // Minimize button
            const minBtn = restored.querySelector('.quota-minimize-btn');
            if (minBtn) {
                minBtn.onclick = () => {
                    localStorage.setItem('quota_dashboard_minimized', 'true');
                    this.updateQuotaDashboard();
                };
            }
            // Refresh button
            const refreshBtn = restored.querySelector('.quota-refresh-btn');
            if (refreshBtn) {
                refreshBtn.onclick = async () => {
                    this.showToast('🔄 Syncing quota with server...', 'info', 2000);
                    const result = await this.fetchQuotaFromServer();
                    await this.updateQuotaDashboard();
                    if (result) {
                        this.showToast('✅ Quota synced!', 'success', 2000);
                    } else {
                        this.showToast('⚠️ Failed to sync quota.', 'error', 2000);
                    }
                };
            }
            // Cache mode button
            const cacheBtn = restored.querySelector('.quota-toggle-cache-mode-btn');
            if (cacheBtn) {
                cacheBtn.onclick = () => {
                    if (this.isCacheOnlyMode()) this.disableCacheOnlyMode();
                    else this.enableCacheOnlyMode();
                };
            }
            // Test warnings
            const testBtn = restored.querySelector('.quota-test-warnings-btn');
            if (testBtn) testBtn.onclick = () => this.testWarnings();
            
            // Script runner functionality
    
            this.attachScriptRunnerEvents(restored);
            
            // Drag handle
            const dragHandle = restored.querySelector('.quota-drag-handle');
            if (dragHandle) this.makeDraggable(restored);
        }
        if (minimized) {
            minimized.onclick = () => {
                localStorage.setItem('quota_dashboard_minimized', 'false');
                this.updateQuotaDashboard();
            };
        }
    }

    /**
     * Attach script runner event handlers
     */
    attachScriptRunnerEvents(container) {
        // Script panel toggle
        const toggleBtn = container.querySelector('.quota-script-toggle-btn');
        const scriptPanel = container.querySelector('.quota-script-panel');
        
        
        
        if (toggleBtn && scriptPanel) {
    
            toggleBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const wasHidden = scriptPanel.classList.contains('hidden');
                scriptPanel.classList.toggle('hidden');
                const isNowHidden = scriptPanel.classList.contains('hidden');
                toggleBtn.textContent = isNowHidden ? '▼' : '▲';
                // console.log('[DEBUG - QUOTA] Panel visibility toggled:', { 
                //     wasHidden, 
                //     isNowHidden, 
                //     newButtonText: toggleBtn.textContent,
                //     scriptPanelDisplay: scriptPanel.style.display,
                //     scriptPanelClasses: scriptPanel.className
                // });
            };
            
            // Also add a click handler to the header for easier clicking
            const scriptHeader = container.querySelector('.quota-script-header');
            if (scriptHeader) {
                scriptHeader.onclick = (e) => {
                    if (e.target !== toggleBtn) {
                        e.preventDefault();
                        e.stopPropagation();
        
                        const wasHidden = scriptPanel.classList.contains('hidden');
                        scriptPanel.classList.toggle('hidden');
                        const isNowHidden = scriptPanel.classList.contains('hidden');
                        toggleBtn.textContent = isNowHidden ? '▼' : '▲';
                        // console.log('[DEBUG - QUOTA] Panel visibility toggled via header:', { 
                        //     wasHidden, 
                        //     isNowHidden, 
                        //     newButtonText: toggleBtn.textContent 
                        // });
                    }
                };
            }
        } else {
            
        }
        
        // Script buttons
        const scriptBtns = container.querySelectorAll('.quota-script-btn');

        scriptBtns.forEach(btn => {
            btn.onclick = () => this.runQuotaScript(btn.dataset.script);
        });
    }

    /**
     * Run quota monitoring scripts
     */
    async runQuotaScript(scriptName) {
        const outputDiv = document.querySelector('.quota-script-output');
        if (outputDiv) {
            outputDiv.innerHTML = `<div class="script-running">🔄 Running ${scriptName}...</div>`;
        }
        
        try {
            const response = await fetch('/api/quota/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script: scriptName })
            });
            
            const result = await response.json();
            
            if (outputDiv) {
                if (result.success) {
                    outputDiv.innerHTML = `<div class="script-success">✅ ${result.message}</div>`;
                    if (result.output) {
                        outputDiv.innerHTML += `<pre class="script-output">${result.output}</pre>`;
                    }
                } else {
                    outputDiv.innerHTML = `<div class="script-error">❌ ${result.error}</div>`;
                }
            }
            
            // Update quota display after script runs
            await this.fetchQuotaFromServerAndUpdate();
            
        } catch (error) {
            if (outputDiv) {
                outputDiv.innerHTML = `<div class="script-error">❌ Error running script: ${error.message}</div>`;
            }
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 5000) {
        const toastManager = window.toastManager || (window.parent ? window.parent.toastManager : null);
        if (toastManager && toastManager.showToast) {
            toastManager.showToast(message, type, duration);
        } else {
            console.log(`[QUOTA-TOAST] ${type}: ${message}`);
        }
    }

    /**
     * Check if API call should be blocked
     */
    shouldBlockAPICall() {
        if (this.isCacheOnlyMode()) {
            // console.log('🔒 [QUOTA] API call blocked - cache-only mode active');
            this.showToast('🔒 API call blocked - cache-only mode active. Using cached data only.', 'warning');
            return true;
        }
        
        const usage = this.getCurrentUsage();
        if (usage >= this.dailyLimit) {
            // console.log('🚫 [QUOTA] API call blocked - daily quota exceeded');
            this.showToast('🚫 Daily YouTube quota exceeded. Please try again tomorrow.', 'error');
            return true;
        }
        
        // Only block at 90%+ (9000+ quota used)
        if (usage > 9000) {
            // console.log('🚫 [QUOTA] API call blocked - usage critically high (>90%)');
            this.showToast('🚫 API calls blocked - quota usage critically high (>90%). Please use cached results only.', 'error');
            return true;
        }
        
        return false;
    }

    /**
     * Make dashboard draggable
     */
    makeDraggable(dashboard) {
        const header = dashboard.querySelector('.quota-header');
        if (!header) return;

        header.onmousedown = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            e.preventDefault();
            
            dashboard.classList.add('dragging');
            
            const rect = dashboard.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const onMouseMove = (moveEvent) => {
                const newLeft = moveEvent.clientX - offsetX;
                const newTop = moveEvent.clientY - offsetY;
                
                dashboard.style.left = `${Math.max(0, Math.min(newLeft, window.innerWidth - dashboard.offsetWidth))}px`;
                dashboard.style.top = `${Math.max(0, Math.min(newTop, window.innerHeight - dashboard.offsetHeight))}px`;
                dashboard.classList.add('custom-position');
            };

            const onMouseUp = () => {
                dashboard.classList.remove('dragging');
                localStorage.setItem('quota_dashboard_x', dashboard.style.left);
                localStorage.setItem('quota_dashboard_y', dashboard.style.top);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
    }

    /**
     * Restore dashboard position from localStorage
     */
    restoreDashboardPosition(dashboard) {
        const savedX = localStorage.getItem('quota_dashboard_x');
        const savedY = localStorage.getItem('quota_dashboard_y');
        
        if (savedX && savedY) {
            dashboard.style.left = savedX;
            dashboard.style.top = savedY;
            dashboard.classList.add('custom-position');
        }
    }

    /**
     * Set quota monitor to exceeded state
     */
    setToExceeded() {
        // Set a flag to block further API calls
        window.youtubeQuotaExceeded = true;
        // Update the dashboard UI if it exists
        const dashboard = document.getElementById('quota-dashboard');
        if (dashboard) {
            dashboard.innerHTML = `
                <div class="quota-exceeded">
                    <b>❌ YouTube API Quota Exceeded</b><br>
                    No more API calls can be made today.<br>
                    Please check your Google Cloud Console.
                </div>
            `;
            dashboard.style.background = '#b71c1c';
            dashboard.style.color = '#fff';
        }
        // Optionally, show a toast
        this.showToast('YouTube API quota has been exceeded. Please try again later.', 'error', 8000);
    }

    /**
     * Cleanup method for component destruction
     */
    cleanup() {
        // Remove dashboard if it exists
        const dashboard = document.getElementById('quota-dashboard');
        if (dashboard) {
            dashboard.remove();
        }
        
        // Clear any timeouts
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        
        // console.log('🎯 [QUOTA] QuotaMonitor cleaned up');
    }

    /**
     * Test method to trigger warnings (for debugging)
     */
    testWarnings() {
        this.showToast('🧪 Testing Warnings...', 'info', 2000);
        const thresholds = [this.warningThresholds.yellow, this.warningThresholds.orange, this.warningThresholds.red];
        thresholds.forEach(threshold => {
            const usage = Math.floor(this.dailyLimit * threshold);
            const remaining = this.dailyLimit - usage;
            const percentage = (usage / this.dailyLimit);

            if (percentage >= this.warningThresholds.red) {
                this.showToast(`🔴 CRITICAL: ${remaining} calls left.`, 'error', 4000);
            } else if (percentage >= this.warningThresholds.orange) {
                this.showToast(`🟠 CAUTION: ${remaining} calls left.`, 'error', 4000);
            } else if (percentage >= this.warningThresholds.yellow) {
                this.showToast(`🟡 WARNING: ${remaining} calls left.`, 'warning', 4000);
            }
        });
    }

    /**
     * Get color state name based on usage percentage.
     * @private
     */
    _getProgressColorStateName(percentage) {
        if (percentage >= 85) return 'red';
        if (percentage >= 60) return 'orange';
        if (percentage >= 30) return 'yellow';
        return 'green';
    }

    /**
     * Admin function to manually set quota usage (for fixing tracking issues)
     */
    async setQuotaUsage(used) {
        try {
            const response = await fetch('/api/youtube/quota-set', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ used })
            });

            const result = await response.json();
            
            if (result.success) {
                this.dailyUsed = result.quota.used;
                this.updateQuotaDashboard();
                this.showToast(`✅ Quota usage manually set to ${used}`, 'success');
                console.log('📊 [QUOTA] Manual quota update successful:', result);
                return result;
            } else {
                throw new Error(result.error || 'Failed to update quota');
            }
        } catch (error) {
            console.error('📊 [QUOTA] Error setting quota usage:', error);
            this.showToast(`❌ Failed to set quota usage: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get detailed quota information for debugging
     */
    async getDetailedQuotaInfo() {
        try {
            const response = await fetch('/api/youtube/quota-status');
            const data = await response.json();
            //  console.log('📊 [QUOTA] Detailed quota info:', data);
            return data;
        } catch (error) {
            console.error('📊 [QUOTA] Error fetching detailed quota info:', error);
            return null;
        }
    }
} 