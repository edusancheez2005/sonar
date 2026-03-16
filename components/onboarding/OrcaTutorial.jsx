'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
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
  font-family: 'Inter', system-ui, sans-serif;
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
  font-family: 'Inter', system-ui, sans-serif;
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

  const cur = STEPS[step]

  useEffect(() => { setMounted(true) }, [])

  // Reset when opened
  useEffect(() => {
    if (isOpen) { setStep(0); setDone(false); setRect(null) }
  }, [isOpen])

  // Measure target element & keep in sync
  useEffect(() => {
    if (!isOpen || done) return
    const el = refs?.[cur?.target]?.current
    if (!el) { setRect(null); return }

    const measure = () => {
      const r = el.getBoundingClientRect()
      setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 })
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t1 = setTimeout(measure, 400)
    const t2 = setTimeout(measure, 700)

    const sync = () => requestAnimationFrame(measure)
    window.addEventListener('resize', sync)
    window.addEventListener('scroll', sync, true)

    return () => {
      clearTimeout(t1); clearTimeout(t2)
      window.removeEventListener('resize', sync)
      window.removeEventListener('scroll', sync, true)
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

  // Tooltip placement relative to spotlight
  const tipStyle = useMemo(() => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    const cx = rect.x + rect.w / 2
    if (cur.placement === 'bottom') {
      return { top: rect.y + rect.h + GAP, left: cx, transform: 'translateX(-50%)' }
    }
    return { bottom: window.innerHeight - rect.y + GAP, left: cx, transform: 'translateX(-50%)' }
  }, [rect, cur?.placement])

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

      {/* Step tooltip */}
      {!done && (
        <AnimatePresence mode="wait">
          <Tip
            key={step}
            style={tipStyle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
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
