// Metro config — Career Next Step
// Forces polling-based file watching to avoid OneDrive / Windows native watcher issues.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Use polling file watcher — essential for paths like OneDrive Desktop
config.watchFolders = [__dirname];
config.resolver.enableGlobalPackages = true;

module.exports = config;
