import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import AuthGuard from '@/app/components/AuthGuard'
import WalletTrackerTabs from '@/app/components/wallet-tracker/WalletTrackerTabs'
import {
  isJunkEntityLabel,
  inferEntityType,
} from '@/app/lib/entityHelpers'
import EntitiesDirectoryClient from './EntitiesDirectoryClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Entity Tracker | Sonar',
  description:
    'Browse the institutions, exchanges, market makers, and protocols Sonar tracks. Follow whale moves across CEXes like Binance, market makers like Wintermute, and DeFi protocols in real time.',
  alternates: { canonical: 'https://www.sonartracker.io/entities' },
  openGraph: {
    title: 'Entity Tracker | Sonar',
    description:
      'Browse institutions, exchanges, market makers, and protocols tracked by Sonar whale intelligence.',
    url: 'https://www.sonartracker.io/entities',
    type: 'website',
  },
}

async function fetchLabeledEntities() {
  const PAGE = 1000
  const MAX_PAGES = 30
  const rows = []
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE
    const to = from + PAGE - 1
    const { data, error } = await supabaseAdmin
      .from('all_whale_transactions')
      .select('from_label, to_label, usd_value, blockchain, timestamp')
      .or('from_label.not.is.null,to_label.not.is.null')
      .order('timestamp', { ascending: false })
      .range(from, to)
    if (error) break
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

function aggregateEntities(rows) {
  const map = new Map()
  for (const r of rows) {
    const name = r.from_label || r.to_label
    if (!name) continue
    let rec = map.get(name)
    if (!rec) {
      rec = {
        entity_name: name,
        tx_count: 0,
        total_volume: 0,
        last_active: null,
        chains: new Set(),
      }
      map.set(name, rec)
    }
    rec.tx_count += 1
    rec.total_volume += Number(r.usd_value || 0)
    if (r.blockchain) rec.chains.add(String(r.blockchain).toLowerCase())
    if (!rec.last_active || new Date(r.timestamp) > new Date(rec.last_active)) {
      rec.last_active = r.timestamp
    }
  }
  return Array.from(map.values())
    .map((e) => ({
      entity_name: e.entity_name,
      tx_count: e.tx_count,
      total_volume: e.total_volume,
      last_active: e.last_active,
      chain_count: e.chains.size,
    }))
    .filter((e) => e.tx_count >= 10)
    .filter((e) => !isJunkEntityLabel(e.entity_name))
    .sort((a, b) => b.tx_count - a.tx_count)
    .slice(0, 100)
    .map((e) => ({ ...e, entity_type: inferEntityType(e.entity_name) }))
}

async function fetchFeaturedFigures() {
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, category, avatar_url, twitter_handle, addresses')
    .eq('is_featured', true)
    .order('display_name', { ascending: true })
    .limit(6)
  if (error) return []
  return data || []
}

export default async function EntitiesDirectoryPage() {
  const [rawRows, featuredFigures] = await Promise.all([
    fetchLabeledEntities(),
    fetchFeaturedFigures(),
  ])
  const entities = aggregateEntities(rawRows)
  const totalTx = entities.reduce((a, e) => a + e.tx_count, 0)

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
        <div
          style={{
            background: 'linear-gradient(135deg, #0d2134 0%, #1a2f42 100%)',
            border: '1px solid rgba(54, 166, 186, 0.25)',
            borderRadius: '20px',
            padding: '1.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 800,
              marginBottom: '0.35rem',
              color: 'var(--text-primary)',
            }}
          >
            Tracked Entities
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            {entities.length.toLocaleString()} entities ·{' '}
            {totalTx.toLocaleString()} tracked transactions
          </div>
        </div>

        <WalletTrackerTabs activeOverride="entities" />

        <EntitiesDirectoryClient
          entities={entities}
          featuredFigures={featuredFigures}
        />
      </main>
    </AuthGuard>
  )
}
