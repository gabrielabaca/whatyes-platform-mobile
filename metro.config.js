const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const baseConfig = getDefaultConfig(projectRoot);
const { assetExts, sourceExts } = baseConfig.resolver;

// package "exports" puede romper helpers de @babel/runtime en RN 0.83+.
baseConfig.resolver.unstable_conditionsByPlatform = {
  ios: ['react-native', 'import', 'require', 'default'],
  android: ['react-native', 'import', 'require', 'default'],
  web: ['browser'],
};
baseConfig.resolver.unstable_enablePackageExports = false;

// Polyfills Node (http, stream, crypto, etc.) para amazon-kinesis-video-streams-webrtc
const nodeLibs = require('node-libs-react-native');
const webcryptoShim = path.resolve(projectRoot, 'shim', 'isomorphic-webcrypto.js');
const kvsSigv4Shim = path.resolve(projectRoot, 'shim', 'kvs-sigv4.js');
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
      filePath: path.resolve(projectRoot, 'shim', 'ws.js'),
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

baseConfig.transformer = {
  ...baseConfig.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/react-native'),
};
baseConfig.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
baseConfig.resolver.sourceExts = [...sourceExts, 'svg'];

// No reasignar resolver.resolveRequest después de withNativeWind: rompe NativeWind (className).
module.exports = withNativeWind(baseConfig, { input: './global.css' });
