'use client'
/**
 * FirstRunWelcome — the one-time welcome dialog.
 * =============================================================================
 * Shown exactly ONCE per account, on the first dashboard visit (keyed by user
 * id in localStorage; marked "seen" the moment it opens, so a refresh or the
 * next login never shows it again). It asks a single routing question the way
 * Notion / Linear do ("what do you want to do first?") with three choices,
 * plus an optional one-click "how much do you know?" that calibrates ORCA.
 * Nothing else on the dashboard opens while it is up; the follow nudge waits
 * for the next visit (hasSeenFirstRun).
 *
 * v2 (2026-09-30, Eduardo: "looks quite bad… analyse Nansen… cleaner /
 * bespoke") replaces the inline card with this dialog: no emoji, SVG icons,
 * generous spacing, one accent colour.
 *
 * v3 (2026-10-03, Week 1 "make the loops fire"): the "Follow a famous wallet"
 * choice opens an in-dialog picker (six names, one-tap follows, optional
 * email alerts) instead of sending people to the figures directory, and every
 * choice logs welcome_choice. The post-signup hook lives in
 * components/onboarding/PostSignupHook (global, any landing page).
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import styled, { keyframes } from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'
import { FIRST_QUESTION_URL, welcomeKeyFor } from '@/lib/onboarding/firstRun'
import { FAMOUS_WALLETS } from '@/lib/onboarding/famousWallets'
import { track } from '@/lib/analytics/track'

const CYAN = '#00e5ff'
const WELCOME_MAX_ACCOUNT_AGE_MS = 14 * 24 * 3600 * 1000

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`
const rise = keyframes`
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(4, 8, 14, 0.66);
  backdrop-filter: blur(6px);
  animation: ${fadeIn} 0.18s ease-out;
`

const Dialog = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(700px, 100%);
  /* 100% of the fixed backdrop = the visible viewport minus its padding. 100vh
     is the toolbar-less height on iOS/Android and pushed "Done" off-screen. */
  max-height: 100%;
  overflow-y: auto;
  border-radius: 18px;
  border: 1px solid rgba(0, 229, 255, 0.14);
  background:
    radial-gradient(90% 60% at 50% -10%, rgba(0, 229, 255, 0.12) 0%, rgba(0, 229, 255, 0) 60%),
    #0c1119;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
  padding: 38px 40px 28px;
  color: #e0e6ed;
  font-family: ${FONT_SANS};
  animation: ${rise} 0.22s ease-out;
  @media (max-width: 640px) { padding: 28px 22px 20px; }
`

const Close = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 0;
  background: transparent;
  color: #6f8194;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  &:hover { color: #e0e6ed; background: rgba(255, 255, 255, 0.06); }
`

const Brand = styled.img`
  align-self: flex-start;
  height: 20px;
  width: auto;
  opacity: 0.92;
  margin-bottom: 22px;
`

const Eyebrow = styled.div`
  font-family: ${FONT_MONO};
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: ${CYAN};
  margin-bottom: 10px;
`

const Heading = styled.h1`
  margin: 0 0 10px;
  font-size: 27px;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.012em;
  color: #f4f7fa;
  @media (max-width: 640px) { font-size: 23px; }
`

const Sub = styled.p`
  margin: 0 0 26px;
  max-width: 54ch;
  font-size: 15px;
  line-height: 1.6;
  color: #9fb0c2;
`

const Choices = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`

const choiceCss = `
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 16px 16px;
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.025);
  color: inherit;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
  &:hover, &:focus-visible {
    border-color: rgba(0, 229, 255, 0.5);
    background: rgba(0, 229, 255, 0.05);
    transform: translateY(-2px);
    outline: none;
  }
  @media (max-width: 640px) {
    flex-direction: row;
    align-items: center;
    gap: 14px;
    padding: 14px;
  }
`

const ChoiceLink = styled(Link)`${choiceCss}`
const ChoiceButton = styled.button`
  ${choiceCss}
  font-family: inherit;
  font-size: inherit;
`

const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 10px;
  background: rgba(0, 229, 255, 0.10);
  color: ${CYAN};
  svg { width: 20px; height: 20px; }
`

