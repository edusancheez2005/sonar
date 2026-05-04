'use client'
import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Step config ─────────────────────────────────────────────── */
const STEPS = [
  {
    target: 'marketPulse',
    title: 'Your Dashboard',
    text: 'Real-time whale transactions and market data, all in one place.',
    placement: 'bottom',
  },
  {
    target: 'whaleData',
    title: 'Whale Flows',
    text: 'Track what big players are doing. Green = buying, Red = selling.',
    placement: 'bottom',
  },
  {
    target: 'tokenTable',
    title: 'Token Explorer',
    text: 'Click any token to see detailed whale activity, charts, and sentiment.',
    placement: 'top',
  },
  {
    target: 'orcaAI',
    title: 'ORCA AI Advisor',
    text: 'Ask ORCA anything about crypto — it combines whale data, live news, and X/Twitter intelligence.',
    placement: 'bottom',
  },
]

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
  const [rect, setRect] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [done, setDone] = useState(false)
  const tipRef = useRef(null)
  const [tipSize, setTipSize] = useState(null) // { w, h } from real DOM

  const cur = STEPS[step]

  useEffect(() => { setMounted(true) }, [])

  // Reset when opened
  useEffect(() => {
    if (isOpen) { setStep(0); setDone(false); setRect(null) }
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
    const el = refs?.[cur?.target]?.current
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
  }, [step, isOpen, done, refs, cur?.target])

  const finish = useCallback(() => {
    localStorage.setItem('sonar_tutorial_completed', 'true')
    onClose()
  }, [onClose])

  const next = useCallback(() => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else setDone(true)
  }, [step])

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
            <Title style={{ fontSize: 18, marginBottom: 8 }}>You're all set!</Title>
            <Text style={{ fontSize: 14 }}>
              Start exploring or ask ORCA your first question.
            </Text>
            <FinalBtns>
              <Secondary onClick={finish} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Explore Dashboard
              </Secondary>
              <Primary
                onClick={() => { finish(); window.location.href = '/ai-advisor' }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ padding: '10px 20px' }}
              >
                Go to ORCA →
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
            <Title>{cur.title}</Title>
            <Text>{cur.text}</Text>
            <Row>
              <Dots>
                {STEPS.map((_, i) => <Dot key={i} $on={i === step} />)}
              </Dots>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Ghost onClick={finish}>Skip</Ghost>
                <Primary onClick={next} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  {step === STEPS.length - 1 ? 'Done' : 'Next'}
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
