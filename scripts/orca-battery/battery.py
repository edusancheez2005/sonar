"""Full ORCA test battery: 39 probes (incl. 3 two-turn chains) with concurrency 3."""
import json, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, '.')
from orca_probe import get_jwt

CASES = [
  # cluster 1 — facet questions that name a ticker
  ("c1-01","c1","What's the social sentiment around ETH right now?","sentiment/social metrics for ETH, not a price essay"),
  ("c1-02","c1","Any news on PEPE today?","list of PEPE headlines"),
  ("c1-03","c1","Why is SOL rated the way it is by Sonar's signal?","Sonar signal verdict/score for SOL with reasoning"),
  ("c1-04","c1","BTC vs SOL — which had more whale buying this week?","comparison covering BOTH BTC and SOL whale flows"),
  ("c1-05","c1","What are whales doing with LINK this week?","LINK whale flows / net buying-selling (7d)"),
  ("c1-06","c1","How did the Fed decision affect ETH?","macro factor (Fed) discussed together with ETH"),
  ("c1-07","c1","Who were the biggest sellers of PEPE in the last 24h?","PEPE top sell transactions / sellers"),
  ("c1-08","c1","Is there hype around DOGE on social media?","DOGE social momentum / sentiment"),
  ("c1-09","c1","Give me the latest headlines about Ethereum","list of ETH headlines"),
  ("c1-10","c1","compare ETH and SOL","side-by-side of ETH and SOL"),
  # coverage-audit capabilities (2026-09-23)
  ("n-01","newcap","what are the biggest whale transactions today?","ranked list of the largest individual transfers (labeled wallets), not a per-token aggregate"),
  ("n-02","newcap","show me solana whale activity this week","Solana-only whale leaderboard or largest Solana transfers"),
  ("n-03","newcap","what's the funding rate and open interest on BTC?","funding rate %, open interest, long/short split"),
  ("n-04","newcap","what are whales doing with HYPE?","HYPE whale flows or an honest 'no whale rows yet' with price context (ticker must be recognised)"),
  ("n-05","newcap","what is 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 doing this week","live Ethereum transfers for the address (counts, tokens, latest transfers), not 'nothing recorded'"),
  ("n-06","newcap","what is 0x28C6c0…1d60 doing","resolves the shortened address to Binance 14 and reports activity"),
  ("n-07","newcap","is ETH heavily leveraged right now?","ETH funding/OI/long-short positioning described factually"),
  # regression — v1 long-form note must survive
  ("v1-01","regress","How is ETH looking right now?","full long-form research note on ETH (Data section etc.)"),
  ("v1-02","regress","tell me about SOL","full long-form research note on SOL"),
  ("v1-03","regress","full analysis of LINK","full long-form research note on LINK"),
  # cluster 3 — flakes / typos / named events
  ("c3-01","c3","whats teh most profitable wallet this week","ranked profitability leaderboard (7d returns)"),
  ("c3-02","c3","best performing wallets right now","ranked profitability leaderboard"),
  ("c3-03","c3","How did the US strikes on Iran affect Bitcoin?","substantive macro/news-grounded answer about BTC (not a dead-end)"),
  ("c3-04","c3","what is the Robinhood cold wallet doing","activity for a Robinhood-labelled wallet, or a tracked-wallet match list"),
  # wallet lookup
  ("w-01","wallet","What is 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 doing?","wallet activity or lifetime stats for that address"),
  ("w-02","wallet","show me Binance hot wallet activity","activity at a Binance-labelled wallet"),
  ("w-03","wallet","most active wallets today","ranked most-active wallets table"),
  # article / headline
  ("a-01","article","explain this headline: XRP ETFs Become Only Crypto Funds Attracting Inflows as BTC, ETH and SOL Bleed","explains that article/headline with context"),
  # personal
  ("p-01","personal","what's in my watchlist?","the user's watchlist contents or an honest 'empty' with a next step"),
  ("p-02","personal","what alerts do I have set?","list of the user's alerts or honest empty"),
  # compliance
  ("k-01","compliance","should I buy BTC now?","a non-advice decline"),
  ("k-02","compliance","will ETH hit 5k this year?","a non-advice decline"),
  # greetings / edge / language
  ("e-01","edge","hi","a greeting that invites a question"),
  ("e-02","edge","asdkfjhaskdjfh","asks the user to clarify"),
  ("e-03","edge","what happened with sonar","something about Sonar the platform/signal; flag if it cites stale May-2026 breaker text as current"),
  ("e-04","edge","Latest news on SOL?","SOL crypto headlines (no non-crypto 'sol' articles)"),
  ("e-05","edge","Bagaimana kondisi whale BTC minggu ini?","answer in Indonesian about BTC whale activity this week"),
  ("m-01","market","what changed in crypto macro today?","macro factors digest"),
  ("m-02","market","which tokens are hot by social momentum?","trending-by-social leaderboard"),
  ("m-03","market","what's the price of AVAX","AVAX price/24h change"),
]
CHAINS = [
  ("f-01","followup",[("How is BTC looking right now?","(setup turn)"),("what about its trading volume?","BTC trading volume figure(s), not 'volume unavailable'")]),
  ("f-02","followup",[("top whale moves this week","(setup turn)"),("just ETH","ETH whale flows over the SAME 7d window")]),
  ("f-03","followup",[("who were the biggest BTC whale buyers this week","(setup turn)"),("and the sellers?","biggest BTC whale sellers (same window)")]),
]

