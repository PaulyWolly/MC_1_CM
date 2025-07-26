/*
  FIX-DUPLICATE-APPJS.JS
  Version: 9
  AppName: MC_1_CM [v9]
  Updated: 7/24/2025 @5:20PM
  Created by Paul Welby
*/

#!/usr/bin/env node

/*
  FIX-DUPLICATE-APPJS.JS
  Script to remove duplicate code in public/app.js
  Created: 2025-06-20
  Purpose: Truncate app.js at line 1537 to remove accidental duplicate code
*/

const fs = require('fs');
const path = require('path');

const appJsPath = path.join(__dirname, '../public/app.js');
const DUPLICATE_START_LINE = 1537;

console.log('🔧 [FIX] Removing duplicate code from app.js...');
console.log('📁 [FIX] Target file:', appJsPath);

try {
    const lines = fs.readFileSync(appJsPath, 'utf8').split('\n');
    if (lines.length < DUPLICATE_START_LINE) {
        console.log('✅ [FIX] No duplicate found. File is already clean.');
        process.exit(0);
    }
    const cleaned = lines.slice(0, DUPLICATE_START_LINE - 1).join('\n') + '\n';
    fs.writeFileSync(appJsPath, cleaned, 'utf8');
    console.log('✅ [FIX] Duplicate code removed. File truncated at line', DUPLICATE_START_LINE);
} catch (error) {
    console.error('❌ [FIX] Error:', error.message);
    process.exit(1);
} 