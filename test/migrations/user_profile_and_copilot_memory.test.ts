import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural smoke tests for the §4.B personalisation migration.
 *
 * These assert shape (right tables, RLS enabled, right policies, right FKs,
 * locked-decision constraints) without needing a live Supabase. They catch
 * regressions if anyone reorders the file or accidentally drops an RLS line.
 */

const SQL_PATH = resolve(
  __dirname,
  '../../supabase/migrations/20260525_user_profile_and_copilot_memory.sql'
);

const sql = readFileSync(SQL_PATH, 'utf8');
const sqlLower = sql.toLowerCase();

const TABLES = ['user_profile', 'user_holdings', 'user_watchlist', 'orca_memory'] as const;

describe('migration: 20260525_user_profile_and_copilot_memory', () => {
  describe('table creation', () => {
    for (const t of TABLES) {
      it(`creates public.${t}`, () => {
        const re = new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${t}\\b`, 'i');
        expect(sql).toMatch(re);
      });
    }
  });

  describe('foreign keys cascade to auth.users', () => {
    for (const t of TABLES) {
      it(`${t}.user_id references auth.users(id) ON DELETE CASCADE`, () => {
        // Each table block must contain the cascade clause on its user_id FK.
        const blockStart = sqlLower.indexOf(`create table if not exists public.${t}`);
        const blockEnd = sqlLower.indexOf(');', blockStart);
        const block = sql.slice(blockStart, blockEnd);
        expect(block).toMatch(/references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i);
      });
    }
  });

  describe('row-level security', () => {
    for (const t of TABLES) {
      it(`enables RLS on ${t}`, () => {
        const re = new RegExp(`alter\\s+table\\s+public\\.${t}\\s+enable\\s+row\\s+level\\s+security`, 'i');
        expect(sql).toMatch(re);
      });

      it(`${t} has select/insert/update/delete policies scoped to auth.uid()`, () => {
        for (const verb of ['select', 'insert', 'update', 'delete']) {
          const re = new RegExp(`create\\s+policy\\s+${t}_${verb}_own[\\s\\S]*?auth\\.uid\\(\\)\\s*=\\s*user_id`, 'i');
          expect(sql, `${t} missing ${verb} policy`).toMatch(re);
        }
      });
    }
  });

  describe('locked decisions', () => {
    it('user_holdings.approx_usd_value is bucketed text (no numeric dollars)', () => {
      // Must NOT be numeric, must be text with the bucketed enum check.
      expect(sql).toMatch(/approx_usd_value\s+text\s+check\s*\(approx_usd_value\s+in\s*\(\s*'<1k'\s*,\s*'1k-10k'\s*,\s*'10k-100k'\s*,\s*'100k\+'\s*\)\s*\)/i);
      expect(sql).not.toMatch(/approx_usd_value\s+numeric/i);
    });

    it('orca_memory.expires_at is nullable (no default = persistent by default)', () => {
      // Column declared as plain timestamptz with no DEFAULT and no NOT NULL.
      expect(sql).toMatch(/expires_at\s+timestamptz\s*\n/i);
      expect(sql).not.toMatch(/expires_at\s+timestamptz[^\n]*default/i);
      expect(sql).not.toMatch(/expires_at\s+timestamptz[^\n]*not\s+null/i);
    });

    it('user_profile has personalization_dismissed boolean default false', () => {
      expect(sql).toMatch(/personalization_dismissed\s+boolean\s+not\s+null\s+default\s+false/i);
    });
  });

  describe('check constraints reject unknown enum values', () => {
    const enumCases: Array<[string, string[]]> = [
      ['experience_level', ['new', 'intermediate', 'advanced']],
      ['primary_goal', ['learn', 'track', 'research', 'trade']],
      ['risk_tolerance', ['conservative', 'balanced', 'aggressive']],
      ['time_horizon', ['intraday', 'swing', 'position', 'long_term']],
      ['notification_style', ['quiet', 'balanced', 'frequent']],
      ['jurisdiction_hint', ['US', 'UK', 'EU', 'OTHER']],
    ];

    for (const [col, values] of enumCases) {
      it(`${col} check constraint lists exactly ${values.join('/')}`, () => {
        const list = values.map((v) => `'${v}'`).join('\\s*,\\s*');
        const re = new RegExp(`${col}\\s+text\\s+check\\s*\\(\\s*${col}\\s+in\\s*\\(\\s*${list}\\s*\\)\\s*\\)`, 'i');
        expect(sql).toMatch(re);
      });
    }
  });

  describe('indices', () => {
    it('indexes user_holdings(user_id, ticker)', () => {
      expect(sql).toMatch(/create\s+index\s+if\s+not\s+exists\s+\w+\s+on\s+public\.user_holdings\s*\(\s*user_id\s*,\s*ticker\s*\)/i);
    });

    it('indexes user_watchlist(user_id)', () => {
      expect(sql).toMatch(/create\s+index\s+if\s+not\s+exists\s+\w+\s+on\s+public\.user_watchlist\s*\(\s*user_id\s*\)/i);
    });

    it('indexes orca_memory(user_id, expires_at)', () => {
      expect(sql).toMatch(/create\s+index\s+if\s+not\s+exists\s+\w+\s+on\s+public\.orca_memory\s*\(\s*user_id\s*,\s*expires_at\s*\)/i);
    });
  });

  describe('updated_at trigger on user_profile', () => {
    it('defines the trigger function', () => {
      expect(sql).toMatch(/create\s+or\s+replace\s+function\s+public\.user_profile_set_updated_at/i);
      expect(sql).toMatch(/new\.updated_at\s*:=\s*now\(\)/i);
    });

    it('binds the trigger BEFORE UPDATE on user_profile', () => {
      expect(sql).toMatch(/create\s+trigger\s+trg_user_profile_updated_at\s+before\s+update\s+on\s+public\.user_profile/i);
    });
  });

  describe('safety', () => {
    it('does not DROP or ALTER any pre-existing table', () => {
      // The migration is forward-only and additive. The only ALTER allowed
      // is on tables this migration itself created.
      const alterMatches = sql.match(/alter\s+table\s+public\.([a-z_]+)/gi) ?? [];
      for (const match of alterMatches) {
        const tableName = match.toLowerCase().replace(/.*public\./, '').trim();
        expect(TABLES).toContain(tableName as (typeof TABLES)[number]);
      }
      expect(sql).not.toMatch(/^\s*drop\s+table/im);
    });
  });
});