const ChoiceText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const ChoiceTitle = styled.span`
  font-size: 14.5px;
  font-weight: 600;
  color: #eaf0f6;
  line-height: 1.3;
`

const ChoiceDesc = styled.span`
  font-size: 13px;
  line-height: 1.45;
  color: #8fa3b8;
`

const ChoiceMeta = styled.span`
  margin-top: auto;
  padding-top: 4px;
  font-family: ${FONT_MONO};
  font-size: 10.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5f7387;
  @media (max-width: 640px) { display: none; }
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
`

const LevelWrap = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12.5px;
  color: #7f92a6;
`

const Segmented = styled.div`
  display: inline-flex;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 999px;
  padding: 2px;
  background: rgba(255, 255, 255, 0.02);
`

const Seg = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 5px 11px;
  background: transparent;
  color: #b7c4d1;
  font-family: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  @media (max-width: 640px) { padding: 5px 8px; font-size: 11.5px; }
  transition: background 0.12s ease, color 0.12s ease;
  &:hover { color: #fff; }
  &:disabled { opacity: 0.55; cursor: default; }
`

const Ack = styled.span`
  font-size: 12.5px;
  color: #9fb0c2;
`

const Ghost = styled.button`
  border: 0;
  background: transparent;
  padding: 6px 2px;
  color: #7f92a6;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  &:hover { color: #e0e6ed; }
`

/* ---- Follow picker ------------------------------------------------------ */
const PickerHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 10px;
`

const TextButton = styled.button`
  border: 0;
  background: transparent;
  padding: 4px 0;
  color: ${CYAN};
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  &:hover { text-decoration: underline; }
  &:disabled { color: #5f7387; cursor: default; text-decoration: none; }
`

const WalletList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  /* The list scrolls; heading and the Done button stay on screen. */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`

const WalletRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${(p) => (p.$on ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 255, 255, 0.07)')};
  background: ${(p) => (p.$on ? 'rgba(0, 229, 255, 0.06)' : 'rgba(255, 255, 255, 0.025)')};
  transition: border-color 0.15s ease, background 0.15s ease;
`

const Avatar = styled.span`
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 229, 255, 0.10);
  color: ${CYAN};
  font-family: ${FONT_MONO};
  font-size: 15px;
  font-weight: 700;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`

const WalletText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
`

const WalletName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #eaf0f6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const WalletBlurb = styled.span`
  font-size: 12px;
  line-height: 1.35;
  color: #8fa3b8;
`

const FollowBtn = styled.button`
  flex: 0 0 auto;
  min-width: 84px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid ${(p) => (p.$on ? 'transparent' : 'rgba(0, 229, 255, 0.45)')};
  background: ${(p) => (p.$on ? 'rgba(0, 229, 255, 0.16)' : 'transparent')};
  color: ${(p) => (p.$on ? CYAN : '#dff8fc')};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: ${(p) => (p.$on ? 'default' : 'pointer')};
  transition: background 0.15s ease, border-color 0.15s ease;
  &:hover { background: ${(p) => (p.$on ? 'rgba(0, 229, 255, 0.16)' : 'rgba(0, 229, 255, 0.10)')}; }
  &:disabled { opacity: 0.75; }
`

const EmailOpt = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  color: #9fb0c2;
  cursor: pointer;
  user-select: none;
  input { accent-color: ${CYAN}; width: 15px; height: 15px; margin: 0; }
`

const Primary = styled.button`
  border: 0;
  border-radius: 10px;
  padding: 10px 18px;
  background: ${CYAN};
  color: #04202a;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s ease, opacity 0.15s ease;
  &:hover { filter: brightness(1.08); }
  &:disabled { opacity: 0.45; cursor: default; filter: none; }
`

/* Line icons (stroke = currentColor) */
const IconChat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.4c-.5.4-1.3 0-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z" />
    <path d="M8 8.5h8M8 11.5h5" />
  </svg>
)
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8L12 3.5Z" />
  </svg>
)
const IconCompass = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5 4.5-1.9Z" />
  </svg>
)

