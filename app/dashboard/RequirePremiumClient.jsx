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
        
        // 🎉 DEMO PHASE: Everyone gets full access for free!
        setIsPremium(true)
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
