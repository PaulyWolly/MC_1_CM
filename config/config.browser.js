// Universal config loader - BROWSER-SPECIFIC VERSION
class Config {
    constructor() {
        this.config = null;
        this.environment = 'development'; // Browser always runs in dev context for this app
        this.loaded = false;
    }

    async load() {
        try {
            const response = await fetch('/config/config.json');
            if (!response.ok) {
                throw new Error('Failed to load config.json');
            }
            const data = await response.json();
            this.config = data[this.environment];
            this.loaded = true;
            console.log('Browser config loaded successfully:', this.config);
            return this.config;
        } catch (error) {
            console.error('Fatal: Could not load browser config.', error);
            // In a real app, you might show a "cannot load" message to the user here.
        }
    }

    getApiUrl(endpoint) {
        if (!this.loaded) {
            console.warn('getApiUrl called before config was loaded.');
            return null;
        }
        
        const baseUrl = this.config?.api?.baseUrl;
        if (!baseUrl) return null;

        if (this.config?.api?.endpoints?.[endpoint]) {
            return `${baseUrl}${this.config.api.endpoints[endpoint]}`;
        }
        if (endpoint.startsWith('/api/')) {
            return `${baseUrl}${endpoint}`;
        }
        return null;
    }

    getAudioConfig() {
        if (!this.loaded) {
            console.warn('getAudioConfig called before config was loaded.');
            return null;
        }
        return this.config?.audio || null;
    }
}

export default new Config(); 