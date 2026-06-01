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
import AlertsTab from '@/components/personal/AlertsTab'
import CopilotPane from '@/components/personal/CopilotPane'
import Tray from '@/components/personal/Tray'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const MONO = "'JetBrains Mono', 'Fira Code', 'SFMono-Regular', ui-monospace, Menlo, Consolas, monospace"

const Page = styled.main`
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  color: #e0e6ed;
  background-image:
    radial-gradient(1200px 600px at 50% -200px, rgba(0,229,255,0.06), transparent 60%),
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: auto, 40px 40px, 40px 40px;
  min-height: 100vh;
`

const TopBar = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(0,229,255,0.18);
`

const Heading = styled.h1`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #00e5ff;
  font-family: ${MONO};
  &::before { content: '[ '; color: rgba(0,229,255,0.55); }
  &::after  { content: ' ]'; color: rgba(0,229,255,0.55); }
`

const HeaderNote = styled.p`
  margin: 6px 0 0;
  font-size: 12px;
  color: #6b7a8c;
  font-family: ${MONO};
  &::before { content: '> '; color: rgba(0,229,255,0.5); }
`

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  font-family: ${MONO};
  font-size: 11px;
  color: #6b7a8c;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const LiveDot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #00e676;
  box-shadow: 0 0 8px #00e676, 0 0 14px rgba(0,230,118,0.4);
  animation: pulse 1.6s ease-in-out infinite;
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
`

const BackLink = styled(Link)`
  font-size: 11px;
  color: #00e5ff;
  text-decoration: none;
  font-family: ${MONO};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 6px 10px;
  border: 1px solid rgba(0,229,255,0.25);
  border-radius: 4px;
  transition: all 120ms ease;
  &:hover { background: rgba(0,229,255,0.08); border-color: #00e5ff; }
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
  position: relative;
  background: linear-gradient(180deg, rgba(13,20,33,0.78) 0%, rgba(8,14,24,0.78) 100%);
  border: 1px solid rgba(0,229,255,0.12);
  border-radius: 6px;
  padding: 18px 20px;
  box-shadow: 0 0 0 1px rgba(0,229,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03);
  &::before {
    content: '';
    position: absolute; left: -1px; top: -1px; right: -1px; height: 2px;
    background: linear-gradient(90deg, transparent, #00e5ff 50%, transparent);
    opacity: 0.6;
  }
  &::after {
    content: '┌┐              ┌┐';
    position: absolute; top: 4px; left: 8px; right: 8px;
    font-family: ${MONO};
    font-size: 10px;
    color: rgba(0,229,255,0.25);
    display: flex; justify-content: space-between;
    pointer-events: none;
  }
`

const TabBar = styled.div`
  display: flex;
  gap: 2px;
  border-bottom: 1px solid rgba(0,229,255,0.12);
  margin-bottom: 16px;
  position: relative;
  z-index: 1;
`

const TabBtn = styled.button`
  background: ${(p) => (p.$active ? 'rgba(0,229,255,0.08)' : 'transparent')};
  border: 0;
  color: ${(p) => (p.$active ? '#00e5ff' : '#6b7a8c')};
  border-bottom: 2px solid ${(p) => (p.$active ? '#00e5ff' : 'transparent')};
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-family: ${MONO};
  cursor: pointer;
  transition: all 100ms ease;
  &:hover { color: #00e5ff; background: rgba(0,229,255,0.05); }
  &:focus-visible { outline: 2px solid #00e5ff; outline-offset: 2px; }
  &::before { content: '${(p) => (p.$active ? '▸ ' : '')}'; }
`

const StickyCol = styled.div`
  position: sticky;
  top: 16px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const TABS = [
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'wallets', label: 'Wallets' },
  { key: 'signals', label: 'Signals' },
  { key: 'alerts', label: 'Alerts' },
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
  const [focus, setFocus] = useState(null) // { type: 'ticker'|'wallet', value, label }
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
    setFocus({ type: 'ticker', value: t, label: `$${t}` })
  }

  function handleAskOrcaWallet(address, chain, label) {
    if (!address) return
    setFocus({
      type: 'wallet',
      value: address,
      label: `${label || address.slice(0, 10) + '\u2026'} (${chain || 'unknown'})`,
    })
  }

  const experience = profile.data?.experience_level ?? null

  return (
    <Page>
      <TopBar>
        <div>
          <Heading>Personal terminal</Heading>
          <HeaderNote>
            Live feed scoped to your watchlist. Global view is unchanged.
          </HeaderNote>
        </div>
        <StatusRow>
          <span><LiveDot /> &nbsp;LIVE</span>
          <span>{tickers.length} TRACKED</span>
          <BackLink href="/dashboard">← GLOBAL</BackLink>
        </StatusRow>
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
          {activeTab === 'alerts' && (
            <AlertsTab />
          )}
        </Card>

        <StickyCol>
          <CopilotPane
            experienceLevel={experience}
            tickers={tickers}
            focus={focus}
            onClearFocus={() => setFocus(null)}
          />
        </StickyCol>
      </MainGrid>

      <Tray open={trayOpen} onChange={setTrayOpen} />
    </Page>
  )
}
