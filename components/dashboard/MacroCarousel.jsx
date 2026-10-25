'use client'
/**
 * Macro factors as a carousel: one card in focus, its neighbours faded at
 * the sides. Advances by itself every few seconds (paused on hover, focus,
 * a hidden tab or reduced motion); arrows, dots, swipe and sideways
 * trackpad scroll move it by hand.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'

const C = {
  green: '#00e676', red: '#ff1744', muted: '#8a9ab0', ink: '#e0e6ed', cyan: '#00e5ff',
  card: 'rgba(255, 255, 255, 0.025)', line: 'rgba(0, 229, 255, 0.10)',
}
const GAP = 16
const AUTO_MS = 6500

const Viewport = styled.div`
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
  /* Fade the edges so side cards dissolve instead of being cut. */
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%);
`
const Track = styled.div`
  display: flex;
  gap: ${GAP}px;
  transition: ${(p) => (p.$animate ? 'transform 650ms cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none')};
  will-change: transform;
  @media (prefers-reduced-motion: reduce) { transition: none; }
`
const Card = styled.article`
  flex: 0 0 auto;
  box-sizing: border-box;
  padding: 1rem 1.15rem 1.1rem;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$active ? 'rgba(0, 229, 255, 0.28)' : C.line)};
  background: ${(p) => (p.$active ? 'rgba(0, 229, 255, 0.045)' : C.card)};
  opacity: ${(p) => (p.$active ? 1 : 0.35)};
  transform: scale(${(p) => (p.$active ? 1 : 0.94)});
  transition: ${(p) => (p.$animate ? 'opacity 650ms ease, transform 650ms cubic-bezier(0.22, 0.61, 0.36, 1), border-color 650ms ease, background 650ms ease' : 'none')};
  cursor: ${(p) => (p.$active ? 'default' : 'pointer')};
  @media (prefers-reduced-motion: reduce) { transition: none; }
`
const Impact = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: ${FONT_MONO};
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${(p) => p.$c};
  i { width: 7px; height: 7px; border-radius: 50%; background: ${(p) => p.$c}; box-shadow: 0 0 8px ${(p) => p.$c}88; }
`
const Title = styled.h3`
  margin: 0.45rem 0 0.4rem;
  font-family: ${FONT_SANS};
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  color: ${C.ink};
`
const Summary = styled.p`
  margin: 0;
  font-family: ${FONT_SANS};
  font-size: 0.84rem;
  line-height: 1.55;
  color: ${C.muted};
`
const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.8rem;
`
const Arrow = styled.button`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid ${C.line};
  background: transparent;
  color: ${C.ink};
  font-size: 0.95rem;
  line-height: 1;
  cursor: pointer;
  &:hover { border-color: ${C.cyan}; color: ${C.cyan}; }
  &:focus-visible { outline: 2px solid ${C.cyan}; outline-offset: 2px; }
`
const Dots = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`
const Dot = styled.button`
  width: ${(p) => (p.$active ? 18 : 6)}px;
  height: 6px;
  padding: 0;
  border: none;
  border-radius: 3px;
  background: ${(p) => (p.$active ? p.$c : 'rgba(255, 255, 255, 0.18)')};
  cursor: pointer;
  transition: width 300ms ease, background 300ms ease;
`
const Count = styled.span`
  min-width: 2.6rem;
  text-align: center;
  font-family: ${FONT_MONO};
  font-size: 0.7rem;
  color: ${C.muted};
`

const colorOf = (impact) => (impact === 'bullish' ? C.green : impact === 'bearish' ? C.red : C.muted)

// The strip is rendered three times so there is always a card on both sides;
// after a move past either copy it jumps back to the middle copy unanimated.
export default function MacroCarousel({ factors = [] }) {
  const n = factors.length
  const [pos, setPos] = useState(n)
  const [animate, setAnimate] = useState(true)
  const index = n ? ((pos % n) + n) % n : 0
  const [width, setWidth] = useState(0)
  const [paused, setPaused] = useState(false)
  const viewportRef = useRef(null)
  const drag = useRef(null)
  const wheelAt = useRef(0)

  const go = useCallback((i) => { setAnimate(true); setPos(n + (((i % n) + n) % n)) }, [n])
  const next = useCallback(() => { setAnimate(true); setPos((p) => p + 1) }, [])
  const prev = useCallback(() => { setAnimate(true); setPos((p) => p - 1) }, [])

  // Back to the middle copy without animation once a move has settled.
  const settle = useCallback(() => {
    if (n < 2 || (pos >= n && pos < 2 * n)) return
    setAnimate(false)
    setPos(n + (((pos % n) + n) % n))
  }, [n, pos])
  useEffect(() => {
    if (animate) return
    let r2 = 0
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setAnimate(true)) })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2) }
  }, [animate])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  // Advances by itself; never while the pointer or focus is on it, the tab is
  // hidden, or the user asked for reduced motion.
  useEffect(() => {
    if (n < 2 || paused) return
    let reduce = false
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { /* ignore */ }
    if (reduce) return
    const id = setInterval(() => { if (!document.hidden) next() }, AUTO_MS)
    return () => clearInterval(id)
  }, [n, paused, next])

  if (n === 0) return null

  const cardW = width < 520 ? Math.round(width * 0.86) : Math.round(Math.min(560, Math.max(280, width * 0.56)))
  const offset = width / 2 - (pos * (cardW + GAP) + cardW / 2)
  const strip = n > 1 ? [...factors, ...factors, ...factors] : factors

  const onPointerDown = (e) => { drag.current = { x: e.clientX, id: e.pointerId } }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 40) (dx < 0 ? next : prev)()
  }
  const onWheel = (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 12) return
    const now = Date.now()
    if (now - wheelAt.current < 500) return
    wheelAt.current = now
    ;(e.deltaX > 0 ? next : prev)()
  }

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); next() }
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Macro factors"
      data-testid="macro-carousel"
    >
      <Viewport ref={viewportRef} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null }} onWheel={onWheel}>
        <Track $animate={animate} style={{ transform: `translateX(${width ? (n > 1 ? offset : width / 2 - cardW / 2) : 0}px)` }} onTransitionEnd={(e) => { if (e.target === e.currentTarget) settle() }}>
          {strip.map((f, k) => {
            const c = colorOf(f.impact)
            const active = n > 1 ? k === pos : true
            const i = k % n
            return (
              <Card
                key={`${f.title}-${k}`}
                $active={active}
                $animate={animate}
                style={{ width: cardW || '100%' }}
                aria-hidden={!active}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${n}`}
                onClick={() => { if (!active) { setAnimate(true); setPos(k) } }}
              >
                <Impact $c={c}><i />{f.impact || 'neutral'}</Impact>
                <Title>{f.title}</Title>
                <Summary>{f.summary}</Summary>
              </Card>
            )
          })}
        </Track>
      </Viewport>
      {n > 1 && (
        <Controls>
          <Arrow type="button" onClick={prev} aria-label="Previous factor">‹</Arrow>
          <Dots>
            {factors.map((f, i) => (
              <Dot key={i} type="button" $active={i === index} $c={colorOf(f.impact)} onClick={() => go(i)} aria-label={`Show factor ${i + 1}: ${f.title}`} aria-current={i === index} />
            ))}
          </Dots>
          <Count aria-live="polite">{index + 1} / {n}</Count>
          <Arrow type="button" onClick={next} aria-label="Next factor">›</Arrow>
        </Controls>
      )}
    </div>
  )
}
