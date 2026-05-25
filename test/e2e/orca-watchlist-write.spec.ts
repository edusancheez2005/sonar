/**
 * ORCA watchlist write — Playwright e2e gate (v4 §5.4)
 * =============================================================================
 * This is the SINGLE e2e spec that holds the write-loop line in CI. If it
 * fails, the build fails. The 9 steps below come verbatim from
 * ORCA_UNIFIED_COPILOT_PROMPT_V4.md §5.4:
 *
 *   1. Sign in as a fixture user (env: E2E_USER_EMAIL / E2E_USER_PASSWORD).
 *   2. Open /dashboard/personal. Assert PulseStrip renders.
 *   3. Press Cmd+K. Assert drawer opens.
 *   4. Type "add BTC to my watchlist". Submit.
 *   5. Assert a Confirm button appears within 1500ms.
 *   6. Click Confirm.
 *   7. Assert the success bubble appears within 1500ms.
 *   8. Close drawer. Switch to Watchlist tab. Assert a row with BTC is visible.
 *   9. Open drawer again. Type "remove BTC". Submit. Confirm. Assert row gone.
 *
 * Plus §8: the success bubble MUST contain the "Disclaimer" anchor text.
 *
 * The spec self-skips when the preview-URL / credentials env vars are
 * absent, so it never blocks local vitest or a developer's machine.
 */
import { test, expect, type Page } from '@playwright/test'

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD
const E2E_BASE_URL = process.env.E2E_BASE_URL

test.describe('ORCA watchlist write loop (v4 §5.4)', () => {
  test.skip(
    !E2E_BASE_URL || !E2E_USER_EMAIL || !E2E_USER_PASSWORD,
    'Set E2E_BASE_URL, E2E_USER_EMAIL, E2E_USER_PASSWORD to run this gate.'
  )

  // Helpers --------------------------------------------------------------

  async function signIn(page: Page) {
    await page.goto('/auth/login')
    await page
      .getByLabel(/email/i)
      .first()
      .fill(E2E_USER_EMAIL!)
    await page
      .getByLabel(/password/i)
      .first()
      .fill(E2E_USER_PASSWORD!)
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), {
        timeout: 15_000,
      }),
      page
        .getByRole('button', { name: /sign in|log in|continue/i })
        .first()
        .click(),
    ])
  }

  async function openDrawerWithCmdK(page: Page) {
    const isMac = process.platform === 'darwin'
    await page.keyboard.press(isMac ? 'Meta+K' : 'Control+K')
    await expect(page.getByTestId('orca-drawer')).toBeVisible({ timeout: 3_000 })
  }

  async function sendDrawerMessage(page: Page, text: string) {
    const input = page
      .getByTestId('orca-drawer')
      .getByTestId('orca-conv-input')
    await input.fill(text)
    await page
      .getByTestId('orca-drawer')
      .getByTestId('orca-conv-send')
      .click()
  }

  async function confirmPendingWrite(page: Page) {
    const confirmBtn = page
      .getByTestId('orca-drawer')
      .getByTestId('orca-conv-confirm')
    await expect(confirmBtn).toBeVisible({ timeout: 1_500 })
    await confirmBtn.click()
  }

  // The actual flow ------------------------------------------------------

  test('add BTC, see watchlist row, remove BTC, row goes away', async ({ page }) => {
    // 1. Sign in.
    await signIn(page)

    // 2. Open Personal Dashboard. Assert PulseStrip renders.
    await page.goto('/dashboard/personal')
    await expect(page.getByTestId('pulse-strip')).toBeVisible({ timeout: 10_000 })

    // 3. Cmd+K opens the drawer.
    await openDrawerWithCmdK(page)

    // 4. Type "add BTC to my watchlist", submit.
    await sendDrawerMessage(page, 'add BTC to my watchlist')

    // 5. Confirm button appears within 1.5s (fast-write path).
    await confirmPendingWrite(page)

    // 7. Success bubble appears within 1.5s and contains Disclaimer (v4 §8).
    const drawer = page.getByTestId('orca-drawer')
    await expect(drawer.getByText(/added|watchlist/i).last()).toBeVisible({
      timeout: 1_500,
    })
    await expect(drawer.getByText(/disclaimer/i)).toBeVisible()

    // 8. Close drawer, switch to Watchlist tab, BTC row is visible.
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 2_000 })
    await page.getByRole('tab', { name: /watchlist/i }).click()
    await expect(
      page.getByRole('row', { name: /\bBTC\b/i }).first()
    ).toBeVisible({ timeout: 5_000 })

    // 9. Reopen drawer, ask to remove, confirm, row disappears.
    await openDrawerWithCmdK(page)
    await sendDrawerMessage(page, 'remove BTC')
    await confirmPendingWrite(page)
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 2_000 })
    await expect(
      page.getByRole('row', { name: /\bBTC\b/i }).first()
    ).toBeHidden({ timeout: 5_000 })
  })
})
