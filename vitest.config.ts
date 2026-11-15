import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'api',
          include: ['test/api/**/*.test.ts'],
          environment: 'node',
          // Each file boots its own server process with its own database.
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['shared/**/*.ts', 'server/services/**/*.ts', 'server/db/**/*.ts', 'server/lib/**/*.ts'],
      exclude: ['server/db/migrations/**', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
})
