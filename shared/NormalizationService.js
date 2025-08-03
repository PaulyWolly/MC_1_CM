/*
  NORMALIZATION SERVICE
  Version: 2.0
  AppName: MultiChat_Chatty [v10]
  Updated: 1/6/2025 @12:35PM
  Created by Paul Welby
  
  PURPOSE: Standardized normalization for consistent internal processing
  RULES:
  - UI Display: Use TMDB format exactly (e.g., "Lois & Clark The New Adventures Of Superman")
  - Internal Keys: Use lowercase with "and" and "of" (e.g., "lois.and.clark.the.new.adventures.of.superman.(1993)")
*/

function normalizeKey(name) {
  return name
    .replace(/\\/g, '/')
    // Convert "&" to "and" for internal consistency
    .replace(/\s*&\s*/g, '.and.')
    // Convert "And" to "and" for internal consistency  
    .replace(/\s+And\s+/gi, '.and.')
    // Convert "Of" to "of" for internal consistency
    .replace(/\s+Of\s+/gi, '.of.')
    // Convert "The" to "the" for internal consistency
    .replace(/\s+The\s+/gi, '.the.')
    // Convert all other spaces to dots
    .replace(/\s+/g, '.')
    // Remove special characters except dots, parentheses, and brackets
    .replace(/[^a-zA-Z0-9.\[\]()]/g, '')
    // Clean up multiple dots
    .replace(/\.+/g, '.')
    // Remove leading/trailing dots
    .replace(/^\.|\.$/g, '')
    // Convert to lowercase for consistency
    .toLowerCase();
}

/*
  DISPLAY NAME SERVICE
  PURPOSE: Keep original TMDB display names for UI
  USAGE: Use TMDB name directly in UI, normalizeKey() for internal processing
*/

function getDisplayName(tmdbName) {
  // Return TMDB name exactly as provided for UI display
  return tmdbName;
}

function getInternalKey(displayName, year) {
  // Check if displayName already contains a year in parentheses
  const yearPattern = /\s*\(\d{4}\)\s*$/;
  if (yearPattern.test(displayName)) {
    // Display name already has year, use it as is
    return normalizeKey(displayName);
  } else {
    // Display name doesn't have year, add it
    const fullName = `${displayName} (${year})`;
    return normalizeKey(fullName);
  }
}

// Browser compatibility
if (typeof window !== 'undefined') {
  window.normalizeKey = normalizeKey;
  window.getDisplayName = getDisplayName;
  window.getInternalKey = getInternalKey;
}

module.exports = { 
  normalizeKey, 
  getDisplayName, 
  getInternalKey 
}; 