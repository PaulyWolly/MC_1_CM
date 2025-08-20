// shared/NormalizationService.js
// Provides a single normalization function for movie keys

function normalizeKey(name) {
  return name
    .replace(/\\/g, '/')
    .replace(/\s*&\s*/g, '.&.') // preserve ampersand as dot-ampersand-dot
    .replace(/\s+/g, '.')
    .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '') // include & in allowed characters
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

if (typeof window !== 'undefined') {
  window.normalizeKey = normalizeKey;
}

module.exports = { normalizeKey }; 