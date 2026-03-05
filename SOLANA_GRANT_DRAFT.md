# Solana Foundation Grant Application — FINAL DRAFT

> **Form URL:** https://share.hsforms.com/1GE1hYdApQGaDiCgaiWMXHA5lohw  
> **Application guidance:** https://tinyurl.com/y2abys36  
> **Date:** 4 March 2026  
> **Status:** READY — copy-paste each field  
> **Category:** AI

---

## Pre-filled fields

| Field | Value |
|---|---|
| Company name | Sonar |
| Website URL | www.sonartracker.io |
| Country | United Kingdom |
| First Name | Eduardo |
| Last Name | Sanchez Morales |
| Email Address | t-eduardos@microsoft.com |
| Solana On-Chain Accounts | N/A |
| Funding category | AI |

---

## FIELD: Your project / idea *

```
Sonar is an AI-powered crypto intelligence platform live at sonartracker.io. It gives traders real-time whale transaction tracking, AI-generated buy/sell signals, multi-source sentiment analysis, and a conversational AI advisor called ORCA. All in one platform, at a fraction of what competitors charge.

What we have built and what is live today:
- Real-time whale transaction tracking across multiple blockchains (Ethereum, Bitcoin, Tron, and others) using raw on-chain data via Alchemy, with deep AI-powered buy/sell classification currently live for ERC-20 tokens. This classifies whether each whale move is accumulation, distribution, or a neutral transfer
- ORCA AI Advisor: a conversational crypto intelligence agent that answers trader questions by combining our proprietary whale flow data with live prices, social sentiment (LunarCrush), news, and community data. All injected into context at query time so every answer is grounded in real data, not generic
- A composite signal engine (4-tier architecture): Tier 1 CEX whale flow analysis (40% weight), Tier 2 multi-timeframe price momentum and volume (30%), Tier 3 news sentiment and social intelligence (20%), Tier 4 community and developer activity (10%). Each tier outputs a conviction-weighted score that maps to STRONG BUY through STRONG SELL, with trap detection for bullish traps, dead-cat bounces, and social pump divergences
- A sentiment algorithm (Enhanced Unified Sentiment v2.0) fusing 10 weighted components across whale data, price action, social signals, news, and community votes, with built-in safeguards and divergence detection between whale behaviour and price direction
- Token-level deep dives, a whale leaderboard (70,000+ tracked wallets), trending coins, heatmaps, a 60-term glossary, a blog with 20+ articles, daily automated news ingestion with LLM-powered sentiment classification, and social pulse feeds
- We already track Solana ecosystem tokens (SOL, JUP, RAY, BONK, WIF, PYTH, JTO) for prices, news, and social sentiment

The platform is in MVP stage. We have reached 500 users through pure organic SEO with zero marketing spend. The platform is completely free to use. Users only pay for extended AI advisor usage, which covers our inference costs. The fact that users are finding the product through search alone, with no ads, no influencer campaigns, and no paid distribution, validates genuine market demand for accessible whale intelligence.

What we are requesting funding to build:
We want to bring Solana-native on-chain whale intelligence into Sonar. Today we receive whale alerts across multiple chains, but our deep AI classification engine (the layer that determines whether a move is a buy, sell, or transfer) only covers ERC-20 tokens. This grant would fund bringing that AI classification to Solana:
1. A Solana on-chain data pipeline to ingest and classify large SPL token transfers in real time. We will integrate with Helius RPC (Enhanced Transactions API) for immediate production use, with a roadmap to operate our own Solana RPC node for full data independence, lower latency, and zero reliance on third-party rate limits
2. Adaptation of our AI buy/sell classification engine for Solana's transaction model, detecting accumulation vs distribution using exchange flow patterns, DEX swap signatures (Jupiter, Raydium, Orca), and wallet behaviour scoring
3. Solana DEX whale tracking to identify smart money positioning before price impact hits centralised exchanges
4. Full integration of Solana on-chain data into ORCA's context window so traders can ask "What are whales doing with SOL?" and get a grounded, multi-source answer

Long-term AI vision: We plan to train a custom model specifically on Sonar's proprietary data: millions of classified whale transactions, sentiment scores, signal outputs, and price outcomes. The goal is to build a crypto-native intelligence model that outperforms general-purpose LLMs at understanding on-chain behaviour. Solana's high throughput transaction data would be a critical training corpus for this model, and this grant would generate the Solana-specific dataset to make that possible.
```

