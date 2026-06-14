import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Place this file at the PROJECT ROOT (same level as `app/`, NOT inside `app/`):
 *
 *   dashboard-new/
 *     app/
 *     components/
 *     lib/
 *     proxy.ts   ← here
 *
 * (Next.js 16 renamed `middleware.ts` → `proxy.ts` and the exported
 *  `middleware` function → `proxy`. Same behaviour, new name. If you
 *  still have a `middleware.ts` file, delete it — having both causes
 *  unstable behaviour.)
 *
 * Behaviour:
 *  - Anyone WITHOUT a valid `session` cookie is redirected to /login
 *    for every page and every API route, except the ones explicitly
 *    whitelisted below.
 *  - Anyone WITH a valid session who tries to open /login is sent
 *    back to the dashboard home.
 *  - A malformed/corrupted session cookie is cleared and the user is
 *    sent to /login as well.
 */

// Pages that must remain reachable without authentication
const PUBLIC_PAGES = ['/login']

// API prefixes that must remain reachable without authentication
// (OAuth callback, sign-out, and presence tracking need to work
// before/around the session being set or cleared)
const PUBLIC_API_PREFIXES = ['/api/auth']

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGES.includes(pathname)) return true
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/** Cookie values set via `response.cookies.set()` are URI-encoded JSON. */
function readSessionCookie(raw: string | undefined) {
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw)) as {
      discordId?: string
      dashboardRole?: string
    }
  } catch {
    return null
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const sessionCookie = req.cookies.get('session')?.value
  const session = readSessionCookie(sessionCookie)
  const isAuthenticated = !!session?.discordId && !!session?.dashboardRole

  // Already logged in but visiting /login → bounce to dashboard home
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  if (isAuthenticated) {
    return NextResponse.next()
  }

  // Cookie exists but is malformed/corrupted → clear it
  if (sessionCookie && !session) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('error', 'session_expired')
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('session')
    return response
  }

  // API routes: respond 401 instead of redirecting (no HTML to render)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // No session at all → force the login page
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Match everything EXCEPT:
     *  - Next.js internals (_next/static, _next/image)
     *  - favicon.ico
     *  - static asset files (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf)$).*)',
  ],
}