/*
  EPISODEMODAL.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

class EpisodeModal {
    constructor() {
        this.overlay = null;
        this.content = null;
        this.isOpen = false;
        this.onEpisodeSelect = null;
        this.onClose = null;
    }

    // Initialize the modal
    init(onEpisodeSelect = null, onClose = null) {
        this.onEpisodeSelect = onEpisodeSelect;
        this.onClose = onClose;
        console.log('[EPISODE-MODAL] Initialized');
    }

    // Open the modal with episode selection
    open(showName) {
        console.log('[EPISODE-MODAL] Opening modal for show:', showName);
        
        if (this.isOpen) {
            this.close();
        }

        this.createModal();
        this.loadEpisodes(showName);
        this.isOpen = true;
    }

    // Close the modal
    close() {
        console.log('[EPISODE-MODAL] Closing modal');
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        // Remove keyboard event listener
        document.removeEventListener('keydown', this.handleKeyDown);
        
        this.isOpen = false;
        
        if (this.onClose) {
            this.onClose();
        }
    }

    // Create the modal DOM elements
    createModal() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'episode-modal-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 100000000000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

        // Create modal content
        this.content = document.createElement('div');
        this.content.className = 'episode-modal-content';
        this.content.style.cssText = `
            background: #1a1a1a;
            border: 2px solid #43a047;
            border-radius: 12px;
            max-width: 600px;
            max-height: 80vh;
            color: white;
            display: flex;
            flex-direction: column;
        `;

        this.overlay.appendChild(this.content);
        document.body.appendChild(this.overlay);

        // Add keyboard handler for Escape key
        this.handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }

    // Load episodes for the show
    async loadEpisodes(showName) {
        console.log('[EPISODE-MODAL] Loading episodes for:', showName);
        console.log('[EPISODE-MODAL] Show name type:', typeof showName);
        console.log('[EPISODE-MODAL] Show name length:', showName ? showName.length : 'null');
        console.log('[EPISODE-MODAL] Show name contains "V":', showName ? showName.includes('V') : 'null');
        console.log('[EPISODE-MODAL] Show name contains "2009":', showName ? showName.includes('2009') : 'null');

        // Set initial content
        this.content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 24px 16px 24px; border-bottom: 1px solid #333; flex-shrink: 0;">
                <div>
                    <h2 style="margin: 0; color: #007bff;">Select Episode</h2>
                    <h3 style="margin: 8px 0 0 0; color: white; font-size: 1.2em;">${showName}</h3>
                    <div id="episode-count" style="margin: 4px 0 0 0; color: #9c27b0; font-size: 0.8em;">Loading episodes...</div>
                </div>
                <button id="close-episode-modal" style="background: #b71c1c; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 16px;">✕</button>
            </div>
            <div id="episode-list" style="display: grid; gap: 8px; padding: 16px 24px 24px 24px; overflow-y: auto; max-height: calc(80vh - 80px);">
                <div style="text-align: center; color: #888;">Loading episodes...</div>
            </div>
        `;

        // Add close button handler
        document.getElementById('close-episode-modal').onclick = () => {
            this.close();
        };

        // Get episodes from MediaLibraryManager
        let episodes = [];
        
        if (window.mediaLibraryManager && window.mediaLibraryManager.tvShowsData) {
            console.log('[EPISODE-MODAL] Using MediaLibraryManager data');
            
            // Handle both array and object formats for TV shows data
            let showsArray = [];
            if (Array.isArray(window.mediaLibraryManager.tvShowsData)) {
                showsArray = window.mediaLibraryManager.tvShowsData;
            } else if (typeof window.mediaLibraryManager.tvShowsData === 'object' && window.mediaLibraryManager.tvShowsData) {
                showsArray = Object.values(window.mediaLibraryManager.tvShowsData);
            }
            
            console.log('[EPISODE-MODAL] TV shows data type:', Array.isArray(window.mediaLibraryManager.tvShowsData) ? 'array' : 'object');
            console.log('[EPISODE-MODAL] Shows array length:', showsArray.length);
            console.log('[EPISODE-MODAL] First 10 shows in data:');
            showsArray.slice(0, 10).forEach((show, index) => {
                const showTitle = show.TMDBTitle || show.name || show.path || 'unknown';
                console.log(`[EPISODE-MODAL] ${index + 1}. "${showTitle}"`);
            });
            
            // Find the TV show in the data
            const tvShow = showsArray.find(show => {
                const showTitle = show.TMDBTitle || show.name || show.path || '';
                console.log('[EPISODE-MODAL] Checking show:', showTitle, 'against:', showName);
                console.log('[EPISODE-MODAL] Show title lowercase:', showTitle.toLowerCase());
                console.log('[EPISODE-MODAL] Show name lowercase:', showName.toLowerCase());
                console.log('[EPISODE-MODAL] Includes check 1:', showTitle.toLowerCase().includes(showName.toLowerCase()));
                console.log('[EPISODE-MODAL] Includes check 2:', showName.toLowerCase().includes(showTitle.toLowerCase()));
                return showTitle.toLowerCase().includes(showName.toLowerCase()) || 
                       showName.toLowerCase().includes(showTitle.toLowerCase());
            });
            
            if (tvShow) {
                console.log('[EPISODE-MODAL] Found TV show:', tvShow.path);
                
                // Check if episodes are in folders structure
                if (tvShow.folders && tvShow.folders.length > 0) {
                    console.log('[EPISODE-MODAL] Seasons found:', tvShow.folders.length);
                    
                    // Collect all episodes from all seasons
                    tvShow.folders.forEach(season => {
                        if (season.files && season.files.length > 0) {
                            console.log('[EPISODE-MODAL] Season', season.name, 'has', season.files.length, 'episodes');
                            episodes.push(...season.files);
                        }
                    });
                }
            } else {
                console.log('[EPISODE-MODAL] TV show not found. Available shows:');
                showsArray.slice(0, 5).forEach(show => {
                    console.log('[EPISODE-MODAL] -', show.TMDBTitle || show.name || show.path || 'unknown');
                });
            }
        }

        console.log('[EPISODE-MODAL] Total episodes found:', episodes.length);

        // Update episode count
        const countElement = this.content.querySelector('#episode-count');
        if (countElement) {
            countElement.textContent = `${episodes.length} episodes`;
        }

        if (episodes.length === 0) {
            const episodeList = document.getElementById('episode-list');
            episodeList.innerHTML = `
                <div style="text-align: center; color: #888; padding: 20px;">
                    No episodes found for "${showName}"
                </div>
            `;
            return;
        }

        // Sort episodes by season and episode number
        const sortedEpisodes = episodes.sort((a, b) => {
            const aInfo = this.extractEpisodeInfo(a.name || a.path);
            const bInfo = this.extractEpisodeInfo(b.name || b.path);
            
            if (aInfo.seasonNumber !== bInfo.seasonNumber) {
                return aInfo.seasonNumber - bInfo.seasonNumber;
            }
            return aInfo.episodeNumber - bInfo.episodeNumber;
        });

        // Get current episode info for highlighting
        const currentEpisodeInfo = this.getCurrentEpisodeInfo();
        console.log('[EPISODE-MODAL] Current episode info for comparison:', currentEpisodeInfo);

        // Group episodes by season
        const episodesBySeason = {};
        sortedEpisodes.forEach((episode, index) => {
            const epInfo = this.extractEpisodeInfo(episode.name || episode.path);
            const seasonKey = epInfo.seasonNumber;
            
            if (!episodesBySeason[seasonKey]) {
                episodesBySeason[seasonKey] = [];
            }
            episodesBySeason[seasonKey].push({ episode, index });
        });

        // Create episode buttons with season headers
        let episodeButtons = '';
        Object.keys(episodesBySeason).sort((a, b) => parseInt(a) - parseInt(b)).forEach(seasonNumber => {
            const seasonEpisodes = episodesBySeason[seasonNumber];
            
            // Add season header
            episodeButtons += `
                <div class="season-header" style="
                    background: #2a2a2a;
                    color: #007bff;
                    font-weight: bold;
                    font-size: 1.1em;
                    padding: 12px 16px;
                    margin: 8px 0 4px 0;
                    border-radius: 6px;
                    border-left: 4px solid #007bff;
                    grid-column: 1 / -1;
                ">
                    Season ${seasonNumber}
                </div>
            `;
            
            // Add episodes for this season
            seasonEpisodes.forEach(({ episode, index }) => {
                const epInfo = this.extractEpisodeInfo(episode.name || episode.path);
                const episodeLabel = `S${epInfo.seasonNumber.toString().padStart(2, '0')}E${epInfo.episodeNumber.toString().padStart(2, '0')}`;
                
                const isCurrentEpisode = currentEpisodeInfo && 
                    currentEpisodeInfo.seasonNumber === epInfo.seasonNumber && 
                    currentEpisodeInfo.episodeNumber === epInfo.episodeNumber;
                
                console.log('[EPISODE-MODAL] Episode', episodeLabel, 'isCurrentEpisode:', isCurrentEpisode);
                
                const statusText = isCurrentEpisode ? ' (Currently Playing)' : '';
                const buttonClass = isCurrentEpisode ? 'episode-button current-episode' : 'episode-button';
                
                episodeButtons += `
                    <button class="${buttonClass}" data-index="${index}" ${isCurrentEpisode ? 'disabled' : ''}>
                        <div class="episode-label">${episodeLabel}${statusText}</div>
                        <div class="episode-name">${episode.name}</div>
                        ${isCurrentEpisode ? '<div class="currently-playing-overlay">Currently Playing</div>' : ''}
                    </button>
                `;
            });
        });

        const episodeList = document.getElementById('episode-list');
        episodeList.innerHTML = episodeButtons;

        // Add click handlers
        document.querySelectorAll('.episode-button').forEach(button => {
            button.onclick = () => {
                if (button.disabled) {
                    return;
                }
                
                const index = parseInt(button.dataset.index);
                const selectedEpisode = sortedEpisodes[index];
                console.log('[EPISODE-MODAL] Selected episode:', selectedEpisode.name);
                
                this.close();
                
                if (this.onEpisodeSelect) {
                    this.onEpisodeSelect(selectedEpisode);
                }
            };
        });
    }

    // Extract episode info from filename
    extractEpisodeInfo(filePath) {
        const fileName = filePath.split('/').pop() || filePath;
        
        // Look for S01E01 pattern
        const seasonEpisodeMatch = fileName.match(/S(\d{1,2})E(\d{1,2})/i);
        if (seasonEpisodeMatch) {
            return {
                seasonNumber: parseInt(seasonEpisodeMatch[1]),
                episodeNumber: parseInt(seasonEpisodeMatch[2]),
                showName: this.extractShowName(fileName)
            };
        }
        
        // Look for Season 01 Episode 01 pattern
        const seasonMatch = fileName.match(/Season\s*(\d{1,2})/i);
        const episodeMatch = fileName.match(/Episode\s*(\d{1,2})/i);
        if (seasonMatch && episodeMatch) {
            return {
                seasonNumber: parseInt(seasonMatch[1]),
                episodeNumber: parseInt(episodeMatch[1]),
                showName: this.extractShowName(fileName)
            };
        }
        
        return {
            seasonNumber: 1,
            episodeNumber: 1,
            showName: this.extractShowName(fileName)
        };
    }

    // Extract show name from filename
    extractShowName(fileName) {
        // Remove file extension
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        
        // Remove episode patterns
        let showName = nameWithoutExt
            .replace(/S\d{1,2}E\d{1,2}/gi, '')
            .replace(/Season\s*\d+/gi, '')
            .replace(/Episode\s*\d+/gi, '')
            .replace(/^\s*[-_]\s*/, '')
            .replace(/\s*[-_]\s*$/, '')
            .trim();
        
        return showName || 'Unknown Show';
    }

    // Get current episode info
    getCurrentEpisodeInfo() {
        // Get current episode info from VideoPlayer
        if (window.videoPlayer && window.videoPlayer.currentFile) {
            const currentFile = window.videoPlayer.currentFile;
            const filePath = currentFile.absPath || currentFile.name;
            
            if (filePath) {
                // Extract episode info from current file
                const episodeInfo = this.extractEpisodeInfo(filePath);
                console.log('[EPISODE-MODAL] Current episode info:', episodeInfo);
                return episodeInfo;
            }
        }
        
        // Fallback: try to get from currentMediaItem
        if (window.videoPlayer && window.videoPlayer.currentMediaItem) {
            const currentMediaItem = window.videoPlayer.currentMediaItem;
            const filePath = currentMediaItem.path || currentMediaItem.absPath;
            
            if (filePath) {
                const episodeInfo = this.extractEpisodeInfo(filePath);
                console.log('[EPISODE-MODAL] Current episode info (from currentMediaItem):', episodeInfo);
                return episodeInfo;
            }
        }
        
        console.log('[EPISODE-MODAL] No current episode info found');
        return null;
    }
}

// Export for use
window.EpisodeModal = EpisodeModal;

// Add a global flag to indicate the script has loaded
window.EPISODE_MODAL_LOADED = true;
console.log('[EPISODE-MODAL] Script loaded and EpisodeModal class available'); 