---

## FIELD: Funding amount *

```
$15,000
```

---

## FIELD: Is / will this project be open sourced? *

**Select: Partially**

---

## FIELD: Specify the amount of funding you are requesting and list the milestones that will be completed to unlock each portion of that funding. *

```
Total request: $15,000

PRODUCT DEVELOPMENT MILESTONES:

Milestone 1: Solana On-Chain Data Pipeline ($3,500). Weeks 1 to 4
Deliverable: Helius RPC integration (Enhanced Transactions API) live in production. Real-time ingestion of SOL and top 20 SPL token transfers above $10K threshold. Transactions stored in Supabase with a normalised schema matching our existing whale_transactions table, enabling immediate compatibility with our dashboard, signal engine, and sentiment algorithm.
Measurable outcome: Pipeline processing 10,000+ Solana whale transactions per day. Solana transactions queryable via the same API endpoints as existing data. Pipeline uptime above 99 percent over a 30-day window.

Milestone 2: AI Buy/Sell Classification for Solana ($3,000). Weeks 5 to 8
Deliverable: Our proprietary classification engine fully adapted for Solana's account model. Each whale transaction labelled as BUY, SELL, or TRANSFER using: exchange wallet detection (CEX deposit and withdrawal patterns specific to Solana), DEX interaction parsing (Jupiter swap signatures, Raydium pool interactions, Orca whirlpool trades), and wallet behaviour scoring (transaction frequency, counterparty diversity, historical patterns). Classification results feed directly into our 4-tier signal engine and 10-component sentiment algorithm for all tracked Solana tokens.
Measurable outcome: Classification accuracy above 85 percent, validated against manual labelling of 500 test transactions. Buy/sell labels visible on all Solana token pages and in the dashboard whale feed. Signal engine and sentiment algorithm producing Solana-enriched scores for SOL, JUP, RAY, BONK, WIF, PYTH, and JTO.

Milestone 3: Dashboard, ORCA AI Integration, and Solana Analytics ($3,000). Weeks 9 to 12
Deliverable: Solana whale data fully live on sonartracker.io. Dashboard displays Solana whale net flow, buy/sell ratio, unique whale count, and top moves alongside existing multi-chain data. Dedicated Solana whale analytics section with DEX flow breakdowns (Jupiter vs Raydium vs Orca volume), smart money wallet tracking, and accumulation/distribution trends. ORCA AI advisor receives full Solana on-chain context in its context window and can answer Solana-specific whale questions grounded in real data.
Measurable outcome: Solana whale section live on dashboard. ORCA accurately references Solana whale data in at least 90 percent of Solana-related queries. Solana-specific analytics page live with DEX breakdown, top wallets, and net flow charts.

Milestone 4: Open-Source Release and Solana Training Dataset ($1,500). Weeks 13 to 14
Deliverable: Public GitHub repository under MIT licence containing the complete Solana transaction ingestion pipeline, buy/sell classification methodology, DEX trade extraction logic, and wallet scoring heuristics. Full documentation with setup guide, API specification, and integration examples. The classified Solana transaction dataset generated during Milestones 1 to 3 becomes the foundation of our proprietary training corpus for a future Solana-native crypto intelligence model. Every classified transaction paired with the price outcome, sentiment context, and signal result at that point in time, creating labelled training data at scale.
Measurable outcome: Repository published with minimum 3 working integration examples. Documentation complete. Announced on Solana developer channels. Initial training dataset of 100,000+ classified and labelled Solana whale transactions accumulated.

Milestone 5: 12 Month Production Infrastructure ($4,000). Ongoing
Deliverable: Twelve months of production infrastructure to keep the Solana pipeline running reliably post-launch, plus active developer engagement around the open-source Solana connector through documentation and developer support on Solana forums and channels.
Infrastructure costs (12 months): Helius RPC Business tier $3,588, Supabase Pro $300, Vercel Pro $240. Total: $4,128. Any shortfall covered by project subscription revenue.
Measurable outcome within 3 months of full launch:
- 2,000+ unique users viewing Solana whale data on Sonar per month
- 50+ GitHub stars on the open-source repository
- Solana whale data referenced in 20+ ORCA AI conversations per day
- At least 2 third-party projects integrating the open-source Solana connector
- 250,000+ classified Solana whale transactions in our training dataset

TOTAL BUDGET SUMMARY:
Founder engineering time (Milestones 1 to 4, 14 weeks): $11,000
Production infrastructure, 12 months (Milestone 5): $4,000
Total: $15,000
```

