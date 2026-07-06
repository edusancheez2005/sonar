import React from 'react'
import EntitiesClient from './EntitiesClient'

export const metadata = {
  title: 'Named Entities & Famous Whales — Crypto Wallet Intelligence | Sonar',
  description: 'Track 70,000+ identified crypto wallets: Vitalik Buterin, Justin Sun, Binance, Coinbase, Wintermute, Paradigm, and more. See real-time whale activity by name.',
  alternates: { canonical: 'https://www.sonartracker.io/whales/entities' }
}

export default function EntitiesPage() {
  return <EntitiesClient />
}
