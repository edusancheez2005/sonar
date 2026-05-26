/**
 * Ask ORCA (Stage C, 2026-05-26)
 * =============================================================================
 * New `/ai` surface. Nansen-style centred input + suggested chips on the
 * empty state; turns into a focused single-conversation chat after the first
 * message. Reuses the v1 `/api/chat` SSE endpoint AS IS — including the
 * Stage B.2 fast-write Confirm/Cancel flow.
 *
 * NOT a replacement for `/ai-advisor` (which keeps the session-sidebar +
 * full feature set). Per HARD RULES this is additive only — both routes
 * stay alive.
 */

'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { FONT_SANS, FONT_MONO } from '@/src/styles/fontStacks'
import { getSuggestedChips } from '@/lib/orca/suggestedChips'

const colors = {
  bgDark: '#0a0e17',
  bgCard: 'rgba(13, 17, 28, 0.8)',
  bgCardLight: 'rgba(13, 17, 28, 0.55)',
  primary: '#00e5ff',
  primaryDim: 'rgba(0, 229, 255, 0.18)',
  textPrimary: '#e0e6ed',
  textSecondary: '#8a9ab0',
  textMuted: '#5a6a7a',
  borderLight: 'rgba(0, 229, 255, 0.10)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`

const Shell = styled.div`
  min-height: calc(100vh - 80px);
  background: ${colors.bgDark};
  color: ${colors.textPrimary};
  font-family: ${FONT_SANS};
  display: flex;
  flex-direction: column;
`

const HeroWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem 2rem;
  text-align: center;
`

const Eyebrow = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  color: ${colors.primary};
  text-transform: uppercase;
  margin-bottom: 1rem;
  opacity: 0.85;
`

const Heading = styled.h1`
  margin: 0 0 0.6rem;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: ${colors.textPrimary};
`

const Subhead = styled.p`
  margin: 0 0 2rem;
  max-width: 540px;
  color: ${colors.textSecondary};
  font-size: 0.95rem;
  line-height: 1.55;
`

const InputCard = styled.form`
  width: 100%;
  max-width: 720px;
  background: ${colors.bgCard};
  border: 1px solid ${colors.borderLight};
  border-radius: 14px;
  padding: 0.6rem 0.6rem 0.6rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: 0 8px 40px rgba(0, 229, 255, 0.06);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &:focus-within {
    border-color: ${colors.primaryDim};
    box-shadow: 0 8px 40px rgba(0, 229, 255, 0.14);
  }
`

const HeroInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${colors.textPrimary};
  font-family: ${FONT_SANS};
  font-size: 1rem;
  padding: 0.85rem 0.25rem;
  outline: none;
  &::placeholder { color: ${colors.textMuted}; }
`

const SendBtn = styled.button`
  background: linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%);
  color: #0a0e17;
  border: none;
  border-radius: 10px;
  padding: 0.65rem 1.1rem;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const ChipsRow = styled.div`
  margin-top: 1.4rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  max-width: 760px;
`

const Chip = styled.button`
  background: ${colors.bgCardLight};
  color: ${colors.textSecondary};
  border: 1px solid ${colors.borderSubtle};
  border-radius: 999px;
  padding: 0.5rem 0.95rem;
  font-size: 0.82rem;
  font-family: ${FONT_SANS};
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
  &:hover {
    border-color: ${colors.primaryDim};
    color: ${colors.textPrimary};
    background: rgba(0, 229, 255, 0.04);
  }
  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }
`

const KeyHint = styled.span`
  display: inline-block;
  margin-right: 0.45rem;
  font-family: ${FONT_MONO};
  font-size: 0.65rem;
  color: ${colors.textMuted};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${colors.borderSubtle};
  border-radius: 4px;
  padding: 0.05rem 0.35rem;
`

const ConvShell = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 820px;
  width: 100%;
  margin: 0 auto;
  padding: 1.5rem 1rem 0;
`

const Messages = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 1.5rem;
`

const Bubble = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  animation: ${fadeIn} 0.2s ease;
`

const Role = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  color: ${({ $isUser }) => ($isUser ? colors.textMuted : colors.primary)};
  text-transform: uppercase;
`

