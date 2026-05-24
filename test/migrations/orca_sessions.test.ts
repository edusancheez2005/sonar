import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SQL = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260603_orca_sessions.sql'),
  'utf8'
)

describe('20260603_orca_sessions.sql', () => {
  describe('orca_sessions', () => {
    it('creates the orca_sessions table', () => {
      expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.orca_sessions/)
    })

    it('uses uuid primary key with gen_random_uuid default', () => {
      expect(SQL).toMatch(/id\s+UUID PRIMARY KEY DEFAULT gen_random_uuid\(\)/)
    })

    it('restricts surface_seed to drawer|studio|mini', () => {
      expect(SQL).toMatch(/surface_seed\s+TEXT CHECK \(surface_seed IN \('drawer', 'studio', 'mini'\)/)
    })

    it('cascades on auth.users delete (GDPR)', () => {
      expect(SQL).toMatch(/orca_sessions[\s\S]*REFERENCES auth\.users\(id\) ON DELETE CASCADE/)
    })

    it('archived defaults to false', () => {
      expect(SQL).toMatch(/archived\s+BOOLEAN NOT NULL DEFAULT false/)
    })

    it('enables RLS', () => {
      expect(SQL).toMatch(/ALTER TABLE public\.orca_sessions ENABLE ROW LEVEL SECURITY/)
    })

    it('has self-only policies for SELECT/INSERT/UPDATE/DELETE', () => {
      for (const op of ['select', 'insert', 'update', 'delete']) {
        expect(SQL).toMatch(new RegExp(`CREATE POLICY orca_sessions_${op}_own`))
      }
      expect(SQL).toMatch(/user_id = auth\.uid\(\)/)
    })

    it('has the user+updated_at and active indexes', () => {
      expect(SQL).toMatch(/idx_orca_sessions_user_updated[\s\S]*user_id, updated_at DESC/)
      expect(SQL).toMatch(/idx_orca_sessions_active[\s\S]*WHERE archived = false/)
    })
  })

  describe('orca_messages', () => {
    it('creates the orca_messages table', () => {
      expect(SQL).toMatch(/CREATE TABLE IF NOT EXISTS public\.orca_messages/)
    })

    it('restricts role to user|assistant|tool|system', () => {
      expect(SQL).toMatch(/role\s+TEXT NOT NULL CHECK \(role IN \('user', 'assistant', 'tool', 'system'\)\)/)
    })

    it('cascades when parent session is deleted', () => {
      expect(SQL).toMatch(/session_id\s+UUID NOT NULL REFERENCES public\.orca_sessions\(id\) ON DELETE CASCADE/)
    })

    it('cascades on auth.users delete (GDPR)', () => {
      expect(SQL).toMatch(/orca_messages[\s\S]*REFERENCES auth\.users\(id\) ON DELETE CASCADE/)
    })

    it('stores tool_calls, sources, follow_ups, focus, confirm as JSONB', () => {
      for (const col of ['tool_calls', 'sources', 'follow_ups', 'focus', 'confirm']) {
        expect(SQL).toMatch(new RegExp(`${col}\\s+JSONB`))
      }
    })

    it('enables RLS with self-only SELECT/INSERT/DELETE (no UPDATE: immutable)', () => {
      expect(SQL).toMatch(/ALTER TABLE public\.orca_messages ENABLE ROW LEVEL SECURITY/)
      expect(SQL).toMatch(/CREATE POLICY orca_messages_select_own/)
      expect(SQL).toMatch(/CREATE POLICY orca_messages_insert_own/)
      expect(SQL).toMatch(/CREATE POLICY orca_messages_delete_own/)
      expect(SQL).not.toMatch(/CREATE POLICY orca_messages_update_own/)
    })
  })

  describe('updated_at bump trigger', () => {
    it('defines orca_sessions_bump_updated_at function', () => {
      expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION public\.orca_sessions_bump_updated_at/)
    })

    it('installs AFTER INSERT trigger on orca_messages', () => {
      expect(SQL).toMatch(/CREATE TRIGGER trg_orca_messages_bump_session[\s\S]*AFTER INSERT ON public\.orca_messages/)
    })
  })
})
