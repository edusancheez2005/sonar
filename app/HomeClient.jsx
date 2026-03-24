'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import Landing from '@/src/views/Landing'

export default function HomeClient() {
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check admin bypass
        if (typeof window !== 'undefined') {
          const adminFlag = window.localStorage.getItem('adminLogin')
          if (adminFlag && adminFlag.length > 10) {
            router.replace('/dashboard')
            return
          }
        }

        // Check Supabase session
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        if (data?.session) {
          router.replace('/dashboard')
          return
        }
      } catch {
        // Not logged in, show landing
      }
      setChecking(false)
    }
    checkAuth()
  }, [router])

  // Show nothing briefly while checking auth (prevents flash of landing page)
  if (checking) return null

  return <Landing />
}
