# Saif Meeting Prep — Joining Sonar as Cofounder

**Date:** February 2026  
**Purpose:** Walk Saif through Sonar, the vision, the roadmap, and how he fits in as cofounder

---

## 1. WHAT SONAR IS TODAY (Demo to Saif)

Sonar is a **crypto analytics + AI platform** already live at sonartracker.io, built on Next.js/React with Supabase, deployed on Vercel.

### What's already built and working:
| Feature | Status |
|---------|--------|
| Real-time whale transaction tracking ($500K+) | Live |
| Dashboard with 24h KPIs, buy/sell ratio, volume | Live |
| Token-level deep dives (whale flow, chain breakdown) | Live |
| Whale leaderboard (top addresses by net flow) | Live |
| Orca AI Advisor (GPT-4o powered, multi-source context) | Live |
| Multi-source sentiment engine (6 signal sources, trap detection) | Live |
| Composite Token Score (0-100, buy/sell labels) | Live |
| Automated news ingestion + LLM sentiment analysis | Live (cron) |
| Community sentiment voting (bullish/bearish/neutral per token) | Live |
| Trending coins (gainers/losers across timeframes) | Live |
| Signal-based backtesting engine | Live |
| Autonomous trading bot (simulated, script) | Prototype |
| Premium subscriptions via Stripe ($7.99/mo) | Live |
| Watchlists, alerts, CSV export | Live |

### Current data sources:
- **Whale Alert API** — whale transactions ($500K+), synced every 10 min
- **CoinGecko Pro API** — prices, OHLC, market data, trending, community/dev data
- **LunarCrush API** — Galaxy Score, social sentiment, engagement, news
- **CryptoPanic API** — secondary news source
- **OpenAI GPT-4o / GPT-4o-mini** — Orca AI chat + headline sentiment analysis
- **Supabase (PostgreSQL)** — all data storage, auth, user management
- **Stripe** — payment processing

### Tech stack:
- Next.js 14 (App Router), React 18, TypeScript/JavaScript mix
- Styled-components, Framer Motion, Chart.js
- Supabase Auth + PostgreSQL
- Vercel (hosting + cron jobs)
- OpenAI SDK

---

## 2. THE VISION — WHERE SONAR IS GOING

### Phase 1: Foundation & Growth (Now → May 2026)
- **Win Idea Factory** — potential $3-4K seed funding
- **Onboard Saif as cofounder** — split responsibilities
- **Polish the MVP** — fix bugs, improve UX, mobile responsiveness
- **Launch marketing push** — social media, crypto communities, content

### Phase 2: Data Independence (May → Aug 2026)
- **Build own blockchain data pipeline** (see Section 5 below)
- **Expand to Solana** via Helius RPC or direct node
- **Reduce API costs** by running own indexers
- **Add more chains** (Base, Sui, TON, etc.)

### Phase 3: AI Differentiation (Aug → Dec 2026)
- **Fine-tune Orca AI** on crypto-specific data (see Section 6)
- **Train custom Sonar model** for sentiment/prediction
- **Real-time alerting engine** with AI-driven signals
- **Portfolio AI copilot** — "what should I do with my portfolio right now?"

### Phase 4: Scale & Monetize (2027)
- **API-as-a-service** — let others use Sonar's data/AI via API
- **Institutional tier** — hedge funds, trading desks
- **Mobile app** (React Native)
- **Seek VC funding / accelerator** (Y Combinator, a]6z crypto, etc.)

---

## 3. HOW SAIF FITS IN — ROLE & RESPONSIBILITIES

### Why Saif is a great fit:
- **CompSci engineering background** — can build and ship
- **AI enthusiasm** — perfect for Orca AI fine-tuning, model work
- **Cofounder energy** — Sonar needs a second brain, not just a contributor

### Proposed split:

| Area | Eduardo | Saif |
|------|---------|------|
| **Product vision & design** | Lead | Input |
| **Frontend / UI / UX** | Lead | Support |
| **Backend / APIs / Data pipelines** | Shared | Shared |
| **AI / ML / Model training** | Support | **Lead** |
| **Blockchain data engineering** | Shared | **Lead** |
| **Marketing & Growth** | Lead | Support |
| **Business / Fundraising / Pitch** | Lead | Support |
| **DevOps / Infra / Scaling** | Support | **Lead** |

