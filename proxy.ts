import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE_SECONDS } from '@/lib/session-token'
import { getRequiredPermission } from '@/lib/route-permissions'
import { ROLE_CONFIG } from '@/lib/constants'
import type { SessionUser } from '@/lib/session'

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
 *  `middleware` function → `proxy`. If you still have a `middleware.ts`
 *  file, delete it — having both causes unstable behaviour.)
 *
 * Requires SESSION_SECRET (see lib/session-token.ts).
 *
 * Behaviour:
 *  1. Verifies the `session` cookie's HMAC signature + expiry. A
 *     tampered, expired, or missing cookie is treated as "not
 *     authenticated" (and the cookie is cleared).
 *  2. DEV ONLY (see devAutoLoginEnabled below): if there's no valid
 *     session AND DEV_AUTO_LOGIN=true is set locally, automatically
 *     signs the request in as a synthetic "Creator - Maki" account —
 *     no Discord OAuth needed. Never active in production.
 *  3. Unauthenticated users are redirected to /login (pages) or get a
 *     401 JSON response (API routes), except for whitelisted paths.
 *  4. Authenticated users who lack the permission required for a given
 *     page (lib/route-permissions.ts) are redirected to / with
 *     ?error=forbidden (pages) or get a 403 JSON response (API routes).
 *  5. Already-authenticated users visiting /login are sent to /.
 *  6. Baseline security headers are applied to every response.
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

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains')
  }
  return response
}

function redirectToLogin(req: NextRequest, opts: { from?: string; error?: string; clearCookie?: boolean }) {
  const loginUrl = new URL('/login', req.url)
  if (opts.from) loginUrl.searchParams.set('from', opts.from)
  if (opts.error) loginUrl.searchParams.set('error', opts.error)

  const response = NextResponse.redirect(loginUrl)
  if (opts.clearCookie) response.cookies.delete('session')
  return withSecurityHeaders(response)
}

// ─── Local-only dev auto-login ────────────────────────────────────────────
//
// Activates ONLY when BOTH are true:
//   - NODE_ENV !== 'production'  (set automatically by `next dev`; always
//     "production" for `next build && next start` and on Vercel)
//   - DEV_AUTO_LOGIN=true is set
//
// Put DEV_AUTO_LOGIN=true in `.env.local` (gitignored by default, never
// pushed, never set on Vercel). On any other machine — or in production —
// this stays off and the normal Discord login is required.
//
// No Supabase row is created for this account; it's a signed cookie only,
// good for poking around the UI locally. Anything that looks up
// `staff_members` by discordId won't find a match for it.
function devAutoLoginEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_AUTO_LOGIN === 'true'
}

function createDevCreatorSession(): SessionUser {
  return {
    discordId: 'null',
    username: 'Creator - Maki',
    globalName: 'Creator - Maki',
    avatar: null,
    dashboardRole: 'owner',
    permissions: ROLE_CONFIG.owner.permissions,
    issuedAt: Date.now(),
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const rawCookie = req.cookies.get('session')?.value

  let session = verifySessionToken(rawCookie)
  let issueDevCookie = false

  if (!session && devAutoLoginEnabled()) {
    session = createDevCreatorSession()
    issueDevCookie = true
  }

  const isAuthenticated = !!session

  function finalize(response: NextResponse) {
    if (issueDevCookie && session) {
      response.cookies.set('session', createSessionToken(session), {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: '/',
      })
    }
    return withSecurityHeaders(response)
  }

  // Already logged in (or dev auto-login) but visiting /login → bounce home
  if (pathname === '/login' && isAuthenticated) {
    return finalize(NextResponse.redirect(new URL('/', req.url)))
  }

  if (isPublicPath(pathname)) {
    return finalize(NextResponse.next())
  }

  if (!isAuthenticated) {
    // Cookie was present but failed verification (tampered/expired/corrupt)
    const hadCookie = !!rawCookie

    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (hadCookie) response.cookies.delete('session')
      return withSecurityHeaders(response)
    }

    return redirectToLogin(req, {
      from: pathname,
      error: hadCookie ? 'session_expired' : undefined,
      clearCookie: hadCookie,
    })
  }

  // Authenticated — check page/role-based permission requirements
  const requiredPermission = getRequiredPermission(pathname)
  if (requiredPermission && !session.permissions.includes(requiredPermission)) {
    if (pathname.startsWith('/api/')) {
      return finalize(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }

    const homeUrl = new URL('/', req.url)
    homeUrl.searchParams.set('error', 'forbidden')
    return finalize(NextResponse.redirect(homeUrl))
  }

  return finalize(NextResponse.next())
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