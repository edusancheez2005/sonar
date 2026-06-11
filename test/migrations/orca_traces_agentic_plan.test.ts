import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260611_orca_traces_agentic_plan_stage.sql'),
  'utf8'
)

describe('20260611_orca_traces_agentic_plan_stage.sql', () => {
  it('drops the old stage CHECK constraint before re-adding (idempotent)', () => {
    expect(SQL).toMatch(/DROP CONSTRAINT IF EXISTS orca_traces_stage_check/)
  })

  it('adds agentic_plan to the allowed stage set', () => {
    expect(SQL).toMatch(/ADD CONSTRAINT orca_traces_stage_check[\s\S]*'agentic_plan'/)
  })

  it('preserves every previously-allowed stage (no regression)', () => {
    for (const stage of [
      'router', 'planner', 'tool', 'writer', 'guardrails',
      'orchestrator', 'inline_tile', 'alerts',
    ]) {
      expect(SQL).toContain(`'${stage}'`)
    }
  })
})
