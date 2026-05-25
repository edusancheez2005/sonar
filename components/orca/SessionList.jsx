'use client'
/**
 * SessionList
 * =============================================================================
 * Left rail of the Studio. Fetches GET /api/orca/sessions, renders a vertical
 * list grouped by recency. Click selects; New starts a fresh session.
 *
 * Stateless w.r.t. routing — parent owns the active session id and onSelect.
 *
 * Props:
 *   - activeSessionId : string | null
 *   - onSelect        : (sessionId: string) => void
 *   - onNew           : () => void
 *   - client          : SupabaseClient   (test injection)
 *   - fetchImpl       : fetch            (test injection)
 *   - refreshKey      : any              bump to force re-fetch
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
  border-right: 1px solid ${tokens.surface.border};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
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

const NewBtn = styled.button`
  background: ${tokens.accentDim};
  border: 1px solid ${tokens.surface.borderActive};
  color: ${tokens.accent};
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: ${tokens.radius.pill}px;
  cursor: pointer;
  &:hover { filter: brightness(1.15); }
`

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
`

const Row = styled.button`
  width: 100%;
  text-align: left;
  background: ${(p) => (p.$active ? tokens.accentDim : 'transparent')};
  border: none;
  border-left: 2px solid ${(p) => (p.$active ? tokens.accent : 'transparent')};
  color: ${(p) => (p.$active ? tokens.text : tokens.textMuted)};
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  &:hover { background: ${tokens.surface.panel}; color: ${tokens.text}; }
`

const RowTitle = styled.span`
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const RowMeta = styled.span`
  font-size: 11px;
  color: ${tokens.textLabel};
`

const Empty = styled.p`
  margin: 0;
  padding: ${tokens.pad.lg}px;
  font-size: 13px;
  color: ${tokens.textMuted};
  line-height: 1.55;
`

const ErrLine = styled.p`
  margin: 0;
  padding: ${tokens.pad.md}px;
  font-size: 12px;
  color: ${tokens.err};
`

function formatRelative(iso) {
  if (!iso) return ''
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ''
  const diffSec = (Date.now() - then) / 1000
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

export default function SessionList({
  activeSessionId = null,
  onSelect,
  onNew,
  client,
  fetchImpl,
  refreshKey,
}) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const sb = client ?? supabaseBrowser()
    const doFetch = fetchImpl ?? fetch
    setLoading(true)
    setError(null)
    try {
      const { data: sessionData } = await sb.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        setError('Sign in to see your conversations.')
        setSessions([])
        return
      }
      const res = await doFetch('/api/orca/sessions?limit=50', {
        headers: { authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError('Could not load conversations.')
        return
      }
      const body = await res.json()
      setSessions(Array.isArray(body.sessions) ? body.sessions : [])
    } catch {
      setError('Could not load conversations.')
    } finally {
      setLoading(false)
    }
  }, [client, fetchImpl])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  return (
    <Wrap data-testid="orca-session-list" aria-label="ORCA conversations">
      <Header>
        <Title>Conversations</Title>
        <NewBtn
          type="button"
          onClick={() => onNew && onNew()}
          data-testid="orca-session-new"
        >
          New
        </NewBtn>
      </Header>
      <Scroll>
        {error && <ErrLine role="alert">{error}</ErrLine>}
        {!error && loading && <Empty>Loading.</Empty>}
        {!error && !loading && sessions.length === 0 && (
          <Empty>No conversations yet. Click New to start one.</Empty>
        )}
        {!loading &&
          sessions.map((s) => (
            <Row
              key={s.id}
              type="button"
              $active={s.id === activeSessionId}
              onClick={() => onSelect && onSelect(s.id)}
              data-testid={`orca-session-row-${s.id}`}
              aria-current={s.id === activeSessionId ? 'true' : undefined}
            >
              <RowTitle>{s.title || 'Untitled conversation'}</RowTitle>
              <RowMeta>{formatRelative(s.updated_at)}</RowMeta>
            </Row>
          ))}
      </Scroll>
    </Wrap>
  )
}
