import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'
import CopyButton from './CopyButton'

const CHAIN_NAMES = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  solana: 'Solana',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  base: 'Base',
  xrp: 'XRP',
}

const EXPLORERS = {
  bitcoin: { name: 'Mempool.space', url: (h) => `https://mempool.space/tx/${h}` },
  ethereum: { name: 'Etherscan', url: (h) => `https://etherscan.io/tx/${h}` },
  polygon: { name: 'Polygonscan', url: (h) => `https://polygonscan.com/tx/${h}` },
  arbitrum: { name: 'Arbiscan', url: (h) => `https://arbiscan.io/tx/${h}` },
  base: { name: 'Basescan', url: (h) => `https://basescan.org/tx/${h}` },
  solana: { name: 'Solscan', url: (h) => `https://solscan.io/tx/${h}` },
  xrp: { name: 'XRPL Explorer', url: (h) => `https://livenet.xrpl.org/transactions/${h}` },
}

const CLASSIFICATION_COLORS = {
  BUY: { color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.15)', border: 'rgba(46, 204, 113, 0.4)' },
  SELL: { color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.15)', border: 'rgba(231, 76, 60, 0.4)' },
  TRANSFER: { color: '#9aa7b8', bg: 'rgba(154, 167, 184, 0.12)', border: 'rgba(154, 167, 184, 0.35)' },
}

const NON_NARRATIVE_PREFIXES = [
  'Stage ',
  'Classification:',
  'Score:',
  'N/A',
  'Priority phase:',
  'Phase:',
  'Strategy:',
  'Scoring:',
  'Confidence:',
]

function compactUSD(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n) || n === 0) return '$0'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const tiers = [
    { v: 1e12, s: 'T' },
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'K' },
  ]
  for (const t of tiers) {
    if (abs >= t.v) {
      const scaled = abs / t.v
      const str = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1).replace(/\.0$/, '')
      return `${sign}$${str}${t.s}`
    }
  }
  return `${sign}$${abs.toFixed(0)}`
}

function chainDisplay(chain) {
  if (!chain) return 'Unknown'
  const key = String(chain).toLowerCase()
  return CHAIN_NAMES[key] || (key.charAt(0).toUpperCase() + key.slice(1))
}

function truncateAddress(addr) {
  if (!addr) return '—'
  const s = String(addr)
  if (s.length <= 12) return s
  return `${s.slice(0, 6)}…${s.slice(-4)}`
}

function explorerInfo(chain) {
  const key = String(chain || '').toLowerCase()
  return EXPLORERS[key] || null
}

function isNarrativeReasoning(text) {
  if (text === null || text === undefined) return false
  const t = String(text)
  if (t === '') return false
  if (t.trim().length <= 20) return false
  return !NON_NARRATIVE_PREFIXES.some((p) => t.startsWith(p))
}

function relativeTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${Math.max(sec, 0)}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.round(day / 30)
  if (mo < 12) return `${mo}mo ago`
  const yr = Math.round(day / 365)
  return `${yr}y ago`
}

function absoluteTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '—'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mo = months[d.getUTCMonth()]
  const day = d.getUTCDate()
  const yr = d.getUTCFullYear()
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${mo} ${day}, ${yr} · ${hh}:${mm} UTC`
}

async function fetchTransaction(hash) {
  try {
    const { data, error } = await supabaseAdmin
      .from('all_whale_transactions')
      .select(
        'transaction_hash, token_symbol, usd_value, blockchain, from_address, to_address, from_label, to_label, reasoning, timestamp, classification, whale_address, whale_score, is_cex_transaction'
      )
      .eq('transaction_hash', hash)
      .maybeSingle()
    if (error) return null
    return data || null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }) {
  const hash = decodeURIComponent(params.hash)
  const tx = await fetchTransaction(hash)
  const canonical = `https://www.sonartracker.io/tx/${hash}`

  if (!tx) {
    const title = 'Transaction not found | Sonar Tracker'
    const description = 'This whale transaction could not be found on Sonar.'
    return {
      title,
      description,
      robots: { index: false, follow: false },
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: 'article' },
    }
  }

  const chainName = chainDisplay(tx.blockchain)
  const token = tx.token_symbol || 'Token'
  const usd = compactUSD(tx.usd_value)
  const title = `${usd} ${token} on ${chainName} | Sonar Tracker`
  const description = isNarrativeReasoning(tx.reasoning)
    ? String(tx.reasoning).trim()
    : `Whale transaction detail on ${chainName}. Amount, parties, and analysis on Sonar.`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
    },
    twitter: { title, description, card: 'summary_large_image' },
  }
}

