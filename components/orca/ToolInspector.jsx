'use client'
/**
 * ToolInspector
 * =============================================================================
 * Right rail of the Studio. For the active session, shows the orchestrator
 * trace for the most recent assistant turns: planned tools, their status,
 * latency, and the raw payload (collapsed).
 *
 * Reads GET /api/orca/sessions/[id], which returns messages with
 * `tool_calls`, `sources`, `focus`, etc. as JSONB.
 *
 * Props:
 *   - sessionId : string | null
 *   - client    : SupabaseClient   (test injection)
 *   - fetchImpl : fetch            (test injection)
 *   - refreshKey: any              bump to re-fetch after a turn
 */
import { useEffect, useState, useCallback } from 'react'
import styled from 'styled-components'
import { tokens } from '@/lib/ui/tokens'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Wrap = styled.aside`
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  background: ${tokens.surface.panel};
  border-left: 1px solid ${tokens.surface.border};
`

const Header = styled.div`
  padding: ${tokens.pad.md}px;
  border-bottom: 1px solid ${tokens.surface.border};
`

const Title = styled.h2`
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.textLabel};
`

const Sub = styled.p`
  margin: 4px 0 0;
  font-size: 11px;
  color: ${tokens.textMuted};
`

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: ${tokens.pad.md}px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Turn = styled.div`
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.md}px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.18);
`

const TurnHead = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${tokens.textLabel};
  margin-bottom: 6px;
`

const Call = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px dashed ${tokens.surface.border};
  font-size: 12px;
  &:first-of-type { border-top: none; }
`

const CallName = styled.span`
  color: ${tokens.text};
  font-weight: 500;
`

const StatusDot = styled.span`
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${(p) =>
    p.$status === 'ok'
      ? tokens.ok
      : p.$status === 'warn'
        ? tokens.warn
        : p.$status === 'err'
          ? tokens.err
          : tokens.textLabel};
`

const Meta = styled.span`
  font-size: 11px;
  color: ${tokens.textMuted};
`

const Empty = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${tokens.textMuted};
  line-height: 1.55;
`

const ErrLine = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${tokens.err};
`

const Raw = styled.pre`
  margin: 6px 0 0;
  padding: 8px;
  font-size: 11px;
  color: ${tokens.textMuted};
  background: rgba(0, 0, 0, 0.35);
  border-radius: ${tokens.radius.sm}px;
  max-height: 140px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
`

function statusOf(call) {
  if (!call) return 'unknown'
  if (call.ok === false || call.error) return 'err'
  if (call.source === 'timeout') return 'err'
  if (call.source === 'fallback' || call.source === 'cache') return 'warn'
  if (call.ok === true) return 'ok'
  return 'unknown'
}

export default function ToolInspector({
  sessionId = null,
  client,
  fetchImpl,
  refreshKey,
}) {
  const [turns, setTurns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!sessionId) {
      setTurns([])
      return
    }
    const sb = client ?? supabaseBrowser()
    const doFetch = fetchImpl ?? fetch
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await sb.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setError('Sign in to see the inspector.')
        return
      }
      const res = await doFetch(`/api/orca/sessions/${sessionId}`, {
        headers: { authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError('Could not load trace.')
        return
      }
      const body = await res.json()
      const msgs = Array.isArray(body?.messages) ? body.messages : []
      // Only keep assistant turns that recorded tool_calls — those have trace info.
      const assistant = msgs
        .filter((m) => m.role === 'assistant')
        .map((m, i) => ({
          idx: i + 1,
          calls: Array.isArray(m.tool_calls) ? m.tool_calls : [],
          sources: Array.isArray(m.sources) ? m.sources : [],
          focus: m.focus ?? null,
          createdAt: m.created_at ?? null,
        }))
        .filter((t) => t.calls.length > 0)
      // Most recent first.
      setTurns(assistant.reverse())
    } catch {
      setError('Could not load trace.')
    } finally {
      setLoading(false)
    }
  }, [sessionId, client, fetchImpl])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  return (
    <Wrap data-testid="orca-tool-inspector" aria-label="ORCA tool inspector">
      <Header>
        <Title>Inspector</Title>
        <Sub>What ORCA used to answer.</Sub>
      </Header>
      <Scroll>
        {error && <ErrLine role="alert">{error}</ErrLine>}
        {!error && !sessionId && (
          <Empty>Pick a conversation to see the trace.</Empty>
        )}
        {!error && sessionId && loading && turns.length === 0 && (
          <Empty>Loading trace.</Empty>
        )}
        {!error && sessionId && !loading && turns.length === 0 && (
          <Empty>No tool calls recorded for this conversation yet.</Empty>
        )}
        {turns.map((t, i) => (
          <Turn key={i} data-testid={`orca-inspector-turn-${i}`}>
            <TurnHead>Turn {t.idx}</TurnHead>
            {t.calls.map((c, j) => {
              const s = statusOf(c)
              const name = c.tool || c.name || 'tool'
              const latency =
                typeof c.latency_ms === 'number' ? `${c.latency_ms}ms` : null
              return (
                <Call key={j} data-testid={`orca-inspector-call-${i}-${j}`}>
                  <span>
                    <StatusDot $status={s} aria-label={`status ${s}`} />{' '}
                    <CallName>{name}</CallName>
                  </span>
                  <Meta>
                    {c.source ? `${c.source}` : ''}
                    {latency ? ` · ${latency}` : ''}
                  </Meta>
                </Call>
              )
            })}
            {t.calls.some((c) => c.data || c.error) && (
              <Raw>
                {JSON.stringify(
                  t.calls.map((c) => ({
                    tool: c.tool || c.name,
                    source: c.source,
                    error: c.error,
                    data: c.data,
                  })),
                  null,
                  2
                )}
              </Raw>
            )}
          </Turn>
        ))}
      </Scroll>
    </Wrap>
  )
}
