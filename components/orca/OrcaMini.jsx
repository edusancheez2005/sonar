'use client'
/**
 * OrcaMini
 * =============================================================================
 * v4 §4.5 — the compact 380x360 chat card embedded in the Personal Dashboard
 * right column. Internally just wraps the `OrcaConversation` atom in the
 * 'mini' variant with `maxTurns={3}`. When the user crosses that ceiling
 * (or clicks the explicit "Open in Studio" link) we push the same session
 * over to `/orca?session=<id>` so the conversation continues uninterrupted.
 *
 * Session lifecycle:
 *   - On mount we lazily POST /api/orca/sessions (surface_seed='mini') and
 *     remember the id so the trip to Studio is seamless. If the create fails
 *     the user can still chat (sessionId stays null and Studio promotion is
 *     a no-op until a chat-side session is established).
 *
 * Compliance: no buy/sell/hold verbs; no emoji; mandatory disclaimer is
 * still produced by the orchestrator on the assistant side.
 */
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { tokens } from '@/lib/ui/tokens'
import OrcaConversation from '@/components/orca/OrcaConversation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Card = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 380px;
  height: 360px;
  min-height: 0;
  background: ${tokens.surface.panel};
  border: 1px solid ${tokens.surface.border};
  border-radius: ${tokens.radius.lg}px;
  overflow: hidden;
`

const Head = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid ${tokens.surface.border};
`

const Title = styled.h2`
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${tokens.textLabel};
`

const PromoteLink = styled.button`
  background: transparent;
  border: 0;
  color: ${tokens.accent};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: ${tokens.radius.sm}px;
  &:hover { text-decoration: underline; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
`

/**
 * @param {object} props
 * @param {{ type: string, value: string, label?: string }|null} [props.focus]
 * @param {number} [props.maxTurns]   default 3
 * @param {object} [props.client]     test injection
 * @param {Function} [props.fetchImpl] test injection
 * @param {Function} [props.routerImpl] test injection
 */
export default function OrcaMini({
  focus = null,
  maxTurns = 3,
  client,
  fetchImpl,
  routerImpl,
}) {
  const realRouter = useRouter()
  const router = routerImpl ?? realRouter
  const [sessionId, setSessionId] = useState(null)
  const [createTried, setCreateTried] = useState(false)

  // Lazy-create a mini session on mount so the eventual promotion to Studio
  // has something to open. Failures are silent — the chat still works.
  useEffect(() => {
    let cancelled = false
    async function create() {
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
          body: JSON.stringify({ surface_seed: 'mini' }),
        })
        if (!res.ok) return
        const body = await res.json()
        if (!cancelled && body && body.id) setSessionId(body.id)
      } catch {
        // ignore — chat works without a pre-created id
      } finally {
        if (!cancelled) setCreateTried(true)
      }
    }
    create()
    return () => {
      cancelled = true
    }
  }, [client, fetchImpl])

  const handlePromote = useCallback(
    (promotedId) => {
      const id = promotedId || sessionId
      const target = id ? `/orca?session=${id}` : '/orca'
      router.push(target)
    },
    [router, sessionId]
  )

  return (
    <Card data-testid="orca-mini" aria-label="ORCA mini chat">
      <Head>
        <Title>ORCA</Title>
        <PromoteLink
          type="button"
          onClick={() => handlePromote(sessionId)}
          disabled={!createTried && !sessionId}
          data-testid="orca-mini-promote"
          aria-label="Open this conversation in Studio"
        >
          Open in Studio
        </PromoteLink>
      </Head>
      <Body>
        <OrcaConversation
          variant="mini"
          maxTurns={maxTurns}
          onPromote={handlePromote}
          sessionId={sessionId}
          focus={focus}
          client={client}
          fetchImpl={fetchImpl}
        />
      </Body>
    </Card>
  )
}
