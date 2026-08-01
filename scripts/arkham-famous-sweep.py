#!/usr/bin/env python3
"""Sweep Arkham for famous-person entities and add them to the figures
directory + tracked_address_universe.

Guardrail: search results are full of fan/impersonator accounts, so a
candidate is only accepted when the Arkham ENTITY NAME matches the
queried famous name exactly after normalisation (case/punctuation).
Misattributing a wallet to a real celebrity is worse than missing one —
near-misses are printed for manual review, never auto-added.

Per accepted entity: /intelligence/entity/{id} (details) +
/intelligence/entity/{id}/addresses (attributed wallets, capped) →
curated_entities (approved, not featured) + universe rows
(source famous_sweep_20260801). Calls logged to arkham_call_log.
"""
import json, subprocess, os, re, sys, time, datetime, tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"

env = dict(os.environ)
try:
    for line in open(os.path.join(REPO, ".env.local")):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
        if m and m.group(1) not in env:
            env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
except FileNotFoundError:
    pass
SB, SK, AK = env["SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"], env["ARKHAM_API_KEY"]

def curl_json(url, headers, body=None, method=None, timeout=60):
    cmd = ["curl", "-s", "-m", str(timeout), "-A", UA]
    if method: cmd += ["-X", method]
    for h in headers: cmd += ["-H", h]
    if body is not None:
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(body, f); tmp = f.name
        cmd += ["-H", "Content-Type: application/json", "-d", f"@{tmp}"]
    out = subprocess.run(cmd + [url], capture_output=True, text=True).stdout
    try: return json.loads(out) if out else None
    except json.JSONDecodeError: return None

def sb(path, body=None, method=None, prefer=None):
    h = [f"apikey: {SK}", f"Authorization: Bearer {SK}"]
    if prefer: h.append(f"Prefer: {prefer}")
    return curl_json(f"{SB}/rest/v1/{path}", h, body=body, method=method)

def arkham(path):
    time.sleep(1.1)  # search is HEAVY (1 rps); keep every call polite
    return curl_json(f"https://api.arkm.com{path}", [f"API-Key: {AK}"])

def log_call(endpoint, cost, reason):
    sb("arkham_call_log", method="POST", prefer="return=minimal",
       body={"endpoint": endpoint, "method": "GET", "cost": cost, "status": 200,
             "ms": 0, "cache_hit": False, "source": "backfill", "reason": reason})

def norm(s):
    return re.sub(r"[^a-z0-9]", "", str(s or "").lower())

# Famous names to try — athletes, musicians, actors, politicians,
# founders, investors, crypto-native figures. Existing directory slugs
# are skipped automatically.
NAMES = [
    "Cristiano Ronaldo", "Lionel Messi", "Neymar", "LeBron James", "Serena Williams",
    "Tom Brady", "Floyd Mayweather", "Mike Tyson", "Conor McGregor", "Usain Bolt",
    "Lewis Hamilton", "Kevin Durant", "Giannis Antetokounmpo", "Odell Beckham Jr",
    "Aaron Rodgers", "Russell Okung", "Saquon Barkley", "Trevor Lawrence",
    "Justin Bieber", "The Weeknd", "Drake", "Post Malone", "Eminem", "Jay-Z",
    "Madonna", "Katy Perry", "Lil Baby", "Wiz Khalifa", "Soulja Boy", "Akon",
    "Steve Aoki", "Diplo", "Grimes", "3LAU", "Deadmau5", "Marshmello",
    "Paris Hilton", "Kim Kardashian", "Gwyneth Paltrow", "Reese Witherspoon",
    "Ashton Kutcher", "Matt Damon", "Adam Sandler", "Bella Hadid", "Lindsay Lohan",
    "Logan Paul", "Jake Paul", "KSI", "PewDiePie", "Ninja", "Pokimane",
    "Elon Musk", "Jack Dorsey", "Mark Cuban", "Chamath Palihapitiya",
    "Peter Thiel", "Marc Andreessen", "Naval Ravikant", "Balaji Srinivasan",
    "Michael Saylor", "Cathie Wood", "Ray Dalio", "Paul Tudor Jones",
    "Stanley Druckenmiller", "Bill Ackman", "Tim Draper", "Kevin O'Leary",
    "Anthony Pompliano", "Raoul Pal", "Arthur Hayes", "CZ", "Changpeng Zhao",
    "Brian Armstrong", "Jesse Powell", "Tyler Winklevoss", "Cameron Winklevoss",
    "Justin Sun", "Do Kwon", "Andre Cronje", "Hayden Adams", "Sergey Nazarov",
    "Anatoly Yakovenko", "Raj Gokal", "Charles Hoskinson", "Gavin Wood",
    "Joseph Lubin", "Roger Ver", "Adam Back", "Nick Szabo", "Erik Voorhees",
    "Cobie", "Hsaka", "Tetranode", "Loomdart", "DegenSpartan", "Ansem",
    "Machi Big Brother", "Dingaling", "Pranksy", "WhaleShark", "Cozomo de Medici",
    "Beeple", "Pak", "XCOPY", "Snowfro", "Donald Trump Jr", "Eric Trump",
    "Melania Trump", "Javier Milei", "Nayib Bukele", "Francis Suarez",
    "Cynthia Lummis", "Ted Cruz", "Robert F Kennedy Jr", "Vivek Ramaswamy",
]

