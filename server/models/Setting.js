/*
  SETTING.JS
  Version: 1.25.1
  AppName: MultiChat_Chatty [v1.25.1]
  Updated: 9/14/2025 @5:55AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    collection: 'settings',
    timestamps: true
});

SettingSchema.statics.getSetting = async function(key) {
    const setting = await this.findOne({ key });
    return setting ? setting.value : null;
};

SettingSchema.statics.setSetting = async function(key, value) {
    return await this.findOneAndUpdate(
        { key },
        { value, lastUpdated: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

module.exports = mongoose.model('Setting', SettingSchema); 