'use client'
import React from 'react'
import Statistics from '@/src/views/Statistics'
import AuthGuard from '@/app/components/AuthGuard'

export default function StatisticsPage() {
  return (
    <AuthGuard>
      <Statistics />
    </AuthGuard>
  )
}
