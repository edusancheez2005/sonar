# Saif Meeting Prep - March 2026

## PEP TALK FRAMING

This is not a side project anymore. We have 500 users, grant applications in progress, and a pipeline processing real whale transactions across 7 chains. This is a company. We need to treat it like one.

- Commit to consistent weekly delivery (not bursts)
- Set clear weekly goals and review them every call
- Treat this like a part-time job: minimum 10-15 hours/week each
- Ship small things frequently, not big things rarely

---

## COMPETITOR DEEP DIVE: WHAT THEY HAVE THAT WE DON'T

### Arkham Intelligence (raised $12M+)
| Feature | They have it | We have it | Gap |
|---|---|---|---|
| Entity labels (Wintermute, Binance, etc.) | Yes - 100K+ labels | Partial (whale_entity field) | Need comprehensive exchange/fund/whale label database |
| Real-time transfer feed (all chains) | Yes - live stream | Yes - live ticker | Even |
| Exchange flow tracking (net in/out per token) | Yes - dedicated view | Yes - dashboard | Even |
| Wallet profiling (portfolio, history, PnL) | Yes - deep profiles | No | Major gap |
| "Trending Insights" (AI-generated narratives) | Yes - auto bulletins | No (ORCA is conversational only) | Gap - need proactive AI |
| Chat room / community | Yes - built-in | No | Minor |
| Token page with holder analysis | Yes | Partial (token page exists, no holder breakdown) | Medium gap |
| Custom alerts (wallet/entity/token) | Yes | No alerts system | Major gap |
| API for developers | Yes - full API | No public API yet | Gap |

### Nansen (raised $75M+)
| Feature | They have it | We have it | Gap |
|---|---|---|---|
| Smart Money tracking (labelled wallets) | Yes - core product | Partial (70K wallets, basic labels) | Need better labelling |
| Token God Mode (deep token analytics) | Yes | Partial (token page) | Need deeper drilldown |
| Smart Alerts (wallet movement notifications) | Yes - killer feature | No | Major gap |
| Agentic Trading (AI agent that executes) | Yes (new, mobile) | No | Future goal |
| DEX trading integrated in platform | Yes (Solana, Base) | No | Not priority now |
| Portfolio analytics | Yes | No | Medium gap |
| 18+ chain support with full indexing | Yes | 7 chains monitored | Expanding |
| CLI / MCP for AI agents | Yes (new) | No | Future |

### Glassnode ($40-800/mo)
| Feature | They have it | We have it | Gap |
|---|---|---|---|
| 200+ on-chain metrics (NUPL, SOPR, etc.) | Yes - core product | No | Different product focus |
| Institutional research reports | Yes | No | Not priority |
| Custom dashboards/charts (Studio) | Yes | Basic dashboard | Not priority |
| Macro market indicators | Yes | No | Could add later |

### What Sonar Has That NOBODY Else Has
| Feature | Sonar only |
|---|---|
| ORCA conversational AI with multi-source context injection | Nobody does this |
| 4-tier composite signal engine (whale + price + sentiment + community) | Unique architecture |
| 10-component sentiment algorithm with trap detection | Unique |
| Free platform (competitors charge $50-150/mo) | Price moat |
| AI buy/sell classification (not just raw data) | Arkham shows transfers, we classify intent |

---

## THE VALUE CHAIN: HOW TO THINK ABOUT WHAT WE BUILD

```
Stage 1: DATA COLLECTION (mostly done)
  Gather raw blockchain transactions across chains
  Status: 7 chains live (ETH, BTC, SOL, XRP, Polygon, Tron + Whale Alert)
  
Stage 2: DATA CLASSIFICATION (partially done)
  Classify every transaction as BUY/SELL/TRANSFER
  Status: ERC-20 strong, Solana basic, others basic
  Gap: Need higher confidence classification on all chains

Stage 3: DATA ANALYSIS (partially done)
  Signal engine, sentiment algorithm, net flow calculations
  Status: Live for ERC-20 tokens
  Gap: Need enrichment from Solana/BTC classification

Stage 4: AI INTELLIGENCE (early stage)
  ORCA answers questions using classified data
  Status: Live, using GPT-4o/Grok with context injection
  Gap: No proactive insights, no auto-generated reports

Stage 5: CUSTOM MODEL (future)
  Train on Sonar's proprietary classified data
  Status: Not started
  Gap: Need 500K+ classified transactions as training data

Stage 6: AUTONOMOUS AGENT (future)
  AI that continuously monitors, alerts, and advises
  Status: Concept only
  Gap: Requires Stage 5 model + real-time alerting
```

---

## SAIF'S DEV ROADMAP (Next 8 Weeks)

### Sprint 1: Weeks 1-2 - Data Quality
- [ ] Remove ALL stablecoins from Supabase writer (not just transfers, ALL)
- [ ] Verify Solana + Bitcoin transactions showing correctly on dashboard with proper labels
- [ ] Fix dashboard loading speed (investigate slow queries, add indexes, cache summary endpoint)
- [ ] Add CryptoPanic as news source (secondary to existing news pipeline)

