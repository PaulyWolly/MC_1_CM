/**
 * MediaValidator - Ensures all media data conforms to expected structure
 * This prevents integration issues by validating data before adding to the library
 */

class MediaValidator {
  constructor() {
    this.requiredFields = {
      tvShow: [
        'normalizedKey',
        'title', 
        'TMDBTitle',
        'year',
        'tmdbId',
        'isMovie',
        'mediaType',
        'path',
        'absPath',
        'poster',
        'description',
        'about',
        'cast',
        'seasons'
      ],
      movie: [
        'normalizedKey',
        'title',
        'TMDBTitle', 
        'year',
        'tmdbId',
        'isMovie',
        'mediaType',
        'path',
        'absPath',
        'poster',
        'description',
        'about',
        'cast'
      ]
    };

    this.requiredAboutFields = [
      'description',
      'genres',
      'status',
      'first_air_date',
      'last_air_date',
      'number_of_seasons',
      'number_of_episodes',
      'vote_average',
      'vote_count'
    ];
  }

  /**
   * Validates a complete media item
   * @param {Object} mediaItem - The media item to validate
   * @param {string} type - 'tvShow' or 'movie'
   * @returns {Object} - { isValid: boolean, errors: string[], warnings: string[] }
   */
  validateMediaItem(mediaItem, type = 'tvShow') {
    const errors = [];
    const warnings = [];

    // Check if it's a valid type
    if (!['tvShow', 'movie'].includes(type)) {
      errors.push(`Invalid media type: ${type}. Must be 'tvShow' or 'movie'`);
      return { isValid: false, errors, warnings };
    }

    // Check required fields
    const requiredFields = this.requiredFields[type];
    for (const field of requiredFields) {
      if (mediaItem[field] === undefined || mediaItem[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate about object
    if (mediaItem.about) {
      const aboutErrors = this.validateAboutObject(mediaItem.about);
      errors.push(...aboutErrors);
    } else {
      errors.push('Missing required about object');
    }

    // Validate cast array
    if (mediaItem.cast && Array.isArray(mediaItem.cast)) {
      const castErrors = this.validateCastArray(mediaItem.cast);
      errors.push(...castErrors);
    } else {
      errors.push('Missing or invalid cast array');
    }

    // Validate seasons (for TV shows)
    if (type === 'tvShow' && mediaItem.seasons) {
      const seasonErrors = this.validateSeasonsObject(mediaItem.seasons);
      errors.push(...seasonErrors);
    } else if (type === 'tvShow') {
      errors.push('Missing required seasons object for TV show');
    }

    // Validate normalized key format
    if (mediaItem.normalizedKey) {
      const keyErrors = this.validateNormalizedKey(mediaItem.normalizedKey, type);
      errors.push(...keyErrors);
    }

    // Check for common issues
    if (mediaItem.year && (mediaItem.year < 1900 || mediaItem.year > new Date().getFullYear() + 5)) {
      warnings.push(`Year ${mediaItem.year} seems unusual`);
    }

    if (mediaItem.tmdbId && (!Number.isInteger(mediaItem.tmdbId) || mediaItem.tmdbId <= 0)) {
      errors.push('Invalid TMDB ID format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates the about object structure
   * @param {Object} about - The about object to validate
   * @returns {string[]} - Array of error messages
   */
  validateAboutObject(about) {
    const errors = [];

    for (const field of this.requiredAboutFields) {
      if (!about[field]) {
        errors.push(`Missing about.${field}`);
      }
    }

    // Validate genres array
    if (about.genres && !Array.isArray(about.genres)) {
      errors.push('about.genres must be an array');
    }

    // Validate vote_average
    if (about.vote_average && (about.vote_average < 0 || about.vote_average > 10)) {
      errors.push('about.vote_average must be between 0 and 10');
    }

    return errors;
  }

  /**
   * Validates the cast array structure
   * @param {Array} cast - The cast array to validate
   * @returns {string[]} - Array of error messages
   */
  validateCastArray(cast) {
    const errors = [];

    if (!Array.isArray(cast)) {
      errors.push('Cast must be an array');
      return errors;
    }

    for (let i = 0; i < cast.length; i++) {
      const member = cast[i];
      if (!member.name) {
        errors.push(`Cast member ${i} missing name`);
      }
      if (!member.character) {
        errors.push(`Cast member ${i} missing character`);
      }
      if (!member.profile_path) {
        errors.push(`Cast member ${i} missing profile_path`);
      }
    }

    return errors;
  }

  /**
   * Validates the seasons object structure
   * @param {Object} seasons - The seasons object to validate
   * @returns {string[]} - Array of error messages
   */
  validateSeasonsObject(seasons) {
    const errors = [];

    if (typeof seasons !== 'object' || Array.isArray(seasons)) {
      errors.push('Seasons must be an object with season numbers as keys');
      return errors;
    }

    for (const [seasonNum, seasonData] of Object.entries(seasons)) {
      // Validate season number format
      if (!/^\d{2}$/.test(seasonNum)) {
        errors.push(`Invalid season number format: ${seasonNum}. Must be 2 digits (e.g., "01", "02")`);
      }

      // Validate season data structure
      if (!seasonData.episodes) {
        errors.push(`Season ${seasonNum} missing episodes object`);
      } else if (typeof seasonData.episodes !== 'object' || Array.isArray(seasonData.episodes)) {
        errors.push(`Season ${seasonNum} episodes must be an object with episode numbers as keys`);
      } else {
        // Validate episodes
        for (const [episodeNum, episodeData] of Object.entries(seasonData.episodes)) {
          if (!/^\d{2}$/.test(episodeNum)) {
            errors.push(`Invalid episode number format: ${episodeNum} in season ${seasonNum}. Must be 2 digits`);
          }
          if (!episodeData.title || !episodeData.absPath) {
            errors.push(`Episode ${episodeNum} in season ${seasonNum} missing required fields`);
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validates the normalized key format
   * @param {string} key - The normalized key to validate
   * @param {string} type - 'tvShow' or 'movie'
   * @returns {string[]} - Array of error messages
   */
  validateNormalizedKey(key, type) {
    const errors = [];

    // Check basic format
    if (!/^[a-z0-9.()]+$/.test(key)) {
      errors.push('Normalized key contains invalid characters. Only lowercase letters, numbers, dots, and parentheses allowed');
    }

    // Check for year in parentheses (required for TV shows)
    if (type === 'tvShow' && !/\(\d{4}\)/.test(key)) {
      errors.push('TV show normalized key must include year in parentheses (e.g., "show.name.(2021)")');
    }

    // Check for proper dot notation
    if (key.includes('  ') || key.startsWith('.') || key.endsWith('.')) {
      errors.push('Normalized key has invalid dot notation');
    }

    return errors;
  }

  /**
   * Validates that a media item can be safely added to the library
   * @param {Object} mediaItem - The media item to validate
   * @param {Object} existingData - The current library data
   * @returns {Object} - { canAdd: boolean, conflicts: string[], errors: string[] }
   */
  validateForAddition(mediaItem, existingData) {
    const conflicts = [];
    const errors = [];

    // Check for duplicate normalized key
    if (existingData[mediaItem.normalizedKey]) {
      conflicts.push(`Normalized key "${mediaItem.normalizedKey}" already exists`);
    }

    // Check for duplicate TMDB ID
    const existingTmdbIds = Object.values(existingData)
      .map(item => item.tmdbId)
      .filter(id => id === mediaItem.tmdbId);
    
    if (existingTmdbIds.length > 0) {
      conflicts.push(`TMDB ID ${mediaItem.tmdbId} already exists`);
    }

    // Check for similar titles (potential duplicates)
    const similarTitles = Object.values(existingData)
      .filter(item => 
        item.title.toLowerCase().includes(mediaItem.title.toLowerCase()) ||
        mediaItem.title.toLowerCase().includes(item.title.toLowerCase())
      )
      .map(item => item.title);

    if (similarTitles.length > 0) {
      conflicts.push(`Similar titles found: ${similarTitles.join(', ')}`);
    }

    return {
      canAdd: conflicts.length === 0 && errors.length === 0,
      conflicts,
      errors
    };
  }
}

// Export for use in other modules
module.exports = MediaValidator;
