#!/usr/bin/env node
/**
 * arkham-harvest-addresses.mjs — Prompt 2, Step 4.
 *
 * For each curated_entities row with arkham_entity_id, fetches recent
 * transfers and extracts every (chain, address) pair that has an
 * arkhamEntity attribution. Upserts into tracked_address_universe.
 *
 * /transfers is a HEAVY endpoint (1 rps), so we sleep ~1.1s between calls.
 *
 * Cost: 1 credit per entity. ~41 enriched entities → ~41 credits. Skips
 * entities harvested within --max-age (default 30 days).
 *
 * Usage:
 *   node scripts/arkham-harvest-addresses.mjs                # all due
 *   node scripts/arkham-harvest-addresses.mjs --slug=binance # one
 *   node scripts/arkham-harvest-addresses.mjs --limit=10
 *   node scripts/arkham-harvest-addresses.mjs --force
 *   node scripts/arkham-harvest-addresses.mjs --dry-run
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function loadEnv() {
  try {
    const raw = readFileSync(resolve(REPO_ROOT, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      const k = m[1]; let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {}
}
loadEnv();

const ARKHAM_KEY  = process.env.ARKHAM_API_KEY_1 || process.env.ARKHAM_API_KEY;
const ARKHAM_BASE = (process.env.ARKHAM_BASE_URL || 'https://api.arkm.com').replace(/\/+$/, '');
const SUPA_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!ARKHAM_KEY || !SUPA_URL || !SUPA_KEY) {
  console.error('FATAL: missing ARKHAM_API_KEY_1 / SUPABASE creds'); process.exit(1);
}

const args = process.argv.slice(2);
const DRY  = args.includes('--dry-run');
const FORCE = args.includes('--force');
const SLUG  = (args.find(a => a.startsWith('--slug='))    || '').slice('--slug='.length)    || null;
const LIMIT = parseInt((args.find(a => a.startsWith('--limit='))   || '').slice('--limit='.length), 10) || Infinity;
const MAX_AGE_DAYS = parseInt((args.find(a => a.startsWith('--max-age=')) || '').slice('--max-age='.length), 10) || 30;
const TRANSFERS_LIMIT = parseInt((args.find(a => a.startsWith('--transfers='))   || '').slice('--transfers='.length), 10) || 250;

const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function logCall(endpoint, status, ms, cost, reason) {
  try {
    await supabase.from('arkham_call_log').insert({
      endpoint, method: 'GET', cost, status, ms, cache_hit: false,
      source: 'backfill', reason,
    });
  } catch (e) { console.warn('[harvest] log failed:', e.message); }
}

async function arkhamGet(path) {
  const t0 = Date.now();
  const res = await fetch(`${ARKHAM_BASE}${path}`, {
    headers: { 'API-Key': ARKHAM_KEY, 'Accept': 'application/json' },
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, ms, body };
}

/** Drains an array of transfer records into unique address rows. */
function extractAddresses(transfers) {
  const out = new Map(); // key=`${chain}:${address}` → row
  for (const tr of transfers || []) {
    for (const side of ['fromAddress', 'toAddress']) {
      const a = tr[side];
      if (!a || !a.address || !a.chain) continue;
      if (!a.arkhamEntity || !a.arkhamEntity.id) continue; // only attributed
      const key = `${a.chain}:${a.address}`;
      if (out.has(key)) continue;
      out.set(key, {
        chain: a.chain,
        address: a.address,
        arkham_entity_id:    a.arkhamEntity.id,
        arkham_entity_name:  a.arkhamEntity.name ?? null,
        arkham_entity_type:  a.arkhamEntity.type ?? null,
        arkham_label:        a.arkhamLabel?.name ?? null,
        arkham_is_contract:  a.contract ?? null,
        arkham_is_predicted: false,
        source: 'transfers_harvest',
        arkham_raw: a,
      });
    }
  }
  return [...out.values()];
}

