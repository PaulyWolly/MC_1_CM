/*
  TOASTMANAGER.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
  Created by Paul Welby
*/

/**
 * ToastManager.js
 * Enhanced Toast notification system
 * Handles toast creation, styling, and removal
 */

export default class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    /**
     * Initialize the toast manager and create container if needed
     */
    init() {
        this.createContainer();
    }

    /**
     * Create the toast container element
     */
    createContainer() {
        // Check if container already exists
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
    }

    /**
     * Get toast styling based on type
     * @param {string} type - Toast type (cache, api, success, error, info)
     * @returns {object} Styling configuration
     */
    getToastConfig(type) {
        const configs = {
            cache: {
                backgroundColor: '#4caf50',
                textColor: 'white',
                icon: '⚡'
            },
            api: {
                backgroundColor: '#2196f3',
                textColor: 'white',
                icon: '🌐'
            },
            success: {
                backgroundColor: '#4caf50',
                textColor: 'white',
                icon: '✓'
            },
            error: {
                backgroundColor: '#f44336',
                textColor: 'white',
                icon: '❌'
            },
            warning: {
                backgroundColor: '#ff9800',
                textColor: 'white',
                icon: '⚠️'
            },
            info: {
                backgroundColor: '#2196f3',
                textColor: 'white',
                icon: 'ℹ️'
            }
        };

        return configs[type] || configs.info;
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Toast type (cache, api, success, error, info)
     * @param {number} duration - Duration in milliseconds (default: 3000)
     */
    showToast(message, type = 'info', duration = 3000) {
        console.log(`[TOAST][${type}] ${message} (duration: ${duration}ms)`);
        // Ensure container exists
        this.createContainer();

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Get configuration for this toast type
        const config = this.getToastConfig(type);

        // Apply styling
        toast.style.cssText = `
            background: ${config.backgroundColor};
            color: ${config.textColor};
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            max-width: 500px;
            word-wrap: break-word;
            pointer-events: auto;
            transform: translateX(100%);
            transition: all 0.3s ease;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        // Set content
        toast.innerHTML = `<span style="font-size: 16px;">${config.icon}</span><span>${message}</span>`;
        
        // Add click to dismiss
        toast.onclick = () => this.removeToast(toast);

        // Add to container
        this.container.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Auto remove after duration
        const timeoutId = setTimeout(() => this.removeToast(toast), duration);
        toast.timeoutId = timeoutId;

        return toast;
    }

    /**
     * Remove a toast notification
     * @param {HTMLElement} toastElement - Toast element to remove
     */
    removeToast(toastElement) {
        if (toastElement.timeoutId) {
            clearTimeout(toastElement.timeoutId);
        }
        toastElement.style.transform = 'translateX(100%)';
        toastElement.style.opacity = '0';
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
        }, 300);
    }

    /**
     * Clear all toast notifications
     */
    clearAll() {
        if (this.container) {
            while (this.container.firstChild) {
                this.removeToast(this.container.firstChild);
            }
        }
    }

    /**
     * Convenience methods for common toast types
     */
    success(message, duration = 3000) {
        return this.showToast(message, 'success', duration);
    }

    error(message, duration = 4000) {
        return this.showToast(message, 'error', duration);
    }

    info(message, duration = 3000) {
        return this.showToast(message, 'info', duration);
    }

    warning(message, duration = 3500) {
        return this.showToast(message, 'warning', duration);
    }

    cache(message, duration = 4000) {
        return this.showToast(message, 'cache', duration);
    }

    api(message, duration = 3000) {
        return this.showToast(message, 'api', duration);
    }
}

// Create and export a singleton instance
const toastManager = new ToastManager();

// For backwards compatibility, also expose global showToast function
window.showToast = (message, type, duration) => toastManager.showToast(message, type, duration); 