import { NextResponse } from 'next/server'

// OFAC comprehensively sanctioned jurisdictions (ISO 3166-1 alpha-2).
// Sonar Tracker is operated from the United Kingdom and must not provide
// services to users in these regions. Crimea / Donetsk / Luhansk are
// sanctioned regions within UA but cannot be reliably geo-detected at the
// country header level — they are covered by the Terms of Service
// eligibility attestation (`notSanctioned`) collected at signup.
const BLOCKED_COUNTRIES = new Set(['IR', 'SY', 'CU', 'KP'])

export async function middleware(request) {
  // Vercel sets `x-vercel-ip-country`; Cloudflare sets `cf-ipcountry`.
  // Fall back to neither if the header is missing (e.g. local dev).
  const country = (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    ''
  ).toUpperCase()

  if (country && BLOCKED_COUNTRIES.has(country)) {
    return new NextResponse(
      'Sonar Tracker is not available in your region due to applicable sanctions and export-control law (OFAC / UK HM Treasury / EU). If you believe this is an error, contact compliance@sonartracker.io.',
      {
        status: 451,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
} 
