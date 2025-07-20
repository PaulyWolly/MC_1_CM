// shared/NormalizationService.js
// Provides a single normalization function for movie keys

function normalizeKey(name) {
  return name
    .replace(/\\/g, '/')
    .replace(/\s+/g, '.')
    .replace(/[^a-zA-Z0-9.\[\]()]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

module.exports = { normalizeKey }; 