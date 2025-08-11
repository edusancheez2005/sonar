'use client'
import React from 'react'
import News from '@/src/pages/News'
import AuthGuard from '@/app/components/AuthGuard'

export default function NewsPage() {
  return (
    <AuthGuard>
      <News />
    </AuthGuard>
  )
}
