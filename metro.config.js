const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Thêm cấu hình xử lý wasm cho SQLite
config.resolver.assetExts.push('wasm');
config.resolver.sourceExts.push('wasm');

module.exports = config;