'use client'
import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { FIRST_QUESTION_URL } from '@/lib/onboarding/firstRun'

/* ── Step config ─────────────────────────────────────────────── */
// 2026-09-30: the tour now walks the WHOLE product (Eduardo: "the 60-sec tour
// is quite boring… explain that we have a news page, the stats, trending").
// Dashboard stops use refs handed in by Dashboard.js; sidebar stops resolve
// the rail link by href. A stop whose target is missing or not visible
// (collapsed rail, phone drawer) is skipped at open time.
const sidebar = (href) => () => {
  if (typeof document === 'undefined') return null
  return document.querySelector(`aside a[href="${href}"]`) || document.querySelector(`a[href="${href}"]`)
}
const STEPS = [
  {
    key: 'marketPulse',
    resolve: (refs) => refs?.marketPulse?.current,
    kicker: 'Start here',
    title: 'Is big money buying or selling?',
    text: 'Four numbers, five seconds: how many coins whales are piling into, how many they are dumping, and how much moved in the last 24 hours.',
    placement: 'bottom',
  },
  {
    key: 'whaleData',
    resolve: (refs) => refs?.whaleData?.current,
    kicker: 'Whale flows',
    title: 'Where the money is going',
    text: 'Green bars are coins whales bought more than they sold today. Red is the opposite. Other tools charge for exactly this view.',
    placement: 'bottom',
  },
  {
    key: 'tokenTable',
    resolve: (refs) => refs?.tokenTable?.current,
    kicker: 'Most traded',
    title: 'Click any coin',
    text: 'Every token has its own page: whale trades, price chart, news and sentiment together, so you never have to guess why it moved.',
    placement: 'top',
  },
  {
    key: 'whales',
    resolve: sidebar('/wallet-tracker'),
    kicker: 'Whales',
    title: 'The biggest wallets, ranked',
    text: 'The whale leaderboard plus famous wallets like Vitalik, Binance and MrBeast. Follow one and Sonar tells you the moment it moves.',
    placement: 'right',
  },
  {
    key: 'trending',
    resolve: sidebar('/trending'),
    kicker: 'Trending',
    title: 'What is heating up right now',
    text: 'Coins gaining whale and social momentum before they reach the headlines.',
    placement: 'right',
  },
  {
    key: 'news',
    resolve: sidebar('/news'),
    kicker: 'News',
    title: 'News that says which coin it is about',
    text: 'Crypto headlines tagged by coin with a sentiment read, so you know if a story is good or bad for what you hold.',
    placement: 'right',
  },
  {
    key: 'statistics',
    resolve: sidebar('/statistics'),
    kicker: 'Statistics',
    title: 'The long view',
    text: 'Whale volume, buy versus sell pressure and chain flows over weeks, not hours. Good for spotting a trend before it is obvious.',
    placement: 'right',
  },
  {
    key: 'personal',
    resolve: sidebar('/dashboard/personal'),
    kicker: 'Personal',
    title: 'Your own page',
    text: 'The wallets you follow, your watchlist and your alerts in one feed. It fills up as you follow things.',
    placement: 'right',
  },
  {
    key: 'orcaAI',
    resolve: (refs) => refs?.orcaAI?.current,
    kicker: 'ORCA',
    title: 'Ask anything in plain English',
    text: 'ORCA reads the same live data and explains it: "are whales buying Bitcoin?", "what is this wallet doing?", "why did SOL move?".',
    placement: 'bottom',
  },
]

function isVisible(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return false
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}

const PAD = 8
const GAP = 14
const R = 8

/* ── Styled components ───────────────────────────────────────── */
const Overlay = styled.svg`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 10000;
  pointer-events: none;
`

const Tip = styled(motion.div)`
  position: fixed;
  z-index: 10001;
  pointer-events: auto;
  background: rgba(13, 20, 33, 0.97);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 12px;
  padding: 20px 24px;
  max-width: 340px;
  width: max-content;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px);
  font-family: var(--font-sans);
  @media (max-width: 640px) {
    max-width: calc(100vw - 32px);
    left: 16px !important;
    right: 16px;
    transform: none !important;
  }
`

