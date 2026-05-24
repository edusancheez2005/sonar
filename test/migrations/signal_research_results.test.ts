import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260601_signal_research_results.sql'),
  'utf8'
)

describe('20260601_signal_research_results.sql', () => {
  it('creates the table', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.signal_research_results/)
  })

  it('constrains window to the three supported buckets', () => {
    expect(SQL).toMatch(/window\s+text NOT NULL CHECK \(window IN \('24h', '3d', '7d'\)\)/)
  })

  it('constrains win_rate to [0,1] when not null', () => {
    expect(SQL).toMatch(/win_rate >= 0 AND win_rate <= 1/)
  })

  it('enables RLS and defines NO end-user policy', () => {
    expect(SQL).toMatch(/ENABLE ROW LEVEL SECURITY/)
    expect(SQL).not.toMatch(/CREATE POLICY[\s\S]*FOR SELECT[\s\S]*authenticated/i)
    expect(SQL).not.toMatch(/CREATE POLICY[\s\S]*FOR SELECT[\s\S]*anon/i)
  })

  it('indexes (signal_name, window, tested_at DESC) for lookups', () => {
    expect(SQL).toMatch(/idx_signal_research_results_name_window/)
    expect(SQL).toMatch(/signal_name, window, tested_at DESC/)
  })

  it('defaults clean_only to true', () => {
    expect(SQL).toMatch(/clean_only\s+boolean NOT NULL DEFAULT true/)
  })

  it('has a comment that warns against surfacing in user UI', () => {
    expect(SQL).toMatch(/COMMENT ON TABLE public\.signal_research_results IS/)
    expect(SQL).toMatch(/Service-role read\/write only/)
  })
})
