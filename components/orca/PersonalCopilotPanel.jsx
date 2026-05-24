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
  max-width: 92%;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: ${(p) =>
    p.$role === 'user'
      ? 'rgba(0, 229, 255, 0.08)'
      : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid
    ${(p) =>
      p.$role === 'user'
        ? 'rgba(0, 229, 255, 0.22)'
        : 'rgba(255, 255, 255, 0.06)'};
  align-self: ${(p) => (p.$role === 'user' ? 'flex-end' : 'flex-start')};
  color: #e0e6ed;
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

    try {
      const { data: sessionData } = await sb.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setError('Sign in to chat with ORCA.')
        setSending(false)
        return
      }
      const res = await doFetch('/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) {
        setError(`ORCA could not respond (HTTP ${res.status}).`)
        setSending(false)
        return
      }
      const body = await res.json()
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
    } catch (err) {
      setError('Network error talking to ORCA.')
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
            {m.content}
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
