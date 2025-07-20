/*
  LOGGING-HELPER.JS
  Version: 8
  AppName: MCC_1_CCM [v8]
  Updated: 7/20/2025 @8:30AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Write a log message to a file in the logs directory
 * @param {string} scriptName - Name of the script (without .js extension)
 * @param {string} message - Log message to write
 */
function logToFile(scriptName, message) {
    try {
        const logFile = path.join(logsDir, `${scriptName}.log`);
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        
        // Append to log file
        fs.appendFileSync(logFile, logEntry);
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
}

/**
 * Read log content from a file
 * @param {string} scriptName - Name of the script (without .js extension)
 * @returns {string} - Log content or empty string if file doesn't exist
 */
function readLogFile(scriptName) {
    try {
        const logFile = path.join(logsDir, `${scriptName}.log`);
        if (fs.existsSync(logFile)) {
            return fs.readFileSync(logFile, 'utf8');
        }
        return '';
    } catch (error) {
        console.error('Error reading log file:', error);
        return '';
    }
}

/**
 * Clear log file for a script
 * @param {string} scriptName - Name of the script (without .js extension)
 */
function clearLogFile(scriptName) {
    try {
        const logFile = path.join(logsDir, `${scriptName}.log`);
        if (fs.existsSync(logFile)) {
            fs.unlinkSync(logFile);
        }
    } catch (error) {
        console.error('Error clearing log file:', error);
    }
}

module.exports = {
    logToFile,
    readLogFile,
    clearLogFile
}; 