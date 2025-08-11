import React from 'react'
import { supabaseServer } from '@/app/lib/supabaseServerClient'
import ClientProfile from './ClientProfile'

export const metadata = { title: 'Profile — Sonar' }

export default async function ProfilePage() {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  return (
    <main className="container" style={{ padding: '2rem' }}>
      <h1>Profile</h1>
      <ClientProfile email={user?.email || ''} />
    </main>
  )
} 