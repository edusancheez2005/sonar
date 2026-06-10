'use client'
// Whale Terminal — FIGURES module. Public figures rendered as terminal
// backtest cards: "if you'd copied them" $10K · 90d outcome from the
// nightly figure_backtests cron, with category / credibility chips and a
// 7d delta. Cards without a computed backtest say so instead of faking a
// curve. Search, sort and pagination stay URL-driven.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import styled from 'styled-components'
import EntityAvatar from '@/app/components/entities/EntityAvatar'
import { categoryLabel, computeAddressCredibility } from '@/app/lib/entityHelpers'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import CredibilityChip from '@/app/components/whale-terminal/CredibilityChip'
import { C, FONT_MONO, FONT_SANS } from '@/app/lib/terminalTheme'
import {
  PillInput,
  PillSelect,
  GhostButton,
  Notice,
} from '@/app/components/whale-terminal/primitives'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'performance', label: '90d return' },
  { value: 'recent', label: 'Recent' },
  { value: 'alphabetical', label: 'A → Z' },
  { value: 'category', label: 'Category' },
]

const SEARCH_RESULT_CAP = 100
const BACKTEST_CAPITAL = 10000

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
  margin-bottom: 0.85rem;
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
`

const Card = styled.div`
  border: 1px solid ${(p) => (p.$featured ? 'rgba(0, 229, 255, 0.25)' : C.borderSubtle)};
  background: rgba(10, 14, 23, 0.72);
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: border-color 140ms ease, background 140ms ease;
  &:hover { border-color: rgba(0, 229, 255, 0.35); background: rgba(10, 16, 26, 0.85); }
`

const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid ${C.borderSubtle};
  background: rgba(0, 229, 255, 0.025);
  min-width: 0;
  .name {
    flex: 1;
    min-width: 0;
    font-family: ${FONT_MONO};
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: ${C.cyan};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-family: ${FONT_MONO};
    font-size: 0.56rem;
    letter-spacing: 0.5px;
    color: ${C.textMuted};
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }
`

const ChipRow = styled.div`
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.7rem 0;
`

const MonoChip = styled.span`
  display: inline-block;
  padding: 0.14rem 0.45rem;
  border: 1px solid ${C.borderSubtle};
  font-family: ${FONT_MONO};
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${(p) => p.$color || C.textMuted};
  background: rgba(255, 255, 255, 0.02);
  white-space: nowrap;
`

const Desc = styled.p`
  margin: 0;
  padding: 0.55rem 0.7rem 0;
  font-family: ${FONT_SANS};
  font-size: 0.78rem;
  line-height: 1.45;
  color: ${C.textPrimary};
  opacity: 0.72;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const BacktestBlock = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 0.7rem;
  margin-top: auto;
  border-top: 1px solid rgba(0, 229, 255, 0.05);
  font-family: ${FONT_MONO};
  flex-wrap: wrap;
  .label {
    font-size: 0.56rem;
    color: ${C.textMuted};
    text-transform: uppercase;
    letter-spacing: 1px;
    white-space: nowrap;
  }
  .nums { display: inline-flex; align-items: baseline; gap: 10px; white-space: nowrap; }
  .final { font-size: 1.18rem; font-weight: 800; color: ${C.textPrimary}; }
  .pct { font-size: 0.74rem; font-weight: 700; }
  .pending { font-size: 0.62rem; color: ${C.textMuted}; letter-spacing: 1px; }
`

const CardActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid ${C.borderSubtle};
  a {
    padding: 0.5rem 0;
    text-align: center;
    font-family: ${FONT_MONO};
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
  }
  .primary { background: ${C.cyan}; color: #041018; }
  .primary:hover { filter: brightness(1.1); }
  .ghost { background: transparent; color: ${C.cyan}; border-left: 1px solid ${C.borderSubtle}; }
  .ghost:hover { background: rgba(0, 229, 255, 0.06); }
`

const Pager = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
  font-family: ${FONT_MONO};
  font-size: 0.7rem;
  color: ${C.textMuted};
  strong { color: ${C.textPrimary}; }
`

const Disclaimer = styled.p`
  margin: 12px 2px 0;
  font-family: ${FONT_MONO};
  font-size: 0.56rem;
  color: ${C.textMuted};
  letter-spacing: 0.4px;
  text-transform: uppercase;
`

function fmtMoney(n) {
  if (!Number.isFinite(n)) return '—'
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export default function FiguresDirectoryClient({ figures, page, totalPages, pageSize, sort }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [followedSlugs, setFollowedSlugs] = useState(new Set())
  const [q, setQ] = useState('')

  const refreshFollows = useCallback(async () => {
    const headers = await getAuthHeaders()
    if (!headers) {
      setFollowedSlugs(new Set())
      return
    }
    try {
      const res = await fetch('/api/watchlist/entities', { headers })
      if (!res.ok) return
      const json = await res.json()
      const slugs = (json?.follows || [])
        .filter((f) => f.entity_type === 'curated')
        .map((f) => f.entity_ref)
      setFollowedSlugs(new Set(slugs))
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    refreshFollows()
  }, [refreshFollows])

  const enriched = useMemo(
    () => figures.map((f) => ({ ...f, _isFollowed: followedSlugs.has(f.slug) })),
    [figures, followedSlugs]
  )

  const searchActive = q.trim().length > 0
  const searchResults = useMemo(() => {
    if (!searchActive) return []
    const term = q.trim().toLowerCase()
    return enriched
      .filter((f) => {
        const name = String(f.display_name || '').toLowerCase()
        const handle = String(f.twitter_handle || '').toLowerCase()
        const desc = String(f.description || '').toLowerCase()
        return name.includes(term) || handle.includes(term) || desc.includes(term)
      })
      .slice(0, SEARCH_RESULT_CAP)
  }, [enriched, q, searchActive])

  const pageSlice = useMemo(() => {
    const start = (page - 1) * pageSize
    return enriched.slice(start, start + pageSize)
  }, [enriched, page, pageSize])

  const visible = searchActive ? searchResults : pageSlice

  const pushWithParam = useCallback(
    (changes) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(changes)) {
        if (v == null || v === '' || v === 'featured' || v === 1 || v === '1') {
          params.delete(k)
        } else {
          params.set(k, String(v))
        }
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  if (figures.length === 0) {
    return <Notice>NO PUBLIC FIGURES SEEDED YET</Notice>
  }

  return (
    <>
      <Controls>
        <PillInput
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="grep figures · @handle · keyword…"
          aria-label="Search figures"
          style={{ flex: '1 1 240px', minWidth: 200 }}
        />
        <PillSelect
          value={sort}
          onChange={(e) => pushWithParam({ sort: e.target.value, page: 1 })}
          aria-label="Sort figures"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </PillSelect>
        {searchActive ? (
          <span style={{ fontFamily: FONT_MONO, fontSize: '0.64rem', color: C.textMuted }}>
            {searchResults.length >= SEARCH_RESULT_CAP
              ? `FIRST ${SEARCH_RESULT_CAP} MATCHES`
              : `${searchResults.length} MATCH${searchResults.length === 1 ? '' : 'ES'}`}
          </span>
        ) : null}
      </Controls>

      {visible.length === 0 ? (
        <Notice>{searchActive ? `NO FIGURES MATCH “${q.trim().toUpperCase()}”` : 'NO FIGURES ON THIS PAGE'}</Notice>
      ) : (
        <Grid>
          {visible.map((f) => (
            <FigureCard key={f.slug} f={f} />
          ))}
        </Grid>
      )}

      <Disclaimer>
        Backtests simulate copying every on-chain trade with ${BACKTEST_CAPITAL.toLocaleString()} ·
        computed nightly · past performance does not predict future results
      </Disclaimer>

      {!searchActive && totalPages > 1 ? (
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

// ── backtest card ────────────────────────────────────────────────────
function FigureCard({ f }) {
  const addrCount = Array.isArray(f.addresses) ? f.addresses.length : 0
  const credibility = computeAddressCredibility(f.addresses)
  const has90 = typeof f.return_pct_90d === 'number' && Number.isFinite(f.return_pct_90d)
  const has7 = typeof f.return_pct_7d === 'number' && Number.isFinite(f.return_pct_7d)
  const up90 = has90 && f.return_pct_90d >= 0
  const final90 = has90 ? BACKTEST_CAPITAL * (1 + f.return_pct_90d / 100) : null
  const href = `/figure/${encodeURIComponent(f.slug)}`

  return (
    <Card $featured={!!f.is_featured}>
      <CardHead>
        <EntityAvatar
          avatarUrl={f.avatar_url}
          twitterHandle={f.twitter_handle}
          displayName={f.display_name}
          category={f.category}
          size={22}
        />
        <span className="name" title={f.display_name}>
          {f.display_name}
          {f._isFollowed ? <span style={{ color: C.green, marginLeft: 6 }} title="Following">●</span> : null}
        </span>
        <span className="meta">
          {categoryLabel(f.category)} · {addrCount} addr
        </span>
      </CardHead>

      <ChipRow>
        <CredibilityChip stats={credibility} compact />
        {f.is_featured ? <MonoChip $color={C.amber}>★ Featured</MonoChip> : null}
        {f.twitter_handle ? <MonoChip $color={C.cyan}>@{f.twitter_handle}</MonoChip> : null}
        {has7 ? (
          <MonoChip $color={f.return_pct_7d >= 0 ? C.green : C.red}>
            7d {f.return_pct_7d >= 0 ? '+' : ''}
            {f.return_pct_7d.toFixed(1)}%
          </MonoChip>
        ) : null}
      </ChipRow>

      {f.description ? <Desc title={f.description}>{f.description}</Desc> : null}

      <BacktestBlock>
        <span className="label">$10K copied · 90d</span>
        {has90 ? (
          <span className="nums">
            <span className="final">{fmtMoney(final90)}</span>
            <span className="pct" style={{ color: up90 ? C.green : C.red }}>
              {up90 ? '▲ +' : '▼ '}
              {Math.abs(f.return_pct_90d).toFixed(1)}%
            </span>
          </span>
        ) : (
          <span className="pending">BACKTEST PENDING · COMPUTED NIGHTLY</span>
        )}
      </BacktestBlock>

      <CardActions>
        <a className="primary" href={href}>
          Open
        </a>
        <a className="ghost" href={href}>
          Backtest ›
        </a>
      </CardActions>
    </Card>
  )
}
