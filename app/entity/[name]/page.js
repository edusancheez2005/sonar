import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'
import FollowButton from '@/app/components/entities/FollowButton'
import {
  CLASSIFICATION_COLORS,
  chainDisplay,
  truncateAddress,
  formatVolume,
  relativeTime,
  absoluteTime,
  isNarrativeReasoning,
  inferEntityType,
  entityTypeStyle,
} from '@/app/lib/entityHelpers'

export const dynamic = 'force-dynamic'

async function fetchEntityStats(name) {
  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('usd_value, blockchain, from_address, to_address, timestamp')
    .or(`from_label.eq.${escapeOrValue(name)},to_label.eq.${escapeOrValue(name)}`)
  if (error) return null

  const rows = data || []
  if (rows.length === 0) return { tx_count: 0, total_volume: 0, chain_count: 0, address_count: 0, first_seen: null, last_active: null }

  const chains = new Set()
  const fromAddrs = new Set()
  const toAddrs = new Set()
  let totalVolume = 0
  let firstSeen = null
  let lastActive = null

  for (const r of rows) {
    totalVolume += Number(r.usd_value || 0)
    if (r.blockchain) chains.add(String(r.blockchain).toLowerCase())
    if (r.from_address) fromAddrs.add(r.from_address)
    if (r.to_address) toAddrs.add(r.to_address)
    const ts = r.timestamp ? new Date(r.timestamp).getTime() : null
    if (ts && Number.isFinite(ts)) {
      if (firstSeen === null || ts < firstSeen) firstSeen = ts
      if (lastActive === null || ts > lastActive) lastActive = ts
    }
  }

  return {
    tx_count: rows.length,
    total_volume: totalVolume,
    chain_count: chains.size,
    address_count: fromAddrs.size + toAddrs.size,
    first_seen: firstSeen ? new Date(firstSeen).toISOString() : null,
    last_active: lastActive ? new Date(lastActive).toISOString() : null,
  }
}

async function fetchRecentTxs(name) {
  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select(
      'transaction_hash, token_symbol, usd_value, blockchain, from_address, to_address, from_label, to_label, reasoning, timestamp, classification'
    )
    .or(`from_label.eq.${escapeOrValue(name)},to_label.eq.${escapeOrValue(name)}`)
    .order('timestamp', { ascending: false })
    .limit(50)
  if (error) return []
  return data || []
}

async function fetchTopTokens(name) {
  // Pull a larger slice and aggregate in memory (PostgREST has no
  // GROUP BY without an RPC). Cap at 5000 rows for latency.
  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select('token_symbol, usd_value, timestamp')
    .or(`from_label.eq.${escapeOrValue(name)},to_label.eq.${escapeOrValue(name)}`)
    .order('timestamp', { ascending: false })
    .limit(5000)
  if (error) return []

  const map = new Map()
  for (const r of data || []) {
    const key = r.token_symbol || 'UNKNOWN'
    let rec = map.get(key)
    if (!rec) {
      rec = { token_symbol: key, tx_count: 0, volume: 0 }
      map.set(key, rec)
    }
    rec.tx_count += 1
    rec.volume += Number(r.usd_value || 0)
  }
  return Array.from(map.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10)
}

async function fetchAssociatedAddresses(name) {
  const safe = escapeOrValue(name)
  const [fromRes, toRes] = await Promise.all([
    supabaseAdmin
      .from('all_whale_transactions')
      .select('from_address, usd_value')
      .eq('from_label', name)
      .limit(5000),
    supabaseAdmin
      .from('all_whale_transactions')
      .select('to_address, usd_value')
      .eq('to_label', name)
      .limit(5000),
  ])

  // `safe` is used only when falling back via .or(); we explicitly `.eq`
  // here, so avoid an unused-var lint by referencing it.
  void safe

  const map = new Map()
  const bump = (addr, usd) => {
    if (!addr) return
    let rec = map.get(addr)
    if (!rec) {
      rec = { address: addr, tx_count: 0, volume: 0 }
      map.set(addr, rec)
    }
    rec.tx_count += 1
    rec.volume += Number(usd || 0)
  }
  for (const r of fromRes.data || []) bump(r.from_address, r.usd_value)
  for (const r of toRes.data || []) bump(r.to_address, r.usd_value)

  return Array.from(map.values())
    .sort((a, b) => b.tx_count - a.tx_count)
    .slice(0, 20)
}

// Supabase `or()` takes a comma-separated string; commas/parens inside
// values break the parser. Quote the value and escape embedded quotes.
function escapeOrValue(v) {
  const s = String(v || '').replace(/"/g, '\\"')
  return `"${s}"`
}

export async function generateMetadata({ params }) {
  const name = decodeURIComponent(params.name)
  const stats = await fetchEntityStats(name)
  const canonical = `https://www.sonartracker.io/entity/${encodeURIComponent(name)}`

  if (!stats || stats.tx_count === 0) {
    const title = `${name} — Entity Not Found | Sonar`
    const description = `No whale activity found for ${name} on Sonar.`
    return {
      title,
      description,
      robots: { index: false, follow: false },
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: 'article' },
    }
  }

  const title = `${name} — Whale Activity | Sonar`
  const description = `${name}: ${stats.tx_count.toLocaleString()} whale transactions totaling ${formatVolume(
    stats.total_volume
  )} tracked by Sonar across ${stats.chain_count} chain${stats.chain_count === 1 ? '' : 's'}.`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'article' },
    twitter: { title, description, card: 'summary_large_image' },
  }
}

