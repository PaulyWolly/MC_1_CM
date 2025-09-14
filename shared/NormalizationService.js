/*
  NORMALIZATIONSERVICE.JS
  Version: 1.25.1
  AppName: MultiChat Chatty [v25]
  Updated: 9/14/2025 @5:41 AM
  Created by Paul Welby
*/

// shared/NormalizationService.js
// Provides a single normalization function for movie keys

function normalizeKey(name) {
  if (!name || typeof name !== 'string') {
    console.warn('[NORMALIZATION] Invalid name provided to normalizeKey:', name);
    return '';
  }
  
  return name
    .toLowerCase() // ALWAYS convert to lowercase for consistency
    .replace(/\\/g, '/') // normalize path separators
    .replace(/\s*&\s*/g, '.&.') // preserve ampersand as dot-ampersand-dot
    .replace(/\s+/g, '.') // replace all whitespace with dots
    .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '') // only allow alphanumeric, dots, ampersands, brackets, parentheses
    .replace(/\.+/g, '.') // collapse multiple dots into single dots
    .replace(/^\.|\.$/g, '') // remove leading/trailing dots
    .trim(); // final trim for safety
}

if (typeof window !== 'undefined') {
  window.normalizeKey = normalizeKey;
}

module.exports = { normalizeKey }; 