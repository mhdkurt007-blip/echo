module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // 'plugins' dizisi 'presets' ile aynı seviyede olmalı
    plugins: [], 
  };
};