const Body = styled.div`
  font-size: 0.95rem;
  line-height: 1.6;
  color: ${colors.textPrimary};
  p { margin: 0 0 0.75rem; }
  ul, ol { margin: 0 0 0.75rem 1.2rem; }
  code {
    font-family: ${FONT_MONO};
    background: rgba(13, 17, 28, 0.6);
    padding: 0.05rem 0.35rem;
    border-radius: 4px;
    font-size: 0.85em;
    color: ${colors.primary};
  }
  pre { overflow-x: auto; }
  h3, h4 {
    margin: 1.1rem 0 0.5rem;
    color: ${colors.primary};
    font-size: 1rem;
  }
  a { color: ${colors.primary}; }
`

const StickyInputWrap = styled.div`
  position: sticky;
  bottom: 0;
  background: linear-gradient(180deg, transparent 0%, ${colors.bgDark} 30%);
  padding: 1rem 0 1.25rem;
`

const ErrorLine = styled.div`
  color: #ff7a7a;
  font-size: 0.85rem;
  margin-top: 0.5rem;
`

const Status = styled.div`
  font-family: ${FONT_MONO};
  font-size: 0.7rem;
  color: ${colors.textMuted};
  letter-spacing: 0.08em;
`

const ConfirmCard = styled.div`
  padding: 1rem 1.1rem;
  background: ${colors.bgCard};
  border-radius: 10px;
  border: 1px solid ${colors.borderLight};
`

const ConfirmBtn = styled.button`
  background: linear-gradient(135deg, ${colors.primary} 0%, #00b8d4 100%);
  color: #0a0e17;
  border: none;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`

const CancelBtn = styled.button`
  background: transparent;
  color: ${colors.textSecondary};
  border: 1px solid ${colors.borderSubtle};
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
`

const Disclaimer = styled.div`
  text-align: center;
  font-size: 0.7rem;
  color: ${colors.textMuted};
  padding: 0.5rem 1rem 1rem;
`

