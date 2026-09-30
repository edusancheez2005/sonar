'use client'
/**
 * FirstRunWelcome — the ONLY first-run surface on the dashboard.
 * =============================================================================
 * 2026-09-30 activation redesign. A new account used to get four stacked
 * overlays within 1.5s (5-step questionnaire, tutorial tooltip, launch
 * spotlight, follow nudge). Now: one inline, dismissable card at the top of
 * the dashboard that points at the two fastest value moments —
 *   1. ORCA answering "what are whales doing today?" in plain English
 *   2. following a famous wallet
 * — plus an on-demand tour and a one-click "how much do you know?" chip that
 * calibrates ORCA (writes user_profile.experience_level) without a modal.
 *
 * Shows while `sonar_welcome_v1` is not 'dismissed' AND the legacy tutorial
 * key is absent, so existing users in their usual browser never see it.
 * Nothing here blocks the page: no backdrop, no portal, no z-index games.
 */
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'
import {
  FIRST_QUESTION_URL,
  WELCOME_DISMISSED_KEY,
  TUTORIAL_DONE_KEY,
} from '@/lib/onboarding/firstRun'

const Card = styled.section`
  position: relative;
  margin: 1rem 0 0.25rem;
  padding: 1.15rem 1.35rem 1.1rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 229, 255, 0.22);
  background:
    radial-gradient(120% 160% at 0% 0%, rgba(0, 229, 255, 0.10) 0%, rgba(0, 229, 255, 0) 55%),
    rgba(13, 17, 28, 0.92);
  backdrop-filter: blur(12px);
  color: #e0e6ed;
  font-family: ${FONT_SANS};
`

const Kicker = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #00e5ff;
  margin-bottom: 0.35rem;
`

const Title = styled.h2`
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
  font-weight: 700;
  line-height: 1.25;
  color: #f2f6fa;
  @media (max-width: 640px) { font-size: 1.05rem; }
`

const Copy = styled.p`
  margin: 0 0 0.9rem;
  max-width: 62ch;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #9fb0c2;
`

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
`

const Primary = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #06121a;
  text-decoration: none;
  background: linear-gradient(135deg, #7af8ff, #22d3ee 60%, #36a6ba);
  box-shadow: 0 6px 18px rgba(34, 211, 238, 0.22);
  &:hover { filter: brightness(1.07); }
`

const Secondary = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.95rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #e0e6ed;
  text-decoration: none;
  border: 1px solid rgba(0, 229, 255, 0.28);
  background: rgba(0, 229, 255, 0.06);
  &:hover { background: rgba(0, 229, 255, 0.12); }
`

const Ghost = styled.button`
  padding: 0.6rem 0.75rem;
  border: 0;
  background: transparent;
  color: #8fa3b8;
  font-size: 0.85rem;
  font-family: ${FONT_SANS};
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  &:hover { color: #e0e6ed; }
`

const Close = styled.button`
  position: absolute;
  top: 0.55rem;
  right: 0.6rem;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 0;
  background: transparent;
  color: #6f8194;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  &:hover { color: #e0e6ed; background: rgba(255, 255, 255, 0.05); }
`

const LevelRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
  font-size: 0.82rem;
  color: #8fa3b8;
`

const LevelChip = styled.button`
  padding: 0.32rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  color: #cfd8e3;
  font-size: 0.8rem;
  font-family: ${FONT_SANS};
  cursor: pointer;
  &:hover { border-color: rgba(0, 229, 255, 0.4); color: #fff; }
  &:disabled { opacity: 0.6; cursor: default; }
`

const LEVELS = [
  { value: 'new', label: 'New to crypto' },
  { value: 'intermediate', label: 'I know the basics' },
  { value: 'advanced', label: 'I trade on-chain' },
]

const LEVEL_ACK = {
  new: 'Got it — ORCA will keep things simple and explain the jargon.',
  intermediate: 'Got it — ORCA will skip the basics.',
  advanced: 'Got it — ORCA will go straight to the on-chain detail.',
}

export default function FirstRunWelcome({ onTakeTour }) {
  const [show, setShow] = useState(false)
  const [userId, setUserId] = useState(null)
  const [level, setLevel] = useState(undefined) // undefined = not loaded, null = unknown
  const [picked, setPicked] = useState(null) // level chosen in THIS mount (drives the ack line)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    try {
      if (localStorage.getItem(WELCOME_DISMISSED_KEY) === 'dismissed') return undefined
      if (localStorage.getItem(TUTORIAL_DONE_KEY)) return undefined
    } catch {
      return undefined
    }
    setShow(true)
    ;(async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const uid = data?.session?.user?.id || null
        if (cancelled || !uid) return
        setUserId(uid)
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

  if (!show) return null

  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem(WELCOME_DISMISSED_KEY, 'dismissed') } catch { /* ignore */ }
  }

  const pickLevel = async (value) => {
    if (!userId || saving) return
    setSaving(true)
    try {
      const sb = supabaseBrowser()
      await sb
        .from('user_profile')
        .upsert(
          { user_id: userId, experience_level: value, personalization_dismissed: true },
          { onConflict: 'user_id' }
        )
      setLevel(value)
      setPicked(value)
    } catch { /* non-blocking: the chips just stay */ } finally {
      setSaving(false)
    }
  }

  return (
    <Card aria-label="Welcome to Sonar" data-testid="first-run-welcome">
      <Close type="button" aria-label="Dismiss welcome" onClick={dismiss}>×</Close>
      <Kicker>Welcome to Sonar</Kicker>
      <Title>See what the biggest crypto wallets are doing right now</Title>
      <Copy>
        Sonar watches thousands of large wallets (&ldquo;whales&rdquo;) across 7 chains.
        When big money moves, you see it here first. Start with one of these:
      </Copy>
      <Row>
        <Primary href={FIRST_QUESTION_URL} onClick={dismiss}>
          🐋 Ask ORCA what whales did today →
        </Primary>
        <Secondary href="/figures" onClick={dismiss}>
          ★ Follow a famous wallet
        </Secondary>
        {typeof onTakeTour === 'function' && (
          <Ghost type="button" onClick={onTakeTour}>Take the 60-second tour</Ghost>
        )}
      </Row>
      {level === null && userId && !picked && (
        <LevelRow>
          <span>How much do you know about crypto?</span>
          {LEVELS.map((l) => (
            <LevelChip key={l.value} type="button" disabled={saving} onClick={() => pickLevel(l.value)}>
              {l.label}
            </LevelChip>
          ))}
        </LevelRow>
      )}
      {picked && LEVEL_ACK[picked] && (
        <LevelRow role="status">{LEVEL_ACK[picked]}</LevelRow>
      )}
    </Card>
  )
}
