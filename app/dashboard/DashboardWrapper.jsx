'use client'
import React from 'react'
import Dashboard from '@/src/views/Dashboard'
import RequirePremiumClient from './RequirePremiumClient'

export default function DashboardWrapper() {
  return (
    <RequirePremiumClient>
      {({ isPremium }) => <Dashboard isPremium={isPremium} />}
    </RequirePremiumClient>
  )
}

