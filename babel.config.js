module.exports = function (api) {
  api.cache(true);
  // 상위 ~/node_modules 의 구버전 babel-preset-expo(9.x) 대신 Expo 54 번들 preset 사용
  const expoPreset = require.resolve('babel-preset-expo', {
    paths: [require.resolve('expo')],
  });
  return {
    presets: [expoPreset],
    plugins: [
      // Reanimated / Worklets — 반드시 마지막
      'react-native-reanimated/plugin',
    ],
  };
};
