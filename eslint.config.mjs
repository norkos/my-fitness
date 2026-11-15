// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['openspec/**', '.opencode/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'server/db/migrations/**'],
  },
  {
    // Tests inspect loosely typed JSON responses.
    files: ['test/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-dynamic-delete': 'off',
    },
  },
)
