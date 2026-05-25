import React, { Suspense } from 'react'
import AuthGuard from '@/app/components/AuthGuard'
import OrcaStudioClient from './OrcaStudioClient'

/**
 * /orca — ORCA Studio (v4 §4.4)
 * =============================================================================
 * The full-page surface for ORCA. Three columns:
 *   1. Sessions list  (280px, collapsible)
 *   2. Conversation   (1fr, the OrcaConversation atom in `studio` variant)
 *   3. Tool inspector (360px, collapsible)
 *
 * Shareable URL: /orca?session=<uuid>. Routing of the session id is owned
 * by the client component so we can read/write the query string.
 */

export const metadata = {
  title: 'ORCA Studio — Your Crypto Copilot',
  description:
    'A full-page workspace for ORCA: browse past conversations, chat with full context, and inspect the tools ORCA used to answer.',
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://www.sonartracker.io/orca' },
}

export default function OrcaStudioPage() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <OrcaStudioClient />
      </Suspense>
    </AuthGuard>
  )
}
