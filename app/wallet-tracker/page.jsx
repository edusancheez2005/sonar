import React from 'react'
import { supabaseAdmin, supabaseAdminFresh } from '@/app/lib/supabaseAdmin'
import WalletTrackerHub from './WalletTrackerHub'
import WalletTrackerWrapper from './WalletTrackerWrapper'

export const metadata = {
  title: 'Whale Tracker — Research Wallets, Entities & Public Figures',
  description: 'Research any wallet, browse tracked entities, follow verified public figures, and manage your watchlist — all from one hub.',
  alternates: { canonical: 'https://www.sonartracker.io/wallet-tracker' },
}

async function fetchFeaturedFigures() {
  // Pull is_featured rows + the addresses column so we can defensively
  // strip any featured row whose addresses array got emptied (an empty
  // featured card would be a dead link on the public hub). Bumped from
  // 8 → 24 now that the curated seed v2 ships with more verified
  // figures.
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, category, avatar_url, twitter_handle, addresses')
    .eq('is_featured', true)
    .order('display_name', { ascending: true })
    .limit(24)
  if (error) return []
  return (data || []).filter((f) => Array.isArray(f.addresses) && f.addresses.length > 0)
}

// Pre-computed by /api/cron/backtest-figures every 04:00 UTC. We only
// surface a wallet here if it (a) has a positive return_pct_7d (no
// point celebrating losers in the headline strip) and (b) maps back to
// an approved curated_entities row with at least one address. Cap at
// 5 per the prompt spec.
async function fetchTopPerformers() {
  // supabaseAdminFresh — the regular client lets Next.js cache
  // PostgREST responses, which keeps stale (often all-null) data on
  // the hub for hours after a successful nightly cron.
  const { data, error } = await supabaseAdminFresh
    .from('figure_backtests')
    .select(
      'slug, return_pct_7d, curated_entities!inner(slug, display_name, category, avatar_url, twitter_handle, addresses, submission_status)',
    )
    .gt('return_pct_7d', 0)
    .order('return_pct_7d', { ascending: false })
    .limit(20)
  if (error || !Array.isArray(data)) return []
  return data
    .map((row) => {
      const ent = row.curated_entities
      if (!ent || ent.submission_status !== 'approved') return null
      if (!Array.isArray(ent.addresses) || ent.addresses.length === 0) return null
      return {
        slug: ent.slug,
        display_name: ent.display_name,
        category: ent.category,
        avatar_url: ent.avatar_url,
        twitter_handle: ent.twitter_handle,
        return_pct_7d: row.return_pct_7d,
      }
    })
    .filter(Boolean)
    .slice(0, 5)
}

export default async function WalletTrackerPage() {
  const [featuredFigures, topPerformers] = await Promise.all([
    fetchFeaturedFigures(),
    fetchTopPerformers(),
  ])

  return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'BreadcrumbList',
                  itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.sonartracker.io/' },
                    { '@type': 'ListItem', position: 2, name: 'Whale Tracker', item: 'https://www.sonartracker.io/wallet-tracker' },
                  ],
                },
                {
                  '@type': 'WebPage',
                  name: 'Whale Tracker — Research Wallets, Entities & Public Figures',
                  url: 'https://www.sonartracker.io/wallet-tracker',
                  isPartOf: { '@id': 'https://www.sonartracker.io#website' },
                  description: 'Research any wallet, browse tracked entities, follow verified public figures, and manage your watchlist — all from one hub.',
                },
              ],
            }),
          }}
        />
        <WalletTrackerHub featuredFigures={featuredFigures} topPerformers={topPerformers} />
        <WalletTrackerWrapper />
      </>
  )
}
