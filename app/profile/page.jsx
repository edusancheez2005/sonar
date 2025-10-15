import React from 'react'
import { supabaseServer } from '@/app/lib/supabaseServerClient'
import ClientProfile from './ClientProfile'

export const metadata = { 
  title: 'Account Settings — Sonar Tracker',
  description: 'Manage your Sonar Tracker account, subscription, and security settings. Your data is protected with bank-grade encryption.'
}

export default async function ProfilePage() {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  return <ClientProfile email={user?.email || ''} />
} 