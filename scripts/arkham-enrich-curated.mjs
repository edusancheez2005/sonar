#!/usr/bin/env node
/**
 * arkham-enrich-curated.mjs — Prompt 2, Step 3.
 *
 * For each entity in data/curated-entities-manifest.json that has an
 * `arkham_slug`, calls /intelligence/entity/{arkham_slug} and writes the
 * result back to curated_entities.arkham_* columns.
 *
 * Cost: 1 credit per entity (cheap endpoint, no HEAVY throttle). 54 mapped
 * entries → ~54 credits. Skips rows already synced within --max-age (default
 * 30 days) so re-runs are free.
 *
 * Usage:
 *   node scripts/arkham-enrich-curated.mjs                      # all due
 *   node scripts/arkham-enrich-curated.mjs --slug=binance       # one
 *   node scripts/arkham-enrich-curated.mjs --limit=10           # cap
 *   node scripts/arkham-enrich-curated.mjs --force              # ignore TTL
 *   node scripts/arkham-enrich-curated.mjs --dry-run            # no writes
 *
 * Logs every call (incl. 404s) to arkham_call_log so the admin dashboard
 * spend projection stays accurate.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ---------- env loader (no dotenv dep) ----------
function loadEnv() {
  try {
    const raw = readFileSync(resolve(REPO_ROOT, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.warn('[enrich] could not read .env.local:', e.message);
  }
}
loadEnv();

const ARKHAM_KEY = process.env.ARKHAM_API_KEY_1 || process.env.ARKHAM_API_KEY;
const ARKHAM_BASE = (process.env.ARKHAM_BASE_URL || 'https://api.arkm.com').replace(/\/+$/, '');
const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!ARKHAM_KEY) { console.error('FATAL: ARKHAM_API_KEY_1 not set'); process.exit(1); }
if (!SUPA_URL || !SUPA_KEY) { console.error('FATAL: SUPABASE_URL / SUPABASE_SERVICE_ROLE not set'); process.exit(1); }

// ---------- args ----------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE   = args.includes('--force');
const SLUG    = (args.find(a => a.startsWith('--slug='))    || '').slice('--slug='.length)    || null;
const LIMIT   = parseInt((args.find(a => a.startsWith('--limit='))   || '').slice('--limit='.length), 10) || Infinity;
const MAX_AGE_DAYS = parseInt((args.find(a => a.startsWith('--max-age=')) || '').slice('--max-age='.length), 10) || 30;

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// ---------- helpers ----------
async function logCall(endpoint, status, ms, cost, reason) {
  try {
    await supabase.from('arkham_call_log').insert({
      endpoint, method: 'GET', cost, status, ms, cache_hit: false,
      source: 'backfill', reason,
    });
  } catch (e) {
    console.warn('[enrich] log failed:', e.message);
  }
}

async function arkhamGet(path) {
  const url = `${ARKHAM_BASE}${path}`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'API-Key': ARKHAM_KEY, 'Accept': 'application/json' },
  });
  const ms = Date.now() - t0;
  let body = null;
  const text = await res.text();
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, ms, body };
}

function loadManifest() {
  const raw = readFileSync(resolve(REPO_ROOT, 'data', 'curated-entities-manifest.json'), 'utf8');
  return JSON.parse(raw).entities;
}

// ---------- main ----------
async function main() {
  const entities = loadManifest().filter(e => e.arkham_slug && (!SLUG || e.slug === SLUG));
  console.log(`[enrich] manifest entries with arkham_slug: ${entities.length}`);

  // Read current arkham_synced_at for TTL filter.
  const slugs = entities.map(e => e.slug);
  const { data: existing, error: readErr } = await supabase
    .from('curated_entities')
    .select('slug, arkham_synced_at, arkham_entity_id')
    .in('slug', slugs);
  if (readErr) { console.error('read failed:', readErr.message); process.exit(1); }
  const bySlug = new Map((existing || []).map(r => [r.slug, r]));

  const now = Date.now();
  const ttlMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const due = entities.filter(e => {
    if (FORCE) return true;
    const row = bySlug.get(e.slug);
    if (!row?.arkham_synced_at) return true;
    return (now - new Date(row.arkham_synced_at).getTime()) > ttlMs;
  }).slice(0, LIMIT);

  console.log(`[enrich] due (after TTL filter): ${due.length}${LIMIT < Infinity ? ` (capped at ${LIMIT})` : ''}`);
  if (DRY_RUN) {
    for (const e of due) console.log(`  would enrich  ${e.slug.padEnd(28)} arkham_slug=${e.arkham_slug}`);
    return;
  }

  let ok = 0, miss = 0, err = 0;
  for (const e of due) {
    const path = `/intelligence/entity/${encodeURIComponent(e.arkham_slug)}`;
    let result;
    try {
      result = await arkhamGet(path);
    } catch (netErr) {
      console.error(`✗ ${e.slug.padEnd(28)} network error: ${netErr.message}`);
      await logCall(`/intelligence/entity/${e.arkham_slug}`, null, 0, 1, 'enrich:network_error');
      err++;
      continue;
    }
    await logCall(`/intelligence/entity/${e.arkham_slug}`, result.status, result.ms, 1, 'enrich:curated');

    if (result.status === 404 || result.status === 400) {
      console.log(`· ${e.slug.padEnd(28)} not on Arkham (HTTP ${result.status})`);
      await supabase.from('curated_entities').update({
        arkham_entity_id: null,
        arkham_synced_at: new Date().toISOString(),
        arkham_raw: { _missing: true, status: result.status },
      }).eq('slug', e.slug);
      miss++;
      continue;
    }

    if (result.status !== 200 || !result.body || typeof result.body !== 'object') {
      console.error(`✗ ${e.slug.padEnd(28)} HTTP ${result.status}`);
      err++;
      continue;
    }

    const ent = result.body;
    const { error: upErr } = await supabase.from('curated_entities').update({
      arkham_entity_id: ent.id ?? e.arkham_slug,
      arkham_entity_type: ent.type ?? null,
      arkham_synced_at: new Date().toISOString(),
      arkham_raw: ent,
    }).eq('slug', e.slug);

    if (upErr) {
      console.error(`✗ ${e.slug.padEnd(28)} db: ${upErr.message}`);
      err++;
    } else {
      console.log(`✓ ${e.slug.padEnd(28)} type=${(ent.type ?? '?').padEnd(12)} id=${ent.id}`);
      ok++;
    }

    // Light pacing (Arkham standard limit = 20 req/sec).
    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`\n[enrich] done. ok=${ok}  missing=${miss}  errors=${err}  spent≈${ok + miss + err} credits`);
}

main().catch(e => { console.error('fatal:', e); process.exit(1); });
