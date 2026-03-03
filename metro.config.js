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
// isomorphic-webcrypto se fuerza a un shim para RN
const nodeLibs = require('node-libs-react-native');
const webcryptoShim = path.resolve(__dirname, 'shim', 'isomorphic-webcrypto.js');
const kvsSigv4Shim = path.resolve(__dirname, 'shim', 'kvs-sigv4.js');
baseConfig.resolver = baseConfig.resolver || {};
baseConfig.resolver.extraNodeModules = {
  ...nodeLibs,
  ...baseConfig.resolver.extraNodeModules,
  'isomorphic-webcrypto': webcryptoShim,
  'amazon-kinesis-video-streams-webrtc/lib/SigV4RequestSigner': kvsSigv4Shim,
};

const defaultResolveRequest = baseConfig.resolver.resolveRequest;
baseConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'shim', 'ws.js'),
    };
  }
  if (moduleName === 'isomorphic-webcrypto') {
    return {
      type: 'sourceFile',
      filePath: webcryptoShim,
    };
  }
  if (moduleName === 'amazon-kinesis-video-streams-webrtc/lib/SigV4RequestSigner') {
    return {
      type: 'sourceFile',
      filePath: kvsSigv4Shim,
    };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(baseConfig, { input: './global.css' });
