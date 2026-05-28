const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;
const baseConfig = getDefaultConfig(projectRoot);
baseConfig.projectRoot = projectRoot;
baseConfig.watchFolders = [projectRoot];

const { assetExts, sourceExts } = baseConfig.resolver;

// @expo/metro-config usa solo ['react-native'] en Android/iOS; paquetes como
// @babel/runtime exportan con "default"/"import" y fallan al resolver helpers.
baseConfig.resolver.unstable_conditionsByPlatform = {
  ios: ['react-native', 'import', 'require', 'default'],
  android: ['react-native', 'import', 'require', 'default'],
  web: ['browser'],
};
// Evita que Metro use solo "exports" de package.json (rompe @babel/runtime helpers).
baseConfig.resolver.unstable_enablePackageExports = false;

// Polyfills Node (http, stream, crypto, etc.) para amazon-kinesis-video-streams-webrtc
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

baseConfig.transformer = {
  ...baseConfig.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};
baseConfig.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
baseConfig.resolver.sourceExts = [...sourceExts, 'svg'];

const config = withNativeWind(baseConfig, { input: './global.css' });
config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];
config.resolver.unstable_conditionsByPlatform =
  baseConfig.resolver.unstable_conditionsByPlatform;
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
