/*
  REPAIR_YOUTUBE_LOCALSTORAGE.JS
  Version: 16
  AppName: MultiChat_Chatty [v16]
  Updated: 8/10/2025 @1:15AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../localStorage.json');
const OUTPUT_FILE = path.join(__dirname, '../localStorage_repaired.json');

function isValidDate(val) {
  return val && !isNaN(new Date(val));
}

function isValidTimestamp(val) {
  return val && !isNaN(Number(val));
}

function repairEntry(item, nowISO, nowTS) {
  let changed = false;
  // If wrapped in {data: ...}, go one level deeper
  let target = item.data && typeof item.data === 'object' ? item.data : item;
  if (!isValidDate(target.dateCreated)) {
    target.dateCreated = nowISO;
    changed = true;
  }
  if (!isValidDate(target.lastSearched)) {
    target.lastSearched = nowISO;
    changed = true;
  }
  if (!isValidTimestamp(target.timestamp)) {
    target.timestamp = nowTS;
    changed = true;
  }
  if (item.data) item.data = target;
  else Object.assign(item, target);
  return changed;
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(INPUT_FILE, 'utf-8');
  let store;
  try {
    store = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse localStorage.json:', e);
    process.exit(1);
  }
  const nowISO = new Date().toISOString();
  const nowTS = Date.now();
  let fixed = 0, skipped = 0;
  for (const key of Object.keys(store)) {
    if (key.startsWith('yt_')) {
      let item = store[key];
      if (typeof item === 'string') {
        try { item = JSON.parse(item); } catch { continue; }
      }
      if (item && typeof item === 'object') {
        if (repairEntry(item, nowISO, nowTS)) {
          fixed++;
        } else {
          skipped++;
        }
        store[key] = item;
      }
    }
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(store, null, 2), 'utf-8');
  console.log(`Repair complete.\nFixed: ${fixed}\nSkipped (already valid): ${skipped}\nOutput: ${OUTPUT_FILE}`);
}

main(); 