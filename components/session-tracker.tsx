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

    setOnline()
    sendHeartbeat()

    const heartbeatInterval = setInterval(sendHeartbeat, 30_000)

    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [])

  return null
}