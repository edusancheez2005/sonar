/**
 * Topic pool and internal-link list for the SEO article cron
 * (app/api/cron/seo-article). Cadence is capped at 10 articles a month
 * (vercel.json: days 1, 4, 7 … 28 at 08:00 UTC) — do not raise it.
 *
 * Rules every topic follows:
 * - No comparison, "alternative" or ranking angles, no prices for anyone,
 *   no accuracy or win-rate claims, no buy/sell signals, no user counts.
 * - Entity explainers only for exchanges, funds, protocols and foundations;
 *   describe activity, never intent, holdings estimates or net worth.
 * - `data` names the Sonar table the article's dated figures come from.
 *
 * Order matters: the cron writes the first topic whose slug is not already
 * PUBLISHED. REWRITE topics come first: their old versions were unpublished
 * for fabricated claims, and a compliant rewrite upserts the same URL.
 */

export type BlogTopic = {
  slug: string
  keyword: string
  angle: string
  data: string
  kind: 'rewrite' | 'new'
}

const TAPE = 'all_whale_transactions (Ethereum whale tape, 7 days)'

export const TOPIC_POOL: BlogTopic[] = [
  // ── Rewrites of unpublished guides (same URL, compliant prompt) ──────────
  { kind: 'rewrite', slug: 'crypto-whale-tracking-guide', keyword: 'crypto whale tracking', data: TAPE,
    angle: 'A practical guide to tracking crypto whale wallets: what counts as a whale transfer, where the data comes from, how to read a large move, and the limits of on-chain data' },
  { kind: 'rewrite', slug: 'on-chain-analysis-crypto-trading', keyword: 'on-chain analysis crypto', data: TAPE,
    angle: 'On-chain analysis for crypto traders: the core measures (exchange flows, large transfers, holder concentration), how to read them, and the most common misreadings' },
  { kind: 'rewrite', slug: 'crypto-exchange-inflows-outflows-guide', keyword: 'crypto exchange inflows outflows', data: TAPE,
    angle: 'Crypto exchange inflows and outflows explained: what deposits and withdrawals show, why exchange-internal transfers distort the totals, and how to read net flow carefully' },
  { kind: 'rewrite', slug: 'crypto-whale-detection-methods', keyword: 'crypto whale detection', data: TAPE,
    angle: 'How crypto whales are detected on-chain: size thresholds, address labels, clustering, and the false positives (exchange reshuffles, flash loans) that have to be filtered out' },
  { kind: 'rewrite', slug: 'multi-chain-whale-tracking', keyword: 'multi chain whale tracking', data: TAPE,
    angle: 'Tracking whales across chains: how Ethereum, Bitcoin and other networks record large transfers, what wrapped assets such as WBTC change, and why chain coverage matters' },
  { kind: 'rewrite', slug: 'crypto-sentiment-analysis-trading', keyword: 'crypto sentiment analysis', data: 'news_items and sentiment_scores, plus ' + TAPE,
    angle: 'Crypto sentiment analysis explained: how news and social sentiment are scored, how they relate to on-chain activity, and why sentiment data is noisy' },
  { kind: 'rewrite', slug: 'ethereum-gas-whale-activity-analysis', keyword: 'ethereum gas whale activity', data: TAPE,
    angle: 'Ethereum gas and large transfers: how gas costs, batching and contract interactions show up in whale activity, explained with real transfers' },
  { kind: 'rewrite', slug: 'how-whales-manipulate-crypto-markets', keyword: 'how whales manipulate crypto', data: TAPE,
    angle: 'Market manipulation in crypto explained: wash trading, spoofing and pump schemes, what each looks like on-chain and off-chain, and how regulators define them' },
  { kind: 'rewrite', slug: 'blockchain-data-analysis-tools', keyword: 'blockchain data analysis', data: TAPE,
    angle: 'Blockchain data analysis explained: from raw transactions to labelled flows, the methods analysts use, and how to verify a claim yourself with a block explorer' },
  { kind: 'rewrite', slug: 'crypto-portfolio-risk-management', keyword: 'crypto portfolio risk management', data: TAPE,
    angle: 'Crypto portfolio risk basics: position sizing, concentration and liquidity, and how on-chain data can inform risk decisions without replacing them' },
  { kind: 'rewrite', slug: 'whale-watching-trading-strategy-guide', keyword: 'whale watching trading strategy', data: TAPE,
    angle: 'Using whale data as context in a trading process: a checklist for reading large transfers, the risk rules that should sit around it, and the mistakes to avoid' },
  { kind: 'rewrite', slug: 'solana-whale-tracker-real-time', keyword: 'solana whale tracker', data: 'solana_transactions (Railway monitor; check freshness first)',
    angle: 'Tracking Solana whale movements: how large SOL and SPL token transfers are recorded, how to read them on Solscan, and what on-chain data can and cannot tell you' },

  // ── New topics (12 = one month at the cap) ───────────────────────────────
  { kind: 'new', slug: 'what-is-a-crypto-whale', keyword: 'what is a crypto whale', data: TAPE,
    angle: 'What is a crypto whale? Size thresholds by asset, how whales appear on-chain, and how to tell a real move from an exchange reshuffle' },
  { kind: 'new', slug: 'how-big-is-a-whale-transaction', keyword: 'whale transaction size', data: TAPE,
    angle: 'How big is a whale transaction? Typical transfer sizes by token on Ethereum, measured on Sonar\'s whale tape over the last 7 days' },
  { kind: 'new', slug: 'stablecoin-whale-transfers-explained', keyword: 'stablecoin whale transfers', data: TAPE + ' — USDT/USDC rows',
    angle: 'Large USDT and USDC transfers explained: mints, burns, exchange deposits and treasury moves, and what each can and cannot indicate' },
  { kind: 'new', slug: 'exchange-hot-and-cold-wallets', keyword: 'exchange hot wallet cold wallet', data: TAPE + ' — exchange-labelled rows',
    angle: 'Exchange hot and cold wallets explained: why exchanges move funds between their own addresses, and why those moves are not whale buying or selling' },
  { kind: 'new', slug: 'wrapped-bitcoin-on-ethereum', keyword: 'wrapped bitcoin on ethereum', data: TAPE + ' — WBTC/cbBTC/tBTC rows',
    angle: 'Wrapped Bitcoin on Ethereum explained: WBTC, cbBTC and tBTC, how they are minted and redeemed, and how to read their large transfers' },
  { kind: 'new', slug: 'how-to-read-an-etherscan-transaction', keyword: 'how to read etherscan transaction', data: TAPE + ' — one recent transfer as the worked example',
    angle: 'How to read an Etherscan transaction: from, to, value, token transfers, gas and internal transactions, with a real large transfer as the worked example' },
  { kind: 'new', slug: 'flash-loans-explained', keyword: 'flash loan explained', data: TAPE + ' — rows filtered as flash-loan legs',
    angle: 'Flash loans explained: how DeFi protocols lend and repay within one transaction, why the legs can look like nine-figure whale moves, and why trackers filter them out' },
  { kind: 'new', slug: 'binance-wallet-activity-explained', keyword: 'binance wallet activity', data: 'curated_entities (binance) + ' + TAPE,
    angle: 'Reading Binance wallet activity on-chain: hot wallets, deposit sweeps and withdrawals, and what large Binance transfers do and do not mean' },
  { kind: 'new', slug: 'market-maker-wallets-explained', keyword: 'crypto market maker wallet', data: 'curated_entities (wintermute) + ' + TAPE,
    angle: 'Market maker wallets explained: what trading firms such as Wintermute do on-chain, why their transfers are frequent and two-way, and how to read them without guessing intent' },
  { kind: 'new', slug: 'ethereum-foundation-wallet-activity', keyword: 'ethereum foundation wallet', data: 'curated_entities + ' + TAPE,
    angle: 'Ethereum Foundation wallet activity explained: its publicly disclosed addresses, its published treasury policy, and how to read its transfers' },
  { kind: 'new', slug: 'token-unlocks-and-large-transfers', keyword: 'token unlock', data: TAPE,
    angle: 'Token unlocks and large transfers: how vesting schedules release tokens, what unlock transfers look like on-chain, and why an unlock is not automatically a sale' },
  { kind: 'new', slug: 'crypto-news-and-on-chain-moves', keyword: 'crypto news on-chain', data: 'news_items + ' + TAPE,
    angle: 'Crypto news and on-chain moves: how to line up headlines with large transfers by timestamp, and why a coincidence in time is not a cause' },
]

