import { describe, it, expect } from 'vitest'
import { detectAddress } from '@/lib/orca/orchestrator/detectAddress'

describe('detectAddress', () => {
  it('detects an EVM 40-hex address (defaults to eth)', () => {
    const r = detectAddress('track 0x515b72Ed8a97F42C568D6A143232775018f133C8')
    expect(r).toEqual({ address: '0x515b72Ed8a97F42C568D6A143232775018f133C8', chain: 'eth' })
  })

  it('returns null for an abbreviated address', () => {
    expect(detectAddress('track 0xabc…d')).toBeNull()
    expect(detectAddress('wallet 0x1234')).toBeNull()
  })

  it('detects a Tron address', () => {
    const r = detectAddress('watch TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
    expect(r?.chain).toBe('tron')
  })

  it('detects a BTC bech32 address', () => {
    const r = detectAddress('follow bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')
    expect(r?.chain).toBe('btc')
  })

  it('detects a BTC legacy address', () => {
    const r = detectAddress('track 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')
    expect(r?.chain).toBe('btc')
  })

  it('detects a SOL base58 address', () => {
    const r = detectAddress('watch 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM')
    expect(r?.chain).toBe('sol')
  })

  it('detects an XRP address', () => {
    const r = detectAddress('track rPdvC6ccq8hCdPKSPJkPmyZ4Mi1oG2FFkT')
    expect(r?.chain).toBe('xrp')
  })

  it('applies the chain hint precedence for EVM addresses', () => {
    const r = detectAddress('track 0x515b72Ed8a97F42C568D6A143232775018f133C8 on base')
    expect(r).toEqual({ address: '0x515b72Ed8a97F42C568D6A143232775018f133C8', chain: 'base' })
  })

  it('returns null for garbage / no address', () => {
    expect(detectAddress('hello world, how is BTC doing')).toBeNull()
  })
})
