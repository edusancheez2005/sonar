import React from 'react'
import { supabaseAdmin } from '@/app/lib/supabaseAdmin'
import WalletProfileWrapper from './WalletProfileWrapper'

export async function generateMetadata({ params }) {
  const { address } = await params
  const short = address.length > 16 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address

  // Index only wallets we actually track (rich content). Unknown addresses
  // still render a live-snapshot page but stay out of the index so we don't
  // feed Google thin pages.
  let indexable = false
  try {
    const { count } = await supabaseAdmin
      .from('wallet_profiles')
      .select('address', { count: 'exact', head: true })
      .eq('address', address)
    indexable = (count || 0) > 0
  } catch {
    // If the lookup fails, stay conservative and noindex.
  }

  return {
    title: `Wallet ${short} — Whale Tracker`,
    description: `View whale activity, smart money score, transaction history, and portfolio for wallet ${short}.`,
    alternates: { canonical: `https://www.sonartracker.io/wallet-tracker/${address}` },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  }
}

export default async function WalletProfilePage({ params }) {
  const { address } = await params

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
                  { '@type': 'ListItem', position: 3, name: address.slice(0, 10) + '...', item: `https://www.sonartracker.io/wallet-tracker/${address}` },
                ],
              },
            ],
          }),
        }}
      />
      <WalletProfileWrapper address={address} />
    </>
  )
}
