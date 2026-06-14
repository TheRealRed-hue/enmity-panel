/**
 * Place at: lib/session.ts
 */

import type { DashboardRole, Permission } from '@/types'

export interface SessionUser {
  discordId: string
  username: string
  globalName: string | null
  avatar: string | null
  dashboardRole: DashboardRole
  permissions: Permission[]
  issuedAt: number
}

/** base64url → string, browser-safe (no Buffer). */
function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return decodeURIComponent(
    atob(padded)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('')
  )
}

/**
 * Reads the session cookie for DISPLAY purposes only (sidebar, header, etc.).
 *
 * The cookie is stored as `<base64url(json)>.<hmac signature>`. This only
 * decodes the JSON payload — it does NOT verify the signature. A user could
 * still edit this cookie client-side and make `getClientSession()` return
 * fake data, but that's harmless: every page and API route is protected by
 * `proxy.ts`, which verifies the signature server-side via
 * `verifySessionToken()` (lib/session-token.ts) and ignores/clears any
 * cookie whose signature doesn't match.
 */
export function getClientSession(): SessionUser | null {
  if (typeof document === 'undefined') return null
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith('session='))
      ?.split('=')
      .slice(1)
      .join('=')
    if (!raw) return null

    const token = decodeURIComponent(raw)
    const payload = token.split('.')[0]
    if (!payload) return null

    return JSON.parse(base64UrlDecode(payload)) as SessionUser
  } catch {
    return null
  }
}

export function clearSession() {
  document.cookie = 'session=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}