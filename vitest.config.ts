/**
 * Vitest configuration for Sonar.
 *
 * Bootstrap (ORCA Copilot build, step 1). See ORCA_COPILOT_BUILD_PROMPT.md
 * §3.5.3 and §4.0 for context.
 *
 * - jsdom environment so React Testing Library can mount components.
 * - Globals enabled (describe/it/expect/vi) — matches the existing
 *   eslint "react-app/jest" config so we don't need per-file imports.
 * - `@/` path alias mirrors tsconfig.json paths.
 * - Coverage scoped to the orchestrator + renderers + ORCA API surfaces
 *   added during the copilot build. The rest of the codebase is excluded
 *   from coverage numbers (not from running) so we don't pollute the
 *   metric with legacy untested code.
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: true,
    include: [
      'test/**/*.{test,spec}.{ts,tsx,js,jsx}',
      '**/__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'lib/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'app/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'components/**/*.{test,spec}.{ts,tsx,js,jsx}',
    ],
    exclude: [
      'node_modules/**',
      '.next/**',
      '.claude/**',
      'scripts/**',
      'dist/**',
      'build/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Scope coverage to copilot-build surfaces only. As more code lands
      // in the orchestrator / renderers / personal dashboard, add globs.
      include: [
        'lib/orca/**',
        'app/api/orca/**',
        'app/api/chat/**',
        'components/orca/**',
        'components/onboarding/**',
      ],
      exclude: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        '**/types.ts',
        '**/types.d.ts',
      ],
      thresholds: {
        // Per §3.5.3: 70% lines on the new orchestrator + renderer code.
        // Enforced once those files exist; the per-file overrides are
        // added in step 4.C when the orchestrator lands.
        lines: 0,
        branches: 0,
        functions: 0,
        statements: 0,
      },
    },
  },
})