const Kicker = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #00e5ff;
  margin-bottom: 6px;
  span:last-child { color: #5a6a7a; }
`

const Title = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #e0e6ed;
  margin-bottom: 6px;
`

const Text = styled.div`
  font-size: 13px;
  line-height: 1.55;
  color: #8896a6;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  gap: 8px;
`

const Dots = styled.div`
  display: flex;
  gap: 6px;
`

const Dot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${p => (p.$on ? '#00e5ff' : 'rgba(0,229,255,0.2)')};
  transition: background 0.2s;
`

const Btn = styled(motion.button)`
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 8px 16px;
`

const Primary = styled(Btn)`
  background: linear-gradient(135deg, #36a6ba, #2d8a9a);
  color: #fff;
`

const Ghost = styled(Btn)`
  background: none;
  color: #5a6a7a;
  padding: 8px;
  &:hover { color: #8896a6; }
`

const FinalWrap = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`

const Final = styled(motion.div)`
  pointer-events: auto;
  background: rgba(13, 20, 33, 0.98);
  border: 1px solid rgba(0, 229, 255, 0.15);
  border-radius: 16px;
  padding: 32px 40px;
  max-width: 400px;
  width: 90vw;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  font-family: var(--font-sans);
  @media (max-width: 640px) { padding: 24px; }
`

const FinalBtns = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px;
`

const Secondary = styled(Btn)`
  background: rgba(0, 229, 255, 0.08);
  color: #00e5ff;
  border: 1px solid rgba(0, 229, 255, 0.12);
  padding: 10px 20px;
  &:hover { background: rgba(0, 229, 255, 0.14); }
`

/* ── Component ───────────────────────────────────────────────── */
export default function OrcaTutorial({ isOpen, onClose, refs }) {
  const [step, setStep] = useState(0)
  const [steps, setSteps] = useState(STEPS)
  const [rect, setRect] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [done, setDone] = useState(false)
  const tipRef = useRef(null)
  const [tipSize, setTipSize] = useState(null) // { w, h } from real DOM

  const cur = steps[step]

  useEffect(() => { setMounted(true) }, [])

  // Dashboard passes a fresh `refs` object literal every render; keep the
  // latest in a ref so the open/reset effect depends on isOpen only (else the
  // tour would jump back to stop 1 on every dashboard re-render).
  const refsRef = useRef(refs)
  refsRef.current = refs

  // Reset when opened; drop stops whose target is not on screen right now
  useEffect(() => {
    if (isOpen) {
      const visible = STEPS.filter((st) => isVisible(st.resolve(refsRef.current)))
      setSteps(visible.length > 0 ? visible : STEPS)
      setStep(0); setDone(false); setRect(null)
    }
  }, [isOpen])

  // Strategy: snap, don't smooth-scroll. The previous smooth-scroll +
  // dark-overlay combo made it feel like the spotlight was "hunting" the
  // target across the page. Now we:
  //   1. If the target is already comfortably in view, just measure it.
  //   2. Otherwise, do an INSTANT scroll (no animation), then measure on
  //      the next frame. The spotlight appears directly where it belongs.
  //   3. Re-measure on resize only (no scroll listener — that was the
  //      original source of jitter).
  useEffect(() => {
    if (!isOpen || done) return
    const el = cur?.resolve ? cur.resolve(refs) : null
    if (!el) { setRect(null); return }

    setTipSize(null) // force re-measure for the new step's content

    const measure = () => {
      const r = el.getBoundingClientRect()
      setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 })
    }

    // Is the target already comfortably visible? If yes — no scroll, no
    // hide-then-show flicker. Just measure synchronously.
    const r = el.getBoundingClientRect()
    const vh = window.innerHeight
    const safeTop = vh * 0.1
    const safeBottom = vh * 0.9
    const fullyVisible = r.top >= safeTop && r.bottom <= safeBottom

    let rafId = 0
    if (fullyVisible) {
      measure()
    } else {
      setRect(null) // briefly hide spotlight during the snap to avoid a jump
      // Instant scroll — `behavior: 'auto'` snaps. Then measure next frame.
      el.scrollIntoView({ behavior: 'auto', block: 'center' })
      rafId = requestAnimationFrame(() => requestAnimationFrame(measure))
    }

    const onResize = () => requestAnimationFrame(measure)
    window.addEventListener('resize', onResize)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [step, isOpen, done, refs, cur?.key])

  const finish = useCallback(() => {
    localStorage.setItem('sonar_tutorial_completed', 'true')
    onClose()
  }, [onClose])

  const next = useCallback(() => {
    if (step < steps.length - 1) setStep(s => s + 1)
    else setDone(true)
  }, [step, steps.length])

  // Re-measure the tip whenever step/rect/viewport changes. We position
  // using the REAL rendered tip dimensions, not estimates — that's what
  // pushed the Skip/Next row off-screen previously.
  useLayoutEffect(() => {
    if (!rect || !tipRef.current) return
    const r = tipRef.current.getBoundingClientRect()
    if (!tipSize || Math.abs(tipSize.w - r.width) > 0.5 || Math.abs(tipSize.h - r.height) > 0.5) {
      setTipSize({ w: r.width, h: r.height })
    }
  }, [rect, step, tipSize])

  // First pass renders the tip off-screen but visible so we can measure it.
  // Second pass uses the measured size for accurate viewport clamping.
  const tipStyle = useMemo(() => {
    if (!rect) return null // signal: don't render tip yet
    const M = 16
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (!tipSize) {
      // hidden first paint — let useLayoutEffect measure it
      return {
        top: -9999,
        left: -9999,
        transform: 'none',
        visibility: 'hidden',
        pointerEvents: 'none',
      }
    }

    const { w: tipW, h: tipH } = tipSize
    const cx = rect.x + rect.w / 2

    // Sidebar stops: tip to the RIGHT of the rail link, vertically centred,
    // falling back to below when there is no room.
    if (cur.placement === 'right' && rect.x + rect.w + GAP + tipW + M <= vw) {
      const top = Math.min(Math.max(M, rect.y + rect.h / 2 - tipH / 2), vh - tipH - M)
      return { top, left: rect.x + rect.w + GAP, transform: 'none' }
    }

    // Choose vertical side with auto-flip
    const roomBelow = vh - (rect.y + rect.h) - GAP - M
    const roomAbove = rect.y - GAP - M
    let placeBelow = cur.placement === 'bottom'
    if (placeBelow && roomBelow < tipH && roomAbove > roomBelow) placeBelow = false
    else if (!placeBelow && roomAbove < tipH && roomBelow > roomAbove) placeBelow = true

    const top = placeBelow
      ? Math.min(Math.max(M, rect.y + rect.h + GAP), vh - tipH - M)
      : Math.max(M, rect.y - GAP - tipH)

    // Horizontal: center on target, then clamp so the tip fits fully on screen
    const left = Math.max(M, Math.min(vw - tipW - M, cx - tipW / 2))

    return { top, left, transform: 'none' }
  }, [rect, tipSize, cur?.placement])

  if (!mounted || !isOpen) return null

  return createPortal(
    <>
      {/* SVG overlay with animated spotlight cutout */}
      <Overlay>
        <defs>
          <mask id="sonar-onboard-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && !done && (
              <motion.rect
                initial={false}
                animate={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                rx={R} ry={R}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(8, 15, 24, 0.72)" mask="url(#sonar-onboard-mask)" />
        {rect && !done && (
          <motion.rect
            initial={false}
            animate={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            rx={R} ry={R}
            fill="none"
            stroke="rgba(0, 229, 255, 0.3)"
            strokeWidth="2"
          />
        )}
      </Overlay>

      {/* Final completion card */}
      {done && (
        <FinalWrap>
          <Final
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Title style={{ fontSize: 18, marginBottom: 8 }}>That&apos;s the tour.</Title>
            <Text style={{ fontSize: 14 }}>
              Now see it work: ORCA will tell you what whales did in the last 24 hours, in plain English.
            </Text>
            <FinalBtns>
              <Secondary onClick={finish} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Explore on my own
              </Secondary>
              <Primary
                onClick={() => { finish(); window.location.href = FIRST_QUESTION_URL }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ padding: '10px 20px' }}
              >
                Ask ORCA now →
              </Primary>
            </FinalBtns>
          </Final>
        </FinalWrap>
      )}

      {/* Step tooltip — only render once we've measured the spotlight,
          otherwise the tip flashes at viewport-center then jumps. */}
      {!done && tipStyle && (
        <AnimatePresence mode="wait">
          <Tip
            key={step}
            ref={tipRef}
            style={tipStyle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: tipSize ? 1 : 0, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Kicker>
              <span>{cur.kicker}</span>
              <span>{step + 1} / {steps.length}</span>
            </Kicker>
            <Title>{cur.title}</Title>
            <Text>{cur.text}</Text>
            <Row>
              <Dots>
                {steps.map((st, i) => <Dot key={st.key} $on={i === step} />)}
              </Dots>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Ghost onClick={finish}>Skip</Ghost>
                <Primary onClick={next} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  {step === steps.length - 1 ? 'Finish' : 'Next'}
                </Primary>
              </div>
            </Row>
          </Tip>
        </AnimatePresence>
      )}
    </>,
    document.body
  )
}
