/**
 * Crypto Content Relevance Filter
 * 
 * Filters out non-crypto content that LunarCrush returns for ambiguous tickers.
 * e.g. "CRV" matches Honda CR-V, "SAND" matches beach sand, "LINK" matches hyperlinks, etc.
 */

// Tickers that are commonly confused with non-crypto terms
const AMBIGUOUS_TICKERS: Record<string, string[]> = {
  'CRV': ['honda', 'cr-v', 'crv suv', 'car ', 'vehicle', 'toyota', 'rav4', 'trailsport', 'stolen car', 'consulate', 'shooting', 'suspects', 'police'],
  'SAND': ['beach', 'desert', 'sandbox game', 'sand castle', 'hourglass'],
  'MANA': ['magic mana', 'mana potion', 'spiritual'],
  'ROSE': ['flower', 'rose garden', 'bouquet', 'petal'],
  'FLOW': ['water flow', 'yoga flow', 'cash flow', 'flow state'],
  'APE': ['primate', 'gorilla', 'monkey'],
  'BAT': ['baseball bat', 'cricket bat', 'batman', 'bat cave'],
  'FUN': ['fun fact', 'fun day', 'amusement'],
  'MASK': ['face mask', 'masquerade', 'surgical mask', 'n95'],
  'LINK': ['hyperlink', 'links golf', 'link building', 'linkedin'],
  'DOT': ['polka dot', 'dot com'],
  'ATOM': ['atomic', 'atom bomb', 'nuclear'],
  'NEAR': ['near me', 'nearby', 'near miss'],
  'OP': ['operation', 'operator', 'opinion'],
  'ONT': ['ontario'],
  'EOS': ['canon eos', 'camera'],
  'ICX': ['ice'],
  'COMP': ['computer', 'competition', 'compensation'],
  'REN': ['ren faire', 'renaissance'],
  'BEAM': ['laser beam', 'beam me up', 'steel beam'],
  'ALICE': ['alice in wonderland', 'alice springs'],
  'PORTAL': ['portal game', 'web portal'],
  'PRIME': ['amazon prime', 'prime minister', 'prime day', 'optimus prime'],
  'MAGIC': ['magic trick', 'magic show', 'harry potter'],
  'SUPER': ['superman', 'super bowl', 'superhero', 'super mario'],
  'CHZ': ['cheese'],
  'AUDIO': ['audio equipment', 'audio cable', 'headphone'],
  'BLUR': ['blurry', 'motion blur', 'camera blur'],
  'LOOKS': ['good looks', 'looks like'],
  'YGG': [],
  'STORJ': [],
}

// Crypto-related keywords that indicate the content is about crypto
const CRYPTO_KEYWORDS = [
  // Core crypto terms
  'crypto', 'cryptocurrency', 'blockchain', 'defi', 'web3', 'nft',
  'token', 'coin', 'altcoin', 'stablecoin', 'memecoin',
  // Trading terms
  'trading', 'trader', 'bullish', 'bearish', 'hodl', 'fomo',
  'market cap', 'mcap', 'volume', 'liquidity', 'apy', 'apr', 'tvl',
  'yield', 'staking', 'stake', 'swap', 'dex', 'cex', 'amm',
  'long', 'short', 'leverage',
  // Platforms & protocols
  'binance', 'coinbase', 'kraken', 'uniswap', 'aave', 'curve',
  'opensea', 'metamask', 'ledger', 'phantom',
  // Networks
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol',
  'polygon', 'matic', 'arbitrum', 'optimism', 'avalanche',
  // Financial crypto terms
  'whale', 'rug pull', 'pump', 'dump', 'moon', 'dip',
  'portfolio', 'airdrop', 'ico', 'ido', 'ipo',
  'smart contract', 'dao', 'governance',
  // Cashtags pattern
  '\\$[A-Z]{2,}',
]

