/*
  PLAYLIST-NAME-NORMALIZER.JS
  Shared logic for comparing playlist names (client).
  Keep in sync with utils/playlistNameNormalizer.js
*/

export function stripPlaylistPrefixes(name) {
  if (!name) return '';
  let cleaned = name
    .replace(/^youtube\s+search\s+/i, '')
    .replace(/^youtube\s+channel\s+/i, '')
    .replace(/^youtube\s+movies?\s+/i, '')
    .replace(/^youtube\s+tv\s+/i, '')
    .replace(/^youtube\s+/i, '')
    .replace(/^search\s+/i, '')
    .replace(/^channel\s+/i, '')
    .replace(/^movies?\s+/i, '')
    .replace(/^tv\s+/i, '')
    .trim();
  if (!cleaned) cleaned = name.trim();
  return cleaned.replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function detectSearchTypeFromName(name) {
  if (!name) return 'search';
  const lowerName = name.toLowerCase();
  if (lowerName.includes('youtube channel') || lowerName.startsWith('channel ')) {
    return 'channel';
  }
  if (
    lowerName.includes('youtube movie') ||
    lowerName.includes('youtube film') ||
    lowerName.startsWith('movie ') ||
    lowerName.startsWith('film ')
  ) {
    return 'movies';
  }
  if (
    lowerName.includes('youtube tv') ||
    lowerName.includes('youtube television') ||
    lowerName.includes('youtube series') ||
    lowerName.includes('youtube show') ||
    lowerName.startsWith('tv ') ||
    lowerName.startsWith('television ') ||
    lowerName.startsWith('series ') ||
    lowerName.startsWith('show ')
  ) {
    return 'tv';
  }
  return 'search';
}

function toHumanReadable(cleaned) {
  return cleaned.replace(/\b\w/g, (l) => l.toUpperCase());
}

export function getPlaylistVisibleName(name) {
  if (!name) return '';
  const type = detectSearchTypeFromName(name);
  let cleaned = stripPlaylistPrefixes(name);
  if (!cleaned) cleaned = name.trim();
  const humanReadable = toHumanReadable(cleaned);
  switch (type) {
    case 'channel':
      return `${humanReadable} (ch)`;
    case 'movies':
      return `${humanReadable} (mv)`;
    case 'tv':
      return `${humanReadable} (tv)`;
    default:
      return humanReadable;
  }
}

export function getPlaylistVisibleNameKey(name) {
  return getPlaylistVisibleName(name).toLowerCase().trim();
}

export function getPlaylistDisplayComparisonKey(name) {
  return getPlaylistVisibleNameKey(name);
}
