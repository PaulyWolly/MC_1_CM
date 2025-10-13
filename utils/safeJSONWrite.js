/**
 * safeJSONWrite.js
 * Safe JSON file writing with validation and backup
 */

const fs = require('fs');
const path = require('path');
const { validateData, canStringify } = require('./validateJSONData');

/**
 * Safely write JSON data to file with validation and backup
 * @param {string} filePath - Path to JSON file
 * @param {any} data - Data to write
 * @param {Object} options - Options
 * @returns {Object} { success: boolean, error: string|null, backupPath: string|null }
 */
function safeJSONWrite(filePath, data, options = {}) {
  const {
    createBackup = true,
    validate = true,
    validateTVShows = false,
    indent = 2,
    throwOnError = false
  } = options;

  try {
    // Step 1: Validate data
    if (validate) {
      const validation = validateData(data, { validateTVShows });
      
      if (!validation.isValid) {
        const errorMsg = `Validation failed: ${validation.errors.join('; ')}`;
        console.error(`[SAFE-JSON-WRITE] ❌ ${errorMsg}`);
        if (throwOnError) throw new Error(errorMsg);
        return { success: false, error: errorMsg, backupPath: null };
      }

      if (validation.warnings.length > 0) {
        console.warn(`[SAFE-JSON-WRITE] ⚠️  Warnings: ${validation.warnings.join('; ')}`);
      }

      // Check if data can be stringified properly
      const stringifyCheck = canStringify(data);
      if (!stringifyCheck.isValid) {
        const errorMsg = `Cannot stringify data: ${stringifyCheck.error}`;
        console.error(`[SAFE-JSON-WRITE] ❌ ${errorMsg}`);
        if (throwOnError) throw new Error(errorMsg);
        return { success: false, error: errorMsg, backupPath: null };
      }
    }

    // Step 2: Create backup if file exists and backup is enabled
    let backupPath = null;
    if (createBackup && fs.existsSync(filePath)) {
      const timestamp = Date.now();
      const parsedPath = path.parse(filePath);
      backupPath = path.join(
        parsedPath.dir,
        `${parsedPath.name}.backup.${timestamp}${parsedPath.ext}`
      );
      
      try {
        fs.copyFileSync(filePath, backupPath);
        console.log(`[SAFE-JSON-WRITE] 💾 Created backup: ${backupPath}`);
      } catch (backupError) {
        console.warn(`[SAFE-JSON-WRITE] ⚠️  Could not create backup: ${backupError.message}`);
      }
    }

    // Step 3: Write the file
    const jsonString = JSON.stringify(data, null, indent);
    fs.writeFileSync(filePath, jsonString, 'utf8');

    // Step 4: Verify the write
    const verifyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!verifyData) {
      throw new Error('File write verification failed - could not read back data');
    }

    console.log(`[SAFE-JSON-WRITE] ✅ Successfully wrote to: ${filePath}`);
    return { success: true, error: null, backupPath };

  } catch (err) {
    const errorMsg = `Failed to write JSON: ${err.message}`;
    console.error(`[SAFE-JSON-WRITE] ❌ ${errorMsg}`);
    if (throwOnError) throw err;
    return { success: false, error: errorMsg, backupPath: null };
  }
}

/**
 * Safe wrapper for JSON.stringify that checks for NaN
 * @param {any} data - Data to stringify
 * @param {number} indent - Indentation spaces
 * @returns {string} JSON string
 * @throws {Error} If data contains NaN
 */
function safeStringify(data, indent = 2) {
  const check = canStringify(data);
  if (!check.isValid) {
    throw new Error(`Cannot stringify: ${check.error}`);
  }
  return JSON.stringify(data, null, indent);
}

module.exports = {
  safeJSONWrite,
  safeStringify
};

