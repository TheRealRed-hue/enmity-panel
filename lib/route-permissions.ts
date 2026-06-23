/**
 * Place at: lib/route-permissions.ts
 *
 * Minimum permission required to view each page. Pages not listed here
 * are accessible to any authenticated staff member (any valid session).
 *
 * Enforced in `proxy.ts`. Adjust freely:
 *  - Remove an entry to make that page open to all logged-in staff.
 *  - Change the value to any key from `Permission` (see lib/constants.ts
 *    → PERMISSION_LABELS for the full list and ROLE_CONFIG to see which
 *    roles hold which permissions).
 */

import type { Permission } from '@/types'

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/team': 'manage_team',
  '/settings': 'manage_settings',
  '/analytics': 'view_analytics',
  '/verification': 'manage_verification',
  '/blacklist': 'blacklist',
  '/logs': 'view_logs',
  '/alerts': 'view_logs',
  // /training is open to all authenticated staff (no specific permission required)
}

/**
 * Returns the permission required for `pathname`, or null if the page
 * only requires being logged in (no specific permission).
 */
export function getRequiredPermission(pathname: string): Permission | null {
  for (const [route, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return permission
    }
  }
  return null
}