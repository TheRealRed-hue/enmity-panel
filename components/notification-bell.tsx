"use client"

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

type NotificationItem = {
  id: string
  type: string
  actor_id?: string | null
  payload: any
  created_at: string
}

export default function NotificationBell({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // fetch persisted notifications
    fetch('/api/notifications?limit=50')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data ?? [])
      })

    // fetch unread count if userId provided
    if (userId) {
      fetch(`/api/notification_reads?user_id=${encodeURIComponent(userId)}`)
        .then((r) => r.json())
        .then((data) => setUnreadCount(data.count ?? 0))
    }

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const newNotification = payload.new as NotificationItem
        setNotifications((cur) => [newNotification, ...cur])
        setUnreadCount((c) => c + 1)
      })
      .subscribe()

    return () => {
      // unsubscribe
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (notificationId?: string) => {
    if (!userId) return
    try {
      if (notificationId) {
        await fetch('/api/notification_reads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notificationId, user_id: userId }),
        })
      } else {
        // mark all visible as read
        await Promise.all(
          notifications.map((n) =>
            fetch('/api/notification_reads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notification_id: n.id, user_id: userId }),
            })
          )
        )
      }
      const res = await fetch(`/api/notification_reads?user_id=${encodeURIComponent(userId)}`)
      const data = await res.json()
      setUnreadCount(data.count ?? 0)
    } catch (err) {
      // ignore
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setOpen((s) => !s)}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-h-[60vh] overflow-auto rounded-xl border border-border bg-card p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Notifications</h4>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => markAsRead(undefined)}>
                Mark all read
              </Button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="text-sm text-muted-foreground">No notifications</div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{n.type}</div>
                      <div className="text-xs text-muted-foreground mt-1">{n.payload?.message ?? JSON.stringify(n.payload)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {userId && (
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => markAsRead(n.id)}>
                        Mark read
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
