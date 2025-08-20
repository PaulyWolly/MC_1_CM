/*
  START-WITH-CONFIG.JS
<<<<<<< FIXES/general-fixes
  Version: 10
  AppName: MultiChat_Chatty [v10]
  Updated: 7/30/2025 @12:35PM
=======
  Version: 20
  AppName: MultiChat_Chatty MC_1_CM [v20]
  Updated: 8/19/2025 @10:00AM
>>>>>>> local
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