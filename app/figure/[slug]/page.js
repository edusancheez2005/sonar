import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import FollowButton from '@/app/components/entities/FollowButton'
import EntityAvatar from '@/app/components/entities/EntityAvatar'
import { fetchChainTxsForAddresses } from '@/app/lib/chainFetchers'
import {
  CLASSIFICATION_COLORS,
  chainDisplay,
  truncateAddress,
  formatVolume,
  relativeTime,
  absoluteTime,
  isNarrativeReasoning,
  categoryStyle,
  categoryLabel,
} from '@/app/lib/entityHelpers'

export const dynamic = 'force-dynamic'

const OG_IMAGE_URL = 'https://www.sonartracker.io/screenshots/stats-dashboard.png'

async function fetchFigure(slug) {
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, description, category, avatar_url, twitter_handle, is_featured, addresses, submission_status')
    .eq('slug', slug)
    .maybeSingle()
  if (error) return null
  if (!data) return null
  // Non-approved submissions (pending / rejected) are hidden from the
  // public detail page too — treat them as 404 so the metadata + body
  // both fall back to the NotFoundView.
  if (data.submission_status && data.submission_status !== 'approved') return null
  return data
}

function normalizeAddresses(addresses) {
  if (!Array.isArray(addresses)) return []
  return addresses
    .map((a) => ({
      address: String(a?.address || '').trim(),
      chain: String(a?.chain || '').toLowerCase().trim() || null,
      note: a?.note || null,
    }))
    .filter((a) => a.address !== '')
}

function addrListLiteral(addrs) {
  // PostgREST `.in.(...)` accepts comma-separated values; addresses are
  // hex or Base58 so no further escaping is needed.
  return `(${addrs.map((a) => a.address).join(',')})`
}

async function fetchRecentTxs(addrs) {
  if (addrs.length === 0) return []
  const list = addrListLiteral(addrs)
  const { data, error } = await supabaseAdmin
    .from('all_whale_transactions')
    .select(
      'transaction_hash, token_symbol, usd_value, blockchain, from_address, to_address, from_label, to_label, reasoning, timestamp, classification'
    )
    .or(`from_address.in.${list},to_address.in.${list}`)
    .order('timestamp', { ascending: false })
    .limit(50)
  if (error) return []
  // Tag with source='sonar' so the merge downstream can prefer these on
  // hash collisions and the UI can pick the right badge.
  return (data || []).map((r) => ({
    ...r,
    source: 'sonar',
    amount_native: null,
  }))
}

function mergeSonarAndChain(sonarTxs, chainTxs) {
  const byHash = new Map()
  for (const tx of sonarTxs) {
    if (!tx.transaction_hash) continue
    byHash.set(tx.transaction_hash, tx)
  }
  for (const tx of chainTxs) {
    if (!tx.transaction_hash) continue
    if (!byHash.has(tx.transaction_hash)) {
      byHash.set(tx.transaction_hash, tx)
    }
  }
  return [...byHash.values()].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )
}

