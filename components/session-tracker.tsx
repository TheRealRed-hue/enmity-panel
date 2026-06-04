'use client'

import { useEffect } from 'react'
import { getClientSession } from '@/lib/session'

export function SessionTracker() {
  useEffect(() => {
    const session = getClientSession()
    if (!session) return

    async function setOnline() {
      await fetch('/api/auth/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: session!.discordId,
          username: session!.username,
          dashboardRole: session!.dashboardRole,
        }),
      })
    }

    async function setOffline() {
      await fetch('/api/auth/offline', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: session!.discordId,
          username: session!.username,
          dashboardRole: session!.dashboardRole,
        }),
      })
    }

    let offlineTimer: ReturnType<typeof setTimeout> | null = null

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        // Wait 10 seconds before marking offline — if they come back (reload) it cancels
        offlineTimer = setTimeout(setOffline, 10_000)
      } else {
        // They came back — cancel the offline timer and mark online
        if (offlineTimer) {
          clearTimeout(offlineTimer)
          offlineTimer = null
        }
        setOnline()
      }
    }

    setOnline()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return null
}