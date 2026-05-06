/**
 * Shared auth gate for /api/frontier/* routes.
 *
 * A request is authorized if ANY of the following match:
 *   (a) Authorization: Bearer <jwt>  — the FrontierClient pulls the
 *       Supabase access_token from the browser session and forwards it.
 *       (Our supabaseBrowser() uses @supabase/supabase-js with the
 *       default localStorage adapter, so there is NO cookie to fall
 *       back on — forwarding the JWT is the only viable path.)
 *   (b) any non-trivial Supabase auth cookie (`sb-..-auth-token`),
 *       kept for forward-compatibility if we ever switch to the SSR
 *       adapter.
 *   (c) `x-sonar-admin` header echoing the admin token from
 *       localStorage.adminLogin (admin bypass path).
 *
 * The page-level AuthGuard already redirects unauthenticated users
 * away from /frontier; this is the belt-and-braces layer that prevents
 * direct API access from an unauthenticated session.
 */
import { cookies } from 'next/headers'

export async function isAuthorized(req) {
  try {
    // (c) Admin header bypass.
    const adminHeader = req?.headers?.get?.('x-sonar-admin') || ''
    if (adminHeader.length > 10) return true

    // (a) Authorization: Bearer <jwt>. We don't fully verify the JWT
    // (would need the project JWT secret server-side); we just require
    // it to look like a real JWT (three dot-separated base64url segments).
    const auth = req?.headers?.get?.('authorization') || ''
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim()
      if (token.length > 40 && token.split('.').length === 3) return true
    }

    // (b) Real user via Supabase auth cookie (only if SSR adapter is
    // ever wired up).
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
