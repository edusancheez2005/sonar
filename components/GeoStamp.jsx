'use client'
/**
 * GeoStamp — invisible helper mounted in ClientRoot. Once per browser
 * session, if the visitor is signed in, asks /api/profile/geo-stamp to fill
 * profiles.country from Vercel's edge geo header (only when it is NULL).
 * Backfills the 900+ pre-2026-09 profiles as their owners return.
 */
import { useEffect } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

export default function GeoStamp() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem('geo_stamped')) return
    } catch {
      /* storage blocked — stamp anyway, the API is idempotent */
    }
    let cancelled = false
    ;(async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getSession()
        const token = data?.session?.access_token
        if (!token || cancelled) return
        await fetch('/api/profile/geo-stamp', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        try {
          sessionStorage.setItem('geo_stamped', '1')
        } catch {
          /* fine */
        }
      } catch {
        /* best-effort — never surface to the user */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  return null
}
