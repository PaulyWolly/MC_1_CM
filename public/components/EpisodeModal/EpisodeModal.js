/*
  EPISODEMODAL.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
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
        console.log('[EPISODE-MODAL] ==========================================');
        console.log('[EPISODE-MODAL] 🔍 LOADING EPISODES - DEBUG START');
        console.log('[EPISODE-MODAL] ==========================================');
        console.log('[EPISODE-MODAL] Show name received:', showName);
        console.log('[EPISODE-MODAL] Show name type:', typeof showName);
        console.log('[EPISODE-MODAL] Show name length:', showName ? showName.length : 'null');
        console.log('[EPISODE-MODAL] Show name trimmed:', showName ? showName.trim() : 'null');
        
        // Check MediaLibraryManager availability
        console.log('[EPISODE-MODAL] MediaLibraryManager available:', !!window.mediaLibraryManager);
        if (window.mediaLibraryManager) {
            console.log('[EPISODE-MODAL] MediaLibraryManager properties:', Object.keys(window.mediaLibraryManager));
            console.log('[EPISODE-MODAL] unifiedData available:', !!window.mediaLibraryManager.unifiedData);
            if (window.mediaLibraryManager.unifiedData) {
                console.log('[EPISODE-MODAL] Unified data keys count:', Object.keys(window.mediaLibraryManager.unifiedData).length);
                console.log('[EPISODE-MODAL] First 10 unified data keys:', Object.keys(window.mediaLibraryManager.unifiedData).slice(0, 10));
            }
        }
        console.log('[EPISODE-MODAL] ==========================================');

        // Humanize the show name for display (remove dot notation)
        const humanizedShowName = this.humanizeShowName(showName);
        
        // Set initial content
        this.content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 24px 24px 16px 24px; border-bottom: 1px solid #333; flex-shrink: 0;">
                <div>
                    <h2 style="margin: 0; color: #007bff;">Select Episode</h2>
                    <h3 style="margin: 8px 0 0 0; color: white; font-size: 1.2em;">${humanizedShowName}</h3>
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

        // Get episodes from unified data
        let episodes = [];
        
        if (window.mediaLibraryManager && window.mediaLibraryManager.unifiedData) {
            console.log('[EPISODE-MODAL] 🔍 Using unified data directly');
            console.log('[EPISODE-MODAL] Available shows in unified data:', Object.keys(window.mediaLibraryManager.unifiedData));
            
            // SIMPLE: Normalize show name to lowercase dot notation format
            const normalizedShowName = this.normalizeShowName(showName);
            console.log('[EPISODE-MODAL] Normalized show name:', normalizedShowName);
            
            // Look for the normalized key in unified data
            let actualKey = null;
            const availableKeys = Object.keys(window.mediaLibraryManager.unifiedData);
            
            // Try exact match with normalized name
            if (window.mediaLibraryManager.unifiedData[normalizedShowName]) {
                actualKey = normalizedShowName;
                console.log('[EPISODE-MODAL] ✅ SUCCESS: Exact match found:', actualKey);
            } else {
                console.log('[EPISODE-MODAL] ❌ No exact match for normalized name:', normalizedShowName);
                
                // Fallback: search for partial match in case normalization missed something
                actualKey = availableKeys.find(key => key.includes(normalizedShowName.replace(/\./g, '')));
                if (actualKey) {
                    console.log('[EPISODE-MODAL] ✅ SUCCESS: Partial match found:', actualKey);
                }
            }
            
            if (actualKey && window.mediaLibraryManager.unifiedData[actualKey]) {
                const showData = window.mediaLibraryManager.unifiedData[actualKey];
                console.log('[EPISODE-MODAL] ✅ SUCCESS: Found show data for:', actualKey);
                console.log('[EPISODE-MODAL] Show has seasons:', Object.keys(showData.seasons || {}));
                
                // Collect all episodes from all seasons
                if (showData.seasons) {
                    Object.entries(showData.seasons).forEach(([seasonNum, seasonData]) => {
                        if (seasonData.episodes) {
                            console.log('[EPISODE-MODAL] Season', seasonNum, 'has', Object.keys(seasonData.episodes).length, 'episodes');
                            
                            // Check if this is a special content section (not a regular numbered season)
                            const isSpecialContent = isNaN(parseInt(seasonNum)) || seasonNum === 'Specials' || seasonNum === 'Featurettes';
                            
                            // Convert unified episode data to the expected format
                            Object.entries(seasonData.episodes).forEach(([episodeNum, episode]) => {
                                // Construct proper path for video playback
                                let absPath = "";
                                if (episode.absPath) {
                                    // Use the absolute path from unified data (preferred)
                                    absPath = episode.absPath;
                                } else if (episode.path) {
                                    // Fallback to relative path
                                    absPath = episode.path;
                                }
                                
                                episodes.push({
                                    name: episode.title || `Episode ${episodeNum}`,
                                    filename: episode.title || `Episode ${episodeNum}`,
                                    path: episode.path || "",
                                    relPath: episode.path || "",
                                    filePath: absPath,
                                    absPath: absPath,
                                    still: episode.still || "",
                                    thumbnail: episode.still || "",
                                    generated: false,
                                    timestamp: "",
                                    episodeNumber: parseInt(episodeNum) || 1, // FIXED: Convert to integer for proper sorting
                                    seasonNumber: parseInt(seasonNum) || 1,   // FIXED: Convert to integer for proper sorting
                                    isSpecialContent: isSpecialContent,
                                    contentType: episode.contentType || seasonNum
                                });
                            });
                        }
                    });
                }
            } else {
                console.log('[EPISODE-MODAL] ❌ FAILURE: No matching show found in unified data');
            }
        } else {
            console.log('[EPISODE-MODAL] MediaLibraryManager or unifiedData not available');
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

        // Sort episodes by season and episode number using the already-extracted data
        const sortedEpisodes = episodes.sort((a, b) => {
            // Handle special content sections (Featurettes, Specials, etc.)
            if (a.isSpecialContent && !b.isSpecialContent) return -1; // Special content first
            if (!a.isSpecialContent && b.isSpecialContent) return 1;
            
            // For special content, sort by content type and episode number
            if (a.isSpecialContent && b.isSpecialContent) {
                if (a.contentType !== b.contentType) {
                    return a.contentType.localeCompare(b.contentType);
                }
                return parseInt(a.episodeNumber) - parseInt(b.episodeNumber);
            }
            
            // For regular seasons, sort by season and episode number
            const aSeason = parseInt(a.seasonNumber) || 1;
            const bSeason = parseInt(b.seasonNumber) || 1;
            const aEpisode = parseInt(a.episodeNumber) || 1;
            const bEpisode = parseInt(b.episodeNumber) || 1;
            
            if (aSeason !== bSeason) {
                return aSeason - bSeason;
            }
            return aEpisode - bEpisode;
        });

        // Get current episode info for highlighting
        const currentEpisodeInfo = this.getCurrentEpisodeInfo();
        console.log('[EPISODE-MODAL] Current episode info for comparison:', currentEpisodeInfo);

        // Group episodes by season using the already-extracted data
        const episodesBySeason = {};
        sortedEpisodes.forEach((episode, index) => {
            // For special content, use the content type as the season key
            let seasonKey;
            if (episode.isSpecialContent) {
                seasonKey = episode.contentType || episode.seasonNumber;
            } else {
                // Use the already-extracted seasonNumber property for regular seasons
                seasonKey = parseInt(episode.seasonNumber) || 1;
            }
            
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
            const isSpecialContent = episodesBySeason[seasonNumber].some(({ episode }) => episode.isSpecialContent);
            
            // Determine header text and styling based on season type
            let headerText, headerColor, borderColor;
            
            if (seasonNumber === 'Specials') {
                headerText = 'Specials';
                headerColor = '#9c27b0'; // Purple
                borderColor = '#9c27b0';
            } else if (seasonNumber === 'Featurettes') {
                headerText = 'Featurettes';
                headerColor = '#ff9800'; // Orange
                borderColor = '#ff9800';
            } else if (isSpecialContent) {
                headerText = seasonNumber;
                headerColor = '#4caf50'; // Green for other special content
                borderColor = '#4caf50';
            } else {
                headerText = `Season ${seasonNumber}`;
                headerColor = '#007bff'; // Blue for regular seasons
                borderColor = '#007bff';
            }
            
            episodeButtons += `
                <div class="season-header" style="
                    background: #2a2a2a;
                    color: ${headerColor};
                    font-weight: bold;
                    font-size: 1.1em;
                    padding: 12px 16px;
                    margin: 8px 0 4px 0;
                    border-radius: 6px;
                    border-left: 4px solid ${borderColor};
                    grid-column: 1 / -1;
                ">
                    ${headerText}
                </div>
            `;
            
            // Add episodes for this season
            seasonEpisodes.forEach(({ episode, index }) => {
                // Create appropriate episode label based on content type
                let episodeLabel;
                let seasonNum, episodeNum; // Declare variables outside conditional blocks
                
                if (episode.isSpecialContent) {
                    if (episode.contentType && episode.contentType !== seasonNumber) {
                        // For Featurettes with content types like "Deleted Scenes", "Inside Look"
                        episodeLabel = `${episode.contentType} - ${episode.episodeNumber}`;
                        seasonNum = 0; // Special content season
                        episodeNum = parseInt(episode.episodeNumber) || 1;
                    } else {
                        // For other special content
                        episodeLabel = `Episode ${episode.episodeNumber}`;
                        seasonNum = 0; // Special content season
                        episodeNum = parseInt(episode.episodeNumber) || 1;
                    }
                } else {
                    // Regular episodes: S01E01 format
                    seasonNum = parseInt(episode.seasonNumber) || 1;
                    episodeNum = parseInt(episode.episodeNumber) || 1;
                    episodeLabel = `S${seasonNum.toString().padStart(2, '0')}E${episodeNum.toString().padStart(2, '0')}`;
                }
                
                const isCurrentEpisode = currentEpisodeInfo && 
                    currentEpisodeInfo.seasonNumber === seasonNum && 
                    currentEpisodeInfo.episodeNumber === episodeNum;
                
                console.log('[EPISODE-MODAL] Episode', episodeLabel, 'isCurrentEpisode:', isCurrentEpisode);
                
                const statusText = isCurrentEpisode ? ' (Currently Playing)' : '';
                const buttonClass = isCurrentEpisode ? 'episode-button current-episode' : 'episode-button';
                
                // Extract episode title for currently playing episode
                let playingText = '';
                if (isCurrentEpisode) {
                    const episodeTitle = this.extractEpisodeTitle(episode.name);
                    playingText = `Playing: S${seasonNum.toString().padStart(2, '0')} E${episodeNum.toString().padStart(2, '0')} ${episodeTitle}`;
                }
                
                episodeButtons += `
                    <button class="${buttonClass}" data-index="${index}" ${isCurrentEpisode ? 'disabled' : ''}>
                        <div class="episode-label">${episodeLabel}${statusText}</div>
                        <div class="episode-name">${episode.name}</div>
                        ${isCurrentEpisode ? `<div class="currently-playing-overlay">${playingText}</div>` : ''}
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

    // Extract episode title from filename
    extractEpisodeTitle(fileName) {
        // Remove file extension
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        
        // Remove show name and year (e.g., "Blue Planet 2 (2017)")
        let episodeTitle = nameWithoutExt
            .replace(/^.*?\([0-9]{4}\)\s*-\s*/, '') // Remove "Show Name (Year) - "
            .replace(/^.*?S\d{1,2}E\d{1,2}\s*-\s*/, '') // Remove "Show Name S01E01 - "
            .replace(/^.*?Season\s*\d+\s*Episode\s*\d+\s*-\s*/, '') // Remove "Show Name Season 01 Episode 01 - "
            .trim();
        
        // If no title found, try to extract from S01E01 format
        if (!episodeTitle || episodeTitle === nameWithoutExt) {
            const episodeMatch = nameWithoutExt.match(/S\d{1,2}E\d{1,2}\s*[-_]\s*(.+)/i);
            if (episodeMatch) {
                episodeTitle = episodeMatch[1].trim();
            }
        }
        
        return episodeTitle || 'Unknown Episode';
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

    // Humanize show name for display (convert dot notation back to readable format)
    humanizeShowName(showName) {
        if (!showName) return '';
        
        // If it's already humanized (has spaces), return as is
        if (showName.includes(' ')) {
            return showName;
        }
        
        // Convert dot notation back to readable format
        let humanized = showName
            .replace(/\./g, ' ')  // Replace dots with spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
        
        // Capitalize first letter of each word
        humanized = humanized.replace(/\b\w/g, l => l.toUpperCase());
        
        // Handle special cases like "TV" and "USA"
        humanized = humanized.replace(/\bTv\b/g, 'TV');
        humanized = humanized.replace(/\bUsa\b/g, 'USA');
        
        console.log(`[EPISODE-MODAL] Humanized "${showName}" -> "${humanized}"`);
        return humanized;
    }

    // Normalize show name to lowercase dot notation format
    normalizeShowName(showName) {
        if (!showName) return '';
        
        // Convert to lowercase
        let normalized = showName.toLowerCase();
        
        // Remove year in parentheses if present
        normalized = normalized.replace(/\s*\(\d{4}\)$/, '');
        
        // Handle apostrophes properly - remove them before other processing
        normalized = normalized.replace(/'/g, '');
        
        // Replace spaces and special characters with dots
        normalized = normalized.replace(/[^a-z0-9]+/g, '.');
        
        // Remove leading/trailing dots
        normalized = normalized.replace(/^\.+|\.+$/g, '');
        
        // Add year back if it was in the original name (FIXED: match actual JSON format)
        const yearMatch = showName.match(/\((\d{4})\)/);
        if (yearMatch) {
            normalized += `.(${yearMatch[1]})`; // Added dot back to match JSON format
        }
        
        console.log(`[EPISODE-MODAL] Normalized "${showName}" -> "${normalized}"`);
        return normalized;
    }
}

// Export for use
window.EpisodeModal = EpisodeModal;

// Add a global flag to indicate the script has loaded
window.EPISODE_MODAL_LOADED = true;
console.log('[EPISODE-MODAL] Script loaded and EpisodeModal class available'); 