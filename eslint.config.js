// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "e2e/*"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Ban explicit `any` — forces proper types (Id<>, Doc<>, unknown, etc.)
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);
