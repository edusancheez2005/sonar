'use client'
/**
 * Admin layout: client-side admin gate.
 *
 * Previously this was a server component that called supabaseServer() and
 * supabase.auth.getUser(), but supabaseServer() builds a service-role
 * client with no cookie context — the JWT never reaches it, so getUser()
 * always returned null and EVERY admin got redirected to /dashboard.
 *
 * Switched to a client-side check (same approach the existing
 * /admin/figures and /admin/calibration pages already use as a second
 * gate). The API routes underneath still verify the Bearer token
 * server-side, so this remains safe — the layout is just a UX gate.
 */
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { isAdmin } from '@/app/lib/adminConfig'

const TABS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/calibration', label: 'Calibration' },
  { href: '/admin/figures', label: 'Figures' },
  { href: '/admin/sentiment-votes', label: 'Sentiment votes' },
]

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(null) // null | false | true

  useEffect(() => {
    let cancelled = false
    const sb = supabaseBrowser()
    sb.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const email = data?.user?.email
      if (!email || !isAdmin(email)) {
        setAuthorized(false)
        router.replace('/dashboard')
      } else {
        setAuthorized(true)
      }
    }).catch(() => {
      if (!cancelled) {
        setAuthorized(false)
        router.replace('/dashboard')
      }
    })
    return () => { cancelled = true }
  }, [router])

  if (authorized === null) {
    return <main style={{ padding: '2rem', color: 'var(--text-primary)', opacity: 0.7 }}>Checking access…</main>
  }
  if (authorized === false) return null

  return (
    <>
      <nav style={{
        background: '#0a1825',
        borderBottom: '1px solid rgba(54,166,186,0.2)',
        padding: '0.6rem 1.5rem',
        display: 'flex',
        gap: '1.25rem',
        fontSize: '0.85rem',
      }}>
        <span style={{ opacity: 0.6 }}>Admin</span>
        {TABS.map(t => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              style={{
                color: active ? '#36A6BA' : 'var(--text-primary)',
                textDecoration: 'none',
                fontWeight: active ? 600 : 400,
                opacity: active ? 1 : 0.85,
              }}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
      {children}
    </>
  )
}

