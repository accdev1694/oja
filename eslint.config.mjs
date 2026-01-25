import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated service worker (Serwist)
    'public/sw.js',
    // Test coverage
    'coverage/**',
    // Playwright
    'playwright-report/**',
    'test-results/**',
  ]),
  // Prettier compatibility - disable conflicting rules
  eslintConfigPrettier,
  // Custom rules for Oja project
  {
    rules: {
      // Enforce consistent imports with @/ alias (only for parent directory traversal)
      // Allow ./ imports for barrel exports and same-directory imports
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message:
                'Use @/ alias for imports instead of relative paths with ../',
            },
          ],
        },
      ],
      // Warn on console.log in production code (allow in dev)
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // TypeScript strict rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Enforce type imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
    },
  },
  // Override for test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Override for config files
  {
    files: [
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      'jest.config.js',
      'jest.setup.js',
    ],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);

export default eslintConfig;
