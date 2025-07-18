/*
  COMPONENTTEMPLATE.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

/**
 * ComponentTemplate
 * 
 * Template for creating modular Angular-like components with separate .js, .css, and .html files.
 * Use this as a starting point for new components.
 * 
 * Features:
 * - Dynamic CSS loading
 * - HTML template loading
 * - Event handling
 * - Lifecycle management
 * 
 * @version 1.0.0
 * @author MultiChat_Chatty
 */

class ComponentTemplate {
    constructor() {
        // Component state
        this.isInitialized = false;
        this.htmlTemplate = null;
        
        // DOM element references
        this.containerElement = null;
        
        // Bind methods to preserve 'this' context
        this.init = this.init.bind(this);
        this.handleEvent = this.handleEvent.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
    }

    /**
     * Initialize the component
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🔧 [ComponentTemplate] Initializing component...');
            
            // Load component assets (CSS and HTML template)
            await Promise.all([
                this.loadCSS(),
                this.loadHTML()
            ]);
            
            // Create component from HTML template
            this.createFromTemplate();
            
            // Setup DOM element references
            this.setupElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Component-specific initialization
            this.initializeComponent();
            
            this.isInitialized = true;
            console.log('🔧 [ComponentTemplate] Component initialized successfully');
            
        } catch (error) {
            console.error('🔧 [ComponentTemplate] Initialization error:', error);
        }
    }

    /**
     * Load component CSS dynamically
     */
    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="ComponentTemplate.css"]');
            if (existingLink) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/ComponentTemplate/ComponentTemplate.css';
            
            link.onload = () => {
                console.log('🔧 [ComponentTemplate] CSS loaded successfully');
                resolve();
            };
            
            link.onerror = () => {
                console.error('🔧 [ComponentTemplate] Failed to load CSS');
                reject(new Error('Failed to load ComponentTemplate CSS'));
            };
            
            document.head.appendChild(link);
        });
    }

    /**
     * Load component HTML template dynamically
     */
    async loadHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('./components/ComponentTemplate/ComponentTemplate.html');
                if (!response.ok) {
                    throw new Error(`Failed to fetch HTML template: ${response.status}`);
                }
                
                const htmlContent = await response.text();
                this.htmlTemplate = htmlContent;
                console.log('🔧 [ComponentTemplate] HTML template loaded successfully');
                resolve();
            } catch (error) {
                console.error('🔧 [ComponentTemplate] Failed to load HTML template:', error);
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
        const existingComponent = document.getElementById('component-template-container');
        if (existingComponent) {
            existingComponent.remove();
        }

        // Add component to body from template
        document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
        console.log('🔧 [ComponentTemplate] Component created from HTML template');
    }

    /**
     * Setup DOM element references
     */
    setupElements() {
        this.containerElement = document.getElementById('component-template-container');
        // Add more element references as needed
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Example event listener setup
        if (this.containerElement) {
            this.containerElement.addEventListener('click', this.handleEvent);
        }
    }

    /**
     * Component-specific initialization
     * Override this method in your component
     */
    initializeComponent() {
        // Component-specific setup code goes here
        console.log('🔧 [ComponentTemplate] Component-specific initialization complete');
    }

    /**
     * Handle component events
     * @param {Event} event - The event object
     */
    handleEvent(event) {
        console.log('🔧 [ComponentTemplate] Event handled:', event.type);
        // Handle component events here
    }

    /**
     * Show the component
     */
    show() {
        if (this.containerElement) {
            this.containerElement.style.display = 'block';
        }
    }

    /**
     * Hide the component
     */
    hide() {
        if (this.containerElement) {
            this.containerElement.style.display = 'none';
        }
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        try {
            // Remove event listeners
            if (this.containerElement) {
                this.containerElement.removeEventListener('click', this.handleEvent);
            }

            // Remove DOM element
            if (this.containerElement) {
                this.containerElement.remove();
            }

            // Reset state
            this.isInitialized = false;
            this.htmlTemplate = null;
            this.containerElement = null;

            console.log('🔧 [ComponentTemplate] Component destroyed successfully');
        } catch (error) {
            console.error('🔧 [ComponentTemplate] Error during component destruction:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentTemplate;
}

// Global instance
window.ComponentTemplate = ComponentTemplate; 