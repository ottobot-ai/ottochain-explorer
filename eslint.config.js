import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
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
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow setState in effects for prop-to-state sync patterns
      'react-hooks/set-state-in-effect': 'off',
      // Allow impure functions in useMemo/useCallback (intentional for mock data)
      'react-hooks/purity': 'off',
      // Allow hooks to be exported alongside components
      'react-refresh/only-export-components': ['warn', { allowExportNames: ['useData', 'useDataRef'] }],
      // Allow any for dynamic data structures (will be fixed with SDK types later)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
])
