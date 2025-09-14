/*
  MOVIENAMESERVICE.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const path = require('path');

/**
 * Movie name service for cleaning movie filenames and paths
 * Removes technical tags, quality indicators, and release group information
 * while preserving essential movie information like title and year
 */
class MovieNameService {
    
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
        
        // Use the same normalization logic as normalizeMovieName
        return this.normalizeMovieName(movieName);
    }
    
    /**
     * Creates a clean folder name for directory creation
     * @param {string} name - The original name
     * @returns {string} - Clean folder name
     */
    static createFolderName(name) {
        if (!name) return '';
        
        let cleanName = name;
        
        // Remove file extensions
        cleanName = path.parse(cleanName).name;
        
        // Remove common technical tags
        const technicalTags = [
            /\[BluRay\]/gi, /\[WEBRip\]/gi, /\[HDRip\]/gi, /\[BRRip\]/gi, /\[DVDRip\]/gi,
            /\[5\.1\]/gi, /\[7\.1\]/gi, /\[AAC\]/gi, /\[AC3\]/gi, /\[DTS\]/gi,
            /\[YTS\.MX\]/gi, /\[YTS\.LT\]/gi, /\[YTS\.AG\]/gi, /\[RARBG\]/gi, /\[YIFY\]/gi,
            /\[UNRATED\]/gi, /\[REPACK\]/gi, /\[EXTENDED\]/gi, /\[REMASTERED\]/gi,
            /\[DIRFIX\]/gi, /\[PROPER\]/gi, /\[INTERNAL\]/gi,
            /\(\d{4}\)\s*\(\d{4}\)/gi,
        ];
        
        technicalTags.forEach(tag => {
            cleanName = cleanName.replace(tag, '');
        });
        
        // Clean up spaces and trim
        cleanName = cleanName.replace(/\s+/g, ' ').trim();
        
        // Remove trailing/leading special characters
        cleanName = cleanName.replace(/[._-]+$/, '');
        cleanName = cleanName.replace(/^[._-]+/, '');
        
        // Remove technical artifacts
        cleanName = cleanName.replace(/\.(x264|x265|h264|h265)/gi, '');
        cleanName = cleanName.replace(/-(YTS|RARBG|YIFY)/gi, '');
        
        // Final cleanup
        cleanName = cleanName.replace(/\s+/g, ' ').trim();
        cleanName = cleanName.replace(/\[(YTS(\.[A-Z]+)?|RARBG|YIFY|YTS)?[^\]]*$/i, '');
        cleanName = cleanName.replace(/\s+$/, '');
        
        return cleanName;
    }
}

module.exports = MovieNameService;