function EntityNotFoundView({ name }) {
  return (
    <AuthGuard>
      <main className="container" style={{ padding: '2rem' }}>
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'linear-gradient(135deg, #0d2134 0%, #122a40 100%)',
            border: '1px solid rgba(54, 166, 186, 0.2)',
            borderRadius: '16px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔎</div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Entity not found
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            We could not find any whale activity for:
          </p>
          <code
            style={{
              display: 'inline-block',
              padding: '0.5rem 0.75rem',
              background: 'rgba(54, 166, 186, 0.08)',
              border: '1px solid rgba(54, 166, 186, 0.2)',
              borderRadius: '8px',
              color: 'var(--text-secondary)',
              fontFamily: "'Courier New', monospace",
              fontSize: '0.85rem',
              wordBreak: 'break-all',
              marginBottom: '1.5rem',
            }}
          >
            {name}
          </code>
          <div>
            <a
              href="/entities"
              style={{
                display: 'inline-block',
                padding: '0.65rem 1.5rem',
                background: 'rgba(54, 166, 186, 0.2)',
                border: '1px solid rgba(54, 166, 186, 0.4)',
                borderRadius: '12px',
                color: '#36a6ba',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              ← Back to all entities
            </a>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: '140px',
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '14px',
        padding: '1rem 1.1rem',
      }}
    >
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '1px',
          color: '#36a6ba',
          textTransform: 'uppercase',
          marginBottom: '0.35rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  )
}

function ClassificationPill({ classification }) {
  const key = String(classification || '').toUpperCase()
  const scheme = CLASSIFICATION_COLORS[key] || CLASSIFICATION_COLORS.TRANSFER
  const label = key || 'TRANSFER'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.65rem',
        background: scheme.bg,
        border: `1px solid ${scheme.border}`,
        borderRadius: '999px',
        color: scheme.color,
        fontWeight: 700,
        fontSize: '0.7rem',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </span>
  )
}

function TxCard({ tx, entityName }) {
  const token = tx.token_symbol || 'TOKEN'
  const usd = formatVolume(tx.usd_value)
  const showReasoning = isNarrativeReasoning(tx.reasoning)
  const fromDisplay = tx.from_label || truncateAddress(tx.from_address)
  const toDisplay = tx.to_label || truncateAddress(tx.to_address)
  const fromIsThis = tx.from_label === entityName
  const toIsThis = tx.to_label === entityName

  return (
    <a
      href={`/tx/${encodeURIComponent(tx.transaction_hash)}`}
      style={{
        display: 'block',
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '14px',
        padding: '1rem 1.1rem',
        textDecoration: 'none',
        color: 'var(--text-primary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            padding: '0.3rem 0.65rem',
            background:
              'linear-gradient(135deg, rgba(54, 166, 186, 0.22) 0%, rgba(41, 128, 185, 0.18) 100%)',
            border: '1px solid rgba(54, 166, 186, 0.4)',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.82rem',
            letterSpacing: '0.3px',
          }}
        >
          {token}
        </span>
        <ClassificationPill classification={tx.classification} />
        <span
          style={{
            marginLeft: 'auto',
            fontWeight: 800,
            fontSize: '1.05rem',
            color: 'var(--text-primary)',
          }}
        >
          {usd}
        </span>
      </div>

      <div
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          marginBottom: '0.35rem',
          wordBreak: 'break-word',
        }}
      >
        <span style={{ color: '#9aa7b8' }}>From:</span>{' '}
        <span
          style={{
            color: fromIsThis ? '#36a6ba' : 'var(--text-primary)',
            fontWeight: fromIsThis ? 700 : 500,
          }}
        >
          {fromDisplay}
        </span>
        {'  '}
        <span style={{ color: '#9aa7b8' }}>→ To:</span>{' '}
        <span
          style={{
            color: toIsThis ? '#36a6ba' : 'var(--text-primary)',
            fontWeight: toIsThis ? 700 : 500,
          }}
        >
          {toDisplay}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          flexWrap: 'wrap',
        }}
      >
        <span>{chainDisplay(tx.blockchain)}</span>
        <span>·</span>
        <span>{relativeTime(tx.timestamp)}</span>
      </div>

      {showReasoning && (
        <div
          style={{
            marginTop: '0.7rem',
            paddingTop: '0.7rem',
            borderTop: '1px solid rgba(54, 166, 186, 0.15)',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            fontStyle: 'italic',
            lineHeight: 1.5,
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontStyle: 'normal', flexShrink: 0 }}>✨</span>
          <span>{String(tx.reasoning).trim()}</span>
        </div>
      )}
    </a>
  )
}