### Sprint 2: Weeks 3-4 - Classification Quality
- [ ] Improve Solana classification confidence (currently using rough USD estimates)
- [ ] Add Solana CEX wallet detection (Binance, Coinbase Solana deposit addresses)
- [ ] Add Jupiter/Raydium swap detection specifically
- [ ] Benchmark accuracy: manually label 200 Solana transactions, measure classification accuracy

### Sprint 3: Weeks 5-6 - Wallet Intelligence
- [ ] Build exchange address database for Solana (map known CEX wallets)
- [ ] Add whale entity labelling (map addresses to known entities: funds, exchanges, whales)
- [ ] Wallet PnL tracking (simple: track an address's buy/sell history and net position)

### Sprint 4: Weeks 7-8 - Alerts Foundation
- [ ] Design alert system schema (what triggers, how delivered)
- [ ] Build backend: "notify user when wallet X moves" or "token Y has whale accumulation above $X"
- [ ] Email/push notification delivery (Brevo or Resend)

---

## EDUARDO'S ROADMAP (Next 8 Weeks)

### Sprint 1: Weeks 1-2 - Grants + Marketing Foundation
- [ ] Submit Solana Foundation grant
- [ ] Submit Superteam UK microgrant ($10K)
- [ ] Set up content automation (Anthropic + OpenClaw for blog/social posts)
- [ ] First marketing video (Holo AI)

### Sprint 2: Weeks 3-4 - Product Differentiation
- [ ] Add "Ask ORCA" buttons on every dashboard section (click to ask AI about that specific data)
- [ ] Add proactive AI insights: auto-generated daily whale activity summary
- [ ] Add "Whale Alert" notification badge / feed on the navbar (like a notification bell)

### Sprint 3: Weeks 5-6 - Growth + Events
- [ ] Prepare for IFGS (April 21, London) - pitch deck, investor materials
- [ ] Apply to Barclays Eagle Labs, Techstars, additional grants
- [ ] SEO push: 5 new targeted blog posts per week

### Sprint 4: Weeks 7-8 - AI Differentiation
- [ ] Research Foundry / Azure ML for fine-tuning with Sonar data
- [ ] Design the training data pipeline (classified transactions + price outcomes)
- [ ] Prototype: fine-tuned model on first 100K classified transactions
- [ ] Evaluate Grok vs OpenAI vs open-source (Llama 3 / Mistral) for the custom model

---

## FEATURES THAT WOULD MAKE SONAR UNIQUELY VALUABLE

### Tier 1: These make people use Sonar daily (build NOW)
1. **Real-time Smart Alerts** - "ETH whale deposited $5M to Binance 2 minutes ago" push notification. This is Nansen's killer feature. We need our version.
2. **Ask ORCA Buttons** - Contextual AI everywhere. User sees a whale move, clicks "Ask ORCA", gets instant analysis. Nobody has this.
3. **Daily Whale Report** - Auto-generated: "Here's what whales did in the last 24 hours." Sent to email. Zero effort from user. Massive retention.

### Tier 2: These make Sonar worth recommending (build next month)
4. **Wallet Watchlist with Alerts** - "Follow this whale wallet, alert me when it moves." Users will share their watchlists.
5. **Whale Copy-Trading Signals** - "This wallet has done 8 profitable trades in 30 days. Here's what it just bought." Actionable.
6. **Token Risk Score** - Combine whale behaviour + social sentiment + price action into a single "is this safe to buy" score. Nobody does this well.

### Tier 3: These make Sonar an industry reference (build in 3-6 months)
7. **Public API** - Let other devs build on our classified whale data. Ecosystem play for grants.
8. **Custom Sonar AI Model** - Trained on millions of our classified transactions. The ultimate moat.
9. **Autonomous Agent Mode** - ORCA runs 24/7, generates insights proactively, sends alerts when it spots something unusual.

---

## KEY METRIC TARGETS

| Metric | Now | 30 Days | 90 Days |
|---|---|---|---|
| Users | 500 | 1,000 | 3,000 |
| DAU | ~20 | 100 | 300 |
| ORCA conversations/day | ~5 | 25 | 100 |
| Chains with deep classification | 1 (ETH) | 3 (+ SOL, BTC) | 5+ |
| Classified transactions in DB | ~100K | 300K | 1M |
| Grant funding received | $0 | $0-10K | $15-25K |
| Blog posts | 20 | 30 | 55 |

---

## AGENDA FOR THE CALL

1. **Pep talk** (5 min) - We're building a real company. 10-15 hrs/week minimum. Weekly goals. Weekly reviews.
2. **Saif's update** (10 min) - What he's done, what's blocking, what's next
3. **Sprint planning** (15 min) - Walk through Sprint 1 together, assign tasks, set deadline
4. **Product direction** (10 min) - Show Arkham's features, discuss what to build first
5. **Eduardo's update** (5 min) - Grants, marketing, funding
6. **Action items** (5 min) - Clear list, who does what, done by when
