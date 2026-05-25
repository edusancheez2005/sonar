'use client'
/**
 * SessionList
 * =============================================================================
 * Left rail of the Studio. Fetches GET /api/orca/sessions, renders a vertical
 * list grouped by recency. Click selects; New starts a fresh session.
 *
 * v4 §6 branch #9 (history): adds in-line title search, per-row rename, and
 * per-row archive against PATCH /api/orca/sessions/{id}. Archive is optimistic
 * (the row disappears immediately); rename commits on Enter or blur and
 * reverts on Esc.
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
import { useEffect, useState, useCallback, useRef } from 'react'
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

const SearchWrap = styled.div`
  padding: ${tokens.pad.sm}px ${tokens.pad.md}px;
  border-bottom: 1px solid ${tokens.surface.border};
`

const SearchInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.sm}px;
  color: ${tokens.text};
  font-size: 12px;
  padding: 6px 8px;
  outline: none;
  &:focus { border-color: ${tokens.accent}; }
  &::placeholder { color: ${tokens.textLabel}; }
`

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  min-height: 0;
`

const RowFrame = styled.div`
  position: relative;
  display: block;
  background: ${(p) => (p.$active ? tokens.accentDim : 'transparent')};
  border-left: 2px solid ${(p) => (p.$active ? tokens.accent : 'transparent')};
  &:hover { background: ${tokens.surface.panel}; }
  &:hover .row-actions, &:focus-within .row-actions { opacity: 1; }
`

const RowMain = styled.button`
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  color: ${(p) => (p.$active ? tokens.text : tokens.textMuted)};
  padding: 10px 64px 10px 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  &:hover { color: ${tokens.text}; }
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

const RowActions = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: ${(p) => (p.$active ? 1 : 0)};
  transition: opacity 120ms ease;
`

const IconBtn = styled.button`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid ${tokens.surface.border};
  color: ${tokens.textMuted};
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: ${tokens.radius.sm}px;
  cursor: pointer;
  &:hover { color: ${tokens.accent}; border-color: ${tokens.surface.borderActive}; }
`

const RenameInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid ${tokens.surface.borderActive};
  border-radius: ${tokens.radius.sm}px;
  color: ${tokens.text};
  font-size: 13px;
  padding: 4px 6px;
  outline: none;
`

const RenameRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 14px;
  border-left: 2px solid ${tokens.accent};
  background: ${tokens.accentDim};
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
  const [query, setQuery] = useState('')
  const [renaming, setRenaming] = useState(null) // { id, value }
  const tokenRef = useRef(null)

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
        tokenRef.current = null
        return
      }
      tokenRef.current = token
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

  const patchSession = useCallback(
    async (id, patch) => {
      const doFetch = fetchImpl ?? fetch
      const token = tokenRef.current
      if (!token) return { ok: false }
      try {
        const res = await doFetch(`/api/orca/sessions/${id}`, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patch),
        })
        return { ok: !!res?.ok }
      } catch {
        return { ok: false }
      }
    },
    [fetchImpl]
  )

  function beginRename(s) {
    setRenaming({ id: s.id, value: s.title || '' })
  }

  function cancelRename() {
    setRenaming(null)
  }

  async function commitRename() {
    const r = renaming
    if (!r) return
    const next = (r.value || '').trim()
    setRenaming(null)
    setSessions((prev) =>
      prev.map((s) => (s.id === r.id ? { ...s, title: next || null } : s))
    )
    await patchSession(r.id, { title: next })
  }

  async function archive(id) {
    setSessions((prev) => prev.filter((s) => s.id !== id))
    await patchSession(id, { archived: true })
  }

  const q = query.trim().toLowerCase()
  const visible = q
    ? sessions.filter((s) => (s.title || '').toLowerCase().includes(q))
    : sessions

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
      <SearchWrap>
        <SearchInput
          type="search"
          placeholder="Search conversations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search conversations"
          data-testid="orca-session-search"
        />
      </SearchWrap>
      <Scroll>
        {error && <ErrLine role="alert">{error}</ErrLine>}
        {!error && loading && <Empty>Loading.</Empty>}
        {!error && !loading && sessions.length === 0 && (
          <Empty>No conversations yet. Click New to start one.</Empty>
        )}
        {!error && !loading && sessions.length > 0 && visible.length === 0 && (
          <Empty>No conversations match &quot;{query}&quot;.</Empty>
        )}
        {!loading &&
          visible.map((s) => {
            const isActive = s.id === activeSessionId
            if (renaming && renaming.id === s.id) {
              return (
                <RenameRow key={s.id}>
                  <RenameInput
                    autoFocus
                    value={renaming.value}
                    onChange={(e) =>
                      setRenaming((cur) =>
                        cur ? { ...cur, value: e.target.value } : cur
                      )
                    }
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        commitRename()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelRename()
                      }
                    }}
                    data-testid={`orca-session-rename-input-${s.id}`}
                  />
                  <RowMeta>{formatRelative(s.updated_at)}</RowMeta>
                </RenameRow>
              )
            }
            return (
              <RowFrame key={s.id} $active={isActive}>
                <RowMain
                  type="button"
                  $active={isActive}
                  onClick={() => onSelect && onSelect(s.id)}
                  data-testid={`orca-session-row-${s.id}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <RowTitle>{s.title || 'Untitled conversation'}</RowTitle>
                  <RowMeta>{formatRelative(s.updated_at)}</RowMeta>
                </RowMain>
                <RowActions className="row-actions" $active={isActive}>
                  <IconBtn
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      beginRename(s)
                    }}
                    aria-label={`Rename ${s.title || 'conversation'}`}
                    data-testid={`orca-session-rename-${s.id}`}
                  >
                    Rename
                  </IconBtn>
                  <IconBtn
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      archive(s.id)
                    }}
                    aria-label={`Archive ${s.title || 'conversation'}`}
                    data-testid={`orca-session-archive-${s.id}`}
                  >
                    Archive
                  </IconBtn>
                </RowActions>
              </RowFrame>
            )
          })}
      </Scroll>
    </Wrap>
  )
}