### Immediate tasks for Saif (first 2-4 weeks):
1. **Get familiar with the codebase** — run locally, read through key files
2. **Pick up the blockchain data pipeline research** — Helius, RPCs, node options
3. **Start exploring Orca AI fine-tuning** — what data do we need, what approach
4. **Help clean up tech debt** — TypeScript migration, code organization
5. **Set up proper CI/CD** — testing, linting, deployment pipeline

---

## 4. MARKETING & GROWTH STRATEGY

### Channels to push:
| Channel | Action | Who |
|---------|--------|-----|
| **Twitter/X** | Daily whale alerts, market insights, Orca screenshots | Eduardo |
| **Reddit** | r/cryptocurrency, r/CryptoMoonShots, r/algotrading | Both |
| **Discord** | Build a Sonar community server | Saif |
| **YouTube** | Short demos, "how whales move markets" educational content | Eduardo |
| **Product Hunt** | Launch when polished | Both |
| **Crypto forums** | BitcoinTalk, Telegram groups | Both |
| **Blog/SEO** | Crypto analytics articles on sonartracker.io/blog | Both |
| **University networks** | CS/finance clubs, hackathons | Saif |

### Growth tactics:
- **Free tier is the funnel** — whale tracking + limited Orca AI for free
- **Shareable insights** — "Sonar detected 3 whale buys on ETH in the last hour" cards
- **Open API** (limited) — let devs build on our data → builds community
- **Referral program** — "invite a friend, get 1 extra Orca question/day"
- **Partnerships** — crypto newsletters, influencers, trading communities

---

## 5. BLOCKCHAIN DATA — HOW TO GET IT OURSELVES

### How platforms like Helius / Alchemy / Moralis get their data:

They all do the same core thing: **run blockchain full/archive nodes and index the raw data**.

```
Blockchain Network (e.g., Solana, Ethereum)
        ↓
[Full/Archive Node] ← runs the node software, stores ALL historical data
        ↓
[Indexer/Parser] ← decodes raw blocks, transactions, logs, token transfers
        ↓
[Database] ← PostgreSQL, ClickHouse, or custom storage
        ↓
[API Layer] ← REST/WebSocket/GraphQL endpoints
        ↓
Users (us, right now, paying for it)
```

### Option A: Run our own nodes (cheapest long-term, hardest)

| Chain | Node Software | Storage Needed | Monthly Cost (Cloud) |
|-------|--------------|----------------|---------------------|
| Ethereum | Geth + Erigon (archive) | ~2-3 TB SSD | $200-400/mo |
| Solana | Solana Validator (RPC) | ~2 TB NVMe | $300-500/mo |
| BSC | BSC Geth | ~3 TB | $200-300/mo |
| Polygon | Bor + Heimdall | ~4 TB | $200-300/mo |

**Pros:** Full control, no rate limits, no API costs, can index exactly what we need  
**Cons:** DevOps heavy, storage costs grow, need to maintain uptime, Saif would need to lead this

### Option B: Use free/cheap RPC providers + build indexers on top

| Provider | Free Tier | Paid | Chains |
|----------|-----------|------|--------|
| **Helius** | 1M credits/mo | $49/mo for 10M | Solana |
| **Alchemy** | 300M compute units/mo | $49/mo | ETH, Polygon, Arb, Opt, Base |
| **QuickNode** | 50M API credits/mo | $49/mo | Multi-chain |
| **Infura** | 100K requests/day | $50/mo | ETH, Polygon, etc. |
| **Chainstack** | 3M requests/mo | $49/mo | Multi-chain |

**Best approach for Sonar right now:**  
Use **Alchemy (free tier)** for Ethereum + L2s and **Helius (free tier)** for Solana, then build our own indexing layer on top. This replaces the Whale Alert API ($0→ free RPC) and gives us more granular data.

### Option C: Use open-source indexing frameworks

