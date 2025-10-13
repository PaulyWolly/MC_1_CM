/**
 * validateJSONData.js
 * Utility to validate JSON data before writing to prevent NaN corruption
 */

/**
 * Recursively check for NaN values in an object
 * @param {any} obj - Object to check
 * @param {string} path - Current path for error reporting
 * @returns {Array<string>} Array of paths containing NaN
 */
function findNaNValues(obj, path = 'root') {
  const nanPaths = [];

  if (obj === null || obj === undefined) {
    return nanPaths;
  }

  // Check if this value is NaN
  if (typeof obj === 'number' && isNaN(obj)) {
    nanPaths.push(path);
    return nanPaths;
  }

  // Check arrays
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const itemPaths = findNaNValues(item, `${path}[${index}]`);
      nanPaths.push(...itemPaths);
    });
    return nanPaths;
  }

  // Check objects
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const valuePaths = findNaNValues(value, `${path}.${key}`);
      nanPaths.push(...valuePaths);
    }
  }

  return nanPaths;
}

/**
 * Validate data object for common issues
 * @param {any} data - Data to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result { isValid: boolean, errors: Array<string> }
 */
function validateData(data, options = {}) {
  const errors = [];
  const warnings = [];

  // Check for NaN values
  const nanPaths = findNaNValues(data);
  if (nanPaths.length > 0) {
    errors.push(`Found ${nanPaths.length} NaN value(s) at: ${nanPaths.join(', ')}`);
  }

  // Check for undefined values (might be intentional, so warning only)
  function findUndefined(obj, path = 'root') {
    const undefinedPaths = [];
    
    if (obj === undefined) {
      return [path];
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        undefinedPaths.push(...findUndefined(item, `${path}[${index}]`));
      });
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        undefinedPaths.push(...findUndefined(value, `${path}.${key}`));
      }
    }

    return undefinedPaths;
  }

  const undefinedPaths = findUndefined(data);
  if (undefinedPaths.length > 0) {
    warnings.push(`Found ${undefinedPaths.length} undefined value(s) at: ${undefinedPaths.slice(0, 5).join(', ')}${undefinedPaths.length > 5 ? '...' : ''}`);
  }

  // Validate TV shows data structure
  if (options.validateTVShows && typeof data === 'object') {
    Object.entries(data).forEach(([showKey, show]) => {
      if (show && show.seasons) {
        Object.entries(show.seasons).forEach(([seasonKey, season]) => {
          // Check if numeric season has valid data
          if (!isNaN(parseInt(seasonKey)) && season) {
            if (!season.episodes) {
              warnings.push(`${showKey}.seasons.${seasonKey} has no episodes`);
            } else if (typeof season.episodes === 'object') {
              // Check episodes
              Object.entries(season.episodes).forEach(([epKey, episode]) => {
                if (episode) {
                  // Validate critical numeric fields
                  if (typeof episode.season === 'number' && isNaN(episode.season)) {
                    errors.push(`${showKey}.seasons.${seasonKey}.episodes.${epKey}.season is NaN`);
                  }
                  if (typeof episode.episode === 'number' && isNaN(episode.episode)) {
                    errors.push(`${showKey}.seasons.${seasonKey}.episodes.${epKey}.episode is NaN`);
                  }
                }
              });
            }
          }
        });
      }

      // Check files array if present
      if (show && Array.isArray(show.files)) {
        show.files.forEach((file, index) => {
          if (file) {
            if (typeof file.season === 'number' && isNaN(file.season)) {
              errors.push(`${showKey}.files[${index}].season is NaN`);
            }
            if (typeof file.episode === 'number' && isNaN(file.episode)) {
              errors.push(`${showKey}.files[${index}].episode is NaN`);
            }
          }
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasNaN: nanPaths.length > 0
  };
}

/**
 * Test if JSON.stringify will produce valid JSON
 * @param {any} data - Data to test
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function canStringify(data) {
  try {
    const jsonStr = JSON.stringify(data);
    
    // Check if the stringified JSON contains the literal string "NaN"
    if (jsonStr.includes(':NaN') || jsonStr.includes(':NaN,') || jsonStr.includes(':NaN}')) {
      return {
        isValid: false,
        error: 'JSON contains NaN values which will produce invalid JSON'
      };
    }

    // Try to parse it back
    JSON.parse(jsonStr);
    
    return { isValid: true, error: null };
  } catch (err) {
    return {
      isValid: false,
      error: `Cannot stringify: ${err.message}`
    };
  }
}

module.exports = {
  findNaNValues,
  validateData,
  canStringify
};