function NotFoundView({ hash }) {
  return (
    <AuthGuard>
      <main className="container" style={{ padding: '2rem' }}>
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            background: 'linear-gradient(135deg, #0d2134 0%, #122a40 100%)',
            border: '1px solid rgba(54, 166, 186, 0.2)',
            borderRadius: '16px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔎</div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Transaction not found</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            We could not find a whale transaction with hash:
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
            {hash}
          </code>
          <div>
            <a
              href="/statistics"
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
              ← Back to latest whale transactions
            </a>
          </div>
        </div>
      </main>
    </AuthGuard>
  )
}

function ClassificationBadge({ classification }) {
  const key = String(classification || '').toUpperCase()
  const scheme = CLASSIFICATION_COLORS[key] || CLASSIFICATION_COLORS.TRANSFER
  const label = key || 'TRANSFER'
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.35rem 0.85rem',
        background: scheme.bg,
        border: `1px solid ${scheme.border}`,
        borderRadius: '999px',
        color: scheme.color,
        fontWeight: 700,
        fontSize: '0.8rem',
        letterSpacing: '0.5px',
      }}
    >
      {label}
    </span>
  )
}

function PartyCard({ title, label, address, chain }) {
  const explorer = explorerInfo(chain)
  const safeAddr = address || ''
  const hasAddr = safeAddr.length > 0
  const explorerAddrUrl = (() => {
    if (!hasAddr || !explorer) return null
    const key = String(chain || '').toLowerCase()
    if (key === 'bitcoin') return `https://mempool.space/address/${safeAddr}`
    if (key === 'ethereum') return `https://etherscan.io/address/${safeAddr}`
    if (key === 'polygon') return `https://polygonscan.com/address/${safeAddr}`
    if (key === 'arbitrum') return `https://arbiscan.io/address/${safeAddr}`
    if (key === 'base') return `https://basescan.org/address/${safeAddr}`
    if (key === 'solana') return `https://solscan.io/account/${safeAddr}`
    if (key === 'xrp') return `https://livenet.xrpl.org/accounts/${safeAddr}`
    return null
  })()

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d2134 0%, #112a40 100%)',
        border: '1px solid rgba(54, 166, 186, 0.2)',
        borderRadius: '16px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '1px',
          color: '#36a6ba',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>

      {label ? (
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {label}
        </div>
      ) : (
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          Unknown entity
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <code
          title={safeAddr}
          style={{
            padding: '0.3rem 0.55rem',
            background: 'rgba(54, 166, 186, 0.08)',
            border: '1px solid rgba(54, 166, 186, 0.2)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            fontFamily: "'Courier New', monospace",
            fontSize: '0.85rem',
          }}
        >
          {truncateAddress(safeAddr)}
        </code>
        {hasAddr && <CopyButton value={safeAddr} label="address" />}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        {hasAddr && (
          <a
            href={`/whale/${encodeURIComponent(safeAddr)}`}
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#36a6ba',
              textDecoration: 'none',
            }}
          >
            View whale profile →
          </a>
        )}
        {explorerAddrUrl && (
          <a
            href={explorerAddrUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            View on {explorer.name} ↗
          </a>
        )}
      </div>
    </div>
  )
}

