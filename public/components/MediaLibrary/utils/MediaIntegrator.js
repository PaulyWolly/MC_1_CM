/*
  MEDIAINTEGRATOR.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

/**
 * MediaIntegrator - Handles safe addition of new media items to the library
 * This ensures new items are properly integrated without breaking existing functionality
 */

class MediaIntegrator {
  constructor() {
    const MediaValidator = require('./MediaValidator.js');
    const KeyGenerator = require('./KeyGenerator.js');
    this.validator = new MediaValidator();
    this.keyGenerator = new KeyGenerator();
  }

  /**
   * Safely adds a new media item to the library
   * @param {Object} mediaItem - The media item to add
   * @param {Object} existingData - The current library data
   * @param {string} type - 'tvShow' or 'movie'
   * @returns {Object} - { success: boolean, data: Object, errors: string[], warnings: string[] }
   */
  async addMediaItem(mediaItem, existingData, type = 'tvShow') {
    const result = {
      success: false,
      data: null,
      errors: [],
      warnings: [],
      normalizedKey: null
    };

    try {
      // Step 1: Generate normalized key
      const normalizedKey = this.keyGenerator.generateNormalizedKey(mediaItem.title, type);
      result.normalizedKey = normalizedKey;

      // Step 2: Add the normalized key to the media item for validation
      const mediaItemWithKey = {
        ...mediaItem,
        normalizedKey: normalizedKey,
        isMovie: type === 'movie'
      };

      // Step 3: Validate the media item structure
      const validation = this.validator.validateMediaItem(mediaItemWithKey, type);
      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        return result;
      }
      result.warnings.push(...validation.warnings);

      // Step 4: Check for conflicts
      const conflictCheck = this.validator.validateForAddition(mediaItemWithKey, existingData);
      if (!conflictCheck.canAdd) {
        result.errors.push(...conflictCheck.errors);
        result.errors.push(...conflictCheck.conflicts);
        return result;
      }

      // Step 5: Prepare the data for integration
      const integratedData = this.prepareDataForIntegration(mediaItemWithKey, normalizedKey, type);
      
      // Step 6: Add to existing data
      const updatedData = {
        ...existingData,
        [normalizedKey]: integratedData
      };

      result.data = updatedData;
      result.success = true;

      console.log(`✅ Successfully integrated ${type}: ${mediaItem.title} with key: ${normalizedKey}`);

    } catch (error) {
      result.errors.push(`Integration failed: ${error.message}`);
      console.error('Media integration error:', error);
    }

