const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const baseConfig = getDefaultConfig(__dirname);

// Polyfills Node (http, stream, crypto, etc.) para amazon-kinesis-video-streams-webrtc
// net/tls no existen en RN; el paquete "ws" se reemplaza por un shim que usa global.WebSocket
const nodeLibs = require('node-libs-react-native');
baseConfig.resolver = baseConfig.resolver || {};
baseConfig.resolver.extraNodeModules = {
  ...nodeLibs,
  ...baseConfig.resolver.extraNodeModules,
};

const defaultResolveRequest = baseConfig.resolver.resolveRequest;
baseConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'shim', 'ws.js'),
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(baseConfig, { input: './global.css' });
