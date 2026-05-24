'use client'
/**
 * MemoryClient
 * =============================================================================
 * GDPR right-to-access + right-to-erasure surface for the user's stored
 * orca_memory facts (W1.2 of ORCA_AGENTIC_REDESIGN_PROMPT.md). Reads from
 * /api/orca/memory with the user's bearer token; supports delete-one and
 * delete-all with an explicit confirmation step.
 *
 * Server never sees the user's session token \u2014 this is a pure client
 * component that calls the API directly from the browser.
 */
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styled from 'styled-components'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

const Page = styled.main`
  max-width: 880px;
  margin: 0 auto;
  padding: 28px 24px 60px;
  color: #e0e6ed;
`

const TopBar = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`

const H1 = styled.h1`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
`

const BackLink = styled(Link)`
  font-size: 13px;
  color: #00e5ff;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`

const Lede = styled.p`
  margin: 0 0 24px;
  font-size: 13px;
  color: #8896a6;
  line-height: 1.6;
`

const Toolbar = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 14px;
`

const Danger = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 122, 122, 0.45);
  color: #ff7a7a;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { background: rgba(255, 122, 122, 0.08); }
`

const Card = styled.section`
  background: rgba(13, 20, 33, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  overflow: hidden;
`

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 90px 110px 40px;
  gap: 12px;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  &:last-child { border-bottom: none; }
  @media (max-width: 640px) {
    grid-template-columns: 1fr 70px 40px;
    .col-expires { display: none; }
  }
`

const HeaderRow = styled(Row)`
  font-size: 11px;
  color: #6b7a8c;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: rgba(0, 0, 0, 0.18);
`

const Fact = styled.div`
  font-size: 13px;
  color: #e0e6ed;
  line-height: 1.5;
`

const Meta = styled.div`
  font-size: 11px;
  color: #8896a6;
  font-variant-numeric: tabular-nums;
`

const TrashBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #8896a6;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  &:hover { color: #ff7a7a; border-color: rgba(255, 122, 122, 0.45); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`

const Empty = styled.div`
  padding: 48px 18px;
  text-align: center;
  color: #8896a6;
  font-size: 13px;
`

const ErrorLine = styled.p`
  margin: 14px 0 0;
  font-size: 12px;
  color: #ff7a7a;
`

const ConfirmShade = styled.div`
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; z-index: 80;
`

const ConfirmCard = styled.div`
  background: #0d1421;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 24px;
  max-width: 420px;
  width: 100%;
`

const ConfirmH = styled.h2`
  margin: 0 0 8px;
  font-size: 16px;
  color: #e0e6ed;
`

const ConfirmP = styled.p`
  margin: 0 0 16px;
  font-size: 13px;
  color: #8896a6;
  line-height: 1.55;
`

const ConfirmBar = styled.div`
  display: flex; justify-content: flex-end; gap: 10px;
`

