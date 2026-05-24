'use client'
/**
 * PersonalDashboardClient
 * =============================================================================
 * Personal Dashboard shell (§4.D of ORCA_COPILOT_BUILD_PROMPT.md). Hosts
 * four panels:
 *   - A: WatchlistPanel
 *   - B: PersonalCopilotPanel
 *   - C: Filtered Signals (placeholder — depends on Step 4.F)
 *   - D: Trading (placeholder — locked decision §7.4)
 *
 * Per spec, this route MUST NOT replace or restyle the global dashboard.
 * It is an additional surface reachable via the header "Personal →" link
 * once the user has a profile row.
 *
 * No personal data is server-side rendered. The panels load client-side
 * after Supabase auth resolves.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import RequirePremiumClient from '../RequirePremiumClient'
import WatchlistPanel from '@/components/personal/WatchlistPanel'
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
  margin-bottom: 22px;
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

const Grid = styled.div`
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const PlaceholderCard = styled.section`
  background: rgba(13, 20, 33, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 20px 22px;
  color: #8896a6;
`

const PlaceholderTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: #e0e6ed;
  letter-spacing: 0.02em;
`

const PlaceholderBody = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
`

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

        // Lightweight ticker pull so the copilot greeting can name them.
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
            // The WatchlistPanel will surface its own error state; nothing
            // to do for the greeting hint in that case.
          }
        }
      } catch {
        if (!cancelled) setProfile({ status: 'error', data: null })
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

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
        <BackLink href="/dashboard">← Back to global dashboard</BackLink>
      </TopBar>

      <Grid>
        <WatchlistPanel />
        <PersonalCopilotPanel
          experienceLevel={experience}
          tickers={tickers}
        />
        <PlaceholderCard aria-labelledby="signals-panel-title">
          <PlaceholderTitle id="signals-panel-title">Filtered signals</PlaceholderTitle>
          <PlaceholderBody>
            Coming next. Signals scored against your risk tolerance and time horizon will appear here once the research engine is live.
          </PlaceholderBody>
        </PlaceholderCard>
        <PlaceholderCard aria-labelledby="trading-panel-title">
          <PlaceholderTitle id="trading-panel-title">Trading</PlaceholderTitle>
          <TradingComingSoon variant="panel" />
        </PlaceholderCard>
      </Grid>
    </Page>
  )
}
