const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const {assetExts, sourceExts} = defaultConfig.resolver;

const config = {
  resolver: {
    // Add glb to assetExts and remove it from sourceExts if it exists there
    assetExts: [...assetExts, 'glb', 'gltf'],
    sourceExts: [...sourceExts, 'js', 'json', 'ts', 'tsx'],
  },
};

module.exports = mergeConfig(defaultConfig, config);