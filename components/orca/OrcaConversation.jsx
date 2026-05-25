'use client'
/**
 * OrcaConversation
 * =============================================================================
 * The conversation atom shared by all three v4 surfaces:
 *   - Drawer  (right-edge slide-in)
 *   - Studio  (full /orca page)
 *   - Mini    (380x360 card inside Personal dashboard)
 *
 * Per ORCA_UNIFIED_COPILOT_PROMPT_V4.md §4.1, this is the ONE file that
 * owns: thread render, input, send, two-trip confirmation, follow-up
 * chips, source cards, tool-call chips, streaming shimmer (SonarPulse),
 * error states. Shells (Drawer / Studio / Mini) own headers, session
 * lists, inspectors — never the chat surface itself.
 *
 * Contract (v4 §4.1):
 *   <OrcaConversation
 *     sessionId={string | null}
 *     focus={Focus | null}
 *     variant={'drawer' | 'studio' | 'mini'}
 *     maxTurns={number | undefined}
 *     onPromote={(sessionId) => void}
 *     initialDraft={string}
 *     seedMessages={Array<{role, content}>}
 *     client={SupabaseClient}      // test injection
 *     fetchImpl={fetch}            // test injection
 *   />
 *
 * Two-trip confirmation (v4 §5.3):
 *   1) postChat({message, ...}) → if res.confirm, render Confirm/Cancel
 *   2) Confirm → postChat({message: '', confirm: { calls }})
 *
 * Compliance:
 *   - No emojis (House Rules §3.5.2)
 *   - Never auto-executes writes — Confirm is always a separate click
 *   - Errors render as quiet inline text; no toast spam
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import styled, { css } from 'styled-components'
import { tokens } from '@/lib/ui/tokens'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import SonarPulse from './SonarPulse'

// ---------------------------------------------------------------------------
// Styled atoms — all colours come from `tokens`, never hex inline.
// ---------------------------------------------------------------------------

const variantSizing = {
  drawer: css`
    --conv-body-size: 13.5px;
    --conv-bubble-max: 92%;
    --conv-pad: ${tokens.pad.md}px;
  `,
  studio: css`
    --conv-body-size: 16px;
    --conv-bubble-max: 78%;
    --conv-pad: ${tokens.pad.lg}px;
  `,
  mini: css`
    --conv-body-size: 13px;
    --conv-bubble-max: 95%;
    --conv-pad: ${tokens.pad.sm}px;
  `,
}

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  color: ${tokens.text};
  ${(p) => variantSizing[p.$variant] || variantSizing.drawer}
`

const Thread = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: var(--conv-pad);
  min-height: 0;
`

const Bubble = styled.div`
  max-width: var(--conv-bubble-max);
  padding: 10px 14px;
  border-radius: ${tokens.radius.md}px;
  font-size: var(--conv-body-size);
  line-height: 1.55;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: ${(p) => (p.$role === 'user' ? tokens.accentDim : tokens.surface.panel)};
  border: 1px solid
    ${(p) => (p.$role === 'user' ? tokens.surface.borderActive : tokens.surface.border)};
  align-self: ${(p) => (p.$role === 'user' ? 'flex-end' : 'flex-start')};
  color: ${tokens.text};
`

const FocusChip = styled.div`
  align-self: flex-start;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${tokens.textLabel};
  background: ${tokens.surface.panel};
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.pill}px;
  padding: 4px 10px;
`

const FollowUps = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-self: flex-start;
  max-width: 100%;
`

const FollowChip = styled.button`
  background: transparent;
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.pill}px;
  color: ${tokens.textMuted};
  padding: 5px 11px;
  font-size: 12px;
  cursor: pointer;
  transition: border-color ${tokens.dur.fast}ms ${tokens.ease}, color ${tokens.dur.fast}ms ${tokens.ease};
  &:hover:not(:disabled) {
    border-color: ${tokens.surface.borderActive};
    color: ${tokens.accent};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const Sources = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-self: flex-start;
`

const SourcePill = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${tokens.textMuted};
  background: ${tokens.surface.panel};
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.pill}px;
  padding: 3px 9px;
  text-decoration: none;
  &:hover { color: ${tokens.accent}; border-color: ${tokens.surface.borderActive}; }
  img {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    display: block;
  }
`

const Disclosure = styled.details`
  margin-top: 6px;
  font-size: 11px;
  color: ${tokens.textLabel};
  summary {
    cursor: pointer;
    list-style: none;
    color: ${tokens.textMuted};
    user-select: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: '\\2139'; opacity: 0.8; }
  &[open] summary::after { content: '\\25B4'; margin-left: 4px; }
  &:not([open]) summary::after { content: '\\25BE'; margin-left: 4px; }
  p {
    margin: 6px 0 0;
    line-height: 1.5;
    color: ${tokens.textLabel};
    white-space: pre-wrap;
  }
`

const ConfirmRow = styled.div`
  display: flex;
  gap: 8px;
  align-self: flex-start;
`

const ConfirmBtn = styled.button`
  background: ${(p) => (p.$primary ? tokens.accentDim : 'transparent')};
  border: 1px solid ${(p) => (p.$primary ? tokens.surface.borderActive : tokens.surface.border)};
  color: ${(p) => (p.$primary ? tokens.accent : tokens.textMuted)};
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.03em;
  padding: 6px 14px;
  border-radius: ${tokens.radius.pill}px;
  cursor: pointer;
  transition: filter ${tokens.dur.fast}ms ${tokens.ease};
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.12); }
`

const ErrorLine = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${tokens.err};
  align-self: flex-start;
`

const Form = styled.form`
  display: flex;
  gap: 10px;
  align-items: stretch;
  padding: var(--conv-pad);
  border-top: 1px solid ${tokens.surface.border};
`

const Input = styled.input`
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.md}px;
  padding: 11px 14px;
  font-size: var(--conv-body-size);
  color: ${tokens.text};
  outline: none;
  &:focus { border-color: ${tokens.accent}; }
`

const Send = styled.button`
  background: ${tokens.accent};
  border: none;
  color: #001218;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.04em;
  padding: 0 18px;
  border-radius: ${tokens.radius.md}px;
  cursor: pointer;
  transition: filter ${tokens.dur.fast}ms ${tokens.ease};
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.1); }
`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function focusToBody(focus) {
  if (!focus) return {}
  if (focus.type === 'ticker' && focus.value) return { focus_ticker: focus.value }
  // Other focus types are not yet recognised by /api/chat; pass-through label
  // for trace visibility only via `focus_meta`.
  return { focus_meta: { type: focus.type, value: focus.value, label: focus.label } }
}

function statusToError(status) {
  if (status === 504 || status === 408) return 'That took too long to compute. Try again in a moment.'
  if (status === 401) return 'Session expired. Refresh the page to sign back in.'
  if (status === 429) return "You've hit today's chat limit. It resets at midnight UTC."
  return `ORCA could not respond (HTTP ${status}).`
}

function extractReply(body) {
  if (!body) return null
  if (typeof body.response === 'string' && body.response.trim()) return body.response
  if (typeof body.message === 'string' && body.message.trim()) return body.message
  return null
}

// v4 §2.2 #3 — split the standard MANDATORY_DISCLAIMER tail off an assistant
// message so it can render as a fold instead of as a 4-line paragraph.
// The disclaimer block is delimited by lines of '---' (see
// lib/orca/shared-rules.ts → MANDATORY_DISCLAIMER).
const DISCLAIMER_TAIL = /\n?-{3,}\s*\n([\s\S]*?)\n-{3,}\s*$/
export function splitDisclaimer(content) {
  if (typeof content !== 'string') return { body: '', disclaimer: null }
  const match = content.match(DISCLAIMER_TAIL)
  if (!match) return { body: content, disclaimer: null }
  const disclaimer = match[1].trim()
  const body = content.slice(0, match.index).trimEnd()
  return { body, disclaimer }
}

// v4 §2.2 #8 — favicon resolver for source pills. Uses Google's S2 service
// (publicly available, no API key, no scraping). Returns null for sources
// without a parsable hostname so the pill still renders as text.
export function faviconFor(url) {
  try {
    const host = new URL(url).hostname
    if (!host) return null
    return `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(host)}`
  } catch {
    return null
  }
}

// v4 §2.2 #8 — click telemetry for source cards. Spec allows click-tracking,
// disallows scraping. We dispatch a CustomEvent on window so downstream
// analytics can subscribe without coupling this component to a pipeline.
function emitSourceClick(source, index) {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent('orca:source-click', {
        detail: {
          index,
          url: typeof source === 'string' ? source : source?.url || null,
          label: typeof source === 'string' ? null : source?.label || null,
          kind: typeof source === 'string' ? null : source?.kind || null,
          ts: Date.now(),
        },
      })
    )
  } catch {
    // never block the user's navigation on a telemetry failure
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @param {object} props
 * @param {string|null} [props.sessionId]
 * @param {object|null} [props.focus]
 * @param {'drawer'|'studio'|'mini'} [props.variant]
 * @param {number} [props.maxTurns]
 * @param {(sessionId: string|null) => void} [props.onPromote]
 * @param {string} [props.initialDraft]
 * @param {Array<{role: string, content: string}>} [props.seedMessages]
 * @param {object} [props.client]            test injection
 * @param {Function} [props.fetchImpl]       test injection
 * @param {string} [props.className]
 */
