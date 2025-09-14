/*
  NORMALIZE_TV_SHOWS.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const fs = require('fs').promises;
const path = require('path');

const TV_SHOWS_DIR = 'S:/MEDIA/TV-SHOWS';
const DRY_RUN = process.argv.includes('--dry-run');
const RENAME_FILES = process.argv.includes('--rename-files');
const RENAME_FOLDERS = process.argv.includes('--rename-folders');
const TEST_LIMIT = 3; // Only process first 3 shows in dry run

function pad(num) { return num.toString().padStart(2, '0'); }

function normalizeShowName(name) {
    // Remove technical tags, keep year in parenthesis if present
    let n = name.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    // Try to extract year
    const yearMatch = n.match(/(\d{4})/);
    let year = yearMatch ? yearMatch[1] : '';
    n = n.replace(/(\d{4})/, '').replace(/\.+$/, '').trim();
    n = n.replace(/\s+/g, ' ');
    if (year) n = `${n} (${year})`;
    return n;
}

function normalizeSeasonName(name) {
    const match = name.match(/season\s*(\d+)/i);
    if (match) return `Season ${pad(match[1])}`;
    return name;
}

function normalizeEpisodeName(show, season, file) {
    // Try to extract SxxExx
    const sMatch = season.match(/(\d+)/);
    const eMatch = file.match(/S(\d{2})E(\d{2})/i) || file.match(/(\d{1,2})[xX](\d{2})/);
    let s = sMatch ? pad(sMatch[1]) : '01';
    let e = eMatch ? pad(eMatch[2] || eMatch[1]) : '01';
    let ext = path.extname(file);
    
    // Extract episode title - look for patterns like "S01E01 - Title" or "1x01 - Title"
    let title = '';
    const titleMatch = file.match(/(?:S\d{2}E\d{2}|\d{1,2}x\d{2})\s*[-–]\s*(.+?)(?:\s*\[|\.|$)/i);
    if (titleMatch) {
        title = titleMatch[1].trim();
        // Clean up the title - remove technical tags but keep the actual title
        title = title.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    }
    
    let base = `${show.replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.]/g, '')}.S${s}E${e}`;
    if (title) {
        base += `.${title.replace(/\s+/g, '.').replace(/[^a-zA-Z0-9.]/g, '')}`;
    }
    
    // Keep quality tag if present
    const quality = file.match(/\[(1080p|720p|480p|2160p|4K)\]/i);
    if (quality) base += `.${quality[0]}`;
    
    return base + ext;
}

async function main() {
    const shows = await fs.readdir(TV_SHOWS_DIR, { withFileTypes: true });
    let showCount = 0;
    for (const showDir of shows) {
        if (!showDir.isDirectory()) continue;
        showCount++;
        if (DRY_RUN && showCount > TEST_LIMIT) break;
        const showPath = path.join(TV_SHOWS_DIR, showDir.name);
        const normalizedShow = normalizeShowName(showDir.name);
        if (DRY_RUN) {
            if (showDir.name !== normalizedShow) {
                console.log(`Show: ${showDir.name} → ${normalizedShow}`);
            }
        } else if (RENAME_FOLDERS && showDir.name !== normalizedShow) {
            await fs.rename(showPath, path.join(TV_SHOWS_DIR, normalizedShow));
            console.log(`Renamed show folder: ${showDir.name} → ${normalizedShow}`);
        }
        // Seasons
        const seasons = await fs.readdir(showPath, { withFileTypes: true });
        let seasonCount = 0;
        for (const seasonDir of seasons) {
            if (!seasonDir.isDirectory()) continue;
            seasonCount++;
            if (DRY_RUN && seasonCount > 2) break;
            const seasonPath = path.join(showPath, seasonDir.name);
            const normalizedSeason = normalizeSeasonName(seasonDir.name);
            if (DRY_RUN) {
                if (seasonDir.name !== normalizedSeason) {
                    console.log(`  Season: ${seasonDir.name} → ${normalizedSeason}`);
                }
            } else if (RENAME_FOLDERS && seasonDir.name !== normalizedSeason) {
                await fs.rename(seasonPath, path.join(showPath, normalizedSeason));
                console.log(`Renamed season folder: ${seasonDir.name} → ${normalizedSeason}`);
            }
            // Episodes
            const episodes = await fs.readdir(seasonPath);
            let epCount = 0;
            for (const ep of episodes) {
                if (!/\.(mp4|mkv|avi|mov|m4v)$/i.test(ep)) continue;
                epCount++;
                if (DRY_RUN && epCount > 2) break;
                const normalizedEp = normalizeEpisodeName(normalizedShow, normalizedSeason, ep);
                if (DRY_RUN) {
                    if (ep !== normalizedEp) {
                        console.log(`    Episode: ${ep} → ${normalizedEp}`);
                    }
                } else if (RENAME_FILES && ep !== normalizedEp) {
                    await fs.rename(path.join(seasonPath, ep), path.join(seasonPath, normalizedEp));
                    console.log(`Renamed episode: ${ep} → ${normalizedEp}`);
                }
            }
        }
    }
    console.log('\nDry run complete. No changes made.');
}

main().catch(console.error); 