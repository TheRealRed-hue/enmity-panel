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

function notify() {
  _listeners.forEach((fn) => fn([..._notifications]))
}

export function addNotification(n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
  _notifications = [
    {
      ...n,
      id: `notif_${Date.now()}`,
      read: false,
      createdAt: new Date().toISOString(),
    },
    ..._notifications,
  ].slice(0, 50)
  notify()
}

export function markAllRead() {
  _notifications = _notifications.map((n) => ({ ...n, read: true }))
  notify()
}

export function markRead(id: string) {
  _notifications = _notifications.map((n) => n.id === id ? { ...n, read: true } : n)
  notify()
}

export function subscribe(fn: (n: AppNotification[]) => void) {
  _listeners.push(fn)
  fn([..._notifications])
  return () => {
    _listeners = _listeners.filter((l) => l !== fn)
  }
}