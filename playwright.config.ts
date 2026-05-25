/**
 * Playwright configuration — v4 §5.4
 * =============================================================================
 * Single e2e gate that holds the ORCA write-loop line:
 * `test/e2e/orca-watchlist-write.spec.ts`
 *
 * This config is intentionally minimal. Local devs do not need Playwright to
 * pass vitest. CI runs:
 *   npm ci
 *   npx playwright install --with-deps chromium
 *   E2E_BASE_URL=https://<preview>.vercel.app \
 *   E2E_USER_EMAIL=… E2E_USER_PASSWORD=… npm run test:e2e
 *
 * If E2E_BASE_URL is not set, the spec self-skips so prebuild stays green
 * on hosts without a preview URL.
 */
import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
