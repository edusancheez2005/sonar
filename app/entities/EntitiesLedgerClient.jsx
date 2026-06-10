'use client'
// Whale Terminal — ENTITIES module. Terminal ledger of exchanges, market
// makers, protocols and tracked brands: dense mono table with 24h flow,
// volume dominance (ascii bar), 14-day activity sparkline and follow /
// trace actions. Search + sort + pagination stay URL-driven like the old
// directory; the type strip and search filter client-side.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styled from 'styled-components'
import { formatVolume, relativeTime } from '@/app/lib/entityHelpers'
import FollowButton from '@/app/components/entities/FollowButton'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { C, FONT_MONO } from '@/app/lib/terminalTheme'
import {
  TermPanel,
  FilterTabs,
  FilterTab,
  PillInput,
  PillSelect,
  GhostButton,
  Notice,
} from '@/app/components/whale-terminal/primitives'
import { AreaSpark, asciiBar } from '@/app/components/whale-terminal/charts'

const SORT_OPTIONS = [
  { value: 'volume', label: 'Volume' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'recent', label: 'Recent activity' },
  { value: 'alphabetical', label: 'A → Z' },
  { value: 'verified', label: 'Verified first' },
]

const SEARCH_RESULT_CAP = 100
const FILTER_RESULT_CAP = 100

async function getAuthHeaders() {
  try {
    const sb = supabaseBrowser()
    const { data } = await sb.auth.getSession()
    const token = data?.session?.access_token
    if (!token) return null
    return { Authorization: `Bearer ${token}` }
  } catch {
    return null
  }
}

// ── styled ───────────────────────────────────────────────────────────
const Controls = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 0.7rem;
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const Th = styled.th`
  padding: 0.42rem 0.7rem;
  text-align: ${(p) => (p.$right ? 'right' : 'left')};
  font-family: ${FONT_MONO};
  font-size: 0.54rem;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: ${C.textMuted};
  border-bottom: 1px solid ${C.borderSubtle};
  background: rgba(0, 229, 255, 0.02);
  white-space: nowrap;
`

const Td = styled.td`
  padding: 0.42rem 0.7rem;
  font-size: 0.72rem;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);
  font-family: ${FONT_MONO};
`

const Row = styled.tr`
  background: ${(p) => (p.$alt ? 'rgba(255, 255, 255, 0.012)' : 'transparent')};
  &:hover {
    background: rgba(0, 229, 255, 0.045);
    box-shadow: inset 2px 0 0 ${C.cyan};
  }
`

const NameLink = styled.a`
  color: ${C.textPrimary};
  font-weight: 700;
  font-size: 0.74rem;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  text-decoration: none;
  display: inline-block;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
  &:hover { color: ${C.cyan}; }
  @media (max-width: 900px) { max-width: 150px; }
`

const Pager = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.9rem;
  font-family: ${FONT_MONO};
  font-size: 0.7rem;
  color: ${C.textMuted};
  strong { color: ${C.textPrimary}; }
