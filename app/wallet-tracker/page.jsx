import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import WalletTrackerHub from './WalletTrackerHub'
import WalletTrackerWrapper from './WalletTrackerWrapper'

export const metadata = {
  title: 'Wallet Tracker — Research Wallets, Entities & Public Figures',
  description: 'Research any wallet, browse tracked entities, follow verified public figures, and manage your watchlist — all from one hub.',
  alternates: { canonical: 'https://www.sonartracker.io/wallet-tracker' },
}

async function fetchFeaturedFigures() {
  const { data, error } = await supabaseAdmin
    .from('curated_entities')
    .select('slug, display_name, category, avatar_url, twitter_handle')
    .eq('is_featured', true)
    .order('display_name', { ascending: true })
    .limit(8)
  if (error) return []
  return data || []
}

export default async function WalletTrackerPage() {
  const featuredFigures = await fetchFeaturedFigures()

  return (
    <AuthGuard>
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
                    { '@type': 'ListItem', position: 2, name: 'Wallet Tracker', item: 'https://www.sonartracker.io/wallet-tracker' },
                  ],
                },
                {
                  '@type': 'WebPage',
                  name: 'Wallet Tracker — Research Wallets, Entities & Public Figures',
                  url: 'https://www.sonartracker.io/wallet-tracker',
                  isPartOf: { '@id': 'https://www.sonartracker.io#website' },
                  description: 'Research any wallet, browse tracked entities, follow verified public figures, and manage your watchlist — all from one hub.',
                },
              ],
            }),
          }}
        />
        <WalletTrackerHub featuredFigures={featuredFigures} />
        <WalletTrackerWrapper />
      </>
    </AuthGuard>
  )
}
