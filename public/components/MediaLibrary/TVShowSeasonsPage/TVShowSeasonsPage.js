/*
  TVSHOWSEASONSPAGE.JS
  Version: 2.0
  AppName: MultiChat_Chatty [v2.0]
  Updated: 12/31/2025 @10:00AM
  Created by Paul Welby
*/

// TVShowSeasonsPage.js
// Standalone component for TV Show Seasons page (EMBY-style)

export default function TVShowSeasonsPage({ showName, showData, seasons, description, cast, poster }) {
    // --- HTML for arrows and grid ---
    const html = `
        <div class="media-library-breadcrumbs">
            <span class="breadcrumb-link" onclick="mediaLibraryManager.backToTVShows()">TV Shows</span>
            <span class="breadcrumb-separator"> > </span>
            <span>${showName}</span>
        </div>
        <div class="media-library-show-details-flex">
            <div class="media-library-show-poster">
                <img src="${poster}" alt="${showName}" onerror="this.src='/assets/img/placeholder-poster.jpg'">
            </div>
            <div class="media-library-show-meta">
                <h2>${showName}</h2>
                <p class="media-library-show-description">${description}</p>
                <p>${seasons.length} ${seasons.length === 1 ? 'Season' : 'Seasons'}</p>
            </div>
        </div>
        <div class="media-library-cast-section">
            <h3>Cast & Crew</h3>
            <div class="media-library-cast-grid">
                ${cast.map(actor => `<div class=\"media-library-cast-card\"><div class=\"media-library-cast-avatar\"></div><div class=\"media-library-cast-name\">${actor}</div></div>`).join('')}
            </div>
        </div>
        <div class="media-library-seasons-wrapper" style="position:relative;">
            <button class="media-library-seasons-arrow left" type="button" aria-label="Scroll left">&#8592;</button>
            <div class="media-library-seasons-grid">
                ${seasons.map(season => {
                    const seasonImage = season.poster || season.image || '/assets/img/placeholder-poster.jpg';
                    const episodeCount = season.episodes ? Object.keys(season.episodes).length : 0;
                    console.log(`[DEBUG - SEASON] Season: ${season.path.split(/[\\/]/).pop()}, Image: ${seasonImage}`);
                    return `
                        <div class=\"media-library-card season\" onclick=\"mediaLibraryManager.openTVSeason('${season.path.replace(/\\/g, '/')}')\">
                            <div class=\"media-library-card-poster\">
                                <img src=\"${seasonImage}\" alt=\"${season.path.split(/[\\/]/).pop()}\" onerror=\"this.src='/assets/img/placeholder-poster.jpg'; console.error('[DEBUG - SEASON IMAGE ERROR] Failed to load:', this.src);\" onload=\"console.log('[DEBUG - SEASON IMAGE SUCCESS] Loaded:', this.src);\">
                            </div>
                            <div class=\"media-library-card-info\">
                                <h3>${season.path.split(/[\\/]/).pop()}</h3>
                                <p>${episodeCount} ${episodeCount === 1 ? 'Episode' : 'Episodes'}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <button class="media-library-seasons-arrow right" type="button" aria-label="Scroll right">&#8594;</button>
        </div>
    `;
    // Attach arrow scroll handlers after render
    setTimeout(() => {
        document.querySelectorAll('.media-library-seasons-arrow.left').forEach(btn => {
            btn.onclick = function() {
                const grid = btn.parentElement.querySelector('.media-library-seasons-grid');
                if (grid) grid.scrollBy({ left: -300, behavior: 'smooth' });
            };
        });
        document.querySelectorAll('.media-library-seasons-arrow.right').forEach(btn => {
            btn.onclick = function() {
                const grid = btn.parentElement.querySelector('.media-library-seasons-grid');
                if (grid) grid.scrollBy({ left: 300, behavior: 'smooth' });
            };
        });
    }, 0);
    return html;
}

// Helper method to get appropriate label for different content types
function getContentTypeLabel(seasonName, episodes) {
    if (!episodes || episodes.length === 0) return 'Episodes';
    
    // Check if this is special content based on season name
    const isSpecialContent = seasonName.toLowerCase().includes('specials') ||
                            seasonName.toLowerCase().includes('featurettes') ||
                            seasonName.toLowerCase().includes('extras');
    
    if (isSpecialContent) {
        // Determine specific content type
        if (seasonName.toLowerCase().includes('specials')) {
            return 'Specials';
        } else if (seasonName.toLowerCase().includes('featurettes') ||
                   seasonName.toLowerCase().includes('featurette')) {
            return 'Featurettes';
        } else if (seasonName.toLowerCase().includes('extras')) {
            return 'Extras';
        } else {
            return 'Episodes';
        }
    }
    
    return 'Episodes';
} 