// Aggregate top tokens client-side from the merged Sonar + chain feed.
// Chain-direct rows often have null usd_value (no price snapshot), so
// we sort by volume when ANY row has a usd_value and fall back to tx
// count otherwise. This prevents "0 volume" hiding the real signal.
function aggregateTopTokens(txs, topN = 5) {
  const map = new Map()
  let anyVolume = false
  for (const tx of txs) {
    const key = tx.token_symbol || 'UNKNOWN'
    let rec = map.get(key)
    if (!rec) {
      rec = { token_symbol: key, tx_count: 0, volume: 0 }
      map.set(key, rec)
    }
    rec.tx_count += 1
    const v = Number(tx.usd_value)
    if (Number.isFinite(v) && v > 0) {
      rec.volume += v
      anyVolume = true
    }
  }
  const arr = Array.from(map.values())
  arr.sort((a, b) =>
    anyVolume ? (b.volume - a.volume) || (b.tx_count - a.tx_count) : b.tx_count - a.tx_count
  )
  return { tokens: arr.slice(0, topN), anyVolume }
}

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug)
  const figure = await fetchFigure(slug)
  const canonical = `https://www.sonartracker.io/figure/${encodeURIComponent(slug)}`

  if (!figure) {
    const title = 'Figure not found | Sonar'
    const description = 'This public figure could not be found on Sonar.'
    return {
      title,
      description,
      robots: { index: false, follow: false },
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: 'article',
        siteName: 'Sonar Tracker',
        images: [
          {
            url: OG_IMAGE_URL,
            width: 1200,
            height: 630,
            alt: 'Sonar Tracker',
          },
        ],
      },
      twitter: {
        title,
        description,
        card: 'summary_large_image',
        images: [OG_IMAGE_URL],
      },
    }
  }

  const title = `${figure.display_name} — Whale Activity | Sonar`
  const description = figure.description
    ? `${figure.description}. Track ${figure.display_name}'s on-chain whale activity on Sonar.`
    : `Track ${figure.display_name}'s on-chain whale activity on Sonar.`

  const ogImage = figure.avatar_url || OG_IMAGE_URL
  const imageAlt = `${figure.display_name} — whale activity on Sonar`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'profile',
      siteName: 'Sonar Tracker',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      title,
      description,
      card: 'summary_large_image',
      images: [ogImage],
      creator: figure.twitter_handle ? `@${figure.twitter_handle}` : undefined,
      site: '@sonartracker',
    },
  }
}

function NotFoundView({ slug }) {
  return (
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
            Figure not found
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            We could not find a public figure with slug:
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
            {slug}
          </code>
          <div>
            <a
              href="/figures"
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
              ← Back to public figures
            </a>
          </div>
        </div>
      </main>
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
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px',
          color: '#36a6ba', textTransform: 'uppercase', marginBottom: '0.35rem',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
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
        display: 'inline-block', padding: '0.25rem 0.65rem',
        background: scheme.bg, border: `1px solid ${scheme.border}`,
        borderRadius: '999px', color: scheme.color,
        fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.5px',
      }}
    >
      {label}
    </span>
  )
}

function ChainDirectBadge() {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.65rem',
        background: 'rgba(154, 167, 184, 0.12)',
        border: '1px solid rgba(154, 167, 184, 0.35)',
        borderRadius: '999px',
        color: '#9aa7b8',
        fontWeight: 700,
        fontSize: '0.7rem',
        letterSpacing: '0.5px',
      }}
    >
      CHAIN DIRECT
    </span>
  )
}

function formatNativeAmount(amount, symbol) {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) {
    return null
  }
  const n = Number(amount)
  const sym = symbol || ''
  if (n === 0) return `0 ${sym}`.trim()
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs < 0.001) return `<0.001 ${sym}`.trim()
  if (abs < 1) return `${sign}${abs.toFixed(4)} ${sym}`.trim()
  if (abs < 1000) return `${sign}${abs.toFixed(2)} ${sym}`.trim()
  return `${sign}${Math.round(abs).toLocaleString()} ${sym}`.trim()
}

