import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260604_alerts_wallet_news_social.sql'),
  'utf8'
)

describe('20260604_alerts_wallet_news_social.sql', () => {
  it('adds address and chain columns', () => {
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS address text/)
    expect(SQL).toMatch(/ADD COLUMN IF NOT EXISTS chain\s+text/)
  })

  it('relaxes the NOT NULL on ticker', () => {
    expect(SQL).toMatch(/ALTER COLUMN ticker DROP NOT NULL/)
  })

  it('expands the kind whitelist with the three new kinds', () => {
    expect(SQL).toMatch(/'wallet_activity'/)
    expect(SQL).toMatch(/'news_any'/)
    expect(SQL).toMatch(/'social_post'/)
  })

  it('requires an address for wallet alerts and a ticker otherwise', () => {
    expect(SQL).toMatch(/chk_target_shape/)
    expect(SQL).toMatch(/kind = 'wallet_activity' AND address IS NOT NULL/)
  })

  it('adds a partial unique index for wallet rules', () => {
    expect(SQL).toMatch(/uq_user_alerts_wallet/)
    expect(SQL).toMatch(/user_id,\s*address,\s*kind\)\s*WHERE address IS NOT NULL/)
  })

  it('uses ALTER TABLE IF EXISTS so it is order-independent', () => {
    expect(SQL).toMatch(/ALTER TABLE IF EXISTS public\.user_alerts/)
  })
})