const LEVELS = [
  { value: 'new', label: 'New to crypto' },
  { value: 'intermediate', label: 'Know the basics' },
  { value: 'advanced', label: 'Trade on-chain' },
]
const LEVEL_ACK = {
  new: 'Got it. ORCA will keep things simple and explain the jargon.',
  intermediate: 'Got it. ORCA will skip the basics.',
  advanced: 'Got it. ORCA will go straight to the on-chain detail.',
}

function firstName(user) {
  const raw = user?.user_metadata?.full_name || user?.user_metadata?.name || ''
  const first = String(raw).trim().split(/\s+/)[0] || ''
  return first.length > 1 && first.length <= 24 ? first : ''
}

export default function FirstRunWelcome({ onTakeTour }) {
  const [mounted, setMounted] = useState(false)
  const [show, setShow] = useState(false)
  const [userId, setUserId] = useState(null)
  const [name, setName] = useState('')
  const [level, setLevel] = useState(undefined) // undefined = loading, null = unknown
  const [picked, setPicked] = useState(null)
  const [saving, setSaving] = useState(false)
  const [panel, setPanel] = useState('choices') // 'choices' | 'follow'
  const [token, setToken] = useState(null)
  const [followed, setFollowed] = useState({}) // slug -> 'pending' | 'done' | 'error'
  const [emailAlerts, setEmailAlerts] = useState(true)
  // Email choice bookkeeping, read from async paths (Escape, in-flight follows):
  // touched = the user changed the box; choiceMade = they chose before (then an
  // untouched box must not overwrite it); applied/closed guard the one PATCH.
  const emailRef = useRef({ alerts: true, touched: false, choiceMade: false, known: false, applied: false, closed: false })
  emailRef.current.alerts = emailAlerts
  // Wallet sign-ins carry a placeholder address; never offer them email.
  const [canEmail, setCanEmail] = useState(true)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const user = data?.session?.user
        const uid = user?.id || null
        if (cancelled || !uid) return
        const key = welcomeKeyFor(uid)
        // Once per ACCOUNT: the localStorage key covers this browser, the
        // user_metadata flag covers other devices, and accounts older than two
        // weeks never see a "first time here" dialog.
        const created = Date.parse(user?.created_at || '')
        const isNewAccount = Number.isFinite(created) && Date.now() - created < WELCOME_MAX_ACCOUNT_AGE_MS
        try {
          if (localStorage.getItem(key)) return
          if (user?.user_metadata?.welcome_seen_at || !isNewAccount) {
            localStorage.setItem(key, 'seen')
            return
          }
          localStorage.setItem(key, 'seen')
        } catch { return }
        try {
          sb.auth.updateUser({ data: { welcome_seen_at: new Date().toISOString() } }).catch(() => {})
        } catch { /* the local key still applies */ }
        setUserId(uid)
        setName(firstName(user))
        setToken(data?.session?.access_token || null)
        setCanEmail(!!user?.email && !/@wallet\.sonartracker\.io$/i.test(user.email))
        setShow(true)
        const { data: row } = await sb
          .from('user_profile')
          .select('experience_level')
          .eq('user_id', uid)
          .maybeSingle()
        if (!cancelled) setLevel(row?.experience_level ?? null)
      } catch {
        if (!cancelled) setLevel(null)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Lock page scroll + Escape to close while open
  useEffect(() => {
    if (!show) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  // Alert-email choice is applied once, as an explicit true/false, when the
  // dialog closes after at least one follow (or when a follow still in flight
  // at close lands) — so unticking before "Done" really means no emails.
  // A stored choice is only overwritten if the user touched the box. Turning
  // it on starts the double opt-in for addresses Google has not verified.
  const applyEmailChoice = () => {
    const st = emailRef.current
    if (st.applied || !canEmail || !token) return
    st.applied = true
    // Untouched box: write the default only once the server has confirmed the
    // user never chose (a failed or slow lookup must not overwrite an "off").
    if (!st.touched && (st.choiceMade || !st.known)) return
    try {
      fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications_email: !!st.alerts }),
        keepalive: true,
      }).catch(() => {})
    } catch { /* ignore */ }
  }

  const close = () => {
    setShow(false)
    try { localStorage.setItem(welcomeKeyFor(userId), 'dismissed') } catch { /* ignore */ }
    emailRef.current.closed = true
    if (Object.values(followed).some((v) => v === 'done')) applyEmailChoice()
  }
  // The Escape listener is registered once per open; read the latest close.
  const closeRef = useRef(close)
  closeRef.current = close

  const takeTour = () => {
    track('welcome_choice', { choice: 'tour' })
    close()
    if (typeof onTakeTour === 'function') setTimeout(onTakeTour, 120)
  }

  const chooseFirstQuestion = () => {
    track('welcome_choice', { choice: 'first_question' })
    close()
  }

  const explore = () => {
    track('welcome_choice', { choice: 'explore' })
    close()
  }

  const openPicker = () => {
    track('welcome_choice', { choice: 'follow' })
    setPanel('follow')
    // Show the stored email choice instead of a pre-ticked box when there is one.
    if (!token) return
    fetch('/api/notifications/preferences', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json) return
        if (json.email_state === 'undeliverable') setCanEmail(false)
        if (json.email_choice_made === null || json.email_choice_made === undefined) return // unknown
        emailRef.current.known = true
        if (json.email_choice_made) {
          emailRef.current.choiceMade = true
          if (!emailRef.current.touched) setEmailAlerts(!!json.notifications_email)
        }
      })
      .catch(() => {})
  }

  const followedCount = Object.values(followed).filter((v) => v === 'done').length

  const followSlugs = async (slugs) => {
    if (!token || slugs.length === 0) return
    setFollowed((f) => {
      const next = { ...f }
      for (const sl of slugs) if (next[sl] !== 'done') next[sl] = 'pending'
      return next
    })
    try {
      const res = await fetch('/api/onboarding/follow-famous', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs }),
      })
      const json = res.ok ? await res.json() : null
      const okSlugs = new Set((json?.results || []).filter((r) => r.ok).map((r) => r.slug))
      setFollowed((f) => {
        const next = { ...f }
        for (const sl of slugs) next[sl] = okSlugs.has(sl) ? 'done' : 'error'
        return next
      })
      if (okSlugs.size > 0) {
        try { window.dispatchEvent(new Event('sonar:follows-changed')) } catch { /* ignore */ }
        // Closed while this follow was in flight: apply the email choice now.
        if (emailRef.current.closed) applyEmailChoice()
      }
    } catch {
      setFollowed((f) => {
        const next = { ...f }
        for (const sl of slugs) if (next[sl] === 'pending') next[sl] = 'error'
        return next
      })
    }
  }

  const followAll = () => followSlugs(FAMOUS_WALLETS.map((w) => w.slug).filter((sl) => followed[sl] !== 'done'))
  const anyPending = Object.values(followed).some((v) => v === 'pending')

  const pickLevel = async (value) => {
    if (!userId || saving) return
    setSaving(true)
    try {
      await supabaseBrowser()
        .from('user_profile')
        .upsert(
          { user_id: userId, experience_level: value, personalization_dismissed: true },
          { onConflict: 'user_id' }
        )
      setLevel(value)
      setPicked(value)
    } catch { /* non-blocking */ } finally {
      setSaving(false)
    }
  }

  if (!mounted || !show) return null

  return createPortal(
    <Backdrop onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <Dialog role="dialog" aria-modal="true" aria-labelledby="sonar-welcome-title" data-testid="first-run-welcome">
        <Close type="button" aria-label="Dismiss welcome" onClick={close}>×</Close>
        <Brand src="/logo2.png" alt="Sonar" />
        {panel === 'follow' ? (
          <>
            <Eyebrow>Follow famous wallets</Eyebrow>
            <Heading id="sonar-welcome-title">Pick who to watch.</Heading>
            <Sub>
              One tap each. When they move you will see it on your dashboard and
              in your inbox, and by email if you want.
            </Sub>

            <PickerHead>
              <span style={{ fontSize: 12.5, color: '#7f92a6' }}>
                {followedCount === 0
                  ? 'Most people start with three.'
                  : `Following ${followedCount} of ${FAMOUS_WALLETS.length}.`}
              </span>
              <TextButton type="button" onClick={followAll} disabled={anyPending || followedCount === FAMOUS_WALLETS.length}>
                Follow all six
              </TextButton>
            </PickerHead>

            <WalletList data-testid="famous-wallet-picker">
              {FAMOUS_WALLETS.map((w) => {
                const st = followed[w.slug]
                const on = st === 'done'
                return (
                  <WalletRow key={w.slug} $on={on}>
                    <Avatar aria-hidden>
                      {w.avatar ? <img src={w.avatar} alt="" loading="lazy" /> : w.name.charAt(0)}
                    </Avatar>
                    <WalletText>
                      <WalletName>{w.name}</WalletName>
                      <WalletBlurb>{w.blurb}</WalletBlurb>
                    </WalletText>
                    <FollowBtn
                      type="button"
                      $on={on}
                      disabled={on || st === 'pending'}
                      aria-pressed={on}
                      onClick={() => followSlugs([w.slug])}
                    >
                      {on ? 'Following' : st === 'pending' ? '…' : st === 'error' ? 'Retry' : 'Follow'}
                    </FollowBtn>
                  </WalletRow>
                )
              })}
            </WalletList>

            <Footer>
              {canEmail ? (
                <EmailOpt>
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => {
                      emailRef.current.touched = true
                      setEmailAlerts(e.target.checked)
                    }}
                  />
                  Also email me when they move
                </EmailOpt>
              ) : (
                <span />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Ghost type="button" onClick={() => setPanel('choices')}>Back</Ghost>
                <Primary type="button" onClick={close} disabled={followedCount === 0 || anyPending}>
                  {followedCount === 0 ? 'Follow one to continue' : 'Done, show my dashboard'}
                </Primary>
              </div>
            </Footer>
          </>
        ) : (
          <>
        <Eyebrow>First time here</Eyebrow>
        <Heading id="sonar-welcome-title">
          Welcome to Sonar{name ? `, ${name}` : ''}.
        </Heading>
        <Sub>
          Sonar watches the biggest wallets in crypto and shows you where the money
          is going, as it happens. What do you want to do first?
        </Sub>

        <Choices>
          <ChoiceLink href={FIRST_QUESTION_URL} onClick={chooseFirstQuestion}>
            <IconWrap><IconChat /></IconWrap>
            <ChoiceText>
              <ChoiceTitle>See what whales did today</ChoiceTitle>
              <ChoiceDesc>ORCA explains the last 24 hours of whale activity in plain English.</ChoiceDesc>
            </ChoiceText>
            <ChoiceMeta>Takes 20 seconds</ChoiceMeta>
          </ChoiceLink>

          <ChoiceButton type="button" onClick={openPicker} data-testid="welcome-follow">
            <IconWrap><IconStar /></IconWrap>
            <ChoiceText>
              <ChoiceTitle>Follow a famous wallet</ChoiceTitle>
              <ChoiceDesc>Vitalik, Binance, MrBeast. Get told the moment they move.</ChoiceDesc>
            </ChoiceText>
            <ChoiceMeta>One tap each</ChoiceMeta>
          </ChoiceButton>

          <ChoiceButton type="button" onClick={takeTour}>
            <IconWrap><IconCompass /></IconWrap>
            <ChoiceText>
              <ChoiceTitle>Take the quick tour</ChoiceTitle>
              <ChoiceDesc>Nine short stops: whales, trending, news, stats and ORCA.</ChoiceDesc>
            </ChoiceText>
            <ChoiceMeta>About a minute</ChoiceMeta>
          </ChoiceButton>
        </Choices>

        <Footer>
          <LevelWrap>
            {picked && LEVEL_ACK[picked] ? (
              <Ack role="status">{LEVEL_ACK[picked]}</Ack>
            ) : level === null ? (
              <>
                <span>How much do you know about crypto?</span>
                <Segmented>
                  {LEVELS.map((l) => (
                    <Seg key={l.value} type="button" disabled={saving} onClick={() => pickLevel(l.value)}>
                      {l.label}
                    </Seg>
                  ))}
                </Segmented>
              </>
            ) : null}
          </LevelWrap>
          <Ghost type="button" onClick={explore}>Explore on my own</Ghost>
        </Footer>
          </>
        )}
      </Dialog>
    </Backdrop>,
    document.body
  )
}
