export interface ServerStats {
  active_members: number
  total_members: number
  left_today: number
  joined_today: number
  tickets: number
  updatedAt: string
}

type Listener = (stats: ServerStats | null) => void

let _stats: ServerStats | null = null
let _listeners: Listener[] = []
let _interval: ReturnType<typeof setInterval> | null = null

function notify() {
  _listeners.forEach((fn) => fn(_stats))
}

async function fetchStats() {
  try {
    const res = await fetch('/api/server-stats')
    if (!res.ok) return
    const data = await res.json()
    _stats = { ...data, updatedAt: new Date().toISOString() }
    notify()
  } catch {
    // bot offline
  }
}

export function subscribeStats(fn: Listener) {
  _listeners.push(fn)
  fn(_stats)

  if (!_interval) {
    fetchStats()
    _interval = setInterval(fetchStats, 10_000)
  }

  return () => {
    _listeners = _listeners.filter((l) => l !== fn)
    if (_listeners.length === 0 && _interval) {
      clearInterval(_interval)
      _interval = null
    }
  }
}