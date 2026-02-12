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
        const sb = supabaseBrowser()
        const { data: { session } } = await sb.auth.getSession()
        if (!session?.user) {
          router.replace('/?login=1&required=/dashboard')
          return
        }
        
        // Check actual premium status from profiles table
        try {
          const { data: profile } = await sb
            .from('profiles')
            .select('plan')
            .eq('id', session.user.id)
            .single()
          setIsPremium(profile?.plan === 'premium' || profile?.plan === 'pro')
        } catch {
          setIsPremium(false)
        }
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
