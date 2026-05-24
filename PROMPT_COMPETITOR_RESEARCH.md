# Deep Research Prompt — Sonar Competitive Position & USP

**Target model:** Claude Opus 4.7 (or any large reasoning model with web research access).
**Companion docs to attach:** `SONAR_STANCE_2026-05-13.md` and `SIGNAL_PIPELINE_2026-05-13.md`.
**Author intent:** Get an honest, non-flattering, evidence-based map of where Sonar realistically sits in the on-chain intelligence market, where the genuine gaps are, and what defensible USP can be built within solo-founder constraints (~$1k spent, no team, UK student visa restrictions on commercial activity).

---

## Read this first
Two documents are attached.
- `SONAR_STANCE_2026-05-13.md` — what Sonar actually is today, written without marketing spin. Includes the honest list of half-built and overclaimed features.
- `SIGNAL_PIPELINE_2026-05-13.md` — the full math and architecture of the signal engine, including measured (negative) performance on clean post-2026-05-11 data.

Treat both as ground truth. Do not flatter the founder. Do not hedge findings to be polite. The founder explicitly wants a brutal read.

---

## Your task
Produce a deep research report that answers four questions in detail. Use real sources where possible (pricing pages, public docs, X/Twitter, blog posts, Crunchbase, on-chain data). Cite everything. Where you're uncertain, say so explicitly.

---

## Question 1 — Detailed competitive landscape map

For each of the following competitors, produce a structured profile:

**Tier A (direct competitors — on-chain intelligence platforms):**
- Nansen
- Arkham Intelligence
- Dune Analytics
- DeBank
- Zerion
- Etherscan / Solscan / Mempool.space (as commodity comparisons)
- Token Terminal
- DefiLlama (note: more protocol-TVL than wallet-tracking, but adjacent)

**Tier B (whale-flow / signal services):**
- Whale Alert (the OG)
- LookOnChain
- Spot On Chain
- ArkhamMonitor
- DeBank Stream
- Cielo Finance
- DexScreener (whale tab)

**Tier C (sentiment / signal aggregators that overlap):**
- LunarCrush
- Santiment
- Messari
- IntoTheBlock
- Glassnode

