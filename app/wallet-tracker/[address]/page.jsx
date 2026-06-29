import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import WalletProfileWrapper from './WalletProfileWrapper'

export async function generateMetadata({ params }) {
  const { address } = await params
  const short = address.length > 16 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address
  return {
    title: `Wallet ${short} — Whale Tracker`,
    description: `View whale activity, smart money score, transaction history, and portfolio for wallet ${short}.`,
    alternates: { canonical: `https://www.sonartracker.io/wallet-tracker/${address}` },
    // Auth-gated (AuthGuard renders null for signed-out crawlers) -> no crawlable
    // content, so noindex to stop "Crawled - currently not indexed" crawl waste.
    robots: { index: false, follow: false },
  }
}

export default async function WalletProfilePage({ params }) {
  const { address } = await params

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
                    { '@type': 'ListItem', position: 2, name: 'Whale Tracker', item: 'https://www.sonartracker.io/wallet-tracker' },
                    { '@type': 'ListItem', position: 3, name: address.slice(0, 10) + '...', item: `https://www.sonartracker.io/wallet-tracker/${address}` },
                  ],
                },
              ],
            }),
          }}
        />
        <WalletProfileWrapper address={address} />
      </>
    </AuthGuard>
  )
}
