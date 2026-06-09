'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X, Check, AlertTriangle, Ban, Users, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  subscribe,
  markAllRead,
  markRead,
  type AppNotification,
  type NotificationType,
} from '@/lib/notifications'

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  mod_action: { icon: Ban, color: 'text-critical-red' },
  alert: { icon: AlertTriangle, color: 'text-warning-amber' },
  member: { icon: Users, color: 'text-success-green' },
  system: { icon: Info, color: 'text-primary' },
  action_log_created: { icon: Ban, color: 'text-warning-amber' },
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribe(setNotifications)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-critical-red text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-critical-red/20 text-critical-red text-[10px] font-bold">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Check size={11} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell size={24} className="text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => {
                  const cfg = typeConfig[n.type] ?? typeConfig['system']
                  return (
                    <li
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-secondary/40',
                        !n.read && 'bg-primary/5'
                      )}
                    >
                      <div className={cn('mt-0.5 shrink-0', cfg.color)}>
                        <cfg.icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-medium truncate', !n.read ? 'text-foreground' : 'text-muted-foreground')}>
                          {n.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}