'use client'
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import { QRCodeSVG } from 'qrcode.react'

const TELEGRAM_URL = 'https://t.me/SonarAlerts'
const TELEGRAM_HANDLE = '@SonarAlerts'

const popInDesktop = keyframes`
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
`
const popInMobile = keyframes`
  from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`

/**
 * Transparent click-catcher. No dark backdrop, no blur — Nansen-style.
 * The page underneath stays fully readable. The only purpose is to close
 * the popover on outside click. On mobile (narrow) we *do* want a faint
 * dim so the centered card reads as a modal.
 */
const ClickCatcher = styled.button`
  position: fixed;
  inset: 0;
  z-index: 1000;
  border: none;
  background: transparent;
  cursor: default;
  padding: 0;

  @media (max-width: 900px) {
    background: rgba(2, 8, 14, 0.55);
    backdrop-filter: blur(2px);
  }
`

/**
 * Side-anchored popover on desktop, centered modal on mobile.
 *
 * Desktop position is computed from `$anchorLeft` (px from left edge of
 * the viewport — passed in by AppShell so the popover sits flush to the
 * RIGHT EDGE of the sidebar) and `$anchorTop` (px from top, vertically
 * aligned to the row the user clicked from).
 */
const Card = styled.div`
  position: fixed;
  z-index: 1001;
  width: 244px;
  max-width: calc(100vw - 32px);
  background: linear-gradient(180deg, #061018 0%, #04080e 100%);
  border: 1px solid rgba(34, 211, 238, 0.22);
  border-radius: 13px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(34, 211, 238, 0.08),
    0 0 32px rgba(34, 211, 238, 0.1);
  padding: 0.7rem 0.85rem 0.7rem;
  color: var(--text-primary);
  font-family: var(--font-sans);

  /* Desktop: side-anchored to the sidebar, vertically tracking the row. */
  @media (min-width: 901px) {
    left: ${({ $anchorLeft }) => `${$anchorLeft}px`};
    top: ${({ $anchorTop }) => `${$anchorTop}px`};
    animation: ${popInDesktop} 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Mobile: centered as a normal modal. */
  @media (max-width: 900px) {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(340px, calc(100vw - 32px));
    animation: ${popInMobile} 200ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`

const CloseBtn = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 7px;
  transition: color 160ms ease, background 160ms ease;
  &:hover {
    color: var(--neon-bright);
    background: rgba(34, 211, 238, 0.08);
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.4rem;
  padding-right: 1.5rem; /* clears the close button */
`

const TgBadge = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2ea6e0 0%, #229ed9 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(46, 166, 224, 0.35);
  svg { display: block; }
`

const Title = styled.div`
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  line-height: 1.15;
`

const Sub = styled.div`
  font-size: 0.74rem;
  line-height: 1.35;
  color: var(--text-secondary);
  margin-top: 2px;
`

/**
 * QR card — generously sized, pure white, clear quiet zone. Previously
 * the QR was hard to read because the surrounding card was dim and
 * crowded. This puts it front and centre.
 */
const QrWrap = styled.div`
  background: #ffffff;
  border-radius: 10px;
  padding: 8px;
  width: 150px;
  height: 150px;
  margin: 0.5rem auto 0.55rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.1), 0 8px 22px rgba(0, 0, 0, 0.45);
  svg { width: 100%; height: 100%; display: block; }
`

const Handle = styled.div`
  font-family: var(--font-mono);
  font-size: 0.68rem;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--neon-bright);
  text-align: center;
  margin-bottom: 0.45rem;
`

const OpenBtn = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.55rem 0.9rem;
  border-radius: 9px;
  background: linear-gradient(180deg, #5dd5ed 0%, #22d3ee 100%);
  border: 1px solid rgba(34, 211, 238, 0.5);
  color: #041018;
  font-weight: 700;
  font-size: 0.83rem;
  text-decoration: none;
  letter-spacing: 0.2px;
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.18);
  transition: transform 160ms ease, box-shadow 160ms ease;
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 24px rgba(34, 211, 238, 0.32);
  }
`

const Hint = styled.div`
  margin-top: 0.4rem;
  font-size: 0.64rem;
  text-align: center;
  color: var(--text-secondary);
  opacity: 0.7;
  line-height: 1.35;
`

function TelegramGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21.5 4.2 18.6 19.4c-.2 1-.8 1.2-1.6.7l-4.4-3.3-2.1 2c-.2.2-.4.4-.9.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.6-.2L7.4 12.7 3 11.4c-1-.3-1-1 .2-1.5L20 3.3c.8-.3 1.6.2 1.5 1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number} [props.anchorLeft] - px from left of viewport (desktop only)
 * @param {number} [props.anchorTop] - px from top of viewport (desktop only),
 *   typically the top of the row the popover was triggered from
 * @param {(over: boolean) => void} [props.onPopoverHover] - called true when
 *   the cursor enters the popover, false when it leaves. AppShell uses this
 *   to keep the rail in its peek-expanded state while the user is reading
 *   or scanning the QR — Nansen-style "menu stays open as long as you're in
 *   the popover".
 */
export default function TelegramAccessModal({
  open,
  onClose,
  anchorLeft = 76,
  anchorTop = 200,
  onPopoverHover,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <ClickCatcher type="button" aria-label="Close" onClick={onClose} />
      <Card
        $anchorLeft={anchorLeft}
        $anchorTop={anchorTop}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tg-access-title"
        onMouseEnter={() => onPopoverHover?.(true)}
        onMouseLeave={() => onPopoverHover?.(false)}
      >
        <CloseBtn type="button" aria-label="Close" onClick={onClose}>
          <CloseGlyph />
        </CloseBtn>
        <Header>
          <TgBadge>
            <TelegramGlyph />
          </TgBadge>
          <div>
            <Title id="tg-access-title">Sonar on Telegram</Title>
            <Sub>Real-time whale alerts in your pocket.</Sub>
          </div>
        </Header>

        <QrWrap>
          <QRCodeSVG
            value={TELEGRAM_URL}
            level="M"
            marginSize={1}
            bgColor="#ffffff"
            fgColor="#041018"
            aria-label={`QR code linking to ${TELEGRAM_URL}`}
          />
        </QrWrap>

        <Handle>{TELEGRAM_HANDLE}</Handle>

        <OpenBtn href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
          <TelegramGlyph /> Open in Telegram
        </OpenBtn>

        <Hint>Scan with your phone, or tap the button above.</Hint>
      </Card>
    </>,
    document.body,
  )
}
