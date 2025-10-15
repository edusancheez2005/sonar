import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import DashboardWrapper from './DashboardWrapper'

export const metadata = {
  title: 'Crypto Dashboard — Live Whale Flows & Token Leaders',
  description: 'See live crypto whale activity, token leaders, and chain flows in one real-time dashboard.',
  alternates: { canonical: 'https://www.sonartracker.io/dashboard' },
}

export default async function DashboardPage() {
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
                    { '@type': 'ListItem', position: 2, name: 'Dashboard', item: 'https://www.sonartracker.io/dashboard' },
                  ],
                },
                {
                  '@type': 'WebPage',
                  name: 'Crypto Dashboard — Live Whale Flows & Token Leaders',
                  url: 'https://www.sonartracker.io/dashboard',
                  isPartOf: { '@id': 'https://www.sonartracker.io#website' },
                  description: 'See live crypto whale activity, token leaders, and chain flows in one real-time dashboard.',
                },
              ],
            }),
          }}
        />
        <DashboardWrapper />
      </>
    </AuthGuard>
  )
}
