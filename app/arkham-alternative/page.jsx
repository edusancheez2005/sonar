import { redirect } from 'next/navigation'

// Pulled 2026-04-21 pending legal review. See LEGAL_AUDIT_2026-04-21.md §1.C.
// Prior page used the "Arkham Intelligence" trademark in the title, meta
// keywords, and slug, and made comparative pricing claims that omitted
// the competitor's free tier. Reinstating the page in any form requires
// counsel sign-off on Lanham Act §43(a) compliance and substantiation of
// every comparative claim.
export const metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  title: 'Page unavailable',
  description: 'This page is not currently available.',
  alternates: { canonical: 'https://www.sonartracker.io/pricing' },
}

export default function ArkhamAlternativePage() {
  redirect('/pricing')
}
