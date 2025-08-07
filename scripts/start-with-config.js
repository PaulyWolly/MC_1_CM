/*
  START-WITH-CONFIG.JS
  Version: 14
  AppName: MultiChat_Chatty [v14]
  Updated: 8/7/2025 @7:00AM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../config/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const port = config.development.backend.port;

if (!port) {
  console.error('No backend port specified in /config/config.json!');
  process.exit(1);
}

const { spawn } = require('child_process');
const server = spawn('node', ['server/server.js'], {
  env: { ...process.env, PORT: port }
});

server.stdout.on('data', data => process.stdout.write(data));
server.stderr.on('data', data => process.stderr.write(data));
server.on('close', code => process.exit(code));