| Tool | What It Does |
|------|-------------|
| **The Graph (subgraphs)** | Deploy custom indexers on blockchain data, free for many chains |
| **Subsquid** | High-performance indexing, free tier, Ethereum + many chains |
| **Goldsky** | Mirror blockchain data to your own database |
| **Ponder** | Open-source, build your own indexer in TypeScript |
| **Cryo** (by Paradigm) | CLI tool to extract blockchain data to Parquet files |
| **Dune Analytics** | SQL on blockchain data, can export via API |

**Recommended path for Sonar:**
1. **Short term:** Keep Whale Alert + CoinGecko, add Helius free tier for Solana
2. **Medium term:** Build a lightweight indexer using **Alchemy websockets + Ponder** to track whale transactions ourselves on ETH/L2s — replaces Whale Alert entirely
3. **Long term:** Run archive nodes for key chains (ETH, SOL) when revenue supports it

### What we'd index ourselves:
- Token transfers above threshold (whale transactions)
- DEX swaps (Uniswap, Jupiter, Raydium)
- Liquidity pool changes
- Smart contract interactions (staking, lending)
- NFT whale movements
- Cross-chain bridge transactions

**This is a perfect project for Saif** — it's backend/infra engineering with blockchain knowledge.

---

## 6. FINE-TUNING ORCA AI / BUILDING A SONAR MODEL

### Current state:
- Orca uses **GPT-4o** with a custom system prompt + real-time data context injection
- Works well but: expensive ($0.01-0.03 per query), generic model, no crypto-specific training

### Option 1: Fine-tune GPT-4o-mini on crypto data
- **Cost:** ~$0.003/1K training tokens (very cheap to fine-tune)
- **What we'd train on:**
  - Historical Orca conversations (we log everything in Supabase)
  - Crypto analysis reports (from research firms)
  - Our own sentiment + whale analysis outputs
  - "Gold standard" responses we write ourselves
- **Result:** Cheaper per-query (~60% less), faster, more crypto-native responses
- **Timeline:** 2-4 weeks to collect data + fine-tune

### Option 2: Fine-tune an open-source model (Llama 3, Mistral, Phi-3)
- **Cost:** Free model weights, need GPU for training (~$1-5/hr on cloud)
- **Hosting:** Could run on a single A100 or even A10G ($1-2/hr on RunPod/Lambda)
- **Pros:** Full control, no per-query API cost, can host ourselves
- **Cons:** Needs more engineering, lower baseline quality, inference infra needed
- **Timeline:** 4-8 weeks

### Option 3: Hybrid — Fine-tuned small model + GPT-4o fallback
- Use a fine-tuned **Llama 3 8B** or **Mistral 7B** for 80% of queries (fast, cheap)
- Route complex queries to GPT-4o (expensive but best quality)
- Smart router decides based on query complexity
- **This is the most practical approach**

### What a "Sonar Model" would know:
- Whale transaction pattern analysis
- Token sentiment from multiple data sources
- Crypto market microstructure
- DeFi protocol interactions and what they mean
- Historical price action context
- When to be bullish vs bearish (trained on our sentiment algorithm output)

### Training data we already have:
- All Orca chat history (in Supabase `chat_history` table)
- All sentiment analysis outputs
- All news + LLM sentiment scores
- Whale transaction patterns
- Token scores over time
- Backtesting results

**This is perfect for Saif** — AI/ML engineering, model training, evaluation, deployment.

---

## 7. FUNDING & BUSINESS

### Current situation:
- **Idea Factory Finals** — potential $3-4K prize
- **Revenue:** Stripe subscriptions ($7.99/mo premium tier), but early stage
- **Costs:** Vercel (free tier), Supabase (free tier), OpenAI (~$20-50/mo), CoinGecko Pro ($0-130/mo), Whale Alert (~free tier)

### What to do with funding:
| Priority | Cost | What |
|----------|------|------|
| 1 | $0 | Helius + Alchemy free tiers for blockchain data |
| 2 | $50-100/mo | GPU compute for model fine-tuning (RunPod/Lambda) |
| 3 | $49/mo | Upgraded API tier (Helius or Alchemy) if needed |
| 4 | $200/mo | Archive node hosting (when ready) |
| 5 | $0 | Marketing (organic first — Twitter, Reddit, Discord) |
| 6 | $500 one-time | Domain, branding, design assets |

