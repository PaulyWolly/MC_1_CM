/*
  CONFIGLOADER.JS
  Version: 1.30
  AppName: MultiChat_Chatty [v1.30]
  Updated: 10/15/2025 @8:00AM
  Created by Paul Welby
*/

export async function loadConfig() {
  const response = await fetch('/config/config.json');
  if (!response.ok) throw new Error('Failed to load config');
  return response.json();
}