async function main() {
  let q = supabase.from('curated_entities')
    .select('slug, arkham_entity_id, arkham_synced_at')
    .not('arkham_entity_id', 'is', null);
  if (SLUG) q = q.eq('slug', SLUG);
  const { data: rows, error } = await q;
  if (error) { console.error('read failed:', error.message); process.exit(1); }

  console.log(`[harvest] enriched curated entities: ${rows.length}`);

  // For TTL, we use a sentinel column on the entity itself: we'll record
  // the latest harvested_at by looking up tracked_address_universe rows for
  // this entity_id. Cheaper: just use arkham_synced_at as a coarse proxy
  // (re-harvest if older than MAX_AGE).
  const now = Date.now();
  const ttlMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  // Look at tracked_address_universe to find the most recent harvest per entity.
  const ids = rows.map(r => r.arkham_entity_id);
  const { data: latest } = await supabase
    .from('tracked_address_universe')
    .select('arkham_entity_id, harvested_at')
    .in('arkham_entity_id', ids)
    .order('harvested_at', { ascending: false });
  const lastByEntity = new Map();
  for (const r of latest || []) {
    if (!lastByEntity.has(r.arkham_entity_id)) lastByEntity.set(r.arkham_entity_id, r.harvested_at);
  }

  const due = rows.filter(r => {
    if (FORCE) return true;
    const last = lastByEntity.get(r.arkham_entity_id);
    if (!last) return true;
    return (now - new Date(last).getTime()) > ttlMs;
  }).slice(0, LIMIT);

  console.log(`[harvest] due (after TTL): ${due.length}${LIMIT < Infinity ? ` (capped at ${LIMIT})` : ''}`);
  if (DRY) {
    for (const r of due) console.log(`  would harvest  ${r.slug.padEnd(28)} arkham_id=${r.arkham_entity_id}`);
    return;
  }

  let okEntities = 0, errEntities = 0, totalAddrs = 0;
  for (const r of due) {
    const path = `/transfers?base=${encodeURIComponent(r.arkham_entity_id)}&limit=${TRANSFERS_LIMIT}&sortKey=time&sortDir=desc`;
    let resp;
    try {
      resp = await arkhamGet(path);
    } catch (netErr) {
      console.error(`✗ ${r.slug.padEnd(28)} network: ${netErr.message}`);
      await logCall('/transfers', null, 0, 1, `harvest:${r.slug}:network`);
      errEntities++;
      await new Promise(s => setTimeout(s, 1100));
      continue;
    }
    await logCall('/transfers', resp.status, resp.ms, 1, `harvest:${r.slug}`);

    if (resp.status !== 200 || !resp.body || !Array.isArray(resp.body.transfers)) {
      console.error(`✗ ${r.slug.padEnd(28)} HTTP ${resp.status}`);
      errEntities++;
      await new Promise(s => setTimeout(s, 1100));
      continue;
    }

    const addrs = extractAddresses(resp.body.transfers);
    if (addrs.length === 0) {
      console.log(`· ${r.slug.padEnd(28)} 0 attributed addresses in ${resp.body.transfers.length} transfers`);
    } else {
      // Stamp harvested_at consistently and upsert in a batch.
      const ts = new Date().toISOString();
      const rowsToWrite = addrs.map(a => ({ ...a, harvested_at: ts }));
      const { error: upErr } = await supabase
        .from('tracked_address_universe')
        .upsert(rowsToWrite, { onConflict: 'chain,address' });
      if (upErr) {
        console.error(`✗ ${r.slug.padEnd(28)} upsert: ${upErr.message}`);
        errEntities++;
      } else {
        const ownAddrs = addrs.filter(a => a.arkham_entity_id === r.arkham_entity_id).length;
        const cpAddrs  = addrs.length - ownAddrs;
        console.log(`✓ ${r.slug.padEnd(28)} addrs=${addrs.length}  own=${ownAddrs}  counterparties=${cpAddrs}`);
        okEntities++;
        totalAddrs += addrs.length;
      }
    }

    // HEAVY rate limit: 1 req/sec. Sleep 1.1s between entities.
    await new Promise(s => setTimeout(s, 1100));
  }

  console.log(`\n[harvest] done. entities ok=${okEntities} err=${errEntities}  addresses upserted=${totalAddrs}  spent≈${due.length} credits`);
}

main().catch(e => { console.error('fatal:', e); process.exit(1); });
