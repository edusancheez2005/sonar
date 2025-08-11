'use client'
import React from 'react'
import Dashboard from '@/src/pages/Dashboard'
import AuthGuard from '@/app/components/AuthGuard'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}
