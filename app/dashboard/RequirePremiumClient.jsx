"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

export default function RequirePremiumClient({ children }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        // Check for admin bypass first
        if (typeof window !== 'undefined') {
          const isAdmin = window.localStorage.getItem('isAdminBypass') === 'true'
          if (isAdmin) {
            setIsPremium(true)
            if (!cancelled) setChecked(true)
            return
          }
        }
        
        const sb = supabaseBrowser()
        const { data: { session } } = await sb.auth.getSession()
        if (!session?.user) {
          router.replace('/?login=1&required=/dashboard')
          return
        }
        const res = await fetch('/api/subscription/status', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        if (!res.ok) {
          setIsPremium(false)
          if (!cancelled) setChecked(true)
          return
        }
        const json = await res.json()
        setIsPremium(!!json?.isActive)
      } finally {
        if (!cancelled) setChecked(true)
      }
    }
    run()
    return () => { cancelled = true }
  }, [router])

  if (!checked) return null
  
  // Pass isPremium to children
  if (typeof children === 'function') {
    return children({ isPremium })
  }
  
  return null
}
