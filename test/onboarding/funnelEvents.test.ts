import { describe, it, expect } from 'vitest'
import { FUNNEL_EVENTS, isFunnelEvent, sanitiseProps, MAX_PROPS_BYTES } from '@/lib/analytics/events'
import { trackServer } from '@/lib/analytics/trackServer'
import { FAMOUS_WALLETS, isFamousSlug, MAX_ADDRESSES_PER_ENTITY } from '@/lib/onboarding/famousWallets'
import { readFileSync } from 'node:fs'

describe('funnel events', () => {
  it('has exactly the eight Week-1 events, matching the SQL CHECK constraint', () => {
    expect([...FUNNEL_EVENTS]).toEqual(['signup', 'welcome_choice', 'follow', 'alert_set', 'orca_question', 'paywall_view', 'checkout', 'paid'])
    const sql = readFileSync('supabase/migrations/20261003_funnel_events.sql', 'utf8')
    for (const e of FUNNEL_EVENTS) expect(sql).toContain(`'${e}'`)
  })
  it('rejects unknown names', () => {
    expect(isFunnelEvent('signup')).toBe(true)
    expect(isFunnelEvent('page_view')).toBe(false)
    expect(isFunnelEvent(undefined)).toBe(false)
  })
  it('keeps props flat, short and bounded', () => {
    const out = sanitiseProps({ a: 'x'.repeat(500), b: 1, c: true, d: null, nested: { x: 1 }, arr: [1] })
    expect(out).toEqual({ a: 'x'.repeat(200), b: 1, c: true, d: null })
    const big: Record<string, string> = {}
    for (let i = 0; i < 40; i++) big[`k${i}`] = 'y'.repeat(200)
    expect(JSON.stringify(sanitiseProps(big)).length).toBeLessThanOrEqual(MAX_PROPS_BYTES)
    expect(sanitiseProps('nope' as any)).toEqual({})
  })
  it('trackServer inserts one sanitised row and never throws', async () => {
    const rows: any[] = []
    const sb = { from: (t: string) => ({ insert: (row: any) => { rows.push({ t, row }); return Promise.resolve({ error: null }) } }) }
    expect(await trackServer(sb, { userId: 'u1', event: 'follow', props: { slug: 'binance', deep: { no: 1 } }, path: '/dashboard' })).toBe(true)
    expect(rows[0]).toEqual({ t: 'funnel_events', row: { user_id: 'u1', event: 'follow', props: { slug: 'binance' }, path: '/dashboard' } })
    expect(await trackServer(sb, { userId: 'u1', event: 'bogus' as any })).toBe(false)
    expect(await trackServer(null, { event: 'follow' })).toBe(false)
    const broken = { from: () => ({ insert: () => Promise.reject(new Error('down')) }) }
    expect(await trackServer(broken, { event: 'follow' })).toBe(false)
  })
})

describe('famous wallets picker list', () => {
  it('is six recognisable names with same-origin avatars', () => {
    expect(FAMOUS_WALLETS).toHaveLength(6)
    const slugs = FAMOUS_WALLETS.map((w) => w.slug)
    expect(slugs).toEqual(expect.arrayContaining(['vitalik-buterin', 'binance', 'wintermute', 'mrbeast']))
    for (const w of FAMOUS_WALLETS) {
      expect(w.name.length).toBeGreaterThan(2)
      expect(w.blurb.length).toBeLessThan(70)
      if (w.avatar) expect(w.avatar.startsWith('/')).toBe(true)
    }
    for (const w of FAMOUS_WALLETS) {
      expect(w.minUsd).toBeGreaterThan(0)
      expect([1, 3]).toContain(w.alertAddresses)
    }
    expect(FAMOUS_WALLETS.find((w) => w.slug === 'binance')!.alertAddresses).toBe(1) // exchanges: busiest address only
    expect(isFamousSlug('binance')).toBe(true)
    expect(isFamousSlug('satoshi')).toBe(false)
    expect(MAX_ADDRESSES_PER_ENTITY).toBe(3)
  })
})

describe('client event allowlist', () => {
  it('lets the browser send only welcome_choice and paywall_view', async () => {
    const { CLIENT_EVENTS, isClientEvent } = await import('@/lib/analytics/events')
    expect([...CLIENT_EVENTS]).toEqual(['welcome_choice', 'paywall_view'])
    for (const e of ['signup', 'follow', 'alert_set', 'orca_question', 'checkout', 'paid']) {
      expect(isClientEvent(e)).toBe(false)
    }
    expect(isClientEvent('paywall_view')).toBe(true)
  })
})
