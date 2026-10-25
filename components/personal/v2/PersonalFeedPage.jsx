'use client'
/**
 * Personal page v2 (2026-10-25, Prompt 2; direction: A's feed and Setup rail
 * built in place). One data call (/api/personal/feed) polled every 60 s; one
 * first-run surface (the setup card) for empty accounts; ORCA as hand-off
 * links only (the shell's ORCA pill stays); alert settings at #alerts.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import Link from 'next/link'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { useLivePoll } from '@/components/live/useLivePoll'
import AlertsTab from '@/components/personal/AlertsTab'
import OrcaTutorial from '@/components/onboarding/OrcaTutorial'
import { track } from '@/lib/analytics/track'
import { T } from '@/lib/ui/tokens'
import OnboardingCard from './OnboardingCard'
import Feed, { AlertFireCard } from './Feed'
import { CoinsCard, WalletsCard, AlertsCard, MarketCard, MacroCard, ruleText } from './Rail'
import PersonalSkeleton from './PersonalSkeleton'
import UpsellSlot from '../UpsellSlot'
import { Button, Card, SecHead, Muted, hhmmUtc } from './ui'

const Page = styled.main`
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 24px 64px;
  color: ${T.body};
  font-family: ${T.font.sans};
  @media (max-width: 760px) { padding: 16px 16px 48px; }
`
const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`
const H1 = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: ${T.ink};
`
const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
  @media (max-width: 1080px) { grid-template-columns: minmax(0, 1fr); }
`
const Column = styled.div`
  display: grid;
  gap: 12px;
  min-width: 0;
`
const Footer = styled.footer`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 24px;
  font-size: 12px;
  color: ${T.muted};
`

async function authHeaders() {
  try {
    const { data } = await supabaseBrowser().auth.getSession()
    const t = data?.session?.access_token
    return t ? { Authorization: `Bearer ${t}` } : {}
  } catch {
    return {}
  }
}

const TOUR_KEY = (uid) => `sonar_personal_tour_v1:${uid || 'anon'}`

export default function PersonalFeedPage({ userId, isPremium = false }) {
  const poll = useLivePoll(
    async (signal) => fetch('/api/personal/feed', { headers: await authHeaders(), signal, cache: 'no-store' }),
    { intervalMs: 60_000 }
  )
  const feed = poll.data
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState({})
  const [tourOpen, setTourOpen] = useState(false)
  const mainRef = useRef(null)
  const railRef = useRef(null)
  const alertsRef = useRef(null)
  const tutorialRef = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const scrollToAlerts = useCallback(() => {
    alertsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // Deep link from alert emails: /dashboard/personal?tab=alerts.
  const deepLinked = useRef(false)
  useEffect(() => {
    if (!feed || deepLinked.current) return
    deepLinked.current = true
    try {
      if (new URLSearchParams(window.location.search).get('tab') === 'alerts' || window.location.hash === '#alerts') {
        requestAnimationFrame(() => alertsRef.current?.scrollIntoView({ block: 'start' }))
      }
    } catch { /* ignore */ }
  }, [feed])

  // Tour: opens by itself once per account, on a first visit, only if the
  // user has done nothing for 8 s; any click outside it ends it for good.
  useEffect(() => {
    if (!feed || !userId) return
    let seen = false
    try { seen = localStorage.getItem(TOUR_KEY(userId)) === 'true' } catch { seen = true }
    if (seen) return
    let fired = false
    const cancel = () => { fired = true; clearTimeout(timer); detach() }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']
    const detach = () => events.forEach((e) => window.removeEventListener(e, cancel, true))
    events.forEach((e) => window.addEventListener(e, cancel, true))
    const timer = setTimeout(() => { if (!fired) { detach(); setTourOpen(true) } }, 8000)
    return () => { clearTimeout(timer); detach() }
  }, [feed, userId])

  const openTour = useCallback(() => {
    setTourOpen(true)
    track('welcome_choice', { choice: 'personal_tour' })
  }, [])

  const addCoin = useCallback(async (symbol) => {
    setBusy((b) => ({ ...b, coin: true }))
    try {
      const res = await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ symbol }) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: j?.error === 'unknown_symbol' ? `We do not track ${symbol} yet.` : (j?.error || 'Could not add that coin.') }
      track('welcome_choice', { choice: 'personal_add_coin' })
      poll.refresh()
      return { ok: true }
    } catch {
      return { ok: false, error: 'Could not add that coin.' }
    } finally {
      setBusy((b) => ({ ...b, coin: false }))
    }
  }, [poll])

  const removeCoin = useCallback(async (symbol) => {
    setBusy((b) => ({ ...b, coin: true }))
    try {
      await fetch('/api/watchlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ symbol }) })
      poll.refresh()
    } finally {
      setBusy((b) => ({ ...b, coin: false }))
    }
  }, [poll])

  const followFamous = useCallback(async (slug) => {
    try {
      const res = await fetch('/api/onboarding/follow-famous', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ slugs: [slug], source: 'personal_onboarding' }) })
      if (!res.ok) return false
      track('welcome_choice', { choice: 'personal_follow' })
      try { window.dispatchEvent(new CustomEvent('sonar:follows-changed')) } catch { /* ignore */ }
      poll.refresh()
      return true
    } catch {
      return false
    }
  }, [poll])

  const alertSaved = useCallback(() => {
    track('welcome_choice', { choice: 'personal_alert' })
    poll.refresh()
  }, [poll])

  // ORCA-created alerts refetch the feed too.
  useEffect(() => {
    const on = () => poll.refresh()
    window.addEventListener('orca:alerts-changed', on)
    window.addEventListener('orca:watchlist-changed', on)
    return () => {
      window.removeEventListener('orca:alerts-changed', on)
      window.removeEventListener('orca:watchlist-changed', on)
    }
  }, [poll])

  if (!feed) {
    if (!poll.error) return <PersonalSkeleton />
    const signedOut = poll.error === 'HTTP 401'
    return (
      <Page data-testid="personal-v2">
        <Card role="alert">
          <SecHead title={signedOut ? 'Sign in to see your page' : 'Your page did not load'} />
          <p style={{ margin: '0 0 12px', fontSize: 13 }}>
            {signedOut ? 'Your session has ended.' : 'We could not reach the server. We will keep retrying every minute.'}
          </p>
          {signedOut
            ? <Button as="a" href="/?login=1&required=%2Fdashboard%2Fpersonal" $primary>Sign in</Button>
            : <Button type="button" onClick={poll.refresh}>Try again</Button>}
        </Card>
      </Page>
    )
  }

  const ok = (s) => s?.status === 'ok'
  const tickers = ok(feed.tickers) ? feed.tickers.data : []
  const follows = ok(feed.follows) ? feed.follows.data : { wallets: [], moves: [] }
  const alerts = ok(feed.alerts) ? feed.alerts.data : { rules: [], notifications: [] }
  const market = ok(feed.market) ? feed.market.data : []
  const macro = ok(feed.macro) ? feed.macro.data : null
  const tape = ok(feed.tape) ? feed.tape.data : { newest_at: null, chains_label: '', suggestions: [] }
  const coinSyms = tickers.filter((t) => t.valid).map((t) => t.ticker)
  const dayAgo = now - 24 * 3_600_000
  const fired = alerts.notifications.find((n) => !n.read && Date.parse(n.created_at) >= dayAgo) || null
  const firedRule = fired ? alerts.rules.find((r) => r.id === fired.rule_id) : null
  const names = new Map(follows.wallets.map((w) => [String(w.address).toLowerCase(), w.name]))

  const tourSteps = feed.empty
    ? [
        { key: 'setup', resolve: (r) => r?.main?.current, kicker: 'Start here', title: 'Set up your feed', text: 'Add a coin or follow a wallet. Your feed then lists their large on-chain moves, newest first.', placement: 'bottom' },
        { key: 'market', resolve: (r) => r?.rail?.current, kicker: 'Today', title: 'The market at a glance', text: 'Prices for the big coins and what whales did with them in the last 24 hours.', placement: 'left' },
        { key: 'alerts', resolve: (r) => r?.alerts?.current, kicker: 'Alerts', title: 'Get told when it matters', text: 'Alerts arrive in the bell at the top right. Email is optional.', placement: 'top' },
      ]
    : [
        { key: 'feed', resolve: (r) => r?.main?.current, kicker: 'Your feed', title: 'Moves and alerts, newest first', text: 'Large moves by wallets you follow and alerts that fired. Each row has an Ask ORCA link for a plain-English explanation.', placement: 'bottom' },
        { key: 'rail', resolve: (r) => r?.rail?.current, kicker: 'Your setup', title: 'Your coins and wallets', text: 'Prices, each coin’s whale flow today, and when we last checked each wallet you follow.', placement: 'left' },
        { key: 'alerts', resolve: (r) => r?.alerts?.current, kicker: 'Alerts', title: 'Alert settings', text: 'Add, pause or change alerts here. They arrive in the bell; email is optional.', placement: 'top' },
      ]

  return (
    <Page data-testid="personal-v2">
      <Header>
        <H1>Personal</H1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {feed.generated_at && <Muted style={{ fontSize: 12 }}>Updated {hhmmUtc(feed.generated_at)}</Muted>}
          <Button ref={tutorialRef} type="button" onClick={openTour} data-testid="personal-tutorial">Tutorial</Button>
        </div>
      </Header>

      <Grid>
        <Column ref={mainRef}>
          {feed.empty ? (
            <OnboardingCard
              suggestions={tape.suggestions || []}
              wallets={follows.wallets}
              coins={coinSyms}
              onAddCoin={addCoin}
              onFollow={followFamous}
              onAlertSaved={alertSaved}
              onTour={openTour}
              busy={busy}
            />
          ) : (
            <>
              <AlertFireCard notification={fired} ruleText={ruleText(firedRule, names)} onAdjust={scrollToAlerts} />
              <Feed
                moves={follows.moves}
                notifications={fired ? alerts.notifications.filter((n) => n.id !== fired.id) : alerts.notifications}
                tapeNewestAt={tape.newest_at}
                chainsLabel={tape.chains_label}
                pollOkAt={poll.lastFetchedAt}
                failures={poll.consecutiveFailures}
                now={now}
              />
            </>
          )}
        </Column>

        <Column ref={railRef}>
          {feed.empty ? (
            <>
              <MarketCard rows={market} asOf={feed.generated_at} tapeNewestAt={tape.newest_at} now={now} />
              <MacroCard macro={macro} />
            </>
          ) : (
            <>
              <CoinsCard tickers={tickers} onAdd={addCoin} onRemove={removeCoin} busy={busy.coin} />
              <WalletsCard wallets={follows.wallets} now={now} />
              <AlertsCard rules={alerts.rules} names={names} onManage={scrollToAlerts} />
              <UpsellSlot isPremium={isPremium} />
            </>
          )}
        </Column>
      </Grid>

      <section id="alerts" ref={alertsRef} style={{ marginTop: 16, scrollMarginTop: 80 }}>
        <Card>
          <SecHead title="Alert settings" />
          <AlertsTab embedded wallets={follows.wallets} coins={coinSyms} />
        </Card>
      </section>

      <Footer>
        <Link href="/dashboard/personal/memory" style={{ color: T.muted }}>What ORCA remembers about you</Link>
        <span>Research only, not financial advice.</span>
        <span>
          Some portraits via Wikimedia Commons (MrBeast photo: Tyren Redd,{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" style={{ color: T.muted }}>CC BY 4.0</a>).
        </span>
      </Footer>

      <OrcaTutorial
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        refs={{ main: mainRef, rail: railRef, alerts: alertsRef }}
        steps={tourSteps}
        storageKey={TOUR_KEY(userId)}
        finishHref={null}
        closeOnOutsideClick
      />
    </Page>
  )
}
