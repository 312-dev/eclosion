import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import sonarjs from 'eslint-plugin-sonarjs'
import tailwindCanonicalClasses from 'eslint-plugin-tailwind-canonical-classes'
import unicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      sonarjs.configs.recommended,
    ],
    plugins: {
      'jsx-a11y': jsxA11y,
      'tailwind-canonical-classes': tailwindCanonicalClasses,
      unicorn,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Tailwind - enforce canonical class names (e.g., min-w-[140px] -> min-w-35)
      'tailwind-canonical-classes/tailwind-canonical-classes': ['warn', {
        cssPath: './src/index.css',
      }],
      // Allow underscore-prefixed variables to indicate intentionally unused
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Disable Fast Refresh warnings - dev-only, doesn't affect production
      'react-refresh/only-export-components': 'off',
      // Warn on files exceeding 300 lines (per CLAUDE.md component size standard)
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],

      // SonarJS rules - set as warnings to allow gradual adoption
      // Code quality (warn - fix when touching these files)
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/no-nested-conditional': 'warn',
      'sonarjs/no-unused-vars': 'off', // Already covered by @typescript-eslint/no-unused-vars
      'sonarjs/no-nested-functions': 'off', // Common pattern in React components and tests
      'sonarjs/todo-tag': 'warn', // TODOs are normal, warn but don't block
      'sonarjs/redundant-type-aliases': 'warn', // Minor code style
      'sonarjs/single-char-in-character-classes': 'warn', // Minor regex style
      'sonarjs/concise-regex': 'warn', // Minor regex style (e.g., [0-9] -> \d)
      'sonarjs/no-all-duplicated-branches': 'warn', // Code cleanup item
      'sonarjs/no-invariant-returns': 'warn', // Code cleanup item
      'sonarjs/prefer-read-only-props': 'warn', // Mark component props as readonly

      // Security (warn - should be fixed, tracked in backlog)
      'sonarjs/slow-regex': 'warn', // ReDoS vulnerability - fix when touching these files

      // False positives for demo/mock data (disable)
      'sonarjs/no-hardcoded-ip': 'off', // Demo data contains fake IPs
      'sonarjs/pseudo-random': 'off', // Used for animations and demo data, not security

      // Unicorn rules - modern JavaScript patterns (warn for gradual adoption)
      'unicorn/prefer-global-this': 'warn', // globalThis over window
      'unicorn/prefer-code-point': 'warn', // codePointAt() over charCodeAt()
      'unicorn/prefer-string-replace-all': 'warn', // replaceAll() over replace() with /g
      'unicorn/prefer-number-properties': 'warn', // Number.parseInt, Number.isNaN, etc.
      'unicorn/prefer-at': 'warn', // .at(-1) over [arr.length - 1]
      'unicorn/prefer-export-from': 'warn', // export { x } from 'y' over import+export
      'unicorn/prefer-logical-operator-over-ternary': 'warn', // a ?? b over a ? a : b
      'unicorn/no-negated-condition': 'warn', // Avoid negated conditions
      // Disabled unicorn rules (too noisy or conflicts)
      'unicorn/filename-case': 'off', // Project uses PascalCase for components
      'unicorn/prevent-abbreviations': 'off', // Would require massive renames
      'unicorn/no-null': 'off', // null is used intentionally in many places
      'unicorn/no-array-callback-reference': 'off', // Common React pattern
      'unicorn/no-useless-undefined': 'off', // TypeScript sometimes requires explicit undefined

      // JSX Accessibility rules (warn for gradual adoption)
      'jsx-a11y/prefer-tag-over-role': 'warn', // <article> over role="article"
      'jsx-a11y/no-static-element-interactions': 'warn', // Require handlers on interactive elements
      'jsx-a11y/click-events-have-key-events': 'warn', // onClick needs onKeyDown
      'jsx-a11y/no-noninteractive-element-interactions': 'warn', // Non-interactive shouldn't have handlers
      'jsx-a11y/anchor-is-valid': 'warn', // Anchors need href or button
    },
  },
])
