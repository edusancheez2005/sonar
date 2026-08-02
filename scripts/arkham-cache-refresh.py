#!/usr/bin/env python3
"""Refresh the arkham_cache rows that power Sonar's Arkham features.

Why this exists: Arkham's WAF started tarpitting Vercel egress IPs
(~2026-07-26) — every server-side fetch to api.arkm.com hangs to
timeout. lib/arkham/client.ts checks arkham_cache for a FRESH row
BEFORE the kill switch or any outbound call, so refreshing the cache
from outside Vercel (GitHub Actions / a laptop) keeps figure-page
portfolio charts, entity counterparties and token top-holders fully
live in prod with zero Vercel→Arkham traffic.

Refreshes daily-cadence keys with 25h TTLs:
  entity_history:{id}        (/history/entity, ~1 credit)   — 72 figure entities
  counterparties:{id}:{flow} (/counterparties, 50 credits)  — same entities, in+out
  token_holders:{id}         (/token/holders, 30 credits)   — top whale-feed tokens

Env (or .env.local fallback): ARKHAM_API_KEY, SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY.
"""
import json, subprocess, os, re, sys, time, datetime, tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
TTL = 90_000  # 25h — daily refresh keeps rows permanently fresh for 24h readers

def env(name):
    if os.environ.get(name): return os.environ[name]
    try:
        for line in open(os.path.join(REPO, ".env.local")):
            m = re.match(rf"^{name}=(.*)$", line.strip())
            if m: return m.group(1).strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    raise SystemExit(f"missing env {name}")

SB, SK, AK = env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), env("ARKHAM_API_KEY")

def curl_json(url, headers, body=None, method=None, timeout=90):
    cmd = ["curl", "-s", "-m", str(timeout), "-A", UA]
    if method: cmd += ["-X", method]
    for h in headers: cmd += ["-H", h]
    if body is not None:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(body, f); tmp = f.name
        cmd += ["-H", "Content-Type: application/json", "-d", f"@{tmp}"]
    out = subprocess.run(cmd + [url], capture_output=True, text=True).stdout
    try:
        return json.loads(out) if out else None
    except json.JSONDecodeError:
        return None

def sb_get(path):
    return curl_json(f"{SB}/rest/v1/{path}",
                     [f"apikey: {SK}", f"Authorization: Bearer {SK}"])

def arkham(path):
    return curl_json(f"https://api.arkm.com{path}", [f"API-Key: {AK}"])

def write_cache(key, value):
    row = {"key": key, "value": value, "ttl_seconds": TTL,
           "written_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    curl_json(f"{SB}/rest/v1/arkham_cache?on_conflict=key",
              [f"apikey: {SK}", f"Authorization: Bearer {SK}",
               "Prefer: resolution=merge-duplicates,return=minimal"],
              body=[row], method="POST")

def log_call(endpoint, cost, ok, ms, reason):
    curl_json(f"{SB}/rest/v1/arkham_call_log",
              [f"apikey: {SK}", f"Authorization: Bearer {SK}",
               "Prefer: return=minimal"],
              body={"endpoint": endpoint, "method": "GET", "cost": cost,
                    "status": 200 if ok else 0, "ms": ms, "cache_hit": False,
                    "source": "backfill", "reason": reason},
              method="POST")

def refresh(path, key, cost, reason, heavy=False):
    t0 = time.time()
    j = arkham(path)
    ms = int((time.time() - t0) * 1000)
    ok = isinstance(j, (dict, list)) and not (isinstance(j, dict) and set(j) == {"message"})
    if ok: write_cache(key, j)
    log_call(path.split("?")[0], cost if ok else 0, ok, ms, reason)
    if heavy: time.sleep(1.2)  # HEAVY endpoints: 1 rps
    return j if ok else None

def portfolio_stats(history):
    """Total USD now + 7d/30d % from an Arkham /history/entity response.
    Chains start on different dates → carry each chain's value forward
    before summing (mirror of buildArkhamValueCandles in the figure page)."""
    if not isinstance(history, dict): return None
    chains = []
    dates = set()
    cutoff = (time.time() - 40 * 86400) * 1000
    for series in history.values():
        if not isinstance(series, list) or not series: continue
        pts = []
        for p in series:
            try:
                t = datetime.datetime.fromisoformat(str(p["time"]).replace("Z", "+00:00")).timestamp() * 1000
                pts.append((t, float(p["usd"])))
            except (KeyError, ValueError, TypeError):
                continue
        if not pts: continue
        pts.sort()
        chains.append(pts)
        for t, _ in pts:
            if t >= cutoff: dates.add(t)
    days = sorted(dates)
    if len(days) < 2: return None
    cursors = [0] * len(chains)
    totals = []
    for day in days:
        total = 0.0
        for i, pts in enumerate(chains):
            while cursors[i] + 1 < len(pts) and pts[cursors[i] + 1][0] <= day: cursors[i] += 1
            if pts[cursors[i]][0] <= day: total += pts[cursors[i]][1]
        totals.append((day, total))
    now_ms, usd_now = totals[-1]
    def pct(days_back):
        target = now_ms - days_back * 86400_000
        base = None
        for t, v in totals:
            if t <= target: base = v
        if base is None or abs(base) < 1: return None
        return round((usd_now - base) / abs(base) * 100, 2)
    return {"usd": round(usd_now), "d7": pct(7), "d30": pct(30)}