const GhostBtn = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #e0e6ed;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
`

function formatDate(iso) {
  if (!iso) return '\u2014'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export default function MemoryClient() {
  const [state, setState] = useState({ status: 'loading', facts: [], error: null })
  const [busyId, setBusyId] = useState(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [tokenless, setTokenless] = useState(false)

  const loadFacts = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const sb = supabaseBrowser()
      const { data: sess } = await sb.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) {
        setTokenless(true)
        setState({ status: 'unauth', facts: [], error: null })
        return
      }
      const res = await fetch('/api/orca/memory', {
        headers: { authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setState({ status: 'error', facts: [], error: `Could not load memory (HTTP ${res.status}).` })
        return
      }
      const body = await res.json()
      setState({ status: 'ready', facts: Array.isArray(body?.facts) ? body.facts : [], error: null })
    } catch (err) {
      setState({ status: 'error', facts: [], error: 'Could not reach the memory service.' })
    }
  }, [])

  useEffect(() => {
    loadFacts()
  }, [loadFacts])

  async function deleteOne(id) {
    setBusyId(id)
    try {
      const sb = supabaseBrowser()
      const { data: sess } = await sb.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) return
      const res = await fetch(`/api/orca/memory?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setState((s) => ({ ...s, facts: s.facts.filter((f) => f.id !== id) }))
      }
    } finally {
      setBusyId(null)
    }
  }

  async function deleteAll() {
    setConfirmAll(false)
    setState((s) => ({ ...s, status: 'loading' }))
    try {
      const sb = supabaseBrowser()
      const { data: sess } = await sb.auth.getSession()
      const token = sess?.session?.access_token
      if (!token) return
      const res = await fetch('/api/orca/memory', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}`, 'x-confirm-delete-all': 'yes' },
      })
      if (res.ok) {
        setState({ status: 'ready', facts: [], error: null })
      } else {
        setState((s) => ({ ...s, status: 'error', error: 'Wipe failed. Refresh and try again.' }))
      }
    } catch {
      setState((s) => ({ ...s, status: 'error', error: 'Wipe failed. Refresh and try again.' }))
    }
  }

  return (
    <Page data-testid="memory-page">
      <TopBar>
        <div>
          <H1>What ORCA remembers</H1>
          <Lede>
            ORCA stores short, non-sensitive facts about your trading context so it can answer follow-ups
            without you repeating yourself. PII (addresses, emails, keys, seed phrases) is pre-filtered and
            never reaches storage. You can delete any fact at any time.
          </Lede>
        </div>
        <BackLink href="/dashboard/personal">\u2190 Back to personal dashboard</BackLink>
      </TopBar>

      {state.status === 'unauth' && (
        <Card>
          <Empty>Sign in to view what ORCA remembers about you.</Empty>
        </Card>
      )}

      {state.status !== 'unauth' && (
        <>
          <Toolbar>
            <Danger
              type="button"
              onClick={() => setConfirmAll(true)}
              disabled={state.status === 'loading' || state.facts.length === 0}
              data-testid="delete-all"
            >
              Delete all memory
            </Danger>
          </Toolbar>
          <Card>
            <HeaderRow as="header">
              <div>Fact</div>
              <div>Confidence</div>
              <div className="col-expires">Expires</div>
              <div />
            </HeaderRow>
            {state.status === 'loading' && (
              <Empty data-testid="memory-loading">Loading\u2026</Empty>
            )}
            {state.status === 'ready' && state.facts.length === 0 && (
              <Empty data-testid="memory-empty">No memory yet. Chat with ORCA and useful facts will land here.</Empty>
            )}
            {state.status === 'ready' && state.facts.map((f) => (
              <Row key={f.id} data-testid={`memory-row-${f.id}`}>
                <Fact>{f.fact}</Fact>
                <Meta>{typeof f.confidence === 'number' ? f.confidence.toFixed(2) : '\u2014'}</Meta>
                <Meta className="col-expires">{formatDate(f.expires_at)}</Meta>
                <TrashBtn
                  type="button"
                  onClick={() => deleteOne(f.id)}
                  disabled={busyId === f.id}
                  data-testid={`memory-delete-${f.id}`}
                >
                  Delete
                </TrashBtn>
              </Row>
            ))}
          </Card>
          {state.error && <ErrorLine role="alert">{state.error}</ErrorLine>}
        </>
      )}

      {confirmAll && (
        <ConfirmShade onClick={() => setConfirmAll(false)} data-testid="confirm-all-shade">
          <ConfirmCard onClick={(e) => e.stopPropagation()}>
            <ConfirmH>Delete all of ORCA&apos;s memory?</ConfirmH>
            <ConfirmP>
              This permanently removes every fact ORCA has stored about you. It cannot be undone.
              Future conversations will start with no memory of your trading context.
            </ConfirmP>
            <ConfirmBar>
              <GhostBtn type="button" onClick={() => setConfirmAll(false)}>Cancel</GhostBtn>
              <Danger type="button" onClick={deleteAll} data-testid="confirm-all-yes">Yes, delete all</Danger>
            </ConfirmBar>
          </ConfirmCard>
        </ConfirmShade>
      )}
    </Page>
  )
}
