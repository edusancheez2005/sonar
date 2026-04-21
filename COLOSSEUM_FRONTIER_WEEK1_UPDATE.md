# Colosseum Frontier Hackathon — Week 1 Update

> **Project:** Sonar Tracker (sonartracker.io)  
> **Team:** Eduardo Sanchez Morales  
> **Date:** April 12, 2026  
> **Track:** AI / DeFi Intelligence  

---

## TL;DR

Week 1 focused on **user clarity** and **Solana backend infrastructure**. We shipped a multi-chain whale wallet leaderboard with smart money scoring, a backtesting engine that lets users simulate copying whale trades, and an AI-powered macro intelligence feed — all designed to make on-chain data accessible to non-technical traders. On the backend, we integrated **Alchemy's Yellowstone gRPC streaming** for real-time Solana transaction ingestion, replacing our previous polling approach with a persistent, low-latency connection to the Solana blockchain.

---

## What We Built This Week

### 1. Whale Wallet Leaderboard — Multi-Chain Smart Money Scoring

**Problem:** Retail traders can't tell which on-chain wallets are worth following. Raw blockchain data is noise without classification.

**What we shipped:**
- A ranked leaderboard of **70,000+ tracked wallets** across Ethereum, Solana, and Base
- Each wallet scored 0–100 on a **Smart Money Score** based on: 30-day trading volume, portfolio value, PnL, transaction frequency, and counterparty diversity
- Wallets auto-tagged as `smart money`, `whale`, `market maker`, or `distributor` using our classification engine
- **Filtering by chain** (Ethereum / Solana / Base / All Chains) and sorting by score, volume, or portfolio value
- Real-time **Smart Money Moves** sidebar showing live buys and sells with token, amount, chain, and score — so users see what top wallets are doing *right now*
- **Custom watchlists** — users can create named groups (e.g. "Top Smart Money", "DeFi Whales") and add wallets from the leaderboard to track them over time

**Why this matters for user clarity:** Instead of raw transaction hashes, users see a ranked table with plain-English labels. A user doesn't need to know what `0x74de...16631` does — they see "Smart Money #1, Ethereum, Score 72, $2.46M volume, tagged as smart money + distributor" and they know this wallet is worth watching.

---

### 2. Whale Backtest Engine — "What If You Copied This Wallet?"

**Problem:** Users see whale wallets but have no way to evaluate if following them would actually be profitable.

**What we shipped:**
- A **Backtest tab** inside the Whale Wallet Tracker
- Users enter any wallet address, set a starting capital (e.g. $10,000) and a period (up to 365 days), and hit "Run Backtest"
- The engine replays all BUY/SELL classified trades for that wallet from our `all_whale_transactions` view
- Uses **proportional capital allocation**: each simulated trade is sized relative to the whale's total buy volume, so a $500K buy in a $5M total portfolio gets 10% of the user's capital
- Outputs: **Total PnL, Return %, Win Rate, Total Trades, Best Trade, Worst Trade**
- Renders a full **Equity Curve** chart showing portfolio value over time

**Example result shown:** Backtesting wallet `0x74de...16631` over 90 days with $10K starting capital → **+57.39% return ($5.7K PnL)**, 116 trades, best single trade $5.4K. The equity curve shows flat performance until late March, then a sharp uptick as whale trades hit profitable positions.

**How the backtest works under the hood:**
1. Queries `all_whale_transactions` for the wallet address within the selected time period, filtering for `BUY` and `SELL` classifications
2. Calculates `totalWhaleBuyVolume` — the sum of all that whale's buy values — to determine proportional sizing
3. For each `BUY`, allocates `(trade_usd_value / totalWhaleBuyVolume) × startingCapital` from cash into that token position
4. For each `SELL`, calculates the ratio of sell value to cumulative buys for that token, determines the whale's implied return, and applies it to the proportional position to compute PnL
5. Records daily equity snapshots and builds the curve
6. All positions still open at period end carry at cost basis

This gives users a quantitative answer to "should I follow this wallet?" before risking real capital.

---

### 3. AI-Powered Macro Factors & Key Voices Feed

**Problem:** Crypto markets are driven by macro events and influential voices, but this context is scattered across dozens of sources.