---

## FIELD: Relevant metrics about the usage of your project/product *

```
Sonar is in MVP stage and all growth so far is 100 percent organic. Zero marketing spend, zero paid ads, zero influencer campaigns:

- 500 users acquired through pure SEO and organic search. People are actively searching for affordable whale intelligence and finding Sonar, which validates genuine product-market fit.
- The platform is completely free. Users only pay for extended AI advisor usage to cover inference costs
- 70,000+ whale wallet addresses tracked and classified across 10+ blockchains
- ORCA AI advisor handling real trader conversations daily, each one grounded in live whale flow, price, sentiment, and news data
- 7 Solana tokens already tracked (SOL, JUP, RAY, BONK, WIF, PYTH, JTO) for prices, social intelligence, and news
- 20+ blog articles and 60 glossary terms driving SEO traffic
- Signal engine processing 4-tier composite scores for every tracked token in real time
- Sentiment algorithm aggregating 10 weighted data components with trap detection and divergence alerts
- Entire platform built, deployed, and maintained by a solo founder in under 4 months
- Product validated pre-launch with 32 active crypto traders who provided feedback that shaped the feature set
```

---

## FIELD: What best describes the funding status of your project? *

**Select: whichever option matches "Self-funded" or "Bootstrapped"**

---

## FIELD: Competition *

```
The direct competitors in crypto whale intelligence and on-chain analytics are:

Nansen: $150 per month. Institutional-grade blockchain analytics with wallet labels and smart money dashboards. Comprehensive but priced for institutions and funds. No conversational AI advisor. No real-time signal engine. Sonar offers comparable whale intelligence for free with an AI layer Nansen does not have.

Arkham Intelligence: $50 per month. Blockchain entity identification and wallet labelling. Strong at attribution but lacks AI-powered buy/sell classification, multi-source sentiment fusion, and a conversational interface. Our ORCA AI advisor and composite signal engine are capabilities Arkham does not offer.

Glassnode: $39 to $800 per month. On-chain metrics and aggregate indicators. Focuses on macro on-chain metrics rather than individual whale transaction tracking. No AI chat interface, no real-time signals. Sonar tracks individual whale moves and explains them through AI.

Dune Analytics: free to paid. SQL-based blockchain data platform. Powerful but requires technical SQL knowledge, creating a high barrier to entry for retail traders. No AI layer, no real-time alerts, no signal generation. Sonar is plug-and-play and AI-explains everything.

Whale Alert: free. Raw whale transaction notifications. Shows that a large transfer happened but does not classify whether it is a buy, sell, or transfer. No analysis, no context, no AI. Sonar takes the same raw data and adds AI classification, scoring, and explanation.

LunarCrush: free to paid. Social intelligence for crypto only. Covers social metrics well but has no whale tracking data and on chain analytics. Sonar combines social intelligence (we use LunarCrush as a data source) with whale tracking, news sentiment, and price data in one fused AI system.

Our core differentiator: No competitor combines whale tracking plus AI buy/sell classification plus multi-source sentiment analysis plus a conversational AI advisor in a single platform, completely free to use with optional paid AI usage. We are the only platform where a trader can see what whales are doing and immediately ask an AI "what does this mean and what should I do", grounded in real-time proprietary data, not generic LLM knowledge.
```

Project for good:	
Sonar qualifies as a public good on four grounds:

1. Making blockchain data transparent and accessible to all traders:
The crypto market has a fundamental information asymmetry problem. Whales and institutions have access to sophisticated on-chain analytics tools costing $50 to $150 per month (Arkham, Nansen), while the majority of retail traders are effectively trading blind. They cannot see that a whale just moved $5 million of SOL to an exchange before a price drop. They cannot see accumulation patterns forming before a breakout. This lack of transparency leads directly to losses for ordinary traders who are always the last to know. Sonar exists to fix this. By making whale intelligence available for free to every user, we bring transparency to blockchain data that was previously reserved for institutions. Every Solana trader and community member deserves to understand what smart money is doing on the chain they are participating in. This grant helps us deliver that transparency specifically for Solana.

