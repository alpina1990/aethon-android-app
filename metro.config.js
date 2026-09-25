const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Let Metro bundle the whisper.cpp ggml model file as a binary asset.
config.resolver.assetExts.push('bin');

// whisper.rn imports the "safe-buffer" package, which requires Node's
// "buffer" core module. Metro has no Node polyfills by default, so point
// it at the userland "buffer" package instead.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: require.resolve('buffer'),
};

module.exports = config;
