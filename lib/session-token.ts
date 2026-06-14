/**
 * Place at: lib/session-token.ts
 *
 * Server-only helpers for signing and verifying the `session` cookie.
 *
 * The cookie value is `<base64url(json)>.<base64url(hmacSha256)>` —
 * structurally similar to a JWT but without the header segment.
 * Signing prevents a logged-in user from editing their own session
 * cookie (e.g. changing `dashboardRole` to "owner" or adding
 * permissions) since they don't know SESSION_SECRET.
 *
 * Add to your .env:
 *   SESSION_SECRET=<a long random string, e.g. `openssl rand -hex 32`>
 *
 * Used by:
 *  - app/api/auth/discord-callback/route.ts  (creates the token)
 *  - proxy.ts                                (verifies the token)
 *
 * NOT imported by lib/session.ts, so it never ends up in client bundles.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import type { SessionUser } from './session'

/** Keep this in sync with the cookie `maxAge` set in discord-callback. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8 // 8 hours
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error(
      'SESSION_SECRET environment variable is not set. Generate one with `openssl rand -hex 32`.'
    )
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

/** Create a signed session token: `base64url(json).base64url(hmac)` */
export function createSessionToken(session: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/**
 * Verify a signed session token.
 *
 * Returns the decoded session if:
 *  - the signature matches (proves it was issued by this server), and
 *  - the session has not exceeded SESSION_MAX_AGE_SECONDS based on `issuedAt`
 *  - it contains the required fields
 *
 * Otherwise returns null — callers should treat this exactly like
 * "no session" (redirect to /login / clear the cookie).
 */
export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null

  const dot = token.indexOf('.')
  if (dot <= 0) return null

  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  if (!payload || !signature) return null

  let expectedSig: string
  try {
    expectedSig = sign(payload)
  } catch {
    // SESSION_SECRET missing — fail closed
    return null
  }

  const a = Buffer.from(signature)
  const b = Buffer.from(expectedSig)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionUser

    if (!session.discordId || !session.dashboardRole) return null
    if (!session.issuedAt || Date.now() - session.issuedAt > SESSION_MAX_AGE_MS) return null

    return session
  } catch {
    return null
  }
}