function TxCard({ tx, ownedAddresses }) {
  const token = tx.token_symbol || 'TOKEN'
  const isChainDirect = tx.source === 'chain_api'
  const hasUsd =
    tx.usd_value !== null && tx.usd_value !== undefined && Number(tx.usd_value) !== 0
  const primaryAmount = hasUsd
    ? formatVolume(tx.usd_value)
    : formatNativeAmount(tx.amount_native, tx.token_symbol) || '—'
  const showReasoning = !isChainDirect && isNarrativeReasoning(tx.reasoning)
  const fromDisplay = tx.from_label || truncateAddress(tx.from_address)
  const toDisplay = tx.to_label || truncateAddress(tx.to_address)
  const fromOwned = ownedAddresses.has(tx.from_address)
  const toOwned = ownedAddresses.has(tx.to_address)
  return (
    <a
      href={`/tx/${encodeURIComponent(tx.transaction_hash)}`}
      style={{
        display: 'block',
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '14px', padding: '1rem 1.1rem',
        textDecoration: 'none', color: 'var(--text-primary)',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span
          style={{
            padding: '0.3rem 0.65rem',
            background: 'linear-gradient(135deg, rgba(54, 166, 186, 0.22) 0%, rgba(41, 128, 185, 0.18) 100%)',
            border: '1px solid rgba(54, 166, 186, 0.4)',
            borderRadius: '10px', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.3px',
          }}
        >
          {token}
        </span>
        {isChainDirect ? (
          <ChainDirectBadge />
        ) : (
          <ClassificationPill classification={tx.classification} />
        )}
        <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
          {primaryAmount}
        </span>
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.35rem', wordBreak: 'break-word' }}>
        <span style={{ color: '#9aa7b8' }}>From:</span>{' '}
        <span style={{ color: fromOwned ? '#36a6ba' : 'var(--text-primary)', fontWeight: fromOwned ? 700 : 500 }}>
          {fromDisplay}
        </span>
        {'  '}
        <span style={{ color: '#9aa7b8' }}>→ To:</span>{' '}
        <span style={{ color: toOwned ? '#36a6ba' : 'var(--text-primary)', fontWeight: toOwned ? 700 : 500 }}>
          {toDisplay}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
        <span>{chainDisplay(tx.blockchain)}</span>
        <span>·</span>
        <span>{relativeTime(tx.timestamp)}</span>
      </div>
      {showReasoning && (
        <div
          style={{
            marginTop: '0.7rem', paddingTop: '0.7rem',
            borderTop: '1px solid rgba(54, 166, 186, 0.15)',
            fontSize: '0.85rem', color: 'var(--text-primary)',
            fontStyle: 'italic', lineHeight: 1.5,
            display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
          }}
        >
          <span style={{ fontStyle: 'normal', flexShrink: 0 }}>✨</span>
          <span>{String(tx.reasoning).trim()}</span>
        </div>
      )}
    </a>
  )
}

function TopTokensCard({ tokens, anyVolume }) {
  // Choose the bar metric based on what signal we actually have.
  const maxMetric = (t) => (anyVolume ? t.volume : t.tx_count)
  const max = tokens.length > 0 ? maxMetric(tokens[0]) || 1 : 1
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px',
          color: '#36a6ba', textTransform: 'uppercase', marginBottom: '0.85rem',
        }}
      >
        Top Tokens
      </div>
      {tokens.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No token data.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {tokens.map((t) => {
            const metric = maxMetric(t)
            const pct = max > 0 ? Math.max(3, Math.round((metric / max) * 100)) : 0
            const secondary = anyVolume
              ? `${formatVolume(t.volume)} · ${t.tx_count.toLocaleString()} tx`
              : `(${t.tx_count.toLocaleString()} ${t.tx_count === 1 ? 'tx' : 'txs'})`
            return (
              <div key={t.token_symbol} style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.token_symbol}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    {secondary}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(54, 166, 186, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${pct}%`, height: '100%',
                      background: 'linear-gradient(90deg, #36a6ba 0%, #2980b9 100%)',
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

function VerifiedAddressesCard({ addrs }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px', padding: '1.25rem',
      }}
    >
      <div
        style={{
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px',
          color: '#36a6ba', textTransform: 'uppercase', marginBottom: '0.85rem',
        }}
      >
        Verified Addresses
      </div>
      {addrs.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No verified addresses yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {addrs.map((a) => (
            <a
              key={`${a.chain}-${a.address}`}
              href={`/whale/${encodeURIComponent(a.address)}`}
              style={{
                display: 'flex', flexDirection: 'column', gap: '0.25rem',
                padding: '0.55rem 0.7rem',
                background: 'rgba(54, 166, 186, 0.06)',
                border: '1px solid rgba(54, 166, 186, 0.15)',
                borderRadius: '10px',
                color: 'var(--text-primary)', textDecoration: 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <code
                  title={a.address}
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                >
                  {truncateAddress(a.address)}
                </code>
                <span style={{ fontSize: '0.7rem', color: '#36a6ba', fontWeight: 700, flexShrink: 0 }}>
                  {chainDisplay(a.chain)}
                </span>
              </div>
              {a.note ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  {a.note}
                </div>
              ) : null}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function FigureDetailPage({ params }) {
  const slug = decodeURIComponent(params.slug)
  const figure = await fetchFigure(slug)
  if (!figure) return <NotFoundView slug={slug} />

  const addrs = normalizeAddresses(figure.addresses)
  const hasAddresses = addrs.length > 0

  // Sonar queries + on-demand chain fetch run in parallel. The chain
  // fetch has its own 5 s budget inside `fetchChainTxsForAddresses`, so
  // nothing here waits longer than ~5 s even when providers stall.
  // Stats, first-seen/last-active, and top tokens all derive from the
  // merged feed below so they agree with what's rendered on the page.
  const [sonarRecent, chainFetch] = await Promise.all([
    hasAddresses ? fetchRecentTxs(addrs) : Promise.resolve([]),
    hasAddresses
      ? fetchChainTxsForAddresses(addrs, { limit: 20, budgetMs: 5000 })
      : Promise.resolve({ txs: [], timedOut: false, errors: 0 }),
  ])

  const mergedAll = mergeSonarAndChain(sonarRecent, chainFetch.txs)
  const recentTxs = mergedAll.slice(0, 100)
  const chainDataDegraded = chainFetch.timedOut || chainFetch.errors > 0

  // Stats computed from the merged feed — source of truth for the
  // stat cards so "47 transactions, $0 volume" contradictions vanish.
  const txCount = mergedAll.length
  const trackedVolume = mergedAll.reduce(
    (sum, tx) => sum + (Number(tx.usd_value) || 0),
    0
  )
  const chainCount = new Set(
    mergedAll.map((tx) => tx.blockchain).filter(Boolean)
  ).size
  const addressCount = addrs.length

  const timestampsMs = mergedAll
    .map((tx) => new Date(tx.timestamp).getTime())
    .filter((t) => Number.isFinite(t))
  const firstSeen = timestampsMs.length ? new Date(Math.min(...timestampsMs)) : null
  const lastActive = timestampsMs.length ? new Date(Math.max(...timestampsMs)) : null

  const { tokens: topTokens, anyVolume: topTokensHasVolume } = aggregateTopTokens(
    mergedAll,
    5
  )

  const ownedSet = new Set(addrs.map((a) => a.address))
  const catStyle = categoryStyle(figure.category)

  return (
    <main
      className="container"
      style={{
        padding: '2rem 1rem',
        maxWidth: '1200px',
        color: 'var(--text-primary)',
      }}
    >
        <div style={{ marginBottom: '1rem' }}>
          <a href="/figures" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            ← Public figures
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
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <EntityAvatar
              avatarUrl={figure.avatar_url}
              twitterHandle={figure.twitter_handle}
              displayName={figure.display_name}
              category={figure.category}
              size={80}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  minWidth: 0,
                }}
              >
                <h1
                  style={{
                    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                    fontWeight: 800, lineHeight: 1.15, margin: 0,
                    color: 'var(--text-primary)', wordBreak: 'break-word',
                  }}
                >
                  {figure.display_name}
                </h1>
                {figure.twitter_handle ? (
                  <a
                    href={`https://twitter.com/${figure.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '1rem',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    @{figure.twitter_handle}
                  </a>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: catStyle.bg,
                    border: `1px solid ${catStyle.border}`,
                    borderRadius: '999px',
                    color: catStyle.color,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  {categoryLabel(figure.category)}
                </span>
                <span
                  title="This figure's addresses have been verified by Sonar"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.25rem 0.7rem',
                    background: 'rgba(54, 166, 186, 0.15)',
                    border: '1px solid rgba(54, 166, 186, 0.45)',
                    borderRadius: '999px',
                    color: '#36a6ba',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                  }}
                >
                  ✓ Verified public figure
                </span>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <FollowButton entityType="curated" entityRef={figure.slug} />
            </div>
          </div>

          {hasAddresses ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <StatCard label="Transactions" value={txCount.toLocaleString()} />
              <StatCard
                label="Tracked Volume"
                value={
                  trackedVolume > 0
                    ? formatVolume(trackedVolume)
                    : txCount > 0
                      ? '—'
                      : '$0'
                }
              />
              <StatCard label="Chains" value={String(chainCount)} />
              <StatCard label="Addresses" value={addressCount.toLocaleString()} />
            </div>
          ) : null}

          {figure.description ? (
            <p
              style={{
                margin: hasAddresses ? '0 0 0.75rem 0' : '0',
                color: 'var(--text-secondary)',
                fontSize: '0.95rem',
                lineHeight: 1.55,
              }}
            >
              {figure.description}
            </p>
          ) : null}

          {hasAddresses && (firstSeen || lastActive) ? (
            <div
              style={{
                display: 'flex', flexWrap: 'wrap', gap: '1.5rem',
                fontSize: '0.82rem', color: 'var(--text-secondary)',
                paddingTop: '0.75rem', borderTop: '1px solid rgba(54, 166, 186, 0.15)',
              }}
            >
              {firstSeen ? (
                <div>
                  <span style={{ opacity: 0.7 }}>First seen: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{absoluteTime(firstSeen)}</span>
                </div>
              ) : null}
              {lastActive ? (
                <div>
                  <span style={{ opacity: 0.7 }}>Last active: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{relativeTime(lastActive)}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* NO-ADDRESSES CALLOUT */}
        {!hasAddresses ? (
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(54, 166, 186, 0.12) 0%, rgba(155, 89, 182, 0.08) 100%)',
              border: '1px solid rgba(54, 166, 186, 0.35)',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              No verified public addresses yet.
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.55 }}>
              Following activity will be enabled when addresses are confirmed.
              You can still follow this figure to be notified once they land.
            </div>
          </div>
        ) : null}

        {/* MAIN TWO-COLUMN */}
        {hasAddresses ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
              gap: '1.25rem',
              alignItems: 'start',
            }}
            className="figure-main-grid"
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px',
                  color: '#36a6ba', textTransform: 'uppercase', marginBottom: '0.75rem',
                }}
              >
                Recent Whale Moves
              </div>
              {chainDataDegraded ? (
                <div
                  style={{
                    marginBottom: '0.7rem',
                    padding: '0.6rem 0.85rem',
                    background: 'rgba(241, 196, 15, 0.08)',
                    border: '1px solid rgba(241, 196, 15, 0.3)',
                    borderRadius: '10px',
                    color: '#f1c40f',
                    fontSize: '0.8rem',
                    lineHeight: 1.4,
                  }}
                >
                  Some chain data unavailable. Showing Sonar whale activity
                  plus whatever chain-direct results loaded within the time
                  budget.
                </div>
              ) : null}
              {recentTxs.length === 0 ? (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
                    border: '1px solid rgba(54, 166, 186, 0.2)',
                    borderRadius: '14px', padding: '1.5rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  No recent whale moves at these addresses.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {recentTxs.map((tx) => (
                    <TxCard key={tx.transaction_hash} tx={tx} ownedAddresses={ownedSet} />
                  ))}
                </div>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <TopTokensCard tokens={topTokens} anyVolume={topTokensHasVolume} />
              <VerifiedAddressesCard addrs={addrs} />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: '1.25rem',
            }}
          >
            <VerifiedAddressesCard addrs={addrs} />
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '2rem 0 1rem' }}>
          <a href="/figures" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textDecoration: 'none' }}>
            ← Back to public figures
          </a>
        </div>

      <style>{`
        @media (max-width: 820px) {
          .figure-main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  )
}
