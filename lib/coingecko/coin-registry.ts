/**
 * Coin Registry - Central source of truth for coin metadata
 * Handles symbol → CoinGecko ID mapping with collision resolution
 */

import { getCoinsList, getCoinsMarkets, search, getCoinById } from './client'

export interface CoinMetadata {
  id: string // CoinGecko ID
  symbol: string
  name: string
  image_url: string | null
  market_cap_rank: number | null
  contract_address?: string
  platforms?: Record<string, string>
}

class CoinRegistry {
  private registry: Map<string, CoinMetadata[]> = new Map()
  private idToMetadata: Map<string, CoinMetadata> = new Map()
  private lastUpdate: number = 0
  private updateInterval = 3600000 // 1 hour

  /**
   * Initialize or refresh the registry
   */
  async initialize(): Promise<void> {
    const now = Date.now()
    if (this.registry.size > 0 && now - this.lastUpdate < this.updateInterval) {
      return // Already initialized and fresh
    }

    console.log('🔄 Initializing CoinGecko registry...')

    try {
      // Get all coins list (active)
      const coinsList = await getCoinsList(false)

      // Get market data for top coins to get images and ranks
      const topCoins = await getCoinsMarkets({
        per_page: 250,
        page: 1,
        sparkline: false,
      })

      // Build registry
      this.registry.clear()
      this.idToMetadata.clear()

      for (const coin of coinsList) {
        const symbolKey = coin.symbol.toUpperCase()
        
        // Find market data for this coin
        const marketData = topCoins.find(m => m.id === coin.id)

        const metadata: CoinMetadata = {
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          image_url: marketData?.image || null,
          market_cap_rank: marketData?.market_cap_rank || null,
          platforms: coin.platforms,
        }

        // Add to symbol map (may have collisions)
        const existing = this.registry.get(symbolKey) || []
        existing.push(metadata)
        this.registry.set(symbolKey, existing)

        // Add to ID map (unique)
        this.idToMetadata.set(coin.id, metadata)
      }

      this.lastUpdate = now
      console.log(`✅ Registry initialized with ${this.registry.size} symbols and ${this.idToMetadata.size} coins`)
    } catch (error) {
      console.error('❌ Failed to initialize coin registry:', error)
      throw error
    }
  }

  /**
   * Resolve symbol to CoinGecko ID with collision handling
   */
  async resolve(symbol: string): Promise<CoinMetadata | null> {
    await this.initialize()

    const symbolKey = symbol.toUpperCase()
    const candidates = this.registry.get(symbolKey)

    if (!candidates || candidates.length === 0) {
      // Try search as fallback
      try {
        const searchResult = await search(symbol)
        if (searchResult.coins.length > 0) {
          const coin = searchResult.coins[0]
          return {
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            image_url: coin.large,
            market_cap_rank: coin.market_cap_rank,
          }
        }
      } catch (error) {
        console.error(`Search fallback failed for ${symbol}:`, error)
      }
      return null
    }

    if (candidates.length === 1) {
      return candidates[0]
    }

    // Handle collisions - prefer by market cap rank
    const sorted = [...candidates].sort((a, b) => {
      // Prefer coins with rank over those without
      if (a.market_cap_rank && !b.market_cap_rank) return -1
      if (!a.market_cap_rank && b.market_cap_rank) return 1
      if (!a.market_cap_rank && !b.market_cap_rank) return 0
      return a.market_cap_rank - b.market_cap_rank
    })

    return sorted[0]
  }

  /**
   * Get metadata by CoinGecko ID
   */
  async getById(coinId: string): Promise<CoinMetadata | null> {
    await this.initialize()

    let metadata = this.idToMetadata.get(coinId)

    if (!metadata) {
      // Try fetching directly
      try {
        const data = await getCoinById(coinId, { market_data: true })
        metadata = {
          id: data.id,
          symbol: data.symbol.toUpperCase(),
          name: data.name,
          image_url: data.image?.large || data.image?.small || data.image?.thumb || null,
          market_cap_rank: data.market_cap_rank || null,
          platforms: data.platforms,
        }
        this.idToMetadata.set(coinId, metadata)
      } catch (error) {
        console.error(`Failed to fetch coin ${coinId}:`, error)
        return null
      }
    }

    return metadata
  }

  /**
   * Resolve by contract address
   */
  async resolveByContract(
    contractAddress: string,
    platform: string = 'ethereum'
  ): Promise<CoinMetadata | null> {
    await this.initialize()

    // Search through registry for matching contract
    for (const [_, metadata] of this.idToMetadata) {
      if (metadata.platforms && metadata.platforms[platform]) {
        if (metadata.platforms[platform].toLowerCase() === contractAddress.toLowerCase()) {
          return metadata
        }
      }
    }

    return null
  }

  /**
   * Get multiple coins by IDs
   */
  async getByIds(coinIds: string[]): Promise<Map<string, CoinMetadata>> {
    await this.initialize()

    const result = new Map<string, CoinMetadata>()
    
    for (const id of coinIds) {
      const metadata = await this.getById(id)
      if (metadata) {
        result.set(id, metadata)
      }
    }

    return result
  }

  /**
   * Force refresh the registry
   */
  async refresh(): Promise<void> {
    this.lastUpdate = 0
    await this.initialize()
  }

  /**
   * Get all registered symbols
   */
  getAllSymbols(): string[] {
    return Array.from(this.registry.keys())
  }
}

// Singleton instance
export const coinRegistry = new CoinRegistry()