export default function AskOrcaClient() {
  const searchParams = useSearchParams()
  const ticker = searchParams?.get('ticker') || null
  const wallet = searchParams?.get('wallet') || null
  const initialQ = searchParams?.get('q') || ''

  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState(initialQ)
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState(null)
  const sessionIdRef = useRef(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `ai-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  )
  const messagesEndRef = useRef(null)

  const chips = useMemo(
    () => getSuggestedChips({ ticker, wallet }),
    [ticker, wallet]
  )

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }) => setSession(data?.session || null))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  // Keyboard shortcuts: 1/2/3/4 trigger the corresponding chip when empty.
  useEffect(() => {
    if (messages.length > 0) return
    function onKey(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      const n = parseInt(e.key, 10)
      if (Number.isFinite(n) && n >= 1 && n <= chips.length) {
        e.preventDefault()
        sendMessage(chips[n - 1].prompt)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [chips, messages.length])

  async function sendMessage(rawQuestion) {
    const question = (rawQuestion || '').trim()
    if (!question) return
    if (!session) {
      window.location.href = `/auth/signin?redirect=/ai`
      return
    }
    setError(null)
    setInput('')
    setLoading(true)
    setStatusText('')

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: question,
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: question, session_id: sessionIdRef.current }),
      })
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream')) {
        await consumeSse(res, question)
      } else {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
        }
        if (data?.response) {
          setMessages((prev) => [
            ...prev,
            { id: `a-${Date.now()}`, role: 'assistant', content: data.response },
          ])
        }
      }
    } catch (err) {
      console.error('[AskOrca] send failed', err)
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
      setStatusText('')
    }
  }

  // Shared SSE consumer used by both the first POST and the Confirm re-POST.
  async function consumeSse(res, question) {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop()
      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data: ')) continue
        let event
        try {
          event = JSON.parse(line.slice(6))
        } catch {
          continue
        }
        if (event.type === 'status') {
          setStatusText(event.message || '')
        } else if (event.type === 'confirm') {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              content: '',
              confirmPending: {
                label: event.label,
                calls: event.calls,
                question,
              },
            },
          ])
        } else if (event.type === 'complete') {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              content: event.response || '',
              ticker: event.ticker || null,
            },
          ])
        } else if (event.type === 'error') {
          throw new Error(event.message || event.error || 'Stream error')
        }
      }
    }
  }

  async function handleConfirm(messageId, accept) {
    const target = messages.find((m) => m.id === messageId)
    if (!target || !target.confirmPending || !session) return
    const { calls, question } = target.confirmPending

    if (!accept) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, confirmPending: null, content: 'Cancelled.' }
            : m
        )
      )
      return
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, confirmPending: { ...m.confirmPending, executing: true } }
          : m
      )
    )

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: question,
          session_id: sessionIdRef.current,
          confirm: { calls },
        }),
      })
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalText = ''
      let success = false
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'complete') {
              finalText = event.response || ''
              success = !!event.success
            } else if (event.type === 'error') {
              throw new Error(event.error || 'Write failed')
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, confirmPending: null, content: finalText || 'Done.' }
            : m
        )
      )
      if (success) {
        try { window.dispatchEvent(new CustomEvent('orca:watchlist-changed')) } catch {}
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, confirmPending: null, content: `Could not complete: ${err.message}` }
            : m
        )
      )
    }
  }

  function onSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  // Render — hero state vs conversation state.
  const showHero = messages.length === 0

  return (
    <Shell>
      {showHero ? (
        <HeroWrap>
          <Eyebrow>Ask ORCA</Eyebrow>
          <Heading>
            {ticker ? `What do you want to know about $${ticker.toUpperCase().replace(/^\$/, '')}?`
              : wallet ? 'Ask about this wallet'
              : 'What do you want to know about crypto?'}
          </Heading>
          <Subhead>
            Long-form, sourced research answers. Powered by Sonar Tracker
            on-chain data, news, and social signals.
          </Subhead>
          <InputCard onSubmit={onSubmit}>
            <HeroInput
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything — e.g. why did BTC move today?"
              disabled={loading}
            />
            <SendBtn type="submit" disabled={loading || !input.trim()}>
              {loading ? '…' : 'Ask'}
            </SendBtn>
          </InputCard>
          {error && <ErrorLine>{error}</ErrorLine>}
          <ChipsRow>
            {chips.map((chip, idx) => (
              <Chip
                key={chip.label}
                type="button"
                onClick={() => sendMessage(chip.prompt)}
                disabled={loading}
              >
                <KeyHint>{idx + 1}</KeyHint>
                {chip.label}
              </Chip>
            ))}
          </ChipsRow>
        </HeroWrap>
      ) : (
        <ConvShell>
          <Messages>
            {messages.map((m) => (
              <Bubble key={m.id}>
                <Role $isUser={m.role === 'user'}>
                  {m.role === 'user' ? 'You' : 'ORCA'}
                </Role>
                <Body>
                  {m.role === 'user' ? (
                    m.content
                  ) : m.confirmPending ? (
                    <ConfirmCard>
                      <div style={{ marginBottom: '0.85rem' }}>{m.confirmPending.label}</div>
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <ConfirmBtn
                          type="button"
                          onClick={() => handleConfirm(m.id, true)}
                          disabled={!!m.confirmPending.executing}
                        >
                          {m.confirmPending.executing ? 'Working…' : 'Confirm'}
                        </ConfirmBtn>
                        <CancelBtn
                          type="button"
                          onClick={() => handleConfirm(m.id, false)}
                          disabled={!!m.confirmPending.executing}
                        >
                          Cancel
                        </CancelBtn>
                      </div>
                    </ConfirmCard>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content || ''}
                    </ReactMarkdown>
                  )}
                </Body>
              </Bubble>
            ))}
            {loading && statusText && <Status>{statusText}</Status>}
            {error && <ErrorLine>{error}</ErrorLine>}
            <div ref={messagesEndRef} />
          </Messages>
          <StickyInputWrap>
            <InputCard onSubmit={onSubmit}>
              <HeroInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a follow-up…"
                disabled={loading}
              />
              <SendBtn type="submit" disabled={loading || !input.trim()}>
                {loading ? '…' : 'Send'}
              </SendBtn>
            </InputCard>
          </StickyInputWrap>
        </ConvShell>
      )}
      <Disclaimer>
        ORCA provides educational analysis only. Not financial advice.
      </Disclaimer>
    </Shell>
  )
}