entities = sb_get("curated_entities?select=slug,arkham_entity_id"
                  "&arkham_entity_id=not.is.null&submission_status=eq.approved&limit=500") or []
slugs_by_id = {}
for e in entities:
    if e.get("arkham_entity_id"):
        slugs_by_id.setdefault(e["arkham_entity_id"], []).append(e["slug"])
ids = sorted(slugs_by_id)
print(f"{len(ids)} figure entities", flush=True)

hist = cp = 0
dir_stats = {}
for i, eid in enumerate(ids):
    hj = refresh(f"/history/entity/{eid}", f"entity_history:{eid}", 1,
                 "cache-refresh history")
    if hj is not None:
        hist += 1
        st = portfolio_stats(hj)
        if st:
            for slug in slugs_by_id[eid]: dir_stats[slug] = st
    for flow in ("in", "out"):
        if refresh(f"/counterparties/entity/{eid}?flow={flow}&timeLast=30d&limit=10",
                   f"counterparties:{eid}:{flow}", 50,
                   "cache-refresh counterparties", heavy=True) is not None: cp += 1
    if (i + 1) % 10 == 0: print(f"  {i+1}/{len(ids)} entities", flush=True)

# Directory stats map: one app_cache row the /figures page reads to show
# REAL portfolio values + returns instead of dead backtest placeholders.
if dir_stats:
    row = {"key": "figure_directory_stats", "value": dir_stats,
           "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    curl_json(f"{SB}/rest/v1/app_cache?on_conflict=key",
              [f"apikey: {SK}", f"Authorization: Bearer {SK}",
               "Prefer: resolution=merge-duplicates,return=minimal"],
              body=[row], method="POST")
    print(f"directory stats written for {len(dir_stats)} figures", flush=True)

# Top tokens seen in the whale feed lately, mapped to CoinGecko ids the
# token page understands (mirror of SYMBOL_TO_COINGECKO_ID's main names).
TOKEN_IDS = {
    "BTC": "bitcoin", "WBTC": "wrapped-bitcoin", "ETH": "ethereum", "WETH": "weth",
    "SOL": "solana", "BNB": "binancecoin", "XRP": "ripple", "DOGE": "dogecoin",
    "ADA": "cardano", "AVAX": "avalanche-2", "LINK": "chainlink", "DOT": "polkadot",
    "UNI": "uniswap", "LTC": "litecoin", "MATIC": "matic-network", "PEPE": "pepe",
    "SHIB": "shiba-inu", "NEAR": "near", "APT": "aptos", "ARB": "arbitrum",
    "OP": "optimism", "AAVE": "aave", "MKR": "maker", "CRV": "curve-dao-token",
    "USDT": "tether", "USDC": "usd-coin",
}
d7 = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
rows = sb_get(f"all_whale_transactions?select=token_symbol&timestamp=gte.{d7}"
              f"&usd_value=gte.100000&order=usd_value.desc&limit=1000") or []
seen = []
for r in rows if isinstance(rows, list) else []:
    s = str(r.get("token_symbol") or "").upper()
    if s in TOKEN_IDS and TOKEN_IDS[s] not in seen: seen.append(TOKEN_IDS[s])
tokens = seen[:20] or ["bitcoin", "ethereum", "solana", "chainlink"]
th = 0
for tid in tokens:
    if refresh(f"/token/holders/{tid}", f"token_holders:{tid}", 30,
               "cache-refresh token holders"): th += 1
print(f"DONE: history {hist}/{len(ids)}, counterparty flows {cp}/{len(ids)*2}, "
      f"token holders {th}/{len(tokens)}", flush=True)

# A run that refreshed nothing is a FAILURE, not a success — exiting 0 here
# let a fully-blocked run (e.g. Arkham WAF rejecting the runner's IPs) show
# a green check while every cache row stayed stale (2026-08-02 run #6).
if hist == 0:
    print("ERROR: zero histories refreshed — Arkham unreachable from this "
          "network or auth failed; failing the run so it can't look green.",
          flush=True)
    sys.exit(1)
