'use client'
/**
 * PersonalDashboardClient \u2014 W4 redesign (3-band grid)
 * =============================================================================
 * Bands (top \u2192 bottom):
 *   1. PulseStrip       (4 compact tiles, refreshes every 6s)
 *   2. Main             60/40 grid:
 *                         left   \u2014 tabbed Watchlist | Wallets | Signals
 *                         right  \u2014 sticky CopilotPane (legacy panel for now;
 *                                  W5 swaps in CopilotPane with context chip)
 *   3. Tray             (collapsed by default; full Tray ships in W5)
 *
 * Compliance: no buy/sell/hold verbs in the shell. The Trading drawer
 * (locked to "coming soon" per parent doc §7.4) keeps its existing copy.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import RequirePremiumClient from '../RequirePremiumClient'
import PulseStrip from '@/components/personal/PulseStrip'
import WatchlistTab from '@/components/personal/WatchlistTab'
import WalletsTab from '@/components/personal/WalletsTab'
import SignalsTab from '@/components/personal/SignalsTab'
import PersonalCopilotPanel from '@/components/orca/PersonalCopilotPanel'
import TradingComingSoon from '@/components/trading/TradingComingSoon'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Page = styled.main`
  max-width: 1320px;
  margin: 0 auto;
  padding: 28px 24px 60px;
  color: #e0e6ed;
`

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
`

const Heading = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.01em;
`

const HeaderNote = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: #8896a6;
`

const BackLink = styled(Link)`
  font-size: 13px;
  color: #00e5ff;
  text-decoration: none;
  &:hover { text-decoration: underline; }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const MainGrid = styled.div`
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`

const Card = styled.section`
  background: rgba(13, 20, 33, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 20px 22px;
`

const TabBar = styled.div`
  display: flex;
  gap: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 16px;
`

const TabBtn = styled.button`
  background: transparent;
  border: 0;
  color: ${(p) => (p.$active ? '#00e5ff' : '#8896a6')};
  border-bottom: 2px solid ${(p) => (p.$active ? '#00e5ff' : 'transparent')};
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const StickyCol = styled.div`
  position: sticky;
  top: 16px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const TrayBar = styled.div`
  margin-top: 18px;
  display: flex;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 14px;
`

const TrayBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #8896a6;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  &:hover { border-color: rgba(0, 229, 255, 0.4); color: #00e5ff; }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
`

const TrayDrawer = styled.div`
  margin-top: 12px;
  background: rgba(13, 20, 33, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 18px 20px;
`

const TABS = [
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'wallets', label: 'Wallets' },
  { key: 'signals', label: 'Signals' },
]

export default function PersonalDashboardClient() {
  return (
    <RequirePremiumClient>
      {() => <PersonalShell />}
    </RequirePremiumClient>
  )
}

function PersonalShell() {
  const [profile, setProfile] = useState({ status: 'loading', data: null })
  const [tickers, setTickers] = useState([])
  const [activeTab, setActiveTab] = useState('watchlist')
  const [focusTicker, setFocusTicker] = useState('')
  const [seed, setSeed] = useState('')
  const [trayOpen, setTrayOpen] = useState(null)

  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()

    async function loadProfile() {
      try {
        const { data: sessionData } = await sb.auth.getSession()
        const userId = sessionData?.session?.user?.id
        if (!userId) {
          if (!cancelled) setProfile({ status: 'unauth', data: null })
          return
        }
        const { data } = await sb
          .from('user_profile')
          .select('experience_level, primary_goal, preferred_chains')
          .eq('user_id', userId)
          .maybeSingle()
        if (!cancelled) setProfile({ status: 'ready', data: data ?? null })

        const token = sessionData?.session?.access_token
        if (token) {
          try {
            const res = await fetch('/api/personal/watchlist', {
              headers: { authorization: `Bearer ${token}` },
            })
            if (res.ok) {
              const body = await res.json()
              const ts = (Array.isArray(body?.items) ? body.items : [])
                .map((it) => String(it?.ticker || '').toUpperCase())
                .filter(Boolean)
              if (!cancelled) setTickers(ts)
            }
          } catch {
            // The tabs surface their own error states.
          }
        }
      } catch {
        if (!cancelled) setProfile({ status: 'error', data: null })
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [])

  function handleAskOrcaTicker(ticker) {
    const t = String(ticker || '').toUpperCase()
    if (!t) return
    setFocusTicker(t)
    setSeed(`explain why $${t} moved today`)
  }

  function handleAskOrcaWallet(address, chain, label) {
    if (!address) return
    const shown = label || address
    setSeed(`what has the wallet ${shown} (${chain || 'unknown chain'}) been doing this week?`)
  }

  const experience = profile.data?.experience_level ?? null

  return (
    <Page>
      <TopBar>
        <div>
          <Heading>Personal dashboard</Heading>
          <HeaderNote>
            Tuned to your watchlist. The global dashboard is unchanged and still your default view.
          </HeaderNote>
        </div>
        <BackLink href="/dashboard">\u2190 Back to global dashboard</BackLink>
      </TopBar>

      <PulseStrip />

      <MainGrid>
        <Card aria-label="Your portfolio surfaces">
          <TabBar role="tablist">
            {TABS.map((t) => (
              <TabBtn
                key={t.key}
                role="tab"
                aria-selected={activeTab === t.key}
                $active={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                data-testid={`tab-${t.key}`}
              >
                {t.label}
              </TabBtn>
            ))}
          </TabBar>

          {activeTab === 'watchlist' && (
            <WatchlistTab onAskOrca={handleAskOrcaTicker} />
          )}
          {activeTab === 'wallets' && (
            <WalletsTab onAskOrca={handleAskOrcaWallet} />
          )}
          {activeTab === 'signals' && (
            <SignalsTab />
          )}
        </Card>

        <StickyCol>
          <PersonalCopilotPanel
            experienceLevel={experience}
            tickers={tickers}
            focusTicker={focusTicker}
            seedMessage={seed}
            onSeedConsumed={() => setSeed('')}
          />
        </StickyCol>
      </MainGrid>

      <TrayBar role="toolbar" aria-label="Drawers">
        <TrayBtn
          type="button"
          data-testid="tray-trading"
          aria-expanded={trayOpen === 'trading'}
          onClick={() => setTrayOpen(trayOpen === 'trading' ? null : 'trading')}
        >
          Trading
        </TrayBtn>
        <TrayBtn
          type="button"
          data-testid="tray-memory"
          aria-expanded={trayOpen === 'memory'}
          onClick={() => setTrayOpen(trayOpen === 'memory' ? null : 'memory')}
        >
          Memory
        </TrayBtn>
      </TrayBar>

      {trayOpen === 'trading' && (
        <TrayDrawer role="region" aria-label="Trading drawer">
          <TradingComingSoon variant="panel" />
        </TrayDrawer>
      )}
      {trayOpen === 'memory' && (
        <TrayDrawer role="region" aria-label="Memory drawer">
          <p style={{ margin: 0, fontSize: 13, color: '#8896a6', lineHeight: 1.55 }}>
            Manage the facts ORCA has saved about you at{' '}
            <Link href="/dashboard/personal/memory" style={{ color: '#00e5ff' }}>
              /dashboard/personal/memory
            </Link>
            . You can delete any single fact or wipe the whole memory.
          </p>
        </TrayDrawer>
      )}
    </Page>
  )
}