2. Open-source contribution to the Solana ecosystem:
We will publish the complete Solana whale intelligence infrastructure as open-source: the transaction ingestion pipeline (Helius RPC to normalised format), the buy/sell classification engine adapted for Solana's account model and SPL tokens, the DEX trade extraction logic for Jupiter, Raydium, and Orca, and a public API for querying classified Solana whale transactions. Any Solana developer or project will be able to build whale tracking features using this open-source foundation without starting from scratch. Analytics dashboards, trading bots, DeFi protocols, research tools, and community projects across the Solana ecosystem can all build on top of this infrastructure. The open API means developers do not even need to run the pipeline themselves. More tools built on this foundation means more transparency across the entire ecosystem.

3. Meaningful free community offering:
Sonar is already a free platform. All whale data, signals, sentiment, news, and analytics are available at zero cost. Users only pay for extended AI advisor conversations to cover inference costs. With this grant, we will add Solana whale summary data (aggregate net flow direction, buy/sell ratio, and top whale moves) available on the free tier so any Solana community member can see what smart money is doing on Solana without paying anything. This is not just a feature. It is a direct reduction in information asymmetry for the Solana ecosystem. When retail traders can see whale accumulation and distribution patterns, they make better decisions, lose less money, and stay in the ecosystem longer. Healthy, informed markets benefit everyone.

4. Training data for a Solana-native AI model:
The Solana on-chain data generated through this grant will become part of the training corpus for our planned custom crypto intelligence model: millions of classified Solana whale transactions paired with price outcomes, sentiment contexts, and signal results. When this model is trained, the classification methodology and any open research from it will contribute back to the ecosystem's understanding of on-chain behaviour patterns on Solana. Solana's uniquely high transaction throughput makes it the ideal chain for generating the volume and diversity of labelled data needed to train a model that genuinely understands crypto market microstructure.
```

---

## FIELD: Why You? *

```
I am Eduardo Sanchez Morales, a 20 year old software engineer and cloud solutions architect intern at Microsoft, currently studying computer science at King's College London. I built Sonar entirely on my own, from the first line of code to the live production platform at sonartracker.io, in under 8 months while working at Microsoft and completing my degree. At Microsoft, I build and deploy large-scale distributed pipelines in cybersecurity used by millions of people, and I apply that same production-grade standard to Sonar. Before King's College London, I held a Division 1 tennis offer from the University of Illinois Chicago, and that competitive athlete mindset carries directly into how I build: discipline, consistency, and a refusal to quit. I am an ambassador at my university, actively involved in the entrepreneurship community, and have won both pitch competitions I have entered, including King's College London Idea Factory, the university's flagship entrepreneurship competition, which awarded Sonar a significant cash prize judged by experienced investors and founders that work at companies like Google. I have deep experience in blockchain and crypto, and I understand the space not just as an engineer but as someone who has seen firsthand how information asymmetry hurts real people. The reason I built Sonar is personal. I watched retail traders lose money over and over because they did not have access to the same information that whales and institutions have. The tools that could have warned them cost $50 to $150 per month. Most people cannot afford that. So I built Sonar and made it free. I believe every trader deserves to see what smart money is doing, regardless of how much they can pay. That is not a business strategy. That is a conviction.

My edge over the competition is that I have the technical capability, the professional network, and the drive to deliver this. I build production-grade data pipelines and cloud infrastructure at Microsoft every day, surrounded by world-class engineers, and I bring that engineering rigour and that network directly into Sonar. I have a technical partner in Dubai joining as cofounder to lead AI and data engineering. I have a genuine passion for making markets fair, and I have already shipped a full platform solo to prove it. I care deeply about making blockchain data understandable for everyday traders, and I have the engineering ability, the professional resources, and the drive to make it happen.

## Pre-Submission Checklist

- [ ] Review application guidance at https://tinyurl.com/y2abys36
- [ ] Check Solana Foundation RFP database for matching RFPs: [Active RFPs Airtable](https://airtable.com/apppDmK2Pin9WX8jV/shrR0uMKu4N57TGW7/tbli2ERM3sdhyHJYB)
- [ ] Select **"Partially"** for open source question
- [ ] Select funding status (bootstrapped / self-funded)
- [ ] Copy-paste each field in order
- [ ] Proofread entire form before submitting
- [ ] Click Submit


