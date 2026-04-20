'use client'
import React, { useEffect, useState } from 'react'
import NextLink from 'next/link'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'

// Small client shim so `/figures` (SSR, public) can still render a
// sign-in-gated "Submit a figure" action without turning the whole
// page into a client component.
export default function SubmitFigureButton() {
  const [authed, setAuthed] = useState(null)

  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }) => {
      if (!cancelled) setAuthed(!!data?.session)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (!cancelled) setAuthed(!!session)
    })
    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  if (authed !== true) return null

  return (
    <NextLink
      href="/figures/submit"
      prefetch={false}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.6rem 1.1rem',
        background: 'rgba(54, 166, 186, 0.18)',
        border: '1px solid rgba(54, 166, 186, 0.5)',
        borderRadius: '12px',
        color: '#36a6ba',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      + Submit a figure
    </NextLink>
  )
}