**What we shipped:**
- **MACRO_FACTORS panel** — AI-generated (via Grok/xAI with web search) summary of the top macro events affecting crypto *this week*, each tagged with a sentiment indicator (bullish/bearish/neutral):
  - Fed Rate Hold (green — bullish)
  - CPI Data Release (green — below expectations, reinforcing disinflation)
  - Ukraine-Russia Escalation (red — boosting safe-haven demand)
  - SEC ETF Approvals (green — two new Solana ETFs approved)
  - BTC ETF Inflows
- **Overall verdict** displayed: `BULLISH`
- "Explain to me" link that sends all macro factors to ORCA (our AI advisor) for a plain-English breakdown
- **KEY_VOICES panel** (LIVE) — curated quotes from market-moving figures:
  - Donald Trump, Elon Musk, Michael Saylor, Jerome Powell, Cathie Wood
  - Each with: quote, date, sentiment dot (green/red/grey), and topic tag
  - Updates automatically via Grok with web search grounding

**User clarity win:** A trader opens Sonar and immediately sees "the macro picture is bullish because of X, Y, Z" and "Michael Saylor just added 5,000 BTC" — no need to scroll Twitter or read 15 articles.

---

## Solana Backend: Alchemy Yellowstone gRPC Integration

This is the infrastructure layer that powers real-time Solana data across all the features above.

### What is Yellowstone?

Yellowstone is Alchemy's **gRPC streaming interface** for Solana, built on the Geyser plugin architecture. Instead of polling `getSignaturesForAddress` every few seconds (which burns rate limits and introduces lag), Yellowstone opens a **persistent gRPC stream** that pushes transactions and account updates in real-time as they're confirmed on-chain.

### What we implemented:

1. **Real-time Solana transaction streaming** — A persistent gRPC connection to Alchemy's Yellowstone endpoint subscribes to transactions involving our monitored wallet set and SPL token programs
2. **Transaction parsing pipeline** — Raw Solana transactions are parsed to extract: sender/receiver, token mint, amount, program IDs (Jupiter, Raydium, Orca DEX interactions), and instruction data
3. **AI buy/sell classification** — Each parsed transaction is classified as BUY, SELL, or TRANSFER using:
   - Exchange wallet detection (CEX deposit/withdrawal patterns)
   - DEX swap signature parsing (Jupiter route plans, Raydium pool interactions)
   - Wallet behaviour scoring based on historical patterns
4. **Ingestion into Supabase** — Classified transactions are written to the `solana_transactions` table, which feeds into our unified `all_whale_transactions` view. This means Solana data automatically appears in the leaderboard, backtest engine, signal engine, and ORCA's context
5. **Smart Money Moves feed** — The live sidebar on the leaderboard (visible in screenshot) shows Solana transactions in real-time: "mfdu...gvwa bought SOL $40.4K" with `SOLANA` chain tag and score badge

### Why Yellowstone over polling:

| | Polling (old) | Yellowstone gRPC (new) |
|---|---|---|
| Latency | 5-15s (poll interval) | <1s (stream push) |
| Rate limit usage | High (1 call per poll per wallet) | Minimal (single persistent connection) |
| Missed transactions | Possible between polls | None (guaranteed delivery) |
| Cost | Scales linearly with wallets | Flat connection cost |
| DEX coverage | Manual parsing per poll | Native instruction-level access |

---

## What's Next — Week 2 Plan

1. **Signal engine enrichment with Solana data** — Feed Solana whale flows into our 4-tier signal engine (currently strongest on EVM chains) so SOL/JUP/RAY/BONK signals reflect real on-chain smart money positioning
2. **Wallet Consensus tab** — Show what tokens the top 20 most-active wallets are converging on (early on-chain pattern — descriptive only, not a trading recommendation)
3. **Pod Detection** — Identify clusters of wallets that trade in coordination (potential insider groups or DAO treasuries)
4. **ORCA Solana context** — Let users ask "What are Solana whales buying?" and get grounded answers from real-time Yellowstone data

---

## Links

- **Live product:** [sonartracker.io](https://sonartracker.io)
- **Whale Tracker:** [sonartracker.io/whale-tracker](https://sonartracker.io/whale-tracker)
- **Backtest:** [sonartracker.io/backtest](https://sonartracker.io/backtest)
- **AI Advisor (ORCA):** [sonartracker.io/ai-advisor](https://sonartracker.io/ai-advisor)

---

## Screenshots

*(Attach the 4 screenshots: Wallet Leaderboard, Backtest Results with Equity Curve, Macro Factors + Key Voices panel)*
