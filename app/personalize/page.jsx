'use client'

import React, { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/app/lib/supabaseBrowserClient'
import { isAdmin } from '@/app/lib/adminConfig'
import PersonalizePreview from './PersonalizePreview'
import PersonalizeAdmin from './PersonalizeAdmin'

/**
 * Admin gate runs client-side because the existing supabaseServer() is a
 * service-role client without cookie/session support — it cannot read the
 * logged-in user. Other admin pages (figures, sentiment-votes) follow the
 * same pattern. While the auth check resolves we render the public preview
 * so non-admins never see a flash of the workbench.
 */
export default function PersonalizePage() {
  const [state, setState] = useState({ ready: false, admin: false, email: null })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const sb = supabaseBrowser()
        const { data } = await sb.auth.getUser()
        const email = data?.user?.email || null
        if (!cancelled) setState({ ready: true, admin: isAdmin(email), email })
      } catch {
        if (!cancelled) setState({ ready: true, admin: false, email: null })
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (state.ready && state.admin) {
    return <PersonalizeAdmin email={state.email} />
  }
  return <PersonalizePreview />
}
