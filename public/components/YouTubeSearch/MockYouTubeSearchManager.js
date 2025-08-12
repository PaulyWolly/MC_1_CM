/*
  MOCKYOUTUBESEARCHMANAGER.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

// public/components/YouTubeSearch/YouTubeSearchManager.js

export default class YouTubeSearchManager {
    constructor() {
        // Initialization of state will happen in an init method
        // to ensure DOM is ready.
        this.youtubePagination = {
            hasSearched: false,
            currentPage: 1,
            originalQuery: null,
            searchType: 'search',
            isActive: false
        };
        // Make pagination state globally accessible for now, as in the reference app
        window.youtubePagination = this.youtubePagination;
    }

    // This method will be called from app.js to handle any YouTube query.
    async handleYoutubeRequest(subject, isPagination = false, options = {}) {
        if (!this.youtubePagination.hasSearched) {
            this.youtubePagination.hasSearched = true;
        }

        let type = 'search';
        let cleanSubject = subject.replace(/^youtube\s+(search|play|channel)\s+/i, '').trim();

        if (/^youtube\s+channel/i.test(subject)) {
            type = 'channel';
        }
        
        let currentPage = this.youtubePagination.currentPage || 1;

        if (!isPagination) {
            console.log('NEW-SEARCH: Resetting pagination state for new query:', subject);
            this.youtubePagination.currentPage = 1;
            this.youtubePagination.originalQuery = subject;
            this.youtubePagination.searchType = type;
            this.cleanupBrokenYouTubeElements();
        } else {
            type = this.youtubePagination.searchType || 'search';
        }

        const cacheKey = `yt_${subject}_${type}_${this.youtubePagination.currentPage}`;
        const cachedData = this.getCacheWithAgeCheck(cacheKey, 24);

        if (cachedData) {
            console.log('CACHE HIT:', cacheKey);
            if (window.showToast) window.showToast(`⚡ Loaded from cache`, 'cache');
            this.renderRealYoutubeResults(cachedData.videos || [], cachedData.page, cachedData.totalPages, subject, type, true);
            return;
        }

        console.log('CACHE MISS - Calling API:', cacheKey);
        if (window.showToast) window.showToast('🌐 Making YouTube API call...', 'api');

        try {
            const response = await fetch('/api/youtube/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: cleanSubject, type, page: this.youtubePagination.currentPage })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();

            if (data.success) {
                this.setCacheWithTimestamp(cacheKey, data);
                this.renderRealYoutubeResults(data.videos || [], data.page, data.totalPages, subject, type, isPagination);
            } else {
                throw new Error(data.error || 'API request failed');
            }

        } catch (error) {
            console.error('Error with YouTube request:', error);
            if (window.showToast) window.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    renderRealYoutubeResults(videos, page, totalPages, subject, type = 'search', isPagination = false) {
        this.cleanupBrokenYouTubeElements(); // Clear old results

        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'youtube-multi-bubble';
        
        let headerTitle = `📺 YouTube Results: "${subject.replace(/^youtube\s+(search|play)\s+/i, '')}"`;
        resultsContainer.innerHTML = `
            <div class="youtube-header-section">
                <h3>${headerTitle}</h3>
                <span class="youtube-page-info">Page ${page || 1} of ${totalPages || 'many'}</span>
            </div>
            <ul class="video-list">
                ${videos.map(video => this.createVideoItemHTML(video)).join('')}
            </ul>
        `;

        const messageElement = document.createElement('div');
        messageElement.className = 'message assistant';
        messageElement.appendChild(resultsContainer);

        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(messageElement);
        this.scrollToYouTubeResults();
    }
    
    createVideoItemHTML(video) {
        return `
            <li class="video-item">
                <img class="youtube-thumb-img" src="${video.thumbnail}" alt="${video.title}" loading="lazy" />
                <div class="video-title">${video.title}</div>
                <div class="video-channel">${video.channelTitle || ''}</div>
                <div class="video-controls">
                     <a href="#" onclick="window.youtubeSearchManager.showVideo('${video.id}'); return false;">Play Here</a> |
                     <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">Watch on YouTube</a>
                </div>
            </li>
        `;
    }

    cleanupBrokenYouTubeElements() {
        document.querySelectorAll('.youtube-multi-bubble, .youtube-container').forEach(el => el.remove());
    }

    scrollToYouTubeResults() {
        const lastMessage = document.querySelector('#chat-messages .message:last-child');
        if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }

    // Caching helpers
    setCacheWithTimestamp(key, data) {
        const item = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    getCacheWithAgeCheck(key, maxAgeHours = 24) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        
        const item = JSON.parse(itemStr);
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;

        if (now - item.timestamp > maxAge) {
            localStorage.removeItem(key);
            return null;
        }
        return item.data;
    }

    // Video player helpers
    createVideoContainer() {
        if (document.getElementById('youtube-container')) return;
        const container = document.createElement('div');
        container.id = 'youtube-container';
        container.className = 'youtube-container hidden';
        container.innerHTML = `
            <button class="youtube-close-btn" onclick="window.youtubeSearchManager.hideVideo();">&times;</button>
            <div id="youtube-video" class="youtube-video"></div>
        `;
        document.body.appendChild(container);
    }

    showVideo(videoId) {
        this.createVideoContainer();
        const container = document.getElementById('youtube-container');
        const videoWrapper = document.getElementById('youtube-video');
        videoWrapper.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        container.classList.remove('hidden');
    }

    hideVideo() {
        const container = document.getElementById('youtube-container');
        if (container) {
            const videoWrapper = document.getElementById('youtube-video');
            videoWrapper.innerHTML = '';
            container.classList.add('hidden');
        }
    }
}