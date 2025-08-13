'use client'
import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

export default function AuthGuard({ children }) {
  const [allowed, setAllowed] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const check = async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const isAuthed = !!data?.session
        if (!isAuthed) {
          const target = pathname || '/'
          router.replace(`/?login=1&required=${encodeURIComponent(target)}`)
        } else {
          setAllowed(true)
        }
      } catch {
        router.replace('/?login=1')
      }
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!allowed) return null
  return <>{children}</>
} 