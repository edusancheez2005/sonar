'use client'
import React from 'react'
import Statistics from '@/src/pages/Statistics'
import AuthGuard from '@/app/components/AuthGuard'

export default function StatisticsPage() {
  return (
    <AuthGuard>
      <Statistics />
    </AuthGuard>
  )
}
