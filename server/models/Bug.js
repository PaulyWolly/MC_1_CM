/*
  BUG.JS
  Version: 17
  AppName: MultiChat_Chatty [v17]
  Updated: 8/12/2025 @4:00AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: String,
  message: String,
  date: { type: Date, default: Date.now }
});

const bugSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  submittedBy: { type: String, required: true }, // user email or id
  created: { type: Date, default: Date.now },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
  status: { type: String, enum: ['Open', 'In Progress', 'Fixed', 'Closed'], default: 'Open' },
  comments: [commentSchema]
});

module.exports = mongoose.model('Bug', bugSchema); 