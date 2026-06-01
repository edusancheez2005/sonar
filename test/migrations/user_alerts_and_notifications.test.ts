import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260603_user_alerts_and_notifications.sql'),
  'utf8'
)

describe('20260603_user_alerts_and_notifications.sql', () => {
  it('creates the user_alerts table', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.user_alerts/)
  })

  it('creates the user_notifications table', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.user_notifications/)
  })

  it('constrains ticker shape', () => {
    expect(SQL).toMatch(/ticker[\s\S]*CHECK[\s\S]*\^\[A-Z0-9\._-\]\{1,12\}\$/)
  })

  it('constrains kind to the four supported kinds', () => {
    expect(SQL).toMatch(/kind[\s\S]*CHECK[\s\S]*price_move/)
    expect(SQL).toMatch(/whale_flow/)
    expect(SQL).toMatch(/signal_flip/)
    expect(SQL).toMatch(/news_high_impact/)
  })

  it('cascades on auth.users delete (GDPR)', () => {
    expect(SQL).toMatch(/REFERENCES auth\.users\(id\) ON DELETE CASCADE/)
  })

  it('enforces a per-rule-per-hour dedup unique index', () => {
    expect(SQL).toMatch(/UNIQUE\s*\(\s*user_id,\s*rule_id,\s*dedup_hour\s*\)/)
  })

  it('enforces a unique rule per user+ticker+kind', () => {
    expect(SQL).toMatch(/UNIQUE\s*\(\s*user_id,\s*ticker,\s*kind\s*\)/)
  })

  it('enables RLS on both tables', () => {
    expect(SQL).toMatch(/ALTER TABLE public\.user_alerts ENABLE ROW LEVEL SECURITY/)
    expect(SQL).toMatch(/ALTER TABLE public\.user_notifications ENABLE ROW LEVEL SECURITY/)
  })

  it('adds notification preference columns to user_profile', () => {
    expect(SQL).toMatch(/notifications_in_app/)
    expect(SQL).toMatch(/notifications_email/)
    expect(SQL).toMatch(/notifications_quiet_hours_utc/)
    expect(SQL).toMatch(/notifications_last_email_at/)
  })

  it('extends orca_traces to accept the alerts and inline_tile stages', () => {
    expect(SQL).toMatch(/orca_traces_stage_check/)
    expect(SQL).toMatch(/'alerts'/)
    expect(SQL).toMatch(/'inline_tile'/)
  })

  it('relaxes orca_traces NOT NULL on user_id / message_id', () => {
    expect(SQL).toMatch(/orca_traces\s+ALTER COLUMN user_id DROP NOT NULL/)
    expect(SQL).toMatch(/orca_traces\s+ALTER COLUMN message_id DROP NOT NULL/)
  })
})
