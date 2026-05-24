import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260526_orca_traces.sql'),
  'utf8'
)

describe('20260526_orca_traces.sql', () => {
  it('creates the orca_traces table', () => {
    expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.orca_traces/)
  })

  it('uses a CHECK constraint on stage', () => {
    expect(SQL).toMatch(/stage TEXT NOT NULL CHECK \(stage IN \(/)
  })

  it('cascades on auth.users delete (GDPR)', () => {
    expect(SQL).toMatch(/REFERENCES auth\.users\(id\) ON DELETE CASCADE/)
  })

  it('enables RLS and has a select_own policy', () => {
    expect(SQL).toMatch(/ALTER TABLE public\.orca_traces ENABLE ROW LEVEL SECURITY/)
    expect(SQL).toMatch(/CREATE POLICY orca_traces_select_own[\s\S]*auth\.uid\(\) = user_id/)
  })

  it('has the user+created_at composite index', () => {
    expect(SQL).toMatch(/idx_orca_traces_user_created[\s\S]*user_id, created_at DESC/)
  })

  it('payload column is jsonb', () => {
    expect(SQL).toMatch(/payload JSONB NOT NULL/)
  })
})
