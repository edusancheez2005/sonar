import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260602_user_wallets.sql'),
  'utf8'
)

describe('20260602_user_wallets.sql', () => {
  it('creates the user_wallets table', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.user_wallets/)
  })

  it('cascades on auth.users delete (GDPR)', () => {
    expect(SQL).toMatch(/REFERENCES auth\.users\(id\) ON DELETE CASCADE/)
  })

  it('constrains chain to the supported set', () => {
    expect(SQL).toMatch(/chain TEXT NOT NULL CHECK \(chain IN \([\s\S]*'eth'[\s\S]*'btc'[\s\S]*'sol'[\s\S]*'base'[\s\S]*'arb'[\s\S]*'polygon'[\s\S]*'bsc'[\s\S]*'tron'[\s\S]*'xrp'/)
  })

  it('has a composite uniqueness constraint to prevent duplicates', () => {
    expect(SQL).toMatch(/UNIQUE \(user_id, address, chain\)/)
  })

  it('enables RLS', () => {
    expect(SQL).toMatch(/ALTER TABLE public\.user_wallets ENABLE ROW LEVEL SECURITY/)
  })

  it('installs select / insert / delete policies pinned to auth.uid()', () => {
    expect(SQL).toMatch(/CREATE POLICY user_wallets_select_own[\s\S]*auth\.uid\(\) = user_id/)
    expect(SQL).toMatch(/CREATE POLICY user_wallets_insert_own[\s\S]*WITH CHECK \(auth\.uid\(\) = user_id\)/)
    expect(SQL).toMatch(/CREATE POLICY user_wallets_delete_own[\s\S]*auth\.uid\(\) = user_id/)
  })

  it('drops policies before recreating them (idempotent)', () => {
    expect(SQL).toMatch(/DROP POLICY IF EXISTS user_wallets_select_own/)
    expect(SQL).toMatch(/DROP POLICY IF EXISTS user_wallets_insert_own/)
    expect(SQL).toMatch(/DROP POLICY IF EXISTS user_wallets_delete_own/)
  })

  it('has a user+created_at composite index for listing', () => {
    expect(SQL).toMatch(/idx_user_wallets_user_created[\s\S]*user_id, created_at DESC/)
  })
})