    return result;
  }

  /**
   * Prepares media data for integration by ensuring proper structure
   * @param {Object} mediaItem - The raw media item
   * @param {string} normalizedKey - The normalized key
   * @param {string} type - 'tvShow' or 'movie'
   * @returns {Object} - The prepared data
   */
  prepareDataForIntegration(mediaItem, normalizedKey, type) {
    const preparedData = {
      normalizedKey: normalizedKey,
      title: mediaItem.title,
      TMDBTitle: mediaItem.TMDBTitle || mediaItem.title,
      year: mediaItem.year,
      tmdbId: mediaItem.tmdbId,
      isMovie: type === 'movie',
      mediaType: type === 'movie' ? 'movie' : 'tv-show',
      path: mediaItem.path,
      absPath: mediaItem.absPath || mediaItem.path,
      poster: mediaItem.poster,
      backdrop: mediaItem.backdrop,
      description: mediaItem.description,
      about: this.prepareAboutObject(mediaItem.about),
      cast: this.prepareCastArray(mediaItem.cast),
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };

    // Add seasons for TV shows
    if (type === 'tvShow' && mediaItem.seasons) {
      preparedData.seasons = this.prepareSeasonsObject(mediaItem.seasons);
    } else if (type === 'tvShow') {
      // Ensure TV shows always have a seasons object
      preparedData.seasons = {};
    }

    return preparedData;
  }

  /**
   * Prepares the about object for integration
   * @param {Object} about - The raw about object
   * @returns {Object} - The prepared about object
   */
  prepareAboutObject(about) {
    return {
      description: about.description || '',
      genres: Array.isArray(about.genres) ? about.genres : [],
      status: about.status || 'Unknown',
      first_air_date: about.first_air_date || '',
      last_air_date: about.last_air_date || '',
      number_of_seasons: about.number_of_seasons || 0,
      number_of_episodes: about.number_of_episodes || 0,
      vote_average: about.vote_average || 0,
      vote_count: about.vote_count || 0
    };
  }

  /**
   * Prepares the cast array for integration
   * @param {Array} cast - The raw cast array
   * @returns {Array} - The prepared cast array
   */
  prepareCastArray(cast) {
    if (!Array.isArray(cast)) return [];

    return cast.map(member => ({
      name: member.name || 'Unknown',
      character: member.character || 'Unknown',
      profile_path: member.profile_path || member.profile || ''
    }));
  }

  /**
   * Prepares the seasons object for integration
   * @param {Object} seasons - The raw seasons object
   * @returns {Object} - The prepared seasons object
   */
  prepareSeasonsObject(seasons) {
    if (!seasons || typeof seasons !== 'object') return {};

    const preparedSeasons = {};

    for (const [seasonNum, seasonData] of Object.entries(seasons)) {
      // Ensure season number is 2 digits
      const paddedSeasonNum = seasonNum.padStart(2, '0');
      
      preparedSeasons[paddedSeasonNum] = {
        poster: seasonData.poster || null,
        episodes: this.prepareEpisodesObject(seasonData.episodes || {})
      };
    }

    return preparedSeasons;
  }

  /**
   * Prepares the episodes object for integration
   * @param {Object} episodes - The raw episodes object
   * @returns {Object} - The prepared episodes object
   */
  prepareEpisodesObject(episodes) {
    if (!episodes || typeof episodes !== 'object') return {};

    const preparedEpisodes = {};

    for (const [episodeNum, episodeData] of Object.entries(episodes)) {
      // Ensure episode number is 2 digits
      const paddedEpisodeNum = episodeNum.padStart(2, '0');
      
      preparedEpisodes[paddedEpisodeNum] = {
        title: episodeData.title || 'Unknown Episode',
        absPath: episodeData.absPath || episodeData.path || '',
        duration: episodeData.duration || null,
        season: episodeData.season || 1,
        episode: episodeData.episode || parseInt(episodeNum, 10),
        type: episodeData.type || 'episode',
        isSpecials: episodeData.isSpecials || false,
        videoFormat: episodeData.videoFormat || '.mkv',
        supportsVideo: episodeData.supportsVideo !== false,
        still: episodeData.still || episodeData.thumbnail || '',
        thumbnail: episodeData.thumbnail || episodeData.still || ''
      };
    }

    return preparedEpisodes;
  }

  /**
   * Validates and fixes common data issues
   * @param {Object} mediaItem - The media item to fix
   * @param {string} type - 'tvShow' or 'movie'
   * @returns {Object} - The fixed media item
   */
  fixCommonIssues(mediaItem, type = 'tvShow') {
    const fixed = { ...mediaItem };

    // Fix missing TMDBTitle
    if (!fixed.TMDBTitle && fixed.title) {
      fixed.TMDBTitle = fixed.title;
    }

    // Fix missing absPath
    if (!fixed.absPath && fixed.path) {
      fixed.absPath = fixed.path;
    }

    // Fix missing mediaType
    if (!fixed.mediaType) {
      fixed.mediaType = type === 'movie' ? 'movie' : 'tv-show';
    }

    // Fix missing isMovie
    if (fixed.isMovie === undefined || fixed.isMovie === null) {
      fixed.isMovie = type === 'movie';
    }

    // Fix about object
    if (!fixed.about) {
      fixed.about = {
        description: fixed.description || '',
        genres: [],
        status: 'Unknown',
        first_air_date: '',
        last_air_date: '',
        number_of_seasons: 0,
        number_of_episodes: 0,
        vote_average: 0,
        vote_count: 0
      };
    }

    // Fix cast array
    if (!Array.isArray(fixed.cast)) {
      fixed.cast = [];
    }

    // Fix seasons for TV shows
    if (type === 'tvShow' && !fixed.seasons) {
      fixed.seasons = {};
    }

    return fixed;
  }

  /**
   * Gets integration statistics
   * @returns {Object} - Integration statistics
   */
  getStats() {
    return {
      validator: this.validator ? 'Available' : 'Not available',
      keyGenerator: this.keyGenerator ? 'Available' : 'Not available',
      keyCacheSize: this.keyGenerator ? this.keyGenerator.getCacheStats().size : 0
    };
  }
}

// Export for use in other modules
module.exports = MediaIntegrator;
