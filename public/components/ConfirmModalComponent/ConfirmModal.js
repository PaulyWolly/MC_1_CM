/*
  CONFIRMMODAL.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
  Created by Paul Welby
*/

// ConfirmModalComponent.js - Enhanced modular confirmation modal component
class ConfirmModalComponent {
    constructor() {
        this.isInitialized = false;
        this.htmlTemplate = null;
        this.containerElement = null;
        this.confirmCallback = null;
        this.cancelCallback = null;
    }

    async init() {
        if (this.isInitialized) return;
        await Promise.all([
            this.loadCSS(),
            this.loadHTML()
        ]);
        this.createFromTemplate();
        this.setupElements();
        this.setupEventListeners();
        this.isInitialized = true;
    }

    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="ConfirmModal.css"]');
            if (existingLink) return resolve();
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/ConfirmModalComponent/ConfirmModal.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async loadHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('./components/ConfirmModalComponent/ConfirmModal.html');
                if (!response.ok) throw new Error('Failed to fetch HTML template');
                this.htmlTemplate = await response.text();
                resolve();
            } catch (e) { reject(e); }
        });
    }

    createFromTemplate() {
        const existing = document.getElementById('confirm-modal-container');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
    }

    setupElements() {
        this.containerElement = document.getElementById('confirm-modal-container');
        this.messageElement = document.getElementById('confirm-modal-message');
        this.confirmBtn = document.getElementById('confirm-modal-confirm-btn');
        this.cancelBtn = document.getElementById('confirm-modal-cancel-btn');
    }

    setupEventListeners() {
        if (this.confirmBtn) this.confirmBtn.addEventListener('click', () => {
            this.hide();
            if (typeof this.confirmCallback === 'function') this.confirmCallback();
        });
        if (this.cancelBtn) this.cancelBtn.addEventListener('click', () => {
            this.hide();
            if (typeof this.cancelCallback === 'function') this.cancelCallback();
        });
        if (this.containerElement) this.containerElement.addEventListener('click', (e) => {
            if (e.target === this.containerElement) this.hide();
        });
    }

    setMessage(msg) {
        if (this.messageElement) {
            // Support both plain text and HTML with line breaks
            if (msg.includes('\n')) {
                this.messageElement.innerHTML = msg.replace(/\n/g, '<br>');
            } else {
                this.messageElement.textContent = msg;
            }
        }
    }

    setTitle(title) {
        const titleElement = document.getElementById('confirm-modal-title');
        if (titleElement) titleElement.textContent = title;
    }

    setConfirmText(text) {
        if (this.confirmBtn) this.confirmBtn.textContent = text;
    }

    setCancelText(text) {
        if (this.cancelBtn) this.cancelBtn.textContent = text;
    }

    static async open({ message, onConfirm, onCancel }) {
        console.log('[DEBUG - ConfirmModalComponent] static open() called with:', { message, onConfirm, onCancel });
        if (!this._instance) {
            this._instance = new ConfirmModalComponent();
            console.log('[DEBUG - ConfirmModalComponent] Created new ConfirmModalComponent instance');
        }
        await this._instance.init();
        this._instance._show(message, onConfirm, onCancel);
    }

    // New improved API that returns a Promise directly
    static async confirm(options = {}) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure?',
            confirmText = 'Confirm',
            cancelText = 'Cancel'
        } = options;

        if (!this._instance) {
            this._instance = new ConfirmModalComponent();
        }
        await this._instance.init();

        // Set modal content
        this._instance.setTitle(title);
        this._instance.setMessage(message);
        this._instance.setConfirmText(confirmText);
        this._instance.setCancelText(cancelText);

        // Show modal and return promise
        return new Promise((resolve) => {
            this._instance.confirmCallback = () => resolve(true);
            this._instance.cancelCallback = () => resolve(false);
            this._instance.show();
        });
    }

    // Convenience methods for common use cases
    static async confirmDelete(itemName, additionalInfo = '') {
        return this.confirm({
            title: 'Confirm Delete',
            message: `Delete "${itemName}"?${additionalInfo ? '\n\n' + additionalInfo : ''}`,
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });
    }

    static async confirmRemove(itemName, fromWhat) {
        return this.confirm({
            title: 'Confirm Remove',
            message: `Remove "${itemName}" from "${fromWhat}"?`,
            confirmText: 'Remove',
            cancelText: 'Cancel'
        });
    }

    static async confirmAction(action, itemName, additionalInfo = '') {
        return this.confirm({
            title: 'Confirm Action',
            message: `${action} "${itemName}"?${additionalInfo ? '\n\n' + additionalInfo : ''}`,
            confirmText: action,
            cancelText: 'Cancel'
        });
    }

    _show(message, onConfirm, onCancel) {
        console.log('[DEBUG - ConfirmModalComponent] _show() called with:', { message, onConfirm, onCancel });
        this.setMessage(message);
        this.confirmCallback = onConfirm;
        this.cancelCallback = onCancel;
        this.show();
        console.log('[DEBUG - ConfirmModalComponent] show() called, modal should be visible');
    }

    show() {
        if (this.containerElement) this.containerElement.style.display = 'flex';
    }

    hide() {
        if (this.containerElement) this.containerElement.style.display = 'none';
    }
}

// Make it globally available with both names for backward compatibility
window.ConfirmModalComponent = ConfirmModalComponent;
window.ConfirmModal = ConfirmModalComponent; // Backward compatibility
export default ConfirmModalComponent; 