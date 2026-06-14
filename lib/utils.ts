/**
 * Place at: lib/utils.ts (this is the FULL file — replace the existing one,
 * the only addition is `isSafeRedirectPath` at the bottom)
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'agora'
  if (minutes < 60) return `${minutes}m atrás`
  if (hours < 24) return `${hours}h atrás`
  if (days < 7) return `${days}d atrás`
  return date.toLocaleDateString('pt-BR')
}

export function truncateId(id: string, length = 8): string {
  return `${id.slice(0, length)}...`
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

/**
 * Returns true if `path` is a safe same-site redirect target —
 * a relative path starting with a single `/` (not `//`, which a
 * browser would treat as protocol-relative and send the user off-site).
 *
 * Used to validate the OAuth `state` param / `from` query param before
 * redirecting a user back to where they came from after login.
 */
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//')
}