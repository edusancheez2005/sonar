import React from 'react'
import WhaleTerminalShell from '@/app/components/whale-terminal/WhaleTerminalShell'
import ResearchTerminal from './ResearchTerminal'

export const metadata = {
  title: 'Whale Terminal — Research Wallets, Entities & Public Figures',
  description:
    'Research any wallet, browse tracked entities, follow verified public figures, and monitor whale flows — a quant-style terminal for whale intelligence.',
  alternates: { canonical: 'https://www.sonartracker.io/wallet-tracker' },
}

export default function WalletTrackerPage() {
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
                  { '@type': 'ListItem', position: 2, name: 'Whale Terminal', item: 'https://www.sonartracker.io/wallet-tracker' },
                ],
              },
              {
                '@type': 'WebPage',
                name: 'Whale Terminal — Research Wallets, Entities & Public Figures',
                url: 'https://www.sonartracker.io/wallet-tracker',
                isPartOf: { '@id': 'https://www.sonartracker.io#website' },
                description:
                  'Research any wallet, browse tracked entities, follow verified public figures, and monitor whale flows — a quant-style terminal for whale intelligence.',
              },
            ],
          }),
        }}
      />
      <WhaleTerminalShell title="WHALE_TERMINAL // RESEARCH" live>
        <ResearchTerminal />
      </WhaleTerminalShell>
    </>
  )
}
