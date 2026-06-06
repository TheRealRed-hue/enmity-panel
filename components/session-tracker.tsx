'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getClientSession, clearSession } from '@/lib/session'

export function SessionTracker() {
  useEffect(() => {
    const session = getClientSession()
    if (!session) return
    const currentSession = session

    async function setOnline() {
      await fetch('/api/auth/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: currentSession.discordId,
          username: currentSession.username,
          dashboardRole: currentSession.dashboardRole,
        }),
      })
    }

    async function sendHeartbeat() {
      await fetch('/api/auth/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discordId: currentSession.discordId }),
      })
    }

    async function checkAndMarkOffline() {
      await fetch('/api/auth/check-offline', { method: 'POST' })
    }

    setOnline()
    sendHeartbeat()
    checkAndMarkOffline()

    // Do not record logout on page reload. Offline is detected via heartbeat inactivity.
    // This avoids reloads being treated as real logouts.
    // Realtime subscription: force logout if this member is suspended or marked offline
    const channel = supabase
      .channel(`presence-staff-${session.discordId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'staff_members', filter: `discord_id=eq.${session.discordId}` },
        (payload: any) => {
          const newRow = payload.new
          if (newRow?.status === 'suspended' || newRow?.online === false) {
            clearSession()
            window.location.replace('/login')
          }
        }
      )
      .subscribe()

    const heartbeatInterval = setInterval(sendHeartbeat, 30_000)
    const checkInterval = setInterval(checkAndMarkOffline, 60_000)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(checkInterval)
      try {
        channel.unsubscribe()
      } catch {}
    }
  }, [])

  return null
}