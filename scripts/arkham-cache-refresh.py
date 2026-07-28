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
    return ok

entities = sb_get("curated_entities?select=slug,arkham_entity_id"
                  "&arkham_entity_id=not.is.null&submission_status=eq.approved&limit=200") or []
ids = sorted({e["arkham_entity_id"] for e in entities if e.get("arkham_entity_id")})
print(f"{len(ids)} figure entities", flush=True)

hist = cp = 0
for i, eid in enumerate(ids):
    if refresh(f"/history/entity/{eid}", f"entity_history:{eid}", 1,
               "cache-refresh history"): hist += 1
    for flow in ("in", "out"):
        if refresh(f"/counterparties/entity/{eid}?flow={flow}&timeLast=30d&limit=10",
                   f"counterparties:{eid}:{flow}", 50,
                   "cache-refresh counterparties", heavy=True): cp += 1
    if (i + 1) % 10 == 0: print(f"  {i+1}/{len(ids)} entities", flush=True)

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