**Tier D (paid signal services — what Sonar's signal feature competes with whether it wants to or not):**
- TokenMetrics
- CryptoHopper signals
- 3Commas marketplace
- Telegram-based VIP groups (acknowledge but don't dignify)

For each profile, include:
1. **One-sentence positioning** (in their own words from their homepage)
2. **Pricing tiers** (free / paid; specific dollar amounts; what's gated)
3. **Chains genuinely supported** (be honest — many claim multi-chain but are EVM-heavy)
4. **Wallet labelling depth** (estimated label count, methodology if known, transparency of methodology)
5. **What they're actually best at** (one sentence)
6. **What they're actually weak at** (one sentence)
7. **Approximate user/customer scale if knowable** (Crunchbase, blog posts, X posts)
8. **Funding raised** (if applicable; signals competitive war chest)
9. **Last 12 months trajectory** (growing, plateauing, declining, pivoting?)

End Tier A and B with a comparison matrix (rows = competitor, columns = chains, label depth, pricing entry point, transparency of methodology, whale-flow real-time, signal feature, sentiment feature, AI chat feature, mobile app, API access).

---

## Question 2 — Where does Sonar actually sit in this map?

Be brutal. Address each of the following directly:

1. **What does Sonar do better than its closest competitor on each axis?** Compare specifically against Nansen (intelligence), Arkham (entity graph), DeBank (multi-chain portfolio), LookOnChain (whale alerts), and DexScreener (token discovery).
2. **Where is Sonar genuinely behind?** Be specific about wallet labelling depth, brand recognition, SEO position, capital, team size, data feed quality.
3. **Where is Sonar an undifferentiated me-too?** List features Sonar offers that don't add anything any competitor doesn't already do better.
4. **Where is Sonar accidentally differentiated?** List things Sonar does — possibly without realising — that no competitor publishes or ships. Examples to evaluate:
   - Self-auditing pipeline with quarantine flags + circuit breakers.
   - 7-check public end-to-end audit script.
   - Equally-weighted multi-chain whale tracking (BTC + Solana + EVM, not EVM-heavy).
   - Open methodology / forensic transparency pages.
   - Honest BETA framing on AI features.
5. **What's the realistic addressable user base** for an on-chain intelligence product priced at $7.99/mo? Compare to where Nansen ($150-1800/mo), Arkham (free + paid), and Cielo ($30-50/mo) sit.
6. **Where is the price/feature mismatch?** Is Sonar underpriced? Overscoped? Both?

---

## Question 3 — Where is the genuine USP?

Generate three distinct strategic positioning options for Sonar, each with:

1. **One-sentence positioning statement** (homepage hero, ≤12 words)
2. **Three-sentence elevator pitch**
3. **The one feature this positioning is anchored on** (must already exist or be feasible in <4 weeks of solo founder time)
4. **Who it's for** (be specific — not "crypto users")
5. **Who it's explicitly NOT for** (a positioning is only as strong as what it excludes)
6. **Direct head-to-head competitor it would beat on this axis, and why**
7. **What Sonar would need to STOP doing to commit to this positioning** (the deletion list)
8. **The biggest risk to this positioning** and how it would fail

Candidate angles to evaluate (you may add others):
- **A. "The honest multi-chain whale tracker. Open methodology. Every chain."** — leads with multi-chain whale tracking + transparent methodology vs Nansen's black box.
- **B. "Crypto intelligence with the receipts."** — leads on transparency / forensic openness as the differentiator.
- **C. "Whale-flow alerts for the chains nobody covers well — Solana, Bitcoin, L2s."** — narrow chain-focused positioning.
- **D. "The on-chain newsroom — what big money did today, with context."** — lifestyle/editorial framing rather than intelligence-tool framing.
- **E. "Cielo for serious researchers — multi-chain wallet portfolios with replay backtests."** — wallet-tracker-first positioning with backtest as the killer feature.
- **F. "The Bloomberg terminal for crypto retail" priced at $7.99/mo** — power-user positioning with maximalist feature density at consumer price.
- **G. Open data / open methodology angle** — publish all signal logic and a public Postgres replica; bet on developer/quant audience.

For each of your three picks, also estimate:
- **Time to first credible launch** (in weeks of solo founder time)
- **Probability the founder can execute this in 6 months** (be honest, 0-100%)
- **Probability of reaching 1,000 paying users in 12 months** under that positioning (0-100%, with reasoning)

---

## Question 4 — Specific go-to-market tactics for the recommended positioning

Once you've recommended one of the three positionings as the primary, give a concrete 30/60/90-day plan:

### 30-day plan
- Exact homepage hero copy (3 candidate versions).
- Top 5 SEO landing pages to build/rewrite (specific URLs, target keywords with monthly search volume estimates from Google Keyword Planner-style data, target word count).
- Top 5 SEO landing pages to KILL or 301-redirect.
- Top 3 content pieces to publish (titles, angles, distribution channels).
- Specific X (Twitter) accounts to engage with (handles, why).

### 60-day plan
- Two product features to build that reinforce the positioning (with rough scope estimate — solo-founder weeks).
- Two partnerships / integrations to pursue (specific names).
- Pricing changes to consider (with rationale).

### 90-day plan
- Metric targets that would prove the positioning is working (signups/week, organic search rank for top 5 keywords, paid conversion rate, retention week 4).
- Decision criteria for "double down" vs "pivot again."

### Cross-cutting constraints to respect throughout
- **Solo founder, no team.**
- **~$1k of grant money already spent (Alchemy + APIs); ~2 months of grant runway left.**
- **UK Student visa restrictions:** grant funds cannot be used for customer acquisition, sales, paid ads, or self-payment. Allowed: cloud hosting, software subscriptions, data work, AI testing, prototyping, R&D. Marketing must be framed as user research and validation, not customer acquisition.
- **No paid acquisition possible** under the visa terms — all growth must be organic (SEO, content, X, community, referral).
- **Stripe payments at $7.99/mo are already live** — this is a real legal tension with the visa and needs careful framing in the GTM plan (recommend running the GTM plan past the grant officer before executing).

---

## Output format
Single deep-research document, ~6,000-10,000 words, with:
- Clean section headers.
- Tables for comparative content.
- Citations as inline links to primary sources (competitor pricing pages, blog posts, public docs).
- A "what I am uncertain about" section at the end listing the assumptions you had to make and the questions whose answers would change the recommendation.

## Tone
- Strategic-consultant brutal, not investor-pitch flattering.
- Treat the founder as someone who can handle the truth and would rather hear "this positioning has a 15% chance of working" than "this is exciting!"
- Quantify wherever possible. Hedge less than you naturally want to.
- Where the data simply isn't available, say "unknown" rather than guessing — but commit to a recommendation anyway, flagged as your best inference.

## What success looks like for this prompt
The founder reads the output and either commits to one positioning with a clear plan, or realises they need to kill the product entirely. Either is a useful outcome. The unhelpful outcome is "all three positionings are interesting, here are some next steps" — do not produce that.
