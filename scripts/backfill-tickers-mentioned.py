#!/usr/bin/env python3
"""
One-off backfill: populate social_posts.tickers_mentioned for historical rows.

Every row ingested before 2026-07-15 has tickers_mentioned = null because
ingest-social mapped it from a LunarCrush field (coins_mentioned) that does
not exist. New rows are populated at ingest by extractTickers() in
lib/orca/ticker-extractor.ts; this script applies the same extraction to the
backlog. The logic here MUST mirror extractTickers() — if you change one,
change both.

Usage:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python3 scripts/backfill-tickers-mentioned.py            # dry run (default)
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DRY_RUN=0 python3 scripts/backfill-tickers-mentioned.py  # write

Idempotent: only reads rows where tickers_mentioned IS NULL, so it can be
re-run after an interruption. Rows with no tickers found are written as []
(processed, none found) to distinguish them from unprocessed nulls.
"""

import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
from collections import Counter

URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DRY_RUN = os.environ.get("DRY_RUN", "1") != "0"

if not URL or not KEY:
    sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")

# ── Mirrored from lib/orca/ticker-extractor.ts ──────────────────────────────

VALID_TICKERS = set("""
BTC ETH BNB SOL XRP ADA AVAX DOT MATIC TRX ATOM NEAR ALGO VET FIL APT HBAR STX
INJ FTM ETC XLM FLOW ICP THETA XTZ EOS KAS ROSE MINA LTC BCH BSV XMR ZEC DASH
DCR RVN WAVES USDT USDC DAI BUSD TUSD USDD FRAX GUSD UNI LINK AAVE MKR SNX CRV
COMP YFI SUSHI BAL 1INCH LDO LIDO FXS CVX RPL DYDX GMX PERP PENDLE ARB OP IMX
LRC STRK METIS BOBA DOGE SHIB PEPE FLOKI BONK WIF MEME DEGEN WOJAK ELON AKITA
KISHU BABYDOGE SAMO MYRO SAND MANA AXS GALA ENJ ILV ALICE TLM YGG PRIME BIGTIME
BEAM RON MAGIC PORTAL FET AGIX OCEAN GRT RNDR AKT TAO PAAL BLUR LOOKS APE SUPER
CHZ AUDIO MASK API3 BAND TRB DIA BAT ZRX REQ OMG ZIL ICX QTUM ONT STORJ FUN REN
KNC ANT NMR MLN POLY POWR CELR ANKR SUI SEI TIA JTO PYTH JUPITER WEN CRO OKB HT
LEO GT KCS FTT
""".split())

# TICKER_MAP entries whose key is neither itself a valid ticker symbol
# (bare-symbol aliases like 'sol'/'link' are ambiguity we refuse) nor an
# English word (AMBIGUOUS_NAME_WORDS: curve/compound/render/maker/gala/
# stacks/mask/blur).
NAME_TO_TICKER = {
    "bitcoin": "BTC", "ethereum": "ETH", "solana": "SOL", "cardano": "ADA",
    "ripple": "XRP", "dogecoin": "DOGE", "polkadot": "DOT", "polygon": "MATIC",
    "avalanche": "AVAX", "chainlink": "LINK", "uniswap": "UNI",
    "litecoin": "LTC", "tron": "TRX", "shiba": "SHIB", "shibainu": "SHIB",
    "pepecoin": "PEPE", "flokiinu": "FLOKI", "dogwifhat": "WIF",
    "cosmos": "ATOM", "algorand": "ALGO", "vechain": "VET", "filecoin": "FIL",
    "aptos": "APT", "hedera": "HBAR", "arbitrum": "ARB", "optimism": "OP",
    "thegraph": "GRT", "sandbox": "SAND", "decentraland": "MANA",
    "synthetix": "SNX", "thorchain": "RUNE", "fantom": "FTM",
    "immutable": "IMX", "axie": "AXS", "enjin": "ENJ", "chiliz": "CHZ",
    "yearn": "YFI", "basicattentiontoken": "BAT", "0x": "ZRX",
    "sushiswap": "SUSHI", "injective": "INJ", "apecoin": "APE",
    "celestia": "TIA", "jito": "JTO",
}

