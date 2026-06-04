'use client'

import { useEffect, useRef } from 'react'
import { getClientSession } from '@/lib/session'

export function SessionTracker() {
  const sessionStartRef = useRef<number>(Date.now())

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

    async function checkAndMarkOffline() {
      await fetch('/api/auth/check-offline', { method: 'POST' })
    }

    setOnline()
    sendHeartbeat()

    // Heartbeat every 30 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 30_000)

    // Check offline every 60 seconds — only owner/admin does this to avoid duplicates
    const isAdmin = ['owner', 'administrator'].includes(session.dashboardRole)
    const checkInterval = isAdmin ? setInterval(checkAndMarkOffline, 60_000) : null

    return () => {
      clearInterval(heartbeatInterval)
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [])

  return null
}