`

function flowCell(e) {
  const net = (e.flow_in_24h || 0) - (e.flow_out_24h || 0)
  const moved = (e.flow_in_24h || 0) + (e.flow_out_24h || 0)
  if (moved === 0) return <span style={{ color: C.textMuted }}>· FLAT</span>
  const up = net >= 0
  return (
    <span style={{ color: up ? C.green : C.red, fontWeight: 700 }} title={`in ${formatVolume(e.flow_in_24h || 0)} · out ${formatVolume(e.flow_out_24h || 0)}`}>
      {up ? '▲ +' : '▼ −'}
      {formatVolume(Math.abs(net))}
    </span>
  )
}

export default function EntitiesLedgerClient({ entities, page, totalPages, pageSize, sort }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [follows, setFollows] = useState(null)
  const [signedIn, setSignedIn] = useState(null)

  const refreshFollows = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) {
      setSignedIn(false)
      setFollows([])
      return
    }
    setSignedIn(true)
    try {
      const res = await fetch('/api/watchlist/entities', { headers })
      if (!res.ok) {
        setFollows([])
        return
      }
      const json = await res.json()
      setFollows(json?.follows || [])
    } catch {
      setFollows([])
    }
  }, [])

  useEffect(() => {
    refreshFollows()
  }, [refreshFollows])

  const followedEntityNames = useMemo(() => {
    if (!Array.isArray(follows)) return new Set()
    return new Set(follows.filter((f) => f.entity_type === 'label').map((f) => f.entity_ref))
  }, [follows])

  const types = useMemo(() => {
    const present = [...new Set(entities.map((e) => e.entity_type).filter(Boolean))]
    const order = ['Exchange', 'Market Maker', 'Protocol', 'Entity']
    present.sort((a, b) => order.indexOf(a) - order.indexOf(b))
    return ['all', ...present]
  }, [entities])

  const searchActive = q.trim().length > 0
  const filterActive = type !== 'all'

  const filtered = useMemo(() => {
    let list = entities
    if (filterActive) list = list.filter((e) => e.entity_type === type)
    if (searchActive) {
      const term = q.trim().toLowerCase()
      list = list.filter((e) => {
        const name = String(e.entity_name || '').toLowerCase()
        const desc = String(e.description || '').toLowerCase()
        return name.includes(term) || desc.includes(term)
      })
    }
    return list
  }, [entities, filterActive, type, searchActive, q])

  // Search / type filters bypass URL pagination (capped); otherwise the
  // server-sorted list pages 30 rows at a time like the old directory.
  const bypassPaging = searchActive || filterActive
  const visible = useMemo(() => {
    if (bypassPaging) return filtered.slice(0, Math.max(SEARCH_RESULT_CAP, FILTER_RESULT_CAP))
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, bypassPaging, page, pageSize])

  const pushWithParam = useCallback(
    (changes) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(changes)) {
        const isDefault = (k === 'sort' && v === 'volume') || (k === 'page' && (v === 1 || v === '1'))
        if (v == null || v === '' || isDefault) params.delete(k)
        else params.set(k, String(v))
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const rankBase = bypassPaging ? 0 : (page - 1) * pageSize

  return (
    <>
      <Controls>
        <PillInput
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="grep entities…"
          aria-label="Search entities"
          style={{ flex: '1 1 220px', minWidth: 200 }}
        />
        <PillSelect value={sort} onChange={(e) => pushWithParam({ sort: e.target.value, page: 1 })} aria-label="Sort entities">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </PillSelect>
        {bypassPaging ? (
          <span style={{ fontFamily: FONT_MONO, fontSize: '0.64rem', color: C.textMuted }}>
            {filtered.length > visible.length
              ? `FIRST ${visible.length} OF ${filtered.length} MATCHES`
              : `${filtered.length} MATCH${filtered.length === 1 ? '' : 'ES'}`}
          </span>
        ) : null}
      </Controls>

      <TermPanel
        label="Entity ledger"
        meta={`${filtered.length}/${entities.length} entities · marked to market`}
        live
      >
        <FilterTabs style={{ borderBottom: `1px solid ${C.borderSubtle}` }}>
          {types.map((t) => (
            <FilterTab key={t} $active={t === type} onClick={() => setType(t)} type="button">
              {t}
            </FilterTab>
          ))}
        </FilterTabs>

        {visible.length === 0 ? (
          <Notice style={{ border: 'none' }}>
            {searchActive ? `NO ENTITIES MATCH “${q.trim().toUpperCase()}”` : 'NO ENTITIES TO DISPLAY'}
          </Notice>
        ) : (
          <TableScroll>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th>##</Th>
                  <Th>Entity</Th>
                  <Th>Type</Th>
                  <Th $right>Tx</Th>
                  <Th $right>Volume</Th>
                  <Th $right>Flow 24h</Th>
                  <Th>Dominance</Th>
                  <Th>14d</Th>
                  <Th $right>Chains</Th>
                  <Th>Last active</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {visible.map((e, i) => {
                  const detailHref = e.curated_slug
                    ? `/figure/${encodeURIComponent(e.curated_slug)}`
                    : `/entity/${encodeURIComponent(e.entity_name)}`
                  const dormant = e.tracked && (e.tx_count || 0) === 0
                  const isFollowed = followedEntityNames.has(e.entity_name)
                  return (
                    <Row key={e.entity_name} $alt={i % 2 === 1} style={dormant ? { opacity: 0.6 } : undefined}>
                      <Td style={{ color: C.textMuted, fontSize: '0.62rem' }}>
                        {String(rankBase + i + 1).padStart(2, '0')}
                      </Td>
                      <Td>
                        <NameLink href={detailHref} title={e.entity_name}>
                          {e.entity_name}
                        </NameLink>
                        {e.verified ? (
                          <span style={{ color: C.cyan, marginLeft: 6, fontSize: '0.64rem' }} title="Verified entity">✓</span>
                        ) : null}
                        {isFollowed ? (
                          <span style={{ color: C.green, marginLeft: 6, fontSize: '0.6rem' }} title="Following">●</span>
                        ) : null}
                      </Td>
                      <Td style={{ color: C.cyan, textTransform: 'uppercase', fontSize: '0.56rem', letterSpacing: '0.8px', opacity: 0.85 }}>
                        [{e.entity_type || 'entity'}]
                      </Td>
                      <Td style={{ textAlign: 'right', color: C.textPrimary, opacity: 0.85 }}>
                        {dormant ? '—' : (e.tx_count || 0).toLocaleString()}
                      </Td>
                      <Td style={{ textAlign: 'right', fontWeight: 700, color: C.textPrimary }}>
                        {dormant ? '—' : formatVolume(e.total_volume || 0)}
                      </Td>
                      <Td style={{ textAlign: 'right' }}>{dormant ? <span style={{ color: C.textMuted }}>—</span> : flowCell(e)}</Td>
                      <Td style={{ color: C.cyan, fontSize: '0.64rem', letterSpacing: '-0.5px' }}>
                        {asciiBar(e.dominance || 0, 12)}{' '}
                        <span style={{ color: C.textMuted, fontSize: '0.58rem' }}>
                          {((e.dominance || 0) * 100).toFixed((e.dominance || 0) < 0.01 ? 1 : 0)}
                        </span>
                      </Td>
                      <Td>
                        {Array.isArray(e.spark) && e.spark.some((v) => v > 0) ? (
                          <AreaSpark data={e.spark} width={84} height={18} />
                        ) : (
                          <span style={{ color: C.textMuted, fontSize: '0.6rem' }}>·</span>
                        )}
                      </Td>
                      <Td style={{ textAlign: 'right', color: C.textPrimary, opacity: 0.7 }}>
                        {dormant ? '—' : e.chain_count || 0}
                      </Td>
                      <Td style={{ color: C.textMuted, fontSize: '0.64rem' }}>
                        {e.last_active ? relativeTime(e.last_active) : '—'}
                      </Td>
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {signedIn === true ? (
                            <FollowButton
                              entityType="label"
                              entityRef={e.entity_name}
                              variant="icon"
                              onToggle={refreshFollows}
                            />
                          ) : null}
                          <a
                            href={detailHref}
                            style={{
                              padding: '0.18rem 0.6rem',
                              border: `1px solid ${C.borderSubtle}`,
                              color: C.cyan,
                              fontFamily: FONT_MONO,
                              fontSize: '0.56rem',
                              fontWeight: 700,
                              letterSpacing: '0.8px',
                              textTransform: 'uppercase',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Trace ›
                          </a>
                        </span>
                      </Td>
                    </Row>
                  )
                })}
              </tbody>
            </table>
          </TableScroll>
        )}
      </TermPanel>

      {!bypassPaging && totalPages > 1 ? (
        <Pager aria-label="Pagination">
          <GhostButton type="button" disabled={page <= 1} onClick={() => pushWithParam({ page: page - 1 })}>
            ‹ PREV
          </GhostButton>
          <span>
            PAGE <strong>{page}</strong> / {totalPages}
          </span>
          <GhostButton type="button" disabled={page >= totalPages} onClick={() => pushWithParam({ page: page + 1 })}>
            NEXT ›
          </GhostButton>
        </Pager>
      ) : null}
    </>
  )
}
