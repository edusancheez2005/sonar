/**
 * PHASE 2 - ORCA AI: Ticker Extraction
 * Extracts cryptocurrency tickers from natural language user queries
 */

// Common ticker mappings
const TICKER_MAP: Record<string, string> = {
  // Major coins
  'bitcoin': 'BTC',
  'btc': 'BTC',
  'ethereum': 'ETH',
  'eth': 'ETH',
  'solana': 'SOL',
  'sol': 'SOL',
  'cardano': 'ADA',
  'ada': 'ADA',
  'ripple': 'XRP',
  'xrp': 'XRP',
  'dogecoin': 'DOGE',
  'doge': 'DOGE',
  'polkadot': 'DOT',
  'dot': 'DOT',
  'polygon': 'MATIC',
  'matic': 'MATIC',
  'avalanche': 'AVAX',
  'avax': 'AVAX',
  'chainlink': 'LINK',
  'link': 'LINK',
  'uniswap': 'UNI',
  'uni': 'UNI',
  'litecoin': 'LTC',
  'ltc': 'LTC',
  'tron': 'TRX',
  'trx': 'TRX',
  'shiba': 'SHIB',
  'shib': 'SHIB',
  'shibainu': 'SHIB',
  'pepe': 'PEPE',
  'pepecoin': 'PEPE',
  'floki': 'FLOKI',
  'flokiinu': 'FLOKI',
  'bonk': 'BONK',
  'dogwifhat': 'WIF',
  'wif': 'WIF',
  'cosmos': 'ATOM',
  'atom': 'ATOM',
  'near': 'NEAR',
  'algorand': 'ALGO',
  'algo': 'ALGO',
  'vechain': 'VET',
  'vet': 'VET',
  'filecoin': 'FIL',
  'fil': 'FIL',
  'aptos': 'APT',
  'apt': 'APT',
  'hedera': 'HBAR',
  'hbar': 'HBAR',
  'arbitrum': 'ARB',
  'arb': 'ARB',
  'optimism': 'OP',
  'op': 'OP',
  'thegraph': 'GRT',
  'grt': 'GRT',
  'sandbox': 'SAND',
  'sand': 'SAND',
  'decentraland': 'MANA',
  'mana': 'MANA',
  'aave': 'AAVE',
  'maker': 'MKR',
  'mkr': 'MKR',
  'synthetix': 'SNX',
  'snx': 'SNX',
  'thorchain': 'RUNE',
  'rune': 'RUNE',
  'fantom': 'FTM',
  'ftm': 'FTM',
  'immutable': 'IMX',
  'imx': 'IMX',
  'axie': 'AXS',
  'axs': 'AXS',
  'gala': 'GALA',
  'enjin': 'ENJ',
  'enj': 'ENJ',
  'chiliz': 'CHZ',
  'chz': 'CHZ',
  'lido': 'LDO',
  'ldo': 'LDO',
  'curve': 'CRV',
  'crv': 'CRV',
  'compound': 'COMP',
  'comp': 'COMP',
  'yearn': 'YFI',
  'yfi': 'YFI',
  'bat': 'BAT',
  'basicattentiontoken': 'BAT',
  'zrx': 'ZRX',
  '0x': 'ZRX',
  'sushi': 'SUSHI',
  'sushiswap': 'SUSHI',
  'stacks': 'STX',
  'stx': 'STX',
  'injective': 'INJ',
  'inj': 'INJ',
  'render': 'RNDR',
  'rndr': 'RNDR',
  'apecoin': 'APE',
  'ape': 'APE',
  'blur': 'BLUR',
  'pendle': 'PENDLE',
  'sui': 'SUI',
  'sei': 'SEI',
  'celestia': 'TIA',
  'tia': 'TIA',
  'jito': 'JTO',
  'jto': 'JTO',
  'pyth': 'PYTH',
}

// Valid tickers (100+ supported coins)
const VALID_TICKERS = new Set([
  // Major Layer 1s
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'AVAX', 'DOT', 'MATIC', 'TRX',
  'ATOM', 'NEAR', 'ALGO', 'VET', 'FIL', 'APT', 'HBAR', 'STX', 'INJ', 'FTM',
  'ETC', 'XLM', 'FLOW', 'ICP', 'THETA', 'XTZ', 'EOS', 'KAS', 'ROSE', 'MINA',
  'LTC', 'BCH', 'BSV', 'XMR', 'ZEC', 'DASH', 'DCR', 'RVN', 'WAVES',
  
  // Stablecoins
  'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDD', 'FRAX', 'GUSD',
  
  // Major ERC-20 DeFi
  'UNI', 'LINK', 'AAVE', 'MKR', 'SNX', 'CRV', 'COMP', 'YFI', 'SUSHI', 'BAL',
  '1INCH', 'LDO', 'LIDO', 'FXS', 'CVX', 'RPL', 'DYDX', 'GMX', 'PERP', 'PENDLE',
  
  // Layer 2s
  'ARB', 'OP', 'IMX', 'LRC', 'STRK', 'METIS', 'BOBA', 'MATIC',
  
  // Meme Coins
  'DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME', 'DEGEN', 'WOJAK',
  'ELON', 'AKITA', 'KISHU', 'BABYDOGE', 'SAMO', 'MYRO',
  
  // Gaming & Metaverse
  'SAND', 'MANA', 'AXS', 'GALA', 'ENJ', 'ILV', 'ALICE', 'TLM', 'YGG',
  'PRIME', 'BIGTIME', 'BEAM', 'RON', 'MAGIC', 'PORTAL',
  
  // AI & Data
  'FET', 'AGIX', 'OCEAN', 'GRT', 'RNDR', 'AKT', 'TAO', 'PAAL',
  
  // NFT & Social
  'BLUR', 'LOOKS', 'APE', 'SUPER', 'CHZ', 'AUDIO', 'MASK',
  
  // Oracles
  'LINK', 'API3', 'BAND', 'TRB', 'DIA',
  
  // Popular ERC-20
  'BAT', 'ZRX', 'REQ', 'OMG', 'ZIL', 'ICX', 'QTUM', 'ONT', 'STORJ',
  'FUN', 'REN', 'KNC', 'ANT', 'NMR', 'MLN', 'POLY', 'POWR', 'CELR', 'ANKR',
  
  // Newer Trending
  'SUI', 'SEI', 'TIA', 'JTO', 'PYTH', 'JUPITER', 'WEN',
  
  // Exchange Tokens
  'CRO', 'OKB', 'HT', 'LEO', 'GT', 'KCS', 'FTT'
])

