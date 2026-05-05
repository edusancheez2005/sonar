'use client'
/**
 * /admin/arkham/entities — curated_entities x Arkham enrichment status.
 *
 * Read-only operator view: which curated entities are enriched, how many
 * addresses each has harvested into tracked_address_universe, and which
 * slugs need a manual fix (e.g. wrong arkham_slug in the manifest).
 *
 * Re-running enrichment / harvest is a CLI operation:
 *   node scripts/arkham-enrich-curated.mjs --slug=<slug>
 *   node scripts/arkham-harvest-addresses.mjs --slug=<slug> --force
 */
import React, { useEffect, useMemo, useState } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

type Entity = {
  slug: string
  display_name: string
  category: string
  is_featured: boolean
  status: 'enriched' | 'missing' | 'never'
  arkham_entity_id: string | null
  arkham_entity_type: string | null
  arkham_synced_at: string | null
  website: string | null
  twitter: string | null
  addresses_harvested: number
  last_harvested_at: string | null
}

type Resp = {
  totals: { entities: number; enriched: number; missing: number; never: number; addresses: number }
  entities: Entity[]
}

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
  border: '1px solid rgba(54,166,186,0.2)',
  borderRadius: 8,
  padding: '1rem 1.25rem',
}

const tH: React.CSSProperties = {
  textAlign: 'left', padding: '0.5rem 0.75rem',
  borderBottom: '1px solid rgba(54,166,186,0.3)',
  fontSize: '0.72rem', textTransform: 'uppercase',
  opacity: 0.7, letterSpacing: '0.05em', whiteSpace: 'nowrap',
}
const tC: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  borderBottom: '1px solid rgba(54,166,186,0.1)',
  fontSize: '0.85rem',
}

const STATUS_BADGE: Record<Entity['status'], { bg: string; fg: string; label: string }> = {
  enriched: { bg: 'rgba(54,166,186,0.18)', fg: '#36A6BA', label: 'enriched' },
  missing:  { bg: 'rgba(245,158,11,0.18)', fg: '#f59e0b', label: 'not on Arkham' },
  never:    { bg: 'rgba(255,255,255,0.08)', fg: '#a1a1aa', label: 'never synced' },
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default function ArkhamEntitiesPage() {
  const [data, setData] = useState<Resp | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | Entity['status']>('all')
  const [q, setQ] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const sb = supabaseBrowser()
        const { data: sess } = await sb.auth.getSession()
        const token = sess?.session?.access_token
        if (!token) { if (!cancelled) setError('Not signed in'); return }
        const res = await fetch('/api/admin/arkham/entities', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (!res.ok) { if (!cancelled) setError(`HTTP ${res.status}`); return }
        const json = await res.json() as Resp
        if (!cancelled) setData(json)
      } catch (e) { if (!cancelled) setError((e as Error).message) }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.entities.filter(e => {
      if (filter !== 'all' && e.status !== filter) return false
      if (q && !e.slug.toLowerCase().includes(q.toLowerCase()) &&
              !e.display_name.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [data, filter, q])

  if (error) return <main style={{ padding: '1.5rem', color: '#f87171' }}>Error: {error}</main>
  if (!data) return <main style={{ padding: '1.5rem', color: 'var(--text-primary)', opacity: 0.7 }}>Loading…</main>

  return (
    <main style={{ padding: '1.5rem', maxWidth: 1300, margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Curated Entities × Arkham</h1>
      <p style={{ opacity: 0.7, fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Manifest source: <code>data/curated-entities-manifest.json</code>. Re-run via{' '}
        <code>node scripts/arkham-enrich-curated.mjs</code> and{' '}
        <code>node scripts/arkham-harvest-addresses.mjs</code>.
      </p>

      {/* TOTALS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>Entities</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{data.totals.entities}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>Enriched</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#36A6BA' }}>{data.totals.enriched}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>Not on Arkham</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>{data.totals.missing}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>Never synced</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, opacity: 0.85 }}>{data.totals.never}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase' }}>Addresses harvested</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{data.totals.addresses.toLocaleString()}</div>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {(['all', 'enriched', 'missing', 'never'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 6,
              fontSize: '0.8rem',
              cursor: 'pointer',
              border: '1px solid rgba(54,166,186,0.3)',
              background: filter === f ? '#36A6BA' : 'transparent',
              color: filter === f ? '#0a1825' : 'var(--text-primary)',
              fontWeight: filter === f ? 600 : 400,
            }}
          >
            {f}
          </button>
        ))}
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="filter by slug or name…"
          style={{
            flex: '0 1 280px',
            padding: '0.4rem 0.7rem',
            background: '#0a1825',
            border: '1px solid rgba(54,166,186,0.3)',
            borderRadius: 6,
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
          }}
        />
        <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>{filtered.length} shown</span>
      </div>

      {/* TABLE */}
      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={tH}>Slug</th>
                <th style={tH}>Name</th>
                <th style={tH}>Category</th>
                <th style={tH}>Arkham type</th>
                <th style={tH}>Status</th>
                <th style={{ ...tH, textAlign: 'right' }}>Addrs</th>
                <th style={tH}>Last enriched</th>
                <th style={tH}>Last harvested</th>
                <th style={tH}>Links</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const badge = STATUS_BADGE[e.status]
                return (
                  <tr key={e.slug}>
                    <td style={{ ...tC, fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem' }}>
                      {e.slug}{e.is_featured && <span style={{ marginLeft: 6, color: '#f59e0b' }} title="featured">★</span>}
                    </td>
                    <td style={tC}>{e.display_name}</td>
                    <td style={{ ...tC, opacity: 0.75 }}>{e.category}</td>
                    <td style={{ ...tC, opacity: 0.75 }}>{e.arkham_entity_type ?? '—'}</td>
                    <td style={tC}>
                      <span style={{
                        display: 'inline-block', padding: '0.15rem 0.5rem',
                        borderRadius: 4, background: badge.bg, color: badge.fg,
                        fontSize: '0.72rem', fontWeight: 600,
                      }}>{badge.label}</span>
                    </td>
                    <td style={{ ...tC, textAlign: 'right', fontWeight: e.addresses_harvested > 0 ? 600 : 400 }}>
                      {e.addresses_harvested}
                    </td>
                    <td style={{ ...tC, opacity: 0.7, whiteSpace: 'nowrap' }}>{fmtTime(e.arkham_synced_at)}</td>
                    <td style={{ ...tC, opacity: 0.7, whiteSpace: 'nowrap' }}>{fmtTime(e.last_harvested_at)}</td>
                    <td style={{ ...tC }}>
                      {e.website && <a href={e.website} target="_blank" rel="noreferrer" style={{ color: '#36A6BA', marginRight: 8 }}>web</a>}
                      {e.twitter && <a href={e.twitter} target="_blank" rel="noreferrer" style={{ color: '#36A6BA' }}>X</a>}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ ...tC, opacity: 0.6, textAlign: 'center' }}>No entities match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
