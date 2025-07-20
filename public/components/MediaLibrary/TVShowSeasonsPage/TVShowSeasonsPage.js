/*
  TVSHOWSEASONSPAGE.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
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
                    const seasonImage = season.image || '/assets/img/placeholder-poster.jpg';
                    const episodeCount = season.episodes ? season.episodes.length : 0;
                    return `
                        <div class=\"media-library-card\" onclick=\"mediaLibraryManager.openTVSeason('${season.path.replace(/\\/g, '/')}')\">
                            <div class=\"media-library-card-poster\">
                                <img src=\"${seasonImage}\" alt=\"${season.path.split(/[\\/]/).pop()}\" onerror=\"this.src='/assets/img/placeholder-poster.jpg'\">
                            </div>
                            <div class=\"media-library-card-info\">
                                <h3>${season.path.split(/[\\/]/).pop()}</h3>
                                <p>${episodeCount} Episodes</p>
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