/*
  POSTERSELECTOR.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/15/2025 @10:00AM
  Created by Paul Welby
*/

// PosterSelector.js
// Modular component for selecting and saving TMDB posters for TV or movies

class PosterSelector {
    constructor(mode = 'tv') {
        this.mode = mode;
        this.isInitialized = false;
        this.htmlTemplate = null;
        this.containerElement = null;
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
        this.show();
    }

    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="PosterSelector.css"]');
            if (existingLink) return resolve();
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/PosterSelector/PosterSelector.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    async loadHTML() {
        return new Promise(async (resolve, reject) => {
            try {
                const response = await fetch('./components/PosterSelector/PosterSelector.html');
                if (!response.ok) throw new Error('Failed to fetch PosterSelector.html');
                this.htmlTemplate = await response.text();
                resolve();
            } catch (err) { reject(err); }
        });
    }

    createFromTemplate() {
        const existing = document.getElementById('poster-selector-container');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', this.htmlTemplate);
    }

    setupElements() {
        this.containerElement = document.getElementById('poster-selector-container');
        this.closeBtn = document.getElementById('poster-selector-close');
        this.searchBtn = document.getElementById('poster-selector-search');
        this.queryInput = document.getElementById('poster-selector-query');
        this.tmdbIdInput = document.getElementById('poster-selector-tmdbid');
        this.feedback = document.getElementById('poster-selector-feedback');
        this.grid = document.getElementById('poster-selector-grid');
        this.sourceDropdown = document.getElementById('poster-selector-source');
        this.selectedSource = 'tmdb';
        this.useBtn = document.getElementById('poster-selector-use-btn');
        this.useBtnSpinner = this.useBtn ? this.useBtn.querySelector('.use-btn-spinner') : null;
        this.useBtnLabel = this.useBtn ? this.useBtn.querySelector('.use-btn-label') : null;
        this.useCompleteMsg = document.getElementById('poster-selector-use-complete');
    }

    setupEventListeners() {
        if (this.closeBtn) this.closeBtn.onclick = () => this.destroy();
        if (this.searchBtn) this.searchBtn.onclick = () => this.handleSearch();
        if (this.queryInput) {
            this.queryInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch();
                }
            };
        }
        if (this.tmdbIdInput) {
            this.tmdbIdInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleSearch();
                }
            };
            this.tmdbIdInput.oninput = () => {
                // Optionally, auto-search on TMDB ID change
            };
        }
        if (this.sourceDropdown) {
            this.sourceDropdown.onchange = (e) => {
                this.selectedSource = e.target.value;
                this.feedback.textContent = '';
                this.grid.innerHTML = '';
                this.handleSearch();
            };
        }
    }

    show() {
        if (this.containerElement) this.containerElement.style.display = 'block';
    }

    hide() {
        if (this.containerElement) this.containerElement.style.display = 'none';
    }

    destroy() {
        if (this.containerElement) this.containerElement.remove();
        // Force movie grid refresh with latest poster mapping if available
        if (window.mediaLibraryManager && window.mediaLibraryManager.currentTab === 'movies') {
            setTimeout(() => window.mediaLibraryManager.reloadMoviePostersAndRefreshGrid(), 0);
        }
    }

    async handleSearch() {
        const query = this.queryInput.value.trim();
        const tmdbId = this.tmdbIdInput ? this.tmdbIdInput.value.trim() : '';
        this.feedback.textContent = '';
        this.grid.innerHTML = '';
        this.selectedPoster = null;
        if (this.useBtn) {
            this.useBtn.style.display = 'none';
            if (this.useBtnSpinner) this.useBtnSpinner.style.display = 'none';
            if (this.useBtnLabel) this.useBtnLabel.style.display = 'inline';
        }
        if (this.useCompleteMsg) this.useCompleteMsg.style.display = 'none';
        const spinner = document.getElementById('poster-selector-spinner');
        console.log('[PosterSelector] Search triggered. Query:', query, 'TMDB ID:', tmdbId, 'Source:', this.selectedSource);
        if (!query && !tmdbId) {
            this.feedback.textContent = 'Please enter a search query or TMDB ID.';
            return;
        }
        if (spinner) spinner.style.display = 'flex';
        this.feedback.textContent = 'Searching...';
        let url;
        if (this.selectedSource === 'tmdb') {
            if (tmdbId) {
                url = `/api/tmdb/posters/${this.mode}?tmdbId=${encodeURIComponent(tmdbId)}`;
            } else {
                url = `/api/tmdb/posters/${this.mode}?query=${encodeURIComponent(query)}`;
            }
        } else if (this.selectedSource === 'imdb') {
            if (spinner) spinner.style.display = 'none';
            this.feedback.textContent = 'IMDB search is not implemented yet.';
            return;
        } else if (this.selectedSource === 'other') {
            if (spinner) spinner.style.display = 'none';
            this.feedback.textContent = 'Other source search is not implemented yet.';
            return;
        }
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (spinner) spinner.style.display = 'none';
            if (!data.posters || data.posters.length === 0) {
                this.feedback.textContent = 'No posters found.';
                console.log('[PosterSelector] No posters found for query:', query, 'TMDB ID:', tmdbId);
                return;
            }
            this.feedback.textContent = '';
            this.grid.innerHTML = data.posters.map((poster, idx) => `
                <div class="poster-selector-item" data-idx="${idx}">
                    <img src="${poster.poster_url}" alt="Poster" />
                    <div style="margin-top:6px;font-size:14px;">${poster.name || poster.title} (${poster.year})</div>
                </div>
            `).join('');
            Array.from(this.grid.querySelectorAll('.poster-selector-item')).forEach((itemDiv, i) => {
                itemDiv.onclick = () => {
                    // Remove previous selection
                    this.grid.querySelectorAll('.poster-selector-item.selected').forEach(el => el.classList.remove('selected'));
                    itemDiv.classList.add('selected');
                    this.selectedPoster = data.posters[i];
                    if (this.useBtn) this.useBtn.style.display = 'block';
                    if (this.useBtnSpinner) this.useBtnSpinner.style.display = 'none';
                    if (this.useBtnLabel) this.useBtnLabel.style.display = 'inline';
                    if (this.useCompleteMsg) this.useCompleteMsg.style.display = 'none';
                    console.log('[PosterSelector] Poster selected:', this.selectedPoster);
                };
            });
            if (this.useBtn) {
                this.useBtn.onclick = async () => {
                    if (this.selectedPoster) {
                        if (this.useBtnSpinner) this.useBtnSpinner.style.display = 'inline-block';
                        if (this.useBtnLabel) this.useBtnLabel.style.display = 'none';
                        this.useBtn.disabled = true;
                        await this.handlePosterClick(this.selectedPoster);
                        this.useBtn.disabled = false;
                        this.useBtn.style.display = 'none';
                        if (this.useBtnSpinner) this.useBtnSpinner.style.display = 'none';
                        if (this.useCompleteMsg) this.useCompleteMsg.style.display = 'block';
                    }
                };
            }
        } catch (err) {
            if (spinner) spinner.style.display = 'none';
            this.feedback.textContent = 'Error fetching posters.';
            console.error('[PosterSelector] Error fetching posters:', err);
        }
    }

    async handlePosterClick(poster) {
        this.feedback.textContent = 'Saving selection...';
        try {
            const context = this.getMediaContext && this.getMediaContext();
            const payload = {
                mediaType: this.mode,
                mediaId: context?.mediaId || poster.id || poster.title,
                name: context?.name || poster.name || poster.title,
                season: context?.season,
                episode: context?.episode,
                tmdbPoster: poster,
                isAlternative: false
            };
            const res = await fetch('/api/posters/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                this.feedback.style.color = '#090';
                this.feedback.textContent = 'Poster saved!';
                if (this.onPosterSelected) {
                    console.log('[PosterSelector] onPosterSelected callback fired', {filePath: data.filePath, posterType: data.posterType, poster});
                    this.onPosterSelected({
                        filePath: data.filePath,
                        posterType: data.posterType,
                        poster: poster
                    });
                }
                setTimeout(() => this.destroy(), 1200);
            } else {
                this.feedback.style.color = '#c00';
                this.feedback.textContent = data.error || 'Failed to save poster.';
            }
        } catch (err) {
            this.feedback.style.color = '#c00';
            this.feedback.textContent = 'Error saving poster.';
        }
    }
}

if (typeof window !== 'undefined') {
    window.PosterSelector = PosterSelector;
}