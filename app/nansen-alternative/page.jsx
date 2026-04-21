import { redirect } from 'next/navigation'

// Pulled 2026-04-21 pending legal review. See LEGAL_AUDIT_2026-04-21.md §1.C.
// Prior page used the "Nansen" trademark in the title, meta keywords, and
// slug, and asserted "same institutional-grade on-chain analytics" which
// is a false-equivalence claim under Lanham Act §43(a)(1)(B). Reinstating
// the page in any form requires counsel sign-off and substantiation of
// every comparative claim (including correct pricing context).
export const metadata = {
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  title: 'Page unavailable',
  description: 'This page is not currently available.',
  alternates: { canonical: 'https://www.sonartracker.io/pricing' },
}

export default function NansenAlternativePage() {
  redirect('/pricing')
}
