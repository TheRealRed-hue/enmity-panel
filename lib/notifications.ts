import { supabase } from './supabase'
import { getClientSession } from './session'

export type NotificationType = 'mod_action' | 'alert' | 'member' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: string
}

let _notifications: AppNotification[] = []
let _listeners: Array<(n: AppNotification[]) => void> = []
let _channel: any | null = null

function notify() {
  _listeners.forEach((fn) => fn([..._notifications]))
}

async function fetchInitial() {
  try {
    const res = await fetch('/api/notifications?limit=50')
    const data = await res.json()
    const session = getClientSession()
    let readSet = new Set<string>()
    if (session) {
      // fetch list of reads for this user
      const readsRes = await fetch(`/api/notification_reads?user_id=${encodeURIComponent(session.discordId)}&list=true`)
      const reads = readsRes.ok ? await readsRes.json() : []
      readSet = new Set((reads ?? []).map((r: any) => r.notification_id))
    }

    _notifications = (data ?? []).map((d: any) => ({
      id: d.id,
      type: d.type,
      title: d.payload?.title ?? d.type,
      body: d.payload?.message ?? JSON.stringify(d.payload ?? {}),
      read: readSet.has(d.id),
      createdAt: d.created_at,
    }))
    notify()
  } catch (err) {
    console.error('fetchInitial notifications', err)
  }
}

export async function addNotification(n: { type: NotificationType; title: string; body: string }) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: n.type, payload: { title: n.title, message: n.body } }),
    })
  } catch (err) {
    console.error('addNotification', err)
  }
}

export function subscribe(fn: (n: AppNotification[]) => void) {
  _listeners.push(fn)
  // send current
  fn([..._notifications])

  // if first subscriber, initialize
  if (_listeners.length === 1) {
    fetchInitial()

    // subscribe to supabase realtime inserts
    _channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
        const d = payload.new
        const notif: AppNotification = {
          id: d.id,
          type: d.type,
          title: d.payload?.title ?? d.type,
          body: d.payload?.message ?? JSON.stringify(d.payload ?? {}),
          read: false,
          createdAt: d.created_at,
        }
        _notifications = [notif, ..._notifications].slice(0, 50)
        notify()
      })
      .subscribe()
  }

  return () => {
    _listeners = _listeners.filter((l) => l !== fn)
    if (_listeners.length === 0 && _channel) {
      supabase.removeChannel(_channel)
      _channel = null
    }
  }
}

export async function markAllRead() {
  const session = getClientSession()
  if (!session) {
    _notifications = _notifications.map((n) => ({ ...n, read: true }))
    notify()
    return
  }

  try {
    await Promise.all(
      _notifications.map((n) =>
        fetch('/api/notification_reads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: n.id, user_id: session.discordId }),
        })
      )
    )
    _notifications = _notifications.map((n) => ({ ...n, read: true }))
    notify()
  } catch (err) {
    console.error('markAllRead', err)
  }
}

export async function markRead(id: string) {
  const session = getClientSession()
  if (!session) {
    _notifications = _notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    notify()
    return
  }

  try {
    await fetch('/api/notification_reads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_id: id, user_id: session.discordId }),
    })
    _notifications = _notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    notify()
  } catch (err) {
    console.error('markRead', err)
  }
}
