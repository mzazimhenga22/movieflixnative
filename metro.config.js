// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep Metro mostly default, just extend resolver a bit
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true, // good for modern packages
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    // If you need the form-data polyfill, keep this:
    'form-data': path.resolve(__dirname, 'polyfills/form-data.js'),
    // URL.parse polyfill for p-stream providers
    'url': path.resolve(__dirname, 'polyfills/url.js'),
  },
};

// No custom watchFolders, no resolveRequest override
module.exports = config;
