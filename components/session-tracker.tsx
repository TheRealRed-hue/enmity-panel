'use client'

import { useEffect } from 'react'
import { getClientSession } from '@/lib/session'

export function SessionTracker() {
  useEffect(() => {
    async function setOffline() {
      const session = getClientSession()
      if (!session) return
      await fetch('/api/auth/offline', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: session.discordId,
          username: session.username,
          dashboardRole: session.dashboardRole,
        }),
      })
    }

    window.addEventListener('beforeunload', setOffline)
    return () => window.removeEventListener('beforeunload', setOffline)
  }, [])

  return null
}