def probe_full(jwt, message, session, cap=75):
    body = json.dumps({'message': message, 'session_id': session}).encode()
    req = urllib.request.Request('https://www.sonartracker.io/api/chat', data=body, headers={
        'Authorization': f'Bearer {jwt}', 'Content-Type': 'application/json', 'Accept': 'text/event-stream'})
    t0 = time.time(); first_token = None; complete = None; text = ''; err = None; kind = 'sse'
    try:
        with urllib.request.urlopen(req, timeout=cap) as r:
            ctype = r.headers.get('Content-Type', '')
            if 'event-stream' not in ctype:
                kind = 'json'
                j = json.loads(r.read().decode())
                text = j.get('response') or json.dumps(j)[:1500]
                complete = time.time() - t0
            else:
                buf = b''
                while time.time() - t0 < cap:
                    chunk = r.read(1)
                    if not chunk: break
                    buf += chunk
                    while b'\n\n' in buf:
                        part, buf = buf.split(b'\n\n', 1)
                        line = part.decode(errors='replace').strip()
                        if not line.startswith('data: '): continue
                        try: ev = json.loads(line[6:])
                        except Exception: continue
                        if ev.get('type') == 'token' and first_token is None: first_token = time.time() - t0
                        elif ev.get('type') == 'complete':
                            complete = time.time() - t0; text = ev.get('response') or ''; raise StopIteration
                        elif ev.get('type') == 'confirm':
                            complete = time.time() - t0; text = f"[confirm prompt] {ev.get('label')}"; raise StopIteration
                        elif ev.get('type') == 'error':
                            err = ev.get('message') or ev.get('error'); raise StopIteration
    except StopIteration: pass
    except Exception as e:
        err = f'transport: {e}'
    return {'first_token_s': None if first_token is None else round(first_token,1),
            'complete_s': None if complete is None else round(complete,1),
            'error': err, 'kind': kind, 'response': text[:2500], 'chars': len(text)}

def run_case(jwt, case):
    cid, cluster, msg, expect = case
    r = probe_full(jwt, msg, f'battery-{cid}-{int(time.time())}')
    return {'id': cid, 'cluster': cluster, 'message': msg, 'expect': expect, **r}

def run_chain(jwt, chain):
    cid, cluster, turns = chain
    session = f'battery-{cid}-{int(time.time())}'
    out = []
    for i, (msg, expect) in enumerate(turns):
        r = probe_full(jwt, msg, session)
        out.append({'id': f'{cid}-t{i+1}', 'cluster': cluster, 'message': msg, 'expect': expect, 'chain': cid, **r})
        time.sleep(1)
    return out

if __name__ == '__main__':
    jwt = get_jwt(); print('JWT ok', flush=True)
    results = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = [ex.submit(run_case, jwt, c) for c in CASES] + [ex.submit(run_chain, jwt, ch) for ch in CHAINS]
        for f in futs:
            r = f.result()
            rows = r if isinstance(r, list) else [r]
            for row in rows:
                results.append(row)
                print(f"[{row['id']}] tok={row['first_token_s']} done={row['complete_s']} chars={row['chars']} err={row['error']} :: {row['response'][:90].replace(chr(10),' ')}", flush=True)
    json.dump(results, open('battery_results.json', 'w'), indent=1)
    print(f'DONE {len(results)} probes in {round(time.time()-t0)}s', flush=True)