// Non-crypto topics that leak through ambiguous tickers
const NON_CRYPTO_KEYWORDS = [
  // Vehicles
  'honda', 'toyota', 'suv', 'sedan', 'car dealer', 'test drive', 'mpg', 'horsepower',
  'rav4', 'cr-v', 'civic', 'camry', 'prius',
  // Crime/violence
  'shooting', 'shot fired', 'consulate', 'suspects', 'police arrest', 'stolen car',
  'murder', 'assault', 'robbery',
  // Health
  'ozempic', 'vaccine', 'covid', 'hospital', 'surgery', 'diagnosis',
  // Weather  
  'weather forecast', 'hurricane', 'tornado', 'snowstorm',
  // Politics (unless crypto-related)
  'election result', 'ballot', 'primary election',
  // Sports
  'touchdown', 'goalkeeper', 'batting average', 'home run',
  // Random consumer products
  'recipe', 'cookbook', 'gardening',
]

const cryptoRegex = new RegExp(CRYPTO_KEYWORDS.join('|'), 'i')
const nonCryptoRegex = new RegExp(NON_CRYPTO_KEYWORDS.join('|'), 'i')

/**
 * Check if a piece of content (news article or social post) is relevant
 * to a specific crypto token, filtering out non-crypto noise.
 * 
 * @param text - The title + body text to check
 * @param ticker - The crypto ticker symbol (e.g., "CRV")
 * @returns true if the content appears to be crypto-related
 */
export function isCryptoRelevant(text: string, ticker: string): boolean {
  if (!text || text.length < 5) return false
  
  const lower = text.toLowerCase()
  const tickerUpper = ticker.toUpperCase()
  const tickerLower = ticker.toLowerCase()
  
  // Check for cashtag (strong crypto signal) — e.g., "$CRV"
  const hasCashtag = text.includes(`$${tickerUpper}`) || text.includes(`$${tickerLower}`)
  if (hasCashtag) return true
  
  // Check ticker-specific non-crypto patterns
  const tickerExclusions = AMBIGUOUS_TICKERS[tickerUpper]
  if (tickerExclusions && tickerExclusions.length > 0) {
    const hasExclusion = tickerExclusions.some(excl => lower.includes(excl))
    if (hasExclusion) {
      // Even if it has an exclusion keyword, allow it if it ALSO has strong crypto signals
      const hasStrongCryptoSignal = hasCashtag || 
        lower.includes('defi') || 
        lower.includes('crypto') || 
        lower.includes('blockchain') ||
        lower.includes('curve') ||  // CRV = Curve DAO
        lower.includes('token')
      if (!hasStrongCryptoSignal) return false
    }
  }
  
  // Check for generic non-crypto content
  const hasNonCrypto = nonCryptoRegex.test(lower)
  const hasCrypto = cryptoRegex.test(lower)
  
  // If it has non-crypto keywords but no crypto keywords, filter it out
  if (hasNonCrypto && !hasCrypto) return false
  
  // For ambiguous tickers with no cashtag and no crypto keywords, be stricter
  if (tickerUpper in AMBIGUOUS_TICKERS && !hasCrypto) {
    // Only allow if the full crypto name appears (e.g., "Curve" for CRV)
    const fullNames: Record<string, string[]> = {
      'CRV': ['curve'],
      'SAND': ['sandbox'],
      'MANA': ['decentraland'],
      'ROSE': ['oasis network', 'oasis protocol'],
      'FLOW': ['flow blockchain', 'dapper'],
      'APE': ['apecoin', 'bored ape', 'bayc'],
      'BAT': ['brave browser', 'basic attention'],
      'LINK': ['chainlink'],
      'DOT': ['polkadot'],
      'ATOM': ['cosmos'],
      'NEAR': ['near protocol'],
      'COMP': ['compound'],
      'BEAM': ['beam privacy', 'beam crypto'],
      'PRIME': ['echelon prime'],
      'SUPER': ['superfarm', 'superverse'],
      'BLUR': ['blur nft', 'blur marketplace'],
    }
    const names = fullNames[tickerUpper] || []
    const hasFullName = names.some(name => lower.includes(name))
    if (!hasFullName) return false
  }
  
  return true
}

/**
 * Filter an array of news items for crypto relevance.
 * 
 * @param items - Array of items with title/body fields
 * @param ticker - The crypto ticker
 * @param textExtractor - Function to extract text from an item (defaults to title)
 * @returns Filtered array of relevant items
 */
export function filterCryptoRelevant<T>(
  items: T[],
  ticker: string,
  textExtractor: (item: T) => string = (item: any) => item.title || item.post_title || item.body || ''
): T[] {
  return items.filter(item => {
    const text = textExtractor(item)
    return isCryptoRelevant(text, ticker)
  })
}
