'use client'
import React from 'react'
import Dashboard from '@/src/views/Dashboard'
import AuthGuard from '@/app/components/AuthGuard'

export const metadata = {
  title: 'Crypto Dashboard — Live Whale Flows & Token Leaders',
  description: 'See live crypto whale activity, token leaders, and chain flows in one real-time dashboard.',
  alternates: { canonical: 'https://www.sonartracker.io/dashboard' },
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}
