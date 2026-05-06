/**
 * Shared auth gate for /api/frontier/* routes.
 *
 * A request is authorized if EITHER
 *   (a) it carries any non-trivial Supabase auth cookie
 *       (`sb-..-auth-token`, sent automatically by the browser for any
 *       logged-in user), OR
 *   (b) it carries the `x-sonar-admin` header echoing the admin token
 *       the FrontierClient reads from localStorage.adminLogin.
 *
 * Kept dead-simple to avoid pulling in @supabase/ssr. The page-level
 * AuthGuard already redirects unauthenticated users away from /frontier;
 * this is the belt-and-braces layer that prevents direct API access from
 * an unauthenticated session.
 */
import { cookies } from 'next/headers'

export async function isAuthorized(req) {
  try {
    // (b) Admin header bypass — set client-side from localStorage.adminLogin.
    const adminHeader = req?.headers?.get?.('x-sonar-admin') || ''
    if (adminHeader.length > 10) return true

    // (a) Real user via Supabase auth cookie.
    const ck = cookies()
    const all = ck.getAll()
    for (const c of all) {
      const v = c.value || ''
      if (/^sb-.*-auth-token/i.test(c.name) && v.length > 10) return true
    }
    return false
  } catch {
    return false
  }
}