interface TickerExtractionResult {
  ticker: string | null
  confidence: number
  normalized: string | null
  originalMatch: string | null
}

/**
 * Extract ticker from user message
 * Supports: "Bitcoin", "BTC", "$BTC", "What's happening with ETH?"
 */
export function extractTicker(message: string): TickerExtractionResult {
  if (!message || typeof message !== 'string') {
    return {
      ticker: null,
      confidence: 0,
      normalized: null,
      originalMatch: null
    }
  }

  const lowerMessage = message.toLowerCase()
  
  // Filter out non-crypto queries (greetings, short questions, etc.)
  const nonCryptoPatterns = [
    /^(hi|hello|hey|yo|sup|what'?s up|greetings|good morning|good evening)[\s\?!]*$/i,
    /^(thanks?|thank you|ty|thx)[\s\?!]*$/i,
    /^(ok|okay|yes|no|yeah|yup|nope)[\s\?!]*$/i,
    /^(bye|goodbye|see you|later)[\s\?!]*$/i
  ]
  
  for (const pattern of nonCryptoPatterns) {
    if (pattern.test(message.trim())) {
      return {
        ticker: null,
        confidence: 0,
        normalized: null,
        originalMatch: null
      }
    }
  }
  
  // Method 1: Check for $TICKER format (highest confidence)
  const dollarMatch = message.match(/\$([A-Z]{2,10})\b/)
  if (dollarMatch) {
    const ticker = dollarMatch[1].toUpperCase()
    if (VALID_TICKERS.has(ticker)) {
      return {
        ticker,
        confidence: 0.95,
        normalized: ticker,
        originalMatch: dollarMatch[0]
      }
    }
  }

  // Method 2: Check for standalone uppercase tickers (BTC, ETH, etc.)
  const uppercaseMatch = message.match(/\b([A-Z]{2,10})\b/)
  if (uppercaseMatch) {
    const ticker = uppercaseMatch[1]
    if (VALID_TICKERS.has(ticker)) {
      return {
        ticker,
        confidence: 0.9,
        normalized: ticker,
        originalMatch: uppercaseMatch[0]
      }
    }
  }

  // Method 3: Check for known coin names (bitcoin, ethereum, etc.)
  for (const [name, ticker] of Object.entries(TICKER_MAP)) {
    if (lowerMessage.includes(name)) {
      return {
        ticker,
        confidence: 0.85,
        normalized: ticker,
        originalMatch: name
      }
    }
  }

  // Method 4: Check for lowercase tickers as fallback
  const lowerTickerMatch = lowerMessage.match(/\b([a-z]{2,10})\b/)
  if (lowerTickerMatch) {
    const potentialTicker = lowerTickerMatch[1].toUpperCase()
    if (VALID_TICKERS.has(potentialTicker)) {
      return {
        ticker: potentialTicker,
        confidence: 0.7,
        normalized: potentialTicker,
        originalMatch: lowerTickerMatch[0]
      }
    }
  }

  // No ticker found
  return {
    ticker: null,
    confidence: 0,
    normalized: null,
    originalMatch: null
  }
}

/**
 * Validate if a ticker is supported
 */
export function isValidTicker(ticker: string): boolean {
  return VALID_TICKERS.has(ticker.toUpperCase())
}

/**
 * Normalize ticker name to standard format
 */
export function normalizeTicker(input: string): string | null {
  const lower = input.toLowerCase().trim()
  
  // Check direct mapping
  if (TICKER_MAP[lower]) {
    return TICKER_MAP[lower]
  }
  
  // Check if already valid ticker
  const upper = input.toUpperCase()
  if (VALID_TICKERS.has(upper)) {
    return upper
  }
  
  return null
}

/**
 * Get all supported tickers
 */
export function getSupportedTickers(): string[] {
  return Array.from(VALID_TICKERS).sort()
}

/**
 * Get helpful error message when ticker not found
 */
export function getTickerNotFoundMessage(): string {
  return `I couldn't identify which cryptocurrency you're asking about. Please mention a ticker like BTC, ETH, SOL, or a coin name like "Bitcoin" or "Ethereum". You can also use $BTC format.`
}

/**
 * Get suggestions for similar tickers (simple fuzzy matching)
 */
export function suggestTickers(input: string): string[] {
  const lower = input.toLowerCase()
  const suggestions: string[] = []
  
  // Check coin names
  for (const [name, ticker] of Object.entries(TICKER_MAP)) {
    if (name.includes(lower) || lower.includes(name)) {
      suggestions.push(ticker)
    }
  }
  
  // Check ticker symbols
  const upper = input.toUpperCase()
  for (const ticker of Array.from(VALID_TICKERS)) {
    if (ticker.includes(upper) || upper.includes(ticker)) {
      if (!suggestions.includes(ticker)) {
        suggestions.push(ticker)
      }
    }
  }
  
  return suggestions.slice(0, 5) // Top 5 suggestions
}

