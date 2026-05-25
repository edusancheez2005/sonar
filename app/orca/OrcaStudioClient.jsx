'use client'
/**
 * OrcaStudioClient
 * =============================================================================
 * v4 §4.4 — full-page ORCA workspace. Three columns:
 *   1. SessionList   (280px, hidden <960px)
 *   2. OrcaConversation (studio variant, 1fr)
 *   3. ToolInspector (360px, hidden <1200px)
 *
 * URL contract:
 *   /orca               -> empty state (no session selected)
 *   /orca?session=<id>  -> opens that session
 *
 * Selecting a session pushes the new query string via router.replace so the
 * URL is shareable but does not flood history.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styled from 'styled-components'
import { tokens } from '@/lib/ui/tokens'
import OrcaConversation from '@/components/orca/OrcaConversation'
import SessionList from '@/components/orca/SessionList'
import ToolInspector from '@/components/orca/ToolInspector'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Shell = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr 360px;
  height: calc(100vh - 64px);
  min-height: 0;
  background: ${tokens.surface.base};
  color: ${tokens.text};

  @media (max-width: 1199px) {
    grid-template-columns: 280px 1fr;
  }
  @media (max-width: 959px) {
    grid-template-columns: 1fr;
  }
`

const Center = styled.section`
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: ${tokens.surface.base};
`

const CenterHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${tokens.pad.md}px ${tokens.pad.lg}px;
  border-bottom: 1px solid ${tokens.surface.border};
`

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${tokens.text};
`

const HeaderMeta = styled.span`
  font-size: 12px;
  color: ${tokens.textMuted};
`

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${tokens.pad.xl}px;
  gap: 14px;
  color: ${tokens.textMuted};
  text-align: center;
`

const EmptyTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  color: ${tokens.text};
`

const EmptyBody = styled.p`
  margin: 0;
  max-width: 460px;
  line-height: 1.6;
  color: ${tokens.textMuted};
`

const StartBtn = styled.button`
  background: ${tokens.accentDim};
  border: 1px solid ${tokens.surface.borderActive};
  color: ${tokens.accent};
  font-size: 13px;
  font-weight: 600;
  padding: 9px 18px;
  border-radius: ${tokens.radius.pill}px;
  cursor: pointer;
  &:hover { filter: brightness(1.15); }
`

const Hide = styled.div`
  display: contents;
  @media (max-width: ${(p) => p.$breakpoint}px) {
    display: none;
  }
`

export default function OrcaStudioClient({ client, fetchImpl }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlSessionId = searchParams ? searchParams.get('session') : null

  const [activeSessionId, setActiveSessionId] = useState(urlSessionId || null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [creating, setCreating] = useState(false)

  // Keep state in sync with the URL (browser back/forward).
  useEffect(() => {
    setActiveSessionId(urlSessionId || null)
  }, [urlSessionId])

  const updateUrl = useCallback(
    (sessionId) => {
      const target = sessionId ? `/orca?session=${sessionId}` : '/orca'
      router.replace(target, { scroll: false })
    },
    [router]
  )

  const handleSelect = useCallback(
    (sessionId) => {
      setActiveSessionId(sessionId)
      updateUrl(sessionId)
    },
    [updateUrl]
  )

  const handleNew = useCallback(async () => {
    if (creating) return
    setCreating(true)
    try {
      const sb = client ?? supabaseBrowser()
      const doFetch = fetchImpl ?? fetch
      const { data: sessionData } = await sb.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) return
      const res = await doFetch('/api/orca/sessions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ surface_seed: 'studio' }),
      })
      if (!res.ok) return
      const body = await res.json()
      if (body && body.id) {
        setActiveSessionId(body.id)
        updateUrl(body.id)
        setRefreshKey((k) => k + 1)
      }
    } finally {
      setCreating(false)
    }
  }, [client, fetchImpl, updateUrl, creating])

  const headerLabel = useMemo(
    () => (activeSessionId ? `Session ${activeSessionId.slice(0, 8)}` : 'New conversation'),
    [activeSessionId]
  )

  return (
    <Shell data-testid="orca-studio">
      <Hide $breakpoint={959}>
        <SessionList
          activeSessionId={activeSessionId}
          onSelect={handleSelect}
          onNew={handleNew}
          client={client}
          fetchImpl={fetchImpl}
          refreshKey={refreshKey}
        />
      </Hide>

      <Center data-testid="orca-studio-center">
        <CenterHeader>
          <HeaderTitle>ORCA Studio</HeaderTitle>
          <HeaderMeta>{headerLabel}</HeaderMeta>
        </CenterHeader>
        {activeSessionId ? (
          <OrcaConversation
            key={activeSessionId}
            sessionId={activeSessionId}
            variant="studio"
            client={client}
            fetchImpl={fetchImpl}
          />
        ) : (
          <EmptyState data-testid="orca-studio-empty">
            <EmptyTitle>Start a conversation</EmptyTitle>
            <EmptyBody>
              Ask ORCA about a token, a wallet, the latest news, or your
              watchlist. Past conversations appear on the left; the tools
              ORCA used to answer appear on the right.
            </EmptyBody>
            <StartBtn
              type="button"
              onClick={handleNew}
              disabled={creating}
              data-testid="orca-studio-start"
            >
              {creating ? 'Starting' : 'Start a new conversation'}
            </StartBtn>
          </EmptyState>
        )}
      </Center>

      <Hide $breakpoint={1199}>
        <ToolInspector
          sessionId={activeSessionId}
          client={client}
          fetchImpl={fetchImpl}
          refreshKey={refreshKey}
        />
      </Hide>
    </Shell>
  )
}