export default function OrcaConversation({
  sessionId = null,
  focus = null,
  variant = 'drawer',
  maxTurns,
  onPromote,
  initialDraft = '',
  seedMessages = [],
  client,
  fetchImpl,
  className,
}) {
  const [messages, setMessages] = useState(() => [...seedMessages])
  const [draft, setDraft] = useState(initialDraft)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const [followUps, setFollowUps] = useState([])
  const [sources, setSources] = useState([])
  const threadRef = useRef(null)

  // Count user turns for `maxTurns` enforcement (mini variant).
  const userTurnCount = useMemo(
    () => messages.filter((m) => m.role === 'user').length,
    [messages]
  )

  // Auto-scroll on new content.
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, pendingConfirm, sending])

  // Refresh seed messages if parent updates them and the user has not typed.
  useEffect(() => {
    if (messages.length === 0 && seedMessages.length > 0) {
      setMessages([...seedMessages])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedMessages])

  /**
   * Shared POST helper. Returns true on success, false on handled failure.
   * `confirmPayload` is `{ calls }` for the second leg of the two-trip
   * confirmation flow (v4 §5.3).
   */
  const postChat = useCallback(
    async ({ messageText, confirmPayload }) => {
      const sb = client ?? supabaseBrowser()
      const doFetch = fetchImpl ?? fetch

      const { data: sessionData } = await sb.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setError('Sign in to chat with ORCA.')
        return false
      }
      const requestBody = {
        message: messageText,
        ...focusToBody(focus),
      }
      if (sessionId) requestBody.session_id = sessionId
      if (confirmPayload) requestBody.confirm = confirmPayload

      let res
      try {
        res = await doFetch('/api/chat', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        })
      } catch (err) {
        const offline =
          typeof navigator !== 'undefined' && navigator && navigator.onLine === false
        setError(
          offline
            ? 'You appear to be offline. Reconnect and try again.'
            : 'The request did not complete. ORCA may be busy — try again in a few seconds.'
        )
        return false
      }

      if (!res.ok) {
        setError(statusToError(res.status))
        return false
      }
      let body
      try {
        body = await res.json()
      } catch {
        setError('Empty response from ORCA.')
        return false
      }
      const reply = extractReply(body)
      if (!reply) {
        setError('Empty response from ORCA.')
        return false
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])

      // v4 §5.3 — surface Confirm/Cancel if the orchestrator asked.
      if (body.confirm && Array.isArray(body.confirm.calls) && body.confirm.calls.length > 0) {
        setPendingConfirm({
          label: typeof body.confirm.label === 'string' ? body.confirm.label : 'Confirm',
          calls: body.confirm.calls,
        })
      } else {
        setPendingConfirm(null)
      }
      // Follow-up chips + source cards (orchestrator may or may not provide).
      setFollowUps(Array.isArray(body.follow_ups) ? body.follow_ups.slice(0, 4) : [])
      setSources(Array.isArray(body.sources) ? body.sources.slice(0, 6) : [])
      return true
    },
    [client, fetchImpl, focus, sessionId]
  )

  const submitMessage = useCallback(
    async (text) => {
      if (!text || sending) return
      // Mini variant: if we've already used our turn budget, promote to Studio
      // instead of sending. The next user message becomes the trigger.
      if (typeof maxTurns === 'number' && maxTurns > 0 && userTurnCount >= maxTurns) {
        if (typeof onPromote === 'function') onPromote(sessionId)
        return
      }
      setSending(true)
      setError(null)
      setDraft('')
      setPendingConfirm(null)
      setFollowUps([])
      setMessages((prev) => [...prev, { role: 'user', content: text }])
      try {
        await postChat({ messageText: text })
      } finally {
        setSending(false)
      }
    },
    [sending, maxTurns, userTurnCount, onPromote, sessionId, postChat]
  )

  async function onSubmit(e) {
    e.preventDefault()
    await submitMessage(draft.trim())
  }

  async function onConfirmAction() {
    if (!pendingConfirm || sending) return
    setSending(true)
    setError(null)
    const label = pendingConfirm.label
    const calls = pendingConfirm.calls
    setPendingConfirm(null)
    setMessages((prev) => [...prev, { role: 'user', content: `Confirmed: ${label}` }])
    try {
      await postChat({ messageText: label, confirmPayload: { calls } })
    } finally {
      setSending(false)
    }
  }

  function onCancelAction() {
    if (sending) return
    setPendingConfirm(null)
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Cancelled. Nothing was changed.' },
    ])
  }

  async function onFollowUp(text) {
    await submitMessage(text)
  }

  // v4 §2.2 #4 — one-key follow-ups. Number keys 1 / 2 / 3 select the
  // matching follow-up chip. Skipped while typing in an input/textarea so we
  // don't hijack the user's draft.
  useEffect(() => {
    if (!followUps.length || pendingConfirm || sending) return
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const target = e.target
      if (target && typeof target.tagName === 'string') {
        const tag = target.tagName.toUpperCase()
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }
      const idx = ['1', '2', '3'].indexOf(e.key)
      if (idx === -1) return
      const chip = followUps[idx]
      if (!chip) return
      e.preventDefault()
      onFollowUp(typeof chip === 'string' ? chip : chip.text)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUps, pendingConfirm, sending])

  return (
    <Wrap $variant={variant} className={className} aria-label="ORCA conversation">
      <Thread
        ref={threadRef}
        role="log"
        aria-live="polite"
        data-testid="orca-conv-thread"
      >
        {focus && (
          <FocusChip data-testid="orca-conv-focus">
            Pinned: {focus.label || focus.value}
          </FocusChip>
        )}
        {messages.map((m, i) => {
          if (m.role !== 'assistant') {
            return (
              <Bubble
                key={i}
                $role={m.role}
                data-testid={`orca-conv-message-${m.role}-${i}`}
              >
                {m.content}
              </Bubble>
            )
          }
          const { body, disclaimer } = splitDisclaimer(m.content)
          return (
            <Bubble
              key={i}
              $role={m.role}
              data-testid={`orca-conv-message-${m.role}-${i}`}
            >
              {body}
              {disclaimer && (
                <Disclosure data-testid={`orca-conv-disclaimer-${i}`}>
                  <summary aria-label="Disclaimer">Disclaimer</summary>
                  <p>{disclaimer}</p>
                </Disclosure>
              )}
            </Bubble>
          )
        })}
        {sources.length > 0 && (
          <Sources data-testid="orca-conv-sources">
            {sources.map((s, i) => {
              const url = typeof s === 'string' ? s : s.url
              const label = typeof s === 'string' ? s : s.label || s.url
              const fav = faviconFor(url)
              return (
                <SourcePill
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`orca-conv-source-${i}`}
                  onClick={() => emitSourceClick(s, i)}
                >
                  {fav && <img src={fav} alt="" loading="lazy" />}
                  <span>{label}</span>
                </SourcePill>
              )
            })}
          </Sources>
        )}
        {pendingConfirm && (
          <ConfirmRow data-testid="orca-conv-confirm-row">
            <ConfirmBtn
              type="button"
              $primary
              disabled={sending}
              onClick={onConfirmAction}
              data-testid="orca-conv-confirm"
              aria-label={pendingConfirm.label}
            >
              Confirm
            </ConfirmBtn>
            <ConfirmBtn
              type="button"
              disabled={sending}
              onClick={onCancelAction}
              data-testid="orca-conv-cancel"
            >
              Cancel
            </ConfirmBtn>
          </ConfirmRow>
        )}
        {followUps.length > 0 && !pendingConfirm && (
          <FollowUps data-testid="orca-conv-followups">
            {followUps.map((f, i) => (
              <FollowChip
                key={i}
                type="button"
                disabled={sending}
                onClick={() => onFollowUp(typeof f === 'string' ? f : f.text)}
              >
                {typeof f === 'string' ? f : f.text}
              </FollowChip>
            ))}
          </FollowUps>
        )}
        {sending && <SonarPulse />}
        {error && <ErrorLine role="alert">{error}</ErrorLine>}
      </Thread>
      <Form onSubmit={onSubmit}>
        <Input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask ORCA anything."
          aria-label="Message ORCA"
          disabled={sending}
          data-testid="orca-conv-input"
        />
        <Send
          type="submit"
          disabled={sending || !draft.trim()}
          data-testid="orca-conv-send"
        >
          {sending ? 'Sending' : 'Send'}
        </Send>
      </Form>
    </Wrap>
  )
}
