/*
  USER.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // Store hashed password
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  oneTimeCode: { type: String, default: null }, // For SuperAdmin unlock
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

// userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema); 