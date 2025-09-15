const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Enable require.context for Expo Router
config.transformer.unstable_allowRequireContext = true;

// Add path alias support
config.resolver.alias = {
  '@': path.resolve(__dirname, './'),
};

module.exports = config;
