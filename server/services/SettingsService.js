/*
  SETTINGSSERVICE.JS
  Version: 23
  AppName: MultiChat_Chatty MC_1_CM [v23]
  Updated: 8/29/2025 @6:45AM
  Created by Paul Welby
*/

const Setting = require('../models/Setting');

/**
 * Service for managing application settings in MongoDB
 */
class SettingsService {
    /**
     * Retrieves a setting value from the database.
     * @param {string} key - The key of the setting to retrieve.
     * @param {*} defaultValue - The default value to return if the key is not found.
     * @returns {Promise<*>} The value of the setting or the default value.
     */
    static async get(key, defaultValue = null) {
        try {
            const value = await Setting.getSetting(key);
            return value !== null ? value : defaultValue;
        } catch (error) {
            console.error(`Error getting setting '${key}':`, error);
            return defaultValue;
        }
    }

    /**
     * Saves a setting value to the database.
     * @param {string} key - The key of the setting to save.
     * @param {*} value - The value to save.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    static async set(key, value) {
        try {
            await Setting.setSetting(key, value);
            return true;
        } catch (error) {
            console.error(`Error setting setting '${key}':`, error);
            return false;
        }
    }
}

module.exports = SettingsService; 