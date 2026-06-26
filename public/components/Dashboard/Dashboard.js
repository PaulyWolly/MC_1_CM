/*
  DASHBOARD.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

class Dashboard {
    constructor() {
        this.container = null;
        this.isVisible = false;
        this.statsData = {};
        this.updateInterval = null;
    }

    async init() {
        console.log('[DEBUG - DASHBOARD] Initializing Dashboard component');
        
        // Create dashboard container
        this.createDashboardContainer();
        
        // Load initial data
        await this.loadDashboardData();
        
        // Start periodic updates
        this.startPeriodicUpdates();
        
        console.log('[DEBUG - DASHBOARD] Dashboard component initialized');
    }

    createDashboardContainer() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'dashboard-container';
        this.container.className = 'dashboard-container';
        this.container.style.display = 'none';
        
        // Create dashboard content
        this.container.innerHTML = `
            <div class="dashboard-header">
                <h2>📊 App Dashboard</h2>
                <button class="dashboard-close-btn" id="dashboard-close-btn">✕</button>
            </div>
            
            <div class="dashboard-content">
                <div class="dashboard-section">
                    <h3>🎬 Media Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value" id="total-movies">-</div>
                            <div class="stat-label">Total Movies</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-tv-shows">-</div>
                            <div class="stat-label">Total TV Shows</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-episodes">-</div>
                            <div class="stat-label">Total Episodes</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="total-watch-time">-</div>
                            <div class="stat-label">Total Watch Time</div>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-section">
                    <h3>🔊 Amplification Usage</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value" id="amplify-usage-count">-</div>
                            <div class="stat-label">Times Used</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="avg-amplify-level">-</div>
                            <div class="stat-label">Avg Level</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="max-amplify-level">-</div>
                            <div class="stat-label">Max Level</div>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-section">
                    <h3>⚡ System Performance</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value" id="memory-usage">-</div>
                            <div class="stat-label">Memory Usage</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="api-calls">-</div>
                            <div class="stat-label">API Calls Today</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value" id="error-count">-</div>
                            <div class="stat-label">Errors Today</div>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-section">
                    <h3>📈 Recent Activity</h3>
                    <div class="activity-list" id="recent-activity">
                        <div class="activity-item">Loading recent activity...</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(this.container);
        
        // Add event listeners
        this.addEventListeners();
        
        // Add CSS
        this.addDashboardStyles();
    }

    addEventListeners() {
        // Close button
        const closeBtn = this.container.querySelector('#dashboard-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Click outside to close
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.hide();
            }
        });
    }

    addDashboardStyles() {
        if (document.getElementById('dashboard-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dashboard-styles';
        style.textContent = `
            .dashboard-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            .dashboard-content {
                background: #1a1a1a;
                border-radius: 12px;
                width: 90%;
                max-width: 1200px;
                max-height: 90vh;
                overflow-y: auto;
                color: white;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            }
            
            .dashboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 30px;
                border-bottom: 2px solid #333;
                background: linear-gradient(135deg, #2c3e50, #34495e);
            }
            
            .dashboard-header h2 {
                margin: 0;
                font-size: 24px;
                color: #ecf0f1;
            }
            
            .dashboard-close-btn {
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                font-size: 18px;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .dashboard-close-btn:hover {
                background: #c0392b;
            }
            
            .dashboard-section {
                padding: 25px 30px;
                border-bottom: 1px solid #333;
            }
            
            .dashboard-section:last-child {
                border-bottom: none;
            }
            
            .dashboard-section h3 {
                margin: 0 0 20px 0;
                font-size: 18px;
                color: #3498db;
                border-left: 4px solid #3498db;
                padding-left: 15px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .stat-card {
                background: linear-gradient(135deg, #2c3e50, #34495e);
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                border: 1px solid #444;
                transition: transform 0.3s, box-shadow 0.3s;
            }
            
            .stat-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
            }
            
            .stat-value {
                font-size: 32px;
                font-weight: bold;
                color: #f39c12;
                margin-bottom: 8px;
            }
            
            .stat-label {
                font-size: 14px;
                color: #bdc3c7;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .activity-list {
                max-height: 300px;
                overflow-y: auto;
            }
            
            .activity-item {
                padding: 12px 0;
                border-bottom: 1px solid #333;
                color: #ecf0f1;
                font-size: 14px;
            }
            
            .activity-item:last-child {
                border-bottom: none;
            }
            
            .activity-item .time {
                color: #95a5a6;
                font-size: 12px;
                margin-left: 10px;
            }
            
            @media (max-width: 768px) {
                .dashboard-content {
                    width: 95%;
                    margin: 20px;
                }
                
                .stats-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    async loadDashboardData() {
        console.log('[DEBUG - DASHBOARD] Loading dashboard data');
        
        try {
            // Load media library stats
            await this.loadMediaStats();
            
            // Load amplification stats
            await this.loadAmplificationStats();
            
            // Load system performance stats
            await this.loadSystemStats();
            
            // Load recent activity
            await this.loadRecentActivity();
            
        } catch (error) {
            console.error('[DEBUG - DASHBOARD] Error loading dashboard data:', error);
        }
    }

    async loadMediaStats() {
        try {
            // Get media library data
            const mediaLibrary = window.mediaLibraryManager;
            if (mediaLibrary) {
                const movies = mediaLibrary.movies || [];
                const tvShows = mediaLibrary.tvShows || [];
                
                let totalEpisodes = 0;
                tvShows.forEach(show => {
                    if (show.seasons) {
                        Object.values(show.seasons).forEach(season => {
                            if (season.episodes) {
                                totalEpisodes += Object.keys(season.episodes).length;
                            }
                        });
                    }
                });
                
                this.updateStat('total-movies', movies.length);
                this.updateStat('total-tv-shows', tvShows.length);
                this.updateStat('total-episodes', totalEpisodes);
                
                // Calculate total watch time (placeholder - would need to track actual watch time)
                const totalWatchTime = '0h 0m'; // This would come from actual usage data
                this.updateStat('total-watch-time', totalWatchTime);
            }
        } catch (error) {
            console.error('[DEBUG - DASHBOARD] Error loading media stats:', error);
        }
    }

    async loadAmplificationStats() {
        try {
            // Get amplification stats from localStorage or other sources
            const amplifyStats = JSON.parse(localStorage.getItem('amplifyStats')) || {
                usageCount: 0,
                avgLevel: 100,
                maxLevel: 100
            };
            
            this.updateStat('amplify-usage-count', amplifyStats.usageCount);
            this.updateStat('avg-amplify-level', `${amplifyStats.avgLevel}%`);
            this.updateStat('max-amplify-level', `${amplifyStats.maxLevel}%`);
            
        } catch (error) {
            console.error('[DEBUG - DASHBOARD] Error loading amplification stats:', error);
        }
    }

    async loadSystemStats() {
        try {
            // Memory usage (approximate)
            if (performance.memory) {
                const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                this.updateStat('memory-usage', `${memoryMB} MB`);
            } else {
                this.updateStat('memory-usage', 'N/A');
            }
            
            // API calls (placeholder - would need to track actual API usage)
            const apiCalls = localStorage.getItem('apiCallsToday') || '0';
            this.updateStat('api-calls', apiCalls);
            
            // Error count (placeholder - would need to track actual errors)
            const errorCount = localStorage.getItem('errorCountToday') || '0';
            this.updateStat('error-count', errorCount);
            
        } catch (error) {
            console.error('[DEBUG - DASHBOARD] Error loading system stats:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const activityList = this.container.querySelector('#recent-activity');
            if (!activityList) return;
            
            // Get recent activity from various sources
            const activities = [];
            
            // Add some sample activities (in real implementation, these would come from actual usage data)
            activities.push({
                action: 'Video played: Captain Marvel (2019)',
                time: new Date().toLocaleTimeString()
            });
            
            activities.push({
                action: 'Amplification used at 300%',
                time: new Date(Date.now() - 300000).toLocaleTimeString()
            });
            
            activities.push({
                action: 'New movie added: Spectral (2016)',
                time: new Date(Date.now() - 600000).toLocaleTimeString()
            });
            
            // Update the activity list
            activityList.innerHTML = activities.map(activity => 
                `<div class="activity-item">
                    ${activity.action}
                    <span class="time">${activity.time}</span>
                </div>`
            ).join('');
            
        } catch (error) {
            console.error('[DEBUG - DASHBOARD] Error loading recent activity:', error);
        }
    }

    updateStat(elementId, value) {
        const element = this.container.querySelector(`#${elementId}`);
        if (element) {
            element.textContent = value;
        }
    }

    startPeriodicUpdates() {
        // Update stats every 30 seconds
        this.updateInterval = setInterval(() => {
            if (this.isVisible) {
                this.loadDashboardData();
            }
        }, 30000);
    }

    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    show() {
        if (this.container) {
            this.container.style.display = 'flex';
            this.isVisible = true;
            
            // Refresh data when showing
            this.loadDashboardData();
            
            console.log('[DEBUG - DASHBOARD] Dashboard shown');
        }
    }

    hide() {
        if (this.container) {
            this.container.style.display = 'none';
            this.isVisible = false;
            console.log('[DEBUG - DASHBOARD] Dashboard hidden');
        }
    }

    destroy() {
        this.stopPeriodicUpdates();
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
    }
}

export default Dashboard;
