#!/usr/bin/env node
/**
 * Arkham API probe — Prompt 1, Step 1.
 *
 * Runs ~10 calls (≤15 credits) against api.arkm.com to discover:
 *   - Real response shapes per endpoint
 *   - Per-call credit weight (via x-credit-* / x-ratelimit-* headers, if any)
 *   - Solana attribution depth
 *   - HEAVY endpoint behavior
 *
 * Output: scripts/arkham-probe.log (gitignored), structured JSON, one entry per call.
 * Pure Node, no external deps. Reads ARKHAM_API_KEY_1 (or ARKHAM_API_KEY) from .env.local.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const LOG_PATH = resolve(REPO_ROOT, 'scripts', 'arkham-probe.log');

// ---------- env loader (avoid pulling dotenv) ----------
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
    console.warn('[probe] could not read .env.local:', e.message);
  }
}
loadEnv();

const KEY = process.env.ARKHAM_API_KEY_1 || process.env.ARKHAM_API_KEY;
const BASE = process.env.ARKHAM_BASE_URL || 'https://api.arkm.com';
if (!KEY) {
  console.error('FATAL: ARKHAM_API_KEY_1 (or ARKHAM_API_KEY) not set in .env.local');
  process.exit(1);
}

// ---------- probe definition ----------
const CALLS = [
  { name: '01_chains',                 path: '/chains' },
  { name: '02_addr_all_vitalik',       path: '/intelligence/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/all?tags=true' },
  { name: '03_addr_single_vitalik',    path: '/intelligence/address/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?chain=ethereum' },
  { name: '04_addr_solana_binance',    path: '/intelligence/address/9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM?chain=solana' },
  { name: '05_entity_binance',         path: '/intelligence/entity/binance' },
  { name: '06_balances_binance',       path: '/balances/entity/binance' },
  { name: '07_predictions_binance',    path: '/intelligence/entity/binance/predictions' },
  { name: '08_counterparties_winter',  path: '/counterparties/entity/wintermute?flow=either&limit=10&timeLast=7d', heavy: true },
  { name: '09_transfers_recent',       path: '/transfers?usdGte=5000000&timeLast=24h&limit=20', heavy: true },
  { name: '10_token_holders_usdt',     path: '/token/holders/ethereum/0xdAC17F958D2ee523a2206206994597C13D831ec7?limit=10' },
];

// ---------- header keys we care about ----------
const HEADER_PATTERNS = [
  /^x-ratelimit-/i,
  /^x-credit/i,
  /^x-credits/i,
  /^x-quota/i,
  /^retry-after/i,
  /^x-rate-/i,
  /^ratelimit-/i,
];

function pickInterestingHeaders(headers) {
  const out = {};
  for (const [k, v] of headers.entries()) {
    if (HEADER_PATTERNS.some((re) => re.test(k))) {
      out[k] = v;
    }
  }
  return out;
}

async function runOne(call) {
  const url = `${BASE}${call.path}`;
  const t0 = Date.now();
  let status = 0;
  let headersInteresting = {};
  let allHeaders = {};
  let bodySnippet = '';
  let parsedKeys = null;
  let error = null;
  try {
    const r = await fetch(url, {
      headers: { 'API-Key': KEY, 'Accept': 'application/json' },
    });
    status = r.status;
    headersInteresting = pickInterestingHeaders(r.headers);
    // Capture full headers too so we don't miss something unexpected
    for (const [k, v] of r.headers.entries()) allHeaders[k] = v;
    const text = await r.text();
    bodySnippet = text.slice(0, 800);
    try {
      const j = JSON.parse(text);
      if (Array.isArray(j)) {
        parsedKeys = { __type: 'array', length: j.length, sampleKeys: j[0] ? Object.keys(j[0]).slice(0, 25) : [] };
      } else if (j && typeof j === 'object') {
        parsedKeys = { __type: 'object', topKeys: Object.keys(j).slice(0, 25) };
      }
    } catch { /* not JSON */ }
  } catch (e) {
    error = e?.message || String(e);
  }
  const ms = Date.now() - t0;
  return {
    name: call.name,
    path: call.path,
    heavy: !!call.heavy,
    status,
    ms,
    error,
    headersInteresting,
    allHeaders,
    parsedKeys,
    bodySnippet,
  };
}

// ---------- run sequentially with light pacing for HEAVY endpoints ----------
const results = [];
console.log(`[probe] base=${BASE}  key=${KEY.slice(0, 8)}…  ${CALLS.length} calls`);
for (let i = 0; i < CALLS.length; i++) {
  const call = CALLS[i];
  process.stdout.write(`[probe] ${i + 1}/${CALLS.length}  ${call.name} … `);
  const res = await runOne(call);
  process.stdout.write(`HTTP ${res.status} (${res.ms}ms)\n`);
  results.push(res);
  // 1.2s pause between heavy calls; 250ms between standard
  await new Promise((r) => setTimeout(r, call.heavy ? 1200 : 250));
}

// Re-issue call #1 for header diff after burning credits
process.stdout.write(`[probe] re-issuing 01_chains for fresh quota headers … `);
const reissue = await runOne({ ...CALLS[0], name: '11_chains_reissue' });
process.stdout.write(`HTTP ${reissue.status} (${reissue.ms}ms)\n`);
results.push(reissue);

const summary = {
  ranAt: new Date().toISOString(),
  base: BASE,
  keyPrefix: KEY.slice(0, 8),
  callCount: results.length,
  results,
};

writeFileSync(LOG_PATH, JSON.stringify(summary, null, 2));
console.log(`\n[probe] wrote ${LOG_PATH}`);
console.log(`[probe] summary:`);
for (const r of results) {
  const credit = r.headersInteresting['x-credits-used'] || r.headersInteresting['x-credit-used'] || r.headersInteresting['x-credit-cost'] || '?';
  const remaining = r.headersInteresting['x-credits-remaining'] || r.headersInteresting['x-credit-remaining'] || r.headersInteresting['x-quota-remaining'] || '?';
  console.log(`  ${r.name.padEnd(30)} HTTP ${r.status}  ${r.ms.toString().padStart(5)}ms  credit=${credit}  remaining=${remaining}`);
}
