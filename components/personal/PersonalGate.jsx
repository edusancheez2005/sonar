'use client'
/**
 * The Personal page's only gate: one session check with a skeleton first
 * paint (the old AuthGuard + RequirePremiumClient pair rendered nothing until
 * both had finished). It reads the plan once for the UpsellSlot; nothing else
 * on the page depends on it.
 */
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import PersonalSkeleton from './v2/PersonalSkeleton'

export default function PersonalGate({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState({ status: 'pending', userId: null, isPremium: false })

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      // Same admin bypass AuthGuard has.
      let admin = false
      try {
        const flag = window.localStorage.getItem('adminLogin')
        admin = !!flag && flag.length > 10
      } catch { /* ignore */ }
      try {
        const { data } = await supabaseBrowser().auth.getSession()
        const session = data?.session
        if (!session && !admin) {
          router.replace(`/?login=1&required=${encodeURIComponent(pathname || '/dashboard/personal')}`)
          return
        }
        if (cancelled) return
        setState({ status: 'ready', userId: session?.user?.id || null, isPremium: false })
        if (!session?.access_token) return
        const res = await fetch('/api/subscription/status', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }).catch(() => null)
        const body = res?.ok ? await res.json().catch(() => null) : null
        if (!cancelled && body?.isActive) setState((s) => ({ ...s, isPremium: true }))
      } catch {
        router.replace('/?login=1')
      }
    }
    run()
    return () => { cancelled = true }
  }, [pathname, router])

  if (state.status !== 'ready') return <PersonalSkeleton />
  return typeof children === 'function' ? children(state) : children
}
