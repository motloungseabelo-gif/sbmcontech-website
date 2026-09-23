import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '*.min.js', 'lighthouse-results/**']
  },
  {
    files: ['script.js', 'lael.js', 'sw.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: globals.browser
    },
    rules: {
      'constructor-super': 'error',
      'for-direction': 'error',
      'getter-return': 'error',
      'no-async-promise-executor': 'error',
      'no-constant-condition': 'error',
      'no-debugger': 'error',
      'no-dupe-args': 'error',
      'no-dupe-else-if': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-func-assign': 'error',
      'no-import-assign': 'error',
      'no-loss-of-precision': 'error',
      'no-obj-calls': 'error',
      'no-promise-executor-return': 'error',
      'no-self-assign': 'error',
      'no-setter-return': 'error',
      'no-sparse-arrays': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-finally': 'error',
      'no-unsafe-negation': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-unused-labels': 'error',
      'no-unused-private-class-members': 'error',
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-useless-backreference': 'error',
      'no-useless-catch': 'error',
      'no-useless-escape': 'error',
      'no-with': 'error',
      'require-yield': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error'
    }
  },
  {
    files: ['worker/src/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error'
    }
  },
  {
    files: ['scripts/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      'no-debugger': 'error',
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }]
    }
  },
  {
    files: ['scripts/responsive-check.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      }
    }
  }
];
