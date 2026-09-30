import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  }
}

describe('coingecko client host fallback', () => {
  const origKey = process.env.COINGECKO_API_KEY
  beforeEach(() => { vi.resetModules() })
  afterEach(() => { vi.unstubAllGlobals(); process.env.COINGECKO_API_KEY = origKey })

  it('uses the free host when no key is configured', async () => {
    delete process.env.COINGECKO_API_KEY
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => { calls.push(url); return jsonResponse(200, { coins: [] }) }))
    const { search } = await import('../../lib/coingecko/client')
    await search('btc')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatch(/^https:\/\/api\.coingecko\.com\//)
  })

  it('falls back to the free host when the pro host rejects the key, without backoff', async () => {
    process.env.COINGECKO_API_KEY = 'dead-key'
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url)
      if (url.startsWith('https://pro-api.')) return jsonResponse(401, { status: { error_code: 10002, error_message: 'API Key Missing' } })
      return jsonResponse(200, { coins: [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', large: 'x', thumb: 'y', market_cap_rank: 1 }] })
    }))
    const { search } = await import('../../lib/coingecko/client')
    const t0 = Date.now()
    const res = await search('btc')
    expect(Date.now() - t0).toBeLessThan(500)
    expect(res.coins[0].id).toBe('bitcoin')
    expect(calls[0]).toMatch(/^https:\/\/pro-api\./)
    expect(calls[1]).toMatch(/^https:\/\/api\.coingecko\.com\//)
    // second call in the same process skips the pro host entirely
    await search('eth')
    expect(calls[2]).toMatch(/^https:\/\/api\.coingecko\.com\//)
  })

  it('does not retry a plain 404', async () => {
    delete process.env.COINGECKO_API_KEY
    const fetchMock = vi.fn(async () => jsonResponse(404, { error: 'coin not found' }))
    vi.stubGlobal('fetch', fetchMock)
    const { getCoinById } = await import('../../lib/coingecko/client')
    await expect(getCoinById('nope-coin')).rejects.toThrow(/404/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
