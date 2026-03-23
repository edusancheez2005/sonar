import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import WalletTrackerWrapper from './WalletTrackerWrapper'

export const metadata = {
  title: 'Whale Wallet Tracker — Top Smart Money Wallets',
  description: 'Track top whale wallets, smart money scores, and portfolio activity across Ethereum, Solana, Bitcoin, and more.',
  alternates: { canonical: 'https://www.sonartracker.io/wallet-tracker' },
}

export default async function WalletTrackerPage() {
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
                  name: 'Whale Wallet Tracker — Top Smart Money Wallets',
                  url: 'https://www.sonartracker.io/wallet-tracker',
                  isPartOf: { '@id': 'https://www.sonartracker.io#website' },
                  description: 'Track top whale wallets, smart money scores, and portfolio activity across Ethereum, Solana, Bitcoin, and more.',
                },
              ],
            }),
          }}
        />
        <WalletTrackerWrapper />
      </>
    </AuthGuard>
  )
}