CASHTAG_RE = re.compile(r"\$([A-Za-z]{2,10})\b")
BTC_RE = re.compile(r"\bbtc\b", re.IGNORECASE)
ETH_RE = re.compile(r"\beth\b", re.IGNORECASE)
NAME_RES = [
    (re.compile(r"\b" + re.escape(name) + r"\b", re.IGNORECASE), ticker)
    for name, ticker in NAME_TO_TICKER.items()
]


def extract_tickers(text):
    found = set()
    for m in CASHTAG_RE.finditer(text):
        sym = m.group(1).upper()
        if sym in VALID_TICKERS:
            found.add(sym)
    for rx, ticker in NAME_RES:
        if rx.search(text):
            found.add(ticker)
    if BTC_RE.search(text):
        found.add("BTC")
    if ETH_RE.search(text):
        found.add("ETH")
    return sorted(found)


# ── PostgREST helpers ────────────────────────────────────────────────────────

def req(method, path, body=None, headers=None):
    r = urllib.request.Request(
        f"{URL}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
    )
    r.add_header("apikey", KEY)
    r.add_header("Authorization", f"Bearer {KEY}")
    r.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        r.add_header(k, v)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(r, timeout=60) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:300]
            if e.code >= 500 and attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            sys.exit(f"{method} {path} -> HTTP {e.code}: {detail}")
        except urllib.error.URLError as e:
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            raise


def fetch_null_rows():
    """Keyset-paginate all rows with tickers_mentioned IS NULL."""
    last_id, rows = 0, []
    while True:
        page = req(
            "GET",
            "/rest/v1/social_posts"
            # post_id/network ride along unchanged: the upsert's candidate
            # tuple must pass post_id NOT NULL *before* ON CONFLICT
            # arbitration, so a partial {id, tickers} payload can never work.
            f"?select=id,post_id,network,title,body&tickers_mentioned=is.null"
            f"&order=id.asc&id=gt.{last_id}&limit=1000",
        )
        if not page:
            break
        rows.extend(page)
        last_id = page[-1]["id"]
        print(f"  fetched {len(rows)} rows (last id {last_id})", file=sys.stderr)
    return rows


def main():
    print(f"Mode: {'DRY RUN' if DRY_RUN else 'WRITE'}")
    rows = fetch_null_rows()
    print(f"Rows with tickers_mentioned IS NULL: {len(rows)}")

    updates = []
    ticker_counts = Counter()
    with_tickers = 0
    samples = []
    for row in rows:
        text = f"{row.get('title') or ''} {row.get('body') or ''}"
        tickers = extract_tickers(text)
        updates.append({
            "id": row["id"],
            "post_id": row["post_id"],
            "network": row.get("network"),
            "tickers_mentioned": tickers,
        })
        if tickers:
            with_tickers += 1
            ticker_counts.update(tickers)
            if len(samples) < 8:
                samples.append((tickers, text[:110].replace("\n", " ")))

    print(f"Rows with >=1 ticker: {with_tickers} "
          f"({100 * with_tickers / max(1, len(rows)):.1f}%)")
    print(f"Top tickers: {ticker_counts.most_common(15)}")
    print("Samples:")
    for tickers, text in samples:
        print(f"  {tickers} <- {text}")

    if DRY_RUN:
        print("\nDry run — nothing written. Re-run with DRY_RUN=0 to write.")
        return

    # Bulk update via PK upsert (on_conflict=id): every id exists, so every
    # row takes the ON CONFLICT (id) DO UPDATE path; post_id/network are
    # written back to their own values and only tickers_mentioned changes.
    written = 0
    for i in range(0, len(updates), 500):
        batch = updates[i:i + 500]
        req(
            "POST",
            "/rest/v1/social_posts?on_conflict=id",
            body=batch,
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )
        written += len(batch)
        print(f"  wrote {written}/{len(updates)}", file=sys.stderr)
    print(f"Done: {written} rows updated.")


if __name__ == "__main__":
    main()
