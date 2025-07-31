/*
  START-FRONTEND-WITH-CONFIG.JS
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const configPath = path.join(__dirname, '../config/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const port = config.development.frontend.port;

if (!port) {
  console.error('No frontend port specified in /config/config.json!');
  process.exit(1);
}

// Use npx to ensure http-server is found, cross-platform
const cmd = `npx http-server ./public -p ${port}`;
const frontend = spawn(cmd, { stdio: 'inherit', shell: true });

frontend.on('close', code => process.exit(code));
