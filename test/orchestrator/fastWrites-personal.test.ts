import { describe, it, expect } from 'vitest'
import { detectFastWrite, sanitiseConfirmCalls } from '@/lib/orca/orchestrator/fastWrites'

const tools = (m: string) => detectFastWrite(m)?.calls.map((c) => [c.tool, c.args]) ?? null

describe('ORCA does what the Personal page does', () => {
  it('follows and unfollows the famous wallets by name', () => {
    expect(tools('follow MrBeast')).toEqual([['followFamous', { slug: 'mrbeast' }]])
    expect(tools('can you keep an eye on Mr Beast for me')).toEqual([['followFamous', { slug: 'mrbeast' }]])
    expect(tools('track wintermute')).toEqual([['followFamous', { slug: 'wintermute' }]])
    expect(tools('follow Donald Trump')).toEqual([['followFamous', { slug: 'donald-trump' }]])
    expect(tools("alert me when Vitalik's wallet moves")).toEqual([['followFamous', { slug: 'vitalik-buterin' }]])
    expect(tools('unfollow Justin Sun')).toEqual([['unfollowFamous', { slug: 'justin-sun' }]])
    expect(tools('stop following binance')).toEqual([['unfollowFamous', { slug: 'binance' }]])
    expect(detectFastWrite('follow MrBeast')?.label).toMatch(/more than \$25K/)
  })

  it('leaves questions and the TRUMP token alone', () => {
    expect(detectFastWrite('what is MrBeast doing on-chain?')).toBeNull()
    // A % move is about the TRUMP token, never the Trump wallets.
    expect(tools('alert me when TRUMP moves 5%')?.[0]?.[0]).not.toBe('followFamous')
  })

  it('follows a wallet and alerts on it from an address', () => {
    const a = '0x28C6c06298d514Db089934071355E5743bf21d60'
    expect(tools(`alert me when ${a} moves more than $500k`)).toEqual([
      ['trackWallet', { address: a, chain: 'eth' }],
      ['createAlert', { address: a, chain: 'eth', kind: 'wallet_activity', threshold_usd: 500000 }],
    ])
    expect(tools(`notify me whenever ${a} moves`)?.[1]).toEqual(['createAlert', { address: a, chain: 'eth', kind: 'wallet_activity' }])
  })

  it('sends a test alert', () => {
    expect(tools('send me a test alert')).toEqual([['sendTestAlert', {}]])
    expect(tools('test my alerts')).toEqual([['sendTestAlert', {}]])
  })

  it('keeps the existing commands', () => {
    expect(tools('add LINK to my watchlist')).toEqual([['addToWatchlist', { ticker: 'LINK' }]])
    expect(tools('alert me when SOL moves 5%')).toEqual([['createAlert', { ticker: 'SOL', kind: 'price_move', threshold_pct: 5 }]])
  })

  it('sanitises the new confirm calls', () => {
    expect(sanitiseConfirmCalls([
      { tool: 'followFamous', args: { slug: 'mrbeast' } },
      { tool: 'followFamous', args: { slug: 'not-famous' } },
      { tool: 'sendTestAlert', args: { anything: 1 } },
      { tool: 'createAlert', args: { kind: 'wallet_activity', address: '0xabc0000000000000000000000000000000000001', chain: 'eth', threshold_usd: 1e5 } },
      { tool: 'createAlert', args: { kind: 'wallet_activity', address: 'bad address!', chain: 'eth' } },
    ])).toEqual([
      { tool: 'followFamous', args: { slug: 'mrbeast' } },
      { tool: 'sendTestAlert', args: {} },
      { tool: 'createAlert', args: { kind: 'wallet_activity', address: '0xabc0000000000000000000000000000000000001', chain: 'eth', threshold_usd: 100000 } },
    ])
  })
})
