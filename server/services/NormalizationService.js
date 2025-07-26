/*
  NORMALIZATIONSERVICE.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

const path = require('path');

/**
 * Normalization service for movie names and file paths
 * Ensures consistent, clean names for mapping and display
 */
class NormalizationService {
    
    /**
     * Normalizes a movie name by removing technical tags and formatting consistently
     * @param {string} movieName - The original movie name (can be filename or folder name)
     * @returns {string} - Clean, normalized movie name
     */
    static normalizeMovieName(movieName) {
        if (!movieName) return '';
        
        let normalized = movieName;
        
        // Remove file extension
        normalized = path.parse(normalized).name;
        
        // Remove common technical tags but keep quality indicators and years
        const technicalTags = [
            // Source tags
            /\[BluRay\]/gi, /\[WEBRip\]/gi, /\[HDRip\]/gi, /\[BRRip\]/gi, /\[DVDRip\]/gi,
            // Audio tags
            /\[5\.1\]/gi, /\[7\.1\]/gi, /\[AAC\]/gi, /\[AC3\]/gi, /\[DTS\]/gi,
            // Release group tags
            /\[YTS\.MX\]/gi, /\[YTS\.LT\]/gi, /\[YTS\.AG\]/gi, /\[RARBG\]/gi, /\[YIFY\]/gi,
            // Other common tags
            /\[UNRATED\]/gi, /\[REPACK\]/gi, /\[EXTENDED\]/gi, /\[REMASTERED\]/gi,
            /\[DIRFIX\]/gi, /\[PROPER\]/gi, /\[INTERNAL\]/gi,
            // Year patterns that might be duplicated
            /\(\d{4}\)\s*\(\d{4}\)/gi,
        ];
        
        // Apply all technical tag removals
        technicalTags.forEach(tag => {
            normalized = normalized.replace(tag, '');
        });
        
        // Clean up multiple spaces and trim
        normalized = normalized.replace(/\s+/g, ' ').trim();
        
        // Remove trailing dots, dashes, and underscores
        normalized = normalized.replace(/[._-]+$/, '');
        
        // Remove leading dots, dashes, and underscores
        normalized = normalized.replace(/^[._-]+/, '');
        
        // Clean up any remaining technical artifacts
        normalized = normalized.replace(/\.(x264|x265|h264|h265)/gi, '');
        normalized = normalized.replace(/-(YTS|RARBG|YIFY)/gi, '');
        
        // Final cleanup of multiple spaces
        normalized = normalized.replace(/\s+/g, ' ').trim();

        // Remove any trailing incomplete or complete bracketed release group tags (e.g., [YTS, [YTS., [YTS.MX, [RARBG, etc.)
        normalized = normalized.replace(/\[(YTS(\.[A-Z]+)?|RARBG|YIFY|YTS)?[^\]]*$/i, '');
        normalized = normalized.replace(/\s+$/, '');
        
        return normalized;
    }
    
    /**
     * Normalizes a full file path to create a consistent mapping key
     * @param {string} filePath - Full path to the movie file
     * @returns {string} - Normalized path for mapping
     */
    static normalizeFilePath(filePath) {
        if (!filePath) return '';
        
        // Normalize path separators
        let normalized = filePath.replace(/\\/g, '/');
        
        // Extract just the filename and normalize it
        const fileName = path.basename(filePath);
        const normalizedFileName = this.normalizeMovieName(fileName);
        
        // Replace the filename in the path with the normalized version
        const dirPath = path.dirname(filePath).replace(/\\/g, '/');
        normalized = `${dirPath}/${normalizedFileName}.mp4`;
        
        return normalized;
    }
    
    /**
     * Creates a clean display name for UI purposes
     * @param {string} movieName - The original movie name
     * @returns {string} - Clean display name
     */
    static createDisplayName(movieName) {
        if (!movieName) return '';
        
        let displayName = this.normalizeMovieName(movieName);
        
        // Ensure proper capitalization
        displayName = displayName.replace(/\b\w/g, l => l.toUpperCase());
        
        // Handle special cases like "The", "A", "An" at the beginning
        const articles = ['The ', 'A ', 'An '];
        articles.forEach(article => {
            if (displayName.startsWith(article)) {
                displayName = displayName.substring(article.length) + ', ' + article.trim();
            }
        });
        
        return displayName;
    }
    
    /**
     * Generates a folder name for storing posters
     * @param {string} movieName - The original movie name
     * @returns {string} - Clean folder name with proper formatting
     */
    static createFolderName(movieName) {
        if (!movieName) return '';
        
        let folderName = this.normalizeMovieName(movieName);
        
        // Preserve parentheses around years and brackets around quality
        // Replace spaces with dots for folder naming, but keep special formatting
        folderName = folderName.replace(/\s+/g, '.');
        
        // Remove any remaining special characters that might cause issues
        // But preserve parentheses () and brackets []
        folderName = folderName.replace(/[<>:"/\\|?*]/g, '');
        
        return folderName;
    }
    
    /**
     * Extracts year from movie name if present
     * @param {string} movieName - The movie name
     * @returns {string|null} - Year if found, null otherwise
     */
    static extractYear(movieName) {
        if (!movieName) return null;
        
        const yearMatch = movieName.match(/\((\d{4})\)/);
        return yearMatch ? yearMatch[1] : null;
    }
    
    /**
     * Creates a mapping key for poster storage
     * @param {string} filePath - Full path to the movie file
     * @returns {string} - Normalized mapping key
     */
    static createMappingKey(filePath) {
        return this.normalizeFilePath(filePath);
    }
}

module.exports = NormalizationService; 