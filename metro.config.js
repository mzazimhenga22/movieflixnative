// Metro configuration with explicit alias for React compiler runtime
// This fixes resolution errors like "Unable to resolve 'react/compiler-runtime'"
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    'form-data': path.resolve(__dirname, 'polyfills/form-data.js'),
    'react/compiler-runtime': path.resolve(__dirname, 'node_modules/react-compiler-runtime'),
  },
  /**
   * Force Metro to resolve the injected subpath to the standalone package.
   * Without this, Metro tries to read it from "react" exports and fails.
   */
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName === 'react/compiler-runtime') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'node_modules/react-compiler-runtime/dist/index.js'),
      };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
