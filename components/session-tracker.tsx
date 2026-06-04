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

    async function sendHeartbeat() {
      await fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: session!.discordId }),
      })
    }

    function setOffline() {
      navigator.sendBeacon(
        '/api/auth/offline',
        new Blob(
          [JSON.stringify({
            discordId: session!.discordId,
            username: session!.username,
            dashboardRole: session!.dashboardRole,
          })],
          { type: 'application/json' }
        )
      )
    }

    let offlineTimer: ReturnType<typeof setTimeout> | null = null

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        offlineTimer = setTimeout(setOffline, 8_000)
      } else {
        if (offlineTimer) {
          clearTimeout(offlineTimer)
          offlineTimer = null
        }
        setOnline()
      }
    }

    setOnline()
    sendHeartbeat()

    // Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 30_000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', setOffline)

    return () => {
      clearInterval(heartbeatInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', setOffline)
    }
  }, [])

  return null
}