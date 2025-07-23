// Node.js script to normalize TV show poster keys to dot notation
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv_posters.json');
const DEST = path.join(__dirname, '../public/components/MediaLibrary/data/tv-shows/tv_posters_normalized.json');

function normalizeKey(name) {
    return name
        .replace(/\\/g, '/')
        .replace(/\s*&\s*/g, '.&.') // preserve ampersand as dot-ampersand-dot
        .replace(/\s+/g, '.')
        .replace(/[^a-zA-Z0-9.&.\[\]()]/g, '')
        .replace(/\.+/g, '.')
        .replace(/^\.|\.$/g, '');
}

const posters = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const normalized = {};
for (const [key, url] of Object.entries(posters)) {
    const dotKey = normalizeKey(key);
    normalized[dotKey] = url;
}
fs.writeFileSync(DEST, JSON.stringify(normalized, null, 2));
console.log(`Normalized TV show posters written to ${DEST}`); 