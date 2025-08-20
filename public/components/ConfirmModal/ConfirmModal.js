/*
  CONFIRMMODAL.JS
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
  Created by Paul Welby
*/

// ConfirmModal.js - Modular confirmation modal component
class ConfirmModal {
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
            link.href = './components/ConfirmModal/ConfirmModal.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async loadHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('./components/ConfirmModal/ConfirmModal.html');
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
        if (this.messageElement) this.messageElement.textContent = msg;
    }

    static async open({ message, onConfirm, onCancel }) {
        console.log('[DEBUG - ConfirmModal] static open() called with:', { message, onConfirm, onCancel });
        if (!this._instance) {
            this._instance = new ConfirmModal();
            console.log('[DEBUG - ConfirmModal] Created new ConfirmModal instance');
        }
        await this._instance.init();
        this._instance._show(message, onConfirm, onCancel);
    }

    _show(message, onConfirm, onCancel) {
        console.log('[DEBUG - ConfirmModal] _show() called with:', { message, onConfirm, onCancel });
        this.setMessage(message);
        this.confirmCallback = onConfirm;
        this.cancelCallback = onCancel;
        this.show();
        console.log('[DEBUG - ConfirmModal] show() called, modal should be visible');
    }

    show() {
        if (this.containerElement) this.containerElement.style.display = 'flex';
    }

    hide() {
        if (this.containerElement) this.containerElement.style.display = 'none';
    }
}

window.ConfirmModal = ConfirmModal;
export default ConfirmModal; 