### Next fundraising options:
- **University grants/competitions** — keep applying
- **Crypto grants:** Solana Foundation, Ethereum Foundation, Polygon grants
- **Pre-seed angels** — crypto-native investors
- **Accelerators:** Y Combinator, Techstars, Alliance DAO (crypto-specific)

---

## 8. TASK DELEGATION — NOW THAT THERE'S TWO OF US

### Immediate sprint (Weeks 1-2):
| Task | Owner | Priority |
|------|-------|----------|
| Saif: clone repo, run locally, understand codebase | Saif | P0 |
| Saif: set up dev environment, get API keys | Saif | P0 |
| Eduardo: prep Idea Factory Finals pitch | Eduardo | P0 |
| Eduardo: fix any critical bugs, polish UX | Eduardo | P0 |
| Both: align on communication tools (Slack/Discord, Linear/GitHub Projects) | Both | P0 |

### Sprint 2 (Weeks 3-4):
| Task | Owner | Priority |
|------|-------|----------|
| Saif: research + prototype Helius Solana integration | Saif | P1 |
| Saif: evaluate fine-tuning approach for Orca | Saif | P1 |
| Eduardo: marketing launch (Twitter, Reddit, Product Hunt prep) | Eduardo | P1 |
| Eduardo: write blog posts for SEO | Eduardo | P2 |
| Both: define equity split and cofounder agreement | Both | P0 |

### Sprint 3 (Weeks 5-8):
| Task | Owner | Priority |
|------|-------|----------|
| Saif: build Ethereum whale indexer (replace Whale Alert) | Saif | P1 |
| Saif: first fine-tuned Orca model experiment | Saif | P1 |
| Eduardo: mobile-responsive improvements | Eduardo | P2 |
| Eduardo: grow community (Discord, partnerships) | Eduardo | P1 |
| Both: apply for crypto grants (Solana Foundation, etc.) | Both | P1 |

---

## 9. TALKING POINTS FOR THE CALL

### Opening:
- Show Saif the live site (sonartracker.io) and demo key features
- Walk through the codebase structure briefly

### The pitch to Saif:
1. "Sonar is already a working product — not an idea. We have users, a live platform, and real data pipelines."
2. "I need a technical cofounder who can own the AI and data engineering side."
3. "You'd be leading: AI model work, blockchain data pipelines, backend infra."
4. "We have revenue potential ($7.99/mo subscriptions) and I'm about to pitch at Idea Factory."
5. "Crypto analytics is a massive market — look at Nansen ($75M raised), Dune, Glassnode, Arkham."

### Key questions to ask Saif:
- How much time can he commit? (part-time vs full-time)
- What's his experience with ML/model training?
- Has he worked with blockchain/web3 before?
- What excites him most about the project?
- What equity split feels fair? (discuss vesting)

### Things to align on:
- **Equity split** — standard for cofounder joining an existing project: 20-35% with 4-year vesting, 1-year cliff
- **Communication** — daily standups? Weekly syncs? Async (Slack/Discord)?
- **Decision making** — Eduardo is CEO (product/business), Saif is CTO (tech/AI)
- **IP & legal** — simple cofounder agreement (can use Clerky or a template)

---

## 10. COMPETITIVE LANDSCAPE (Know this for the conversation)

| Competitor | What They Do | Their Weakness | Our Edge |
|-----------|-------------|----------------|----------|
| **Nansen** | On-chain analytics, wallet labels | $150/mo, enterprise-focused | We're affordable, AI-powered |
| **Arkham** | Blockchain intelligence, entity labels | Complex UI, no AI advisor | Orca AI is unique |
| **Glassnode** | On-chain metrics | $40-800/mo, no real-time chat | Our AI + real-time whale alerts |
| **Dune Analytics** | SQL on blockchain data | Technical barrier (SQL), no AI | We're plug-and-play |
| **Whale Alert** | Whale transaction alerts | Just alerts, no analysis | We add AI analysis + sentiment |
| **LunarCrush** | Social intelligence | Social only, no whale data | We combine social + whale + AI |

**Our moat:** Multi-source AI analysis (whale + social + news + price) in one conversational interface. Nobody else does this.

---

*"Sonar isn't just a dashboard — it's an AI-powered crypto intelligence platform. With Saif on board, we can build the AI and data moat that makes us untouchable."*
