import pluginJs from '@eslint/js';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import pluginReact from 'eslint-plugin-react';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  {
    ignores: [
      '.next/**',
      'public/**',
      'next.config.js',
      'next-sitemap.config.js',
      'postcss.config.js',
    ],
  },
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  eslintPluginUnicorn.configs['recommended'],
  {
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '{react,next,next/**}',
              group: 'external',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'tailwindcss/no-custom-classname': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': [
        'error',
        {
          case: 'camelCase',
        },
      ],
      'unicorn/prefer-module': 'off',
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    rules: {
      'no-console': 'error',
      'unicorn/filename-case': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-nested-ternary': 'off',
    },
  },
  {
    files: ['**/*.{mts,cts}'],
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];

export default config;