export default async function TransactionDetailPage({ params }) {
  const rawHash = decodeURIComponent(params.hash)
  const tx = await fetchTransaction(rawHash)

  if (!tx) return <NotFoundView hash={rawHash} />

  const chain = tx.blockchain
  const chainName = chainDisplay(chain)
  const explorer = explorerInfo(chain)
  const token = tx.token_symbol || 'TOKEN'
  const usd = compactUSD(tx.usd_value)
  const showReasoning = isNarrativeReasoning(tx.reasoning)

  return (
    <AuthGuard>
      <main
        className="container"
        style={{
          padding: '2rem 1rem',
          maxWidth: '1100px',
          color: 'var(--text-primary)',
        }}
      >
        {/* Breadcrumb-ish back link */}
        <div style={{ marginBottom: '1rem' }}>
          <a
            href="/statistics"
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            ← Whale transactions
          </a>
        </div>

        {/* HEADER CARD */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
            border: '1px solid rgba(54, 166, 186, 0.25)',
            borderRadius: '20px',
            padding: '1.75rem',
            marginBottom: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.55rem 1.1rem',
                background:
                  'linear-gradient(135deg, rgba(54, 166, 186, 0.22) 0%, rgba(41, 128, 185, 0.18) 100%)',
                border: '2px solid rgba(54, 166, 186, 0.45)',
                borderRadius: '14px',
                color: 'var(--text-primary)',
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '0.5px',
              }}
            >
              {token}
            </span>
            <ClassificationBadge classification={tx.classification} />
            {tx.is_cex_transaction ? (
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  background: 'rgba(241, 196, 15, 0.12)',
                  border: '1px solid rgba(241, 196, 15, 0.35)',
                  borderRadius: '999px',
                  color: '#f1c40f',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                CEX
              </span>
            ) : null}
          </div>

          <div
            style={{
              fontSize: 'clamp(2rem, 6vw, 3.25rem)',
              fontWeight: 800,
              lineHeight: 1.05,
              marginBottom: '0.4rem',
              color: 'var(--text-primary)',
            }}
          >
            ~{usd}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1.25rem' }}>
            on <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{chainName}</span>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(54, 166, 186, 0.15)',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>
                Time
              </div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {relativeTime(tx.timestamp)}
              </div>
              <div style={{ fontSize: '0.8rem' }}>{absoluteTime(tx.timestamp)}</div>
            </div>
            {typeof tx.whale_score === 'number' ? (
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>
                  Whale Score
                </div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{tx.whale_score}</div>
              </div>
            ) : null}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>
                Transaction Hash
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <code
                  title={tx.transaction_hash}
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {truncateAddress(tx.transaction_hash)}
                </code>
                <CopyButton value={tx.transaction_hash} label="transaction hash" />
              </div>
            </div>
          </div>
        </div>

        {/* FROM / TO CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <PartyCard title="From" label={tx.from_label} address={tx.from_address} chain={chain} />
          <PartyCard title="To" label={tx.to_label} address={tx.to_address} chain={chain} />
        </div>

        {/* AI REASONING CALLOUT */}
        {showReasoning && (
          <div
            style={{
              background:
                'linear-gradient(135deg, rgba(54, 166, 186, 0.12) 0%, rgba(155, 89, 182, 0.08) 100%)',
              border: '1px solid rgba(54, 166, 186, 0.35)',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ fontSize: '1.5rem', lineHeight: 1, marginTop: '0.1rem' }}>✨</div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  color: '#36a6ba',
                  textTransform: 'uppercase',
                  marginBottom: '0.4rem',
                }}
              >
                AI Reasoning
              </div>
              <div style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.98rem' }}>
                {String(tx.reasoning).trim()}
              </div>
            </div>
          </div>
        )}

        {/* EXPLORER LINK */}
        {explorer && (
          <div style={{ marginBottom: '1.5rem' }}>
            <a
              href={explorer.url(tx.transaction_hash)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '0.95rem 1.5rem',
                background: 'linear-gradient(135deg, #36a6ba 0%, #2980b9 100%)',
                border: '1px solid rgba(54, 166, 186, 0.6)',
                borderRadius: '14px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.3px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(54, 166, 186, 0.25)',
              }}
            >
              View on {explorer.name} ↗
            </a>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
          <a
            href="/statistics"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            ← Back to latest whale transactions
          </a>
        </div>
      </main>
    </AuthGuard>
  )
}
