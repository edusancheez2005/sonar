"""Seed app_cache with CoinGecko logo URLs for the top-N coins by market cap.

Run from a laptop (the free CoinGecko tier answers here; from Vercel's shared
egress IPs it rate-limits). The token-image route reads these rows first, so
after this runs the dashboard renders real logos with no CoinGecko call at all.

    python3 scripts/logos/seed_token_logos.py            # top 1000
    python3 scripts/logos/seed_token_logos.py 2000       # more pages

Keys: cg_logo:<SYMBOL> (first occurrence = highest market cap wins collisions).
Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
"""
import json, os, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
env = {}
for line in open(os.path.join(ROOT, '.env.local')):
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1); env[k] = v
SB = env['SUPABASE_URL'].rstrip('/'); SRK = env['SUPABASE_SERVICE_ROLE_KEY']
DEMO = env.get('COINGECKO_DEMO_API_KEY', '')
TOP_N = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
PER_PAGE = 250

def cg(path):
    req = urllib.request.Request('https://api.coingecko.com/api/v3' + path,
                                 headers={'Accept': 'application/json', **({'x-cg-demo-api-key': DEMO} if DEMO else {})})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(15 * (attempt + 1)); continue
            raise

rows, seen = [], set()
now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
for page in range(1, (TOP_N + PER_PAGE - 1) // PER_PAGE + 1):
    coins = cg(f'/coins/markets?vs_currency=usd&order=market_cap_desc&per_page={PER_PAGE}&page={page}&sparkline=false')
    for c in coins:
        sym = (c.get('symbol') or '').upper()
        if not sym or sym in seen or not c.get('image'):
            continue
        seen.add(sym)
        meta = {'id': c['id'], 'symbol': sym, 'name': c.get('name') or sym, 'image_url': c['image']}
        rows.append({'key': f'cg_logo:{sym}', 'value': meta, 'updated_at': now})
        rows.append({'key': f"cg_logo_id:{c['id'].lower()}", 'value': meta, 'updated_at': now})
    print(f'page {page}: {len(coins)} coins, {len(seen)} symbols so far', flush=True)
    time.sleep(2.5)

def upsert(batch):
    req = urllib.request.Request(f'{SB}/rest/v1/app_cache?on_conflict=key', data=json.dumps(batch).encode(), method='POST',
        headers={'apikey': SRK, 'Authorization': f'Bearer {SRK}', 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status

for i in range(0, len(rows), 200):
    st = upsert(rows[i:i + 200])
    print(f'upserted {min(i + 200, len(rows))}/{len(rows)} (HTTP {st})', flush=True)
print(f'done: {len(seen)} symbols seeded')
