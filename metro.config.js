const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.sourceExts.push("cjs");
defaultConfig.resolver.platforms = ["ios", "android", "native", "web"];

// react-native-volume-manager usa src/index.ts como entry point para RN —
// hay que excluirlo del ignore pattern para que Babel lo transpile
defaultConfig.transformer.transformIgnorePatterns = [
  "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|react-native-volume-manager)",
];

module.exports = defaultConfig;
