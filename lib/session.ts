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
    return JSON.parse(decodeURIComponent(raw)) as SessionUser
  } catch {
    return null
  }
}

export function clearSession() {
  document.cookie = 'session=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}