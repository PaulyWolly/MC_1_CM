/*
  IMPORT_LOCALSTORAGE_JSON.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

/*
 * import_localstorage_json.js
 *
 * Usage:
 *   node scripts/import_localstorage_json.js <url> <json_file>
 *
 * Example:
 *   node scripts/import_localstorage_json.js http://localhost:4800 ../localStorage_repaired.json
 *
 * This script will open the specified URL in a headless browser and import all keys from the JSON file into the page's localStorage.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function importLocalStorage(url, jsonFile) {
  if (!fs.existsSync(jsonFile)) {
    console.error(`JSON file not found: ${jsonFile}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(jsonFile, 'utf-8');
  let store;
  try {
    store = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    process.exit(1);
  }
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const count = await page.evaluate((obj) => {
    let imported = 0;
    for (const [key, value] of Object.entries(obj)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      imported++;
    }
    return imported;
  }, store);
  console.log(`Imported ${count} localStorage keys from ${jsonFile} into ${url}`);
  // Keep browser open for user to verify
  // await browser.close();
}

// CLI usage
if (require.main === module) {
  const [,, url, jsonFile] = process.argv;
  if (!url || !jsonFile) {
    console.log('Usage: node scripts/import_localstorage_json.js <url> <json_file>');
    process.exit(1);
  }
  importLocalStorage(url, path.resolve(jsonFile));
} 