/*
  KEYGENERATOR.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/13/2025 @4:00PM
  Created by Paul Welby
*/

/**
 * KeyGenerator - Unified key conversion logic for consistent media identification
 * This ensures all parts of the system use the same key generation rules
 */

class KeyGenerator {
  constructor() {
    // Cache for generated keys to avoid recalculation
    this.keyCache = new Map();
  }

  /**
   * Generates a normalized key from a media title
   * @param {string} title - The media title (e.g., "Jupiter's Legacy (2021)")
   * @param {string} type - 'tvShow' or 'movie'
   * @returns {string} - Normalized key (e.g., "jupiters.legacy.(2021)")
   */
  generateNormalizedKey(title, type = 'tvShow') {
    if (!title) {
      throw new Error('Title is required for key generation');
    }

    // Check cache first
    const cacheKey = `${title}|${type}`;
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey);
    }

    let normalizedKey = title.toLowerCase().trim();
    
    // Step 1: Remove special characters but preserve parentheses and dots
    normalizedKey = normalizedKey.replace(/[^\w\s().]/g, '');
    
    // Step 2: Convert spaces to dots
    normalizedKey = normalizedKey.replace(/\s+/g, '.');
    
    // Step 3: Clean up multiple consecutive dots
    normalizedKey = normalizedKey.replace(/\.{2,}/g, '.');
    
    // Step 4: Remove leading/trailing dots
    normalizedKey = normalizedKey.replace(/^\.+|\.+$/g, '');
    
    // Step 5: Ensure TV shows have year in parentheses
    if (type === 'tvShow' && !/\(\d{4}\)/.test(normalizedKey)) {
      // Try to extract year from original title
      const yearMatch = title.match(/\((\d{4})\)/);
      if (yearMatch) {
        normalizedKey += `.(${yearMatch[1]})`;
      } else {
        // For TV shows without year in title, we'll add a placeholder
        // The actual year should be provided separately
        console.warn(`TV show "${title}" missing year in parentheses. Consider adding year for consistency.`);
      }
    }

    // Cache the result
    this.keyCache.set(cacheKey, normalizedKey);
    
    return normalizedKey;
  }

  /**
   * Generates a display title from a normalized key
   * @param {string} normalizedKey - The normalized key
   * @returns {string} - Human-readable title
   */
  generateDisplayTitle(normalizedKey) {
    if (!normalizedKey) return '';

    let displayTitle = normalizedKey;
    
    // Convert dots to spaces
    displayTitle = displayTitle.replace(/\./g, ' ');
    
    // Capitalize words
    displayTitle = displayTitle.replace(/\b\w/g, l => l.toUpperCase());
    
    // Handle special cases
    displayTitle = displayTitle.replace(/\bTv\b/g, 'TV');
    displayTitle = displayTitle.replace(/\bAnd\b/g, 'and');
    displayTitle = displayTitle.replace(/\bOf\b/g, 'of');
    displayTitle = displayTitle.replace(/\bThe\b/g, 'the');
    
    return displayTitle;
  }

  /**
   * Validates if a key follows the expected format
   * @param {string} key - The key to validate
   * @param {string} type - 'tvShow' or 'movie'
   * @returns {boolean} - Whether the key is valid
   */
  isValidKey(key, type = 'tvShow') {
    if (!key || typeof key !== 'string') return false;
    
    // Check basic format
    if (!/^[a-z0-9.()]+$/.test(key)) return false;
    
    // Check for year in parentheses (required for TV shows)
    if (type === 'tvShow' && !/\(\d{4}\)/.test(key)) return false;
    
    // Check for proper dot notation
    if (key.includes('  ') || key.startsWith('.') || key.endsWith('.')) return false;
    
    return true;
  }

  /**
   * Finds the best matching key in existing data
   * @param {string} title - The title to find
   * @param {Object} existingData - The existing media data
   * @param {string} type - 'tvShow' or 'movie'
   * @returns {string|null} - The best matching key or null
   */
  findBestMatch(title, existingData, type = 'tvShow') {
    if (!title || !existingData) return null;

    const normalizedKey = this.generateNormalizedKey(title, type);
    
    // Try exact match first
    if (existingData[normalizedKey]) {
      return normalizedKey;
    }

    // Try fuzzy matching
    const existingKeys = Object.keys(existingData);
    const titleWords = title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    
    for (const key of existingKeys) {
      const keyWords = key.replace(/[^\w\s]/g, '').split(/\./);
      
      // Check if most words match
      const matchingWords = titleWords.filter(word => 
        keyWords.some(keyWord => 
          keyWord.includes(word) || word.includes(keyWord)
        )
      );
      
      if (matchingWords.length >= Math.min(titleWords.length, keyWords.length) * 0.7) {
        return key;
      }
    }

    return null;
  }

  /**
   * Generates a unique key if the preferred key already exists
   * @param {string} preferredKey - The preferred key
   * @param {Object} existingData - The existing media data
   * @returns {string} - A unique key
   */
  generateUniqueKey(preferredKey, existingData) {
    if (!existingData[preferredKey]) {
      return preferredKey;
    }

    let counter = 1;
    let uniqueKey = `${preferredKey}.${counter}`;
    
    while (existingData[uniqueKey]) {
      counter++;
      uniqueKey = `${preferredKey}.${counter}`;
    }
    
    return uniqueKey;
  }

  /**
   * Clears the key cache (useful for testing or memory management)
   */
  clearCache() {
    this.keyCache.clear();
  }

  /**
   * Gets cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    return {
      size: this.keyCache.size,
      keys: Array.from(this.keyCache.keys())
    };
  }
}

// Export for use in other modules
module.exports = KeyGenerator;
