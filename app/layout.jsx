import React from 'react'
import { Analytics } from '@vercel/analytics/react'
import ClientRoot from './components/ClientRoot'

export const metadata = {
  title: 'Sonar — Cryptocurrency Dashboard',
  description: 'Real-time cryptocurrency transaction monitoring, analytics, and news.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientRoot>{children}</ClientRoot>
        <Analytics />
      </body>
    </html>
  )
}
