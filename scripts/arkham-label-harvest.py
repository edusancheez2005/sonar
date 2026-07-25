#!/usr/bin/env python3
"""Mass label harvest via Arkham /intelligence/address/batch.

Spends the remaining trial label-lookups on permanently attributing our
unlabeled high-value addresses. Hits -> tracked_address_universe (PK
chain,address). Misses -> arkham_cache negative rows so a future run
never re-spends a lookup. Stops when projected intel-usage hits GUARD.
"""
import json, subprocess, sys, time, datetime, os, re

REPO = "/Users/edu/Desktop/Sonar/sonar-1"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
GUARD = 9300           # leave ~700 lookups for crons/ORCA until Aug 1
BATCH = 1000
MAX_BATCHES = 7
EVM_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
SKIP = {"0x0000000000000000000000000000000000000000",
        "0x000000000000000000000000000000000000dead"}

env = {}
for line in open(f"{REPO}/.env.local"):
    m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
    if m: env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
SB, SK, AK = env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"], env["ARKHAM_API_KEY"]

def curl(args, body=None):
    cmd = ["curl", "-s", "-m", "60", "-A", UA] + args
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    return json.loads(out) if out else None

def sb_get(path):
    return curl([f"{SB}/rest/v1/{path}",
                 "-H", f"apikey: {SK}", "-H", f"Authorization: Bearer {SK}"])

def sb_post(table, rows, on_conflict):
    # payload via temp file: 500 rows with arkham_raw exceed ARG_MAX as a
    # literal -d argument (learned batch 5, first run)
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(rows, f)
        tmp = f.name
    try:
        out = subprocess.run(
            ["curl", "-s", "-m", "60", f"{SB}/rest/v1/{table}?on_conflict={on_conflict}",
             "-H", f"apikey: {SK}", "-H", f"Authorization: Bearer {SK}",
             "-H", "Content-Type: application/json",
             "-H", "Prefer: resolution=merge-duplicates,return=minimal",
             "-d", f"@{tmp}"],
            capture_output=True, text=True).stdout
        if out.strip():
            print(f"  sb_post {table}: {out[:150]}", flush=True)
        return out
    finally:
        os.unlink(tmp)

def intel_usage():
    j = curl([f"https://api.arkm.com/subscription/intel-usage", "-H", f"API-Key: {AK}"])
    return int(j["totalCount"])

# ---- 1. candidates ----
now = datetime.datetime.now(datetime.timezone.utc)
d14 = (now - datetime.timedelta(days=14)).strftime("%Y-%m-%dT%H:%M:%SZ")
d1 = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

def pages(path_tmpl, n):
    """Yield rows across offset pages; stop on error objects (e.g. 57014)."""
    for page in range(n):
        rows = sb_get(path_tmpl.format(off=page*1000))
        if not isinstance(rows, list) or not rows:
            if isinstance(rows, dict):
                print(f"  page {page} error: {str(rows)[:100]}", flush=True)
            break
        yield from rows

cand = {}  # lower -> original form; insertion order = priority
def add(addr):
    if not addr or not EVM_RE.match(addr): return
    lo = addr.lower()
    if lo in SKIP or lo in cand: return
    cand[lo] = addr

