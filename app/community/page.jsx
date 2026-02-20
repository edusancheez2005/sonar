'use client'

import React from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import CommunityClient from './CommunityClient'

export default function CommunityPage() {
  return (
    <AuthGuard>
      <CommunityClient />
    </AuthGuard>
  )
}

