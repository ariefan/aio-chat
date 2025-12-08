import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

const baseRules = {
  'no-console': 'warn',
  'no-debugger': 'error',
  'no-alert': 'error',
  'no-var': 'error',
  'prefer-const': 'error',
  'prefer-arrow-callback': 'error'
}

const typescriptRules = {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/explicit-function-return-type': 'warn'
}

const reactRules = {
  'react/react-in-jsx-scope': 'off',
  'react/prop-types': 'off'
}

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks
    },
    rules: {
      ...baseRules,
      ...typescriptRules,
      ...reactRules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    },
    settings: { react: { version: 'detect' } }
  },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: baseRules
  },
  {
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' }
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/*.config.{js,ts}',
      'packages/ui/dist/**',
      '.next/**',
      '**/*.next/**',
      'apps/web/.next/**',
      'coverage/**'
    ]
  }
]