print("collecting candidates...", flush=True)
d30 = (now - datetime.timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
# whale feed, biggest recent players first
for r in pages(f"all_whale_transactions?select=whale_address&timestamp=gte.{d30}"
               f"&usd_value=gte.10000&order=usd_value.desc&limit=1000&offset={{off}}", 25):
    add(r.get("whale_address"))
print(f"  whale feed: {len(cand)}", flush=True)

# transfer-feed counterparties: 2-hour slices keep each scan inside the
# ~8s statement timeout (amount_usd is filter-only, no index).
n0 = len(cand)
for h in range(0, 48, 2):
    t1 = (now - datetime.timedelta(hours=h+2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    t2 = (now - datetime.timedelta(hours=h)).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = sb_get(f"tracked_address_transfers?select=counterparty"
                  f"&timestamp=gte.{t1}&timestamp=lt.{t2}"
                  f"&amount_usd=gte.10000&order=timestamp.desc&limit=1000")
    if isinstance(rows, list):
        for r in rows: add(r.get("counterparty"))
print(f"  counterparties: +{len(cand)-n0}", flush=True)

# ---- 2. exclusions ----
known = set()
for page in range(12):
    rows = sb_get(f"tracked_address_universe?select=address&limit=1000&offset={page*1000}")
    if not rows: break
    for r in rows: known.add(r["address"].lower())
for page in range(30):
    rows = sb_get(f"arkham_cache?select=key&key=like.intel_miss:*&limit=1000&offset={page*1000}")
    if not rows: break
    for r in rows: known.add(r["key"].split("intel_miss:", 1)[1])
todo = [orig for lo, orig in cand.items() if lo not in known]
print(f"candidates {len(cand)}, already known {len(cand)-len(todo)}, to lookup {len(todo)}", flush=True)

# ---- 3. batches under the guard ----
start_usage = intel_usage()
print(f"intel-usage at start: {start_usage}/10000 (guard {GUARD})", flush=True)
sent = hits = 0
for i in range(MAX_BATCHES):
    chunk = todo[i*BATCH:(i+1)*BATCH]
    if not chunk: break
    if start_usage + sent + len(chunk) > GUARD:
        chunk = chunk[: max(0, GUARD - start_usage - sent)]
        if not chunk:
            print("guard reached — stopping", flush=True); break
    t0 = time.time()
    resp = curl([f"https://api.arkm.com/intelligence/address/batch",
                 "-X", "POST", "-H", f"API-Key: {AK}",
                 "-H", "Content-Type: application/json"],
                body={"addresses": chunk})
    ms = int((time.time()-t0)*1000)
    got_raw = (resp or {}).get("addresses") or {}
    # Arkham keys the response by EIP-55 CHECKSUMMED address no matter what
    # casing was sent — first run matched lowercase keys and binned 623 real
    # results as misses. Match case-insensitively.
    got = {k.lower(): v for k, v in got_raw.items()}
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           f"arkham-batch-raw-{int(time.time())}.json"), "w") as f:
        json.dump(resp, f)
    sent += len(chunk)

    uni, misses = [], []
    for addr in chunk:
        info = got.get(addr.lower()) or {}
        ent, lab = info.get("arkhamEntity"), info.get("arkhamLabel")
        if ent or lab:
            uni.append({
                "chain": info.get("chain") or "ethereum",
                "address": info.get("address") or addr,
                "arkham_entity_id": (ent or {}).get("id"),
                "arkham_entity_name": (ent or {}).get("name"),
                "arkham_entity_type": (ent or {}).get("type"),
                "arkham_label": (lab or {}).get("name"),
                "arkham_is_contract": bool(info.get("contract")),
                "source": "batch_harvest_20260725",
                "arkham_raw": info,
            })
        else:
            misses.append({"key": f"intel_miss:{addr.lower()}",
                           "value": {"checked": now.isoformat()},
                           "ttl_seconds": 90*86400,
                           "written_at": now.isoformat()})
    if uni:
        for j in range(0, len(uni), 500): sb_post("tracked_address_universe", uni[j:j+500], "chain,address")
    if misses:
        for j in range(0, len(misses), 500): sb_post("arkham_cache", misses[j:j+500], "key")
    sb_post("arkham_call_log", [{"endpoint": "/intelligence/address/batch", "method": "POST",
                                 "cost": 0, "status": 200, "ms": ms, "cache_hit": False,
                                 "source": "backfill",
                                 "reason": f"label harvest n={len(chunk)} hits={len(uni)}"}], "id") \
        if False else subprocess.run(
        ["curl", "-s", "-m", "30", f"{SB}/rest/v1/arkham_call_log",
         "-H", f"apikey: {SK}", "-H", f"Authorization: Bearer {SK}",
         "-H", "Content-Type: application/json", "-H", "Prefer: return=minimal",
         "-d", json.dumps({"endpoint": "/intelligence/address/batch", "method": "POST",
                           "cost": 0, "status": 200, "ms": ms, "cache_hit": False,
                           "source": "backfill", "reason": f"label harvest n={len(chunk)} hits={len(uni)}"})],
        capture_output=True)
    hits += len(uni)
    print(f"batch {i+1}: sent {len(chunk)}, labeled {len(uni)}, misses {len(misses)}, {ms}ms", flush=True)
    time.sleep(2)

print(f"DONE: sent {sent}, labeled {hits}", flush=True)
time.sleep(60)
print("intel-usage after settle:", intel_usage(), flush=True)
