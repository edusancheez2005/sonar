import WalletSecurityClient from './WalletSecurityClient'

export const metadata = {
  title: 'Wallet Security & Privacy — How Sonar Tracker Keeps You Safe',
  description:
    'Sonar Tracker is non-custodial. We never request transactions, token approvals, or seed phrases. Learn exactly what we ask for, what we store, and how to stay safe when connecting a wallet.',
  keywords:
    'sonar tracker wallet security, non custodial crypto tracker, SIWE sign in with ethereum, read only wallet, wallet privacy',
  alternates: { canonical: 'https://www.sonartracker.io/help/wallet-security' },
  openGraph: {
    title: 'Wallet Security & Privacy — Sonar Tracker',
    description:
      'Read-only signatures, non-custodial by design. See exactly what Sonar Tracker can and cannot do with a connected wallet.',
    url: 'https://www.sonartracker.io/help/wallet-security',
    type: 'article',
  },
  robots: { index: true, follow: true },
}

export default function WalletSecurityPage() {
  return <WalletSecurityClient />
}