/**
 * Internal links the writer may use. Every target was checked to return 200
 * with content on 2026-10-25. Anything else the model links to on
 * sonartracker.io is unwrapped before the article is saved.
 */
export const INTERNAL_LINKS: { url: string; text: string }[] = [
  { url: '/whale-tracker', text: 'real-time whale tracker' },
  { url: '/ai-advisor', text: 'ORCA, the AI crypto analyst' },
  { url: '/dashboard', text: 'crypto dashboard' },
  { url: '/ethereum-whale-tracker', text: 'Ethereum whale tracker' },
  { url: '/bitcoin-whale-tracker', text: 'Bitcoin whale tracker' },
  { url: '/solana-whale-tracker', text: 'Solana whale tracker' },
  { url: '/wallet-tracker', text: 'wallet tracker' },
  { url: '/statistics', text: 'whale statistics' },
  { url: '/news', text: 'crypto news terminal' },
  { url: '/blog/what-is-whale-tracking', text: 'whale tracking guide' },
  { url: '/blog/on-chain-analysis-beginners', text: 'on-chain analysis guide' },
  { url: '/blog/how-to-track-whale-wallets', text: 'tracking whale wallets' },
  { url: '/blog/whale-accumulation-vs-distribution', text: 'accumulation vs distribution' },
  { url: '/glossary/on-chain-analysis', text: 'on-chain analysis glossary' },
  { url: '/blog', text: 'crypto insights blog' },
]

/**
 * External references the writer may cite. Links to any other host are
 * unwrapped; allowed links are HEAD-checked after generation and unwrapped
 * when they do not answer 2xx/3xx.
 */
export const EXTERNAL_ALLOWLIST = [
  'etherscan.io', 'solscan.io', 'mempool.space', 'ethereum.org', 'bitcoin.org',
  'solana.com', 'coingecko.com', 'investopedia.com', 'sec.gov', 'fca.org.uk',
]

/** First topic whose slug is not currently published, plus how many remain. */
export function nextTopic(publishedSlugs: Set<string>): { topic: BlogTopic | null; remaining: number } {
  const open = TOPIC_POOL.filter((t) => !publishedSlugs.has(t.slug))
  return { topic: open[0] || null, remaining: open.length }
}