function TopTokensCard({ tokens }) {
  const max = tokens.length > 0 ? tokens[0].volume || 1 : 1
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1rem',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '1px',
          color: '#36a6ba',
          textTransform: 'uppercase',
          marginBottom: '0.85rem',
        }}
      >
        Top Tokens
      </div>
      {tokens.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No token data.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {tokens.map((t) => {
            const pct = max > 0 ? Math.max(3, Math.round((t.volume / max) * 100)) : 0
            return (
              <div key={t.token_symbol} style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t.token_symbol}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    {formatVolume(t.volume)} · {t.tx_count.toLocaleString()} tx
                  </span>
                </div>
                <div
                  style={{
                    height: '6px',
                    background: 'rgba(54, 166, 186, 0.08)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background:
                        'linear-gradient(90deg, #36a6ba 0%, #2980b9 100%)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AddressesCard({ addresses }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px',
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '1px',
          color: '#36a6ba',
          textTransform: 'uppercase',
          marginBottom: '0.85rem',
        }}
      >
        Associated Addresses
      </div>
      {addresses.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No associated addresses.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {addresses.slice(0, 10).map((a) => (
            <a
              key={a.address}
              href={`/whale/${encodeURIComponent(a.address)}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.7rem',
                background: 'rgba(54, 166, 186, 0.06)',
                border: '1px solid rgba(54, 166, 186, 0.15)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
                textDecoration: 'none',
              }}
            >
              <code
                title={a.address}
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {truncateAddress(a.address)}
              </code>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}
              >
                {a.tx_count.toLocaleString()} tx
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function EntityDetailPage({ params }) {
  const name = decodeURIComponent(params.name)

  const [stats, recentTxs, topTokens, associatedAddresses] = await Promise.all([
    fetchEntityStats(name),
    fetchRecentTxs(name),
    fetchTopTokens(name),
    fetchAssociatedAddresses(name),
  ])

  const empty =
    !stats ||
    (stats.tx_count === 0 &&
      recentTxs.length === 0 &&
      topTokens.length === 0 &&
      associatedAddresses.length === 0)

  if (empty) return <EntityNotFoundView name={name} />

  const entityType = inferEntityType(name)
  const typeStyle = entityTypeStyle(entityType)

  return (
    <AuthGuard>
      <main
        className="container"
        style={{
          padding: '2rem 1rem',
          maxWidth: '1200px',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ marginBottom: '1rem' }}>
          <a
            href="/entities"
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            ← Entities
          </a>
        </div>

        {/* HEADER */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
            border: '1px solid rgba(54, 166, 186, 0.25)',
            borderRadius: '20px',
            padding: '1.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '0.9rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <h1
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                margin: 0,
                color: 'var(--text-primary)',
                wordBreak: 'break-word',
                flex: 1,
                minWidth: 0,
              }}
            >
              {name}
            </h1>
            <span
              style={{
                padding: '0.35rem 0.85rem',
                background: typeStyle.bg,
                border: `1px solid ${typeStyle.border}`,
                borderRadius: '999px',
                color: typeStyle.color,
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              {entityType}
            </span>
            <div style={{ flexShrink: 0 }}>
              <FollowButton entityType="label" entityRef={name} />
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <StatCard
              label="Transactions"
              value={stats.tx_count.toLocaleString()}
            />
            <StatCard
              label="Tracked Volume"
              value={formatVolume(stats.total_volume)}
            />
            <StatCard label="Chains" value={String(stats.chain_count)} />
            <StatCard
              label="Addresses"
              value={stats.address_count.toLocaleString()}
            />
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(54, 166, 186, 0.15)',
            }}
          >
            <div>
              <span style={{ opacity: 0.7 }}>First seen: </span>
              <span style={{ color: 'var(--text-primary)' }}>
                {absoluteTime(stats.first_seen)}
              </span>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>Last active: </span>
              <span style={{ color: 'var(--text-primary)' }}>
                {relativeTime(stats.last_active)}
              </span>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN MAIN */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
            gap: '1.25rem',
            alignItems: 'start',
          }}
          className="entity-main-grid"
        >
          {/* LEFT: Recent activity */}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '1px',
                color: '#36a6ba',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
              }}
            >
              Recent Whale Moves
            </div>
            {recentTxs.length === 0 ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
                  border: '1px solid rgba(54, 166, 186, 0.2)',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  color: 'var(--text-secondary)',
                }}
              >
                No recent whale moves.
              </div>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}
              >
                {recentTxs.map((tx) => (
                  <TxCard
                    key={tx.transaction_hash}
                    tx={tx}
                    entityName={name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Sidebar */}
          <div style={{ minWidth: 0 }}>
            <TopTokensCard tokens={topTokens} />
            <AddressesCard addresses={associatedAddresses} />
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '2rem 0 1rem' }}>
          <a
            href="/entities"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            ← Back to all entities
          </a>
        </div>

        <style>{`
          @media (max-width: 820px) {
            .entity-main-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </main>
    </AuthGuard>
  )
}
