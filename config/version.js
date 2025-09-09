/*
  VERSION.JS
  Centralized version management for mc_1_cm
  Created by Paul Welby
*/

const VERSION_INFO = {
    version: "1.24.0",
    appName: "mc_1_cm",
    lastUpdated: "2025-09-08",
    buildNumber: "20250908-001",
    environment: "development"
};

const BUILD_INFO = {
    buildDate: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
};

// Helper function to get formatted version string
function getVersionString() {
    return `${VERSION_INFO.appName} [v${VERSION_INFO.version}]`;
}

// Helper function to get full version info
function getFullVersionInfo() {
    return {
        ...VERSION_INFO,
        ...BUILD_INFO
    };
}

// Helper function to check if version should be updated
function shouldUpdateVersion(currentVersion) {
    return currentVersion !== VERSION_INFO.version;
}

module.exports = {
    VERSION_INFO,
    BUILD_INFO,
    getVersionString,
    getFullVersionInfo,
    shouldUpdateVersion
};
