/*
  LOCALSTORAGE_MANAGER.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

/*
 * localstorage_manager.js
 *
 * Usage:
 *   node scripts/localstorage_manager.js
 *
 * This script will:
 *   1. Prompt for the app URL and JSON file to import
 *   2. Optionally export current localStorage to a backup file
 *   3. Import the selected JSON file into the browser's localStorage
 *   4. Reload the page and confirm success
 *   5. Keep the browser open for user verification
 */

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const puppeteer = require('puppeteer');

async function main() {
  console.log('--- LocalStorage Manager ---');

  // Step 1: Prompt for URL and JSON file
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: 'Enter the URL of your app:',
      default: 'http://localhost:4800',
    },
    {
      type: 'input',
      name: 'jsonFile',
      message: 'Enter the path to the JSON file to import:',
      default: 'localStorage_repaired.json',
      validate: (input) => fs.existsSync(input) || 'File does not exist!'
    },
    {
      type: 'confirm',
      name: 'exportBackup',
      message: 'Do you want to export current localStorage to a backup file before importing?',
      default: true,
    }
  ]);

  const { url, jsonFile, exportBackup } = answers;

  // Step 2: Launch browser
  console.log(`\n[1/4] Launching browser and navigating to ${url}...`);
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  console.log('[OK] Browser loaded.');

  // Step 3: Export backup if requested
  if (exportBackup) {
    console.log('[2/4] Exporting current localStorage to backup...');
    const backup = await page.evaluate(() => {
      const obj = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        obj[key] = localStorage.getItem(key);
      }
      return obj;
    });
    const backupFile = path.join(path.dirname(jsonFile), 'localStorage_backup_' + Date.now() + '.json');
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
    console.log(`[OK] Backup saved to ${backupFile}`);
  }

  // Step 4: Import JSON file
  console.log(`[3/4] Importing keys from ${jsonFile} into localStorage...`);
  const raw = fs.readFileSync(jsonFile, 'utf-8');
  let store;
  try {
    store = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    await browser.close();
    process.exit(1);
  }
  const count = await page.evaluate((obj) => {
    let imported = 0;
    for (const [key, value] of Object.entries(obj)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      imported++;
    }
    return imported;
  }, store);
  console.log(`[OK] Imported ${count} localStorage keys.`);

  // Step 5: Reload page and confirm
  console.log('[4/4] Reloading page to apply changes...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  console.log('[DONE] Import complete. The browser will remain open for you to verify.');
  console.log('You may close the browser window when finished.');
}

main(); 