#!/usr/bin/env node
// Re-probe: diagnose 405 + 400 + inspect balances structure for embedded addresses
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
function loadEnv() {
  const raw = readFileSync(resolve(REPO_ROOT, '.env.local'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v = v.slice(1,-1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();
const KEY = process.env.ARKHAM_API_KEY_1;
const BASE = process.env.ARKHAM_BASE_URL || 'https://api.arkm.com';

const CALLS = [
  // Try counterparties with flow=all and flow=in
  { name: 'cp_flow_all',   path: '/counterparties/entity/wintermute?flow=all&limit=5&timeLast=7d' },
  { name: 'cp_flow_in',    path: '/counterparties/entity/wintermute?flow=in&limit=5&timeLast=7d' },
  // Predictions: try POST, or alternative paths
  { name: 'pred_post',     path: '/intelligence/entity/binance/predictions', method: 'POST' },
  { name: 'pred_alt1',     path: '/intelligence/predictions/binance' },
  { name: 'pred_alt2',     path: '/intelligence/entity/binance/addresses' },
  // Look deeper at balances to see if addresses are embedded already
  { name: 'balances_full', path: '/balances/entity/binance', deep: true },
];

const out = [];
for (const c of CALLS) {
  const t0 = Date.now();
  try {
    const r = await fetch(`${BASE}${c.path}`, { method: c.method || 'GET', headers: { 'API-Key': KEY, Accept: 'application/json' } });
    const text = await r.text();
    let topKeys = null;
    try {
      const j = JSON.parse(text);
      if (j && typeof j === 'object' && !Array.isArray(j)) topKeys = Object.keys(j);
      else if (Array.isArray(j)) topKeys = ['__array', `len=${j.length}`, ...(j[0] ? Object.keys(j[0]).slice(0,15) : [])];
    } catch {}
    const snippet = c.deep ? text.slice(0, 4000) : text.slice(0, 600);
    out.push({ name: c.name, status: r.status, ms: Date.now()-t0, topKeys, snippet });
    console.log(`${c.name.padEnd(20)} HTTP ${r.status}  topKeys=${JSON.stringify(topKeys)?.slice(0,120)}`);
  } catch (e) {
    console.log(`${c.name} ERR ${e.message}`);
  }
  await new Promise(r=>setTimeout(r,1200));
}
writeFileSync(resolve(REPO_ROOT,'scripts/arkham-probe2.log'), JSON.stringify(out, null, 2));
console.log('\nwrote scripts/arkham-probe2.log');
