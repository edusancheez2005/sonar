'use client'
/**
 * PersonalCopilotPanel
 * =============================================================================
 * Personal Dashboard Panel B (§4.D of ORCA_COPILOT_BUILD_PROMPT.md).
 *
 * A slim chat panel pinned to the Personal Dashboard. Pre-seeds the first
 * assistant message with a greeting tuned to the user's experience_level
 * and currently-tracked tickers, then forwards subsequent messages to the
 * existing `/api/chat` endpoint.
 *
 * Compliance:
 * - No emojis (House Rules §3.5.2).
 * - Never auto-executes any action — answers only.
 * - Errors render as quiet inline text; no toast spam.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { OrcaMarkdown } from '@/components/orca/inline/OrcaMarkdown'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { pickCopilotGreeting } from '@/lib/orca/greetings'

const Wrap = styled.section`
  display: flex;
  flex-direction: column;
  min-height: 420px;
  background: rgba(13, 20, 33, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 20px 22px;
`

const Header = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`

const Title = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #e0e6ed;
`

const Sub = styled.span`
  font-size: 11px;
  color: #6b7a8c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`

const Thread = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
  margin-bottom: 14px;
`

const Bubble = styled.div`
  max-width: 94%;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  word-wrap: break-word;
  background: ${(p) =>
    p.$role === 'user'
      ? 'rgba(0, 229, 255, 0.08)'
      : 'rgba(13, 20, 33, 0.7)'};
  border: 1px solid
    ${(p) =>
      p.$role === 'user'
        ? 'rgba(0, 229, 255, 0.30)'
        : 'rgba(0, 229, 255, 0.10)'};
  align-self: ${(p) => (p.$role === 'user' ? 'flex-end' : 'flex-start')};
  color: #e0e6ed;
  position: relative;
  /* Markdown niceties for assistant replies */
  p { margin: 0 0 8px; }
  p:last-child { margin-bottom: 0; }
  h1, h2, h3, h4 {
    margin: 12px 0 6px;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #00e5ff;
    font-weight: 700;
    border-bottom: 1px dashed rgba(0,229,255,0.18);
    padding-bottom: 4px;
  }
  h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }
  strong { color: #ffffff; font-weight: 700; }
  em { color: #cfd6df; font-style: italic; }
  code {
    background: rgba(0,229,255,0.10);
    border: 1px solid rgba(0,229,255,0.18);
    border-radius: 3px;
    padding: 1px 5px;
    font-family: 'JetBrains Mono','Fira Code',ui-monospace,Menlo,Consolas,monospace;
    font-size: 12px;
    color: #6ee7ff;
  }
  pre {
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(0,229,255,0.12);
    border-radius: 4px;
    padding: 10px 12px;
    overflow-x: auto;
    margin: 8px 0;
  }
  pre code { background: transparent; border: 0; padding: 0; color: #cfd6df; }
  ul, ol { margin: 6px 0 10px; padding-left: 22px; }
  li { margin: 3px 0; }
  a { color: #00e5ff; text-decoration: underline; text-decoration-color: rgba(0,229,255,0.4); }
  a:hover { text-decoration-color: #00e5ff; }
  blockquote {
    margin: 8px 0;
    padding: 6px 12px;
    border-left: 2px solid rgba(0,229,255,0.4);
    color: #b9c2cd;
    background: rgba(0,229,255,0.04);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 12px;
  }
  th, td {
    border: 1px solid rgba(0,229,255,0.15);
    padding: 5px 8px;
    text-align: left;
  }
  th { background: rgba(0,229,255,0.08); color: #00e5ff; text-transform: uppercase; font-size: 11px; letter-spacing: 0.06em; }
  hr { border: 0; border-top: 1px dashed rgba(0,229,255,0.18); margin: 10px 0; }
`

const ErrorLine = styled.p`
  margin: 0;
  font-size: 12px;
  color: #ff7a7a;
`

const Form = styled.form`
  display: flex;
  gap: 10px;
  align-items: stretch;
`

const Input = styled.input`
  flex: 1;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 13px;
  color: #e0e6ed;
  outline: none;
  &:focus { border-color: #00e5ff; }
`

const Send = styled.button`
  background: linear-gradient(135deg, #36a6ba, #2d8a9a);
  border: none;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  padding: 0 18px;
  border-radius: 10px;
  cursor: pointer;
  transition: filter 0.15s ease;
  &:disabled { opacity: 0.55; cursor: not-allowed; }
  &:hover:not(:disabled) { filter: brightness(1.1); }
`

export default function PersonalCopilotPanel({
  experienceLevel,
  tickers = [],
  client,
  fetchImpl,
  focusTicker = '',
  seedMessage = '',
  onSeedConsumed,
}) {
  const greeting = useMemo(
    () => pickCopilotGreeting({ experience: experienceLevel, tickers }),
    [experienceLevel, tickers]
  )

  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: greeting },
  ])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  // When the server returns { confirm: { label, calls } } from a fastWrite
  // detection, we stash it here and let the next user reply of "yes"/"no"
  // either execute the calls (confirm trip) or discard them.
  const [pendingConfirm, setPendingConfirm] = useState(null)
  const threadRef = useRef(null)

  // Refresh the seeded greeting if the user's profile or watchlist changes
  // before they have sent any message.
  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].role === 'assistant'
        ? [{ role: 'assistant', content: greeting }]
        : prev
    )
  }, [greeting])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  // Parent surfaces (e.g. "Ask ORCA" on a watchlist row) push a seed
  // message into the input. We only overwrite when the user has not yet
  // typed something they care about.
  useEffect(() => {
    if (!seedMessage) return
    setDraft((prev) => (prev && prev.trim().length > 0 ? prev : seedMessage))
    if (typeof onSeedConsumed === 'function') onSeedConsumed()
  }, [seedMessage, onSeedConsumed])

  async function onSubmit(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return

    const sb = client ?? supabaseBrowser()
    const doFetch = fetchImpl ?? fetch

    setSending(true)
    setError(null)
    setDraft('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])

    // If we have a pending confirm and the user replied yes/no, short-circuit
    // the model entirely and either execute the write or cancel it.
    const yesRe = /^(y|yes|yep|yeah|sure|ok|okay|confirm|do it|go|please)\b/i
    const noRe  = /^(n|no|nope|cancel|abort|stop|nevermind|never mind|don't|do not)\b/i
    const isYes = pendingConfirm && yesRe.test(text)
    const isNo  = pendingConfirm && noRe.test(text)

    try {
      const { data: sessionData } = await sb.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setError('Sign in to chat with ORCA.')
        setSending(false)
        return
      }

      if (isNo) {
        setPendingConfirm(null)
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Cancelled.' }])
        setSending(false)
        return
      }

      const reqBody = isYes
        ? { message: pendingConfirm.label, confirm: { calls: pendingConfirm.calls } }
        : { message: text, focus_ticker: focusTicker || undefined }

      const res = await doFetch('/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reqBody),
      })
      if (!res.ok) {
        if (res.status === 504 || res.status === 408) {
          setError('That took too long to compute. Try again in a moment.')
        } else if (res.status === 401) {
          setError('Session expired. Refresh the page to sign back in.')
        } else if (res.status === 429) {
          setError("You've hit today's chat limit. It resets at midnight UTC.")
        } else {
          setError(`ORCA could not respond (HTTP ${res.status}).`)
        }
        setSending(false)
        return
      }
      // The /api/chat endpoint may stream SSE (ticker analyses, Stage A
      // orchestrator) or return plain JSON (conv fallback, fastWrite). Parse
      // whichever shape comes back so the panel doesn't hang on a stream.
      const ctype = (res.headers && typeof res.headers.get === 'function'
        ? (res.headers.get('content-type') || '')
        : '').toLowerCase()
      let body = null
      if (ctype.includes('text/event-stream')) {
        const raw = await res.text()
        // Walk every "data: {...}" frame and keep the last 'complete' (or any
        // payload with a `response` field) — that's the final answer.
        let last = null
        for (const line of raw.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload) continue
          try {
            const obj = JSON.parse(payload)
            if (obj?.type === 'complete' || typeof obj?.response === 'string') {
              last = obj
            } else if (obj?.type === 'error' && !last) {
              last = { response: `ORCA error: ${obj.error || 'unknown'}` }
            }
          } catch { /* skip non-JSON frames */ }
        }
        body = last
      } else {
        body = await res.json()
      }

      const reply =
        typeof body?.response === 'string'
          ? body.response
          : typeof body?.message === 'string'
          ? body.message
          : null
      if (!reply) {
        setError('Empty response from ORCA.')
        setSending(false)
        return
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])

      // Update pending-confirm state from the server response.
      if (body?.confirm && Array.isArray(body.confirm.calls) && body.confirm.calls.length > 0) {
        setPendingConfirm({
          label: typeof body.confirm.label === 'string' ? body.confirm.label : reply,
          calls: body.confirm.calls,
        })
      } else {
        setPendingConfirm(null)
      }

      // After a successful watchlist write, tell tabs/strips to refetch.
      if (isYes && typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('orca:watchlist-changed'))
        } catch { /* ignore */ }
      }
    } catch (err) {
      // Browser surfaces Vercel function timeouts as a TypeError on fetch.
      // Distinguish a genuine offline state from a server-side timeout so the
      // user gets actionable copy instead of the generic "Network error".
      const offline = typeof navigator !== 'undefined' && navigator && navigator.onLine === false
      setError(
        offline
          ? 'You appear to be offline. Reconnect and try again.'
          : 'The request did not complete. ORCA may be busy — try again in a few seconds.'
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Wrap aria-labelledby="copilot-panel-title">
      <Header>
        <Title id="copilot-panel-title">ORCA copilot</Title>
        <Sub>Personalised</Sub>
      </Header>
      <Thread ref={threadRef} role="log" aria-live="polite">
        {messages.map((m, i) => (
          <Bubble key={i} $role={m.role} data-testid={`copilot-message-${m.role}-${i}`}>
            {m.role === 'assistant' ? (
              <OrcaMarkdown>{m.content}</OrcaMarkdown>
            ) : (
              m.content
            )}
          </Bubble>
        ))}
        {error && <ErrorLine role="alert">{error}</ErrorLine>}
      </Thread>
      <Form onSubmit={onSubmit}>
        <Input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask ORCA about your watchlist."
          aria-label="Message ORCA"
          disabled={sending}
          data-testid="copilot-input"
        />
        <Send type="submit" disabled={sending || !draft.trim()} data-testid="copilot-send">
          {sending ? 'Sending' : 'Send'}
        </Send>
      </Form>
    </Wrap>
  )
}
