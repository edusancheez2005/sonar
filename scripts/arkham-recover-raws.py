#!/usr/bin/env python3
"""Reprocess saved arkham-batch-raw-*.json files into DB rows.

Idempotent (merge-duplicates upserts) — safe over already-processed
batches. Recovers batch 5 of the 2026-07-25 run whose upsert crashed
after the lookups were already spent.
"""
import json, subprocess, os, glob, re, datetime, tempfile

REPO = "/Users/edu/Desktop/Sonar/sonar-1"
HERE = os.path.dirname(os.path.abspath(__file__))
env = {}
for line in open(f"{REPO}/.env.local"):
    m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
    if m: env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
SB, SK = env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"]
now = datetime.datetime.now(datetime.timezone.utc).isoformat()

def sb_post(table, rows, on_conflict):
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(rows, f); tmp = f.name
    try:
        out = subprocess.run(
            ["curl", "-s", "-m", "60", f"{SB}/rest/v1/{table}?on_conflict={on_conflict}",
             "-H", f"apikey: {SK}", "-H", f"Authorization: Bearer {SK}",
             "-H", "Content-Type: application/json",
             "-H", "Prefer: resolution=merge-duplicates,return=minimal",
             "-d", f"@{tmp}"], capture_output=True, text=True).stdout
        if out.strip(): print(f"  sb_post {table}: {out[:150]}", flush=True)
    finally:
        os.unlink(tmp)

tot_hits = tot_miss = 0
for path in sorted(glob.glob(os.path.join(HERE, "arkham-batch-raw-*.json"))):
    got = (json.load(open(path)) or {}).get("addresses") or {}
    uni, misses = [], []
    for key, info in got.items():
        info = info or {}
        ent, lab = info.get("arkhamEntity"), info.get("arkhamLabel")
        if ent or lab:
            uni.append({
                "chain": info.get("chain") or "ethereum",
                "address": info.get("address") or key,
                "arkham_entity_id": (ent or {}).get("id"),
                "arkham_entity_name": (ent or {}).get("name"),
                "arkham_entity_type": (ent or {}).get("type"),
                "arkham_label": (lab or {}).get("name"),
                "arkham_is_contract": bool(info.get("contract")),
                "source": "batch_harvest_20260725",
                "arkham_raw": info,
            })
        else:
            misses.append({"key": f"intel_miss:{key.lower()}",
                           "value": {"checked": now},
                           "ttl_seconds": 90*86400, "written_at": now})
    for j in range(0, len(uni), 300): sb_post("tracked_address_universe", uni[j:j+300], "chain,address")
    for j in range(0, len(misses), 300): sb_post("arkham_cache", misses[j:j+300], "key")
    tot_hits += len(uni); tot_miss += len(misses)
    print(f"{os.path.basename(path)}: hits {len(uni)}, misses {len(misses)}", flush=True)
print(f"RECOVERED: {tot_hits} hits, {tot_miss} misses", flush=True)
