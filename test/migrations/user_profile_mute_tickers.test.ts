import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260604_user_profile_mute_tickers.sql'),
  'utf8'
)

describe('20260604_user_profile_mute_tickers.sql', () => {
  it('adds the muted_tickers column with an empty-array default', () => {
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS muted_tickers text\[\] NOT NULL DEFAULT '\{\}'::text\[\]/)
  })

  it('adds the muted_tickers_until expiry column', () => {
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS muted_tickers_until timestamptz/)
  })

  it('targets the user_profile table', () => {
    expect(SQL).toMatch(/ALTER TABLE public\.user_profile/)
  })

  it('documents both columns with COMMENT statements', () => {
    expect(SQL).toMatch(/COMMENT ON COLUMN public\.user_profile\.muted_tickers IS/)
    expect(SQL).toMatch(/COMMENT ON COLUMN public\.user_profile\.muted_tickers_until IS/)
  })

  it('is idempotent (uses IF NOT EXISTS)', () => {
    const occurrences = SQL.match(/ADD COLUMN IF NOT EXISTS/g) || []
    expect(occurrences.length).toBeGreaterThanOrEqual(2)
  })
})
