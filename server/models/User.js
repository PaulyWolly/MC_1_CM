/*
  USER.JS
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
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