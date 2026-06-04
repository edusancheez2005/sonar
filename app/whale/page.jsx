import React from 'react'
import WhaleFeedClient from './WhaleFeedClient'

export const metadata = {
  title: 'Whale Intelligence Terminal — Live On-Chain Whale Feed',
  description:
    'Real-time whale transaction feed across Ethereum, Bitcoin, Solana and more. Track large on-chain moves, entities, public figures, and Polymarket whales in one terminal.',
  alternates: { canonical: 'https://www.sonartracker.io/whale' },
}

export default function WhaleTerminalPage() {
  return <WhaleFeedClient />
}