existing = set()
rows = sb("curated_entities?select=slug,arkham_entity_id,display_name&limit=1000") or []
for r in rows:
    existing.add(r.get("slug")); existing.add(r.get("arkham_entity_id"))
    existing.add(norm(r.get("display_name")))
print(f"{len(rows)} existing directory entities", flush=True)

added, reviewed = [], []
for name in NAMES:
    if norm(name) in existing:
        continue
    res = arkham(f"/intelligence/search?query={re.sub(' ', '%20', name)}")
    log_call("/intelligence/search", 30, f"famous sweep: {name}")
    ents = (res or {}).get("arkhamEntities") or []
    match = None
    for e in ents:
        if norm(e.get("name")) == norm(name) and e.get("id") not in existing:
            match = e; break
    if not match:
        near = [e.get("name") for e in ents[:3] if e.get("name")]
        if near: reviewed.append(f"{name}: no exact match (saw: {', '.join(near)})")
        continue

    eid = match["id"]
    detail = arkham(f"/intelligence/entity/{eid}") or {}
    log_call(f"/intelligence/entity/{eid}", 1, "famous sweep detail")
    addr_resp = arkham(f"/intelligence/entity/{eid}/addresses") or {}
    log_call(f"/intelligence/entity/{eid}/addresses", 1, "famous sweep addresses")
    by_chain = addr_resp.get("addresses") or {}

    fig_addrs, uni_rows = [], []
    for chain, addrs in by_chain.items():
        for a in (addrs or [])[:10]:  # cap per chain — some entities have hundreds
            fig_addrs.append({"chain": chain, "address": a, "note": "Arkham-attributed"})
            uni_rows.append({
                "chain": chain, "address": a,
                "arkham_entity_id": eid,
                "arkham_entity_name": detail.get("name") or match.get("name"),
                "arkham_entity_type": detail.get("type") or match.get("type"),
                "arkham_label": None, "arkham_is_contract": False,
                "source": "famous_sweep_20260801", "arkham_raw": {"entity": detail},
            })
    if not fig_addrs:
        reviewed.append(f"{name}: entity {eid} matched but has no addresses")
        continue

    twitter = re.sub(r"^https?://(www\.)?(twitter|x)\.com/", "", str(detail.get("twitter") or "")) or None
    sb("curated_entities?on_conflict=slug", method="POST",
       prefer="resolution=merge-duplicates,return=minimal",
       body=[{
           "slug": eid,
           "display_name": detail.get("name") or match.get("name"),
           "description": f"{detail.get('name') or name} — Arkham-attributed wallets, tracked live by Sonar.",
           "category": "celebrity" if detail.get("type") in (None, "individual") else "person",
           "twitter_handle": twitter,
           "is_featured": False,
           "submission_status": "approved",
           "arkham_entity_id": eid,
           "addresses": fig_addrs[:40],
       }])
    for j in range(0, len(uni_rows), 200):
        sb("tracked_address_universe?on_conflict=chain,address", method="POST",
           prefer="resolution=merge-duplicates,return=minimal", body=uni_rows[j:j+200])
    added.append(f"{detail.get('name') or name} ({eid}): {len(fig_addrs)} addrs")
    print(f"  + {added[-1]}", flush=True)

print(f"\nADDED {len(added)}:"); [print("  ", a) for a in added]
print(f"\nFOR REVIEW ({len(reviewed)}):"); [print("  ", r) for r in reviewed]
