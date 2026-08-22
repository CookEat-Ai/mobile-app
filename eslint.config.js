// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    // Expo 57 active les diagnostics du React Compiler. L'application ne
    // compile pas encore avec celui-ci et utilise largement Animated.Value,
    // que ces règles interprètent comme des lectures de ref pendant le rendu.
    // Les règles Hooks structurelles restent actives.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
]);
