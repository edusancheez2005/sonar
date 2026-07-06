import React from 'react'
import TryClient from './TryClient'

export const metadata = {
  title: 'Try Sonar — Real-Time Whale Tracking',
  description: 'Follow the biggest wallets on-chain, get alerts when they move, and backtest their trades. 7 days free, then $7.99/mo.',
  alternates: { canonical: 'https://www.sonartracker.io/try' },
  // Paid/cold-traffic landing page — measured via wtp_events, kept out of organic
  robots: { index: false, follow: false },
}

export default function TryPage() {
  return <TryClient />
}
